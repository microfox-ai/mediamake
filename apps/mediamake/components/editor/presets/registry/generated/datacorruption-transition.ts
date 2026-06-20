/**
 * Data Corruption Transition Preset
 *
 * Creates an aggressive datacorruption-style transition with rapid RGB flickering and digital shake
 * for high-energy YouTube content. This transition simulates a complete digital meltdown over a 
 * 0.3s overlap period with rapid channel separation, intense shake effects, and color flash overlays.
 *
 * Features:
 * - **Rapid RGB Flickering**: Channels appear/disappear at 60fps creating strobe effect
 * - **Intense Digital Shake**: Horizontal shake (±15px) with vertical displacement
 * - **Color Flash Overlays**: Brief moments of pure red, green, blue frames
 * - **CRT Screen Curve**: Subtle border-radius distortion during transition peak
 * - **Fast & Punchy**: 0.3s overlap period for maximum impact
 *
 * Use cases:
 * - High-energy YouTube intros/transitions
 * - Gaming content scene changes
 * - Tech/digital-themed videos
 * - Glitch-style content transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image1: z.object({
    src: z.string().describe('Source URL of outgoing image'),
    duration: z.number().describe('Duration of outgoing image in seconds'),
  }).describe('Outgoing image configuration'),
  
  image2: z.object({
    src: z.string().describe('Source URL of incoming image'),
    duration: z.number().describe('Duration of incoming image in seconds'),
  }).describe('Incoming image configuration'),
  
  transitionDuration: z
    .number()
    .default(0.3)
    .describe('Duration of transition overlap in seconds (default: 0.3s for fast, punchy effect)'),
  
  crtCurveRadius: z
    .number()
    .default(20)
    .describe('Border radius for CRT screen curve distortion in pixels (default: 20px)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image1, image2, transitionDuration, crtCurveRadius } = params;

  // Calculate BaseLayout duration
  const baseLayoutDuration = image1.duration + image2.duration - transitionDuration;

  // Outgoing image with rapid opacity flicker and shake
  const outgoingImage: RenderableComponentData = {
    id: 'datacorruption-outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: image1.duration,
      },
    },
    effects: [
      // Rapid opacity flicker (strobe effect)
      {
        id: 'outgoing-opacity-flicker',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: image1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['datacorruption-outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.14 },
            { key: 'opacity', val: 1, prog: 0.28 },
            { key: 'opacity', val: 0, prog: 0.42 },
            { key: 'opacity', val: 0, prog: 0.57 },
            { key: 'opacity', val: 1, prog: 0.71 },
            { key: 'opacity', val: 0, prog: 0.85 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Intense horizontal shake
      {
        id: 'outgoing-shake-x',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: image1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['datacorruption-outgoing-image'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -15, prog: 0.2 },
            { key: 'translateX', val: 10, prog: 0.4 },
            { key: 'translateX', val: -8, prog: 0.6 },
            { key: 'translateX', val: 15, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Vertical displacement
      {
        id: 'outgoing-shake-y',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: image1.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['datacorruption-outgoing-image'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -3, prog: 0.25 },
            { key: 'translateY', val: 5, prog: 0.5 },
            { key: 'translateY', val: -2, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming image with flickering appearance and shake
  const incomingImage: RenderableComponentData = {
    id: 'datacorruption-incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: image2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        zIndex: 20,
      },
    },
    context: {
      timing: {
        start: image1.duration - transitionDuration,
        duration: image2.duration + transitionDuration,
      },
    },
    effects: [
      // Stepped opacity flicker (fights through corruption)
      {
        id: 'incoming-opacity-flicker',
        componentId: 'generic',
        data: {
          type: 'steps',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['datacorruption-incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.16 },
            { key: 'opacity', val: 0.5, prog: 0.33 },
            { key: 'opacity', val: 0, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 0.66 },
            { key: 'opacity', val: 0.5, prog: 0.83 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Horizontal shake (incoming)
      {
        id: 'incoming-shake-x',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['datacorruption-incoming-image'],
          ranges: [
            { key: 'translateX', val: 20, prog: 0 },
            { key: 'translateX', val: -10, prog: 0.33 },
            { key: 'translateX', val: 5, prog: 0.66 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Red flash overlay
  const redFlash: RenderableComponentData = {
    id: 'datacorruption-red-flash',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#FF0000',
          mixBlendMode: 'screen',
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: image1.duration - transitionDuration,
        duration: 0.05,
      },
    },
    effects: [
      {
        id: 'red-flash-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['datacorruption-red-flash'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Green flash overlay (staggered)
  const greenFlash: RenderableComponentData = {
    id: 'datacorruption-green-flash',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#00FF00',
          mixBlendMode: 'screen',
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: image1.duration - transitionDuration + 0.06,
        duration: 0.05,
      },
    },
    effects: [
      {
        id: 'green-flash-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['datacorruption-green-flash'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Blue flash overlay (staggered)
  const blueFlash: RenderableComponentData = {
    id: 'datacorruption-blue-flash',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#0000FF',
          mixBlendMode: 'screen',
          zIndex: 30,
        },
      },
    },
    context: {
      timing: {
        start: image1.duration - transitionDuration + 0.12,
        duration: 0.05,
      },
    },
    effects: [
      {
        id: 'blue-flash-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['datacorruption-blue-flash'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Root container with CRT curve distortion
  const rootContainer: RenderableComponentData = {
    id: 'datacorruption-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-black',
        style: {
          borderRadius: `${crtCurveRadius}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData: [
      outgoingImage,
      incomingImage,
      redFlash,
      greenFlash,
      blueFlash,
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
  id: 'datacorruption-transition',
  title: 'Data Corruption Transition',
  description: 'Aggressive datacorruption-style transition with rapid RGB flickering, digital shake, and CRT distortion for high-energy YouTube content. Simulates a complete digital meltdown over a 0.3s overlap period with rapid channel separation, intense shake effects, and color flash overlays.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'glitch', 'datacorruption', 'rgb', 'shake', 'digital', 'high-energy', 'youtube', 'gaming', 'tech'],
  defaultInputParams: {
    image1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    image2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 5,
    },
    transitionDuration: 0.3,
    crtCurveRadius: 20,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const datacorruptionTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
