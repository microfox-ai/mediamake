import { NextRequest, NextResponse } from 'next/server';
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

    // Verify and set ffmpeg path
    if (ffmpegInstaller?.path) {
      const ffmpegPath = ffmpegInstaller.path;
      // Verify the binary exists and is accessible
      if (fs.existsSync(ffmpegPath)) {
        ffmpeg.setFfmpegPath(ffmpegPath);
        console.log('FFmpeg path configured:', ffmpegPath);
      } else {
        console.warn('FFmpeg binary not found at:', ffmpegPath);
      }
    }

    // Verify and set ffprobe path with multiple fallback strategies
    let ffprobePathSet = false;

    if (ffprobeInstaller?.path) {
      const ffprobePath = ffprobeInstaller.path;
      // Verify the binary exists and is accessible
      if (fs.existsSync(ffprobePath)) {
        ffmpeg.setFfprobePath(ffprobePath);
        console.log('FFprobe path configured:', ffprobePath);
        ffprobePathSet = true;
      } else {
        console.warn('FFprobe binary not found at:', ffprobePath);
      }
    }

    // Try alternative path resolution with platform detection
    if (!ffprobePathSet) {
      // Detect platform and architecture
      const platform = os.platform();
      const arch = os.arch();
      
      // Map platform/arch to package directory names
      let platformDir: string;
      if (platform === 'win32') {
        platformDir = arch === 'x64' ? 'win32-x64' : 'win32-ia32';
      } else if (platform === 'darwin') {
        platformDir = arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
      } else {
        // Linux variants
        if (arch === 'arm64') {
          platformDir = 'linux-arm64';
        } else if (arch === 'arm') {
          platformDir = 'linux-arm';
        } else if (arch === 'ia32') {
          platformDir = 'linux-ia32';
        } else {
          platformDir = 'linux-x64';
        }
      }

      const binaryName = platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';

      const alternativePaths = [
        // Try direct node_modules path with platform detection
        path.resolve(
          process.cwd(),
          'node_modules',
          '@ffprobe-installer',
          platformDir,
          binaryName,
        ),
        // Try using require.resolve to find the package
        (() => {
          try {
            const pkgPath = require.resolve('@ffprobe-installer/ffprobe');
            return path.resolve(pkgPath, '..', '..', platformDir, binaryName);
          } catch {
            return null;
          }
        })(),
        // Fallback: try without .exe extension on Windows
        ...(platform === 'win32'
          ? [
              path.resolve(
                process.cwd(),
                'node_modules',
                '@ffprobe-installer',
                platformDir,
                'ffprobe',
              ),
            ]
          : []),
      ].filter(Boolean) as string[];

      for (const altPath of alternativePaths) {
        if (altPath && fs.existsSync(altPath)) {
          ffmpeg.setFfprobePath(altPath);
          console.log('FFprobe path configured (alternative):', altPath);
          ffprobePathSet = true;
          break;
        }
      }
    }

    // Final fallback: try system ffprobe (common in local development)
    if (!ffprobePathSet) {
      try {
        // Test if system ffprobe is available
        const { execSync } = require('child_process');
        execSync('ffprobe -version', { stdio: 'ignore' });
        // If we get here, ffprobe is available in PATH
        console.log('Using system ffprobe from PATH');
        ffprobePathSet = true; // fluent-ffmpeg will use system binary if path not set
      } catch {
        // System ffprobe not available, that's okay
      }
    }

    if (!ffprobePathSet) {
      console.warn(
        'FFprobe binary could not be located. This may cause issues in serverless environments.',
      );
    } else {
      // Test if ffprobe actually works by checking version (optional verification)
      // Note: This is just a verification step, errors here won't prevent usage
      try {
        const { execSync } = require('child_process');
        // Try to get the configured path from the installer
        const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
        const ffprobePath = ffprobeInstaller?.path;
        if (ffprobePath && fs.existsSync(ffprobePath)) {
          execSync(`"${ffprobePath}" -version`, { stdio: 'ignore' });
          console.log('FFprobe verified and working');
        }
      } catch (testError) {
        // Non-fatal: path is set, but verification failed (might still work)
        console.warn('FFprobe verification failed (may still work):', testError);
      }
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

export async function POST(req: NextRequest) {
  try {
    configureFfmpegPaths();

    // Safely parse JSON body with error handling
    let body;
    try {
      const text = await req.text();
      if (!text || text.trim().length === 0) {
        return NextResponse.json(
          { error: 'Request body is required' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { src } = body;
    if (!src) {
      return NextResponse.json({ error: 'src is required' }, { status: 400 });
    }

    const metadata = await new Promise<ffmpeg.FfprobeData>(
      (resolve, reject) => {
        // Add timeout for better error handling
        const timeout = setTimeout(() => {
          reject(
            new Error('ffprobe timeout - media metadata request took too long'),
          );
        }, 30000); // 30 second timeout

        // Build ffprobe options based on URL type
        const isHttpUrl = src.startsWith('http://') || src.startsWith('https://');
        const ffprobeOptions: string[] = [];

        if (isHttpUrl) {
          // HTTP/HTTPS specific options - use minimal options first
          // Some servers don't like too many options
          ffprobeOptions.push(
            '-tls_verify', '0', // Disable TLS certificate verification
            '-protocol_whitelist', 'file,http,https,tcp,tls',
            '-rw_timeout', '60000000', // 60 seconds in microseconds for read/write
            '-user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          );
        }

        ffmpeg.ffprobe(
          src,
          ffprobeOptions,
          (err, data) => {
            clearTimeout(timeout);

            if (err) {
              // Check if it's a "Cannot find ffprobe" error (more specific checks)
              const isFfprobeNotFound =
                err.message.includes('Cannot find ffprobe') ||
                err.message.includes('ffprobe: command not found') ||
                err.message.includes('ENOENT') && err.message.includes('ffprobe') ||
                (err.message.includes('spawn') && err.message.includes('ffprobe')) ||
                err.code === 'ENOENT';

              if (isFfprobeNotFound) {
                const isLocalDev = process.env.NODE_ENV !== 'production' || !process.env.VERCEL;
                const errorMessage = isLocalDev
                  ? 'FFPROBE_NOT_AVAILABLE: ffprobe is not available. Please install FFmpeg (which includes ffprobe) on your system, or ensure the @ffprobe-installer package is properly installed.'
                  : 'FFPROBE_NOT_AVAILABLE: ffprobe is not available in this environment. This may be a serverless deployment limitation.';
                return reject(new Error(errorMessage));
              }

              // Check for network/HTTP errors (error -138)
              const isNetworkError =
                err.message.includes('Error number -138') ||
                err.message.includes('HTTP error') ||
                err.message.includes('Network') ||
                err.message.includes('Connection') ||
                err.message.includes('timeout') ||
                err.message.includes('ETIMEDOUT') ||
                err.message.includes('ECONNREFUSED');

              if (isNetworkError) {
                console.error('FFprobe network error:', err.message);
                return reject(new Error(
                  `Network error while accessing media: ${src}. This may be due to network connectivity issues, firewall restrictions, or the media URL being unavailable.`
                ));
              }

              // Log other errors for debugging
              console.error('FFprobe error (not a "not found" error):', err.message);
              return reject(err);
            }
            resolve(data);
          },
        );
      },
    );

    // Find video or audio stream (support both)
    const videoStream = metadata.streams.find(
      stream => stream.codec_type === 'video',
    );
    const audioStream = metadata.streams.find(
      stream => stream.codec_type === 'audio',
    );

    const { duration, size, bit_rate: bitRate } = metadata.format;

    // Build media info with available data
    const mediaInfo: {
      duration?: number;
      size?: number;
      bitRate?: number;
      width?: number;
      height?: number;
      displayAspectRatio?: string;
      frameRate?: string;
    } = {
      duration,
      size,
      bitRate,
    };

    // Add video-specific properties if video stream exists
    if (videoStream) {
      const {
        width,
        height,
        display_aspect_ratio: displayAspectRatio,
        avg_frame_rate: avgFrameRate,
      } = videoStream;
      mediaInfo.width = width;
      mediaInfo.height = height;
      mediaInfo.displayAspectRatio = displayAspectRatio;
      if (avgFrameRate) {
        try {
          // Safely evaluate frame rate (e.g., "30/1" -> 30)
          const frameRateValue = eval(avgFrameRate);
          mediaInfo.frameRate = typeof frameRateValue === 'number' 
            ? frameRateValue.toFixed(2) 
            : avgFrameRate;
        } catch {
          mediaInfo.frameRate = avgFrameRate;
        }
      }
    }

    // If no video or audio stream found, return error
    if (!videoStream && !audioStream) {
      return NextResponse.json(
        { error: 'No video or audio stream found in the media' },
        { status: 400 },
      );
    }
    console.log(
      'media data for ',
      src,
      ': ',
      JSON.stringify(mediaInfo, null, 2),
    );

    return NextResponse.json(mediaInfo);
  } catch (error) {
    console.error('Error fetching media info:', error);

    // Handle JSON parsing errors
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json(
        {
          error: 'Invalid request format',
          message: 'Request body must be valid JSON',
        },
        { status: 400 },
      );
    }

    // Handle network errors
    if (
      error instanceof Error &&
      (error.message.includes('Network error') ||
        error.message.includes('HTTP error') ||
        error.message.includes('Error number -138') ||
        error.message.includes('timeout') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ECONNREFUSED'))
    ) {
      return NextResponse.json(
        {
          error: 'NETWORK_ERROR',
          message: error.message || 'Failed to access media URL. Please check the URL and network connectivity.',
        },
        { status: 503 },
      );
    }

    // Provide more specific error messages for ffprobe issues
    if (
      error instanceof Error &&
      (error.message.includes('FFPROBE_NOT_AVAILABLE') ||
        error.message.includes('Cannot find ffprobe') ||
        (error.message.includes('ffprobe') && 
         (error.message.includes('command not found') || 
          error.message.includes('ENOENT') ||
          error.message.includes('spawn'))))
    ) {
      const isLocalDev = process.env.NODE_ENV !== 'production' || !process.env.VERCEL;
      return NextResponse.json(
        {
          error: 'FFPROBE_NOT_AVAILABLE',
          message: isLocalDev
            ? 'ffprobe is not available. Please install FFmpeg (which includes ffprobe) on your system, or ensure the @ffprobe-installer package is properly installed. For Windows: https://ffmpeg.org/download.html'
            : 'ffprobe is not available in this serverless environment. Please ensure FFmpeg binaries are properly configured for Vercel deployment.',
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch media info',
        message:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
