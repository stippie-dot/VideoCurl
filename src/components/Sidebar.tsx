import { useState } from 'react';
import type { StatusFilter } from '../types';
import useStore from '../store';
import { formatSize } from '../utils';
import {
  FolderOpen, RefreshCw, Play, Trash2, Filter,
  ArrowUpDown, HardDrive, FileVideo, Check, X, Clock, Maximize2
} from 'lucide-react';
import './Sidebar.css';

interface SidebarProps {
  onRescan: () => void;
}

export default function Sidebar({ onRescan }: SidebarProps) {
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

  const [isDeleting, setIsDeleting] = useState(false);

  const handleSelectDir = async () => {
    if (!window.electronAPI) return;
    const dir = await window.electronAPI.selectDirectory();
    if (dir) setDirectory(dir);
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

      const dir = useStore.getState().directory;
      if (dir) {
        await window.electronAPI.saveCache(dir, useStore.getState().videos);
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
    { key: 'keep', label: 'Keep', icon: <Check size={12} /> },
    { key: 'delete', label: 'Delete', icon: <X size={12} /> },
  ];

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
          {directory ? 'Change Folder' : 'Select Folder'}
        </button>

        {directory && (
          <div className="directory-info">
            <HardDrive size={14} />
            <span className="directory-path" title={directory}>
              {directory}
            </span>
          </div>
        )}

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={includeSubfolders}
            onChange={(e) => setIncludeSubfolders(e.target.checked)}
          />
          Include subfolders
        </label>

        {directory && (
          <button className="btn btn-ghost" onClick={onRescan} disabled={isScanning}>
            <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
            Rescan
          </button>
        )}
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
        </section>
      )}

      {stats.total > 0 && (
        <section className="sidebar-section">
          <h3 className="sidebar-section-title">
            <ArrowUpDown size={14} /> Sort
          </h3>
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

      <div className="sidebar-actions">
        {filteredVideos.length > 0 && (
          <button className="btn btn-accent" onClick={handleStartReview}>
            <Play size={16} />
            Review Mode
          </button>
        )}
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
    </aside>
  );
}
