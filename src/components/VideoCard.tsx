import type { Video } from '../types';
import useStore from '../store';
import ThumbnailStrip from './ThumbnailStrip';
import { formatSize, formatDuration, isWebSupported } from '../utils';
import { Check, Trash2, Play } from 'lucide-react';
import './VideoCard.css';

interface VideoCardProps {
  video: Video;
  style?: React.CSSProperties;
  onClick?: (video: Video) => void;
}

export default function VideoCard({ video, style, onClick }: VideoCardProps) {
  const setVideoStatus = useStore((s) => s.setVideoStatus);
  const setPreviewVideo = useStore((s) => s.setPreviewVideo);

  const statusClass =
    video.status === 'keep' ? 'card-keep' :
    video.status === 'delete' ? 'card-delete' : '';

  const handleKeep = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoStatus(video.id, video.status === 'keep' ? 'pending' : 'keep');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVideoStatus(video.id, video.status === 'delete' ? 'pending' : 'delete');
  };

  const isWeb = isWebSupported(video.path);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isWeb && !e.ctrlKey) {
      setPreviewVideo(video);
    } else if (window.electronAPI) {
      window.electronAPI.openVideo(video.path);
    }
  };

  return (
    <div className={`video-card ${statusClass}`} style={style} onClick={() => onClick?.(video)}>
      <div className="card-thumb-area">
        <ThumbnailStrip thumbnails={video.thumbnails} compact />

        {video.status !== 'pending' && (
          <div className={`card-status-badge badge-${video.status}`}>
            {video.status === 'keep' && <Check size={12} />}
            {video.status === 'delete' && <Trash2 size={12} />}
          </div>
        )}

        <div className="card-hover-overlay">
          <button 
            className="card-action-btn card-play-btn" 
            onClick={handlePlay} 
            title={isWeb ? "Quick Preview (Ctrl+Click for external player)" : "Play externally"}
          >
            <Play size={20} />
          </button>
        </div>
      </div>

      <div className="card-info">
        <p className="card-filename" title={video.filename}>
          {video.filename}
        </p>
        <div className="card-meta">
          <span>{formatSize(video.sizeBytes)}</span>
          <span className="meta-sep">•</span>
          <span>{formatDuration(video.durationSecs)}</span>
        </div>
      </div>

      <div className="card-actions">
        <button
          className={`card-btn card-btn-keep ${video.status === 'keep' ? 'active' : ''}`}
          onClick={handleKeep}
          title="Keep (K)"
        >
          <Check size={14} />
        </button>
        <button
          className={`card-btn card-btn-delete ${video.status === 'delete' ? 'active' : ''}`}
          onClick={handleDelete}
          title="Delete (D)"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
