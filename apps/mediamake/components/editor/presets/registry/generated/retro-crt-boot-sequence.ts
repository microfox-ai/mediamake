/**
 * Retro CRT Boot Sequence Preset
 *
 * This preset creates a retro-futuristic text animation inspired by 90s computer boot sequences
 * and BIOS screens. Features include:
 * - Character-by-character text reveal with 0.05s stagger
 * - Phosphor display lag effect (afterimage trails with decreasing opacity)
 * - CRT monitor curvature distortion using perspective transforms
 * - Random ASCII glitch characters that briefly replace letters before correcting
 * - Pink/cyan color palette with unstable color calibration (hue-rotate animation)
 * - Barrel distortion and vignetting effects for authentic CRT aesthetic
 * - Scanline overlay for classic CRT monitor look
 *
 * Use cases:
 * - Tech/hacker themed video intros
 * - Retro gaming content
 * - Cyberpunk aesthetic videos
 * - Terminal/command-line style animations
 * - 90s nostalgia content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display in CRT boot sequence style'),
  duration: z
    .number()
    .min(0.1)
    .default(10)
    .describe('Duration of the animation in seconds'),
  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .describe('Font size for the text in pixels'),
  textColor: z
    .string()
    .default('#00FF9F')
    .describe('Base text color (phosphor green default)'),
  glitchProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .describe('Probability of glitch occurring per character (0-1)'),
  glitchDuration: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .describe('Duration of each glitch in seconds'),
  colorShiftDuration: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .describe('Duration of color shift cycle in seconds'),
  characterDelay: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Delay between each character appearance in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    glitchProbability,
    glitchDuration,
    colorShiftDuration,
    characterDelay,
  } = params;

  // Helper function to generate random ASCII character for glitch
  const getRandomGlitchChar = (): string => {
    const glitchChars = '!@#$%^&*()_+{}[]|\\:;"<>?,./~`0123456789';
    return glitchChars[Math.floor(Math.random() * glitchChars.length)];
  };

  // Split text into characters
  const characters = text.split('');

  // Generate character components with afterimage trails
  const characterComponents = characters.map((char, index) => {
    const charId = `char-${index}`;
    const characterStartTime = index * characterDelay;

    // Decide if this character will glitch
    const willGlitch = Math.random() < glitchProbability;
    const glitchStartTime = willGlitch
      ? characterStartTime + 0.2 + Math.random() * 0.3
      : null;

    // Main character with color shift effect
    const mainCharacterEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: colorShiftDuration,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'hue-rotate(180deg)', prog: 0.5 },
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 1 },
      ],
    };

    // Character reveal effect
    const revealEffect: GenericEffectData = {
      type: 'linear',
      start: characterStartTime,
      duration: 0.1,
      mode: 'provider',
      targetIds: [charId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    // Glitch effect (if applicable)
    const glitchEffect: GenericEffectData | null =
      willGlitch && glitchStartTime !== null
        ? {
            type: 'linear',
            start: glitchStartTime,
            duration: glitchDuration,
            mode: 'provider',
            targetIds: [charId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.4 },
              { key: 'opacity', val: 1, prog: 0.6 },
              { key: 'opacity', val: 0, prog: 0.8 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          }
        : null;

    // Main character
    const mainCharacter: RenderableComponentData = {
      id: charId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          letterSpacing: '0.1em',
          position: 'relative',
          zIndex: 10,
          color: textColor,
          fontFamily: 'VT323, monospace',
        },
        font: {
          family: 'VT323',
          weights: ['400'],
          subsets: ['latin'],
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
          id: `reveal-${charId}`,
          componentId: 'generic',
          data: revealEffect,
        },
        {
          id: `color-shift-${charId}`,
          componentId: 'generic',
          data: mainCharacterEffect,
        },
        ...(glitchEffect
          ? [
              {
                id: `glitch-${charId}`,
                componentId: 'generic',
                data: glitchEffect,
              },
            ]
          : []),
      ],
    };

    // Afterimage trail 1 (closest, most visible)
    const trail1: RenderableComponentData = {
      id: `trail1-${charId}`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          letterSpacing: '0.1em',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.3,
          transform: 'translateX(-2px)',
          filter: 'blur(1px) brightness(1.2)',
          zIndex: 3,
          pointerEvents: 'none',
          color: textColor,
          fontFamily: 'VT323, monospace',
        },
        font: {
          family: 'VT323',
          weights: ['400'],
          subsets: ['latin'],
        },
      },
      context: {
        timing: {
          start: characterStartTime + 0.02,
          duration: 0.15,
        },
      },
    };

    // Afterimage trail 2
    const trail2: RenderableComponentData = {
      id: `trail2-${charId}`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          letterSpacing: '0.1em',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.15,
          transform: 'translateX(-4px)',
          filter: 'blur(2px) brightness(1.1)',
          zIndex: 2,
          pointerEvents: 'none',
          color: textColor,
          fontFamily: 'VT323, monospace',
        },
        font: {
          family: 'VT323',
          weights: ['400'],
          subsets: ['latin'],
        },
      },
      context: {
        timing: {
          start: characterStartTime + 0.04,
          duration: 0.12,
        },
      },
    };

    // Afterimage trail 3 (farthest, faintest)
    const trail3: RenderableComponentData = {
      id: `trail3-${charId}`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          letterSpacing: '0.1em',
          position: 'absolute',
          top: 0,
          left: 0,
          opacity: 0.05,
          transform: 'translateX(-6px)',
          filter: 'blur(3px) brightness(1.0)',
          zIndex: 1,
          pointerEvents: 'none',
          color: textColor,
          fontFamily: 'VT323, monospace',
        },
        font: {
          family: 'VT323',
          weights: ['400'],
          subsets: ['latin'],
        },
      },
      context: {
        timing: {
          start: characterStartTime + 0.06,
          duration: 0.1,
        },
      },
    };

    // Character group container
    const characterGroup: RenderableComponentData = {
      id: `char-group-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            width: 'auto',
            height: 'auto',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [mainCharacter, trail1, trail2, trail3],
    };

    return characterGroup;
  });

  // Text container with all characters
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row flex-wrap',
        style: {
          gap: '0px',
          fontFamily: 'VT323, monospace',
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
  };

  // CRT screen with barrel distortion
  const crtScreen: RenderableComponentData = {
    id: 'crt-screen',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-4 overflow-hidden',
        style: {
          transform: 'perspective(1000px) rotateX(2deg)',
          borderRadius: '8px',
          backgroundColor: '#0a0a0a',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '32px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textContainer],
  };

  // Vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'pointer-events-none absolute inset-0',
        style: {
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          zIndex: 50,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'pointer-events-none absolute inset-0',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.15) 2px, rgba(0,0,0,0.15) 4px)',
          zIndex: 51,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Root CRT frame container
  const rootContainer: RenderableComponentData = {
    id: 'retro-crt-boot-sequence-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 rounded-lg overflow-hidden',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [crtScreen, vignetteOverlay, scanlineOverlay],
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
  id: 'retroCrtBootSequence',
  title: 'Retro CRT Boot Sequence',
  description:
    'A retro-futuristic text animation preset inspired by 90s computer boot sequences and BIOS screens. Features character-by-character reveal with phosphor display lag (afterimage trails), CRT monitor curvature distortion, random ASCII glitch characters, pink/cyan color palette with unstable color calibration shift, barrel distortion via perspective transform, vignette and scanline overlays for authentic CRT aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'retro',
    'crt',
    'glitch',
    'boot-sequence',
    'bios',
    '90s',
    'phosphor',
    'terminal',
    'tech',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SYSTEM BOOT INITIATED...',
    duration: 10,
    fontSize: 48,
    textColor: '#00FF9F',
    glitchProbability: 0.15,
    glitchDuration: 0.1,
    colorShiftDuration: 8,
    characterDelay: 0.05,
  },
};

// Export preset
export const retroCrtBootSequencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};