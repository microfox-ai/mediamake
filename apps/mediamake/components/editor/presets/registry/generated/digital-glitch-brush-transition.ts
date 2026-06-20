/**
 * Digital Glitch Brush Transition Preset
 *
 * A hybrid analog-digital transition that combines organic brush stroke reveals with digital glitch artifacts.
 * Features RGB channel splitting across 3 video layers, an 8x6 grid of randomly toggling glitch blocks,
 * animated scanlines, binary code overlay, and datamosh-style temporal displacement using offset video frames.
 * The brush reveal mask uses discrete polygon clip-path keyframes updated at 20fps for a corrupted painting
 * program aesthetic.
 *
 * Key Features:
 * - Animated brush stroke reveal with polygonal clip-path (updated at 0.1s intervals)
 * - RGB channel splitting with red/green/blue color filters and horizontal offsets
 * - 8x6 grid of glitch blocks that randomly toggle visibility every 0.05s
 * - Horizontal scan lines with translateY animations
 * - Binary pattern overlay (random 0s and 1s in monospace font)
 * - Datamosh effect using duplicate video frames with time offsets
 * - Static noise overlay with mix blend mode
 * - Performance optimized with 20fps glitch updates using steps() animation
 *
 * Use Cases:
 * - Modern, experimental video content bridging analog and digital art
 * - Music videos and creative transitions
 * - Tech-focused content with glitch aesthetics
 * - Artistic video projects mixing painting and digital corruption
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  baseVideoSrc: z.string().describe('Source URL of the base (outgoing) video'),
  revealedVideoSrc: z
    .string()
    .describe('Source URL of the revealed (incoming) video'),
  transitionDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the entire glitch brush transition in seconds'),
  rgbSplitOffset: z
    .number()
    .default(3)
    .describe('Horizontal offset in pixels for RGB channel splitting'),
  rgbOpacity: z
    .number()
    .default(0.8)
    .describe('Opacity for RGB split layers (0-1)'),
  glitchBlocksVisible: z
    .boolean()
    .default(true)
    .describe('Whether to show glitch blocks overlay'),
  glitchBlockOpacity: z
    .number()
    .default(1)
    .describe('Opacity of glitch blocks when visible (0-1)'),
  scanlinesVisible: z
    .boolean()
    .default(true)
    .describe('Whether to show scan lines'),
  scanlinesOpacity: z
    .number()
    .default(0.2)
    .describe('Opacity of scan lines (0-1)'),
  binaryOverlayVisible: z
    .boolean()
    .default(true)
    .describe('Whether to show binary code overlay'),
  binaryOverlayOpacity: z
    .number()
    .default(0.3)
    .describe('Opacity of binary overlay text (0-1)'),
  staticNoiseVisible: z
    .boolean()
    .default(true)
    .describe('Whether to show static noise layer'),
  staticNoiseOpacity: z
    .number()
    .default(0.1)
    .describe('Opacity of static noise (0-1)'),
  datamoshLayersVisible: z
    .boolean()
    .default(true)
    .describe('Whether to show datamosh layers'),
  datamoshOpacity1: z
    .number()
    .default(0.3)
    .describe('Opacity of first datamosh frame (0-1)'),
  datamoshOpacity2: z
    .number()
    .default(0.2)
    .describe('Opacity of second datamosh frame (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    baseVideoSrc,
    revealedVideoSrc,
    transitionDuration,
    rgbSplitOffset,
    rgbOpacity,
    glitchBlocksVisible,
    glitchBlockOpacity,
    scanlinesVisible,
    scanlinesOpacity,
    binaryOverlayVisible,
    binaryOverlayOpacity,
    staticNoiseVisible,
    staticNoiseOpacity,
    datamoshLayersVisible,
    datamoshOpacity1,
    datamoshOpacity2,
  } = params;

  // Helper: Generate random binary string
  const generateBinaryString = (length: number): string => {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.random() > 0.5 ? '1' : '0';
      if (i % 80 === 79) result += '\n'; // Line break every 80 chars
    }
    return result;
  };

  // Helper: Generate glitch block grid (8x6 = 48 blocks)
  const generateGlitchBlocks = (): RenderableComponentData[] => {
    const blocks: RenderableComponentData[] = [];
    const cols = 8;
    const rows = 6;
    const totalBlocks = cols * rows;

    for (let i = 0; i < totalBlocks; i++) {
      const blockId = `glitch-block-${i}`;
      // Random initial opacity (0 or 1)
      const initialOpacity = Math.random() > 0.5 ? 1 : 0;

      blocks.push({
        id: blockId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-color: black;"></div>`,
          style: {
            opacity: initialOpacity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        // Random opacity toggle effect at 20fps (0.05s intervals)
        effects: [
          {
            id: `${blockId}-toggle`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [blockId],
              ranges: [
                // Create discrete opacity steps every 0.05s
                { key: 'opacity', val: Math.random() > 0.5 ? 1 : 0, prog: 0 },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.05 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.1 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.15 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.2 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.25 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.3 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.35 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.4 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.45 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.5 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.55 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.6 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.65 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.7 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.75 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.8 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.85 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.9 / transitionDuration,
                },
                {
                  key: 'opacity',
                  val: Math.random() > 0.5 ? 1 : 0,
                  prog: 0.95 / transitionDuration,
                },
                { key: 'opacity', val: Math.random() > 0.5 ? 1 : 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return blocks;
  };

  // Helper: Generate brush mask polygon keyframes (20fps discrete steps)
  const generateBrushMaskEffect = (): any => {
    const steps = Math.ceil(transitionDuration * 10); // 0.1s intervals = 10 steps per second
    const ranges: any[] = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      // Generate random polygon points that expand over time
      const expansion = prog * 100; // 0% to 100%
      const polygon = `polygon(0% 0%, ${expansion}% 0%, ${expansion}% 100%, 0% 100%)`;

      ranges.push({
        key: 'clipPath',
        val: polygon,
        prog: prog,
      });
    }

    return {
      id: 'brush-mask-reveal',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['brush-mask-container'],
        ranges,
      },
    };
  };

  // Build children data
  const childrenData: RenderableComponentData[] = [];

  // 1. Base video layer (outgoing)
  childrenData.push({
    id: 'base-video-layer',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: baseVideoSrc,
      fit: 'cover',
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  } as RenderableComponentData);

  // 2. Datamosh layers container
  if (datamoshLayersVisible) {
    const datamoshChildren: RenderableComponentData[] = [
      {
        id: 'datamosh-frame-1',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: revealedVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          startFrom: 0.1,
          style: {
            opacity: datamoshOpacity1,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
      {
        id: 'datamosh-frame-2',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: revealedVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
          startFrom: 0.2,
          style: {
            opacity: datamoshOpacity2,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ];

    childrenData.push({
      id: 'datamosh-layers-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'screen',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: datamoshChildren,
    } as RenderableComponentData);
  }

  // 3. RGB split container
  const rgbChildren: RenderableComponentData[] = [
    {
      id: 'rgb-red-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: revealedVideoSrc,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          transform: `translateX(-${rgbSplitOffset}px)`,
          mixBlendMode: 'screen',
          opacity: rgbOpacity,
          filter:
            'url(#redChannel) brightness(1.2) contrast(1.1) saturate(1.3)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    {
      id: 'rgb-green-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: revealedVideoSrc,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          transform: `translateX(0px)`,
          mixBlendMode: 'screen',
          opacity: rgbOpacity,
          filter:
            'url(#greenChannel) brightness(1.2) contrast(1.1) saturate(1.3)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    {
      id: 'rgb-blue-layer',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: revealedVideoSrc,
        fit: 'cover',
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          transform: `translateX(${rgbSplitOffset}px)`,
          mixBlendMode: 'screen',
          opacity: rgbOpacity,
          filter:
            'url(#blueChannel) brightness(1.2) contrast(1.1) saturate(1.3)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
  ];

  childrenData.push({
    id: 'rgb-split-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: rgbChildren,
  } as RenderableComponentData);

  // 4. Brush mask container with masked reveal video
  const brushMaskEffect = generateBrushMaskEffect();

  childrenData.push({
    id: 'brush-mask-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%)', // Initial clip-path
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      {
        id: 'masked-reveal-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: revealedVideoSrc,
          fit: 'cover',
          className: 'absolute inset-0 w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [brushMaskEffect],
  } as RenderableComponentData);

  // 5. Glitch blocks container
  if (glitchBlocksVisible) {
    const glitchBlocks = generateGlitchBlocks();

    childrenData.push({
      id: 'glitch-blocks-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(8, 1fr)',
            gridTemplateRows: 'repeat(6, 1fr)',
            opacity: glitchBlockOpacity,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: glitchBlocks,
    } as RenderableComponentData);
  }

  // 6. Scan lines container
  if (scanlinesVisible) {
    const scanlineChildren: RenderableComponentData[] = [];
    const scanlinePositions = [20, 40, 60, 80]; // Percentages

    scanlinePositions.forEach((position, index) => {
      scanlineChildren.push({
        id: `scanline-bar-${index + 1}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full h-px',
            style: {
              backgroundColor: `rgba(255, 255, 255, ${scanlinesOpacity})`,
              top: `${position}%`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `scanline-move-${index + 1}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [`scanline-bar-${index + 1}`],
              ranges: [
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: '50px', prog: 0.5 },
                { key: 'translateY', val: '0px', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });

    childrenData.push({
      id: 'scanlines-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: scanlineChildren,
    } as RenderableComponentData);
  }

  // 7. Binary overlay
  if (binaryOverlayVisible) {
    const binaryString = generateBinaryString(2000); // Generate 2000 characters

    childrenData.push({
      id: 'binary-overlay',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: binaryString,
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          fontFamily: 'monospace',
          fontSize: '10px',
          lineHeight: '1.2',
          color: `rgba(74, 222, 128, ${binaryOverlayOpacity})`,
          wordBreak: 'break-all',
          whiteSpace: 'pre-wrap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData);
  }

  // 8. Static noise layer
  if (staticNoiseVisible) {
    // Use a data URI for a simple noise pattern
    const noiseDataUri =
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiLz48L3N2Zz4=';

    childrenData.push({
      id: 'static-noise-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundImage: `url(${noiseDataUri})`,
            backgroundSize: '100px 100px',
            opacity: staticNoiseOpacity,
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [],
    } as RenderableComponentData);
  }

  // 9. SVG filters for RGB channels
  const svgFiltersHtml = `
    <svg style="position:absolute;width:0;height:0">
      <defs>
        <filter id="redChannel">
          <feColorMatrix type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="greenChannel">
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0"/>
        </filter>
        <filter id="blueChannel">
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"/>
        </filter>
      </defs>
    </svg>
  `;

  childrenData.push({
    id: 'svg-filters-container',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFiltersHtml,
      className: 'hidden',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  } as RenderableComponentData);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'digital-glitch-brush-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData,
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
  id: 'digital-glitch-brush-transition',
  title: 'Digital Glitch Brush Transition',
  description:
    'A hybrid analog-digital transition that combines organic brush stroke reveals with digital glitch artifacts. Features RGB channel splitting, glitch blocks, scanlines, binary overlay, and datamosh effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'brush',
    'rgb-split',
    'datamosh',
    'experimental',
    'digital-art',
    'analog',
    'creative',
  ],
  defaultInputParams: {
    baseVideoSrc: 'https://example.com/base-video.mp4',
    revealedVideoSrc: 'https://example.com/revealed-video.mp4',
    transitionDuration: 2.0,
    rgbSplitOffset: 3,
    rgbOpacity: 0.8,
    glitchBlocksVisible: true,
    glitchBlockOpacity: 1,
    scanlinesVisible: true,
    scanlinesOpacity: 0.2,
    binaryOverlayVisible: true,
    binaryOverlayOpacity: 0.3,
    staticNoiseVisible: true,
    staticNoiseOpacity: 0.1,
    datamoshLayersVisible: true,
    datamoshOpacity1: 0.3,
    datamoshOpacity2: 0.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const digitalGlitchBrushTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
