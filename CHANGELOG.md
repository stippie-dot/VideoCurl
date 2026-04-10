# Changelog

All notable changes to Video Cull will be documented here.

## [1.4.1] - 2026-04-10

### Fixed
- **Cache persistence** — SQLite databases and thumbnails were being silently wiped on every app restart because the cache directory (`userData/cache`) collided with Electron's internal HTTP cache. Moved to `userData/video-cache`.
- **Thumbnail records lost on rescan** — `INSERT OR REPLACE` in SQLite triggers `ON DELETE CASCADE`, destroying thumbnail records on every scan even when not intended. Switched to `ON CONFLICT DO UPDATE` (true in-place upsert, no cascade).
- **Thumbnail migration skipped** — filesystem migration from `.video-cull-thumbs` to the cache dir was gated on DB records existing, so it silently no-ops after a JSON→SQLite migration (which skips thumbnails). Now checks the filesystem directly.
- **Thumbnails stored flat** — all folders' thumbnails were written to a single `thumbs/` directory. Now organised per-folder as `thumbs/<folder-name>/` matching the DB filename.
- **`saveCacheChunked` never called** — bulk saves in the initial scan used the blocking single-transaction path instead of the chunked async path.

## [1.4.0] - 2026-04-10

### Changed
- **Cache Architecture** — migrated legacy JSON caching system to robust local SQLite implementation (`better-sqlite3`), dramatically improving read/write reliability and speed for massive folders.
- **Data Durability** — database operations are now fully atomic and correctly handle concurrent thread execution to prevent UI freezes.
- **Accurate Durations** — previously missing duration stats have been fixed as a side effect of the migration, pulling directly from FFprobe.

### Migration
- **Auto-migration** — existing `.video-cull-cache.json` files are automatically ingested and transitioned to `.db` on launch.
- **Status Preservation** — review status and bookmarks are maintained precisely; thumbnail data is transparently relocated without loss.

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
