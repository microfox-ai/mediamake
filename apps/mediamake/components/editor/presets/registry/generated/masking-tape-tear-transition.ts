/**
 * Masking Tape Tear-Through Transition Preset
 *
 * Creates an explosive transition where the incoming video punches through layers of weathered
 * masking tape like breaking through a paper wall. The tape appears in multiple overlapping
 * layers with beige and yellow tones, and pieces fly outward with physics-based motion.
 *
 * Features:
 * - **Multi-layered Tape**: Three distinct layers (background, middle, front) with varying opacity
 * - **Weathered Appearance**: Beige and yellow tones (amber-50, yellow-100, amber-100)
 * - **Center Breakthrough**: Explosion starts from center, pieces fly outward radially
 * - **Physics-Based Motion**: Rotation, scaling, and gravity effects on tape pieces
 * - **Impact Shake**: Screen shake for first 200ms to enhance breakthrough feeling
 * - **Staggered Animation**: 20ms stagger between pieces from center outward
 * - **Explosive Easing**: Custom cubic-bezier for explosive feel
 *
 * Technical Details:
 * - Incoming video scales from 0.7 to 1.0 with overshoot easing
 * - Outgoing video remains static at z-index 5
 * - Three tape layers at z-10, z-15, z-20 with 6-8 pieces each
 * - Each piece has unique translateX/Y based on angle from center
 * - Rotation range: ±180deg, Scale: 1 → 0.5, Opacity: 1 → 0
 * - Shake effect applied to root container for first 200ms
 *
 * Use cases:
 * - Dynamic video transitions with impact
 * - Breaking through visual barriers
 * - Energetic scene changes
 * - Creative video editing effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  incomingVideoSrc: z.string().describe('Source URL of the incoming video'),
  outgoingVideoSrc: z.string().describe('Source URL of the outgoing video'),
  transitionDuration: z
    .number()
    .default(1.3)
    .describe('Duration of the transition in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { incomingVideoSrc, outgoingVideoSrc, transitionDuration } = params;

  // Helper: Generate tape pieces for a layer
  const generateTapePieces = (
    layerId: string,
    bgColor: string,
    zIndex: number,
    pieceCount: number,
    startStagger: number,
  ): RenderableComponentData[] => {
    const pieces: RenderableComponentData[] = [];
    const centerX = 50;
    const centerY = 50;

    for (let i = 0; i < pieceCount; i++) {
      const pieceId = `${layerId}-piece-${i}`;
      
      // Random positioning around the screen
      const positions = [
        { top: 5 + i * 7, left: 10 + i * 10, width: 35, height: 40 },
        { top: 10 + i * 5, right: 8 + i * 8, width: 40, height: 35 },
        { bottom: 8 + i * 8, left: 5 + i * 9, width: 38, height: 45 },
        { bottom: 5 + i * 7, right: 10 + i * 12, width: 42, height: 38 },
        { top: 35 + i * 3, left: 35 + i * 2, width: 30, height: 25 },
        { top: 30 + i * 3, right: 30 + i * 2, width: 28, height: 30 },
        { top: 40 + i * 2, left: 48 - i * 5, width: 20, height: 22 },
        { top: 44 + i, right: 46 - i * 4, width: 16, height: 18 },
      ];

      const pos = positions[i % positions.length];
      
      // Calculate piece center relative to screen center
      const pieceTop = 'top' in pos ? pos.top : 100 - (pos.bottom || 0) - (pos.height || 0);
      const pieceLeft = 'left' in pos ? pos.left : 100 - (pos.right || 0) - (pos.width || 0);
      const pieceCenterX = pieceLeft + (pos.width || 0) / 2;
      const pieceCenterY = pieceTop + (pos.height || 0) / 2;
      
      // Calculate angle from center
      const deltaX = pieceCenterX - centerX;
      const deltaY = pieceCenterY - centerY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Explosion direction (away from center)
      const explosionFactor = 2.5 + (distance / 50);
      const translateX = deltaX * explosionFactor;
      const translateY = deltaY * explosionFactor;
      
      // Random rotation based on position
      const rotation = deltaX > 0 ? 120 + i * 20 : -120 - i * 20;

      // Build style object
      const styleObj: Record<string, any> = {
        width: `${pos.width}%`,
        height: `${pos.height}%`,
        transformOrigin: 'center',
      };

      if ('top' in pos) styleObj.top = `${pos.top}%`;
      if ('bottom' in pos) styleObj.bottom = `${pos.bottom}%`;
      if ('left' in pos) styleObj.left = `${pos.left}%`;
      if ('right' in pos) styleObj.right = `${pos.right}%`;

      pieces.push({
        id: pieceId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: `absolute ${bgColor}`,
          style: styleObj,
        },
        context: {
          timing: {
            start: startStagger + i * 0.02,
            duration: transitionDuration - (startStagger + i * 0.02),
          },
        },
        effects: [
          {
            id: `${pieceId}-explosion`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              easingParams: [0.68, -0.55, 0.32, 1.5],
              start: 0,
              duration: transitionDuration - (startStagger + i * 0.02),
              mode: 'provider',
              targetIds: [pieceId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: translateX, prog: 1 },
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: translateY, prog: 1 },
                { key: 'rotate', val: 0, prog: 0 },
                { key: 'rotate', val: rotation, prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.5, prog: 1 },
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 0.7 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    return pieces;
  };

  // Create tape layers
  const backgroundPieces = generateTapePieces(
    'bg-layer',
    'bg-amber-50/70',
    10,
    6,
    0,
  );
  const middlePieces = generateTapePieces(
    'mid-layer',
    'bg-yellow-100/80',
    15,
    7,
    0.02,
  );
  const frontPieces = generateTapePieces(
    'front-layer',
    'bg-amber-100/90',
    20,
    8,
    0.04,
  );

  // Build child structure
  const childrenData: RenderableComponentData[] = [
    // Incoming video (behind tape)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 0,
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
          id: 'incoming-scale-effect',
          componentId: 'generic',
          data: {
            type: 'cubic-bezier',
            easingParams: [0.34, 1.56, 0.64, 1],
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video'],
            ranges: [
              { key: 'scale', val: 0.7, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    // Outgoing video (in front, behind tape)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideoSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
    } as RenderableComponentData,
    // Background tape layer
    {
      id: 'tape-background-layer',
      type: 'layout',
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
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: backgroundPieces,
    } as RenderableComponentData,
    // Middle tape layer
    {
      id: 'tape-middle-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 15,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: middlePieces,
    } as RenderableComponentData,
    // Front tape layer
    {
      id: 'tape-front-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: frontPieces,
    } as RenderableComponentData,
  ];

  // Root container with shake effect
  const rootContainer: RenderableComponentData = {
    id: 'masking-tape-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
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
        id: 'root-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.2,
          mode: 'provider',
          targetIds: ['masking-tape-transition-container'],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 8, prog: 0.1 },
            { key: 'translateX', val: -6, prog: 0.2 },
            { key: 'translateX', val: 7, prog: 0.3 },
            { key: 'translateX', val: -5, prog: 0.4 },
            { key: 'translateX', val: 4, prog: 0.5 },
            { key: 'translateX', val: -3, prog: 0.6 },
            { key: 'translateX', val: 2, prog: 0.7 },
            { key: 'translateX', val: -1, prog: 0.8 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -6, prog: 0.15 },
            { key: 'translateY', val: 5, prog: 0.25 },
            { key: 'translateY', val: -4, prog: 0.35 },
            { key: 'translateY', val: 3, prog: 0.5 },
            { key: 'translateY', val: -2, prog: 0.65 },
            { key: 'translateY', val: 1, prog: 0.8 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
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
  id: 'masking-tape-tear-transition',
  title: 'Masking Tape Tear-Through Transition',
  description:
    'Explosive transition where incoming video punches through weathered masking tape layers with physics-based motion and impact shake',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'tape', 'explosion', 'physics', 'dynamic', 'impact'],
  defaultInputParams: {
    incomingVideoSrc: 'https://example.com/incoming.mp4',
    outgoingVideoSrc: 'https://example.com/outgoing.mp4',
    transitionDuration: 1.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const maskingTapeTearTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
