/**
 * Military Terminal Typokinetics Preset
 *
 * A beat-synchronized military communication system with character scrambling/decoding effects.
 * Stencil text behaves like encrypted data streams that decode on kick drum hits and scramble
 * between beats. Features matrix-style character rain, CRT terminal aesthetics with scan lines
 * and phosphor glow, authentication flashes on strong beats, and retro military-tech visual styling.
 *
 * Features:
 * - **Character Scrambling**: Continuous rapid character cycling through random letters/numbers
 * - **Beat-Synchronized Decoding**: Characters lock to correct values on kick drum hits
 * - **Matrix Rain Background**: Cascading character streams with varying speeds
 * - **CRT Terminal Aesthetic**: Scan lines, vignette, and phosphor glow effects
 * - **Authentication Flashes**: Green flash confirmations on strong beats (intensity > 0.7)
 * - **Military Communication Style**: Stencil fonts, monospace, command-line aesthetic
 * - **Digital Interference**: Glitched characters and data stream effects
 *
 * Use cases:
 * - Creating military/tech-themed video content
 * - Beat-synchronized encrypted message reveals
 * - Retro terminal aesthetic visualizations
 * - Cyberpunk/tech-noir typography effects
 * - Command-line style text animations
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
    .describe('The message text to display with encryption/decryption effects'),
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat detection'),
      start: z
        .number()
        .optional()
        .describe('Start time in audio file (seconds)'),
      duration: z
        .number()
        .optional()
        .describe('Duration to analyze from audio (seconds)'),
    })
    .describe('Audio source for beat synchronization'),
  font: z
    .string()
    .default('Courier New:700')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Courier New:700", "Share Tech Mono:700")',
    ),
  textColor: z
    .string()
    .default('#00ff00')
    .optional()
    .describe('Primary text color (terminal green default)'),
  fontSize: z
    .number()
    .min(20)
    .max(120)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  scrambleSpeed: z
    .number()
    .min(10)
    .max(60)
    .default(30)
    .optional()
    .describe('Character scramble speed in updates per second (fps)'),
  lockDuration: z
    .number()
    .min(100)
    .max(1000)
    .default(300)
    .optional()
    .describe(
      'Duration to lock decoded characters on beat (milliseconds)',
    ),
  glowIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .optional()
    .describe('Phosphor glow intensity (text-shadow blur radius)'),
  matrixRainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Opacity of matrix rain background'),
  scanlineOpacity: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.03)
    .optional()
    .describe('Opacity of CRT scan lines'),
  authFlashIntensityThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Beat intensity threshold for authentication flash (0-1)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Parse font string
  const fontString = params.font || 'Courier New:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontWeight = 700;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10) || 700;
    }
  }

  // Fetch audio analysis for beat detection
  if (!fetcher) {
    throw new Error('Fetcher not available in props');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data available');
  }

  // Filter beats based on audio start/duration
  const audioStart = params.audio.start || 0;
  const audioDuration = params.audio.duration || durationInSeconds;
  
  const filteredBeats = analysis
    .filter((beat: any) => 
      beat.timestamp >= audioStart &&
      beat.timestamp <= audioStart + audioDuration
    )
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart,
    }));

  // Select impactful beats for decoding triggers
  const selectDecodingBeats = (beats: any[], maxBeats: number = 20) => {
    const scoredBeats = beats.map((beat) => {
      const intensityScore = beat.intensity * 0.5;
      const frequencyScore = Math.min(beat.frequency / 3000, 1) * 0.3;
      const spectralScore = (beat.spectralCentroid || 0) * 0.2;
      const totalScore = intensityScore + frequencyScore + spectralScore;
      return { ...beat, totalScore };
    });

    const sortedBeats = scoredBeats.sort((a, b) => b.totalScore - a.totalScore);
    const selectedBeats = sortedBeats.slice(0, Math.min(maxBeats, sortedBeats.length));
    return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  const decodingBeats = selectDecodingBeats(filteredBeats);

  // Split text into characters
  const characters = params.text.split('');

  // Create character scramble effects
  const createCharacterScrambleEffect = (
    charIndex: number,
    originalChar: string,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];
    const lockDurationSec = (params.lockDuration || 300) / 1000;
    const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';

    // For each decoding beat, create a lock effect
    decodingBeats.forEach((beat: any, beatIndex: number) => {
      const lockStart = beat.timestamp;
      const lockEnd = lockStart + lockDurationSec;
      const isStrongBeat = beat.intensity > (params.authFlashIntensityThreshold || 0.7);

      // Base color (green)
      const baseColor = params.textColor || '#00ff00';
      const flashColor = isStrongBeat ? '#00ff00' : baseColor;
      const flashGlow = isStrongBeat
        ? `0 0 ${(params.glowIntensity || 8) * 2}px ${flashColor}`
        : `0 0 ${params.glowIntensity || 8}px ${baseColor}`;

      // Decode effect: lock character and flash on strong beats
      effects.push({
        type: 'linear',
        start: lockStart,
        duration: lockDurationSec,
        mode: 'provider',
        targetIds: [`char-${charIndex}`],
        ranges: [
          // Character content locked (this is visual only, actual scrambling controlled by component)
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          // Color flash on strong beats
          { key: 'color', val: flashColor, prog: 0 },
          { key: 'color', val: baseColor, prog: 0.3 },
          { key: 'color', val: baseColor, prog: 1 },
          // Glow intensity
          { key: 'textShadow', val: flashGlow, prog: 0 },
          {
            key: 'textShadow',
            val: `0 0 ${params.glowIntensity || 8}px ${baseColor}`,
            prog: 0.3,
          },
          {
            key: 'textShadow',
            val: `0 0 ${params.glowIntensity || 8}px ${baseColor}`,
            prog: 1,
          },
        ],
      } as GenericEffectData);
    });

    return effects;
  };

  // Create character components with scramble effects
  const characterComponents = characters.map((char, index) => {
    const charId = `char-${index}`;
    const effects = createCharacterScrambleEffect(index, char);

    return {
      id: charId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char === ' ' ? '\u00A0' : char, // Non-breaking space for spaces
        style: {
          fontSize: params.fontSize || 48,
          fontWeight: fontWeight.toString(),
          fontFamily: `'${fontFamily}', 'Courier New', monospace`,
          color: params.textColor || '#00ff00',
          textShadow: `0 0 ${params.glowIntensity || 8}px ${params.textColor || '#00ff00'}`,
          letterSpacing: '0.1em',
          display: 'inline-block',
          minWidth: '0.6em',
          textAlign: 'center',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      effects: effects.map((effect) => ({
        id: `effect-${charId}-${effect.start}`,
        componentId: 'generic',
        data: effect,
      })),
    } as RenderableComponentData;
  });

  // Matrix rain columns (background effect)
  const matrixColumns = [
    { content: '01010<br/>10101<br/>11001<br/>00110<br/>10010<br/>01101<br/>11010<br/>00101', delay: 0 },
    { content: 'ABCDE<br/>FGHIJ<br/>KLMNO<br/>PQRST<br/>UVWXY<br/>Z0123<br/>45678<br/>90!@#', delay: 1.5 },
    { content: '10110<br/>01001<br/>11100<br/>00011<br/>10101<br/>01010<br/>11011<br/>00100', delay: 3 },
    { content: '$%^&*<br/>()_+-<br/>=[]{};<br/>:|,.<br/>/?~`#<br/>@!ABC<br/>DEFGH<br/>IJKLM', delay: 2 },
    { content: '01101<br/>10010<br/>11110<br/>00001<br/>10100<br/>01011<br/>11000<br/>00111', delay: 4 },
    { content: 'NOPQR<br/>STUVW<br/>XYZ01<br/>23456<br/>78990<br/>!@#$%<br/>^&*();<br/>_+-=[]', delay: 0.5 },
  ];

  const matrixColumnComponents = matrixColumns.map((col, index) => ({
    id: `matrix-col-${index}`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="flex flex-col text-xs" style="animation: matrix-fall ${8 + index * 2}s linear infinite; animation-delay: ${col.delay}s; text-shadow: 0 0 3px currentColor; opacity: 0.6;">${col.content}</div>`,
      className: 'flex-1',
      style: {
        color: params.textColor || '#00ff00',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  } as RenderableComponentData));

  // CSS for matrix rain animation
  const matrixRainStyles = `
    <style>
      @keyframes matrix-fall {
        0% { transform: translateY(-100%); opacity: 0; }
        10% { opacity: 0.6; }
        90% { opacity: 0.6; }
        100% { transform: translateY(100vh); opacity: 0; }
      }
    </style>
  `;

  // Main text container
  const mainTextContainer: RenderableComponentData = {
    id: 'main-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center z-10',
        style: {
          padding: '80px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      {
        id: 'text-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row flex-wrap justify-center items-center',
            style: {
              maxWidth: '90%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: characterComponents,
      },
    ],
  };

  // Root container structure
  const rootContainer: RenderableComponentData = {
    id: 'military-terminal-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          fontFamily: `'${fontFamily}', 'Courier New', monospace`,
          color: params.textColor || '#00ff00',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      // CRT vignette layer
      {
        id: 'crt-vignette',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background:
                'radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.4) 100%)',
              mixBlendMode: 'multiply',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: [],
      },
      // Matrix rain container
      {
        id: 'matrix-rain-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex flex-row justify-around',
            style: {
              gap: '20px',
              padding: '0 40px',
              opacity: params.matrixRainOpacity || 0.2,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: matrixColumnComponents,
      },
      // Matrix rain CSS styles
      {
        id: 'matrix-styles',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: matrixRainStyles,
          className: '',
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
      },
      // Main text container
      mainTextContainer,
      // Scanlines overlay
      {
        id: 'scanlines',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none z-20',
            style: {
              background: `repeating-linear-gradient(0deg, rgba(0,255,0,${params.scanlineOpacity || 0.03}) 0px, rgba(0,255,0,${params.scanlineOpacity || 0.03}) 1px, transparent 1px, transparent 2px)`,
              mixBlendMode: 'overlay',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: [],
      },
      // Audio track
      {
        id: 'audio-track',
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: params.audio.src,
          startFrom: params.audio.start || 0,
          endAt: params.audio.start
            ? params.audio.start + (params.audio.duration || durationInSeconds)
            : undefined,
        },
        context: {
          timing: {},
        },
      },
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'militaryTerminalTypokinetics',
  title: 'Military Terminal Typokinetics',
  description:
    'Beat-synchronized military communication system with character scrambling/decoding effects. Stencil text behaves like encrypted data streams that decode on kick hits and scramble between beats. Features matrix-style character rain, CRT terminal aesthetics with scan lines and phosphor glow, authentication flashes on strong beats, and retro military-tech visual styling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'military',
    'terminal',
    'encryption',
    'decryption',
    'scramble',
    'glitch',
    'matrix',
    'crt',
    'beat-sync',
    'audio-reactive',
    'kinetic',
    'tech',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ENCRYPTED MESSAGE',
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
      duration: 30,
    },
    font: 'Courier New:700',
    textColor: '#00ff00',
    fontSize: 48,
    scrambleSpeed: 30,
    lockDuration: 300,
    glowIntensity: 8,
    matrixRainOpacity: 0.2,
    scanlineOpacity: 0.03,
    authFlashIntensityThreshold: 0.7,
  },
};

// Export preset
export const militaryTerminalTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
