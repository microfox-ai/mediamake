/**
 * Ghost Trail Typokinetics Preset
 *
 * An ethereal typokinetic preset where drifting text leaves behind fading echoes of itself,
 * mimicking a long exposure photograph effect. The main text drifts horizontally while leaving
 * a trail of progressively fading copies behind it, creating a motion blur effect achieved
 * through layering rather than actual blur.
 *
 * Features:
 * - **Onion Skinning Effect**: Previous frames faintly visible like traditional animation
 * - **Staggered Ghost Trail**: 4-5 ghost copies with decreasing opacity (0.6, 0.4, 0.2, 0.1)
 * - **Depth Perception**: Slight scale reduction for ghosts (0.98, 0.96, 0.94, 0.92)
 * - **Luminous Overlay**: mix-blend-mode: screen for ethereal glow
 * - **Delicate Typography**: Ultra-thin Cormorant Garamond 200 weight
 * - **Horizontal Drift**: Primary text moves from 40px to -40px with staggered ghost following
 *
 * Use cases:
 * - Ethereal title sequences
 * - Dreamlike text reveals
 * - Atmospheric motion typography
 * - Elegant long-exposure text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('ETHEREAL')
    .describe('The text content to display with ghost trail effect'),

  fontSize: z
    .number()
    .min(20)
    .max(500)
    .default(120)
    .describe('Font size in pixels for the text'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text (hex or CSS color)'),

  duration: z
    .number()
    .min(2)
    .max(30)
    .default(10)
    .describe('Total duration of the effect in seconds'),

  driftDistance: z
    .number()
    .min(10)
    .max(200)
    .default(40)
    .describe(
      'Horizontal drift distance in pixels (text moves from +distance to -distance)',
    ),

  ghostCount: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Number of ghost trail copies (2-8 recommended)'),

  ghostDelay: z
    .number()
    .min(0.05)
    .max(1)
    .default(0.2)
    .describe(
      'Delay between each ghost in seconds (smaller = tighter trail, larger = spread out)',
    ),

  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (dark backgrounds work best with screen blend mode)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    text,
    fontSize,
    textColor,
    duration,
    driftDistance,
    ghostCount,
    ghostDelay,
    backgroundColor,
  } = params;

  // Helper: Calculate opacity for each ghost based on index
  const calculateGhostOpacity = (index: number, total: number): number => {
    // First ghost: 0.6, gradually decrease to 0.1 for last ghost
    const opacityRange = 0.6 - 0.1;
    const step = opacityRange / (total - 1);
    return 0.6 - step * index;
  };

  // Helper: Calculate scale for each ghost based on index
  const calculateGhostScale = (index: number, total: number): number => {
    // First ghost: 0.98, gradually decrease to 0.92 for last ghost
    const scaleRange = 0.98 - 0.92;
    const step = scaleRange / (total - 1);
    return 0.98 - step * index;
  };

  // Helper: Create translateX effect for horizontal drift
  const createDriftEffect = (
    targetId: string,
    delayOffset: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: delayOffset,
      duration: duration - delayOffset,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: driftDistance, prog: 0 },
        { key: 'translateX', val: -driftDistance, prog: 1 },
      ],
    };
  };

  // Build text atoms (primary + ghosts)
  const textAtoms: RenderableComponentData[] = [];

  // Primary text (z-10, full opacity, normal scale)
  const primaryId = 'ghost-trail-primary';
  textAtoms.push({
    id: primaryId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: '200',
        mixBlendMode: 'screen',
      },
      font: {
        family: 'Cormorant Garamond',
        weights: ['200'],
        subsets: ['latin'],
        display: 'swap',
      },
      className: 'absolute inset-0 flex items-center justify-center',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${primaryId}-drift`,
        componentId: 'generic',
        data: createDriftEffect(primaryId, 0),
      },
    ],
  } as RenderableComponentData);

  // Ghost trail texts
  for (let i = 0; i < ghostCount; i++) {
    const ghostId = `ghost-trail-ghost-${i + 1}`;
    const ghostOpacity = calculateGhostOpacity(i, ghostCount);
    const ghostScale = calculateGhostScale(i, ghostCount);
    const delayOffset = (i + 1) * ghostDelay;

    textAtoms.push({
      id: ghostId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: '200',
          opacity: ghostOpacity,
          transform: `scale(${ghostScale})`,
          mixBlendMode: 'screen',
        },
        font: {
          family: 'Cormorant Garamond',
          weights: ['200'],
          subsets: ['latin'],
          display: 'swap',
        },
        className: 'absolute inset-0 flex items-center justify-center',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${ghostId}-drift`,
          componentId: 'generic',
          data: createDriftEffect(ghostId, delayOffset),
        },
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ghost-trail-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textAtoms,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
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
  id: 'ghostTrailTypokinetics',
  title: 'Ghost Trail Typokinetics',
  description:
    'An ethereal typokinetic preset where drifting text leaves behind fading echoes of itself, mimicking a long exposure photograph effect. Uses layered TextAtoms with decreasing opacity and slight scale reduction to create a motion blur through stacking. The thin Cormorant Garamond 200 weight becomes even more delicate in ghost forms, with mix-blend-mode screen creating luminous overlay effects. Perfect for dreamlike, ethereal title sequences and atmospheric text reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'ghost-trail',
    'long-exposure',
    'motion-blur',
    'ethereal',
    'dreamlike',
    'onion-skinning',
    'staggered-animation',
    'elegant',
    'atmospheric',
    'text-effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ETHEREAL',
    fontSize: 120,
    textColor: '#ffffff',
    duration: 10,
    driftDistance: 40,
    ghostCount: 4,
    ghostDelay: 0.2,
    backgroundColor: '#000000',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const ghostTrailTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
