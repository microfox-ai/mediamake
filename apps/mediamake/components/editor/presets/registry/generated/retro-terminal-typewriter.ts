/**
 * Retro Computer Terminal Typewriter Effect Preset
 *
 * This preset creates an authentic 1980s-style command-line terminal typewriter effect with
 * glowing green or amber text appearing character by character on a black background. Features
 * include CRT monitor aesthetics with scan lines, RGB chromatic aberration, subtle flickering,
 * and a blinking cursor.
 *
 * Features:
 * - **Character-by-Character Typing**: Human-like rhythm with random delays (40-120ms)
 * - **CRT Visual Effects**: Scan lines, chromatic aberration, and screen flicker
 * - **Glowing Text**: Customizable glow intensity with text-shadow effects
 * - **Blinking Cursor**: Underscore cursor that blinks while typing
 * - **System Prompt**: Optional prefix like '>' or 'C:\>' that appears instantly
 * - **Monospace Fonts**: Full support for classic terminal fonts
 * - **Color Options**: Green or amber terminal text colors
 *
 * Use cases:
 * - Creating retro hacker movie aesthetics
 * - Tech/cyberpunk video intros
 * - Command-line tutorial visualizations
 * - Nostalgic 1980s computer interface recreations
 * - Terminal output simulations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .describe('The text content to type out character by character'),
  textColor: z
    .string()
    .default('#00ff00')
    .optional()
    .describe(
      'Terminal text color (e.g., "#00ff00" for green, "#ffb000" for amber)',
    ),
  systemPrompt: z
    .string()
    .default('')
    .optional()
    .describe(
      'Optional system prompt prefix (e.g., "> ", "C:\\>", "$ ") that appears instantly before typing',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(48)
    .default(24)
    .optional()
    .describe('Font size in pixels for the terminal text'),
  font: z
    .string()
    .default('Courier New')
    .optional()
    .describe(
      'Monospace font family (e.g., "Courier New", "Consolas", "Monaco")',
    ),
  glowIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .optional()
    .describe('Glow effect intensity multiplier (0 = no glow, 3 = maximum glow)'),
  minTypingDelay: z
    .number()
    .min(20)
    .max(200)
    .default(40)
    .optional()
    .describe('Minimum delay between characters in milliseconds'),
  maxTypingDelay: z
    .number()
    .min(50)
    .max(300)
    .default(120)
    .optional()
    .describe('Maximum delay between characters in milliseconds'),
  chromaticAberration: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable RGB chromatic aberration effect for CRT authenticity'),
  scanLines: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable horizontal scan lines for CRT monitor effect'),
  flickerEffect: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable subtle screen flicker effect'),
  cursorBlink: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable blinking underscore cursor'),
  position: z
    .enum(['center', 'top-left', 'top-center', 'bottom-left'])
    .default('center')
    .optional()
    .describe('Text position on screen'),
  padding: z
    .number()
    .min(0)
    .max(100)
    .default(32)
    .optional()
    .describe('Padding around text container in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random typing delay
  const getRandomDelay = (min: number, max: number): number => {
    return (Math.random() * (max - min) + min) / 1000; // Convert ms to seconds
  };

  // Calculate position className
  const getPositionClass = (): string => {
    switch (params.position) {
      case 'top-left':
        return 'absolute top-0 left-0 items-start justify-start';
      case 'top-center':
        return 'absolute top-0 left-0 right-0 items-start justify-center';
      case 'bottom-left':
        return 'absolute bottom-0 left-0 items-end justify-start';
      case 'center':
      default:
        return 'absolute inset-0 items-center justify-center';
    }
  };

  // Parse text into characters
  const text = params.text || 'Hello World';
  const systemPrompt = params.systemPrompt || '';
  const characters = text.split('');
  const textColor = params.textColor || '#00ff00';
  const fontSize = params.fontSize || 24;
  const fontFamily = params.font || 'Courier New';
  const glowIntensity = params.glowIntensity ?? 1;
  const minDelay = params.minTypingDelay || 40;
  const maxDelay = params.maxTypingDelay || 120;
  const padding = params.padding || 32;

  // Calculate glow values based on intensity
  const glowSmall = `0 0 ${10 * glowIntensity}px currentColor`;
  const glowMedium = `0 0 ${20 * glowIntensity}px currentColor`;
  const textShadow = `${glowSmall}, ${glowMedium}`;

  // Calculate character timing
  let currentTime = 0;
  const characterTimings: Array<{ char: string; start: number; id: string }> =
    [];

  characters.forEach((char, index) => {
    const delay = getRandomDelay(minDelay, maxDelay);
    characterTimings.push({
      char,
      start: currentTime,
      id: `char-${index}`,
    });
    currentTime += delay;
  });

  const totalDuration = currentTime + 1; // Add 1 second after typing completes

  // Create character components with fade-in effects
  const characterComponents: RenderableComponentData[] =
    characterTimings.map((charData) => {
      const charEffect: GenericEffectData = {
        type: 'ease-out',
        start: charData.start,
        duration: 0.1,
        mode: 'provider',
        targetIds: [charData.id],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      return {
        id: charData.id,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: charData.char,
          style: {
            fontFamily: `${fontFamily}, monospace`,
            fontSize: `${fontSize}px`,
            color: textColor,
            textShadow: textShadow,
            display: 'inline-block',
            willChange: 'opacity, transform',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: `char-reveal-${charData.id}`,
            componentId: 'generic',
            data: charEffect,
          },
        ],
      } as RenderableComponentData;
    });

  // Create cursor component
  const cursorHeight = fontSize * 1.2;
  const cursorComponent: RenderableComponentData = {
    id: 'cursor-element',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'inline-block ml-1',
        style: {
          width: `${fontSize * 0.5}px`,
          height: `${cursorHeight}px`,
          backgroundColor: textColor,
          boxShadow: `0 0 ${8 * glowIntensity}px ${textColor}`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: params.cursorBlink
      ? [
          {
            id: 'cursor-blink-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: 1,
              mode: 'provider',
              targetIds: ['cursor-element'],
              loop: true,
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ]
      : [],
    childrenData: [],
  } as RenderableComponentData;

  // Create system prompt component (if provided)
  const systemPromptComponent: RenderableComponentData | null = systemPrompt
    ? ({
        id: 'system-prompt',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: systemPrompt,
          style: {
            fontFamily: `${fontFamily}, monospace`,
            fontSize: `${fontSize}px`,
            color: textColor,
            textShadow: textShadow,
            marginRight: '0.2em',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Create text container with all characters
  const textContainerChildren: RenderableComponentData[] = [];
  if (systemPromptComponent) {
    textContainerChildren.push(systemPromptComponent);
  }
  textContainerChildren.push(...characterComponents);
  textContainerChildren.push(cursorComponent);

  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'inline-flex flex-row flex-wrap items-start',
        style: {
          fontFamily: `${fontFamily}, monospace`,
          willChange: 'opacity, transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: textContainerChildren,
  } as RenderableComponentData;

  // Create chromatic aberration container
  const chromaticAberrationEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 0.1,
    mode: 'provider',
    targetIds: ['chromatic-container'],
    ranges: [
      {
        key: 'filter',
        val: 'drop-shadow(1px 0 0 rgba(255,0,0,0.5)) drop-shadow(-1px 0 0 rgba(0,255,255,0.5))',
        prog: 0,
      },
      {
        key: 'filter',
        val: 'drop-shadow(1px 0 0 rgba(255,0,0,0.5)) drop-shadow(-1px 0 0 rgba(0,255,255,0.5))',
        prog: 1,
      },
    ],
  };

  const chromaticContainer: RenderableComponentData = {
    id: 'chromatic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `${getPositionClass()} flex`,
        style: {
          padding: `${padding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects:
      params.chromaticAberration !== false
        ? [
            {
              id: 'chromatic-effect',
              componentId: 'generic',
              data: chromaticAberrationEffect,
            },
          ]
        : [],
    childrenData: [textContainer],
  } as RenderableComponentData;

  // Create scan lines layer
  const scanLineEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 8,
    mode: 'provider',
    targetIds: ['scanline-layer'],
    loop: true,
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: 100, prog: 1 },
    ],
  };

  const scanLineLayer: RenderableComponentData = {
    id: 'scanline-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 opacity-10 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects:
      params.scanLines !== false
        ? [
            {
              id: 'scanline-scroll',
              componentId: 'generic',
              data: scanLineEffect,
            },
          ]
        : [],
    childrenData: [],
  } as RenderableComponentData;

  // Create flicker layer
  const flickerEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: 0.15,
    mode: 'provider',
    targetIds: ['flicker-layer'],
    loop: true,
    ranges: [
      { key: 'opacity', val: 0.03, prog: 0 },
      { key: 'opacity', val: 0.08, prog: 0.5 },
      { key: 'opacity', val: 0.03, prog: 1 },
    ],
  };

  const flickerLayer: RenderableComponentData = {
    id: 'flicker-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none bg-black opacity-5',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects:
      params.flickerEffect !== false
        ? [
            {
              id: 'flicker-effect',
              componentId: 'generic',
              data: flickerEffect,
            },
          ]
        : [],
    childrenData: [],
  } as RenderableComponentData;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-terminal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'bg-black w-full h-full overflow-hidden relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [scanLineLayer, chromaticContainer, flickerLayer],
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
  id: 'retro-terminal-typewriter',
  title: 'Retro Terminal Typewriter Effect',
  description:
    'A 1980s-style command-line terminal typewriter effect with glowing green/amber text appearing character by character on a black background. Features authentic CRT monitor aesthetics including scan lines, RGB chromatic aberration, flickering, and a blinking cursor. Supports customizable system prompts, variable typing speed for human-like rhythm, monospace fonts, and adjustable glow intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'retro',
    'terminal',
    'typewriter',
    'crt',
    'hacker',
    '1980s',
    'command-line',
    'monospace',
    'glow',
    'effects',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Accessing mainframe...\nSystem online.\nWelcome, user.',
    textColor: '#00ff00',
    systemPrompt: '> ',
    fontSize: 24,
    font: 'Courier New',
    glowIntensity: 1,
    minTypingDelay: 40,
    maxTypingDelay: 120,
    chromaticAberration: true,
    scanLines: true,
    flickerEffect: true,
    cursorBlink: true,
    position: 'center',
    padding: 32,
  },
};

export const retroTerminalTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
