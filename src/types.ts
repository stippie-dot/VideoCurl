// ── Video Status ────────────────────────────────────────────────────
export type VideoStatus = 'pending' | 'keep' | 'delete';

// ── Core Video Object ──────────────────────────────────────────────
export interface Video {
  id: string;
  filename: string;
  path: string;
  sizeBytes: number;
  modifiedAt: number;
  durationSecs: number | null;
  duplicateHash: string | null;
  status: VideoStatus;
  thumbnails: string[];
  osThumbnail?: string | null;
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
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | VideoStatus;

// ── Undo Entry ─────────────────────────────────────────────────────
export interface UndoEntry {
  videoId: string;
  previousStatus: VideoStatus;
  previousIndex: number;
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

  // View Mode
  reviewMode: boolean;
  reviewIndex: number;

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
  updateVideoThumbnails: (videoId: string, thumbnails: string[], durationSecs?: number) => void;
  setOSThumbnail: (videoId: string, thumbData: string) => void;
  setVideoStatus: (videoId: string, status: VideoStatus) => void;
  undo: () => void;
  setStatusFilter: (filter: StatusFilter) => void;
  setSortBy: (sortBy: SortField) => void;
  setSortOrder: (sortOrder: SortOrder) => void;
  setMinSizeFilter: (minSize: number) => void;
  setIsScanning: (val: boolean) => void;
  setScanProgress: (progress: ScanProgress) => void;
  setIsGenerating: (val: boolean) => void;
  setGenProgress: (progress: ThumbProgress) => void;
  setReviewMode: (val: boolean) => void;
  setReviewIndex: (idx: number) => void;
  setCardScale: (scale: number) => void;
  advanceReview: () => void;
  removeDeletedVideos: (deletedPaths: string[]) => void;
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
  onThumbReady: (callback: (data: ThumbReadyEvent) => void) => () => void;
  saveCache: (dirPath: string, videos: Video[]) => Promise<boolean>;
  batchDelete: (filePaths: string[]) => Promise<DeleteResult[]>;
  openVideo: (filePath: string) => Promise<void>;
}

// ── Global augmentation ────────────────────────────────────────────
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
