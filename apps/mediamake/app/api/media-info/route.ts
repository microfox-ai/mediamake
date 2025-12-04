import { NextRequest, NextResponse } from 'next/server';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

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

    // Try alternative path resolution for Vercel/serverless environments
    if (!ffprobePathSet) {
      const alternativePaths = [
        // Try direct node_modules path (common in Vercel)
        path.resolve(
          process.cwd(),
          'node_modules',
          '@ffprobe-installer',
          'linux-x64',
          'ffprobe',
        ),
        // Try with .exe extension (some platforms)
        path.resolve(
          process.cwd(),
          'node_modules',
          '@ffprobe-installer',
          'linux-x64',
          'ffprobe.exe',
        ),
        // Try using require.resolve to find the package
        (() => {
          try {
            const pkgPath = require.resolve('@ffprobe-installer/ffprobe');
            return path.resolve(pkgPath, '..', '..', 'linux-x64', 'ffprobe');
          } catch {
            return null;
          }
        })(),
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

    if (!ffprobePathSet) {
      console.warn(
        'FFprobe binary could not be located. This may cause issues in serverless environments.',
      );
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

    const { src } = await req.json();
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

        ffmpeg.ffprobe(
          src,
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
                return reject(
                  new Error(
                    'FFPROBE_NOT_AVAILABLE: ffprobe is not available in this environment. This may be a serverless deployment limitation.',
                  ),
                );
              }
              return reject(err);
            }
            resolve(data);
          },
        );
      },
    );

    const videoStream = metadata.streams.find(
      stream => stream.codec_type === 'video',
    );

    if (!videoStream) {
      return NextResponse.json(
        { error: 'No video stream found in the media' },
        { status: 400 },
      );
    }

    const { duration, size, bit_rate: bitRate } = metadata.format;

    const {
      width,
      height,
      display_aspect_ratio: displayAspectRatio,
      avg_frame_rate: avgFrameRate,
    } = videoStream;

    const frameRate = avgFrameRate ? eval(avgFrameRate).toFixed(2) : undefined;
    const mediaInfo = {
      duration,
      size,
      bitRate,
      width,
      height,
      displayAspectRatio,
      frameRate,
    };
    console.log(
      'media data for ',
      src,
      ': ',
      JSON.stringify(mediaInfo, null, 2),
    );

    return NextResponse.json(mediaInfo);
  } catch (error) {
    console.error('Error fetching media info:', error);

    // Provide more specific error messages
    if (
      error instanceof Error &&
      (error.message === 'FFPROBE_NOT_AVAILABLE' ||
        error.message.includes('Cannot find ffprobe') ||
        error.message.includes('ffprobe'))
    ) {
      return NextResponse.json(
        {
          error: 'FFPROBE_NOT_AVAILABLE',
          message:
            'ffprobe is not available in this serverless environment. Please ensure FFmpeg binaries are properly configured for Vercel deployment.',
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
