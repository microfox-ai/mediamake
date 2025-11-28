import { bundle } from '@remotion/bundler';
import {
  renderMedia,
  selectComposition,
  renderStill,
} from '@remotion/renderer';
import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { webpackOverride } from '@/components/remotion/webpack-override.mjs';
import os from 'os';
import { LocalRenderStore } from '@/lib/local-render-store';
import { randomBytes } from 'crypto';

interface LocalRenderRequest {
  compositionId: string;
  inputProps?: Record<string, any>;
  codec?: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores';
  audioCodec?: 'aac' | 'mp3' | 'pcm-16' | 'opus';
  renderType?: 'video' | 'audio' | 'still';
  outputLocation?: string;
  fileName?: string;
  frameTime?: number; // Frame time in seconds for still image rendering
  concurrency?: number | 'auto'; // Parallel rendering threads
  quality?: 'fast' | 'balanced' | 'high'; // Quality presets
  resumeFrom?: string; // Resume from checkpoint file
}

interface RenderCheckpoint {
  compositionId: string;
  outputPath: string;
  lastFrameRendered: number;
  totalFrames: number;
  timestamp: number;
  inputProps: Record<string, any>;
  codec: string;
  audioCodec: string;
}

// Helper function to save checkpoint
const saveCheckpoint = (
  checkpointPath: string,
  checkpoint: RenderCheckpoint,
) => {
  try {
    fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
    console.log(`✅ Checkpoint saved: ${checkpointPath}`);
  } catch (error) {
    console.error('Failed to save checkpoint:', error);
  }
};

// Helper function to load checkpoint
const loadCheckpoint = (checkpointPath: string): RenderCheckpoint | null => {
  try {
    if (fs.existsSync(checkpointPath)) {
      const data = fs.readFileSync(checkpointPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load checkpoint:', error);
  }
  return null;
};

// Helper function to get optimal concurrency
const getOptimalConcurrency = (
  concurrencySetting: number | 'auto' | undefined,
): number => {
  if (typeof concurrencySetting === 'number') {
    return concurrencySetting;
  }

  // Auto-detect based on CPU cores
  const cpuCount = os.cpus().length;
  // Use 50-75% of available cores for optimal performance
  const optimal = Math.max(1, Math.floor(cpuCount * 0.75));
  console.log(
    `🖥️ Detected ${cpuCount} CPU cores, using concurrency: ${optimal}`,
  );
  return optimal;
};

// Helper function to get quality settings
const getQualitySettings = (quality?: 'fast' | 'balanced' | 'high') => {
  switch (quality) {
    case 'fast':
      return {
        jpegQuality: 80,
        scale: 1,
        crf: 28, // Higher CRF = faster encoding, lower quality
      };
    case 'high':
      return {
        jpegQuality: 100,
        scale: 1,
        crf: 18, // Lower CRF = slower encoding, higher quality
      };
    case 'balanced':
    default:
      return {
        jpegQuality: 90,
        scale: 1,
        crf: 23, // Balanced
      };
  }
};

export const POST = async (req: NextRequest) => {
  try {
    const requestData: LocalRenderRequest = await req.json();
    const compositionId = requestData.compositionId;
    const inputProps = requestData.inputProps || {};
    const codec = requestData.codec || 'h264';
    const audioCodec = requestData.audioCodec || 'aac';
    const renderType = requestData.renderType || 'video';
    const outputLocation = requestData.outputLocation;
    const fileName = requestData.fileName;
    const frameTime = requestData.frameTime || 0;
    const concurrency = requestData.concurrency || 'auto';
    const quality = requestData.quality || 'balanced';
    const resumeFrom = requestData.resumeFrom;

    // Validate required fields
    if (!compositionId) {
      return NextResponse.json(
        { error: 'Composition ID is required' },
        { status: 400 },
      );
    }

    // Validate render type
    if (!['video', 'audio', 'still'].includes(renderType)) {
      return NextResponse.json(
        { error: 'Render type must be video, audio, or still' },
        { status: 400 },
      );
    }

    // Generate unique render ID
    const renderId = `local-${Date.now()}-${randomBytes(4).toString('hex')}`;
    
    // Get optimal concurrency
    const optimalConcurrency = getOptimalConcurrency(concurrency);

    // Determine output location and filename
    const outputDir = outputLocation || './out';
    const outputFileName = fileName || `${compositionId}-${Date.now()}`;

    // Create render entry in store
    LocalRenderStore.create({
      id: renderId,
      compositionId,
      fileName: outputFileName,
      renderType,
      codec,
      audioCodec,
      quality,
      concurrency: optimalConcurrency,
      inputProps,
    });

    console.log(`📝 Created local render ${renderId}`);
    console.log('Composition ID:', compositionId);
    console.log('Codec:', codec);
    console.log('Quality:', quality);
    console.log('Concurrency:', optimalConcurrency);

    // Start render in background (don't await)
    startBackgroundRender(
      renderId,
      compositionId,
      inputProps,
      codec,
      audioCodec,
      renderType,
      outputDir,
      outputFileName,
      frameTime,
      optimalConcurrency,
      quality,
      resumeFrom,
    ).catch(error => {
      console.error(`Background render ${renderId} failed:`, error);
      LocalRenderStore.fail(renderId, error.message);
    });

    // Return immediately with render ID
    return NextResponse.json({
      success: true,
      renderId,
      message: 'Local render started',
      status: 'pending',
    });
  } catch (error) {
    console.error('Local render error:', error);
    return NextResponse.json(
      {
        error: 'Failed to start local render',
        message: (error as Error).message,
      },
      { status: 500 },
    );
  }
};

// Background render function
async function startBackgroundRender(
  renderId: string,
  compositionId: string,
  inputProps: Record<string, any>,
  codec: string,
  audioCodec: string,
  renderType: string,
  outputDir: string,
  outputFileName: string,
  frameTime: number,
  optimalConcurrency: number,
  quality: 'fast' | 'balanced' | 'high',
  resumeFrom?: string,
) {

  try {
    console.log(`🎬 Starting background render: ${renderId}`);
    
    // Update status to rendering
    LocalRenderStore.update(renderId, { status: 'rendering' });

    // Get quality settings
    const qualitySettings = getQualitySettings(quality);

    // Ensure output directory exists
    const absoluteOutputDir = path.resolve(outputDir);
    if (!fs.existsSync(absoluteOutputDir)) {
      fs.mkdirSync(absoluteOutputDir, { recursive: true });
    }

    // Create bundle (uses default temp directory)
    const bundleLocation = await bundle({
      entryPoint: path.resolve('./components/remotion/index.ts'),
      webpackOverride: webpackOverride,
    });

    console.log(`📦 Bundle created at: ${bundleLocation}`);

    // Get the composition
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
    });

    console.log(`🎯 Composition selected: ${composition.id} (${composition.durationInFrames} frames)`);

    // Update store with total frames
    LocalRenderStore.update(renderId, {
      totalFrames: composition.durationInFrames,
    });

    let result;

    if (renderType === 'still') {
      // Render still image
      const stillOutputPath = path.join(absoluteOutputDir, `${outputFileName}.png`);

      await renderStill({
        composition,
        serveUrl: bundleLocation,
        output: stillOutputPath,
        inputProps,
        frame: Math.round(frameTime * composition.fps), // Convert seconds to frame number
        logLevel: 'error',
      });

      result = {
        type: 'still',
        outputPath: stillOutputPath,
        fileName: `${outputFileName}.png`,
        composition: composition,
      };
    } else if (renderType === 'audio') {
      // Render audio only
      const audioOutputPath = path.join(
        absoluteOutputDir,
        `${outputFileName}.${audioCodec === 'aac' ? 'm4a' : audioCodec}`,
      );

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec:
          audioCodec === 'aac' || audioCodec === 'mp3' ? (audioCodec as 'aac' | 'mp3') : 'h264', // Still need video codec for audio rendering
        audioCodec: audioCodec as 'aac' | 'mp3' | 'pcm-16' | 'opus',
        outputLocation: audioOutputPath,
        inputProps,
        concurrency: optimalConcurrency,
        // Audio-only rendering
        imageFormat: 'jpeg',
        jpegQuality: 1,
        videoBitrate: '1k', // Very low bitrate for audio-only
        audioBitrate: '128k',
        timeoutInMilliseconds: 3600000, // 1 hour timeout for audio
        logLevel: 'error',
        onProgress: progress => {
          // Update progress in store
          LocalRenderStore.update(renderId, {
            progress: progress.progress,
            estimatedTimeRemaining: progress.renderEstimatedTime,
          });

          // Log progress
          const progressPercent = (progress.progress * 100).toFixed(1);
          const estimatedMinutes = (
            progress.renderEstimatedTime / 60000
          ).toFixed(2);
          console.log(
            `🎵 Audio Render ${renderId}: ${progressPercent}% | ETA: ${estimatedMinutes} minutes`,
          );
        },
      });

      result = {
        type: 'audio',
        outputPath: audioOutputPath,
        fileName: `${outputFileName}.${audioCodec === 'aac' ? 'm4a' : audioCodec}`,
        composition: composition,
      };
    } else {
      // Render video (default)
      const videoOutputPath = path.join(absoluteOutputDir, `${outputFileName}.mp4`);
      const checkpointPath = path.join(
        absoluteOutputDir,
        `${outputFileName}.checkpoint.json`,
      );

      // Check for existing checkpoint if resumeFrom is provided
      let startFrame = 0;
      let existingCheckpoint: RenderCheckpoint | null = null;

      if (resumeFrom && fs.existsSync(resumeFrom)) {
        existingCheckpoint = loadCheckpoint(resumeFrom);
        if (existingCheckpoint) {
          startFrame = existingCheckpoint.lastFrameRendered;
          console.log(
            `📍 Resuming from frame ${startFrame} of ${existingCheckpoint.totalFrames}`,
          );
        }
      }

      // Calculate frame range for resume capability
      const totalFrames = composition.durationInFrames;
      const frameRange: [number, number] | null =
        startFrame > 0 ? [startFrame, totalFrames - 1] : null;

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: codec as 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores',
        audioCodec: audioCodec as 'aac' | 'mp3' | 'pcm-16' | 'opus',
        outputLocation: videoOutputPath,
        inputProps,
        concurrency: optimalConcurrency,
        // Performance optimizations
        ...qualitySettings,
        ...(frameRange ? { frameRange } : {}),
        timeoutInMilliseconds: 14400000, // 4 hours timeout for long renders
        logLevel: 'error',
        envVariables: {
          NODE_OPTIONS: '--max-old-space-size=8192', // Increase memory limit
        },
        onProgress: progress => {
          const currentFrame = Math.floor(
            progress.progress * composition.durationInFrames,
          );

          // Update progress in store
          LocalRenderStore.update(renderId, {
            progress: progress.progress,
            currentFrame,
            estimatedTimeRemaining: progress.renderEstimatedTime,
          });

          // Log progress
          const progressPercent = (progress.progress * 100).toFixed(1);
          const estimatedMinutes = (
            progress.renderEstimatedTime / 60000
          ).toFixed(2);
          console.log(
            `🎬 Video Render ${renderId}: ${progressPercent}% | Frame ${currentFrame}/${composition.durationInFrames} | ETA: ${estimatedMinutes}m`,
          );

          // Save checkpoint every 100 frames
          if (currentFrame % 100 === 0 && currentFrame > 0) {
            const checkpoint: RenderCheckpoint = {
              compositionId,
              outputPath: videoOutputPath,
              lastFrameRendered: currentFrame,
              totalFrames: composition.durationInFrames,
              timestamp: Date.now(),
              inputProps,
              codec,
              audioCodec,
            };
            saveCheckpoint(checkpointPath, checkpoint);
            
            // Update checkpoint path in store
            LocalRenderStore.update(renderId, {
              checkpointPath,
            });
          }
        },
      });

      // Clean up checkpoint file on successful completion
      if (fs.existsSync(checkpointPath)) {
        fs.unlinkSync(checkpointPath);
        console.log('✅ Checkpoint file cleaned up');
      }

      result = {
        type: 'video',
        outputPath: videoOutputPath,
        fileName: `${outputFileName}.mp4`,
        composition: composition,
      };
    }

    console.log(`✅ Render ${renderId} completed successfully!`);
    console.log('Output:', result.outputPath);

    // Mark as completed in store
    LocalRenderStore.complete(renderId, result.outputPath);
  } catch (error) {
    console.error(`❌ Render ${renderId} failed:`, error);

    // Find checkpoint file if it exists
    const absoluteOutputDir = path.resolve(outputDir);
    const checkpointPath = path.join(absoluteOutputDir, `${outputFileName}.checkpoint.json`);
    const hasCheckpoint = fs.existsSync(checkpointPath);

    // Mark as failed in store with checkpoint info
    LocalRenderStore.fail(
      renderId,
      (error as Error).message,
      hasCheckpoint ? checkpointPath : undefined,
    );
  }
}
