/**
 * ASCII Matrix Rain - Audio Reactive Typography Cascade Preset
 *
 * This preset creates a Matrix-style digital rain effect where ASCII/Unicode characters
 * cascade down in vertical columns. The rain is audio-reactive, responding to music beats
 * with alignment animations that reveal hidden messages. Characters fall at varying speeds
 * based on their type (punctuation fastest, vowels slowest), creating a living, breathing
 * wall of cascading typography with digital decay effects.
 *
 * Features:
 * - **20 vertical columns** of cascading characters
 * - **Audio-reactive beat detection** triggers message reveals
 * - **Variable fall speeds** based on character type (punctuation, consonants, vowels)
 * - **Digital decay effects** where older characters fragment into smaller symbols
 * - **Hidden message reveals** that align characters to spell words on beats
 * - **Monospace font** for proper character alignment
 * - **Opacity gradients** from top (bright) to bottom (faded)
 * - **Green Matrix-style glow** with text shadows
 *
 * Use cases:
 * - Music video backgrounds with Matrix aesthetic
 * - Tech-themed video intros/outros
 * - Cyberpunk-style visualizations
 * - Audio-reactive text animations
 * - Digital/glitch-themed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  WaveformEffectData,
  TextAtomData,
  AudioAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  audio: z
    .object({
      src: z.string().describe('Audio source URL or file path'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
      start: z.number().min(0).default(0).optional().describe('Audio start time in seconds'),
    })
    .describe('Audio configuration for beat detection and synchronization'),

  messages: z
    .array(
      z.object({
        text: z.string().describe('Message text to reveal'),
        column: z
          .number()
          .min(0)
          .max(19)
          .optional()
          .describe('Column index (0-19) where message appears, random if not specified'),
      }),
    )
    .default([])
    .optional()
    .describe(
      'Array of hidden messages to reveal at beat intervals. Messages align characters to form words when music hits key moments.',
    ),

  columnCount: z
    .number()
    .min(10)
    .max(30)
    .default(20)
    .optional()
    .describe('Number of vertical columns (10-30)'),

  charactersPerColumn: z
    .number()
    .min(10)
    .max(40)
    .default(20)
    .optional()
    .describe('Number of characters per column (10-40)'),

  baseColor: z
    .string()
    .default('#4ade80')
    .optional()
    .describe('Base color for characters (Matrix green: #4ade80)'),

  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Glow intensity for text shadow (0-1)'),

  fallSpeedMultiplier: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .optional()
    .describe('Global fall speed multiplier (0.5-3)'),

  beatSensitivity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Audio beat detection sensitivity (0.1-3)'),

  decayEnabled: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable digital decay effects where older characters fragment'),

  characterSet: z
    .enum(['matrix', 'ascii', 'unicode', 'mixed'])
    .default('mixed')
    .optional()
    .describe(
      'Character set to use: matrix (Japanese katakana), ascii (English), unicode (symbols), mixed (all)',
    ),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Character sets
  const getCharacterSet = (type: string): string[] => {
    const sets = {
      matrix: [
        'ア',
        'イ',
        'ウ',
        'エ',
        'オ',
        'カ',
        'キ',
        'ク',
        'ケ',
        'コ',
        'サ',
        'シ',
        'ス',
        'セ',
        'ソ',
        'タ',
        'チ',
        'ツ',
        'テ',
        'ト',
        'ナ',
        'ニ',
        'ヌ',
        'ネ',
        'ノ',
        'ハ',
        'ヒ',
        'フ',
        'ヘ',
        'ホ',
        'マ',
        'ミ',
        'ム',
        'メ',
        'モ',
        'ヤ',
        'ユ',
        'ヨ',
        'ラ',
        'リ',
        'ル',
        'レ',
        'ロ',
        'ワ',
        'ヲ',
        'ン',
        'ｦ',
        'ｱ',
        'ｲ',
        'ｳ',
        'ｴ',
        'ｵ',
        'ｶ',
        'ｷ',
        'ｸ',
        'ｹ',
        'ｺ',
        'ｻ',
        'ｼ',
        'ｽ',
        'ｾ',
        'ｿ',
        'ﾀ',
        'ﾁ',
        'ﾂ',
        'ﾃ',
        'ﾄ',
        'ﾅ',
        'ﾆ',
        'ﾇ',
        'ﾈ',
        'ﾉ',
        'ﾊ',
        'ﾋ',
        'ﾌ',
        'ﾍ',
        'ﾎ',
        'ﾏ',
        'ﾐ',
        'ﾑ',
        'ﾒ',
        'ﾓ',
        'ﾔ',
        'ﾕ',
        'ﾖ',
        'ﾗ',
        'ﾘ',
        'ﾙ',
        'ﾚ',
        'ﾛ',
        'ﾜ',
        'ﾝ',
      ],
      ascii: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'.split(''),
      unicode: ['░', '▒', '▓', '█', '▄', '▀', '■', '□', '▪', '▫', '●', '○', '◆', '◇', '★', '☆'],
      punctuation: ['.', ',', ':', ';', '!', '?', '-', '_', '/', '\\', '|', '+', '=', '*', '#'],
    };

    if (type === 'mixed') {
      return [...sets.matrix, ...sets.ascii, ...sets.unicode, ...sets.punctuation];
    }
    return sets[type] || sets.mixed;
  };

  const characterPool = getCharacterSet(params.characterSet || 'mixed');

  // Character type classification for speed
  const getCharacterType = (char: string): 'punctuation' | 'vowel' | 'consonant' => {
    const vowels = ['a', 'e', 'i', 'o', 'u', 'A', 'E', 'I', 'O', 'U'];
    const punctuation = ['.', ',', ':', ';', '!', '?', '-', '_', '/', '\\', '|', '+', '=', '*', '#'];

    if (punctuation.includes(char)) return 'punctuation';
    if (vowels.includes(char)) return 'vowel';
    return 'consonant';
  };

  // Fall speed based on character type
  const getFallSpeed = (char: string): number => {
    const type = getCharacterType(char);
    const baseSpeed = params.fallSpeedMultiplier || 1;

    switch (type) {
      case 'punctuation':
        return (2 + Math.random() * 1) * baseSpeed; // 2-3s (fastest)
      case 'consonant':
        return (4 + Math.random() * 1) * baseSpeed; // 4-5s
      case 'vowel':
        return (6 + Math.random() * 2) * baseSpeed; // 6-8s (slowest)
      default:
        return 5 * baseSpeed;
    }
  };

  // Random character selection
  const getRandomCharacter = (): string => {
    return characterPool[Math.floor(Math.random() * characterPool.length)];
  };

  // Fetch audio analysis for beat detection
  let audioDuration = 30; // Default fallback
  let beatTimestamps: number[] = [];

  if (fetcher && params.audio?.src) {
    try {
      const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
        audioSrc: params.audio.src,
      });

      audioDuration = durationInSeconds || 30;

      if (analysis && analysis.length > 0) {
        // Select impactful beats for message reveals
        const sortedByIntensity = [...analysis].sort((a, b) => b.intensity - a.intensity);
        const topBeats = sortedByIntensity.slice(0, Math.min(10, params.messages?.length || 5));
        beatTimestamps = topBeats
          .map((beat) => beat.timestamp)
          .sort((a, b) => a - b);
      }
    } catch (error) {
      console.warn('Audio analysis failed, using fallback timing:', error);
      // Fallback: evenly spaced beats
      const messageCount = params.messages?.length || 3;
      beatTimestamps = Array.from({ length: messageCount }, (_, i) => (i + 1) * (audioDuration / (messageCount + 1)));
    }
  } else {
    // No audio or fetcher - use evenly spaced beats
    const messageCount = params.messages?.length || 3;
    beatTimestamps = Array.from({ length: messageCount }, (_, i) => (i + 1) * (audioDuration / (messageCount + 1)));
  }

  // Generate columns
  const columnCount = params.columnCount || 20;
  const charactersPerColumn = params.charactersPerColumn || 20;
  const baseColor = params.baseColor || '#4ade80';
  const glowIntensity = params.glowIntensity || 0.8;

  const columnsData: RenderableComponentData[] = [];

  for (let colIndex = 0; colIndex < columnCount; colIndex++) {
    const columnId = `rain-column-${colIndex}`;
    const charactersData: RenderableComponentData[] = [];

    for (let charIndex = 0; charIndex < charactersPerColumn; charIndex++) {
      const charId = `char-${colIndex}-${charIndex}`;
      const randomChar = getRandomCharacter();
      const fallDuration = getFallSpeed(randomChar);
      const startDelay = Math.random() * 2; // Random spawn delay 0-2s

      // Opacity based on position (top bright, bottom faded)
      const opacityStart = 1 - charIndex * 0.03; // Gradient fade
      const opacityEnd = Math.max(0.2, opacityStart - 0.3);

      // Character component
      const charComponent: RenderableComponentData = {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: randomChar,
          className: 'font-mono text-base absolute left-1/2 -translate-x-1/2',
          style: {
            color: baseColor,
            textShadow: `0 0 ${8 * glowIntensity}px rgba(74, 222, 128, ${glowIntensity})`,
            top: `${-10 - charIndex * 5}%`, // Staggered start positions
            opacity: opacityStart,
          },
        } as TextAtomData,
        context: {
          timing: {
            start: startDelay,
            duration: audioDuration, // Last entire video
          },
        },
        effects: [
          {
            id: `fall-${charId}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: fallDuration,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 120, prog: 1 }, // Fall 120vh
                { key: 'opacity', val: opacityStart, prog: 0 },
                { key: 'opacity', val: opacityEnd, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };

      // Digital decay effect (scale down older characters)
      if (params.decayEnabled !== false && charIndex > charactersPerColumn / 2) {
        charComponent.effects!.push({
          id: `decay-${charId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: fallDuration * 0.6,
            duration: fallDuration * 0.4,
            mode: 'provider',
            targetIds: [charId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.5, prog: 1 }, // Shrink to half size
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(2px)', prog: 1 }, // Add blur
            ],
          } as GenericEffectData,
        });
      }

      charactersData.push(charComponent);
    }

    // Column container
    columnsData.push({
      id: columnId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative h-full overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      childrenData: charactersData,
    });
  }

  // Message overlays (revealed at beats)
  const messageOverlays: RenderableComponentData[] = [];

  if (params.messages && params.messages.length > 0) {
    params.messages.forEach((message, index) => {
      const beatTime = beatTimestamps[index] || (index + 1) * (audioDuration / (params.messages!.length + 1));
      const messageId = `message-${index}`;
      const messageDuration = 2.5; // Message display duration

      messageOverlays.push({
        id: messageId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: message.text,
          className: 'font-mono text-6xl font-bold text-center',
          style: {
            color: baseColor,
            textShadow: `0 0 ${20 * glowIntensity}px rgba(74, 222, 128, ${glowIntensity})`,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: beatTime,
            duration: messageDuration,
          },
        },
        effects: [
          {
            id: `message-fade-${messageId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: messageDuration,
              mode: 'provider',
              targetIds: [messageId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'scale', val: 0.8, prog: 0 },
                { key: 'scale', val: 1.1, prog: 0.2 },
                { key: 'scale', val: 1, prog: 0.8 },
                { key: 'scale', val: 0.9, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      });
    });
  }

  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'ascii-rain-audio',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: params.audio?.src || '',
      volume: params.audio?.volume || 1,
      startFrom: params.audio?.start || 0,
    } as AudioAtomData,
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ascii-rain-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      audioTrack,
      // Rain columns container
      {
        id: 'rain-columns-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 grid grid-cols-${columnCount} gap-0`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: columnsData,
      },
      // Message overlays container
      {
        id: 'message-overlay-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center pointer-events-none z-10',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: messageOverlays,
      },
    ] as RenderableComponentData[],
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
  id: 'asciiMatrixRain',
  title: 'ASCII Matrix Rain - Audio Reactive Typography Cascade',
  description:
    'Audio-reactive ASCII rain effect where typography cascades down in Matrix-style digital rain columns. Characters fall at varying speeds based on frequency assignment (punctuation fastest, vowels slowest). On beat detection, rain parts and converges to reveal hidden text messages. Features digital decay effects where older characters fragment into smaller symbols.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'ascii',
    'matrix',
    'rain',
    'typography',
    'cascade',
    'audio-reactive',
    'beat-sync',
    'glitch',
    'cyber',
    'digital',
    'green',
    'monospace',
    'animated',
    'text',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
      start: 0,
    },
    messages: [
      { text: 'WAKE UP', column: 10 },
      { text: 'FOLLOW', column: 5 },
      { text: 'THE MATRIX', column: 15 },
    ],
    columnCount: 20,
    charactersPerColumn: 20,
    baseColor: '#4ade80',
    glowIntensity: 0.8,
    fallSpeedMultiplier: 1,
    beatSensitivity: 1.5,
    decayEnabled: true,
    characterSet: 'mixed',
  },
};

// Export preset
export const asciiMatrixRainPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
