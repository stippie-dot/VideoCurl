import { create } from 'zustand';
import type {
  Video, VideoStatus, VideoStats, VideoStore,
  ScanProgress, ThumbProgress, UndoEntry,
  StatusFilter, SortField, SortOrder, FolderSortField,
} from './types';
import { DEFAULT_KEYBINDS, migrateSettings, pruneRecentDirectories } from './keybind-defaults';

function getFolder(v: Video): string {
  const sep = v.path.includes('/') ? '/' : '\\';
  const parts = v.path.split(sep);
  // Return parent folder name (last directory component)
  return parts.length >= 2 ? parts.slice(0, -1).join(sep) : '';
}

function computeFiltered(state: Pick<VideoStore, 'videos' | 'statusFilter' | 'minSizeFilter' | 'minDurationFilter' | 'folderFilterPath' | 'sortBy' | 'sortOrder' | 'groupByFolder' | 'folderSortBy' | 'folderSortOrder'>): Video[] {
  let filtered = [...state.videos];

  if (state.statusFilter !== 'all') {
    filtered = filtered.filter((v) => v.status === state.statusFilter);
  }

  if (state.minSizeFilter > 0) {
    filtered = filtered.filter((v) => v.sizeBytes >= state.minSizeFilter);
  }

  if (state.minDurationFilter > 0) {
    filtered = filtered.filter((v) => (v.durationSecs ?? 0) >= state.minDurationFilter);
  }

  if (state.folderFilterPath) {
    filtered = filtered.filter((v) => getFolder(v) === state.folderFilterPath);
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
    skipped: videos.filter((v) => v.status === 'skipped').length,
    keep: videos.filter((v) => v.status === 'keep').length,
    delete: videos.filter((v) => v.status === 'delete').length,
    totalSize: videos.reduce((sum, v) => sum + v.sizeBytes, 0),
    deleteSize: videos.filter((v) => v.status === 'delete').reduce((sum, v) => sum + v.sizeBytes, 0),
  };
}

function normalizePathForCompare(value: string): string {
  return value.replace(/[/\\]+/g, '\\').replace(/\\+$/g, '').toLowerCase();
}

function isPathInsideRoot(filePath: string, rootPath: string): boolean {
  const file = normalizePathForCompare(filePath);
  const root = normalizePathForCompare(rootPath);
  return file === root || file.startsWith(`${root}\\`);
}

function findRootForVideo(video: Video, directories: string[], fallback: string | null): string | null {
  const root = directories.find((dir) => isPathInsideRoot(video.path, dir));
  return root ?? fallback;
}

function uniqueDirectories(dirs: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const dir of dirs) {
    const key = normalizePathForCompare(dir);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(dir);
  }
  return result;
}

const SAVE_RETRY_DELAY_MS = 750;
const MAX_SAVE_RETRY_ATTEMPTS = 3;

type RetryQueueEntry = {
  video: Video;
  token: number;
};

let retryDirectory: string | null = null;
let retryAttempts = 0;
let retryQueueByVideoId = new Map<string, RetryQueueEntry>();
let retryTimer: ReturnType<typeof setTimeout> | null = null;
let retryFlushInFlight = false;
let retryTokenCounter = 0;

function nextRetryToken() {
  retryTokenCounter += 1;
  return retryTokenCounter;
}

function clearRetryTimer() {
  if (retryTimer) {
    clearTimeout(retryTimer);
    retryTimer = null;
  }
}

function resetRetryQueue() {
  clearRetryTimer();
  retryDirectory = null;
  retryAttempts = 0;
  retryQueueByVideoId = new Map<string, RetryQueueEntry>();
}

function acknowledgeSavedTokens(directory: string, savedTokenByVideoId: Map<string, number>) {
  if (retryDirectory !== directory || savedTokenByVideoId.size === 0 || retryQueueByVideoId.size === 0) return;

  const nextQueue = new Map(retryQueueByVideoId);
  for (const [videoId, savedToken] of savedTokenByVideoId) {
    const queued = nextQueue.get(videoId);
    if (!queued) continue;

    // Only clear the queue entry if the queued version is not newer.
    if (queued.token <= savedToken) {
      nextQueue.delete(videoId);
    }
  }
  retryQueueByVideoId = nextQueue;

  if (retryQueueByVideoId.size === 0 && !retryFlushInFlight) {
    clearRetryTimer();
    retryDirectory = null;
    retryAttempts = 0;
  }
}

function scheduleRetryFlush() {
  if (!retryDirectory || retryQueueByVideoId.size === 0 || retryTimer || retryFlushInFlight) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    flushRetryQueue();
  }, SAVE_RETRY_DELAY_MS);
}

function enqueueRetryVideos(directory: string, videos: Video[], token: number) {
  if (videos.length === 0) return;

  if (retryDirectory && retryDirectory !== directory) {
    // Directory changed; drop stale retry payloads from previous directory.
    resetRetryQueue();
  }

  retryDirectory = directory;
  const nextQueue = new Map(retryQueueByVideoId);
  for (const video of videos) {
    const existing = nextQueue.get(video.id);
    if (!existing || existing.token <= token) {
      nextQueue.set(video.id, { video, token });
    }
  }
  retryQueueByVideoId = nextQueue;
  scheduleRetryFlush();
}

function flushRetryQueue() {
  if (!retryDirectory || retryQueueByVideoId.size === 0 || !window.electronAPI || retryFlushInFlight) return;

  const directory = retryDirectory;
  const retryEntries = Array.from(retryQueueByVideoId.values());
  const retryPayload = retryEntries.map((entry) => entry.video);
  const sentTokenByVideoId = new Map<string, number>();
  for (const entry of retryEntries) {
    sentTokenByVideoId.set(entry.video.id, entry.token);
  }
  retryFlushInFlight = true;

  void window.electronAPI.saveCache(directory, retryPayload)
    .then((ok) => {
      retryFlushInFlight = false;

      if (retryDirectory !== directory) {
        scheduleRetryFlush();
        return;
      }

      if (retryQueueByVideoId.size === 0) {
        retryDirectory = null;
        retryAttempts = 0;
        return;
      }

      if (ok) {
        retryAttempts = 0;
        // Remove only queue entries that match the successful payload version.
        acknowledgeSavedTokens(directory, sentTokenByVideoId);
        if (retryQueueByVideoId.size > 0) {
          scheduleRetryFlush();
        }
        return;
      }

      retryAttempts += 1;
      if (retryAttempts >= MAX_SAVE_RETRY_ATTEMPTS) {
        console.error('[store] saveCache retry exhausted', {
          attempts: retryAttempts,
          count: retryPayload.length,
        });
        resetRetryQueue();
        return;
      }

      console.warn('[store] saveCache retry scheduled after false result', {
        attempt: retryAttempts,
        count: retryPayload.length,
      });
      scheduleRetryFlush();
    })
    .catch((err) => {
      retryFlushInFlight = false;

      if (retryDirectory !== directory) {
        scheduleRetryFlush();
        return;
      }

      if (retryQueueByVideoId.size === 0) {
        retryDirectory = null;
        retryAttempts = 0;
        return;
      }

      retryAttempts += 1;
      if (retryAttempts >= MAX_SAVE_RETRY_ATTEMPTS) {
        console.error('[store] saveCache retry failed permanently', err);
        resetRetryQueue();
        return;
      }

      console.warn('[store] saveCache retry scheduled after error', {
        attempt: retryAttempts,
        count: retryPayload.length,
      });
      scheduleRetryFlush();
    });
}

function persistChangedVideos(directory: string | null, directories: string[], videos: Video[]) {
  if (!window.electronAPI || videos.length === 0) return;

  const videosByRoot = new Map<string, Video[]>();
  for (const video of videos) {
    const root = findRootForVideo(video, directories, directory);
    if (!root) continue;
    const list = videosByRoot.get(root) ?? [];
    list.push(video);
    videosByRoot.set(root, list);
  }

  for (const [root, rootVideos] of videosByRoot) {
    const requestToken = nextRetryToken();

    void window.electronAPI.saveCache(root, rootVideos)
      .then((ok) => {
        if (ok) {
          const queueSizeBeforeAck = retryQueueByVideoId.size;
          const savedTokenByVideoId = new Map<string, number>();
          for (const video of rootVideos) {
            savedTokenByVideoId.set(video.id, requestToken);
          }
          acknowledgeSavedTokens(root, savedTokenByVideoId);
          if (retryDirectory === root && retryQueueByVideoId.size < queueSizeBeforeAck) {
            retryAttempts = 0;
          }
          return;
        }

        console.warn('[store] saveCache returned false for partial save', { count: rootVideos.length });
        enqueueRetryVideos(root, rootVideos, requestToken);
      })
      .catch((err) => {
        console.error('[store] saveCache failed for partial save', err);
        enqueueRetryVideos(root, rootVideos, requestToken);
      });
  }
}

function persistChangedVideosAtomic(directory: string | null, directories: string[], videos: Video[]) {
  if (!window.electronAPI || videos.length === 0) return;

  const videosByRoot = new Map<string, Video[]>();
  for (const video of videos) {
    const root = findRootForVideo(video, directories, directory);
    if (!root) continue;
    const list = videosByRoot.get(root) ?? [];
    list.push(video);
    videosByRoot.set(root, list);
  }

  for (const [root, rootVideos] of videosByRoot) {
    const requestToken = nextRetryToken();
    void window.electronAPI.saveCacheAtomic(root, rootVideos)
      .then((ok) => {
        if (!ok) {
          console.warn('[store] saveCacheAtomic returned false; falling back to queued save', { count: rootVideos.length });
          persistChangedVideos(root, [root], rootVideos);
          return;
        }

        const savedTokenByVideoId = new Map<string, number>();
        for (const video of rootVideos) {
          savedTokenByVideoId.set(video.id, requestToken);
        }
        acknowledgeSavedTokens(root, savedTokenByVideoId);
      })
      .catch((err) => {
        console.error('[store] saveCacheAtomic failed', err);
        persistChangedVideos(root, [root], rootVideos);
    });
  }
}

const useStore = create<VideoStore>((set, get) => ({
  // ── Directory ──
  directory: null,
  directories: [],
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
  minDurationFilter: 0,
  folderFilterPath: null,
  groupByFolder: true,
  folderSortBy: 'name',
  folderSortOrder: 'asc',

  // ── View Mode ──
  reviewMode: false,
  reviewIndex: 0,
  reviewAutoPlay: false,
  gridSelectionIds: new Set(),
  gridSelectionAnchorId: null,
  // ── Card sizing ──
  cardScale: 1,

  // ── Undo stack ──
  undoStack: [],

  // ── Settings ──
  isSettingsModalOpen: false,
  settings: {
    appMode: 'extended',
    hasSeenAppModeIntro: false,
    cacheLocation: 'centralised',
    centralCachePath: null,
    perDriveCachePaths: {},
    thumbsPerVideo: 6,
    defaultCardScale: 1,
    defaultSortBy: 'name',
    defaultSortOrder: 'asc',
    defaultGroupByFolder: true,
    maxConcurrent: 'auto',
    cpuThreadsLimited: true,
    skipIntroDelaySecs: 3,
    hardwareAccel: true,
    recentDirectories: [],
    recentDirectoryTimestamps: {},
    autoUpdates: true,
    ...DEFAULT_KEYBINDS,
  },

  // ── Statistics ──
  stats: { total: 0, pending: 0, skipped: 0, keep: 0, delete: 0, totalSize: 0, deleteSize: 0 },

  // ── Actions ──
  setDirectory: (dir: string | null) => {
    if (dir !== null) {
      const { settings } = get();
      const existing = settings.recentDirectories.filter((d) => d !== dir);
      const updated = [dir, ...existing].slice(0, 8);
      const nextTimestamps = { ...settings.recentDirectoryTimestamps, [dir]: Date.now() };
      const prunedTimestamps: Record<string, number> = {};
      for (const p of updated) {
        if (nextTimestamps[p]) prunedTimestamps[p] = nextTimestamps[p];
      }
      const newSettings = {
        ...settings,
        recentDirectories: updated,
        recentDirectoryTimestamps: prunedTimestamps,
      };
      set({
        directory: dir,
        directories: [dir],
        settings: newSettings,
        folderFilterPath: null,
        reviewIndex: 0,
        undoStack: [],
        gridSelectionIds: new Set(),
        gridSelectionAnchorId: null,
      });
      if (window.electronAPI) {
        void window.electronAPI.saveConfig(newSettings).catch((err) => {
          console.warn('[store] Failed to save directory settings:', err);
        });
      }
    } else {
      set({
        directory: null,
        directories: [],
        videos: [],
        filteredVideos: [],
        stats: computeStats([]),
        folderFilterPath: null,
        reviewMode: false,
        reviewIndex: 0,
        undoStack: [],
        gridSelectionIds: new Set(),
        gridSelectionAnchorId: null,
      });
    }
  },

  addDirectory: (dir: string) => {
    const state = get();
    const nextDirs = uniqueDirectories([...state.directories, dir]);
    const existing = state.settings.recentDirectories.filter((d) => d !== dir);
    const updated = [dir, ...existing].slice(0, 8);
    const nextTimestamps = { ...state.settings.recentDirectoryTimestamps, [dir]: Date.now() };
    const prunedTimestamps: Record<string, number> = {};
    for (const p of updated) {
      if (nextTimestamps[p]) prunedTimestamps[p] = nextTimestamps[p];
    }
    const newSettings = {
      ...state.settings,
      recentDirectories: updated,
      recentDirectoryTimestamps: prunedTimestamps,
    };
    set({
      directory: nextDirs[0] ?? null,
      directories: nextDirs,
      settings: newSettings,
      folderFilterPath: null,
      reviewIndex: 0,
    });
    if (window.electronAPI) {
      void window.electronAPI.saveConfig(newSettings).catch((err) => {
        console.warn('[store] Failed to save directory settings:', err);
      });
    }
  },

  setDirectories: (dirs: string[]) => {
    const nextDirs = uniqueDirectories(dirs);
    set({
      directory: nextDirs[0] ?? null,
      directories: nextDirs,
      folderFilterPath: null,
      reviewIndex: 0,
      gridSelectionIds: new Set(),
      gridSelectionAnchorId: null,
    });
  },

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
    const changedVideos = new Map<string, Video>();
    for (const item of batch) {
      const vIdx = videos.findIndex((v) => v.id === item.videoId);
      if (vIdx >= 0) {
        videos[vIdx] = { 
          ...videos[vIdx], 
          thumbnails: item.thumbnails, 
          durationSecs: item.durationSecs ?? videos[vIdx].durationSecs, 
          metadataDate: item.metadataDate ?? videos[vIdx].metadataDate 
        };
        changedVideos.set(item.videoId, videos[vIdx]);
        changed = true;
      }
    }
    if (!changed) return;
    const state = { ...get(), videos };
    set({
      videos,
      filteredVideos: computeFiltered(state),
    });

    const stateNow = get();
    persistChangedVideos(stateNow.directory, stateNow.directories, Array.from(changedVideos.values()));
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
    if (prev.status === status) return;

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
    const updatedVideo = videos.find((v) => v.id === videoId);
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
      undoStack,
    });

    const stateNow = get();
    persistChangedVideos(stateNow.directory, stateNow.directories, updatedVideo ? [updatedVideo] : []);
  },

  setVideoStatusesBatch: (videoIds: string[], status: VideoStatus) => {
    if (videoIds.length === 0) return;
    const targetIds = new Set(videoIds);
    const previousStatuses: Record<string, VideoStatus> = {};
    let changed = false;

    const videos = get().videos.map((video) => {
      if (!targetIds.has(video.id) || video.status === status) return video;
      previousStatuses[video.id] = video.status;
      changed = true;
      return { ...video, status };
    });

    if (!changed) return;

    const changedIds = new Set(Object.keys(previousStatuses));
    const changedVideos = videos.filter((video) => changedIds.has(video.id));
    const undoEntry: UndoEntry = {
      videoId: videoIds[0],
      previousStatus: previousStatuses[videoIds[0]] ?? status,
      previousIndex: get().reviewIndex,
      videoIds: Object.keys(previousStatuses),
      previousStatuses,
    };

    const state = { ...get(), videos };
    const undoStack = [...get().undoStack, undoEntry];
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
      undoStack,
    });

    const stateNow = get();
    persistChangedVideosAtomic(stateNow.directory, stateNow.directories, changedVideos);
  },

  undo: () => {
    const stack = [...get().undoStack];
    if (stack.length === 0) return;
    const action = stack.pop()!;

    const videos = get().videos.map((v) => {
      if (action.videoIds && action.previousStatuses && action.videoIds.includes(v.id)) {
        return { ...v, status: action.previousStatuses[v.id] ?? v.status };
      }
      if (v.id === action.videoId) {
        return { ...v, status: action.previousStatus };
      }
      return v;
    });
    const state = { ...get(), videos };
    const restoredVideos = action.videoIds ? videos.filter((v) => action.videoIds?.includes(v.id)) : videos.filter((v) => v.id === action.videoId);
    set({
      videos,
      filteredVideos: computeFiltered(state),
      stats: computeStats(videos),
      undoStack: stack,
      reviewIndex: action.previousIndex,
    });

    const stateNow = get();
    persistChangedVideos(stateNow.directory, stateNow.directories, restoredVideos);
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

  setMinDurationFilter: (minDurationFilter: number) => {
    const state = { ...get(), minDurationFilter };
    set({ minDurationFilter, filteredVideos: computeFiltered(state), reviewIndex: 0 });
  },

  setFolderFilterPath: (folderFilterPath: string | null) => {
    const state = { ...get(), folderFilterPath };
    set({ folderFilterPath, filteredVideos: computeFiltered(state), reviewIndex: 0 });
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
  setGridSelectionIds: (gridSelectionIds) => set((state) => ({
    gridSelectionIds: typeof gridSelectionIds === 'function'
      ? gridSelectionIds(state.gridSelectionIds)
      : gridSelectionIds,
  })),
  setGridSelectionAnchorId: (gridSelectionAnchorId: string | null) => set({ gridSelectionAnchorId }),
  clearGridSelection: () => set({ gridSelectionIds: new Set(), gridSelectionAnchorId: null }),
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
    let updatedVideo: Video | null = null;
    const videos = get().videos.map((v) =>
      {
        if (v.id !== videoId) return v;
        const existing = v.bookmarks ?? [];
        if (existing.includes(rounded)) return v;
        updatedVideo = {
          ...v,
          bookmarks: [...existing, rounded].sort((a, b) => a - b),
        };
        return updatedVideo;
      }
    );
    if (!updatedVideo) return;
    set({ videos, filteredVideos: computeFiltered({ ...get(), videos }) });
    const stateNow = get();
    persistChangedVideos(stateNow.directory, stateNow.directories, [updatedVideo]);
  },

  removeBookmark: (videoId, time) => {
    let updatedVideo: Video | null = null;
    const videos = get().videos.map((v) =>
      {
        if (v.id !== videoId) return v;
        const existing = v.bookmarks ?? [];
        const nextBookmarks = existing.filter((t) => t !== time);
        if (nextBookmarks.length === existing.length) return v;
        updatedVideo = { ...v, bookmarks: nextBookmarks };
        return updatedVideo;
      }
    );
    if (!updatedVideo) return;
    set({ videos, filteredVideos: computeFiltered({ ...get(), videos }) });
    const stateNow = get();
    persistChangedVideos(stateNow.directory, stateNow.directories, [updatedVideo]);
  },

  clearRecentDirectories: () => {
    const { settings } = get();
    const nextSettings = {
      ...settings,
      recentDirectories: [],
      recentDirectoryTimestamps: {},
    };
    set({ settings: nextSettings });
    if (window.electronAPI) {
      void window.electronAPI.saveConfig(nextSettings);
    }
  },

  removeRecentDirectory: (dir: string) => {
    const { settings } = get();
    const nextRecentDirectories = settings.recentDirectories.filter((p) => p !== dir);
    const nextTimestamps = { ...settings.recentDirectoryTimestamps };
    delete nextTimestamps[dir];
    const nextSettings = {
      ...settings,
      recentDirectories: nextRecentDirectories,
      recentDirectoryTimestamps: nextTimestamps,
    };
    set({ settings: nextSettings });
    if (window.electronAPI) {
      void window.electronAPI.saveConfig(nextSettings);
    }
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
        let migrated = migrateSettings(raw as unknown as Record<string, unknown>);

        // Prune stale recent directories on app startup
        if (migrated.recentDirectories && migrated.recentDirectories.length > 0) {
          try {
            const pruned = await pruneRecentDirectories(
              migrated.recentDirectories,
              (path: string) => window.electronAPI!.validateDroppedPath(path)
            );
            const rawTimestamps = (migrated.recentDirectoryTimestamps ?? {}) as Record<string, number>;
            const prunedTimestamps: Record<string, number> = {};
            for (const p of pruned) {
              if (rawTimestamps[p]) prunedTimestamps[p] = rawTimestamps[p];
            }
            migrated = {
              ...migrated,
              recentDirectories: pruned,
              recentDirectoryTimestamps: prunedTimestamps,
            };
          } catch (err) {
            console.warn('[store] Failed to prune recent directories:', err);
          }
        }

        const fullSettings = { ...get().settings, ...migrated };
        set({
          settings: fullSettings,
          cardScale: fullSettings.defaultCardScale,
          sortBy: fullSettings.defaultSortBy,
          sortOrder: fullSettings.defaultSortOrder,
          groupByFolder: fullSettings.defaultGroupByFolder,
        });

        // Save pruned settings back to disk
        try {
          await window.electronAPI.saveConfig(fullSettings);
        } catch (err) {
          console.warn('[store] Failed to save pruned settings:', err);
        }
      }
    }
  },
}));

export default useStore;
