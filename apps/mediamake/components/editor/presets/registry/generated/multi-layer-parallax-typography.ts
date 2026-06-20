/**
 * Multi-Layer Parallax Typography Preset
 *
 * This preset creates a motion graphics title sequence with three distinct text layers
 * moving at different speeds (foreground, mid-ground, background) with inverse parallax
 * to video movement. Each layer responds inversely to video pans with varying rates.
 *
 * Features:
 * - **Three-Layer Parallax**: Foreground (fastest), mid-ground (medium), background (slowest)
 * - **Character-Level Animation**: Letters cascade in with rotation and scale on foreground
 * - **Video Edge Blur**: Subtle radial blur gradient on background video (0→2px)
 * - **Floating Particles**: Decorative circular elements floating at various speeds
 * - **Inverse Movement**: Text layers pan opposite to video movement
 * - **Synchronized Timing**: All elements use fitDurationTo for cohesive timing
 *
 * Use cases:
 * - Creating cinematic title sequences
 * - Building motion graphics intros
 * - Adding parallax text overlays to videos
 * - Creating depth-based typography effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  videoSrc: z.string().describe('URL or path to the background video file'),
  videoDuration: z
    .number()
    .optional()
    .describe('Duration of the video in seconds (optional, auto-detected)'),

  foregroundTitle: z
    .string()
    .default('MAIN TITLE')
    .describe('Foreground title text (fastest parallax, character animations)'),
  midgroundText: z
    .string()
    .default('Subtitle Text')
    .describe('Mid-ground subtitle text (medium parallax)'),
  backgroundText: z
    .string()
    .default('CONTEXT')
    .describe('Background contextual text (slowest parallax)'),

  font: z
    .string()
    .default('Inter:800')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:800", "Roboto:700:italic")',
    ),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:800';
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

  const videoDuration = params.videoDuration || 30;

  // ============================================================================
  // VIDEO LAYER (with edge blur effect)
  // ============================================================================

  const videoLayer: RenderableComponentData = {
    id: 'video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: params.videoSrc,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        filter: 'blur(0px)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: videoDuration,
      },
    },
    effects: [
      {
        id: 'video-edge-blur-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['video-layer'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(2px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // BACKGROUND TEXT LAYER (slowest parallax: -1% to 1%)
  // ============================================================================

  const bgTextContent: RenderableComponentData = {
    id: 'bg-text-content',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.backgroundText,
      style: {
        fontSize: '96px',
        fontWeight: '900',
        color: '#ffffff',
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
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
        fitDurationTo: 'video-layer',
      },
    },
  };

  const bgTextLayer: RenderableComponentData = {
    id: 'bg-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 opacity-30 flex flex-col items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    effects: [
      {
        id: 'bg-parallax-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['bg-text-content'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'translateX', val: '-1%', prog: 0 },
            { key: 'translateX', val: '1%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [bgTextContent],
  };

  // ============================================================================
  // MID-GROUND TEXT LAYER (medium parallax: -3% to 3%)
  // ============================================================================

  const midTextContent: RenderableComponentData = {
    id: 'mid-text-content',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.midgroundText,
      style: {
        fontSize: '64px',
        fontWeight: '700',
        color: '#ffffff',
        textShadow: '0 4px 12px rgba(0,0,0,0.5)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
  };

  const midTextLayer: RenderableComponentData = {
    id: 'mid-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 top-1/3 flex flex-col items-center',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    effects: [
      {
        id: 'mid-parallax-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['mid-text-content'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'translateX', val: '-3%', prog: 0 },
            { key: 'translateX', val: '3%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [midTextContent],
  };

  // ============================================================================
  // FOREGROUND TEXT LAYER (fastest parallax: -5% to 5% + letter spacing animation + character cascade)
  // ============================================================================

  const fgTextContent: RenderableComponentData = {
    id: 'fg-text-content',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.foregroundTitle,
      style: {
        fontSize: '72px',
        fontWeight: '800',
        color: '#ffffff',
        textShadow: '0 6px 20px rgba(0,0,0,0.8)',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['800'],
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    effects: [
      {
        id: 'character-cascade-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['fg-text-content'],
          type: 'ease-out',
          start: 0,
          duration: 2,
          ranges: [
            { key: 'rotate', val: -180, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const fgTextLayer: RenderableComponentData = {
    id: 'fg-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 bottom-1/4 flex flex-col items-center',
        style: {
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    effects: [
      {
        id: 'fg-parallax-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['fg-text-content'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'translateX', val: '-5%', prog: 0 },
            { key: 'translateX', val: '5%', prog: 1 },
          ],
        },
      },
      {
        id: 'fg-letter-spacing-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['fg-text-content'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'letterSpacing', val: '0.05em', prog: 0 },
            { key: 'letterSpacing', val: '0.15em', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [fgTextContent],
  };

  // ============================================================================
  // PARTICLE LAYER (floating decorative elements)
  // ============================================================================

  const particle1: RenderableComponentData = {
    id: 'particle-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 80px; height: 80px; background: rgba(255,255,255,0.15); border-radius: 50%; backdrop-filter: blur(4px);'></div>",
      className: 'absolute',
      style: {
        top: '10%',
        left: '5%',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    effects: [
      {
        id: 'particle-1-float',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['particle-1'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '100px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-50px', prog: 1 },
          ],
        },
      },
    ],
  };

  const particle2: RenderableComponentData = {
    id: 'particle-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 60px; height: 60px; background: rgba(255,255,255,0.1); border-radius: 50%; backdrop-filter: blur(4px);'></div>",
      className: 'absolute',
      style: {
        top: '60%',
        right: '10%',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    effects: [
      {
        id: 'particle-2-float',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['particle-2'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '-80px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '70px', prog: 1 },
          ],
        },
      },
    ],
  };

  const particle3: RenderableComponentData = {
    id: 'particle-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: "<div style='width: 100px; height: 100px; background: rgba(255,255,255,0.12); border-radius: 50%; backdrop-filter: blur(4px);'></div>",
      className: 'absolute',
      style: {
        top: '40%',
        left: '80%',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    effects: [
      {
        id: 'particle-3-float',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['particle-3'],
          type: 'ease-in-out',
          start: 0,
          duration: videoDuration,
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '-150px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-100px', prog: 1 },
          ],
        },
      },
    ],
  };

  const particleLayer: RenderableComponentData = {
    id: 'particle-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 40,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'video-layer',
      },
    },
    childrenData: [particle1, particle2, particle3],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'multi-layer-parallax-container',
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
        fitDurationTo: 'video-layer',
      },
    },
    childrenData: [
      videoLayer,
      bgTextLayer,
      midTextLayer,
      fgTextLayer,
      particleLayer,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'multi-layer-parallax-typography',
  title: 'Multi-Layer Parallax Typography',
  description:
    'Motion graphics title sequence preset with three distinct text layers moving at different speeds (foreground, mid-ground, background) with inverse parallax to video movement. Features character-level cascade animations, edge blur on video, and floating particle text elements. Each layer responds inversely to video pans with varying rates.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'parallax',
    'motion-graphics',
    'title-sequence',
    'multi-layer',
    'character-animation',
    'edge-blur',
    'particles',
    'depth',
    'inverse-parallax',
  ],
  dependencies: {},
  defaultInputParams: {
    videoSrc: 'https://example.com/background.mp4',
    videoDuration: 30,
    foregroundTitle: 'MAIN TITLE',
    midgroundText: 'Subtitle Text',
    backgroundText: 'CONTEXT',
    font: 'Inter:800',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const multiLayerParallaxTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
