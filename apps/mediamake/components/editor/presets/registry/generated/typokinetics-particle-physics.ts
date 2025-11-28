/**
 * Typokinetics Particle Physics Text Preset
 *
 * This preset recreates the aesthetic of particle systems where each character appears to be
 * affected by physics forces - gravity, wind, and friction. Characters drift in from various
 * angles as if blown by wind, then settle with realistic deceleration. After landing, they
 * continue subtle swaying animations, creating living, breathing text that never quite becomes
 * completely static.
 *
 * Features:
 * - **Physics-based Entry**: Characters drift in from random offset positions with curved motion paths
 * - **Gravity Simulation**: Realistic acceleration and deceleration using bezier easing
 * - **Wind Effects**: Horizontal drift with organic noise-like movement patterns
 * - **Infinite Sway**: Continuous subtle oscillation after settling (±2px translate, ±1deg rotate)
 * - **Visual Polish**: Opacity fade-in and blur-to-focus effects during entry
 * - **Transform Optimization**: Uses transform-gpu for performance, transitions to relative positioning
 *
 * Use cases:
 * - Creating dynamic text intros with physics simulation
 * - Building organic, living typography that feels natural
 * - Adding subtle motion to text overlays for extended durations
 * - Compositing text over windy environments or nature scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ===========================
// PARAMETERS SCHEMA
// ===========================

const presetParams = z.object({
  text: z.string().describe('Text content to display with particle physics'),
  
  duration: z
    .number()
    .min(2)
    .default(10)
    .describe('Total duration in seconds (minimum 2s for entry + sway)'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  
  color: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  
  entryDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of the entry animation in seconds'),
  
  gravity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Gravity strength multiplier (affects fall speed and curve)'),
  
  windStrength: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Wind effect strength (horizontal drift during entry)'),
  
  swayIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe('Intensity of the infinite sway animation after landing'),
  
  swayPeriod: z
    .number()
    .min(2)
    .max(6)
    .default(3.5)
    .describe('Period of the sway oscillation in seconds'),
  
  enableBlur: z
    .boolean()
    .default(true)
    .describe('Enable blur-to-focus effect during entry'),
  
  randomSeed: z
    .number()
    .optional()
    .describe('Random seed for deterministic positioning (optional)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ===========================
// PRESET EXECUTION
// ===========================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
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

  // Seeded random number generator
  const seedRandom = (seed: number) => {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  };

  const random =
    params.randomSeed !== undefined
      ? seedRandom(params.randomSeed)
      : Math.random;

  // Split text into characters
  const characters = params.text.split('');

  // Create character components with physics effects
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;
      const wrapperId = `char-wrapper-${index}`;

      // Random offset positions for entry
      const startX = random() * 100 - 50; // -50 to 50px
      const startY = random() * 40 + 30; // 30 to 70px (negative, from top)

      // Wind drift (horizontal movement during fall)
      const windDrift = (random() * 2 - 1) * params.windStrength * 20; // -20 to 20px scaled

      // Sway phase offset (different per character for organic motion)
      const swayPhaseOffset = random() * Math.PI * 2;

      // Entry animation: curved motion with gravity
      const entryEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: params.entryDuration,
        mode: 'provider',
        targetIds: [wrapperId],
        ranges: [
          // Vertical motion (gravity acceleration - starts fast, decelerates)
          { key: 'translateY', val: -startY, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          // Horizontal motion (wind drift with slight curve)
          { key: 'translateX', val: startX + windDrift, prog: 0 },
          { key: 'translateX', val: windDrift * 0.3, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          // Opacity fade-in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      };

      // Optional blur effect
      const blurEffect: GenericEffectData | null = params.enableBlur
        ? {
            type: 'ease-out',
            start: 0,
            duration: params.entryDuration * 0.6,
            mode: 'provider',
            targetIds: [wrapperId],
            ranges: [
              { key: 'filter', val: 'blur(4px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          }
        : null;

      // Infinite sway animation (starts after entry completes)
      const swayDuration = params.duration - params.entryDuration;
      const swayEffect: GenericEffectData = {
        type: 'linear',
        start: params.entryDuration,
        duration: swayDuration > 0 ? swayDuration : params.swayPeriod,
        mode: 'provider',
        targetIds: [wrapperId],
        ranges: [
          // Oscillating translateX
          {
            key: 'translateX',
            val: Math.sin(swayPhaseOffset) * 2 * params.swayIntensity,
            prog: 0,
          },
          {
            key: 'translateX',
            val:
              Math.sin(swayPhaseOffset + Math.PI) * 2 * params.swayIntensity,
            prog: 0.25,
          },
          {
            key: 'translateX',
            val: Math.sin(swayPhaseOffset) * 2 * params.swayIntensity,
            prog: 0.5,
          },
          {
            key: 'translateX',
            val:
              Math.sin(swayPhaseOffset + Math.PI) * 2 * params.swayIntensity,
            prog: 0.75,
          },
          {
            key: 'translateX',
            val: Math.sin(swayPhaseOffset) * 2 * params.swayIntensity,
            prog: 1,
          },
          // Oscillating rotate
          {
            key: 'rotate',
            val: Math.sin(swayPhaseOffset + Math.PI / 4) * params.swayIntensity,
            prog: 0,
          },
          {
            key: 'rotate',
            val:
              Math.sin(swayPhaseOffset + (Math.PI * 5) / 4) *
              params.swayIntensity,
            prog: 0.25,
          },
          {
            key: 'rotate',
            val: Math.sin(swayPhaseOffset + Math.PI / 4) * params.swayIntensity,
            prog: 0.5,
          },
          {
            key: 'rotate',
            val:
              Math.sin(swayPhaseOffset + (Math.PI * 5) / 4) *
              params.swayIntensity,
            prog: 0.75,
          },
          {
            key: 'rotate',
            val: Math.sin(swayPhaseOffset + Math.PI / 4) * params.swayIntensity,
            prog: 1,
          },
        ],
      };

      // Assemble effects
      const effects = [
        {
          id: `entry-effect-${index}`,
          componentId: 'generic',
          data: entryEffect,
        },
      ];

      if (blurEffect) {
        effects.push({
          id: `blur-effect-${index}`,
          componentId: 'generic',
          data: blurEffect,
        });
      }

      effects.push({
        id: `sway-effect-${index}`,
        componentId: 'generic',
        data: swayEffect,
      });

      // Character wrapper (BaseLayout)
      const charWrapper: RenderableComponentData = {
        id: wrapperId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute transform-gpu',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects,
        childrenData: [
          {
            id: charId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
              style: {
                fontSize: params.fontSize,
                fontWeight: params.fontWeight,
                color: params.color,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
          } as RenderableComponentData,
        ],
      };

      return charWrapper;
    },
  );

  // Container holding all character wrappers
  const characterContainer: RenderableComponentData = {
    id: 'particle-character-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: characterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-particle-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [characterContainer],
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-particle-physics',
  title: 'Typokinetics Particle Physics Text',
  description:
    'Advanced typokinetics preset where each character behaves as a physics particle affected by gravity, wind, and friction. Characters drift in from random angles with curved motion paths, settle with realistic deceleration, then continue subtle infinite swaying animations as if still affected by air currents. Creates living, breathing text with motion blur and opacity fade-in effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'particle',
    'physics',
    'gravity',
    'wind',
    'animation',
    'text',
    'dynamic',
    'motion',
    'sway',
  ],
  defaultInputParams: {
    text: 'PARTICLE TEXT',
    duration: 10,
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
    font: 'Inter:700',
    entryDuration: 1.5,
    gravity: 1,
    windStrength: 0.5,
    swayIntensity: 1,
    swayPeriod: 3.5,
    enableBlur: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ===========================
// PRESET EXPORT
// ===========================

export const typokineticsParticlePhysicsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
