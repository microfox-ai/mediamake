/**
 * Xerox Degradation Text Effect Preset
 *
 * This preset creates a mechanical text degradation effect that mimics the progressive
 * quality loss of multi-generation photocopies. The text starts clean and gradually
 * accumulates artifacts through increasing contrast, edge bleeding, dust spots, scratches,
 * and geometric distortion. The animation uses stepped transitions for a mechanical feel
 * rather than smooth digital transitions.
 *
 * Features:
 * - Progressive contrast increase (100% → 500%)
 * - Edge bleeding via blur effects
 * - Accumulating dust spots and scratches overlay
 * - Geometric distortion with progressive shake
 * - Paper jam glitch effect (horizontal stretch)
 * - Vertical toner streak artifacts
 * - Stepped transitions for mechanical feel
 * - Minimum 3 second duration for full degradation cycle
 *
 * Use cases:
 * - Retro/vintage text effects
 * - Glitch art and distressed typography
 * - Documentary or historical content transitions
 * - Analog aesthetic overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z
    .string()
    .default('COPY OF A COPY')
    .describe('Text content to display and degrade'),
  duration: z
    .number()
    .min(3)
    .default(5)
    .describe('Duration of the effect in seconds (minimum 3s for full cycle)'),
  fontSize: z
    .number()
    .default(80)
    .describe('Font size in pixels for the main text'),
  font: z
    .string()
    .default('Courier New')
    .describe(
      'Font family to use (monospace fonts work best for xerox effect)',
    ),
  textColor: z
    .string()
    .default('#000000')
    .describe('Text color (black works best for xerox effect)'),
  backgroundColor: z
    .string()
    .default('#f3f4f6')
    .describe('Background color (gray works best for paper effect)'),
  initialContrast: z
    .number()
    .default(1)
    .describe('Initial contrast level (1 = normal, 100%)'),
  midContrast: z
    .number()
    .default(3)
    .describe('Mid-stage contrast level (at 30-60% timeline)'),
  finalContrast: z
    .number()
    .default(5)
    .describe('Final contrast level (at 60-100% timeline)'),
  maxBlur: z
    .number()
    .default(1.5)
    .describe('Maximum blur amount in pixels (for edge bleeding)'),
  shakeIntensity: z
    .number()
    .default(5)
    .describe('Maximum shake intensity in pixels'),
  paperJamEnabled: z
    .boolean()
    .default(true)
    .describe('Enable paper jam glitch effect'),
  paperJamCount: z
    .number()
    .default(2)
    .describe('Number of paper jam glitches during animation'),
  dustSpotCount: z
    .number()
    .default(8)
    .describe('Number of dust spots to generate'),
  scratchCount: z
    .number()
    .default(4)
    .describe('Number of scratch marks to generate'),
  tonerStreakCount: z
    .number()
    .default(4)
    .describe('Number of vertical toner streaks'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    font,
    textColor,
    backgroundColor,
    initialContrast,
    midContrast,
    finalContrast,
    maxBlur,
    shakeIntensity,
    paperJamEnabled,
    paperJamCount,
    dustSpotCount,
    scratchCount,
    tonerStreakCount,
  } = params;

  // Helper: Generate random position
  const randomPosition = (): { top: string; left: string } => {
    return {
      top: `${Math.random() * 80 + 10}%`,
      left: `${Math.random() * 80 + 10}%`,
    };
  };

  // Helper: Generate random rotation
  const randomRotation = (): number => {
    return Math.random() * 30 - 15; // -15 to +15 degrees
  };

  // Create dust spots
  const createDustSpots = (): RenderableComponentData[] => {
    const spots: RenderableComponentData[] = [];
    for (let i = 0; i < dustSpotCount; i++) {
      const pos = randomPosition();
      const size = Math.random() * 2 + 1; // 1-3px
      spots.push({
        id: `dust-spot-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: black; border-radius: 50%; opacity: 0.4;"></div>`,
          className: 'absolute',
          style: {
            top: pos.top,
            left: pos.left,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `dust-fade-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`dust-spot-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.3 },
                { key: 'opacity', val: 0.4, prog: 0.6 },
                { key: 'opacity', val: 0.6, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    return spots;
  };

  // Create scratches
  const createScratches = (): RenderableComponentData[] => {
    const scratches: RenderableComponentData[] = [];
    for (let i = 0; i < scratchCount; i++) {
      const pos = randomPosition();
      const width = Math.random() * 30 + 20; // 20-50px
      const rotation = randomRotation();
      scratches.push({
        id: `scratch-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${width}px; height: 1px; background: black; opacity: 0.3;"></div>`,
          className: 'absolute',
          style: {
            top: pos.top,
            left: pos.left,
            transform: `rotate(${rotation}deg)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `scratch-fade-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`scratch-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.4 },
                { key: 'opacity', val: 0.3, prog: 0.7 },
                { key: 'opacity', val: 0.5, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    return scratches;
  };

  // Create toner streaks
  const createTonerStreaks = (): RenderableComponentData[] => {
    const streaks: RenderableComponentData[] = [];
    const positions = [15, 35, 60, 80]; // Fixed positions for consistency
    for (let i = 0; i < tonerStreakCount; i++) {
      const leftPos = positions[i % positions.length];
      const opacity = 0.1 + Math.random() * 0.15; // 0.1-0.25
      streaks.push({
        id: `toner-streak-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 4px; height: 100%; background: rgba(0,0,0,${opacity});"></div>`,
          className: 'absolute top-0 bottom-0',
          style: {
            left: `${leftPos}%`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `toner-fade-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [`toner-streak-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.5 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    return streaks;
  };

  // Create paper jam glitch effects
  const createPaperJamEffects = (): any[] => {
    if (!paperJamEnabled) return [];

    const glitches: any[] = [];
    for (let i = 0; i < paperJamCount; i++) {
      const startTime = (duration / (paperJamCount + 1)) * (i + 1);
      glitches.push({
        id: `paper-jam-${i}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: startTime,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['degrading-text'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 2.5, prog: 0.3 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      });
    }
    return glitches;
  };

  const mainTextId = 'degrading-text';

  // Main degradation effects (contrast, blur, brightness, shake)
  const mainEffects: any[] = [
    // Progressive contrast increase (0-30%: 100% to 300%)
    {
      id: 'contrast-early',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration * 0.3,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          {
            key: 'filter',
            val: `contrast(${initialContrast * 100}%)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `contrast(${midContrast * 100}%)`,
            prog: 1,
          },
        ],
      },
    },
    // Mid-stage: add blur and brightness variations (30-60%)
    {
      id: 'degrade-mid',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: duration * 0.3,
        duration: duration * 0.3,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          {
            key: 'filter',
            val: `contrast(${midContrast * 100}%) blur(0px) brightness(1)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `contrast(${midContrast * 100}%) blur(${maxBlur * 0.5}px) brightness(0.9)`,
            prog: 1,
          },
        ],
      },
    },
    // Extreme degradation (60-100%): max contrast, max blur, reduced brightness
    {
      id: 'degrade-extreme',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: duration * 0.6,
        duration: duration * 0.4,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          {
            key: 'filter',
            val: `contrast(${midContrast * 100}%) blur(${maxBlur * 0.5}px) brightness(0.9)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `contrast(${finalContrast * 100}%) blur(${maxBlur}px) brightness(0.8)`,
            prog: 1,
          },
        ],
      },
    },
    // Progressive shake (mechanical distortion)
    {
      id: 'shake-progressive',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: shakeIntensity * 0.3, prog: 0.15 },
          { key: 'translateX', val: -shakeIntensity * 0.3, prog: 0.3 },
          { key: 'translateX', val: shakeIntensity * 0.6, prog: 0.45 },
          { key: 'translateX', val: -shakeIntensity * 0.6, prog: 0.6 },
          { key: 'translateX', val: shakeIntensity, prog: 0.75 },
          { key: 'translateX', val: -shakeIntensity, prog: 0.9 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    },
    {
      id: 'shake-progressive-y',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -shakeIntensity * 0.2, prog: 0.2 },
          { key: 'translateY', val: shakeIntensity * 0.2, prog: 0.4 },
          { key: 'translateY', val: -shakeIntensity * 0.5, prog: 0.6 },
          { key: 'translateY', val: shakeIntensity * 0.5, prog: 0.8 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    },
    ...createPaperJamEffects(),
  ];

  // Main text component
  const mainTextComponent: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-5xl font-bold',
      style: {
        fontFamily: font,
        color: textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: mainEffects,
  } as RenderableComponentData;

  // Dust and scratch overlay layer
  const dustScratchLayer: RenderableComponentData = {
    id: 'dust-scratch-overlay',
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
        duration: duration,
      },
    },
    childrenData: [...createDustSpots(), ...createScratches()],
  } as RenderableComponentData;

  // Toner streaks layer
  const tonerStreaksLayer: RenderableComponentData = {
    id: 'toner-streaks-layer',
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
        duration: duration,
      },
    },
    childrenData: createTonerStreaks(),
  } as RenderableComponentData;

  // Main text container (centered)
  const mainTextContainer: RenderableComponentData = {
    id: 'main-text-container',
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
        duration: duration,
      },
    },
    childrenData: [mainTextComponent],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'xerox-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      mainTextContainer,
      dustScratchLayer,
      tonerStreaksLayer,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'xerox-degradation-text',
  title: 'Xerox Degradation Text Effect',
  description:
    'A mechanical text degradation effect that mimics multi-generation photocopying. Features progressive contrast increase, edge bleeding, dust spots, scratches, toner streaks, geometric distortion, and paper jam glitches. The animation uses stepped transitions for a mechanical feel rather than smooth digital transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'retro',
    'vintage',
    'degradation',
    'xerox',
    'photocopy',
    'distortion',
    'mechanical',
    'analog',
  ],
  defaultInputParams: {
    text: 'COPY OF A COPY',
    duration: 5,
    fontSize: 80,
    font: 'Courier New',
    textColor: '#000000',
    backgroundColor: '#f3f4f6',
    initialContrast: 1,
    midContrast: 3,
    finalContrast: 5,
    maxBlur: 1.5,
    shakeIntensity: 5,
    paperJamEnabled: true,
    paperJamCount: 2,
    dustSpotCount: 8,
    scratchCount: 4,
    tonerStreakCount: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const xeroxDegradationTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};