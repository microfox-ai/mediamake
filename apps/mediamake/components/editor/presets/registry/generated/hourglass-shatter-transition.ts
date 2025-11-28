/**
 * Hourglass Shatter Transition Preset
 *
 * This preset creates a sophisticated video transition where the outgoing video appears contained
 * in the top half of an hourglass shape that shatters into fragments, which then fall and reform
 * as the incoming video in the bottom half. Features realistic glass physics with fragments that
 * tumble, rotate, and collect, plus sand particle effects flowing between video fragments.
 *
 * Technical Features:
 * - Hourglass-shaped mask (top and bottom halves) using clip-path
 * - Shatter effect: Outgoing video breaks into 25 irregular polygonal fragments
 * - Fall physics: Fragments fall with acceleration (gravity), rotation, and opacity changes
 * - Reform effect: Fragments transform into incoming video pieces, collecting at bottom
 * - Sand particles: 35 small particles (2x2px) with translateY and subtle translateX wobble
 * - Three-phase timing: Shatter (0.5s), Fall (1.8s), Reform (0.5s) = 2.8s total
 *
 * Use cases:
 * - Creative video transitions with metaphorical meaning (time passing, transformation)
 * - Storytelling transitions emphasizing change or passage of time
 * - High-impact visual effects for presentations or documentaries
 * - Cinematic transitions between contrasting scenes
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
  outgoingStartTime: z
    .number()
    .default(0)
    .optional()
    .describe('Start time in outgoing video (seconds)'),
  incomingStartTime: z
    .number()
    .default(0)
    .optional()
    .describe('Start time in incoming video (seconds)'),
  transitionDuration: z
    .number()
    .default(2.8)
    .optional()
    .describe('Total transition duration (seconds)'),
  shatterDuration: z
    .number()
    .default(0.5)
    .optional()
    .describe('Shatter phase duration (seconds)'),
  fallDuration: z
    .number()
    .default(1.8)
    .optional()
    .describe('Fall phase duration (seconds)'),
  reformDuration: z
    .number()
    .default(0.5)
    .optional()
    .describe('Reform phase duration (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingStartTime = 0,
    incomingStartTime = 0,
    transitionDuration = 2.8,
    shatterDuration = 0.5,
    fallDuration = 1.8,
    reformDuration = 0.5,
  } = params;

  // Helper function to create fragment definitions
  const createFragmentDefinitions = () => {
    // Define 25 fragments with varied positions, sizes, and clip paths
    const fragmentConfigs = [
      // Top half fragments (outgoing video) - 13 fragments
      {
        id: 'fragment-1',
        video: 'outgoing',
        width: '20%',
        height: '15%',
        top: '5%',
        left: '25%',
        clipPath: 'polygon(0% 0%, 100% 10%, 90% 100%, 10% 100%)',
        fallDelay: 0,
        rotation: 45,
        translateY: 600,
        translateX: -50,
      },
      {
        id: 'fragment-2',
        video: 'outgoing',
        width: '18%',
        height: '12%',
        top: '8%',
        left: '48%',
        clipPath: 'polygon(10% 0%, 100% 0%, 100% 90%, 0% 100%)',
        fallDelay: 0.1,
        rotation: -30,
        translateY: 650,
        translateX: 30,
      },
      {
        id: 'fragment-3',
        video: 'outgoing',
        width: '15%',
        height: '18%',
        top: '12%',
        left: '70%',
        clipPath: 'polygon(0% 10%, 90% 0%, 100% 100%, 5% 90%)',
        fallDelay: 0.15,
        rotation: 60,
        translateY: 620,
        translateX: 40,
      },
      {
        id: 'fragment-4',
        video: 'outgoing',
        width: '22%',
        height: '14%',
        top: '22%',
        left: '30%',
        clipPath: 'polygon(5% 0%, 95% 5%, 90% 100%, 0% 95%)',
        fallDelay: 0.2,
        rotation: -50,
        translateY: 580,
        translateX: -30,
      },
      {
        id: 'fragment-5',
        video: 'outgoing',
        width: '19%',
        height: '16%',
        top: '25%',
        left: '55%',
        clipPath: 'polygon(0% 5%, 100% 0%, 95% 100%, 10% 95%)',
        fallDelay: 0.25,
        rotation: 35,
        translateY: 600,
        translateX: 20,
      },
      {
        id: 'fragment-6',
        video: 'outgoing',
        width: '16%',
        height: '13%',
        top: '18%',
        left: '20%',
        clipPath: 'polygon(0% 10%, 90% 0%, 100% 90%, 15% 100%)',
        fallDelay: 0.3,
        rotation: -40,
        translateY: 610,
        translateX: -40,
      },
      {
        id: 'fragment-7',
        video: 'outgoing',
        width: '17%',
        height: '14%',
        top: '14%',
        left: '65%',
        clipPath: 'polygon(5% 5%, 100% 0%, 95% 90%, 0% 100%)',
        fallDelay: 0.35,
        rotation: 50,
        translateY: 630,
        translateX: 35,
      },
      {
        id: 'fragment-8',
        video: 'outgoing',
        width: '19%',
        height: '15%',
        top: '28%',
        left: '42%',
        clipPath: 'polygon(10% 0%, 95% 10%, 100% 100%, 5% 95%)',
        fallDelay: 0.4,
        rotation: -45,
        translateY: 590,
        translateX: 10,
      },
      {
        id: 'fragment-9',
        video: 'outgoing',
        width: '15%',
        height: '12%',
        top: '10%',
        left: '40%',
        clipPath: 'polygon(0% 0%, 100% 5%, 90% 100%, 5% 95%)',
        fallDelay: 0.45,
        rotation: 40,
        translateY: 640,
        translateX: -20,
      },
      {
        id: 'fragment-10',
        video: 'outgoing',
        width: '21%',
        height: '17%',
        top: '20%',
        left: '58%',
        clipPath: 'polygon(10% 5%, 100% 0%, 95% 100%, 0% 90%)',
        fallDelay: 0.5,
        rotation: -55,
        translateY: 600,
        translateX: 25,
      },
      {
        id: 'fragment-11',
        video: 'outgoing',
        width: '16%',
        height: '14%',
        top: '32%',
        left: '25%',
        clipPath: 'polygon(0% 5%, 90% 0%, 100% 95%, 10% 100%)',
        fallDelay: 0.55,
        rotation: 30,
        translateY: 570,
        translateX: -35,
      },
      {
        id: 'fragment-12',
        video: 'outgoing',
        width: '18%',
        height: '15%',
        top: '35%',
        left: '50%',
        clipPath: 'polygon(5% 10%, 100% 0%, 95% 90%, 0% 100%)',
        fallDelay: 0.6,
        rotation: -35,
        translateY: 580,
        translateX: 15,
      },
      {
        id: 'fragment-13',
        video: 'outgoing',
        width: '20%',
        height: '13%',
        top: '38%',
        left: '72%',
        clipPath: 'polygon(10% 0%, 95% 5%, 100% 100%, 5% 95%)',
        fallDelay: 0.65,
        rotation: 55,
        translateY: 590,
        translateX: 30,
      },
      // Bottom half fragments (incoming video) - 12 fragments
      {
        id: 'fragment-14',
        video: 'incoming',
        width: '20%',
        height: '15%',
        top: '60%',
        left: '15%',
        clipPath: 'polygon(5% 0%, 100% 10%, 95% 100%, 0% 90%)',
        fallDelay: 0,
        rotation: -50,
        translateY: -600,
        translateX: 40,
      },
      {
        id: 'fragment-15',
        video: 'incoming',
        width: '18%',
        height: '17%',
        top: '58%',
        left: '38%',
        clipPath: 'polygon(0% 0%, 95% 5%, 100% 100%, 10% 95%)',
        fallDelay: 0.1,
        rotation: 45,
        translateY: -620,
        translateX: -30,
      },
      {
        id: 'fragment-16',
        video: 'incoming',
        width: '21%',
        height: '16%',
        top: '62%',
        left: '60%',
        clipPath: 'polygon(10% 5%, 100% 0%, 90% 95%, 0% 100%)',
        fallDelay: 0.15,
        rotation: -40,
        translateY: -610,
        translateX: 20,
      },
      {
        id: 'fragment-17',
        video: 'incoming',
        width: '19%',
        height: '15%',
        top: '68%',
        left: '20%',
        clipPath: 'polygon(0% 10%, 95% 0%, 100% 90%, 10% 100%)',
        fallDelay: 0.2,
        rotation: 50,
        translateY: -580,
        translateX: -40,
      },
      {
        id: 'fragment-18',
        video: 'incoming',
        width: '17%',
        height: '13%',
        top: '75%',
        left: '45%',
        clipPath: 'polygon(5% 0%, 100% 10%, 90% 100%, 0% 95%)',
        fallDelay: 0.25,
        rotation: -55,
        translateY: -590,
        translateX: 15,
      },
      {
        id: 'fragment-19',
        video: 'incoming',
        width: '20%',
        height: '16%',
        top: '72%',
        left: '68%',
        clipPath: 'polygon(10% 5%, 95% 0%, 100% 100%, 5% 90%)',
        fallDelay: 0.3,
        rotation: 35,
        translateY: -600,
        translateX: 25,
      },
      {
        id: 'fragment-20',
        video: 'incoming',
        width: '19%',
        height: '17%',
        top: '78%',
        left: '32%',
        clipPath: 'polygon(0% 0%, 100% 10%, 90% 100%, 10% 90%)',
        fallDelay: 0.35,
        rotation: -45,
        translateY: -570,
        translateX: -25,
      },
      {
        id: 'fragment-21',
        video: 'incoming',
        width: '17%',
        height: '14%',
        top: '80%',
        left: '56%',
        clipPath: 'polygon(5% 5%, 95% 0%, 100% 95%, 0% 100%)',
        fallDelay: 0.4,
        rotation: 40,
        translateY: -580,
        translateX: 10,
      },
      {
        id: 'fragment-22',
        video: 'incoming',
        width: '21%',
        height: '16%',
        top: '76%',
        left: '10%',
        clipPath: 'polygon(10% 10%, 100% 0%, 90% 90%, 5% 100%)',
        fallDelay: 0.45,
        rotation: -50,
        translateY: -590,
        translateX: -35,
      },
      {
        id: 'fragment-23',
        video: 'incoming',
        width: '18%',
        height: '15%',
        top: '82%',
        left: '74%',
        clipPath: 'polygon(0% 5%, 100% 0%, 95% 100%, 10% 95%)',
        fallDelay: 0.5,
        rotation: 45,
        translateY: -600,
        translateX: 20,
      },
      {
        id: 'fragment-24',
        video: 'incoming',
        width: '16%',
        height: '13%',
        top: '85%',
        left: '40%',
        clipPath: 'polygon(5% 10%, 90% 0%, 100% 90%, 0% 100%)',
        fallDelay: 0.55,
        rotation: -40,
        translateY: -570,
        translateX: 5,
      },
      {
        id: 'fragment-25',
        video: 'incoming',
        width: '19%',
        height: '14%',
        top: '88%',
        left: '62%',
        clipPath: 'polygon(10% 0%, 95% 5%, 100% 100%, 5% 90%)',
        fallDelay: 0.6,
        rotation: 50,
        translateY: -580,
        translateX: 15,
      },
    ];

    return fragmentConfigs;
  };

  // Helper function to create sand particles
  const createSandParticles = () => {
    const particles = [];
    for (let i = 0; i < 35; i++) {
      particles.push({
        id: `sand-${i + 1}`,
        left: `${45 + Math.random() * 10}%`, // Center around hourglass neck
        top: `${25 + Math.random() * 35}%`, // Spread vertically through middle
        delay: Math.random() * 0.5, // Random delay for staggered effect
        wobbleX: (Math.random() - 0.5) * 20, // Random wobble -10 to +10px
        fallDistance: 400 + Math.random() * 200, // Random fall distance
      });
    }
    return particles;
  };

  const fragmentConfigs = createFragmentDefinitions();
  const sandParticles = createSandParticles();

  // Create fragment components
  const createFragments = (): RenderableComponentData[] => {
    return fragmentConfigs.map((config) => {
      const isOutgoing = config.video === 'outgoing';
      const videoSrc = isOutgoing ? outgoingVideoSrc : incomingVideoSrc;
      const videoStartTime = isOutgoing ? outgoingStartTime : incomingStartTime;

      return {
        id: config.id,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: videoSrc,
          startFrom: videoStartTime,
          className: 'w-full h-full object-cover',
          style: {
            position: 'absolute',
            width: config.width,
            height: config.height,
            top: config.top,
            left: config.left,
            clipPath: config.clipPath,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: fallDuration,
          },
        },
        effects: [
          {
            id: `${config.id}-fall`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: config.fallDelay,
              duration: fallDuration - config.fallDelay,
              mode: 'provider',
              targetIds: [config.id],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: config.translateY, prog: 1 },
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: config.translateX, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: config.rotation, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Create sand particle components
  const createSandParticlesComponents = (): RenderableComponentData[] => {
    return sandParticles.map((particle) => ({
      id: particle.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 2px; height: 2px; background: #ffd89b; border-radius: 50%; opacity: 0.6;"></div>',
        style: {
          position: 'absolute',
          top: particle.top,
          left: particle.left,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: fallDuration,
        },
      },
      effects: [
        {
          id: `${particle.id}-fall`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: particle.delay,
            duration: fallDuration - particle.delay,
            mode: 'provider',
            targetIds: [particle.id],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: particle.fallDistance, prog: 1 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: particle.wobbleX, prog: 0.5 },
              { key: 'translateX', val: particle.wobbleX * 0.5, prog: 1 },
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    })) as RenderableComponentData[];
  };

  const childrenData: RenderableComponentData[] = [
    // Hourglass top half (outgoing video, visible during shatter phase)
    {
      id: 'hourglass-top-half',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        startFrom: outgoingStartTime,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          top: '0',
          left: '0',
          width: '100%',
          height: '50%',
          clipPath: 'polygon(20% 0%, 80% 0%, 65% 50%, 35% 50%)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: shatterDuration,
        },
      },
    } as RenderableComponentData,

    // Fragment container (fall phase)
    {
      id: 'fragment-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: shatterDuration,
          duration: fallDuration,
        },
      },
      childrenData: createFragments(),
    } as RenderableComponentData,

    // Sand particles container
    {
      id: 'sand-particles-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 5,
          },
        },
      },
      context: {
        timing: {
          start: shatterDuration,
          duration: fallDuration,
        },
      },
      childrenData: createSandParticlesComponents(),
    } as RenderableComponentData,

    // Hourglass bottom half (incoming video, visible during reform phase)
    {
      id: 'hourglass-bottom-half',
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        startFrom: incomingStartTime,
        className: 'w-full h-full object-cover',
        style: {
          position: 'absolute',
          bottom: '0',
          left: '0',
          width: '100%',
          height: '50%',
          clipPath: 'polygon(35% 50%, 65% 50%, 80% 100%, 20% 100%)',
        },
      },
      context: {
        timing: {
          start: shatterDuration + fallDuration,
          duration: reformDuration,
        },
      },
      effects: [
        {
          id: 'reform-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: reformDuration,
            mode: 'provider',
            targetIds: ['hourglass-bottom-half'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'scale', val: 0.95, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'hourglass-shatter-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
        style: {
          perspective: '1000px',
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
  id: 'hourglass-shatter-transition',
  title: 'Hourglass Shatter Transition',
  description:
    'A sophisticated video transition where the outgoing video appears in an hourglass shape that shatters into fragments, falls with realistic physics, and reforms as the incoming video. Features glass-like fragment animations with rotation, tumbling physics, and particle effects simulating sand flow between video pieces during the 2.8-second transition sequence.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'hourglass',
    'shatter',
    'glass',
    'physics',
    'particles',
    'cinematic',
    'advanced',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingStartTime: 0,
    incomingStartTime: 0,
    transitionDuration: 2.8,
    shatterDuration: 0.5,
    fallDuration: 1.8,
    reformDuration: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hourglassShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};