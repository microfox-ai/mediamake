/**
 * Retro Typokinetics VHS Music Video Preset
 *
 * This preset creates a heavily stylized retro music video aesthetic for text, simulating
 * vintage video equipment processing from the 80s and 90s. It treats text as if it's being
 * processed through:
 * 
 * - Time base corrector: Creates subtle horizontal warping/wobbling
 * - Video toaster: Characteristic 80s broadcast look
 * - VHS tracking errors: Aggressive wobble with occasional horizontal splits
 * - Chrome text with exaggerated 3D bevel: WordArt-style depth
 * - Print registration error: Multiple colored outlines (hot pink, electric blue, yellow)
 * - Datamoshing artifacts: Ghost trails from previous frames
 * - Luma key blow-out: Bright chrome parts occasionally bloom to white
 * - Audio-reactive pulsing: Syncs glowing/pulsing effects to audio beats if available
 *
 * Features:
 * - **3D Chrome Bevel Effect**: Multiple text layers with stacked shadows for depth
 * - **Registration Error**: Pink, blue, and yellow offset layers creating print misalignment
 * - **Ghost Trails**: Semi-transparent copies at previous positions for datamosh effect
 * - **Time Base Warp**: Oscillating horizontal scale distortion
 * - **VHS Tracking Errors**: Occasional horizontal splits and rejoins
 * - **Luma Blow-out**: Contrast/brightness spikes with blooming
 * - **Audio Sync**: Optional beat-reactive effects for scale and glow
 *
 * Use cases:
 * - Retro music video titles
 * - 80s/90s aesthetic content
 * - Vaporwave/synthwave visuals
 * - Nostalgic video effects
 * - Glitch art typography
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('RETRO')
    .describe('Text content to display with retro VHS effects'),
  fontSize: z
    .number()
    .min(40)
    .max(300)
    .default(120)
    .describe('Font size in pixels for the main text'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(5)
    .describe('Duration in seconds for the text display'),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source URL for beat-reactive effects (e.g., pulsing and glowing)',
    ),
  enableAudioSync: z
    .boolean()
    .default(false)
    .describe(
      'Enable audio-reactive pulsing and glowing effects synced to bass beats',
    ),
  warpIntensity: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .describe('Intensity of time base corrector horizontal warping (0.01-0.1)'),
  trackingErrorIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe(
      'Intensity of VHS tracking errors - horizontal split displacement in pixels',
    ),
  lumaBlowoutIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Intensity of luma blow-out effect - contrast multiplier (1-2)'),
  ghostTrailOpacity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe(
      'Opacity of ghost trail layers for datamoshing effect (0.1-0.5)',
    ),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    fontSize,
    duration,
    audioSrc,
    enableAudioSync,
    warpIntensity,
    trackingErrorIntensity,
    lumaBlowoutIntensity,
    ghostTrailOpacity,
  } = params;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Generate unique IDs for all text layers
  const generateId = (suffix: string) => `retro-vhs-text-${suffix}`;

  // ============================================================================
  // TEXT LAYER CONFIGURATIONS
  // ============================================================================

  // Shadow layer (black, bottom-most for depth)
  const shadowLayer: RenderableComponentData = {
    id: generateId('shadow'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: '#000000',
        textTransform: 'uppercase' as const,
        textShadow:
          '4px 4px 0px rgba(0,0,0,0.8), 8px 8px 0px rgba(0,0,0,0.5)',
        transform: 'translate(-3px, 3px)',
        mixBlendMode: 'multiply' as const,
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Base chrome layer (main gradient chrome text)
  const baseLayer: RenderableComponentData = {
    id: generateId('base'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      gradient:
        'linear-gradient(135deg, #c0c0c0 0%, #ffffff 40%, #e0e0e0 60%, #a0a0a0 100%)',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        textTransform: 'uppercase' as const,
        textShadow:
          '-2px -2px 4px rgba(255,255,255,0.6), 2px 2px 4px rgba(0,0,0,0.8), 0 0 20px rgba(255,255,255,0.4)',
        filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.5))',
        transform: 'translate(0, 0)',
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Registration error layers (hot pink, electric blue, yellow)
  const pinkLayer: RenderableComponentData = {
    id: generateId('pink'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: '#ff1493',
        textTransform: 'uppercase' as const,
        transform: 'translate(-2px, -2px)',
        mixBlendMode: 'screen' as const,
        opacity: '0.7',
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const blueLayer: RenderableComponentData = {
    id: generateId('blue'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: '#00ffff',
        textTransform: 'uppercase' as const,
        transform: 'translate(2px, -2px)',
        mixBlendMode: 'screen' as const,
        opacity: '0.7',
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const yellowLayer: RenderableComponentData = {
    id: generateId('yellow'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: '#ffff00',
        textTransform: 'uppercase' as const,
        transform: 'translate(0, 2px)',
        mixBlendMode: 'screen' as const,
        opacity: '0.6',
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Ghost trail layers (datamoshing effect)
  const ghostTrail1: RenderableComponentData = {
    id: generateId('ghost-1'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      gradient:
        'linear-gradient(135deg, #c0c0c0 0%, #ffffff 40%, #e0e0e0 60%, #a0a0a0 100%)',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        textTransform: 'uppercase' as const,
        opacity: `${ghostTrailOpacity}`,
        transform: 'translate(-5px, 2px)',
        filter: 'blur(2px)',
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const ghostTrail2: RenderableComponentData = {
    id: generateId('ghost-2'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      gradient:
        'linear-gradient(135deg, #c0c0c0 0%, #ffffff 40%, #e0e0e0 60%, #a0a0a0 100%)',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        textTransform: 'uppercase' as const,
        opacity: `${ghostTrailOpacity * 0.66}`,
        transform: 'translate(-8px, 3px)',
        filter: 'blur(3px)',
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const ghostTrail3: RenderableComponentData = {
    id: generateId('ghost-3'),
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: 'Impact',
        weights: ['400'],
        display: 'swap',
      },
      gradient:
        'linear-gradient(135deg, #c0c0c0 0%, #ffffff 40%, #e0e0e0 60%, #a0a0a0 100%)',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        textTransform: 'uppercase' as const,
        opacity: `${ghostTrailOpacity * 0.33}`,
        transform: 'translate(-11px, 4px)',
        filter: 'blur(4px)',
      },
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // ============================================================================
  // TEXT STACK CONTAINER
  // ============================================================================

  const textStackContainerId = generateId('stack-container');

  // Build effects for the text stack container
  const containerEffects = [];

  // 1. Time base corrector warp (oscillating horizontal scale)
  containerEffects.push({
    id: generateId('time-base-warp'),
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [textStackContainerId],
      ranges: [
        { key: 'scaleX', val: 1 - warpIntensity, prog: 0 },
        { key: 'scaleX', val: 1 + warpIntensity, prog: 0.25 },
        { key: 'scaleX', val: 1 - warpIntensity, prog: 0.5 },
        { key: 'scaleX', val: 1 + warpIntensity, prog: 0.75 },
        { key: 'scaleX', val: 1 - warpIntensity, prog: 1 },
      ],
    },
  });

  // 2. VHS tracking error (aggressive horizontal wobble with occasional splits)
  // Simulate tracking errors with rapid horizontal translateX oscillation
  containerEffects.push({
    id: generateId('vhs-tracking-error'),
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [textStackContainerId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: trackingErrorIntensity * 0.3, prog: 0.05 },
        { key: 'translateX', val: -trackingErrorIntensity * 0.5, prog: 0.1 },
        { key: 'translateX', val: trackingErrorIntensity * 0.7, prog: 0.15 },
        { key: 'translateX', val: 0, prog: 0.2 },
        { key: 'translateX', val: -trackingErrorIntensity * 0.4, prog: 0.45 },
        { key: 'translateX', val: trackingErrorIntensity * 0.6, prog: 0.5 },
        { key: 'translateX', val: 0, prog: 0.55 },
        { key: 'translateX', val: trackingErrorIntensity * 0.8, prog: 0.75 },
        { key: 'translateX', val: -trackingErrorIntensity * 0.3, prog: 0.8 },
        { key: 'translateX', val: 0, prog: 0.85 },
      ],
    },
  });

  // 3. Luma blow-out effect (brightness/contrast spikes)
  containerEffects.push({
    id: generateId('luma-blowout'),
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [textStackContainerId],
      ranges: [
        {
          key: 'filter',
          val: 'contrast(100%) brightness(100%)',
          prog: 0,
        },
        {
          key: 'filter',
          val: `contrast(${lumaBlowoutIntensity * 100}%) brightness(120%)`,
          prog: 0.3,
        },
        {
          key: 'filter',
          val: 'contrast(100%) brightness(100%)',
          prog: 0.4,
        },
        {
          key: 'filter',
          val: `contrast(${lumaBlowoutIntensity * 100}%) brightness(130%)`,
          prog: 0.7,
        },
        {
          key: 'filter',
          val: 'contrast(100%) brightness(100%)',
          prog: 0.8,
        },
      ],
    },
  });

  // 4. Optional audio-reactive effects (beat zoom and glow pulse)
  if (enableAudioSync && audioSrc) {
    // Beat-reactive zoom effect
    containerEffects.push({
      id: generateId('audio-beat-zoom'),
      componentId: 'waveform',
      data: {
        audioSrc,
        audioProperty: 'bass' as const,
        effectType: 'zoom' as const,
        intensity: 0.2,
        baseScale: 1,
        sensitivity: 1.8,
        threshold: 0.25,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider' as const,
        targetIds: [textStackContainerId],
        start: 0,
        duration,
        smoothNormalisation: 1,
      },
    });

    // Beat-reactive glow pulse (simulated via brightness spikes)
    containerEffects.push({
      id: generateId('audio-glow-pulse'),
      componentId: 'waveform',
      data: {
        audioSrc,
        audioProperty: 'bass' as const,
        effectType: 'exposure' as const,
        intensity: 0.4,
        baseBrightness: 1,
        sensitivity: 1.5,
        threshold: 0.2,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider' as const,
        targetIds: [textStackContainerId],
        start: 0,
        duration,
        smoothNormalisation: 1,
      },
    });
  }

  const textStackContainer: RenderableComponentData = {
    id: textStackContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: containerEffects,
    childrenData: [
      shadowLayer,
      ghostTrail3,
      ghostTrail2,
      ghostTrail1,
      baseLayer,
      blueLayer,
      pinkLayer,
      yellowLayer,
    ] as RenderableComponentData[],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: generateId('root'),
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gradient-to-b from-purple-900 to-pink-900',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: [textStackContainer] as RenderableComponentData[],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
  id: 'retro-typokinetics-vhs',
  title: 'Retro Typokinetics VHS Music Video',
  description:
    'Heavy post-production typokinetics preset treating text like vintage video equipment processing. Features time base corrector warping, video toaster broadcast effects, exaggerated 3D chrome bevel with print registration error (hot pink, electric blue, yellow outlines), datamoshing-style ghost trails, luma key blow-out blooming, aggressive VHS wobble with tracking errors, and audio-reactive pulsing/glowing synchronized to beats. Designed for retro music video aesthetics with 80s/90s broadcast character.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'retro',
    'vhs',
    'glitch',
    '80s',
    '90s',
    'music-video',
    'chrome',
    'bevel',
    'registration-error',
    'datamosh',
    'tracking-error',
    'luma-blowout',
    'audio-reactive',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RETRO',
    fontSize: 120,
    duration: 5,
    enableAudioSync: false,
    warpIntensity: 0.02,
    trackingErrorIntensity: 20,
    lumaBlowoutIntensity: 1.5,
    ghostTrailOpacity: 0.3,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const retroTypokineticsVhsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
