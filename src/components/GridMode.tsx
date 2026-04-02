import { useRef, useState, useEffect, useCallback } from 'react';
import { FixedSizeGrid, type GridChildComponentProps } from 'react-window';
import type { Video } from '../types';
import useStore from '../store';
import VideoCard from './VideoCard';
import './GridMode.css';

const BASE_CARD_WIDTH = 300;
const BASE_CARD_HEIGHT = 240;
const GAP = 12;

export default function GridMode() {
  const filteredVideos = useStore((s) => s.filteredVideos);
  const setReviewMode = useStore((s) => s.setReviewMode);
  const setReviewIndex = useStore((s) => s.setReviewIndex);
  const cardScale = useStore((s) => s.cardScale);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const cardWidth = Math.round(BASE_CARD_WIDTH * cardScale);
  const cardHeight = Math.round(BASE_CARD_HEIGHT * cardScale);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnCount = Math.max(1, Math.floor((dimensions.width + GAP) / (cardWidth + GAP)));
  const columnWidth = (dimensions.width - GAP * (columnCount + 1)) / columnCount;
  const rowCount = Math.ceil(filteredVideos.length / columnCount);

  const handleCardClick = useCallback((video: Video) => {
    const idx = filteredVideos.findIndex((v) => v.id === video.id);
    if (idx >= 0) {
      setReviewIndex(idx);
      setReviewMode(true);
    }
  }, [filteredVideos, setReviewIndex, setReviewMode]);

  const Cell = useCallback(({ columnIndex, rowIndex, style }: GridChildComponentProps) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= filteredVideos.length) return null;
    const video = filteredVideos[index];

    const adjustedStyle: React.CSSProperties = {
      ...style,
      left: Number(style.left) + GAP,
      top: Number(style.top) + GAP,
      width: Number(style.width) - GAP,
      height: Number(style.height) - GAP,
    };

    return (
      <div style={adjustedStyle}>
        <VideoCard video={video} onClick={handleCardClick} />
      </div>
    );
  }, [filteredVideos, columnCount, handleCardClick]);

  return (
    <div className="grid-mode" ref={containerRef}>
      {filteredVideos.length === 0 ? (
        <div className="grid-empty">
          <p>No videos match your current filters.</p>
        </div>
      ) : (
        <FixedSizeGrid
          columnCount={columnCount}
          columnWidth={columnWidth + GAP}
          height={dimensions.height}
          rowCount={rowCount}
          rowHeight={cardHeight + GAP}
          width={dimensions.width}
          overscanRowCount={3}
        >
          {Cell}
        </FixedSizeGrid>
      )}
    </div>
  );
}
