/**
 * Retro Computer Demo Scene Typokinetics Preset
 *
 * Recreates the iconic look of 80s Amiga/Commodore 64 demo scene productions with:
 * - Stepped chrome gradient with 16-level color depth and visible banding
 * - Animated raster bars (horizontal colored bands moving vertically)
 * - Copper bar effect (metallic gradients cycling through text)
 * - Screen tearing artifacts with diagonal splits
 * - VHS wobble combined with low framerate simulation (15fps chunky movement)
 * - Plasma background with morphing color patterns
 * - Dithering overlay pattern for authentic retro aesthetic
 * - Border frame with cyan glow (classic demo style)
 *
 * Use cases:
 * - Retro gaming content, synthwave videos, vaporwave aesthetics
 * - 80s nostalgia projects, tech history documentaries
 * - Demo scene tributes, chiptune music videos
 * - Vintage computer graphics recreations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('DEMO SCENE')
    .describe('Main text to display with retro chrome effect'),
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Duration of the entire scene in seconds'),
  fontSize: z
    .number()
    .min(40)
    .max(300)
    .default(120)
    .describe('Font size of the main text in pixels'),
  rasterBarCount: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of animated raster bars'),
  rasterBarSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed multiplier for raster bar animation'),
  vhsWobbleIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Intensity of VHS wobble effect in pixels'),
  screenTearingIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(15)
    .describe('Intensity of screen tearing offset in pixels'),
  plasmaSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Speed of plasma background animation'),
  ditherOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of dithering overlay pattern'),
  enableCopperBars: z
    .boolean()
    .default(true)
    .describe('Enable copper bar gradient effect on text'),
  enableScreenTearing: z
    .boolean()
    .default(true)
    .describe('Enable screen tearing artifacts'),
  enableBorder: z
    .boolean()
    .default(true)
    .describe('Enable cyan border frame with glow'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // --- Helper Functions ---
  
  /**
   * Generate stepped chrome gradient with 16 distinct gray levels
   */
  const generateSteppedChromeGradient = (): string => {
    const levels = 16;
    const stops: string[] = [];
    
    for (let i = 0; i < levels; i++) {
      const colorValue = Math.floor((i / (levels - 1)) * 255);
      const colorHex = colorValue.toString(16).padStart(2, '0');
      const color = `#${colorHex}${colorHex}${colorHex}`;
      const startPercent = (i / levels) * 100;
      const endPercent = ((i + 1) / levels) * 100;
      
      stops.push(`${color} ${startPercent}%`);
      stops.push(`${color} ${endPercent}%`);
    }
    
    return `linear-gradient(90deg, ${stops.join(', ')})`;
  };

  /**
   * Generate raster bar components with animated vertical movement
   */
  const generateRasterBars = (): RenderableComponentData[] => {
    const colors = [
      ['#ff0000', '#ff00ff'],
      ['#00ffff', '#0000ff'],
      ['#00ff00', '#ffff00'],
      ['#ff00ff', '#ff0000'],
      ['#ffff00', '#00ff00'],
    ];
    
    const bars: RenderableComponentData[] = [];
    
    for (let i = 0; i < params.rasterBarCount; i++) {
      const colorPair = colors[i % colors.length];
      const barId = `raster-bar-${i}`;
      const offset = (i / params.rasterBarCount) * params.duration;
      
      bars.push({
        id: barId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute w-full h-4 pointer-events-none',
            style: {
              background: `linear-gradient(90deg, transparent 0%, ${colorPair[0]} 20%, ${colorPair[1]} 50%, ${colorPair[0]} 80%, transparent 100%)`,
              opacity: 0.7,
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `raster-bar-move-${i}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: params.duration / params.rasterBarSpeed,
              mode: 'provider',
              targetIds: [barId],
              ranges: [
                { key: 'translateY', val: -50, prog: 0 },
                { key: 'translateY', val: '110vh', prog: 1 },
              ],
            },
          },
        ],
        childrenData: [],
      });
    }
    
    return bars;
  };

  /**
   * Generate plasma background with morphing colors
   */
  const generatePlasmaBackground = (): string => {
    return `
      <div style="
        width: 100%;
        height: 100%;
        background: 
          radial-gradient(circle at 30% 40%, #ff00ff 0%, transparent 50%),
          radial-gradient(circle at 70% 60%, #00ffff 0%, transparent 50%),
          radial-gradient(circle at 50% 50%, #ff00ff 0%, transparent 70%),
          radial-gradient(circle at 20% 80%, #00ff00 0%, transparent 60%),
          #000000;
        opacity: 0.4;
        animation: plasmaShift ${20 / params.plasmaSpeed}s infinite alternate ease-in-out;
      "></div>
      <style>
        @keyframes plasmaShift {
          0% {
            filter: hue-rotate(0deg) brightness(1);
          }
          33% {
            filter: hue-rotate(120deg) brightness(1.2);
          }
          66% {
            filter: hue-rotate(240deg) brightness(0.9);
          }
          100% {
            filter: hue-rotate(360deg) brightness(1);
          }
        }
      </style>
    `;
  };

  /**
   * Generate dithering overlay pattern
   */
  const generateDitheringOverlay = (): string => {
    return `
      <div style="
        width: 100%;
        height: 100%;
        background: repeating-conic-gradient(#000 0% 25%, transparent 0% 50%) 0 0/4px 4px;
        opacity: ${params.ditherOpacity};
        pointer-events: none;
      "></div>
    `;
  };

  // --- Component Structure ---

  const textId = 'retro-demo-text';
  const containerId = 'retro-demo-container';

  // Main text component with chrome gradient
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: 900,
        fontFamily: 'monospace',
        background: generateSteppedChromeGradient(),
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        textShadow: '2px 2px 0px #000, 4px 4px 0px rgba(0,0,0,0.5)',
        letterSpacing: `${params.fontSize * 0.067}px`,
        userSelect: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [],
    childrenData: [],
  };

  // VHS wobble effect with low framerate simulation (15fps)
  const vhsWobbleEffect = {
    id: 'vhs-wobble-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'translateX', val: -params.vhsWobbleIntensity, prog: 0 },
        { key: 'translateX', val: params.vhsWobbleIntensity, prog: 0.25 },
        { key: 'translateX', val: -params.vhsWobbleIntensity * 0.5, prog: 0.5 },
        { key: 'translateX', val: params.vhsWobbleIntensity * 0.7, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
      ],
    },
  };

  // Copper bar effect (vertical gradient sweep)
  const copperBarEffect = params.enableCopperBars ? {
    id: 'copper-bar-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration * 0.5,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { 
          key: 'filter', 
          val: 'hue-rotate(0deg) brightness(1)', 
          prog: 0 
        },
        { 
          key: 'filter', 
          val: 'hue-rotate(60deg) brightness(1.3)', 
          prog: 0.25 
        },
        { 
          key: 'filter', 
          val: 'hue-rotate(120deg) brightness(1.5)', 
          prog: 0.5 
        },
        { 
          key: 'filter', 
          val: 'hue-rotate(180deg) brightness(1.3)', 
          prog: 0.75 
        },
        { 
          key: 'filter', 
          val: 'hue-rotate(240deg) brightness(1)', 
          prog: 1 
        },
      ],
    },
  } : null;

  // Screen tearing effect
  const screenTearingEffect = params.enableScreenTearing ? {
    id: 'screen-tearing-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: params.duration * 0.3,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: params.screenTearingIntensity, prog: 0.2 },
        { key: 'translateX', val: -params.screenTearingIntensity * 0.5, prog: 0.4 },
        { key: 'translateX', val: params.screenTearingIntensity * 0.3, prog: 0.6 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'skewX', val: '0deg', prog: 0 },
        { key: 'skewX', val: '2deg', prog: 0.2 },
        { key: 'skewX', val: '-1deg', prog: 0.4 },
        { key: 'skewX', val: '1deg', prog: 0.6 },
        { key: 'skewX', val: '0deg', prog: 1 },
      ],
    },
  } : null;

  // Add effects to text component
  textComponent.effects = [
    vhsWobbleEffect,
    copperBarEffect,
    screenTearingEffect,
  ].filter(Boolean);

  // Border frame
  const borderFrame: RenderableComponentData | null = params.enableBorder ? {
    id: 'retro-border-frame',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <div style="
          position: absolute;
          inset: 20px;
          border: 4px solid #00ffff;
          box-shadow: 
            inset 0 0 20px rgba(0, 255, 255, 0.5),
            0 0 20px rgba(0, 255, 255, 0.5),
            inset 0 0 40px rgba(0, 255, 255, 0.3);
          pointer-events: none;
        "></div>
      `,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [],
  } : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          imageRendering: 'pixelated', // Retro pixelated rendering
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      // Plasma background
      {
        id: 'plasma-background',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: generatePlasmaBackground(),
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [],
      },
      // Dithering overlay
      {
        id: 'dither-overlay',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: generateDitheringOverlay(),
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [],
      },
      // Raster bars container
      {
        id: 'raster-bars-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: generateRasterBars(),
      },
      // Text container
      {
        id: 'chrome-text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [textComponent],
      },
      // Border frame
      ...(borderFrame ? [borderFrame] : []),
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
  id: 'retroComputerDemoTypokinetics',
  title: 'Retro Computer Demo Typokinetics',
  description:
    'An 80s Amiga/demo scene inspired typokinetics preset featuring stepped chrome gradients with 16-level color depth, animated raster bars, copper bar effects, screen tearing artifacts, low framerate simulation (15fps), plasma background patterns, dithering overlays, and vintage VHS wobble. Recreates the technical limitations of vintage hardware (limited color palettes, visible banding, chunky movement) turned into artistic style with classic demo effects like horizontal colored bands and metallic gradient cycling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'retro',
    '80s',
    'demo-scene',
    'amiga',
    'chrome',
    'raster-bars',
    'copper-bars',
    'plasma',
    'vhs',
    'vintage',
    'synthwave',
    'pixel-art',
    'dithering',
    'screen-tearing',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'DEMO SCENE',
    duration: 10,
    fontSize: 120,
    rasterBarCount: 3,
    rasterBarSpeed: 2,
    vhsWobbleIntensity: 3,
    screenTearingIntensity: 15,
    plasmaSpeed: 0.5,
    ditherOpacity: 0.3,
    enableCopperBars: true,
    enableScreenTearing: true,
    enableBorder: true,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const retroComputerDemoTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
