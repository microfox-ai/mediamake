/**
 * Crumpled Paper Ball Transition Preset
 *
 * This preset creates a creative transition effect where the outgoing video crumples
 * into a paper ball that shrinks and fades while the incoming video unfolds from a
 * crumpled state. The effect simulates irregular paper folding using multiple transform
 * effects applied to different quadrants, with noise/grain texture overlay and dynamic
 * shadow effects.
 *
 * Features:
 * - **Crumpling Animation**: Multiple scale and rotation transforms simulate irregular paper folding
 * - **Noise/Grain Texture**: Increases during crumple animation for realistic paper effect
 * - **Reverse Unfolding**: Incoming video starts crumpled and expands outward
 * - **Dynamic Shadows**: Shadows change based on crumple state
 * - **Smooth Easing**: Uses cubic-bezier(0.4,0,0.2,1) for natural motion
 * - **2-Second Duration**: Complete transition in 2 seconds with smooth overlap
 *
 * Use cases:
 * - Creative video transitions with paper/document theme
 * - Adding organic, tactile feel to video sequences
 * - Educational content with note-taking or paper-based aesthetics
 * - Artistic video presentations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  paperTextureSrc: z
    .string()
    .optional()
    .describe(
      'Source URL of paper/grain texture image for overlay (optional)',
    ),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Duration of the transition in seconds'),
  crumpleIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for crumple effect (0.5-2)'),
  textureIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Intensity of paper texture overlay (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    paperTextureSrc,
    transitionDuration,
    crumpleIntensity,
    textureIntensity,
  } = params;

  const intensity = crumpleIntensity ?? 1;
  const texIntensity = textureIntensity ?? 0.3;

  // Helper function to generate crumple transform effects
  const generateCrumpleEffects = (
    isOutgoing: boolean,
    targetId: string,
  ): any[] => {
    const effects: any[] = [];
    const duration = transitionDuration;

    if (isOutgoing) {
      // Outgoing video crumples and shrinks
      // Main scale and rotation effect
      effects.push({
        id: `${targetId}-crumple-main`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            // Scale down from normal to tiny ball
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.1 * intensity, prog: 1 },
            // Rotate in 3D space for crumpling effect
            { key: 'rotateX', val: 0, prog: 0 },
            { key: 'rotateX', val: 180 * intensity, prog: 0.5 },
            { key: 'rotateX', val: 360 * intensity, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 270 * intensity, prog: 0.6 },
            { key: 'rotateY', val: 720 * intensity, prog: 1 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 90 * intensity, prog: 0.4 },
            { key: 'rotateZ', val: 180 * intensity, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // Grayscale and brightness filters
      effects.push({
        id: `${targetId}-crumple-filters`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'filter', val: 'grayscale(0) brightness(1)', prog: 0 },
            {
              key: 'filter',
              val: 'grayscale(0.5) brightness(0.7)',
              prog: 1,
            },
          ],
        },
      });

      // Shadow effect that diminishes as video crumples
      effects.push({
        id: `${targetId}-shadow`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            {
              key: 'boxShadow',
              val: '0 20px 60px rgba(0,0,0,0.5)',
              prog: 0,
            },
            {
              key: 'boxShadow',
              val: '0 5px 15px rgba(0,0,0,0.8)',
              prog: 0.5,
            },
            { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 1 },
          ],
        },
      });
    } else {
      // Incoming video unfolds from crumpled state
      // Main scale and rotation effect (reverse)
      effects.push({
        id: `${targetId}-unfold-main`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            // Scale up from tiny ball to normal
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 0.3 * intensity, prog: 0.3 },
            { key: 'scale', val: 1, prog: 1 },
            // Reverse rotate in 3D space for unfolding effect
            { key: 'rotateX', val: 360 * intensity, prog: 0 },
            { key: 'rotateX', val: 180 * intensity, prog: 0.5 },
            { key: 'rotateX', val: 0, prog: 1 },
            { key: 'rotateY', val: 720 * intensity, prog: 0 },
            { key: 'rotateY', val: 270 * intensity, prog: 0.4 },
            { key: 'rotateY', val: 0, prog: 1 },
            { key: 'rotateZ', val: 180 * intensity, prog: 0 },
            { key: 'rotateZ', val: 90 * intensity, prog: 0.6 },
            { key: 'rotateZ', val: 0, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Grayscale and brightness filters (reverse)
      effects.push({
        id: `${targetId}-unfold-filters`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            {
              key: 'filter',
              val: 'grayscale(0.5) brightness(0.7)',
              prog: 0,
            },
            { key: 'filter', val: 'grayscale(0) brightness(1)', prog: 1 },
          ],
        },
      });

      // Shadow effect that grows as video unfolds
      effects.push({
        id: `${targetId}-shadow`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'boxShadow', val: '0 0 0 rgba(0,0,0,0)', prog: 0 },
            {
              key: 'boxShadow',
              val: '0 5px 15px rgba(0,0,0,0.8)',
              prog: 0.5,
            },
            {
              key: 'boxShadow',
              val: '0 20px 60px rgba(0,0,0,0.5)',
              prog: 1,
            },
          ],
        },
      });
    }

    return effects;
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // Outgoing video (z-index 20)
  const outgoingVideoId = 'outgoing-video';
  childrenData.push({
    id: outgoingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        zIndex: 20,
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: generateCrumpleEffects(true, outgoingVideoId),
  } as RenderableComponentData);

  // Incoming video (z-index 10)
  const incomingVideoId = 'incoming-video';
  childrenData.push({
    id: incomingVideoId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover',
      className: 'absolute inset-0',
      style: {
        zIndex: 10,
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: generateCrumpleEffects(false, incomingVideoId),
  } as RenderableComponentData);

  // Paper texture overlay (z-index 30) - optional
  if (paperTextureSrc) {
    const textureId = 'paper-texture-overlay';
    childrenData.push({
      id: textureId,
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: paperTextureSrc,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 30,
          mixBlendMode: 'overlay',
          objectFit: 'cover',
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
          id: `${textureId}-intensity`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier(0.4, 0, 0.2, 1)',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [textureId],
            ranges: [
              { key: 'opacity', val: texIntensity * 0.3, prog: 0 },
              { key: 'opacity', val: texIntensity, prog: 0.5 },
              { key: 'opacity', val: texIntensity * 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crumpled-paper-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
  id: 'crumpled-paper-ball-transition',
  title: 'Crumpled Paper Ball Transition',
  description:
    'A creative video transition effect where the outgoing video crumples into a paper ball that shrinks and fades while the incoming video unfolds from a crumpled state. Features multiple transform effects simulating irregular paper folding, noise/grain texture overlay, and dynamic shadow effects. Uses cubic-bezier easing for smooth 2-second transition with z-index layering and mix-blend-mode overlay for the paper texture.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'crumple',
    'paper',
    'creative',
    '3d',
    'transform',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    paperTextureSrc: 'https://example.com/paper-texture.jpg',
    transitionDuration: 2,
    crumpleIntensity: 1,
    textureIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crumbledPaperBallTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
