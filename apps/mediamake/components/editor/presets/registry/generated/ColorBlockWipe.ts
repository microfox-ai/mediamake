/**
 * ColorBlockWipe Internal Effect Preset
 *
 * Creates a solid color block wipe transition effect that slides across content.
 * The block starts off-screen, wipes across covering content at midpoint, then exits.
 * Supports directional wipes (left/right/up/down) with customizable color, duration, and easing.
 * Optional reveal mode fades content in as the block passes.
 *
 * Features:
 * - Configurable direction: left, right, up, down
 * - Customizable block color (hex string)
 * - Adjustable duration and easing
 * - Optional reveal mode for content fade-in effect
 * - GPU-accelerated transform animations
 *
 * Use cases:
 * - Video editing wipe transitions
 * - Scene transitions with solid color blocks
 * - Content reveal animations
 * - Dynamic transition effects between sections
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

// Input parameter schema
const presetParams = z.object({
  direction: z
    .enum(['left', 'right', 'up', 'down'])
    .describe('Direction of the wipe transition'),
  blockColor: z.string().describe('Hex color of the wipe block (e.g., #FF0000)'),
  duration: z.number().optional().describe('Duration of the wipe transition in milliseconds (default: 1000)'),
  targetIds: z.array(z.string()).describe('Array of component IDs to apply the effect to'),
  reveal: z.boolean().optional().describe('Enable reveal mode where content fades in as block passes (default: false)'),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .optional()
    .describe('Easing function for the animation (default: ease-in-out)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const direction = params.direction;
  const blockColor = params.blockColor;
  const durationMs = params.duration ?? 1000;
  const durationSec = durationMs / 1000;
  const targetIds = params.targetIds;
  const revealMode = params.reveal ?? false;
  const easingType = params.easing ?? 'ease-in-out';

  // Determine transform property and values based on direction
  const getTransformConfig = (dir: string) => {
    switch (dir) {
      case 'left':
        return {
          transformKey: 'translateX',
          startValue: '100%',
          midValue: '0%',
          endValue: '-100%',
        };
      case 'right':
        return {
          transformKey: 'translateX',
          startValue: '-100%',
          midValue: '0%',
          endValue: '100%',
        };
      case 'up':
        return {
          transformKey: 'translateY',
          startValue: '100%',
          midValue: '0%',
          endValue: '-100%',
        };
      case 'down':
        return {
          transformKey: 'translateY',
          startValue: '-100%',
          midValue: '0%',
          endValue: '100%',
        };
      default:
        return {
          transformKey: 'translateX',
          startValue: '100%',
          midValue: '0%',
          endValue: '-100%',
        };
    }
  };

  const transformConfig = getTransformConfig(direction);

  // Create block wipe effect with AnimationRange
  const blockWipeEffectData: GenericEffectData = {
    type: easingType,
    start: 0,
    duration: durationSec,
    mode: 'provider',
    targetIds: ['color-block-wipe-overlay'],
    ranges: [
      { key: transformConfig.transformKey, val: transformConfig.startValue, prog: 0 },
      { key: transformConfig.transformKey, val: transformConfig.midValue, prog: 0.5 },
      { key: transformConfig.transformKey, val: transformConfig.endValue, prog: 1 },
    ],
  };

  const blockWipeEffect = {
    id: 'color-block-wipe-effect',
    componentId: 'generic',
    data: blockWipeEffectData,
  };

  // Create optional reveal effect for target content
  const revealEffect = revealMode
    ? {
        id: 'color-block-reveal-effect',
        componentId: 'generic',
        data: {
          type: easingType,
          start: 0,
          duration: durationSec,
          mode: 'provider',
          targetIds: targetIds,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      }
    : null;

  // Create the color block overlay element
  const colorBlockOverlay: RenderableComponentData = {
    id: 'color-block-wipe-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-color: ${blockColor};"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationSec,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'color-block-wipe-container',
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
        duration: durationSec,
      },
    },
    effects: [blockWipeEffect],
    childrenData: [colorBlockOverlay],
  };

  // Prepare effects array for extraction
  const effectsArray = revealEffect ? [blockWipeEffect, revealEffect] : [blockWipeEffect];

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: effectsArray,
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'ColorBlockWipe',
  title: 'Color Block Wipe Effect',
  description:
    'Internal effect preset that creates a solid color block wipe transition. Block slides from configurable direction with customizable color, duration, and easing. Optional reveal mode fades content in as block passes.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'transition', 'wipe', 'block', 'color', 'reveal'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    direction: 'left',
    blockColor: '#000000',
    duration: 1000,
    targetIds: ['example-component'],
    reveal: false,
    easing: 'ease-in-out',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const ColorBlockWipePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
