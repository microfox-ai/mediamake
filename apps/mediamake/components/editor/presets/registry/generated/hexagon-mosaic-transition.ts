/**
 * Hexagon Mosaic Transition Preset
 *
 * Creates a handmade paper mosaic transition where both videos are divided into hexagonal pieces.
 * Pieces from the outgoing video randomly flutter away like falling paper scraps while pieces of
 * the incoming video assemble from scattered positions. Each piece has unique rotation and timing
 * for an organic, handcrafted feel.
 *
 * Features:
 * - **Hexagonal Grid**: 20 hexagonal pieces created using clip-path polygon
 * - **Random Flutter Effect**: Outgoing pieces fall with random rotation and timing
 * - **Assembly Animation**: Incoming pieces assemble from scattered random positions
 * - **Paper-like Aesthetics**: Drop shadows on each piece for depth
 * - **Organic Timing**: Staggered delays with Math.random() for natural feel
 * - **Overflow Visible**: Pieces can animate outside container bounds
 *
 * Use cases:
 * - Creative transitions between video segments
 * - Artistic video collages and montages
 * - Handcrafted aesthetic video presentations
 * - Dynamic paper mosaic effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingStartTime: z
    .number()
    .default(0)
    .describe('Start time for the outgoing video (seconds)'),
  incomingStartTime: z
    .number()
    .default(0)
    .describe('Start time for the incoming video (seconds)'),
  transitionDuration: z
    .number()
    .default(3)
    .describe('Duration of the transition overlap (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    outgoingStartTime,
    incomingStartTime,
    transitionDuration,
  } = params;

  // Helper function to generate random values
  const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Hexagon positions (20 pieces in a hexagonal grid pattern)
  const hexPositions = [
    // Row 1 (5 pieces)
    { top: '5%', left: '10%' },
    { top: '5%', left: '25%' },
    { top: '5%', left: '40%' },
    { top: '5%', left: '55%' },
    { top: '5%', left: '70%' },
    // Row 2 (5 pieces, offset)
    { top: '22%', left: '18%' },
    { top: '22%', left: '33%' },
    { top: '22%', left: '48%' },
    { top: '22%', left: '63%' },
    { top: '22%', left: '78%' },
    // Row 3 (5 pieces)
    { top: '40%', left: '10%' },
    { top: '40%', left: '25%' },
    { top: '40%', left: '40%' },
    { top: '40%', left: '55%' },
    { top: '40%', left: '70%' },
    // Row 4 (5 pieces, offset)
    { top: '58%', left: '18%' },
    { top: '58%', left: '33%' },
    { top: '58%', left: '48%' },
    { top: '58%', left: '63%' },
    { top: '58%', left: '78%' },
  ];

  // Hexagon clip-path
  const hexClipPath =
    'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)';

  const childrenData: RenderableComponentData[] = [];

  // Base outgoing video (underneath, full screen)
  childrenData.push({
    id: 'outgoing-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      startFrom: outgoingStartTime,
      muted: true,
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  } as RenderableComponentData);

  // Base incoming video (underneath, full screen, initially hidden)
  childrenData.push({
    id: 'incoming-video-base',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      startFrom: incomingStartTime,
      muted: true,
      className: 'w-full h-full object-cover',
      style: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
  } as RenderableComponentData);

  // Create outgoing hexagon pieces (flutter away)
  hexPositions.forEach((pos, index) => {
    const pieceId = `outgoing-hex-${index}`;
    const delay = random(0, 0.5); // Random delay up to 500ms
    const rotateEnd = random(-360, 360); // Random rotation
    const translateYEnd = random(120, 180); // Random fall distance (vh)
    const scaleEnd = random(0, 0.3); // Random final scale

    childrenData.push({
      id: pieceId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        startFrom: outgoingStartTime,
        muted: true,
        style: {
          position: 'absolute',
          width: '12%',
          height: '15%',
          top: pos.top,
          left: pos.left,
          clipPath: hexClipPath,
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
          zIndex: 10,
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
          id: `flutter-${pieceId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: delay,
            duration: transitionDuration - delay,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'translateY', val: '0vh', prog: 0 },
              { key: 'translateY', val: `${translateYEnd}vh`, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotateEnd, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: scaleEnd, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // Create incoming hexagon pieces (assemble from scattered positions)
  hexPositions.forEach((pos, index) => {
    const pieceId = `incoming-hex-${index}`;
    const delay = random(0, 0.5); // Random delay up to 500ms
    const startRotate = random(-180, 180); // Random initial rotation
    const startTranslateX = random(-100, 100); // Random horizontal offset (vw)
    const startTranslateY = random(-100, 100); // Random vertical offset (vh)
    const startScale = random(0.3, 0.8); // Random initial scale

    childrenData.push({
      id: pieceId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        startFrom: incomingStartTime,
        muted: true,
        style: {
          position: 'absolute',
          width: '12%',
          height: '15%',
          top: pos.top,
          left: pos.left,
          clipPath: hexClipPath,
          filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.2))',
          zIndex: 20,
          opacity: 0,
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
          id: `assemble-${pieceId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: delay,
            duration: transitionDuration - delay,
            mode: 'provider',
            targetIds: [pieceId],
            ranges: [
              { key: 'translateX', val: `${startTranslateX}vw`, prog: 0 },
              { key: 'translateX', val: '0vw', prog: 1 },
              { key: 'translateY', val: `${startTranslateY}vh`, prog: 0 },
              { key: 'translateY', val: '0vh', prog: 1 },
              { key: 'rotate', val: startRotate, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'scale', val: startScale, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  });

  // Root container (overflow visible to allow pieces to flutter outside)
  const rootContainer: RenderableComponentData = {
    id: 'hexagon-mosaic-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          overflow: 'visible',
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
  id: 'hexagon-mosaic-transition',
  title: 'Hexagon Mosaic Transition',
  description:
    'A handcrafted paper mosaic transition with hexagonal pieces. Outgoing video pieces flutter away like falling paper scraps while incoming pieces assemble from scattered positions with organic, staggered timing and rotation.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'hexagon', 'mosaic', 'paper', 'handcrafted', 'creative'],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    outgoingStartTime: 0,
    incomingStartTime: 0,
    transitionDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hexagonMosaicTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
