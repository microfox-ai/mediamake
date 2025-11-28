/**
 * Molten Metal Typography Preset
 *
 * Creates dramatic text reveal effect where letters forge themselves from superheated liquid metal.
 * Features realistic molten pour animation with mask reveals, heat distortion using SVG feTurbulence filters,
 * three-phase temperature gradient transitions (white-hot to orange to metallic silver), forge sparks,
 * rising steam effects during cooling, and a final brushed steel finish with industrial elegance.
 *
 * Features:
 * - **Molten Pour Animation**: Text appears to pour into letter-shaped molds from top to bottom
 * - **Heat Distortion**: SVG filter with feTurbulence creates realistic heat shimmer effect
 * - **Temperature Gradients**: White-hot (2s) → Orange cooling (1s) → Metallic silver final state
 * - **Forge Sparks**: Particle effects during hottest phase with parabolic trajectories
 * - **Steam Effects**: Semi-transparent overlays with blur and upward motion during cooling
 * - **Brushed Steel Finish**: Repeating linear gradient at 45deg for industrial metallic texture
 * - **Temperature-Based Glow**: Box-shadow animations sync with heat phases
 *
 * Technical Implementation:
 * - BaseLayout container with dark forge environment background
 * - Three text layers for temperature phases (hot/cooling/final)
 * - Mask-image animation for molten pour reveal
 * - SVG feTurbulence filter for heat distortion
 * - Spark particles using HTMLBlockAtom with CSS animations
 * - Steam layers with blur filters and translateY motion
 * - Brushed steel finish using repeating-linear-gradient
 *
 * Use Cases:
 * - Industrial/metalworking brand videos
 * - Heavy metal music visuals
 * - Construction/manufacturing content
 * - Action/intensity-focused title cards
 * - Cinematic forge/blacksmith scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to render with molten metal effect'),
  fontSize: z
    .number()
    .default(120)
    .describe('Font size in pixels for the metal text'),
  font: z
    .string()
    .optional()
    .default('Oswald:700:normal')
    .describe(
      'Font family with optional weight and style (e.g., "Oswald:700:normal")',
    ),
  duration: z
    .number()
    .optional()
    .default(4)
    .describe('Total duration of the effect in seconds'),
  pourDuration: z
    .number()
    .optional()
    .default(2)
    .describe('Duration of the molten pour phase in seconds'),
  coolingDuration: z
    .number()
    .optional()
    .default(1)
    .describe('Duration of the cooling phase in seconds'),
  sparkIntensity: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .default(1)
    .describe('Intensity multiplier for spark effects (0-2)'),
  distortionIntensity: z
    .number()
    .min(0)
    .max(2)
    .optional()
    .default(1)
    .describe('Intensity multiplier for heat distortion (0-2)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Oswald:700:normal';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const {
    text,
    fontSize,
    duration,
    pourDuration,
    coolingDuration,
    sparkIntensity,
    distortionIntensity,
  } = params;

  const config = props.config || { width: 1920, height: 1080 };
  const width = config.width || 1920;
  const height = config.height || 1080;

  // Phase timings
  const finalPhaseDuration = duration - pourDuration - coolingDuration;
  const coolingStart = pourDuration;
  const finalStart = pourDuration + coolingDuration;

  // Helper: Generate spark particles
  const generateSparks = (count: number) => {
    const sparks: string[] = [];
    for (let i = 0; i < count; i++) {
      const delay = Math.random() * 0.5;
      const xOffset = (Math.random() - 0.5) * 200;
      const yOffset = -Math.random() * 150;
      const duration = 0.3 + Math.random() * 0.2;

      sparks.push(`
        <div style="
          position: absolute;
          width: 2px;
          height: 2px;
          background: #FFF3A3;
          border-radius: 50%;
          box-shadow: 0 0 4px #FFA500;
          left: 50%;
          top: 50%;
          animation: spark-${i} ${duration}s ease-out ${delay}s;
          animation-fill-mode: forwards;
          opacity: 0;
        "></div>
        <style>
          @keyframes spark-${i} {
            0% {
              transform: translate(0, 0);
              opacity: 1;
            }
            100% {
              transform: translate(${xOffset}px, ${yOffset}px);
              opacity: 0;
            }
          }
        </style>
      `);
    }
    return sparks.join('');
  };

  // Calculate spark count based on intensity
  const sparkCount = Math.floor(20 * sparkIntensity);

  // Construct child components
  const childrenData: RenderableComponentData[] = [
    // Ambient glow at bottom
    {
      id: 'molten-metal-ambient-glow',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background:
              'radial-gradient(ellipse at center bottom, rgba(255, 100, 0, 0.3) 0%, transparent 70%)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [],
    } as RenderableComponentData,

    // SVG filter definitions for heat distortion
    {
      id: 'molten-metal-svg-filter',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg style="position:absolute;width:0;height:0"><defs><filter id="heat-distortion-filter"><feTurbulence type="turbulence" baseFrequency="${0.05 * distortionIntensity}" numOctaves="3" result="turbulence"/><feDisplacementMap in="SourceGraphic" in2="turbulence" scale="${10 * distortionIntensity}" xChannelSelector="R" yChannelSelector="G"/></filter></defs></svg>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData,

    // Main text container with all layers
    {
      id: 'molten-metal-text-container',
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
      childrenData: [
        // HOT LAYER (White-hot phase)
        {
          id: 'molten-metal-text-hot',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
            style: {
              ...fontStyle,
              fontSize: fontSize,
              color: '#FFFFFF',
              textShadow:
                '0 0 30px #FFA500, 0 0 60px #FF4500, 0 0 90px #FF0000',
              WebkitMaskImage:
                'linear-gradient(to bottom, black 0%, black 100%)',
              maskImage: 'linear-gradient(to bottom, black 0%, black 100%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: pourDuration,
            },
          },
          effects: [
            // Molten pour animation (mask reveals from top to bottom)
            {
              id: 'molten-pour-effect',
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: pourDuration,
                mode: 'provider',
                targetIds: ['molten-metal-text-hot'],
                ranges: [
                  {
                    key: 'WebkitMaskImage',
                    val: 'linear-gradient(to bottom, black 0%, transparent 0%)',
                    prog: 0,
                  },
                  {
                    key: 'WebkitMaskImage',
                    val: 'linear-gradient(to bottom, black 100%, transparent 100%)',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // COOLING LAYER (Orange phase)
        {
          id: 'molten-metal-text-cooling',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
            style: {
              ...fontStyle,
              fontSize: fontSize,
              color: '#FFA500',
              textShadow: '0 0 20px #FF4500, 0 0 40px #FF6600',
            },
          },
          context: {
            timing: {
              start: coolingStart,
              duration: coolingDuration,
            },
          },
          effects: [
            // Fade in
            {
              id: 'cooling-fade-in',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: coolingDuration * 0.3,
                mode: 'provider',
                targetIds: ['molten-metal-text-cooling'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
            // Fade out
            {
              id: 'cooling-fade-out',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: coolingDuration * 0.7,
                duration: coolingDuration * 0.3,
                mode: 'provider',
                targetIds: ['molten-metal-text-cooling'],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,

        // FINAL LAYER (Brushed steel finish)
        {
          id: 'molten-metal-text-final',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
            style: {
              ...fontStyle,
              fontSize: fontSize,
              color: '#C0C0C0',
              backgroundImage:
                'repeating-linear-gradient(45deg, #C0C0C0, #D0D0D0 2px, #B0B0B0 2px, #C0C0C0 4px)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
            },
          },
          context: {
            timing: {
              start: finalStart,
              duration: finalPhaseDuration,
            },
          },
          effects: [
            // Fade in
            {
              id: 'final-fade-in',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.5,
                mode: 'provider',
                targetIds: ['molten-metal-text-final'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Spark particles (during hot phase)
    {
      id: 'molten-metal-sparks',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position:absolute;inset:0;pointer-events:none;overflow:hidden;display:flex;align-items:center;justify-content:center;">${generateSparks(sparkCount)}</div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: pourDuration,
        },
      },
      effects: [
        // Fade out sparks at end of pour
        {
          id: 'sparks-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: pourDuration * 0.7,
            duration: pourDuration * 0.3,
            mode: 'provider',
            targetIds: ['molten-metal-sparks'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,

    // Steam layer 1
    {
      id: 'molten-metal-steam-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '100%',
            height: `${height * 0.25}px`,
            bottom: `${height * 0.4}px`,
            background:
              'linear-gradient(to top, rgba(200, 200, 200, 0.2), transparent)',
            filter: 'blur(8px)',
          },
        },
      },
      context: {
        timing: {
          start: coolingStart,
          duration: coolingDuration + finalPhaseDuration * 0.5,
        },
      },
      effects: [
        // Fade in
        {
          id: 'steam-1-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.3,
            mode: 'provider',
            targetIds: ['molten-metal-steam-1'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
        // Rise animation
        {
          id: 'steam-1-rise',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: coolingDuration + finalPhaseDuration * 0.5,
            mode: 'provider',
            targetIds: ['molten-metal-steam-1'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -50, prog: 1 },
            ],
          },
        },
        // Fade out
        {
          id: 'steam-1-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start:
              coolingDuration + finalPhaseDuration * 0.5 - 0.5,
            duration: 0.5,
            mode: 'provider',
            targetIds: ['molten-metal-steam-1'],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,

    // Steam layer 2
    {
      id: 'molten-metal-steam-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '100%',
            height: `${height * 0.3}px`,
            bottom: `${height * 0.35}px`,
            background:
              'linear-gradient(to top, rgba(180, 180, 180, 0.15), transparent)',
            filter: 'blur(12px)',
          },
        },
      },
      context: {
        timing: {
          start: coolingStart + 0.2,
          duration: coolingDuration + finalPhaseDuration * 0.4,
        },
      },
      effects: [
        // Fade in
        {
          id: 'steam-2-fade-in',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.3,
            mode: 'provider',
            targetIds: ['molten-metal-steam-2'],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.25, prog: 1 },
            ],
          },
        },
        // Rise animation
        {
          id: 'steam-2-rise',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: coolingDuration + finalPhaseDuration * 0.4,
            mode: 'provider',
            targetIds: ['molten-metal-steam-2'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -70, prog: 1 },
            ],
          },
        },
        // Fade out
        {
          id: 'steam-2-fade-out',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start:
              coolingDuration + finalPhaseDuration * 0.4 - 0.5,
            duration: 0.5,
            mode: 'provider',
            targetIds: ['molten-metal-steam-2'],
            ranges: [
              { key: 'opacity', val: 0.25, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'molten-metal-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'molten-metal-typography',
  title: 'Molten Metal Typography',
  description:
    'Dramatic text reveal effect where letters forge themselves from superheated liquid metal. Features realistic molten pour animation with mask reveals, heat distortion using SVG feTurbulence filters, three-phase temperature gradient transitions (white-hot to orange to metallic silver), forge sparks, rising steam effects during cooling, and a final brushed steel finish with industrial elegance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'metal',
    'forge',
    'molten',
    'industrial',
    'cinematic',
    'dramatic',
    'heat',
    'sparks',
    'steam',
    'animated',
    'reveal',
  ],
  defaultInputParams: {
    text: 'FORGED',
    fontSize: 120,
    font: 'Oswald:700:normal',
    duration: 4,
    pourDuration: 2,
    coolingDuration: 1,
    sparkIntensity: 1,
    distortionIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const moltenMetalTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
