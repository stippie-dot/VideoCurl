import useStore from '../store';
import { FolderOpen, Film, Settings } from 'lucide-react';
import { formatKeybind } from '../keybinds';
import './EmptyState.css';

export default function EmptyState() {
  const setDirectory = useStore((s) => s.setDirectory);
  const includeSubfolders = useStore((s) => s.includeSubfolders);
  const setIncludeSubfolders = useStore((s) => s.setIncludeSubfolders);
  const settings = useStore((s) => s.settings);

  const handleSelect = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory();
    if (dir) setDirectory(dir);
  };

  return (
    <div className="empty-state">
      <button className="settings-icon-btn empty-state-settings" onClick={() => useStore.getState().setIsSettingsModalOpen(true)} title="Preferences (Ctrl+,)">
        <Settings size={20} />
      </button>
      <div className="empty-icon">
        <Film size={56} strokeWidth={1.2} />
      </div>
      <h2 className="empty-title">Video Cull</h2>
      <p className="empty-desc">
        Select a folder to start reviewing your video collection.<br />
        Quickly sort, keep, or delete videos using thumbnails.
      </p>
      <button className="empty-btn" onClick={handleSelect}>
        <FolderOpen size={20} strokeWidth={2.5} />
        Open Directory
      </button>

      <label className="empty-subfolders">
        <input 
          type="checkbox" 
          checked={includeSubfolders}
          onChange={(e) => setIncludeSubfolders(e.target.checked)}
        />
        Include subfolders
      </label>

      <div className="empty-shortcuts">
        <span><kbd>{formatKeybind(settings.keyKeep)}</kbd> Keep</span>
        <span><kbd>{formatKeybind(settings.keyDelete)}</kbd> Delete</span>
        <span><kbd>{formatKeybind(settings.keySkip)}</kbd> Skip</span>
        <span><kbd>{formatKeybind(settings.keyUndo)}</kbd> Undo</span>
      </div>
    </div>
  );
}
