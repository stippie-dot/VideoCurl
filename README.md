# VideoCurl 🎬

A high-performance desktop application for rapidly culling and managing massive video collections (4TB+). 

Video Cull is designed for speed. Instead of opening each video file, it generates a strip of thumbnails for every video in a folder, allowing you to quickly decide what to keep and what to delete using intuitive keyboard shortcuts.



## ✨ Key Features

- **Multi-Thumbnail Preview**: Automatically generates 6 thumbnails per video, spread across the duration, to give you a full overview at a glance.
- **Review Mode**: A focused, fullscreen "Tinder-style" interface for rapid decision-making.
- **Keyboard-First Workflow**: Use `K` (Keep), `D` (Delete), `S` (Skip), and `Z` (Undo) to fly through your collection.
- **Virtualized Grid**: Handles thousands of videos smoothly without UI lag using list virtualization.
- **Smart Caching**: Stores thumbnails and statuses locally in a `.video-cull-cache.json` file, so your progress moves with your drive.
- **Duplicate Detection**: Automatically flags potential duplicates based on file size and duration.
- **Trash Integration**: Uses the system Recycle Bin for safety—nothing is permanently deleted until you empty the trash.
- **Scene-Aware**: Skips dark/black intros when generating thumbnails to ensure you see useful frames.

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [FFmpeg](https://ffmpeg.org/) installed and added to your system PATH.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/stippie-dot/videocurl.git
   cd videocurl
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the application in development mode:
   ```bash
   npm run dev
   ```

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `K` | Mark as **Keep** |
| `D` | Mark as **Delete** |
| `S` | **Skip** to next video |
| `Z` | **Undo** last action |
| `Esc`| Exit Review Mode |
| `←` / `→` | Navigate between videos |
| `Enter` | Open video in default player |

## 🛠️ Built With

- **Electron**: Desktop framework
- **React**: UI library
- **TypeScript**: Type safety
- **Zustand**: State management
- **FFmpeg**: Media processing
- **Lucide**: Iconography

## 📄 License

This project is licensed under the GNU General Public License v3.0.

