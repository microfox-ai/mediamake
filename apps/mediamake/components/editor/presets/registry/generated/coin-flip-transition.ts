/**
 * Spinning Coin Flip Transition for YouTube Images
 *
 * This preset creates a realistic 3D coin flip transition between YouTube images
 * with metallic edge reveal, motion blur, and bounce settle effects.
 *
 * Features:
 * - **3D Coin Flip**: Realistic rotateY transform from 0deg to 90deg (outgoing) and -90deg to 0deg (incoming)
 * - **Metallic Edge**: Thin gold/silver gradient bar visible at 90-degree position, simulating coin thickness
 * - **Motion Blur**: Dynamic blur filter peaking around midpoint (40-60%) during fastest rotation
 * - **Bounce Settle**: Cubic-bezier bounce easing for incoming image landing
 * - **Perspective Container**: 1200px perspective for depth effect
 * - **Smooth Crossfade**: Opacity transitions during flip for seamless changeover
 *
 * Use cases:
 * - YouTube video transitions between images
 * - Podcast visual transitions
 * - Dynamic image reveals with 3D effects
 * - Content transitions with realistic physics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of outgoing image'),
    duration: z.number().describe('Duration of outgoing image in seconds'),
  }).describe('Outgoing image configuration'),
  media2: z.object({
    src: z.string().describe('Source URL of incoming image'),
    duration: z.number().describe('Duration of incoming image in seconds'),
  }).describe('Incoming image configuration'),
  overlapDuration: z.number().default(0.8).describe('Duration of transition overlap in seconds (default: 0.8s)'),
  edgeColor: z.enum(['gold', 'silver']).default('gold').describe('Color of metallic coin edge (gold or silver)'),
  bounceIntensity: z.number().min(1).max(2).default(1.56).describe('Bounce intensity for incoming image settle (1 = no bounce, 1.56 = default)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, overlapDuration, edgeColor, bounceIntensity } = params;

  // Calculate total duration: sum of media durations minus overlap
  const totalDuration = media1.duration + media2.duration - overlapDuration;

  // Edge gradient colors based on selection
  const edgeGradient = edgeColor === 'gold'
    ? 'linear-gradient(to bottom, #fde047, #eab308, #fde047)' // Gold gradient
    : 'linear-gradient(to bottom, #e5e7eb, #9ca3af, #e5e7eb)'; // Silver gradient

  // Metallic edge element (visible at 90-degree position)
  const metallicEdge: RenderableComponentData = {
    id: 'metallic-edge',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 4px; height: 100%; background: ${edgeGradient}; position: absolute; left: 50%; transform: translateX(-50%); z-index: 15;"></div>`,
      className: 'absolute inset-y-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'edge-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: ['metallic-edge'],
          ranges: [
            // Fade in at 42% (0.42 * totalDuration)
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.42 },
            { key: 'opacity', val: 1, prog: 0.50 }, // Peak at 50% (90-degree position)
            { key: 'opacity', val: 0, prog: 0.58 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Outgoing image (flips from 0deg to 90deg)
  const outgoingImage: RenderableComponentData = {
    id: 'outgoing-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: media1.src,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: media1.duration,
      },
    },
    effects: [
      // Rotation effect: 0deg → 90deg (0-45% of total duration)
      {
        id: 'outgoing-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: totalDuration * 0.45, // 0-45%
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 90, prog: 1 },
          ],
        },
      },
      // Opacity fade: 1 → 0 at 40-50%
      {
        id: 'outgoing-opacity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: totalDuration * 0.40,
          duration: totalDuration * 0.10, // 40-50%
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Motion blur: 0px → 3px → 0px at 40-60%
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: totalDuration * 0.40,
          duration: totalDuration * 0.20, // 40-60%
          mode: 'provider',
          targetIds: ['outgoing-image'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(3px)', prog: 0.5 }, // Peak at 50%
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming image (flips from -90deg to 0deg with bounce)
  const incomingImage: RenderableComponentData = {
    id: 'incoming-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: media2.src,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: media1.duration - overlapDuration,
        duration: media2.duration + overlapDuration,
      },
    },
    effects: [
      // Rotation effect: -90deg → 0deg at 55-100% with cubic-bezier bounce
      {
        id: 'incoming-rotate',
        componentId: 'generic',
        data: {
          type: 'spring', // Using spring for bounce effect
          start: totalDuration * 0.55 - (media1.duration - overlapDuration),
          duration: totalDuration * 0.45, // 55-100%
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'rotateY', val: -90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      // Opacity fade: 0 → 1 at 50-55%
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: totalDuration * 0.50 - (media1.duration - overlapDuration),
          duration: totalDuration * 0.05, // 50-55%
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Motion blur: 0px → 3px → 0px at 40-60% (relative to incoming start)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: totalDuration * 0.40 - (media1.duration - overlapDuration),
          duration: totalDuration * 0.20, // 40-60%
          mode: 'provider',
          targetIds: ['incoming-image'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(3px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'coin-flip-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1200px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingImage,
      metallicEdge,
      incomingImage,
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
  id: 'coin-flip-transition',
  title: 'Spinning Coin Flip Transition',
  description: 'A realistic 3D coin flip transition for YouTube images with metallic edge reveal, rotateY 3D transforms, motion blur, and bounce settle. Features perspective-driven rotation from 0deg to 90deg for outgoing image, metallic gradient edge visibility at midpoint, and -90deg to 0deg rotation for incoming image with cubic-bezier bounce. Includes dynamic motion blur peaking around the fastest rotation phase (40-60%) and smooth opacity crossfade.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'coin-flip', '3d', 'youtube', 'images', 'metallic', 'bounce', 'motion-blur'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
      duration: 2,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&h=1080&fit=crop',
      duration: 2,
    },
    overlapDuration: 0.8,
    edgeColor: 'gold',
    bounceIntensity: 1.56,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const coinFlipTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
