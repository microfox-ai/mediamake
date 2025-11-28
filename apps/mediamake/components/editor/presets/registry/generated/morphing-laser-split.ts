/**
 * Morphing Laser Split-Screen Preset
 *
 * A dramatic sci-fi inspired split-screen transition where an animated laser line
 * cuts through the frame from top to bottom. The dividing line itself becomes the
 * star of the show - animated with energy effects (glowing, pulsing, particle fragments).
 * 
 * Features:
 * - Central laser line animates from 0% to 100% height
 * - Glow and pulse effects on the laser with cyan energy
 * - Panel reveal through expanding clip-path masks following the line's progress
 * - Screen distortion near the cut line (blur + brightness strips)
 * - Particle effects breaking off from the laser
 * - Different content treatments: left panel normal, right panel desaturated/inverted
 * - Creates a story-driven, sci-fi aesthetic perfect for dramatic reveals
 *
 * Use Cases:
 * - Product comparison videos (before/after, old/new)
 * - Dramatic content reveals
 * - Sci-fi themed transitions
 * - Tech product showcases
 * - Gaming highlight reels
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  leftPanelMedia: z
    .string()
    .describe('Media source URL for the left panel (video or image)'),
  rightPanelMedia: z
    .string()
    .describe('Media source URL for the right panel (video or image)'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the split-screen effect in seconds'),
  laserAnimationDuration: z
    .number()
    .default(2)
    .describe('Duration for the laser line to animate from top to bottom'),
  laserColor: z
    .string()
    .default('rgba(0,255,255,1)')
    .describe('Color of the laser line (cyan by default)'),
  laserGlowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the laser glow effect (0-1)'),
  distortionIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of distortion effects near the cut line (0-1)'),
  particleCount: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('Number of particle fragments breaking off from the laser'),
  rightPanelEffect: z
    .enum(['desaturated', 'inverted', 'normal'])
    .default('desaturated')
    .describe('Visual effect applied to the right panel content'),
  trackName: z
    .string()
    .default('laser-split')
    .describe('Unique identifier for this track'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftPanelMedia,
    rightPanelMedia,
    duration,
    laserAnimationDuration,
    laserColor,
    laserGlowIntensity,
    distortionIntensity,
    particleCount,
    rightPanelEffect,
    trackName,
  } = params;

  // Helper: Determine media component type
  const getMediaComponentId = (src: string): 'VideoAtom' | 'ImageAtom' => {
    if (src.match(/\.(mp4|webm|mov|avi|mkv)$/i)) return 'VideoAtom';
    return 'ImageAtom';
  };

  // Helper: Get right panel filter style
  const getRightPanelFilter = (): string => {
    switch (rightPanelEffect) {
      case 'desaturated':
        return 'saturate(0.3) brightness(0.9)';
      case 'inverted':
        return 'invert(0.2) saturate(0.5)';
      default:
        return '';
    }
  };

  // Helper: Generate particle positions and animations
  const generateParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const particleId = `${trackName}-particle-${i}`;
      const startY = 20 + (i * (60 / particleCount)); // Distribute along the line
      const offsetX = (Math.random() - 0.5) * 30; // Random horizontal offset
      const animationDelay = (startY / 100) * laserAnimationDuration; // Sync with laser
      
      particles.push({
        id: particleId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              left: '50%',
              top: `${startY}%`,
              width: '4px',
              height: '4px',
              backgroundColor: laserColor,
              borderRadius: '50%',
              boxShadow: `0 0 10px ${laserColor}, 0 0 20px ${laserColor}`,
              zIndex: 101,
              transform: 'translateX(-50%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${particleId}-fade-move`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: animationDelay,
              duration: 0.8,
              mode: 'provider',
              targetIds: [particleId],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'translateX', val: '0px', prog: 0 },
                { key: 'translateX', val: `${offsetX}px`, prog: 1 },
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: '20px', prog: 1 },
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 0.3, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return particles;
  };

  // IDs
  const leftPanelId = `${trackName}-left-panel`;
  const rightPanelId = `${trackName}-right-panel`;
  const laserLineId = `${trackName}-laser-line`;
  const distortion1Id = `${trackName}-distortion-1`;
  const distortion2Id = `${trackName}-distortion-2`;
  const distortion3Id = `${trackName}-distortion-3`;

  // Build children data
  const childrenData: RenderableComponentData[] = [
    // Left panel (normal)
    {
      id: leftPanelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: 'inset(0 50% 0 0)', // Initially shows left half
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: `${leftPanelId}-media`,
          type: 'atom',
          componentId: getMediaComponentId(leftPanelMedia),
          data: {
            src: leftPanelMedia,
            className: 'w-full h-full object-cover',
            fit: 'cover',
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `${leftPanelId}-reveal`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: laserAnimationDuration,
            mode: 'provider',
            targetIds: [leftPanelId],
            ranges: [
              { key: 'clipPath', val: 'inset(0 50% 0 0)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Right panel (with effects)
    {
      id: rightPanelId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: 'inset(0 0 0 50%)', // Initially shows right half
            zIndex: 1,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: `${rightPanelId}-media`,
          type: 'atom',
          componentId: getMediaComponentId(rightPanelMedia),
          data: {
            src: rightPanelMedia,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: rightPanelEffect !== 'normal' ? {
              filter: getRightPanelFilter(),
            } : {},
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        {
          id: `${rightPanelId}-reveal`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: laserAnimationDuration,
            mode: 'provider',
            targetIds: [rightPanelId],
            ranges: [
              { key: 'clipPath', val: 'inset(0 0 0 100%)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 0 0 50%)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Laser line (central animated element)
    {
      id: laserLineId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-1/2 -translate-x-1/2',
          style: {
            top: 0,
            width: '4px',
            height: '0%',
            background: `linear-gradient(180deg, ${laserColor} 0%, rgba(0,200,255,0.8) 50%, ${laserColor} 100%)`,
            boxShadow: `0 0 20px ${laserColor}, 0 0 40px rgba(0,255,255,${laserGlowIntensity * 0.5}), 0 0 60px rgba(0,255,255,${laserGlowIntensity * 0.3})`,
            zIndex: 100,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${laserLineId}-grow`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: laserAnimationDuration,
            mode: 'provider',
            targetIds: [laserLineId],
            ranges: [
              { key: 'height', val: '0%', prog: 0 },
              { key: 'height', val: '100%', prog: 1 },
            ],
          },
        },
        {
          id: `${laserLineId}-pulse`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: [laserLineId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 0.25 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0.7, prog: 0.75 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Distortion strips (3 layers for depth)
    {
      id: distortion1Id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-1/2 -translate-x-1/2',
          style: {
            top: 0,
            width: '12px',
            height: '100%',
            filter: `blur(${2 * distortionIntensity}px) brightness(${1 + 0.2 * distortionIntensity})`,
            opacity: 0.6 * distortionIntensity,
            marginLeft: '-8px',
            zIndex: 99,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,

    {
      id: distortion2Id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-1/2 -translate-x-1/2',
          style: {
            top: 0,
            width: '20px',
            height: '100%',
            filter: `blur(${4 * distortionIntensity}px) brightness(${1 + 0.15 * distortionIntensity})`,
            opacity: 0.4 * distortionIntensity,
            marginLeft: '-14px',
            zIndex: 98,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,

    {
      id: distortion3Id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute left-1/2 -translate-x-1/2',
          style: {
            top: 0,
            width: '28px',
            height: '100%',
            filter: `blur(${6 * distortionIntensity}px) brightness(${1 + 0.1 * distortionIntensity})`,
            opacity: 0.2 * distortionIntensity,
            marginLeft: '-20px',
            zIndex: 97,
            pointerEvents: 'none',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,

    // Particle effects
    ...generateParticles(),
  ];

  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root-container`,
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
        duration: duration,
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

const presetMetadata: PresetMetadata = {
  id: 'morphing-laser-split',
  title: 'Morphing Laser Split-Screen',
  description:
    'A dramatic sci-fi split-screen preset where an animated laser line cuts through the frame from top to bottom, revealing panels through expanding masks. Features energy effects (glow, pulse, particles), screen distortion near the cut line, and contrasting content treatments on each side (normal vs. desaturated/inverted). Creates a story-driven transition with dynamic visual effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'laser',
    'sci-fi',
    'transition',
    'dramatic',
    'energy-effects',
    'particles',
    'distortion',
    'glow',
    'comparison',
    'reveal',
  ],
  defaultInputParams: {
    leftPanelMedia: 'https://example.com/left-video.mp4',
    rightPanelMedia: 'https://example.com/right-video.mp4',
    duration: 5,
    laserAnimationDuration: 2,
    laserColor: 'rgba(0,255,255,1)',
    laserGlowIntensity: 0.8,
    distortionIntensity: 0.6,
    particleCount: 5,
    rightPanelEffect: 'desaturated',
    trackName: 'laser-split',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const morphingLaserSplitPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
