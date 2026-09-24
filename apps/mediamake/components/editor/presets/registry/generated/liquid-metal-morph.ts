/**
 * Liquid Metal Morph Text Preset
 *
 * This preset creates a stunning liquid metal effect where text morphs from impossibly 
 * tight compression (-0.6em letter-spacing) to normal spacing, mimicking liquid mercury 
 * finding its form. Features include:
 *
 * - Fluid metallic appearance with reflective gradient highlights
 * - Smooth letter-spacing expansion animation with custom cubic-bezier easing
 * - Moving reflective highlights that sweep across the text
 * - Subtle wave distortion with scaleY wobble for liquid-like motion
 * - Metallic 'ting' sound effect when text reaches final form
 * - Chrome-like filter effects (brightness, contrast)
 * - GPU-accelerated transforms for smooth performance
 *
 * Perfect for:
 * - Sci-fi title sequences
 * - Futuristic brand reveals
 * - Tech product launches
 * - Cyberpunk aesthetics
 * - Modern motion graphics
 *
 * The animation creates a mesmerizing liquid metal effect with physically-inspired motion.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('LIQUID METAL')
    .describe('Text content to display with liquid metal effect'),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(96)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "Orbitron")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  expansionDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2.5)
    .describe('Duration of letter-spacing expansion animation'),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional URL to metallic ting sound effect (plays at 95% completion)',
    ),
  audioVolume: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Volume of the metallic ting sound (0-1)'),
  gradientColors: z
    .object({
      start: z.string().default('#9CA3AF'),
      mid: z.string().default('#F3F4F6'),
      end: z.string().default('#9CA3AF'),
    })
    .optional()
    .describe(
      'Gradient colors for metallic effect (start, mid, end). Defaults to gray-400, gray-100, gray-400',
    ),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    duration,
    expansionDuration,
    audioSrc,
    audioVolume,
    gradientColors,
  } = params;

  // Calculate audio timing (95% through expansion animation)
  const audioStartTime = expansionDuration * 0.95;

  // Gradient colors with defaults
  const colors = gradientColors || {
    start: '#9CA3AF',
    mid: '#F3F4F6',
    end: '#9CA3AF',
  };

  // Base text layer with metallic gradient
  const baseTextLayer: RenderableComponentData = {
    id: 'liquid-metal-base-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'bg-gradient-to-r bg-clip-text text-transparent font-bold',
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        letterSpacing: '-0.6em',
        textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
        filter: 'brightness(1.2) contrast(1.1)',
        backgroundImage: `linear-gradient(90deg, ${colors.start}, ${colors.mid}, ${colors.end})`,
        backgroundSize: '200% 100%',
        backgroundPosition: '0% 50%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // Highlight overlay layer
  const highlightOverlayLayer: RenderableComponentData = {
    id: 'liquid-metal-highlight-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); mix-blend-mode: overlay; mask-image: linear-gradient(to right, transparent, black 20%, black 80%, transparent); pointer-events: none;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  // Audio atom (only if audioSrc is provided)
  const audioAtom: RenderableComponentData | null = audioSrc
    ? {
        id: 'liquid-metal-audio-ting',
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: audioSrc,
          volume: audioVolume,
        },
        context: {
          timing: {
            start: audioStartTime,
            duration: 0.5,
          },
        },
        effects: [],
      }
    : null;

  // Letter-spacing expansion effect
  const letterSpacingEffect = {
    id: 'liquid-metal-letter-spacing-effect',
    componentId: 'generic',
    data: {
      type: 'cubic-bezier' as const,
      easingValues: [0.45, 0.05, 0.55, 0.95],
      start: 0,
      duration: expansionDuration,
      mode: 'provider' as const,
      targetIds: ['liquid-metal-base-text'],
      ranges: [
        { key: 'letterSpacing', val: '-0.6em', prog: 0 },
        { key: 'letterSpacing', val: '0em', prog: 1 },
      ],
    },
  };

  // Background position (moving highlights) effect
  const backgroundPositionEffect = {
    id: 'liquid-metal-background-position-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: duration,
      mode: 'provider' as const,
      targetIds: ['liquid-metal-base-text'],
      ranges: [
        { key: 'backgroundPosition', val: '0% 50%', prog: 0 },
        { key: 'backgroundPosition', val: '100% 50%', prog: 1 },
      ],
    },
  };

  // Scale wobble effect (liquid wave distortion)
  const scaleWobbleEffect = {
    id: 'liquid-metal-scale-wobble-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: expansionDuration,
      mode: 'provider' as const,
      targetIds: ['liquid-metal-base-text'],
      ranges: [
        { key: 'scaleY', val: 0.98, prog: 0 },
        { key: 'scaleY', val: 1.02, prog: 0.3 },
        { key: 'scaleY', val: 0.98, prog: 0.5 },
        { key: 'scaleY', val: 1.02, prog: 0.7 },
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    },
  };

  // Opacity fade-in effect
  const opacityFadeInEffect = {
    id: 'liquid-metal-opacity-fade-in-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in' as const,
      start: 0,
      duration: 0.5,
      mode: 'provider' as const,
      targetIds: ['liquid-metal-base-text', 'liquid-metal-highlight-overlay'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Attach effects to base text layer
  baseTextLayer.effects = [
    letterSpacingEffect,
    backgroundPositionEffect,
    scaleWobbleEffect,
    opacityFadeInEffect,
  ];

  // Text stack container
  const textStackContainer: RenderableComponentData = {
    id: 'liquid-metal-text-stack',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      baseTextLayer,
      highlightOverlayLayer,
      ...(audioAtom ? [audioAtom] : []),
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textStackContainer] as RenderableComponentData[],
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
  id: 'liquid-metal-morph',
  title: 'Liquid Metal Morph Text',
  description:
    'Text morphs from impossibly tight compression (-0.6em letter-spacing) to normal spacing like liquid mercury finding its form. Features fluid metallic appearance with moving reflective highlights, subtle wave distortion during expansion, and a metallic "ting" sound when reaching final form. Perfect for sci-fi titles and futuristic brand reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'liquid',
    'metal',
    'morph',
    'sci-fi',
    'futuristic',
    'compression',
    'expansion',
    'mercury',
    'chrome',
    'reflective',
    'highlights',
    'wave',
    'distortion',
    'audio',
    'ting',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID METAL',
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: '700',
    duration: 3,
    expansionDuration: 2.5,
    audioVolume: 0.8,
    gradientColors: {
      start: '#9CA3AF',
      mid: '#F3F4F6',
      end: '#9CA3AF',
    },
  },
};

// Export preset
export const liquidMetalMorphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
