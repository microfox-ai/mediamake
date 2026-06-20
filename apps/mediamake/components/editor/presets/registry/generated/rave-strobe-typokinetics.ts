/**
 * Rave Strobe Typokinetics Preset
 *
 * High-energy underground rave-inspired word flash preset with aggressive strobe effects,
 * bass-reactive text distortion, crash-zoom scaling, and chromatic aberration. Words flash
 * rapidly (2-4 frames) like warehouse party strobes. Bass frequencies warp text geometry
 * simulating turbulent displacement. Sharp scaling punches words toward viewer at 300-500%
 * with spring overshoot. Uses word-level caption timing with impact metadata to modulate
 * effect intensity. Chaotic yet rhythmic visual representation of drum and bass energy.
 *
 * Features:
 * - **Strobe Flash Effects**: Words flash rapidly with 2-4 frame durations (0.08-0.16s)
 * - **Bass Distortion**: Text warps via scaleX oscillation triggered by bass frequencies (20-250Hz)
 * - **Crash Zoom Scaling**: Aggressive 300-500% scale with overshoot spring easing
 * - **Chromatic Aberration**: RGB split with red/cyan ghost layers
 * - **Impact-Based Intensity**: High impact words (>0.7) receive stronger effects
 * - **Word-Level Timing**: Each word triggers independent flash and effect cycle
 *
 * Use cases:
 * - Music videos with drum and bass / electronic music
 * - Underground rave / warehouse party visuals
 * - High-energy social media content
 * - Glitch art / digital distortion effects
 * - Action-packed promotional videos
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/remotion';

// --- PARAMS SCHEMA ---

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
          })
          .optional(),
      }),
    )
    .describe('Array of captions with word-level timing and impact metadata'),

  audioSrc: z
    .string()
    .optional()
    .describe(
      'Audio source URL or ref:componentId for bass-reactive distortion effects',
    ),

  font: z
    .string()
    .default('Impact')
    .describe(
      'Font family with optional weight and style (e.g., "Impact:900", "BebasNeue")',
    ),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),

  glowColor: z
    .string()
    .default('#ff00ff')
    .describe('Neon glow color for text shadow (hex or rgba)'),

  fontSize: z
    .number()
    .min(24)
    .max(400)
    .default(120)
    .describe('Base font size in pixels'),

  strobeIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Strobe effect intensity multiplier'),

  distortionIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Bass distortion effect intensity multiplier'),

  zoomIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Crash zoom effect intensity multiplier'),

  chromaticAberrationOffset: z
    .number()
    .min(1)
    .max(20)
    .default(6)
    .describe('Chromatic aberration offset in pixels'),
});

// --- EXECUTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const fps = props.config?.fps || 30;

  // Parse font string
  const fontString = params.font || 'Impact';
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

  const childrenData: RenderableComponentData[] = [];

  // --- Generate word components for each caption ---
  params.captions.forEach((caption, captionIndex) => {
    const captionImpact = caption.metadata?.impact ?? 1.0;

    caption.words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;

      // Calculate impact-based intensity
      const wordImpact = captionImpact;
      const isHighImpact = wordImpact > 0.7;

      // --- Strobe Flash Effect ---
      // 2-4 frames duration (0.08-0.16s at 24fps, 0.067-0.133s at 30fps)
      const flashFrames = isHighImpact ? 2 : 3;
      const flashDuration = flashFrames / fps;

      const strobeEffect: GenericEffectData = {
        type: 'linear',
        start: word.start,
        duration: word.duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          {
            key: 'opacity',
            val: 1,
            prog: Math.min(flashDuration / word.duration, 0.5),
          },
          {
            key: 'opacity',
            val: 0,
            prog: Math.min(flashDuration / word.duration + 0.01, 0.51),
          },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      // --- Bass Distortion Effect (if audio provided) ---
      let distortionEffect: WaveformEffectData | GenericEffectData | undefined;
      if (params.audioSrc) {
        const distortionRange = isHighImpact ? [0.8, 1.2] : [0.9, 1.1];
        const distortionSensitivity =
          1.5 * params.distortionIntensity * wordImpact;

        distortionEffect = {
          audioSrc: params.audioSrc,
          audioProperty: 'bass',
          effectType: 'scale',
          intensity: (distortionRange[1] - distortionRange[0]) / 2,
          baseScale: (distortionRange[0] + distortionRange[1]) / 2,
          sensitivity: distortionSensitivity,
          threshold: 0.2,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / fps,
          mode: 'provider',
          targetIds: [wordId],
          start: word.start,
          duration: word.duration,
          smoothNormalisation: 0.5,
          // Custom scaleX distortion via ranges
          ranges: [
            { key: 'scaleX', val: distortionRange[0], prog: 0 },
            { key: 'scaleX', val: distortionRange[1], prog: 0.5 },
            { key: 'scaleX', val: distortionRange[0], prog: 1 },
          ],
        } as WaveformEffectData;
      } else {
        // Fallback to generic oscillation if no audio
        const distortionRange = isHighImpact ? [0.8, 1.2] : [0.9, 1.1];
        distortionEffect = {
          type: 'ease-in-out',
          start: word.start,
          duration: word.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scaleX', val: distortionRange[0], prog: 0 },
            { key: 'scaleX', val: distortionRange[1], prog: 0.5 },
            { key: 'scaleX', val: distortionRange[0], prog: 1 },
          ],
        } as GenericEffectData;
      }

      // --- Crash Zoom Effect ---
      const maxScale = isHighImpact ? 5 : 3; // 500% or 300%
      const zoomDuration = 0.15 * params.zoomIntensity;

      const crashZoomEffect: GenericEffectData = {
        type: 'spring',
        start: word.start,
        duration: Math.min(zoomDuration, word.duration * 0.5),
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: maxScale, prog: 0.3 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // --- Combine Effects ---
      const wordEffects = [
        {
          id: `${wordId}-strobe`,
          componentId: 'generic',
          data: strobeEffect,
        },
        {
          id: `${wordId}-distortion`,
          componentId: params.audioSrc ? 'waveform' : 'generic',
          data: distortionEffect,
        },
        {
          id: `${wordId}-zoom`,
          componentId: 'generic',
          data: crashZoomEffect,
        },
      ];

      // --- Word TextAtom Component ---
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            textShadow: `0 0 20px ${params.textColor}80, 0 0 40px ${params.glowColor}99`,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['400'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        effects: wordEffects,
      };

      childrenData.push(wordComponent);
    });
  });

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'rave-strobe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
        style: {
          willChange: 'transform, opacity, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration:
          params.captions.length > 0
            ? params.captions[params.captions.length - 1].absoluteEnd
            : 10,
      },
    },
    childrenData: [
      // Main word layer
      {
        id: 'word-layer-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
          repeatChildrenProps: {
            className: 'absolute top-1/2 left-1/2',
            style: {
              transform: 'translate(-50%, -50%)',
              willChange: 'transform, opacity, filter',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              params.captions.length > 0
                ? params.captions[params.captions.length - 1].absoluteEnd
                : 10,
          },
        },
        childrenData,
      },
      // Red chromatic aberration ghost layer
      {
        id: 'ghost-layer-red',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              opacity: 0.6,
              mixBlendMode: 'screen',
              filter: 'hue-rotate(0deg) saturate(2)',
            },
          },
          repeatChildrenProps: {
            className: 'absolute top-1/2 left-1/2',
            style: {
              transform: `translate(calc(-50% - ${params.chromaticAberrationOffset}px), -50%)`,
              willChange: 'transform, opacity, filter',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              params.captions.length > 0
                ? params.captions[params.captions.length - 1].absoluteEnd
                : 10,
          },
        },
        childrenData: childrenData.map((child) => ({
          ...child,
          id: `${child.id}-red-ghost`,
          effects: [],
        })),
      },
      // Cyan chromatic aberration ghost layer
      {
        id: 'ghost-layer-cyan',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              opacity: 0.6,
              mixBlendMode: 'screen',
              filter: 'hue-rotate(180deg) saturate(2)',
            },
          },
          repeatChildrenProps: {
            className: 'absolute top-1/2 left-1/2',
            style: {
              transform: `translate(calc(-50% + ${params.chromaticAberrationOffset}px), -50%)`,
              willChange: 'transform, opacity, filter',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration:
              params.captions.length > 0
                ? params.captions[params.captions.length - 1].absoluteEnd
                : 10,
          },
        },
        childrenData: childrenData.map((child) => ({
          ...child,
          id: `${child.id}-cyan-ghost`,
          effects: [],
        })),
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

// --- METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'rave-strobe-typokinetics',
  title: 'Rave Strobe Typokinetics',
  description:
    'High-energy underground rave-inspired word flash preset with aggressive strobe effects, bass-reactive text distortion, crash-zoom scaling, and chromatic aberration. Words flash rapidly (2-4 frames) like warehouse party strobes. Bass frequencies warp text geometry simulating turbulent displacement. Sharp scaling punches words toward viewer at 300-500% with spring overshoot. Uses word-level caption timing with impact metadata to modulate effect intensity. Chaotic yet rhythmic visual representation of drum and bass energy.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'rave',
    'strobe',
    'glitch',
    'bass-reactive',
    'chromatic-aberration',
    'high-energy',
    'drum-and-bass',
    'warehouse',
    'underground',
    'music',
    'distortion',
    'crash-zoom',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'UNDERGROUND RAVE',
        start: 0,
        absoluteStart: 0,
        end: 2,
        absoluteEnd: 2,
        duration: 2,
        words: [
          {
            id: 'word-1',
            text: 'UNDERGROUND',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'RAVE',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
            confidence: 1,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    audioSrc: '',
    font: 'Impact:900',
    textColor: '#ffffff',
    glowColor: '#ff00ff',
    fontSize: 120,
    strobeIntensity: 1,
    distortionIntensity: 1,
    zoomIntensity: 1,
    chromaticAberrationOffset: 6,
  },
};

// --- EXPORT ---

export const raveStrobeTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: presetParams,
};
