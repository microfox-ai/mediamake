/**
 * 3D Accordion Fold Transition Preset
 *
 * This preset creates a 3D accordion fold transition where the screen appears to fold like an accordion.
 * The outgoing video is shown on one panel and the incoming video on another. The fold creates a zigzag
 * effect using multiple transform segments with alternating rotateY angles.
 *
 * Features:
 * - **3D Accordion Effect**: Screen folds like an accordion with zigzag pattern
 * - **Multiple Strips**: 4 vertical strips with alternating rotation directions
 * - **Perspective Transform**: 1200px perspective for realistic 3D depth
 * - **Alternating Rotations**: strip1: 0->45deg, strip2: 0->-45deg, strip3: 0->45deg, strip4: 0->-45deg
 * - **Skew Enhancement**: skewY transforms enhance the folding illusion
 * - **Realistic Shadows**: drop-shadow filters between folds
 * - **Staggered Timing**: 0.1s stagger between strips for cascading effect
 * - **1.1s Overlap**: Transition occurs during 1.1 second overlap period
 *
 * Use cases:
 * - Creating dynamic page-turn style transitions
 * - Building cinematic fold effects between videos
 * - Adding depth and dimension to video transitions
 * - Creating unique accordion-style reveals
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
    startFrom: z.number().optional().describe('Start time of outgoing video (seconds)'),
  }).describe('Outgoing video configuration'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    startFrom: z.number().optional().describe('Start time of incoming video (seconds)'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.1)
    .describe('Duration of the accordion fold transition (seconds)'),
  rotationAngle: z
    .number()
    .default(45)
    .describe('Maximum rotation angle for the accordion fold (degrees)'),
  skewAngle: z
    .number()
    .default(5)
    .describe('Skew angle to enhance folding illusion (degrees)'),
  shadowIntensity: z
    .number()
    .default(0.4)
    .describe('Shadow intensity between folds (0-1)'),
  staggerDelay: z
    .number()
    .default(0.1)
    .describe('Delay between each strip animation (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    rotationAngle,
    skewAngle,
    shadowIntensity,
    staggerDelay,
  } = params;

  // Total duration is just the transition duration for this effect
  const totalDuration = transitionDuration;

  // Strip configuration
  const strips = [
    { id: 1, rotation: rotationAngle, left: '0%' },
    { id: 2, rotation: -rotationAngle, left: '25%' },
    { id: 3, rotation: rotationAngle, left: '50%' },
    { id: 4, rotation: -rotationAngle, left: '75%' },
  ];

  const childrenData: RenderableComponentData[] = strips.map((strip, index) => {
    const stripId = `strip-container-${strip.id}`;
    const outgoingId = `strip-${strip.id}-outgoing`;
    const incomingId = `strip-${strip.id}-incoming`;
    const effectStagger = index * staggerDelay;

    // Calculate video offset for this strip (to align all strips showing same part of video)
    const stripLeftPercent = index * 25;
    const videoLeft = `-${index * 100}%`;
    const videoWidth = '400%';

    return {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: strip.left,
            top: '0',
            width: '25%',
            height: '100%',
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            clipPath: 'inset(0 0 0 0)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        // Outgoing video fold effect
        {
          id: `fold-out-${strip.id}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectStagger,
            duration: transitionDuration - effectStagger,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: strip.rotation, prog: 1 },
              { key: 'skewY', val: 0, prog: 0 },
              { key: 'skewY', val: strip.rotation > 0 ? skewAngle : -skewAngle, prog: 1 },
            ],
          },
        },
        // Shadow effect during fold
        {
          id: `shadow-${strip.id}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: effectStagger,
            duration: transitionDuration - effectStagger,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              {
                key: 'filter',
                val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 0,
              },
              {
                key: 'filter',
                val: `drop-shadow(${strip.rotation > 0 ? '2px' : '-2px'} 0 8px rgba(0,0,0,${shadowIntensity}))`,
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0px 0px 0px rgba(0,0,0,0))',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing video
        {
          id: outgoingId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideo.src,
            startFrom: outgoingVideo.startFrom || 0,
            className: 'absolute',
            style: {
              left: videoLeft,
              top: '0',
              width: videoWidth,
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${stripLeftPercent}% 50%`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: [
            // Fade out outgoing video
            {
              id: `fade-out-${strip.id}`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: effectStagger,
                duration: transitionDuration - effectStagger,
                mode: 'provider',
                targetIds: [outgoingId],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Incoming video
        {
          id: incomingId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideo.src,
            startFrom: incomingVideo.startFrom || 0,
            className: 'absolute',
            style: {
              left: videoLeft,
              top: '0',
              width: videoWidth,
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${stripLeftPercent}% 50%`,
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
          effects: [
            // Fade in incoming video (with opposite rotation to create accordion effect)
            {
              id: `fade-in-${strip.id}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: effectStagger,
                duration: transitionDuration - effectStagger,
                mode: 'provider',
                targetIds: [incomingId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ] as RenderableComponentData[],
    } as RenderableComponentData;
  });

  const rootContainer: RenderableComponentData = {
    id: 'accordion-fold-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1200px',
          perspectiveOrigin: '50% 50%',
          overflow: 'hidden',
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
  id: 'accordion-fold-3d-transition',
  title: '3D Accordion Fold Transition',
  description:
    'A 3D accordion fold transition where the screen folds like an accordion with zigzag effect. Outgoing video on one panel, incoming on another. Panels fold/unfold during 1.1s overlap with realistic shadows and alternating rotateY angles. Enhanced with skewY transforms for folding illusion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', '3d', 'accordion', 'fold', 'perspective', 'zigzag'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      startFrom: 0,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      startFrom: 0,
    },
    transitionDuration: 1.1,
    rotationAngle: 45,
    skewAngle: 5,
    shadowIntensity: 0.4,
    staggerDelay: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const accordionFold3dTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
