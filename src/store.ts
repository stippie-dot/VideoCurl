import { create } from 'zustand';
import type {
  Video, VideoStatus, VideoStats, VideoStore,
  ScanProgress, ThumbProgress, UndoEntry,
  StatusFilter, SortField, SortOrder, FolderSortField,
} from './types';
import { DEFAULT_KEYBINDS, migrateSettings } from './keybind-defaults';

function getFolder(v: Video): string {
  const sep = v.path.includes('/') ? '/' : '\\';
  const parts = v.path.split(sep);
  // Return parent folder name (last directory component)
  return parts.length >= 2 ? parts.slice(0, -1).join(sep) : '';
}

function computeFiltered(state: Pick<VideoStore, 'videos' | 'statusFilter' | 'minSizeFilter' | 'sortBy' | 'sortOrder' | 'groupByFolder' | 'folderSortBy' | 'folderSortOrder'>): Video[] {
  let filtered = [...state.videos];

  if (state.statusFilter !== 'all') {
    filtered = filtered.filter((v) => v.status === state.statusFilter);
  }

  if (state.minSizeFilter > 0) {
    filtered = filtered.filter((v) => v.sizeBytes >= state.minSizeFilter);
  }

  const getSortCmp = (a: Video, b: Video): number => {
    switch (state.sortBy) {
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'size':
        return a.sizeBytes - b.sizeBytes;
      case 'duration':
        return (a.durationSecs || 0) - (b.durationSecs || 0);
      case 'date': {
        const dateA = a.metadataDate || a.date || 0;
        const dateB = b.metadataDate || b.date || 0;
        return dateA - dateB;
      }
    }
  };

  if (state.groupByFolder) {
    // Pre-compute folder sizes for size-based folder sorting
    let folderSizeMap: Map<string, number> | null = null;
    if (state.folderSortBy === 'size') {
      folderSizeMap = new Map();
      for (const v of filtered) {
        const folder = getFolder(v);
        folderSizeMap.set(folder, (folderSizeMap.get(folder) || 0) + v.sizeBytes);
      }
    }

    filtered.sort((a, b) => {
      const folderA = getFolder(a);
      const folderB = getFolder(b);

      let folderCmp = 0;
      if (state.folderSortBy === 'size' && folderSizeMap) {
        folderCmp = (folderSizeMap.get(folderA) || 0) - (folderSizeMap.get(folderB) || 0);
      } else {
        folderCmp = folderA.localeCompare(folderB);
      }
      if (folderCmp !== 0) return state.folderSortOrder === 'asc' ? folderCmp : -folderCmp;

      // Within same folder, sort by selected field
      const cmp = getSortCmp(a, b);
      return state.sortOrder === 'asc' ? cmp : -cmp;
    });
  } else {
    filtered.sort((a, b) => {
      const cmp = getSortCmp(a, b);
      return state.sortOrder === 'asc' ? cmp : -cmp;
    });
  }

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
  groupByFolder: true,
  folderSortBy: 'name',
  folderSortOrder: 'asc',

  // ── View Mode ──
  reviewMode: false,
  reviewIndex: 0,
  reviewAutoPlay: false,
  // ── Card sizing ──
  cardScale: 1,

  // ── Undo stack ──
  undoStack: [],

  // ── Settings ──
  isSettingsModalOpen: false,
  settings: {
    thumbsPerVideo: 6,
    defaultCardScale: 1,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    defaultGroupByFolder: true,
    maxConcurrent: 'auto',
    cpuThreadsLimited: true,
    skipIntroDelaySecs: 3,
    hardwareAccel: true,
    ...DEFAULT_KEYBINDS,
  },

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

  updateVideoThumbnailsBatch: (batch) => {
    const videos = [...get().videos];
    let changed = false;
    for (const item of batch) {
      const vIdx = videos.findIndex((v) => v.id === item.videoId);
      if (vIdx >= 0) {
        videos[vIdx] = { 
          ...videos[vIdx], 
          thumbnails: item.thumbnails, 
          durationSecs: item.durationSecs ?? videos[vIdx].durationSecs, 
          metadataDate: item.metadataDate ?? videos[vIdx].metadataDate 
        };
        changed = true;
      }
    }
    if (!changed) return;
    const state = { ...get(), videos };
    set({
      videos,
      filteredVideos: computeFiltered(state),
    });

    const dir = get().directory;
    if (dir && window.electronAPI) {
      window.electronAPI.saveCache(dir, videos);
    }
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

  setGroupByFolder: (groupByFolder: boolean) => {
    const state = { ...get(), groupByFolder };
    set({ groupByFolder, filteredVideos: computeFiltered(state) });
  },

  setFolderSortBy: (folderSortBy: FolderSortField) => {
    const state = { ...get(), folderSortBy };
    set({ folderSortBy, filteredVideos: computeFiltered(state) });
  },

  setFolderSortOrder: (folderSortOrder: SortOrder) => {
    const state = { ...get(), folderSortOrder };
    set({ folderSortOrder, filteredVideos: computeFiltered(state) });
  },

  // ── Scanning state ──
  setIsScanning: (isScanning: boolean) => set({ isScanning }),
  setScanProgress: (scanProgress: ScanProgress) => set({ scanProgress }),
  setIsGenerating: (isGenerating: boolean) => set({ isGenerating }),
  setGenProgress: (genProgress: ThumbProgress) => set({ genProgress }),

  // ── View ──
  setReviewMode: (reviewMode: boolean) => set({ reviewMode }),
  setReviewIndex: (reviewIndex: number) => set({ reviewIndex }),
  setReviewAutoPlay: (reviewAutoPlay: boolean) => set({ reviewAutoPlay }),
  enterReviewAndPlay: (videoId: string) => {
    const idx = get().filteredVideos.findIndex((v) => v.id === videoId);
    if (idx < 0) return;
    set({ reviewMode: true, reviewIndex: idx, reviewAutoPlay: true });
  },
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

  addBookmark: (videoId, time) => {
    const rounded = Math.round(time * 10) / 10;
    const videos = get().videos.map((v) =>
      v.id === videoId
        ? { ...v, bookmarks: [...new Set([...(v.bookmarks ?? []), rounded])].sort((a, b) => a - b) }
        : v
    );
    const dir = get().directory;
    set({ videos, filteredVideos: computeFiltered({ ...get(), videos }) });
    if (dir && window.electronAPI) window.electronAPI.saveCache(dir, videos);
  },

  removeBookmark: (videoId, time) => {
    const videos = get().videos.map((v) =>
      v.id === videoId
        ? { ...v, bookmarks: (v.bookmarks ?? []).filter((t) => t !== time) }
        : v
    );
    const dir = get().directory;
    set({ videos, filteredVideos: computeFiltered({ ...get(), videos }) });
    if (dir && window.electronAPI) window.electronAPI.saveCache(dir, videos);
  },

  // ── Settings ──
  setIsSettingsModalOpen: (val: boolean) => set({ isSettingsModalOpen: val }),
  updateSettings: (newSettings) => {
    const state = get();
    const mergedSettings = { ...state.settings, ...newSettings };
    const newState = {
      ...state,
      settings: mergedSettings,
      cardScale: newSettings.defaultCardScale ?? state.cardScale,
      sortBy: newSettings.defaultSortBy ?? state.sortBy,
      sortOrder: newSettings.defaultSortOrder ?? state.sortOrder,
      groupByFolder: newSettings.defaultGroupByFolder ?? state.groupByFolder
    };
    set({
      ...newState,
      filteredVideos: computeFiltered(newState)
    });
  },
  saveSettings: async () => {
    const s = get().settings;
    if (window.electronAPI) {
      await window.electronAPI.saveConfig(s);
    }
  },
  loadSettings: async () => {
    if (window.electronAPI) {
      const raw = await window.electronAPI.getConfig();
      if (raw) {
        const migrated = migrateSettings(raw as unknown as Record<string, unknown>);
        const fullSettings = { ...get().settings, ...migrated };
        set({
          settings: fullSettings,
          cardScale: fullSettings.defaultCardScale,
          sortBy: fullSettings.defaultSortBy,
          sortOrder: fullSettings.defaultSortOrder,
          groupByFolder: fullSettings.defaultGroupByFolder,
        });
      }
    }
  },
}));

export default useStore;
