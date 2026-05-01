const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path.replace('app.asar', 'app.asar.unpacked');
const ffprobePath = require('@ffprobe-installer/ffprobe').path.replace('app.asar', 'app.asar.unpacked');
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const path = require('path');
const fs = require('fs/promises');
const os = require('os');

let currentToken = null;

/**
 * Get video duration and creation_time via ffprobe.
 * Returns { duration: number, creationTime: number | null }
 */
function getVideoMetadata(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const duration = metadata?.format?.duration || 0;
      // Try to extract creation_time from format tags (camera date)
      let creationTime = null;
      const tags = metadata?.format?.tags;
      if (tags) {
        const raw = tags.creation_time || tags.Creation_Time || tags.CREATION_TIME;
        if (raw) {
          const parsed = new Date(raw).getTime();
          if (!isNaN(parsed)) creationTime = parsed;
        }
      }
      resolve({ duration, creationTime });
    });
  });
}

/**
 * Calculate N evenly-spaced timestamps.
 * Handles very short videos gracefully.
 */
function calculateTimestamps(duration, count, skipDelaySecs) {
  if (duration <= 0) return [0];

  // For very short videos (< 3 sec), take a single frame at 50%
  if (duration < skipDelaySecs) {
    return [duration * 0.5];
  }

  // Normal videos:
  const timestamps = [];
  const start = skipDelaySecs;
  const end = duration * 0.97;

  const step = (end - start) / count;
  for (let i = 0; i < count; i++) {
    const timestamp = start + (step * 0.5) + (step * i);
    timestamps.push(Math.round(timestamp * 100) / 100);
  }
  
  return timestamps;
}

const activeCommands = new Set();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getGpuCooldownMs(config = {}) {
  if (!config.hardwareAccel) return 0;
  const configured = Number(config.gpuCooldownMs);
  if (Number.isFinite(configured) && configured >= 0) {
    return Math.min(10000, configured);
  }
  return 1250;
}

function getGpuCooldownBatchSize(config = {}, concurrentLimit) {
  if (!config.hardwareAccel) return 0;
  const configured = Number(config.gpuCooldownBatchSize);
  if (Number.isInteger(configured) && configured > 0) {
    return Math.max(concurrentLimit, Math.min(2000, configured));
  }
  const thumbsPerVideo = Math.max(1, Number(config.thumbsPerVideo) || 6);
  const frameBudget = Math.max(75, Math.floor(1200 / thumbsPerVideo));
  return Math.max(concurrentLimit, Math.min(500, frameBudget));
}

/**
 * Extract a single frame from a video at a given timestamp.
 * Uses fast seeking (-ss before -i) via fluent-ffmpeg's seekInput().
 */
function extractFrame(videoPath, timestamp, outputPath, config, token) {
  return new Promise((resolve, reject) => {
    let command = ffmpeg(videoPath).seekInput(timestamp).frames(1);

    // Apply Hardware Acceleration flag if needed
    if (config.hardwareAccel) {
      command = command.inputOptions(['-hwaccel', 'auto']);
    }

    const outOpts = ['-q:v', '5'];
    // Limit CPU threads to prevent massive spikes when processing parallel
    if (config.cpuThreadsLimited !== false) {
      outOpts.push('-threads', '1');
    }

    command = command.outputOptions(outOpts).videoFilters(`scale=320:-1`);

    const runCommand = (cmd, retried = false) => {
      activeCommands.add(cmd);
      cmd.output(outputPath)
        .on('end', () => { activeCommands.delete(cmd); resolve(outputPath); })
        .on('error', (err) => {
          activeCommands.delete(cmd);
          // Retry at timestamp 0 as fallback (only once, and only if not cancelled)
          if (timestamp > 0 && !retried && !token.cancelled) {
            let retry = ffmpeg(videoPath).seekInput(0).frames(1);
            if (config.hardwareAccel) retry = retry.inputOptions(['-hwaccel', 'auto']);
            retry.outputOptions(outOpts).videoFilters(`scale=320:-1`);
            runCommand(retry, true);
          } else {
            reject(err);
          }
        })
        .run();
    };

    runCommand(command);
  });
}

/**
 * Generate all thumbnails for a single video.
 * Returns { thumbnails: string[], durationSecs: number }.
 */
async function generateThumbnailsForVideo(video, thumbDir, config, token) {
  const THUMB_COUNT = config.thumbsPerVideo || 6;
  const skipDelay = config.skipIntroDelaySecs !== undefined ? config.skipIntroDelaySecs : 3;

  const videoThumbDir = path.join(thumbDir, video.id);
  await fs.mkdir(videoThumbDir, { recursive: true });

  // Check if thumbnails already exist and are strictly valid for the current configuration
  try {
    const existing = await fs.readdir(videoThumbDir);
    const jpgs = existing.filter((f) => f.endsWith('.jpg')).sort();
    if (jpgs.length === THUMB_COUNT) {
      let duration = video.durationSecs;
      let creationTime = null;
      if (!duration) {
        try {
          const meta = await getVideoMetadata(video.path);
          duration = meta.duration;
          creationTime = meta.creationTime;
        } catch { duration = 0; }
      }
      return {
        thumbnails: jpgs.slice(0, THUMB_COUNT).map((f) => path.join(videoThumbDir, f)),
        durationSecs: duration,
        creationTime,
      };
    }
    // Incomplete thumbnails — clean up and regenerate
    for (const f of existing) {
      try { await fs.unlink(path.join(videoThumbDir, f)); } catch { /* ignore */ }
    }
  } catch {
    // Directory doesn't exist yet
  }

  // Get duration + metadata date
  let duration;
  let creationTime = null;
  try {
    const meta = await getVideoMetadata(video.path);
    duration = meta.duration;
    creationTime = meta.creationTime;
  } catch {
    duration = 0;
  }

  const timestamps = calculateTimestamps(duration, THUMB_COUNT, skipDelay);
  const thumbnails = [];

  // Extract frames sequentially within each video. Overall parallelism is handled
  // by processVideos(), so maxConcurrent now maps to active FFmpeg commands.
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    if (token.cancelled) return;
    const outputPath = path.join(videoThumbDir, `thumb_${String(i + 1).padStart(2, '0')}.jpg`);
    try {
      await extractFrame(video.path, timestamp, outputPath, config, token);
      const stat = await fs.stat(outputPath);
      if (stat.size > 0) {
        thumbnails.push({ index: i, path: outputPath });
      }
    } catch {
      // Frame extraction failed — continue with remaining frames
    }
  }
  
  if (token.cancelled) throw new Error('Cancelled');

  // Keep output order stable even if a future extraction strategy changes ordering.
  thumbnails.sort((a, b) => a.index - b.index);
  const finalPaths = thumbnails.map(t => t.path);

  // If we got zero thumbnails, try one last desperate attempt at timestamp 0
  if (finalPaths.length === 0) {
    const fallbackPath = path.join(videoThumbDir, 'thumb_01.jpg');
    try {
      await extractFrame(video.path, 0, fallbackPath, config, token);
      const stat = await fs.stat(fallbackPath);
      if (stat.size > 0) {
        finalPaths.push(fallbackPath);
      }
    } catch { /* truly can't generate thumbnails for this video */ }
  }

  return { thumbnails: finalPaths, durationSecs: duration, creationTime };
}

/**
 * Process a batch of videos with limited concurrency.
 */
function getConcurrentLimit(config = {}) {
  if (config.maxConcurrent === 'auto') {
    const cpuCount = os.cpus().length || 4;
    const freeMemGb = os.freemem() / (1024 ** 3);
    const cpuBased = config.cpuThreadsLimited === false
      ? Math.max(1, Math.floor(cpuCount / 2))
      : Math.max(2, Math.ceil(cpuCount * 1.25));
    const memBased = Math.max(1, Math.floor((freeMemGb - 1.5) / 0.25));
    return Math.max(1, Math.min(24, Math.min(cpuBased, memBased)));
  }
  if (config.maxConcurrent > 0) {
    return Math.max(1, Math.min(32, config.maxConcurrent));
  }
  return 3;
}

async function processVideos(videos, thumbDir, config, onProgress, onVideoReady) {
  const token = { cancelled: false };
  currentToken = token;
  const total = videos.length;
  let current = 0;

  const concurrentLimit = getConcurrentLimit(config);
  const cooldownMs = getGpuCooldownMs(config);
  const cooldownBatchSize = getGpuCooldownBatchSize(config, concurrentLimit);

  for (let batchStart = 0; batchStart < videos.length && !token.cancelled; batchStart += cooldownBatchSize || videos.length) {
    const batchEnd = cooldownBatchSize
      ? Math.min(batchStart + cooldownBatchSize, videos.length)
      : videos.length;
    const queue = videos.slice(batchStart, batchEnd);
    const workers = [];
    const workerCount = Math.min(concurrentLimit, queue.length);

    for (let i = 0; i < workerCount; i++) {
      workers.push(
        (async () => {
          while (queue.length > 0 && !token.cancelled) {
            const video = queue.shift();
            if (!video) break;
            try {
              const videoThumbRoot = typeof thumbDir === 'function' ? thumbDir(video) : thumbDir;
              const result = await generateThumbnailsForVideo(video, videoThumbRoot, config, token);
              current++;
              if (onProgress) onProgress({ current, total });
              if (onVideoReady) onVideoReady(video.id, result.thumbnails, result.durationSecs, result.creationTime);
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
    if (cooldownMs > 0 && batchEnd < videos.length && !token.cancelled) {
      await sleep(cooldownMs);
    }
  }
}

function cancelProcessing() {
  if (currentToken) currentToken.cancelled = true;
  for (const cmd of activeCommands) {
    try {
      cmd.kill('SIGKILL');
    } catch (e) {
      // ignore
    }
  }
  activeCommands.clear();
}

module.exports = { processVideos, cancelProcessing, getConcurrentLimit };
