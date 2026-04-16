import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { VariableSizeList } from 'react-window';
import type { ListOnScrollProps } from 'react-window';
import type { Video } from '../types';
import useStore from '../store';
import VideoCard from './VideoCard';
import { formatSize } from '../utils';
import { Check, SkipForward, RotateCcw, Trash2, X, Play } from 'lucide-react';
import './GridMode.css';

const BASE_CARD_WIDTH = 450;
const BASE_CARD_HEIGHT = 360;
const GAP = 12;
const HEADER_HEIGHT = 44;

let persistedGridScroll = { directory: null as string | null, offset: 0 };

interface HeaderRow {
  type: 'header';
  label: string;
  folderPath: string;
  count: number;
  totalSize: number;
}

interface CardsRow {
  type: 'cards';
  videos: Video[];
}

type RowItem = HeaderRow | CardsRow;

interface GridModeProps {
  onReviewFolder: (folderPath: string) => void;
}

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

function getFolderPath(video: Video): string {
  const sep = video.path.includes('/') ? '/' : '\\';
  return video.path.substring(0, video.path.lastIndexOf(sep));
}

export default function GridMode({ onReviewFolder }: GridModeProps) {
  const filteredVideos = useStore((s) => s.filteredVideos);
  const setReviewMode = useStore((s) => s.setReviewMode);
  const setReviewIndex = useStore((s) => s.setReviewIndex);
  const setVideoStatusesBatch = useStore((s) => s.setVideoStatusesBatch);
  const selectedIds = useStore((s) => s.gridSelectionIds);
  const selectionAnchorId = useStore((s) => s.gridSelectionAnchorId);
  const setGridSelectionIds = useStore((s) => s.setGridSelectionIds);
  const setGridSelectionAnchorId = useStore((s) => s.setGridSelectionAnchorId);
  const clearGridSelection = useStore((s) => s.clearGridSelection);
  const cardScale = useStore((s) => s.cardScale);
  const groupByFolder = useStore((s) => s.groupByFolder);
  const directory = useStore((s) => s.directory);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<VariableSizeList>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const isSelectionMode = selectedIds.size > 0;

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
        const videosInRow = filteredVideos.slice(i, i + columnCount);
        result.push({ type: 'cards', videos: videosInRow });
      }
      const structureKey = result
        .map((row) => (row.type === 'cards' ? `c:${row.videos.length}` : 'h'))
        .join('|');
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
        result.push({
          type: 'header',
          label: group.label,
          folderPath: getFolderPath(group.videos[0]),
          count: group.videos.length,
          totalSize,
        });
      }
      for (let i = 0; i < group.videos.length; i += columnCount) {
        const videosInRow = group.videos.slice(i, i + columnCount);
        result.push({ type: 'cards', videos: videosInRow });
      }
    }
    const structureKey = result
      .map((row) => (row.type === 'header' ? `h:${row.label}` : `c:${row.videos.length}`))
      .join('|');
    return { rows: result, rowStructureKey: structureKey };
  }, [filteredVideos, columnCount, groupByFolder, directory]);

  useEffect(() => {
    if (selectedIds.size > 0) {
      const next = new Set(Array.from(selectedIds).filter((id) => filteredVideos.some((video) => video.id === id)));
      if (next.size !== selectedIds.size) setGridSelectionIds(next);
    }

    if (selectionAnchorId && !filteredVideos.some((video) => video.id === selectionAnchorId)) {
      setGridSelectionAnchorId(null);
    }
  }, [filteredVideos, selectedIds, selectionAnchorId, setGridSelectionIds, setGridSelectionAnchorId]);

  useEffect(() => {
    if (!isSelectionMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearGridSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectionMode, clearGridSelection]);

  // Invalidate react-window size cache when row structure changes (e.g. folder re-ordering).
  useEffect(() => {
    listRef.current?.resetAfterIndex(0);
  }, [columnCount, cardScale, groupByFolder, rowStructureKey]);

  const getItemSize = useCallback(
    (index: number) => rows[index].type === 'header' ? HEADER_HEIGHT : cardHeight + GAP,
    [rows, cardHeight]
  );

  const getLastSelectedInList = useCallback((ids: Set<string>): string | null => {
    let lastSelectedId: string | null = null;
    for (const video of filteredVideos) {
      if (ids.has(video.id)) lastSelectedId = video.id;
    }
    return lastSelectedId;
  }, [filteredVideos]);

  const getRangeAnchorId = useCallback((ids: Set<string>, targetIndex: number): string | null => {
    const selectedIndexes: number[] = [];
    for (let i = 0; i < filteredVideos.length; i += 1) {
      const id = filteredVideos[i]?.id;
      if (id && ids.has(id)) selectedIndexes.push(i);
    }

    if (selectedIndexes.length === 0) return null;

    const hasBefore = selectedIndexes.some((idx) => idx < targetIndex);
    const hasAfter = selectedIndexes.some((idx) => idx > targetIndex);

    // In-between case: anchor from the nearest selected item before target.
    if (hasBefore && hasAfter) {
      for (let i = selectedIndexes.length - 1; i >= 0; i -= 1) {
        const idx = selectedIndexes[i];
        if (idx < targetIndex) {
          return filteredVideos[idx]?.id ?? null;
        }
      }
    }

    // Otherwise prefer nearest selected item at or before target.
    for (let i = targetIndex; i >= 0; i -= 1) {
      const id = filteredVideos[i]?.id;
      if (id && ids.has(id)) return id;
    }

    // Final fallback: first selected item in list.
    return filteredVideos[selectedIndexes[0]]?.id ?? null;
  }, [filteredVideos]);

  const applyRangeSelection = useCallback((targetId: string) => {
    const targetIndex = filteredVideos.findIndex((video) => video.id === targetId);
    if (targetIndex < 0) return;

    setGridSelectionIds((prev) => {
      const currentAnchorId = getRangeAnchorId(prev, targetIndex)
        ?? (selectionAnchorId && prev.has(selectionAnchorId) ? selectionAnchorId : getLastSelectedInList(prev));

      if (!currentAnchorId) {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      }

      const anchorIndex = filteredVideos.findIndex((video) => video.id === currentAnchorId);
      if (anchorIndex < 0) {
        const next = new Set(prev);
        next.add(targetId);
        return next;
      }

      const start = Math.min(anchorIndex, targetIndex);
      const end = Math.max(anchorIndex, targetIndex);
      const next = new Set(prev);
      for (let i = start; i <= end; i += 1) {
        next.add(filteredVideos[i].id);
      }
      return next;
    });
    setGridSelectionAnchorId(targetId);
  }, [filteredVideos, getLastSelectedInList, getRangeAnchorId, selectionAnchorId, setGridSelectionIds, setGridSelectionAnchorId]);

  const toggleSelection = useCallback((video: Video, event: React.MouseEvent) => {
    if (event.shiftKey) {
      applyRangeSelection(video.id);
      return;
    }

    let nextAnchorId: string | null = selectionAnchorId;
    setGridSelectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(video.id)) {
        next.delete(video.id);
        if (nextAnchorId === video.id) {
          nextAnchorId = getLastSelectedInList(next);
        }
      } else {
        next.add(video.id);
        nextAnchorId = video.id;
      }
      return next;
    });
    setGridSelectionAnchorId(nextAnchorId);
  }, [applyRangeSelection, getLastSelectedInList, selectionAnchorId, setGridSelectionIds, setGridSelectionAnchorId]);

  const handleCardClick = useCallback((video: Video, event: React.MouseEvent) => {
    if (isSelectionMode || event.shiftKey) {
      toggleSelection(video, event);
      return;
    }

    const state = useStore.getState();
    const idx = state.filteredVideos.findIndex((v) => v.id === video.id);
    if (idx >= 0) {
      state.setReviewIndex(idx);
      state.setReviewMode(true);
    }
  }, [isSelectionMode, toggleSelection]);

  const handleBatchStatus = useCallback((status: 'keep' | 'delete' | 'skipped' | 'pending') => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setVideoStatusesBatch(ids, status);
    clearGridSelection();
  }, [selectedIds, setVideoStatusesBatch, clearGridSelection]);

  const handleClearSelection = useCallback(() => {
    clearGridSelection();
  }, [clearGridSelection]);

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
            <button
              className="grid-group-review-btn"
              onClick={() => onReviewFolder(item.folderPath)}
              title={`Review ${item.label}`}
            >
              <Play size={11} />
              Review
            </button>
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
            <VideoCard
              video={video}
              isSelected={selectedIds.has(video.id)}
              showSelectionControls={isSelectionMode}
              onClick={handleCardClick}
              onToggleSelect={toggleSelection}
            />
          </div>
        ))}
      </div>
    );
  }, [columnWidth, cardHeight, handleCardClick, isSelectionMode, onReviewFolder, selectedIds, toggleSelection]);

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

      {selectedIds.size > 0 && (
        <div className="grid-batch-bar">
          <div className="grid-batch-count">{selectedIds.size} selected</div>
          <div className="grid-batch-actions">
            <button className="btn btn-ghost grid-batch-btn grid-batch-keep" onClick={() => handleBatchStatus('keep')}>
              <Check size={14} />
              Keep
            </button>
            <button className="btn btn-ghost grid-batch-btn grid-batch-delete" onClick={() => handleBatchStatus('delete')}>
              <Trash2 size={14} />
              Delete
            </button>
            <button className="btn btn-ghost grid-batch-btn grid-batch-skip" onClick={() => handleBatchStatus('skipped')}>
              <SkipForward size={14} />
              Skip
            </button>
            <button className="btn btn-ghost grid-batch-btn grid-batch-reset" onClick={() => handleBatchStatus('pending')}>
              <RotateCcw size={14} />
              Reset
            </button>
            <button className="btn btn-ghost grid-batch-btn grid-batch-clear" onClick={handleClearSelection}>
              <X size={14} />
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
