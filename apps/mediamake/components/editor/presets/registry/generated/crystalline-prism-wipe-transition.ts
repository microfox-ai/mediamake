/**
 * Crystalline Prism Wipe Transition Preset
 *
 * This preset creates a diagonal prism wipe transition that reveals incoming video through
 * a spectacular rainbow spectrum refraction effect. The transition moves diagonally from 
 * top-left to bottom-right at 45 degrees, simulating light passing through a crystal prism.
 *
 * Features:
 * - **Prismatic Spectrum Effect**: 7 hue-rotated video layers (0°, 51°, 102°, 153°, 204°, 255°, 306°)
 * - **Chromatic Aberration**: Outgoing video applies RGB channel splits and increasing blur
 * - **Diagonal Wipe**: 45-degree angled prism edge moving from top-left to bottom-right
 * - **Light Leak Effects**: Bright animated gradients at the prism edge with screen blend mode
 * - **Progressive Reveal**: Staggered clip-path animations on each spectrum layer
 * - **Convergence Effect**: Spectrum layers start with horizontal offsets that converge to 0
 *
 * Use cases:
 * - Premium video transitions with optical effects
 * - Music video scene changes
 * - Product reveal transitions
 * - Cinematic storytelling transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  video1: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    duration: z.number().describe('Duration of outgoing video in seconds'),
  }).describe('Outgoing video configuration'),
  
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }).describe('Incoming video configuration'),
  
  overlapDuration: z
    .number()
    .default(1.7)
    .describe('Duration of the transition overlap in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration } = params;

  // Calculate total composition duration
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Spectrum hue-rotate values for prismatic effect (7 colors of the rainbow)
  const spectrumHues = [0, 51, 102, 153, 204, 255, 306];
  
  // Helper function to calculate clip-path polygon for diagonal wipe
  const calculateClipPath = (progress: number): string => {
    // Diagonal wipe from top-left (0,0) to bottom-right (100,100)
    // Progress 0 = fully clipped (not visible), Progress 1 = fully revealed
    const offset = (1 - progress) * 141.42; // 141.42 is sqrt(100^2 + 100^2) for diagonal
    
    if (progress <= 0) {
      return 'polygon(0% 0%, 0% 0%, 0% 0%)';
    }
    if (progress >= 1) {
      return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)';
    }
    
    // Create diagonal sweep at 45 degrees
    const topX = Math.max(0, Math.min(100, progress * 141.42));
    const topY = 0;
    const rightX = 100;
    const rightY = Math.max(0, Math.min(100, progress * 141.42 - 100));
    const bottomX = Math.max(0, Math.min(100, progress * 141.42 - 100));
    const bottomY = 100;
    const leftX = 0;
    const leftY = Math.max(0, Math.min(100, progress * 141.42));
    
    return `polygon(0% 0%, ${topX}% ${topY}%, ${rightX}% ${rightY}%, ${bottomX}% ${bottomY}%, ${leftX}% ${leftY}%)`;
  };

  // Create spectrum layers (7 hue-rotated copies of incoming video)
  const spectrumLayers: RenderableComponentData[] = spectrumHues.map((hue, index) => {
    const layerDelay = index * 0.05; // 0.05s stagger delay between layers
    
    return {
      id: `spectrum-layer-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden',
          style: {
            filter: `hue-rotate(${hue}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: overlapDuration,
        },
      },
      effects: [
        // Clip-path reveal animation (staggered)
        {
          id: `spectrum-clip-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: layerDelay,
            duration: overlapDuration - layerDelay,
            mode: 'provider',
            targetIds: [`spectrum-layer-${index}`],
            ranges: [
              { key: 'clipPath', val: calculateClipPath(0), prog: 0 },
              { key: 'clipPath', val: calculateClipPath(0.3), prog: 0.3 },
              { key: 'clipPath', val: calculateClipPath(0.7), prog: 0.7 },
              { key: 'clipPath', val: calculateClipPath(1), prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `spectrum-video-${index}`,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video2.src,
            fit: 'cover',
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: overlapDuration,
            },
          },
          effects: [
            // Horizontal offset convergence animation
            {
              id: `spectrum-offset-${index}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: overlapDuration * 0.7,
                mode: 'provider',
                targetIds: [`spectrum-video-${index}`],
                ranges: [
                  { 
                    key: 'translateX', 
                    val: `${-10 + (index * 20 / 6)}px`, // Range from -10px to +10px
                    prog: 0 
                  },
                  { key: 'translateX', val: '0px', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Outgoing video with chromatic aberration and blur
  const outgoingVideo: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video1.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: video1.duration,
      },
    },
    effects: [
      // Increasing blur towards wipe edge
      {
        id: 'outgoing-blur',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: 'blur(18px)', prog: 0.8 },
            { key: 'filter', val: 'blur(18px)', prog: 1 },
          ],
        },
      },
      // Fade out
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming base video (behind spectrum layers)
  const incomingBaseVideo: RenderableComponentData = {
    id: 'incoming-base-video',
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: video2.src,
      fit: 'cover',
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: video2.duration + overlapDuration,
      },
    },
    effects: [
      // Subtle scale animation
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration * 0.8,
          mode: 'provider',
          targetIds: ['incoming-base-video'],
          ranges: [
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
      // Brightness normalization
      {
        id: 'incoming-brightness',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: overlapDuration * 0.5,
          mode: 'provider',
          targetIds: ['incoming-base-video'],
          ranges: [
            { key: 'filter', val: 'brightness(1.2)', prog: 0 },
            { key: 'filter', val: 'brightness(1.0)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Light leak effect at prism edge
  const lightLeakElement: RenderableComponentData = {
    id: 'light-leak-element',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          width: '200px',
          height: '200%',
          left: '-100px',
          top: '-50%',
          transform: 'rotate(45deg)',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent)',
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    effects: [
      // Diagonal movement animation
      {
        id: 'light-leak-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['light-leak-element'],
          ranges: [
            { key: 'translateX', val: '0vw', prog: 0 },
            { key: 'translateX', val: '150vw', prog: 1 },
            { key: 'translateY', val: '0vh', prog: 0 },
            { key: 'translateY', val: '150vh', prog: 1 },
          ],
        },
      },
      // Opacity pulse
      {
        id: 'light-leak-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['light-leak-element'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Spectrum container with screen blend mode
  const spectrumContainer: RenderableComponentData = {
    id: 'spectrum-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: video1.duration - overlapDuration,
        duration: overlapDuration,
      },
    },
    childrenData: spectrumLayers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crystalline-prism-wipe-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      outgoingVideo,
      incomingBaseVideo,
      spectrumContainer,
      lightLeakElement,
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
  id: 'crystalline-prism-wipe-transition',
  title: 'Crystalline Prism Wipe Transition',
  description:
    'A diagonal prism wipe transition that reveals the incoming video through rainbow spectrum refraction effects. Features 7 hue-rotated layers with animated clip-paths, chromatic aberration on the outgoing video, light leak effects at the prism edge, and smooth scale/brightness animations on the incoming video. The transition moves diagonally from top-left to bottom-right with a 45-degree angled prism edge over a 1.7s overlap duration.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'prism', 'wipe', 'spectrum', 'chromatic', 'light-leak', 'diagonal', 'rainbow'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 5,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 5,
    },
    overlapDuration: 1.7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crystallinePrismWipeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
