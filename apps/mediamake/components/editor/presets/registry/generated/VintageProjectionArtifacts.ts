/**
 * Vintage Projection Artifacts Combined Effect Preset
 *
 * This preset creates a comprehensive vintage film aging system that layers multiple
 * authentic projection artifacts into a cohesive vintage look. It combines:
 * - Gate weave: Horizontal drift simulation (±2px) mimicking film gate instability
 * - Focus hunting: Oscillating blur (0-1.5px) simulating projection focus shifts
 * - Exposure pumping: Brightness fluctuations (0.95-1.05) from inconsistent lamp output
 * - Dynamic vignetting: Edge darkening that softens with focus shifts
 * - Grain texture overlay: Film grain intensity tied to exposure (darker = more grain)
 * - Optional chromatic aberration: Subtle RGB channel separation
 *
 * Effects are interconnected to create realistic vintage film behavior:
 * - When exposure drops → grain becomes more visible
 * - When focus shifts → vignette softens (simulating depth of field changes)
 * - All artifacts oscillate at different rates for organic, non-repeating patterns
 *
 * Features:
 * - **Projection Quality Levels**: pristine/good/fair/poor intensity presets
 * - **Configurable Intensity**: 0-1 multiplier for all artifacts
 * - **Grain Visibility Control**: 0-1 adjustment for film grain opacity
 * - **Optional Chromatic Aberration**: Toggle RGB channel separation
 * - **Interconnected Effects**: Artifacts react to each other for realism
 * - **Generic Effect System**: Uses 6 interdependent generic effects
 *
 * Use cases:
 * - Adding authentic vintage film character to modern footage
 * - Creating period-accurate historical documentary looks
 * - Simulating old projection equipment artifacts
 * - Building retro film aesthetic overlays
 * - Creating nostalgic visual treatments
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  projectionQuality: z
    .enum(['pristine', 'good', 'fair', 'poor'])
    .describe(
      'Overall projection quality level (pristine = minimal artifacts, poor = heavy artifacts)',
    ),
  artifactIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Global intensity multiplier for all artifacts (0-1)'),
  grainVisibility: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Film grain overlay visibility (0-1)'),
  includeChromaticAberration: z
    .boolean()
    .default(false)
    .describe('Enable RGB channel separation for chromatic aberration effect'),
  duration: z
    .number()
    .positive()
    .describe('Duration of the vintage effect in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply vintage effects to'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Quality-based intensity presets
  const qualityMultipliers: Record<string, number> = {
    pristine: 0.2,
    good: 0.5,
    fair: 0.8,
    poor: 1.2,
  };

  const qualityMultiplier =
    qualityMultipliers[params.projectionQuality] || 0.8;
  const finalIntensity = params.artifactIntensity * qualityMultiplier;

  // Scale values based on intensity
  const scaleValue = (base: number): number => base * finalIntensity;

  // 1. Gate Weave Effect - Horizontal drift simulation
  const gateWeaveEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: scaleValue(2), prog: 0.25 },
      { key: 'translateX', val: 0, prog: 0.5 },
      { key: 'translateX', val: scaleValue(-2), prog: 0.75 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // 2. Focus Hunting Effect - Oscillating blur
  const focusHuntingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'blur', val: 0, prog: 0 },
      { key: 'blur', val: scaleValue(1), prog: 0.15 },
      { key: 'blur', val: scaleValue(0.5), prog: 0.3 },
      { key: 'blur', val: scaleValue(1.5), prog: 0.45 },
      { key: 'blur', val: 0, prog: 0.6 },
      { key: 'blur', val: scaleValue(0.8), prog: 0.75 },
      { key: 'blur', val: 0, prog: 0.9 },
      { key: 'blur', val: 0, prog: 1 },
    ],
  };

  // 3. Exposure Pumping Effect - Brightness fluctuations
  const exposurePumpingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: [
      { key: 'brightness', val: 1, prog: 0 },
      { key: 'brightness', val: 0.95 - scaleValue(0.03), prog: 0.2 },
      { key: 'brightness', val: 1.05 + scaleValue(0.03), prog: 0.4 },
      { key: 'brightness', val: 0.97 - scaleValue(0.02), prog: 0.6 },
      { key: 'brightness', val: 1.03 + scaleValue(0.02), prog: 0.8 },
      { key: 'brightness', val: 1, prog: 1 },
    ],
  };

  // 4. Grain Intensity Effect - Opacity tied to exposure (inverse)
  const grainIntensityRanges = [
    { key: 'opacity', val: params.grainVisibility * 0.05, prog: 0 },
    {
      key: 'opacity',
      val: params.grainVisibility * (0.15 + scaleValue(0.05)),
      prog: 0.2,
    }, // Higher when exposure drops
    { key: 'opacity', val: params.grainVisibility * 0.08, prog: 0.4 },
    {
      key: 'opacity',
      val: params.grainVisibility * (0.12 + scaleValue(0.03)),
      prog: 0.6,
    },
    { key: 'opacity', val: params.grainVisibility * 0.1, prog: 0.8 },
    { key: 'opacity', val: params.grainVisibility * 0.05, prog: 1 },
  ];

  const grainIntensityEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: ['vintage-grain-overlay'],
    ranges: grainIntensityRanges,
  };

  // 5. Dynamic Vignette Effect - Inversely tied to focus
  const vignetteOpacityRanges = [
    { key: 'opacity', val: 0.8 * finalIntensity, prog: 0 },
    { key: 'opacity', val: 0.5 * finalIntensity, prog: 0.15 }, // Softer when focus shifts
    { key: 'opacity', val: 0.9 * finalIntensity, prog: 0.3 },
    { key: 'opacity', val: 0.4 * finalIntensity, prog: 0.45 }, // Softer when blur is high
    { key: 'opacity', val: 0.7 * finalIntensity, prog: 0.6 },
    { key: 'opacity', val: 0.8 * finalIntensity, prog: 1 },
  ];

  const vignetteSoftnessEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: ['vintage-vignette-overlay'],
    ranges: vignetteOpacityRanges,
  };

  // 6. Optional Chromatic Aberration Effect
  const chromaticAberrationEffect: GenericEffectData | null =
    params.includeChromaticAberration
      ? {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: params.targetIds,
          ranges: [
            { key: 'translateX', val: scaleValue(-0.5), prog: 0 },
            { key: 'translateX', val: scaleValue(0.5), prog: 0.5 },
            { key: 'translateX', val: scaleValue(-0.5), prog: 1 },
          ],
        }
      : null;

  // Grain overlay container
  const grainOverlayContainer: RenderableComponentData = {
    id: 'vintage-grain-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
          zIndex: 1000,
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
      {
        id: 'vintage-grain-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <div style="
              width: 100%;
              height: 100%;
              background-image: 
                repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px),
                repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,.05) 2px, rgba(0,0,0,.05) 4px);
              background-size: 3px 3px;
              opacity: ${params.grainVisibility * 0.1};
              animation: grain 0.5s steps(10) infinite;
            "></div>
            <style>
              @keyframes grain {
                0%, 100% { transform: translate(0, 0); }
                10% { transform: translate(-1%, -1%); }
                20% { transform: translate(1%, 1%); }
                30% { transform: translate(-1%, 1%); }
                40% { transform: translate(1%, -1%); }
                50% { transform: translate(-1%, 0); }
                60% { transform: translate(1%, 0); }
                70% { transform: translate(0, -1%); }
                80% { transform: translate(0, 1%); }
                90% { transform: translate(-1%, -1%); }
              }
            </style>
          `,
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'grain-intensity-effect',
            componentId: 'generic',
            data: grainIntensityEffect,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Vignette overlay container
  const vignetteOverlayContainer: RenderableComponentData = {
    id: 'vintage-vignette-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 999,
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
      {
        id: 'vintage-vignette-overlay',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `
            <div style="
              width: 100%;
              height: 100%;
              background: radial-gradient(circle, transparent 40%, rgba(0,0,0,0.6) 100%);
              opacity: ${0.8 * finalIntensity};
            "></div>
          `,
          className: 'w-full h-full',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'vignette-softness-effect',
            componentId: 'generic',
            data: vignetteSoftnessEffect,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // Target component wrapper with effects
  const targetEffectsContainer: RenderableComponentData = {
    id: 'vintage-target-effects-wrapper',
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
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'gate-weave-effect',
        componentId: 'generic',
        data: gateWeaveEffect,
      },
      {
        id: 'focus-hunting-effect',
        componentId: 'generic',
        data: focusHuntingEffect,
      },
      {
        id: 'exposure-pumping-effect',
        componentId: 'generic',
        data: exposurePumpingEffect,
      },
      ...(chromaticAberrationEffect
        ? [
            {
              id: 'chromatic-aberration-effect',
              componentId: 'generic',
              data: chromaticAberrationEffect,
            },
          ]
        : []),
    ],
    childrenData: [],
  };

  // Root container combining all layers
  const rootContainer: RenderableComponentData = {
    id: 'vintage-projection-artifacts-root',
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
        duration: params.duration,
      },
    },
    childrenData: [
      targetEffectsContainer,
      vignetteOverlayContainer,
      grainOverlayContainer,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'VintageProjectionArtifacts',
  title: 'Vintage Projection Artifacts Combined Effect',
  description:
    'A comprehensive vintage film aging system that layers multiple authentic projection artifacts (gate weave, focus hunting, exposure pumping, dynamic vignetting, grain texture, optional chromatic aberration) into a cohesive vintage look with interconnected effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'vintage',
    'film',
    'projection',
    'artifacts',
    'grain',
    'vignette',
    'chromatic-aberration',
    'aging',
    'retro',
    'internal',
  ],
  dependencies: {},
  defaultInputParams: {
    projectionQuality: 'fair',
    artifactIntensity: 0.8,
    grainVisibility: 0.7,
    includeChromaticAberration: false,
    duration: 10,
    targetIds: ['example-target-1'],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

// Export preset
export const VintageProjectionArtifactsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
