/**
 * VHS Ransom Note Text Art Preset
 * 
 * Creates an analog video art piece where text appears as if assembled from VHS tape segments
 * with tracking errors and magnetic distortion. Each word materializes through horizontal scan
 * line builds with random dropouts, static bursts, and authentic VHS artifacts.
 * 
 * Features:
 * - VHS tape segment aesthetic with tracking errors and magnetic distortion
 * - Horizontal scan line build animations with random dropouts
 * - RGB color bleeding and chromatic aberration effects
 * - Authentic VHS artifacts: rainbow static edges, horizontal hold problems
 * - Audio track visualization bars at the bottom
 * - Ransom note style: each word has different video quality and color temperature
 * - CRT curve effect with inset shadow for authentic monitor look
 * - Animated noise overlay and tracking lines
 * - Text shadows with red/blue offsets for color bleed simulation
 * 
 * Use cases:
 * - Creating retro VHS aesthetic titles and overlays
 * - Building glitch art text animations
 * - Adding nostalgic analog video effects
 * - Creating ransom note style typography
 * - Retro gaming or cyberpunk visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  words: z
    .array(z.string())
    .default(['VHS', 'RANSOM', 'NOTE', 'GLITCH', 'ANALOG'])
    .describe('Array of words to display in ransom note style'),
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the composition in seconds'),
  startDelay: z
    .number()
    .default(0)
    .describe('Delay before words start appearing in seconds'),
  scanLineSpeed: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Speed of scan line build animation (lower = faster)'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity of glitch effects (0.1-2, default 1)'),
  colorBleedAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of RGB color bleed in pixels'),
  trackingLineIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of tracking lines (0-1)'),
  audioVisualization: z
    .boolean()
    .default(true)
    .describe('Show audio track visualization bars at bottom'),
  backgroundColor: z
    .string()
    .default('#111111')
    .describe('Background color (dark gray by default)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Font families for ransom note aesthetic (different font per word)
  const fontFamilies = [
    'Anton',
    'Bebas Neue',
    'Oswald',
    'Teko',
    'Barlow Condensed',
    'Impact',
    'Archivo Black',
    'Russo One',
  ];

  // VHS color palettes (different color temperature per word)
  const vhsColors = [
    '#ff00ff', // Magenta
    '#ffff00', // Yellow
    '#00ff00', // Green
    '#ff6600', // Orange
    '#ff0066', // Pink
    '#00ffff', // Cyan
    '#ff3333', // Red
    '#66ff66', // Light green
  ];

  // Calculate timing for word appearances
  const wordCount = params.words.length;
  const staggerDelay = 0.2; // Delay between each word appearance
  const wordAppearDuration = params.scanLineSpeed;
  const totalAppearTime = wordCount * staggerDelay + wordAppearDuration;

  // Helper: Create word component with VHS effects
  const createWordComponent = (
    word: string,
    index: number,
  ): RenderableComponentData => {
    const wordId = `vhs-word-${index}`;
    const fontFamily = fontFamilies[index % fontFamilies.length];
    const color = vhsColors[index % vhsColors.length];

    // Randomize text properties for ransom note effect
    const fontSize = 64 + Math.random() * 24; // 64-88px
    const fontWeight = [600, 700, 800, 900][Math.floor(Math.random() * 4)];
    const skewAmount = (Math.random() - 0.5) * 8; // -4 to 4 degrees
    const letterSpacing = 2 + Math.random() * 4; // 2-6px

    // RGB color bleed offsets
    const bleedOffset = params.colorBleedAmount * params.glitchIntensity;
    const redOffsetX = Math.random() > 0.5 ? bleedOffset : -bleedOffset;
    const blueOffsetX = -redOffsetX;
    const greenOffsetY = (Math.random() - 0.5) * bleedOffset;

    // Contrast and saturation variation
    const contrast = 1.1 + Math.random() * 0.3; // 1.1-1.4
    const saturation = 1.2 + Math.random() * 0.3; // 1.2-1.5
    const brightness = 0.85 + Math.random() * 0.2; // 0.85-1.05

    const wordData: RenderableComponentData = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: color,
          letterSpacing: `${letterSpacing}px`,
          transform: `skewX(${skewAmount}deg)`,
          textShadow: `${redOffsetX}px ${greenOffsetY}px ${color}40, ${blueOffsetX}px ${-greenOffsetY}px ${color === '#ff00ff' ? '#00ffff' : '#ff00ff'}40, 0 ${greenOffsetY}px rgba(255,255,255,${params.trackingLineIntensity})`,
          filter: `contrast(${contrast}) saturate(${saturation}) brightness(${brightness})`,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
          preload: true,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [],
    };

    // Scan line build effect (opacity + clip-path)
    const scanLineEffect = {
      id: `scan-line-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: params.startDelay + index * staggerDelay,
        duration: wordAppearDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          // Opacity fade in
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          // Clip-path horizontal reveal (left to right)
          {
            key: 'clipPath',
            val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
            prog: 0,
          },
          {
            key: 'clipPath',
            val: 'polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%)',
            prog: 0.5,
          },
          {
            key: 'clipPath',
            val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            prog: 1,
          },
        ],
      },
    };

    // Glitch flicker effect (random dropout)
    const glitchEffect = {
      id: `glitch-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start:
          params.startDelay + index * staggerDelay + wordAppearDuration + 0.1,
        duration: params.duration - totalAppearTime - params.startDelay,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.03 },
          { key: 'opacity', val: 1, prog: 0.06 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 0.8, prog: 0.33 },
          { key: 'opacity', val: 1, prog: 0.36 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0.9, prog: 0.62 },
          { key: 'opacity', val: 1, prog: 0.64 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    wordData.effects = [scanLineEffect, glitchEffect];

    return wordData;
  };

  // Create word components
  const wordComponents = params.words.map((word, index) =>
    createWordComponent(word, index),
  );

  // Audio visualization bars (if enabled)
  const audioVizBars: RenderableComponentData[] = [];
  if (params.audioVisualization) {
    const barCount = 16;
    const barColors = [
      '#ff00ff',
      '#00ffff',
      '#ffff00',
      '#ff0066',
      '#00ff00',
      '#ff6600',
    ];

    for (let i = 0; i < barCount; i++) {
      const height = 40 + Math.random() * 60; // 40-100%
      const color1 = barColors[i % barColors.length];
      const color2 = barColors[(i + 1) % barColors.length];

      audioVizBars.push({
        id: `audio-viz-bar-${i}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width:8px;height:${height}%;background:linear-gradient(to top,${color1},${color2});opacity:0.6;border-radius:2px;mix-blend-mode:screen;"></div>`,
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      });
    }
  }

  // Noise overlay with animated background
  const noiseOverlay: RenderableComponentData = {
    id: 'noise-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position:absolute;inset:0;background:url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMTUiLz48L3N2Zz4=);opacity:${0.15 * params.glitchIntensity};mix-blend-mode:overlay;pointer-events:none;"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Tracking lines overlay
  const trackingLinesOverlay: RenderableComponentData = {
    id: 'tracking-lines',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,${params.trackingLineIntensity}) 2px,rgba(0,0,0,${params.trackingLineIntensity}) 4px);pointer-events:none;mix-blend-mode:multiply;"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // CRT curve overlay
  const crtCurveOverlay: RenderableComponentData = {
    id: 'crt-curve',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position:absolute;inset:0;pointer-events:none;border-radius:8px;box-shadow:inset 0 0 80px rgba(0,0,0,0.6);"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Text words container
  const textContainer: RenderableComponentData = {
    id: 'text-words-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex flex-wrap items-center justify-center gap-8 p-12',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: wordComponents,
  };

  // Audio visualization container
  const audioVizContainer: RenderableComponentData = {
    id: 'audio-viz-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute bottom-4 left-0 right-0 flex flex-row justify-center gap-1 px-4',
        style: {
          height: '40px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: audioVizBars,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vhs-ransom-note-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: params.backgroundColor,
          borderRadius: '8px',
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      crtCurveOverlay,
      noiseOverlay,
      trackingLinesOverlay,
      textContainer,
      ...(params.audioVisualization ? [audioVizContainer] : []),
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'vhs-ransom-note-text',
  title: 'VHS Ransom Note Text Art',
  description:
    'Analog video art piece where text appears as if assembled from VHS tape segments with tracking errors and magnetic distortion. Each word materializes through horizontal scan line builds with random dropouts, static bursts, rainbow edges, and color bleeding. The ransom note aesthetic comes from each word having different video quality and color temperature as if sourced from different tapes. Features authentic VHS artifacts including horizontal hold problems, RGB color bleed, scan line animations, and audio track visualization at the bottom.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'vhs',
    'retro',
    'glitch',
    'analog',
    'ransom-note',
    'tracking-errors',
    'magnetic-distortion',
    'scan-lines',
    'rgb-bleed',
    'chromatic-aberration',
    'crt',
    'aesthetic',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    words: ['VHS', 'RANSOM', 'NOTE', 'GLITCH', 'ANALOG'],
    duration: 10,
    startDelay: 0,
    scanLineSpeed: 0.8,
    glitchIntensity: 1,
    colorBleedAmount: 3,
    trackingLineIntensity: 0.3,
    audioVisualization: true,
    backgroundColor: '#111111',
  },
};

// Export preset
export const vhsRansomNoteTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};