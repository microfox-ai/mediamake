/**
 * Cinematic Title Reveal with Dolly Zoom Effect (Vertigo Effect)
 *
 * This preset creates a dramatic cinematic title reveal featuring:
 * - Dolly zoom effect (vertigo effect from filmmaking)
 * - Text scales up while background scales down inversely
 * - Heavy elastic bounce with impactful landing feel
 * - Multiple layered BaseLayouts for inverse scaling effect
 * - Lens distortion effects using CSS filters during zoom
 * - Speed lines during fast scale-up phase
 * - Powerful psychological impact through opposing scale directions
 *
 * Technical Features:
 * - Nested BaseLayouts: outer viewport, middle for inverse background scale, inner for text
 * - Text scaling: 0 → 1.4 → 0.9 → 1.05 → 1.0 (elastic bounce)
 * - Background scaling: 1 → 0.85 → 1.0 (inverse to text)
 * - Perspective: 1000px for depth
 * - Heavy easing: cubic-bezier(0.9, 0.03, 0.69, 0.22) for impact
 * - Speed lines: Multiple elements with scaleX: 0 → 50
 * - Filter animation: blur(5px) + contrast(200%) during peak velocity
 * - Optional fitDurationTo: 'media' support for video backgrounds
 *
 * Use Cases:
 * - Movie title reveals with dramatic impact
 * - Trailer titles with psychological tension
 * - Epic reveal moments in video content
 * - Dramatic brand intros with heavy impact
 * - Music video title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('EPIC TITLE')
    .describe('The title text to display with dramatic reveal'),

  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of the entire effect in seconds'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .describe('Font size of the title text in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the title text (hex or CSS color)'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:900", "BebasNeue")',
    ),

  textGlow: z
    .boolean()
    .default(true)
    .describe('Whether to add glow effect to text'),

  backgroundColor: z
    .string()
    .optional()
    .describe(
      'Optional background color for the background layer (hex or CSS color)',
    ),

  speedLineCount: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Number of speed lines during scale-up (0 to disable)'),

  speedLineColor: z
    .string()
    .default('#ffffff')
    .describe('Color of speed lines (hex or CSS color)'),

  speedLineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Initial opacity of speed lines'),

  impactIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for the impact effect'),

  enableLensDistortion: z
    .boolean()
    .default(true)
    .describe('Whether to enable lens distortion (blur + contrast) effects'),

  fitDurationToMedia: z
    .boolean()
    .default(false)
    .describe('If true, fit duration to media background (use with video backgrounds)'),

  trackName: z
    .string()
    .default('cinematic-title-reveal')
    .describe('Unique identifier for this title reveal track'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    textColor,
    font,
    textGlow,
    backgroundColor,
    speedLineCount,
    speedLineColor,
    speedLineOpacity,
    impactIntensity,
    enableLensDistortion,
    fitDurationToMedia,
    trackName,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
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
  } else {
    fontStyle.fontWeight = 900; // Default to bold for title
  }

  // Generate unique IDs
  const viewportId = `${trackName}-viewport`;
  const backgroundLayerId = `${trackName}-background`;
  const textLayerId = `${trackName}-text-layer`;
  const textId = `${trackName}-text`;
  const speedLinesContainerId = `${trackName}-speed-lines`;

  // ============================================================================
  // BACKGROUND SCALE LAYER
  // ============================================================================

  const backgroundLayer: RenderableComponentData = {
    id: backgroundLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
          ...(backgroundColor ? { backgroundColor } : {}),
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationToMedia ? undefined : duration,
        ...(fitDurationToMedia ? { fitDurationTo: 'media' } : {}),
      },
    },
    childrenData: [],
  };

  // ============================================================================
  // TEXT LAYER
  // ============================================================================

  const textLayer: RenderableComponentData = {
    id: textLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationToMedia ? undefined : duration,
        ...(fitDurationToMedia ? { fitDurationTo: 'media' } : {}),
      },
    },
    childrenData: [
      {
        id: textId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            textAlign: 'center',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            ...fontStyle,
            ...(textGlow
              ? {
                  textShadow:
                    '0 0 20px rgba(255, 255, 255, 0.5), 0 0 40px rgba(255, 255, 255, 0.3)',
                }
              : {}),
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : { weights: ['900'] }),
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: fitDurationToMedia ? undefined : duration,
            ...(fitDurationToMedia ? { fitDurationTo: 'media' } : {}),
          },
        },
      } as RenderableComponentData,
    ],
  };

  // ============================================================================
  // SPEED LINES
  // ============================================================================

  const speedLines: RenderableComponentData[] = [];
  const speedLinePositions = [20, 35, 50, 65, 80];

  for (let i = 0; i < speedLineCount && i < speedLinePositions.length; i++) {
    const speedLineId = `${trackName}-speed-line-${i}`;
    const position = speedLinePositions[i];
    const delay = i * 0.05; // Stagger delays: 0s, 0.05s, 0.1s, 0.15s, 0.2s

    speedLines.push({
      id: speedLineId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style='width: 100%; height: 2px; background: ${speedLineColor};'></div>`,
        className: 'absolute',
        style: {
          top: `${position}%`,
          left: 0,
          right: 0,
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: fitDurationToMedia ? undefined : duration,
          ...(fitDurationToMedia ? { fitDurationTo: 'media' } : {}),
        },
      },
    } as RenderableComponentData);
  }

  const speedLinesContainer: RenderableComponentData = {
    id: speedLinesContainerId,
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
        duration: fitDurationToMedia ? undefined : duration,
        ...(fitDurationToMedia ? { fitDurationTo: 'media' } : {}),
      },
    },
    childrenData: speedLines,
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  const effects = [];

  // Text scale effect (0 → 1.4 → 0.9 → 1.05 → 1.0)
  const textScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textLayerId],
    ranges: [
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: 1.4 * impactIntensity, prog: 0.4 },
      { key: 'scale', val: 0.9, prog: 0.7 },
      { key: 'scale', val: 1.05, prog: 0.85 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: `${trackName}-text-scale-effect`,
    componentId: 'generic',
    data: textScaleEffect,
  });

  // Background scale effect (1 → 0.85 → 1.0) - inverse to text
  const backgroundScaleEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [backgroundLayerId],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 0.85, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  effects.push({
    id: `${trackName}-background-scale-effect`,
    componentId: 'generic',
    data: backgroundScaleEffect,
  });

  // Lens distortion effect (blur + contrast during peak velocity)
  if (enableLensDistortion) {
    const lensDistortionEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [viewportId],
      ranges: [
        { key: 'filter', val: 'blur(0px) contrast(100%)', prog: 0 },
        { key: 'filter', val: 'blur(5px) contrast(200%)', prog: 0.3 },
        { key: 'filter', val: 'blur(0px) contrast(100%)', prog: 0.6 },
      ],
    };

    effects.push({
      id: `${trackName}-lens-distortion-effect`,
      componentId: 'generic',
      data: lensDistortionEffect,
    });
  }

  // Speed line effects (scaleX: 0 → 50, opacity: 0.8 → 0)
  for (let i = 0; i < speedLineCount && i < speedLinePositions.length; i++) {
    const speedLineId = `${trackName}-speed-line-${i}`;
    const delay = i * 0.05;
    const speedLineDuration = 1.2;

    const speedLineEffect: GenericEffectData = {
      type: 'ease-out',
      start: delay,
      duration: speedLineDuration,
      mode: 'provider',
      targetIds: [speedLineId],
      ranges: [
        { key: 'scaleX', val: 0, prog: 0 },
        { key: 'scaleX', val: 50, prog: 1 },
        { key: 'opacity', val: speedLineOpacity, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    effects.push({
      id: `${trackName}-speed-line-${i}-effect`,
      componentId: 'generic',
      data: speedLineEffect,
    });
  }

  // ============================================================================
  // VIEWPORT CONTAINER (ROOT)
  // ============================================================================

  const viewportContainer: RenderableComponentData = {
    id: viewportId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationToMedia ? undefined : duration,
        ...(fitDurationToMedia ? { fitDurationTo: 'media' } : {}),
      },
    },
    effects,
    childrenData: [backgroundLayer, textLayer, speedLinesContainer],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

  return {
    output: {
      childrenData: [viewportContainer] as RenderableComponentData[],
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
  id: 'cinematicTitleRevealDollyZoom',
  title: 'Cinematic Title Reveal with Dolly Zoom Effect',
  description:
    'Dramatic cinematic title reveal featuring dolly zoom (vertigo effect) where text scales up while background scales down inversely, creating powerful psychological impact. Includes heavy elastic bounce animation, lens distortion effects using CSS filters, and dynamic speed lines during the fast scale-up phase.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'reveal',
    'cinematic',
    'dolly-zoom',
    'vertigo',
    'dramatic',
    'impact',
    'elastic',
    'bounce',
    'lens-distortion',
    'speed-lines',
    'text',
    'epic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'EPIC TITLE',
    duration: 3,
    fontSize: 96,
    textColor: '#ffffff',
    font: 'Inter:900',
    textGlow: true,
    backgroundColor: undefined,
    speedLineCount: 5,
    speedLineColor: '#ffffff',
    speedLineOpacity: 0.8,
    impactIntensity: 1,
    enableLensDistortion: true,
    fitDurationToMedia: false,
    trackName: 'cinematic-title-reveal',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cinematicTitleRevealDollyZoomPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
