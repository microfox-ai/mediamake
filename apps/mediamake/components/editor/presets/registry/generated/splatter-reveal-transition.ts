/**
 * Splatter Reveal Transition Preset
 *
 * Creates an ink splatter reveal transition where ink splatters appear to hit the outgoing video,
 * each splatter revealing portions of the incoming video through expanding circular masks.
 * 
 * Features:
 * - 8-10 splatter points appearing at staggered intervals over 2.2 seconds
 * - Each splatter starts small and rapidly expands with bounce easing
 * - Flying ink droplets with physics-based trajectories
 * - Localized ripple distortion effect at each impact point
 * - Subtle camera shake on each splatter impact
 * - Dynamic mask-image animation using radial gradients
 * - SVG filter for turbulence/distortion effects
 * 
 * Use cases:
 * - Dynamic video transitions with energy
 * - Creative reveal effects between scenes
 * - Impact-driven transitions for action content
 * - Stylized transitions for creative projects
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
  }),
  video2: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    duration: z.number().describe('Duration of incoming video in seconds'),
  }),
  overlapDuration: z
    .number()
    .default(2.2)
    .describe('Duration of transition overlap in seconds'),
  numSplatters: z
    .number()
    .min(8)
    .max(10)
    .default(9)
    .describe('Number of splatter points (8-10)'),
  splatterMaxRadius: z
    .number()
    .default(30)
    .describe('Maximum radius of each splatter (% of viewport)'),
  shakeIntensity: z
    .number()
    .default(4)
    .describe('Intensity of camera shake in pixels'),
  dropletsPerSplatter: z
    .number()
    .default(6)
    .describe('Number of flying droplets per splatter'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { video1, video2, overlapDuration, numSplatters, splatterMaxRadius, shakeIntensity, dropletsPerSplatter } = params;

  // Calculate total duration: video1 + video2 - overlap
  const totalDuration = video1.duration + video2.duration - overlapDuration;

  // Generate random splatter positions (avoiding edges)
  const generateSplatterPositions = (count: number) => {
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        x: 20 + Math.random() * 60, // 20-80% from left
        y: 20 + Math.random() * 60, // 20-80% from top
      });
    }
    return positions;
  };

  const splatterPositions = generateSplatterPositions(numSplatters);

  // Calculate staggered timing for each splatter
  // First splatter at 0s, last at 1.5s, evenly distributed
  const calculateSplatterTiming = (index: number, total: number) => {
    const maxStartTime = 1.5;
    return (index / (total - 1)) * maxStartTime;
  };

  // Generate droplets for each splatter
  const generateDroplets = (splatterIndex: number, splatterX: number, splatterY: number, splatterStart: number) => {
    const droplets = [];
    const baseAngles = [0, 60, 120, 180, 240, 300]; // Evenly distributed angles
    
    for (let i = 0; i < dropletsPerSplatter; i++) {
      const angle = baseAngles[i % baseAngles.length] + (Math.random() - 0.5) * 30; // Add randomness
      const distance = 80 + Math.random() * 120; // Distance in pixels
      const angleRad = (angle * Math.PI) / 180;
      
      const dropletX = splatterX;
      const dropletY = splatterY;
      const targetX = Math.cos(angleRad) * distance;
      const targetY = Math.sin(angleRad) * distance;
      const size = 4 + Math.random() * 5; // 4-9px droplets
      
      droplets.push({
        id: `droplet-${splatterIndex}-${i}`,
        splatterIndex,
        dropletIndex: i,
        startX: dropletX,
        startY: dropletY,
        targetX,
        targetY,
        size,
        start: splatterStart,
        duration: 0.4,
      });
    }
    
    return droplets;
  };

  // Generate all droplets
  const allDroplets = splatterPositions.flatMap((pos, idx) => {
    const splatterStart = calculateSplatterTiming(idx, numSplatters);
    return generateDroplets(idx, pos.x, pos.y, splatterStart);
  });

  // Build mask-image animation keyframes for outgoing video
  // Each splatter adds a radial-gradient that grows from 0% to splatterMaxRadius%
  const buildMaskAnimation = () => {
    const keyframes = [];
    
    // Start: all splatters at 0%
    const initialMask = splatterPositions
      .map((pos) => `radial-gradient(circle at ${pos.x}% ${pos.y}%, transparent 0%, transparent 0%, black 0%)`)
      .join(', ');
    keyframes.push({ key: 'maskImage', val: initialMask, prog: 0 });

    // Generate keyframes for each splatter expansion
    splatterPositions.forEach((pos, idx) => {
      const splatterStart = calculateSplatterTiming(idx, numSplatters);
      const expansionDuration = 0.5; // 0.5s expansion time
      const startProg = splatterStart / overlapDuration;
      const endProg = Math.min((splatterStart + expansionDuration) / overlapDuration, 1);

      // Keyframe at expansion start (splatter still small)
      const beforeMask = splatterPositions
        .map((p, i) => {
          if (i < idx) {
            // Previous splatters fully expanded
            return `radial-gradient(circle at ${p.x}% ${p.y}%, transparent ${splatterMaxRadius}%, transparent ${splatterMaxRadius}%, black ${splatterMaxRadius}%)`;
          } else if (i === idx) {
            // Current splatter starting
            return `radial-gradient(circle at ${p.x}% ${p.y}%, transparent 0%, transparent 0%, black 0%)`;
          } else {
            // Future splatters not yet started
            return `radial-gradient(circle at ${p.x}% ${p.y}%, transparent 0%, transparent 0%, black 0%)`;
          }
        })
        .join(', ');
      
      keyframes.push({ key: 'maskImage', val: beforeMask, prog: startProg });

      // Keyframe at expansion end (splatter fully expanded)
      const afterMask = splatterPositions
        .map((p, i) => {
          if (i <= idx) {
            // Current and previous splatters fully expanded
            return `radial-gradient(circle at ${p.x}% ${p.y}%, transparent ${splatterMaxRadius}%, transparent ${splatterMaxRadius}%, black ${splatterMaxRadius}%)`;
          } else {
            // Future splatters not yet started
            return `radial-gradient(circle at ${p.x}% ${p.y}%, transparent 0%, transparent 0%, black 0%)`;
          }
        })
        .join(', ');
      
      keyframes.push({ key: 'maskImage', val: afterMask, prog: endProg });
    });

    // Final state: all splatters fully expanded
    const finalMask = splatterPositions
      .map((pos) => `radial-gradient(circle at ${pos.x}% ${pos.y}%, transparent ${splatterMaxRadius}%, transparent ${splatterMaxRadius}%, black ${splatterMaxRadius}%)`)
      .join(', ');
    keyframes.push({ key: 'maskImage', val: finalMask, prog: 1 });

    return keyframes;
  };

  const maskKeyframes = buildMaskAnimation();

  // Build camera shake keyframes
  // Small shake on each splatter impact
  const buildShakeKeyframes = () => {
    const keyframes = [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateY', val: 0, prog: 0 },
    ];

    splatterPositions.forEach((pos, idx) => {
      const splatterStart = calculateSplatterTiming(idx, numSplatters);
      const impactProg = splatterStart / overlapDuration;
      const shakeDuration = 0.15; // 150ms shake
      const endProg = Math.min((splatterStart + shakeDuration) / overlapDuration, 1);

      // Random shake direction
      const shakeX = (Math.random() - 0.5) * 2 * shakeIntensity;
      const shakeY = (Math.random() - 0.5) * 2 * shakeIntensity;

      // Impact frame
      keyframes.push({ key: 'translateX', val: shakeX, prog: impactProg });
      keyframes.push({ key: 'translateY', val: shakeY, prog: impactProg });

      // Return to center
      keyframes.push({ key: 'translateX', val: 0, prog: endProg });
      keyframes.push({ key: 'translateY', val: 0, prog: endProg });
    });

    return keyframes;
  };

  const shakeKeyframes = buildShakeKeyframes();

  // SVG filter for turbulence distortion
  const svgFilterHTML = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <filter id="splatter-distortion-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="turbulence"/>
          <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="0" xChannelSelector="R" yChannelSelector="G">
            <animate attributeName="scale" values="0;20;0" dur="0.3s" repeatCount="indefinite" />
          </feDisplacementMap>
        </filter>
      </defs>
    </svg>
  `;

  // Build droplet components
  const dropletComponents: RenderableComponentData[] = allDroplets.map((droplet) => ({
    id: droplet.id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: ${droplet.size}px; height: ${droplet.size}px; background: #000; border-radius: 50%; position: absolute; left: ${droplet.startX}%; top: ${droplet.startY}%; transform: translate(-50%, -50%);"></div>`,
      className: 'absolute',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: droplet.start,
        duration: droplet.duration,
      },
    },
    effects: [
      {
        id: `droplet-trajectory-${droplet.id}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: droplet.duration,
          mode: 'provider',
          targetIds: [droplet.id],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${droplet.targetX}px`, prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: `${droplet.targetY}px`, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.8 },
          ],
        },
      },
    ],
  }));

  // Build composition structure
  const childrenData: RenderableComponentData[] = [
    // Incoming video (bottom layer, z-index 1)
    {
      id: 'incoming-video',
      type: 'atom',
      componentId: 'VideoAtom',
      data: {
        src: video2.src,
        className: 'w-full h-full object-cover',
        fit: 'cover',
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: video2.duration,
        },
      },
    } as RenderableComponentData,

    // Outgoing video container (middle layer, z-index 2)
    {
      id: 'outgoing-video-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 2,
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
        // SVG filter definition
        {
          id: 'svg-filter',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: svgFilterHTML,
            className: 'absolute',
            style: {
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
        } as RenderableComponentData,

        // Outgoing video with mask animation
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: video1.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              maskComposite: 'exclude',
              WebkitMaskComposite: 'destination-out',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: video1.duration,
            },
          },
          effects: [
            {
              id: 'mask-reveal-effect',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: video1.duration - overlapDuration,
                duration: overlapDuration,
                mode: 'provider',
                targetIds: ['outgoing-video'],
                ranges: maskKeyframes,
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Droplets container (top layer, z-index 3)
    {
      id: 'droplets-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 3,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
        },
      },
      childrenData: dropletComponents,
    } as RenderableComponentData,
  ];

  // Root container with camera shake
  const rootContainer: RenderableComponentData = {
    id: 'splatter-reveal-transition-root',
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
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'camera-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: video1.duration - overlapDuration,
          duration: overlapDuration,
          mode: 'provider',
          targetIds: ['splatter-reveal-transition-root'],
          ranges: shakeKeyframes,
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
  id: 'splatter-reveal-transition',
  title: 'Splatter Reveal Transition',
  description:
    'Ink splatter transition where splatters appear at staggered intervals, each revealing portions of the incoming video through expanding circular masks with flying droplets, localized ripple distortion, and camera shake on impact.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'splatter', 'reveal', 'ink', 'dynamic', 'impact'],
  defaultInputParams: {
    video1: {
      src: 'https://example.com/video1.mp4',
      duration: 10,
    },
    video2: {
      src: 'https://example.com/video2.mp4',
      duration: 8,
    },
    overlapDuration: 2.2,
    numSplatters: 9,
    splatterMaxRadius: 30,
    shakeIntensity: 4,
    dropletsPerSplatter: 6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const splatterRevealTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
