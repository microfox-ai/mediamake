/**
 * VHS Tracking Error Text Effect Preset
 *
 * This preset creates an authentic analog VHS tracking error text effect that captures
 * the unstable, jittery quality of damaged videotape. It simulates horizontal displacement
 * glitches that affect different parts of the text independently, as if VHS tracking is
 * misaligned.
 *
 * Features:
 * - Horizontal displacement glitches with varying intensities across vertical bands
 * - RGB channel separation (chromatic aberration) with slight offsets
 * - Periodic 'tracking lines' - horizontal bands of distortion that travel vertically
 * - Aggressive shake (5-10px horizontal displacement) with sudden jumps
 * - Blocky, monospaced font reminiscent of old CRT displays
 * - Scan lines overlay for authenticity
 * - Subtle color bleeding effects
 *
 * Technical Implementation:
 * - Text split into 3 horizontal bands, each with independent glitch animation
 * - RGB channels rendered as separate layers with mix-blend-screen
 * - Generic effects for horizontal displacement with short intervals (0.05-0.15s)
 * - Tracking lines animated vertically using translateY
 * - GPU-accelerated transforms for 60fps performance
 *
 * Use cases:
 * - Retro/vintage video aesthetics
 * - Glitch art and experimental video
 * - Music videos with analog VHS vibe
 * - Horror/thriller title sequences
 * - Lo-fi aesthetic overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter Schema
const presetParams = z.object({
  text: z.string().describe('Text to display with VHS tracking error effect'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the effect in seconds'),
  glitchIntensity: z
    .number()
    .min(1)
    .max(20)
    .default(10)
    .describe('Maximum horizontal displacement in pixels (5-20px recommended)'),
  glitchFrequency: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Time between glitch jumps in seconds (0.05-0.3s)'),
  rgbSplitOffset: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('RGB channel separation offset in pixels'),
  trackingLineSpeed: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Speed of vertical tracking line movement (seconds for full traverse)'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(64)
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('Courier New')
    .describe('Monospace font family (e.g., "Courier New", "Consolas", "Roboto Mono")'),
});

// Preset Execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { fps } = props.config || { fps: 30 };

  // Helper function to generate random glitch displacement keyframes
  const generateGlitchKeyframes = (
    bandIndex: number,
    intensity: number,
    frequency: number,
    duration: number,
  ) => {
    const numKeyframes = Math.floor(duration / frequency);
    const keyframes: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      // Random displacement with different seed per band
      const displacement =
        (Math.sin(i * 3.14159 * (bandIndex + 1) * 0.7) +
          Math.cos(i * 2.71828 * (bandIndex + 1) * 0.3)) *
        intensity *
        0.5;

      keyframes.push({
        key: 'translateX',
        val: displacement,
        prog: progress,
      });
    }

    return keyframes;
  };

  // Create RGB channel layers for each band
  const createRGBLayers = (
    bandId: string,
    bandIndex: number,
  ): RenderableComponentData[] => {
    const glitchKeyframes = generateGlitchKeyframes(
      bandIndex,
      params.glitchIntensity,
      params.glitchFrequency,
      params.duration,
    );

    // Red channel (base, no offset)
    const redLayer: RenderableComponentData = {
      id: `${bandId}-red`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute inset-0 flex items-center justify-center font-mono text-red-500 font-bold',
        style: {
          fontSize: params.fontSize,
          mixBlendMode: 'screen',
          fontFamily: params.font,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `${bandId}-red-glitch`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: params.duration,
            mode: 'provider',
            targetIds: [`${bandId}-red`],
            ranges: glitchKeyframes,
          },
        },
      ],
    };

    // Green channel (offset left)
    const greenLayer: RenderableComponentData = {
      id: `${bandId}-green`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute inset-0 flex items-center justify-center font-mono text-green-500 font-bold',
        style: {
          fontSize: params.fontSize,
          mixBlendMode: 'screen',
          fontFamily: params.font,
          transform: `translateX(-${params.rgbSplitOffset}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `${bandId}-green-glitch`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: params.duration,
            mode: 'provider',
            targetIds: [`${bandId}-green`],
            ranges: glitchKeyframes.map(kf => ({
              ...kf,
              val: kf.val - params.rgbSplitOffset,
            })),
          },
        },
      ],
    };

    // Blue channel (offset right)
    const blueLayer: RenderableComponentData = {
      id: `${bandId}-blue`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute inset-0 flex items-center justify-center font-mono text-blue-500 font-bold',
        style: {
          fontSize: params.fontSize,
          mixBlendMode: 'screen',
          fontFamily: params.font,
          transform: `translateX(${params.rgbSplitOffset}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `${bandId}-blue-glitch`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: params.duration,
            mode: 'provider',
            targetIds: [`${bandId}-blue`],
            ranges: glitchKeyframes.map(kf => ({
              ...kf,
              val: kf.val + params.rgbSplitOffset,
            })),
          },
        },
      ],
    };

    return [redLayer, greenLayer, blueLayer];
  };

  // Create 3 horizontal bands
  const topBand: RenderableComponentData = {
    id: 'text-band-top',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: 0,
          left: 0,
          right: 0,
          height: '33.33%',
          clipPath: 'inset(0% 0% 66.67% 0%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: createRGBLayers('text-band-top', 0),
  };

  const middleBand: RenderableComponentData = {
    id: 'text-band-middle',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '33.33%',
          left: 0,
          right: 0,
          height: '33.34%',
          clipPath: 'inset(33.33% 0% 33.33% 0%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: createRGBLayers('text-band-middle', 1),
  };

  const bottomBand: RenderableComponentData = {
    id: 'text-band-bottom',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: '66.67%',
          left: 0,
          right: 0,
          height: '33.33%',
          clipPath: 'inset(66.67% 0% 0% 0%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: createRGBLayers('text-band-bottom', 2),
  };

  // Text bands container
  const textBandsContainer: RenderableComponentData = {
    id: 'text-bands-container',
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
        duration: params.duration,
      },
    },
    childrenData: [topBand, middleBand, bottomBand],
  };

  // Scanlines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: 'scanlines-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(255,255,255,0.05) 2px, rgba(255,255,255,0.05) 4px)',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
  };

  // Tracking line 1 (slower)
  const trackingLine1: RenderableComponentData = {
    id: 'tracking-line-1',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 right-0 pointer-events-none',
        style: {
          height: '32px',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent)',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'tracking-line-1-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.trackingLineSpeed,
          mode: 'provider',
          targetIds: ['tracking-line-1'],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '100vh', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Tracking line 2 (faster, offset start)
  const trackingLine2: RenderableComponentData = {
    id: 'tracking-line-2',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 right-0 pointer-events-none',
        style: {
          height: '32px',
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.15), transparent)',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'tracking-line-2-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: params.trackingLineSpeed * 0.4,
          duration: params.trackingLineSpeed * 0.8,
          mode: 'provider',
          targetIds: ['tracking-line-2'],
          ranges: [
            { key: 'translateY', val: '-100%', prog: 0 },
            { key: 'translateY', val: '100vh', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vhs-tracking-error-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      textBandsContainer,
      scanlinesOverlay,
      trackingLine1,
      trackingLine2,
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

// Preset Metadata
const presetMetadata: PresetMetadata = {
  id: 'vhs-tracking-error-text',
  title: 'VHS Tracking Error Text Effect',
  description:
    'Analog VHS tracking error text effect with unstable horizontal displacement glitches, RGB channel separation, vertical tracking lines, aggressive jittery shake, scan lines, and color bleeding for authentic damaged videotape aesthetics',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'vhs',
    'glitch',
    'tracking-error',
    'analog',
    'retro',
    'vintage',
    'rgb-split',
    'chromatic-aberration',
    'scan-lines',
    'crt',
    'damaged-tape',
    'lo-fi',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'VHS GLITCH',
    duration: 10,
    glitchIntensity: 10,
    glitchFrequency: 0.1,
    rgbSplitOffset: 2,
    trackingLineSpeed: 3,
    fontSize: 64,
    font: 'Courier New',
  },
};

// Export Preset
export const vhsTrackingErrorTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
