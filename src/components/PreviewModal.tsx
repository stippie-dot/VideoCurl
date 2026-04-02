import React, { useRef, useEffect } from 'react';
import useStore from '../store';
import { X } from 'lucide-react';
import '@videojs/react/video/minimal-skin.css';
import { createPlayer, videoFeatures } from '@videojs/react';
import { MinimalVideoSkin, Video } from '@videojs/react/video';
import './PreviewModal.css';

const Player = createPlayer({ features: videoFeatures });

export default function PreviewModal() {
  const previewVideo = useStore((s) => s.previewVideo);
  const setPreviewVideo = useStore((s) => s.setPreviewVideo);
  const videoRef = useRef<HTMLVideoElement>(null);

  const close = () => {
    setPreviewVideo(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (!previewVideo) return;

      switch (e.key.toLowerCase()) {
        case 'escape':
          e.preventDefault();
          close();
          break;
        case 'arrowleft':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          }
          break;
        case 'arrowright':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.currentTime += 5;
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewVideo, close]);

  if (!previewVideo) return null;

  return (
    <div className="preview-modal-overlay" onClick={close}>
      <div className="preview-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="preview-close-btn" onClick={close} title="Close (Esc)">
          <X size={24} />
        </button>

        <div className="preview-video-container">
          <Player.Provider>
            <MinimalVideoSkin>
              <Video
                ref={videoRef}
                className="video-player"
                src={`video:///${previewVideo.path.split('\\').join('/')}`}
                autoPlay
                playsInline
              />
            </MinimalVideoSkin>
          </Player.Provider>
        </div>
      </div>
    </div>
  );
}
