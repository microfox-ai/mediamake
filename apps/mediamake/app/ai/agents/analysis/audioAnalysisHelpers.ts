'use server';

import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Safely configure ffmpeg paths (optional in serverless environments)
let ffmpegConfigured = false;

function configureFfmpegPaths() {
  if (ffmpegConfigured) return;

  try {
    // Dynamic import with try-catch to handle missing binaries in serverless
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

    if (ffmpegInstaller?.path) {
      ffmpeg.setFfmpegPath(ffmpegInstaller.path);
    }
    if (ffprobeInstaller?.path) {
      ffmpeg.setFfprobePath(ffprobeInstaller.path);
    }
    ffmpegConfigured = true;
  } catch (error) {
    // Silently ignore if ffmpeg/ffprobe installers are not available
    // This is expected in some serverless environments
    console.warn(
      'ffmpeg/ffprobe installers not available, using system binaries if available:',
      error instanceof Error ? error.message : String(error),
    );
    ffmpegConfigured = true; // Mark as configured to avoid repeated warnings
  }
}

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  bitRate?: number;
  format?: string;
  codec?: string;
  fileSize?: number;
}

export interface AudioAnalysisOptions {
  extractWaveform?: boolean;
  analyzeFrequency?: boolean;
  detectBeats?: boolean;
}

/**
 * Get audio format from URL extension
 */
function getAudioFormatFromUrl(url: string): string {
  const urlPath = new URL(url).pathname;
  const extension = path.extname(urlPath).toLowerCase().replace('.', '');
  const formatMap: Record<string, string> = {
    mp3: 'mp3',
    wav: 'wav',
    m4a: 'm4a',
    aac: 'aac',
    ogg: 'ogg',
    flac: 'flac',
    webm: 'webm',
  };
  return formatMap[extension] || 'mp3';
}

/**
 * Get audio metadata using ffprobe with fallback for serverless environments
 */
export async function getAudioMetadata(
  audioUrl: string,
): Promise<AudioMetadata> {
  configureFfmpegPaths();

  // Try to use ffprobe first
  try {
    return await new Promise<AudioMetadata>((resolve, reject) => {
      // Add timeout and better error handling
      const timeout = setTimeout(() => {
        reject(
          new Error('ffprobe timeout - audio metadata request took too long'),
        );
      }, 30000); // 30 second timeout

      ffmpeg.ffprobe(
        audioUrl,
        [
          '-tls_verify',
          '0', // Disable TLS certificate verification
          '-protocol_whitelist',
          'file,http,https,tcp,tls',
          '-timeout',
          '30000',
        ],
        (err, data) => {
          clearTimeout(timeout);

          if (err) {
            // Check if it's a "Cannot find ffprobe" error (serverless environment)
            if (
              err.message.includes('Cannot find ffprobe') ||
              err.message.includes('ffprobe') ||
              err.message.includes('ENOENT')
            ) {
              // Fall through to fallback
              return reject(new Error('FFPROBE_NOT_AVAILABLE'));
            }

            console.error('ffprobe error for URL:', audioUrl);
            console.error('ffprobe error details:', err.message);

            // Check for specific SSL/TLS errors
            if (err.message.includes('TLS') || err.message.includes('SSL')) {
              return reject(
                new Error(
                  `SSL/TLS connection failed for audio URL. This might be due to network issues or the audio server's SSL configuration. Original error: ${err.message}`,
                ),
              );
            }

            // Check for timeout errors
            if (
              err.message.includes('timeout') ||
              err.message.includes('ETIMEDOUT')
            ) {
              return reject(
                new Error(
                  `Audio metadata request timed out. The audio server might be slow or unreachable. Original error: ${err.message}`,
                ),
              );
            }

            return reject(
              new Error(`Failed to get audio metadata: ${err.message}`),
            );
          }

          const audioStream = data.streams.find(
            stream => stream.codec_type === 'audio',
          );

          if (!audioStream) {
            return reject(
              new Error('No audio stream found in the provided URL'),
            );
          }

          const duration = data.format.duration || 0;
          const sampleRate = audioStream.sample_rate || 44100;
          const channels = audioStream.channels || 1;
          const bitRate = data.format.bit_rate;
          const format = data.format.format_name;
          const codec = audioStream.codec_name;
          const fileSize = data.format.size;

          resolve({
            duration,
            sampleRate,
            channels,
            bitRate,
            format,
            codec,
            fileSize,
          });
        },
      );
    });
  } catch (error) {
    // Fallback for serverless environments where ffprobe is not available
    if (
      error instanceof Error &&
      (error.message === 'FFPROBE_NOT_AVAILABLE' ||
        error.message.includes('Cannot find ffprobe') ||
        error.message.includes('ffprobe'))
    ) {
      console.warn(
        'ffprobe not available, using fallback metadata for serverless environment',
      );

      // Try to get file size from HTTP headers
      let fileSize: number | undefined;
      let duration: number = 0;

      try {
        const response = await fetch(audioUrl, { method: 'HEAD' });
        const contentLength = response.headers.get('content-length');
        if (contentLength) {
          fileSize = parseInt(contentLength, 10);
        }
        // Try to get duration from Content-Duration header if available
        const contentDuration = response.headers.get('content-duration');
        if (contentDuration) {
          duration = parseFloat(contentDuration);
        }
      } catch (fetchError) {
        console.warn('Could not fetch audio headers:', fetchError);
      }

      // Return default metadata
      return {
        duration,
        sampleRate: 44100, // Default sample rate
        channels: 1, // Default to mono
        format: getAudioFormatFromUrl(audioUrl),
        fileSize,
      };
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Download audio file to temporary location
 */
export async function downloadAudioFile(audioUrl: string): Promise<string> {
  configureFfmpegPaths();

  const tempAudioPath = path.join(
    os.tmpdir(),
    `audio-${Date.now()}.${getFileExtension(audioUrl)}`,
  );

  return new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Audio download timeout - download took too long'));
    }, 60000); // 60 second timeout

    ffmpeg(audioUrl)
      .inputOptions([
        '-tls_verify',
        '0',
        '-protocol_whitelist',
        'file,http,https,tcp,tls',
        '-timeout',
        '30000',
      ])
      .output(tempAudioPath)
      .on('end', () => {
        clearTimeout(timeout);
        resolve(tempAudioPath);
      })
      .on('error', err => {
        clearTimeout(timeout);
        console.error('ffmpeg download error for URL:', audioUrl);
        console.error('ffmpeg error details:', err.message);

        if (err.message.includes('TLS') || err.message.includes('SSL')) {
          return reject(
            new Error(
              `SSL/TLS connection failed during audio download. Original error: ${err.message}`,
            ),
          );
        }

        if (
          err.message.includes('timeout') ||
          err.message.includes('ETIMEDOUT')
        ) {
          return reject(
            new Error(
              `Audio download timed out. Original error: ${err.message}`,
            ),
          );
        }

        return reject(new Error(`Failed to download audio: ${err.message}`));
      })
      .run();
  });
}

/**
 * Extract audio as base64 for AI analysis
 * Uses direct fetch in serverless environments, falls back to ffmpeg if available
 */
export async function extractAudioAsBase64(audioUrl: string): Promise<string> {
  // Try direct fetch first (works in serverless environments)
  try {
    console.log('Downloading audio directly via fetch...');
    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch audio: ${response.status} ${response.statusText}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');

    console.log(
      `Audio downloaded and converted to base64, size: ${buffer.length} bytes`,
    );
    return base64Audio;
  } catch (fetchError) {
    console.warn('Direct fetch failed, trying ffmpeg fallback:', fetchError);

    // Fallback to ffmpeg if available (for local development)
    try {
      const tempAudioPath = await downloadAudioFile(audioUrl);

      try {
        const audioBuffer = fs.readFileSync(tempAudioPath);
        const base64Audio = audioBuffer.toString('base64');

        // Clean up temporary file
        await cleanupAudioFile(tempAudioPath);

        return base64Audio;
      } catch (error) {
        // Clean up temporary file on error
        await cleanupAudioFile(tempAudioPath);
        throw error;
      }
    } catch (ffmpegError) {
      // If both fail, throw the original fetch error
      throw new Error(
        `Failed to download audio: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`,
      );
    }
  }
}

/**
 * Get file extension from URL
 */
function getFileExtension(url: string): string {
  const urlPath = new URL(url).pathname;
  const extension = path.extname(urlPath).toLowerCase();
  return extension || '.mp3'; // Default to mp3 if no extension found
}

/**
 * Clean up temporary audio file
 */
export async function cleanupAudioFile(audioPath: string): Promise<void> {
  try {
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
  } catch (error) {
    console.warn('Failed to cleanup audio file:', error);
  }
}

/**
 * Analyze audio content with basic waveform analysis
 */
export async function analyzeAudioContent(
  audioUrl: string,
  options: AudioAnalysisOptions = {},
): Promise<{
  waveform?: number[];
  frequencyData?: number[];
  beats?: number[];
  analysis: string;
}> {
  configureFfmpegPaths();

  const tempAudioPath = await downloadAudioFile(audioUrl);

  try {
    // Convert to raw PCM for analysis
    const tempRawPath = path.join(os.tmpdir(), `audio-raw-${Date.now()}.raw`);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempAudioPath)
        .audioChannels(1) // Mono
        .audioFrequency(44100)
        .format('s16le') // 16-bit signed little-endian
        .output(tempRawPath)
        .on('end', () => resolve())
        .on('error', err => reject(err))
        .run();
    });

    // Read raw audio data
    const audioBuffer = fs.readFileSync(tempRawPath);
    const audioData = new Int16Array(audioBuffer.buffer);

    // Convert to normalized float array
    const normalizedData = Array.from(audioData).map(
      sample => sample / 32768.0,
    );

    // Basic waveform analysis
    const waveform = options.extractWaveform
      ? normalizedData.filter((_, index) => index % 100 === 0)
      : undefined;

    // Basic frequency analysis
    const frequencyData = options.analyzeFrequency
      ? performBasicFFT(normalizedData.slice(0, 1024))
      : undefined;

    // Basic beat detection
    const beats = options.detectBeats
      ? detectBasicBeats(normalizedData)
      : undefined;

    // Clean up temporary files
    await cleanupAudioFile(tempAudioPath);
    await cleanupAudioFile(tempRawPath);

    return {
      waveform,
      frequencyData,
      beats,
      analysis: 'Audio analysis completed successfully',
    };
  } catch (error) {
    // Clean up temporary files on error
    await cleanupAudioFile(tempAudioPath);
    throw error;
  }
}

/**
 * Basic FFT implementation for frequency analysis
 */
function performBasicFFT(signal: number[]): number[] {
  const N = signal.length;
  const result = new Array(N);

  for (let k = 0; k < N; k++) {
    let real = 0;
    let imag = 0;

    for (let n = 0; n < N; n++) {
      const angle = (-2 * Math.PI * k * n) / N;
      real += signal[n] * Math.cos(angle);
      imag += signal[n] * Math.sin(angle);
    }

    result[k] = Math.sqrt(real * real + imag * imag);
  }

  return result;
}

/**
 * Basic beat detection algorithm
 */
function detectBasicBeats(signal: number[]): number[] {
  const beats: number[] = [];
  const windowSize = 1024;
  const threshold = 0.1;

  for (let i = 0; i < signal.length - windowSize; i += windowSize) {
    const window = signal.slice(i, i + windowSize);
    const energy =
      window.reduce((sum, sample) => sum + sample * sample, 0) / windowSize;

    if (energy > threshold) {
      beats.push(i / 44100); // Convert to time in seconds
    }
  }

  return beats;
}
