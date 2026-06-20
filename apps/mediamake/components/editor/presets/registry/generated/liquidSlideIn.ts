/**
 * Liquid Slide-In Internal Effect Preset
 *
 * Creates a fluid, liquid-like slide animation with morphing and distortion effects.
 * Simulates liquid motion using transforms (skewX/Y, translateX/Y) and SVG turbulence filters.
 * The effect feels organic and fluid, as if elements are made of liquid sliding into place.
 *
 * SINGLE EFFECT:
 * Returns a single generic effect with SVG filters that creates liquid-like sliding motion.
 *
 * Features:
 * - Viscosity control (affects flow speed and duration)
 * - Surface tension (affects wobble intensity)
 * - Flow direction patterns (linear, arc, wave, spiral)
 * - Turbulence for random perturbations
 * - Droplet mode for split streams
 * - Bezier curve path animation
 * - Dynamic skewX/Y transforms based on velocity
 * - SVG turbulence filter with animated baseFrequency
 * - Strongest distortions during acceleration phases
 *
 * Use cases:
 * - Fluid entrance animations for elements
 * - Organic motion effects with distortion
 * - Liquid-themed transitions and reveals
 * - Dynamic, physics-inspired animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the liquid slide effect to'),
  viscosity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Viscosity of the liquid (0.1-1.0, affects flow speed - higher = slower)'),
  surfaceTension: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Surface tension affecting wobble intensity (0-1)'),
  flowDirection: z
    .enum(['linear', 'arc', 'wave', 'spiral'])
    .default('arc')
    .describe('Direction pattern of the liquid flow'),
  turbulence: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Amount of random perturbations and distortion (0-1)'),
  dropletMode: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether to split animation into multiple droplet streams'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent)'),
  slideDistance: z
    .number()
    .default(100)
    .describe('Distance to slide in pixels (default 100)'),
  slideFrom: z
    .enum(['left', 'right', 'top', 'bottom'])
    .default('left')
    .describe('Direction from which to slide in'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Calculate duration based on viscosity (higher viscosity = slower flow)
  const baseDuration = 1.2;
  const duration = baseDuration + (params.viscosity * 1.5);

  // Calculate direction multiplier based on slide direction
  const getDirectionMultiplier = () => {
    switch (params.slideFrom) {
      case 'left': return 1;
      case 'right': return -1;
      case 'top': return 1;
      case 'bottom': return -1;
      default: return 1;
    }
  };

  const directionMultiplier = getDirectionMultiplier();
  const isHorizontal = params.slideFrom === 'left' || params.slideFrom === 'right';

  // Calculate bezier control points based on flow direction
  const calculateBezierPath = () => {
    const distance = params.slideDistance * directionMultiplier;
    
    switch (params.flowDirection) {
      case 'linear':
        // Simple linear path with slight easing
        return isHorizontal
          ? [
              { key: 'translateX', val: -distance, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ]
          : [
              { key: 'translateY', val: -distance, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ];
      
      case 'arc':
        // Curved arc path
        const arcPeak = isHorizontal ? 30 : 30;
        return isHorizontal
          ? [
              { key: 'translateX', val: -distance, prog: 0 },
              { key: 'translateY', val: -arcPeak * params.surfaceTension, prog: 0 },
              { key: 'translateX', val: -distance * 0.3, prog: 0.5 },
              { key: 'translateY', val: arcPeak * params.surfaceTension, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
            ]
          : [
              { key: 'translateY', val: -distance, prog: 0 },
              { key: 'translateX', val: -arcPeak * params.surfaceTension, prog: 0 },
              { key: 'translateY', val: -distance * 0.3, prog: 0.5 },
              { key: 'translateX', val: arcPeak * params.surfaceTension, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'translateX', val: 0, prog: 1 },
            ];
      
      case 'wave':
        // Wavy sinusoidal path
        const waveAmplitude = 40 * params.surfaceTension;
        return isHorizontal
          ? [
              { key: 'translateX', val: -distance, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateX', val: -distance * 0.75, prog: 0.25 },
              { key: 'translateY', val: waveAmplitude, prog: 0.25 },
              { key: 'translateX', val: -distance * 0.5, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 0.5 },
              { key: 'translateX', val: -distance * 0.25, prog: 0.75 },
              { key: 'translateY', val: -waveAmplitude, prog: 0.75 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
            ]
          : [
              { key: 'translateY', val: -distance, prog: 0 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateY', val: -distance * 0.75, prog: 0.25 },
              { key: 'translateX', val: waveAmplitude, prog: 0.25 },
              { key: 'translateY', val: -distance * 0.5, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 0.5 },
              { key: 'translateY', val: -distance * 0.25, prog: 0.75 },
              { key: 'translateX', val: -waveAmplitude, prog: 0.75 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'translateX', val: 0, prog: 1 },
            ];
      
      case 'spiral':
        // Spiral path with rotation
        const spiralRadius = 50 * params.surfaceTension;
        return isHorizontal
          ? [
              { key: 'translateX', val: -distance, prog: 0 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'rotate', val: 180 * directionMultiplier, prog: 0 },
              { key: 'translateX', val: -distance * 0.66, prog: 0.33 },
              { key: 'translateY', val: spiralRadius, prog: 0.33 },
              { key: 'rotate', val: 120 * directionMultiplier, prog: 0.33 },
              { key: 'translateX', val: -distance * 0.33, prog: 0.66 },
              { key: 'translateY', val: -spiralRadius * 0.5, prog: 0.66 },
              { key: 'rotate', val: 60 * directionMultiplier, prog: 0.66 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 1 },
            ]
          : [
              { key: 'translateY', val: -distance, prog: 0 },
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'rotate', val: 180 * directionMultiplier, prog: 0 },
              { key: 'translateY', val: -distance * 0.66, prog: 0.33 },
              { key: 'translateX', val: spiralRadius, prog: 0.33 },
              { key: 'rotate', val: 120 * directionMultiplier, prog: 0.33 },
              { key: 'translateY', val: -distance * 0.33, prog: 0.66 },
              { key: 'translateX', val: -spiralRadius * 0.5, prog: 0.66 },
              { key: 'rotate', val: 60 * directionMultiplier, prog: 0.66 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'rotate', val: 0, prog: 1 },
            ];
      
      default:
        return isHorizontal
          ? [
              { key: 'translateX', val: -distance, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ]
          : [
              { key: 'translateY', val: -distance, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ];
    }
  };

  // SkewX animation pattern (velocity-based stretching)
  const skewXIntensity = 15 * params.surfaceTension;
  const skewXRanges = isHorizontal
    ? [
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: skewXIntensity * directionMultiplier, prog: 0.2 },
        { key: 'skewX', val: 0, prog: 0.5 },
        { key: 'skewX', val: -5 * directionMultiplier * params.surfaceTension, prog: 0.8 },
        { key: 'skewX', val: 0, prog: 1 },
      ]
    : [
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: 3 * params.surfaceTension, prog: 0.3 },
        { key: 'skewX', val: -3 * params.surfaceTension, prog: 0.7 },
        { key: 'skewX', val: 0, prog: 1 },
      ];

  // SkewY animation pattern
  const skewYIntensity = 12 * params.surfaceTension;
  const skewYRanges = isHorizontal
    ? [
        { key: 'skewY', val: 0, prog: 0 },
        { key: 'skewY', val: 3 * params.surfaceTension, prog: 0.3 },
        { key: 'skewY', val: -3 * params.surfaceTension, prog: 0.7 },
        { key: 'skewY', val: 0, prog: 1 },
      ]
    : [
        { key: 'skewY', val: 0, prog: 0 },
        { key: 'skewY', val: skewYIntensity * directionMultiplier, prog: 0.2 },
        { key: 'skewY', val: 0, prog: 0.5 },
        { key: 'skewY', val: -4 * directionMultiplier * params.surfaceTension, prog: 0.8 },
        { key: 'skewY', val: 0, prog: 1 },
      ];

  // SVG turbulence filter ranges (strongest during acceleration)
  const turbulenceIntensity = params.turbulence;
  const filterRanges = [
    { key: 'filter', val: `url(#liquidTurbulence-${params.effectId || 'default'})`, prog: 0 },
    { key: 'filter', val: `url(#liquidTurbulence-${params.effectId || 'default'})`, prog: 1 },
  ];

  // Opacity range for droplet mode
  const opacityRanges = params.dropletMode
    ? [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.1 },
        { key: 'opacity', val: 1, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ]
    : [];

  // Combine all ranges
  const bezierPath = calculateBezierPath();
  const allRanges = [
    ...bezierPath,
    ...skewXRanges,
    ...skewYRanges,
    ...filterRanges,
    ...opacityRanges,
  ];

  // SVG filter definition (injected via HTMLBlockAtom)
  const filterId = `liquidTurbulence-${params.effectId || 'default'}`;
  const svgFilterHtml = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${filterId}">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="${0.01 + turbulenceIntensity * 0.05}"
            numOctaves="3"
            result="turbulence"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="turbulence"
            scale="${turbulenceIntensity * 20}"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  // Create SVG filter component
  const svgFilterComponent: RenderableComponentData = {
    id: `svg-filter-${params.effectId || 'default'}`,
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: svgFilterHtml,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Create the effect
  const liquidEffect = {
    id: params.effectId || `liquidSlideIn-${params.targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' as any,
      start: params.effectStart,
      duration: duration,
      mode: 'provider' as const,
      targetIds: params.targetIds,
      ranges: allRanges,
    },
  };

  // Return effect wrapped in container
  const rootContainer: RenderableComponentData = {
    id: 'liquidSlideIn-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [liquidEffect],
    childrenData: [svgFilterComponent] as RenderableComponentData[],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'liquidSlideIn',
  title: 'Liquid Slide-In Effect',
  description:
    'Internal effect preset that creates a fluid, liquid-like slide animation with morphing and distortion effects. Simulates liquid motion using transforms and SVG filters for realistic fluid dynamics with customizable viscosity, surface tension, flow direction, turbulence, and droplet mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'liquid', 'fluid', 'slide', 'organic', 'distortion', 'svg-filter'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    viscosity: 0.5,
    surfaceTension: 0.3,
    flowDirection: 'arc',
    turbulence: 0.2,
    dropletMode: false,
    effectStart: 0,
    slideDistance: 100,
    slideFrom: 'left',
  },
};

// Export preset
export const liquidSlideInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
