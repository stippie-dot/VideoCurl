/**
 * Format bytes to a human-readable string.
 */
export function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
}

/**
 * Format seconds to HH:MM:SS or MM:SS.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return '--:--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Format a timestamp (ms) to a readable date string.
 */
export function formatDate(timestampMs: number | null | undefined): string {
  if (!timestampMs) return '--';
  return new Date(timestampMs).toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Calculate the optimal grid columns/rows for a given number of thumbnails.
 * Returns { cols, rows } for use in CSS grid layout and aspect ratio calculations.
 */
export function calcThumbGrid(count: number): { cols: number; rows: number } {
  if (count === 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count === 6) return { cols: 3, rows: 2 };
  if (count === 9) return { cols: 3, rows: 3 };
  const cols = Math.ceil(Math.sqrt(count));
  return { cols, rows: Math.ceil(count / cols) };
}

/**
 * Format a timestamp (ms) to a relative time string (e.g., "2h ago").
 */
export function formatRelativeTime(ts: number | undefined): string {
  if (!ts) return 'unknown';
  const diffMs = Date.now() - ts;
  const diffMin = Math.max(1, Math.round(diffMs / 60000));
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.round(diffHour / 24);
  return `${diffDay}d ago`;
}

/**
 * Format an absolute path to show only the last two segments (e.g., "Videos / Footage").
 */
export function formatRecentPath(p: string): string {
  const parts = p.split(/[/\\]/).filter(Boolean);
  if (parts.length >= 2) return `${parts[parts.length - 2]} / ${parts[parts.length - 1]}`;
  return p;
}

export const WEB_SUPPORTED_EXTS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.m4v'];

export function isWebSupported(path: string): boolean {
  return WEB_SUPPORTED_EXTS.some((ext) => path.toLowerCase().endsWith(ext));
}
