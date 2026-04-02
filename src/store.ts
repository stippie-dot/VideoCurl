import { create } from 'zustand';
import type {
  Video, VideoStatus, VideoStats, VideoStore,
  ScanProgress, ThumbProgress, UndoEntry,
  StatusFilter, SortField, SortOrder,
} from './types';

function computeFiltered(state: Pick<VideoStore, 'videos' | 'statusFilter' | 'minSizeFilter' | 'sortBy' | 'sortOrder'>): Video[] {
  let filtered = [...state.videos];

  if (state.statusFilter !== 'all') {
    filtered = filtered.filter((v) => v.status === state.statusFilter);
  }

  if (state.minSizeFilter > 0) {
    filtered = filtered.filter((v) => v.sizeBytes >= state.minSizeFilter);
  }

  filtered.sort((a, b) => {
    let cmp = 0;
    switch (state.sortBy) {
      case 'name':
        cmp = a.filename.localeCompare(b.filename);
        break;
      case 'size':
        cmp = a.sizeBytes - b.sizeBytes;
        break;
      case 'duration':
        cmp = (a.durationSecs || 0) - (b.durationSecs || 0);
        break;
      case 'date':
        cmp = (a.modifiedAt || 0) - (b.modifiedAt || 0);
        break;
    }
    return state.sortOrder === 'asc' ? cmp : -cmp;
  });

  return filtered;
}

function computeStats(videos: Video[]): VideoStats {
  return {
    total: videos.length,
    pending: videos.filter((v) => v.status === 'pending').length,
    keep: videos.filter((v) => v.status === 'keep').length,
    delete: videos.filter((v) => v.status === 'delete').length,
    totalSize: videos.reduce((sum, v) => sum + v.sizeBytes, 0),
    deleteSize: videos.filter((v) => v.status === 'delete').reduce((sum, v) => sum + v.sizeBytes, 0),
  };
}

const useStore = create<VideoStore>((set, get) => ({
  // ── Directory ──
  directory: null,
  includeSubfolders: true,

  // ── Videos ──
  videos: [],
  filteredVideos: [],

  // ── Scanning ──
  isScanning: false,
  scanProgress: { found: 0, currentFile: '' },

  // ── Thumbnail generation ──
  isGenerating: false,
  genProgress: { current: 0, total: 0 },

  // ── Filters & Sort ──
  statusFilter: 'all',
  sortBy: 'name',
  sortOrder: 'asc',
  minSizeFilter: 0,

  // ── View Mode ──
  reviewMode: false,
  reviewIndex: 0,

  // ── Card sizing ──
  cardScale: 1,

  // ── Undo stack ──
  undoStack: [],

  // ── Statistics ──
  stats: { total: 0, pending: 0, keep: 0, delete: 0, totalSize: 0, deleteSize: 0 },

  // ── Actions ──
  setDirectory: (dir: string | null) => set({ directory: dir }),

  setIncludeSubfolders: (val: boolean) => set({ includeSubfolders: val }),

  setVideos: (videos: Video[]) => {
    const state = { ...get(), videos };
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
    });
  },

  updateVideoThumbnails: (videoId: string, thumbnails: string[], durationSecs?: number) => {
    const videos = get().videos.map((v) =>
      v.id === videoId ? { ...v, thumbnails, durationSecs: durationSecs ?? v.durationSecs } : v
    );
    const state = { ...get(), videos };
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
    });
  },

  setOSThumbnail: (videoId: string, osThumbnail: string) => {
    const videos = get().videos.map((v) =>
      v.id === videoId ? { ...v, osThumbnail } : v
    );
    set({
      videos,
      filteredVideos: computeFiltered({ ...get(), videos }),
    });
  },

  setVideoStatus: (videoId: string, status: VideoStatus) => {
    const prev = get().videos.find((v) => v.id === videoId);
    if (!prev) return;

    const undoEntry: UndoEntry = {
      videoId,
      previousStatus: prev.status,
      previousIndex: get().reviewIndex,
    };
    const undoStack = [...get().undoStack, undoEntry];

    const videos = get().videos.map((v) =>
      v.id === videoId ? { ...v, status } : v
    );
    const state = { ...get(), videos };
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
      undoStack,
    });

    const dir = get().directory;
    if (dir && window.electronAPI) {
      window.electronAPI.saveCache(dir, videos);
    }
  },

  undo: () => {
    const stack = [...get().undoStack];
    if (stack.length === 0) return;
    const action = stack.pop()!;

    const videos = get().videos.map((v) =>
      v.id === action.videoId ? { ...v, status: action.previousStatus } : v
    );
    const state = { ...get(), videos };
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
      undoStack: stack,
      reviewIndex: action.previousIndex,
    });

    const dir = get().directory;
    if (dir && window.electronAPI) {
      window.electronAPI.saveCache(dir, videos);
    }
  },

  // ── Filter/Sort ──
  setStatusFilter: (filter: StatusFilter) => {
    const state = { ...get(), statusFilter: filter };
    set({ statusFilter: filter, filteredVideos: computeFiltered(state), reviewIndex: 0 });
  },

  setSortBy: (sortBy: SortField) => {
    const state = { ...get(), sortBy };
    set({ sortBy, filteredVideos: computeFiltered(state) });
  },

  setSortOrder: (sortOrder: SortOrder) => {
    const state = { ...get(), sortOrder };
    set({ sortOrder, filteredVideos: computeFiltered(state) });
  },

  setMinSizeFilter: (minSizeFilter: number) => {
    const state = { ...get(), minSizeFilter };
    set({ minSizeFilter, filteredVideos: computeFiltered(state), reviewIndex: 0 });
  },

  // ── Scanning state ──
  setIsScanning: (isScanning: boolean) => set({ isScanning }),
  setScanProgress: (scanProgress: ScanProgress) => set({ scanProgress }),
  setIsGenerating: (isGenerating: boolean) => set({ isGenerating }),
  setGenProgress: (genProgress: ThumbProgress) => set({ genProgress }),

  // ── View ──
  setReviewMode: (reviewMode: boolean) => set({ reviewMode }),
  setReviewIndex: (reviewIndex: number) => set({ reviewIndex }),
  setCardScale: (cardScale: number) => set({ cardScale }),

  advanceReview: () => {
    const { reviewIndex, filteredVideos } = get();
    if (reviewIndex < filteredVideos.length - 1) {
      set({ reviewIndex: reviewIndex + 1 });
    }
  },

  // ── Batch delete ──
  removeDeletedVideos: (deletedPaths: string[]) => {
    const pathSet = new Set(deletedPaths);
    const videos = get().videos.filter((v) => !pathSet.has(v.path));
    const state = { ...get(), videos };
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
      undoStack: [],
    });
  },
}));

export default useStore;
