/**
 * Triptych Split-Screen Wave Transition Preset
 *
 * This preset creates a three-panel split-screen layout with wave-like blur transitions.
 * The panels fade in/out with synchronized blur effects that roll across from left to right,
 * creating visual rhythm and guiding the eye. Each panel has independent brightness adjustments
 * during transitions for depth. Uses the rule of thirds for panel sizing (1/3 width each).
 *
 * Features:
 * - Three equal-width panels (rule of thirds) with white borders
 * - Staggered timing: Left panel starts at 0s, center at 0.2s, right at 0.4s
 * - Wave-like blur clearing: left clears first (0.25), center next (0.3), right last (0.35)
 * - Synchronized opacity: 0→1→0 fade in/out
 * - Brightness modulation: 0.7→1→0.7 for depth effect
 * - Blur effect: 15px→0px→15px rolling wave
 * - 4-second duration per image set with 1-second transition zones
 *
 * Use cases:
 * - Multi-camera angle presentations
 * - Before/after/during comparisons
 * - Triptych storytelling with visual rhythm
 * - Dynamic image galleries with staggered reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  leftImage: z.object({
    src: z.string().describe('Source URL for the left panel image'),
  }).describe('Image configuration for the left panel'),
  
  centerImage: z.object({
    src: z.string().describe('Source URL for the center panel image'),
  }).describe('Image configuration for the center panel'),
  
  rightImage: z.object({
    src: z.string().describe('Source URL for the right panel image'),
  }).describe('Image configuration for the right panel'),
  
  duration: z
    .number()
    .default(4)
    .describe('Duration in seconds for the full transition cycle (default: 4 seconds)'),
  
  trackName: z
    .string()
    .default('triptych-wave')
    .describe('Unique identifier for this triptych track (used for component IDs)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { leftImage, centerImage, rightImage, duration, trackName } = params;

  // Panel configuration with staggered timing and wave-like blur progression
  const panels = [
    {
      id: 'left',
      image: leftImage,
      relativeStart: 0,
      blurClearProgress: 0.25,
      borderClass: 'border-r border-white/20',
    },
    {
      id: 'center',
      image: centerImage,
      relativeStart: 0.2,
      blurClearProgress: 0.3,
      borderClass: 'border-r border-white/20',
    },
    {
      id: 'right',
      image: rightImage,
      relativeStart: 0.4,
      blurClearProgress: 0.35,
      borderClass: '',
    },
  ];

  // Create panel components with staggered effects
  const panelComponents: RenderableComponentData[] = panels.map((panel) => {
    const panelContainerId = `${trackName}-panel-${panel.id}-container`;
    const imageId = `${trackName}-image-${panel.id}`;

    return {
      id: panelContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `flex-1 relative overflow-hidden ${panel.borderClass}`,
        },
      },
      context: {
        timing: {
          start: panel.relativeStart,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: imageId,
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: panel.image.src,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [
            // Opacity effect: 0→1→0
            {
              id: `${imageId}-opacity-effect`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: [imageId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.25 },
                  { key: 'opacity', val: 1, prog: 0.75 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            // Blur effect: 15px→0px→15px (wave clears at staggered progress)
            {
              id: `${imageId}-blur-effect`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: [imageId],
                ranges: [
                  { key: 'blur', val: 15, prog: 0 },
                  { key: 'blur', val: 0, prog: panel.blurClearProgress },
                  { key: 'blur', val: 0, prog: 0.75 },
                  { key: 'blur', val: 15, prog: 1 },
                ],
              },
            },
            // Brightness effect: 0.7→1→0.7 (depth effect)
            {
              id: `${imageId}-brightness-effect`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: [imageId],
                ranges: [
                  { key: 'brightness', val: 0.7, prog: 0 },
                  { key: 'brightness', val: 1, prog: panel.blurClearProgress },
                  { key: 'brightness', val: 1, prog: 0.75 },
                  { key: 'brightness', val: 0.7, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Root container with flex layout for three equal panels
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: panelComponents,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'triptych-wave-split',
  title: 'Triptych Split-Screen Wave Preset',
  description:
    'Three-panel split-screen layout with wave-like blur transitions, offset timing, and independent brightness adjustments. Panels fade in/out with synchronized blur rolling left-to-right, creating visual rhythm using rule-of-thirds sizing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['triptych', 'split-screen', 'wave', 'transition', 'multi-panel', 'blur', 'image'],
  defaultInputParams: {
    leftImage: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
    },
    centerImage: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
    },
    rightImage: {
      src: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&h=600&fit=crop',
    },
    duration: 4,
    trackName: 'triptych-wave',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const triptychWaveSplitPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
