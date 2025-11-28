/**
 * Elastic Bounce Typography Preset
 *
 * Features:
 * - Explosive elastic bounce effects with squash-and-stretch physics
 * - Each word/letter springs into view with cartoonish quality
 * - Scales dramatically from 0 to 120% before settling at 100% with multiple bounces
 * - Vibrant animated gradients that shift colors during bounce animation
 * - Rainbow gel effect that flows through text as it bounces
 * - Staggered cascading delays between words creating a domino effect
 * - Playful and energetic timing with wobble rotation
 *
 * Use Cases:
 * - Dynamic title reveals with playful energy
 * - Attention-grabbing text animations for social media
 * - Cartoonish text effects for kids content
 * - High-energy promotional text overlays
 * - Fun and vibrant typography for creative projects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().optional().describe('Plain text string to display with bounce effects'),
  captions: z.array(z.any()).optional().describe('Array of caption objects with word-level timing data'),
  font: z.string().default('Inter:700').describe('Font family with optional weight and style (e.g., "Inter:700", "BebasNeue:800")'),
  fontSize: z.number().default(64).describe('Base font size in pixels'),
  baseColor: z.string().default('#9333ea').describe('Starting gradient color (purple by default)'),
  accentColor: z.string().default('#ec4899').describe('Middle gradient color (pink by default)'),
  endColor: z.string().default('#eab308').describe('Ending gradient color (yellow by default)'),
  wordSpacing: z.number().default(16).describe('Gap between words in pixels'),
  bounceDuration: z.number().default(0.8).describe('Duration of the bounce animation in seconds'),
  bounceIntensity: z.number().min(0.1).max(2).default(1).describe('Intensity multiplier for bounce effect (0.1-2)'),
  staggerDelay: z.number().default(0.15).describe('Delay between each word animation in seconds'),
  enableWobble: z.boolean().default(true).describe('Enable rotation wobble effect during bounce'),
  enableGradientAnimation: z.boolean().default(true).describe('Enable color-shifting gradient animation'),
  position: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center').describe('Position of text on screen'),
  containerPadding: z.number().default(40).describe('Padding around the text container in pixels'),
});

// Main execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Parse font string
  const parseFontString = (fontString: string): { family: string; weight?: number; style?: string } => {
    const parts = fontString.split(':');
    const family = parts[0] || 'Inter';
    const weight = parts[1] ? parseInt(parts[1], 10) : undefined;
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };

  // Helper function: Get words from text or captions
  const getWords = (): Array<{ text: string; start: number; duration: number }> => {
    if (params.captions && params.captions.length > 0) {
      // Use caption data with word-level timing
      const allWords: Array<{ text: string; start: number; duration: number }> = [];
      params.captions.forEach((caption: any) => {
        if (caption.words && Array.isArray(caption.words)) {
          caption.words.forEach((word: any) => {
            allWords.push({
              text: word.text,
              start: word.start, // Relative timing
              duration: word.duration,
            });
          });
        }
      });
      return allWords;
    } else if (params.text) {
      // Plain text: split by spaces and use index-based stagger
      const words = params.text.split(/\s+/).filter(w => w.length > 0);
      return words.map((word, index) => ({
        text: word,
        start: index * params.staggerDelay,
        duration: params.bounceDuration,
      }));
    }
    return [];
  };

  // Helper function: Calculate total duration
  const calculateTotalDuration = (words: Array<{ start: number; duration: number }>): number => {
    if (words.length === 0) return params.bounceDuration;
    const lastWord = words[words.length - 1];
    return lastWord.start + lastWord.duration + params.bounceDuration;
  };

  // Helper function: Get position classes
  const getPositionClasses = (): string => {
    switch (params.position) {
      case 'top':
        return 'absolute top-0 inset-x-0 flex flex-wrap items-start justify-center';
      case 'bottom':
        return 'absolute bottom-0 inset-x-0 flex flex-wrap items-end justify-center';
      case 'left':
        return 'absolute inset-y-0 left-0 flex flex-wrap items-center justify-start';
      case 'right':
        return 'absolute inset-y-0 right-0 flex flex-wrap items-center justify-end';
      case 'center':
      default:
        return 'absolute inset-0 flex flex-wrap items-center justify-center';
    }
  };

  // Parse font
  const fontConfig = parseFontString(params.font);
  const fontFamily = fontConfig.family;
  const fontWeight = fontConfig.weight || 700;
  const fontStyle = fontConfig.style || 'normal';

  // Get words
  const words = getWords();
  const totalDuration = calculateTotalDuration(words);

  // Build gradient string
  const gradientString = `linear-gradient(to right, ${params.baseColor}, ${params.accentColor}, ${params.endColor})`;

  // Create word components
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const wordContainerId = `word-container-${index}`;

    // Create elastic bounce effect
    const elasticBounceEffect: GenericEffectData = {
      type: 'spring',
      start: 0,
      duration: params.bounceDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1.2 * params.bounceIntensity, prog: 0.3 },
        { key: 'scale', val: 0.9, prog: 0.5 },
        { key: 'scale', val: 1.1 * params.bounceIntensity, prog: 0.65 },
        { key: 'scale', val: 0.95, prog: 0.8 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    // Create wobble rotation effect (if enabled)
    const wobbleRotationEffect: GenericEffectData | null = params.enableWobble ? {
      type: 'ease-in-out',
      start: 0,
      duration: params.bounceDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'rotate', val: -5, prog: 0 },
        { key: 'rotate', val: 5, prog: 0.25 },
        { key: 'rotate', val: -2, prog: 0.5 },
        { key: 'rotate', val: 2, prog: 0.75 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    } : null;

    // Create gradient hue-rotate effect (if enabled)
    const gradientHueRotateEffect: GenericEffectData | null = params.enableGradientAnimation ? {
      type: 'linear',
      start: 0,
      duration: 2,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
        { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
      ],
    } : null;

    // Collect all effects
    const effects: any[] = [
      { id: `elastic-bounce-${index}`, componentId: 'generic', data: elasticBounceEffect },
    ];
    if (wobbleRotationEffect) {
      effects.push({ id: `wobble-rotation-${index}`, componentId: 'generic', data: wobbleRotationEffect });
    }
    if (gradientHueRotateEffect) {
      effects.push({ id: `gradient-hue-rotate-${index}`, componentId: 'generic', data: gradientHueRotateEffect });
    }

    // Create TextAtom with gradient
    const textAtomData: TextAtomData = {
      text: word.text,
      className: 'bg-gradient-to-r from-purple-500 via-pink-500 to-yellow-500 bg-clip-text text-transparent font-bold',
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontWeight,
        fontStyle: fontStyle as any,
        willChange: 'transform, filter',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
        subsets: ['latin'],
        display: 'swap',
      },
      gradient: gradientString,
    };

    const textAtom: RenderableComponentData = {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: textAtomData,
      context: {
        timing: {
          start: 0,
          duration: word.duration,
        },
      },
    };

    // Create word container
    const wordContainer: RenderableComponentData = {
      id: wordContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            willChange: 'transform',
          },
        },
      },
      context: {
        timing: {
          start: word.start,
          duration: word.duration,
        },
      },
      effects,
      childrenData: [textAtom],
    };

    return wordContainer;
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'elastic-bounce-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: getPositionClasses(),
        style: {
          gap: `${params.wordSpacing}px`,
          padding: `${params.containerPadding}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'elastic-bounce-typography',
  title: 'Elastic Bounce Typography',
  description: 'Dynamic typography preset featuring explosive elastic bounce effects with vibrant animated gradients. Each word springs into view with cartoonish squash-and-stretch physics, scaling dramatically from 0 to 120% before settling at 100% with multiple bounces. Features flowing rainbow gradients that shift colors during animation, with staggered cascading timing for a playful, energetic feel.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'bounce', 'elastic', 'gradient', 'animated', 'playful', 'energetic', 'cartoonish', 'text', 'dynamic'],
  dependencies: {},
  defaultInputParams: {
    text: 'EXPLOSIVE BOUNCE',
    font: 'Inter:700',
    fontSize: 64,
    baseColor: '#9333ea',
    accentColor: '#ec4899',
    endColor: '#eab308',
    wordSpacing: 16,
    bounceDuration: 0.8,
    bounceIntensity: 1,
    staggerDelay: 0.15,
    enableWobble: true,
    enableGradientAnimation: true,
    position: 'center',
    containerPadding: 40,
  },
};

// Export
export const elasticBounceTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
