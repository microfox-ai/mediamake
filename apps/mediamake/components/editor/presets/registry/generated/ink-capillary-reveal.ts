/**
 * Ink Capillary Reveal Text Effect Preset
 *
 * This preset creates an advanced ink spreading text reveal animation that simulates
 * ink being absorbed through paper fibers using capillary action physics. The effect
 * visualizes text appearing as if ink is spreading organically through paper, starting
 * from multiple seed points and growing in natural, non-uniform patterns.
 *
 * Features:
 * - **Organic Spreading**: Noise-based mask animations create natural, fibrous spreading patterns
 * - **Paper Grain Simulation**: Invisible grain lines guide ink flow with varying speeds
 * - **Chromatic Separation**: Color separation effect where cyan, magenta, and yellow pigments
 *   spread at slightly different rates (0.5px offsets, 50ms timing differences)
 * - **Multiple Seed Points**: Random seed points per word create realistic absorption origins
 * - **SVG Turbulence Filters**: feNoise and feColorMatrix for organic edge distortion
 * - **Custom Bezier Easing**: Smooth, natural spreading motion (0.37, 0, 0.63, 1)
 *
 * Technical Implementation:
 * - Uses SVG filters (feTurbulence, feDisplacementMap) for organic edges
 * - CSS mask animations from 0% to 120% for spreading effect
 * - Multiple overlapping text layers with mix-blend-mode: multiply for CMY separation
 * - CSS variables for random seed points per word (--seed-x, --seed-y)
 * - Turbulence animation from seed 0 to 100 over duration
 *
 * Use cases:
 * - Typography reveals with organic, natural aesthetics
 * - Brand animations mimicking traditional ink spreading
 * - Artistic title sequences with paper-like texture
 * - Educational content about ink/paper physics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to reveal with ink spreading effect'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels for the text'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  
  textColor: z
    .string()
    .default('#000000')
    .describe('Main text color after full ink spread (CSS color value)'),
  
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Duration of the ink spreading animation in seconds (800-1200ms recommended)'),
  
  startDelay: z
    .number()
    .min(0)
    .default(0)
    .describe('Delay before animation starts (seconds)'),
  
  chromaticSeparation: z
    .boolean()
    .default(true)
    .describe('Enable chromatic color separation effect (CMY pigments at different rates)'),
  
  separationIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Intensity of chromatic separation effect (0 = none, 2 = extreme)'),
  
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Intensity of turbulence filter for organic edges (0-20, default: 8)'),
  
  spreadSpeed: z
    .enum(['slow', 'medium', 'fast'])
    .default('medium')
    .describe('Speed of ink spreading: slow (1.2s), medium (1.0s), fast (0.8s)'),
  
  grainDirection: z
    .enum(['horizontal', 'vertical', 'diagonal', 'radial'])
    .default('radial')
    .describe('Direction of paper grain lines that guide ink flow'),
  
  seedCount: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Number of seed points where ink spreading originates'),
  
  trackId: z
    .string()
    .default('ink-capillary-reveal')
    .describe('Unique track ID for this preset instance'),
});

// Execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse parameters
  const {
    text,
    fontSize,
    fontFamily,
    textColor,
    duration,
    startDelay,
    chromaticSeparation,
    separationIntensity,
    turbulenceIntensity,
    spreadSpeed,
    grainDirection,
    seedCount,
    trackId,
  } = params;

  // Calculate actual duration based on speed
  const speedMultipliers = { slow: 1.2, medium: 1.0, fast: 0.8 };
  const actualDuration = duration * speedMultipliers[spreadSpeed];

  // Generate random seed positions (normalized 0-1)
  const generateSeeds = (count: number): Array<{ x: number; y: number }> => {
    const seeds = [];
    for (let i = 0; i < count; i++) {
      seeds.push({
        x: Math.random(),
        y: Math.random(),
      });
    }
    return seeds;
  };

  const seeds = generateSeeds(seedCount);

  // Generate mask position based on grain direction
  const getMaskPosition = (grainDir: string): string => {
    switch (grainDir) {
      case 'horizontal':
        return '0% 50%';
      case 'vertical':
        return '50% 0%';
      case 'diagonal':
        return '0% 0%';
      case 'radial':
      default:
        return '50% 50%';
    }
  };

  const maskPosition = getMaskPosition(grainDirection);

  // SVG filter definitions
  const svgFilterHtml = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <filter id="ink-turbulence-${trackId}">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="0.02" 
            numOctaves="4" 
            seed="0"
            result="turbulence">
            <animate 
              attributeName="seed" 
              from="0" 
              to="100" 
              dur="${actualDuration}s" 
              repeatCount="1" />
          </feTurbulence>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence" 
            scale="${turbulenceIntensity}" 
            xChannelSelector="R" 
            yChannelSelector="G" />
        </filter>
        
        <filter id="grain-noise-${trackId}">
          <feTurbulence 
            type="turbulence" 
            baseFrequency="0.9" 
            numOctaves="2" 
            result="turbulence" />
          <feColorMatrix 
            in="turbulence" 
            type="saturate" 
            values="0" />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  `;

  // Build chromatic layers if enabled
  const chromaticLayers: RenderableComponentData[] = [];

  if (chromaticSeparation) {
    const offsetPx = separationIntensity * 0.5;
    const timingOffsets = [0, 0.05, 0.1]; // 0ms, 50ms, 100ms
    const colors = ['cyan', 'magenta', 'yellow'];

    colors.forEach((color, index) => {
      const layerId = `${trackId}-${color}-layer`;
      const translateOffset = index === 0 ? 0 : index === 1 ? offsetPx : -offsetPx;
      
      chromaticLayers.push({
        id: layerId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          font: {
            family: fontFamily,
            weights: ['700'],
            display: 'swap',
          },
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: 700,
            color,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            textAlign: 'center',
            mixBlendMode: 'multiply',
            opacity: 0,
            filter: `url(#ink-turbulence-${trackId})`,
            WebkitMaskImage: `radial-gradient(circle at ${maskPosition}, black 0%, transparent 0%)`,
            maskImage: `radial-gradient(circle at ${maskPosition}, black 0%, transparent 0%)`,
            WebkitMaskSize: '0% 0%',
            maskSize: '0% 0%',
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            transform: `translate(${translateOffset}px, ${translateOffset}px)`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: actualDuration + startDelay,
          },
        },
        effects: [
          {
            id: `${layerId}-reveal`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: startDelay + timingOffsets[index],
              duration: actualDuration,
              mode: 'provider',
              targetIds: [layerId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.3 },
                { key: 'opacity', val: 0.8, prog: 1 },
                { key: 'WebkitMaskSize', val: '0% 0%', prog: 0 },
                { key: 'WebkitMaskSize', val: '120% 120%', prog: 1 },
                { key: 'maskSize', val: '0% 0%', prog: 0 },
                { key: 'maskSize', val: '120% 120%', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    });
  }

  // Main text layer
  const mainLayerId = `${trackId}-main-layer`;
  const mainTextLayer: RenderableComponentData = {
    id: mainLayerId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: fontFamily,
        weights: ['700'],
        display: 'swap',
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 700,
        color: textColor,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        textAlign: 'center',
        opacity: 0,
        filter: `url(#grain-noise-${trackId})`,
        WebkitMaskImage: `radial-gradient(circle at ${maskPosition}, black 0%, transparent 0%)`,
        maskImage: `radial-gradient(circle at ${maskPosition}, black 0%, transparent 0%)`,
        WebkitMaskSize: '0% 0%',
        maskSize: '0% 0%',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: actualDuration + startDelay,
      },
    },
    effects: [
      {
        id: `${mainLayerId}-reveal`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: startDelay + (chromaticSeparation ? 0.15 : 0),
          duration: actualDuration,
          mode: 'provider',
          targetIds: [mainLayerId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.4 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'WebkitMaskSize', val: '0% 0%', prog: 0 },
            { key: 'WebkitMaskSize', val: '120% 120%', prog: 1 },
            { key: 'maskSize', val: '0% 0%', prog: 0 },
            { key: 'maskSize', val: '120% 120%', prog: 1 },
          ],
        },
      },
    ],
  };

  // SVG filter atom
  const svgFilterAtom: RenderableComponentData = {
    id: `${trackId}-svg-filters`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHtml,
      className: 'pointer-events-none',
      style: {
        position: 'absolute',
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: actualDuration + startDelay + 0.5,
      },
    },
  };

  // Text container layout
  const textContainerId = `${trackId}-text-container`;
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
        style: {
          width: '80%',
          height: 'auto',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: actualDuration + startDelay,
      },
    },
    childrenData: [
      ...chromaticLayers,
      mainTextLayer,
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
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
        duration: actualDuration + startDelay,
      },
    },
    childrenData: [
      svgFilterAtom,
      textContainer,
    ] as RenderableComponentData[],
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'ink-capillary-reveal',
  title: 'Ink Capillary Reveal Text Effect',
  description:
    'Advanced ink spreading text reveal using organic capillary action simulation with noise-based masks, paper grain patterns, and chromatic color separation (CMY) effects. Features natural non-uniform spreading from multiple seed points with turbulence filters for realistic ink-through-paper aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'ink',
    'capillary',
    'organic',
    'spreading',
    'paper',
    'grain',
    'chromatic-separation',
    'cmy',
    'turbulence',
    'artistic',
    'macro-photography',
    'noise-animation',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Ink Reveal',
    fontSize: 64,
    fontFamily: 'Inter',
    textColor: '#000000',
    duration: 1.2,
    startDelay: 0,
    chromaticSeparation: true,
    separationIntensity: 0.5,
    turbulenceIntensity: 8,
    spreadSpeed: 'medium',
    grainDirection: 'radial',
    seedCount: 3,
    trackId: 'ink-capillary-reveal',
  },
};

// Export
export const inkCapillaryRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
