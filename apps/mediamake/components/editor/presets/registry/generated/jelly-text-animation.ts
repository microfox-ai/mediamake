/**
 * Jelly Text Animation Preset
 *
 * Creates a liquid-smooth elastic jelly-like title animation with squash-and-stretch
 * deformation physics. Features:
 * - Asymmetric scaling with separate scaleX/scaleY controls for realistic physics
 * - Initial vertical stretch (scaleY > scaleX) during scale-up
 * - Horizontal compression (scaleX > scaleY) during bounce-back
 * - SkewX animation for wobble effect
 * - RotateZ oscillation during settle phase
 * - Transform-origin: bottom center for grounded bounce feel
 * - Smooth cubic-bezier easing for organic motion
 * - 1.4-second animation with multiple bounce phases
 * - Bottom-anchored layout for realistic physics simulation
 *
 * Use cases:
 * - Eye-catching title reveals with realistic physics
 * - Product launch animations with elastic feel
 * - Brand intros with bouncy, energetic motion
 * - Social media content with engaging title animations
 * - Video editor-style mesh warp effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Zod schema for input parameters
const presetParams = z.object({
  text: z
    .string()
    .default('JELLY TEXT')
    .describe('The text content to display with jelly animation'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family (e.g., "Inter", "Roboto:700", "BebasNeue:600:italic")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.4)
    .describe('Total animation duration in seconds'),
  bottomPadding: z
    .number()
    .min(0)
    .max(200)
    .default(40)
    .describe('Bottom padding in pixels for anchoring'),
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .describe('Delay before animation starts (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 800; // Default bold weight
  }

  // IDs
  const rootContainerId = 'jelly-text-root';
  const textContainerId = 'jelly-text-container';
  const textAtomId = 'jelly-text-atom';

  // Animation timing breakdown (relative to text-container start)
  const totalDuration = params.duration;
  const stretchPhaseEnd = totalDuration * 0.3; // 0-30%: Initial stretch
  const impactPhaseEnd = totalDuration * 0.5; // 30-50%: Impact compression
  const bouncePhaseEnd = totalDuration * 0.8; // 50-80%: Bounce phases
  const settlePhaseEnd = totalDuration; // 80-100%: Wobble settle

  // Create jelly animation effect with all transform properties combined
  const jellyEffect: GenericEffectData = {
    type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
    start: 0,
    duration: totalDuration,
    mode: 'provider',
    targetIds: [textContainerId],
    ranges: [
      // Initial stretch phase (0-30%): scaleX: 0→0.8, scaleY: 0→1.4
      { key: 'scaleX', val: 0, prog: 0 },
      { key: 'scaleX', val: 0.8, prog: 0.3 },
      { key: 'scaleY', val: 0, prog: 0 },
      { key: 'scaleY', val: 1.4, prog: 0.3 },
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewX', val: 10, prog: 0.15 },
      { key: 'rotateZ', val: 0, prog: 0 },

      // Impact phase (30-50%): scaleX: 0.8→1.3, scaleY: 1.4→0.7
      { key: 'scaleX', val: 1.3, prog: 0.5 },
      { key: 'scaleY', val: 0.7, prog: 0.5 },
      { key: 'skewX', val: -5, prog: 0.4 },

      // First bounce (50-65%): scaleX: 1.3→0.95, scaleY: 0.7→1.1
      { key: 'scaleX', val: 0.95, prog: 0.65 },
      { key: 'scaleY', val: 1.1, prog: 0.65 },
      { key: 'skewX', val: 3, prog: 0.55 },
      { key: 'rotateZ', val: 3, prog: 0.6 },

      // Second bounce (65-80%): scaleX: 0.95→1.05, scaleY: 1.1→0.95
      { key: 'scaleX', val: 1.05, prog: 0.8 },
      { key: 'scaleY', val: 0.95, prog: 0.8 },
      { key: 'skewX', val: -2, prog: 0.72 },
      { key: 'rotateZ', val: -3, prog: 0.75 },

      // Settle phase (80-100%): scaleX/Y → 1, skew/rotate → 0
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1, prog: 1 },
      { key: 'skewX', val: 0, prog: 1 },
      { key: 'rotateZ', val: 0, prog: 1 },

      // Opacity fade-in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.15 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // Create text atom
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        fontWeight: fontStyle.fontWeight,
        fontStyle: fontStyle.fontStyle,
        textAlign: 'center',
        letterSpacing: '0.05em',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['800'],
        subsets: ['latin'],
        display: 'swap',
        preload: true,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Create text container with transform-origin: bottom center
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          transformOrigin: 'bottom center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'jelly-animation-effect',
        componentId: 'generic',
        data: jellyEffect,
      },
    ],
    childrenData: [textAtom],
  };

  // Create root container (bottom-anchored layout)
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex items-end justify-center h-full pb-${Math.round(params.bottomPadding / 4)}`,
        style: {},
      },
    },
    context: {
      timing: {
        start: params.startDelay,
        duration: totalDuration,
      },
    },
    childrenData: [textContainer],
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
  id: 'jelly-text-animation',
  title: 'Liquid Jelly Text Animation',
  description:
    'Elastic jelly-like title animation with squash-and-stretch deformation physics. Features asymmetric scaling (separate scaleX/scaleY), vertical stretch during scale-up, horizontal compression on bounce-back, rotateZ wobble during settle, and skewX for elastic feel. Bottom-anchored with transform-origin manipulation for grounded bounce effect using realistic physics simulation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'jelly',
    'elastic',
    'squash-stretch',
    'physics',
    'bounce',
    'title',
    'kinetic',
    'organic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'JELLY TEXT',
    fontSize: 72,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    duration: 1.4,
    bottomPadding: 40,
    startDelay: 0,
  },
};

export const jellyTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
