const path = require('path');
const fs = require('fs/promises');
const fsSync = require('fs');
const log = require('./logger');

// better-sqlite3 is a native module unpacked from asar — require it directly.
const Database = require('better-sqlite3');

const OLD_CACHE_FILE = '.video-cull-cache.json';

// ── Path helpers ──────────────────────────────────────────────────────────

/**
 * Convert an absolute folder path to a safe SQLite DB filename.
 * e.g. "C:\Users\Matthijs\Videos\Footage" → "C_Users_Matthijs_Videos_Footage.db"
 */
function sanitizePathForFilename(folderPath) {
  return folderPath
    .replace(/:/g, '')             // remove drive colon
    .replace(/[/\\]+/g, '_')       // separators → _
    .replace(/[^a-zA-Z0-9_.-]/g, '_') // anything else → _
    .replace(/_+/g, '_')           // collapse consecutive _
    .replace(/^_|_$/g, '');        // trim leading/trailing _
}

/**
 * Returns the absolute path to the SQLite DB file for a given folder.
 * All cache reads/writes must go through this function.
 * cacheRootDir — the parent cache directory (e.g. %APPDATA%\Video-Cull\cache).
 * In P3, this will gain a `mode` parameter for per-drive vs centralised.
 */
function resolveCachePath(folderPath, cacheRootDir) {
  fsSync.mkdirSync(cacheRootDir, { recursive: true });
  return path.join(cacheRootDir, sanitizePathForFilename(folderPath) + '.db');
}

// ── Schema ────────────────────────────────────────────────────────────────

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS videos (
    id                TEXT PRIMARY KEY,
    filename          TEXT NOT NULL,
    path              TEXT UNIQUE NOT NULL,
    size_bytes        INTEGER,
    file_date         INTEGER,
    metadata_date     INTEGER,
    duration_secs     REAL,
    fps               REAL,
    duplicate_hash    TEXT,
    status            TEXT DEFAULT 'pending',
    rating            INTEGER DEFAULT 0,
    favorite          INTEGER DEFAULT 0,
    compatible        INTEGER DEFAULT 1,
    video_codec       TEXT,
    audio_codec       TEXT,
    width             INTEGER,
    height            INTEGER,
    bookmarks         TEXT,
    os_thumbnail_path TEXT,
    updated_at        INTEGER
  );

  CREATE TABLE IF NOT EXISTS thumbnails (
    video_id  TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    idx       INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    PRIMARY KEY (video_id, idx)
  );
`;

// ── DB lifecycle ──────────────────────────────────────────────────────────

let _db = null;
let _dbFolderPath = null;

/**
 * Open (or reuse) the SQLite database for a folder.
 * Creates the cache directory and schema if they don't exist.
 * cacheRootDir — computed by main.js from app.getPath('userData').
 * Returns the open Database instance.
 */
function openDb(folderPath, cacheRootDir) {
  const dbPath = resolveCachePath(folderPath, cacheRootDir);

  if (_db && _dbFolderPath === folderPath) {
    return _db; // reuse existing connection
  }

  if (_db) {
    try { _db.close(); } catch { /* ignore */ }
    _db = null;
    _dbFolderPath = null;
  }

  _db = new Database(dbPath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.exec(SCHEMA);

  _dbFolderPath = folderPath;
  log.info(`[cache] Opened DB for: ${folderPath}`);
  return _db;
}

/** Close the active DB connection. Call on app quit. */
function closeDb() {
  if (_db) {
    try { _db.close(); } catch { /* ignore */ }
    _db = null;
    _dbFolderPath = null;
  }
}

// ── Read ──────────────────────────────────────────────────────────────────

/**
 * Load all cached videos from the DB as a Map<id, cachedVideo>.
 * Returns an empty Map if the DB has no rows yet.
 */
function loadCacheMap(db) {
  const rows = db.prepare('SELECT * FROM videos').all();
  const thumbStmt = db.prepare(
    'SELECT file_path FROM thumbnails WHERE video_id = ? ORDER BY idx'
  );

  const map = new Map();
  let withThumbs = 0;
  let nonPending = 0;
  for (const row of rows) {
    const thumbs = thumbStmt.all(row.id).map((t) => t.file_path);
    if (thumbs.length > 0) withThumbs++;
    if (row.status && row.status !== 'pending') nonPending++;
    map.set(row.id, {
      id: row.id,
      status: row.status || 'pending',
      durationSecs: row.duration_secs ?? null,
      metadataDate: row.metadata_date ?? null,
      thumbnails: thumbs,
      bookmarks: row.bookmarks ? JSON.parse(row.bookmarks) : [],
      duplicateHash: row.duplicate_hash ?? null,
    });
  }
  log.info(`[cache] loadCacheMap: ${rows.length} videos, ${withThumbs} with thumbs, ${nonPending} non-pending`);
  return map;
}

// ── Write ─────────────────────────────────────────────────────────────────

/**
 * Upsert all videos in a single transaction.
 * Used for status changes and bookmark updates — no progress IPC needed.
 */
function saveCache(db, videos) {
  const upsertVideo = db.prepare(`
    INSERT INTO videos
      (id, filename, path, size_bytes, file_date, metadata_date,
       duration_secs, status, bookmarks, duplicate_hash, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      filename    = excluded.filename,
      path        = excluded.path,
      size_bytes  = excluded.size_bytes,
      file_date   = excluded.file_date,
      metadata_date = COALESCE(excluded.metadata_date, metadata_date),
      duration_secs = COALESCE(excluded.duration_secs, duration_secs),
      status      = excluded.status,
      bookmarks   = excluded.bookmarks,
      duplicate_hash = excluded.duplicate_hash,
      updated_at  = excluded.updated_at
  `);
  const deleteThumbs = db.prepare('DELETE FROM thumbnails WHERE video_id = ?');
  const insertThumb = db.prepare(
    'INSERT INTO thumbnails (video_id, idx, file_path) VALUES (?, ?, ?)'
  );

  const upsertAll = db.transaction((vids) => {
    for (const v of vids) {
      upsertVideo.run(
        v.id, v.filename, v.path, v.sizeBytes,
        v.date ?? null, v.metadataDate ?? null,
        v.durationSecs ?? null, v.status,
        v.bookmarks?.length ? JSON.stringify(v.bookmarks) : null,
        v.duplicateHash ?? null,
        Date.now()
      );
      if (v.thumbnails?.length) {
        deleteThumbs.run(v.id);
        for (let i = 0; i < v.thumbnails.length; i++) {
          insertThumb.run(v.id, i, v.thumbnails[i]);
        }
      }
    }
  });

  upsertAll(videos);
}

/**
 * Chunked upsert with optional progress callback.
 * Use for bulk operations (initial scan, JSON migration) where IPC progress
 * messages need to flush between chunks.
 * Yields the event loop between chunks via setImmediate so IPC messages flush.
 */
async function saveCacheChunked(db, videos, onProgress) {
  const upsertVideo = db.prepare(`
    INSERT INTO videos
      (id, filename, path, size_bytes, file_date, metadata_date,
       duration_secs, status, bookmarks, duplicate_hash, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      filename    = excluded.filename,
      path        = excluded.path,
      size_bytes  = excluded.size_bytes,
      file_date   = excluded.file_date,
      metadata_date = COALESCE(excluded.metadata_date, metadata_date),
      duration_secs = COALESCE(excluded.duration_secs, duration_secs),
      status      = excluded.status,
      bookmarks   = excluded.bookmarks,
      duplicate_hash = excluded.duplicate_hash,
      updated_at  = excluded.updated_at
  `);
  const deleteThumbs = db.prepare('DELETE FROM thumbnails WHERE video_id = ?');
  const insertThumb = db.prepare(
    'INSERT INTO thumbnails (video_id, idx, file_path) VALUES (?, ?, ?)'
  );

  const CHUNK_SIZE = 500;

  const insertChunk = db.transaction((chunk) => {
    for (const v of chunk) {
      upsertVideo.run(
        v.id, v.filename, v.path, v.sizeBytes,
        v.date ?? null, v.metadataDate ?? null,
        v.durationSecs ?? null, v.status,
        v.bookmarks?.length ? JSON.stringify(v.bookmarks) : null,
        v.duplicateHash ?? null,
        Date.now()
      );
      if (v.thumbnails?.length) {
        deleteThumbs.run(v.id);
        for (let i = 0; i < v.thumbnails.length; i++) {
          insertThumb.run(v.id, i, v.thumbnails[i]);
        }
      }
    }
  });

  for (let i = 0; i < videos.length; i += CHUNK_SIZE) {
    insertChunk(videos.slice(i, i + CHUNK_SIZE));
    if (onProgress) onProgress(Math.min(i + CHUNK_SIZE, videos.length), videos.length);
    await new Promise((resolve) => setImmediate(resolve));
  }
}

// ── JSON migration ────────────────────────────────────────────────────────

/**
 * If an old JSON cache file exists in folderPath, import status and bookmarks
 * into the open SQLite DB, then delete the JSON file.
 *
 * Only status and bookmarks are imported — durationSecs and thumbnails are
 * intentionally skipped so they are regenerated fresh from ffprobe.
 *
 * Safe to call on every scan — does nothing if no JSON cache exists.
 */
async function migrateJsonIfNeeded(folderPath, db) {
  const jsonPath = path.join(folderPath, OLD_CACHE_FILE);

  let raw;
  try {
    raw = await fs.readFile(jsonPath, 'utf-8');
  } catch {
    return; // no JSON cache — nothing to do
  }

  let cache;
  try {
    cache = JSON.parse(raw);
  } catch {
    log.warn('[cache] JSON cache corrupted, deleting:', jsonPath);
    await fs.unlink(jsonPath).catch(() => {});
    return;
  }

  if (!cache?.videos?.length) {
    await fs.unlink(jsonPath).catch(() => {});
    return;
  }

  // Insert skeleton rows first so the UPDATE below has rows to target.
  // The scan-directory handler will overwrite with fresh filesystem data anyway.
  const insertSkeleton = db.prepare(`
    INSERT OR IGNORE INTO videos (id, filename, path, status, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const updateImported = db.prepare(`
    UPDATE videos SET status = ?, bookmarks = ? WHERE id = ?
  `);

  const importAll = db.transaction((cachedVideos) => {
    for (const v of cachedVideos) {
      if (!v.id || !v.path) continue;
      insertSkeleton.run(
        v.id,
        v.filename || path.basename(v.path),
        v.path,
        v.status || 'pending',
        Date.now()
      );
      updateImported.run(
        v.status || 'pending',
        v.bookmarks?.length ? JSON.stringify(v.bookmarks) : null,
        v.id
      );
    }
  });

  importAll(cache.videos);
  log.info(`[cache] Migrated ${cache.videos.length} entries from JSON cache`);

  await fs.unlink(jsonPath).catch(() => {});
}

// ── Delete ────────────────────────────────────────────────────────────────

/**
 * Delete the SQLite DB file for a folder (used by clear-cache).
 * Closes the connection first if it's the active DB.
 */
function deleteDb(folderPath, cacheRootDir) {
  log.warn(`[cache] deleteDb called for: ${folderPath}`);
  log.warn(`[cache] deleteDb stack:\n${new Error().stack}`);

  if (_dbFolderPath === folderPath && _db) {
    try { _db.close(); } catch { /* ignore */ }
    _db = null;
    _dbFolderPath = null;
  }

  const dbPath = resolveCachePath(folderPath, cacheRootDir);
  try {
    fsSync.unlinkSync(dbPath);
  } catch {
    // Already gone — fine
  }

  // Also remove WAL sidecar files if present
  for (const ext of ['-wal', '-shm']) {
    try { fsSync.unlinkSync(dbPath + ext); } catch { /* ignore */ }
  }
}

module.exports = {
  resolveCachePath,
  openDb,
  closeDb,
  loadCacheMap,
  saveCache,
  saveCacheChunked,
  migrateJsonIfNeeded,
  deleteDb,
};
