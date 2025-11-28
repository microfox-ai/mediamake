/**
 * Ink Splash Brush Transition Preset
 * 
 * Creates an artistic ink splash transition that bursts from the center outward,
 * simulating ink dropped into water. Features:
 * - Central ink droplet impact that rapidly expands with spring easing
 * - 15 organic tendrils with unique clip-paths extending outward
 * - 25 particle effects simulating ink droplets flying in random directions
 * - 3 concentric ripple effects emanating from the center point
 * - Natural irregularity with staggered timing for organic feel
 * 
 * Use cases:
 * - Artistic video transitions
 * - Creative scene changes
 * - Ink/paint-themed content
 * - Dynamic title reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  inkColor: z
    .string()
    .default('#000000')
    .describe('Color of the ink splash (CSS color value)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Total duration of the transition in seconds'),
  burstIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for the burst expansion'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { inkColor, transitionDuration, burstIntensity } = params;

  // Helper: Generate random value within range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate organic clip-path for tendrils
  const generateTendrilClipPath = (index: number): string => {
    const variation = index % 3;
    switch (variation) {
      case 0:
        return 'polygon(0% 50%, 100% 30%, 100% 70%)';
      case 1:
        return 'polygon(0% 40%, 100% 25%, 100% 75%)';
      case 2:
        return 'polygon(0% 60%, 100% 35%, 100% 80%)';
      default:
        return 'polygon(0% 50%, 100% 30%, 100% 70%)';
    }
  };

  const childrenData: RenderableComponentData[] = [];

  // ===== 1. INK SOURCE (center droplet) =====
  const inkSourceScale = 150 * burstIntensity;

  const inkSource: RenderableComponentData = {
    id: 'ink-splash-source',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full',
        style: {
          backgroundColor: inkColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 1,
      },
    },
    effects: [
      {
        id: 'ink-source-burst',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: 1,
          mode: 'provider',
          targetIds: ['ink-splash-source'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: inkSourceScale, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  childrenData.push(inkSource);

  // ===== 2. TENDRILS (15 organic shapes) =====
  const tendrilCount = 15;
  for (let i = 0; i < tendrilCount; i++) {
    const angle = (360 / tendrilCount) * i;
    const offsetTime = i * 0.05; // Stagger by 0.05s
    const duration = randomRange(1.0, 1.3);
    const length = randomRange(180, 220);
    const width = randomRange(30, 45);
    const rotationVariation = randomRange(-15, 15);

    const tendril: RenderableComponentData = {
      id: `ink-tendril-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-1/2 left-1/2 origin-left',
          style: {
            width: `${length}px`,
            height: `${width}px`,
            backgroundColor: inkColor,
            clipPath: generateTendrilClipPath(i),
            transform: `rotate(${angle}deg)`,
            marginTop: `${-width / 2}px`,
          },
        },
      },
      context: {
        timing: {
          start: offsetTime,
          duration: duration,
        },
      },
      effects: [
        {
          id: `tendril-expand-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [`ink-tendril-${i}`],
            ranges: [
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1 * burstIntensity, prog: 1 },
              { key: 'rotate', val: angle, prog: 0 },
              { key: 'rotate', val: angle + rotationVariation, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };

    childrenData.push(tendril);
  }

  // ===== 3. PARTICLES (25 flying droplets) =====
  const particleCount = 25;
  for (let i = 0; i < particleCount; i++) {
    const offsetTime = i * 0.02; // Stagger by 0.02s
    const duration = randomRange(0.8, 1.2);
    const translateX = randomRange(-200, 200);
    const translateY = randomRange(-200, 200);
    const size = randomRange(4, 10);

    const particle: RenderableComponentData = {
      id: `ink-particle-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute top-1/2 left-1/2 rounded-full',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            backgroundColor: inkColor,
            marginLeft: `${-size / 2}px`,
            marginTop: `${-size / 2}px`,
          },
        },
      },
      context: {
        timing: {
          start: offsetTime,
          duration: duration,
        },
      },
      effects: [
        {
          id: `particle-fly-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [`ink-particle-${i}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: translateX * burstIntensity, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: translateY * burstIntensity, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };

    childrenData.push(particle);
  }

  // ===== 4. RIPPLES (3 concentric rings) =====
  const rippleCount = 3;
  for (let i = 0; i < rippleCount; i++) {
    const offsetTime = i * 0.15; // Stagger by 0.15s
    const duration = 1.5;
    const baseSize = 100;
    const maxScale = 3 * burstIntensity;

    const ripple: RenderableComponentData = {
      id: `ink-ripple-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2',
          style: {
            width: `${baseSize}px`,
            height: `${baseSize}px`,
            borderColor: `${inkColor}33`, // 20% opacity
          },
        },
      },
      context: {
        timing: {
          start: offsetTime,
          duration: duration,
        },
      },
      effects: [
        {
          id: `ripple-expand-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [`ink-ripple-${i}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: maxScale, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };

    childrenData.push(ripple);
  }

  // ===== ROOT CONTAINER =====
  const rootContainer: RenderableComponentData = {
    id: 'ink-splash-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData,
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
  id: 'ink-splash-transition',
  title: 'Ink Splash Brush Transition',
  description:
    'Artistic ink splash transition that bursts from center outward, simulating ink dropped into water. Features a central ink droplet impact that rapidly expands with organic tendrils, flying particle effects, and concentric ripple rings. Uses spring easing for the main burst and staggered timing for natural irregularity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'ink',
    'splash',
    'artistic',
    'organic',
    'burst',
    'particles',
    'ripples',
  ],
  defaultInputParams: {
    inkColor: '#000000',
    transitionDuration: 1.5,
    burstIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const inkSplashTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};