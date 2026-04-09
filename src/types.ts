// ── Video Status ────────────────────────────────────────────────────
export type VideoStatus = 'pending' | 'keep' | 'delete';

export interface Video {
  id: string;
  filename: string;
  path: string;
  sizeBytes: number;
  date: number;
  metadataDate?: number | null;
  durationSecs: number | null;
  duplicateHash: string | null;
  status: VideoStatus;
  thumbnails: string[];
  osThumbnail?: string | null;
  bookmarks?: number[]; // seconds into the video
}

// ── Progress Events ────────────────────────────────────────────────
export interface ScanProgress {
  found: number;
  currentFile: string;
}

export interface ThumbProgress {
  current: number;
  total: number;
}

export interface ThumbReadyEvent {
  videoId: string;
  thumbnails: string[];
  durationSecs: number;
  metadataDate?: number | null;
}

// ── Delete Result ──────────────────────────────────────────────────
export interface DeleteResult {
  path: string;
  success: boolean;
  error?: string;
}

// ── Statistics ─────────────────────────────────────────────────────
export interface VideoStats {
  total: number;
  pending: number;
  keep: number;
  delete: number;
  totalSize: number;
  deleteSize: number;
}

// ── Sort & Filter ──────────────────────────────────────────────────
export type SortField = 'name' | 'size' | 'duration' | 'date';
export type FolderSortField = 'name' | 'size';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | VideoStatus;

// ── Undo Entry ─────────────────────────────────────────────────────
export interface UndoEntry {
  videoId: string;
  previousStatus: VideoStatus;
  previousIndex: number;
}

// ── Settings ───────────────────────────────────────────────────────
import type { Keybind } from './keybinds';

export interface AppSettings {
  thumbsPerVideo: 1 | 2 | 4 | 6 | 9;
  defaultCardScale: number;
  defaultSortBy: SortField;
  defaultSortOrder: SortOrder;
  defaultGroupByFolder: boolean;
  maxConcurrent: number | 'auto';
  cpuThreadsLimited: boolean;
  skipIntroDelaySecs: number;
  hardwareAccel: boolean;
  // Review mode — context-independent
  keyKeep: Keybind;
  keyDelete: Keybind;
  keySkip: Keybind;
  keyUndo: Keybind;
  keyPlay: Keybind;
  keyEnterPlay: Keybind;
  keyExternalPlayer: Keybind;
  // Review mode — not playing
  keyPrevVideo: Keybind;
  keyNextVideo: Keybind;
  // Review mode — playing
  keySeekBack: Keybind;
  keySeekForward: Keybind;
  keySpeedDown: Keybind;
  keySpeedUp: Keybind;
  keyBookmark: Keybind;
  // Preview modal
  keyPreviewSeekBack: Keybind;
  keyPreviewSeekForward: Keybind;
  // Global
  keyShowHelp: Keybind;
}

// ── Store State ────────────────────────────────────────────────────
export interface VideoStore {
  // Directory
  directory: string | null;
  includeSubfolders: boolean;

  // Videos
  videos: Video[];
  filteredVideos: Video[];

  // Scanning
  isScanning: boolean;
  scanProgress: ScanProgress;

  // Thumbnail generation
  isGenerating: boolean;
  genProgress: ThumbProgress;

  // Filters & Sort
  statusFilter: StatusFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
  minSizeFilter: number;
  groupByFolder: boolean;
  folderSortBy: FolderSortField;
  folderSortOrder: SortOrder;

  // Settings
  settings: AppSettings;
  isSettingsModalOpen: boolean;

  // View Mode
  reviewMode: boolean;
  reviewIndex: number;
  reviewAutoPlay: boolean;
  // Card sizing
  cardScale: number;

  // Undo
  undoStack: UndoEntry[];

  // Statistics
  stats: VideoStats;

  // Actions
  setDirectory: (dir: string | null) => void;
  setIncludeSubfolders: (val: boolean) => void;
  setVideos: (videos: Video[]) => void;
  updateVideoThumbnailsBatch: (batch: ThumbReadyEvent[]) => void;
  setOSThumbnail: (videoId: string, thumbData: string) => void;
  setVideoStatus: (videoId: string, status: VideoStatus) => void;
  undo: () => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setSortBy: (sortBy: SortField) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  setMinSizeFilter: (minSize: number) => void;
  setGroupByFolder: (val: boolean) => void;
  setFolderSortBy: (sortBy: FolderSortField) => void;
  setFolderSortOrder: (order: SortOrder) => void;
  setIsScanning: (val: boolean) => void;
  setScanProgress: (progress: ScanProgress) => void;
  setIsGenerating: (val: boolean) => void;
  setGenProgress: (progress: ThumbProgress) => void;
  setReviewMode: (val: boolean) => void;
  setReviewIndex: (idx: number) => void;
  setReviewAutoPlay: (val: boolean) => void;
  enterReviewAndPlay: (videoId: string) => void;
  setCardScale: (scale: number) => void;
  advanceReview: () => void;
  removeDeletedVideos: (deletedPaths: string[]) => void;
  addBookmark: (videoId: string, time: number) => void;
  removeBookmark: (videoId: string, time: number) => void;

  // Settings Actions
  setIsSettingsModalOpen: (val: boolean) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
  saveSettings: () => Promise<void>;
  loadSettings: () => Promise<void>;
}

// ── Electron API (exposed via preload) ─────────────────────────────
export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  openInExplorer: (filePath: string) => Promise<void>;
  scanDirectory: (dirPath: string, includeSubfolders: boolean) => Promise<Video[]>;
  onScanProgress: (callback: (data: ScanProgress) => void) => () => void;
  generateThumbnails: (videos: Video[], dirPath: string) => Promise<boolean>;
  cancelGeneration: () => Promise<boolean>;
  getOSThumbnail: (filePath: string) => Promise<string | null>;
  onThumbProgress: (callback: (data: ThumbProgress) => void) => () => void;
  onThumbReadyBatch: (callback: (batch: ThumbReadyEvent[]) => void) => () => void;
  onMenuAction: (callback: (action: string) => void) => () => void;
  saveCache: (dirPath: string, videos: Video[]) => Promise<boolean>;
  clearCache: (dirPath: string) => Promise<boolean>;
  batchDelete: (filePaths: string[]) => Promise<DeleteResult[]>;
  openVideo: (filePath: string) => Promise<void>;
  getConfig: () => Promise<AppSettings | null>;
  saveConfig: (config: AppSettings) => Promise<boolean>;
}

// ── Global augmentation ────────────────────────────────────────────
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
