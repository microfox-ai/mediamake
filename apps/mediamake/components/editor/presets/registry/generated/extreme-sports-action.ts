/**
 * Extreme Sports Action Preset
 *
 * This preset creates a high-energy sports/action scene with dynamic background shake,
 * punch zoom effects, speed text with motion blur trails, and impact flashes. Perfect
 * for extreme sports highlights, action montages, and high-intensity content.
 *
 * Features:
 * - **Dynamic Background Shake**: Rapid micro-shakes (±2% translateX/Y) at 0.1s intervals
 * - **Punch Zoom Moments**: Scale 1.0→1.2→1.0 at 30% and 70% marks with ease-out
 * - **Speed Text with Motion Blur**: Text races across screen with trailing blur effect
 * - **Impact Flashes**: Brief white flashes at key moments (30% and 70%)
 * - **Audio-Reactive (Optional)**: Syncs shake intensity to audio beats when available
 *
 * Use cases:
 * - Extreme sports highlight reels
 * - Action montage sequences
 * - High-intensity promotional content
 * - Energetic intro/outro sequences
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
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  backgroundImage: z
    .string()
    .describe('Background image URL or local path for the action scene'),
  textContent: z
    .string()
    .default('EXTREME')
    .describe('Primary text content to display with speed effect'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Total duration of the preset in seconds'),
  shakeIntensity: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Intensity of the background shake effect (percentage)'),
  punchZoomScale: z
    .number()
    .min(1.1)
    .max(1.5)
    .default(1.2)
    .describe('Maximum scale for punch zoom moments'),
  textSpeedDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration for text to travel across screen'),
  motionBlurTrails: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of motion blur trail copies behind the text'),
  impactFlashDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Duration of impact flash effects in seconds'),
  textColor: z
    .string()
    .default('#ff0000')
    .describe('Color of the primary text (hex or CSS color)'),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source for audio-reactive shake (waveform effect)',
    ),
  bassThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Bass intensity threshold for triggering audio-reactive shake'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    backgroundImage,
    textContent,
    duration,
    shakeIntensity,
    punchZoomScale,
    textSpeedDuration,
    motionBlurTrails,
    impactFlashDuration,
    textColor,
    audioSrc,
    bassThreshold,
  } = params;

  // Calculate timing points
  const impactFlash1Time = duration * 0.3;
  const impactFlash2Time = duration * 0.7;

  // ============================================================================
  // BACKGROUND SHAKE CONTAINER
  // ============================================================================

  const backgroundShakeContainer: RenderableComponentData = {
    id: 'extreme-sports-bg-shake-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
    effects: [],
  };

  // ============================================================================
  // BACKGROUND IMAGE
  // ============================================================================

  const backgroundImage_id = 'extreme-sports-bg-image';

  const backgroundImageNode: RenderableComponentData = {
    id: backgroundImage_id,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: backgroundImage,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
  };

  backgroundShakeContainer.childrenData!.push(backgroundImageNode);

  // ============================================================================
  // BACKGROUND SHAKE EFFECT (Micro-shakes ±2%)
  // ============================================================================

  // Create rapid micro-shake keyframes at 0.1s intervals
  const shakeEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: ['extreme-sports-bg-shake-container'],
    ranges: [
      // X-axis shake keyframes
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: shakeIntensity, prog: 0.05 },
      { key: 'translateX', val: -shakeIntensity, prog: 0.1 },
      { key: 'translateX', val: shakeIntensity * 0.8, prog: 0.15 },
      { key: 'translateX', val: -shakeIntensity * 0.8, prog: 0.2 },
      { key: 'translateX', val: shakeIntensity * 0.6, prog: 0.25 },
      { key: 'translateX', val: -shakeIntensity * 0.6, prog: 0.3 },
      { key: 'translateX', val: shakeIntensity, prog: 0.35 },
      { key: 'translateX', val: -shakeIntensity, prog: 0.4 },
      { key: 'translateX', val: shakeIntensity * 0.8, prog: 0.45 },
      { key: 'translateX', val: -shakeIntensity * 0.8, prog: 0.5 },
      { key: 'translateX', val: shakeIntensity * 0.6, prog: 0.55 },
      { key: 'translateX', val: -shakeIntensity * 0.6, prog: 0.6 },
      { key: 'translateX', val: shakeIntensity, prog: 0.65 },
      { key: 'translateX', val: -shakeIntensity, prog: 0.7 },
      { key: 'translateX', val: shakeIntensity * 0.8, prog: 0.75 },
      { key: 'translateX', val: -shakeIntensity * 0.8, prog: 0.8 },
      { key: 'translateX', val: shakeIntensity * 0.5, prog: 0.85 },
      { key: 'translateX', val: -shakeIntensity * 0.5, prog: 0.9 },
      { key: 'translateX', val: 0, prog: 1 },
      // Y-axis shake keyframes
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -shakeIntensity, prog: 0.05 },
      { key: 'translateY', val: shakeIntensity, prog: 0.1 },
      { key: 'translateY', val: -shakeIntensity * 0.8, prog: 0.15 },
      { key: 'translateY', val: shakeIntensity * 0.8, prog: 0.2 },
      { key: 'translateY', val: -shakeIntensity * 0.6, prog: 0.25 },
      { key: 'translateY', val: shakeIntensity * 0.6, prog: 0.3 },
      { key: 'translateY', val: -shakeIntensity, prog: 0.35 },
      { key: 'translateY', val: shakeIntensity, prog: 0.4 },
      { key: 'translateY', val: -shakeIntensity * 0.8, prog: 0.45 },
      { key: 'translateY', val: shakeIntensity * 0.8, prog: 0.5 },
      { key: 'translateY', val: -shakeIntensity * 0.6, prog: 0.55 },
      { key: 'translateY', val: shakeIntensity * 0.6, prog: 0.6 },
      { key: 'translateY', val: -shakeIntensity, prog: 0.65 },
      { key: 'translateY', val: shakeIntensity, prog: 0.7 },
      { key: 'translateY', val: -shakeIntensity * 0.8, prog: 0.75 },
      { key: 'translateY', val: shakeIntensity * 0.8, prog: 0.8 },
      { key: 'translateY', val: -shakeIntensity * 0.5, prog: 0.85 },
      { key: 'translateY', val: shakeIntensity * 0.5, prog: 0.9 },
      { key: 'translateY', val: 0, prog: 1 },
    ],
  };

  backgroundShakeContainer.effects!.push({
    id: 'extreme-sports-shake-effect',
    componentId: 'generic',
    data: shakeEffect,
  });

  // ============================================================================
  // PUNCH ZOOM EFFECT (Scale 1.0→1.2→1.0 at 30% and 70%)
  // ============================================================================

  const punchZoomEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [backgroundImage_id],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: punchZoomScale, prog: 0.3 },
      { key: 'scale', val: 1, prog: 0.5 },
      { key: 'scale', val: punchZoomScale, prog: 0.7 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  backgroundImageNode.effects!.push({
    id: 'extreme-sports-punch-zoom',
    componentId: 'generic',
    data: punchZoomEffect,
  });

  // ============================================================================
  // TEXT SPEED CONTAINER
  // ============================================================================

  const textSpeedContainer: RenderableComponentData = {
    id: 'extreme-sports-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: textSpeedDuration,
      },
    },
    childrenData: [],
    effects: [],
  };

  // ============================================================================
  // PRIMARY TEXT (Racing with Motion Blur)
  // ============================================================================

  const textPrimary_id = 'extreme-sports-text-primary';

  const textPrimaryNode: RenderableComponentData = {
    id: textPrimary_id,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: textContent,
      className: 'absolute z-50 text-8xl font-black uppercase whitespace-nowrap',
      style: {
        color: textColor,
        textShadow: `0 0 20px ${textColor}cc, 0 0 40px ${textColor}88`,
        WebkitTextStroke: '2px black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: textSpeedDuration,
      },
    },
    effects: [],
  };

  // Text speed effect (translateX 150%→-150%)
  const textSpeedEffect: GenericEffectData = {
    type: 'ease-in',
    start: 0,
    duration: textSpeedDuration,
    mode: 'provider',
    targetIds: [textPrimary_id],
    ranges: [
      { key: 'translateX', val: '150%', prog: 0 },
      { key: 'translateX', val: '-150%', prog: 1 },
    ],
  };

  textPrimaryNode.effects!.push({
    id: 'extreme-sports-text-speed',
    componentId: 'generic',
    data: textSpeedEffect,
  });

  // Motion blur effect (blur increases mid-animation)
  const textBlurEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: textSpeedDuration,
    mode: 'provider',
    targetIds: [textPrimary_id],
    ranges: [
      { key: 'filter', val: 'blur(8px)', prog: 0 },
      { key: 'filter', val: 'blur(12px)', prog: 0.5 },
      { key: 'filter', val: 'blur(8px)', prog: 1 },
    ],
  };

  textPrimaryNode.effects!.push({
    id: 'extreme-sports-text-blur',
    componentId: 'generic',
    data: textBlurEffect,
  });

  textSpeedContainer.childrenData!.push(textPrimaryNode);

  // ============================================================================
  // MOTION BLUR TRAILS (3 copies with decreasing opacity and position offset)
  // ============================================================================

  for (let i = 1; i <= motionBlurTrails; i++) {
    const trailOpacity = 0.4 / i; // 0.4, 0.2, 0.133...
    const trailOffset = 20 * i; // +20px, +40px, +60px

    const textTrail_id = `extreme-sports-text-trail-${i}`;

    const textTrailNode: RenderableComponentData = {
      id: textTrail_id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: textContent,
        className: 'absolute z-40 text-8xl font-black uppercase whitespace-nowrap',
        style: {
          color: textColor,
          opacity: trailOpacity,
          textShadow: `0 0 20px ${textColor}cc, 0 0 40px ${textColor}88`,
          WebkitTextStroke: '2px black',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: textSpeedDuration,
        },
      },
      effects: [],
    };

    // Trail speed effect (with offset)
    const trailSpeedEffect: GenericEffectData = {
      type: 'ease-in',
      start: 0,
      duration: textSpeedDuration,
      mode: 'provider',
      targetIds: [textTrail_id],
      ranges: [
        { key: 'translateX', val: `calc(150% + ${trailOffset}px)`, prog: 0 },
        { key: 'translateX', val: `calc(-150% + ${trailOffset}px)`, prog: 1 },
      ],
    };

    textTrailNode.effects!.push({
      id: `extreme-sports-trail-speed-${i}`,
      componentId: 'generic',
      data: trailSpeedEffect,
    });

    // Trail blur effect
    const trailBlurEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: textSpeedDuration,
      mode: 'provider',
      targetIds: [textTrail_id],
      ranges: [
        { key: 'filter', val: 'blur(8px)', prog: 0 },
        { key: 'filter', val: 'blur(12px)', prog: 0.5 },
        { key: 'filter', val: 'blur(8px)', prog: 1 },
      ],
    };

    textTrailNode.effects!.push({
      id: `extreme-sports-trail-blur-${i}`,
      componentId: 'generic',
      data: trailBlurEffect,
    });

    textSpeedContainer.childrenData!.push(textTrailNode);
  }

  // ============================================================================
  // IMPACT FLASH 1 (at 30%)
  // ============================================================================

  const impactFlash1_id = 'extreme-sports-flash-1';

  const impactFlash1: RenderableComponentData = {
    id: impactFlash1_id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-white pointer-events-none',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: impactFlash1Time,
        duration: impactFlashDuration,
      },
    },
    effects: [],
  };

  // Flash fade effect (opacity 1→0)
  const flash1Effect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: impactFlashDuration,
    mode: 'provider',
    targetIds: [impactFlash1_id],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  impactFlash1.effects!.push({
    id: 'extreme-sports-flash-1-effect',
    componentId: 'generic',
    data: flash1Effect,
  });

  // ============================================================================
  // IMPACT FLASH 2 (at 70%)
  // ============================================================================

  const impactFlash2_id = 'extreme-sports-flash-2';

  const impactFlash2: RenderableComponentData = {
    id: impactFlash2_id,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-white pointer-events-none',
        style: {
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: impactFlash2Time,
        duration: impactFlashDuration,
      },
    },
    effects: [],
  };

  // Flash fade effect (opacity 1→0)
  const flash2Effect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: impactFlashDuration,
    mode: 'provider',
    targetIds: [impactFlash2_id],
    ranges: [
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  impactFlash2.effects!.push({
    id: 'extreme-sports-flash-2-effect',
    componentId: 'generic',
    data: flash2Effect,
  });

  // ============================================================================
  // OPTIONAL: AUDIO-REACTIVE WAVEFORM EFFECT
  // ============================================================================

  // If audioSrc is provided, add waveform effect for shake intensity
  if (audioSrc) {
    const waveformShakeEffect = {
      id: 'extreme-sports-waveform-shake',
      componentId: 'waveform',
      data: {
        audioSrc: audioSrc,
        audioProperty: 'bass',
        effectType: 'shake',
        intensity: shakeIntensity * 5, // Amplify for visible shake
        shakeAxis: 'both',
        sensitivity: 1.5,
        threshold: bassThreshold,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: ['extreme-sports-bg-shake-container'],
        start: 0,
        duration: duration,
        smoothNormalisation: 0, // No smoothing for raw impact
      },
    };

    backgroundShakeContainer.effects!.push(waveformShakeEffect);
  }

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'extreme-sports-action-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      backgroundShakeContainer,
      textSpeedContainer,
      impactFlash1,
      impactFlash2,
    ],
    effects: [],
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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'extreme-sports-action',
  title: 'Extreme Sports Action Preset',
  description:
    'High-energy sports/action preset with dynamic background shake, punch zoom effects, speed text with motion blur trails, and impact flashes. Features rapid micro-shakes synchronized to audio beats, explosive zoom moments, racing text with trailing blur effect, and white flash impacts at key moments. Perfect for extreme sports highlights, action montages, and high-intensity content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'sports',
    'action',
    'high-energy',
    'shake',
    'zoom',
    'speed',
    'motion-blur',
    'impact',
    'flash',
    'audio-reactive',
    'extreme',
  ],
  dependencies: {},
  defaultInputParams: {
    backgroundImage: 'https://example.com/extreme-sports-bg.jpg',
    textContent: 'EXTREME',
    duration: 2,
    shakeIntensity: 2,
    punchZoomScale: 1.2,
    textSpeedDuration: 2,
    motionBlurTrails: 3,
    impactFlashDuration: 0.1,
    textColor: '#ff0000',
    bassThreshold: 0.7,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const extremeSportsActionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
