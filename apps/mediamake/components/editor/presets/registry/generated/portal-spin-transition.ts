/**
 * Portal Spin Transition Preset
 *
 * Creates a dramatic portal/vortex transition where:
 * - Outgoing image rotates on vertical axis (3D spin) while fading/shrinking via circular mask
 * - A portal vortex expands from center with multiple concentric rotating rings in cosmic colors
 * - Energy lines (cross-shaped glowing lines) rotate at different speeds with blur glow
 * - Incoming image emerges through the expanding portal with reverse 3D rotation
 * - Cosmic color palette: purples (#a855f7), cyans (#22d3ee), blues (#3b82f6)
 * - Uses radial gradient masks, rotateY for 3D spin, rotateZ for ring rotation
 * - Mix-blend-mode screen on portal elements for additive glow effect
 *
 * Technical Features:
 * - 3D perspective container (perspective: 1000px)
 * - Circular clip-path mask animations for reveal/hide
 * - Multiple portal rings scaling and rotating at different speeds
 * - Energy lines with blur filters for glow
 * - Z-index layering: outgoing (10) → portal (20) → incoming (25)
 * - Duration automatically calculated as media1.duration + media2.duration - 1.0s overlap
 *
 * Use Cases:
 * - YouTube video transitions with sci-fi/cosmic theme
 * - Image slideshow transitions with dimensional warp effect
 * - Creative video edits requiring dramatic scene changes
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
  media1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) media'),
    type: z.enum(['image', 'video']).describe('Type of first media'),
    duration: z.number().describe('Duration of first media in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the second (incoming) media'),
    type: z.enum(['image', 'video']).describe('Type of second media'),
    duration: z.number().describe('Duration of second media in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the portal transition effect in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate total duration with overlap
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Determine component IDs based on media type
  const media1ComponentId = media1.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const media2ComponentId = media2.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate timing points
  const outgoingStart = 0;
  const outgoingEnd = media1.duration;
  const spinStart = outgoingEnd - transitionDuration;
  const incomingStart = spinStart;

  // Portal rings configuration
  const portalRings = [
    { size: 200, borderWidth: 4, color: '#a855f7', speed: 2.0 },
    { size: 300, borderWidth: 3, color: '#22d3ee', speed: 1.5 },
    { size: 400, borderWidth: 5, color: '#3b82f6', speed: 1.0 },
    { size: 500, borderWidth: 2, color: '#9333ea', speed: 0.8 },
  ];

  // Build portal ring children
  const portalRingChildren: RenderableComponentData[] = portalRings.map(
    (ring, index) => ({
      id: `portal-ring-${index + 1}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${ring.size}px; height: ${ring.size}px; border-radius: 50%; border: ${ring.borderWidth}px solid ${ring.color}; position: absolute;"></div>`,
        className: 'absolute',
        style: {
          filter: 'blur(2px)',
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
          id: `ring-${index + 1}-scale-rotate`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [`portal-ring-${index + 1}`],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.5, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.3, prog: 1 },
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360 * ring.speed, prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  // Energy lines (cross pattern)
  const energyLines: RenderableComponentData[] = [
    {
      id: 'energy-line-horizontal',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 250px; height: 2px; background: linear-gradient(90deg, transparent, #a855f7, transparent); position: absolute;"></div>`,
        className: 'absolute',
        style: {
          filter: 'blur(1px)',
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
          id: 'energy-line-h-rotate',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['energy-line-horizontal'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.3 },
              { key: 'opacity', val: 0.9, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'energy-line-vertical',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 2px; height: 250px; background: linear-gradient(180deg, transparent, #22d3ee, transparent); position: absolute;"></div>`,
        className: 'absolute',
        style: {
          filter: 'blur(1px)',
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
          id: 'energy-line-v-rotate',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['energy-line-vertical'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -360, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.9, prog: 0.3 },
              { key: 'opacity', val: 0.9, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Portal vortex container
  const portalVortexContainer: RenderableComponentData = {
    id: 'portal-vortex-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 20,
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: spinStart,
        duration: transitionDuration,
      },
    },
    childrenData: [...portalRingChildren, ...energyLines],
  };

  // Outgoing media with 3D spin and circular mask
  const outgoingMedia: RenderableComponentData = {
    id: 'outgoing-media',
    type: 'atom',
    componentId: media1ComponentId,
    data: {
      src: media1.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        transformStyle: 'preserve-3d',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: outgoingStart,
        duration: media1.duration,
      },
    },
    effects: [
      {
        id: 'outgoing-spin-mask',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: spinStart,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-media'],
          ranges: [
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 90, prog: 1 },
            {
              key: 'clipPath',
              val: 'circle(100% at 50% 50%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'circle(50% at 50% 50%)',
              prog: 0.5,
            },
            {
              key: 'clipPath',
              val: 'circle(0% at 50% 50%)',
              prog: 1,
            },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming media with reverse 3D spin and expanding circular mask
  const incomingMedia: RenderableComponentData = {
    id: 'incoming-media',
    type: 'atom',
    componentId: media2ComponentId,
    data: {
      src: media2.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      style: {
        transformStyle: 'preserve-3d',
        zIndex: 25,
      },
    },
    context: {
      timing: {
        start: incomingStart,
        duration: media2.duration + transitionDuration,
      },
    },
    effects: [
      {
        id: 'incoming-spin-mask',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-media'],
          ranges: [
            { key: 'rotateY', val: -90, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
            {
              key: 'clipPath',
              val: 'circle(0% at 50% 50%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'circle(100% at 50% 50%)',
              prog: 1,
            },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'portal-spin-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
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
    childrenData: [outgoingMedia, portalVortexContainer, incomingMedia],
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
  id: 'portal-spin-transition',
  title: 'Portal Spin Transition',
  description:
    'A transition effect where the outgoing image spins on its vertical axis while a circular portal/vortex expands from the center with swirling energy rings. The portal features concentric rotating circles in cosmic colors (purples, blues, cyans) with glow effects, and the incoming image is revealed through the expanding portal as the rotation completes.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'portal', 'vortex', '3d', 'cosmic', 'spin'],
  defaultInputParams: {
    media1: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const portalSpinTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
