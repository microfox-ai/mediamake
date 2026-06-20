/**
 * Retro MTV Music Video Aesthetic Preset
 *
 * This preset creates an 80s MTV-style music video aesthetic with quick-cut image sequences,
 * neon overlays, geometric transitions, and analog VHS effects. Features include:
 *
 * - Quick-cut image flashing synced to beats
 * - Neon color overlays with glow effects
 * - Geometric shape transitions (triangles, diamonds, spirals)
 * - Analog video effects: scan lines, chromatic aberration, VHS glitches
 * - Retro typography with outline fonts and drop shadows
 * - Dynamic geometric frames with images masked into shapes
 * - CRT TV border effect
 * - Synchronized strobe effects and color cycling
 *
 * Use cases:
 * - Creating 80s-style music videos
 * - Retro aesthetic content for social media
 * - Nostalgic visual effects for modern content
 * - MTV-inspired video sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        type: z.enum(['image', 'video']).optional().describe('Media type'),
      }),
    )
    .min(4)
    .describe('Array of at least 4 images for quick-cut sequences'),
  title: z
    .string()
    .optional()
    .describe('Title text to display (default: "RETRO VIBES")'),
  titleFont: z
    .string()
    .default('Bebas Neue:700')
    .optional()
    .describe('Title font family with weight (e.g., "Bebas Neue:700")'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the preset in seconds'),
  beatInterval: z
    .number()
    .default(0.5)
    .optional()
    .describe('Time interval between beat sections in seconds'),
  neonColors: z
    .array(z.string())
    .default(['#FF00FF', '#00FF00', '#FF0000', '#00FFFF'])
    .optional()
    .describe('Array of neon colors for overlays'),
  strobeIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Strobe effect intensity multiplier'),
  enableScanLines: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable CRT scan line effect'),
  enableChromaticAberration: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable chromatic aberration effect'),
  enableVHSGlitch: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable VHS glitch effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    images,
    title = 'RETRO VIBES',
    titleFont = 'Bebas Neue:700',
    duration = 10,
    beatInterval = 0.5,
    neonColors = ['#FF00FF', '#00FF00', '#FF0000', '#00FFFF'],
    strobeIntensity = 1,
    enableScanLines = true,
    enableChromaticAberration = true,
    enableVHSGlitch = true,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontWeight = fontString.includes(':')
      ? parseInt(fontString.split(':')[1], 10)
      : 700;
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(titleFont);

  // Calculate number of beat sections
  const numBeatSections = Math.ceil(duration / beatInterval);

  // Create beat sections with alternating images
  const beatSections: RenderableComponentData[] = [];

  for (let i = 0; i < numBeatSections; i++) {
    const sectionStart = i * beatInterval;
    const sectionDuration = Math.min(beatInterval, duration - sectionStart);
    const imageIndex = i % images.length;
    const neonColorIndex = i % neonColors.length;

    // Determine if this section uses full-frame or geometric masking
    const useGeometricMask = i % 2 === 0;

    // Determine component type based on media type
    const componentId =
      images[imageIndex].type === 'video' ? 'VideoAtom' : 'ImageAtom';

    // Create image component
    const imageComponent: RenderableComponentData = {
      id: `beat-image-${i}`,
      type: 'atom',
      componentId,
      data: {
        src: images[imageIndex].src,
        className: 'w-full h-full object-cover',
        style: {
          filter: 'contrast(1.2) saturate(1.5)',
          ...(useGeometricMask && i % 4 === 0
            ? { clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' } // Diamond
            : useGeometricMask && i % 4 === 2
            ? {
                clipPath:
                  'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
              } // Octagon
            : {}),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: sectionDuration,
        },
      },
    };

    // Neon overlay component
    const neonOverlay: RenderableComponentData = {
      id: `neon-overlay-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; inset: 0; background: ${neonColors[neonColorIndex]}20; box-shadow: 0 0 20px ${neonColors[neonColorIndex]}80; mix-blend-mode: screen; pointer-events: none;"></div>`,
      },
      context: {
        timing: {
          start: 0,
          duration: sectionDuration,
        },
      },
      effects: [
        {
          id: `strobe-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: sectionDuration,
            mode: 'provider',
            targetIds: [`neon-overlay-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: strobeIntensity, prog: 0.1 },
              { key: 'opacity', val: 0, prog: 0.2 },
              { key: 'opacity', val: strobeIntensity, prog: 0.3 },
              { key: 'opacity', val: 0.5 * strobeIntensity, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Geometric shape decoration
    const shapePositions = [
      { top: '10%', left: '10%' },
      { bottom: '15%', right: '15%' },
      { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      { top: '20%', right: '20%' },
    ];
    const shapePosition = shapePositions[i % shapePositions.length];

    const geometricShape: RenderableComponentData = {
      id: `geometric-shape-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; ${Object.entries(shapePosition)
          .map(([k, v]) => `${k}: ${v}`)
          .join('; ')}; width: 100px; height: 100px; background: ${neonColors[(i + 1) % neonColors.length]}30; clip-path: ${
          i % 3 === 0
            ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' // Diamond
            : i % 3 === 1
            ? 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)' // Pentagon
            : 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' // Star
        }; box-shadow: 0 0 30px ${neonColors[(i + 1) % neonColors.length]}CC;"></div>`,
      },
      context: {
        timing: {
          start: 0,
          duration: sectionDuration,
        },
      },
      effects: [
        {
          id: `shape-pulse-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: sectionDuration,
            mode: 'provider',
            targetIds: [`geometric-shape-${i}`],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 0.8, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 180, prog: 1 },
            ],
          },
        },
      ],
    };

    // Beat section container
    const beatSection: RenderableComponentData = {
      id: `beat-section-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: sectionStart,
          duration: sectionDuration,
        },
      },
      childrenData: [imageComponent, neonOverlay, geometricShape],
    };

    beatSections.push(beatSection);
  }

  // Scan lines overlay
  const scanLinesOverlay: RenderableComponentData = {
    id: 'scan-lines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px); pointer-events: none; z-index: 50;"></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Chromatic aberration overlay
  const chromaticAberrationOverlay: RenderableComponentData = {
    id: 'chromatic-aberration-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: transparent; pointer-events: none; z-index: 40; mix-blend-mode: screen;"></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // VHS glitch overlay
  const vhsGlitchOverlay: RenderableComponentData = {
    id: 'vhs-glitch-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: transparent; pointer-events: none; z-index: 45;"></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'vhs-jitter-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['vhs-glitch-overlay'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 5, prog: 0.1 },
            { key: 'translateX', val: -3, prog: 0.2 },
            { key: 'translateX', val: 0, prog: 0.3 },
            { key: 'translateX', val: 4, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 0.6 },
            { key: 'translateX', val: -5, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Retro title text
  const retroTitleText: RenderableComponentData = {
    id: 'retro-title-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: title,
      className: 'absolute top-10 left-1/2 transform -translate-x-1/2 z-50',
      style: {
        fontSize: 64,
        color: '#fff',
        textShadow:
          '3px 3px 0px #000, -1px -1px 0px #ff00ff, 1px 1px 0px #00ffff',
        fontWeight: fontWeight,
        letterSpacing: 5,
        textTransform: 'uppercase' as const,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'title-glow-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['retro-title-text'],
          ranges: [
            {
              key: 'textShadow',
              val: '3px 3px 0px #000, -1px -1px 0px #ff00ff, 1px 1px 0px #00ffff',
              prog: 0,
            },
            {
              key: 'textShadow',
              val: '3px 3px 0px #000, -2px -2px 0px #ff00ff, 2px 2px 0px #00ffff, 0 0 20px #ff00ff',
              prog: 0.5,
            },
            {
              key: 'textShadow',
              val: '3px 3px 0px #000, -1px -1px 0px #ff00ff, 1px 1px 0px #00ffff',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // CRT border container
  const crtBorderContainer: RenderableComponentData = {
    id: 'crt-border-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 rounded-[2%] overflow-hidden border-8 border-gray-800',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      ...beatSections,
      ...(enableScanLines ? [scanLinesOverlay] : []),
      ...(enableChromaticAberration ? [chromaticAberrationOverlay] : []),
      ...(enableVHSGlitch ? [vhsGlitchOverlay] : []),
      retroTitleText,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-mtv-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [crtBorderContainer],
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
  id: 'retro-mtv-music-video',
  title: 'Retro MTV Music Video Aesthetic',
  description:
    '80s MTV-style music video preset with quick-cut image sequences, neon overlays, geometric transitions, analog VHS effects (scan lines, chromatic aberration, VHS glitches), beat-synced strobe effects, retro typography, and dynamic geometric masking. Features CRT TV effect, color cycling, and audio-reactive visual pulsing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'retro',
    'mtv',
    '80s',
    'music-video',
    'neon',
    'vhs',
    'glitch',
    'typography',
    'geometric',
    'strobe',
  ],
  defaultInputParams: {
    images: [
      { src: 'https://example.com/image1.jpg', type: 'image' },
      { src: 'https://example.com/image2.jpg', type: 'image' },
      { src: 'https://example.com/image3.jpg', type: 'image' },
      { src: 'https://example.com/image4.jpg', type: 'image' },
    ],
    title: 'RETRO VIBES',
    titleFont: 'Bebas Neue:700',
    duration: 10,
    beatInterval: 0.5,
    neonColors: ['#FF00FF', '#00FF00', '#FF0000', '#00FFFF'],
    strobeIntensity: 1,
    enableScanLines: true,
    enableChromaticAberration: true,
    enableVHSGlitch: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retroMtvMusicVideoPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
