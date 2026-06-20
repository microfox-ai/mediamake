/**
 * Glitch Focus Effect Preset
 *
 * A digital interference effect where heavy glitch artifacts (blur, RGB channel separation,
 * scan lines, noise, matrix distortions) gradually stabilize to reveal sharp text. Features
 * intermittent glitch spikes during the transition for an authentic corrupted video signal
 * recovering effect. Perfect for tech intros, cyberpunk aesthetics, or data recovery visuals.
 *
 * Technical Implementation:
 * - Multiple layered TextAtom components for RGB channel splitting effect
 * - Blur animation from 15px to 0px with periodic 8px spikes (glitch moments)
 * - RGB split via three TextAtom layers with translateX offsets (±5px to 0px)
 * - Scan lines via repeating linear-gradient background with opacity animation
 * - Digital noise overlay via CSS filter fluctuations
 * - Transform matrix distortions (skewY) for authentic digital corruption
 * - 2.5s total duration with 3-4 calculated glitch moments
 * - Uses CSS animations for scan lines, composite layers for RGB splits
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display with glitch effect'),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .default(120)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Primary text color (hex or rgba)'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Total effect duration in seconds'),
  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.0)
    .describe('Intensity multiplier for glitch effects (0.5 = subtle, 2 = extreme)'),
  noiseOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Initial opacity of digital noise overlay (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    duration,
    glitchIntensity,
    noiseOpacity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = fontFamily || 'Inter';
  const parsedFontFamily = fontString.includes(':')
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

  // Calculate glitch spike timings (3-4 moments during transition)
  const calculateGlitchMoments = (totalDuration: number): number[] => {
    // Glitch moments at: 35%, 55%, 75% of duration
    return [0.35, 0.55, 0.75].map((prog) => prog * totalDuration);
  };

  const glitchMoments = calculateGlitchMoments(duration);

  // Helper: Create multi-keyframe blur effect with glitch spikes
  const createBlurEffect = (targetId: string) => {
    const baseBlur = 15 * glitchIntensity;
    const spikeBlur = 8 * glitchIntensity;

    const ranges = [
      { key: 'filter', val: `blur(${baseBlur}px)`, prog: 0 },
      { key: 'filter', val: `blur(${baseBlur * 0.2}px)`, prog: 0.3 },
    ];

    // Add glitch spikes
    glitchMoments.forEach((moment) => {
      const prog = moment / duration;
      ranges.push({ key: 'filter', val: `blur(${spikeBlur}px)`, prog });
      ranges.push({
        key: 'filter',
        val: `blur(${spikeBlur * 0.3}px)`,
        prog: prog + 0.05,
      });
    });

    ranges.push({ key: 'filter', val: 'blur(0px)', prog: 1 });

    return {
      id: `blur-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      },
    };
  };

  // Helper: Create RGB channel offset effect with glitch spikes
  const createRGBOffsetEffect = (
    targetId: string,
    initialOffset: number,
  ) => {
    const ranges = [
      { key: 'translateX', val: `${initialOffset}px`, prog: 0 },
      { key: 'translateX', val: `${initialOffset * 0.2}px`, prog: 0.3 },
    ];

    // Add glitch spikes
    glitchMoments.forEach((moment) => {
      const prog = moment / duration;
      const spikeOffset = initialOffset * 0.5;
      ranges.push({ key: 'translateX', val: `${spikeOffset}px`, prog });
      ranges.push({
        key: 'translateX',
        val: `${spikeOffset * 0.3}px`,
        prog: prog + 0.05,
      });
    });

    ranges.push({ key: 'translateX', val: '0px', prog: 1 });

    return {
      id: `rgb-offset-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      },
    };
  };

  // Helper: Create skewY transform distortion with glitch spikes
  const createSkewEffect = (targetId: string) => {
    const ranges = [
      { key: 'skewY', val: 0.2 * glitchIntensity, prog: 0 },
      { key: 'skewY', val: 0.04 * glitchIntensity, prog: 0.3 },
    ];

    // Add glitch spikes
    glitchMoments.forEach((moment) => {
      const prog = moment / duration;
      ranges.push({ key: 'skewY', val: 0.1 * glitchIntensity, prog });
      ranges.push({
        key: 'skewY',
        val: 0.02 * glitchIntensity,
        prog: prog + 0.05,
      });
    });

    ranges.push({ key: 'skewY', val: 0, prog: 1 });

    return {
      id: `skew-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges,
      },
    };
  };

  // Helper: Create scan lines opacity effect
  const createScanLinesEffect = (targetId: string) => {
    return {
      id: `scan-lines-fade-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.2, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create noise overlay fade effect
  const createNoiseEffect = (targetId: string) => {
    return {
      id: `noise-fade-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: noiseOpacity, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  };

  // ============================================================================
  // COMPONENT STRUCTURE
  // ============================================================================

  const scanLinesLayerId = 'scan-lines-layer';
  const textRedChannelId = 'text-red-channel';
  const textGreenChannelId = 'text-green-channel';
  const textBlueChannelId = 'text-blue-channel';
  const primaryTextLayerId = 'primary-text-layer';
  const noiseOverlayId = 'noise-overlay';

  // RGB channel layers (composite with screen blend mode)
  const textRedChannel: RenderableComponentData = {
    id: textRedChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: 'rgba(255, 0, 0, 0.7)',
        position: 'absolute',
        mixBlendMode: 'screen',
        ...fontStyle,
      },
      font: {
        family: parsedFontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createRGBOffsetEffect(textRedChannelId, -5 * glitchIntensity),
      createSkewEffect(textRedChannelId),
    ],
  };

  const textGreenChannel: RenderableComponentData = {
    id: textGreenChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: 'rgba(0, 255, 0, 0.7)',
        position: 'absolute',
        mixBlendMode: 'screen',
        ...fontStyle,
      },
      font: {
        family: parsedFontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createRGBOffsetEffect(textGreenChannelId, 5 * glitchIntensity),
      createSkewEffect(textGreenChannelId),
    ],
  };

  const textBlueChannel: RenderableComponentData = {
    id: textBlueChannelId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: 'rgba(0, 0, 255, 0.7)',
        position: 'absolute',
        mixBlendMode: 'screen',
        ...fontStyle,
      },
      font: {
        family: parsedFontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createRGBOffsetEffect(textBlueChannelId, 3 * glitchIntensity),
      createSkewEffect(textBlueChannelId),
    ],
  };

  // Primary text layer (white, main text)
  const primaryTextLayer: RenderableComponentData = {
    id: primaryTextLayerId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: textColor,
        position: 'absolute',
        zIndex: 5,
        ...fontStyle,
      },
      font: {
        family: parsedFontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createBlurEffect(primaryTextLayerId),
      createSkewEffect(primaryTextLayerId),
    ],
  };

  // Scan lines layer (repeating linear gradient)
  const scanLinesLayer: RenderableComponentData = {
    id: scanLinesLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [createScanLinesEffect(scanLinesLayerId)],
    childrenData: [],
  };

  // Noise overlay (using HTMLBlockAtom for digital noise pattern)
  const noiseOverlay: RenderableComponentData = {
    id: noiseOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          width: 100%;
          height: 100%;
          background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIgb3BhY2l0eT0iMC4wNSIvPjwvc3ZnPg==');
          background-size: 200px 200px;
          filter: contrast(170%) brightness(1000%);
          mix-blend-mode: overlay;
          pointer-events: none;
        "></div>
      `,
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 15,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [createNoiseEffect(noiseOverlayId)],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-focus-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      scanLinesLayer,
      textRedChannel,
      textGreenChannel,
      textBlueChannel,
      primaryTextLayer,
      noiseOverlay,
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
  id: 'glitch-focus-effect',
  title: 'Glitch Focus Effect',
  description:
    'A digital interference effect where heavy glitch artifacts (blur, RGB channel separation, scan lines, noise) gradually stabilize to reveal sharp text. Features intermittent glitch spikes during the transition for an authentic corrupted video signal recovering effect. Perfect for tech intros, cyberpunk aesthetics, or data recovery visuals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'digital',
    'interference',
    'focus',
    'text',
    'rgb-split',
    'chromatic-aberration',
    'tech',
    'cyberpunk',
    'corruption',
    'data-recovery',
    'kinetic',
    'modern',
  ],
  defaultInputParams: {
    text: 'SIGNAL ACQUIRED',
    fontSize: 120,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    duration: 2.5,
    glitchIntensity: 1.0,
    noiseOpacity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const glitchFocusEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
