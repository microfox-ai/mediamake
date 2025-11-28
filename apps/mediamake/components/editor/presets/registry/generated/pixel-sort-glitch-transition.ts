/**
 * Pixel Sorting Glitch Transition Preset
 *
 * A pixel sorting glitch transition effect that slices images into horizontal bands moving at
 * different speeds with elastic overshoot, freeze frames, digital noise overlays, color banding,
 * and posterization effects simulating corrupted video codecs or severe packet loss.
 *
 * Features:
 * - **Horizontal Slice Shearing**: 8-12 horizontal bands that move at different speeds
 * - **Elastic Overshoot**: Some bands freeze momentarily then catch up with spring motion
 * - **Digital Noise Overlays**: Flickering noise synchronized with distorted moments
 * - **Color Banding & Posterization**: High contrast, low saturation effects for digital breakdown
 * - **Broken LCD Simulation**: Bands lag/accelerate like corrupted video codec or packet loss
 * - **Configurable Impact**: Control transition intensity and distortion levels
 *
 * Use cases:
 * - Creating glitchy, corrupted video aesthetic transitions
 * - Simulating livestream packet loss or broken LCD displays
 * - Adding edgy, digital breakdown effects to video content
 * - Creating kinetic, high-energy transitions with tech/cyberpunk vibes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  media: z.object({
    src: z.string().describe('Source URL or path of the image/video to transition'),
    type: z.enum(['image', 'video']).default('image').describe('Media type'),
  }),
  duration: z.number().min(0.5).max(5).default(1.5).describe('Transition duration in seconds'),
  sliceCount: z.number().min(6).max(16).default(8).describe('Number of horizontal slices (6-16)'),
  impact: z.number().min(0.5).max(2).default(1).describe('Overall distortion intensity multiplier (0.5-2)'),
  noiseIntensity: z.number().min(0).max(1).default(0.3).describe('Digital noise overlay intensity (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media, duration, sliceCount, impact, noiseIntensity } = params;

  // Helper: Generate slice timing variations
  const getSliceDurationMultiplier = (index: number): number => {
    // Create varied duration multipliers (0.8-1.3) for desync effect
    const multipliers = [0.8, 1.1, 0.9, 1.2, 0.8, 1.3, 1.0, 0.9, 1.1, 0.85, 1.25, 0.95];
    return multipliers[index % multipliers.length];
  };

  // Helper: Generate translateX animation keyframes with freeze and overshoot
  const getTranslateXKeyframes = (index: number): Array<{ key: string; val: number; prog: number }> => {
    const patterns = [
      // Pattern 1: Lag behind, freeze, catch up with overshoot
      [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -150 * impact, prog: 0.4 },
        { key: 'translateX', val: -150 * impact, prog: 0.6 }, // Freeze
        { key: 'translateX', val: 20 * impact, prog: 0.85 }, // Overshoot
        { key: 'translateX', val: 0, prog: 1 },
      ],
      // Pattern 2: Accelerate ahead, freeze, snap back
      [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 200 * impact, prog: 0.35 },
        { key: 'translateX', val: 200 * impact, prog: 0.55 }, // Freeze
        { key: 'translateX', val: -25 * impact, prog: 0.9 }, // Overshoot
        { key: 'translateX', val: 0, prog: 1 },
      ],
      // Pattern 3: Stepped freeze with snap
      [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -80 * impact, prog: 0.25 },
        { key: 'translateX', val: -80 * impact, prog: 0.5 }, // Freeze
        { key: 'translateX', val: -80 * impact, prog: 0.75 }, // Freeze
        { key: 'translateX', val: 0, prog: 1 },
      ],
      // Pattern 4: Delayed catch-up with elastic overshoot
      [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 180 * impact, prog: 0.3 },
        { key: 'translateX', val: 180 * impact, prog: 0.65 }, // Long freeze
        { key: 'translateX', val: -30 * impact, prog: 0.92 }, // Overshoot
        { key: 'translateX', val: 0, prog: 1 },
      ],
      // Pattern 5: Quick snap with freeze
      [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -120 * impact, prog: 0.33 },
        { key: 'translateX', val: -120 * impact, prog: 0.66 }, // Freeze
        { key: 'translateX', val: 0, prog: 1 },
      ],
      // Pattern 6: Long delay with aggressive overshoot
      [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: 250 * impact, prog: 0.28 },
        { key: 'translateX', val: 250 * impact, prog: 0.7 }, // Very long freeze
        { key: 'translateX', val: -35 * impact, prog: 0.93 }, // Overshoot
        { key: 'translateX', val: 0, prog: 1 },
      ],
    ];

    return patterns[index % patterns.length];
  };

  // Helper: Generate scaleX keyframes for stretching artifacts
  const getScaleXKeyframes = (index: number): Array<{ key: string; val: number; prog: number }> => {
    const scalePatterns = [
      [
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 0.95, prog: 0.5 },
        { key: 'scaleX', val: 1.05, prog: 0.75 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
      [
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1.1, prog: 0.4 },
        { key: 'scaleX', val: 0.98, prog: 0.7 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
      [
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1.03, prog: 0.3 },
        { key: 'scaleX', val: 0.97, prog: 0.6 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    ];

    return scalePatterns[index % scalePatterns.length];
  };

  // Helper: Choose easing type based on pattern
  const getEasingType = (index: number): 'spring' | 'linear' | 'ease-in-out' | 'ease-out' => {
    const easingTypes: Array<'spring' | 'linear' | 'ease-in-out' | 'ease-out'> = [
      'spring', 'spring', 'linear', 'spring', 'linear', 'spring', 'spring', 'ease-out'
    ];
    return easingTypes[index % easingTypes.length];
  };

  // Generate slices
  const slices: RenderableComponentData[] = [];
  
  for (let i = 0; i < sliceCount; i++) {
    const sliceHeight = 100 / sliceCount;
    const sliceTop = i * sliceHeight;
    const sliceDuration = duration * getSliceDurationMultiplier(i);
    const sliceId = `slice-${i}`;
    const imageId = `slice-${i}-image`;

    // Create slice container
    const sliceContainer: RenderableComponentData = {
      id: sliceId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-full',
          style: {
            top: `${sliceTop}%`,
            height: `${sliceHeight}%`,
            overflow: 'hidden',
            backfaceVisibility: 'hidden' as any,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: sliceDuration,
        },
      },
      childrenData: [
        {
          id: imageId,
          type: 'atom',
          componentId: media.type === 'video' ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: media.src,
            className: 'w-full h-auto',
            style: {
              objectFit: 'cover',
              objectPosition: `center ${sliceTop}%`,
              width: '100%',
              height: `${sliceCount * 100}%`,
              transform: `translateY(-${sliceTop}%)`,
              filter: 'contrast(300%) brightness(0.8) saturate(0.7)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: sliceDuration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Horizontal shear/lag effect
        {
          id: `effect-slice-${i}-horizontal`,
          componentId: 'generic',
          data: {
            type: getEasingType(i),
            start: 0,
            duration: sliceDuration,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: getTranslateXKeyframes(i),
          },
        },
        // Scale stretching artifacts
        {
          id: `effect-slice-${i}-scale`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: sliceDuration,
            mode: 'provider',
            targetIds: [sliceId],
            ranges: getScaleXKeyframes(i),
          },
        },
      ],
    };

    slices.push(sliceContainer);
  }

  // Create noise overlay using HTMLBlockAtom
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iLjA1Ii8+PC9zdmc+'); background-size: 200px 200px; mix-blend-mode: overlay;"></div>`,
      className: '',
      style: {},
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'effect-noise-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['noise-overlay'],
          ranges: [
            { key: 'opacity', val: 0.1 * noiseIntensity, prog: 0 },
            { key: 'opacity', val: 0.4 * noiseIntensity, prog: 0.25 },
            { key: 'opacity', val: 0.15 * noiseIntensity, prog: 0.5 },
            { key: 'opacity', val: 0.35 * noiseIntensity, prog: 0.75 },
            { key: 'opacity', val: 0.1 * noiseIntensity, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pixel-sort-glitch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backfaceVisibility: 'hidden' as any,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...slices, noiseOverlay] as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'pixel-sort-glitch-transition',
  title: 'Pixel Sorting Glitch Transition',
  description:
    'A pixel sorting glitch transition effect that slices images into horizontal bands moving at different speeds with elastic overshoot, freeze frames, digital noise overlays, color banding, and posterization effects simulating corrupted video codecs or severe packet loss.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'pixel-sort',
    'digital',
    'corrupted',
    'lcd',
    'codec',
    'packet-loss',
    'cyberpunk',
    'tech',
    'kinetic',
  ],
  defaultInputParams: {
    media: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      type: 'image',
    },
    duration: 1.5,
    sliceCount: 8,
    impact: 1,
    noiseIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const pixelSortGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
