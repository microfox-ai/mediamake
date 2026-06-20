/**
 * Particle Disintegration Transition Preset
 *
 * Creates a magical particle transition where the outgoing video breaks into swirling glass particles 
 * that vortex and reassemble as the incoming video. Features motion blur, glow effects, and 
 * edge-to-center staggered animations.
 *
 * Technical Implementation:
 * - Uses 60 larger particles (instead of thousands) for performance
 * - Each particle is a VideoAtom with small clip-path rectangle showing a portion of the source video
 * - Outgoing particles: Break from edges first, swirl along bezier curve paths into vortex center
 * - Incoming particles: Emerge from vortex center, reassemble from center outward to form complete video
 * - Motion blur (0px→4px→0px) and opacity (1→0.6→0) applied via effects during movement
 * - Glow effect (drop-shadow) applied to moving particles for magical quality
 * - 3 second total duration with 1.5s overlap between outgoing and incoming phases
 *
 * Use cases:
 * - Creating magical video transitions with particle effects
 * - Building cinematic scene changes with glass/crystal aesthetic
 * - Adding visual interest to video sequences
 * - Creating premium-looking content transitions
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
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of outgoing video'),
  }).describe('Outgoing video source'),
  incomingVideo: z.object({
    src: z.string().describe('Source URL of incoming video'),
  }).describe('Incoming video source'),
  transitionDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Total transition duration in seconds'),
  particleCount: z
    .number()
    .min(50)
    .max(80)
    .default(60)
    .describe('Number of particles (50-80 for performance)'),
  vortexIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity of vortex swirl effect'),
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
    particleCount,
    vortexIntensity,
  } = params;

  const { config } = props;
  const viewportWidth = config?.width || 1920;
  const viewportHeight = config?.height || 1080;

  // Helper: Calculate grid position for particle
  const calculateGridPosition = (index: number, total: number) => {
    const cols = Math.ceil(Math.sqrt(total));
    const rows = Math.ceil(total / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    
    const cellWidth = 100 / cols;
    const cellHeight = 100 / rows;
    
    return {
      left: col * cellWidth,
      top: row * cellHeight,
      width: cellWidth,
      height: cellHeight,
    };
  };

  // Helper: Calculate distance from edge (0 = edge, 1 = center)
  const calculateEdgeDistance = (left: number, top: number) => {
    const centerX = 50;
    const centerY = 50;
    const distX = Math.abs(left - centerX) / 50;
    const distY = Math.abs(top - centerY) / 50;
    return Math.max(distX, distY); // Max distance to edge (0 = edge, 1 = center)
  };

  // Helper: Generate vortex coordinates for bezier path
  const generateVortexPath = (
    startX: number,
    startY: number,
    intensity: number,
  ) => {
    const centerX = 50;
    const centerY = 50;
    const angle = Math.atan2(startY - centerY, startX - centerX);
    const distance = Math.sqrt(
      Math.pow(startX - centerX, 2) + Math.pow(startY - centerY, 2),
    );
    
    // Control points for bezier curve (spiral path)
    const spiralFactor = intensity * 2;
    const cp1X = startX + Math.cos(angle + Math.PI / 4) * distance * 0.5;
    const cp1Y = startY + Math.sin(angle + Math.PI / 4) * distance * 0.5;
    const cp2X = centerX + Math.cos(angle - Math.PI / 2) * distance * 0.3 * spiralFactor;
    const cp2Y = centerY + Math.sin(angle - Math.PI / 2) * distance * 0.3 * spiralFactor;
    
    return { cp1X, cp1Y, cp2X, cp2Y };
  };

  // Generate particles
  const outgoingParticles: RenderableComponentData[] = [];
  const incomingParticles: RenderableComponentData[] = [];

  const overlapDuration = transitionDuration / 2; // 1.5s overlap

  for (let i = 0; i < particleCount; i++) {
    const gridPos = calculateGridPosition(i, particleCount);
    const particleCenterX = gridPos.left + gridPos.width / 2;
    const particleCenterY = gridPos.top + gridPos.height / 2;
    const edgeDistance = calculateEdgeDistance(particleCenterX, particleCenterY);
    
    // Stagger timing: edges break first (0s), center breaks last (0.5s)
    const staggerDelay = edgeDistance * 0.5;
    
    // Vortex path coordinates
    const vortexPath = generateVortexPath(
      particleCenterX,
      particleCenterY,
      vortexIntensity,
    );
    
    // Particle size (slight variation)
    const sizeVariation = 0.8 + Math.random() * 0.4; // 0.8x to 1.2x
    const particleWidth = gridPos.width * sizeVariation;
    const particleHeight = gridPos.height * sizeVariation;
    
    // Clip-path for this particle (shows small rectangle of video)
    const clipInsetTop = gridPos.top;
    const clipInsetRight = 100 - (gridPos.left + gridPos.width);
    const clipInsetBottom = 100 - (gridPos.top + gridPos.height);
    const clipInsetLeft = gridPos.left;
    
    // Calculate movement distance to vortex center
    const moveX = (50 - particleCenterX) * (viewportWidth / 100);
    const moveY = (50 - particleCenterY) * (viewportHeight / 100);
    
    // Rotation during vortex (more rotation for particles farther from center)
    const rotationAmount = (1 - edgeDistance) * 720 * vortexIntensity; // 0-720 degrees

    // OUTGOING PARTICLE
    const outgoingParticleId = `outgoing-particle-${i}`;
    const outgoingParticle: RenderableComponentData = {
      id: outgoingParticleId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: outgoingVideo.src,
        fit: 'cover',
        muted: true,
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          clipPath: `inset(${clipInsetTop}% ${clipInsetRight}% ${clipInsetBottom}% ${clipInsetLeft}%)`,
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
          id: `outgoing-disintegrate-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: staggerDelay,
            duration: transitionDuration - staggerDelay,
            mode: 'provider',
            targetIds: [outgoingParticleId],
            ranges: [
              // Move to vortex center
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: moveX, prog: 0.3 },
              { key: 'translateX', val: moveX, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: moveY, prog: 0.3 },
              { key: 'translateY', val: moveY, prog: 1 },
              // Rotation during swirl
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: rotationAmount * 0.5, prog: 0.3 },
              { key: 'rotate', val: rotationAmount, prog: 1 },
              // Opacity fade
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              // Motion blur (peak at mid-point)
              { key: 'filter', val: 'blur(0px) drop-shadow(0 0 0px rgba(255,255,255,0))', prog: 0 },
              { key: 'filter', val: 'blur(4px) drop-shadow(0 0 10px rgba(255,255,255,0.5))', prog: 0.15 },
              { key: 'filter', val: 'blur(4px) drop-shadow(0 0 10px rgba(255,255,255,0.5))', prog: 0.3 },
              { key: 'filter', val: 'blur(2px) drop-shadow(0 0 5px rgba(255,255,255,0.3))', prog: 0.6 },
              { key: 'filter', val: 'blur(0px) drop-shadow(0 0 0px rgba(255,255,255,0))', prog: 1 },
              // Scale down slightly during movement
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.7, prog: 0.3 },
              { key: 'scale', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    };
    outgoingParticles.push(outgoingParticle);

    // INCOMING PARTICLE
    // Center particles appear first (reverse stagger)
    const incomingStaggerDelay = (1 - edgeDistance) * 0.5;
    const incomingParticleId = `incoming-particle-${i}`;
    const incomingParticle: RenderableComponentData = {
      id: incomingParticleId,
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: incomingVideo.src,
        fit: 'cover',
        muted: true,
        style: {
          position: 'absolute',
          width: '100%',
          height: '100%',
          clipPath: `inset(${clipInsetTop}% ${clipInsetRight}% ${clipInsetBottom}% ${clipInsetLeft}%)`,
        },
      },
      context: {
        timing: {
          start: overlapDuration, // Start at 1.5s (overlap begins)
          duration: overlapDuration,
        },
      },
      effects: [
        {
          id: `incoming-assemble-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: incomingStaggerDelay,
            duration: overlapDuration - incomingStaggerDelay,
            mode: 'provider',
            targetIds: [incomingParticleId],
            ranges: [
              // Move from vortex center to grid position
              { key: 'translateX', val: moveX, prog: 0 },
              { key: 'translateX', val: moveX * 0.7, prog: 0.3 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: moveY, prog: 0 },
              { key: 'translateY', val: moveY * 0.7, prog: 0.3 },
              { key: 'translateY', val: 0, prog: 1 },
              // Reverse rotation
              { key: 'rotate', val: rotationAmount, prog: 0 },
              { key: 'rotate', val: rotationAmount * 0.5, prog: 0.3 },
              { key: 'rotate', val: 0, prog: 1 },
              // Opacity fade in
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.6, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
              // Motion blur (peak at start)
              { key: 'filter', val: 'blur(4px) drop-shadow(0 0 10px rgba(255,255,255,0.5))', prog: 0 },
              { key: 'filter', val: 'blur(4px) drop-shadow(0 0 10px rgba(255,255,255,0.5))', prog: 0.3 },
              { key: 'filter', val: 'blur(2px) drop-shadow(0 0 5px rgba(255,255,255,0.3))', prog: 0.6 },
              { key: 'filter', val: 'blur(0px) drop-shadow(0 0 0px rgba(255,255,255,0))', prog: 1 },
              // Scale up from small
              { key: 'scale', val: 0.3, prog: 0 },
              { key: 'scale', val: 0.7, prog: 0.3 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };
    incomingParticles.push(incomingParticle);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-disintegration-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#000000',
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
      // Outgoing particles container
      {
        id: 'outgoing-particles-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        childrenData: outgoingParticles,
      } as RenderableComponentData,
      // Incoming particles container
      {
        id: 'incoming-particles-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        context: {
          timing: {
            start: overlapDuration,
            duration: overlapDuration,
          },
        },
        childrenData: incomingParticles,
      } as RenderableComponentData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'particle-disintegration-transition',
  title: 'Particle Disintegration Transition',
  description:
    'A magical particle transition where the outgoing video breaks into swirling glass particles that vortex and reassemble as the incoming video. Features motion blur, glow effects, and edge-to-center staggered animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'particle', 'vortex', 'glass', 'magical', 'cinematic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    },
    incomingVideo: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    },
    transitionDuration: 3,
    particleCount: 60,
    vortexIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const particleDisintegrationTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
