import React, { useState, useEffect } from 'react';
import useStore from '../store';
import { X, RotateCcw, RefreshCw, FileDown, Database } from 'lucide-react';
import type { AppSettings, UpdateInfo } from '../types';
import { ALL_SHORTCUTS, findConflict, type KeybindSettingKey, type ShortcutGroup } from '../keybinds';
import { DEFAULT_KEYBINDS } from '../keybind-defaults';
import type { Keybind } from '../keybinds';
import KeybindInput from './KeybindInput';
import './SettingsModal.css';

const KEYBIND_GROUPS: ShortcutGroup[] = ['Review mode', 'Preview', 'Global'];

type SettingsTab = 'interface' | 'keybindings' | 'cache' | 'processing' | 'updates';

interface SettingsModalProps {
  initialTab?: SettingsTab;
  tabRequestId?: number;
}

export default function SettingsModal({ initialTab = 'interface', tabRequestId = 0 }: SettingsModalProps) {
  const isOpen = useStore((s) => s.isSettingsModalOpen);
  const close = () => useStore.getState().setIsSettingsModalOpen(false);
  const globalSettings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const saveSettings = useStore((s) => s.saveSettings);
  const directory = useStore((s) => s.directory);
  const directories = useStore((s) => s.directories);
  const videos = useStore((s) => s.videos);
  const filteredVideos = useStore((s) => s.filteredVideos);
  const isScanning = useStore((s) => s.isScanning);

  const [activeTab, setActiveTab] = useState<SettingsTab>('interface');
  const [localSettings, setLocalSettings] = useState<AppSettings>(globalSettings);
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo>({ status: 'idle' });
  const [exportMessage, setExportMessage] = useState<string>('');
  const [cacheMessage, setCacheMessage] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    setLocalSettings(useStore.getState().settings);
    if (window.electronAPI?.getAppVersion) {
      window.electronAPI.getAppVersion().then(setAppVersion);
    }
    setExportMessage('');
    setCacheMessage('');
  }, [isOpen, globalSettings]);

  useEffect(() => {
    if (isOpen) setActiveTab(initialTab);
  }, [isOpen, initialTab, tabRequestId]);

  useEffect(() => {
    if (activeTab !== 'interface') {
      setExportMessage('');
    }
  }, [activeTab]);

  useEffect(() => {
    if (!window.electronAPI?.onUpdateStatus) return;
    const unsub = window.electronAPI.onUpdateStatus((info) => setUpdateInfo(info));
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, val: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleCacheLocationChange = async (val: string) => {
    if (val === 'distributed') {
      const confirmed = await window.electronAPI.confirmDistributedMode();
      if (!confirmed) return;
    }
    handleChange('cacheLocation', val);
  };

  const handleKeybind = (id: KeybindSettingKey, bind: Keybind) => {
    setLocalSettings((prev) => ({ ...prev, [id]: bind }));
  };

  const resetKeybinds = () => {
    setLocalSettings((prev) => ({ ...prev, ...DEFAULT_KEYBINDS }));
  };

  const cacheSettingsChanged = (a: AppSettings, b: AppSettings) => (
    a.cacheLocation !== b.cacheLocation ||
    (a.centralCachePath || null) !== (b.centralCachePath || null) ||
    JSON.stringify(a.perDriveCachePaths || {}) !== JSON.stringify(b.perDriveCachePaths || {})
  );

  const handleSave = async () => {
    if (window.electronAPI?.migrateCacheSettings && cacheSettingsChanged(globalSettings, localSettings)) {
      setCacheMessage('Preparing cache migration...');
      const result = await window.electronAPI.migrateCacheSettings(globalSettings, localSettings, directories);
      if (result.status === 'cancelled') {
        setCacheMessage('Cache storage change cancelled.');
        return;
      }
      if (result.status === 'error') {
        setCacheMessage(result.errors[0] || 'Cache migration failed.');
        return;
      }
      if (result.status === 'partial') {
        setCacheMessage(`Cache migration partially completed. ${result.errors.length} item(s) need attention.`);
      }
    }
    updateSettings(localSettings);
    await saveSettings();
    close();
  };

  const handleExportReport = async () => {
    if (!window.electronAPI || !directory || videos.length === 0 || isScanning) return;

    const scope = await window.electronAPI.chooseReportScope();
    if (!scope) {
      setExportMessage('Export cancelled.');
      return;
    }

    const payload = scope === 'filtered' ? filteredVideos : videos;
    if (payload.length === 0) {
      setExportMessage(scope === 'filtered' ? 'No videos match the current filters.' : 'No videos available to export.');
      return;
    }

    const result = await window.electronAPI.exportReport(payload, directory);
    if (result === 'saved') {
      setExportMessage(`Exported ${scope} report (${payload.length} videos).`);
    } else if (result === 'cancelled') {
      setExportMessage('Export cancelled.');
    } else {
      setExportMessage('Export failed.');
    }
  };

  const currentBinds = Object.fromEntries(
    ALL_SHORTCUTS.map((s) => [s.id, localSettings[s.id] as Keybind])
  ) as Record<KeybindSettingKey, Keybind>;

  const currentDriveKey = directory
    ? directory.match(/^[a-zA-Z]:/)?.[0].toUpperCase()
    : null;

  const handleChooseCacheFolder = async (setting: 'centralCachePath' | 'perDriveCachePaths') => {
    const dir = await window.electronAPI?.selectDirectory();
    if (!dir) return;
    const result = await window.electronAPI?.validateCacheLocation(
      dir,
      setting === 'perDriveCachePaths' ? currentDriveKey : null
    );
    if (!result?.ok) {
      setCacheMessage(result?.error ? `Cannot use that folder: ${result.error}` : 'Cannot write to that folder.');
      return;
    }
    if (setting === 'centralCachePath') {
      handleChange('centralCachePath', dir);
      setCacheMessage('');
      return;
    }
    if (!currentDriveKey) {
      setCacheMessage('Open a folder first so Video Cull knows which drive to configure.');
      return;
    }
    handleChange('perDriveCachePaths', {
      ...localSettings.perDriveCachePaths,
      [currentDriveKey]: dir,
    });
    setCacheMessage('');
  };

  return (
    <div className="settings-overlay">
      <div className="settings-window">
        <div className="settings-header">
          <h2>Preferences</h2>
          <button className="settings-close-btn" onClick={close} title="Close without saving">
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          <div className="settings-sidebar">
            <button className={`tab-btn ${activeTab === 'interface' ? 'active' : ''}`} onClick={() => setActiveTab('interface')}>Interface</button>
            <button className={`tab-btn ${activeTab === 'cache' ? 'active' : ''}`} onClick={() => setActiveTab('cache')}>Cache</button>
            <button className={`tab-btn ${activeTab === 'processing' ? 'active' : ''}`} onClick={() => setActiveTab('processing')}>Processing</button>
            <button className={`tab-btn ${activeTab === 'keybindings' ? 'active' : ''}`} onClick={() => setActiveTab('keybindings')}>Keybindings</button>
            <button className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>
              Updates
              {updateInfo.status === 'ready' && <span className="update-dot" />}
            </button>
          </div>

          <div className="settings-content">

            {activeTab === 'interface' && (
              <div className="settings-form">
                <div className="form-group">
                  <label>App Mode</label>
                  <select value={localSettings.appMode} onChange={(e) => handleChange('appMode', e.target.value)}>
                    <option value="extended">Extended</option>
                    <option value="minimal">Minimal</option>
                  </select>
                  <span className="help-text">Minimal keeps the culling workflow focused. Extended enables additive tools as they ship.</span>
                </div>

                <div className="form-group">
                  <label>Default Card Scale</label>
                  <div className="flex-row">
                    <input type="range" min="0.5" max="2.0" step="0.1" value={localSettings.defaultCardScale} onChange={(e) => handleChange('defaultCardScale', Number(e.target.value))} />
                    <span>{localSettings.defaultCardScale.toFixed(1)}x</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Default Sorting</label>
                  <div className="flex-row">
                    <select value={localSettings.defaultSortBy} onChange={(e) => handleChange('defaultSortBy', e.target.value)}>
                      <option value="name">Name</option>
                      <option value="size">Size</option>
                      <option value="date">Date</option>
                      <option value="duration">Duration</option>
                    </select>
                    <select value={localSettings.defaultSortOrder} onChange={(e) => handleChange('defaultSortOrder', e.target.value)}>
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </div>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={localSettings.defaultGroupByFolder} onChange={(e) => handleChange('defaultGroupByFolder', e.target.checked)} />
                    Group videos by folder natively
                  </label>
                </div>

                <div className="form-group settings-section-divider">
                  <label>Export Report</label>
                  <button
                    className="btn-check-updates"
                    onClick={handleExportReport}
                    disabled={!directory || videos.length === 0 || isScanning}
                  >
                    <FileDown size={14} />
                    Export Report...
                  </button>
                  <span className="help-text">Choose filtered or all videos when exporting.</span>
                  {exportMessage && <span className="help-text">{exportMessage}</span>}
                </div>
              </div>
            )}

            {activeTab === 'cache' && (
              <div className="settings-form">
                <div className="form-group">
                  <label>Cache Storage</label>
                  <select
                    value={localSettings.cacheLocation}
                    onChange={(e) => void handleCacheLocationChange(e.target.value)}
                  >
                    <option value="centralised">Centralised</option>
                    <option value="per-drive">Per-drive</option>
                    <option value="distributed">Distributed</option>
                  </select>
                  <span className="help-text">Centralised stores cache in app data. Per-drive keeps cache on the same drive. Distributed creates a hidden .videocull folder inside each loaded folder.</span>
                </div>

                <div className="form-group">
                  <label>Central Cache Location</label>
                  <button
                    className="btn-check-updates"
                    onClick={() => void handleChooseCacheFolder('centralCachePath')}
                    disabled={localSettings.cacheLocation !== 'centralised'}
                  >
                    <Database size={14} />
                    Choose Folder
                  </button>
                  <span className="help-text">{localSettings.centralCachePath || 'Default app cache folder'}</span>
                </div>

                <div className="form-group">
                  <label>Per-drive Cache Location</label>
                  <button
                    className="btn-check-updates"
                    onClick={() => void handleChooseCacheFolder('perDriveCachePaths')}
                    disabled={localSettings.cacheLocation !== 'per-drive' || !currentDriveKey}
                  >
                    <Database size={14} />
                    Choose Folder
                  </button>
                  <span className="help-text">
                    {currentDriveKey
                      ? (localSettings.perDriveCachePaths[currentDriveKey] || `Default location for ${currentDriveKey}`)
                      : 'Open a folder to configure its drive.'}
                  </span>
                  {cacheMessage && <span className="help-text">{cacheMessage}</span>}
                </div>
              </div>
            )}

            {activeTab === 'processing' && (
              <div className="settings-form">
                <div className="form-group">
                  <label>Thumbnails per Video</label>
                  <select value={localSettings.thumbsPerVideo} onChange={(e) => handleChange('thumbsPerVideo', Number(e.target.value))}>
                    <option value={1}>1 Frame</option>
                    <option value={2}>2 Frames</option>
                    <option value={4}>4 Frames</option>
                    <option value={6}>6 Frames</option>
                    <option value={9}>9 Frames</option>
                  </select>
                  <span className="help-text">Number of preview shots extracted evenly per video. (Requires Clear Cache &amp; Rescan to apply)</span>
                </div>

                <div className="form-group">
                  <label>Skip Intro Blackframes (Delay)</label>
                  <div className="flex-row">
                    <input type="number" min="0" max="60" value={localSettings.skipIntroDelaySecs} onChange={(e) => handleChange('skipIntroDelaySecs', Number(e.target.value))} className="number-input" />
                    <span>Seconds</span>
                  </div>
                  <span className="help-text">Forces the first thumbnail to extract X seconds later to avoid black fade-in screens.</span>
                </div>

                <div className="form-group">
                  <label>Concurrent Processing Limit</label>
                  <select
                    value={localSettings.maxConcurrent === 'auto' ? 'auto' : localSettings.maxConcurrent}
                    onChange={(e) => handleChange('maxConcurrent', e.target.value === 'auto' ? 'auto' : Number(e.target.value))}
                  >
                    <option value="auto">Auto (Dynamically detect logical CPUs)</option>
                    <option value={1}>1 Thread (Slower, stable)</option>
                    <option value={2}>2 Threads</option>
                    <option value={3}>3 Threads</option>
                    <option value={4}>4 Threads</option>
                    <option value={8}>8 Threads</option>
                  </select>
                  <span className="help-text">Controls how many FFmpeg processes spawn simultaneously when generating thumbnails.</span>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={localSettings.cpuThreadsLimited} onChange={(e) => handleChange('cpuThreadsLimited', e.target.checked)} />
                    Force single FFmpeg thread per file (Recommended)
                  </label>
                  <span className="help-text indent">Prevents FFmpeg from gobbling 100% CPU on tiny thumbnails during parallel execution.</span>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input type="checkbox" checked={localSettings.hardwareAccel} onChange={(e) => handleChange('hardwareAccel', e.target.checked)} />
                    Enable Hardware Acceleration (Beta)
                  </label>
                  <span className="help-text indent">Attempts to route decoding through the GPU instead of CPU. May crash on legacy formats.</span>
                </div>
              </div>
            )}

            {activeTab === 'keybindings' && (
              <div className="settings-form">
                <div className="keybind-header-row">
                  <span className="help-text">Click a key to record a new shortcut. Escape cancels recording.</span>
                  <button className="btn-reset-keybinds" onClick={resetKeybinds} title="Reset all keybinds to defaults">
                    <RotateCcw size={13} />
                    Reset defaults
                  </button>
                </div>

                {KEYBIND_GROUPS.map((group) => {
                  const shortcuts = ALL_SHORTCUTS.filter((s) => s.group === group);
                  if (shortcuts.length === 0) return null;
                  return (
                    <div key={group} className="keybind-group">
                      <h4 className="keybind-group-title">{group}</h4>
                      {shortcuts.map((shortcut) => {
                        const bind = localSettings[shortcut.id] as Keybind;
                        const conflict = findConflict(shortcut.id, bind, currentBinds);
                        return (
                          <div key={shortcut.id} className="form-group row keybind-row">
                            <label className="keybind-label">
                              {shortcut.description}
                              {shortcut.context && (
                                <span className="keybind-context-tag">
                                  {shortcut.context === 'playing' ? 'while playing' : 'not playing'}
                                </span>
                              )}
                            </label>
                            <KeybindInput
                              value={bind}
                              onChange={(newBind) => handleKeybind(shortcut.id, newBind)}
                              conflict={conflict}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                <p className="help-text" style={{ marginTop: 12 }}>
                  <strong>Note:</strong> Esc always closes/stops. System shortcuts (Ctrl+O, F5, etc.) cannot be rebound here.
                </p>
              </div>
            )}

            {activeTab === 'updates' && (() => {
              const statusLabel: Record<string, string> = {
                idle: 'Not checked yet',
                checking: 'Checking for updates…',
                available: `Update available: v${updateInfo.version}`,
                downloading: `Downloading… ${updateInfo.percent ?? 0}%`,
                ready: `v${updateInfo.version} ready to install`,
                'up-to-date': "You're up to date",
                error: `Error: ${updateInfo.message ?? 'unknown'}`,
              };
              const isReady = updateInfo.status === 'ready';
              const isBusy = updateInfo.status === 'checking' || updateInfo.status === 'downloading' || updateInfo.status === 'available';
              return (
                <div className="settings-form">
                  <div className="form-group">
                    <label>Current Version</label>
                    <span className="version-display">v{appVersion || '…'}</span>
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <span className={`update-status-label update-status-${updateInfo.status}`}>
                      {statusLabel[updateInfo.status] ?? updateInfo.status}
                    </span>
                    {updateInfo.status === 'downloading' && (
                      <div className="update-progress-bar">
                        <div className="update-progress-fill" style={{ width: `${updateInfo.percent ?? 0}%` }} />
                      </div>
                    )}
                  </div>

                  <div className="form-group update-actions">
                    {!isReady && (
                      <button
                        className="btn-check-updates"
                        onClick={() => window.electronAPI?.checkForUpdates()}
                        disabled={isBusy}
                      >
                        <RefreshCw size={14} />
                        {updateInfo.status === 'checking' ? 'Checking…' : 'Check for updates'}
                      </button>
                    )}
                    {isReady && (
                      <button
                        className="btn-install-update"
                        onClick={() => window.electronAPI?.installUpdate()}
                      >
                        Restart to Install v{updateInfo.version}
                      </button>
                    )}
                  </div>

                  <div className="form-group checkbox-group">
                    <label>
                      <input
                        type="checkbox"
                        checked={localSettings.autoUpdates}
                        onChange={(e) => handleChange('autoUpdates', e.target.checked)}
                      />
                      Automatically check for updates on startup
                    </label>
                    <span className="help-text indent">When enabled, updates download silently in the background. You are always notified before anything installs.</span>
                  </div>
                </div>
              );
            })()}

          </div>
        </div>

        <div className="settings-footer">
          <button className="btn-cancel" onClick={close}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}