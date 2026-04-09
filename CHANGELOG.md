# Changelog

All notable changes to Video Cull will be documented here.

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
