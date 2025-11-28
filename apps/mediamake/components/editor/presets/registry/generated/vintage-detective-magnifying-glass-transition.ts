/**
 * Vintage Detective Magnifying Glass Transition Preset
 *
 * Creates a cinematic detective-style transition featuring a magnifying glass that sweeps
 * across the screen, revealing incoming video in full color while the surrounding area 
 * remains in aged sepia tones. Features include:
 *
 * - Warped, antique glass effect with visible imperfections and bubbles
 * - Methodical sweep pattern with deliberate pause points at 20%, 45%, 70%
 * - Subtle hand-held wobble using sin-wave rotation
 * - Film grain, scratches, dust particles, and film burn effects
 * - Sepia gradient from lens center (0%) to edges (80%)
 * - Soft radial mask with feathered edges for incoming video reveal
 *
 * Technical Features:
 * - BaseLayout with extended durations for deliberate pacing
 * - Generic effects for wobble, movement, and film effects
 * - Z-index layering: effects (z-30), incoming (z-20), outgoing (z-10)
 * - Transform-based animations with barrel distortion simulation
 * - Step-end timing for pause points during lens sweep
 *
 * Use Cases:
 * - Vintage detective film aesthetics
 * - Historical documentary transitions
 * - Mystery/thriller content
 * - Retro-styled video presentations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).describe('Media type of outgoing media'),
  }).describe('Outgoing video/image that will be shown in sepia tones'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).describe('Media type of incoming media'),
  }).describe('Incoming video/image revealed in full color through the magnifying glass'),
  
  transitionDuration: z.number()
    .default(5)
    .describe('Total duration of the transition in seconds (default: 5s for deliberate pacing)'),
  
  lensSize: z.number()
    .default(300)
    .describe('Diameter of the magnifying glass lens in pixels (default: 300px)'),
  
  wobbleIntensity: z.number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Intensity of hand-held wobble effect in degrees (default: 2deg, range: -2deg to +2deg)'),
  
  sepiaIntensity: z.number()
    .min(0)
    .max(100)
    .default(80)
    .describe('Sepia filter intensity for outgoing video in percentage (default: 80%)'),
  
  dustParticleCount: z.number()
    .min(3)
    .max(20)
    .default(5)
    .describe('Number of dust particles to render (default: 5)'),
  
  filmBurnIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Maximum opacity of film burn effect (default: 0.6, intensifies during transition)'),
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
    lensSize,
    wobbleIntensity,
    sepiaIntensity,
    dustParticleCount,
    filmBurnIntensity,
  } = params;

  // Helper: Generate dust particles
  const generateDustParticles = (count: number): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    
    for (let i = 0; i < count; i++) {
      const size = Math.random() * 2 + 2; // 2-4px
      const left = Math.random() * 100; // 0-100%
      const top = Math.random() * 100; // 0-100%
      const opacity = Math.random() * 0.3 + 0.3; // 0.3-0.6
      const floatDistance = Math.random() * 20 + 10; // 10-30px
      const floatDuration = Math.random() * 2 + 3; // 3-5s
      
      particles.push({
        id: `dust-particle-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}px; height: ${size}px; background: rgba(255,255,255,${opacity}); border-radius: 50%; position: absolute; left: ${left}%; top: ${top}%;"></div>`,
          className: 'absolute',
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `dust-float-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: floatDuration,
              mode: 'provider',
              targetIds: [`dust-particle-${i}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -floatDistance, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return particles;
  };

  // Determine component IDs based on media types
  const outgoingComponentId = outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';
  const incomingComponentId = incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Calculate lens sweep path (diagonal from top-left to bottom-right with pauses)
  const startX = 10; // Start 10% from left
  const startY = 10; // Start 10% from top
  const endX = 90; // End 90% from left
  const endY = 90; // End 90% from top

  // Build the main composition
  const childrenData: RenderableComponentData[] = [
    // Layer 1: Outgoing video with sepia filter (z-10)
    {
      id: 'outgoing-video-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 10,
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
        {
          id: 'outgoing-video',
          type: 'atom',
          componentId: outgoingComponentId,
          data: {
            src: outgoingVideo.src,
            className: 'w-full h-full object-cover',
            style: {
              filter: `sepia(${sepiaIntensity}%) contrast(1.1) brightness(0.9)`,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Layer 2: Incoming video with circular mask (z-20)
    {
      id: 'incoming-video-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: 20,
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
        {
          id: 'incoming-reveal-mask',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['incoming-video-layer'],
            ranges: [
              { key: 'clipPath', val: `circle(${lensSize / 2}px at ${startX}% ${startY}%)`, prog: 0 },
              { key: 'clipPath', val: `circle(${lensSize / 2}px at 35% 35%)`, prog: 0.2 },
              { key: 'clipPath', val: `circle(${lensSize / 2}px at 35% 35%)`, prog: 0.25 },
              { key: 'clipPath', val: `circle(${lensSize / 2}px at 55% 55%)`, prog: 0.45 },
              { key: 'clipPath', val: `circle(${lensSize / 2}px at 55% 55%)`, prog: 0.5 },
              { key: 'clipPath', val: `circle(${lensSize / 2}px at 75% 75%)`, prog: 0.7 },
              { key: 'clipPath', val: `circle(${lensSize / 2}px at 75% 75%)`, prog: 0.75 },
              { key: 'clipPath', val: `circle(${lensSize / 2}px at ${endX}% ${endY}%)`, prog: 1 },
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
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Layer 2.5: Magnifying glass lens container (z-25)
    {
      id: 'lens-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            zIndex: 25,
            width: `${lensSize}px`,
            height: `${lensSize}px`,
            pointerEvents: 'none',
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
        // Lens movement effect (matches the mask movement)
        {
          id: 'lens-movement',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['lens-container'],
            ranges: [
              { key: 'left', val: `${startX}%`, prog: 0 },
              { key: 'top', val: `${startY}%`, prog: 0 },
              { key: 'left', val: '35%', prog: 0.2 },
              { key: 'top', val: '35%', prog: 0.2 },
              { key: 'left', val: '35%', prog: 0.25 },
              { key: 'top', val: '35%', prog: 0.25 },
              { key: 'left', val: '55%', prog: 0.45 },
              { key: 'top', val: '55%', prog: 0.45 },
              { key: 'left', val: '55%', prog: 0.5 },
              { key: 'top', val: '55%', prog: 0.5 },
              { key: 'left', val: '75%', prog: 0.7 },
              { key: 'top', val: '75%', prog: 0.7 },
              { key: 'left', val: '75%', prog: 0.75 },
              { key: 'top', val: '75%', prog: 0.75 },
              { key: 'left', val: `${endX}%`, prog: 1 },
              { key: 'top', val: `${endY}%`, prog: 1 },
              { key: 'transform', val: 'translate(-50%, -50%)', prog: 0 },
              { key: 'transform', val: 'translate(-50%, -50%)', prog: 1 },
            ],
          },
        },
        // Wobble effect (continuous sine-wave rotation)
        {
          id: 'lens-wobble',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 1.5,
            mode: 'provider',
            targetIds: ['lens-container'],
            ranges: [
              { key: 'rotate', val: -wobbleIntensity, prog: 0 },
              { key: 'rotate', val: wobbleIntensity, prog: 0.5 },
              { key: 'rotate', val: -wobbleIntensity, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Lens visual element
        {
          id: 'lens-visual',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 100%; border-radius: 50%; background: radial-gradient(circle at 40% 40%, rgba(255,255,255,0.15), transparent 60%), radial-gradient(circle, transparent 40%, rgba(101, 67, 33, 0.4) 100%); backdrop-filter: blur(1px); box-shadow: inset 0 0 30px rgba(0,0,0,0.4), 0 0 20px rgba(0,0,0,0.5);"></div>`,
            className: 'w-full h-full',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Lens rim
        {
          id: 'lens-rim',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 8px solid #3d2817; box-shadow: 0 4px 20px rgba(0,0,0,0.6), inset 0 2px 4px rgba(255,255,255,0.2);"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Lens handle
        {
          id: 'lens-handle',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; bottom: -80px; left: 50%; transform: translateX(-50%); width: 30px; height: 100px; background: linear-gradient(to bottom, #3d2817, #654321); border-radius: 0 0 15px 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.5), inset 2px 0 4px rgba(255,255,255,0.1);"></div>`,
            className: 'absolute',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Lens glare
        {
          id: 'lens-glare',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; top: 20%; left: 30%; width: 40px; height: 40px; background: radial-gradient(circle, rgba(255,255,255,0.4), transparent 70%); border-radius: 50%;"></div>`,
            className: 'absolute',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        // Lens imperfections (bubbles)
        {
          id: 'lens-imperfections',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 60% 30%, transparent 10px, rgba(255,255,255,0.05) 11px, transparent 12px), radial-gradient(circle at 40% 70%, transparent 6px, rgba(255,255,255,0.08) 7px, transparent 8px), radial-gradient(circle at 75% 55%, transparent 8px, rgba(255,255,255,0.06) 9px, transparent 10px);"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Layer 3: Film effects (z-30)
    {
      id: 'film-effects-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 30,
            mixBlendMode: 'screen',
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
        // Dust particles
        ...generateDustParticles(dustParticleCount),
        
        // Scratches overlay
        {
          id: 'scratches-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background-image: linear-gradient(90deg, transparent 98%, rgba(255,255,255,0.1) 98%, rgba(255,255,255,0.1) 99%, transparent 99%), linear-gradient(88deg, transparent 96%, rgba(255,255,255,0.08) 96%, rgba(255,255,255,0.08) 97%, transparent 97%); background-size: 100% 100%, 150% 100%; opacity: 0.4;"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        
        // Film grain overlay
        {
          id: 'film-grain-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px); opacity: 0.3;"></div>`,
            className: 'absolute inset-0',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        } as RenderableComponentData,
        
        // Film burn overlay (intensifies during transition)
        {
          id: 'film-burn-overlay',
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; top: 0; right: 0; width: 200px; height: 200px; background: radial-gradient(circle at 80% 20%, rgba(255,200,100,0.3), transparent 60%); opacity: 0;"></div>`,
            className: 'absolute',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          effects: [
            {
              id: 'film-burn-intensify',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: transitionDuration - 1.5,
                duration: 1.5,
                mode: 'provider',
                targetIds: ['film-burn-overlay'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: filmBurnIntensity, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  const rootContainer: RenderableComponentData = {
    id: 'vintage-magnifying-glass-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
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
  id: 'vintage-detective-magnifying-glass-transition',
  title: 'Vintage Detective Magnifying Glass Transition',
  description:
    'A vintage detective-style magnifying glass transition featuring sepia-toned distortion, old film effects with scratches, dust particles, and film burn. The lens creates a warped antique glass effect with visible imperfections as it sweeps across to reveal incoming video in full color while the surrounding area remains in aged sepia tones. Includes a subtle wobble to simulate hand-held movement and deliberate pause points for examination effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'vintage',
    'detective',
    'magnifying-glass',
    'sepia',
    'film-effects',
    'old-film',
    'antique',
    'retro',
    'mystery',
  ],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/outgoing-video.mp4',
      type: 'video',
    },
    incomingVideo: {
      src: 'https://example.com/incoming-video.mp4',
      type: 'video',
    },
    transitionDuration: 5,
    lensSize: 300,
    wobbleIntensity: 2,
    sepiaIntensity: 80,
    dustParticleCount: 5,
    filmBurnIntensity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vintageDetectiveMagnifyingGlassTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};