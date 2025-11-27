/**
 * Fluid Vortex Typography Preset
 * 
 * A dynamic typography preset where letters emerge from swirling metallic liquid vortex pools.
 * Each character spins up from a central vortex point with fluid dynamics, maintaining spiral
 * motion patterns as it rises and solidifies into elegant serif forms.
 * 
 * Features:
 * - Letters emerge from central vortex points with 720-degree rotation
 * - Spiral motion combining rotation, scale, and vertical translation
 * - Metallic liquid effect transitioning from liquid silver to polished platinum
 * - Centrifugal force effects with horizontal stretch (scaleX) at 60% keyframe
 * - Elastic snap-back effect for natural physics
 * - Rotational motion blur using layered text-shadows during spin
 * - SVG turbulence filter for liquid metallic surface effects
 * - 1.5s per letter animation with 0.2s stagger between letters
 * 
 * Use cases:
 * - High-impact title reveals with liquid metal aesthetics
 * - Luxury brand introductions with elegant typography
 * - Science fiction or tech-themed content openings
 * - Premium product showcase titles
 * - Dramatic text reveals with physical simulation effects
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
  text: z
    .string()
    .default('VORTEX')
    .describe('Text to display with vortex emergence animation'),

  font: z
    .string()
    .default('Baskerville:600:normal')
    .describe(
      'Font family with optional weight and style (e.g., "Baskerville:600:normal", "Playfair Display:700")',
    ),

  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(120)
    .describe('Font size in pixels for the letters'),

  letterDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of each letter emergence animation in seconds'),

  letterStagger: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Time delay between each letter animation start in seconds'),

  rotationDegrees: z
    .number()
    .min(180)
    .max(1440)
    .default(720)
    .describe('Total rotation degrees for spin-up effect (default: 720)'),

  centrifugalStretch: z
    .number()
    .min(1)
    .max(2)
    .default(1.3)
    .describe('Horizontal scale factor for centrifugal stretch effect at 60% keyframe'),

  vortexSpacing: z
    .number()
    .min(0)
    .max(200)
    .default(10)
    .describe('Horizontal spacing between letter vortex points in pixels'),

  turbulenceIntensity: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Initial turbulence intensity for liquid effect (transitions to 0)'),

  backgroundColor: z
    .string()
    .default('#0a0a0a')
    .describe('Background color for the vortex scene'),
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
    font,
    fontSize,
    letterDuration,
    letterStagger,
    rotationDegrees,
    centrifugalStretch,
    vortexSpacing,
    turbulenceIntensity,
    backgroundColor,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Baskerville';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  // Split text into individual letters
  const letters = text.split('');
  const letterCount = letters.length;

  // Calculate total duration: last letter start + its animation duration
  const totalDuration = (letterCount - 1) * letterStagger + letterDuration;

  // Helper function to create motion blur text-shadow for rotational effect
  const createRotationalBlur = (intensity: number): string => {
    const shadows: string[] = [];
    const layers = 8;
    for (let i = 0; i < layers; i++) {
      const angle = (i / layers) * Math.PI * 2;
      const offset = intensity * (i / layers);
      const x = Math.cos(angle) * offset;
      const y = Math.sin(angle) * offset;
      const blur = intensity * 0.5;
      shadows.push(`${x}px ${y}px ${blur}px rgba(255, 255, 255, 0.2)`);
    }
    return shadows.join(', ');
  };

  // Create letter vortex components
  const letterVortexComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const vortexId = `vortex-${index}`;
      const letterStart = index * letterStagger;

      // Calculate horizontal position offset for each letter
      const letterOffset = (index - (letterCount - 1) / 2) * (fontSize * 0.6 + vortexSpacing);

      return {
        id: vortexId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex items-center justify-center',
            style: {
              width: `${fontSize * 1.2}px`,
              height: `${fontSize * 1.5}px`,
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${letterOffset}px), -50%)`,
              transformOrigin: 'center bottom',
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
            id: letterId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter,
              style: {
                fontSize: `${fontSize}px`,
                ...fontStyle,
                transformOrigin: 'center bottom',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                backgroundImage: 'linear-gradient(135deg, #9ca3af 0%, #d1d5db 30%, #f3f4f6 50%, #d1d5db 70%, #9ca3af 100%)',
                filter: `url(#liquid-filter-${index})`,
              },
              font: {
                family: fontFamily,
                ...(fontStyle.fontWeight
                  ? { weights: [fontStyle.fontWeight.toString()] }
                  : {}),
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
                id: `vortex-emergence-${letterId}`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: letterStart,
                  duration: letterDuration,
                  mode: 'provider',
                  targetIds: [letterId],
                  ranges: [
                    // Initial state: invisible, rotated, scaled down, positioned below
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.1 },
                    { key: 'opacity', val: 1, prog: 1 },
                    
                    // Rotation: 720deg to 0deg
                    { key: 'rotate', val: rotationDegrees, prog: 0 },
                    { key: 'rotate', val: 0, prog: 1 },
                    
                    // Scale: 0 to 1.2 (overshoot) to 1
                    { key: 'scale', val: 0, prog: 0 },
                    { key: 'scale', val: 1.2, prog: 0.7 },
                    { key: 'scale', val: 1, prog: 1 },
                    
                    // Vertical translation: 100px up to -20px (rise above) to 0
                    { key: 'translateY', val: 100, prog: 0 },
                    { key: 'translateY', val: -20, prog: 0.7 },
                    { key: 'translateY', val: 0, prog: 1 },
                    
                    // Centrifugal stretch: scaleX 1 to 1.3 at 60%, then snap back
                    { key: 'scaleX', val: 1, prog: 0 },
                    { key: 'scaleX', val: centrifugalStretch, prog: 0.6 },
                    { key: 'scaleX', val: 1, prog: 1 },
                  ],
                },
              },
              {
                id: `motion-blur-${letterId}`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: letterStart,
                  duration: letterDuration * 0.5,
                  mode: 'provider',
                  targetIds: [letterId],
                  ranges: [
                    { key: 'textShadow', val: createRotationalBlur(10), prog: 0 },
                    { key: 'textShadow', val: createRotationalBlur(5), prog: 0.5 },
                    { key: 'textShadow', val: 'none', prog: 1 },
                  ],
                },
              },
              {
                id: `gradient-transition-${letterId}`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: letterStart,
                  duration: letterDuration,
                  mode: 'provider',
                  targetIds: [letterId],
                  ranges: [
                    // Liquid silver to polished platinum gradient transition
                    { 
                      key: 'backgroundImage', 
                      val: 'linear-gradient(135deg, #9ca3af 0%, #d1d5db 30%, #f3f4f6 50%, #d1d5db 70%, #9ca3af 100%)', 
                      prog: 0 
                    },
                    { 
                      key: 'backgroundImage', 
                      val: 'linear-gradient(135deg, #e4e4e7 0%, #f4f4f5 30%, #fafafa 50%, #f4f4f5 70%, #e4e4e7 100%)', 
                      prog: 1 
                    },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Create SVG filters for liquid turbulence effect
  const svgFilters = letters.map((_, index) => {
    const filterId = `liquid-filter-${index}`;
    const letterStart = index * letterStagger;
    
    return `
      <svg xmlns="http://www.w3.org/2000/svg" style="position: absolute; width: 0; height: 0;">
        <defs>
          <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence 
              type="fractalNoise" 
              baseFrequency="${turbulenceIntensity}" 
              numOctaves="3" 
              result="turbulence"
            >
              <animate 
                attributeName="baseFrequency" 
                values="${turbulenceIntensity};0" 
                begin="${letterStart}s" 
                dur="${letterDuration}s" 
                fill="freeze"
              />
            </feTurbulence>
            <feDisplacementMap 
              in="SourceGraphic" 
              in2="turbulence" 
              scale="5" 
              xChannelSelector="R" 
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>
    `;
  }).join('');

  // SVG filter container
  const svgFilterContainer: RenderableComponentData = {
    id: 'svg-filters-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-0 h-0 overflow-hidden',
        dangerouslySetInnerHTML: {
          __html: svgFilters,
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

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'fluid-vortex-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center min-h-screen',
        style: {
          backgroundColor,
          overflow: 'hidden',
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
      svgFilterContainer,
      ...letterVortexComponents,
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
  id: 'fluid-vortex-typography',
  title: 'Fluid Vortex Typography',
  description:
    'Dynamic typography preset where letters emerge from swirling metallic liquid vortex pools. Each character spins up from a central vortex point with fluid dynamics, spiral motion patterns, metallic sheen transitions from liquid silver to polished platinum, and centrifugal force stretch effects. Features 720-degree rotation, scale overshoot, vertical rise animation, and rotational motion blur using layered text-shadows.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'vortex',
    'fluid',
    'liquid',
    'metallic',
    'spiral',
    'rotation',
    'kinetic',
    'emergence',
    '3d-effect',
    'luxury',
    'sci-fi',
    'centrifugal',
    'motion-blur',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    text: 'VORTEX',
    font: 'Baskerville:600:normal',
    fontSize: 120,
    letterDuration: 1.5,
    letterStagger: 0.2,
    rotationDegrees: 720,
    centrifugalStretch: 1.3,
    vortexSpacing: 10,
    turbulenceIntensity: 0.02,
    backgroundColor: '#0a0a0a',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const fluidVortexTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
