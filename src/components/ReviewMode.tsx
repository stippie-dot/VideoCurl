import { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import useStore from '../store';
import ThumbnailStrip from './ThumbnailStrip';
import { formatSize, formatDuration, formatDate } from '../utils';
import {
  Check, Trash2, SkipForward, Undo2, X, Play,
  ChevronLeft, ChevronRight, HardDrive, Clock, Calendar
} from 'lucide-react';
import '@videojs/react/video/skin.css';
import { createPlayer, videoFeatures } from '@videojs/react';
import { VideoSkin, Video } from '@videojs/react/video';
import { isWebSupported } from '../utils';
import './ReviewMode.css';

const Player = createPlayer({ features: videoFeatures });

export default function ReviewMode() {
  const filteredVideos = useStore((s) => s.filteredVideos);
  const reviewIndex = useStore((s) => s.reviewIndex);
  const setReviewIndex = useStore((s) => s.setReviewIndex);
  const setReviewMode = useStore((s) => s.setReviewMode);
  const setVideoStatus = useStore((s) => s.setVideoStatus);
  const undo = useStore((s) => s.undo);
  const undoStack = useStore((s) => s.undoStack);

  const video = filteredVideos[reviewIndex] ?? null;
  const total = filteredVideos.length;

  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const isSupported = useMemo(() => {
    if (!video) return false;
    return isWebSupported(video.path);
  }, [video]);

  // Reset playing state when video changes
  useEffect(() => {
    setIsPlaying(false);
  }, [video?.id]);

  const advance = useCallback(() => {
    if (reviewIndex < total - 1) {
      setReviewIndex(reviewIndex + 1);
    }
  }, [reviewIndex, total, setReviewIndex]);

  const goBack = useCallback(() => {
    if (reviewIndex > 0) {
      setReviewIndex(reviewIndex - 1);
    }
  }, [reviewIndex, setReviewIndex]);

  const markKeep = useCallback(() => {
    if (!video) return;
    setVideoStatus(video.id, 'keep');
    advance();
  }, [video, advance, setVideoStatus]);

  const markDelete = useCallback(() => {
    if (!video) return;
    setVideoStatus(video.id, 'delete');
    advance();
  }, [video, advance, setVideoStatus]);

  const skip = useCallback(() => {
    advance();
  }, [advance]);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handlePlay = useCallback(() => {
    if (!video) return;
    if (isSupported) {
      setIsPlaying((prev) => !prev);
    } else if (window.electronAPI) {
      window.electronAPI.openVideo(video.path);
    }
  }, [video, isSupported]);

  const close = useCallback(() => {
    setReviewMode(false);
  }, [setReviewMode]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          markKeep();
          break;
        case 'd':
        case 'delete':
          e.preventDefault();
          markDelete();
          break;
        case 's':
        case ' ':
          e.preventDefault();
          handlePlay();
          break;
        case 'z':
          e.preventDefault();
          handleUndo();
          break;
        case 'escape':
          e.preventDefault();
          if (isPlaying) {
            setIsPlaying(false);
          } else {
            close();
          }
          break;
        case 'arrowleft':
          e.preventDefault();
          if (isPlaying && videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          } else {
            goBack();
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (isPlaying && videoRef.current) {
            // Note: HTMLMediaElement doesn't have a reliable end bounds check before setting, 
            // but setting beyond duration caps to duration.
            videoRef.current.currentTime += 5;
          } else {
            advance();
          }
          break;
        case 'enter':
          e.preventDefault();
          if (e.ctrlKey && window.electronAPI) {
            window.electronAPI.openVideo(video.path);
          } else {
            handlePlay();
          }
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [markKeep, markDelete, skip, handleUndo, close, goBack, advance, handlePlay, isPlaying]);

  if (!video) {
    return (
      <div className="review-mode">
        <div className="review-finished">
          <h2>All done! 🎉</h2>
          <p>You've reviewed all videos in this filter.</p>
          <button className="btn btn-accent" onClick={close} style={{ marginTop: 16 }}>
            Back to Grid
          </button>
        </div>
      </div>
    );
  }

  const statusClass =
    video.status === 'keep' ? 'review-keep' :
    video.status === 'delete' ? 'review-delete' : '';

  return (
    <div className={`review-mode ${statusClass}`}>
      <button className="review-close" onClick={close} title="Close (Esc)">
        <X size={20} />
      </button>

      <div className="review-counter">
        {reviewIndex + 1} / {total}
      </div>

      <div className="review-content">
        <button
          className="review-nav review-nav-left"
          onClick={(e) => {
            e.currentTarget.blur();
            goBack();
          }}
          disabled={reviewIndex === 0}
        >
          <ChevronLeft size={28} />
        </button>

        <div className="review-center">
          <div className={`review-thumbs ${isPlaying ? 'playing' : ''}`}>
            {isPlaying ? (
              <Player.Provider>
                <VideoSkin>
                  <Video
                    ref={videoRef}
                    className="video-player"
                    src={`video:///${video.path.split('\\').join('/')}`}
                    autoPlay
                    playsInline
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                    }}
                  />
                </VideoSkin>
              </Player.Provider>
            ) : (
              <ThumbnailStrip thumbnails={video.thumbnails} osThumbnail={video.osThumbnail} />
            )}
          </div>

          <div className="review-filename">{video.filename}</div>

          <div className="review-meta-row">
            <span className="review-meta-item">
              <HardDrive size={13} />
              {formatSize(video.sizeBytes)}
            </span>
            <span className="review-meta-item">
              <Clock size={13} />
              {formatDuration(video.durationSecs)}
            </span>
            <span className="review-meta-item">
              <Calendar size={13} />
              {formatDate(video.metadataDate || video.date)}
            </span>
          </div>
        </div>

        <button
          className="review-nav review-nav-right"
          onClick={(e) => {
            e.currentTarget.blur();
            advance();
          }}
          disabled={reviewIndex >= total - 1}
        >
          <ChevronRight size={28} />
        </button>
      </div>

      <div className="review-actions">
        <button
          className="review-action-btn review-undo"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          title="Undo (Z)"
        >
          <Undo2 size={18} />
          <span>Undo</span>
          <kbd>Z</kbd>
        </button>

        <button className="review-action-btn review-btn-delete" onClick={markDelete} title="Delete (D)">
          <Trash2 size={20} />
          <span>Delete</span>
          <kbd>D</kbd>
        </button>

        <button className="review-action-btn review-btn-play" onClick={handlePlay} title="Play (Enter)">
          <Play size={20} />
          <span>Play</span>
          <kbd>↵</kbd>
        </button>

        <button className="review-action-btn review-btn-skip" onClick={skip} title="Skip (S / Space)">
          <SkipForward size={20} />
          <span>Skip</span>
          <kbd>S</kbd>
        </button>

        <button className="review-action-btn review-btn-keep" onClick={markKeep} title="Keep (K)">
          <Check size={20} />
          <span>Keep</span>
          <kbd>K</kbd>
        </button>
      </div>
    </div>
  );
}
