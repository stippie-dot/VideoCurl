const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, nativeImage } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs/promises');
const { scanDirectory } = require('./scanner');
const { processVideos, cancelProcessing } = require('./processor');

const isDev = !app.isPackaged;
let mainWindow;
let currentScanDir = null;

// ── Window ──────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0f',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

// ── Custom Protocol for serving thumbnail images ────────────────────────
protocol.registerSchemesAsPrivileged([
  { scheme: 'thumb', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, isSecure: true, corsEnabled: true } },
]);

app.whenReady().then(() => {
  protocol.handle('thumb', async (request) => {
    // thumb:///D:/path/to/.video-cull-thumbs/id/thumb.jpg
    let filePath = decodeURIComponent(request.url.slice('thumb:///'.length));
    
    // Security: Only allow files ending in .jpg and located within a .video-cull-thumbs directory
    if (!filePath.toLowerCase().endsWith('.jpg') || !filePath.includes('.video-cull-thumbs')) {
      return new Response('Access Denied', { status: 403 });
    }

    // On Windows, ensure the path starts with drive letter
    if (process.platform === 'win32' && !filePath.match(/^[a-zA-Z]:/)) {
      filePath = filePath.replace(/^\//, '');
    }
    
    try {
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Cache helpers ───────────────────────────────────────────────────────
const CACHE_FILE = '.video-cull-cache.json';
const THUMB_DIR = '.video-cull-thumbs';

async function loadCache(dirPath) {
  try {
    const raw = await fs.readFile(path.join(dirPath, CACHE_FILE), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function saveCache(dirPath, videos) {
  const cacheData = {
    lastScanned: new Date().toISOString(),
    videos: videos.map((v) => ({
      id: v.id,
      filename: v.filename,
      path: v.path,
      sizeBytes: v.sizeBytes,
      durationSecs: v.durationSecs,
      modifiedAt: v.modifiedAt,
      status: v.status,
      thumbnails: v.thumbnails,
      duplicateHash: v.duplicateHash || null,
    })),
  };
  await fs.writeFile(path.join(dirPath, CACHE_FILE), JSON.stringify(cacheData, null, 2));
}

// ── IPC Handlers ────────────────────────────────────────────────────────

// 1. Select directory via OS dialog
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

// 2. Scan directory for video files
ipcMain.handle('scan-directory', async (_event, dirPath, includeSubfolders) => {
  // Security: Validate dirPath
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) throw new Error('Not a directory');
  } catch (err) {
    throw new Error('Invalid directory path');
  }

  currentScanDir = dirPath;
  const cache = await loadCache(dirPath);
  const cachedMap = {};
  if (cache && cache.videos) {
    cache.videos.forEach((v) => {
      cachedMap[v.id] = v;
    });
  }

  const thumbDir = path.join(dirPath, THUMB_DIR);
  await fs.mkdir(thumbDir, { recursive: true });

  const videos = await scanDirectory(dirPath, includeSubfolders, (progress) => {
    mainWindow.webContents.send('scan-progress', progress);
  });

  // Merge with cache: preserve status & existing thumbnails
  const merged = videos.map((v) => {
    const cached = cachedMap[v.id];
    if (cached) {
      return {
        ...v,
        status: cached.status || 'pending',
        thumbnails: cached.thumbnails || [],
        duplicateHash: cached.duplicateHash || v.duplicateHash,
      };
    }
    return { ...v, status: 'pending', thumbnails: [] };
  });

  return merged;
});

// 3. Generate thumbnails for videos that don't have them
ipcMain.handle('generate-thumbnails', async (_event, videos, dirPath) => {
  const thumbDir = path.join(dirPath, THUMB_DIR);
  await fs.mkdir(thumbDir, { recursive: true });

  const needThumbs = videos.filter((v) => !v.thumbnails || v.thumbnails.length === 0);

  await processVideos(needThumbs, thumbDir, (progress) => {
    mainWindow.webContents.send('thumb-progress', progress);
  }, (videoId, thumbnails, durationSecs) => {
    mainWindow.webContents.send('thumb-ready', { videoId, thumbnails, durationSecs });
  });

  return true;
});

// 4. Cancel running thumbnail generation
ipcMain.handle('cancel-generation', async () => {
  cancelProcessing();
  return true;
});

// 5. Save cache
ipcMain.handle('save-cache', async (_event, dirPath, videos) => {
  await saveCache(dirPath, videos);
  return true;
});

// 6. Batch delete → OS Trash, with permanent delete fallback for network drives
ipcMain.handle('batch-delete', async (_event, filePaths) => {
  const results = [];
  let useTrash = true;

  // Test trash support on the first file
  if (filePaths.length > 0) {
    try {
      await shell.trashItem(filePaths[0]);
      results.push({ path: filePaths[0], success: true, method: 'trash' });
    } catch (err) {
      // Trash not supported — ask user before permanently deleting
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'warning',
        title: 'Recycle Bin not available',
        message: `This drive does not support the Recycle Bin.\n\nDo you want to PERMANENTLY delete ${filePaths.length} files?\n\nThis action cannot be undone!`,
        buttons: ['Cancel', 'Delete Permanently'],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      });

      if (response === 0) {
        // User cancelled
        return results;
      }

      // User confirmed permanent delete — delete the first file
      useTrash = false;
      try {
        await fs.unlink(filePaths[0]);
        results.push({ path: filePaths[0], success: true, method: 'permanent' });
      } catch (unlinkErr) {
        results.push({ path: filePaths[0], success: false, error: unlinkErr.message });
      }
    }
  }

  // Process remaining files
  for (let i = 1; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
      if (useTrash) {
        await shell.trashItem(filePath);
        results.push({ path: filePath, success: true, method: 'trash' });
      } else {
        await fs.unlink(filePath);
        results.push({ path: filePath, success: true, method: 'permanent' });
      }
    } catch (err) {
      if (useTrash) {
        // Fallback for this single file
        try {
          await fs.unlink(filePath);
          results.push({ path: filePath, success: true, method: 'permanent' });
        } catch (unlinkErr) {
          results.push({ path: filePath, success: false, error: unlinkErr.message });
        }
      } else {
        results.push({ path: filePath, success: false, error: err.message });
      }
    }
  }
  return results;
});


// 7. Get OS native thumbnail
ipcMain.handle('get-os-thumbnail', async (_event, filePath) => {
  try {
    const thumb = await nativeImage.createThumbnailFromPath(filePath, { width: 300, height: 200 });
    return thumb.toDataURL();
  } catch (err) {
    return null;
  }
});

// 8. Open video in default system player
ipcMain.handle('open-video', async (_event, filePath) => {
  await shell.openPath(filePath);
});

// 8. Open a directory in explorer
ipcMain.handle('open-in-explorer', async (_event, filePath) => {
  shell.showItemInFolder(filePath);
});
