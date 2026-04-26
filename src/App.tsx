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
  const directories = useStore((s) => s.directories);
  const videos = useStore((s) => s.videos);
  const filteredVideos = useStore((s) => s.filteredVideos);
  const reviewMode = useStore((s) => s.reviewMode);
  const isScanning = useStore((s) => s.isScanning);
  const setVideos = useStore((s) => s.setVideos);
  const setIsScanning = useStore((s) => s.setIsScanning);
  const setScanProgress = useStore((s) => s.setScanProgress);
  const setIsGenerating = useStore((s) => s.setIsGenerating);
  const setGenProgress = useStore((s) => s.setGenProgress);
  const updateVideoThumbnailsBatch = useStore((s) => s.updateVideoThumbnailsBatch);
  const setFolderFilterPath = useStore((s) => s.setFolderFilterPath);
  const includeSubfolders = useStore((s) => s.includeSubfolders);
  const settings = useStore((s) => s.settings);
  const scanIdRef = useRef(0);
  const isPrivateRef = useRef(false);
  const dragDepthRef = useRef(0);
  const folderReviewPathRef = useRef<string | null>(null);

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropModalPath, setDropModalPath] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<'interface' | 'keybindings' | 'cache' | 'processing' | 'updates'>('interface');
  const [settingsTabRequestId, setSettingsTabRequestId] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastIdRef = useRef(0);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ status: 'idle' });
  const [updateBannerDismissed, setUpdateBannerDismissed] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    isPrivateRef.current = isPrivate;
  }, [isPrivate]);

  const handleDirectoryPicked = useCallback((pickedPath: string) => {
    const currentDirs = useStore.getState().directories;
    if (currentDirs.length === 0 || currentDirs.includes(pickedPath)) {
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

  const openSettings = useCallback((tab: 'interface' | 'keybindings' | 'cache' | 'processing' | 'updates' = 'interface') => {
    setSettingsTab(tab);
    setSettingsTabRequestId((prev) => prev + 1);
    useStore.getState().setIsSettingsModalOpen(true);
  }, []);

  const applyAppMode = useCallback(async (appMode: 'minimal' | 'extended', markIntroSeen = true) => {
    const state = useStore.getState();
    state.updateSettings({
      appMode,
      hasSeenAppModeIntro: markIntroSeen ? true : state.settings.hasSeenAppModeIntro,
    });
    await useStore.getState().saveSettings();
    pushToast(`Switched to ${appMode === 'extended' ? 'Extended' : 'Minimal'} mode.`, 'info');
  }, [pushToast]);

  const dismissAppModeIntro = useCallback(async () => {
    const state = useStore.getState();
    state.updateSettings({ hasSeenAppModeIntro: true });
    await useStore.getState().saveSettings();
  }, []);

  // Scan directory when selected
  const handleScan = useCallback(async (dirPaths: string[]) => {
    if (!window.electronAPI || dirPaths.length === 0) return;
    await window.electronAPI.cancelGeneration();
    await window.electronAPI.resetLoadedDirectories();
    const scanId = ++scanIdRef.current;
    setIsScanning(true);
    setIsGenerating(false);
    setScanProgress({ found: 0, currentFile: '' });
    try {
      const scannedGroups = [];
      for (const dirPath of dirPaths) {
        const scannedVideos = await window.electronAPI.scanDirectory(dirPath, includeSubfolders);
        scannedGroups.push({ dirPath, videos: scannedVideos });
      }
      if (scanId !== scanIdRef.current) return;
      const allVideos = scannedGroups.flatMap((group) => group.videos);
      setVideos(allVideos);
      setIsScanning(false);
      const needThumbsTotal = allVideos.filter((v) => !v.thumbnails || v.thumbnails.length === 0).length;
      if (needThumbsTotal > 0) {
        setIsGenerating(true);
        setGenProgress({ current: 0, total: needThumbsTotal });
        for (const group of scannedGroups) {
          const needThumbs = group.videos.filter((v) => !v.thumbnails || v.thumbnails.length === 0);
          if (needThumbs.length === 0) continue;
          await window.electronAPI.generateThumbnails(needThumbs, group.dirPath);
        }
        if (scanId === scanIdRef.current) setIsGenerating(false);
      }
    } catch (err) {
      console.error('Scan failed:', err);
      setIsScanning(false);
      setIsGenerating(false);
    }
  }, [includeSubfolders, setVideos, setIsScanning, setScanProgress, setIsGenerating, setGenProgress]);

  useEffect(() => {
    void useStore.getState().loadSettings().finally(() => setSettingsLoaded(true));
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
        case 'open-settings': { openSettings('interface'); break; }
        case 'open-directory': {
          const dir = await window.electronAPI.selectDirectory();
          if (dir) handleDirectoryPicked(dir);
          break;
        }
        case 'rescan-directory': { if (state.directories.length > 0) handleScan(state.directories); break; }
        case 'clear-cache': {
          if (state.directories.length > 0) {
            const confirmed = window.confirm('Are you sure you want to clear the cache for all loaded folders? All manual review decisions will be lost.');
            if (confirmed) {
              for (const dir of state.directories) {
                await window.electronAPI.clearCache(dir);
              }
              state.setVideos([]);
              handleScan(state.directories);
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
            const permanentSuccessCount = results.filter((r) => r.method === 'permanent' && r.success).length;
            const permanentFailureCount = results.filter((r) => r.method === 'permanent' && !r.success).length;
            if (permanentSuccessCount > 0 && permanentFailureCount > 0) {
              pushToast('Some files were permanently deleted, but some still failed.', 'error');
            } else if (permanentSuccessCount > 0) {
              pushToast('Some files were permanently deleted because the Recycle Bin was unavailable.', 'error');
            } else if (permanentFailureCount > 0) {
              pushToast('Some files could not be deleted.', 'error');
            }
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
        case 'export-report': {
          openSettings('interface');
          break;
        }
        case 'toggle-app-mode': {
          const nextMode = state.settings.appMode === 'extended' ? 'minimal' : 'extended';
          void applyAppMode(nextMode);
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
      } else if (matchesKeybind(e, s.keyToggleAppMode)) {
        e.preventDefault();
        const nextMode = s.appMode === 'extended' ? 'minimal' : 'extended';
        void applyAppMode(nextMode);
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
  }, [setScanProgress, setGenProgress, updateVideoThumbnailsBatch, handleScan, handleDirectoryPicked, openSettings, pushToast, applyAppMode]);

  useEffect(() => {
    window.electronAPI?.setExportReportAvailable(Boolean(directory && videos.length > 0 && !isScanning));
  }, [directory, videos.length, isScanning]);

  useEffect(() => {
    if (!reviewMode && folderReviewPathRef.current) {
      folderReviewPathRef.current = null;
      setFolderFilterPath(null);
    }
  }, [reviewMode, setFolderFilterPath]);

  useEffect(() => {
    if (directories.length > 0) handleScan(directories);
  }, [directories, handleScan]);

  // â”€â”€ Drag & Drop â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
    if (!dropModalPath) return;
    useStore.getState().addDirectory(dropModalPath);
    setDropModalPath(null);
    setTimeout(() => {
      pushToast('Folder added to the current session.', 'info');
    }, 50);
  }, [dropModalPath, pushToast]);

  const handleDropModalKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      setDropModalPath(null);
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const buttons = (e.currentTarget as HTMLDivElement).querySelectorAll<HTMLButtonElement>('button');
      if (buttons.length === 0) return;
      const focused = document.activeElement;
      const focusedIndex = focused instanceof HTMLButtonElement ? Array.from(buttons).indexOf(focused) : -1;
      const nextIndex = e.shiftKey ? focusedIndex - 1 : focusedIndex + 1;
      const wrappedIndex = (nextIndex + buttons.length) % buttons.length;
      (buttons[wrappedIndex] as HTMLButtonElement).focus();
    }
  }, []);

  const handleReviewFolder = useCallback((folderPath: string) => {
    folderReviewPathRef.current = folderPath;
    setFolderFilterPath(folderPath);
    useStore.getState().setReviewIndex(0);
    useStore.getState().setReviewMode(true);
  }, [setFolderFilterPath]);

  const handleCloseSession = useCallback(async () => {
    scanIdRef.current += 1;
    await window.electronAPI?.cancelGeneration();
    await window.electronAPI?.resetLoadedDirectories();
    setIsScanning(false);
    setIsGenerating(false);
    setScanProgress({ found: 0, currentFile: '' });
    setGenProgress({ current: 0, total: 0 });
    useStore.getState().setDirectory(null);
    pushToast('Closed current session.', 'info');
  }, [pushToast, setGenProgress, setIsGenerating, setIsScanning, setScanProgress]);

  return (
    <div
      className={`app-layout${isDragOver ? ' drag-over' : ''}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <SettingsModal initialTab={settingsTab} tabRequestId={settingsTabRequestId} />
      {showShortcutsHelp && <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
      {directory && (
        <Sidebar
          onRescan={() => directories.length > 0 && handleScan(directories)}
          onDirectoryPicked={handleDirectoryPicked}
          onNotify={pushToast}
          onOpenSettings={() => openSettings('interface')}
          onCloseSession={() => void handleCloseSession()}
        />
      )}

      <main className="app-main">
        {!directory && !isScanning && videos.length === 0 && <EmptyState onNotify={pushToast} />}
        {directory && videos.length > 0 && !reviewMode && <GridMode onReviewFolder={handleReviewFolder} />}
        {reviewMode && <ReviewMode />}
        {isScanning && videos.length === 0 && (
          <div className="scanning-overlay">
            <div className="scanning-spinner" />
            <p>Scanning for videos...</p>
          </div>
        )}
      </main>

      {/* Drag-over hint overlay */}
      {isDragOver && (
        <div className="drag-overlay">
          <div className="drag-overlay-inner">
            <span className="drag-overlay-icon">Folder</span>
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

      {settingsLoaded && !settings.hasSeenAppModeIntro && !isPrivate && (
        <div className="mode-intro-backdrop">
          <div className="mode-intro-modal" role="dialog" aria-modal="true" aria-labelledby="mode-intro-title">
            <h2 id="mode-intro-title">You're using Video Cull in Extended mode</h2>
            <p>Ratings, analytics, and more are enabled. You can switch to Minimal anytime in Settings, the View menu, or with your mode shortcut.</p>
            <div className="mode-intro-actions">
              <button className="btn btn-ghost" onClick={() => void applyAppMode('minimal')}>Switch to Minimal</button>
              <button className="btn btn-primary" onClick={() => void dismissAppModeIntro()}>Got it</button>
            </div>
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
