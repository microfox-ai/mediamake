/**
 * Liquid Invert Effect (Internal Effect Preset)
 *
 * Creates a fluid, lava lamp-like color inversion effect using animated CSS filters.
 * Simulates organic, flowing regions of inverted colors through animated filter properties
 * (invert, blur, contrast, hue-rotate) that morph and blend over time.
 *
 * The effect creates a psychedelic, kaleidoscopic visual by cycling through complementary colors
 * while the liquid boundaries undulate. The turbulence is simulated through rapid filter property
 * changes that create organic, hypnotic patterns.
 *
 * ARRAY OF EFFECTS:
 * Returns an array of generic effects that create the liquid inversion animation.
 *
 * Features:
 * - Fluid color inversion that morphs through complementary colors
 * - Organic turbulence simulation via blur and contrast variations
 * - Configurable flow speed for overall animation duration
 * - Adjustable turbulence intensity for visual chaos level
 * - Inversion coverage percentage control
 * - Independent color cycle speed for psychedelic color shifts
 * - Hypnotic, kaleidoscopic visual effect like liquid mercury
 *
 * Use cases:
 * - Creating psychedelic visual effects
 * - Adding organic, flowing color inversions to components
 * - Building hypnotic, kaleidoscopic animations
 * - Creating lava lamp-style visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define SVG filter component for turbulence effect
const createSVGFilterHTML = (
  filterId: string,
  turbulenceIntensity: number,
): string => {
  return `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${filterId}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="${turbulenceIntensity}"
            numOctaves="3"
            seed="0"
          >
            <animate
              attributeName="baseFrequency"
              values="${turbulenceIntensity};${turbulenceIntensity * 1.5};${turbulenceIntensity}"
              dur="8s"
              repeatCount="indefinite"
            />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="30">
            <animate
              attributeName="scale"
              values="30;50;30"
              dur="6s"
              repeatCount="indefinite"
            />
          </feDisplacementMap>
          <feComponentTransfer>
            <feFuncR type="table" tableValues="0 1 0 1" />
            <feFuncG type="table" tableValues="1 0 1 0" />
            <feFuncB type="table" tableValues="0 1 0 1" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  `;
};

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the liquid invert effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  flowSpeed: z
    .number()
    .default(3000)
    .describe('Overall flow animation duration in milliseconds (controls liquid morphing speed)'),
  turbulenceIntensity: z
    .number()
    .default(0.02)
    .describe('Turbulence intensity for organic flowing effect (0.01-0.05 recommended)'),
  inversionCoverage: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Percentage of inversion coverage (0-1, where 0.5 is balanced)'),
  colorCycleSpeed: z
    .number()
    .default(5000)
    .describe('Color cycle animation duration in milliseconds (hue rotation speed)'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID prefix'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    flowSpeed,
    turbulenceIntensity,
    inversionCoverage,
    colorCycleSpeed,
    effectId,
  } = params;

  // Convert milliseconds to seconds for Remotion
  const flowDuration = flowSpeed / 1000;
  const colorDuration = colorCycleSpeed / 1000;

  // Generate unique filter ID
  const filterId = `liquid-filter-${Date.now()}`;

  // Calculate inversion values based on coverage
  const minInvert = Math.max(0, inversionCoverage - 0.3);
  const maxInvert = Math.min(1, inversionCoverage + 0.3);
  const midInvert = inversionCoverage;

  // Create liquid inversion animation ranges with organic flow
  const liquidInversionRanges = [
    // Phase 1: Start state with initial inversion
    { key: 'filter', val: `url(#${filterId}) invert(${minInvert})`, prog: 0 },
    {
      key: 'filter',
      val: `url(#${filterId}) invert(${maxInvert}) hue-rotate(90deg) blur(2px) contrast(1.2)`,
      prog: 0.25,
    },
    // Phase 2: Mid-point with high turbulence
    {
      key: 'filter',
      val: `url(#${filterId}) invert(${midInvert}) hue-rotate(180deg) blur(3px) contrast(1.3)`,
      prog: 0.5,
    },
    // Phase 3: Peak inversion with color shift
    {
      key: 'filter',
      val: `url(#${filterId}) invert(${maxInvert}) hue-rotate(270deg) blur(2px) contrast(1.1)`,
      prog: 0.75,
    },
    // Phase 4: Return to start (seamless loop)
    {
      key: 'filter',
      val: `url(#${filterId}) invert(${minInvert}) hue-rotate(360deg)`,
      prog: 1,
    },
  ];

  // Create additional color cycle effect for independent psychedelic shifts
  const colorCycleRanges = [
    { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
    { key: 'filter', val: 'hue-rotate(180deg)', prog: 0.5 },
    { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
  ];

  // Main liquid inversion effect
  const liquidEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: effectStart,
    duration: flowDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: liquidInversionRanges,
  };

  // Secondary color cycle effect (overlapping for richer visuals)
  const colorEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: colorDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: colorCycleRanges,
  };

  // SVG filter definition component
  const svgFilterComponent = {
    id: `${effectId || 'liquid-invert'}-svg-filter`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: createSVGFilterHTML(filterId, turbulenceIntensity),
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: Math.max(flowDuration, colorDuration),
      },
    },
  } as RenderableComponentData;

  // Container with effects
  const rootContainer = {
    id: `${effectId || 'liquid-invert'}-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none' as const,
        },
      },
    },
    effects: [
      {
        id: `${effectId || 'liquid-invert'}-flow-effect`,
        componentId: 'generic',
        data: liquidEffect,
      },
      {
        id: `${effectId || 'liquid-invert'}-color-effect`,
        componentId: 'generic',
        data: colorEffect,
      },
    ],
    childrenData: [svgFilterComponent],
    context: {
      timing: {
        start: 0,
        duration: Math.max(flowDuration, colorDuration),
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'liquid-invert',
  title: 'Liquid Invert Effect',
  description:
    'Internal effect preset that creates a fluid, lava lamp-like color inversion effect using animated CSS filters. Creates organic, flowing regions of inverted colors through animated invert, blur, contrast, and hue-rotate filters. Parameters control flow speed, turbulence intensity (via blur/contrast), inversion coverage, and color cycle speed for a hypnotic, kaleidoscopic visual effect.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'invert', 'liquid', 'psychedelic', 'kaleidoscope'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    flowSpeed: 3000,
    turbulenceIntensity: 0.02,
    inversionCoverage: 0.6,
    colorCycleSpeed: 5000,
  },
};

export const liquidInvertPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
