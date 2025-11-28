/**
 * Heartbeat Zoom Preset
 *
 * This preset creates a continuous zoom effect with subtle rhythmic pulses that mimic a heartbeat or breathing rhythm.
 * The base zoom moves from 100% to 102%, but every 1.5 seconds, a tiny "bump" temporarily increases the scale by 0.2%
 * over 200ms before returning. This creates a living, organic quality - like feeling a cameraman's heartbeat through
 * a handheld shot.
 *
 * Features:
 * - **Base Continuous Zoom**: Smooth zoom from 100% to 102% over the entire duration
 * - **Rhythmic Pulse Bumps**: Small 0.2% scale bumps every 1.5 seconds (or synced to audio beats if available)
 * - **Audio-Reactive Option**: Can sync pulses to audio beats using waveform effects with low sensitivity
 * - **Subtle Effect**: Pulses are felt more than seen - creating an organic, living quality
 * - **Configurable Parameters**: Adjust zoom range, pulse intensity, pulse interval, and audio reactivity
 *
 * Use cases:
 * - Creating organic, living motion for images or video
 * - Adding subtle energy to static content
 * - Syncing visual rhythm with audio tracks
 * - Building meditative or contemplative effects
 * - Creating handheld camera feel without actual shake
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  media: z.object({
    src: z.string().describe('Media source URL (image or video)'),
    type: z
      .enum(['image', 'video'])
      .optional()
      .describe('Media type (auto-detected if not provided)'),
    fit: z
      .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
      .default('cover')
      .optional()
      .describe('Object fit style for media'),
    startFrom: z
      .number()
      .optional()
      .describe('Start time for video playback (seconds)'),
    endAt: z.number().optional().describe('End time for video playback (seconds)'),
  }).describe('Media configuration (image or video)'),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  
  zoom: z.object({
    baseStart: z
      .number()
      .min(0.5)
      .max(2)
      .default(1.0)
      .describe('Starting scale (1.0 = 100%)'),
    baseEnd: z
      .number()
      .min(0.5)
      .max(2)
      .default(1.02)
      .describe('Ending scale (1.02 = 102%)'),
    pulseIntensity: z
      .number()
      .min(0)
      .max(0.05)
      .default(0.002)
      .describe('Pulse bump intensity (0.002 = 0.2%)'),
    pulseInterval: z
      .number()
      .min(0.5)
      .max(5)
      .default(1.5)
      .describe('Time between pulses in seconds (fixed rhythm)'),
    pulseDuration: z
      .number()
      .min(0.1)
      .max(1)
      .default(0.2)
      .describe('Duration of each pulse bump in seconds'),
  }).optional().describe('Zoom and pulse configuration'),
  
  audio: z.object({
    src: z.string().describe('Audio source URL for beat synchronization'),
    syncToPulses: z
      .boolean()
      .default(false)
      .describe('Whether to sync pulses to audio beats'),
    sensitivity: z
      .number()
      .min(0.05)
      .max(1)
      .default(0.15)
      .describe('Audio reactivity sensitivity (lower = more subtle)'),
  }).optional().describe('Optional audio configuration for beat-synced pulses'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { media, duration, zoom, audio } = params;
  const { config } = props;
  const fps = config?.fps || 30;

  // Helper function to detect media type from URL
  const detectMediaType = (src: string): 'image' | 'video' => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];
    const videoExtensions = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
    const ext = src.split('.').pop()?.toLowerCase() || '';
    
    if (imageExtensions.includes(ext)) return 'image';
    if (videoExtensions.includes(ext)) return 'video';
    return 'image'; // Default to image
  };

  const mediaType = media.type || detectMediaType(media.src);
  const zoomConfig = zoom || {
    baseStart: 1.0,
    baseEnd: 1.02,
    pulseIntensity: 0.002,
    pulseInterval: 1.5,
    pulseDuration: 0.2,
  };

  // Generate pulse keyframes
  const generatePulseRanges = (): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const totalDuration = duration;
    const pulseInterval = zoomConfig.pulseInterval;
    const pulseDuration = zoomConfig.pulseDuration;
    const pulseIntensity = zoomConfig.pulseIntensity;
    const baseStart = zoomConfig.baseStart;
    const baseEnd = zoomConfig.baseEnd;

    // Calculate base linear progression
    const baseZoomRange = baseEnd - baseStart;

    // Start keyframe
    ranges.push({ key: 'scale', val: baseStart, prog: 0 });

    // Generate pulse points
    let currentTime = pulseInterval;
    while (currentTime < totalDuration) {
      const progress = currentTime / totalDuration;
      const baseScale = baseStart + baseZoomRange * progress;

      // Pulse start (just before bump)
      const pulseStartProg = (currentTime - pulseDuration * 0.1) / totalDuration;
      if (pulseStartProg > 0 && pulseStartProg < 1) {
        ranges.push({ key: 'scale', val: baseScale, prog: pulseStartProg });
      }

      // Pulse peak (with bump)
      const pulsePeakProg = (currentTime + pulseDuration * 0.4) / totalDuration;
      if (pulsePeakProg > 0 && pulsePeakProg < 1) {
        ranges.push({
          key: 'scale',
          val: baseScale + pulseIntensity,
          prog: pulsePeakProg,
        });
      }

      // Pulse return (back to base)
      const pulseEndProg = (currentTime + pulseDuration) / totalDuration;
      if (pulseEndProg > 0 && pulseEndProg < 1) {
        ranges.push({ key: 'scale', val: baseScale, prog: pulseEndProg });
      }

      currentTime += pulseInterval;
    }

    // End keyframe
    ranges.push({ key: 'scale', val: baseEnd, prog: 1 });

    // Sort by progress to ensure proper ordering
    return ranges.sort((a, b) => a.prog - b.prog);
  };

  const pulseRanges = generatePulseRanges();

  // Build media atom
  const mediaAtomId = 'heartbeat-media';
  const mediaAtom: RenderableComponentData = {
    id: mediaAtomId,
    componentId: mediaType === 'video' ? 'VideoAtom' : 'ImageAtom',
    type: 'atom' as const,
    data: {
      src: media.src,
      fit: media.fit || 'cover',
      className: 'w-full h-full object-cover',
      ...(mediaType === 'video' && media.startFrom !== undefined
        ? { startFrom: media.startFrom }
        : {}),
      ...(mediaType === 'video' && media.endAt !== undefined
        ? { endAt: media.endAt }
        : {}),
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Build wrapper with heartbeat zoom effect
  const wrapperEffects: any[] = [
    {
      id: 'heartbeat-zoom-effect',
      componentId: 'generic',
      data: {
        type: 'cubic-bezier',
        easingParams: [0.4, 0, 0.6, 1],
        start: 0,
        duration,
        mode: 'provider',
        targetIds: ['heartbeat-wrapper'],
        ranges: pulseRanges,
      },
    },
  ];

  // Add audio-reactive pulse if audio is provided and syncToPulses is true
  if (audio && audio.syncToPulses) {
    wrapperEffects.push({
      id: 'audio-reactive-pulse',
      componentId: 'waveform',
      data: {
        audioSrc: audio.src,
        effectType: 'zoom',
        sensitivity: audio.sensitivity || 0.15,
        audioProperty: 'bass',
        intensity: zoomConfig.pulseIntensity * 2, // Slightly stronger for audio sync
        baseScale: 1.0,
        threshold: 0.2,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / fps,
        mode: 'provider',
        targetIds: ['heartbeat-wrapper'],
        start: 0,
        duration,
        smoothNormalisation: 1,
      },
    });
  }

  const mediaWrapper: RenderableComponentData = {
    id: 'heartbeat-wrapper',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'w-full h-full relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: wrapperEffects,
    childrenData: [mediaAtom],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'heartbeat-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [mediaWrapper],
  };

  // Add audio track if provided
  const childrenData: RenderableComponentData[] = [rootContainer];
  if (audio) {
    childrenData.push({
      id: 'heartbeat-audio',
      componentId: 'AudioAtom',
      type: 'atom' as const,
      data: {
        src: audio.src,
        volume: 1,
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    } as RenderableComponentData);
  }

  return {
    output: {
      childrenData: childrenData as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'heartbeat-zoom',
  title: 'Heartbeat Zoom Preset',
  description:
    'A continuous zoom effect with subtle rhythmic pulses that create an organic, living quality - like feeling a cameraman\'s heartbeat through a handheld shot. Features base zoom from 100% to 102% with periodic 0.2% bumps every 1.5 seconds (or synced to audio beats if available).',
  type: 'predefined',
  presetType: 'children',
  tags: ['zoom', 'animation', 'heartbeat', 'pulse', 'organic', 'audio-reactive'],
  dependencies: {},
  defaultInputParams: {
    media: {
      src: 'https://example.com/image.jpg',
      type: 'image',
      fit: 'cover',
    },
    duration: 10,
    zoom: {
      baseStart: 1.0,
      baseEnd: 1.02,
      pulseIntensity: 0.002,
      pulseInterval: 1.5,
      pulseDuration: 0.2,
    },
  },
};

// Export preset
export const heartbeatZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
