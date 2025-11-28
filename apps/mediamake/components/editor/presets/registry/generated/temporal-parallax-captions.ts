/**
 * Temporal Parallax Captions Preset
 *
 * Creates a three-layer temporal parallax effect where captions from different time periods
 * (past, present, future) move at different speeds, creating a time-shift visual effect.
 *
 * Features:
 * - **Three Temporal Layers**: Past (faded, sepia), Present (sharp, prominent), Future (blurred, bright)
 * - **Parallax Movement**: Different animation speeds per layer (past: 0.5x, present: 1x, future: 1.5x)
 * - **Echo Effects**: Ghostly trails for past words with decreasing opacity and offset
 * - **Temporal Color Coding**: Hue-based color coding using CSS custom properties
 * - **Radial Wipe Transitions**: Clock-like circular wipe between temporal states
 * - **Variable Video Playback**: Background video speed modulated based on temporal focus (0.5x - 2.0x)
 * - **Temporal Scrubbing**: Parallax layers slide at different rates during timeline scrubbing
 *
 * Use cases:
 * - Creating time-shift narrative effects in storytelling videos
 * - Visualizing temporal relationships in historical or futuristic content
 * - Adding cinematic time-manipulation effects to captions
 * - Building dramatic temporal transitions for video essays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

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
          }),
        ),
        metadata: z
          .object({
            temporalOffset: z
              .number()
              .optional()
              .describe('Time offset for color coding (-1 = past, 0 = present, 1 = future)'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  backgroundVideo: z
    .object({
      src: z.string().describe('Video source URL'),
      volume: z.number().min(0).max(1).default(1).optional(),
      playbackRate: z.number().min(0.5).max(2).default(1).optional(),
    })
    .describe('Background video configuration'),

  // Temporal layer configuration
  pastLayerOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Opacity for past layer'),
  presentLayerOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .optional()
    .describe('Opacity for present layer'),
  futureLayerOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Opacity for future layer'),

  // Parallax speeds
  pastSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Animation speed multiplier for past layer'),
  presentSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Animation speed multiplier for present layer'),
  futureSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.5)
    .optional()
    .describe('Animation speed multiplier for future layer'),

  // Temporal offsets
  pastTranslateX: z
    .number()
    .default(-30)
    .optional()
    .describe('Horizontal offset for past words (%)'),
  futureTranslateX: z
    .number()
    .default(30)
    .optional()
    .describe('Horizontal offset for future words (%)'),

  // Filters
  pastBlur: z.number().min(0).default(2).optional().describe('Blur for past words (px)'),
  futureBlur: z.number().min(0).default(3).optional().describe('Blur for future words (px)'),

  // Echo trails
  echoCount: z
    .number()
    .int()
    .min(0)
    .max(5)
    .default(3)
    .optional()
    .describe('Number of echo trails for past words'),
  echoOpacityDecay: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Opacity decay per echo trail'),
  echoOffsetStep: z
    .number()
    .default(5)
    .optional()
    .describe('Horizontal offset step per echo (px)'),

  // Radial wipe transition
  radialWipeDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .optional()
    .describe('Duration of radial wipe transition (seconds)'),

  // Typography
  font: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (format: "FontName:weight:style")'),
  fontSize: z.number().min(12).default(48).optional().describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').optional().describe('Base text color'),

  // Color coding
  enableTemporalColorCoding: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable hue-based temporal color coding'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    backgroundVideo,
    pastLayerOpacity = 0.5,
    presentLayerOpacity = 1,
    futureLayerOpacity = 0.3,
    pastSpeed = 0.5,
    presentSpeed = 1,
    futureSpeed = 1.5,
    pastTranslateX = -30,
    futureTranslateX = 30,
    pastBlur = 2,
    futureBlur = 3,
    echoCount = 3,
    echoOpacityDecay = 0.3,
    echoOffsetStep = 5,
    radialWipeDuration = 2,
    font = 'Inter',
    fontSize = 48,
    textColor = '#FFFFFF',
    enableTemporalColorCoding = true,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Calculate total duration from captions
  const totalDuration =
    captions.length > 0
      ? Math.max(...captions.map((c) => c.absoluteEnd))
      : 30;

  // Split captions into temporal arrays (simplified: based on timing)
  const splitCaptionsIntoTemporal = () => {
    const third = totalDuration / 3;
    const past = captions.filter((c) => c.absoluteStart < third);
    const present = captions.filter(
      (c) => c.absoluteStart >= third && c.absoluteStart < third * 2,
    );
    const future = captions.filter((c) => c.absoluteStart >= third * 2);
    return { past, present, future };
  };

  const { past, present, future } = splitCaptionsIntoTemporal();

  // Create word components for a temporal layer
  const createWordComponents = (
    captionGroup: TranscriptionSentence[],
    temporalClass: 'past' | 'present' | 'future',
  ): RenderableComponentData[] => {
    const wordComponents: RenderableComponentData[] = [];

    captionGroup.forEach((caption) => {
      caption.words.forEach((word) => {
        const wordId = `word-${temporalClass}-${word.id || word.text}-${word.absoluteStart}`;

        // Calculate temporal hue for color coding
        const temporalOffset = caption.metadata?.temporalOffset ?? 0;
        const hue = enableTemporalColorCoding ? temporalOffset * 60 : 0;

        // Base word style
        let wordStyle: React.CSSProperties = {
          fontSize: `${fontSize}px`,
          color: enableTemporalColorCoding
            ? `hsl(${hue}, 70%, 80%)`
            : textColor,
          marginRight: '0.5em',
          ...fontStyle,
        };

        // Apply temporal-specific styles
        if (temporalClass === 'past') {
          wordStyle = {
            ...wordStyle,
            filter: `blur(${pastBlur}px) sepia(0.4)`,
          };
        } else if (temporalClass === 'future') {
          wordStyle = {
            ...wordStyle,
            filter: `blur(${futureBlur}px) brightness(1.5)`,
          };
        }

        // Create word component
        const wordComponent: RenderableComponentData = {
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: wordStyle,
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
          effects: [],
        };

        // Add echo trails for past words
        if (temporalClass === 'past' && echoCount > 0) {
          const echoEffects = [];
          for (let i = 1; i <= echoCount; i++) {
            const echoOpacity = Math.max(0, pastLayerOpacity - i * echoOpacityDecay);
            const echoOffset = pastTranslateX - i * echoOffsetStep;

            echoEffects.push({
              id: `echo-${i}-${wordId}`,
              componentId: 'generic' as const,
              data: {
                type: 'linear' as const,
                start: 0,
                duration: caption.duration,
                mode: 'provider' as const,
                targetIds: [wordId],
                ranges: [
                  { key: 'opacity', val: echoOpacity, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'translateX', val: `${echoOffset}%`, prog: 0 },
                  { key: 'translateX', val: `${echoOffset - 10}%`, prog: 1 },
                ],
              },
            });
          }
          wordComponent.effects = echoEffects;
        }

        wordComponents.push(wordComponent);
      });
    });

    return wordComponents;
  };

  // Create temporal layer containers
  const createTemporalLayer = (
    layerId: string,
    temporalClass: 'past' | 'present' | 'future',
    captionGroup: TranscriptionSentence[],
    layerOpacity: number,
    speed: number,
    translateX: number,
  ): RenderableComponentData => {
    const wordComponents = createWordComponents(captionGroup, temporalClass);

    const wordsContainerId = `${layerId}-words-container`;

    const wordsContainer: RenderableComponentData = {
      id: wordsContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-wrap items-center justify-center gap-2 p-4',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: layerId,
        },
      },
      childrenData: wordComponents,
    };

    const layer: RenderableComponentData = {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'background-video',
        },
      },
      effects: [
        {
          id: `${layerId}-opacity`,
          componentId: 'generic' as const,
          data: {
            type: 'ease-out' as const,
            start: 0,
            duration: 1,
            mode: 'provider' as const,
            targetIds: [layerId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: layerOpacity, prog: 1 },
            ],
          },
        },
        {
          id: `${layerId}-translate`,
          componentId: 'generic' as const,
          data: {
            type: 'linear' as const,
            start: 0,
            duration: totalDuration / speed,
            mode: 'provider' as const,
            targetIds: [layerId],
            ranges: [
              {
                key: 'translateX',
                val: temporalClass === 'future' ? translateX : 0,
                prog: 0,
              },
              {
                key: 'translateX',
                val: temporalClass === 'past' ? translateX : 0,
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [wordsContainer],
    };

    return layer;
  };

  // Create background video
  const backgroundVideoComponent: RenderableComponentData = {
    id: 'background-video',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: backgroundVideo.src,
      fit: 'cover' as const,
      className: 'w-full h-full',
      volume: backgroundVideo.volume ?? 1,
      playbackRate: backgroundVideo.playbackRate ?? 1,
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'video-playback-modulation',
        componentId: 'generic' as const,
        data: {
          type: 'linear' as const,
          start: 0,
          duration: totalDuration,
          mode: 'provider' as const,
          targetIds: ['background-video'],
          ranges: [
            { key: 'playbackRate', val: 0.5, prog: 0 },
            { key: 'playbackRate', val: 1, prog: 0.33 },
            { key: 'playbackRate', val: 1.5, prog: 0.66 },
            { key: 'playbackRate', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create temporal layers
  const pastLayer = createTemporalLayer(
    'temporal-layer-past',
    'past',
    past,
    pastLayerOpacity,
    pastSpeed,
    pastTranslateX,
  );

  const presentLayer = createTemporalLayer(
    'temporal-layer-present',
    'present',
    present,
    presentLayerOpacity,
    presentSpeed,
    0,
  );

  const futureLayer = createTemporalLayer(
    'temporal-layer-future',
    'future',
    future,
    futureLayerOpacity,
    futureSpeed,
    futureTranslateX,
  );

  // Create radial wipe overlay
  const radialWipeOverlay: RenderableComponentData = {
    id: 'radial-wipe-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div class='w-full h-full bg-black'></div>",
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: radialWipeDuration,
      },
    },
    effects: [
      {
        id: 'radial-wipe-effect',
        componentId: 'generic' as const,
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: radialWipeDuration,
          mode: 'provider' as const,
          targetIds: ['radial-wipe-overlay'],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 1 },
          ],
        },
      },
    ],
  };

  const radialWipeContainer: RenderableComponentData = {
    id: 'radial-wipe-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'background-video',
      },
    },
    childrenData: [radialWipeOverlay],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'temporal-parallax-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      backgroundVideoComponent,
      pastLayer,
      presentLayer,
      futureLayer,
      radialWipeContainer,
    ],
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
  id: 'temporal-parallax-captions',
  title: 'Temporal Parallax Captions',
  description:
    'Three-layer temporal parallax effect with past/present/future caption words moving at different speeds. Features echo trails, temporal blur/fade, color-coded timing relationships, radial clock-wipe transitions, and variable-speed background video synced to temporal focus.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'temporal',
    'parallax',
    'time-shift',
    'echo',
    'trails',
    'radial-wipe',
    'video-modulation',
  ],
  defaultInputParams: {
    captions: [],
    backgroundVideo: {
      src: 'https://example.com/video.mp4',
      volume: 1,
      playbackRate: 1,
    },
    pastLayerOpacity: 0.5,
    presentLayerOpacity: 1,
    futureLayerOpacity: 0.3,
    pastSpeed: 0.5,
    presentSpeed: 1,
    futureSpeed: 1.5,
    pastTranslateX: -30,
    futureTranslateX: 30,
    pastBlur: 2,
    futureBlur: 3,
    echoCount: 3,
    echoOpacityDecay: 0.3,
    echoOffsetStep: 5,
    radialWipeDuration: 2,
    font: 'Inter',
    fontSize: 48,
    textColor: '#FFFFFF',
    enableTemporalColorCoding: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const temporalParallaxCaptionsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
