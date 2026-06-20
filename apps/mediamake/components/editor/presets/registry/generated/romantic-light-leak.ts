/**
 * Romantic Light Leak Overlay Preset
 *
 * A soft, dreamy light leak effect with gossamer-quality warm glows and floating bokeh circles.
 * Creates a tender, nostalgic atmosphere perfect for wedding videos, love stories, and emotional moments.
 *
 * Features:
 * - Layered structure with 3-4 BaseLayout containers at decreasing opacity (0.3, 0.2, 0.1)
 * - Soft radial gradients in warm palette (peach, rose, gold)
 * - Large blur filters (40-60px) for gossamer quality
 * - 6 floating bokeh circles with gentle drift animations
 * - Subtle bloom effect (blur + brightness + contrast)
 * - Soft-light and overlay blend modes for watercolor blending
 * - Gentle pulse animations (scale 1 to 1.05 over 4s)
 * - Smooth drift patterns over 6-8s with bezier curves
 * - Performance-optimized (opacity and transform only)
 *
 * Use cases:
 * - Wedding video overlays
 * - Romantic montages
 * - Love story intros/outros
 * - Emotional/contemplative scenes
 * - Intimate moment enhancements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  trackName: z
    .string()
    .default('romantic-light-leak')
    .describe('Name of the track (used for component IDs)'),
  duration: z
    .number()
    .positive()
    .default(30)
    .describe('Duration of the light leak effect in seconds'),
  opacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Overall opacity of the light leak effect (0-1)'),
  intensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for glow and bokeh opacity'),
  bokehCount: z
    .number()
    .int()
    .min(0)
    .max(12)
    .default(6)
    .describe('Number of floating bokeh circles (0-12)'),
  enablePulse: z
    .boolean()
    .default(true)
    .describe('Enable subtle pulse/scale animation on glow layers'),
  enableDrift: z
    .boolean()
    .default(true)
    .describe('Enable gentle drift animation on bokeh circles'),
  blendMode: z
    .enum(['overlay', 'soft-light', 'screen', 'lighten'])
    .default('overlay')
    .describe('Blend mode for the overall effect'),
  bloomIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1.2)
    .describe('Brightness intensity for bloom effect (1 = normal)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackName,
    duration,
    opacity,
    intensity,
    bokehCount,
    enablePulse,
    enableDrift,
    blendMode,
    bloomIntensity,
  } = params;

  // Helper: Create glow shapes with radial gradients
  const createGlowShape = (config: {
    id: string;
    width: string;
    height: string;
    top: string;
    left: string;
    right?: string;
    bottom?: string;
    gradient: string;
    blur: number;
  }): RenderableComponentData => {
    return {
      id: config.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: config.width,
          height: config.height,
          top: config.top,
          ...(config.left ? { left: config.left } : {}),
          ...(config.right ? { right: config.right } : {}),
          ...(config.bottom ? { bottom: config.bottom } : {}),
          background: config.gradient,
          filter: `blur(${config.blur}px)`,
          borderRadius: '50%',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    };
  };

  // Helper: Create bokeh circle
  const createBokehCircle = (config: {
    id: string;
    size: number;
    top: string;
    left?: string;
    right?: string;
    gradient: string;
    opacity: number;
    driftDuration: number;
    driftX: number;
    driftY: number;
  }): RenderableComponentData => {
    const bokehEffects = [];

    if (enableDrift) {
      // Gentle drift animation
      bokehEffects.push({
        id: `${config.id}-drift`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: config.driftDuration,
          mode: 'provider',
          targetIds: [config.id],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: config.driftX, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: config.driftY, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      });
    }

    return {
      id: config.id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute rounded-full',
        style: {
          width: `${config.size}px`,
          height: `${config.size}px`,
          top: config.top,
          ...(config.left ? { left: config.left } : {}),
          ...(config.right ? { right: config.right } : {}),
          background: config.gradient,
          opacity: config.opacity * intensity,
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: bokehEffects,
    };
  };

  // Layer 1: Primary glow shapes (opacity 0.3)
  const layer1Effects = [];
  if (enablePulse) {
    layer1Effects.push({
      id: `${trackName}-layer1-pulse`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: 4,
        mode: 'provider',
        targetIds: [`${trackName}-layer1`],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
  }

  const layer1: RenderableComponentData = {
    id: `${trackName}-layer1`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          opacity: 0.3 * opacity * intensity,
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: layer1Effects,
    childrenData: [
      createGlowShape({
        id: `${trackName}-glow1`,
        width: '60%',
        height: '80%',
        top: '-10%',
        right: '-20%',
        left: 'auto',
        gradient:
          'radial-gradient(ellipse at center, rgba(255,218,185,0.8) 0%, rgba(255,182,193,0.4) 40%, transparent 70%)',
        blur: 50,
      }),
      createGlowShape({
        id: `${trackName}-glow2`,
        width: '50%',
        height: '60%',
        top: 'auto',
        bottom: '10%',
        left: '-15%',
        gradient:
          'radial-gradient(ellipse at center, rgba(255,215,0,0.6) 0%, rgba(255,218,185,0.3) 50%, transparent 80%)',
        blur: 45,
      }),
    ],
  };

  // Layer 2: Secondary glow shapes (opacity 0.2)
  const layer2Effects = [];
  if (enablePulse) {
    layer2Effects.push({
      id: `${trackName}-layer2-pulse`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 1,
        duration: 4,
        mode: 'provider',
        targetIds: [`${trackName}-layer2`],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
  }

  const layer2: RenderableComponentData = {
    id: `${trackName}-layer2`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          opacity: 0.2 * opacity * intensity,
          mixBlendMode: blendMode,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: layer2Effects,
    childrenData: [
      createGlowShape({
        id: `${trackName}-glow3`,
        width: '70%',
        height: '50%',
        top: '20%',
        left: '40%',
        gradient:
          'radial-gradient(ellipse at center, rgba(255,182,193,0.7) 0%, rgba(255,218,185,0.35) 45%, transparent 75%)',
        blur: 55,
      }),
      createGlowShape({
        id: `${trackName}-glow4`,
        width: '40%',
        height: '70%',
        top: '-5%',
        left: '10%',
        gradient:
          'radial-gradient(ellipse at center, rgba(255,215,0,0.5) 0%, rgba(255,182,193,0.25) 50%, transparent 80%)',
        blur: 60,
      }),
    ],
  };

  // Layer 3: Tertiary glow shapes (opacity 0.1)
  const layer3Effects = [];
  if (enablePulse) {
    layer3Effects.push({
      id: `${trackName}-layer3-pulse`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 2,
        duration: 4,
        mode: 'provider',
        targetIds: [`${trackName}-layer3`],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
  }

  const layer3: RenderableComponentData = {
    id: `${trackName}-layer3`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          opacity: 0.1 * opacity * intensity,
          mixBlendMode: 'soft-light',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: layer3Effects,
    childrenData: [
      createGlowShape({
        id: `${trackName}-glow5`,
        width: '80%',
        height: '90%',
        top: '5%',
        left: '15%',
        gradient:
          'radial-gradient(ellipse at center, rgba(255,218,185,0.6) 0%, rgba(255,215,0,0.2) 60%, transparent 85%)',
        blur: 40,
      }),
    ],
  };

  // Bokeh circles
  const bokehCircles: RenderableComponentData[] = [];
  const bokehConfigs = [
    { size: 80, top: '15%', left: '20%', color: 'peach', driftX: 30, driftY: -20, duration: 7 },
    { size: 50, top: '35%', right: '25%', color: 'rose', driftX: -25, driftY: 15, duration: 6.5 },
    { size: 35, bottom: '25%', left: '60%', color: 'gold', driftX: 20, driftY: -30, duration: 8 },
    { size: 60, top: '60%', left: '10%', color: 'peach', driftX: -15, driftY: 25, duration: 7.5 },
    { size: 25, top: '10%', right: '15%', color: 'rose', driftX: 35, driftY: 20, duration: 6 },
    { size: 45, bottom: '15%', right: '30%', color: 'gold', driftX: -20, driftY: -25, duration: 8 },
  ];

  const colorGradients = {
    peach: 'radial-gradient(circle at 30% 30%, rgba(255,218,185,0.8) 0%, rgba(255,218,185,0.3) 40%, transparent 70%)',
    rose: 'radial-gradient(circle at 30% 30%, rgba(255,182,193,0.7) 0%, rgba(255,182,193,0.25) 45%, transparent 75%)',
    gold: 'radial-gradient(circle at 30% 30%, rgba(255,215,0,0.6) 0%, rgba(255,215,0,0.2) 50%, transparent 80%)',
  };

  for (let i = 0; i < Math.min(bokehCount, bokehConfigs.length); i++) {
    const config = bokehConfigs[i];
    bokehCircles.push(
      createBokehCircle({
        id: `${trackName}-bokeh${i + 1}`,
        size: config.size,
        top: config.top || 'auto',
        left: config.left,
        right: config.right,
        gradient: colorGradients[config.color as keyof typeof colorGradients],
        opacity: 0.5,
        driftDuration: config.duration,
        driftX: config.driftX,
        driftY: config.driftY,
      }),
    );
  }

  const bokehContainer: RenderableComponentData = {
    id: `${trackName}-bokeh-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: blendMode,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: bokehCircles,
  };

  // Root container with bloom effect
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: blendMode,
          filter: `blur(2px) brightness(${bloomIntensity}) contrast(0.9)`,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [layer1, layer2, layer3, bokehContainer],
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
  id: 'romantic-light-leak',
  title: 'Romantic Light Leak Overlay',
  description:
    'A soft, dreamy light leak effect with gossamer-quality warm glows and floating bokeh circles. Features layered peach, rose, and gold radial gradients with gentle drift animations. Perfect for wedding videos, love stories, and emotional moments. Includes bloom effect and subtle pulsing for a nostalgic, tender atmosphere.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'overlay',
    'light-leak',
    'romantic',
    'dreamy',
    'bokeh',
    'glow',
    'wedding',
    'love',
    'emotional',
    'warm',
    'soft',
    'tender',
    'nostalgic',
  ],
  defaultInputParams: {
    trackName: 'romantic-light-leak',
    duration: 30,
    opacity: 0.5,
    intensity: 1,
    bokehCount: 6,
    enablePulse: true,
    enableDrift: true,
    blendMode: 'overlay',
    bloomIntensity: 1.2,
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const romanticLightLeakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
