/**
 * Musical Typokinetic Preset
 *
 * This preset creates text lines that rise in sync with an implied beat pattern, resembling visual sheet music.
 * Each line bounces up from the bottom with a multi-stage motion (quick rise, brief hold, gentle settle), scale pulse,
 * and subtle rotation oscillation to feel alive and dynamic.
 *
 * Features:
 * - **Rhythmic Bounce Motion**: Multi-stage translateY with different easings per stage
 * - **Scale Pulse**: Synchronized with bounce timing (1.0 → 1.1 → 1.0)
 * - **Rotation Oscillation**: Subtle -1deg to 1deg rotation using sine wave
 * - **Musical Spacing**: Wider gaps every 4 lines (like measures in music)
 * - **Optional Audio Sync**: If audio data is available, sync rise timing to detected beats
 * - **Dynamic Stagger**: 0.4s stagger or audio beat-based timing
 *
 * Use cases:
 * - Music video lyric displays with rhythmic animations
 * - Dynamic text reveals synchronized to music
 * - Engaging social media content with beat-synced text
 * - Visual sheet music-style text presentations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
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
        words: z.array(z.any()).optional(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption/text lines to animate'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (hex or rgba)'),
  
  staggerDelay: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.4)
    .optional()
    .describe('Delay between each line animation (seconds)'),
  
  bounceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for bounce effect'),
  
  audio: z
    .object({
      src: z.string(),
      syncToBeats: z.boolean().default(false),
    })
    .optional()
    .describe('Optional audio source for beat synchronization'),
  
  bottomPadding: z
    .number()
    .min(0)
    .max(300)
    .default(80)
    .optional()
    .describe('Bottom padding from screen edge (pixels)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font = 'Inter:700',
    fontSize = 48,
    textColor = '#FFFFFF',
    staggerDelay = 0.4,
    bounceIntensity = 1,
    audio,
    bottomPadding = 80,
  } = params;

  const { fetcher } = props;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Check if we should sync to audio beats
  let beatTimestamps: number[] = [];
  if (audio?.syncToBeats && fetcher) {
    try {
      const { analysis } = await fetcher('/api/analyze-audio', {
        audioSrc: audio.src,
      });
      
      if (analysis && analysis.length > 0) {
        // Select high-intensity beats for line timing
        const sortedBeats = analysis
          .filter((beat: any) => beat.intensity > 0.3)
          .sort((a: any, b: any) => b.intensity - a.intensity)
          .slice(0, captions.length);
        
        beatTimestamps = sortedBeats
          .map((beat: any) => beat.timestamp)
          .sort((a: number, b: number) => a - b);
      }
    } catch (error) {
      console.warn('Audio analysis failed, falling back to stagger timing', error);
    }
  }

  // Helper: Create bounce effect for a line
  const createBounceEffect = (
    lineId: string,
    startTime: number,
    intensity: number,
  ) => {
    const bounceDuration = 0.6;
    const quickRiseDuration = 0.2;
    const holdDuration = 0.1;
    const settleDuration = 0.3;

    // Multi-stage translateY: 100% → -10% → 0
    const bounceEffect: GenericEffectData = {
      type: 'ease-out',
      start: startTime,
      duration: bounceDuration,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        // Quick rise (0-0.2s): 100% → -10%
        { key: 'translateY', val: '100%', prog: 0 },
        { key: 'translateY', val: '-10%', prog: quickRiseDuration / bounceDuration },
        // Brief hold at peak (0.2-0.3s): -10% → -10%
        { key: 'translateY', val: '-10%', prog: (quickRiseDuration + holdDuration) / bounceDuration },
        // Gentle settle (0.3-0.6s): -10% → 0
        { key: 'translateY', val: '0%', prog: 1 },
        
        // Scale pulse (1.0 → 1.1 → 1.0)
        { key: 'scale', val: 1.0, prog: 0 },
        { key: 'scale', val: 1.1, prog: quickRiseDuration / bounceDuration },
        { key: 'scale', val: 1.1, prog: (quickRiseDuration + holdDuration) / bounceDuration },
        { key: 'scale', val: 1.0, prog: 1 },
        
        // Fade in during rise
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: quickRiseDuration / bounceDuration },
      ],
    };

    return {
      id: `bounce-effect-${lineId}`,
      componentId: 'generic',
      data: bounceEffect,
    };
  };

  // Helper: Create rotation oscillation effect
  const createRotationEffect = (
    lineId: string,
    startTime: number,
    duration: number,
  ) => {
    const oscillationDuration = 2; // 2 second oscillation cycle
    const steps = 20;
    const ranges = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const angle = Math.sin(prog * Math.PI * 2) * 1; // -1deg to 1deg
      ranges.push({ key: 'rotate', val: angle, prog });
    }

    const rotationEffect: GenericEffectData = {
      type: 'linear',
      start: startTime,
      duration: oscillationDuration,
      mode: 'provider',
      targetIds: [lineId],
      ranges,
    };

    return {
      id: `rotation-effect-${lineId}`,
      componentId: 'generic',
      data: rotationEffect,
    };
  };

  // Build line components
  const lineComponents: RenderableComponentData[] = captions.map((caption, index) => {
    const lineId = `line-${index}`;
    const textId = `text-${index}`;
    
    // Determine start time (stagger or beat-synced)
    const startTime = beatTimestamps.length > 0 && beatTimestamps[index] !== undefined
      ? beatTimestamps[index]
      : index * staggerDelay;

    // Check if this is the 4th line (0-indexed: 3, 7, 11, etc.)
    const isFourthLine = (index + 1) % 4 === 0;
    const gapSize = isFourthLine ? 32 : 8; // 2rem vs 0.5rem

    // Create effects
    const bounceEffect = createBounceEffect(lineId, 0, bounceIntensity);
    const rotationEffect = createRotationEffect(lineId, 0.6, caption.duration - 0.6);

    return {
      id: lineId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex items-center justify-center',
          style: {
            marginBottom: `${gapSize}px`,
            transformOrigin: 'bottom center',
          },
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: caption.duration,
        },
      },
      effects: [bounceEffect, rotationEffect],
      childrenData: [
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: caption.text,
            className: 'text-4xl font-bold',
            style: {
              fontSize,
              color: textColor,
              transformOrigin: 'bottom center',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'musical-typokinetic-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col justify-end items-center',
        style: {
          paddingBottom: `${bottomPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: lineComponents,
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
  id: 'musicalTypokinetic',
  title: 'Musical Typokinetic Preset',
  description: 'Rhythmic text lines rising in sync with beat patterns like visual sheet music. Each line bounces up with multi-stage motion (quick rise, hold, settle), scale pulse, and rotation oscillation. Supports optional audio beat synchronization and musical spacing with wider gaps every 4 lines.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'music',
    'rhythm',
    'beat-sync',
    'bounce',
    'animated',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'line-0',
        text: 'First line rises',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
      },
      {
        id: 'line-1',
        text: 'Second line follows',
        start: 0.4,
        absoluteStart: 0.4,
        end: 3.4,
        absoluteEnd: 3.4,
        duration: 3,
      },
      {
        id: 'line-2',
        text: 'Third line joins',
        start: 0.8,
        absoluteStart: 0.8,
        end: 3.8,
        absoluteEnd: 3.8,
        duration: 3,
      },
      {
        id: 'line-3',
        text: 'Fourth line (wider gap)',
        start: 1.2,
        absoluteStart: 1.2,
        end: 4.2,
        absoluteEnd: 4.2,
        duration: 3,
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    staggerDelay: 0.4,
    bounceIntensity: 1,
    bottomPadding: 80,
  },
};

// Export preset
export const musicalTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
