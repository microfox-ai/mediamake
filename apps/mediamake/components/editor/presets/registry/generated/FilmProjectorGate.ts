/**
 * Film Projector Gate Internal Effect Preset
 *
 * This internal effect preset simulates the mechanical aspects of vintage film projection.
 * Creates an authentic film projector experience with coordinated visual effects including:
 * - Pulsing vignette that mimics the projector gate opening
 * - Sprocket hole shadows that move vertically along the edges
 * - Gate weave causing horizontal frame shifts (mechanical instability)
 * - Focus breathing with intermittent blur increases
 * - Subtle gate rotation for additional mechanical feel
 *
 * ARRAY OF EFFECTS:
 * Returns multiple coordinated effects that work together to create the film projection simulation.
 *
 * Features:
 * - **Gate Stability Control**: Stable, loose, or worn mechanical behavior
 * - **Vignette Intensity**: Configurable darkness of the vignette effect (0-1)
 * - **Sprocket Visibility**: None, subtle, or visible sprocket hole shadows
 * - **Focus Drift**: None, minimal, or moderate focus breathing
 * - **Coordinated Timing**: All effects synchronized for realistic projection feel
 *
 * Use cases:
 * - Adding vintage film projection aesthetic to videos
 * - Creating authentic retro film look
 * - Simulating old movie theater projection
 * - Adding mechanical imperfections to digital content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  gateStability: z
    .enum(['stable', 'loose', 'worn'])
    .describe(
      'Mechanical stability of the projector gate (stable = minimal movement, loose = moderate movement, worn = significant movement)',
    ),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .describe(
      'Intensity of the vignette effect where 0 is no vignette and 1 is maximum darkness',
    ),
  sprocketVisibility: z
    .enum(['none', 'subtle', 'visible'])
    .describe(
      'Visibility level of sprocket hole shadows along the edges (none = hidden, subtle = faint, visible = prominent)',
    ),
  focusDrift: z
    .enum(['none', 'minimal', 'moderate'])
    .describe(
      'Amount of focus breathing/drift in the projection (none = sharp focus, minimal = slight blur, moderate = noticeable blur)',
    ),
  duration: z
    .number()
    .describe('Duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the projection effects to'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    gateStability,
    vignetteIntensity,
    sprocketVisibility,
    focusDrift,
    duration,
    targetIds,
  } = params;

  // Helper function to calculate gate weave intensity based on stability
  const getWeaveIntensity = (
    stability: 'stable' | 'loose' | 'worn',
  ): { translateX: number[] } => {
    switch (stability) {
      case 'stable':
        return { translateX: [0, 1, -0.5, 0] };
      case 'loose':
        return { translateX: [0, 2, -1, 0] };
      case 'worn':
        return { translateX: [0, 3, -1.5, 0.5] };
    }
  };

  // Helper function to calculate rotation intensity based on stability
  const getRotationIntensity = (
    stability: 'stable' | 'loose' | 'worn',
  ): { rotate: number[] } => {
    switch (stability) {
      case 'stable':
        return { rotate: [-0.05, 0.05, -0.03] };
      case 'loose':
        return { rotate: [-0.1, 0.1, -0.05] };
      case 'worn':
        return { rotate: [-0.15, 0.12, -0.08] };
    }
  };

  // Helper function to calculate focus drift intensity
  const getFocusDriftIntensity = (
    drift: 'none' | 'minimal' | 'moderate',
  ): { blur: number[] } => {
    switch (drift) {
      case 'none':
        return { blur: [0, 0, 0, 0, 0] };
      case 'minimal':
        return { blur: [0, 1, 0, 1.5, 0] };
      case 'moderate':
        return { blur: [0, 1.5, 0, 2, 0] };
    }
  };

  // Helper function to calculate sprocket opacity
  const getSprocketOpacity = (
    visibility: 'none' | 'subtle' | 'visible',
  ): number => {
    switch (visibility) {
      case 'none':
        return 0;
      case 'subtle':
        return 0.15;
      case 'visible':
        return 0.35;
    }
  };

  const weaveValues = getWeaveIntensity(gateStability);
  const rotationValues = getRotationIntensity(gateStability);
  const focusValues = getFocusDriftIntensity(focusDrift);
  const sprocketOpacity = getSprocketOpacity(sprocketVisibility);

  // Create vignette overlay component
  const vignetteOverlay: RenderableComponentData = {
    id: 'film-projector-vignette',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${vignetteIntensity * 0.4}) 100%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Create sprocket hole overlays
  const sprocketLeftOverlay: RenderableComponentData = {
    id: 'film-projector-sprocket-left',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; left: 0; top: -100%; width: 32px; height: 300%; display: flex; flex-direction: column; gap: 20px; padding: 10px 0; opacity: ${sprocketOpacity};">${Array(30)
        .fill(0)
        .map(
          () =>
            '<div style="width: 20px; height: 12px; background: rgba(0,0,0,0.8); margin: 0 auto; border-radius: 2px;"></div>',
        )
        .join('')}</div>`,
      className: 'absolute inset-y-0 left-0',
      style: {
        width: '32px',
        overflow: 'hidden',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const sprocketRightOverlay: RenderableComponentData = {
    id: 'film-projector-sprocket-right',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; right: 0; top: -100%; width: 32px; height: 300%; display: flex; flex-direction: column; gap: 20px; padding: 10px 0; opacity: ${sprocketOpacity};">${Array(30)
        .fill(0)
        .map(
          () =>
            '<div style="width: 20px; height: 12px; background: rgba(0,0,0,0.8); margin: 0 auto; border-radius: 2px;"></div>',
        )
        .join('')}</div>`,
      className: 'absolute inset-y-0 right-0',
      style: {
        width: '32px',
        overflow: 'hidden',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Array to collect all effects
  const effects = [];

  // 1. Vignette pulse effect
  const vignettePulseEffect = {
    id: 'film-projector-vignette-pulse',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: ['film-projector-vignette'],
      ranges: [
        { key: 'opacity', val: 0.2, prog: 0 },
        { key: 'opacity', val: 0.25, prog: 0.5 },
        { key: 'opacity', val: 0.2, prog: 1 },
      ],
    } as GenericEffectData,
  };
  effects.push(vignettePulseEffect);

  // 2. Sprocket left scroll effect
  if (sprocketVisibility !== 'none') {
    const sprocketLeftScroll = {
      id: 'film-projector-sprocket-left-scroll',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: 2,
        mode: 'provider',
        targetIds: ['film-projector-sprocket-left'],
        ranges: [
          { key: 'translateY', val: 0, prog: 0, unit: 'px' },
          { key: 'translateY', val: 100, prog: 1, unit: 'px' },
        ],
      } as GenericEffectData,
    };
    effects.push(sprocketLeftScroll);

    // 3. Sprocket right scroll effect
    const sprocketRightScroll = {
      id: 'film-projector-sprocket-right-scroll',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: 2,
        mode: 'provider',
        targetIds: ['film-projector-sprocket-right'],
        ranges: [
          { key: 'translateY', val: 0, prog: 0, unit: 'px' },
          { key: 'translateY', val: 100, prog: 1, unit: 'px' },
        ],
      } as GenericEffectData,
    };
    effects.push(sprocketRightScroll);
  }

  // 4. Gate weave effect (horizontal shift)
  if (targetIds.length > 0) {
    const gateWeaveEffect = {
      id: 'film-projector-gate-weave',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          {
            key: 'translateX',
            val: weaveValues.translateX[0],
            prog: 0,
            unit: 'px',
          },
          {
            key: 'translateX',
            val: weaveValues.translateX[1],
            prog: 0.3,
            unit: 'px',
          },
          {
            key: 'translateX',
            val: weaveValues.translateX[2],
            prog: 0.6,
            unit: 'px',
          },
          {
            key: 'translateX',
            val: weaveValues.translateX[3],
            prog: 1,
            unit: 'px',
          },
        ],
      } as GenericEffectData,
    };
    effects.push(gateWeaveEffect);

    // 5. Focus breathing effect
    if (focusDrift !== 'none') {
      const focusBreathingEffect = {
        id: 'film-projector-focus-breathing',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: targetIds,
          ranges: [
            { key: 'blur', val: focusValues.blur[0], prog: 0, unit: 'px' },
            { key: 'blur', val: focusValues.blur[1], prog: 0.25, unit: 'px' },
            { key: 'blur', val: focusValues.blur[2], prog: 0.5, unit: 'px' },
            { key: 'blur', val: focusValues.blur[3], prog: 0.75, unit: 'px' },
            { key: 'blur', val: focusValues.blur[4], prog: 1, unit: 'px' },
          ],
        } as GenericEffectData,
      };
      effects.push(focusBreathingEffect);
    }

    // 6. Gate rotation effect
    const gateRotationEffect = {
      id: 'film-projector-gate-rotation',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: targetIds,
        ranges: [
          {
            key: 'rotate',
            val: rotationValues.rotate[0],
            prog: 0,
            unit: 'deg',
          },
          {
            key: 'rotate',
            val: rotationValues.rotate[1],
            prog: 0.5,
            unit: 'deg',
          },
          {
            key: 'rotate',
            val: rotationValues.rotate[2],
            prog: 1,
            unit: 'deg',
          },
        ],
      } as GenericEffectData,
    };
    effects.push(gateRotationEffect);
  }

  // Build children array with overlays
  const childrenData: RenderableComponentData[] = [
    vignetteOverlay,
    ...(sprocketVisibility !== 'none'
      ? [sprocketLeftOverlay, sprocketRightOverlay]
      : []),
  ];

  // Root container with all effects
  const rootContainer: RenderableComponentData = {
    id: 'film-projector-gate-root',
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
    effects: effects,
    childrenData: childrenData,
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
  id: 'FilmProjectorGate',
  title: 'Film Projector Gate Effect',
  description:
    'Internal effect preset that simulates vintage film projection mechanics including gate weave, sprocket shadows, vignette pulse, focus breathing, and gate instability. Creates the authentic feel of content being physically projected through vintage equipment.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'internal',
    'film',
    'projector',
    'vintage',
    'gate',
    'sprocket',
    'vignette',
    'mechanical',
    'retro',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    gateStability: 'loose',
    vignetteIntensity: 0.6,
    sprocketVisibility: 'subtle',
    focusDrift: 'minimal',
    duration: 10,
    targetIds: [],
  },
};

// Export preset
export const FilmProjectorGatePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
