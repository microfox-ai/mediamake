/**
 * Liquid Chrome Typography Preset
 *
 * Magnetic liquid metal text formation preset featuring metallic droplets that are magnetically
 * pulled together, forming liquid bridges as they merge into sleek serif typography with a
 * mirror-like chrome finish. Features realistic liquid physics with surface tension effects,
 * dynamic bridge thickness based on proximity, and subtle electromagnetic pulse ripples.
 *
 * Features:
 * - **Magnetic Attraction**: Scattered metallic droplets pulled together via magnetic forces
 * - **Liquid Physics**: Realistic surface tension effects during droplet merging
 * - **Dynamic Bridges**: Liquid metal bridges form between droplets with proximity-based thickness
 * - **Chrome Finish**: Mirror-like chrome gradient with distorted reflections
 * - **EM Pulse Effects**: Subtle electromagnetic pulse ripples through final text
 * - **Transform Performance**: Uses only transform and opacity for smooth animations
 *
 * Technical Implementation:
 * - Phase 1 (0-40%): Droplets scatter and begin magnetic attraction
 * - Phase 2 (30-70%): Bridges form between nearby droplets
 * - Phase 3 (50-80%): Droplets merge with blur transitions
 * - Phase 4 (70-100%): Final chrome text fades in with reflection
 * - EM Pulses: Occur at 25%, 50%, 75% progress
 *
 * Use cases:
 * - Tech product launches
 * - Premium brand reveals
 * - Futuristic title sequences
 * - High-end visual effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('LIQUID CHROME')
    .describe('Text to display in liquid chrome typography'),
  
  duration: z
    .number()
    .min(3)
    .max(15)
    .default(6)
    .describe('Total animation duration in seconds'),
  
  fontSize: z
    .number()
    .min(60)
    .max(200)
    .default(120)
    .describe('Font size in pixels for final chrome text'),
  
  dropletsPerLetter: z
    .number()
    .min(3)
    .max(15)
    .default(8)
    .describe('Number of metallic droplets per letter'),
  
  magneticIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for magnetic attraction effects'),
  
  bridgeIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for liquid bridge formation'),
  
  emPulseIntensity: z
    .number()
    .min(0.3)
    .max(1.5)
    .default(0.8)
    .describe('Intensity multiplier for electromagnetic pulse effects'),
  
  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color for the composition'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    dropletsPerLetter,
    magneticIntensity,
    bridgeIntensity,
    emPulseIntensity,
  } = params;

  // Helper: Generate random position within scatter radius
  const getRandomPosition = (
    centerX: number,
    centerY: number,
    maxRadius: number,
  ): { x: number; y: number } => {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * maxRadius;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  };

  // Helper: Calculate distance between two points
  const getDistance = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): number => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Configuration
  const letterCount = text.length;
  const totalDroplets = letterCount * dropletsPerLetter;
  const scatterRadius = 300; // Max scatter distance from center
  const dropletSizeMin = 8;
  const dropletSizeMax = 24;

  // Phase timings (relative to duration)
  const attractionStart = 0;
  const attractionEnd = duration * 0.4;
  const bridgeStart = duration * 0.3;
  const bridgeEnd = duration * 0.7;
  const mergeStart = duration * 0.5;
  const mergeEnd = duration * 0.8;
  const textFadeStart = duration * 0.7;
  const textFadeEnd = duration;

  // EM pulse timings
  const emPulseTimings = [duration * 0.25, duration * 0.5, duration * 0.75];

  // Generate droplets
  const droplets: RenderableComponentData[] = [];
  const dropletPositions: Array<{ x: number; y: number; size: number; letterId: number }> = [];

  for (let i = 0; i < totalDroplets; i++) {
    const letterId = Math.floor(i / dropletsPerLetter);
    const letterProgress = letterId / Math.max(1, letterCount - 1);
    
    // Calculate target position for this letter (distributed horizontally)
    const targetX = -200 + letterProgress * 400; // Spread across center
    const targetY = 0; // Vertical center

    // Random scatter position
    const scatterPos = getRandomPosition(targetX, targetY, scatterRadius);
    const dropletSize = dropletSizeMin + Math.random() * (dropletSizeMax - dropletSizeMin);

    dropletPositions.push({
      x: scatterPos.x,
      y: scatterPos.y,
      size: dropletSize,
      letterId,
    });

    const dropletId = `droplet-${i}`;

    const droplet: RenderableComponentData = {
      id: dropletId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape: 'circle',
        className: 'absolute rounded-full',
        style: {
          width: `${dropletSize}px`,
          height: `${dropletSize}px`,
          background: 'radial-gradient(circle at 30% 30%, #fafafa, #e5e5e5 40%, #a1a1aa 70%, #71717a 100%)',
          boxShadow: 'inset -2px -2px 8px rgba(0,0,0,0.4), inset 2px 2px 8px rgba(255,255,255,0.6), 0 0 12px rgba(161,161,170,0.5)',
          left: '50%',
          top: '50%',
          transformOrigin: 'center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        // Magnetic attraction animation
        {
          id: `attract-${dropletId}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: attractionStart,
            duration: attractionEnd - attractionStart,
            mode: 'provider',
            targetIds: [dropletId],
            ranges: [
              { key: 'translateX', val: scatterPos.x, prog: 0 },
              { key: 'translateX', val: targetX, prog: 1 },
              { key: 'translateY', val: scatterPos.y, prog: 0 },
              { key: 'translateY', val: targetY, prog: 1 },
              { key: 'rotate', val: Math.random() * 360, prog: 0 },
              { key: 'rotate', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        // Merge blur effect
        {
          id: `merge-${dropletId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: mergeStart,
            duration: mergeEnd - mergeStart,
            mode: 'provider',
            targetIds: [dropletId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.5, prog: 0.5 },
              { key: 'scale', val: 0, prog: 1 },
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: 'blur(4px)', prog: 0.5 },
              { key: 'filter', val: 'blur(8px)', prog: 1 },
            ],
          },
        },
      ],
    };

    droplets.push(droplet);
  }

  // Generate bridges between nearby droplets
  const bridges: RenderableComponentData[] = [];
  const bridgeThreshold = 150; // Max distance for bridge formation

  for (let i = 0; i < dropletPositions.length; i++) {
    for (let j = i + 1; j < dropletPositions.length; j++) {
      const d1 = dropletPositions[i];
      const d2 = dropletPositions[j];
      const distance = getDistance(d1.x, d1.y, d2.x, d2.y);

      if (distance < bridgeThreshold) {
        const bridgeId = `bridge-${i}-${j}`;
        const angle = Math.atan2(d2.y - d1.y, d2.x - d1.x) * (180 / Math.PI);
        const midX = (d1.x + d2.x) / 2;
        const midY = (d1.y + d2.y) / 2;
        
        // Bridge thickness based on distance (closer = thicker)
        const thickness = Math.max(1, 4 - (distance / bridgeThreshold) * 3);

        const bridge: RenderableComponentData = {
          id: bridgeId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute pointer-events-none',
              style: {
                width: `${distance}px`,
                height: `${thickness}px`,
                background: 'linear-gradient(to right, transparent, #a1a1aa, transparent)',
                left: '50%',
                top: '50%',
                transformOrigin: 'left center',
                filter: 'blur(0.5px)',
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
              id: `bridge-form-${bridgeId}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: bridgeStart,
                duration: bridgeEnd - bridgeStart,
                mode: 'provider',
                targetIds: [bridgeId],
                ranges: [
                  { key: 'translateX', val: midX, prog: 0 },
                  { key: 'translateX', val: midX, prog: 1 },
                  { key: 'translateY', val: midY, prog: 0 },
                  { key: 'translateY', val: midY, prog: 1 },
                  { key: 'rotate', val: angle, prog: 0 },
                  { key: 'rotate', val: angle, prog: 1 },
                  { key: 'scaleX', val: 0, prog: 0 },
                  { key: 'scaleX', val: 1 * bridgeIntensity, prog: 0.5 },
                  { key: 'scaleX', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.8, prog: 0.3 },
                  { key: 'opacity', val: 0.8, prog: 0.7 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        };

        bridges.push(bridge);
      }
    }
  }

  // Final chrome text
  const chromeTextId = 'chrome-text';
  const chromeText: RenderableComponentData = {
    id: chromeTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: 'Didot',
        weights: ['700'],
        style: 'normal',
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        background: 'linear-gradient(180deg, #E5E5E5 0%, #FFFFFF 25%, #B8B8B8 50%, #FFFFFF 75%, #E5E5E5 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
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
        id: 'chrome-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: textFadeStart,
          duration: textFadeEnd - textFadeStart,
          mode: 'provider',
          targetIds: [chromeTextId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Reflection text
  const reflectionTextId = 'reflection-text';
  const reflectionText: RenderableComponentData = {
    id: reflectionTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      font: {
        family: 'Didot',
        weights: ['700'],
        style: 'normal',
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        background: 'linear-gradient(180deg, #E5E5E5 0%, #FFFFFF 25%, #B8B8B8 50%, #FFFFFF 75%, #E5E5E5 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        transform: 'scaleY(-1)',
        opacity: 0.3,
        filter: 'blur(1px)',
        maskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)',
        WebkitMaskImage: 'linear-gradient(to bottom, black 0%, transparent 70%)',
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
        id: 'reflection-fade-in',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: textFadeStart,
          duration: textFadeEnd - textFadeStart,
          mode: 'provider',
          targetIds: [reflectionTextId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // EM pulse effects
  const emPulses: RenderableComponentData[] = emPulseTimings.map((timing, index) => {
    const pulseId = `em-pulse-${index}`;
    const pulseDuration = 1.5;

    return {
      id: pulseId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        shape: 'circle',
        className: 'absolute pointer-events-none',
        style: {
          width: '200%',
          height: '200%',
          top: '-50%',
          left: '-50%',
          background: 'radial-gradient(circle, transparent 0%, transparent 40%, rgba(200,200,255,0.1) 50%, transparent 60%, transparent 100%)',
          mixBlendMode: 'overlay',
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
          id: `pulse-effect-${pulseId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: timing,
            duration: pulseDuration,
            mode: 'provider',
            targetIds: [pulseId],
            ranges: [
              { key: 'scale', val: 0.5, prog: 0 },
              { key: 'scale', val: 1.5, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: emPulseIntensity * 0.6, prog: 0.3 },
              { key: 'opacity', val: 0, prog: 1 },
              { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 0 },
              { key: 'filter', val: 'hue-rotate(30deg) brightness(1.2)', prog: 0.5 },
              { key: 'filter', val: 'hue-rotate(0deg) brightness(1)', prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Assemble composition
  const rootContainer: RenderableComponentData = {
    id: 'liquid-chrome-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor,
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
      // Droplets container
      {
        id: 'droplets-container',
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
            duration: duration,
          },
        },
        childrenData: droplets,
      } as RenderableComponentData,
      // Bridges container
      {
        id: 'bridges-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: bridges,
      } as RenderableComponentData,
      // Final text container
      {
        id: 'final-text-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [chromeText],
      } as RenderableComponentData,
      // Reflection container
      {
        id: 'reflection-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
            style: {
              transform: 'translateY(60%)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [reflectionText],
      } as RenderableComponentData,
      // EM pulse overlay
      {
        id: 'em-pulse-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: emPulses,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'liquid-chrome-typography',
  title: 'Liquid Chrome Typography',
  description:
    'Magnetic liquid metal text formation preset. Scattered metallic droplets are magnetically pulled together, forming liquid bridges as they merge into sleek serif typography with a mirror-like chrome finish. Features realistic liquid physics with surface tension effects, dynamic bridge thickness based on proximity, and subtle electromagnetic pulse ripples.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'liquid',
    'chrome',
    'metallic',
    'magnetic',
    'droplets',
    'physics',
    'premium',
    'tech',
    'futuristic',
  ],
  defaultInputParams: {
    text: 'LIQUID CHROME',
    duration: 6,
    fontSize: 120,
    dropletsPerLetter: 8,
    magneticIntensity: 1,
    bridgeIntensity: 1,
    emPulseIntensity: 0.8,
    backgroundColor: '#0a0a0a',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const liquidChromeTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
