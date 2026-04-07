// Increase libuv thread pool so thumbnail reads don't starve the video stream.
// Must be set before any I/O occurs (i.e. before the first require that does I/O).
process.env.UV_THREADPOOL_SIZE = '16';

const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, nativeImage, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs/promises');
const { scanDirectory } = require('./scanner');
const { processVideos, cancelProcessing } = require('./processor');

const isDev = !app.isPackaged;
let mainWindow;
let currentScanDir = null;

// Set of known valid video paths, populated on every scan-directory call.
// All IPC handlers that accept file paths validate against this set.
const knownVideoPaths = new Set();

/**
 * Returns true if `candidate` resolves to `baseDir` or a path inside it.
 * Uses path.resolve to prevent substring and path-traversal bypass attacks.
 */
function isPathWithinDir(candidate, baseDir) {
  const resolved = path.resolve(candidate);
  const resolvedBase = path.resolve(baseDir);
  return resolved === resolvedBase || resolved.startsWith(resolvedBase + path.sep);
}

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

// ── Custom Protocol for serving thumbnail images and videos ───────────────
protocol.registerSchemesAsPrivileged([
  { scheme: 'thumb', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, isSecure: true, corsEnabled: true } },
  { scheme: 'video', privileges: { bypassCSP: true, stream: true, supportFetchAPI: true, isSecure: true, corsEnabled: true } },
]);

// Concurrency limiter for thumbnail reads.
// Caps parallel thumb:// reads at 6 so the video stream always has thread pool headroom.
let activeThumbReads = 0;
const thumbQueue = [];
const MAX_THUMB_READS = 6;

function readThumbFile(filePath) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (activeThumbReads < MAX_THUMB_READS) {
        activeThumbReads++;
        fs.readFile(filePath)
          .then(resolve, reject)
          .finally(() => {
            activeThumbReads--;
            if (thumbQueue.length > 0) thumbQueue.shift()();
          });
      } else {
        thumbQueue.push(attempt);
      }
    };
    attempt();
  });
}

app.whenReady().then(() => {
  protocol.handle('thumb', async (request) => {
    // thumb:///D:/path/to/.video-cull-thumbs/id/thumb.jpg
    let filePath = decodeURIComponent(request.url.slice('thumb:///'.length));

    // On Windows, ensure the path starts with drive letter
    if (process.platform === 'win32' && !filePath.match(/^[a-zA-Z]:/)) {
      filePath = filePath.replace(/^\//, '');
    }

    // Security: only serve .jpg files inside the current scan dir's thumb folder
    if (!filePath.toLowerCase().endsWith('.jpg')) {
      return new Response('Access Denied', { status: 403 });
    }
    if (!currentScanDir) {
      return new Response('Access Denied', { status: 403 });
    }
    const expectedThumbDir = path.join(currentScanDir, THUMB_DIR);
    if (!isPathWithinDir(filePath, expectedThumbDir)) {
      return new Response('Access Denied', { status: 403 });
    }
    
    try {
      const buffer = await readThumbFile(filePath);
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, immutable',
        }
      });
    } catch (e) {
      return new Response('Not Found', { status: 404 });
    }
  });

  protocol.handle('video', async (request) => {
    let filePath = decodeURIComponent(request.url.slice('video:///'.length));
    
    // On Windows, ensure the path starts with drive letter
    if (process.platform === 'win32' && !filePath.match(/^[a-zA-Z]:/)) {
      filePath = filePath.replace(/^\//, '');
    }

    // Security: only serve files inside the current scan directory
    if (!currentScanDir || !isPathWithinDir(filePath, currentScanDir)) {
      return new Response('Access Denied', { status: 403 });
    }

    try {
      const { createReadStream } = require('fs');
      const { Readable } = require('stream');
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      const range = request.headers.get('range');

      const ext = require('path').extname(filePath).toLowerCase();
      let contentType = 'video/mp4';
      if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.ogg') contentType = 'video/ogg';

      const highWaterMark = 5 * 1024 * 1024; // 5MB chunks

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const fileStream = createReadStream(filePath, { start, end, highWaterMark });
        const webStream = Readable.toWeb(fileStream);

        return new Response(webStream, {
          status: 206,
          headers: {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize.toString(),
            'Content-Type': contentType,
          }
        });
      } else {
        const fileStream = createReadStream(filePath, { highWaterMark });
        const webStream = Readable.toWeb(fileStream);
        return new Response(webStream, {
          status: 200,
          headers: {
            'Content-Length': fileSize.toString(),
            'Content-Type': contentType,
            'Accept-Ranges': 'bytes',
          }
        });
      }
    } catch (e) {
      console.error('Video protocol error:', e);
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();
  setApplicationMenu();
});

function setApplicationMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings...',
          accelerator: 'CmdOrCtrl+,',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'open-settings')
        },
        { type: 'separator' },
        {
          label: 'Open Directory...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'open-directory')
        },
        {
          label: 'Rescan Directory',
          accelerator: 'F5',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'rescan-directory')
        },
        {
          label: 'Clear Cache & Reload',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'clear-cache')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Actions',
      submenu: [
        {
          label: 'Undo Last Action',
          accelerator: 'CmdOrCtrl+Z',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'undo')
        },
        {
          label: 'Delete All Marked Videos',
          accelerator: 'CmdOrCtrl+Backspace',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'delete-all')
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'zoom-in')
        },
        {
          label: 'Zoom In (Alt)',
          accelerator: 'CmdOrCtrl+=',
          visible: false,
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'zoom-in')
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'zoom-out')
        },
        { type: 'separator' },
        { role: 'reload' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ role: 'toggledevtools' }] : [])
      ]
    },
    {
      label: 'Video',
      submenu: [
        {
          label: 'Reveal in Explorer',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'reveal-video')
        },
        {
          label: 'Play Externally',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'play-external')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

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
      date: v.date ?? v.modifiedAt,
      metadataDate: v.metadataDate || null,
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
        metadataDate: cached.metadataDate || null,
      };
    }
    return { ...v, status: 'pending', thumbnails: [], metadataDate: null };
  });

  // Populate the known-paths whitelist for this scan session
  knownVideoPaths.clear();
  merged.forEach((v) => knownVideoPaths.add(v.path));

  return merged;
});

// Valid video ID format: 16 hex characters (MD5-derived from path+size in scanner.js)
const VALID_VIDEO_ID = /^[0-9a-f]{16}$/;

// 3. Generate thumbnails for videos that don't have them
ipcMain.handle('generate-thumbnails', async (_event, videos, dirPath) => {
  // Security: validate that dirPath matches the current scan directory
  if (!currentScanDir || path.resolve(dirPath) !== path.resolve(currentScanDir)) {
    console.warn('generate-thumbnails: dirPath does not match currentScanDir, rejecting');
    return false;
  }

  // Security: filter out any video with an invalid id or a path not in the known set
  const safeVideos = videos.filter((v) => {
    if (!VALID_VIDEO_ID.test(v.id)) {
      console.warn(`generate-thumbnails: rejected video with invalid id: ${v.id}`);
      return false;
    }
    if (!knownVideoPaths.has(v.path)) {
      console.warn(`generate-thumbnails: rejected unknown path: ${v.path}`);
      return false;
    }
    return true;
  });

  const thumbDir = path.join(dirPath, THUMB_DIR);
  await fs.mkdir(thumbDir, { recursive: true });

  let config = {};
  try {
    const data = await fs.readFile(path.join(app.getPath('userData'), CONFIG_FILE), 'utf8');
    config = JSON.parse(data);
  } catch (e) {
    // Defaults are fine
  }

  const THUMB_COUNT = config.thumbsPerVideo || 6;
  const needThumbs = safeVideos.filter((v) => !v.thumbnails || v.thumbnails.length !== THUMB_COUNT);

  let readyBatch = [];
  let lastProgress = null;
  
  const flushBatch = () => {
    if (readyBatch.length > 0) {
      mainWindow.webContents.send('thumb-ready-batch', readyBatch);
      readyBatch = [];
    }
    if (lastProgress) {
      mainWindow.webContents.send('thumb-progress', lastProgress);
      lastProgress = null;
    }
  };

  const batchInterval = setInterval(flushBatch, 1000);

  await processVideos(needThumbs, thumbDir, config, (progress) => {
    lastProgress = progress;
  }, (videoId, thumbnails, durationSecs, creationTime) => {
    readyBatch.push({ videoId, thumbnails, durationSecs, metadataDate: creationTime });
  });

  flushBatch();
  clearInterval(batchInterval);

  return true;
});

// 4. Cancel running thumbnail generation
ipcMain.handle('cancel-generation', async () => {
  cancelProcessing();
  return true;
});

// 5. Save cache
ipcMain.handle('save-cache', async (event, dirPath, videos) => {
  if (!dirPath || typeof dirPath !== 'string') return false;
  try {
    await saveCache(dirPath, videos);
    return true;
  } catch (err) {
    console.error('Error saving cache:', err);
    return false;
  }
});

ipcMain.handle('clear-cache', async (event, dirPath) => {
  if (!dirPath || typeof dirPath !== 'string') return false;

  // Security: only allow clearing the cache of the currently scanned directory
  if (!currentScanDir || path.resolve(dirPath) !== path.resolve(currentScanDir)) {
    console.warn('clear-cache: dirPath does not match currentScanDir, rejecting');
    return false;
  }

  cancelProcessing();
  
  try {
    const cachePath = path.join(dirPath, CACHE_FILE);
    await fs.unlink(cachePath);
  } catch (err) {
    // Ignore ENOENT
  }
  try {
    const thumbDir = path.join(dirPath, THUMB_DIR);
    const trashDir = path.join(dirPath, `${THUMB_DIR}_trash_${Date.now()}`);
    
    try {
      await fs.rename(thumbDir, trashDir);
      // Run deletion asynchronously in background so it doesn't block the UI
      fs.rm(trashDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }).catch(() => {});
    } catch (renameErr) {
      // Fallback
      await fs.rm(thumbDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
    return true;
  } catch (err) {
    console.error('Error clearing thumbs map:', err);
    return false;
  }
});

// 6. Batch delete → OS Trash, with permanent delete fallback for network drives
ipcMain.handle('batch-delete', async (_event, filePaths) => {
  const results = [];
  let useTrash = true;

  // Security: only allow deleting paths that were part of the last scan
  const validPaths = filePaths.filter((p) => knownVideoPaths.has(p));
  if (validPaths.length !== filePaths.length) {
    console.warn(`batch-delete: ${filePaths.length - validPaths.length} path(s) rejected (not in known video set)`);
  }
  filePaths = validPaths;

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
  if (!knownVideoPaths.has(filePath)) return null;
  try {
    const thumb = await nativeImage.createThumbnailFromPath(filePath, { width: 300, height: 200 });
    return thumb.toDataURL();
  } catch (err) {
    return null;
  }
});

// 8. Open video in default system player
ipcMain.handle('open-video', async (_event, filePath) => {
  if (!knownVideoPaths.has(filePath)) return;
  await shell.openPath(filePath);
});

// 9. Config management
const CONFIG_FILE = 'settings.json';

ipcMain.handle('get-config', async () => {
  try {
    const configPath = path.join(app.getPath('userData'), CONFIG_FILE);
    const data = await fs.readFile(configPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
});

ipcMain.handle('save-config', async (_event, config) => {
  try {
    const configPath = path.join(app.getPath('userData'), CONFIG_FILE);
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Save config error:', e);
    return false;
  }
});

// 10. Open a directory in explorer
ipcMain.handle('open-in-explorer', async (_event, filePath) => {
  if (!knownVideoPaths.has(filePath) && !isPathWithinDir(filePath, currentScanDir)) return;
  shell.showItemInFolder(filePath);
});
