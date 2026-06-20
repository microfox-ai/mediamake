/**
 * Datamosh Text Glitch Preset
 *
 * Creates a glitchy datamosh-style text effect that simulates digital video compression artifacts.
 * Features RGB channel separation (cyan, magenta, yellow), horizontal displacement, wave distortion,
 * frame drops, and VHS tracking error aesthetics. Each word gets its own randomized glitch timeline
 * with multi-layer approach for authentic video corruption effects.
 *
 * Features:
 * - **RGB Channel Separation**: Cyan, magenta, and yellow layers with independent displacement
 * - **Horizontal Displacement**: Random translateX jumps (-20px to 20px)
 * - **Wave Distortion**: ScaleX stretches (0.8 to 1.2) and skewX warps (-15deg to 15deg)
 * - **Frame Drops**: Sudden 1-2 frame disappearances with displaced returns
 * - **Neon Colors**: Cyan (#00ffff), magenta (#ff00ff), yellow (#ffff00) overlays
 * - **Blend Modes**: Mix-blend-screen and mix-blend-multiply for VHS aesthetic
 * - **Hard Cuts**: Steps(1) easing for digital glitch snaps
 * - **Elastic Snaps**: Cubic-bezier(0.68, -0.55, 0.265, 1.55) for snap-backs
 * - **Scanline Overlay**: Repeating gradient for authentic VHS tracking errors
 * - **GPU Acceleration**: Transform3d for smooth performance
 *
 * Use Cases:
 * - Tech content with digital glitch aesthetic
 * - Music videos with VHS corruption effects
 * - Social media content with datamosh style
 * - Creative video intros/outros with glitch transitions
 * - Cyberpunk or retro-tech themed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Caption text'),
        absoluteStart: z.number().describe('Absolute start time in seconds'),
        duration: z.number().describe('Caption duration in seconds'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z
                .number()
                .describe('Word start time relative to caption'),
              duration: z.number().describe('Word duration in seconds'),
            }),
          )
          .describe('Array of word objects with timing'),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),
  trackName: z
    .string()
    .default('datamosh-track')
    .describe('Unique name for this datamosh track'),
  fontSize: z
    .number()
    .default(64)
    .describe('Base font size in pixels for text'),
  font: z
    .string()
    .default('Inter:900')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Inter:900", "BebasNeue:700")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (white layer)'),
  cyanColor: z
    .string()
    .default('#00ffff')
    .describe('Cyan channel color for RGB separation'),
  magentaColor: z
    .string()
    .default('#ff00ff')
    .describe('Magenta channel color for RGB separation'),
  yellowColor: z
    .string()
    .default('#ffff00')
    .describe('Yellow channel color for RGB separation'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global intensity multiplier for all glitch effects (0.1-3)'),
  rgbSeparationIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity of RGB channel separation effect (0-2)'),
  frameDropProbability: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe(
      'Probability of frame drop effect per word (0 = never, 1 = always)',
    ),
  enableScanlines: z
    .boolean()
    .default(true)
    .describe('Enable VHS scanline overlay effect'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 900;

  // Helper: Generate random offset for staggered glitch timing
  const randomOffset = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Create RGB separation effect for a layer
  const createRGBSeparationEffect = (
    targetId: string,
    wordStart: number,
    direction: 'left' | 'right',
    intensity: number,
  ): GenericEffectData => {
    const displacement = direction === 'left' ? -18 : 22;
    const adjustedDisplacement = displacement * intensity;

    return {
      type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      start: wordStart + randomOffset(0, 0.2),
      duration: 0.25 * params.glitchIntensity,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: adjustedDisplacement, prog: 0.3 },
        { key: 'translateX', val: adjustedDisplacement * 0.44, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        {
          key: 'translateY',
          val: direction === 'left' ? 3 : -4,
          prog: 0.5,
        },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create wave displacement effect
  const createWaveEffect = (
    targetId: string,
    wordStart: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: wordStart + randomOffset(0.3, 0.5),
      duration: 0.2 * params.glitchIntensity,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -12, prog: 0.25 },
        { key: 'translateX', val: 15, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 0.85, prog: 0.5 },
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create glitch tear effect
  const createGlitchTearEffect = (
    targetId: string,
    wordStart: number,
  ): GenericEffectData => {
    return {
      type: 'steps(1)',
      start: wordStart + randomOffset(0.4, 0.6),
      duration: 0.15 * params.glitchIntensity,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 25, prog: 0.2 },
        { key: 'translateY', val: -15, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1.3, prog: 0.3 },
        { key: 'scaleX', val: 0.8, prog: 0.7 },
        { key: 'scaleX', val: 1, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create base layer distortion effect
  const createBaseDistortionEffect = (
    targetId: string,
    wordStart: number,
  ): GenericEffectData => {
    return {
      type: 'steps(1)',
      start: wordStart + randomOffset(0, 0.3),
      duration: 0.3 * params.glitchIntensity,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.15 },
        { key: 'opacity', val: 1, prog: 0.16 },
        { key: 'scaleX', val: 1, prog: 0 },
        { key: 'scaleX', val: 1.15, prog: 0.5 },
        { key: 'scaleX', val: 0.92, prog: 0.75 },
        { key: 'scaleX', val: 1, prog: 1 },
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: -12, prog: 0.4 },
        { key: 'skewX', val: 8, prog: 0.7 },
        { key: 'skewX', val: 0, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create frame drop effect
  const createFrameDropEffect = (
    targetId: string,
    wordStart: number,
  ): GenericEffectData => {
    return {
      type: 'steps(1)',
      start: wordStart + randomOffset(0.4, 0.7),
      duration: 0.067, // 2 frames at 30fps
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.01 },
        { key: 'opacity', val: 0, prog: 0.99 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData;
  };

  // Helper: Create yellow layer effects
  const createYellowLayerEffects = (
    targetId: string,
    wordStart: number,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];

    // Subtle offset for color bleed
    effects.push({
      type: 'ease-out',
      start: wordStart + randomOffset(0.15, 0.35),
      duration: 0.22 * params.glitchIntensity,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -5, prog: 0.4 },
        { key: 'translateX', val: 8, prog: 0.7 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 6, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData);

    // Hue rotation for color corruption
    effects.push({
      type: 'linear',
      start: wordStart + randomOffset(0.2, 0.5),
      duration: 0.18 * params.glitchIntensity,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'hueRotate', val: 0, prog: 0 },
        { key: 'hueRotate', val: 180, prog: 0.5 },
        { key: 'hueRotate', val: 0, prog: 1 },
      ],
    } as GenericEffectData);

    return effects;
  };

  // Build word components for each caption
  const captionChildren: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `${params.trackName}-word-${captionIndex}-${wordIndex}`;
      const baseLayerId = `${wordId}-base`;
      const cyanLayerId = `${wordId}-cyan`;
      const magentaLayerId = `${wordId}-magenta`;
      const yellowLayerId = `${wordId}-yellow`;

      // Apply frame drop probability
      const shouldApplyFrameDrop =
        Math.random() < params.frameDropProbability;

      // Base text layer (white)
      const baseLayerEffects: GenericEffectData[] = [
        createBaseDistortionEffect(baseLayerId, word.start),
      ];
      if (shouldApplyFrameDrop) {
        baseLayerEffects.push(createFrameDropEffect(baseLayerId, word.start));
      }

      const baseLayer: RenderableComponentData = {
        id: baseLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontWeight,
            color: params.textColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            textShadow: '0 0 20px rgba(0,0,0,0.8)',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        effects: baseLayerEffects.map((effect, idx) => ({
          id: `${baseLayerId}-effect-${idx}`,
          componentId: 'generic',
          data: effect,
        })),
      };

      // Cyan layer (RGB separation)
      const cyanLayerEffects: GenericEffectData[] = [
        createRGBSeparationEffect(
          cyanLayerId,
          word.start,
          'left',
          params.rgbSeparationIntensity,
        ),
        createWaveEffect(cyanLayerId, word.start),
      ];

      const cyanLayer: RenderableComponentData = {
        id: cyanLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontWeight,
            color: params.cyanColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mixBlendMode: 'screen',
            opacity: 0.7,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        effects: cyanLayerEffects.map((effect, idx) => ({
          id: `${cyanLayerId}-effect-${idx}`,
          componentId: 'generic',
          data: effect,
        })),
      };

      // Magenta layer (RGB separation)
      const magentaLayerEffects: GenericEffectData[] = [
        createRGBSeparationEffect(
          magentaLayerId,
          word.start,
          'right',
          params.rgbSeparationIntensity,
        ),
        createGlitchTearEffect(magentaLayerId, word.start),
      ];

      const magentaLayer: RenderableComponentData = {
        id: magentaLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontWeight,
            color: params.magentaColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mixBlendMode: 'screen',
            opacity: 0.6,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        effects: magentaLayerEffects.map((effect, idx) => ({
          id: `${magentaLayerId}-effect-${idx}`,
          componentId: 'generic',
          data: effect,
        })),
      };

      // Yellow layer (subtle color bleed)
      const yellowLayerEffects = createYellowLayerEffects(
        yellowLayerId,
        word.start,
      );

      const yellowLayer: RenderableComponentData = {
        id: yellowLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontWeight,
            color: params.yellowColor,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            mixBlendMode: 'multiply',
            opacity: 0.5,
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        effects: yellowLayerEffects.map((effect, idx) => ({
          id: `${yellowLayerId}-effect-${idx}`,
          componentId: 'generic',
          data: effect,
        })),
      };

      // Word group container (absolute positioned)
      const wordGroup: RenderableComponentData = {
        id: `${wordId}-group`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
          },
        },
        context: {
          timing: {
            start: word.start,
            duration: word.duration,
          },
        },
        childrenData: [baseLayer, cyanLayer, magentaLayer, yellowLayer],
      };

      captionChildren.push(wordGroup);
    });
  });

  // Scanline overlay (VHS tracking error aesthetic)
  const scanlineOverlay: RenderableComponentData = {
    id: `${params.trackName}-scanline-overlay`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.15) 3px); mix-blend-mode: overlay;"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: `${params.trackName}-caption-container`,
      },
    },
  };

  // Caption container (holds all word groups)
  const captionContainer: RenderableComponentData = {
    id: `${params.trackName}-caption-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: captions[0]?.absoluteStart ?? 0,
        duration: captions.reduce((sum, cap) => sum + cap.duration, 0),
      },
    },
    childrenData: captionChildren as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackName}-datamosh-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.1) 0%, transparent 2%, transparent 98%, rgba(0,0,0,0.1) 100%)',
          backgroundSize: '100% 4px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: `${params.trackName}-caption-container`,
      },
    },
    childrenData: [
      captionContainer,
      ...(params.enableScanlines ? [scanlineOverlay] : []),
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

const presetMetadata: PresetMetadata = {
  id: 'datamosh-text-glitch',
  title: 'Glitchy Datamosh Text Preset',
  description:
    'A datamosh-style text effect simulating digital video corruption with RGB channel separation, horizontal displacement, wave distortion, and VHS tracking errors. Features word-level glitch animations with randomized distortion patterns, neon color overlays (cyan/magenta/yellow) using blend modes, frame drop effects, and harsh digital snap-backs for authentic video compression artifact aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'datamosh',
    'vhs',
    'rgb-separation',
    'corruption',
    'video-artifacts',
    'neon',
    'cyberpunk',
    'retro',
  ],
  defaultInputParams: {
    captions: [
      {
        text: 'GLITCH TEXT',
        absoluteStart: 0,
        duration: 3,
        words: [
          { text: 'GLITCH', start: 0, duration: 1.5 },
          { text: 'TEXT', start: 1.5, duration: 1.5 },
        ],
      },
    ],
    trackName: 'datamosh-track',
    fontSize: 64,
    font: 'Inter:900',
    textColor: '#ffffff',
    cyanColor: '#00ffff',
    magentaColor: '#ff00ff',
    yellowColor: '#ffff00',
    glitchIntensity: 1,
    rgbSeparationIntensity: 1,
    frameDropProbability: 0.7,
    enableScanlines: true,
  },
  dependencies: {},
};

export const datamoshTextGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};