/**
 * Holographic Interference Typography Preset
 *
 * Creates a high-tech kinetic typography effect featuring:
 * - Holographic interference patterns (TV static noise that clears to reveal text)
 * - Glitch effects with RGB channel splits and digital artifacts
 * - Scan lines and matrix-style data stream particles
 * - Per-word unique stabilization patterns with flickering
 * - Progressive reveal from noisy static to crisp typography
 *
 * Use cases:
 * - Futuristic tech demos and presentations
 * - Sci-fi video intros and titles
 * - Digital glitch aesthetic content
 * - Cyberpunk-themed videos
 * - High-tech product reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================
// PRESET PARAMS SCHEMA
// ============================

const presetParams = z.object({
  text: z
    .string()
    .default('HOLOGRAPHIC TEXT')
    .describe('Text to display with holographic interference effect'),
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(64)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#00ff41')
    .describe('Primary text color (default: matrix green)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  staticDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of static overlay fade out (reveal time)'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for glitch effects'),
  wordStaggerDelay: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Time delay between each word stabilization'),
  scanLineCount: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .describe('Number of animated scan lines'),
  particleCount: z
    .number()
    .min(3)
    .max(30)
    .default(12)
    .describe('Number of matrix-style data particles'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color'),
});

// ============================
// PRESET EXECUTION
// ============================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
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

  const words = params.text.split(' ');
  const totalDuration = params.duration;
  const staticDuration = params.staticDuration;
  const glitchIntensity = params.glitchIntensity;
  const wordStaggerDelay = params.wordStaggerDelay;

  // Helper: Create RGB split text shadow
  const createRGBSplit = (offsetPx: number): string => {
    return `${offsetPx}px 0 0 #ff0000, -${offsetPx}px 0 0 #0000ff`;
  };

  // Helper: Generate random offset for glitch
  const randomGlitchOffset = (): number => {
    return (Math.random() - 0.5) * 20 * glitchIntensity;
  };

  // ============================
  // BACKGROUND MATRIX PARTICLES
  // ============================

  const matrixParticles: RenderableComponentData[] = [];
  for (let i = 0; i < params.particleCount; i++) {
    const leftPercent = Math.random() * 100;
    const particleHeight = 30 + Math.random() * 40;
    const speed = 8 + Math.random() * 12; // seconds to fall
    const delay = Math.random() * 2; // random start delay

    const particleId = `matrix-particle-${i}`;

    matrixParticles.push({
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 2px; height: ${particleHeight}px; background: linear-gradient(to bottom, transparent, ${params.textColor}, transparent);"></div>`,
        className: 'absolute',
        style: {
          top: `-${particleHeight}px`,
          left: `${leftPercent}%`,
          opacity: 0.5 + Math.random() * 0.3,
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
          id: `particle-fall-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: delay,
            duration: speed,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              {
                key: 'translateY',
                val: `${(props.config?.height ?? 1080) + particleHeight}px`,
                prog: 1,
              },
            ],
          },
        },
      ],
    });
  }

  // ============================
  // SCAN LINES
  // ============================

  const scanLines: RenderableComponentData[] = [];
  for (let i = 0; i < params.scanLineCount; i++) {
    const topPercent = (i / params.scanLineCount) * 100;
    const scanSpeed = 3 + Math.random() * 4;
    const scanLineId = `scan-line-${i}`;

    scanLines.push({
      id: scanLineId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 1px; background-color: ${params.textColor}; opacity: 0.2;"></div>`,
        className: 'absolute',
        style: {
          top: `${topPercent}%`,
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
          id: `scan-move-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: scanSpeed,
            mode: 'provider',
            targetIds: [scanLineId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              {
                key: 'translateY',
                val: `${(props.config?.height ?? 1080) * 0.3}px`,
                prog: 1,
              },
            ],
          },
        },
      ],
    });
  }

  // ============================
  // TEXT WORDS WITH GLITCH
  // ============================

  const wordComponents: RenderableComponentData[] = words.map(
    (word, index) => {
      const wordId = `word-${index}`;
      const stabilizationTime = staticDuration + index * wordStaggerDelay;

      // Random glitch parameters per word
      const initialOffsetX = randomGlitchOffset();
      const rgbSplitOffset = 2 + Math.random() * 3;

      // Glitch effect: opacity flicker during unstable phase
      const glitchEffect = {
        id: `glitch-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: stabilizationTime,
          mode: 'provider' as const,
          targetIds: [wordId],
          ranges: [
            // Opacity flicker (0.3 → 1 → 0.5 → 1)
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 0.5, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.7, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 1 },
            // TranslateX: glitch offset → 0
            { key: 'translateX', val: initialOffsetX, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'font-bold tracking-wider',
          style: {
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            textShadow: `${createRGBSplit(rgbSplitOffset)}, 0 0 20px ${params.textColor}`,
            marginRight: '0.4em',
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
            duration: totalDuration,
          },
        },
        effects: [glitchEffect],
      };
    },
  );

  // ============================
  // TEXT CONTAINER LAYER
  // ============================

  const textContainerLayer: RenderableComponentData = {
    id: 'text-container-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20 flex items-center justify-center',
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

  // ============================
  // STATIC OVERLAY LAYER
  // ============================

  const staticOverlayId = 'static-overlay-layer';

  const staticOverlayLayer: RenderableComponentData = {
    id: staticOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-30 mix-blend-screen pointer-events-none',
        style: {
          backgroundImage:
            'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==)',
          backgroundSize: '200px 200px',
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
        id: 'static-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: staticDuration,
          mode: 'provider',
          targetIds: [staticOverlayId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // ============================
  // BACKGROUND LAYER
  // ============================

  const backgroundLayer: RenderableComponentData = {
    id: 'background-matrix-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: matrixParticles,
  };

  // ============================
  // SCAN LINES LAYER
  // ============================

  const scanLinesLayer: RenderableComponentData = {
    id: 'scan-lines-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-15 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: scanLines,
  };

  // ============================
  // ROOT CONTAINER
  // ============================

  const rootContainer: RenderableComponentData = {
    id: 'holographic-interference-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      backgroundLayer,
      scanLinesLayer,
      textContainerLayer,
      staticOverlayLayer,
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

// ============================
// PRESET METADATA
// ============================

const presetMetadata: PresetMetadata = {
  id: 'holographicInterferenceTypography',
  title: 'Holographic Interference Typography',
  description:
    'A high-tech kinetic typography preset featuring holographic interference patterns, TV static noise that clears to reveal crisp text, glitch effects with RGB channel splits, scan lines, digital artifacts, and matrix-style data stream particles. Each word has unique stabilization timing with flickering and distortion effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'holographic',
    'glitch',
    'interference',
    'static',
    'noise',
    'scan-lines',
    'matrix',
    'particles',
    'rgb-split',
    'digital',
    'artifacts',
    'tech',
    'futuristic',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HOLOGRAPHIC TEXT',
    fontSize: 64,
    font: 'Inter:700',
    textColor: '#00ff41',
    duration: 10,
    staticDuration: 2,
    glitchIntensity: 1,
    wordStaggerDelay: 0.3,
    scanLineCount: 8,
    particleCount: 12,
    backgroundColor: '#000000',
  },
};

// ============================
// EXPORT
// ============================

export const holographicInterferenceTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
