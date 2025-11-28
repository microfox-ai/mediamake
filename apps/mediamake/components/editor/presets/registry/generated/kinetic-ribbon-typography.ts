/**
 * Kinetic Ribbon Typography Preset
 *
 * A 3D kinetic typography preset where text forms from flowing metallic ribbons
 * that weave and twist through space before settling into readable letters.
 * Features brushed metal texture with dynamic highlights, spring physics with
 * overshoot bounce, ribbon overlap via z-index staggering, and dimensional depth
 * through shadows and 3D transforms.
 *
 * Each letter animates with rotateY, rotateZ, translateZ, and scale from an initial
 * twisted ribbon state to final readable position using spring easing (cubic-bezier
 * 0.68, -0.55, 0.265, 1.55).
 *
 * Features:
 * - **3D Ribbon Formation**: Letters form from twisted metallic ribbons in 3D space
 * - **Spring Physics**: Overshoot bounce effect (5% scale, 10deg rotation)
 * - **Brushed Metal Texture**: Multiple gradients for realistic metallic appearance
 * - **Dimensional Depth**: Box shadows, text shadows, and 3D transforms
 * - **Ribbon Overlap**: Z-index staggering with translateZ variations
 * - **Staggered Animation**: 0.1s delay per letter for cascading effect
 *
 * Use cases:
 * - Creating dramatic title reveals with 3D depth
 * - Building kinetic typography effects with metallic aesthetics
 * - Adding premium feel to brand videos
 * - Creating engaging animated logos or headers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to display with ribbon effect'),
  fontSize: z
    .number()
    .default(120)
    .optional()
    .describe('Font size in pixels (default: 120)'),
  letterSpacing: z
    .number()
    .default(0.05)
    .optional()
    .describe('Letter spacing in em units (default: 0.05)'),
  duration: z
    .number()
    .default(10)
    .optional()
    .describe('Total duration of the composition in seconds'),
  animationDuration: z
    .number()
    .default(1.2)
    .optional()
    .describe('Duration of each letter animation in seconds (default: 1.2)'),
  staggerDelay: z
    .number()
    .default(0.1)
    .optional()
    .describe('Delay between each letter animation in seconds (default: 0.1)'),
  metalColor: z
    .object({
      primary: z.string().default('#c0c0c0').optional(),
      highlight: z.string().default('#ffffff').optional(),
      shadow: z.string().default('#a0a0a0').optional(),
    })
    .default({})
    .optional()
    .describe('Metal gradient colors (primary, highlight, shadow)'),
  overshootScale: z
    .number()
    .default(1.05)
    .optional()
    .describe('Scale overshoot multiplier (default: 1.05 for 5% overshoot)'),
  overshootRotation: z
    .number()
    .default(10)
    .optional()
    .describe(
      'Rotation overshoot in degrees (default: 10deg before settling)',
    ),
  zIndexVariation: z
    .number()
    .default(10)
    .optional()
    .describe('Z-index range for letter stacking (default: 10)'),
  translateZVariation: z
    .number()
    .default(5)
    .optional()
    .describe('translateZ variation range in pixels (default: 5)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize = 120,
    letterSpacing = 0.05,
    duration = 10,
    animationDuration = 1.2,
    staggerDelay = 0.1,
    metalColor = {},
    overshootScale = 1.05,
    overshootRotation = 10,
    zIndexVariation = 10,
    translateZVariation = 5,
  } = params;

  // Metal color defaults
  const metalPrimary = metalColor.primary || '#c0c0c0';
  const metalHighlight = metalColor.highlight || '#ffffff';
  const metalShadow = metalColor.shadow || '#a0a0a0';

  // Split text into letters
  const letters = text.split('');

  // Create letter components with effects
  const letterComponents = letters.map((letter, index) => {
    const letterId = `ribbon-letter-${index}`;
    const letterWrapperId = `ribbon-letter-wrapper-${index}`;

    // Calculate z-index and translateZ for depth variation
    const zIndex = zIndexVariation - Math.floor((index / letters.length) * zIndexVariation);
    const translateZ = Math.sin(index * 0.5) * translateZVariation;

    // Create ribbon formation effect for each letter
    const ribbonEffect: GenericEffectData = {
      type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Spring easing
      start: index * staggerDelay,
      duration: animationDuration,
      mode: 'provider',
      targetIds: [letterWrapperId],
      ranges: [
        // Opacity fade-in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },

        // RotateY animation (90deg → -5deg overshoot → 0deg)
        { key: 'rotateY', val: 90, prog: 0 },
        { key: 'rotateY', val: -overshootRotation / 2, prog: 0.85 },
        { key: 'rotateY', val: 0, prog: 1 },

        // RotateZ animation (360deg → -10deg overshoot → 0deg)
        { key: 'rotateZ', val: 360, prog: 0 },
        { key: 'rotateZ', val: -overshootRotation, prog: 0.85 },
        { key: 'rotateZ', val: 0, prog: 1 },

        // TranslateZ animation (100px → -5px overshoot → 0px)
        { key: 'translateZ', val: 100, prog: 0 },
        { key: 'translateZ', val: -5, prog: 0.85 },
        { key: 'translateZ', val: 0, prog: 1 },

        // Scale animation (0.5 → overshoot → 1)
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: overshootScale, prog: 0.85 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    // Text atom with metallic styling
    const textAtom: RenderableComponentData = {
      id: letterId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          color: 'transparent',
          backgroundImage: `linear-gradient(135deg, ${metalPrimary} 0%, ${metalHighlight} 25%, ${metalShadow} 50%, ${metalHighlight} 75%, ${metalPrimary} 100%), radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.8) 0%, transparent 50%)`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          textShadow: `2px 2px 4px rgba(0,0,0,0.3), -1px -1px 2px rgba(255,255,255,0.2)`,
        },
        font: {
          family: 'Bodoni Moda',
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    };

    // Wrapper for each letter with 3D transform context
    const letterWrapper: RenderableComponentData = {
      id: letterWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative transform-gpu',
          style: {
            transformStyle: 'preserve-3d',
            zIndex: zIndex,
            transform: `translateZ(${translateZ}px)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `ribbon-effect-${index}`,
          componentId: 'generic',
          data: ribbonEffect,
        },
      ],
      childrenData: [textAtom],
    };

    return letterWrapper;
  }) as RenderableComponentData[];

  // Letter container with flex layout
  const letterContainer: RenderableComponentData = {
    id: 'ribbon-letter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          gap: `${letterSpacing}em`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: letterComponents,
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'ribbon-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          perspective: '1000px',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [letterContainer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'kineticRibbonTypography',
  title: 'Kinetic Ribbon Typography',
  description:
    'A 3D kinetic typography preset where text forms from flowing metallic ribbons that weave and twist through space before settling into readable letters. Features brushed metal texture with dynamic highlights, spring physics with overshoot bounce, ribbon overlap via z-index staggering, and dimensional depth through shadows and 3D transforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'ribbon',
    'metallic',
    'spring',
    'physics',
    'depth',
    'transform',
    'gradient',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RIBBON',
    fontSize: 120,
    letterSpacing: 0.05,
    duration: 10,
    animationDuration: 1.2,
    staggerDelay: 0.1,
    metalColor: {
      primary: '#c0c0c0',
      highlight: '#ffffff',
      shadow: '#a0a0a0',
    },
    overshootScale: 1.05,
    overshootRotation: 10,
    zIndexVariation: 10,
    translateZVariation: 5,
  },
};

export const kineticRibbonTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
