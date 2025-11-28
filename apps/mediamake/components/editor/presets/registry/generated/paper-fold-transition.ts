/**
 * Stop-Motion Paper Fold Transition Preset
 *
 * Creates a diagonal stop-motion paper fold transition where the outgoing video
 * folds like origami paper from top-left to bottom-right, revealing the incoming
 * video underneath. Features realistic paper grain texture, dynamic fold shadows,
 * 3D perspective effects, and a subtle bounce-back animation on completion.
 *
 * Features:
 * - **Diagonal Fold Animation**: Outgoing video folds from top-left to bottom-right
 * - **3D Perspective**: Uses CSS 3D transforms with perspective for depth
 * - **Paper Texture Overlay**: Optional paper grain texture with soft-light blend
 * - **Dynamic Shadows**: Multiple shadow layers along fold lines for realism
 * - **Bounce Effect**: Slight spring-back animation when fold completes
 * - **Unfold Animation**: Incoming video scales up from 95% to 100% with bounce
 * - **Customizable Duration**: Default 1.8 seconds, fully configurable
 *
 * Use cases:
 * - Creating organic transitions between video clips
 * - Adding tactile, paper-like feel to content transitions
 * - Building origami-style reveal effects
 * - Enhancing storytelling with physical metaphor transitions
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
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Incoming video configuration'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe('Duration of the paper fold transition in seconds'),
  paperTexture: z
    .object({
      src: z.string().describe('Source URL of the paper texture image'),
    })
    .optional()
    .describe('Optional paper texture overlay for enhanced paper effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, paperTexture } = params;

  // Calculate timing
  const baseLayoutDuration =
    video1.duration + video2.duration - transitionDuration;
  const foldStartTime = video1.duration - transitionDuration;
  const incomingStartTime = foldStartTime + 0.3; // Incoming starts 0.3s after fold begins
  const incomingDuration = video2.duration + (transitionDuration - 0.3);

  // Helper function to create shadow layers
  const createShadowLayer = (
    id: string,
    gradient: string,
    blendMode: string,
    startOffset: number,
  ): RenderableComponentData => {
    return {
      id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: gradient,
          mixBlendMode: blendMode,
        },
      },
      context: {
        timing: {
          start: foldStartTime + startOffset,
          duration: transitionDuration - startOffset,
        },
      },
      effects: [
        {
          id: `${id}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration - startOffset,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Outgoing video container with fold effect
  const outgoingVideoContainer: RenderableComponentData = {
    id: 'paper-fold-outgoing-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    childrenData: [
      // Outgoing video
      {
        id: 'paper-fold-outgoing-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video1.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          startFrom: 0,
          playbackRate: 1,
          volume: 1,
        },
        context: {
          timing: {
            start: 0,
            duration: video1.duration,
          },
        },
      } as RenderableComponentData,
      // Fold shadow layer 1
      createShadowLayer(
        'paper-fold-shadow-1',
        'linear-gradient(135deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.6) 100%)',
        'multiply',
        0,
      ),
      // Fold shadow layer 2
      createShadowLayer(
        'paper-fold-shadow-2',
        'linear-gradient(135deg, transparent 0%, rgba(50,50,50,0.4) 60%, rgba(0,0,0,0.8) 100%)',
        'overlay',
        0,
      ),
      // Fold line shadow layer
      {
        id: 'paper-fold-shadow-line',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute top-0 left-0 h-full pointer-events-none',
          style: {
            background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
            width: '4px',
            boxShadow: '2px 0 8px rgba(0,0,0,0.5)',
          },
        },
        context: {
          timing: {
            start: foldStartTime + 0.3,
            duration: transitionDuration - 0.3,
          },
        },
        effects: [
          {
            id: 'paper-fold-shadow-line-slide',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: transitionDuration - 0.3,
              mode: 'provider',
              targetIds: ['paper-fold-shadow-line'],
              ranges: [
                { key: 'translateX', val: -50, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 1, prog: 0.8 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
    effects: [
      // 3D fold effect with rotation, skew, and opacity
      {
        id: 'paper-fold-3d-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: foldStartTime,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['paper-fold-outgoing-container'],
          ranges: [
            // Rotate Y from 0 to -90 degrees, then bounce back to -85
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: -90, prog: 0.95 },
            { key: 'rotateY', val: -85, prog: 1 },
            // Skew Y for fold appearance
            { key: 'skewY', val: 0, prog: 0 },
            { key: 'skewY', val: -8, prog: 0.6 },
            { key: 'skewY', val: 0, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.95 },
          ],
        },
      },
    ],
  };

  // Incoming video container with unfold effect
  const incomingVideoContainer: RenderableComponentData = {
    id: 'paper-fold-incoming-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingStartTime,
        duration: incomingDuration,
      },
    },
    childrenData: [
      // Incoming video
      {
        id: 'paper-fold-incoming-video',
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: video2.src,
          className: 'absolute inset-0 w-full h-full object-cover',
          startFrom: 0,
          playbackRate: 1,
          volume: 1,
        },
        context: {
          timing: {
            start: 0,
            duration: incomingDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Scale up with bounce effect
      {
        id: 'paper-fold-incoming-scale',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: transitionDuration - 0.3,
          mode: 'provider',
          targetIds: ['paper-fold-incoming-container'],
          ranges: [
            // Scale from 0.95 to 1.02 (overshoot), then back to 1
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1.02, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
            // Fade in
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
          ],
        },
      },
    ],
  };

  // Paper texture overlay (optional)
  const paperTextureOverlay: RenderableComponentData | null = paperTexture
    ? {
        id: 'paper-fold-texture-overlay',
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: paperTexture.src,
          className: 'absolute inset-0 w-full h-full object-cover pointer-events-none',
          style: {
            mixBlendMode: 'soft-light',
            opacity: 0.5,
          },
        },
        context: {
          timing: {
            start: foldStartTime,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: 'paper-fold-texture-fade',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: ['paper-fold-texture-overlay'],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.5, prog: 0.3 },
                { key: 'opacity', val: 0.5, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      }
    : null;

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'paper-fold-transition-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
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
      outgoingVideoContainer,
      incomingVideoContainer,
      ...(paperTextureOverlay ? [paperTextureOverlay] : []),
    ] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'paper-fold-transition',
  title: 'Stop-Motion Paper Fold Transition',
  description:
    'A diagonal stop-motion paper fold transition that transforms the outgoing video into origami-style folding paper, revealing the incoming video underneath. Features realistic paper grain texture, dynamic fold shadows, 3D perspective effects, and a subtle bounce-back animation on completion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'paper', 'fold', 'origami', '3d', 'stop-motion'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    transitionDuration: 1.8,
    paperTexture: {
      src: 'https://example.com/paper-texture.jpg',
    },
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const paperFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
