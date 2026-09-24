/**
 * Spatial 3D Card Flip Transition Preset
 *
 * Creates a 3D card flip transition where videos exist on opposite sides of a card
 * that flips in perspective space. Features:
 * - Realistic shadow that changes based on card angle
 * - Subtle scaling effect that peaks at midpoint
 * - Brief "hang time" at 90-degree point for suspense
 * - Rounded corners and border glow during flip
 * - Smooth cubic-bezier easing with hang time effect
 *
 * Use cases:
 * - Professional video transitions with 3D depth
 * - Reveal effects for contrasting content
 * - Storytelling transitions between scenes
 * - Product showcases with front/back views
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the flip transition in seconds'),
  hangTimeIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Intensity of hang time at 90-degree point (0-1)'),
  scalePeakAmount: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.1)
    .optional()
    .describe('Maximum scale at midpoint of flip (1-1.5)'),
  borderGlowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Intensity of border glow during flip (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;
  const hangTimeIntensity = params.hangTimeIntensity ?? 0.5;
  const scalePeakAmount = params.scalePeakAmount ?? 1.1;
  const borderGlowIntensity = params.borderGlowIntensity ?? 0.8;

  // Calculate total duration with overlap
  const overlapDuration = transitionDuration;
  const totalDuration =
    outgoingVideo.duration + incomingVideo.duration - overlapDuration;

  // Transition start time (relative to container)
  const transitionStartTime = outgoingVideo.duration - overlapDuration;

  // Calculate hang time progress points
  const hangTimeStart = 0.45;
  const hangTimeMid = 0.5;
  const hangTimeEnd = 0.55;

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (front face)
    {
      id: 'outgoing-video-face',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        className: 'w-full h-full',
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          backfaceVisibility: 'hidden',
          borderRadius: '16px',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
    } as RenderableComponentData,

    // Incoming video (back face)
    {
      id: 'incoming-video-face',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        className: 'w-full h-full',
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          backfaceVisibility: 'hidden',
          borderRadius: '16px',
        },
      },
      context: {
        timing: {
          start: transitionStartTime,
          duration: incomingVideo.duration + overlapDuration,
        },
      },
      effects: [
        // Set initial 180deg rotation for back face
        {
          id: 'incoming-initial-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 0.001,
            mode: 'provider',
            targetIds: ['incoming-video-face'],
            ranges: [
              { key: 'rotateY', val: 180, prog: 0 },
              { key: 'rotateY', val: 180, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Card container with 3D transforms
  const cardContainer: RenderableComponentData = {
    id: 'card-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '80%',
          height: '80%',
          transformStyle: 'preserve-3d',
          borderRadius: '16px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
    effects: [
      // Rotation effect with hang time
      {
        id: 'flip-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['card-container'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 85, prog: hangTimeStart },
            { key: 'rotateY', val: 90, prog: hangTimeMid },
            { key: 'rotateY', val: 95, prog: hangTimeEnd },
            { key: 'rotateY', val: 180, prog: 1 },
          ],
        },
      },
      // Scale effect peaking at midpoint
      {
        id: 'scale-midpoint-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['card-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: scalePeakAmount, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Dynamic shadow based on rotation angle
      {
        id: 'dynamic-shadow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['card-container'],
          ranges: [
            {
              key: 'boxShadow',
              val: '0px 10px 40px rgba(0,0,0,0.3)',
              prog: 0,
            },
            {
              key: 'boxShadow',
              val: '0px 30px 80px rgba(0,0,0,0.6)',
              prog: 0.5,
            },
            {
              key: 'boxShadow',
              val: '0px 10px 40px rgba(0,0,0,0.3)',
              prog: 1,
            },
          ],
        },
      },
      // Border glow during flip
      {
        id: 'border-glow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: transitionStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['card-container'],
          ranges: [
            {
              key: 'outline',
              val: '0px solid rgba(255,255,255,0)',
              prog: 0,
            },
            {
              key: 'outline',
              val: `3px solid rgba(255,255,255,${borderGlowIntensity})`,
              prog: 0.25,
            },
            {
              key: 'outline',
              val: `3px solid rgba(255,255,255,${borderGlowIntensity})`,
              prog: 0.75,
            },
            {
              key: 'outline',
              val: '0px solid rgba(255,255,255,0)',
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Perspective container
  const rootContainer: RenderableComponentData = {
    id: 'perspective-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1200px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [cardContainer],
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
  id: 'spatial-card-flip-3d-transition',
  title: 'Spatial 3D Card Flip Transition',
  description:
    'A 3D card flip transition where videos exist on opposite sides of a card that flips in perspective space. Features realistic dynamic shadows, scaling effect, hang time at 90 degrees, rounded corners, and border glow during the flip.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'flip', 'card', 'perspective', 'spatial'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      duration: 5,
    },
    transitionDuration: 1.2,
    hangTimeIntensity: 0.5,
    scalePeakAmount: 1.1,
    borderGlowIntensity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const spatialCardFlip3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};