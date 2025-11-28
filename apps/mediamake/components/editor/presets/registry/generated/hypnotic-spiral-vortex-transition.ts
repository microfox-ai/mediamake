/**
 * Hypnotic Spiral Vortex Transition
 *
 * This preset creates a mesmerizing transition effect where videos twist through a 
 * fractal logarithmic spiral following the golden ratio. The outgoing video wraps 
 * around 20 spiral segments that decrease in size following the golden ratio (1.618), 
 * with each segment rotating at different speeds to create a hypnotic whirlpool effect. 
 * The incoming video unravels from the center following the reverse spiral path.
 *
 * Features:
 * - **Logarithmic Spiral Path**: Segments positioned via r = a * e^(b*θ) formula
 * - **Golden Ratio Scaling**: Each segment's size follows φ reduction (1.618)
 * - **Differential Rotation**: Each segment rotates at unique speed for whirlpool effect
 * - **Motion Blur**: CSS blur filter peaks at transition midpoint (1.15s)
 * - **Acceleration/Deceleration**: Smooth easing from 0-1.15s (accel) and 1.15-2.3s (decel)
 * - **Reverse Spiral Emergence**: Incoming video scales from center with reverse timing
 *
 * Use cases:
 * - Creating dramatic video transitions with hypnotic spiral effects
 * - Building cinematic scene changes with mathematical precision
 * - Adding psychedelic vortex effects to video montages
 * - Implementing golden ratio-based visual transitions
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
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Outgoing video that spirals into the vortex'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type'),
  }).describe('Incoming video that emerges from the vortex center'),
  transitionDuration: z
    .number()
    .default(2.3)
    .describe('Total transition duration in seconds'),
  spiralSegments: z
    .number()
    .default(20)
    .describe('Number of spiral segments (recommended: 20)'),
  spiralTightness: z
    .number()
    .default(0.15)
    .describe('Logarithmic spiral tightness parameter (b in formula)'),
  rotationMultiplier: z
    .number()
    .default(1080)
    .describe('Maximum rotation in degrees for outermost segment'),
  blurPeakIntensity: z
    .number()
    .default(4)
    .describe('Maximum blur intensity in pixels at peak rotation'),
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
    spiralSegments,
    spiralTightness,
    rotationMultiplier,
    blurPeakIntensity,
  } = params;

  const goldenRatio = 1.618;
  const peakTime = 1.15; // Transition peak at 1.15s
  const viewportWidth = props.config?.width || 1920;
  const viewportHeight = props.config?.height || 1080;

  // Helper: Calculate logarithmic spiral position
  // Formula: r = a * e^(b*θ)
  const calculateSpiralPosition = (index: number, total: number) => {
    const theta = (index / total) * Math.PI * 4; // 4 full rotations
    const a = Math.min(viewportWidth, viewportHeight) * 0.05; // Starting radius
    const b = spiralTightness;
    const r = a * Math.exp(b * theta);
    
    const x = r * Math.cos(theta);
    const y = r * Math.sin(theta);
    
    return { x, y, theta };
  };

  // Helper: Calculate segment size following golden ratio
  const calculateSegmentSize = (index: number) => {
    const baseSize = Math.min(viewportWidth, viewportHeight) * 0.25;
    const scaleFactor = Math.pow(goldenRatio, -index / 5); // Gradual reduction
    return {
      width: baseSize * scaleFactor,
      height: baseSize * scaleFactor,
    };
  };

  // Determine component IDs
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Create spiral segments for outgoing video
  const spiralSegments_array: RenderableComponentData[] = [];
  
  for (let i = 0; i < spiralSegments; i++) {
    const position = calculateSpiralPosition(i, spiralSegments);
    const size = calculateSegmentSize(i);
    const rotationAmount = rotationMultiplier * (i / spiralSegments);
    const segmentId = `spiral-segment-${i}`;
    const videoId = `spiral-video-${i}`;

    // Calculate center position (50% 50% in viewport)
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;
    const finalX = centerX + position.x;
    const finalY = centerY + position.y;

    spiralSegments_array.push({
      id: segmentId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${finalX}px`,
            top: `${finalY}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            transform: 'translate(-50%, -50%)',
            transformOrigin: '50% 50%',
            overflow: 'hidden',
            borderRadius: '8px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        // Rotation effect (accelerate then decelerate)
        {
          id: `rotate-${segmentId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationAmount, prog: 1 },
            ],
          },
        },
        // Motion blur effect (peaks at 1.15s)
        {
          id: `blur-${segmentId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${blurPeakIntensity}px)`, prog: peakTime / transitionDuration },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        // Opacity fade out
        {
          id: `opacity-${segmentId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Scale toward center
        {
          id: `scale-${segmentId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [segmentId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: videoId,
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            ...(outgoingVideo.type === 'video' ? { muted: true } : {}),
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  }

  // Create incoming video container (emerges from center)
  const incomingVideoContainer: RenderableComponentData = {
    id: 'incoming-video-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 20,
          transformOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Scale from 0 to 1 (starts at peak time)
      {
        id: 'incoming-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: peakTime,
          duration: transitionDuration - peakTime,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-opacity',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: peakTime,
          duration: transitionDuration - peakTime,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Counter-rotation (reverse spiral)
      {
        id: 'incoming-rotate',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: peakTime,
          duration: transitionDuration - peakTime,
          mode: 'provider',
          targetIds: ['incoming-video-container'],
          ranges: [
            { key: 'rotate', val: -360, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      {
        id: 'incoming-video',
        type: 'atom',
        componentId: incomingComponentId,
        data: {
          src: incomingVideo.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
          ...(incomingVideo.type === 'video' ? { muted: false } : {}),
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'vortex-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
        style: {
          transformOrigin: '50% 50%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      // Spiral segments container
      {
        id: 'spiral-segments-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 10,
              transformOrigin: '50% 50%',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: spiralSegments_array,
      } as RenderableComponentData,
      // Incoming video
      incomingVideoContainer,
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
  id: 'hypnotic-spiral-vortex-transition',
  title: 'Hypnotic Spiral Vortex Transition',
  description:
    'A mesmerizing transition effect where videos twist through a fractal logarithmic spiral following the golden ratio. Outgoing video wraps around 20 spiral segments with differential rotation speeds creating a hypnotic whirlpool effect, while incoming video unravels from the center with reverse spiral motion. Features motion blur during peak rotation and smooth acceleration/deceleration curves over 2.3 seconds.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'spiral',
    'vortex',
    'hypnotic',
    'golden-ratio',
    'fractal',
    'logarithmic',
    'whirlpool',
    'rotation',
    'motion-blur',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video',
    },
    transitionDuration: 2.3,
    spiralSegments: 20,
    spiralTightness: 0.15,
    rotationMultiplier: 1080,
    blurPeakIntensity: 4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const hypnoticSpiralVortexTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
