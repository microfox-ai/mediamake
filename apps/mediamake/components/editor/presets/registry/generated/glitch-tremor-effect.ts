/**
 * Glitch Tremor Effect Preset
 *
 * A cyberpunk-inspired glitchy digital tremor effect with RGB channel splitting,
 * chromatic aberration, frame drops, and scan line distortions. Creates the aesthetic
 * of corrupted video signals and datamoshing artifacts with sharp mathematical position
 * jumps, suggesting unstable technology or hacked systems.
 *
 * Features:
 * - RGB channel splitting with chromatic aberration (red/blue separation)
 * - Sharp, stepped shake animations using steps(1) easing simulation
 * - Random frame drops (opacity flashes) for digital glitch feel
 * - Scan line distortions with moving horizontal patterns
 * - Digital heartbeat pulse effect
 * - All GPU-accelerated transforms (translateX, translateY, scale, opacity)
 *
 * Use cases:
 * - Cyberpunk aesthetic titles and overlays
 * - Tech glitch transitions
 * - Hacker/corrupted system visuals
 * - Digital interference effects
 * - Unstable technology representations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  text: z
    .string()
    .default('GLITCH')
    .describe('Text to display with glitch effect'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(5)
    .describe('Duration of the glitch effect in seconds'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text (e.g., "Inter", "Roboto")'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Glitch intensity multiplier (affects shake distance and RGB split)'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('RGB channel separation distance in pixels'),
  frameDropFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Frequency of frame drops (0 = none, 1 = frequent)'),
  scanlineSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Speed multiplier for scan line animation'),
  enablePulse: z
    .boolean()
    .default(true)
    .describe('Enable digital heartbeat pulse effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontFamily,
    fontSize,
    glitchIntensity,
    rgbSplitIntensity,
    frameDropFrequency,
    scanlineSpeed,
    enablePulse,
  } = params;

  // Calculate glitch parameters
  const shakeDistance = 8 * glitchIntensity;
  const rgbOffset = rgbSplitIntensity * glitchIntensity;

  // Helper: Generate random shake values for digital snap effect
  const generateShakeRanges = (
    distance: number,
    keyframeCount: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const xRanges: Array<{ key: string; val: number; prog: number }> = [];
    const yRanges: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= keyframeCount; i++) {
      const prog = i / keyframeCount;
      // Random values with sharp digital snap
      const xVal = Math.round((Math.random() * 2 - 1) * distance);
      const yVal = Math.round((Math.random() * 2 - 1) * distance * 0.7);

      xRanges.push({ key: 'translateX', val: xVal, prog });
      yRanges.push({ key: 'translateY', val: yVal, prog });
    }

    return [...xRanges, ...yRanges];
  };

  // Helper: Generate RGB split ranges (activate periodically)
  const generateRGBSplitRanges = (
    offset: number,
    isRed: boolean,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const direction = isRed ? -1 : 1;

    // RGB split activates at specific progress points (every ~15%)
    const activationPoints = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9];

    ranges.push({ key: 'translateX', val: 0, prog: 0 });
    ranges.push({ key: 'translateY', val: 0, prog: 0 });

    activationPoints.forEach((point) => {
      // Activate split
      ranges.push({
        key: 'translateX',
        val: offset * direction,
        prog: point,
      });
      ranges.push({
        key: 'translateY',
        val: offset * direction * 0.5,
        prog: point,
      });

      // Deactivate split shortly after
      const deactivatePoint = Math.min(point + 0.03, 1);
      ranges.push({ key: 'translateX', val: 0, prog: deactivatePoint });
      ranges.push({ key: 'translateY', val: 0, prog: deactivatePoint });
    });

    ranges.push({ key: 'translateX', val: 0, prog: 1 });
    ranges.push({ key: 'translateY', val: 0, prog: 1 });

    return ranges;
  };

  // Helper: Generate frame drop ranges (opacity flashes)
  const generateFrameDropRanges = (
    frequency: number,
  ): Array<{ key: string; val: number; prog: number }> => {
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    const dropCount = Math.floor(frequency * 10); // Up to 10 drops based on frequency

    ranges.push({ key: 'opacity', val: 1, prog: 0 });

    for (let i = 1; i <= dropCount; i++) {
      const dropPoint = i / (dropCount + 1);
      const preDropPoint = Math.max(dropPoint - 0.005, 0);
      const postDropPoint = Math.min(dropPoint + 0.005, 1);

      ranges.push({ key: 'opacity', val: 1, prog: preDropPoint });
      ranges.push({ key: 'opacity', val: 0, prog: dropPoint });
      ranges.push({ key: 'opacity', val: 1, prog: postDropPoint });
    }

    ranges.push({ key: 'opacity', val: 1, prog: 1 });

    return ranges;
  };

  // Component IDs
  const rootId = 'glitch-tremor-root';
  const redLayerId = 'rgb-red-layer';
  const blueLayerId = 'rgb-blue-layer';
  const mainTextLayerId = 'main-text-layer';
  const scanlineOverlayId = 'scanline-overlay';

  // Main text layer
  const mainTextLayer: RenderableComponentData = {
    id: mainTextLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0 text-white',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mixBlendMode: 'screen',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Red channel layer
  const redLayer: RenderableComponentData = {
    id: redLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#ff0000',
        mixBlendMode: 'screen',
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Blue channel layer
  const blueLayer: RenderableComponentData = {
    id: blueLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0000ff',
        mixBlendMode: 'screen',
        opacity: 0.7,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: scanlineOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
    effects: [],
  };

  // Create effects

  // Main text shake effect (uses linear with many keyframes to simulate steps)
  const mainShakeEffect = {
    id: 'shake-effect-main',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [mainTextLayerId],
      ranges: generateShakeRanges(shakeDistance, 20),
    } as GenericEffectData,
  };

  // RGB split effect for red layer
  const rgbSplitRedEffect = {
    id: 'rgb-split-red-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [redLayerId],
      ranges: generateRGBSplitRanges(rgbOffset, true),
    } as GenericEffectData,
  };

  // RGB split effect for blue layer
  const rgbSplitBlueEffect = {
    id: 'rgb-split-blue-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [blueLayerId],
      ranges: generateRGBSplitRanges(rgbOffset, false),
    } as GenericEffectData,
  };

  // Frame drop effect (opacity flashes)
  const frameDropEffect = {
    id: 'frame-drop-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [mainTextLayerId, redLayerId, blueLayerId],
      ranges: generateFrameDropRanges(frameDropFrequency),
    } as GenericEffectData,
  };

  // Digital pulse effect (optional)
  const digitalPulseEffect = enablePulse
    ? {
        id: 'digital-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration,
          mode: 'provider' as const,
          targetIds: [rootId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.1 },
            { key: 'scale', val: 1, prog: 0.15 },
            { key: 'scale', val: 1.01, prog: 0.3 },
            { key: 'scale', val: 1, prog: 0.35 },
            { key: 'scale', val: 1.02, prog: 0.5 },
            { key: 'scale', val: 1, prog: 0.55 },
            { key: 'scale', val: 1.01, prog: 0.7 },
            { key: 'scale', val: 1, prog: 0.75 },
            { key: 'scale', val: 1.02, prog: 0.9 },
            { key: 'scale', val: 1, prog: 0.95 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      }
    : null;

  // Scanline shift effect
  const scanlineShiftEffect = {
    id: 'scanline-shift-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: duration / scanlineSpeed,
      mode: 'provider' as const,
      targetIds: [scanlineOverlayId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -50, prog: 0.25 },
        { key: 'translateY', val: -100, prog: 0.5 },
        { key: 'translateY', val: -150, prog: 0.75 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
  };

  // Attach effects to components
  mainTextLayer.effects = [mainShakeEffect, frameDropEffect];
  redLayer.effects = [rgbSplitRedEffect, frameDropEffect];
  blueLayer.effects = [rgbSplitBlueEffect, frameDropEffect];
  scanlineOverlay.effects = [scanlineShiftEffect];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
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
      redLayer,
      blueLayer,
      mainTextLayer,
      scanlineOverlay,
    ] as RenderableComponentData[],
    effects: digitalPulseEffect ? [digitalPulseEffect] : [],
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
  id: 'glitchTremorEffect',
  title: 'Glitch Tremor Effect',
  description:
    'A cyberpunk-inspired glitchy digital tremor effect with RGB channel splitting, chromatic aberration, frame drops, and scan line distortions. Creates the aesthetic of corrupted video signals and datamoshing artifacts with sharp mathematical position jumps, suggesting unstable technology or hacked systems.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'tremor',
    'cyberpunk',
    'rgb-split',
    'chromatic-aberration',
    'scanline',
    'digital',
    'corruption',
    'datamoshing',
    'tech',
    'hacker',
    'interference',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH',
    duration: 5,
    fontFamily: 'Inter',
    fontSize: 72,
    glitchIntensity: 1,
    rgbSplitIntensity: 3,
    frameDropFrequency: 0.3,
    scanlineSpeed: 1,
    enablePulse: true,
  },
};

// Export preset
export const glitchTremorEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
