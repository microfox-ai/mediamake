/**
 * Lyrical Cross-Fade Transition with Kinetic Typography
 *
 * This preset creates a sophisticated A/B roll cross-fade transition between two lyrical text lines,
 * emulating professional video editing software's dissolve technique. The preset handles two caption
 * lines as if they're on separate video tracks, with smooth opacity-based transitions and a brief
 * moment of superimposition during the cross-fade overlap.
 *
 * Features:
 * - **A/B Roll Cross-Fade**: Two text tracks with overlapping opacity transitions (Track A: 1→0, Track B: 0→1)
 * - **Kinetic Typography**: Subtle word-level micro-movements (scale pulses and gentle rotations)
 * - **Blur During Transition**: Adds dreamy quality at transition peak (0px → 4px → 0px)
 * - **Caption-Based Timing**: Uses sentence boundaries from caption data for optimal cross-fade point
 * - **Adjustable Overlap**: Default 0.75s cross-fade duration, fully configurable
 * - **Professional Feel**: Smooth ease-in-out easing for all transitions
 *
 * Use cases:
 * - Lyrical video content with smooth text transitions
 * - Professional video editing-style text dissolves
 * - Music videos with flowing caption changes
 * - Cinematic text presentations with kinetic energy
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  caption1: z
    .object({
      text: z.string().describe('First caption text (Track A)'),
      start: z.number().describe('Relative start time of first caption'),
      duration: z.number().describe('Duration of first caption'),
      absoluteStart: z
        .number()
        .describe('Absolute start time in video timeline'),
      words: z
        .array(
          z.object({
            text: z.string(),
            start: z.number(),
            duration: z.number(),
          }),
        )
        .optional()
        .describe('Optional word-level timing data'),
    })
    .describe('First caption data (fades out during transition)'),

  caption2: z
    .object({
      text: z.string().describe('Second caption text (Track B)'),
      start: z.number().describe('Relative start time of second caption'),
      duration: z.number().describe('Duration of second caption'),
      absoluteStart: z
        .number()
        .describe('Absolute start time in video timeline'),
      words: z
        .array(
          z.object({
            text: z.string(),
            start: z.number(),
            duration: z.number(),
          }),
        )
        .optional()
        .describe('Optional word-level timing data'),
    })
    .describe('Second caption data (fades in during transition)'),

  crossfadeDuration: z
    .number()
    .min(0.1)
    .max(3)
    .default(0.75)
    .describe('Duration of cross-fade overlap in seconds (default: 0.75s)'),

  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),

  font: z
    .string()
    .default('Inter:600')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:600", "Roboto:700")',
    ),

  textColor: z.string().default('#ffffff').describe('Text color (hex or CSS)'),

  kineticIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for kinetic micro-movements (0-2)'),

  enableKinetics: z
    .boolean()
    .default(true)
    .describe('Enable kinetic word-level micro-animations'),

  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(4)
    .describe('Maximum blur amount during transition peak (px)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---
const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    caption1,
    caption2,
    crossfadeDuration,
    fontSize,
    font,
    textColor,
    kineticIntensity,
    enableKinetics,
    blurIntensity,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Create text component with kinetic effects
  const createTextComponent = (
    id: string,
    caption: PresetParams['caption1'] | PresetParams['caption2'],
    isTrackA: boolean,
  ): RenderableComponentData => {
    // Split text into words
    const words = caption.text.split(/\s+/).filter((w) => w.length > 0);

    // Create word components with kinetic effects
    const wordComponents: RenderableComponentData[] = words.map(
      (word, index) => {
        const wordId = `${id}-word-${index}`;

        // Word-level timing (if available)
        const wordData = caption.words?.[index];
        const wordStart = wordData?.start ?? 0;
        const wordDuration = wordData?.duration ?? caption.duration / words.length;

        // Kinetic effects (scale pulse and gentle rotation)
        const kineticEffects: any[] = [];

        if (enableKinetics && kineticIntensity > 0) {
          // Scale pulse effect (0.98 → 1.02 → 0.98)
          const scalePulseFrequency = 1.5; // seconds per cycle
          const scalePulses = Math.ceil(wordDuration / scalePulseFrequency);

          for (let i = 0; i < scalePulses; i++) {
            const pulseStart = wordStart + i * scalePulseFrequency;
            const pulseDuration = Math.min(
              scalePulseFrequency,
              caption.duration - pulseStart,
            );

            if (pulseDuration > 0) {
              kineticEffects.push({
                id: `${wordId}-scale-pulse-${i}`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: pulseStart,
                  duration: pulseDuration,
                  mode: 'provider',
                  targetIds: [wordId],
                  ranges: [
                    {
                      key: 'scale',
                      val: 0.98 + (1 - kineticIntensity) * 0.02,
                      prog: 0,
                    },
                    {
                      key: 'scale',
                      val: 1.02 * kineticIntensity + (1 - kineticIntensity),
                      prog: 0.5,
                    },
                    {
                      key: 'scale',
                      val: 0.98 + (1 - kineticIntensity) * 0.02,
                      prog: 1,
                    },
                  ],
                },
              });
            }
          }

          // Gentle rotation effect (-1deg → 1deg → -1deg)
          const rotateFrequency = 2; // seconds per cycle
          const rotateCycles = Math.ceil(wordDuration / rotateFrequency);

          for (let i = 0; i < rotateCycles; i++) {
            const rotateStart = wordStart + i * rotateFrequency;
            const rotateDuration = Math.min(
              rotateFrequency,
              caption.duration - rotateStart,
            );

            if (rotateDuration > 0) {
              kineticEffects.push({
                id: `${wordId}-rotate-${i}`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: rotateStart,
                  duration: rotateDuration,
                  mode: 'provider',
                  targetIds: [wordId],
                  ranges: [
                    { key: 'rotate', val: -1 * kineticIntensity, prog: 0 },
                    { key: 'rotate', val: 1 * kineticIntensity, prog: 0.5 },
                    { key: 'rotate', val: -1 * kineticIntensity, prog: 1 },
                  ],
                },
              });
            }
          }
        }

        return {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              fontWeight: fontStyle.fontWeight || 600,
              marginRight: '0.3em',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['600'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: kineticEffects,
        } as RenderableComponentData;
      },
    );

    // Container for words
    return {
      id: `${id}-text`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row flex-wrap items-center justify-center',
          style: {
            gap: `${fontSize * 0.1}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  };

  // Track A: First caption (fades out)
  const trackAId = 'crossfade-track-a';
  const trackAText = createTextComponent(trackAId, caption1, true);

  // Track A container with fade-out and blur effects
  const trackAContainer: RenderableComponentData = {
    id: trackAId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption1.duration,
      },
    },
    childrenData: [trackAText],
    effects: [
      // Fade out during cross-fade
      {
        id: `${trackAId}-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: caption1.duration - crossfadeDuration,
          duration: crossfadeDuration,
          mode: 'provider',
          targetIds: [trackAId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Blur during transition peak
      {
        id: `${trackAId}-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: caption1.duration - crossfadeDuration,
          duration: crossfadeDuration,
          mode: 'provider',
          targetIds: [trackAId],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Track B: Second caption (fades in)
  const trackBId = 'crossfade-track-b';
  const trackBText = createTextComponent(trackBId, caption2, false);

  // Track B starts at overlap point (caption1.duration - crossfadeDuration)
  const trackBStart = caption1.duration - crossfadeDuration;

  // Track B container with fade-in and blur effects
  const trackBContainer: RenderableComponentData = {
    id: trackBId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: trackBStart,
        duration: caption2.duration,
      },
    },
    childrenData: [trackBText],
    effects: [
      // Fade in during cross-fade
      {
        id: `${trackBId}-fade-in`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: crossfadeDuration,
          mode: 'provider',
          targetIds: [trackBId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Blur during transition peak
      {
        id: `${trackBId}-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: crossfadeDuration,
          mode: 'provider',
          targetIds: [trackBId],
          ranges: [
            { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0 },
            { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container duration: caption1 + caption2 - crossfadeDuration
  const rootDuration = caption1.duration + caption2.duration - crossfadeDuration;

  // Root container (relative positioning parent)
  const rootContainer: RenderableComponentData = {
    id: 'crossfade-lyrical-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: caption1.absoluteStart,
        duration: rootDuration,
      },
    },
    childrenData: [trackAContainer, trackBContainer],
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
  id: 'crossfadeLyricalTransition',
  title: 'Lyrical Cross-Fade Transition with Kinetic Typography',
  description:
    'Professional A/B roll cross-fade transition preset that smoothly dissolves between two lyrical text lines with opacity-based transitions, subtle blur during the transition peak, and kinetic micro-animations (scale pulses and gentle rotations) on individual words. Uses caption data with sentence boundaries to determine optimal cross-fade timing. Emulates professional video editing software\'s dissolve technique with adjustable overlap duration (default 0.75s).',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'crossfade',
    'transition',
    'lyrical',
    'kinetic',
    'typography',
    'dissolve',
    'a-b-roll',
    'professional',
    'captions',
  ],
  defaultInputParams: {
    caption1: {
      text: 'The first line fades away',
      start: 0,
      duration: 3,
      absoluteStart: 0,
      words: [
        { text: 'The', start: 0, duration: 0.5 },
        { text: 'first', start: 0.5, duration: 0.5 },
        { text: 'line', start: 1, duration: 0.5 },
        { text: 'fades', start: 1.5, duration: 0.75 },
        { text: 'away', start: 2.25, duration: 0.75 },
      ],
    },
    caption2: {
      text: 'As the second line appears',
      start: 0,
      duration: 3,
      absoluteStart: 2.25,
      words: [
        { text: 'As', start: 0, duration: 0.3 },
        { text: 'the', start: 0.3, duration: 0.3 },
        { text: 'second', start: 0.6, duration: 0.6 },
        { text: 'line', start: 1.2, duration: 0.5 },
        { text: 'appears', start: 1.7, duration: 1.3 },
      ],
    },
    crossfadeDuration: 0.75,
    fontSize: 48,
    font: 'Inter:600',
    textColor: '#ffffff',
    kineticIntensity: 1,
    enableKinetics: true,
    blurIntensity: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const crossfadeLyricalTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
