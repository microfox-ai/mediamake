/**
 * Macro Lens Zoom Reveal Preset
 *
 * This preset simulates extreme close-up macro photography with a dramatic zoom-out reveal.
 * The text starts at an extreme magnification level (scale 12+) where individual pixels and
 * texture are visible, then smoothly pulls back to reveal the full text at normal scale.
 *
 * Features:
 * - **Extreme Close-Up Start**: Text begins at scale 12 (1200% size) showing pixel-level detail
 * - **Two-Stage Cinematic Zoom**: Fast zoom (12→3) followed by slow zoom (3→1) for dynamic pacing
 * - **Grain/Noise Simulation**: SVG feTurbulence filter simulates camera sensor noise at high magnification
 * - **Focus Breathing Effect**: Pulsing edge blur overlay creates realistic lens focus breathing
 * - **Photographic Quality**: Grain and blur gradually reduce as zoom completes for sharp final result
 * - **Brightness Normalization**: Slight brightness adjustment (1.2→1.0) simulates exposure correction
 *
 * Use cases:
 * - Product reveals with extreme detail emphasis
 * - Logo animations with dramatic scale changes
 * - Title sequences with photographic aesthetic
 * - Technical/scientific content introductions
 * - High-impact text reveals for trailers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().default('REVEAL').describe('Text content to display'),
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(1.5)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(64)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (hex or rgba)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  initialScale: z
    .number()
    .min(5)
    .max(20)
    .default(12)
    .describe('Initial zoom scale (pixel-level magnification)'),
  midScale: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .describe('Mid-point zoom scale for two-stage animation'),
  fastZoomDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.4)
    .describe('Duration of fast zoom phase (12→3) in seconds'),
  grainIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .describe('Initial grain/noise intensity (0-1)'),
  focusBreathingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Focus breathing effect intensity (0-1)'),
  focusBreathingSpeed: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Focus breathing pulse speed in seconds'),
  brightnessStart: z
    .number()
    .min(0.8)
    .max(2)
    .default(1.2)
    .describe('Initial brightness multiplier'),
  brightnessEnd: z
    .number()
    .min(0.8)
    .max(1.5)
    .default(1.0)
    .describe('Final brightness multiplier'),
  trackName: z
    .string()
    .default('macro-zoom-reveal')
    .describe('Unique track identifier'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
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

  const duration = params.duration;
  const fastZoomDuration = params.fastZoomDuration;
  const slowZoomDuration = duration - fastZoomDuration;

  // Calculate progress points for two-stage zoom
  const fastZoomProgress = fastZoomDuration / duration;

  // Component IDs
  const rootContainerId = `${params.trackName}-root`;
  const textWrapperId = `${params.trackName}-text-wrapper`;
  const textAtomId = `${params.trackName}-text`;
  const grainFilterContainerId = `${params.trackName}-grain-filter`;
  const focusOverlayId = `${params.trackName}-focus-overlay`;

  // SVG grain filter (feTurbulence for procedural noise)
  const grainFilterHtml = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <filter id="macro-grain-${params.trackName}">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="${params.grainIntensity}" 
            numOctaves="4" 
            seed="1"
          />
          <feColorMatrix type="saturate" values="0"/>
        </filter>
      </defs>
    </svg>
  `;

  // Focus breathing overlay (radial gradient blur)
  const focusOverlayHtml = `
    <div style="
      position: absolute;
      inset: 0;
      background: radial-gradient(circle, transparent 40%, rgba(0,0,0,${params.focusBreathingIntensity}) 100%);
      pointer-events: none;
      backdrop-filter: blur(3px);
    "></div>
  `;

  // Build text atom
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle || 'normal',
        color: params.textColor,
        textAlign: 'center',
        letterSpacing: '0.05em',
        filter: `url(#macro-grain-${params.trackName})`,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Text wrapper (handles scale transform)
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
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
        duration: duration,
      },
    },
    childrenData: [textAtom],
  };

  // Grain filter container
  const grainFilterContainer: RenderableComponentData = {
    id: grainFilterContainerId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: grainFilterHtml,
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Focus breathing overlay
  const focusOverlay: RenderableComponentData = {
    id: focusOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: focusOverlayHtml,
      style: {
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
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
        duration: duration,
      },
    },
    childrenData: [
      grainFilterContainer,
      textWrapper,
      focusOverlay,
    ] as RenderableComponentData[],
  };

  // Effect 1: Two-stage zoom animation (scale)
  const zoomEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textWrapperId],
    ranges: [
      { key: 'scale', val: params.initialScale, prog: 0 }, // Start at extreme close-up
      { key: 'scale', val: params.midScale, prog: fastZoomProgress }, // Fast zoom to mid-point
      { key: 'scale', val: 1, prog: 1 }, // Slow zoom to normal
    ],
  };

  // Effect 2: Grain reduction (opacity of filter)
  const grainEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'filter', val: `url(#macro-grain-${params.trackName})`, prog: 0 },
      {
        key: 'filter',
        val: `url(#macro-grain-${params.trackName}) opacity(0)`,
        prog: 1,
      },
    ],
  };

  // Effect 3: Focus breathing (pulsing opacity)
  const focusBreathingEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [focusOverlayId],
    ranges: [
      { key: 'opacity', val: params.focusBreathingIntensity, prog: 0 },
      { key: 'opacity', val: 0, prog: 0.3 },
      { key: 'opacity', val: params.focusBreathingIntensity, prog: 0.6 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  // Effect 4: Brightness normalization
  const brightnessEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      {
        key: 'filter',
        val: `brightness(${params.brightnessStart})`,
        prog: 0,
      },
      { key: 'filter', val: `brightness(${params.brightnessEnd})`, prog: 1 },
    ],
  };

  // Attach effects to components
  textWrapper.effects = [
    {
      id: `${params.trackName}-zoom-effect`,
      componentId: 'generic',
      data: zoomEffect,
    },
  ];

  textAtom.effects = [
    {
      id: `${params.trackName}-grain-effect`,
      componentId: 'generic',
      data: grainEffect,
    },
    {
      id: `${params.trackName}-brightness-effect`,
      componentId: 'generic',
      data: brightnessEffect,
    },
  ];

  focusOverlay.effects = [
    {
      id: `${params.trackName}-focus-breathing-effect`,
      componentId: 'generic',
      data: focusBreathingEffect,
    },
  ];

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
  id: 'macro-lens-zoom-reveal',
  title: 'Macro Lens Zoom Reveal',
  description:
    'Extreme close-up photography simulation with text starting at pixel-level magnification (scale 10+) then pulling back to reveal full text. Features grain/noise filters simulating sensor noise, focus breathing effect with rhythmic blur, and photographic quality enhancement as zoom completes. Two-stage cinematic zoom (fast 12→3, slow 3→1) with brightness normalization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'zoom',
    'reveal',
    'macro',
    'photography',
    'grain',
    'noise',
    'focus-breathing',
    'cinematic',
    'dramatic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'REVEAL',
    duration: 1.5,
    fontSize: 64,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    initialScale: 12,
    midScale: 3,
    fastZoomDuration: 0.4,
    grainIntensity: 0.9,
    focusBreathingIntensity: 0.3,
    focusBreathingSpeed: 0.6,
    brightnessStart: 1.2,
    brightnessEnd: 1.0,
    trackName: 'macro-zoom-reveal',
  },
};

// Export preset
export const macroLensZoomRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
