import React, { useState, useEffect } from 'react';
import useStore from '../store';
import { X, RotateCcw } from 'lucide-react';
import type { AppSettings } from '../types';
import { ALL_SHORTCUTS, findConflict, type KeybindSettingKey, type ShortcutGroup } from '../keybinds';
import { DEFAULT_KEYBINDS } from '../keybind-defaults';
import type { Keybind } from '../keybinds';
import KeybindInput from './KeybindInput';
import './SettingsModal.css';

const KEYBIND_GROUPS: ShortcutGroup[] = ['Review mode', 'Preview', 'Global'];

export default function SettingsModal() {
  const isOpen = useStore((s) => s.isSettingsModalOpen);
  const close = () => useStore.getState().setIsSettingsModalOpen(false);
  const globalSettings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const saveSettings = useStore((s) => s.saveSettings);

  const [activeTab, setActiveTab] = useState<'general' | 'keybindings' | 'advanced'>('general');
  const [localSettings, setLocalSettings] = useState<AppSettings>(globalSettings);

  // Sync when opening
  useEffect(() => {
    if (isOpen) {
      setLocalSettings(useStore.getState().settings);
    }
  }, [isOpen, globalSettings]);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppSettings, val: unknown) => {
    setLocalSettings((prev) => ({ ...prev, [key]: val }));
  };

  const handleKeybind = (id: KeybindSettingKey, bind: Keybind) => {
    setLocalSettings((prev) => ({ ...prev, [id]: bind }));
  };

  const resetKeybinds = () => {
    setLocalSettings((prev) => ({ ...prev, ...DEFAULT_KEYBINDS }));
  };

  const handeSave = async () => {
    updateSettings(localSettings);
    await saveSettings();
    close();
  };

  // Build a Record<KeybindSettingKey, Keybind> from localSettings for conflict checks
  const currentBinds = Object.fromEntries(
    ALL_SHORTCUTS.map((s) => [s.id, localSettings[s.id] as Keybind])
  ) as Record<KeybindSettingKey, Keybind>;

  return (
    <div className="settings-overlay">
      <div className="settings-window">
        {/* Header */}
        <div className="settings-header">
          <h2>Preferences</h2>
          <button className="settings-close-btn" onClick={close} title="Close without saving">
            <X size={20} />
          </button>
        </div>

        {/* Layout */}
        <div className="settings-body">
          {/* Sidebar */}
          <div className="settings-sidebar">
            <button className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
            <button className={`tab-btn ${activeTab === 'keybindings' ? 'active' : ''}`} onClick={() => setActiveTab('keybindings')}>Keybindings</button>
            <button className={`tab-btn ${activeTab === 'advanced' ? 'active' : ''}`} onClick={() => setActiveTab('advanced')}>Advanced</button>
          </div>

          {/* Content Pane */}
          <div className="settings-content">
            {activeTab === 'general' && (
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

            {activeTab === 'advanced' && (
              <div className="settings-form">
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

                <div className="form-group">
                  <label>Skip Intro Blackframes (Delay)</label>
                  <div className="flex-row">
                    <input type="number" min="0" max="60" value={localSettings.skipIntroDelaySecs} onChange={(e) => handleChange('skipIntroDelaySecs', Number(e.target.value))} className="number-input" />
                    <span>Seconds</span>
                  </div>
                  <span className="help-text">Forces the first thumbnail to extract X seconds later to avoid black fade-in screens.</span>
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
          </div>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button className="btn-cancel" onClick={close}>Cancel</button>
          <button className="btn-save" onClick={handeSave}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}
