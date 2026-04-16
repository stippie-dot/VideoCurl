import { useState } from 'react';
import type { StatusFilter } from '../types';
import useStore from '../store';
import { formatSize, formatRelativeTime, formatRecentPath } from '../utils';
import {
  FolderOpen, RefreshCw, Play, Trash2, Filter,
  ArrowUpDown, HardDrive, FileVideo, Check, X, Clock, SkipForward, Maximize2, Settings, ChevronDown
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  onRescan: () => void;
  onDirectoryPicked: (path: string) => void;
  onNotify: (message: string, kind?: 'info' | 'error') => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ onRescan, onDirectoryPicked, onNotify, onOpenSettings }: SidebarProps) {
  const directory = useStore((s) => s.directory);
  const setDirectory = useStore((s) => s.setDirectory);
  const includeSubfolders = useStore((s) => s.includeSubfolders);
  const setIncludeSubfolders = useStore((s) => s.setIncludeSubfolders);
  const statusFilter = useStore((s) => s.statusFilter);
  const setStatusFilter = useStore((s) => s.setStatusFilter);
  const sortBy = useStore((s) => s.sortBy);
  const setSortBy = useStore((s) => s.setSortBy);
  const sortOrder = useStore((s) => s.sortOrder);
  const setSortOrder = useStore((s) => s.setSortOrder);
  const minSizeFilter = useStore((s) => s.minSizeFilter);
  const setMinSizeFilter = useStore((s) => s.setMinSizeFilter);
  const minDurationFilter = useStore((s) => s.minDurationFilter);
  const setMinDurationFilter = useStore((s) => s.setMinDurationFilter);
  const stats = useStore((s) => s.stats);
  const isScanning = useStore((s) => s.isScanning);
  const scanProgress = useStore((s) => s.scanProgress);
  const isGenerating = useStore((s) => s.isGenerating);
  const genProgress = useStore((s) => s.genProgress);
  const setReviewMode = useStore((s) => s.setReviewMode);
  const setReviewIndex = useStore((s) => s.setReviewIndex);
  const filteredVideos = useStore((s) => s.filteredVideos);
  const videos = useStore((s) => s.videos);
  const cardScale = useStore((s) => s.cardScale);
  const setCardScale = useStore((s) => s.setCardScale);
  const groupByFolder = useStore((s) => s.groupByFolder);
  const setGroupByFolder = useStore((s) => s.setGroupByFolder);
  const folderSortBy = useStore((s) => s.folderSortBy);
  const setFolderSortBy = useStore((s) => s.setFolderSortBy);
  const folderSortOrder = useStore((s) => s.folderSortOrder);
  const setFolderSortOrder = useStore((s) => s.setFolderSortOrder);
  const recentDirectories = useStore((s) => s.settings.recentDirectories);
  const recentDirectoryTimestamps = useStore((s) => s.settings.recentDirectoryTimestamps);
  const clearRecentDirectories = useStore((s) => s.clearRecentDirectories);
  const removeRecentDirectory = useStore((s) => s.removeRecentDirectory);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showRecents, setShowRecents] = useState(false);

  const handleSelectDir = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory();
    if (dir) onDirectoryPicked(dir);
  };

  const handleOpenRecent = async (dir: string) => {
    if (!window.electronAPI) {
      setDirectory(dir);
      setShowRecents(false);
      return;
    }
    const result = await window.electronAPI.validateDroppedPath(dir);
    if (!result.valid || !result.isDirectory) {
      removeRecentDirectory(dir);
      onNotify('This recent folder is no longer available.', 'error');
      return;
    }
    onDirectoryPicked(dir);
    setShowRecents(false);
  };


  const handleBatchDelete = async () => {
    if (!window.electronAPI) return;
    const toDelete = videos.filter((v) => v.status === 'delete');
    if (toDelete.length === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to move ${toDelete.length} videos (${formatSize(stats.deleteSize)}) to the Recycle Bin?`
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const results = await window.electronAPI.batchDelete(toDelete.map((v) => v.path));
      const succeeded = results.filter((r) => r.success).map((r) => r.path);
      useStore.getState().removeDeletedVideos(succeeded);
      const permanentSuccessCount = results.filter((r) => r.method === 'permanent' && r.success).length;
      const permanentFailureCount = results.filter((r) => r.method === 'permanent' && !r.success).length;
      if (permanentSuccessCount > 0 && permanentFailureCount > 0) {
        onNotify('Some files were permanently deleted, but some still failed.', 'error');
      } else if (permanentSuccessCount > 0) {
        onNotify('Some files were permanently deleted because the Recycle Bin was unavailable.', 'error');
      } else if (permanentFailureCount > 0) {
        onNotify('Some files could not be deleted.', 'error');
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
    setIsDeleting(false);
  };

  const handleStartReview = () => {
    setReviewIndex(0);
    setReviewMode(true);
  };

  const minSizeOptions = [
    { label: 'All sizes', value: 0 },
    { label: '> 50 MB', value: 50 * 1024 * 1024 },
    { label: '> 100 MB', value: 100 * 1024 * 1024 },
    { label: '> 500 MB', value: 500 * 1024 * 1024 },
    { label: '> 1 GB', value: 1024 * 1024 * 1024 },
  ];

  const filterOptions: { key: StatusFilter; label: string; icon?: React.ReactNode }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending', icon: <Clock size={12} /> },
    { key: 'skipped', label: 'Skipped', icon: <SkipForward size={12} /> },
    { key: 'keep', label: 'Keep', icon: <Check size={12} /> },
    { key: 'delete', label: 'Delete', icon: <X size={12} /> },
  ];

  const formatDurationInput = (seconds: number): string => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">
          <FileVideo size={22} />
          Video Cull
        </h1>
      </div>

      <section className="sidebar-section">
        <button className="btn btn-primary" onClick={handleSelectDir}>
          <FolderOpen size={16} />
          Change Folder
        </button>

        <div className="directory-info">
          <HardDrive size={14} />
          <span className="directory-path" title={directory || undefined}>
            {directory}
          </span>
          {recentDirectories.length > 1 && (
            <button
              className="btn-recents-toggle"
              title="Recent folders"
              aria-expanded={showRecents}
              aria-controls="sidebar-recents-list"
              onClick={() => setShowRecents((v) => !v)}
            >
              <ChevronDown size={14} style={{ transform: showRecents ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
          )}
        </div>
        {showRecents && recentDirectories.length > 1 && (
          <>
          <ul className="recents-list" id="sidebar-recents-list">
            {recentDirectories.slice(0, 5).map((d) => (
              <li key={d}>
                <button
                  className={`recents-item ${d === directory ? 'recents-item-active' : ''}`}
                  title={`${d} \u2022 opened ${formatRelativeTime(recentDirectoryTimestamps[d])}`}
                  disabled={d === directory}
                  onClick={() => void handleOpenRecent(d)}
                >
                  <FolderOpen size={12} />
                  {formatRecentPath(d)}
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn btn-ghost recents-clear-btn"
            onClick={() => {
              clearRecentDirectories();
              setShowRecents(false);
              onNotify('Cleared recent folders.', 'info');
            }}
          >
            Clear all
          </button>
          </>
        )}

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={includeSubfolders}
            onChange={(e) => setIncludeSubfolders(e.target.checked)}
          />
          Include subfolders
        </label>

        <button className="btn btn-ghost" onClick={onRescan} disabled={isScanning}>
          <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
          Rescan
        </button>
      </section>

      {(isScanning || isGenerating) && (
        <section className="sidebar-section">
          {isScanning && (
            <div className="progress-info">
              <span className="progress-label">Scanning…</span>
              <span className="progress-detail">{scanProgress.found} videos found</span>
            </div>
          )}
          {isGenerating && (
            <div className="progress-info">
              <span className="progress-label">Thumbnails…</span>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${genProgress.total > 0 ? (genProgress.current / genProgress.total) * 100 : 0}%` }}
                />
              </div>
              <span className="progress-detail">
                {genProgress.current} / {genProgress.total}
              </span>
            </div>
          )}
        </section>
      )}

      {stats.total > 0 && (
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">Statistics</h3>
          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-value">{stats.total}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item stat-pending">
              <span className="stat-value">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
            <div className="stat-item stat-keep">
              <span className="stat-value">{stats.keep}</span>
              <span className="stat-label">Keep</span>
            </div>
            <div className="stat-item stat-skipped">
              <span className="stat-value">{stats.skipped}</span>
              <span className="stat-label">Skipped</span>
            </div>
            <div className="stat-item stat-delete">
              <span className="stat-value">{stats.delete}</span>
              <span className="stat-label">Delete</span>
            </div>
          </div>
          {stats.deleteSize > 0 && (
            <p className="delete-size-note">
              <Trash2 size={13} />
              {formatSize(stats.deleteSize)} to free up
            </p>
          )}
        </section>
      )}

      {stats.total > 0 && (
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">
            <Filter size={14} /> Filters
          </h3>

          <div className="filter-pills">
            {filterOptions.map((f) => (
              <button
                key={f.key}
                className={`pill ${statusFilter === f.key ? 'pill-active' : ''} ${f.key !== 'all' ? `pill-${f.key}` : ''}`}
                onClick={() => setStatusFilter(f.key)}
              >
                {f.icon}{f.label}
              </button>
            ))}
          </div>

          <select
            className="sidebar-select"
            value={minSizeFilter}
            onChange={(e) => setMinSizeFilter(Number(e.target.value))}
          >
            {minSizeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <div className="filter-input-group">
            <label className="filter-input-label" htmlFor="min-duration-filter">Minimum duration (seconds)</label>
            <input
              id="min-duration-filter"
              className="sidebar-number-input"
              type="number"
              min={0}
              step={1}
              value={minDurationFilter}
              onChange={(e) => {
                const raw = Number(e.target.value);
                const safeValue = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
                setMinDurationFilter(safeValue);
              }}
            />
            <span className="filter-input-help">Equivalent: {formatDurationInput(minDurationFilter)} (m:ss)</span>
          </div>
        </section>
      )}

      {stats.total > 0 && (
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">
            <ArrowUpDown size={14} /> Sort
          </h3>

          <button
            className={`btn btn-toggle ${groupByFolder ? 'btn-toggle-active' : ''}`}
            onClick={() => setGroupByFolder(!groupByFolder)}
            title="Group videos by subfolder"
          >
            <FolderOpen size={14} />
            Group by folder
          </button>

          {groupByFolder ? (
            <div className="sort-nested-options">
              <div className="sort-group">
                <span className="sort-label">Folder order</span>
                <div className="sort-row">
                  <select
                    className="sidebar-select"
                    value={folderSortBy}
                    onChange={(e) => setFolderSortBy(e.target.value as 'name' | 'size')}
                  >
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                  </select>
                  <button
                    className="btn btn-icon"
                    onClick={() => setFolderSortOrder(folderSortOrder === 'asc' ? 'desc' : 'asc')}
                    title={folderSortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    <ArrowUpDown size={14} style={{ transform: folderSortOrder === 'desc' ? 'scaleY(-1)' : 'none' }} />
                  </button>
                </div>
              </div>
              <div className="sort-group">
                <span className="sort-label">Within folder</span>
                <div className="sort-row">
                  <select
                    className="sidebar-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'duration' | 'date')}
                  >
                    <option value="name">Name</option>
                    <option value="size">Size</option>
                    <option value="duration">Duration</option>
                    <option value="date">Date</option>
                  </select>
                  <button
                    className="btn btn-icon"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  >
                    <ArrowUpDown size={14} style={{ transform: sortOrder === 'desc' ? 'scaleY(-1)' : 'none' }} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="sort-row">
              <select
                className="sidebar-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'size' | 'duration' | 'date')}
              >
                <option value="name">Name</option>
                <option value="size">Size</option>
                <option value="duration">Duration</option>
                <option value="date">Date</option>
              </select>
              <button
                className="btn btn-icon"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                <ArrowUpDown size={14} style={{ transform: sortOrder === 'desc' ? 'scaleY(-1)' : 'none' }} />
              </button>
            </div>
          )}
        </section>
      )}

      {stats.total > 0 && (
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">
            <Maximize2 size={14} /> Card Size
          </h3>
          <div className="slider-row">
            <input
              type="range"
              className="sidebar-slider"
              min={0.6}
              max={2}
              step={0.1}
              value={cardScale}
              onChange={(e) => setCardScale(Number(e.target.value))}
            />
            <span className="slider-value">{Math.round(cardScale * 100)}%</span>
          </div>
        </section>
      )}

      {stats.total > 0 && (
        <div className="sidebar-actions">
          {stats.delete > 0 && (
            <button
              className="btn btn-danger"
              onClick={handleBatchDelete}
              disabled={isDeleting}
            >
              <Trash2 size={16} />
              {isDeleting
                ? 'Deleting…'
                : `Delete ${stats.delete} videos (${formatSize(stats.deleteSize)})`}
            </button>
          )}
        </div>
      )}

      <div className="sidebar-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <button className="settings-icon-btn" onClick={onOpenSettings} title="Preferences (Ctrl+,)" style={{ flexShrink: 0 }}>
          <Settings size={18} />
        </button>

        {filteredVideos.length > 0 && (
          <button 
            className="btn btn-accent" 
            onClick={handleStartReview} 
            style={{ flex: 1, padding: '8px', fontSize: '13px' }}
          >
            <Play size={16} />
            Review Mode
          </button>
        )}
      </div>
    </aside>
  );
}
