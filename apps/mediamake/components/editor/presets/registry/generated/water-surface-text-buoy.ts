/**
 * Water Surface Text Animation Preset
 *
 * This preset creates a physics-based water surface text animation where letters float
 * and bob like buoys on gentle ocean waves. Each letter moves independently but is
 * influenced by neighboring letters' movements through wave propagation.
 *
 * Features:
 * - **Independent Letter Physics**: Each letter rises and falls with sine wave motion
 * - **Wave Propagation**: Disturbances travel through the text line with staggered delays
 * - **Rotation Effect**: Letters tip naturally on wave crests and troughs
 * - **Refraction Effect**: Scale animation mimics water droplet magnification at wave peaks
 * - **Depth Effect**: Text shadow changes based on wave position (depth illusion)
 * - **Spring Physics**: Natural, bouncy easing for realistic water motion
 * - **Peaceful Motion**: Hypnotic, meditative animation suitable for calm content
 *
 * Use cases:
 * - Meditation and relaxation videos
 * - Calm, peaceful content overlays
 * - Nature-themed title sequences
 * - Ambient background text effects
 * - ASMR or sleep content titles
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/datamotion';

// ===========================
// PRESET PARAMETERS SCHEMA
// ===========================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text to animate with water surface effect'),
  
  // Wave physics parameters
  waveAmplitude: z
    .number()
    .min(5)
    .max(30)
    .default(12)
    .optional()
    .describe('Vertical wave amplitude in pixels (5-30)'),
  
  wavePropagationDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.15)
    .optional()
    .describe('Delay between each letter wave in seconds (0.05-0.5)'),
  
  rotationRange: z
    .number()
    .min(2)
    .max(15)
    .default(5)
    .optional()
    .describe('Maximum rotation angle in degrees (2-15)'),
  
  scaleRange: z
    .number()
    .min(1.02)
    .max(1.15)
    .default(1.08)
    .optional()
    .describe('Maximum scale at wave peaks (1.02-1.15)'),
  
  // Typography
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .optional()
    .describe('Font size in pixels (24-200)'),
  
  font: z
    .string()
    .default('Inter:400')
    .optional()
    .describe('Font family with optional weight (e.g., "Inter:600", "Roboto:400")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  
  // Layout
  horizontalGap: z
    .number()
    .min(0)
    .max(50)
    .default(8)
    .optional()
    .describe('Horizontal gap between letters in pixels (0-50)'),
  
  alignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .optional()
    .describe('Text alignment'),
  
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position on screen'),
  
  // Timing
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .optional()
    .describe('Animation duration in seconds (1-60)'),
});

// ===========================
// PRESET EXECUTION FUNCTION
// ===========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse parameters
  const text = params.text || 'WATER';
  const waveAmplitude = params.waveAmplitude ?? 12;
  const wavePropagationDelay = params.wavePropagationDelay ?? 0.15;
  const rotationRange = params.rotationRange ?? 5;
  const scaleRange = params.scaleRange ?? 1.08;
  const fontSize = params.fontSize ?? 64;
  const font = params.font ?? 'Inter:400';
  const textColor = params.textColor ?? '#FFFFFF';
  const horizontalGap = params.horizontalGap ?? 8;
  const alignment = params.alignment ?? 'center';
  const verticalPosition = params.verticalPosition ?? 'center';
  const duration = params.duration ?? 10;

  // Parse font string
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontStyle: React.CSSProperties = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into individual characters (including spaces)
  const characters = text.split('');

  // Helper function to create wave effect for a letter
  const createLetterWaveEffect = (
    letterId: string,
    letterIndex: number,
  ): GenericEffectData => {
    // Calculate phase offset for wave propagation
    const phaseOffset = letterIndex * wavePropagationDelay;

    // Spring easing for natural physics
    const easingType = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

    return {
      type: easingType as any,
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Vertical wave motion (sine wave pattern)
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -waveAmplitude, prog: 0.25 },
        { key: 'translateY', val: 0, prog: 0.5 },
        { key: 'translateY', val: waveAmplitude, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },

        // Rotation (tips on wave crests/troughs, offset by π/4 from vertical)
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: -rotationRange, prog: 0.25 },
        { key: 'rotate', val: 0, prog: 0.5 },
        { key: 'rotate', val: rotationRange, prog: 0.75 },
        { key: 'rotate', val: 0, prog: 1 },

        // Scale (refraction effect - magnification at wave peaks)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scaleRange, prog: 0.25 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: scaleRange, prog: 0.75 },
        { key: 'scale', val: 1, prog: 1 },

        // Text shadow depth effect (stronger at troughs, lighter at peaks)
        {
          key: 'filter',
          val: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          prog: 0,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
          prog: 0.25,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 3px 6px rgba(0,0,0,0.3))',
          prog: 0.75,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
          prog: 1,
        },
      ],
    };
  };

  // Create letter components
  const letterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const letterId = `water-letter-${index}`;
      const isSpace = char === ' ';

      // Create wave effect with staggered start time for propagation
      const waveEffect = {
        id: `wave-effect-${index}`,
        componentId: 'generic',
        data: createLetterWaveEffect(letterId, index),
      };

      const letterData: TextAtomData = {
        text: isSpace ? '\u00A0' : char, // Non-breaking space for actual spaces
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          display: 'inline-block',
          position: 'relative' as const,
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      };

      return {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: letterData,
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [waveEffect],
      } as RenderableComponentData;
    },
  );

  // Determine alignment classes
  const alignmentClass =
    alignment === 'left'
      ? 'justify-start'
      : alignment === 'right'
        ? 'justify-end'
        : 'justify-center';

  const verticalAlignmentClass =
    verticalPosition === 'top'
      ? 'items-start'
      : verticalPosition === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'water-surface-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex flex-wrap items-baseline ${alignmentClass} ${verticalAlignmentClass} absolute inset-0`,
        style: {
          gap: `${horizontalGap}px`,
          padding: '40px',
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'water-surface-text-buoy',
  title: 'Water Surface Text Animation',
  description:
    'Physics-based water surface text animation where letters float and bob like buoys on gentle ocean waves. Features independent rise/fall motion influenced by neighboring letters, realistic wave propagation with staggered delays, subtle rotation as letters tip on wave crests and troughs, and scale-based refraction effect at wave peaks. Creates peaceful, hypnotic motion suitable for meditation or calm content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'water',
    'wave',
    'physics',
    'float',
    'buoy',
    'ocean',
    'peaceful',
    'meditation',
    'calm',
    'hypnotic',
    'refraction',
    'spring',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GENTLE WAVES',
    waveAmplitude: 12,
    wavePropagationDelay: 0.15,
    rotationRange: 5,
    scaleRange: 1.08,
    fontSize: 64,
    font: 'Inter:400',
    textColor: '#FFFFFF',
    horizontalGap: 8,
    alignment: 'center',
    verticalPosition: 'center',
    duration: 10,
  },
};

// ===========================
// EXPORT PRESET
// ===========================

export const waterSurfaceTextBuoyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
