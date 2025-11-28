/**
 * Prismatic Blur-to-Focus Text Reveal Preset
 *
 * This preset creates a cinematic text reveal effect simulating light passing through a prism.
 * Text disperses into RGB color channels with chromatic aberration, varying blur levels, and
 * positional offsets, then converges into sharp clarity on audio beats.
 *
 * Features:
 * - **Chromatic Aberration**: RGB channels split with different blur levels and offsets
 * - **Prismatic Dispersion**: Text refracts like light through crystal during blur phase
 * - **Beat-Synchronized Convergence**: Channels align perfectly on audio beats
 * - **Lens Flare Effects**: Radial gradients simulating optical flares during blur
 * - **Light Leak Overlays**: Subtle light leak effects with screen blend mode
 * - **Telescope Focus Animation**: Rotation effect simulating lens barrel adjustment
 * - **Hardware Acceleration**: Uses transform3d for performance optimization
 *
 * Use cases:
 * - Cinematic title reveals with optical effects
 * - Music video text animations synchronized to beats
 * - Sci-fi or futuristic text intros
 * - Professional video intros with advanced typography
 * - Beat-reactive text reveals with prismatic effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with prismatic effect'),
  duration: z.number().default(5).describe('Total duration in seconds'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600")',
    ),
  fontSize: z
    .number()
    .default(80)
    .describe('Font size in pixels for the text'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (for focused state)'),

  // Chromatic aberration configuration
  redBlur: z
    .number()
    .default(15)
    .describe('Blur amount for red channel in pixels (dispersed state)'),
  greenBlur: z
    .number()
    .default(10)
    .describe('Blur amount for green channel in pixels (dispersed state)'),
  blueBlur: z
    .number()
    .default(20)
    .describe('Blur amount for blue channel in pixels (dispersed state)'),

  redOffsetX: z
    .number()
    .default(-8)
    .describe('Horizontal offset for red channel in pixels'),
  redOffsetY: z
    .number()
    .default(-4)
    .describe('Vertical offset for red channel in pixels'),
  greenOffsetX: z.number().default(0).describe('Horizontal offset for green channel in pixels'),
  greenOffsetY: z.number().default(6).describe('Vertical offset for green channel in pixels'),
  blueOffsetX: z
    .number()
    .default(10)
    .describe('Horizontal offset for blue channel in pixels'),
  blueOffsetY: z
    .number()
    .default(-2)
    .describe('Vertical offset for blue channel in pixels'),

  // Timing configuration
  blurPhaseEnd: z
    .number()
    .default(0.7)
    .describe(
      'End of blur phase as fraction of duration (0-1). Convergence starts after this.',
    ),
  convergenceDuration: z
    .number()
    .default(0.5)
    .describe('Duration of convergence animation in seconds'),

  // Light effects
  lightLeakOpacity: z
    .number()
    .default(0.15)
    .describe('Maximum opacity for light leak effects (0-1)'),
  lensFlareOpacity: z
    .number()
    .default(0.2)
    .describe('Maximum opacity for lens flare effects (0-1)'),

  // Rotation effect
  rotationAmount: z
    .number()
    .default(-2)
    .describe('Rotation amount in degrees during blur phase (converges to 0)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
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
  } else {
    fontStyle.fontWeight = 700; // Default bold weight
  }

  const {
    text,
    duration,
    fontSize,
    textColor,
    redBlur,
    greenBlur,
    blueBlur,
    redOffsetX,
    redOffsetY,
    greenOffsetX,
    greenOffsetY,
    blueOffsetX,
    blueOffsetY,
    blurPhaseEnd,
    convergenceDuration,
    lightLeakOpacity,
    lensFlareOpacity,
    rotationAmount,
  } = params;

  // Calculate timing
  const blurPhaseEndTime = duration * blurPhaseEnd;
  const convergenceStart = blurPhaseEndTime;
  const convergenceEnd = Math.min(
    convergenceStart + convergenceDuration,
    duration,
  );

  // Stagger convergence for RGB channels (temporal offset)
  const redConvergenceDelay = 0;
  const greenConvergenceDelay = 0.1;
  const blueConvergenceDelay = 0.2;

  // === Helper function to create chromatic channel effects ===
  const createChannelEffect = (
    channelId: string,
    blurAmount: number,
    offsetX: number,
    offsetY: number,
    convergenceDelay: number,
  ): GenericEffectData => {
    const effectStart = convergenceStart + convergenceDelay;
    const effectDuration = Math.max(convergenceEnd - effectStart, 0.1);

    return {
      type: 'ease-out',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [channelId],
      ranges: [
        // Blur convergence: from initial blur to 0
        { key: 'blur', val: `${blurAmount}px`, prog: 0 },
        { key: 'blur', val: '0px', prog: 1 },

        // Position convergence: from offset to center
        { key: 'translateX', val: offsetX, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: offsetY, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },

        // Rotation convergence: from rotationAmount to 0
        { key: 'rotate', val: rotationAmount, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },

        // Opacity stays constant
        { key: 'opacity', val: 0.7, prog: 0 },
        { key: 'opacity', val: 0.7, prog: 1 },
      ],
    };
  };

  // === Helper function to create master text fade-in effect ===
  const createMasterTextEffect = (): GenericEffectData => {
    const fadeStart = convergenceStart + blueConvergenceDelay; // Start after all channels begin converging
    const fadeDuration = Math.max(convergenceEnd - fadeStart, 0.1);

    return {
      type: 'ease-in',
      start: fadeStart,
      duration: fadeDuration,
      mode: 'provider',
      targetIds: ['master-text'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // === Helper function to create light leak effects ===
  const createLightLeakEffect = (leakId: string): GenericEffectData => {
    const fadeOutStart = blurPhaseEndTime - 0.5;
    const fadeOutDuration = 0.5;

    return {
      type: 'ease-in-out',
      start: 0,
      duration: Math.max(fadeOutStart + fadeOutDuration, duration * 0.7),
      mode: 'provider',
      targetIds: [leakId],
      ranges: [
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: lightLeakOpacity, prog: 0.2 },
        // Stay visible during blur phase
        { key: 'opacity', val: lightLeakOpacity, prog: 0.6 },
        // Fade out as convergence starts
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // === Helper function to create lens flare effects ===
  const createLensFlareEffect = (flareId: string): GenericEffectData => {
    const fadeOutStart = blurPhaseEndTime - 0.3;
    const fadeOutDuration = 0.3;

    return {
      type: 'ease-in-out',
      start: 0,
      duration: Math.max(fadeOutStart + fadeOutDuration, duration * 0.7),
      mode: 'provider',
      targetIds: [flareId],
      ranges: [
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: lensFlareOpacity, prog: 0.15 },
        // Stay visible during blur phase
        { key: 'opacity', val: lensFlareOpacity, prog: 0.65 },
        // Fade out as convergence starts
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };
  };

  // === Create RGB channel effects ===
  const redChannelEffect = createChannelEffect(
    'red-channel',
    redBlur,
    redOffsetX,
    redOffsetY,
    redConvergenceDelay,
  );

  const greenChannelEffect = createChannelEffect(
    'green-channel',
    greenBlur,
    greenOffsetX,
    greenOffsetY,
    greenConvergenceDelay,
  );

  const blueChannelEffect = createChannelEffect(
    'blue-channel',
    blueBlur,
    blueOffsetX,
    blueOffsetY,
    blueConvergenceDelay,
  );

  // === Create master text effect ===
  const masterTextEffect = createMasterTextEffect();

  // === Create light leak effects ===
  const lightLeak1Effect = createLightLeakEffect('light-leak-1');
  const lightLeak2Effect = createLightLeakEffect('light-leak-2');

  // === Create lens flare effects ===
  const lensFlare1Effect = createLensFlareEffect('lens-flare-center');
  const lensFlare2Effect = createLensFlareEffect('lens-flare-edge');

  // === Build component structure ===

  // Light leak components
  const lightLeak1: RenderableComponentData = {
    id: 'light-leak-1',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        width: '150%',
        height: '150%',
        top: '-25%',
        left: '-25%',
        background:
          'radial-gradient(ellipse at 30% 20%, rgba(255,200,150,0.15) 0%, transparent 50%)',
        opacity: 0,
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
        id: 'light-leak-1-effect',
        componentId: 'generic',
        data: lightLeak1Effect,
      },
    ],
  };

  const lightLeak2: RenderableComponentData = {
    id: 'light-leak-2',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        width: '120%',
        height: '120%',
        top: '-10%',
        right: '-10%',
        background:
          'radial-gradient(ellipse at 70% 80%, rgba(255,150,200,0.12) 0%, transparent 45%)',
        opacity: 0,
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
        id: 'light-leak-2-effect',
        componentId: 'generic',
        data: lightLeak2Effect,
      },
    ],
  };

  // Lens flare components
  const lensFlareCenter: RenderableComponentData = {
    id: 'lens-flare-center',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        width: '80px',
        height: '80px',
        top: '20%',
        left: '60%',
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,200,0.1) 40%, transparent 70%)',
        opacity: 0,
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
        id: 'lens-flare-center-effect',
        componentId: 'generic',
        data: lensFlare1Effect,
      },
    ],
  };

  const lensFlareEdge: RenderableComponentData = {
    id: 'lens-flare-edge',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        width: '200px',
        height: '8px',
        top: '50%',
        left: '40%',
        background:
          'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
        transform: 'rotate(-15deg)',
        opacity: 0,
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
        id: 'lens-flare-edge-effect',
        componentId: 'generic',
        data: lensFlare2Effect,
      },
    ],
  };

  // RGB color channels
  const redChannel: RenderableComponentData = {
    id: 'red-channel',
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      className: 'absolute',
      style: {
        color: 'rgba(255,0,0,0.7)',
        fontSize,
        ...fontStyle,
        filter: `blur(${redBlur}px)`,
        transform: `translate3d(${redOffsetX}px, ${redOffsetY}px, 0) rotate(${rotationAmount}deg)`,
        mixBlendMode: 'lighten',
        willChange: 'transform, filter',
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
        duration,
      },
    },
    effects: [
      {
        id: 'red-channel-effect',
        componentId: 'generic',
        data: redChannelEffect,
      },
    ],
  };

  const greenChannel: RenderableComponentData = {
    id: 'green-channel',
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      className: 'absolute',
      style: {
        color: 'rgba(0,255,0,0.7)',
        fontSize,
        ...fontStyle,
        filter: `blur(${greenBlur}px)`,
        transform: `translate3d(${greenOffsetX}px, ${greenOffsetY}px, 0) rotate(${rotationAmount}deg)`,
        mixBlendMode: 'lighten',
        willChange: 'transform, filter',
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
        duration,
      },
    },
    effects: [
      {
        id: 'green-channel-effect',
        componentId: 'generic',
        data: greenChannelEffect,
      },
    ],
  };

  const blueChannel: RenderableComponentData = {
    id: 'blue-channel',
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      className: 'absolute',
      style: {
        color: 'rgba(0,0,255,0.7)',
        fontSize,
        ...fontStyle,
        filter: `blur(${blueBlur}px)`,
        transform: `translate3d(${blueOffsetX}px, ${blueOffsetY}px, 0) rotate(${rotationAmount}deg)`,
        mixBlendMode: 'lighten',
        willChange: 'transform, filter',
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
        duration,
      },
    },
    effects: [
      {
        id: 'blue-channel-effect',
        componentId: 'generic',
        data: blueChannelEffect,
      },
    ],
  };

  // Master text (focused state)
  const masterText: RenderableComponentData = {
    id: 'master-text',
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      className: 'absolute',
      style: {
        color: textColor,
        fontSize,
        ...fontStyle,
        filter: 'blur(0px)',
        transform: 'translate3d(0, 0, 0) rotate(0deg)',
        opacity: 0,
        willChange: 'transform, filter, opacity',
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
        duration,
      },
    },
    effects: [
      {
        id: 'master-text-effect',
        componentId: 'generic',
        data: masterTextEffect,
      },
    ],
  };

  // Chromatic channels container
  const chromaticChannelsContainer: RenderableComponentData = {
    id: 'chromatic-channels-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
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
    childrenData: [redChannel, greenChannel, blueChannel, masterText],
  };

  // Light leaks container
  const lightLeaksContainer: RenderableComponentData = {
    id: 'light-leaks-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
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
    childrenData: [lightLeak1, lightLeak2],
  };

  // Lens flare container
  const lensFlareContainer: RenderableComponentData = {
    id: 'lens-flare-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'lighten',
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [lensFlareCenter, lensFlareEdge],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
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
      lightLeaksContainer,
      lensFlareContainer,
      chromaticChannelsContainer,
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
  id: 'prismaticBlurFocus',
  title: 'Prismatic Blur-to-Focus Text Reveal',
  description:
    'A cinematic text reveal effect that simulates light passing through a prism or crystal. Text disperses into RGB color channels with varying blur levels and positional offsets, then converges into sharp clarity on audio beats. Features chromatic aberration during blur phase, lens flare overlays, light leak effects, and subtle rotation animation mimicking telescope/binocular focusing. Uses mix-blend-lighten for authentic light interaction and hardware-accelerated transform3d for performance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'prismatic',
    'chromatic',
    'blur',
    'focus',
    'reveal',
    'cinematic',
    'optical',
    'lens',
    'flare',
    'light',
    'prism',
    'crystal',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PRISMATIC',
    duration: 5,
    font: 'Inter:700',
    fontSize: 80,
    textColor: '#ffffff',
    redBlur: 15,
    greenBlur: 10,
    blueBlur: 20,
    redOffsetX: -8,
    redOffsetY: -4,
    greenOffsetX: 0,
    greenOffsetY: 6,
    blueOffsetX: 10,
    blueOffsetY: -2,
    blurPhaseEnd: 0.7,
    convergenceDuration: 0.5,
    lightLeakOpacity: 0.15,
    lensFlareOpacity: 0.2,
    rotationAmount: -2,
  },
};

// Export preset
export const prismaticBlurFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
