/**
 * Perspective Flutter Text Effect Preset
 *
 * Creates a realistic flutter effect where text appears to be printed on fabric or paper
 * caught in wind. Features wave and ripple animations with cloth physics, organic movement
 * with staggered character phases, and subtle perspective changes as the material tilts
 * toward and away from the viewer.
 *
 * Features:
 * - **Realistic Cloth Physics**: Multiple overlapping transform animations simulating fabric motion
 * - **Wave and Ripple Effects**: rotateX and rotateY with sine wave patterns for organic movement
 * - **Staggered Character Animation**: Phase-shifted waves creating sequential flutter effect
 * - **Depth Perception**: translateZ movement synchronized with rotation peaks
 * - **Fabric Stretch Effect**: skewX animation simulating material tension
 * - **Motion Blur**: Dynamic blur that increases at wave peaks for enhanced realism
 * - **3D Perspective**: perspective container for dimensional effect
 *
 * Use cases:
 * - Creating banner/flag flutter effects for titles
 * - Simulating text on fabric or paper in wind
 * - Adding organic motion to static typography
 * - Building dynamic intro/outro sequences with realistic physics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('FLUTTERING')
    .describe('Text to display with flutter effect'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .describe('Font size in pixels'),
  textColor: z.string().default('#1a1a1a').describe('Text color'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Duration of the effect in seconds'),
  waveSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed of wave animation (lower = slower)'),
  waveIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for wave effects'),
  staggerDelay: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Delay between character animations in seconds'),
  perspectiveDistance: z
    .number()
    .min(500)
    .max(3000)
    .default(1200)
    .describe('3D perspective distance in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font,
    fontSize,
    textColor,
    duration,
    waveSpeed,
    waveIntensity,
    staggerDelay,
    perspectiveDistance,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:700';
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

  // Split text into characters
  const characters = text.split('');

  // Wave animation parameters
  const rotateXRange = 5 * waveIntensity; // -5deg to 5deg
  const rotateYRange = 8 * waveIntensity; // -8deg to 8deg
  const skewXRange = 3 * waveIntensity; // subtle skew
  const translateZRange = 20 * waveIntensity; // subtle depth
  const blurRange = 2 * waveIntensity; // 0-2px blur

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;
      const phaseDelay = index * staggerDelay;

      // Calculate effect durations based on wave speed
      const waveDuration = duration / waveSpeed;

      // Create rotateX effect (vertical tilt)
      const rotateXEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: phaseDelay,
        duration: waveDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'rotateX', val: 0, prog: 0 },
          { key: 'rotateX', val: rotateXRange, prog: 0.25 },
          { key: 'rotateX', val: 0, prog: 0.5 },
          { key: 'rotateX', val: -rotateXRange, prog: 0.75 },
          { key: 'rotateX', val: 0, prog: 1 },
        ],
      };

      // Create rotateY effect (horizontal tilt, offset phase)
      const rotateYEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: phaseDelay + waveDuration * 0.125, // Offset phase
        duration: waveDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: -rotateYRange, prog: 0.25 },
          { key: 'rotateY', val: 0, prog: 0.5 },
          { key: 'rotateY', val: rotateYRange, prog: 0.75 },
          { key: 'rotateY', val: 0, prog: 1 },
        ],
      };

      // Create skewX effect (fabric stretch)
      const skewXEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: phaseDelay + waveDuration * 0.25,
        duration: waveDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'skewX', val: 0, prog: 0 },
          { key: 'skewX', val: skewXRange, prog: 0.25 },
          { key: 'skewX', val: 0, prog: 0.5 },
          { key: 'skewX', val: -skewXRange, prog: 0.75 },
          { key: 'skewX', val: 0, prog: 1 },
        ],
      };

      // Create translateZ effect (depth movement)
      const translateZEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: phaseDelay,
        duration: waveDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'translateZ', val: 0, prog: 0 },
          { key: 'translateZ', val: translateZRange, prog: 0.25 },
          { key: 'translateZ', val: 0, prog: 0.5 },
          { key: 'translateZ', val: -translateZRange, prog: 0.75 },
          { key: 'translateZ', val: 0, prog: 1 },
        ],
      };

      // Create blur effect (motion blur at peaks)
      const blurEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: phaseDelay,
        duration: waveDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'filter', val: 'blur(0px)', prog: 0 },
          { key: 'filter', val: `blur(${blurRange}px)`, prog: 0.25 },
          { key: 'filter', val: 'blur(0px)', prog: 0.5 },
          { key: 'filter', val: `blur(${blurRange}px)`, prog: 0.75 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      };

      // Combine all effects
      const charEffects = [
        {
          id: `rotateX-${charId}`,
          componentId: 'generic',
          data: rotateXEffect,
        },
        {
          id: `rotateY-${charId}`,
          componentId: 'generic',
          data: rotateYEffect,
        },
        {
          id: `skewX-${charId}`,
          componentId: 'generic',
          data: skewXEffect,
        },
        {
          id: `translateZ-${charId}`,
          componentId: 'generic',
          data: translateZEffect,
        },
        {
          id: `blur-${charId}`,
          componentId: 'generic',
          data: blurEffect,
        },
      ];

      // Create character TextAtom
      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            ...fontStyle,
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            display: 'inline-block',
            transformStyle: 'preserve-3d',
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : { weights: ['700'] }),
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: charEffects,
      } as RenderableComponentData;
    },
  );

  // Create text wrapper (flex container for characters)
  const textWrapper: RenderableComponentData = {
    id: 'flutter-text-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center',
        style: {
          gap: '0px',
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
    childrenData: characterComponents,
  } as RenderableComponentData;

  // Create root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'flutter-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${perspectiveDistance}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textWrapper],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'PerspectiveFlutterText',
  title: 'Perspective Flutter Text Effect',
  description:
    'Creates a realistic flutter effect where text appears to be printed on fabric or paper caught in wind. Features wave and ripple animations with cloth physics, organic movement with staggered character phases, and subtle perspective changes as the material tilts toward and away from the viewer. Includes depth blur at wave peaks and fabric stretch effects for enhanced realism.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'animation',
    'flutter',
    'wave',
    'cloth',
    'fabric',
    'physics',
    '3d',
    'perspective',
    'ripple',
    'organic',
    'wind',
    'banner',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'FLUTTERING',
    font: 'Inter:700',
    fontSize: 96,
    textColor: '#1a1a1a',
    duration: 10,
    waveSpeed: 2,
    waveIntensity: 1,
    staggerDelay: 0.05,
    perspectiveDistance: 1200,
  },
};

// Export preset
export const PerspectiveFlutterTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
