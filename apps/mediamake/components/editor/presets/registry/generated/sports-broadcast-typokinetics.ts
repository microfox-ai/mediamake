/**
 * Sports Broadcast Typokinetics Preset
 *
 * Ultra-dynamic typokinetics preset inspired by sports broadcast graphics and extreme sports montages.
 * Features breaking-news ticker urgency with flash-in words, bass-triggered earthquake shaking,
 * elastic spring scaling with overshoot bounce, speed lines, motion blur effects, and dynamic color
 * transitions including fire effects for high-impact moments. Perfect for sports highlights, action
 * content, and high-energy promotional videos.
 *
 * Features:
 * - Flash-in word entrances with urgency
 * - Bass distortion earthquake shaking (violent container oscillation ±20px)
 * - Elastic spring scaling with overshoot (damping: 0.4, stiffness: 180, mass: 1.2)
 * - Motion lines and speed blur effects for velocity feel
 * - Dynamic color transitions from white to team colors
 * - Fire effects (orange/yellow gradient + glow) for high-impact moments (impact > 0.9)
 * - Audio-reactive waveform effects with sensitivity: 3.0
 * - Optional swoosh sound effects at word transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with words and metadata'),

  font: z
    .string()
    .default('Impact:900')
    .describe(
      'Font family with optional weight and style (e.g., "Impact:900", "BebasNeue:700")',
    ),

  fontSize: z
    .number()
    .default(96)
    .describe('Base font size in pixels for text'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (white by default)'),

  teamColor: z
    .string()
    .default('#FF0000')
    .describe('Team color for dynamic transitions'),

  earthquakeIntensity: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .describe('Earthquake shake intensity multiplier'),

  springDamping: z
    .number()
    .default(0.4)
    .describe('Spring damping for elastic scaling'),

  springStiffness: z
    .number()
    .default(180)
    .describe('Spring stiffness for elastic scaling'),

  springMass: z.number().default(1.2).describe('Spring mass for elastic scaling'),

  enableFireEffect: z
    .boolean()
    .default(true)
    .describe('Enable fire effect for high-impact words (impact > 0.9)'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for waveform-based earthquake effect'),

  waveformSensitivity: z
    .number()
    .default(3.0)
    .describe('Waveform sensitivity for aggressive audio response'),

  enableSwooshAudio: z
    .boolean()
    .default(false)
    .describe('Enable swoosh sound effects at word transitions'),

  swooshAudioSrc: z
    .string()
    .optional()
    .describe('URL to swoosh sound effect audio file'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    teamColor,
    earthquakeIntensity,
    springDamping,
    springStiffness,
    springMass,
    enableFireEffect,
    audioSrc,
    waveformSensitivity,
    enableSwooshAudio,
    swooshAudioSrc,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Impact:900';
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

  // Helper: Generate random value within ±range
  const randomOffset = (range: number): number => {
    return (Math.random() - 0.5) * 2 * range;
  };

  // Calculate total duration
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 10;

  // --- Build Motion Lines (5 horizontal lines animated with translateX) ---
  const motionLines: RenderableComponentData[] = [
    { top: '20%', width: '150px', delay: 0 },
    { top: '40%', width: '120px', delay: 0.1 },
    { top: '60%', width: '180px', delay: 0.2 },
    { top: '75%', width: '100px', delay: 0.15 },
    { top: '85%', width: '140px', delay: 0.25 },
  ].map((line, index) => ({
    id: `motion-line-${index}`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute h-0.5 bg-white opacity-60',
        style: {
          top: line.top,
          left: '-200px',
          width: line.width,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `motion-line-effect-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: line.delay,
          duration: 1.5,
          mode: 'provider',
          targetIds: [`motion-line-${index}`],
          ranges: [
            { key: 'translateX', val: '-200px', prog: 0 },
            { key: 'translateX', val: '2000px', prog: 1 },
          ],
        },
      },
    ],
  }));

  // --- Build Word Components for Each Caption ---
  const allWords: RenderableComponentData[] = [];

  captions.forEach((caption) => {
    const captionImpact = caption.metadata?.impact ?? 1.0;
    const isHighImpact = captionImpact > 0.9 && enableFireEffect;

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${caption.id}-${wordIndex}`;
      const wordDuration = word.end - word.start;

      // Speed blur duplicate (scale-x-150, opacity-30, blur-sm)
      const speedBlurId = `speed-blur-${caption.id}-${wordIndex}`;
      const speedBlurText: RenderableComponentData = {
        id: speedBlurId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className:
            'absolute scale-x-150 opacity-30 blur-sm font-black italic text-8xl uppercase tracking-tight',
          style: {
            color: textColor,
            fontSize: `${fontSize}px`,
            ...fontStyle,
            pointerEvents: 'none',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['900'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: wordDuration,
          },
        },
        effects: [
          {
            id: `speed-blur-fade-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: 0.2,
              mode: 'provider',
              targetIds: [speedBlurId],
              ranges: [
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      // Main text with elastic spring scaling + color transition + fire effect
      const mainTextEffects: any[] = [];

      // Flash-in entrance (fast fade + scale)
      mainTextEffects.push({
        id: `flash-in-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.1,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      });

      // Elastic spring scaling with overshoot
      mainTextEffects.push({
        id: `elastic-scale-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0.05,
          duration: 0.5,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.15, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
          props: {
            damping: springDamping,
            stiffness: springStiffness,
            mass: springMass,
          },
        },
      });

      // Dynamic color transition (white to team color)
      mainTextEffects.push({
        id: `color-transition-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'color', val: textColor, prog: 0 },
            { key: 'color', val: teamColor, prog: 1 },
          ],
        },
      });

      // Fire effect for high-impact words (orange/yellow gradient + glow)
      if (isHighImpact) {
        mainTextEffects.push({
          id: `fire-effect-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              {
                key: 'filter',
                val: 'drop-shadow(0 0 0px rgba(255,165,0,0))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0 0 20px rgba(255,165,0,1)) drop-shadow(0 0 40px rgba(255,69,0,0.8))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0 0 10px rgba(255,165,0,0.5))',
                prog: 1,
              },
            ],
          },
        });
      }

      const mainText: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'font-black italic text-8xl uppercase tracking-tight',
          style: {
            color: textColor,
            fontSize: `${fontSize}px`,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['900'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: wordDuration,
          },
        },
        effects: mainTextEffects,
      };

      // Word container (contains speed blur + main text)
      const wordContainer: RenderableComponentData = {
        id: `word-container-${caption.id}-${wordIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: wordDuration,
          },
        },
        childrenData: [speedBlurText, mainText] as RenderableComponentData[],
      };

      allWords.push(wordContainer);
    });
  });

  // --- Text Stack Container (all word containers) ---
  const textStackContainer: RenderableComponentData = {
    id: 'text-stack-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center gap-2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allWords as RenderableComponentData[],
  };

  // --- Earthquake Container (shakes violently on bass distortion) ---
  const earthquakeEffects: any[] = [];

  if (audioSrc) {
    // Waveform-based shake effect (aggressive bass response)
    earthquakeEffects.push({
      id: 'earthquake-shake',
      componentId: 'waveform',
      data: {
        audioSrc,
        effectType: 'shake',
        intensity: 20 * earthquakeIntensity,
        shakeAxis: 'both',
        audioProperty: 'bass',
        sensitivity: waveformSensitivity,
        threshold: 0.1,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: ['earthquake-container'],
        start: 0,
        duration: totalDuration,
        smoothNormalisation: 0,
      },
    });
  } else {
    // Fallback: Generic rapid oscillation effect (±20px random)
    const shakeRanges: any[] = [];
    const shakeSteps = 20;
    for (let i = 0; i <= shakeSteps; i++) {
      const prog = i / shakeSteps;
      shakeRanges.push({
        key: 'translateX',
        val: `${randomOffset(20 * earthquakeIntensity)}px`,
        prog,
      });
      shakeRanges.push({
        key: 'translateY',
        val: `${randomOffset(20 * earthquakeIntensity)}px`,
        prog,
      });
    }
    earthquakeEffects.push({
      id: 'earthquake-shake-fallback',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: totalDuration,
        mode: 'provider',
        targetIds: ['earthquake-container'],
        ranges: shakeRanges,
      },
    });
  }

  const earthquakeContainer: RenderableComponentData = {
    id: 'earthquake-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: earthquakeEffects,
    childrenData: [textStackContainer] as RenderableComponentData[],
  };

  // --- Motion Lines Container ---
  const motionLinesContainer: RenderableComponentData = {
    id: 'motion-lines-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: motionLines as RenderableComponentData[],
  };

  // --- Swoosh Audio (optional) ---
  const swooshAudio: RenderableComponentData[] = [];
  if (enableSwooshAudio && swooshAudioSrc) {
    // Note: In a real implementation, you would trigger swoosh audio at each word transition
    // For simplicity, we add one audio track here
    swooshAudio.push({
      id: 'swoosh-audio',
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: swooshAudioSrc,
        volume: 0.7,
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    });
  }

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'sports-broadcast-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-radial from-gray-800 to-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      motionLinesContainer,
      earthquakeContainer,
      ...swooshAudio,
    ] as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'sports-broadcast-typokinetics',
  title: 'Sports Broadcast Typokinetics',
  description:
    'Ultra-dynamic typokinetics preset inspired by sports broadcast graphics and extreme sports montages. Features breaking-news ticker urgency with flash-in words, bass-triggered earthquake shaking, elastic spring scaling with overshoot bounce, speed lines, motion blur effects, and dynamic color transitions including fire effects for high-impact moments. Perfect for sports highlights, action content, and high-energy promotional videos.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'sports',
    'broadcast',
    'extreme',
    'high-energy',
    'dynamic',
    'earthquake',
    'elastic',
    'spring',
    'motion-lines',
    'speed-blur',
    'fire-effect',
    'audio-reactive',
    'waveform',
  ],
  defaultInputParams: {
    captions: [],
    font: 'Impact:900',
    fontSize: 96,
    textColor: '#FFFFFF',
    teamColor: '#FF0000',
    earthquakeIntensity: 1.0,
    springDamping: 0.4,
    springStiffness: 180,
    springMass: 1.2,
    enableFireEffect: true,
    waveformSensitivity: 3.0,
    enableSwooshAudio: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const sportsBroadcastTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
