/**
 * Elegant Bloom Reveal Preset
 *
 * Premium text reveal animation where tightly kerned letters expand outward from center
 * like a blooming flower. Features synchronized blur-to-focus and subtle glow effects
 * that intensify as letters separate, creating a sophisticated, cinematic reveal suitable
 * for luxury brand titles and film credits.
 *
 * Features:
 * - Tight to loose letter spacing expansion (-0.25em to 0.02em)
 * - Synchronized blur-to-focus effect (2px to 0px)
 * - Intensifying glow effect (0px to 20px with opacity fade-in)
 * - Smooth ease-in-out animation for elegant, premium feel
 * - Customizable text, font, colors, and timing
 * - Performance optimized with will-change hints
 *
 * Use cases:
 * - Luxury brand title reveals
 * - Film opening/closing credits
 * - Premium product launches
 * - High-end event titles
 * - Sophisticated brand storytelling
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Parameter schema with detailed descriptions
const presetParams = z.object({
  text: z.string().describe('Text content to reveal with bloom effect'),
  
  // Font configuration
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Playfair Display:600", "Montserrat:700", "Cinzel")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels (24-200)'),
  
  color: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  
  // Timing configuration
  duration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .optional()
    .describe('Total animation duration in seconds (1-5)'),
  
  startTime: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time of the animation (seconds from video start)'),
  
  // Letter spacing animation
  initialLetterSpacing: z
    .string()
    .default('-0.25em')
    .optional()
    .describe('Initial tight letter spacing (e.g., "-0.25em", "-0.3em")'),
  
  finalLetterSpacing: z
    .string()
    .default('0.02em')
    .optional()
    .describe('Final loose letter spacing (e.g., "0.02em", "0.05em")'),
  
  // Blur effect
  initialBlur: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Initial blur amount in pixels (0-10)'),
  
  // Glow effect
  glowIntensity: z
    .number()
    .min(0)
    .max(40)
    .default(20)
    .optional()
    .describe('Maximum glow radius in pixels (0-40)'),
  
  glowColor: z
    .string()
    .default('rgba(255,255,255,0.5)')
    .optional()
    .describe('Glow color with opacity (e.g., "rgba(255,255,255,0.5)", "rgba(255,215,0,0.6)")'),
  
  // Background
  backgroundColor: z
    .string()
    .default('rgba(0,0,0,0)')
    .optional()
    .describe('Background color (transparent by default)'),
  
  // Position
  position: z
    .enum(['center', 'top', 'bottom', 'custom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
  
  customTop: z
    .string()
    .optional()
    .describe('Custom top position (only when position="custom", e.g., "30%", "200px")'),
  
  customLeft: z
    .string()
    .optional()
    .describe('Custom left position (only when position="custom", e.g., "50%", "100px")'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Playfair Display';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate position styles
  const getPositionStyles = (): React.CSSProperties => {
    switch (params.position) {
      case 'top':
        return { alignItems: 'flex-start', paddingTop: '10%' };
      case 'bottom':
        return { alignItems: 'flex-end', paddingBottom: '10%' };
      case 'custom':
        return {
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          paddingTop: params.customTop || '50%',
          paddingLeft: params.customLeft || '50%',
        };
      case 'center':
      default:
        return { alignItems: 'center', justifyContent: 'center' };
    }
  };

  // Component IDs
  const rootContainerId = 'elegant-bloom-root';
  const textAtomId = 'elegant-bloom-text';

  // Text atom data
  const textAtomData: TextAtomData = {
    text: params.text,
    style: {
      fontSize: params.fontSize ?? 72,
      color: params.color ?? '#FFFFFF',
      letterSpacing: params.initialLetterSpacing ?? '-0.25em',
      textAlign: 'center',
      willChange: 'filter, text-shadow, letter-spacing',
      ...fontStyle,
    },
    font: {
      family: fontFamily,
      ...(fontStyle.fontWeight
        ? { weights: [fontStyle.fontWeight.toString()] }
        : {}),
      subsets: ['latin'],
      display: 'swap',
      preload: true,
    },
  };

  // Letter spacing expansion effect
  const letterSpacingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration ?? 2.5,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      {
        key: 'letterSpacing',
        val: params.initialLetterSpacing ?? '-0.25em',
        prog: 0,
      },
      {
        key: 'letterSpacing',
        val: params.finalLetterSpacing ?? '0.02em',
        prog: 1,
      },
    ],
  };

  // Blur to focus effect
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration ?? 2.5,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      {
        key: 'filter',
        val: `blur(${params.initialBlur ?? 2}px)`,
        prog: 0,
      },
      {
        key: 'filter',
        val: 'blur(0px)',
        prog: 1,
      },
    ],
  };

  // Glow intensification effect
  const glowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration ?? 2.5,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      {
        key: 'textShadow',
        val: '0 0 0px rgba(255,255,255,0)',
        prog: 0,
      },
      {
        key: 'textShadow',
        val: `0 0 ${params.glowIntensity ?? 20}px ${params.glowColor ?? 'rgba(255,255,255,0.5)'}`,
        prog: 1,
      },
    ],
  };

  // Build text atom
  const textAtom = {
    id: textAtomId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration ?? 2.5,
      },
    },
    effects: [
      {
        id: 'bloom-letter-spacing-effect',
        componentId: 'generic',
        data: letterSpacingEffect,
      },
      {
        id: 'bloom-blur-to-focus-effect',
        componentId: 'generic',
        data: blurEffect,
      },
      {
        id: 'bloom-glow-effect',
        componentId: 'generic',
        data: glowEffect,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: rootContainerId,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex',
        style: {
          backgroundColor: params.backgroundColor ?? 'rgba(0,0,0,0)',
          overflow: 'hidden',
          ...getPositionStyles(),
        },
      },
    },
    context: {
      timing: {
        start: params.startTime ?? 0,
        duration: params.duration ?? 2.5,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'elegant-bloom-reveal',
  title: 'Elegant Bloom Reveal',
  description:
    'Premium text reveal animation where tightly kerned letters expand outward from center like a blooming flower. Features center-out wave expansion with synchronized blur-to-focus and subtle glow effects. Perfect for luxury brand titles and cinematic film credits with sophisticated, elegant animation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'bloom',
    'luxury',
    'elegant',
    'cinematic',
    'premium',
    'letter-spacing',
    'blur',
    'glow',
    'sophisticated',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    text: 'ELEGANCE',
    font: 'Playfair Display:600',
    fontSize: 72,
    color: '#FFFFFF',
    duration: 2.5,
    startTime: 0,
    initialLetterSpacing: '-0.25em',
    finalLetterSpacing: '0.02em',
    initialBlur: 2,
    glowIntensity: 20,
    glowColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0)',
    position: 'center',
  },
};

export const elegantBloomRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
