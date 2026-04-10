# Changelog

All notable changes to Video Cull will be documented here.

## [1.4.1-alpha.1] - 2026-04-10

### Fixed
- **Cache persistence** — SQLite databases and thumbnails were being silently wiped on every app restart because the cache directory (`userData/cache`) collided with Electron's internal HTTP cache. Moved to `userData/video-cache`.
- **Thumbnail records lost on rescan** — `INSERT OR REPLACE` in SQLite triggers `ON DELETE CASCADE`, destroying thumbnail records on every scan even when not intended. Switched to `ON CONFLICT DO UPDATE` (true in-place upsert, no cascade).
- **Thumbnail migration skipped** — filesystem migration from `.video-cull-thumbs` to the cache dir was gated on DB records existing, so it silently no-ops after a JSON→SQLite migration (which skips thumbnails). Now checks the filesystem directly.
- **Thumbnails stored flat** — all folders' thumbnails were written to a single `thumbs/` directory. Now organised per-folder as `thumbs/<folder-name>/` matching the DB filename.
- **`saveCacheChunked` never called** — bulk saves in the initial scan used the blocking single-transaction path instead of the chunked async path.

## [1.4.0] - 2026-04-10

### Added
- **SQLite cache layer** — migrated from JSON to `better-sqlite3` with per-folder database files and a dedicated cache module.
- **Chunked bulk persistence** — added chunked SQLite writes with event-loop yielding to keep IPC/UI responsive during large saves.
- **Automatic JSON migration** — legacy `.video-cull-cache.json` is imported on first scan, preserving status and bookmarks.

### Changed
- **Cache architecture** — all cache IO now goes through a single DB path resolver and centralized DB lifecycle.
- **Thumbnail storage location** — thumbnails now live under the app cache root (`userData/video-cache`) instead of colliding with Electron internals.
- **Thumbnail path handling** — DB stores relative thumbnail paths, renderer receives absolute paths via boundary conversion.
- **Scan merge behavior** — cache merge now preserves cached duration, metadata date, bookmarks, status, and thumbnail references.

### Fixed
- **Cache wipe on restart** — resolved DB/thumb data loss caused by writing into Electron's internal cache area.
- **Cascade thumbnail loss on upsert** — replaced destructive replace behavior with safe `ON CONFLICT DO UPDATE` upserts.
- **Missed thumbnail migration path** — migration now checks filesystem state directly and supports cross-device move fallback.
- **Write amplification during thumbnail generation** — store now saves only changed videos (not whole arrays) for thumbnail/status/bookmark/undo updates.
- **Transient save failures** — added a retry queue for partial saves with race-safe token reconciliation.
- **Duration persistence on rescan** — cached duration now survives rescans when thumbnails already exist.
- **Delete flow overhead** — removed redundant full-cache save after batch delete.
- **Cache load performance** — removed N+1 thumbnail query pattern by bulk-loading and grouping thumbnail rows in memory.

### Docs
- **README maintenance** — marked screenshots section as outdated for the v1.3.0 baseline prior to migration work.

### Migration
- **Automatic transition** — old JSON cache files are imported and removed; durations/thumbnails are regenerated or merged from current cache/scan state as applicable.

## [1.3.0] - 2026-04-09

### Changed
- **UI refinements** — updated accent and status colors (more vibrant keep/delete), subtler borders using alpha values, improved shadows and surface tones throughout
- **Deleted cards** — grayscale + opacity treatment makes marked-for-deletion videos visually recede in the grid; restores on hover
- **Filter pills** — active pills now use accent gradient with glow; keep/delete pills use solid status colors
- **Badge animation** — status badges (keep/delete) animate in with a pop on first appearance
- **Review mode** — counter and close button styled as matching pill/circle pair; keep/delete flash uses radial gradient

### Improved
- **Empty state** — redesigned welcome screen with glowing icon container, gradient title text, and pill-shaped open button

### Removed
- Internal preview modal component (was unreachable dead code; grid play button opens review mode directly)

## [1.2.0] - 2026-04-09

### Added
- **Grid play button opens review mode** — clicking the play button on a video card now navigates directly to review mode and starts playback, instead of opening a separate preview modal.
- **Fully configurable keybindings** — all shortcuts can now be recorded as real key combinations (Esc, Delete, Ctrl+key, etc.) in Settings → Keybindings. Includes conflict detection and a Reset to Defaults button.

### Changed
- Keybindings settings panel reorganised into logical groups (Navigation, Decisions, Playback, While Playing, Preview, Global).
- "Play / Pause (Enter)" renamed to "Play / Pause (alternate)" to avoid implying the key is fixed.

## [1.1.0] - 2026-04-08

### Added
- **Bookmarks** — press B while playing to drop a bookmark at the current position. Bookmarks persist across sessions and appear as clickable chips below the player (click to seek, hover to reveal remove button). A count badge shows on the thumbnail strip when a video has bookmarks.
- **Playback speed controls** — `[` / `]` step through 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2×. Speed is shown as an overlay badge and persists as you move between videos in the same session.
- **Keyboard shortcuts overlay** — press `?` anywhere to open a reference of all shortcuts.

### Fixed
- Rare crash (black screen / render process gone) that could occur while interacting with the video player during playback. Root cause: frequent React re-renders of the Video.js player stack triggered a native access violation in Chromium's media pipeline.

## [1.0.0] - 2026-03-01

Initial release.
