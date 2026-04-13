const { app, BrowserWindow, ipcMain, dialog, shell, protocol, net, nativeImage, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const fs = require('fs/promises');
const { scanDirectory } = require('./scanner');
const { processVideos, cancelProcessing } = require('./processor');
const cache = require('./cache');
const log = require('./logger');
const { autoUpdater } = require('electron-updater');

const isDev = !app.isPackaged;
let mainWindow;
let currentScanDir = null;
let cacheRootDir = null; // set after app ready

// Set of known valid video paths, populated on every scan-directory call.
// All IPC handlers that accept file paths validate against this set.
const knownVideoPaths = new Set();

/**
 * Returns true if `candidate` resolves to `baseDir` or a path inside it.
 * First does a fast path.resolve check (catches ../ traversal), then follows
 * symlinks with fs.realpath to prevent symlink-based directory traversal.
 * If the candidate file doesn't exist yet (e.g. thumbnail not generated),
 * the path.resolve check is sufficient — the caller's file read will 404.
 */
async function isPathWithinDir(candidate, baseDir) {
  const resolved = path.resolve(candidate);
  const resolvedBase = path.resolve(baseDir);

  // Fast check: deny immediately if the normalised path escapes the base dir
  if (resolved !== resolvedBase && !resolved.startsWith(resolvedBase + path.sep)) {
    return false;
  }

  // Symlink check: follow real paths for files that exist
  try {
    const real = await fs.realpath(candidate);
    const realBase = await fs.realpath(baseDir).catch(() => resolvedBase);
    return real === realBase || real.startsWith(realBase + path.sep);
  } catch {
    // Candidate doesn't exist (e.g. thumbnail still being generated).
    // path.resolve check above already passed — allow it through.
    return true;
  }
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

app.whenReady().then(() => {
  cacheRootDir = path.join(app.getPath('userData'), 'video-cache');

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
    const thumbCacheDir = path.join(cacheRootDir, 'thumbs');
    if (!await isPathWithinDir(filePath, thumbCacheDir)) {
      return new Response('Access Denied', { status: 403 });
    }
    
    try {
      const buffer = await require('fs').promises.readFile(filePath);
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
    if (!currentScanDir || !await isPathWithinDir(filePath, currentScanDir)) {
      return new Response('Access Denied', { status: 403 });
    }

    try {
      const { createReadStream, statSync } = require('fs');
      // For video streaming we need to manually handle range requests to support seeking.
      // We use a large highWaterMark (5MB) to drastically reduce IPC overhead and prevent buffering.
      const { Readable } = require('stream');
      const stats = statSync(filePath);
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
      log.error('[video://] Protocol error:', e);
      return new Response('Not Found', { status: 404 });
    }
  });

  createWindow();
  setApplicationMenu();
  if (!isDev) setupAutoUpdater();
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

app.on('before-quit', () => {
  cache.closeDb();
});

// ── Cache constants ──────────────────────────────────────────────────────
// Legacy directory name — only used to locate old thumbnails during migration.
// New thumbnails are written to cacheRootDir/thumbs/<folderKey>/ from P0 onwards,
// where folderKey matches the DB filename (same sanitization).
const THUMB_DIR = '.video-cull-thumbs';

/** Returns the per-folder thumbnail root inside the cache dir. */
function folderThumbRoot(dirPath) {
  const folderKey = path.basename(cache.resolveCachePath(dirPath, cacheRootDir), '.db');
  return path.join(cacheRootDir, 'thumbs', folderKey);
}

// ── Thumbnail path helpers ───────────────────────────────────────────────
// The DB always stores paths relative to cacheRootDir (e.g. 'thumbs/id/thumb_01.jpg').
// The renderer always receives absolute paths. main.js converts at the boundary.

function thumbAbsolute(relPath) {
  if (!relPath || path.isAbsolute(relPath)) return relPath; // already absolute (legacy)
  return path.join(cacheRootDir, relPath);
}

function thumbRelative(absPath) {
  if (!absPath || !path.isAbsolute(absPath)) return absPath; // already relative
  const rel = path.relative(cacheRootDir, absPath);
  return rel.startsWith('..') ? absPath : rel; // keep absolute if outside cacheRootDir
}

function videoForDb(v) {
  return { ...v, thumbnails: v.thumbnails?.map(thumbRelative) ?? [] };
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

// 1b. Validate a drag-dropped path — confirms it exists and is a directory
ipcMain.handle('validate-dropped-path', async (_event, droppedPath) => {
  try {
    const stats = await fs.stat(droppedPath);
    return { valid: true, isDirectory: stats.isDirectory() };
  } catch {
    return { valid: false, isDirectory: false };
  }
});

// 2. Scan directory for video files
ipcMain.handle('scan-directory', async (_event, dirPath, includeSubfolders) => {
  log.info(`[scan-directory] called for: ${dirPath}`);
  // Security: Validate dirPath
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) throw new Error('Not a directory');
  } catch (err) {
    throw new Error('Invalid directory path');
  }

  currentScanDir = dirPath;

  // Open SQLite DB for this directory (creates schema if first time)
  const db = cache.openDb(dirPath, cacheRootDir);

  // Import old JSON cache if present (first launch after update)
  await cache.migrateJsonIfNeeded(dirPath, db);

  // Load existing cache entries for merging
  const cachedMap = cache.loadCacheMap(db);

  // Ensure the new thumbnail cache directory exists
  const newThumbRoot = folderThumbRoot(dirPath);
  await fs.mkdir(newThumbRoot, { recursive: true });

  // Migrate any old .video-cull-thumbs thumbnails into the cache directory.
  // Filesystem-based: checks disk directly, not the DB, so it works even when
  // the DB has no thumbnail records (e.g. first launch after JSON→SQLite migration).
  // Runs once per folder; subsequent scans find nothing to move and are instant.
  const oldThumbBase = path.join(dirPath, THUMB_DIR);
  const oldVideoIds = await fs.readdir(oldThumbBase).catch(() => []);
  if (oldVideoIds.length > 0) {
    log.info(`[scan-directory] Migrating ${oldVideoIds.length} thumb dirs from ${oldThumbBase} → ${newThumbRoot}`);
    const BATCH = 10;
    for (let i = 0; i < oldVideoIds.length; i += BATCH) {
      await Promise.all(oldVideoIds.slice(i, i + BATCH).map(async (videoId) => {
        const oldDir = path.join(oldThumbBase, videoId);
        const newDir = path.join(newThumbRoot, videoId);
        try {
          await fs.rename(oldDir, newDir);
        } catch (err) {
          if (err.code === 'EXDEV') {
            // Cross-device move: copy then delete
            try {
              await fs.cp(oldDir, newDir, { recursive: true, force: true });
              await fs.rm(oldDir, { recursive: true, force: true });
            } catch { /* leave in place if copy fails */ }
          }
          // ENOENT = already gone, ignore
        }
      }));
    }
    // Remove old base dir if now empty
    const remaining = await fs.readdir(oldThumbBase).catch(() => ['x']);
    if (remaining.length === 0) await fs.rmdir(oldThumbBase).catch(() => {});
    log.info('[scan-directory] Thumbnail migration complete');
  }

  const videos = await scanDirectory(dirPath, includeSubfolders, (progress) => {
    mainWindow.webContents.send('scan-progress', progress);
  });

  // Merge with cache: preserve status, thumbnails, bookmarks from SQLite.
  // Thumbnail paths are resolved to absolute here so the renderer can use them directly.
  const merged = videos.map((v) => {
    const cached = cachedMap.get(v.id);
    if (cached) {
      return {
        ...v,
        status: cached.status,
        durationSecs: cached.durationSecs ?? v.durationSecs,
        thumbnails: cached.thumbnails.map(thumbAbsolute),
        duplicateHash: cached.duplicateHash || v.duplicateHash,
        metadataDate: cached.metadataDate ?? null,
        bookmarks: cached.bookmarks,
      };
    }
    return { ...v, status: 'pending', thumbnails: [], metadataDate: null, bookmarks: [] };
  });

  // Persist merged result with relative thumbnail paths so the DB is portable.
  await cache.saveCacheChunked(db, merged.map(videoForDb));

  // Populate the known-paths whitelist for this scan session
  knownVideoPaths.clear();
  merged.forEach((v) => knownVideoPaths.add(v.path));

  return merged;
});

// Valid video ID format: 16 hex characters (MD5-derived from path+size in scanner.js)
const VALID_VIDEO_ID = /^[0-9a-f]{16}$/;

// 3. Generate thumbnails for videos that don't have them
ipcMain.handle('generate-thumbnails', async (_event, videos, dirPath) => {
  // Cancel any in-progress generation before starting a new one
  cancelProcessing();

  // Security: validate that dirPath matches the current scan directory
  if (!currentScanDir || path.resolve(dirPath) !== path.resolve(currentScanDir)) {
    log.warn('[generate-thumbnails] dirPath does not match currentScanDir, rejecting');
    return false;
  }

  // Security: filter out any video with an invalid id or a path not in the known set
  const safeVideos = videos.filter((v) => {
    if (!VALID_VIDEO_ID.test(v.id)) {
      log.warn(`[generate-thumbnails] Rejected video with invalid id: ${v.id}`);
      return false;
    }
    if (!knownVideoPaths.has(v.path)) {
      log.warn(`[generate-thumbnails] Rejected unknown path: ${v.path}`);
      return false;
    }
    return true;
  });

  // Thumbnails are written to the cache directory, not the video folder
  const thumbDir = folderThumbRoot(dirPath);
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
    const db = cache.openDb(dirPath, cacheRootDir);
    await cache.saveCacheChunked(db, videos.map(videoForDb));
    return true;
  } catch (err) {
    log.error('[save-cache] Error saving cache:', err);
    return false;
  }
});

ipcMain.handle('clear-cache', async (event, dirPath) => {
  log.warn(`[clear-cache] called for: ${dirPath}`);
  log.warn(`[clear-cache] stack:\n${new Error().stack}`);
  if (!dirPath || typeof dirPath !== 'string') return false;

  // Security: only allow clearing the cache of the currently scanned directory
  if (!currentScanDir || path.resolve(dirPath) !== path.resolve(currentScanDir)) {
    log.warn('[clear-cache] dirPath does not match currentScanDir, rejecting');
    return false;
  }

  cancelProcessing();

  // Collect video IDs before deleting the DB so we know which thumb dirs to remove
  cache.deleteDb(dirPath, cacheRootDir);

  try {
    // Delete the entire per-folder thumb directory in one shot
    await fs.rm(folderThumbRoot(dirPath), { recursive: true, force: true }).catch(() => {});

    // Also clean up any legacy .video-cull-thumbs in the video folder
    const legacyThumbDir = path.join(dirPath, THUMB_DIR);
    fs.rm(legacyThumbDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});

    return true;
  } catch (err) {
    log.error('[clear-cache] Error clearing thumbs:', err);
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
    log.warn(`[batch-delete] ${filePaths.length - validPaths.length} path(s) rejected (not in known video set)`);
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
    log.error('[save-config] Error saving config:', e);
    return false;
  }
});

// 10. Open a directory in explorer
ipcMain.handle('open-in-explorer', async (_event, filePath) => {
  if (!knownVideoPaths.has(filePath) && !await isPathWithinDir(filePath, currentScanDir)) return;
  shell.showItemInFolder(filePath);
});

// 11. App version
ipcMain.handle('get-app-version', () => app.getVersion());

// 12. Auto-updater IPC
ipcMain.handle('check-for-updates', () => {
  if (!isDev) autoUpdater.checkForUpdates();
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// ── Auto-updater setup ───────────────────────────────────────────────────
function setupAutoUpdater() {
  autoUpdater.logger = log;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', { status: 'checking' });
  });

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-status', { status: 'available', version: info.version });
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', { status: 'up-to-date' });
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-status', {
      status: 'downloading',
      percent: Math.round(progress.percent),
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-status', { status: 'ready', version: info.version });
  });

  autoUpdater.on('error', (err) => {
    log.error('[auto-updater] error:', err);
    mainWindow?.webContents.send('update-status', { status: 'error', message: err.message });
  });

  // Check shortly after launch (if auto-updates are enabled in settings)
  setTimeout(async () => {
    try {
      const configPath = path.join(app.getPath('userData'), CONFIG_FILE);
      const data = await require('fs').promises.readFile(configPath, 'utf8');
      const config = JSON.parse(data);
      if (config.autoUpdates === false) return;
    } catch {
      // No config yet — default is enabled
    }
    autoUpdater.checkForUpdates();
  }, 5000);
}
