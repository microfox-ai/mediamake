/**
 * Romantic Memory Fade Transition Preset
 *
 * A romantic wedding album-style transition preset that creates a nostalgic memory fade effect.
 * Flips through scenes like a wedding album with photos gently fading and drifting away like
 * falling rose petals. Each scene features a subtle Ken Burns effect (slow zoom and pan) that
 * gives life to still moments.
 *
 * Features:
 * - Ken Burns Effect: Continuous scale animation (1→1.1) with translateX (-2%→2%) over scene duration
 * - Exit Animation: Outgoing scene drifts upward with rotation (opacity 1→0, translateY 0→-10%, rotate 0→3deg)
 * - Enter Animation: Incoming scene drifts in from below with opposite rotation (opacity 0→1, translateY 10%→0, rotate -3deg→0)
 * - Paper Texture Overlay: Vintage grain texture with mix-blend-multiply for nostalgic feel
 * - Sepia Filter: Applied during transitions for enhanced vintage album feeling
 * - Particle Effects: Floating dust motes/light sparkles that add magical atmosphere
 *
 * Technical Specifications:
 * - Ken Burns: Scale 1→1.1, translateX -2%→2% over scene duration
 * - Exit: opacity 1→0, translateY 0→-10%, rotate 0→3deg over 1.5s ease-in
 * - Enter: opacity 0→1, translateY 10%→0, rotate -3deg→0 over 1.5s ease-out with 0.5s delay
 * - Paper texture: Absolute overlay with mix-blend-multiply, opacity-10, noise texture background
 * - Sepia: filter: 'sepia(0.2) contrast(0.95)' during transition period
 * - Particles: 5-8 white circles (w-1 h-1) with random vertical drift and sine wave motion
 * - fitDurationTo: 'media' for dynamic timing based on media durations
 * - GPU optimized with transform-style: preserve-3d
 *
 * Use Cases:
 * - Wedding videos and anniversary montages
 * - Romantic photo slideshows
 * - Memory lane presentations
 * - Sentimental storytelling videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ==================== ZOD SCHEMA ====================

const presetParams = z.object({
  scenes: z
    .array(
      z.object({
        src: z.string().describe('Source URL of the scene image or video'),
        type: z
          .enum(['image', 'video'])
          .describe('Media type of the scene (image or video)'),
        duration: z
          .number()
          .describe('Duration of the scene in seconds (for images)'),
      }),
    )
    .min(2)
    .describe('Array of scenes to transition between (minimum 2 scenes)'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Duration of transition overlap in seconds (default: 1.5s)'),
  transitionDelay: z
    .number()
    .default(0.5)
    .describe('Delay before incoming scene starts fading in (default: 0.5s)'),
  kenBurnsIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(1.0)
    .describe('Intensity multiplier for Ken Burns effect (default: 1.0)'),
  particleCount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Number of floating particle effects (default: 8)'),
  sepiaIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Sepia filter intensity during transitions (default: 0.2)'),
  paperTextureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Opacity of paper texture overlay (default: 0.1)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ==================== PRESET EXECUTION ====================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    scenes,
    transitionDuration,
    transitionDelay,
    kenBurnsIntensity,
    particleCount,
    sepiaIntensity,
    paperTextureOpacity,
  } = params;

  // Helper: Generate paper texture SVG data URL
  const generatePaperTexture = (): string => {
    // Simple noise texture using SVG filter
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/>
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" opacity="0.5"/>
    </svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Helper: Generate random particle positions and animation parameters
  const generateParticles = (): Array<{
    id: string;
    left: number;
    startY: number;
    duration: number;
    delay: number;
    xAmplitude: number;
    size: number;
  }> => {
    const particles: Array<{
      id: string;
      left: number;
      startY: number;
      duration: number;
      delay: number;
      xAmplitude: number;
      size: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        id: `particle-${i + 1}`,
        left: Math.random() * 100, // Random horizontal position (%)
        startY: 100 + Math.random() * 20, // Start slightly below viewport
        duration: 8 + Math.random() * 2, // 8-10 seconds
        delay: Math.random() * 5, // Staggered starts (0-5s)
        xAmplitude: 20 + Math.random() * 30, // Horizontal sine wave amplitude (20-50px)
        size: 2 + Math.random() * 2, // Size 2-4px
      });
    }

    return particles;
  };

  // Calculate total duration: sum of all scene durations minus overlaps
  const calculateTotalDuration = (): number => {
    const totalSceneDuration = scenes.reduce(
      (sum, scene) => sum + scene.duration,
      0,
    );
    const totalOverlap = (scenes.length - 1) * transitionDuration;
    return totalSceneDuration - totalOverlap;
  };

  const totalDuration = calculateTotalDuration();
  const particles = generateParticles();

  // Build scene components with Ken Burns and transition effects
  const sceneComponents: RenderableComponentData[] = [];
  let currentStartTime = 0;

  scenes.forEach((scene, index) => {
    const isFirst = index === 0;
    const isLast = index === scenes.length - 1;
    const sceneDuration = scene.duration;

    // Scene wrapper with Ken Burns effect
    const sceneWrapper: RenderableComponentData = {
      id: `scene-wrapper-${index}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformOrigin: 'center center',
            transformStyle: 'preserve-3d' as const,
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: currentStartTime,
          duration: sceneDuration,
        },
      },
      childrenData: [
        {
          id: `scene-media-${index}`,
          type: 'atom',
          componentId: scene.type === 'video' ? 'VideoAtom' : 'ImageAtom',
          data: {
            src: scene.src,
            className: 'w-full h-full object-cover',
            ...(scene.type === 'video' && {
              loop: false,
              muted: false,
              volume: 1,
            }),
          },
          context: {
            timing: {
              start: 0,
              duration: sceneDuration,
            },
          },
        },
      ],
      effects: [],
    };

    // Ken Burns effect: continuous scale 1→1.1 and translateX -2%→2%
    const kenBurnsEffect = {
      id: `ken-burns-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: sceneDuration,
        mode: 'provider' as const,
        targetIds: [`scene-media-${index}`],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1 + 0.1 * kenBurnsIntensity, prog: 1 },
          { key: 'translateX', val: '-2%', prog: 0 },
          { key: 'translateX', val: '2%', prog: 1 },
        ],
      },
    };
    sceneWrapper.effects!.push(kenBurnsEffect);

    // Exit animation (fade out, drift up, rotate) for all except last scene
    if (!isLast) {
      const exitStartTime = sceneDuration - transitionDuration;
      const exitEffect = {
        id: `exit-animation-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in' as const,
          start: exitStartTime,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [`scene-wrapper-${index}`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-10%', prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 3, prog: 1 },
          ],
        },
      };
      sceneWrapper.effects!.push(exitEffect);

      // Sepia filter during exit transition
      const sepiaExitEffect = {
        id: `sepia-exit-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: exitStartTime,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [`scene-media-${index}`],
          ranges: [
            {
              key: 'filter',
              val: 'sepia(0) contrast(1)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `sepia(${sepiaIntensity}) contrast(0.95)`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'sepia(0) contrast(1)',
              prog: 1,
            },
          ],
        },
      };
      sceneWrapper.effects!.push(sepiaExitEffect);
    }

    // Enter animation (fade in from below, rotate opposite) for all except first scene
    if (!isFirst) {
      const enterEffect = {
        id: `enter-animation-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: transitionDelay,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [`scene-wrapper-${index}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'translateY', val: '10%', prog: 0 },
            { key: 'translateY', val: '0%', prog: 1 },
            { key: 'rotate', val: -3, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        },
      };
      sceneWrapper.effects!.push(enterEffect);

      // Sepia filter during enter transition
      const sepiaEnterEffect = {
        id: `sepia-enter-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: transitionDelay,
          duration: transitionDuration,
          mode: 'provider' as const,
          targetIds: [`scene-media-${index}`],
          ranges: [
            {
              key: 'filter',
              val: `sepia(${sepiaIntensity}) contrast(0.95)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `sepia(${sepiaIntensity}) contrast(0.95)`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'sepia(0) contrast(1)',
              prog: 1,
            },
          ],
        },
      };
      sceneWrapper.effects!.push(sepiaEnterEffect);
    }

    sceneComponents.push(sceneWrapper);

    // Update current start time for next scene (overlap by transitionDuration)
    if (!isLast) {
      currentStartTime += sceneDuration - transitionDuration;
    }
  });

  // Paper texture overlay
  const paperTextureOverlay: RenderableComponentData = {
    id: 'paper-texture-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply' as const,
          opacity: paperTextureOpacity,
          backgroundImage: `url("${generatePaperTexture()}")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '200px 200px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Particle effects
  const particleComponents: RenderableComponentData[] = particles.map(
    (particle) => ({
      id: particle.id,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape: 'circle' as const,
        color: 'white',
        className: 'absolute',
        style: {
          width: `${particle.size}px`,
          height: `${particle.size}px`,
          borderRadius: '50%',
          opacity: 0.4,
          left: `${particle.left}%`,
          top: `${particle.startY}%`,
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
          id: `${particle.id}-float`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: particle.delay,
            duration: particle.duration,
            mode: 'provider' as const,
            targetIds: [particle.id],
            ranges: [
              { key: 'translateY', val: '0%', prog: 0 },
              { key: 'translateY', val: '-100vh', prog: 1 },
              { key: 'translateX', val: '0px', prog: 0 },
              { key: 'translateX', val: `${particle.xAmplitude}px`, prog: 0.25 },
              { key: 'translateX', val: '0px', prog: 0.5 },
              {
                key: 'translateX',
                val: `${-particle.xAmplitude}px`,
                prog: 0.75,
              },
              { key: 'translateX', val: '0px', prog: 1 },
            ],
          },
        },
      ],
    }),
  );

  const particlesContainer: RenderableComponentData = {
    id: 'particles-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: particleComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'romantic-memory-fade-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as const,
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
      // Scene container
      {
        id: 'scene-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformStyle: 'preserve-3d' as const,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: sceneComponents,
      },
      paperTextureOverlay,
      particlesContainer,
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'romantic-memory-fade-transition',
  title: 'Romantic Memory Fade Transition',
  description:
    'A romantic wedding album-style transition preset that creates a nostalgic memory fade effect. Features Ken Burns slow zoom and pan on each scene, polaroid-style floating exit animations with gentle upward drift and rotation, and incoming scenes drifting in from below with opposite rotation. Includes paper texture overlay, sepia tinting during transitions, and magical floating dust mote particles for atmospheric effect. Perfect for wedding videos, anniversary montages, and romantic photo slideshows.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'romantic',
    'wedding',
    'album',
    'memory',
    'fade',
    'ken-burns',
    'sepia',
    'vintage',
    'particles',
    'nostalgic',
  ],
  defaultInputParams: {
    scenes: [
      {
        src: 'https://images.unsplash.com/photo-1519741497674-611481863552',
        type: 'image',
        duration: 5,
      },
      {
        src: 'https://images.unsplash.com/photo-1606800052052-a08af7148866',
        type: 'image',
        duration: 5,
      },
      {
        src: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a',
        type: 'image',
        duration: 5,
      },
    ],
    transitionDuration: 1.5,
    transitionDelay: 0.5,
    kenBurnsIntensity: 1.0,
    particleCount: 8,
    sepiaIntensity: 0.2,
    paperTextureOpacity: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ==================== EXPORT ====================

export const romanticMemoryFadeTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
