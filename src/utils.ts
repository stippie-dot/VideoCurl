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

export const WEB_SUPPORTED_EXTS = ['.mp4', '.webm', '.ogg', '.mov', '.mkv', '.m4v'];

export function isWebSupported(path: string): boolean {
  return WEB_SUPPORTED_EXTS.some((ext) => path.toLowerCase().endsWith(ext));
}
