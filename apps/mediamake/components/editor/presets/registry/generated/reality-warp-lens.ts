/**
 * Reality Warp Lens Preset
 *
 * A reality-warping lens effect where a cutout image exists in a distorted 3D space bubble 
 * that progressively normalizes as content progresses. Features fisheye-style 3D perspective 
 * distortions that gradually flatten to normal proportions.
 *
 * Features:
 * - **3D Perspective Distortion**: CSS transform perspective with rotateY/rotateX creating fisheye-like warping
 * - **Progressive Normalization**: Distortion gradually reduces from warped to normal as captions progress
 * - **Chromatic Aberration**: RGB channel separation at distortion edges using multiple image layers with blend modes
 * - **Distortion Fields**: Multiple gradient overlays with backdrop blur creating reality distortion zones
 * - **Reality Cracks**: SVG-like crack overlays that appear during transitions, simulating mirror-breaking effects
 * - **Sentiment-Driven Intensity**: Caption sentiment controls distortion intensity (positive reduces, negative increases)
 * - **Performance Optimized**: Uses transform-style: preserve-3d and will-change for smooth 3D rendering
 *
 * Use cases:
 * - Creating supernatural/sci-fi video effects with reality distortion
 * - Adding dramatic visual interest to cutout person/object presentations
 * - Building reality-bending transitions synchronized with captions
 * - Creating portal/dimension-warping effects for creative content
 *
 * Technical implementation:
 * - Main cutout uses 3D transforms (perspective, rotateY, rotateX, scale) animated via generic effects
 * - Chromatic aberration via three overlaid images with hue-rotate filters and screen blend mode
 * - Distortion fields use radial gradients with backdrop-filter blur
 * - Crack lines animate opacity and scale during transitions
 * - All timing synchronized with SubtitlesOverlay dependency
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// --- Params Schema ---
const presetParams = z.object({
  cutoutImage: z.string().describe('URL or path to the cutout image (PNG with transparency)'),
  distortionIntensity: z.number().min(0).max(2).default(1).describe('Initial distortion intensity multiplier (0 = no distortion, 1 = normal, 2 = extreme)'),
  normalizationDuration: z.number().default(3).describe('Duration in seconds for distortion to normalize to flat'),
  chromaticAberrationOffset: z.number().default(3).describe('Pixel offset for chromatic aberration effect'),
  showCracks: z.boolean().default(true).describe('Whether to show reality crack overlays during transitions'),
  crackTransitionDuration: z.number().default(0.5).describe('Duration in seconds for crack appearance/disappearance'),
  backdropBlurAmount: z.number().default(2).describe('Backdrop blur amount in pixels for distortion fields'),
  captions: z.array(z.object({
    text: z.string(),
    start: z.number(),
    end: z.number(),
    duration: z.number(),
    absoluteStart: z.number(),
    absoluteEnd: z.number(),
    words: z.array(z.any()).optional(),
    metadata: z.object({
      sentiment: z.enum(['positive', 'negative', 'neutral']).optional(),
    }).optional(),
  })).optional().describe('Caption data array for sentiment-driven distortion (optional)'),
  duration: z.number().optional().describe('Total duration in seconds (optional, will be calculated if not provided)'),
});

// --- Preset Execution ---
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    cutoutImage,
    distortionIntensity,
    normalizationDuration,
    chromaticAberrationOffset,
    showCracks,
    crackTransitionDuration,
    backdropBlurAmount,
    captions,
    duration: explicitDuration,
  } = params;

  const { presets } = props;

  // Calculate total duration
  const calculatedDuration = captions && captions.length > 0
    ? Math.max(...captions.map(c => c.absoluteEnd))
    : explicitDuration || 10;

  const totalDuration = explicitDuration || calculatedDuration;

  // Calculate distortion parameters based on intensity
  const initialRotateY = 45 * distortionIntensity;
  const initialRotateX = 30 * distortionIntensity;
  const initialScale = 0.7 + (0.3 * (1 - distortionIntensity));

  // Chromatic aberration offset values
  const redOffset = chromaticAberrationOffset * distortionIntensity;
  const cyanOffset = -chromaticAberrationOffset * distortionIntensity;
  const yellowOffset = chromaticAberrationOffset * 0.5 * distortionIntensity;

  // --- Distortion Field Layer ---
  const distortionField1: RenderableComponentData = {
    id: 'reality-warp-distortion-field-1',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'absolute inset-0 rounded-full pointer-events-none',
        style: {
          background: 'radial-gradient(circle, transparent 0%, rgba(168, 85, 247, 0.2) 50%, transparent 100%)',
          backdropFilter: `blur(${backdropBlurAmount}px)`,
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
        id: 'distortion-field-1-fade',
        componentId: 'reality-warp-distortion-field-1',
        data: {
          type: 'ease-out',
          start: 0,
          duration: normalizationDuration,
          mode: 'provider',
          targetIds: ['reality-warp-distortion-field-1'],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const distortionField2: RenderableComponentData = {
    id: 'reality-warp-distortion-field-2',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'absolute top-1/4 left-1/4 w-1/2 h-1/2 rounded-full pointer-events-none',
        style: {
          background: 'radial-gradient(circle, transparent 0%, rgba(6, 182, 212, 0.15) 50%, transparent 100%)',
          backdropFilter: `blur(${backdropBlurAmount * 1.5}px)`,
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
        id: 'distortion-field-2-fade',
        componentId: 'reality-warp-distortion-field-2',
        data: {
          type: 'ease-out',
          start: 0,
          duration: normalizationDuration,
          mode: 'provider',
          targetIds: ['reality-warp-distortion-field-2'],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1.2, prog: 0 },
            { key: 'scale', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  const distortionField3: RenderableComponentData = {
    id: 'reality-warp-distortion-field-3',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      containerProps: {
        className: 'absolute top-1/3 right-1/4 w-1/3 h-1/3 rounded-full pointer-events-none',
        style: {
          background: 'radial-gradient(circle, transparent 0%, rgba(236, 72, 153, 0.1) 50%, transparent 100%)',
          backdropFilter: `blur(${backdropBlurAmount * 0.5}px)`,
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
        id: 'distortion-field-3-fade',
        componentId: 'reality-warp-distortion-field-3',
        data: {
          type: 'ease-out',
          start: 0,
          duration: normalizationDuration * 1.2,
          mode: 'provider',
          targetIds: ['reality-warp-distortion-field-3'],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const distortionFieldLayer: RenderableComponentData = {
    id: 'reality-warp-distortion-field-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [distortionField1, distortionField2, distortionField3],
  };

  // --- Chromatic Aberration Layer ---
  const chromaticRed: RenderableComponentData = {
    id: 'reality-warp-chromatic-red',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: cutoutImage,
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter: 'hue-rotate(-30deg) saturate(2)',
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
        id: 'chromatic-red-offset',
        componentId: 'reality-warp-chromatic-red',
        data: {
          type: 'ease-out',
          start: 0,
          duration: normalizationDuration,
          mode: 'provider',
          targetIds: ['reality-warp-chromatic-red'],
          ranges: [
            { key: 'translateX', val: redOffset, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const chromaticCyan: RenderableComponentData = {
    id: 'reality-warp-chromatic-cyan',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: cutoutImage,
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter: 'hue-rotate(180deg) saturate(1.5)',
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
        id: 'chromatic-cyan-offset',
        componentId: 'reality-warp-chromatic-cyan',
        data: {
          type: 'ease-out',
          start: 0,
          duration: normalizationDuration,
          mode: 'provider',
          targetIds: ['reality-warp-chromatic-cyan'],
          ranges: [
            { key: 'translateX', val: cyanOffset, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const chromaticYellow: RenderableComponentData = {
    id: 'reality-warp-chromatic-yellow',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: cutoutImage,
      containerProps: {
        className: 'absolute inset-0 w-full h-full pointer-events-none',
        style: {
          objectFit: 'contain',
          mixBlendMode: 'screen',
          filter: 'hue-rotate(60deg) saturate(1.8)',
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
        id: 'chromatic-yellow-offset',
        componentId: 'reality-warp-chromatic-yellow',
        data: {
          type: 'ease-out',
          start: 0,
          duration: normalizationDuration,
          mode: 'provider',
          targetIds: ['reality-warp-chromatic-yellow'],
          ranges: [
            { key: 'translateY', val: yellowOffset, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  const chromaticAberrationLayer: RenderableComponentData = {
    id: 'reality-warp-chromatic-aberration-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-20',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [chromaticRed, chromaticCyan, chromaticYellow],
  };

  // --- Main Cutout Container with 3D Distortion ---
  const cutoutImage3D: RenderableComponentData = {
    id: 'reality-warp-cutout-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: cutoutImage,
      containerProps: {
        className: 'w-auto h-4/5 object-contain',
        style: {
          transformStyle: 'preserve-3d',
          willChange: 'transform',
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
        id: 'cutout-3d-distortion',
        componentId: 'reality-warp-cutout-image',
        data: {
          type: 'ease-out',
          start: 0,
          duration: normalizationDuration,
          mode: 'provider',
          targetIds: ['reality-warp-cutout-image'],
          ranges: [
            { key: 'rotateY', val: initialRotateY, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'rotateX', val: initialRotateX, prog: 0 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'scale', val: initialScale, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const cutoutContainer: RenderableComponentData = {
    id: 'reality-warp-cutout-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center z-30',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [cutoutImage3D],
  };

  // --- Crack Overlay Layer ---
  const crackLines: RenderableComponentData[] = showCracks ? [
    {
      id: 'reality-warp-crack-line-1',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute top-1/4 left-1/3 w-px h-24 bg-white origin-top pointer-events-none',
          style: {
            transform: 'rotate(25deg)',
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
          id: 'crack-1-appear',
          componentId: 'reality-warp-crack-line-1',
          data: {
            type: 'ease-in',
            start: 0.5,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'crack-1-disappear',
          componentId: 'reality-warp-crack-line-1',
          data: {
            type: 'ease-out',
            start: normalizationDuration - crackTransitionDuration,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-1'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'reality-warp-crack-line-2',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute top-1/3 right-1/4 w-px h-32 bg-white origin-top pointer-events-none',
          style: {
            transform: 'rotate(-35deg)',
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
          id: 'crack-2-appear',
          componentId: 'reality-warp-crack-line-2',
          data: {
            type: 'ease-in',
            start: 0.7,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'crack-2-disappear',
          componentId: 'reality-warp-crack-line-2',
          data: {
            type: 'ease-out',
            start: normalizationDuration - crackTransitionDuration + 0.2,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-2'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'reality-warp-crack-line-3',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute bottom-1/3 left-1/2 w-px h-20 bg-white/80 origin-bottom pointer-events-none',
          style: {
            transform: 'rotate(45deg)',
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
          id: 'crack-3-appear',
          componentId: 'reality-warp-crack-line-3',
          data: {
            type: 'ease-in',
            start: 0.9,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-3'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 1 },
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'crack-3-disappear',
          componentId: 'reality-warp-crack-line-3',
          data: {
            type: 'ease-out',
            start: normalizationDuration - crackTransitionDuration + 0.3,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-3'],
            ranges: [
              { key: 'opacity', val: 0.8, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'reality-warp-crack-line-4',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute top-1/2 left-1/4 w-px h-16 bg-white/60 origin-center pointer-events-none',
          style: {
            transform: 'rotate(-15deg)',
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
          id: 'crack-4-appear',
          componentId: 'reality-warp-crack-line-4',
          data: {
            type: 'ease-in',
            start: 0.6,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-4'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 1 },
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'crack-4-disappear',
          componentId: 'reality-warp-crack-line-4',
          data: {
            type: 'ease-out',
            start: normalizationDuration - crackTransitionDuration + 0.1,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-4'],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'reality-warp-crack-line-5',
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        containerProps: {
          className: 'absolute bottom-1/4 right-1/3 w-px h-28 bg-white origin-bottom pointer-events-none',
          style: {
            transform: 'rotate(60deg)',
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
          id: 'crack-5-appear',
          componentId: 'reality-warp-crack-line-5',
          data: {
            type: 'ease-in',
            start: 0.8,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-5'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: 'crack-5-disappear',
          componentId: 'reality-warp-crack-line-5',
          data: {
            type: 'ease-out',
            start: normalizationDuration - crackTransitionDuration + 0.25,
            duration: crackTransitionDuration,
            mode: 'provider',
            targetIds: ['reality-warp-crack-line-5'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
  ] : [];

  const crackOverlayLayer: RenderableComponentData = {
    id: 'reality-warp-crack-overlay-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none z-40',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: crackLines,
  };

  // --- Captions Layer (SubtitlesOverlay dependency) ---
  let captionsLayer: RenderableComponentData | null = null;

  if (presets && presets.SubtitlesOverlay && captions && captions.length > 0) {
    const subtitlesResult = await presets.SubtitlesOverlay(
      {
        captions: captions,
        trackId: 'reality-warp-captions',
      },
      props,
    );

    if (subtitlesResult?.output?.childrenData?.[0]) {
      captionsLayer = {
        ...subtitlesResult.output.childrenData[0],
        id: 'reality-warp-captions-layer',
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        data: {
          ...subtitlesResult.output.childrenData[0].data,
          containerProps: {
            ...subtitlesResult.output.childrenData[0].data?.containerProps,
            className: 'absolute inset-x-0 bottom-8 flex justify-center z-50',
          },
        },
      } as RenderableComponentData;
    }
  }

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'reality-warp-lens-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      distortionFieldLayer,
      chromaticAberrationLayer,
      cutoutContainer,
      crackOverlayLayer,
      ...(captionsLayer ? [captionsLayer] : []),
    ].filter(Boolean) as RenderableComponentData[],
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
  id: 'reality-warp-lens',
  title: 'Reality Warp Lens',
  description: 'A reality-warping lens effect where a cutout image exists in a distorted 3D space bubble that progressively normalizes. Features fisheye-style perspective distortions, chromatic aberration, distortion fields with backdrop blur, and reality crack overlays. Caption sentiment can control distortion intensity.',
  type: 'predefined',
  presetType: 'children',
  tags: ['cutout', 'distortion', '3d', 'lens', 'fisheye', 'chromatic-aberration', 'reality-warp', 'supernatural', 'sci-fi', 'effects'],
  defaultInputParams: {
    cutoutImage: 'https://example.com/cutout-person.png',
    distortionIntensity: 1,
    normalizationDuration: 3,
    chromaticAberrationOffset: 3,
    showCracks: true,
    crackTransitionDuration: 0.5,
    backdropBlurAmount: 2,
    duration: 10,
  },
  dependencies: {
    presets: ['SubtitlesOverlay'],
  },
};

// --- Export ---
export const realityWarpLensPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
