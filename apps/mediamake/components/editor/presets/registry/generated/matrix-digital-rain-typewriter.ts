/**
 * Matrix Digital Rain Typewriter Effect Preset
 *
 * Creates a Matrix-inspired digital rain effect where text materializes from cascading green code.
 * Features multiple columns of falling characters at varied speeds, character-level formation with
 * rapid cycling before locking, phosphor glow effects, perspective depth, and trailing light effects.
 *
 * Perfect for tech, hacking, or futuristic themes.
 *
 * Features:
 * - Multiple columns of falling green characters (10 columns) with varied speeds and opacities
 * - Character-level formation with rapid cycling (10 cycles over 200ms) before locking
 * - Digital phosphor glow effect (text-shadow) that intensifies during lock
 * - Perspective transform for depth (perspective: 1000px, rotateX: 10deg)
 * - Trailing light effect (duplicate layer with delayed animation)
 * - Optimized performance (limited columns, CSS animations for background)
 *
 * Use cases:
 * - Tech product launches and demonstrations
 * - Hacking or cybersecurity content
 * - Futuristic title sequences
 * - Digital transformation narratives
 * - Code or programming content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .describe('The main text to display with Matrix rain effect'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(32)
    .max(200)
    .default(64)
    .optional()
    .describe('Font size of the main text in pixels'),
  textColor: z
    .string()
    .default('#4ade80')
    .optional()
    .describe('Color of the main text (green by default)'),
  rainColor: z
    .string()
    .default('#22c55e')
    .optional()
    .describe('Color of the falling rain characters'),
  rainOpacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Opacity of the falling rain characters'),
  rainSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(4)
    .optional()
    .describe('Speed multiplier for falling rain (higher = faster)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .optional()
    .describe('Initial glow intensity in pixels for text-shadow'),
  characterCycleSpeed: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .optional()
    .describe('Duration of character cycling phase in milliseconds'),
  trailingOpacity: z
    .number()
    .min(0.1)
    .max(0.8)
    .default(0.3)
    .optional()
    .describe('Opacity of the trailing light effect'),
  font: z
    .string()
    .default('Courier New')
    .optional()
    .describe('Font family for monospace text (e.g., "Courier New", "Monaco")'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const text = params.text;
  const duration = params.duration;
  const fontSize = params.fontSize ?? 64;
  const textColor = params.textColor ?? '#4ade80';
  const rainColor = params.rainColor ?? '#22c55e';
  const rainOpacity = params.rainOpacity ?? 0.3;
  const rainSpeed = params.rainSpeed ?? 4;
  const glowIntensity = params.glowIntensity ?? 20;
  const characterCycleSpeed = params.characterCycleSpeed ?? 200;
  const trailingOpacity = params.trailingOpacity ?? 0.3;
  const fontFamily = params.font ?? 'Courier New';

  // Character set for Matrix rain
  const matrixChars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?';

  // Helper: Generate random Matrix characters for rain columns
  const generateRainCharacters = (count: number): string => {
    let result = '';
    for (let i = 0; i < count; i++) {
      result +=
        matrixChars[Math.floor(Math.random() * matrixChars.length)] + '\n';
    }
    return result;
  };

  // Generate 10 rain columns with varied speeds
  const rainColumns: RenderableComponentData[] = [];
  const columnCount = 10;
  for (let i = 0; i < columnCount; i++) {
    const columnId = `rain-column-${i}`;
    const leftPosition = (i * 10 + 5).toString() + '%';
    const animationDuration = 2 + (i % 4); // 2-5 seconds varied
    const speedAdjusted = animationDuration / rainSpeed;

    rainColumns.push({
      id: columnId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="white-space: pre-line; line-height: 1.2;">${generateRainCharacters(40)}</div>`,
        className: 'font-mono text-xs absolute',
        style: {
          left: leftPosition,
          top: '-100%',
          color: rainColor,
          opacity: rainOpacity,
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
          id: `${columnId}-fall`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: speedAdjusted,
            mode: 'provider',
            targetIds: [columnId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: '200vh', prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    } as RenderableComponentData);
  }

  // Background rain layer container
  const backgroundRainLayer: RenderableComponentData = {
    id: 'background-rain-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: rainColumns,
  };

  // Main text: Create character-level effects
  const characters = text.split('');
  const charCycleDuration = characterCycleSpeed / 1000; // Convert to seconds
  const mainTextId = 'main-text';
  const trailingTextId = 'trailing-text';

  // Main text with character formation effects
  // Each character cycles through random characters before locking
  const mainTextEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: charCycleDuration + 0.5, // Cycling + lock phase
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      // Opacity: fade in during cycling
      { key: 'opacity', val: 0.3, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 1 },
      // Brightness: boost during lock
      { key: 'brightness', val: 0.5, prog: 0 },
      { key: 'brightness', val: 1.5, prog: 0.5 },
      { key: 'brightness', val: 1, prog: 1 },
    ],
  };

  // Trailing text effect (delayed)
  const trailingTextEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0.1, // 100ms delay
    duration: charCycleDuration + 0.5,
    mode: 'provider',
    targetIds: [trailingTextId],
    ranges: [
      { key: 'opacity', val: 0.1, prog: 0 },
      { key: 'opacity', val: trailingOpacity, prog: 0.3 },
      { key: 'opacity', val: trailingOpacity, prog: 1 },
    ],
  };

  // Glow effect: text-shadow intensity changes
  const glowEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 1,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      {
        key: 'textShadow',
        val: `0 0 ${glowIntensity}px currentColor`,
        prog: 0,
      },
      { key: 'textShadow', val: `0 0 5px currentColor`, prog: 1 },
    ],
  };

  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'relative z-10 font-mono',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: textColor,
        textShadow: `0 0 5px currentColor`,
        fontFamily: fontFamily,
      },
      font: {
        family: fontFamily === 'Courier New' ? undefined : fontFamily,
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
        id: `${mainTextId}-formation`,
        componentId: 'generic',
        data: mainTextEffect,
      },
      {
        id: `${mainTextId}-glow`,
        componentId: 'generic',
        data: glowEffect,
      },
    ],
  };

  const trailingText: RenderableComponentData = {
    id: trailingTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'absolute font-mono',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: textColor,
        textShadow: `0 0 ${glowIntensity}px currentColor`,
        top: '0',
        left: '0',
        opacity: trailingOpacity,
        fontFamily: fontFamily,
      },
      font: {
        family: fontFamily === 'Courier New' ? undefined : fontFamily,
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
        id: `${trailingTextId}-effect`,
        componentId: 'generic',
        data: trailingTextEffect,
      },
    ],
  };

  // Main text container
  const mainTextContainer: RenderableComponentData = {
    id: 'main-text-container',
    type: 'layout',
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
    childrenData: [trailingText, mainText],
  };

  // Main text layer (centered)
  const mainTextLayer: RenderableComponentData = {
    id: 'main-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mainTextContainer],
  };

  // Main container with perspective transform
  const mainContainer: RenderableComponentData = {
    id: 'matrix-main-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transform: 'rotateX(10deg)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [backgroundRainLayer, mainTextLayer],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'matrix-root-perspective',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mainContainer],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'matrix-digital-rain-typewriter',
  title: 'Matrix Digital Rain Typewriter Effect',
  description:
    'Matrix-inspired digital rain effect where text materializes from cascading green code. Features multiple columns of falling characters at varied speeds, character-level formation with rapid cycling, phosphor glow effects, perspective depth, and trailing light effects. Perfect for tech, hacking, or futuristic themes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'matrix',
    'digital-rain',
    'typewriter',
    'tech',
    'hacking',
    'futuristic',
    'glitch',
    'code',
    'cyberpunk',
    'green',
    'monospace',
    'cascading',
    'phosphor',
    'glow',
    'perspective',
    'trailing',
    'effect',
  ],
  defaultInputParams: {
    text: 'THE MATRIX',
    duration: 10,
    fontSize: 64,
    textColor: '#4ade80',
    rainColor: '#22c55e',
    rainOpacity: 0.3,
    rainSpeed: 4,
    glowIntensity: 20,
    characterCycleSpeed: 200,
    trailingOpacity: 0.3,
    font: 'Courier New',
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const matrixDigitalRainTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
