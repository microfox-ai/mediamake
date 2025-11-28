/**
 * Glitch Line Reveal with Digital Interference
 *
 * A cyberpunk-inspired text reveal effect where each line materializes through
 * digital glitch artifacts. Features 3-4 rapid opacity flickers (0-1-0-1-0-1)
 * over 0.8 seconds with micro position jitter (translateX: -2px to 2px)
 * simulating corrupted video signals or streaming artifacts.
 *
 * Features:
 * - Digital glitch reveal animation with opacity flickers
 * - Micro horizontal position jitter during glitches
 * - Varied glitch intensity per line for organic randomness
 * - Optional scanline overlay for enhanced digital aesthetic
 * - Settles at full opacity after reveal
 * - Linear easing for sharp digital feel
 * - Brief color shifts using hue-rotate during glitches
 * - Optimized with will-change for smooth execution
 *
 * Use cases:
 * - Tech and cyberpunk content
 * - Streaming overlays and transitions
 * - Digital interference effects
 * - Corrupted video signal simulations
 * - Futuristic UI reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  lines: z
    .array(
      z.object({
        text: z.string().describe('Text content for the line'),
        startFrom: z
          .number()
          .default(0)
          .describe('Start time for this line (seconds)'),
      }),
    )
    .default([
      { text: 'SYSTEM INITIALIZING...', startFrom: 0 },
      { text: 'LOADING NEURAL INTERFACE', startFrom: 0.5 },
      { text: 'CONNECTION ESTABLISHED', startFrom: 1 },
    ])
    .describe('Array of text lines with staggered start times'),
  glitchDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of glitch reveal animation (seconds)'),
  font: z
    .string()
    .optional()
    .default('Courier New')
    .describe(
      'Font family for text (e.g., "Inter", "Roboto:700", "Courier New")',
    ),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#00FFFF')
    .describe('Text color (hex or CSS color)'),
  enableScanlines: z
    .boolean()
    .default(true)
    .describe('Enable scanline overlay effect'),
  glitchIntensityVariation: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Random variation in glitch intensity per line (0 = uniform, 1 = high variation)',
    ),
  enableColorShift: z
    .boolean()
    .default(true)
    .describe('Enable brief hue-rotate color shifts during glitches'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or CSS color)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    lines,
    glitchDuration,
    font,
    fontSize,
    textColor,
    enableScanlines,
    glitchIntensityVariation,
    enableColorShift,
    backgroundColor,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
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
    return { fontFamily, fontStyle };
  };

  // Helper: Generate random jitter value
  const randomJitter = (base: number, variation: number) => {
    const range = variation * 2;
    return base + (Math.random() * range - variation);
  };

  // Helper: Create glitch effect for a line
  const createGlitchEffect = (
    lineId: string,
    lineIndex: number,
    startFrom: number,
  ) => {
    // Randomize intensity per line
    const intensityFactor =
      1 + (Math.random() - 0.5) * glitchIntensityVariation;
    const duration = glitchDuration * intensityFactor;

    // Random jitter values for each keyframe
    const jitter1 = randomJitter(-2, 1);
    const jitter2 = randomJitter(1, 0.5);
    const jitter3 = randomJitter(-1, 0.5);
    const jitter4 = randomJitter(2, 1);

    // Color shift values (hue-rotate)
    const hueShift1 = enableColorShift ? randomJitter(30, 20) : 0;
    const hueShift2 = enableColorShift ? randomJitter(-20, 15) : 0;

    const ranges: Array<{ key: string; val: any; prog: number }> = [
      // Opacity flickers: 0-1-0-1-0.3-1
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.125 }, // 100ms / 800ms
      { key: 'opacity', val: 0, prog: 0.1875 }, // 150ms / 800ms
      { key: 'opacity', val: 1, prog: 0.375 }, // 300ms / 800ms
      { key: 'opacity', val: 0.3, prog: 0.4375 }, // 350ms / 800ms
      { key: 'opacity', val: 1, prog: 1 }, // 800ms / 800ms

      // Position jitter (translateX)
      { key: 'translateX', val: jitter1, prog: 0 },
      { key: 'translateX', val: jitter2, prog: 0.125 },
      { key: 'translateX', val: jitter3, prog: 0.1875 },
      { key: 'translateX', val: jitter4, prog: 0.375 },
      { key: 'translateX', val: 0, prog: 0.4375 },
      { key: 'translateX', val: 0, prog: 1 },
    ];

    // Add color shift (hue-rotate) if enabled
    if (enableColorShift) {
      ranges.push(
        { key: 'filter', val: `hue-rotate(${hueShift1}deg)`, prog: 0.125 },
        { key: 'filter', val: `hue-rotate(${hueShift2}deg)`, prog: 0.1875 },
        { key: 'filter', val: 'hue-rotate(0deg)', prog: 0.375 },
      );
    }

    const effectData: GenericEffectData = {
      type: 'linear', // Linear easing for digital feel
      start: startFrom, // Relative to parent
      duration: duration,
      mode: 'provider',
      targetIds: [lineId],
      ranges: ranges,
    };

    return {
      id: `glitch-effect-${lineId}`,
      componentId: 'generic',
      data: effectData,
    };
  };

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(font || 'Courier New');

  // Create text line components
  const textLines: RenderableComponentData[] = lines.map((line, index) => {
    const lineId = `glitch-text-line-${index}`;
    const glitchEffect = createGlitchEffect(lineId, index, line.startFrom);

    return {
      id: lineId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: line.text,
        className: 'text-cyan-400 text-3xl',
        style: {
          ...fontStyle,
          fontSize: fontSize,
          color: textColor,
          opacity: 0, // Start invisible
          textShadow: `0 0 10px ${textColor}80`, // 50% opacity glow
          willChange: 'transform, opacity',
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      },
      context: {
        timing: {
          start: line.startFrom,
          duration: glitchDuration + 5, // Ensure visibility after effect
        },
      },
      effects: [glitchEffect],
    } as RenderableComponentData;
  });

  // Create optional scanline overlay
  const scanlineOverlay: RenderableComponentData | null = enableScanlines
    ? ({
        id: 'scanline-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(0,255,255,0.03) 0px, rgba(0,255,255,0.03) 2px, transparent 2px, transparent 4px); pointer-events: none; z-index: 10;"></div>`,
          className: 'absolute inset-0 pointer-events-none',
          style: {
            pointerEvents: 'none',
            zIndex: 10,
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'glitch-root-container',
          },
        },
      } as RenderableComponentData)
    : null;

  // Calculate total duration (last line start + glitch duration + buffer)
  const lastLineStart = Math.max(...lines.map((l) => l.startFrom));
  const totalDuration = lastLineStart + glitchDuration + 5;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `bg-black min-h-screen flex flex-col justify-center items-center font-mono`,
        style: {
          backgroundColor: backgroundColor,
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
      ...(scanlineOverlay ? [scanlineOverlay] : []),
      ...textLines,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'glitch-line-reveal',
  title: 'Glitch Line Reveal with Digital Interference',
  description:
    'A cyberpunk-inspired text reveal effect where each line materializes through digital glitch artifacts. Features 3-4 rapid opacity flickers (0-1-0-1-0-1) over 0.8 seconds with micro position jitter (translateX: -2px to 2px) simulating corrupted video signals. Each line has varied glitch intensity for organic randomness. Includes optional scanline overlay for enhanced digital aesthetic. Perfect for tech, cyberpunk, and streaming content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'reveal',
    'cyberpunk',
    'tech',
    'digital',
    'interference',
    'streaming',
    'flicker',
    'corruption',
  ],
  dependencies: {},
  defaultInputParams: {
    lines: [
      { text: 'SYSTEM INITIALIZING...', startFrom: 0 },
      { text: 'LOADING NEURAL INTERFACE', startFrom: 0.5 },
      { text: 'CONNECTION ESTABLISHED', startFrom: 1 },
    ],
    glitchDuration: 0.8,
    font: 'Courier New',
    fontSize: 48,
    textColor: '#00FFFF',
    enableScanlines: true,
    glitchIntensityVariation: 0.3,
    enableColorShift: true,
    backgroundColor: '#000000',
  },
};

// Export preset
export const glitchLineRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
