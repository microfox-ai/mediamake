/**
 * Portal Ripple Transition Preset
 *
 * Creates a dimensional portal transition effect that simulates stepping through a liquid doorway
 * between dimensions. Features concentric ripple waves emanating from center, ethereal edge glow,
 * chromatic aberration, and smooth video crossfade with ripple distortion effects.
 *
 * Features:
 * - Ripple distortion effect with multiple concentric waves
 * - Ethereal glow around edges during transition
 * - Chromatic aberration for otherworldly feel
 * - Smooth crossfade between videos
 * - Complex filter animations (blur, contrast)
 * - Scale and rotation effects for portal feel
 *
 * Use cases:
 * - Creating dimensional portal transitions
 * - Building sci-fi/fantasy video effects
 * - Adding liquid surface transitions
 * - Creating otherworldly scene changes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of first video'),
    duration: z.number().describe('Duration of first video in seconds'),
  }).describe('First video (outgoing)'),
  video2: z.object({
    src: z.string().describe('Source URL of second video'),
    duration: z.number().describe('Duration of second video in seconds'),
  }).describe('Second video (incoming)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of transition overlap in seconds'),
  rippleIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity of ripple effect (0.1-2)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, rippleIntensity } = params;

  // Calculate BaseLayout duration (overlap transition)
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;

  // Transition timing calculations
  const outgoingVideoDuration = video1.duration;
  const incomingVideoStart = video1.duration - transitionDuration;
  const incomingVideoDuration = video2.duration + transitionDuration;

  // Ripple wave configuration
  const rippleWaves = [
    { size: 100, opacity: 0.3, delay: 0 },
    { size: 200, opacity: 0.25, delay: 0.1 },
    { size: 350, opacity: 0.2, delay: 0.2 },
    { size: 550, opacity: 0.15, delay: 0.3 },
    { size: 800, opacity: 0.1, delay: 0.4 },
  ];

  // Create ripple wave elements
  const rippleWaveChildren: RenderableComponentData[] = rippleWaves.map((wave, index) => ({
    id: `ripple-wave-${index + 1}`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position:absolute;width:${wave.size}px;height:${wave.size}px;border-radius:50%;border:2px solid rgba(34,211,238,${wave.opacity});pointer-events:none;"></div>`,
      className: 'absolute',
      style: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      },
    },
    context: {
      timing: {
        start: incomingVideoStart + wave.delay,
        duration: 0.8,
      },
    },
    effects: [
      {
        id: `ripple-wave-${index + 1}-scale`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.8,
          mode: 'provider',
          targetIds: [`ripple-wave-${index + 1}`],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: wave.opacity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  }));

  const childrenData: RenderableComponentData[] = [
    // Outgoing video container
    {
      id: 'outgoing-video-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideoDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-video',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingVideoDuration,
            },
          },
          effects: [
            // Filter animation (blur + contrast)
            {
              id: 'outgoing-video-filter',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingVideoDuration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'filter', val: 'blur(0px) contrast(100%)', prog: 0 },
                  { key: 'filter', val: 'blur(8px) contrast(150%)', prog: 1 },
                ],
              },
            },
            // Ripple scale effect
            {
              id: 'outgoing-video-ripple',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: outgoingVideoDuration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 1.1 * rippleIntensity, prog: 0.33 },
                  { key: 'scale', val: 0.9 * rippleIntensity, prog: 0.66 },
                  { key: 'scale', val: 0, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: -5 * rippleIntensity, prog: 0.33 },
                  { key: 'rotate', val: 5 * rippleIntensity, prog: 0.66 },
                  { key: 'rotate', val: 0, prog: 1 },
                ],
              },
            },
            // Opacity fade out
            {
              id: 'outgoing-video-fade',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: outgoingVideoDuration - transitionDuration,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    },
    // Incoming video container
    {
      id: 'incoming-video-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: incomingVideoDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-video',
          type: 'atom' as const,
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: incomingVideoDuration,
            },
          },
          effects: [
            // Filter animation (blur + contrast - reverse)
            {
              id: 'incoming-video-filter',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'filter', val: 'blur(8px) contrast(150%)', prog: 0 },
                  { key: 'filter', val: 'blur(0px) contrast(100%)', prog: 1 },
                ],
              },
            },
            // Ripple scale effect (reverse)
            {
              id: 'incoming-video-ripple',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'scale', val: 0, prog: 0 },
                  { key: 'scale', val: 0.9 * rippleIntensity, prog: 0.33 },
                  { key: 'scale', val: 1.1 * rippleIntensity, prog: 0.66 },
                  { key: 'scale', val: 1, prog: 1 },
                  { key: 'rotate', val: 0, prog: 0 },
                  { key: 'rotate', val: 5 * rippleIntensity, prog: 0.33 },
                  { key: 'rotate', val: -5 * rippleIntensity, prog: 0.66 },
                  { key: 'rotate', val: 0, prog: 1 },
                ],
              },
            },
            // Opacity fade in
            {
              id: 'incoming-video-fade',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-video'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    },
    // Ripple waves container
    {
      id: 'ripple-waves-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: transitionDuration,
        },
      },
      childrenData: rippleWaveChildren,
    },
    // Ethereal glow container
    {
      id: 'ethereal-glow-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            boxShadow:
              'inset 0 0 100px 50px rgba(139, 92, 246, 0.3), inset 0 0 200px 100px rgba(34, 211, 238, 0.15)',
          },
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'glow-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['ethereal-glow-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    // Chromatic aberration container
    {
      id: 'chromatic-aberration-container',
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none mix-blend-screen',
        },
      },
      context: {
        timing: {
          start: incomingVideoStart,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: 'chromatic-red',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                transform: 'translateX(-3px)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: 'chromatic-blue',
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                backgroundColor: 'rgba(0, 0, 255, 0.1)',
                transform: 'translateX(3px)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
      effects: [
        {
          id: 'chromatic-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['chromatic-aberration-container'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: 'portal-ripple-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: 'radial-gradient(ellipse at center, rgba(88, 28, 135, 0.2) 0%, black 100%)',
        },
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
  id: 'portal-ripple-transition',
  title: 'Portal Ripple Transition',
  description:
    'A dimensional portal transition effect that simulates stepping through a liquid doorway between dimensions. Features concentric ripple waves emanating from center, ethereal edge glow, chromatic aberration, and smooth video crossfade with ripple distortion effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'portal',
    'ripple',
    'liquid',
    'dimensional',
    'sci-fi',
    'fantasy',
    'chromatic-aberration',
    'glow',
  ],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 10,
    },
    transitionDuration: 1.5,
    rippleIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const portalRippleTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
