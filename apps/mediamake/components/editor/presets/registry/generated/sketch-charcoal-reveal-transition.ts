/**
 * Sketch Charcoal Reveal Transition Preset
 *
 * This preset mimics the artistic process of charcoal being rubbed across textured paper
 * to reveal the next scene. The transition creates a hand-drawn sketch effect where the
 * incoming video is gradually revealed through animated charcoal strokes that move
 * diagonally across the screen from top-left to bottom-right.
 *
 * Features:
 * - Diagonal charcoal rub reveal effect (top-left to bottom-right)
 * - Progressive grayscale and sketch effect on outgoing video
 * - Expanding clip-path mask on incoming video (simulates charcoal rubbing)
 * - Subtle paper texture overlay during transition
 * - 1.5-second overlap period with smooth transitions
 * - Proper z-index layering for visual depth
 *
 * Use cases:
 * - Artistic video transitions
 * - Documentary scene changes
 * - Sketch-style video presentations
 * - Creative storytelling transitions
 * - Drawing/art tutorial videos
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) video'),
    duration: z.number().describe('Duration of the first video in seconds'),
  }).describe('First (outgoing) video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the second (incoming) video'),
    duration: z.number().describe('Duration of the second video in seconds'),
  }).describe('Second (incoming) video configuration'),
  
  transitionDuration: z.number()
    .default(1.5)
    .describe('Duration of the transition overlap in seconds (default: 1.5s)'),
    
  textureOpacity: z.number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Opacity of the paper texture overlay (0-1, default: 0.3)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, transitionDuration, textureOpacity } = params;

  // Calculate total duration with overlap
  const totalDuration = video1.duration + video2.duration - transitionDuration;

  // Transition starts when outgoing video is near end
  const transitionStartTime = video1.duration - transitionDuration;

  // Helper function to create grayscale/contrast filter effect for outgoing video
  const createGrayscaleEffect = () => {
    return {
      id: 'outgoing-grayscale-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: transitionStartTime, // Relative to outgoing video start
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['outgoing-video'],
        ranges: [
          // Grayscale progression
          { key: 'filter', val: 'grayscale(0) contrast(1)', prog: 0 },
          { key: 'filter', val: 'grayscale(1) contrast(1.2)', prog: 1 },
          // Fade out slightly
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create diagonal clip-path reveal for incoming video
  const createClipPathRevealEffect = () => {
    return {
      id: 'incoming-clippath-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0, // Relative to incoming video start
        duration: transitionDuration,
        mode: 'provider',
        targetIds: ['incoming-video'],
        ranges: [
          // Diagonal clip-path reveal (top-left to bottom-right)
          {
            key: 'clipPath',
            val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
            prog: 0,
          },
          {
            key: 'clipPath',
            val: 'polygon(0 0, 50% 0, 0 50%, 0 100%)',
            prog: 0.3,
          },
          {
            key: 'clipPath',
            val: 'polygon(0 0, 100% 0, 50% 50%, 0 100%)',
            prog: 0.6,
          },
          {
            key: 'clipPath',
            val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
            prog: 1,
          },
          // Fade in slightly for smoother appearance
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
        ],
      },
    };
  };

  // Helper function to create texture overlay fade effect
  const createTextureFadeEffect = () => {
    return {
      id: 'texture-fade-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0, // Relative to texture overlay start
        duration: transitionDuration * 0.5, // Fade in first half
        mode: 'provider',
        targetIds: ['texture-overlay'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: textureOpacity ?? 0.3, prog: 1 },
        ],
      },
    };
  };

  const createTextureFadeOutEffect = () => {
    return {
      id: 'texture-fade-out-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: transitionDuration * 0.5, // Fade out second half
        duration: transitionDuration * 0.5,
        mode: 'provider',
        targetIds: ['texture-overlay'],
        ranges: [
          { key: 'opacity', val: textureOpacity ?? 0.3, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing video (bottom layer, z-index: 10)
    {
      id: 'outgoing-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video1.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 10,
        },
        fit: 'cover',
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
      effects: [createGrayscaleEffect()],
    } as RenderableComponentData,

    // Incoming video (middle layer, z-index: 20)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          zIndex: 20,
        },
        fit: 'cover',
        startFrom: 0,
        playbackRate: 1,
        volume: 1,
      },
      context: {
        timing: {
          start: transitionStartTime, // Start during overlap
          duration: video2.duration + transitionDuration,
        },
      },
      effects: [createClipPathRevealEffect()],
    } as RenderableComponentData,

    // Paper texture overlay (top layer, z-index: 30)
    {
      id: 'texture-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 4px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 2px, transparent 2px, transparent 4px);"></div>`,
        className: 'absolute inset-0',
        style: {
          zIndex: 30,
          mixBlendMode: 'multiply',
          opacity: 0, // Start invisible
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: transitionStartTime, // Start during overlap
          duration: transitionDuration,
        },
      },
      effects: [createTextureFadeEffect(), createTextureFadeOutEffect()],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'sketch-charcoal-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'sketch-charcoal-reveal-transition',
  title: 'Sketch Charcoal Reveal Transition',
  description:
    'A transition preset that mimics the artistic process of charcoal being rubbed across textured paper to reveal the next scene. Features a hand-drawn sketch effect where the incoming video is gradually revealed through animated charcoal strokes moving diagonally from top-left to bottom-right, with progressive grayscale and sketch effects on the outgoing video, and a subtle paper texture overlay during the transition.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'charcoal', 'sketch', 'artistic', 'diagonal', 'reveal', 'texture'],
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
    textureOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const sketchCharcoalRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
