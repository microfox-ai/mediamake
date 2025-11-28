/**
 * Glitch Character Reveal Preset
 *
 * A glitch-style character reveal where letters flicker into existence with digital artifacts.
 * Characters appear with rapid opacity fluctuations, RGB channel splits (chromatic aberration),
 * position jitters, random glitch characters, scan lines, and erratic timing.
 *
 * Features:
 * - Digital glitch aesthetics with corrupted data reconstruction
 * - RGB channel separation (chromatic aberration) for each character
 * - Rapid opacity fluctuations with multiple glitch cycles
 * - Random glitch characters appearing before correct characters
 * - Scan line overlay for CRT/digital display effect
 * - Position jitters and transform3d for hardware acceleration
 * - Erratic, unpredictable timing per character
 * - Monospace font with digital aesthetic
 *
 * Use cases:
 * - Tech/cyberpunk themed title reveals
 * - Corrupted data reconstruction effects
 * - Digital glitch intros for tech content
 * - Sci-fi/futuristic text animations
 * - Error/corruption visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  TextAtomData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('GLITCH')
    .describe('Text to display with glitch effect'),
  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  fontWeight: z
    .number()
    .min(100)
    .max(900)
    .default(700)
    .describe('Font weight (100-900)'),
  baseColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgb)'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Glitch effect intensity multiplier'),
  randomDelayMax: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Maximum random delay per character in seconds'),
  glitchCycleDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Duration of each glitch cycle in seconds'),
  rgbShiftAmount: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('RGB channel shift amount in pixels'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.03)
    .describe('Scan line overlay opacity'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontWeight,
    baseColor,
    duration,
    glitchIntensity,
    randomDelayMax,
    glitchCycleDuration,
    rgbShiftAmount,
    scanlineOpacity,
  } = params;

  // Helper: Generate random glitch character
  const getRandomGlitchChar = (): string => {
    const glitchChars = ['#', '%', '@', '$', '&', '*', '!', '?', '█', '▓', '▒', '░'];
    return glitchChars[Math.floor(Math.random() * glitchChars.length)];
  };

  // Helper: Generate random delay for character
  const getRandomDelay = (): number => {
    return Math.random() * randomDelayMax;
  };

  // Helper: Generate erratic opacity keyframes
  const generateOpacityKeyframes = (intensity: number) => {
    const baseKeyframes = [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.1 },
      { key: 'opacity', val: 0, prog: 0.2 },
      { key: 'opacity', val: 0.5, prog: 0.3 },
      { key: 'opacity', val: 0, prog: 0.4 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: 0.8, prog: 0.7 },
      { key: 'opacity', val: 1, prog: 1 },
    ];

    return baseKeyframes.map((kf) => ({
      ...kf,
      val: kf.val * intensity,
    }));
  };

  // Helper: Generate position jitter keyframes
  const generateJitterKeyframes = (intensity: number) => {
    return [
      { key: 'translateX', val: Math.random() * 4 * intensity - 2 * intensity, prog: 0 },
      { key: 'translateY', val: Math.random() * 4 * intensity - 2 * intensity, prog: 0 },
      { key: 'translateX', val: Math.random() * 4 * intensity - 2 * intensity, prog: 0.2 },
      { key: 'translateY', val: Math.random() * 4 * intensity - 2 * intensity, prog: 0.2 },
      { key: 'translateX', val: Math.random() * 4 * intensity - 2 * intensity, prog: 0.4 },
      { key: 'translateY', val: Math.random() * 4 * intensity - 2 * intensity, prog: 0.4 },
      { key: 'translateX', val: 0, prog: 0.6 },
      { key: 'translateY', val: 0, prog: 0.6 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: 0, prog: 1 },
    ];
  };

  // Split text into characters
  const characters = text.split('');
  
  // Calculate max delay to determine total duration
  const charDelays = characters.map(() => getRandomDelay());
  const maxDelay = Math.max(...charDelays);
  const totalDuration = maxDelay + glitchCycleDuration + 0.5; // Add stabilization time

  // Create character groups with RGB split and glitch effects
  const characterComponents: RenderableComponentData[] = characters.map((char, index) => {
    const charDelay = charDelays[index];
    const charId = `char-${index}`;
    const glitchChar = getRandomGlitchChar();

    // Base character (white)
    const baseCharId = `${charId}-base`;
    const baseChar: RenderableComponentData = {
      id: baseCharId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight.toString(),
          color: baseColor,
          position: 'relative',
          zIndex: 4,
        },
        font: {
          family: 'Courier New',
          weights: [fontWeight.toString()],
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
          id: `${baseCharId}-opacity`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: charDelay,
            duration: glitchCycleDuration,
            mode: 'provider',
            targetIds: [baseCharId],
            ranges: generateOpacityKeyframes(glitchIntensity),
          } as GenericEffectData,
        },
        {
          id: `${baseCharId}-jitter`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: charDelay,
            duration: glitchCycleDuration * 0.6,
            mode: 'provider',
            targetIds: [baseCharId],
            ranges: generateJitterKeyframes(glitchIntensity),
          } as GenericEffectData,
        },
      ],
    };

    // Red channel (shifted left)
    const redCharId = `${charId}-red`;
    const redChar: RenderableComponentData = {
      id: redCharId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight.toString(),
          color: '#ff0000',
          position: 'absolute',
          top: 0,
          left: 0,
          mixBlendMode: 'screen',
          zIndex: 1,
        },
        font: {
          family: 'Courier New',
          weights: [fontWeight.toString()],
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
          id: `${redCharId}-shift`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: charDelay,
            duration: glitchCycleDuration,
            mode: 'provider',
            targetIds: [redCharId],
            ranges: [
              { key: 'translateX', val: -rgbShiftAmount, prog: 0 },
              { key: 'translateX', val: -rgbShiftAmount * 1.5, prog: 0.3 },
              { key: 'translateX', val: -rgbShiftAmount * 0.5, prog: 0.6 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    // Green channel (centered)
    const greenCharId = `${charId}-green`;
    const greenChar: RenderableComponentData = {
      id: greenCharId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight.toString(),
          color: '#00ff00',
          position: 'absolute',
          top: 0,
          left: 0,
          mixBlendMode: 'screen',
          zIndex: 2,
        },
        font: {
          family: 'Courier New',
          weights: [fontWeight.toString()],
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
          id: `${greenCharId}-flicker`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: charDelay,
            duration: glitchCycleDuration,
            mode: 'provider',
            targetIds: [greenCharId],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 0.2, prog: 0.4 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    // Blue channel (shifted right)
    const blueCharId = `${charId}-blue`;
    const blueChar: RenderableComponentData = {
      id: blueCharId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight.toString(),
          color: '#0000ff',
          position: 'absolute',
          top: 0,
          left: 0,
          mixBlendMode: 'screen',
          zIndex: 3,
        },
        font: {
          family: 'Courier New',
          weights: [fontWeight.toString()],
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
          id: `${blueCharId}-shift`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: charDelay,
            duration: glitchCycleDuration,
            mode: 'provider',
            targetIds: [blueCharId],
            ranges: [
              { key: 'translateX', val: rgbShiftAmount, prog: 0 },
              { key: 'translateX', val: rgbShiftAmount * 1.5, prog: 0.3 },
              { key: 'translateX', val: rgbShiftAmount * 0.5, prog: 0.6 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    // Glitch character (appears briefly before correct character)
    const glitchCharId = `${charId}-glitch`;
    const glitchCharComponent: RenderableComponentData = {
      id: glitchCharId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: glitchChar,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight.toString(),
          color: '#00ff00',
          position: 'absolute',
          top: 0,
          left: 0,
          mixBlendMode: 'screen',
          zIndex: 5,
        },
        font: {
          family: 'Courier New',
          weights: [fontWeight.toString()],
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
          id: `${glitchCharId}-flash`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: charDelay,
            duration: glitchCycleDuration * 0.4,
            mode: 'provider',
            targetIds: [glitchCharId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    // Character group container
    const charGroup: RenderableComponentData = {
      id: `char-group-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            transform: 'translate3d(0, 0, 0)', // Hardware acceleration
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [baseChar, redChar, greenChar, blueChar, glitchCharComponent],
    };

    return charGroup;
  });

  // Scan line overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="scan-lines"></div>',
      style: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        background: `repeating-linear-gradient(0deg, rgba(0, 255, 0, ${scanlineOpacity}) 0px, transparent 2px, transparent 4px)`,
        mixBlendMode: 'screen',
        zIndex: 100,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row',
        style: {
          gap: '0.1em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative font-mono tracking-wider',
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.min(totalDuration, duration),
      },
    },
    childrenData: [scanlineOverlay, textContainer],
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

const presetMetadata: PresetMetadata = {
  id: 'glitch-character-reveal',
  title: 'Glitch Character Reveal',
  description:
    'A glitch-style character reveal where letters flicker into existence with digital artifacts. Features corrupted data reconstruction aesthetics with rapid opacity fluctuations, RGB channel splits (chromatic aberration), position jitters, random character glitches, scan lines, and erratic timing. Each character appears through multiple glitch cycles with unpredictable timing, creating a broken display fixing itself effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'reveal',
    'digital',
    'tech',
    'cyberpunk',
    'corruption',
    'rgb-split',
    'chromatic-aberration',
    'scanline',
    'monospace',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH',
    fontSize: 64,
    fontWeight: 700,
    baseColor: '#ffffff',
    duration: 3,
    glitchIntensity: 1,
    randomDelayMax: 0.5,
    glitchCycleDuration: 0.3,
    rgbShiftAmount: 2,
    scanlineOpacity: 0.03,
  },
};

export const glitchCharacterRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
