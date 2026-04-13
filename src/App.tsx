import { useEffect, useCallback, useRef, useState } from 'react';
import useStore from './store';
import { matchesKeybind } from './keybinds';
import Sidebar from './components/Sidebar';
import GridMode from './components/GridMode';
import ReviewMode from './components/ReviewMode';
import EmptyState from './components/EmptyState';
import SettingsModal from './components/SettingsModal';
import ShortcutsHelp from './components/ShortcutsHelp';
import privacyScreenDashboardCover from './assets/privacy-screen-dashboard-cover.png';
import type { UpdateInfo } from './types';
import './App.css';

type Toast = {
  id: number;
  message: string;
  kind: 'info' | 'error';
};

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
  const updateVideoThumbnailsBatch = useStore((s) => s.updateVideoThumbnailsBatch);
  const includeSubfolders = useStore((s) => s.includeSubfolders);
  const scanIdRef = useRef(0);
  const isPrivateRef = useRef(false);
  const dragDepthRef = useRef(0);

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropModalPath, setDropModalPath] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ status: 'idle' });
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);

  useEffect(() => {
    isPrivateRef.current = isPrivate;
  }, [isPrivate]);

  const handleDirectoryPicked = useCallback((pickedPath: string) => {
    const currentDir = useStore.getState().directory;
    if (!currentDir || currentDir === pickedPath) {
      useStore.getState().setDirectory(pickedPath);
      return;
    }
    setDropModalPath(pickedPath);
  }, []);

  const pushToast = useCallback((message: string, kind: Toast['kind'] = 'info') => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, kind }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Scan directory when selected
  const handleScan = useCallback(async (dirPath: string) => {
    if (!window.electronAPI) return;
    await window.electronAPI.cancelGeneration();
    const scanId = ++scanIdRef.current;
    setIsScanning(true);
    setIsGenerating(false);
    setScanProgress({ found: 0, currentFile: '' });
    try {
      const scannedVideos = await window.electronAPI.scanDirectory(dirPath, includeSubfolders);
      if (scanId !== scanIdRef.current) return;
      setVideos(scannedVideos);
      setIsScanning(false);
      const needThumbs = scannedVideos.filter((v) => !v.thumbnails || v.thumbnails.length === 0);
      if (needThumbs.length > 0) {
        setIsGenerating(true);
        setGenProgress({ current: 0, total: needThumbs.length });
        await window.electronAPI.generateThumbnails(scannedVideos, dirPath);
        if (scanId === scanIdRef.current) setIsGenerating(false);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
      setIsGenerating(false);
    }
  }, [includeSubfolders, setVideos, setIsScanning, setScanProgress, setIsGenerating, setGenProgress]);

  useEffect(() => {
    useStore.getState().loadSettings();
  }, []);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((info) => {
      setUpdateInfo(info);
      if (info.status === 'ready') setUpdateBannerDismissed(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;

    const unsub1 = window.electronAPI.onScanProgress((progress) => setScanProgress(progress));
    const unsub2 = window.electronAPI.onThumbProgress((progress) => setGenProgress(progress));
    const unsub3 = window.electronAPI.onThumbReadyBatch((batch) => updateVideoThumbnailsBatch(batch));

    const unsub4 = window.electronAPI.onMenuAction(async (action) => {
      if (isPrivateRef.current) return;
      const state = useStore.getState();
      switch (action) {
        case 'open-settings': { state.setIsSettingsModalOpen(true); break; }
        case 'open-directory': {
          const dir = await window.electronAPI.selectDirectory();
          if (dir) handleDirectoryPicked(dir);
          break;
        }
        case 'rescan-directory': { if (state.directory) handleScan(state.directory); break; }
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
        case 'undo': { state.undo(); break; }
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
        case 'zoom-in': { state.setCardScale(Math.min(state.cardScale + 0.1, 1.5)); break; }
        case 'zoom-out': { state.setCardScale(Math.max(state.cardScale - 0.1, 0.5)); break; }
        case 'reveal-video': {
          if (state.reviewMode && state.filteredVideos[state.reviewIndex])
            window.electronAPI.openInExplorer(state.filteredVideos[state.reviewIndex].path);
          break;
        }
        case 'play-external': {
          if (state.reviewMode && state.filteredVideos[state.reviewIndex])
            window.electronAPI.openVideo(state.filteredVideos[state.reviewIndex].path);
          break;
        }
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      // Privacy screen: Shift+Escape toggles regardless of any other state
      if (e.shiftKey && e.key === 'Escape') {
        e.preventDefault();
        setIsPrivate((v) => !v);
        return;
      }
      if (isPrivateRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (document.body.hasAttribute('data-capturing-keybind')) return;
      const s = useStore.getState().settings;
      if (matchesKeybind(e, s.keyShowHelp)) {
        e.preventDefault();
        setShowShortcutsHelp((v) => !v);
      } else if (e.key === 'Escape') {
        setShowShortcutsHelp(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsub1();
      unsub2();
      unsub3();
      unsub4();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setScanProgress, setGenProgress, updateVideoThumbnailsBatch, handleScan, handleDirectoryPicked]);

  useEffect(() => {
    if (directory) handleScan(directory);
  }, [directory, handleScan]);

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.dataTransfer.types.includes('Files')) return;
    dragDepthRef.current += 1;
    setIsDragOver(true);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragOver(false);
    if (!window.electronAPI) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const droppedPath = (file as File & { path?: string }).path;
    if (!droppedPath) return;
    const result = await window.electronAPI.validateDroppedPath(droppedPath);
    if (!result.valid || !result.isDirectory) {
      const isShortcut = droppedPath.toLowerCase().endsWith('.lnk');
      pushToast(isShortcut
        ? 'Shortcuts are not supported. Please drop the actual folder.'
        : 'Please drop a valid folder path. Files are not supported.', 'error');
      return;
    }
    handleDirectoryPicked(droppedPath);
  }, [handleDirectoryPicked, pushToast]);

  const handleDropModalOpenNew = useCallback(() => {
    if (!dropModalPath) return;
    useStore.getState().setDirectory(dropModalPath);
    setDropModalPath(null);
  }, [dropModalPath]);

  const handleDropModalAddSession = useCallback(() => {
    setDropModalPath(null);
    setTimeout(() => {
      pushToast('Multi-folder sessions are coming in a future update. Use "Open as new" to replace the current folder.', 'info');
    }, 50);
  }, [pushToast]);

  const handleDropModalKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setDropModalPath(null);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const buttons = (e.currentTarget as HTMLDivElement).querySelectorAll('button');
      if (buttons.length === 0) return;
      const focused = document.activeElement as HTMLElement;
      const focusedIndex = Array.from(buttons).indexOf(focused);
      const nextIndex = e.shiftKey ? focusedIndex - 1 : focusedIndex + 1;
      const wrappedIndex = (nextIndex + buttons.length) % buttons.length;
      (buttons[wrappedIndex] as HTMLButtonElement).focus();
    }
  }, []);

  return (
    <div
      className={`app-layout${isDragOver ? ' drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SettingsModal />
      {showShortcutsHelp && <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
      {directory && (
        <Sidebar
          onRescan={() => directory && handleScan(directory)}
          onDirectoryPicked={handleDirectoryPicked}
          onNotify={pushToast}
        />
      )}

      <main className="app-main">
        {!directory && !isScanning && videos.length === 0 && <EmptyState onNotify={pushToast} />}
        {directory && videos.length > 0 && !reviewMode && <GridMode />}
        {reviewMode && <ReviewMode />}
        {isScanning && videos.length === 0 && (
          <div className="scanning-overlay">
            <div className="scanning-spinner" />
            <p>Scanning for videos…</p>
          </div>
        )}
      </main>

      {/* Drag-over hint overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <span className="drag-overlay-icon">📁</span>
            <span>Drop folder to open</span>
          </div>
        </div>
      )}

      {/* Modal shown when a folder is dropped while another is already open */}
      {dropModalPath && (
        <div className="drop-modal-backdrop" onClick={() => setDropModalPath(null)}>
          <div
            className="drop-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="drop-modal-title"
            aria-describedby="drop-modal-path"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleDropModalKeyDown}
          >
            <p className="drop-modal-title" id="drop-modal-title">Open folder</p>
            <p className="drop-modal-path" id="drop-modal-path" title={dropModalPath}>
              {dropModalPath.split(/[/\\]/).slice(-2).join(' / ')}
            </p>
            <div className="drop-modal-actions">
              <button className="btn btn-primary" autoFocus onClick={handleDropModalOpenNew}>Open as new</button>
              <button className="btn btn-ghost" onClick={handleDropModalAddSession}>Add to session</button>
              <button className="btn btn-ghost" onClick={() => setDropModalPath(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Update-ready banner */}
      {updateInfo.status === 'ready' && !updateBannerDismissed && !isPrivate && (
        <div className="update-banner">
          <span>Video Cull v{updateInfo.version} is ready to install.</span>
          <div className="update-banner-actions">
            <button className="update-banner-btn primary" onClick={() => window.electronAPI?.installUpdate()}>
              Restart Now
            </button>
            <button className="update-banner-btn" onClick={() => setUpdateBannerDismissed(true)}>
              Later
            </button>
          </div>
        </div>
      )}

      {/* Privacy screen overlay image, full-bleed without stretching */}
      {isPrivate && <div className="privacy-screen" style={{ backgroundImage: `url(${privacyScreenDashboardCover})` }} />}

      {!isPrivate && (
        <div className="toast-stack" aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.kind}`} role="status">
              <span>{toast.message}</span>
              <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">x</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
