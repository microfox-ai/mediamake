/**
 * Magnetic Field Displacement Transition
 *
 * A stunning 2-second transition effect that simulates magnetic field forces pulling videos apart
 * and reassembling them. The transition splits each video into 5 vertical strips that bend and curve
 * following magnetic field lines with S-curve deformations.
 *
 * Features:
 * - **Vertical Strip Splitting**: Each video is divided into 5 vertical strips (20% width each)
 * - **Magnetic Field Physics**: Strips follow magnetic field lines with varying displacement based on position
 * - **3D Curve Effects**: rotateY transforms create depth with -30deg to 30deg range
 * - **Electromagnetic Glow**: CSS filters (brightness, hue-rotate) simulate electromagnetic energy
 * - **Elastic Easing**: cubic-bezier(0.68, -0.55, 0.265, 1.55) creates magnetic pull effect
 * - **Synchronized Animation**: All strips animate simultaneously with peak distortion at 50% progress
 *
 * Technical Implementation:
 * - Outgoing strips: Move to edges with position-based displacement (center moves less, edges move more)
 * - Incoming strips: Converge from edges with inverse displacement
 * - Filter effects: brightness(1.5) and hue-rotate(180deg) at 50% progress for glow
 * - 3D perspective: Container uses perspective-1000 for depth effect
 *
 * Use cases:
 * - Dynamic video transitions with sci-fi aesthetic
 * - Energy-themed transitions for tech content
 * - Dramatic scene changes with visual impact
 * - Creative transitions for music videos or motion graphics
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
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video to transition from'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video to transition to'),
  transitionDuration: z
    .number()
    .default(2.0)
    .describe('Duration of the transition effect in seconds (default: 2.0)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { outgoingVideo, incomingVideo, transitionDuration } = params;

  // Calculate BaseLayout duration (overlap transition)
  const baseLayoutDuration =
    outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Strip configuration (5 vertical strips, 20% width each)
  const stripCount = 5;
  const stripWidth = 20; // percentage

  // Helper function to create clip-path for strip
  const createClipPath = (index: number): string => {
    const leftPercent = index * stripWidth;
    const rightPercent = 100 - (index + 1) * stripWidth;
    return `inset(0 ${rightPercent}% 0 ${leftPercent}%)`;
  };

  // Helper function to create object-position for strip
  const createObjectPosition = (index: number): string => {
    const position = (index * stripWidth + stripWidth / 2);
    return `${position}% center`;
  };

  // Helper function to calculate displacement based on position
  const calculateDisplacement = (index: number): number => {
    // Center strips move less, edge strips move more
    // Strip 0: -400px, Strip 1: -200px, Strip 2: -50px, Strip 3: +200px, Strip 4: +400px
    const positions = [-400, -200, -50, 200, 400];
    return positions[index];
  };

  // Helper function to calculate rotation based on position
  const calculateRotation = (index: number): number => {
    // Left strips rotate negative, right strips rotate positive
    const rotations = [-30, -15, 0, 15, 30];
    return rotations[index];
  };

  // Create outgoing video strips
  const outgoingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    const displacement = calculateDisplacement(i);
    const rotation = calculateRotation(i);

    outgoingStrips.push({
      id: `outgoing-strip-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        className: 'absolute h-full',
        style: {
          clipPath: createClipPath(i),
          width: '100%',
          objectFit: 'cover',
          objectPosition: createObjectPosition(i),
          transformStyle: 'preserve-3d',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: outgoingVideo.duration,
        },
      },
      effects: [
        {
          id: `magnetic-displacement-outgoing-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            bezier: [0.68, -0.55, 0.265, 1.55],
            start: outgoingVideo.duration - transitionDuration,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`outgoing-strip-${i}`],
            ranges: [
              // Translate (magnetic pull to edges)
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: displacement, prog: 1 },
              // Rotate (3D curve effect)
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: rotation, prog: 1 },
              // Opacity (fade out)
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
              // Brightness (electromagnetic glow)
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 1.5, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
              // Hue rotate (color shift)
              { key: 'hueRotate', val: 0, prog: 0 },
              { key: 'hueRotate', val: 180, prog: 0.5 },
              { key: 'hueRotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create incoming video strips
  const incomingStrips: RenderableComponentData[] = [];
  for (let i = 0; i < stripCount; i++) {
    const displacement = calculateDisplacement(i);
    // Inverse rotation for incoming (opposite curve direction)
    const rotation = -calculateRotation(i);

    incomingStrips.push({
      id: `incoming-strip-${i}`,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        className: 'absolute h-full',
        style: {
          clipPath: createClipPath(i),
          width: '100%',
          objectFit: 'cover',
          objectPosition: createObjectPosition(i),
          transformStyle: 'preserve-3d',
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration,
          duration: incomingVideo.duration + transitionDuration,
        },
      },
      effects: [
        {
          id: `magnetic-displacement-incoming-${i}`,
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            bezier: [0.68, -0.55, 0.265, 1.55],
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`incoming-strip-${i}`],
            ranges: [
              // Translate (converge from edges)
              { key: 'translateX', val: displacement, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              // Rotate (inverse 3D curve)
              { key: 'rotateY', val: rotation, prog: 0 },
              { key: 'rotateY', val: 0, prog: 1 },
              // Opacity (fade in)
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              // Brightness (electromagnetic glow)
              { key: 'brightness', val: 1, prog: 0 },
              { key: 'brightness', val: 1.5, prog: 0.5 },
              { key: 'brightness', val: 1, prog: 1 },
              // Hue rotate (color shift)
              { key: 'hueRotate', val: 0, prog: 0 },
              { key: 'hueRotate', val: 180, prog: 0.5 },
              { key: 'hueRotate', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Combine all strips
  const childrenData: RenderableComponentData[] = [
    ...outgoingStrips,
    ...incomingStrips,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'magnetic-field-displacement-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          perspective: '1000px',
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
  id: 'magnetic-field-displacement-transition',
  title: 'Magnetic Field Displacement Transition',
  description:
    'A 2-second transition effect that splits videos into 5 vertical strips that bend and curve along magnetic field lines. Outgoing strips are pulled to edges with S-curve deformations and 3D rotation, while incoming strips converge from edges with inverse curves. Features electromagnetic glow effects using CSS filters and color overlays with elastic magnetic easing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'magnetic',
    'displacement',
    'strips',
    '3d',
    'physics',
    'electromagnetic',
    'sci-fi',
    'video',
    'creative',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    transitionDuration: 2.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const magneticFieldDisplacementTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
