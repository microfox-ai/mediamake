/**
 * Neon Flicker RGB Split Transition Preset
 *
 * This preset creates a flickering neon sign-inspired transition effect between two videos.
 * The transition features rapid on/off cycles like a broken neon light, with chromatic
 * aberration effects reminiscent of old CRT monitors or neon signs shorting out.
 *
 * Features:
 * - **RGB Channel Separation**: Red, green, and blue channels are separated and slightly
 *   offset during flicker moments, creating chromatic aberration effects
 * - **Erratic Flicker Pattern**: Quick double-flashes followed by longer dark moments,
 *   creating a rhythm similar to a failing neon sign
 * - **Electrical Noise**: Subtle white noise overlay that appears during flicker moments
 * - **Dynamic Shadows**: Hard shadows that shift position slightly with each flicker
 * - **Color Channel Effects**: Each RGB channel has unique filters and transformations
 *
 * Use cases:
 * - Creating cyberpunk/retro aesthetic video transitions
 * - Simulating electrical interference or power surges
 * - Adding dramatic, glitchy transitions between video clips
 * - Building dystopian or sci-fi themed video content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First video (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of the second video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second video (incoming)'),
  overlapDuration: z.number().default(2.5).describe('Duration of the transition overlap period in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate timing
  const totalDuration = video1.duration + video2.duration - overlapDuration;
  const video2StartTime = video1.duration - overlapDuration;

  // Helper function to create RGB channel effects for flicker pattern
  const createFlickerEffects = (
    channelId: string,
    channelType: 'red' | 'green' | 'blue',
    isVideo1: boolean,
  ) => {
    const effects: any[] = [];

    // Determine flicker pattern timing based on whether this is video1 or video2
    // Video1: Flickers out during overlap (last 2.5s)
    // Video2: Flickers in during overlap (first 2.5s)
    const flickerStart = isVideo1 ? video1.duration - overlapDuration : 0;

    // Create erratic flicker pattern: double-flash then dark moment
    // Pattern repeats 3 times during the 2.5s overlap
    const patternDuration = overlapDuration / 3;

    for (let i = 0; i < 3; i++) {
      const patternStart = flickerStart + (i * patternDuration);

      // For video1 (outgoing): start visible, flicker, end invisible
      // For video2 (incoming): start invisible, flicker, end visible
      const startOpacity = isVideo1 ? 1 : 0;
      const endOpacity = isVideo1 ? 0 : 1;

      // Phase 1: Quick flash on (0-0.2s)
      effects.push({
        id: `flicker-${channelId}-phase1-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: patternStart,
          duration: 0.2,
          mode: 'provider',
          targetIds: [channelId],
          ranges: [
            { key: 'opacity', val: startOpacity, prog: 0 },
            { key: 'opacity', val: endOpacity, prog: 1 },
          ],
        },
      });

      // Phase 2: Quick flash off (0.2-0.3s) - double-flash effect
      effects.push({
        id: `flicker-${channelId}-phase2-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: patternStart + 0.2,
          duration: 0.1,
          mode: 'provider',
          targetIds: [channelId],
          ranges: [
            { key: 'opacity', val: endOpacity, prog: 0 },
            { key: 'opacity', val: startOpacity, prog: 1 },
          ],
        },
      });

      // Phase 3: Quick flash on again (0.3-0.4s) - completes double-flash
      effects.push({
        id: `flicker-${channelId}-phase3-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: patternStart + 0.3,
          duration: 0.1,
          mode: 'provider',
          targetIds: [channelId],
          ranges: [
            { key: 'opacity', val: startOpacity, prog: 0 },
            { key: 'opacity', val: endOpacity, prog: 1 },
          ],
        },
      });

      // Phase 4: Longer dark moment (0.4-0.8s)
      effects.push({
        id: `flicker-${channelId}-phase4-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: patternStart + 0.4,
          duration: 0.4,
          mode: 'provider',
          targetIds: [channelId],
          ranges: [
            { key: 'opacity', val: endOpacity, prog: 0 },
            { key: 'opacity', val: startOpacity, prog: 1 },
          ],
        },
      });
    }

    // Add rotation effects for shadow simulation (shifts during flicker)
    const rotationAmount = channelType === 'red' ? -1 : channelType === 'green' ? 0 : 1;
    effects.push({
      id: `rotation-${channelId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: flickerStart,
        duration: overlapDuration,
        mode: 'provider',
        targetIds: [channelId],
        ranges: [
          { key: 'rotate', val: rotationAmount, prog: 0 },
          { key: 'rotate', val: -rotationAmount, prog: 0.5 },
          { key: 'rotate', val: rotationAmount, prog: 1 },
        ],
      },
    });

    return effects;
  };

  // Helper function to create noise overlay effects
  const createNoiseEffects = (noiseId: string, isVideo1: boolean) => {
    const flickerStart = isVideo1 ? video1.duration - overlapDuration : 0;
    const patternDuration = overlapDuration / 3;
    const effects: any[] = [];

    for (let i = 0; i < 3; i++) {
      const patternStart = flickerStart + (i * patternDuration);

      // Noise appears during flash moments (0-0.2s, 0.3-0.4s)
      effects.push({
        id: `noise-flash1-${noiseId}-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: patternStart,
          duration: 0.2,
          mode: 'provider',
          targetIds: [noiseId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      effects.push({
        id: `noise-flash2-${noiseId}-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: patternStart + 0.3,
          duration: 0.1,
          mode: 'provider',
          targetIds: [noiseId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    return effects;
  };

  // Build video1 RGB channels
  const video1RedId = 'video1-red-channel';
  const video1GreenId = 'video1-green-channel';
  const video1BlueId = 'video1-blue-channel';
  const video1NoiseId = 'video1-noise-overlay';

  const video1Children: RenderableComponentData[] = [
    // Red channel
    {
      id: video1RedId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          filter: 'sepia(100%) saturate(200%) hue-rotate(270deg)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: createFlickerEffects(video1RedId, 'red', true),
    } as RenderableComponentData,
    // Green channel
    {
      id: video1GreenId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          filter: 'hue-rotate(120deg)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        ...createFlickerEffects(video1GreenId, 'green', true),
        {
          id: `translate-${video1GreenId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [video1GreenId],
            ranges: [
              { key: 'translateX', val: -2, prog: 0 },
              { key: 'translateX', val: 2, prog: 0.5 },
              { key: 'translateX', val: -2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Blue channel
    {
      id: video1BlueId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          filter: 'hue-rotate(0deg)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: video1.duration,
        },
      },
      effects: [
        ...createFlickerEffects(video1BlueId, 'blue', true),
        {
          id: `translate-${video1BlueId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: video1.duration - overlapDuration,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [video1BlueId],
            ranges: [
              { key: 'translateX', val: 2, prog: 0 },
              { key: 'translateX', val: -2, prog: 0.5 },
              { key: 'translateX', val: 2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Noise overlay for video1
    {
      id: video1NoiseId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="position: absolute; inset: 0; background: white; mix-blend-mode: overlay; pointer-events: none;"></div>',
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      effects: createNoiseEffects(video1NoiseId, true),
    } as RenderableComponentData,
  ];

  // Build video2 RGB channels
  const video2RedId = 'video2-red-channel';
  const video2GreenId = 'video2-green-channel';
  const video2BlueId = 'video2-blue-channel';
  const video2NoiseId = 'video2-noise-overlay';

  const video2Children: RenderableComponentData[] = [
    // Red channel
    {
      id: video2RedId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          filter: 'sepia(100%) saturate(200%) hue-rotate(270deg)',
        },
      },
      context: {
        timing: {
          start: video2StartTime,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: createFlickerEffects(video2RedId, 'red', false),
    } as RenderableComponentData,
    // Green channel
    {
      id: video2GreenId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          filter: 'hue-rotate(120deg)',
        },
      },
      context: {
        timing: {
          start: video2StartTime,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: [
        ...createFlickerEffects(video2GreenId, 'green', false),
        {
          id: `translate-${video2GreenId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [video2GreenId],
            ranges: [
              { key: 'translateX', val: -2, prog: 0 },
              { key: 'translateX', val: 2, prog: 0.5 },
              { key: 'translateX', val: -2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Blue channel
    {
      id: video2BlueId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        fit: 'cover',
        style: {
          mixBlendMode: 'screen',
          filter: 'hue-rotate(0deg)',
        },
      },
      context: {
        timing: {
          start: video2StartTime,
          duration: video2.duration + overlapDuration,
        },
      },
      effects: [
        ...createFlickerEffects(video2BlueId, 'blue', false),
        {
          id: `translate-${video2BlueId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: overlapDuration,
            mode: 'provider',
            targetIds: [video2BlueId],
            ranges: [
              { key: 'translateX', val: 2, prog: 0 },
              { key: 'translateX', val: -2, prog: 0.5 },
              { key: 'translateX', val: 2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Noise overlay for video2
    {
      id: video2NoiseId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="position: absolute; inset: 0; background: white; mix-blend-mode: overlay; pointer-events: none;"></div>',
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: video2StartTime,
          duration: overlapDuration,
        },
      },
      effects: createNoiseEffects(video2NoiseId, false),
    } as RenderableComponentData,
  ];

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'neon-flicker-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [...video1Children, ...video2Children],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'neon-flicker-transition',
  title: 'Neon Flicker RGB Split Transition',
  description: 'Flickering neon sign-inspired transition with chromatic aberration RGB channel separation, erratic flicker pattern with rhythm (double-flashes and dark moments), electrical noise overlay, and dramatic shifting hard shadows. Creates a broken CRT/neon sign effect for video transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'neon', 'flicker', 'rgb', 'chromatic-aberration', 'glitch', 'crt', 'retro', 'cyberpunk'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    overlapDuration: 2.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const neonFlickerTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
