/**
 * Typokinetics Wind Tunnel Preset
 * 
 * This preset creates a dynamic wind tunnel effect where words start clustered at the left edge
 * and get blown across the screen with realistic wind physics. Features include:
 * 
 * - **Wind Tunnel Physics**: Words start clustered on the left and blow across to the right
 * - **Air Resistance**: Smaller words (fewer characters) move faster and more erratically than longer words
 * - **Flutter Motion**: Sine wave vertical movement creating paper-like flutter
 * - **Turbulence Effects**: Occasional spirals, loops, and chaotic tumbles with rotation
 * - **Wind Gusts**: Periodic synchronized boosts affecting all visible words
 * - **Paper Warping**: Subtle skew transforms creating paper-like bending as words move
 * - **Dynamic Timing**: Duration based on word length (shorter words = faster, longer words = slower)
 * 
 * Use cases:
 * - Creating kinetic typography with wind/air motion theme
 * - Building dynamic text animations with physics-based movement
 * - Adding organic, natural motion to text elements
 * - Creating engaging visual effects for titles and captions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time (relative to caption)'),
        end: z.number().describe('Relative end time'),
        duration: z.number().describe('Duration of caption'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start time (relative to caption)'),
            end: z.number().describe('Relative end time'),
            duration: z.number().describe('Duration of word'),
            absoluteStart: z.number().describe('Absolute start in caption timeline'),
            absoluteEnd: z.number().describe('Absolute end in caption timeline'),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            splitParts: z.array(z.string()).optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with words and timing data'),
  
  font: z
    .string()
    .optional()
    .default('Inter:600')
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  
  baseFontSize: z
    .number()
    .min(16)
    .max(80)
    .default(32)
    .describe('Base font size in pixels (adjusted per word based on length)'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  
  videoHeight: z
    .number()
    .default(1080)
    .describe('Video height in pixels (for positioning calculations)'),
  
  clusterRows: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of rows in the initial word cluster'),
  
  clusterSpacing: z
    .number()
    .min(30)
    .max(100)
    .default(60)
    .describe('Vertical spacing between cluster rows in pixels'),
  
  baselineDurationShort: z
    .number()
    .min(2)
    .max(5)
    .default(3)
    .describe('Duration in seconds for short words (< 5 characters)'),
  
  baselineDurationLong: z
    .number()
    .min(3)
    .max(8)
    .default(5)
    .describe('Duration in seconds for longer words (>= 5 characters)'),
  
  flutterAmplitude: z
    .number()
    .min(10)
    .max(60)
    .default(30)
    .describe('Vertical flutter amplitude in pixels'),
  
  flutterFrequency: z
    .number()
    .min(1)
    .max(6)
    .default(3)
    .describe('Number of flutter cycles during word journey'),
  
  turbulenceIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for turbulence effects (rotation, scale)'),
  
  gustInterval: z
    .number()
    .min(2)
    .max(6)
    .default(3.5)
    .describe('Time interval between wind gusts in seconds'),
  
  gustBoostMin: z
    .number()
    .min(10)
    .max(30)
    .default(15)
    .describe('Minimum gust boost in viewport width percentage'),
  
  gustBoostMax: z
    .number()
    .min(20)
    .max(40)
    .default(25)
    .describe('Maximum gust boost in viewport width percentage'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    baseFontSize,
    textColor,
    videoHeight,
    clusterRows,
    clusterSpacing,
    baselineDurationShort,
    baselineDurationLong,
    flutterAmplitude,
    flutterFrequency,
    turbulenceIntensity,
    gustInterval,
    gustBoostMin,
    gustBoostMax,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:600';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
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

  // Calculate cluster base Y position (40% of video height)
  const clusterBaseY = videoHeight * 0.4;

  // Helper function to get random offset
  const randomOffset = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function to calculate word weight (character length affects motion)
  const getWordWeight = (text: string): number => {
    return text.length;
  };

  // Helper function to calculate word duration based on length
  const calculateWordDuration = (wordLength: number): number => {
    if (wordLength < 5) {
      return baselineDurationShort;
    }
    return baselineDurationLong * (1 + wordLength * 0.05);
  };

  // Helper function to calculate gust times
  const calculateGustTimes = (maxDuration: number): number[] => {
    const gusts: number[] = [];
    let currentTime = gustInterval;
    while (currentTime < maxDuration) {
      gusts.push(currentTime);
      currentTime += gustInterval;
    }
    return gusts;
  };

  // Find max duration to determine gust timing
  const maxAbsoluteEnd = Math.max(
    ...captions.map(caption => caption.absoluteEnd)
  );
  const gustTimes = calculateGustTimes(maxAbsoluteEnd + 10); // Add buffer

  // Create word components with effects
  const allWordComponents: RenderableComponentData[] = [];
  let globalWordIndex = 0;

  captions.forEach((caption) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${caption.id}-${wordIndex}`;
      const wordLength = getWordWeight(word.text);
      const wordDuration = calculateWordDuration(wordLength);
      
      // Calculate position in cluster
      const rowIndex = globalWordIndex % clusterRows;
      const topPosition = clusterBaseY + rowIndex * clusterSpacing + randomOffset(-20, 20);
      
      // Calculate word-specific parameters
      const isSmallWord = wordLength < 5;
      const weightFactor = 1 / (1 + wordLength * 0.1); // Smaller words = higher factor
      
      // Flutter parameters
      const amplitude = isSmallWord ? flutterAmplitude + 10 : flutterAmplitude;
      const frequency = isSmallWord ? flutterFrequency + 1 : flutterFrequency;
      
      // Turbulence timing (random between 30-60% of duration)
      const turbulenceStart = wordDuration * randomOffset(0.3, 0.6);
      const turbulenceRotation = [180, 270, 360, -180][Math.floor(Math.random() * 4)] * turbulenceIntensity;
      const turbulenceScale = randomOffset(0.9, 1.1);
      
      // Font size based on word length
      const fontSize = baseFontSize + (wordLength > 8 ? 8 : wordLength > 5 ? 4 : 0);

      // Create effects array
      const effects: any[] = [];

      // 1. Base motion X (0 to 120vw)
      effects.push({
        id: `wind-base-motion-x-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: '120vw', prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 2. Flutter Y (sine wave)
      const flutterRanges: any[] = [];
      const steps = 20; // Number of keyframes for smooth sine wave
      for (let i = 0; i <= steps; i++) {
        const prog = i / steps;
        const angle = frequency * prog * 2 * Math.PI;
        const yOffset = amplitude * Math.sin(angle);
        flutterRanges.push({ key: 'translateY', val: yOffset, prog });
      }
      
      effects.push({
        id: `wind-flutter-y-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: flutterRanges,
        } as GenericEffectData,
      });

      // 3. Turbulence rotation
      effects.push({
        id: `turbulence-rotation-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: turbulenceStart,
          duration: 0.8,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: turbulenceRotation, prog: 0.5 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 4. Turbulence scale wobble
      effects.push({
        id: `turbulence-scale-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: turbulenceStart,
          duration: 0.6,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: turbulenceScale, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // 5. Wind gusts (synchronized)
      gustTimes.forEach((gustTime, gustIndex) => {
        // Check if word is visible during this gust
        const wordAbsoluteStart = caption.absoluteStart + word.start;
        const wordAbsoluteEnd = wordAbsoluteStart + wordDuration;
        
        if (gustTime >= wordAbsoluteStart && gustTime < wordAbsoluteEnd) {
          // Gust timing relative to word start
          const relativeGustStart = gustTime - wordAbsoluteStart;
          const gustBoost = (isSmallWord ? gustBoostMax : gustBoostMin) * weightFactor;
          
          effects.push({
            id: `wind-gust-${gustIndex}-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: relativeGustStart,
              duration: 0.5,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'translateX', val: `${gustBoost}vw`, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          });
        }
      });

      // 6. Paper warp skewX
      const skewXRanges: any[] = [];
      const skewSteps = 15;
      for (let i = 0; i <= skewSteps; i++) {
        const prog = i / skewSteps;
        const angle = 3 * prog * 2 * Math.PI;
        const skewValue = 2 * Math.sin(angle);
        skewXRanges.push({ key: 'skewX', val: `${skewValue}deg`, prog });
      }
      
      effects.push({
        id: `paper-warp-skewX-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: wordDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: skewXRanges,
        } as GenericEffectData,
      });

      // 7. Paper warp skewY (offset for alternating effect)
      const skewYRanges: any[] = [];
      for (let i = 0; i <= skewSteps; i++) {
        const prog = i / skewSteps;
        const angle = 2 * prog * 2 * Math.PI;
        const skewValue = 1.5 * Math.sin(angle);
        skewYRanges.push({ key: 'skewY', val: `${skewValue}deg`, prog });
      }
      
      effects.push({
        id: `paper-warp-skewY-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.15,
          duration: wordDuration - 0.15,
          mode: 'provider',
          targetIds: [wordId],
          ranges: skewYRanges,
        } as GenericEffectData,
      });

      // 8. Fade in
      effects.push({
        id: `fade-in-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // Create word component
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute transform-gpu will-change-transform',
            style: {
              left: '0px',
              top: `${topPosition}px`,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart + word.start,
            duration: wordDuration,
          },
        },
        effects,
        childrenData: [
          {
            id: `text-${wordId}`,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight || 600,
                fontStyle: fontStyle.fontStyle || 'normal',
                color: textColor,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['600'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: wordDuration,
              },
            },
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;

      allWordComponents.push(wordComponent);
      globalWordIndex++;
    });
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-wind-tunnel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: allWordComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokineticsWindTunnel',
  title: 'Typokinetics Wind Tunnel',
  description:
    'Dynamic kinetic typography preset where words start clustered at the left edge and get blown across the screen with wind tunnel physics. Features varying intensities for chaotic flutter vs smooth glide, turbulence effects with spirals and loops, air resistance where smaller words move faster and more erratically than longer words, periodic wind gusts affecting all visible words simultaneously, and subtle paper-like warping effects. Words exhibit realistic wind physics with translateX motion, sine wave flutter, rotation tumbles, scale wobbles, and skew-based warping.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'wind-tunnel',
    'physics',
    'air-resistance',
    'flutter',
    'turbulence',
    'wind-gust',
    'paper-warp',
    'dynamic',
    'motion',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Hello World',
        start: 0,
        end: 5,
        duration: 5,
        absoluteStart: 0,
        absoluteEnd: 5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            end: 2.5,
            duration: 2.5,
            absoluteStart: 0,
            absoluteEnd: 2.5,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'World',
            start: 2.5,
            end: 5,
            duration: 2.5,
            absoluteStart: 2.5,
            absoluteEnd: 5,
            confidence: 1,
          },
        ],
      },
    ],
    font: 'Inter:600',
    baseFontSize: 32,
    textColor: '#ffffff',
    videoHeight: 1080,
    clusterRows: 5,
    clusterSpacing: 60,
    baselineDurationShort: 3,
    baselineDurationLong: 5,
    flutterAmplitude: 30,
    flutterFrequency: 3,
    turbulenceIntensity: 1,
    gustInterval: 3.5,
    gustBoostMin: 15,
    gustBoostMax: 25,
  },
};

// Export preset
export const typokineticsWindTunnelPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};