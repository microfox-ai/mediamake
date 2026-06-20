/**
 * Glitchy Cyberpunk Typewriter Effect Preset
 *
 * A corrupted typewriter text effect with cyberpunk aesthetics featuring RGB split,
 * digital noise, scan lines, opacity flickers, and glitch distortions. Text appears
 * with random character glitches and displacement creating a sense of technological
 * dysfunction perfect for sci-fi or thriller contexts.
 *
 * Features:
 * - **RGB Chromatic Aberration**: Red/blue channel splits for digital distortion
 * - **Glitch Displacement**: Random X/Y translation with rapid flickers
 * - **Digital Noise Overlay**: SVG-based noise texture with blend modes
 * - **Scan Line Animation**: Moving scan line effect
 * - **Glitching Cursor**: Cursor that alternates between different symbols
 * - **Color Shifts**: Hue rotation and filter effects for corruption artifacts
 * - **Random Opacity**: Flickering opacity for data transmission errors
 *
 * Use cases:
 * - Sci-fi video intros and titles
 * - Cyberpunk-themed content
 * - Thriller/horror glitch effects
 * - Hacker/tech aesthetic videos
 * - Digital corruption visuals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
  TextAtomData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('SYSTEM COMPROMISED')
    .describe('Text content to display with glitch effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe(
      'Intensity multiplier for glitch effects (higher = more intense)',
    ),
  rgbSplitOffset: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('RGB split offset in pixels for chromatic aberration'),
  color: z
    .string()
    .default('#00ff00')
    .describe('Primary text color (cyberpunk green by default)'),
  font: z
    .string()
    .default('monospace')
    .optional()
    .describe(
      'Font family (e.g., "Courier New", "Roboto Mono", or "monospace")',
    ),
  showCursor: z
    .boolean()
    .default(true)
    .describe('Whether to show the glitching cursor'),
  showNoise: z
    .boolean()
    .default(true)
    .describe('Whether to show digital noise overlay'),
  showScanline: z
    .boolean()
    .default(true)
    .describe('Whether to show scan line effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    glitchIntensity,
    rgbSplitOffset,
    color,
    font,
    showCursor,
    showNoise,
    showScanline,
  } = params;

  // Helper: Generate random glitch displacement ranges
  const generateGlitchRanges = (targetId: string, seed: number) => {
    const glitchCount = Math.floor(5 + Math.random() * 10); // 5-15 glitch points
    const ranges: any[] = [];

    // Base opacity glitch
    for (let i = 0; i <= glitchCount; i++) {
      const prog = i / glitchCount;
      const shouldGlitch = Math.random() < 0.3; // 30% chance of glitch
      ranges.push({
        key: 'opacity',
        val: shouldGlitch ? 0.3 + Math.random() * 0.4 : 1,
        prog,
      });
    }

    // Random displacement
    for (let i = 0; i <= glitchCount; i++) {
      const prog = i / glitchCount;
      const shouldDisplace = Math.random() < 0.2; // 20% chance
      const displacement = shouldDisplace
        ? (Math.random() - 0.5) * 10 * glitchIntensity
        : 0;
      ranges.push({ key: 'translateX', val: displacement, prog });
      ranges.push({
        key: 'translateY',
        val: shouldDisplace ? (Math.random() - 0.5) * 5 * glitchIntensity : 0,
        prog,
      });
    }

    // Random blur
    for (let i = 0; i <= glitchCount; i++) {
      const prog = i / glitchCount;
      const shouldBlur = Math.random() < 0.15; // 15% chance
      ranges.push({
        key: 'filter',
        val: shouldBlur
          ? `blur(${Math.random() * 2 * glitchIntensity}px)`
          : 'blur(0px)',
        prog,
      });
    }

    return ranges;
  };

  // Main text layer
  const mainTextId = 'glitch-main-text';
  const mainTextEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: generateGlitchRanges(mainTextId, 1),
  };

  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color,
        fontFamily: font || 'monospace',
        textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
        letterSpacing: '0.1em',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const mainTextLayer: RenderableComponentData = {
    id: 'main-text-layer',
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
        duration,
      },
    },
    effects: [
      {
        id: 'main-text-glitch-effect',
        componentId: 'generic',
        data: mainTextEffect,
      },
    ],
    childrenData: [mainText],
  };

  // RGB split layers (red and blue channels)
  const rgbRedTextId = 'glitch-rgb-red';
  const rgbRedEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [rgbRedTextId],
    ranges: [
      ...generateGlitchRanges(rgbRedTextId, 2),
      { key: 'translateX', val: -rgbSplitOffset, prog: 0 },
      {
        key: 'translateX',
        val: -rgbSplitOffset + (Math.random() - 0.5) * 2,
        prog: 0.5,
      },
      { key: 'translateX', val: -rgbSplitOffset, prog: 1 },
    ],
  };

  const rgbRedText: RenderableComponentData = {
    id: rgbRedTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: '#ff0000',
        fontFamily: font || 'monospace',
        letterSpacing: '0.1em',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const rgbRedLayer: RenderableComponentData = {
    id: 'rgb-split-layer-red',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          opacity: 0.7,
          mixBlendMode: 'screen',
        },
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
        id: 'rgb-red-glitch-effect',
        componentId: 'generic',
        data: rgbRedEffect,
      },
    ],
    childrenData: [rgbRedText],
  };

  const rgbBlueTextId = 'glitch-rgb-blue';
  const rgbBlueEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [rgbBlueTextId],
    ranges: [
      ...generateGlitchRanges(rgbBlueTextId, 3),
      { key: 'translateX', val: rgbSplitOffset, prog: 0 },
      {
        key: 'translateX',
        val: rgbSplitOffset + (Math.random() - 0.5) * 2,
        prog: 0.5,
      },
      { key: 'translateX', val: rgbSplitOffset, prog: 1 },
    ],
  };

  const rgbBlueText: RenderableComponentData = {
    id: rgbBlueTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: '#0000ff',
        fontFamily: font || 'monospace',
        letterSpacing: '0.1em',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const rgbBlueLayer: RenderableComponentData = {
    id: 'rgb-split-layer-blue',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          opacity: 0.7,
          mixBlendMode: 'screen',
        },
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
        id: 'rgb-blue-glitch-effect',
        componentId: 'generic',
        data: rgbBlueEffect,
      },
    ],
    childrenData: [rgbBlueText],
  };

  // Digital noise overlay
  const noiseOverlay: RenderableComponentData | null = showNoise
    ? ({
        id: 'noise-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='width:100%;height:100%;background-image:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=);'></div>",
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'overlay',
            opacity: 0.4,
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
            id: 'noise-flicker-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration,
              mode: 'provider',
              targetIds: ['noise-overlay'],
              ranges: [
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.5, prog: 0.1 },
                { key: 'opacity', val: 0.2, prog: 0.2 },
                { key: 'opacity', val: 0.6, prog: 0.3 },
                { key: 'opacity', val: 0.3, prog: 0.5 },
                { key: 'opacity', val: 0.4, prog: 0.7 },
                { key: 'opacity', val: 0.5, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData)
    : null;

  // Scan line overlay
  const scanlineOverlay: RenderableComponentData | null = showScanline
    ? ({
        id: 'scanline-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style='width:100%;height:2px;background:rgba(0,255,0,0.3);box-shadow:0 0 10px rgba(0,255,0,0.5);'></div>`,
          className: 'absolute left-0 right-0 pointer-events-none',
          style: {
            top: '0%',
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
            id: 'scanline-move-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration,
              mode: 'provider',
              targetIds: ['scanline-overlay'],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: 1080, prog: 1 }, // Assumes 1080p height
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData)
    : null;

  // Glitching cursor
  const cursorContainer: RenderableComponentData | null = showCursor
    ? ({
        id: 'cursor-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex items-center justify-center',
            style: {
              left: `${50 + text.length * 0.6}%`,
              top: '50%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: [
          {
            id: 'cursor-symbol-1',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '█',
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: '700',
                color,
                fontFamily: font || 'monospace',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: 0.15,
              },
            },
          } as RenderableComponentData,
          {
            id: 'cursor-symbol-2',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '▌',
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: '700',
                color,
                fontFamily: font || 'monospace',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0.15,
                duration: 0.15,
              },
            },
          } as RenderableComponentData,
          {
            id: 'cursor-symbol-3',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '|',
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: '700',
                color,
                fontFamily: font || 'monospace',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0.3,
                duration: 0.2,
              },
            },
          } as RenderableComponentData,
          {
            id: 'cursor-symbol-4',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: '▐',
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: '700',
                color,
                fontFamily: font || 'monospace',
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0.5,
                duration: duration - 0.5,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          {
            id: 'cursor-blink-effect',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration,
              mode: 'provider',
              targetIds: ['cursor-container'],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.05 },
                { key: 'opacity', val: 1, prog: 0.1 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 0.55 },
                { key: 'opacity', val: 1, prog: 0.6 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData)
    : null;

  // Build children data
  const childrenData: RenderableComponentData[] = [
    mainTextLayer,
    rgbRedLayer,
    rgbBlueLayer,
  ];

  if (noiseOverlay) childrenData.push(noiseOverlay);
  if (scanlineOverlay) childrenData.push(scanlineOverlay);
  if (cursorContainer) childrenData.push(cursorContainer);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-typewriter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-typewriter-cyberpunk',
  title: 'Glitchy Cyberpunk Typewriter Effect',
  description:
    'A corrupted typewriter text effect with cyberpunk aesthetics featuring RGB split, digital noise, scan lines, opacity flickers, and glitch distortions. Text appears with random character glitches and displacement creating a sense of technological dysfunction perfect for sci-fi or thriller contexts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'cyberpunk',
    'typewriter',
    'sci-fi',
    'corruption',
    'rgb-split',
    'digital',
    'noise',
    'scanline',
    'dystopian',
    'hacker',
    'thriller',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'SYSTEM COMPROMISED',
    duration: 5,
    fontSize: 64,
    glitchIntensity: 1,
    rgbSplitOffset: 2,
    color: '#00ff00',
    font: 'monospace',
    showCursor: true,
    showNoise: true,
    showScanline: true,
  },
};

// Export preset
export const glitchTypewriterCyberpunkPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
