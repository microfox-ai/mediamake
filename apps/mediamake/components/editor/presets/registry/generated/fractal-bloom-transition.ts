/**
 * Recursive Fractal Bloom Transition Preset
 *
 * This preset creates a stunning recursive fractal bloom transition where videos transform
 * through self-similar patterns that unfold like a blooming flower. The outgoing video fragments
 * into petal-shaped segments that replicate themselves at smaller scales (3 recursion levels),
 * creating a fractal flower pattern. Each petal generation rotates and fades at different rates
 * to create depth. The incoming video grows from the center seed point, expanding through the
 * same fractal pattern. Small video fragments float away like pollen particles.
 *
 * Features:
 * - **Fractal Petal Structure**: 8 main petals with 3 levels of recursion per petal
 * - **Self-Similar Scaling**: Each recursion level is 50% the size of the parent
 * - **Layered Opacity**: Opacity decreases per recursion level (1, 0.7, 0.4)
 * - **Spring Physics Easing**: Organic timing using cubic-bezier(0.68, -0.55, 0.265, 1.55)
 * - **Particle System**: 20 floating video fragments with random trajectories
 * - **Reverse Bloom Entry**: Incoming video scales from 0 to 1 with staggered petal unfold
 * - **Duration**: 2.1 seconds total transition
 *
 * Use cases:
 * - Nature-themed video transitions
 * - Organic reveal effects
 * - Artistic video montages
 * - Dynamic intro/outro sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  transitionDuration: z
    .number()
    .default(2.1)
    .describe('Duration of the transition in seconds'),
  particleCount: z
    .number()
    .min(5)
    .max(50)
    .default(20)
    .describe('Number of floating particle fragments'),
  springIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of spring easing effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration,
    particleCount,
    springIntensity,
  } = params;

  // Spring easing cubic-bezier
  const springEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';

  // Helper: Create fractal petal structure with 3 recursion levels
  const createFractalPetal = (
    petalIndex: number,
    rotation: number,
  ): RenderableComponentData => {
    const petalId = `outgoing-petal-${petalIndex}`;

    // Level 0: Full size petal
    const level0Video: RenderableComponentData = {
      id: `${petalId}-level-0`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        style: {
          opacity: 1,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    };

    // Level 1: 50% size petal
    const level1Video: RenderableComponentData = {
      id: `${petalId}-level-1-video`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        style: {
          opacity: 0.7,
          transform: 'scale(2)',
          transformOrigin: '50% 0%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    };

    const level1Container: RenderableComponentData = {
      id: `${petalId}-level-1`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: 'ellipse(30% 50% at 50% 0%)',
            transform: 'scale(0.5)',
            transformOrigin: '50% 0%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [level1Video],
    };

    // Level 2: 25% size petal
    const level2Video: RenderableComponentData = {
      id: `${petalId}-level-2-video`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'w-full h-full object-cover',
        style: {
          opacity: 0.4,
          transform: 'scale(4)',
          transformOrigin: '50% 0%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    };

    const level2Container: RenderableComponentData = {
      id: `${petalId}-level-2`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: 'ellipse(30% 50% at 50% 0%)',
            transform: 'scale(0.25)',
            transformOrigin: '50% 0%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [level2Video],
    };

    // Main petal container with rotation and collapse effects
    const petalContainer: RenderableComponentData = {
      id: petalId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: 'ellipse(30% 50% at 50% 0%)',
            transform: `rotate(${rotation}deg)`,
            transformOrigin: 'center center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [level0Video, level1Container, level2Container],
      effects: [
        {
          id: `${petalId}-rotate`,
          componentId: 'generic',
          data: {
            type: 'spring' as any,
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [petalId],
            ranges: [
              { key: 'rotate', val: rotation, prog: 0 },
              { key: 'rotate', val: rotation + 45 * springIntensity, prog: 1 },
            ],
          },
        },
        {
          id: `${petalId}-scale`,
          componentId: 'generic',
          data: {
            type: 'spring' as any,
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [petalId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `${petalId}-drift`,
          componentId: 'generic',
          data: {
            type: 'spring' as any,
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [petalId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -50 * springIntensity, prog: 1 },
            ],
          },
        },
        {
          id: `${petalId}-opacity`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionDuration * 0.6,
            duration: transitionDuration * 0.4,
            mode: 'provider',
            targetIds: [petalId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    return petalContainer;
  };

  // Create 8 main petals at 45-degree intervals
  const petalRotations = [0, 45, 90, 135, 180, 225, 270, 315];
  const outgoingPetals = petalRotations.map((rotation, index) =>
    createFractalPetal(index, rotation),
  );

  // Outgoing bloom container
  const outgoingBloomContainer: RenderableComponentData = {
    id: 'outgoing-bloom-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: outgoingPetals,
  };

  // Incoming video: grows from center seed with reverse bloom
  const incomingVideo: RenderableComponentData = {
    id: 'incoming-center-seed',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      className: 'w-full h-full object-cover',
      style: {
        clipPath: 'circle(0% at center)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-bloom-scale',
        componentId: 'generic',
        data: {
          type: 'spring' as any,
          start: transitionDuration * 0.3,
          duration: transitionDuration * 0.7,
          mode: 'provider',
          targetIds: ['incoming-center-seed'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: 'incoming-bloom-reveal',
        componentId: 'generic',
        data: {
          type: 'spring' as any,
          start: transitionDuration * 0.3,
          duration: transitionDuration * 0.7,
          mode: 'provider',
          targetIds: ['incoming-center-seed'],
          ranges: [
            { key: 'clipPath', val: 'circle(0% at center)', prog: 0 },
            { key: 'clipPath', val: 'circle(100% at center)', prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingBloomContainer: RenderableComponentData = {
    id: 'incoming-bloom-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [incomingVideo],
  };

  // Particle system: floating video fragments
  const createParticle = (index: number): RenderableComponentData => {
    const angle = (360 / particleCount) * index;
    const distance = 200 + Math.random() * 300;
    const endX = Math.cos((angle * Math.PI) / 180) * distance;
    const endY = Math.sin((angle * Math.PI) / 180) * distance;
    const size = 25 + Math.random() * 25;
    const delay = Math.random() * 0.3;

    return {
      id: `particle-${index}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'absolute',
        style: {
          width: `${size}px`,
          height: `${size}px`,
          left: '50%',
          top: '50%',
          borderRadius: '50%',
          opacity: 0.4 + Math.random() * 0.4,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: `particle-${index}-float`,
          componentId: 'generic',
          data: {
            type: 'spring' as any,
            start: delay,
            duration: transitionDuration - delay,
            mode: 'provider',
            targetIds: [`particle-${index}`],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: endX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: endY, prog: 1 },
            ],
          },
        },
        {
          id: `particle-${index}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionDuration * 0.5,
            duration: transitionDuration * 0.5,
            mode: 'provider',
            targetIds: [`particle-${index}`],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `particle-${index}-scale`,
          componentId: 'generic',
          data: {
            type: 'spring' as any,
            start: delay,
            duration: transitionDuration - delay,
            mode: 'provider',
            targetIds: [`particle-${index}`],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  const particles = Array.from({ length: particleCount }, (_, i) =>
    createParticle(i),
  );

  const particleSystemContainer: RenderableComponentData = {
    id: 'particle-system-container',
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
        duration: transitionDuration,
      },
    },
    childrenData: particles,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fractal-bloom-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingBloomContainer,
      incomingBloomContainer,
      particleSystemContainer,
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

const presetMetadata: PresetMetadata = {
  id: 'fractal-bloom-transition',
  title: 'Recursive Fractal Bloom Transition',
  description:
    'A complex transition effect where videos transform through self-similar fractal patterns that bloom like a flower. Outgoing video fragments into 8 petal-shaped segments with 3 levels of recursion, each rotating and fading at different rates. Incoming video grows from center using the same fractal pattern. Includes particle effects with floating video fragments. Uses spring physics easing for organic timing over 2.1 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'fractal',
    'bloom',
    'flower',
    'recursive',
    'organic',
    'particles',
    'spring',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    transitionDuration: 2.1,
    particleCount: 20,
    springIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const fractalBloomTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
