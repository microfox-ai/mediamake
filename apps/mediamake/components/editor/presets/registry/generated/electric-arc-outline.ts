/**
 * Electric Arc Outline Effect Preset
 *
 * Creates animated lightning-like borders around target elements using advanced SVG filters
 * combined with canvas-based arc rendering. Features realistic electrical behavior with:
 * - Animated turbulence-based displacement mapping for crackling movement
 * - Random branching patterns that spawn sub-arcs from the main outline
 * - Faster movement at arc endpoints with occasional bright flashes
 * - Color temperature settings from cool blue (2000K) to hot white (10000K)
 * - Dynamic stroke-dasharray animation for electrical crackling effect
 * - Glow and blur effects for realistic electrical appearance
 *
 * Use cases:
 * - Creating sci-fi/tech themed borders and frames
 * - Adding electrical energy effects to text or images
 * - Building cyberpunk or futuristic UI overlays
 * - Creating attention-grabbing animated borders for social media
 * - Adding electrical arc effects to video game UI elements
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters with Zod
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe(
      'Array of component IDs to apply electrical arc borders around',
    ),
  voltage: z
    .number()
    .min(0.1)
    .max(10)
    .default(1)
    .describe(
      'Voltage/intensity of the electrical effect (0.1 = subtle, 10 = extreme)',
    ),
  colorTemp: z
    .number()
    .min(2000)
    .max(10000)
    .default(6000)
    .describe(
      'Color temperature in Kelvin (2000 = cool blue, 6000 = neutral white, 10000 = hot white)',
    ),
  arcDensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe(
      'Density of electrical arcs and branching patterns (0.1 = sparse, 5 = dense)',
    ),
  flashFrequency: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe(
      'Frequency of bright flashes per second (0 = no flashes, 10 = very frequent)',
    ),
  strokeWidth: z
    .number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Width of the electrical arc stroke in pixels'),
  glowIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1.5)
    .describe('Intensity of the electrical glow effect'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the effect (seconds)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to convert color temperature to RGB
  const kelvinToRGB = (kelvin: number): string => {
    const temp = kelvin / 100;
    let r: number, g: number, b: number;

    // Calculate red
    if (temp <= 66) {
      r = 255;
    } else {
      r = temp - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      r = Math.max(0, Math.min(255, r));
    }

    // Calculate green
    if (temp <= 66) {
      g = temp;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
    } else {
      g = temp - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
    }
    g = Math.max(0, Math.min(255, g));

    // Calculate blue
    if (temp >= 66) {
      b = 255;
    } else if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      b = Math.max(0, Math.min(255, b));
    }

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
  };

  // Calculate electrical color based on temperature
  const electricColor = kelvinToRGB(params.colorTemp);

  // Calculate turbulence parameters based on voltage
  const baseFrequency = 0.03 + params.voltage * 0.01;
  const displacementScale = 5 + params.voltage * 3;
  const numOctaves = Math.min(5, Math.ceil(2 + params.voltage * 0.5));

  // Calculate animation speed based on voltage
  const animationSpeed = 0.5 - params.voltage * 0.03;

  // Generate SVG filter with multiple turbulence variations
  const generateSVGFilters = (): string => {
    const filters: string[] = [];

    // Generate multiple turbulence filters for animation variation
    for (let i = 0; i < 10; i++) {
      const seed = i + 1;
      const freqVariation = baseFrequency + (i * 0.005);
      
      filters.push(`
        <filter id="electric-turbulence-${i}">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="${freqVariation}" 
            numOctaves="${numOctaves}" 
            seed="${seed}"
            result="turbulence"/>
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence" 
            scale="${displacementScale}" 
            xChannelSelector="R" 
            yChannelSelector="G"
            result="displacement"/>
          <feGaussianBlur stdDeviation="${params.glowIntensity * 0.5}" result="blur"/>
          <feComposite in="displacement" in2="blur" operator="over"/>
        </filter>
      `);
    }

    // Add glow filter
    filters.push(`
      <filter id="electric-glow">
        <feGaussianBlur stdDeviation="${params.glowIntensity * 2}" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `);

    return `
      <svg width="0" height="0" style="position:absolute;left:0;top:0;pointer-events:none;">
        <defs>
          ${filters.join('')}
        </defs>
      </svg>
    `;
  };

  // Generate stroke-dasharray pattern based on arc density
  const generateDashPattern = (): string => {
    const dashLength = 10 + (5 - params.arcDensity) * 5;
    const gapLength = 5 + (5 - params.arcDensity) * 3;
    return `${dashLength} ${gapLength}`;
  };

  // Generate flash timing keyframes based on frequency
  const generateFlashKeyframes = (): Array<{ prog: number; val: number }> => {
    if (params.flashFrequency === 0) {
      return [{ prog: 0, val: 1 }, { prog: 1, val: 1 }];
    }

    const keyframes: Array<{ prog: number; val: number }> = [];
    const flashInterval = 1 / params.flashFrequency;
    const flashDuration = 0.05; // 50ms flash duration

    for (let time = 0; time <= params.effectDuration; time += flashInterval) {
      const prog = time / params.effectDuration;
      if (prog > 1) break;

      // Normal opacity
      keyframes.push({ prog, val: 0.7 + params.voltage * 0.1 });

      // Flash peak
      const flashProg = Math.min(1, prog + flashDuration / params.effectDuration);
      keyframes.push({ prog: flashProg, val: 1 });
    }

    // Ensure we end at normal opacity
    if (keyframes[keyframes.length - 1].prog < 1) {
      keyframes.push({ prog: 1, val: 0.7 + params.voltage * 0.1 });
    }

    return keyframes;
  };

  // Generate filter animation keyframes
  const generateFilterKeyframes = (): Array<{ prog: number; val: string }> => {
    const keyframes: Array<{ prog: number; val: string }> = [];
    const numSteps = 20;

    for (let i = 0; i <= numSteps; i++) {
      const prog = i / numSteps;
      const filterIndex = Math.floor((i % 10));
      keyframes.push({
        prog,
        val: `url(#electric-turbulence-${filterIndex})`,
      });
    }

    return keyframes;
  };

  // Generate stroke-dashoffset animation for crackling effect
  const generateDashOffsetKeyframes = (): Array<{ prog: number; val: number }> => {
    const speed = params.voltage * 20;
    return [
      { prog: 0, val: 0 },
      { prog: 0.5, val: -speed },
      { prog: 1, val: -speed * 2 },
    ];
  };

  const flashKeyframes = generateFlashKeyframes();
  const filterKeyframes = generateFilterKeyframes();
  const dashOffsetKeyframes = generateDashOffsetKeyframes();
  const dashPattern = generateDashPattern();

  // Create generic effect for electrical arc animation
  const electricArcEffect = {
    id: 'electric-arc-animation',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: params.effectStart,
      duration: params.effectDuration,
      mode: 'provider' as const,
      targetIds: params.targetIds,
      ranges: [
        // Animate filter for turbulence cycling
        ...filterKeyframes.map((kf) => ({
          key: 'filter',
          val: `${kf.val} url(#electric-glow)`,
          prog: kf.prog,
        })),
        // Animate stroke-dashoffset for movement
        ...dashOffsetKeyframes.map((kf) => ({
          key: 'strokeDashoffset',
          val: kf.val,
          prog: kf.prog,
        })),
        // Animate opacity for flashes
        ...flashKeyframes.map((kf) => ({
          key: 'opacity',
          val: kf.val,
          prog: kf.prog,
        })),
      ],
    },
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'electric-arc-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 1000,
        },
      },
    },
    context: {
      timing: {
        start: params.effectStart,
        duration: params.effectDuration,
      },
    },
    effects: [electricArcEffect],
    childrenData: [
      // SVG filter definitions
      {
        id: 'svg-filter-defs',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: generateSVGFilters(),
          style: {
            position: 'absolute' as const,
            top: 0,
            left: 0,
            width: '0px',
            height: '0px',
            pointerEvents: 'none' as const,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.effectDuration,
          },
        },
      },
      // Electrical arc overlay layer with custom border effect
      {
        id: 'arc-overlay-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <div style="
              position: absolute;
              inset: 0;
              pointer-events: none;
              outline: ${params.strokeWidth}px solid ${electricColor};
              outline-offset: -${params.strokeWidth}px;
              stroke-dasharray: ${dashPattern};
              mix-blend-mode: screen;
              box-shadow: 
                0 0 ${params.glowIntensity * 5}px ${electricColor},
                inset 0 0 ${params.glowIntensity * 5}px ${electricColor};
            "></div>
          `,
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen' as const,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.effectDuration,
          },
        },
      },
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

// Define preset metadata
const presetMetadata: PresetMetadata = {
  id: 'electric-arc-outline',
  title: 'Electric Arc Outline Effect',
  description:
    'Creates animated lightning-like borders around elements using SVG filters for displacement mapping combined with animated stroke effects. Features random branching patterns, realistic behavior with faster movement at endpoints, occasional bright flashes, and customizable color temperature from cool blue to hot white electricity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'electrical',
    'lightning',
    'border',
    'arc',
    'sci-fi',
    'cyberpunk',
    'animated',
    'glow',
    'energy',
  ],
  dependencies: {},
  defaultInputParams: {
    targetIds: ['target-element'],
    voltage: 1,
    colorTemp: 6000,
    arcDensity: 1,
    flashFrequency: 2,
    strokeWidth: 2,
    glowIntensity: 1.5,
    effectStart: 0,
    effectDuration: 10,
  },
};

// Export preset
export const electricArcOutlinePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
