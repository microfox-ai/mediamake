/**
 * VHS Glitch Transition Effect Preset
 *
 * A high-energy glitch-style transition effect inspired by VHS tracking errors and digital interference.
 * Perfect for intense workout videos with electronic music, featuring:
 * - RGB channel splitting with chromatic aberration
 * - Horizontal displacement bars sliding at varying speeds
 * - Static noise overlays with rapid opacity flickering
 * - Brightness and contrast fluctuations
 * - Beat-synced glitch intensity tied to bass frequencies
 *
 * Use cases:
 * - High-energy workout videos with electronic music
 * - Training montages with intense beat-synced visuals
 * - Sports highlight reels with digital interference aesthetic
 * - Music videos requiring analog video distortion effects
 */

import { Sequence } from 'remotion';
import z from 'zod';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';

// Parameter schema
const presetParams = z.object({
  video: z.object({
    src: z.string().describe('Source video URL for workout footage'),
  }).describe('Video source configuration'),
  audio: z.object({
    src: z.string().describe('Background music URL (electronic/EDM with strong bass)'),
  }).optional().describe('Optional audio source for beat detection'),
  transitionDuration: z.number().default(0.7).describe('Main transition duration in seconds (0.6-0.8s recommended)'),
  rgbSplitIntensity: z.number().default(20).describe('RGB channel displacement intensity in pixels (10-30)'),
  displacementBarCount: z.number().default(3).describe('Number of horizontal displacement bars (1-5)'),
  staticNoiseIntensity: z.number().default(0.3).describe('Static noise overlay opacity (0-0.5)'),
  flickerSpeed: z.number().default(0.05).describe('Flicker interval duration in seconds (0.03-0.1)'),
  brightnessVariation: z.number().default(1.5).describe('Peak brightness multiplier (1.2-2.0)'),
  audioReactive: z.boolean().default(true).describe('Enable beat-synced glitch intensity'),
  beatThreshold: z.number().default(0.6).describe('Audio threshold for bass frequency detection (0.4-0.8)'),
  glitchImpact: z.number().default(1.0).describe('Global glitch effect intensity multiplier (0.5-2.0)'),
});

// Preset execution
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    video,
    audio,
    transitionDuration,
    rgbSplitIntensity,
    displacementBarCount,
    staticNoiseIntensity,
    flickerSpeed,
    brightnessVariation,
    audioReactive,
    beatThreshold,
    glitchImpact,
  } = params;

  const { config, presets } = props;
  const fps = config?.fps || 30;
  const durationInFrames = Math.ceil(transitionDuration * fps);

  // Generate unique IDs
  const generateId = (base: string) => `vhs-glitch-${base}-${Date.now()}`;

  // Helper: Create RGB channel layers with displacement effects
  const createRGBLayers = (): RenderableComponentData[] => {
    const hueRotations = [0, 120, 240];
    const rgbLayers: RenderableComponentData[] = [];

    hueRotations.forEach((hueRotate, index) => {
      const layerId = generateId(`rgb-layer-${index}`);
      const videoId = generateId(`video-${index}`);

      // Calculate displacement offset with randomization
      const baseOffset = rgbSplitIntensity * glitchImpact;
      const randomOffset = (Math.random() - 0.5) * baseOffset;

      // Create displacement effect
      const displacementEffect = {
        id: generateId(`displacement-effect-${index}`),
        componentId: layerId,
        data: {
          type: 'stepped',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [layerId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: randomOffset, prog: 0.25 },
            { key: 'translateX', val: -randomOffset * 0.5, prog: 0.5 },
            { key: 'translateX', val: randomOffset * 0.7, prog: 0.75 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      };

      rgbLayers.push({
        id: layerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 mix-blend-screen',
            style: {
              filter: `hue-rotate(${hueRotate}deg) brightness(${brightnessVariation})`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [displacementEffect],
        childrenData: [
          {
            id: videoId,
            type: 'atom',
            componentId: 'VideoAtom',
            data: {
              src: video.src,
              fit: 'cover',
              className: 'w-full h-full object-cover',
            },
            context: {
              timing: {
                start: 0,
                duration: transitionDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData);
    });

    return rgbLayers;
  };

  // Helper: Create scanlines
  const createScanlines = (): RenderableComponentData => {
    const scanlineCount = 8;
    const scanlineChildren: RenderableComponentData[] = [];

    for (let i = 0; i < scanlineCount; i++) {
      scanlineChildren.push({
        id: generateId(`scanline-${i}`),
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          className: 'h-px w-full bg-white opacity-20',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData);
    }

    return {
      id: generateId('scanlines-container'),
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none flex flex-col justify-between opacity-20',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: scanlineChildren,
    } as RenderableComponentData;
  };

  // Helper: Create static noise overlay
  const createStaticNoise = (): RenderableComponentData => {
    const noiseId = generateId('static-noise');
    
    // Rapid opacity flickering effect
    const flickerRanges: Array<{ key: string; val: number; prog: number }> = [];
    const flickerSteps = Math.floor(transitionDuration / flickerSpeed);
    
    for (let i = 0; i <= flickerSteps; i++) {
      const prog = i / flickerSteps;
      const opacity = i % 2 === 0 ? 0 : staticNoiseIntensity * glitchImpact;
      flickerRanges.push({ key: 'opacity', val: opacity, prog });
    }

    const flickerEffect = {
      id: generateId('flicker-effect'),
      componentId: noiseId,
      data: {
        type: 'stepped',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: [noiseId],
        ranges: flickerRanges,
      },
    };

    return {
      id: noiseId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none mix-blend-overlay',
          style: {
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0px, transparent 2px, rgba(255,255,255,0.05) 4px)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [flickerEffect],
      childrenData: [],
    } as RenderableComponentData;
  };

  // Helper: Create displacement bars
  const createDisplacementBars = (): RenderableComponentData => {
    const bars: RenderableComponentData[] = [];
    const positions = [20, 50, 75];
    const speeds = [0.15, 0.25, 0.35]; // Fast, medium, slow

    for (let i = 0; i < Math.min(displacementBarCount, 3); i++) {
      const barId = generateId(`displacement-bar-${i}`);
      const height = [2, 3, 1.5][i] || 2;
      const speed = speeds[i] || 0.25;
      const barDuration = speed * glitchImpact;

      // Horizontal sliding effect
      const slideEffect = {
        id: generateId(`slide-effect-${i}`),
        componentId: barId,
        data: {
          type: 'linear',
          start: 0,
          duration: barDuration,
          mode: 'provider',
          targetIds: [barId],
          ranges: [
            { key: 'translateX', val: -100, prog: 0 },
            { key: 'translateX', val: 100, prog: 1 },
          ],
        },
      };

      bars.push({
        id: barId,
        type: 'atom',
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          className: `absolute left-0 w-full bg-white/10`,
          style: {
            height: `${height}px`,
            top: `${positions[i]}%`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [slideEffect],
      } as RenderableComponentData);
    }

    return {
      id: generateId('displacement-bars-container'),
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: bars,
    } as RenderableComponentData;
  };

  // Build main composition
  const rgbLayers = createRGBLayers();
  const scanlines = createScanlines();
  const staticNoise = createStaticNoise();
  const displacementBars = createDisplacementBars();

  // Brightness fluctuation effect on root
  const brightnessEffect = {
    id: generateId('brightness-effect'),
    componentId: generateId('root-container'),
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: [generateId('root-container')],
      ranges: [
        { key: 'brightness', val: 1.0, prog: 0 },
        { key: 'brightness', val: brightnessVariation * glitchImpact, prog: 0.5 },
        { key: 'brightness', val: 1.0, prog: 1 },
      ],
    },
  };

  const rootContainer: RenderableComponentData = {
    id: generateId('root-container'),
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [brightnessEffect],
    childrenData: [
      ...rgbLayers,
      scanlines,
      staticNoise,
      displacementBars,
    ],
  } as RenderableComponentData;

  // Add audio if provided
  const audioComponent = audio ? {
    id: generateId('audio'),
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  } as RenderableComponentData : null;

  const childrenData = audioComponent 
    ? [rootContainer, audioComponent] 
    : [rootContainer];

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
  id: 'vhs-glitch-transition',
  title: 'VHS Glitch Transition Effect',
  description: 'A high-energy glitch-style transition effect inspired by VHS tracking errors and digital interference. Features RGB channel splitting with chromatic aberration, horizontal displacement bars sliding at varying speeds, static noise overlays, and rapid opacity flickering to simulate analog video distortion and signal loss. Designed for intense workout videos with beat-synced glitch intensity tied to bass frequencies. Perfect for training montages with electronic music.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glitch', 'vhs', 'rgb-split', 'workout', 'electronic', 'beat-sync', 'chromatic-aberration', 'distortion', 'retro'],
  defaultInputParams: {
    video: {
      src: 'placeholder-video',
    },
    transitionDuration: 0.7,
    rgbSplitIntensity: 20,
    displacementBarCount: 3,
    staticNoiseIntensity: 0.3,
    flickerSpeed: 0.05,
    brightnessVariation: 1.5,
    audioReactive: true,
    beatThreshold: 0.6,
    glitchImpact: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const vhsGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
