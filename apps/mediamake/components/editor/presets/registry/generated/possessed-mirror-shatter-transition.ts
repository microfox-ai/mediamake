/**
 * Possessed Mirror Shatter Transition
 * 
 * A horror-themed transition where the screen acts as a cursed mirror that cracks organically
 * from a central impact point, fragmenting into 15-20 polygon shards. Each shard reveals
 * disturbing alternate reality variations through inverted colors, hue shifts, and time distortions.
 * 
 * Features:
 * - Organic spider-web crack spreading from central impact point
 * - 15-20 dynamically generated polygon fragments with unique clip-paths
 * - Per-fragment visual distortions (invert, hue-rotate, brightness, sepia variations)
 * - Staggered fragment timing based on distance from impact point
 * - Subtle breathing/pulsing animation on intact mirror portions
 * - Entity glimpses moving behind fragments before they fall
 * - Prismatic reflections with gradient overlays and screen blend modes
 * - 3D rotation and depth transforms as fragments fall away
 * - Four distinct phases: slow crack (0-30%), rapid fragmentation (30-60%),
 *   violent shattering (60-80%), eerie reformation/dissolution (80-100%)
 * 
 * Use Cases:
 * - Horror film transitions
 * - Supernatural/paranormal content
 * - Music videos with dark themes
 * - Trailer sequences
 * - Psychological thriller effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media: z.object({
    src: z.string().describe('Source URL of the media to shatter (video or image)'),
    type: z.enum(['video', 'image']).describe('Media type'),
    duration: z.number().describe('Duration of the media in seconds'),
  }).describe('Media to be shattered'),
  
  totalDuration: z.number().default(5).describe('Total duration of the transition effect in seconds'),
  
  fragmentCount: z.number().min(15).max(20).default(18).describe('Number of polygon fragments to generate (15-20)'),
  
  impactPoint: z.object({
    x: z.number().min(0).max(1).default(0.5).describe('X coordinate of impact point (0-1, normalized)'),
    y: z.number().min(0).max(1).default(0.5).describe('Y coordinate of impact point (0-1, normalized)'),
  }).describe('Central impact point where cracks originate'),
  
  dissolveMode: z.enum(['dissolve', 'reform']).default('dissolve').describe('Final phase behavior: dissolve to black or reform the mirror'),
  
  breathingIntensity: z.number().min(0).max(0.05).default(0.02).describe('Intensity of breathing/pulsing animation on intact mirror (0-0.05)'),
  
  entityGlimpseIntensity: z.number().min(0).max(1).default(0.6).describe('Opacity intensity of entity glimpses behind fragments (0-1)'),
  
  prismaticIntensity: z.number().min(0).max(1).default(0.3).describe('Intensity of prismatic light reflections (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    media,
    totalDuration,
    fragmentCount,
    impactPoint,
    dissolveMode,
    breathingIntensity,
    entityGlimpseIntensity,
    prismaticIntensity,
  } = params;

  const config = props.config || { width: 1920, height: 1080, fps: 30 };
  const width = config.width || 1920;
  const height = config.height || 1080;

  // Phase timing calculations (relative to totalDuration)
  const crackPhaseEnd = totalDuration * 0.3;
  const fragmentPhaseEnd = totalDuration * 0.6;
  const shatterPhaseEnd = totalDuration * 0.8;

  // Helper function: Generate random polygon fragments
  const generateFragments = (count: number) => {
    const fragments: Array<{
      id: string;
      clipPath: string;
      distanceFromImpact: number;
      effectVariation: string;
    }> = [];

    const impactX = impactPoint.x * width;
    const impactY = impactPoint.y * height;

    for (let i = 0; i < count; i++) {
      // Generate polygon points (irregular shapes with 5-8 sides)
      const sides = 5 + Math.floor(Math.random() * 4);
      const points: string[] = [];
      
      // Base angle and radius variations for organic shapes
      const baseAngle = (Math.PI * 2 * i) / count;
      const angleVariation = (Math.PI * 2) / count;
      
      for (let j = 0; j < sides; j++) {
        const angle = baseAngle + (angleVariation * j) / sides + (Math.random() - 0.5) * 0.3;
        const radiusVariation = 0.7 + Math.random() * 0.6;
        const x = impactX + Math.cos(angle) * (width * 0.4 * radiusVariation);
        const y = impactY + Math.sin(angle) * (height * 0.4 * radiusVariation);
        
        const clampedX = Math.max(0, Math.min(width, x));
        const clampedY = Math.max(0, Math.min(height, y));
        
        const percentX = (clampedX / width) * 100;
        const percentY = (clampedY / height) * 100;
        
        points.push(`${percentX}% ${percentY}%`);
      }

      const clipPath = `polygon(${points.join(', ')})`;
      
      // Calculate distance from impact (for stagger timing)
      const centerX = points.reduce((sum, p) => {
        const x = parseFloat(p.split('%')[0]);
        return sum + x;
      }, 0) / points.length;
      
      const centerY = points.reduce((sum, p) => {
        const parts = p.split(' ');
        const y = parseFloat(parts[1].replace('%', ''));
        return sum + y;
      }, 0) / points.length;
      
      const dx = (centerX - impactPoint.x * 100) / 100;
      const dy = (centerY - impactPoint.y * 100) / 100;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Effect variations
      const effectVariations = [
        'invert(1)',
        'hue-rotate(180deg)',
        'brightness(0.5)',
        'brightness(1.8) saturate(2)',
        'sepia(1) hue-rotate(45deg)',
        'contrast(2) brightness(0.7)',
        'saturate(0) brightness(1.2)',
        'hue-rotate(90deg) contrast(1.5)',
      ];
      
      const effectVariation = effectVariations[i % effectVariations.length];

      fragments.push({
        id: `fragment-${i}`,
        clipPath,
        distanceFromImpact: distance,
        effectVariation,
      });
    }

    return fragments;
  };

  const fragments = generateFragments(fragmentCount);
  const maxDistance = Math.max(...fragments.map(f => f.distanceFromImpact));

  // Helper: Calculate staggered timing for each fragment
  const calculateFragmentTiming = (fragment: typeof fragments[0]) => {
    const normalizedDistance = fragment.distanceFromImpact / maxDistance;
    
    // Fragments closer to impact shatter first
    const staggerRange = shatterPhaseEnd - fragmentPhaseEnd;
    const startDelay = fragmentPhaseEnd + (normalizedDistance * staggerRange);
    
    return {
      startDelay,
      fallDuration: 1.5, // Duration of fall animation
    };
  };

  // Determine media component
  const mediaComponentId = media.type === 'video' ? 'VideoAtom' : 'ImageAtom';

  // Build fragment components
  const fragmentComponents: RenderableComponentData[] = fragments.map((fragment) => {
    const timing = calculateFragmentTiming(fragment);
    
    return {
      id: fragment.id,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            clipPath: fragment.clipPath,
            zIndex: Math.floor(fragment.distanceFromImpact * 10),
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
        {
          id: `${fragment.id}-media`,
          type: 'atom',
          componentId: mediaComponentId,
          data: {
            src: media.src,
            className: 'w-full h-full object-cover',
            fit: 'cover',
            style: {
              filter: fragment.effectVariation,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: media.duration,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Pre-shatter float animation
        {
          id: `${fragment.id}-float`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: crackPhaseEnd,
            mode: 'provider',
            targetIds: [fragment.id],
            ranges: [
              { key: 'translateY', val: -2, prog: 0 },
              { key: 'translateY', val: 2, prog: 0.5 },
              { key: 'translateY', val: -2, prog: 1 },
            ],
          },
        },
        // Shatter animation (3D rotation + fall)
        {
          id: `${fragment.id}-shatter`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: timing.startDelay,
            duration: timing.fallDuration,
            mode: 'provider',
            targetIds: [fragment.id],
            ranges: [
              { key: 'rotate3d', val: '0, 0, 0, 0deg', prog: 0 },
              { key: 'rotate3d', val: `1, ${Math.random()}, ${Math.random()}, 720deg`, prog: 1 },
              { key: 'translateZ', val: '0px', prog: 0 },
              { key: 'translateZ', val: '-500px', prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Source media container with breathing effect
  const sourceMediaContainer: RenderableComponentData = {
    id: 'source-media-container',
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
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'source-media',
        type: 'atom',
        componentId: mediaComponentId,
        data: {
          src: media.src,
          className: 'w-full h-full object-cover',
          fit: 'cover',
        },
        context: {
          timing: {
            start: 0,
            duration: media.duration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Breathing/pulsing animation
      {
        id: 'breathing-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: crackPhaseEnd,
          mode: 'provider',
          targetIds: ['source-media-container'],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: 1.0 + breathingIntensity, prog: 0.5 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
      // Fade out as fragments take over
      {
        id: 'source-fade-out',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: fragmentPhaseEnd,
          duration: 0.5,
          mode: 'provider',
          targetIds: ['source-media-container'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Crack overlay SVG
  const crackOverlay: RenderableComponentData = {
    id: 'crack-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 100,
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
      {
        id: 'crack-svg',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <svg width="${width}" height="${height}" style="position: absolute; top: 0; left: 0;">
              <defs>
                <filter id="crack-glow">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feFlood flood-color="#ff0000" flood-opacity="0.5"/>
                  <feComposite in2="blur" operator="in"/>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              ${fragments.map((f, i) => {
                const angle = (Math.PI * 2 * i) / fragments.length;
                const length = Math.min(width, height) * 0.5;
                const x2 = impactPoint.x * width + Math.cos(angle) * length;
                const y2 = impactPoint.y * height + Math.sin(angle) * length;
                return `
                  <line 
                    x1="${impactPoint.x * width}" 
                    y1="${impactPoint.y * height}" 
                    x2="${x2}" 
                    y2="${y2}" 
                    stroke="#ff0000" 
                    stroke-width="2" 
                    opacity="0.8"
                    filter="url(#crack-glow)"
                  />
                `;
              }).join('')}
            </svg>
          `,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Crack spread animation
      {
        id: 'crack-spread',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          start: 0,
          duration: crackPhaseEnd,
          mode: 'provider',
          targetIds: ['crack-overlay-container'],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
          ],
        },
      },
    ],
  };

  // Entity glimpse overlay
  const entityGlimpse: RenderableComponentData = {
    id: 'entity-glimpse-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 50,
        },
      },
    },
    context: {
      timing: {
        start: fragmentPhaseEnd,
        duration: shatterPhaseEnd - fragmentPhaseEnd,
      },
    },
    childrenData: [
      {
        id: 'entity-shadow',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: shatterPhaseEnd - fragmentPhaseEnd,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Flicker animation
      {
        id: 'entity-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: shatterPhaseEnd - fragmentPhaseEnd,
          mode: 'provider',
          targetIds: ['entity-glimpse-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: entityGlimpseIntensity, prog: 0.1 },
            { key: 'opacity', val: 0, prog: 0.2 },
            { key: 'opacity', val: entityGlimpseIntensity * 0.8, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.4 },
            { key: 'opacity', val: entityGlimpseIntensity, prog: 0.6 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      // Subtle movement
      {
        id: 'entity-movement',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: shatterPhaseEnd - fragmentPhaseEnd,
          mode: 'provider',
          targetIds: ['entity-shadow'],
          ranges: [
            { key: 'translateX', val: '-20px', prog: 0 },
            { key: 'translateX', val: '20px', prog: 0.5 },
            { key: 'translateX', val: '-20px', prog: 1 },
            { key: 'translateY', val: '-10px', prog: 0 },
            { key: 'translateY', val: '10px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Prismatic reflections
  const prismaticReflections: RenderableComponentData = {
    id: 'prismatic-reflections-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
          zIndex: 75,
        },
      },
    },
    context: {
      timing: {
        start: fragmentPhaseEnd,
        duration: shatterPhaseEnd - fragmentPhaseEnd,
      },
    },
    childrenData: [
      {
        id: 'reflection-gradient-1',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              background: `linear-gradient(45deg, transparent 0%, rgba(255,100,100,${prismaticIntensity}) 25%, rgba(100,255,100,${prismaticIntensity}) 50%, rgba(100,100,255,${prismaticIntensity}) 75%, transparent 100%)`,
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: shatterPhaseEnd - fragmentPhaseEnd,
          },
        },
      } as RenderableComponentData,
      {
        id: 'reflection-gradient-2',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              background: `linear-gradient(-45deg, transparent 0%, rgba(255,255,100,${prismaticIntensity * 0.7}) 30%, rgba(100,255,255,${prismaticIntensity * 0.7}) 70%, transparent 100%)`,
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: shatterPhaseEnd - fragmentPhaseEnd,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Rotation animation for gradient 1
      {
        id: 'reflection-rotate-1',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: shatterPhaseEnd - fragmentPhaseEnd,
          mode: 'provider',
          targetIds: ['reflection-gradient-1'],
          ranges: [
            { key: 'rotate', val: '0deg', prog: 0 },
            { key: 'rotate', val: '180deg', prog: 1 },
          ],
        },
      },
      // Counter-rotation for gradient 2
      {
        id: 'reflection-rotate-2',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: shatterPhaseEnd - fragmentPhaseEnd,
          mode: 'provider',
          targetIds: ['reflection-gradient-2'],
          ranges: [
            { key: 'rotate', val: '0deg', prog: 0 },
            { key: 'rotate', val: '-180deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // Final phase overlay (dissolution or reformation)
  const finalPhaseOverlay: RenderableComponentData = {
    id: 'final-phase-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: dissolveMode === 'dissolve' ? '#000000' : 'transparent',
          zIndex: 200,
        },
      },
    },
    context: {
      timing: {
        start: shatterPhaseEnd,
        duration: totalDuration - shatterPhaseEnd,
      },
    },
    effects: [
      {
        id: 'final-phase-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: 0,
          duration: totalDuration - shatterPhaseEnd,
          mode: 'provider',
          targetIds: ['final-phase-overlay'],
          ranges: dissolveMode === 'dissolve'
            ? [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ]
            : [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
        },
      },
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'possessed-mirror-shatter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      sourceMediaContainer,
      crackOverlay,
      ...fragmentComponents,
      entityGlimpse,
      prismaticReflections,
      finalPhaseOverlay,
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
  id: 'possessed-mirror-shatter-transition',
  title: 'Possessed Mirror Shatter Transition',
  description: 'A horror-themed transition where the screen acts as a cursed mirror that cracks from a central impact point, fragmenting into 15-20 polygon shards. Each shard reveals disturbing alternate reality variations through inverted colors, hue shifts, and time-shifted moments. Features organic spider-web crack spreading, staggered fragment falls with 3D rotation and prismatic reflections, subtle breathing animation, and glimpses of entities moving behind the shards. Phases progress from slow cracking (0-30%) through rapid fragmentation (30-60%), violent shattering (60-80%), to eerie reformation or dissolution (80-100%).',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'horror', 'mirror', 'shatter', 'fragments', 'possessed', 'cursed', 'supernatural', 'effect', 'cinematic', 'glitch', 'distortion'],
  defaultInputParams: {
    media: {
      src: 'https://example.com/video.mp4',
      type: 'video',
      duration: 10,
    },
    totalDuration: 5,
    fragmentCount: 18,
    impactPoint: {
      x: 0.5,
      y: 0.5,
    },
    dissolveMode: 'dissolve',
    breathingIntensity: 0.02,
    entityGlimpseIntensity: 0.6,
    prismaticIntensity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const possessedMirrorShatterTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
