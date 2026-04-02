const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs/promises');

const THUMB_COUNT = 6;
const THUMB_WIDTH = 320;
const MAX_CONCURRENT = 3;

let cancelled = false;

/**
 * Get video duration via ffprobe.
 */
function getVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata?.format?.duration || 0);
    });
  });
}

/**
 * Calculate N evenly-spaced timestamps.
 * Handles very short videos gracefully.
 */
function calculateTimestamps(duration, count = THUMB_COUNT) {
  if (duration <= 0) return [0];

  // For very short videos (< 3 sec), take a single frame at 50%
  if (duration < 3) {
    return [duration * 0.5];
  }

  // For short videos (3-15 sec), space frames evenly from 10% to 90%
  if (duration < 15) {
    const timestamps = [];
    const actualCount = Math.min(count, Math.max(2, Math.floor(duration)));
    const start = duration * 0.1;
    const end = duration * 0.9;
    const step = actualCount > 1 ? (end - start) / (actualCount - 1) : 0;
    for (let i = 0; i < actualCount; i++) {
      timestamps.push(Math.round((start + step * i) * 100) / 100);
    }
    return timestamps;
  }

  // Normal videos: skip first 3 sec or 3%, and end at 97%
  const timestamps = [];
  const start = Math.max(3, duration * 0.03);
  const end = duration * 0.97;
  const step = count > 1 ? (end - start) / (count - 1) : 0;

  for (let i = 0; i < count; i++) {
    timestamps.push(Math.round((start + step * i) * 100) / 100);
  }
  return timestamps;
}

/**
 * Extract a single frame from a video at a given timestamp.
 * Uses fast seeking (-ss before -i) via fluent-ffmpeg's seekInput().
 * Retries once at timestamp 0 if the first attempt fails.
 */
function extractFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(timestamp)
      .frames(1)
      .outputOptions(['-q:v', '5'])
      .videoFilters(`scale=${THUMB_WIDTH}:-1`)
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', (err) => {
        // Retry at timestamp 0 as fallback
        if (timestamp > 0) {
          ffmpeg(videoPath)
            .seekInput(0)
            .frames(1)
            .outputOptions(['-q:v', '5'])
            .videoFilters(`scale=${THUMB_WIDTH}:-1`)
            .output(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (retryErr) => reject(retryErr))
            .run();
        } else {
          reject(err);
        }
      })
      .run();
  });
}

/**
 * Generate all thumbnails for a single video.
 * Returns { thumbnails: string[], durationSecs: number }.
 */
async function generateThumbnailsForVideo(video, thumbDir) {
  const videoThumbDir = path.join(thumbDir, video.id);
  await fs.mkdir(videoThumbDir, { recursive: true });

  // Check if thumbnails already exist and are complete
  try {
    const existing = await fs.readdir(videoThumbDir);
    const jpgs = existing.filter((f) => f.endsWith('.jpg')).sort();
    if (jpgs.length >= THUMB_COUNT) {
      let duration = video.durationSecs;
      if (!duration) {
        try { duration = await getVideoDuration(video.path); } catch { duration = 0; }
      }
      return {
        thumbnails: jpgs.map((f) => path.join(videoThumbDir, f)),
        durationSecs: duration,
      };
    }
    // Incomplete thumbnails — clean up and regenerate
    for (const f of existing) {
      try { await fs.unlink(path.join(videoThumbDir, f)); } catch { /* ignore */ }
    }
  } catch {
    // Directory doesn't exist yet
  }

  // Get duration
  let duration;
  try {
    duration = await getVideoDuration(video.path);
  } catch {
    duration = 0;
  }

  const timestamps = calculateTimestamps(duration, THUMB_COUNT);
  const thumbnails = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (cancelled) throw new Error('Cancelled');
    const outputPath = path.join(videoThumbDir, `thumb_${String(i + 1).padStart(2, '0')}.jpg`);
    try {
      await extractFrame(video.path, timestamps[i], outputPath);
      // Verify the file was created and has content
      const stat = await fs.stat(outputPath);
      if (stat.size > 0) {
        thumbnails.push(outputPath);
      }
    } catch {
      // Frame extraction failed — continue with remaining frames
    }
  }

  // If we got zero thumbnails, try one last desperate attempt at timestamp 0
  if (thumbnails.length === 0) {
    const fallbackPath = path.join(videoThumbDir, 'thumb_01.jpg');
    try {
      await extractFrame(video.path, 0, fallbackPath);
      const stat = await fs.stat(fallbackPath);
      if (stat.size > 0) {
        thumbnails.push(fallbackPath);
      }
    } catch { /* truly can't generate thumbnails for this video */ }
  }

  return { thumbnails, durationSecs: duration };
}

/**
 * Process a batch of videos with limited concurrency.
 */
async function processVideos(videos, thumbDir, onProgress, onVideoReady) {
  cancelled = false;
  const total = videos.length;
  let current = 0;

  const queue = [...videos];
  const workers = [];

  for (let i = 0; i < MAX_CONCURRENT; i++) {
    workers.push(
      (async () => {
        while (queue.length > 0 && !cancelled) {
          const video = queue.shift();
          if (!video) break;
          try {
            const result = await generateThumbnailsForVideo(video, thumbDir);
            current++;
            if (onProgress) onProgress({ current, total });
            if (onVideoReady) onVideoReady(video.id, result.thumbnails, result.durationSecs);
          } catch (err) {
            if (err.message === 'Cancelled') break;
            current++;
            if (onProgress) onProgress({ current, total });
          }
        }
      })()
    );
  }

  await Promise.all(workers);
}

function cancelProcessing() {
  cancelled = true;
}

module.exports = { processVideos, cancelProcessing };
