import './ThumbnailStrip.css';

interface ThumbnailStripProps {
  thumbnails: string[];
  osThumbnail?: string | null;
  compact?: boolean;
}

export default function ThumbnailStrip({ thumbnails, osThumbnail, compact = false }: ThumbnailStripProps) {
  if (!thumbnails || thumbnails.length === 0) {
    if (osThumbnail) {
      return (
        <div className={`thumb-strip ${compact ? 'thumb-strip-compact' : ''}`}>
          <img
            className="thumb-img thumb-img-os"
            src={osThumbnail}
            draggable={false}
            alt="OS Preview"
            style={{ gridColumn: 'span 3', gridRow: 'span 2', objectFit: 'cover' }}
          />
        </div>
      );
    }
    return (
      <div className={`thumb-strip thumb-strip-placeholder ${compact ? 'thumb-strip-compact' : ''}`}>
        <div className="thumb-placeholder-pulse" />
      </div>
    );
  }

  return (
    <div className={`thumb-strip ${compact ? 'thumb-strip-compact' : ''}`}>
      {thumbnails.map((thumb, i) => (
        <img
          key={i}
          className="thumb-img"
          src={`thumb:///${encodeURIComponent(thumb)}`}
          loading="lazy"
          alt={`Frame ${i + 1}`}
          draggable={false}
        />
      ))}
    </div>
  );
}
