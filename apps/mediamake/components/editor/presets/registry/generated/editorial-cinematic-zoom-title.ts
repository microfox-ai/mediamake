/**
 * Editorial Cinematic Zoom Title Preset
 *
 * This preset creates a sophisticated documentary-style title sequence with a Ken Burns zoom effect,
 * luxurious fade-in typography with warm honey glow, drifting bokeh light system, subtle vignette,
 * and diagonal lens flare overlay. Features Playfair Display serif typography scaling from 85% to 100%
 * with multi-layer golden glow effects.
 *
 * Features:
 * - **Ken Burns Zoom Effect**: Continuous slow zoom from 100% to 120% over the entire duration
 * - **Luxurious Text Fade**: Text fades in with simultaneous scale animation (85% to 100%) over 3 seconds
 * - **Warm Honey Glow**: Multi-layer text shadow with golden hues for soft, glowing edges
 * - **Bokeh Lights System**: 6 drifting bokeh circles with independent paths, gaussian blur, and varying sizes
 * - **Radial Vignette**: Dark edges drawing focus to center text using radial gradient background
 * - **Lens Flare Overlay**: Diagonal sweeping lens flare with radial gradient animation
 * - **Serif Typography**: Playfair Display 700 weight with responsive sizing (text-6xl to text-8xl)
 *
 * Use cases:
 * - Documentary title sequences
 * - Luxury brand commercials
 * - Editorial video intros
 * - Cinematic opening titles
 * - High-end promotional content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  title: z.string().default('EDITORIAL TITLE').describe('Main title text to display'),
  
  duration: z
    .number()
    .min(3)
    .max(30)
    .default(10)
    .describe('Total duration of the title sequence in seconds'),
  
  fadeInDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(3)
    .describe('Duration of the luxurious fade-in and scale animation in seconds'),
  
  zoomIntensity: z
    .number()
    .min(1.05)
    .max(1.5)
    .default(1.2)
    .describe('Ken Burns zoom intensity - final scale value (1.0 = no zoom, 1.2 = 20% zoom)'),
  
  textColor: z
    .string()
    .default('#FFF8DC')
    .describe('Text color (warm amber recommended for honey glow effect)'),
  
  glowColor: z
    .string()
    .default('rgba(255, 215, 0, 0.5)')
    .describe('Primary glow color for text shadow (golden/honey tones)'),
  
  bokehCount: z
    .number()
    .int()
    .min(3)
    .max(12)
    .default(6)
    .describe('Number of bokeh light circles drifting across the frame'),
  
  bokehIntensity: z
    .number()
    .min(0.1)
    .max(0.8)
    .default(0.3)
    .describe('Opacity intensity of bokeh circles (0.1 = subtle, 0.8 = prominent)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    title,
    duration,
    fadeInDuration,
    zoomIntensity,
    textColor,
    glowColor,
    bokehCount,
    bokehIntensity,
  } = params;

  // Helper function to generate bokeh light data
  const generateBokehLights = (count: number): RenderableComponentData[] => {
    const bokehs: RenderableComponentData[] = [];
    
    // Predefined positions for natural distribution
    const positions = [
      { top: '10%', left: '15%' },
      { top: '60%', left: '80%' },
      { top: '30%', left: '70%' },
      { top: '75%', left: '25%' },
      { top: '45%', left: '5%' },
      { top: '20%', left: '50%' },
      { top: '85%', left: '60%' },
      { top: '15%', left: '85%' },
      { top: '50%', left: '40%' },
      { top: '70%', left: '10%' },
      { top: '25%', left: '90%' },
      { top: '90%', left: '45%' },
    ];
    
    // Bokeh sizes in rem units
    const sizes = [10, 8, 6, 9, 7, 8.5, 7.5, 6.5, 9.5, 8, 7, 6];
    
    // Golden/amber color variations
    const colors = [
      'rgba(251, 191, 36, 0.3)',   // amber-400
      'rgba(252, 211, 77, 0.3)',   // amber-300
      'rgba(255, 215, 0, 0.3)',    // gold
      'rgba(245, 158, 11, 0.3)',   // amber-600
      'rgba(234, 179, 8, 0.3)',    // yellow-600
      'rgba(253, 224, 71, 0.3)',   // yellow-300
    ];

    for (let i = 0; i < Math.min(count, positions.length); i++) {
      const size = sizes[i % sizes.length];
      const color = colors[i % colors.length];
      const position = positions[i];
      
      // Calculate adjusted opacity based on intensity
      const adjustedOpacity = bokehIntensity * 1.0; // Base opacity from color already has 0.3
      const finalColor = color.replace('0.3)', `${adjustedOpacity})`);
      
      // Each bokeh has independent animation duration (8-15s for slow drift)
      const animDuration = 8 + (i * 1.2) % 7; // Varies between 8-15s
      
      bokehs.push({
        id: `bokeh-${i + 1}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${size}rem; height: ${size}rem; border-radius: 9999px; background: ${finalColor}; filter: blur(8px);"></div>`,
          className: 'absolute',
          style: position,
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: `bokeh-drift-${i + 1}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: animDuration,
              mode: 'provider',
              targetIds: [`bokeh-${i + 1}`],
              ranges: [
                // Horizontal drift
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: (i % 2 === 0 ? 50 : -50) * (1 + i * 0.2), prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
                // Vertical drift
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: (i % 3 === 0 ? 30 : -30) * (1 + i * 0.15), prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
    
    return bokehs;
  };

  // Generate bokeh lights
  const bokehLights = generateBokehLights(bokehCount);

  // Main text component with honey glow
  const textComponent: RenderableComponentData = {
    id: 'editorial-title-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: title,
      font: {
        family: 'Playfair Display',
        weights: ['700'],
        display: 'swap',
      },
      className: 'text-6xl md:text-8xl text-center',
      style: {
        color: textColor,
        textShadow: `0 0 30px ${glowColor}, 0 0 60px ${glowColor.replace('0.5)', '0.3)')}, 0 0 90px ${glowColor.replace('0.5)', '0.2)')}`,
        filter: 'blur(0.5px)',
        fontWeight: 700,
        letterSpacing: '0.02em',
        transformOrigin: 'center center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Fade in and scale effect
      {
        id: 'text-fade-scale',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: ['editorial-title-text'],
          ranges: [
            // Fade in from 0 to 1
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            // Scale from 0.85 to 1
            { key: 'scale', val: 0.85, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Text container (centered)
  const textContainer: RenderableComponentData = {
    id: 'main-text-container',
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
        duration,
      },
    },
    childrenData: [textComponent],
  };

  // Bokeh layer container
  const bokehLayer: RenderableComponentData = {
    id: 'bokeh-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: bokehLights,
  };

  // Lens flare overlay
  const lensFlare: RenderableComponentData = {
    id: 'lens-flare-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, rgba(253, 224, 71, 0.3) 0%, transparent 40%, transparent 100%);"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {},
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Diagonal sweep animation
      {
        id: 'lens-flare-sweep',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['lens-flare-overlay'],
          ranges: [
            // Sweep diagonally across screen
            { key: 'translateX', val: -50, prog: 0 },
            { key: 'translateX', val: 50, prog: 1 },
            { key: 'translateY', val: -30, prog: 0 },
            { key: 'translateY', val: 30, prog: 1 },
          ],
        },
      },
    ],
  };

  // Ken Burns container (zoom effect parent)
  const kenBurnsContainer: RenderableComponentData = {
    id: 'ken-burns-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Ken Burns zoom effect
      {
        id: 'ken-burns-zoom',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['ken-burns-container'],
          ranges: [
            // Continuous zoom from 1.0 to zoomIntensity
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: zoomIntensity, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [textContainer, bokehLayer, lensFlare],
  };

  // Root vignette base with radial gradient background
  const rootContainer: RenderableComponentData = {
    id: 'editorial-cinematic-zoom-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: 'radial-gradient(circle at center, rgba(120, 53, 15, 0.2) 0%, rgba(0, 0, 0, 0.4) 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [kenBurnsContainer],
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
  id: 'editorial-cinematic-zoom-title',
  title: 'Editorial Cinematic Zoom Title',
  description:
    'Sophisticated documentary-style title sequence with Ken Burns zoom effect, luxurious fade-in typography with warm honey glow, drifting bokeh light system, subtle vignette, and diagonal lens flare overlay. Features Playfair Display serif typography scaling from 85% to 100% with multi-layer golden glow effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'editorial',
    'cinematic',
    'documentary',
    'ken-burns',
    'zoom',
    'bokeh',
    'lens-flare',
    'vignette',
    'glow',
    'luxury',
    'serif',
    'typography',
    'fade-in',
    'scale',
  ],
  dependencies: {},
  defaultInputParams: {
    title: 'EDITORIAL TITLE',
    duration: 10,
    fadeInDuration: 3,
    zoomIntensity: 1.2,
    textColor: '#FFF8DC',
    glowColor: 'rgba(255, 215, 0, 0.5)',
    bokehCount: 6,
    bokehIntensity: 0.3,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const editorialCinematicZoomTitlePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
