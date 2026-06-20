/**
 * Retro TV Static Venetian Blinds Transition Preset
 *
 * This preset creates a glitchy, energetic Venetian blinds transition that mimics old analog
 * television interference. Perfect for beat-synchronized content like music videos.
 *
 * Features:
 * - 25 vertical strips that flicker and slide with different timing
 * - Random delays (0-200ms) for organic, imperfect look
 * - Strips slide upward or downward randomly (50% chance each direction)
 * - Noise texture overlay using CSS filters (contrast, brightness)
 * - Opacity flicker animations to simulate TV static
 * - RGB split effect using red/cyan shadows
 * - Slight height variations (98-102%) for organic feel
 * - Steps easing for glitchy, digital feel
 * - Total duration 0.8s
 *
 * Use cases:
 * - Music video transitions between clips
 * - Beat-synchronized scene changes
 * - Glitchy, energetic content transitions
 * - Retro TV/VHS aesthetic effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  transitionDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of the transition in seconds'),
  stripCount: z
    .number()
    .int()
    .min(15)
    .max(40)
    .default(25)
    .describe('Number of vertical blind strips (20-30 recommended)'),
  maxDelay: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe('Maximum random delay for strip animations in seconds'),
  flickerDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Duration of the flicker effect in seconds'),
  backgroundColor: z
    .string()
    .default('#000')
    .describe('Background color of the blinds'),
  contrast: z
    .number()
    .min(1)
    .max(2)
    .default(1.2)
    .describe('Contrast filter value for noise texture'),
  brightness: z
    .number()
    .min(1)
    .max(2)
    .default(1.1)
    .describe('Brightness filter value for noise texture'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Intensity of RGB split effect in pixels'),
  minHeight: z
    .number()
    .min(90)
    .max(100)
    .default(98)
    .describe('Minimum height percentage for strips'),
  maxHeight: z
    .number()
    .min(100)
    .max(110)
    .default(102)
    .describe('Maximum height percentage for strips'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    transitionDuration,
    stripCount,
    maxDelay,
    flickerDuration,
    backgroundColor,
    contrast,
    brightness,
    rgbSplitIntensity,
    minHeight,
    maxHeight,
  } = params;

  // Helper function to generate random delay
  const getRandomDelay = (): number => {
    return Math.random() * maxDelay;
  };

  // Helper function to generate random height
  const getRandomHeight = (): number => {
    return minHeight + Math.random() * (maxHeight - minHeight);
  };

  // Helper function to determine slide direction (50% chance up or down)
  const getSlideDirection = (index: number): 'up' | 'down' => {
    return index % 2 === 0 ? 'up' : 'down';
  };

  // Create blind strips
  const blindStrips: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripId = `blind-strip-${i}`;
    const leftPosition = (i / stripCount) * 100;
    const width = 100 / stripCount;
    const height = getRandomHeight();
    const delay = getRandomDelay();
    const direction = getSlideDirection(i);
    const translateYStart = direction === 'up' ? -105 : 105;

    // RGB split shadow effect
    const rgbShadow = `${rgbSplitIntensity}px 0 4px rgba(255,0,0,0.3), -${rgbSplitIntensity}px 0 4px rgba(0,255,255,0.3)`;

    // Create the blind strip
    const blindStrip: RenderableComponentData = {
      id: stripId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '',
        className: 'absolute h-full top-0 pointer-events-none',
        style: {
          left: `${leftPosition}%`,
          width: `${width}%`,
          height: `${height}%`,
          backgroundColor: backgroundColor,
          filter: `contrast(${contrast}) brightness(${brightness})`,
          boxShadow: rgbShadow,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Slide effect
        {
          id: `blind-slide-${i}`,
          componentId: 'generic',
          data: {
            type: 'steps',
            start: delay,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'translateY', val: translateYStart, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        },
        // Flicker effect (loops during transition)
        {
          id: `blind-flicker-${i}`,
          componentId: 'generic',
          data: {
            type: 'steps',
            start: delay,
            duration: flickerDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.4 },
              { key: 'opacity', val: 0.5, prog: 0.6 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    blindStrips.push(blindStrip);
  }

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-tv-venetian-blinds-container',
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
    childrenData: blindStrips as RenderableComponentData[],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'retro-tv-venetian-blinds-transition',
  title: 'Retro TV Static Venetian Blinds Transition',
  description:
    'A glitchy, energetic Venetian blinds transition that mimics old analog television interference. Features 25 vertical strips that slide up/down with randomized delays (0-200ms), noise texture overlays, opacity flicker effects, and RGB split glitch for beat-synchronized content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'venetian-blinds',
    'retro',
    'tv-static',
    'glitch',
    'analog',
    'music-video',
    'beat-sync',
    'energetic',
  ],
  defaultInputParams: {
    transitionDuration: 0.8,
    stripCount: 25,
    maxDelay: 0.2,
    flickerDuration: 0.1,
    backgroundColor: '#000',
    contrast: 1.2,
    brightness: 1.1,
    rgbSplitIntensity: 2,
    minHeight: 98,
    maxHeight: 102,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retroTvVenetianBlindsTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
