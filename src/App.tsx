import { useEffect, useCallback } from 'react';
import useStore from './store';
import Sidebar from './components/Sidebar';
import GridMode from './components/GridMode';
import ReviewMode from './components/ReviewMode';
import EmptyState from './components/EmptyState';
import PreviewModal from './components/PreviewModal';
import './App.css';

export default function App() {
  const directory = useStore((s) => s.directory);
  const videos = useStore((s) => s.videos);
  const reviewMode = useStore((s) => s.reviewMode);
  const isScanning = useStore((s) => s.isScanning);
  const setVideos = useStore((s) => s.setVideos);
  const setIsScanning = useStore((s) => s.setIsScanning);
  const setScanProgress = useStore((s) => s.setScanProgress);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const setGenProgress = useStore((s) => s.setGenProgress);
  const updateVideoThumbnails = useStore((s) => s.updateVideoThumbnails);
  const includeSubfolders = useStore((s) => s.includeSubfolders);

  // Scan directory when selected
  const handleScan = useCallback(async (dirPath: string) => {
    if (!window.electronAPI) return;

    setIsScanning(true);
    setScanProgress({ found: 0, currentFile: '' });

    try {
      const scannedVideos = await window.electronAPI.scanDirectory(dirPath, includeSubfolders);
      setVideos(scannedVideos);
      setIsScanning(false);

      const needThumbs = scannedVideos.filter((v) => !v.thumbnails || v.thumbnails.length === 0);
      if (needThumbs.length > 0) {
        setIsGenerating(true);
        setGenProgress({ current: 0, total: needThumbs.length });
        await window.electronAPI.generateThumbnails(scannedVideos, dirPath);
        setIsGenerating(false);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
      setIsGenerating(false);
    }
  }, [includeSubfolders, setVideos, setIsScanning, setScanProgress, setIsGenerating, setGenProgress]);

  // Subscribe to IPC events
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsub1 = window.electronAPI.onScanProgress((progress) => {
      setScanProgress(progress);
    });

    const unsub2 = window.electronAPI.onThumbProgress((progress) => {
      setGenProgress(progress);
    });

    const unsub3 = window.electronAPI.onThumbReady(({ videoId, thumbnails, durationSecs, metadataDate }) => {
      updateVideoThumbnails(videoId, thumbnails, durationSecs, metadataDate);
    });

    const unsub4 = window.electronAPI.onMenuAction(async (action) => {
      const state = useStore.getState();
      switch (action) {
        case 'open-directory': {
          const dir = await window.electronAPI.selectDirectory();
          if (dir) state.setDirectory(dir);
          break;
        }
        case 'rescan-directory': {
          if (state.directory) handleScan(state.directory);
          break;
        }
        case 'clear-cache': {
          if (state.directory) {
            const confirmed = window.confirm('Are you sure you want to clear the cache? All manual review decisions will be lost.');
            if (confirmed) {
              await window.electronAPI.clearCache(state.directory);
              state.setVideos([]);
              handleScan(state.directory);
            }
          }
          break;
        }
        case 'undo': {
          state.undo();
          break;
        }
        case 'delete-all': {
          const toDelete = state.videos.filter((v) => v.status === 'delete');
          if (toDelete.length === 0) break;
          const confirmed = window.confirm(`Move ${toDelete.length} marked videos to Recycle Bin?`);
          if (confirmed) {
            const results = await window.electronAPI.batchDelete(toDelete.map((v) => v.path));
            const deletedPaths = results.filter((r) => r.success).map((r) => r.path);
            state.removeDeletedVideos(deletedPaths);
          }
          break;
        }
        case 'zoom-in': {
          state.setCardScale(Math.min(state.cardScale + 0.1, 1.5));
          break;
        }
        case 'zoom-out': {
          state.setCardScale(Math.max(state.cardScale - 0.1, 0.5));
          break;
        }
        case 'reveal-video': {
          if (state.reviewMode && state.filteredVideos[state.reviewIndex]) {
             window.electronAPI.openInExplorer(state.filteredVideos[state.reviewIndex].path);
          }
          break;
        }
        case 'play-external': {
          if (state.reviewMode && state.filteredVideos[state.reviewIndex]) {
             window.electronAPI.openVideo(state.filteredVideos[state.reviewIndex].path);
          }
          break;
        }
      }
    });

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
    };
  }, [setScanProgress, setGenProgress, updateVideoThumbnails, handleScan]);

  useEffect(() => {
    if (directory) {
      handleScan(directory);
    }
  }, [directory, handleScan]);

  return (
    <div className="app-layout">
      <Sidebar onRescan={() => directory && handleScan(directory)} />

      <main className="app-main">
        {!directory && !isScanning && videos.length === 0 && <EmptyState />}
        {directory && videos.length > 0 && !reviewMode && <GridMode />}
        {reviewMode && <ReviewMode />}

        {isScanning && videos.length === 0 && (
          <div className="scanning-overlay">
            <div className="scanning-spinner" />
            <p>Scanning for videos…</p>
          </div>
        )}
      </main>

      <PreviewModal />
    </div>
  );
}
