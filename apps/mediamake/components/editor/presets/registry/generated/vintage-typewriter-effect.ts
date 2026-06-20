/**
 * Vintage Typewriter Effect Preset
 *
 * This preset recreates the mechanical precision and imperfections of a vintage typewriter
 * with stop-motion-style character animation. Each character appears with mechanical spring
 * animation, position jitter, and opacity variations for authentic worn ribbon effects.
 *
 * Features:
 * - **Mechanical Impact Animation**: Sharp keystrike with scale bounce (0.8 → 1.1 → 1)
 * - **Paper Shift Simulation**: Random vertical and horizontal position jitter per character
 * - **Ink Ribbon Variations**: Random opacity (0.7-1.0) simulating worn ribbon sections
 * - **Character Misalignment**: 1-2px random offsets for mechanical inconsistencies
 * - **Irregular Typing Rhythm**: Base 80ms ±30ms per character, 100-200ms word gaps
 * - **Container Shake**: Subtle horizontal shake (±1px) on each keystroke
 * - **Ink Effect Filter**: Contrast boost and brightness reduction for authentic ink look
 *
 * Use cases:
 * - Creating vintage document reveals
 * - Retro title sequences
 * - Historical or archival content
 * - Stop-motion style text animations
 * - Typewriter-themed intros or outros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to display with typewriter effect'),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .optional()
    .describe('Total duration in seconds (auto-calculated if not provided)'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(24)
    .optional()
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Text color (CSS color value)'),
  
  baseTypingSpeed: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .optional()
    .describe('Base typing speed in milliseconds per character'),
  
  speedVariation: z
    .number()
    .min(0)
    .max(100)
    .default(30)
    .optional()
    .describe('Random variation in typing speed (±milliseconds)'),
  
  wordPauseMin: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .optional()
    .describe('Minimum pause after word boundaries (milliseconds)'),
  
  wordPauseMax: z
    .number()
    .min(0)
    .max(1000)
    .default(200)
    .optional()
    .describe('Maximum pause after word boundaries (milliseconds)'),
  
  impactDuration: z
    .number()
    .min(50)
    .max(300)
    .default(100)
    .optional()
    .describe('Duration of keystrike impact animation (milliseconds)'),
  
  minOpacity: z
    .number()
    .min(0.3)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Minimum character opacity (ribbon wear simulation)'),
  
  maxOpacity: z
    .number()
    .min(0.5)
    .max(1)
    .default(1.0)
    .optional()
    .describe('Maximum character opacity'),
  
  verticalShiftRange: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Maximum vertical shift for paper movement (pixels)'),
  
  horizontalMisalignment: z
    .number()
    .min(0)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Maximum horizontal misalignment (pixels)'),
  
  containerShakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Container shake intensity (pixels)'),
  
  inkContrast: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .optional()
    .describe('Ink contrast filter value'),
  
  inkBrightness: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.9)
    .optional()
    .describe('Ink brightness filter value'),
  
  position: z
    .enum(['center', 'top', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
  
  randomSeed: z
    .number()
    .min(0)
    .default(12345)
    .optional()
    .describe('Random seed for deterministic variations'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const text = params.text;
  const fontSize = params.fontSize ?? 24;
  const textColor = params.textColor ?? '#000000';
  const baseSpeed = params.baseTypingSpeed ?? 80;
  const speedVar = params.speedVariation ?? 30;
  const wordPauseMin = params.wordPauseMin ?? 100;
  const wordPauseMax = params.wordPauseMax ?? 200;
  const impactDuration = (params.impactDuration ?? 100) / 1000; // Convert to seconds
  const minOpacity = params.minOpacity ?? 0.7;
  const maxOpacity = params.maxOpacity ?? 1.0;
  const verticalShiftRange = params.verticalShiftRange ?? 2;
  const horizontalMisalignment = params.horizontalMisalignment ?? 1.5;
  const shakeIntensity = params.containerShakeIntensity ?? 1;
  const inkContrast = params.inkContrast ?? 1.3;
  const inkBrightness = params.inkBrightness ?? 0.9;
  const position = params.position ?? 'center';
  const seed = params.randomSeed ?? 12345;

  // Seeded random number generator
  const seededRandom = (index: number) => {
    const x = Math.sin(seed + index * 12.9898) * 43758.5453123;
    return x - Math.floor(x);
  };

  // Generate per-character random variations
  const generateCharacterData = (char: string, index: number) => {
    // Random opacity (ribbon wear)
    const opacity = minOpacity + seededRandom(index * 2) * (maxOpacity - minOpacity);
    
    // Random vertical shift (paper movement)
    const shiftY = (seededRandom(index * 3) - 0.5) * 2 * verticalShiftRange;
    
    // Random horizontal misalignment
    const misalignX = (seededRandom(index * 5) - 0.5) * 2 * horizontalMisalignment;
    
    // Random font weight variation (simulate pressure)
    const boldness = 400 + Math.floor(seededRandom(index * 7) * 300); // 400-700
    
    return {
      opacity,
      shiftY,
      misalignX,
      boldness,
    };
  };

  // Calculate timing for each character
  const calculateTiming = (index: number, prevChar: string) => {
    // Base timing
    const baseTime = baseSpeed / 1000; // Convert to seconds
    
    // Random variation
    const variation = ((seededRandom(index * 11) - 0.5) * 2 * speedVar) / 1000;
    
    // Word boundary pause
    let wordPause = 0;
    if (prevChar === ' ' || prevChar === ',' || prevChar === '.' || prevChar === '!' || prevChar === '?') {
      const pauseRange = (wordPauseMax - wordPauseMin) / 1000;
      wordPause = wordPauseMin / 1000 + seededRandom(index * 13) * pauseRange;
    }
    
    return baseTime + variation + wordPause;
  };

  // Calculate accumulated timing for each character
  const characters = text.split('');
  let accumulatedTime = 0;
  const characterTimings = characters.map((char, index) => {
    const prevChar = index > 0 ? characters[index - 1] : '';
    const charDuration = calculateTiming(index, prevChar);
    const startTime = accumulatedTime;
    accumulatedTime += charDuration;
    
    return {
      char,
      startTime,
      duration: charDuration,
      data: generateCharacterData(char, index),
    };
  });

  // Total duration is accumulated time plus impact duration for last character
  const totalDuration = params.duration ?? (accumulatedTime + impactDuration);

  // Position class mapping
  const positionClasses = {
    center: 'items-center justify-center',
    top: 'items-start justify-center pt-20',
    bottom: 'items-end justify-center pb-20',
  };

  // Create character components
  const characterComponents: RenderableComponentData[] = characterTimings.map((timing, index) => {
    const charWrapperId = `char-wrapper-${index}`;
    const charTextId = `char-text-${index}`;
    const impactEffectId = `impact-effect-${index}`;
    const paperShiftEffectId = `paper-shift-effect-${index}`;
    const shakeEffectId = `shake-effect-${index}`;

    // Random shake direction for container
    const shakeX = (seededRandom(index * 17) - 0.5) * 2 * shakeIntensity;

    // Impact bounce effect (scale animation)
    const impactEffect = {
      id: impactEffectId,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: 0, // Relative to character wrapper
        duration: impactDuration,
        mode: 'provider',
        targetIds: [charWrapperId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Paper shift effect (position jitter)
    const paperShiftEffect = {
      id: paperShiftEffectId,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: impactDuration,
        mode: 'provider',
        targetIds: [charWrapperId],
        ranges: [
          { key: 'translateY', val: timing.data.shiftY, prog: 0 },
          { key: 'translateY', val: timing.data.shiftY, prog: 1 },
          { key: 'translateX', val: timing.data.misalignX, prog: 0 },
          { key: 'translateX', val: timing.data.misalignX, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Container shake effect
    const containerShakeEffect = {
      id: shakeEffectId,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: timing.startTime, // Relative to typewriter-container
        duration: 0.05,
        mode: 'provider',
        targetIds: ['typewriter-container'],
        ranges: [
          { key: 'translateX', val: shakeX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };

    // Character wrapper (inline-block for layout)
    const characterWrapper: RenderableComponentData = {
      id: charWrapperId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'inline-block relative',
          style: {
            opacity: 0, // Initial opacity (animated by effect)
          },
        },
      },
      context: {
        timing: {
          start: timing.startTime,
          duration: totalDuration - timing.startTime, // Lasts until end
        },
      },
      effects: [impactEffect, paperShiftEffect],
      childrenData: [
        {
          id: charTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: timing.char,
            font: {
              family: 'Courier New',
              weights: ['400'],
            },
            style: {
              fontWeight: timing.data.boldness,
              opacity: timing.data.opacity,
              display: 'inline-block',
              color: textColor,
              fontSize: `${fontSize}px`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration - timing.startTime,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    return characterWrapper;
  });

  // Create container shake effects (one per character keystroke)
  const containerShakeEffects = characterTimings.map((timing, index) => {
    const shakeX = (seededRandom(index * 17) - 0.5) * 2 * shakeIntensity;
    
    return {
      id: `container-shake-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: timing.startTime,
        duration: 0.05,
        mode: 'provider',
        targetIds: ['typewriter-container'],
        ranges: [
          { key: 'translateX', val: shakeX, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      } as GenericEffectData,
    };
  });

  // Typewriter container (holds all characters)
  const typewriterContainer: RenderableComponentData = {
    id: 'typewriter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          fontFamily: '"Courier New", monospace',
          fontSize: `${fontSize}px`,
          lineHeight: '1.4',
          color: textColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: containerShakeEffects,
    childrenData: characterComponents,
  } as RenderableComponentData;

  // Root container (with ink filter)
  const rootContainer: RenderableComponentData = {
    id: 'typewriter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${positionClasses[position]}`,
        style: {
          filter: `contrast(${inkContrast}) brightness(${inkBrightness})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [typewriterContainer],
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
  id: 'vintage-typewriter-effect',
  title: 'Vintage Typewriter Effect',
  description: 'Recreates the mechanical precision and imperfections of a vintage typewriter with stop-motion-style character animation. Features impact bounce, paper shift simulation, random ink ribbon variations, character misalignment, and irregular human-like typing rhythm. Each character appears with mechanical spring animation, position jitter, and opacity variations for authentic worn ribbon effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'vintage',
    'retro',
    'mechanical',
    'animation',
    'typography',
    'stop-motion',
    'nostalgic',
    'impact',
    'jitter',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'The quick brown fox jumps over the lazy dog.',
    duration: 10,
    fontSize: 24,
    textColor: '#000000',
    baseTypingSpeed: 80,
    speedVariation: 30,
    wordPauseMin: 100,
    wordPauseMax: 200,
    impactDuration: 100,
    minOpacity: 0.7,
    maxOpacity: 1.0,
    verticalShiftRange: 2,
    horizontalMisalignment: 1.5,
    containerShakeIntensity: 1,
    inkContrast: 1.3,
    inkBrightness: 0.9,
    position: 'center',
    randomSeed: 12345,
  },
};

// Export preset
export const vintageTypewriterEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
