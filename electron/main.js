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
        {
          label: 'Export Report...',
          id: 'export-report',
          enabled: false,
          accelerator: 'CmdOrCtrl+Shift+E',
          click: () => mainWindow && mainWindow.webContents.send('menu-action', 'export-report')
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

function setExportReportEnabled(enabled) {
  const menu = Menu.getApplicationMenu();
  const item = menu?.getMenuItemById('export-report');
  if (item) item.enabled = enabled;
}

ipcMain.on('set-export-report-available', (_event, enabled) => {
  setExportReportEnabled(Boolean(enabled));
});

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function formatDuration(seconds) {
  if (seconds == null || seconds <= 0) return '--:--';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatDate(timestampMs) {
  if (!timestampMs) return '--';
  return new Date(timestampMs).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

async function isValidLoadedPath(filePath) {
  if (!currentScanDir || !knownVideoPaths.has(filePath)) return false;
  return isPathWithinDir(filePath, currentScanDir);
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await worker(items[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}

function buildReportHtml(videos, dirPath) {
  const sortedVideos = [...videos].sort((a, b) => a.filename.localeCompare(b.filename));

  const getRelativeFolder = (videoPath) => {
    const folder = path.dirname(videoPath);
    const rel = path.relative(dirPath, folder).replace(/\\/g, '/');
    if (!rel || rel === '.') return 'Root';
    return rel;
  };

  const groupByFolder = (items) => {
    const map = new Map();
    for (const video of items) {
      const folder = getRelativeFolder(video.path);
      const group = map.get(folder);
      if (group) {
        group.push(video);
      } else {
        map.set(folder, [video]);
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([folder, folderVideos]) => ({ folder, videos: folderVideos }));
  };

  const groups = {
    keep: sortedVideos.filter((video) => video.status === 'keep'),
    delete: sortedVideos.filter((video) => video.status === 'delete'),
    skipped: sortedVideos.filter((video) => video.status === 'skipped'),
    pending: sortedVideos.filter((video) => video.status === 'pending'),
  };

  const totalSize = sortedVideos.reduce((sum, video) => sum + (video.sizeBytes || 0), 0);
  const keptSize = groups.keep.reduce((sum, video) => sum + (video.sizeBytes || 0), 0);
  const deletedSize = groups.delete.reduce((sum, video) => sum + (video.sizeBytes || 0), 0);
  const skippedSize = groups.skipped.reduce((sum, video) => sum + (video.sizeBytes || 0), 0);
  const pendingSize = groups.pending.reduce((sum, video) => sum + (video.sizeBytes || 0), 0);

  const rowHtml = (video) => `
    <tr>
      <td class="filename" title="${escapeHtml(video.path)}">${escapeHtml(video.filename)}</td>
      <td>${escapeHtml(formatBytes(video.sizeBytes || 0))}</td>
      <td>${escapeHtml(formatDuration(video.durationSecs))}</td>
      <td>${escapeHtml(formatDate(video.metadataDate || video.date))}</td>
      <td><span class="status status-${escapeHtml(video.status)}">${escapeHtml(video.status)}</span></td>
    </tr>`;

  const folderSectionHtml = (folder, items) => `
    <div class="folder-group">
      <h3>${escapeHtml(folder)} <span>(${items.length})</span></h3>
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Size</th>
            <th>Duration</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.length > 0 ? items.map(rowHtml).join('') : '<tr><td colspan="5" class="empty">No videos</td></tr>'}
        </tbody>
      </table>
    </div>`;

  const sectionHtml = (title, items) => {
    const folders = groupByFolder(items);
    return `
    <section class="group">
      <h2>${escapeHtml(title)} <span>(${items.length})</span></h2>
      ${items.length > 0 ? folders.map((folderGroup) => folderSectionHtml(folderGroup.folder, folderGroup.videos)).join('') : '<p class="empty">No videos</p>'}
    </section>`;
  };

  return `<!doctype html>
  <html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Video Cull Report</title>
    <style>
      :root { color-scheme: dark; }
      body { margin: 0; font-family: Arial, sans-serif; background: #0b0b12; color: #f3f4f6; }
      .wrap { max-width: 1200px; margin: 0 auto; padding: 32px 24px 48px; }
      .hero { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }
      .hero h1 { margin: 0; font-size: 28px; }
      .hero p { margin: 0; color: #a1a1aa; }
      .summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin: 20px 0 28px; }
      .card { background: #141420; border: 1px solid #2a2a3a; border-radius: 14px; padding: 16px; }
      .card .label { color: #9ca3af; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
      .card .value { margin-top: 8px; font-size: 20px; font-weight: 700; }
      .group { margin: 24px 0; }
      .group h2 { margin: 0 0 12px; font-size: 18px; }
      .folder-group { margin: 14px 0 20px; }
      .folder-group h3 { margin: 0 0 8px; font-size: 14px; color: #d1d5db; }
      table { width: 100%; border-collapse: collapse; overflow: hidden; border-radius: 14px; }
      thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; background: #141420; padding: 12px 14px; border-bottom: 1px solid #2a2a3a; }
      tbody td { padding: 12px 14px; border-bottom: 1px solid #232333; background: #101018; }
      tbody tr:nth-child(even) td { background: #0f0f16; }
      .filename { max-width: 540px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .status { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
      .status-keep { background: rgba(0, 250, 154, 0.16); color: #34d399; }
      .status-delete { background: rgba(255, 71, 87, 0.16); color: #fb7185; }
      .status-skipped { background: rgba(245, 158, 11, 0.16); color: #f59e0b; }
      .status-pending { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; }
      .empty { color: #9ca3af; text-align: center; padding: 18px; }
      @media (max-width: 900px) { .summary { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
      @media (max-width: 640px) { .summary { grid-template-columns: 1fr; } tbody td, thead th { padding: 10px 12px; } }
    </style>
  </head>
  <body>
    <div class="wrap">
      <header class="hero">
        <h1>Video Cull Report</h1>
        <p>${escapeHtml(dirPath)}</p>
        <p>Exported ${escapeHtml(new Date().toLocaleString())}</p>
      </header>

      <section class="summary">
        <div class="card"><div class="label">Total videos</div><div class="value">${sortedVideos.length}</div></div>
        <div class="card"><div class="label">Total size</div><div class="value">${escapeHtml(formatBytes(totalSize))}</div></div>
        <div class="card"><div class="label">Kept size</div><div class="value">${escapeHtml(formatBytes(keptSize))}</div></div>
        <div class="card"><div class="label">Delete size</div><div class="value">${escapeHtml(formatBytes(deletedSize))}</div></div>
        <div class="card"><div class="label">Skipped size</div><div class="value">${escapeHtml(formatBytes(skippedSize))}</div></div>
        <div class="card"><div class="label">Pending size</div><div class="value">${escapeHtml(formatBytes(pendingSize))}</div></div>
      </section>

      ${sectionHtml('Keep', groups.keep)}
      ${sectionHtml('Delete', groups.delete)}
      ${sectionHtml('Skipped', groups.skipped)}
      ${sectionHtml('Pending', groups.pending)}
    </div>
  </body>
  </html>`;
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

ipcMain.handle('save-cache-atomic', async (_event, dirPath, videos) => {
  if (!dirPath || typeof dirPath !== 'string') return false;
  try {
    const db = cache.openDb(dirPath, cacheRootDir);
    cache.saveCache(db, videos.map(videoForDb));
    return true;
  } catch (err) {
    log.error('[save-cache-atomic] Error saving cache:', err);
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

// 6. Batch delete → OS Trash first, then explicit permanent-delete fallback for failures
ipcMain.handle('batch-delete', async (_event, filePaths) => {
  const results = [];

  const validPaths = [];
  for (const filePath of filePaths) {
    if (await isValidLoadedPath(filePath)) {
      validPaths.push(filePath);
    } else {
      log.warn(`[batch-delete] Rejected path outside loaded directory: ${filePath}`);
      results.push({ path: filePath, success: false, error: 'Path is outside the loaded directory scope.' });
    }
  }

  if (validPaths.length === 0) return results;

  const trashResults = await mapWithConcurrency(validPaths, 5, async (filePath) => {
    try {
      await shell.trashItem(filePath);
      return { path: filePath, success: true, method: 'trash' };
    } catch (err) {
      return { path: filePath, success: false, error: err.message };
    }
  });
  results.push(...trashResults);

  const failedTrash = trashResults.filter((result) => !result.success).map((result) => result.path);
  if (failedTrash.length === 0) return results;

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Recycle Bin not available',
    message: `Recycle Bin failed for ${failedTrash.length} file(s). Do you want to permanently delete them instead?`,
    detail: 'This action cannot be undone.',
    buttons: ['Cancel', 'Delete Permanently'],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });

  if (response === 0) return results;

  const permanentResults = await mapWithConcurrency(failedTrash, 5, async (filePath) => {
    try {
      await fs.unlink(filePath);
      return { path: filePath, success: true, method: 'permanent' };
    } catch (err) {
      return { path: filePath, success: false, error: err.message, method: 'permanent' };
    }
  });

  const merged = new Map(results.map((result) => [result.path, result]));
  for (const result of permanentResults) {
    merged.set(result.path, result);
  }
  return Array.from(merged.values());
});

ipcMain.handle('export-report', async (_event, videos, dirPath) => {
  if (!dirPath || !Array.isArray(videos) || videos.length === 0) return 'error';

  const defaultFileName = `videocull-report-${new Date().toISOString().slice(0, 10)}.html`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Video Cull Report',
    defaultPath: path.join(app.getPath('documents'), defaultFileName),
    filters: [{ name: 'HTML', extensions: ['html'] }],
    properties: ['createDirectory'],
  });

  if (result.canceled || !result.filePath) return 'cancelled';

  try {
    const html = buildReportHtml(videos, dirPath);
    await fs.writeFile(result.filePath, html, 'utf8');
    return 'saved';
  } catch (err) {
    log.error('[export-report] Error writing report:', err);
    return 'error';
  }
});

ipcMain.handle('choose-report-scope', async () => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Export Report',
    message: 'What do you want to export?',
    detail: 'Choose whether to export all loaded videos or only the current filtered selection.',
    buttons: ['All videos', 'Filtered selection', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true,
  });

  if (result.response === 0) return 'all';
  if (result.response === 1) return 'filtered';
  return null;
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
