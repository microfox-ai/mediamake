/**
 * Holographic Projection Transition Preset
 *
 * Creates a sci-fi holographic transition that dematerializes the outgoing video with scan lines,
 * RGB splitting, interference patterns, and flicker effects, while the incoming video materializes
 * through holographic fragments with floating data particles and light beams.
 *
 * Features:
 * - Outgoing video dematerializes with scan lines, RGB split, and interference patterns
 * - Flicker effects using rapid opacity changes
 * - Glitch moments with transform distortions
 * - Incoming video materializes from disconnected holographic fragments
 * - Floating data particles and light beams create information transfer effect
 * - Blue-tinted glow and transparency effects
 * - Customizable transition duration and intensity
 *
 * Use cases:
 * - Sci-fi themed video transitions
 * - Tech/futuristic content transitions
 * - Digital transformation effects
 * - Hologram-style video reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL of outgoing media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL of incoming media'),
      type: z.enum(['image', 'video']).describe('Media type'),
      duration: z.number().describe('Duration in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(2.3)
    .describe('Duration of the holographic transition in seconds'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Intensity of RGB color splitting effect in pixels'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of flicker effect (0-1)'),
  glitchFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Frequency of glitch moments (0-1)'),
  particleCount: z
    .number()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of floating data particles'),
  beamCount: z
    .number()
    .min(2)
    .max(6)
    .default(3)
    .describe('Number of light beams'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media1,
    media2,
    transitionDuration,
    rgbSplitIntensity,
    flickerIntensity,
    glitchFrequency,
    particleCount,
    beamCount,
  } = params;

  // Calculate total duration with overlap
  const baseLayoutDuration = media1.duration + media2.duration - transitionDuration;

  // Determine component IDs for media atoms
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Transition starts this many seconds before media1 ends
  const transitionStartTime = media1.duration - transitionDuration;

  // Generate random flicker keyframes
  const generateFlickerKeyframes = (baseOpacity: number) => {
    const keyframes = [];
    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const flickerAmount = Math.random() * flickerIntensity;
      const opacity = baseOpacity - flickerAmount * (Math.random() > 0.5 ? 1 : -1);
      keyframes.push({
        key: 'opacity',
        val: Math.max(0, Math.min(1, opacity)),
        prog,
      });
    }
    return keyframes;
  };

  // Generate random positions for particles and beams
  const generateRandomPosition = () => ({
    left: `${Math.random() * 80 + 10}%`,
    top: `${Math.random() * 80 + 10}%`,
  });

  // Create particle elements
  const particles: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    const position = generateRandomPosition();
    particles.push({
      id: `particle-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-0.5 h-4 bg-cyan-400/50'></div>`,
        className: 'absolute',
        style: {
          left: position.left,
          top: position.top,
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
          id: `particle-${i}-float`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`particle-${i}`],
            ranges: [
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: `${(Math.random() - 0.5) * 100}px`, prog: 0.5 },
              { key: 'translateY', val: `${(Math.random() - 0.5) * 200}px`, prog: 1 },
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${(Math.random() - 0.5) * 50}px`, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.2 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create light beam elements
  const beams: RenderableComponentData[] = [];
  for (let i = 0; i < beamCount; i++) {
    const position = generateRandomPosition();
    const angle = Math.random() * 360;
    beams.push({
      id: `beam-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='h-0.5 w-32 bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent'></div>`,
        className: 'absolute',
        style: {
          left: position.left,
          top: position.top,
          transform: `rotate(${angle}deg)`,
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
          id: `beam-${i}-pulse`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`beam-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.3 },
              { key: 'opacity', val: 0.8, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'scaleX', val: 0.5, prog: 0 },
              { key: 'scaleX', val: 1.5, prog: 0.5 },
              { key: 'scaleX', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const childrenData: RenderableComponentData[] = [
    // Outgoing video base layer
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: media1ComponentId,
      data: {
        src: media1.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: 0,
          duration: media1.duration,
        },
      },
      effects: [
        // Fade out with flicker
        {
          id: 'outgoing-fade-flicker',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              ...generateFlickerKeyframes(1).map((kf, idx) => ({
                ...kf,
                val: kf.val * (1 - idx / 10), // Fade to 0
              })),
            ],
          },
        },
        // Blue tint
        {
          id: 'outgoing-blue-tint',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: transitionStartTime,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['outgoing-video'],
            ranges: [
              {
                key: 'filter',
                val: 'brightness(1) hue-rotate(0deg) saturate(1)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'brightness(1.2) hue-rotate(180deg) saturate(1.5)',
                prog: 1,
              },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // RGB Split Layer (3 copies of outgoing video)
    {
      id: 'rgb-split-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Red channel
        {
          id: 'rgb-red',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              mixBlendMode: 'screen',
              filter: 'sepia(1) hue-rotate(-50deg) saturate(5) brightness(0.8)',
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
              id: 'rgb-red-offset',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['rgb-red'],
                ranges: [
                  { key: 'translateX', val: '0px', prog: 0 },
                  { key: 'translateX', val: `${rgbSplitIntensity}px`, prog: 0.5 },
                  { key: 'translateX', val: `${rgbSplitIntensity * 2}px`, prog: 1 },
                  { key: 'opacity', val: 0.8, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Green channel
        {
          id: 'rgb-green',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              mixBlendMode: 'screen',
              filter: 'sepia(1) hue-rotate(50deg) saturate(5) brightness(0.8)',
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
              id: 'rgb-green-offset',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['rgb-green'],
                ranges: [
                  { key: 'translateY', val: '0px', prog: 0 },
                  {
                    key: 'translateY',
                    val: `${-rgbSplitIntensity * 0.5}px`,
                    prog: 0.5,
                  },
                  { key: 'translateY', val: `${-rgbSplitIntensity}px`, prog: 1 },
                  { key: 'opacity', val: 0.8, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Blue channel
        {
          id: 'rgb-blue',
          type: 'atom',
          componentId: media1ComponentId,
          data: {
            src: media1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              mixBlendMode: 'screen',
              filter: 'sepia(1) hue-rotate(180deg) saturate(5) brightness(0.8)',
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
              id: 'rgb-blue-offset',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['rgb-blue'],
                ranges: [
                  { key: 'translateX', val: '0px', prog: 0 },
                  { key: 'translateX', val: `${-rgbSplitIntensity}px`, prog: 0.5 },
                  { key: 'translateX', val: `${-rgbSplitIntensity * 2}px`, prog: 1 },
                  { key: 'translateY', val: '0px', prog: 0 },
                  { key: 'translateY', val: `${rgbSplitIntensity * 0.3}px`, prog: 1 },
                  { key: 'opacity', val: 0.8, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Scan lines overlay
    {
      id: 'scanlines',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-full h-full bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent' style='background-size: 100% 4px;'></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'scanlines-animation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['scanlines'],
            ranges: [
              { key: 'translateY', val: '0px', prog: 0 },
              { key: 'translateY', val: '100px', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.2 },
              { key: 'opacity', val: 0.8, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Interference pattern
    {
      id: 'interference',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-full h-full'></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'radial-gradient(circle at 50% 50%, rgba(0,255,255,0.05), transparent 70%)',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'interference-pulse',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['interference'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 0.5, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Glitch overlay for skew/scale effects
    {
      id: 'glitch-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'glitch-distort',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['glitch-overlay'],
            ranges: [
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 1.02, prog: 0.2 * glitchFrequency },
              { key: 'scaleX', val: 1, prog: 0.25 * glitchFrequency },
              { key: 'scaleX', val: 1.02, prog: 0.5 * glitchFrequency },
              { key: 'scaleX', val: 1, prog: 0.55 * glitchFrequency },
              { key: 'scaleX', val: 1, prog: 1 },
              { key: 'skewY', val: '0deg', prog: 0 },
              { key: 'skewY', val: '1deg', prog: 0.2 * glitchFrequency },
              { key: 'skewY', val: '0deg', prog: 0.25 * glitchFrequency },
              { key: 'skewY', val: '-1deg', prog: 0.5 * glitchFrequency },
              { key: 'skewY', val: '0deg', prog: 0.55 * glitchFrequency },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Data particles layer
    {
      id: 'particles-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: particles,
    } as RenderableComponentData,

    // Light beams layer
    {
      id: 'beams-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: beams,
    } as RenderableComponentData,

    // Incoming video fragments (4 fragments that merge)
    {
      id: 'incoming-fragments-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: transitionDuration,
        },
      },
      childrenData: [
        // Left fragment
        {
          id: 'fragment-left',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              clipPath: 'polygon(0% 0%, 45% 0%, 45% 100%, 0% 100%)',
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
              id: 'fragment-left-slide',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['fragment-left'],
                ranges: [
                  { key: 'translateX', val: '-50px', prog: 0 },
                  { key: 'translateX', val: '0px', prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Right fragment
        {
          id: 'fragment-right',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              clipPath: 'polygon(55% 0%, 100% 0%, 100% 100%, 55% 100%)',
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
              id: 'fragment-right-slide',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['fragment-right'],
                ranges: [
                  { key: 'translateX', val: '50px', prog: 0 },
                  { key: 'translateX', val: '0px', prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Top middle fragment
        {
          id: 'fragment-top',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              clipPath: 'polygon(45% 0%, 55% 0%, 55% 48%, 45% 48%)',
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
              id: 'fragment-top-slide',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['fragment-top'],
                ranges: [
                  { key: 'translateY', val: '-30px', prog: 0 },
                  { key: 'translateY', val: '0px', prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Bottom middle fragment
        {
          id: 'fragment-bottom',
          type: 'atom',
          componentId: media2ComponentId,
          data: {
            src: media2.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              clipPath: 'polygon(45% 52%, 55% 52%, 55% 100%, 45% 100%)',
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
              id: 'fragment-bottom-slide',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['fragment-bottom'],
                ranges: [
                  { key: 'translateY', val: '30px', prog: 0 },
                  { key: 'translateY', val: '0px', prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.5 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming video full layer (fades in after fragments merge)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: media2ComponentId,
      data: {
        src: media2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: media1.duration - transitionDuration,
          duration: media2.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: 'incoming-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: transitionDuration * 0.6,
            duration: transitionDuration * 0.4,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'holographic-projection-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'holographic-projection-transition',
  title: 'Holographic Projection Transition',
  description:
    'A sci-fi holographic transition that dematerializes the outgoing video with scan lines, RGB splitting, interference patterns, and flicker effects, while the incoming video materializes through holographic fragments with floating data particles and light beams connecting the two states through luminous, ethereal space.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'holographic',
    'sci-fi',
    'glitch',
    'rgb-split',
    'particles',
    'beams',
    'futuristic',
    'digital',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 2.3,
    rgbSplitIntensity: 8,
    flickerIntensity: 0.3,
    glitchFrequency: 0.5,
    particleCount: 6,
    beamCount: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const holographicProjectionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
