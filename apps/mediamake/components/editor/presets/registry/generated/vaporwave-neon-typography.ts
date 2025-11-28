/**
 * Vaporwave Neon Typography Preset
 * 
 * Creates a kinetic typography effect with neon-lit floating words inspired by vaporwave aesthetics.
 * Words materialize with a flickering neon tube effect, then gently bob as if suspended in digital water.
 * Features multi-layered neon glow (pink and cyan), perspective transforms for depth, and occasional
 * power surges where the glow intensifies dramatically.
 * 
 * Technical Features:
 * - Flickering neon tube effect: Words fade in with inconsistent brightness steps (0→0.3→1)
 * - Floating animation: Continuous sine wave translateY (±10px amplitude)
 * - 3D depth: rotateX oscillation (-5 to 5 degrees) for perspective
 * - Neon glow system: Multi-layer text-shadow in pink (#ff00ff) and cyan (#00ffff)
 * - Glow pulse: Separate pulsing effect on text-shadow intensity at different frequencies
 * - Power surges: Scale animation (1→1.2→1) at intervals for dramatic intensity spikes
 * - Transform-gpu acceleration for smooth rendering
 * 
 * Use Cases:
 * - Vaporwave music videos
 * - Cyberpunk title sequences
 * - Retro-futuristic social media content
 * - Digital art presentations
 * - Tech product reveals with 80s aesthetic
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text to display with neon effect'),
  font: z
    .string()
    .optional()
    .default('Orbitron:700')
    .describe('Font family with optional weight (e.g., "Orbitron:700", "Righteous:400")'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Base text color (CSS color)'),
  neonPink: z
    .string()
    .optional()
    .default('#ff00ff')
    .describe('Primary neon pink color for glow layers'),
  neonCyan: z
    .string()
    .optional()
    .default('#00ffff')
    .describe('Secondary neon cyan color for glow layers'),
  flickerDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Duration of flicker-on effect per word (seconds)'),
  floatAmplitude: z
    .number()
    .min(5)
    .max(30)
    .default(10)
    .describe('Vertical float amplitude in pixels'),
  floatSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Float animation duration (seconds) - lower is faster'),
  rotateRange: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum rotateX angle for 3D depth effect (degrees)'),
  powerSurgeInterval: z
    .number()
    .min(0)
    .max(30)
    .default(5)
    .describe('Interval between power surges (seconds), 0 to disable'),
  powerSurgeIntensity: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.2)
    .describe('Scale multiplier during power surge'),
  staggerDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Delay between each word appearing (seconds)'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the animation (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Orbitron:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 700;

  // Split text into words
  const words = params.text.split(/\s+/).filter(word => word.length > 0);

  // Calculate neon glow text-shadow
  const neonGlowShadow = [
    `0 0 10px ${params.neonPink}`,
    `0 0 20px ${params.neonPink}`,
    `0 0 30px ${params.neonCyan}`,
    `0 0 40px ${params.neonCyan}`,
    `0 0 50px ${params.neonPink}`,
    `0 0 60px ${params.neonCyan}`,
  ].join(', ');

  // Create word components with staggered timing
  const wordComponents = words.map((word, index) => {
    const wordId = `neon-word-${index}`;
    const wordStartTime = index * params.staggerDelay;
    const wordDuration = params.duration - wordStartTime;

    // Effects array for this word
    const effects: any[] = [];

    // 1. Flicker-on effect (opacity with inconsistent brightness steps)
    const flickerEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: params.flickerDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.3 },
        { key: 'opacity', val: 0.5, prog: 0.5 },
        { key: 'opacity', val: 0.8, prog: 0.7 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    effects.push({
      id: `flicker-${wordId}`,
      componentId: 'generic',
      data: flickerEffect,
    });

    // 2. Continuous float effect (sine wave translateY)
    const floatEffect: GenericEffectData = {
      type: 'linear',
      start: params.flickerDuration,
      duration: wordDuration - params.flickerDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -params.floatAmplitude, prog: 0.25 },
        { key: 'translateY', val: 0, prog: 0.5 },
        { key: 'translateY', val: params.floatAmplitude, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `float-${wordId}`,
      componentId: 'generic',
      data: floatEffect,
    });

    // 3. 3D depth effect (rotateX oscillation)
    const depthEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: params.flickerDuration,
      duration: wordDuration - params.flickerDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: params.rotateRange, prog: 0.33 },
        { key: 'rotateX', val: 0, prog: 0.5 },
        { key: 'rotateX', val: -params.rotateRange, prog: 0.83 },
        { key: 'rotateX', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `depth-${wordId}`,
      componentId: 'generic',
      data: depthEffect,
    });

    // 4. Power surge effect (scale pulse)
    if (params.powerSurgeInterval > 0) {
      // Calculate surge timing - start after flicker, repeat at intervals
      const surgeStart = params.flickerDuration + params.powerSurgeInterval;
      const surgeDuration = 0.6; // Quick surge

      if (surgeStart + surgeDuration < wordDuration) {
        const surgeEffect: GenericEffectData = {
          type: 'ease-in-out',
          start: surgeStart,
          duration: surgeDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.powerSurgeIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        };

        effects.push({
          id: `surge-${wordId}`,
          componentId: 'generic',
          data: surgeEffect,
        });
      }
    }

    // 5. Glow pulse effect (text-shadow intensity)
    // Using brightness filter to simulate glow intensity change
    const glowPulseEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: params.flickerDuration,
      duration: wordDuration - params.flickerDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'brightness', val: 1, prog: 0 },
        { key: 'brightness', val: 1.3, prog: 0.2 },
        { key: 'brightness', val: 1, prog: 0.4 },
        { key: 'brightness', val: 1.2, prog: 0.6 },
        { key: 'brightness', val: 1, prog: 0.8 },
        { key: 'brightness', val: 1.1, prog: 1 },
      ],
    };

    effects.push({
      id: `glow-pulse-${wordId}`,
      componentId: 'generic',
      data: glowPulseEffect,
    });

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          fontWeight: fontWeight,
          textShadow: neonGlowShadow,
          marginRight: '0.5em',
          display: 'inline-block',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: wordStartTime,
          duration: wordDuration,
        },
      },
      effects: effects,
    } as RenderableComponentData;
  });

  // Container with perspective and flex layout
  const rootContainer = {
    id: 'vaporwave-neon-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center bg-black',
        style: {
          perspective: '1000px',
          minHeight: '100%',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'neon-words-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-center justify-center gap-4',
            style: {
              perspectiveOrigin: 'center center',
            },
          },
          repeatChildrenProps: {
            className: 'inline-block transform-gpu',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: wordComponents as RenderableComponentData[],
      },
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'vaporwave-neon-typography',
  title: 'Vaporwave Neon Typography',
  description:
    'Kinetic typography preset featuring floating neon signs in a vaporwave cityscape. Words materialize with flickering neon tube effects, gently bob as if suspended in digital water, and pulse with pink and cyan glows. Includes power surge moments and 3D perspective depth effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'neon',
    'vaporwave',
    'glow',
    'floating',
    'cyberpunk',
    '3d',
    'retro',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'NEON DREAMS',
    font: 'Orbitron:700',
    fontSize: 48,
    textColor: '#ffffff',
    neonPink: '#ff00ff',
    neonCyan: '#00ffff',
    flickerDuration: 0.3,
    floatAmplitude: 10,
    floatSpeed: 3,
    rotateRange: 5,
    powerSurgeInterval: 5,
    powerSurgeIntensity: 1.2,
    staggerDelay: 0.3,
    duration: 10,
  },
};

export const vaporwaveNeonTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
