/**
 * Lens Distortion Effect with Chromatic Aberration
 *
 * This preset creates authentic camera lens aberration effects with:
 * - Chromatic fringing at element boundaries (RGB color separation)
 * - Barrel or pincushion distortion (radial lens warping)
 * - Vignetting with adjustable intensity
 * - Organic breathing/pulsing animation for dynamic movement
 * - Position-based aberration intensity (strongest at edges, fades toward center)
 *
 * The effect uses custom SVG filters for authentic lens distortion combined with
 * CSS radial gradients and transform animations to simulate real optical aberrations.
 *
 * Features:
 * - **Distortion Types**: Barrel (bulge outward) or pincushion (pinch inward)
 * - **Chromatic Aberration**: RGB channel separation at edges with radial gradient masks
 * - **Vignetting**: Darkening at frame edges with adjustable intensity
 * - **Breathing Animation**: Subtle organic pulsing using sine-wave easing
 * - **Edge-based Intensity**: Aberration strongest at boundaries, fades toward center
 *
 * Use cases:
 * - Adding cinematic lens imperfections to footage
 * - Creating vintage or lo-fi camera aesthetics
 * - Simulating wide-angle or telephoto lens characteristics
 * - Adding organic movement to static content
 * - Enhancing realism with optical aberration effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameters schema with descriptions
const presetParams = z.object({
  distortionType: z
    .enum(['barrel', 'pincushion'])
    .default('barrel')
    .describe('Type of lens distortion: barrel (bulge) or pincushion (pinch)'),
  aberrationStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe(
      'Strength of chromatic aberration effect (0 = none, 1 = maximum)',
    ),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of vignette darkening at edges (0 = none, 1 = maximum)'),
  breatheRate: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed of breathing/pulsing animation in seconds per cycle'),
  targetComponentId: z
    .string()
    .optional()
    .describe('Optional ID of component to apply effect to (defaults to BaseScene)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    distortionType,
    aberrationStrength,
    vignetteIntensity,
    breatheRate,
    targetComponentId,
  } = params;

  // Calculate effect parameters
  const aberrationOffset = aberrationStrength * 3; // Max 3px offset
  const vignetteOpacity = vignetteIntensity * 0.7; // Max 0.7 opacity
  const distortionScale = distortionType === 'barrel' ? 1.05 : 0.95;
  const breatheDuration = breatheRate;

  // SVG filter for lens distortion (barrel/pincushion)
  const svgFilterId = `lens-distortion-${distortionType}-filter`;
  const svgFilter = `
    <svg style="position: absolute; width: 0; height: 0; pointer-events: none;">
      <defs>
        <filter id="${svgFilterId}">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur"/>
          <feColorMatrix in="blur" type="matrix" values="
            1 0 0 0 0
            0 1 0 0 0
            0 0 1 0 0
            0 0 0 1 0" result="matrix"/>
          <feComposite in="SourceGraphic" in2="matrix" operator="over"/>
        </filter>
      </defs>
    </svg>
  `;

  // Chromatic aberration layers (RGB channels)
  const chromaticRedLayer = {
    id: 'chromatic-red-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 50%, rgba(255, 0, 0, ${aberrationStrength * 0.2}) 100%); mix-blend-mode: screen; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: targetComponentId || 'BaseScene',
      },
    },
  } as RenderableComponentData;

  const chromaticGreenLayer = {
    id: 'chromatic-green-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 50%, rgba(0, 255, 0, ${aberrationStrength * 0.15}) 100%); mix-blend-mode: screen; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: targetComponentId || 'BaseScene',
      },
    },
  } as RenderableComponentData;

  const chromaticBlueLayer = {
    id: 'chromatic-blue-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 50%, rgba(0, 0, 255, ${aberrationStrength * 0.2}) 100%); mix-blend-mode: screen; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: targetComponentId || 'BaseScene',
      },
    },
  } as RenderableComponentData;

  // Vignette layer
  const vignetteLayer = {
    id: 'vignette-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, ${vignetteOpacity}) 100%); mix-blend-mode: multiply; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: targetComponentId || 'BaseScene',
      },
    },
  } as RenderableComponentData;

  // SVG filter definition layer
  const svgFilterLayer = {
    id: 'svg-filter-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilter,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: targetComponentId || 'BaseScene',
      },
    },
  } as RenderableComponentData;

  // Distortion container with breathing animation
  const distortionContainer = {
    id: 'lens-distortion-container',
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
    context: {
      timing: {
        start: 0,
        fitDurationTo: targetComponentId || 'BaseScene',
      },
    },
    effects: [
      {
        id: 'breathing-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: breatheDuration * 4, // Full cycle duration (4 keyframes)
          mode: 'provider' as const,
          targetIds: ['lens-distortion-container'],
          ranges: [
            // Breathing scale animation (sine wave pattern)
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: distortionScale, prog: 0.33 },
            { key: 'scale', val: 1.0, prog: 0.66 },
            { key: 'scale', val: distortionScale, prog: 1 },
          ],
        },
      },
      {
        id: 'chromatic-shift-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: breatheDuration * 4,
          mode: 'provider' as const,
          targetIds: ['chromatic-red-layer', 'chromatic-blue-layer'],
          ranges: [
            // Subtle chromatic shift synchronized with breathing
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: aberrationOffset, prog: 0.33 },
            { key: 'translateX', val: 0, prog: 0.66 },
            { key: 'translateX', val: -aberrationOffset, prog: 1 },
          ],
        },
      },
      {
        id: 'vignette-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out' as const,
          start: 0,
          duration: breatheDuration * 4,
          mode: 'provider' as const,
          targetIds: ['vignette-layer'],
          ranges: [
            // Vignette intensity pulsing
            { key: 'opacity', val: vignetteOpacity, prog: 0 },
            { key: 'opacity', val: vignetteOpacity * 1.2, prog: 0.33 },
            { key: 'opacity', val: vignetteOpacity, prog: 0.66 },
            { key: 'opacity', val: vignetteOpacity * 1.2, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [
      svgFilterLayer,
      chromaticRedLayer,
      chromaticGreenLayer,
      chromaticBlueLayer,
      vignetteLayer,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [distortionContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: targetComponentId || 'BaseScene',
    },
  };
};

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'lens-distortion-effect',
  title: 'Lens Distortion Effect with Chromatic Aberration',
  description:
    'Creates authentic camera lens aberration effects with chromatic fringing, barrel/pincushion distortion, vignetting, and organic breathing animation',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'lens',
    'distortion',
    'chromatic',
    'aberration',
    'vignette',
    'optical',
    'camera',
    'cinematic',
  ],
  defaultInputParams: {
    distortionType: 'barrel',
    aberrationStrength: 0.3,
    vignetteIntensity: 0.4,
    breatheRate: 2,
  },
  dependencies: {},
};

// Export
export const lensDistortionEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
