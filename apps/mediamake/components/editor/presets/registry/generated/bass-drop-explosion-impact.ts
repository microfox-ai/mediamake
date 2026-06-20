/**
 * Bass Drop Explosion Impact Preset
 *
 * Creates an aggressive bass-drop explosion effect with intense visual impact.
 * Features include radial burst, shockwave rings, light rays, screen shake,
 * white-out flash, and pulsing glow effects synchronized to create maximum impact.
 *
 * Features:
 * - Text scales from 0 to 1.1 (overshoot) then settles to 1 with spring easing
 * - Three staggered shockwave rings expanding from center
 * - Eight light rays rotating at 45-degree intervals
 * - Screen shake effect for first 100ms
 * - Brief white-out flash (1-2 frames at impact)
 * - Intense glow that pulses once then fades
 * - All effects synchronized for maximum bass-drop impact
 *
 * Use cases:
 * - Music video bass drops
 * - Action scene transitions
 * - High-energy impact moments
 * - Dramatic reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().default('IMPACT').describe('Text to display on impact'),
  duration: z
    .number()
    .default(1.5)
    .describe('Total duration of the explosion effect in seconds'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the impact text'),
  glowColor: z
    .string()
    .default('currentColor')
    .describe('Color of the glow effect (use "currentColor" to match text)'),
  shockwaveColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the shockwave rings'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size of the impact text in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    glowColor,
    shockwaveColor,
    fontSize,
  } = params;

  // Timing constants
  const screenShakeDuration = 0.1; // 100ms
  const whiteFlashDuration = 0.05; // ~1-2 frames at 30fps
  const textScaleOvershootTime = 0.1; // Time to reach 1.1 scale
  const textScaleSettleTime = 0.2; // Time to settle to 1.0 scale
  const glowPulseDuration = 0.3; // Glow pulse duration
  const shockwaveDuration = 0.5; // Shockwave expansion duration
  const shockwaveStagger = 0.05; // Stagger between shockwaves
  const lightRayDuration = 0.3; // Light ray expansion duration

  // Generate 8 light rays at 45-degree intervals
  const lightRayCount = 8;
  const lightRays: RenderableComponentData[] = [];
  for (let i = 0; i < lightRayCount; i++) {
    const rotation = i * 45; // 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°
    lightRays.push({
      id: `bass-drop-ray-${i}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute h-0.5 w-full bg-gradient-to-r from-transparent via-white/30 to-transparent',
        style: {
          transformOrigin: 'center',
          transform: `rotate(${rotation}deg)`,
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
          id: `ray-scale-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: lightRayDuration,
            mode: 'provider',
            targetIds: [`bass-drop-ray-${i}`],
            ranges: [
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 20, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Generate 3 staggered shockwave rings
  const shockwaveCount = 3;
  const shockwaves: RenderableComponentData[] = [];
  for (let i = 0; i < shockwaveCount; i++) {
    const startTime = i * shockwaveStagger;
    shockwaves.push({
      id: `bass-drop-shockwave-${i}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute rounded-full border-2',
        style: {
          width: '100px',
          height: '100px',
          borderColor: `${shockwaveColor}66`, // 40% opacity
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
          id: `shockwave-expand-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: startTime,
            duration: shockwaveDuration,
            mode: 'provider',
            targetIds: [`bass-drop-shockwave-${i}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 4, prog: 1 },
              { key: 'opacity', val: 0.5, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Light rays container
  const lightRaysContainer: RenderableComponentData = {
    id: 'bass-drop-light-rays-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
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
    childrenData: lightRays,
  };

  // Shockwave container
  const shockwaveContainer: RenderableComponentData = {
    id: 'bass-drop-shockwave-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: shockwaves,
  };

  // White flash overlay
  const whiteFlash: RenderableComponentData = {
    id: 'bass-drop-white-flash',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 bg-white pointer-events-none',
      style: {
        zIndex: 50,
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
        id: 'white-flash-fade',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: whiteFlashDuration,
          mode: 'provider',
          targetIds: ['bass-drop-white-flash'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Text element with all effects
  const textElement: RenderableComponentData = {
    id: 'bass-drop-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-black uppercase',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        zIndex: 30,
        textShadow: `0 0 20px ${glowColor}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Text scale: 0 → 1.1 → 1 with spring easing
      {
        id: 'text-scale',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: textScaleSettleTime,
          mode: 'provider',
          targetIds: ['bass-drop-text'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1.1, prog: textScaleOvershootTime / textScaleSettleTime },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Glow pulse: intense → normal
      {
        id: 'text-glow',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: glowPulseDuration,
          mode: 'provider',
          targetIds: ['bass-drop-text'],
          ranges: [
            { key: 'textShadow', val: `0 0 50px ${glowColor}`, prog: 0 },
            { key: 'textShadow', val: `0 0 10px ${glowColor}`, prog: 1 },
          ],
        },
      },
    ],
  };

  // Shake container (wraps all elements)
  const shakeContainer: RenderableComponentData = {
    id: 'bass-drop-shake-container',
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
    effects: [
      // Screen shake effect - random translation
      {
        id: 'screen-shake',
        componentId: 'shake',
        data: {
          type: 'linear',
          start: 0,
          duration: screenShakeDuration,
          mode: 'provider',
          targetIds: ['bass-drop-shake-container'],
          amplitude: 5,
          frequency: 0.02,
          decay: true,
          axis: 'both',
        },
      },
    ],
    childrenData: [
      whiteFlash,
      lightRaysContainer,
      shockwaveContainer,
      textElement,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bass-drop-explosion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [shakeContainer],
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

const presetMetadata: PresetMetadata = {
  id: 'bass-drop-explosion-impact',
  title: 'Bass Drop Explosion Impact',
  description:
    'Aggressive bass-drop explosion preset with radial burst effects, shockwave rings, light rays, screen shake, white-out flash, and pulsing glow. Creates intense impact effects for music video drops and action transitions with overshoot text scaling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'impact',
    'bass-drop',
    'explosion',
    'shockwave',
    'light-rays',
    'screen-shake',
    'flash',
    'glow',
    'music-video',
    'action',
  ],
  defaultInputParams: {
    text: 'IMPACT',
    duration: 1.5,
    textColor: '#FFFFFF',
    glowColor: 'currentColor',
    shockwaveColor: '#FFFFFF',
    fontSize: 96,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bassDropExplosionImpactPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
