import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { VariableSizeList } from 'react-window';
import type { ListOnScrollProps } from 'react-window';
import type { Video } from '../types';
import useStore from '../store';
import VideoCard from './VideoCard';
import { formatSize } from '../utils';
import './GridMode.css';

const BASE_CARD_WIDTH = 450;
const BASE_CARD_HEIGHT = 360;
const GAP = 12;
const HEADER_HEIGHT = 44;

let persistedGridScroll = { directory: null as string | null, offset: 0 };

interface HeaderRow {
  type: 'header';
  label: string;
  count: number;
  totalSize: number;
}

interface CardsRow {
  type: 'cards';
  videos: Video[];
}

type RowItem = HeaderRow | CardsRow;

/** Extract display-friendly folder name relative to root directory */
function getFolderLabel(video: Video, rootDir: string | null): string {
  const sep = video.path.includes('/') ? '/' : '\\';
  const dir = video.path.substring(0, video.path.lastIndexOf(sep));

  if (!rootDir) return dir;

  // Show relative path from root, or "Root" for top-level
  if (dir === rootDir) return 'Root';
  const relative = dir.startsWith(rootDir + sep)
    ? dir.substring(rootDir.length + 1)
    : dir;
  return relative || 'Root';
}

export default function GridMode() {
  const filteredVideos = useStore((s) => s.filteredVideos);
  const setReviewMode = useStore((s) => s.setReviewMode);
  const setReviewIndex = useStore((s) => s.setReviewIndex);
  const cardScale = useStore((s) => s.cardScale);
  const groupByFolder = useStore((s) => s.groupByFolder);
  const directory = useStore((s) => s.directory);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  const initialScrollOffset = useMemo(() => {
    if (persistedGridScroll.directory !== directory) return 0;
    return persistedGridScroll.offset;
  }, [directory]);

  useEffect(() => {
    if (persistedGridScroll.directory !== directory) {
      persistedGridScroll = { directory, offset: 0 };
    }
  }, [directory]);

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

  // Build flat row items: headers + card rows
  const { rows, rowStructureKey } = useMemo(() => {
    if (!groupByFolder) {
      // No grouping — just chunk into rows of cards
      const result: RowItem[] = [];
      for (let i = 0; i < filteredVideos.length; i += columnCount) {
        result.push({ type: 'cards', videos: filteredVideos.slice(i, i + columnCount) });
      }
      const structureKey = result.map((row) => `c:${row.videos.length}`).join('|');
      return { rows: result, rowStructureKey: structureKey };
    }

    // Group by folder
    const groups: { label: string; videos: Video[] }[] = [];
    let currentLabel: string | null = null;
    let currentGroup: Video[] = [];

    for (const video of filteredVideos) {
      const label = getFolderLabel(video, directory);
      if (label !== currentLabel) {
        if (currentGroup.length > 0 && currentLabel !== null) {
          groups.push({ label: currentLabel, videos: currentGroup });
        }
        currentLabel = label;
        currentGroup = [video];
      } else {
        currentGroup.push(video);
      }
    }
    if (currentGroup.length > 0 && currentLabel !== null) {
      groups.push({ label: currentLabel, videos: currentGroup });
    }

    const result: RowItem[] = [];
    for (const group of groups) {
      // Only show headers if there are multiple groups
      if (groups.length > 1) {
        const totalSize = group.videos.reduce((sum, v) => sum + v.sizeBytes, 0);
        result.push({ type: 'header', label: group.label, count: group.videos.length, totalSize });
      }
      for (let i = 0; i < group.videos.length; i += columnCount) {
        result.push({ type: 'cards', videos: group.videos.slice(i, i + columnCount) });
      }
    }
    const structureKey = result
      .map((row) => (row.type === 'header' ? `h:${row.label}` : `c:${row.videos.length}`))
      .join('|');
    return { rows: result, rowStructureKey: structureKey };
  }, [filteredVideos, columnCount, groupByFolder, directory]);

  // Invalidate react-window size cache when row structure changes (e.g. folder re-ordering).
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [columnCount, cardScale, groupByFolder, rowStructureKey]);

  const getItemSize = useCallback(
    (index: number) => rows[index].type === 'header' ? HEADER_HEIGHT : cardHeight + GAP,
    [rows, cardHeight]
  );

  const handleCardClick = useCallback((video: Video) => {
    const state = useStore.getState();
    const idx = state.filteredVideos.findIndex((v) => v.id === video.id);
    if (idx >= 0) {
      state.setReviewIndex(idx);
      state.setReviewMode(true);
    }
  }, []);

  const columnWidth = (dimensions.width - GAP * (columnCount + 1)) / columnCount;

  const handleScroll = useCallback(({ scrollOffset, scrollUpdateWasRequested }: ListOnScrollProps) => {
    if (scrollUpdateWasRequested) return;
    persistedGridScroll = { directory, offset: scrollOffset };
  }, [directory]);

  const Row = useCallback(({ index, style, data }: { index: number; style: React.CSSProperties; data: RowItem[] }) => {
    const item = data[index];

    if (item.type === 'header') {
      return (
        <div style={style} className="grid-group-header">
          <span className="grid-group-label">{item.label}</span>
          <span className="grid-group-meta">
            <span className="grid-group-count">{item.count}</span>
            <span className="grid-group-size">{formatSize(item.totalSize)}</span>
          </span>
        </div>
      );
    }

    return (
      <div style={style} className="grid-card-row">
        {item.videos.map((video, colIdx) => (
          <div
            key={video.id}
            className="grid-card-cell"
            style={{
              width: columnWidth,
              height: cardHeight,
              marginLeft: colIdx === 0 ? GAP : GAP / 2,
              marginRight: colIdx === item.videos.length - 1 ? GAP : GAP / 2,
              paddingTop: GAP / 2,
            }}
          >
            <VideoCard video={video} onClick={handleCardClick} />
          </div>
        ))}
      </div>
    );
  }, [columnWidth, cardHeight, handleCardClick]);

  return (
    <div className="grid-mode" ref={containerRef}>
      {filteredVideos.length === 0 ? (
        <div className="grid-empty">
          <p>No videos match your current filters.</p>
        </div>
      ) : (
        <VariableSizeList
          ref={listRef}
          height={dimensions.height}
          width={dimensions.width}
          initialScrollOffset={initialScrollOffset}
          itemCount={rows.length}
          itemData={rows}
          itemSize={getItemSize}
          overscanCount={2}
          onScroll={handleScroll}
        >
          {Row}
        </VariableSizeList>
      )}
    </div>
  );
}
