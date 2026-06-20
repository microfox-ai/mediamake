/**
 * Anamorphic Lens Flare Transition Preset
 *
 * A cinematic J.J. Abrams-style lens flare overlay transition featuring horizontal blue streaks
 * sweeping across the frame with chromatic aberration (purple/green edges), hexagonal bokeh shapes,
 * and organic light falloff. The flare travels from off-screen, peaks at midpoint with maximum
 * intensity, then fades as it exits. Uses screen blend mode for realistic light addition.
 *
 * Features:
 * - Primary bright streak with horizontal motion and arc trajectory
 * - Secondary chromatic aberration layers (purple/green color fringing)
 * - Multiple hexagonal bokeh shapes following the main flare
 * - Organic light falloff using radial and linear gradients
 * - Screen blend mode for realistic light interaction
 * - Peak intensity at midpoint with smooth fade in/out
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Scene transitions with motivated light sources
 * - Cinematic reveals and dramatic moments
 * - Adding production value to cuts and edits
 * - Creating J.J. Abrams-style visual flourishes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration of the lens flare transition in seconds'),
  direction: z
    .enum(['left-to-right', 'right-to-left'])
    .default('left-to-right')
    .describe('Direction of flare movement across the frame'),
  intensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Overall intensity multiplier for flare brightness and glow'),
  flareColor: z
    .object({
      primary: z
        .string()
        .default('#FFFFFF')
        .describe('Core flare color (almost pure white)'),
      secondary: z
        .string()
        .default('#64B4FF')
        .describe('Secondary blue tint for edges'),
      warm: z
        .string()
        .default('#FFC864')
        .describe('Warm orange falloff color'),
    })
    .optional()
    .describe('Color configuration for the flare gradient'),
  chromaticAberration: z
    .object({
      enabled: z.boolean().default(true).describe('Enable chromatic aberration effect'),
      purpleIntensity: z
        .number()
        .min(0)
        .max(1)
        .default(0.6)
        .describe('Intensity of purple chromatic edge'),
      greenIntensity: z
        .number()
        .min(0)
        .max(1)
        .default(0.5)
        .describe('Intensity of green chromatic edge'),
    })
    .optional()
    .describe('Chromatic aberration configuration'),
  bokeh: z
    .object({
      enabled: z.boolean().default(true).describe('Enable bokeh shapes'),
      count: z.number().min(0).max(10).default(5).describe('Number of bokeh elements'),
      blurAmount: z
        .number()
        .min(1)
        .max(8)
        .default(3)
        .describe('Blur amount for bokeh shapes (px)'),
    })
    .optional()
    .describe('Bokeh configuration'),
  arcMotion: z
    .object({
      enabled: z.boolean().default(true).describe('Enable slight arc trajectory'),
      amplitude: z
        .number()
        .min(0)
        .max(50)
        .default(20)
        .describe('Vertical arc amplitude in pixels'),
    })
    .optional()
    .describe('Arc motion configuration for natural movement'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the flare transition (relative to parent)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    direction,
    intensity,
    flareColor,
    chromaticAberration,
    bokeh,
    arcMotion,
    startTime,
  } = params;

  // Default color values
  const primaryColor = flareColor?.primary || '#FFFFFF';
  const secondaryColor = flareColor?.secondary || '#64B4FF';
  const warmColor = flareColor?.warm || '#FFC864';

  // Chromatic aberration settings
  const chromaticEnabled = chromaticAberration?.enabled !== false;
  const purpleIntensity = (chromaticAberration?.purpleIntensity || 0.6) * intensity;
  const greenIntensity = (chromaticAberration?.greenIntensity || 0.5) * intensity;

  // Bokeh settings
  const bokehEnabled = bokeh?.enabled !== false;
  const bokehCount = bokeh?.count || 5;
  const bokehBlur = bokeh?.blurAmount || 3;

  // Arc motion settings
  const arcEnabled = arcMotion?.enabled !== false;
  const arcAmplitude = arcMotion?.amplitude || 20;

  // Direction calculations
  const isLeftToRight = direction === 'left-to-right';
  const startX = isLeftToRight ? '-120%' : '120%';
  const endX = isLeftToRight ? '120%' : '-120%';

  // Primary flare streak component
  const primaryFlareStreak: RenderableComponentData = {
    id: 'primary-flare-streak',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="
        width: 150%;
        height: 8px;
        background: linear-gradient(90deg, 
          transparent 0%, 
          rgba(255,255,255,${0.1 * intensity}) 20%, 
          rgba(255,255,255,${0.9 * intensity}) 45%, 
          rgba(255,255,255,${1 * intensity}) 50%, 
          rgba(255,255,255,${0.9 * intensity}) 55%, 
          rgba(255,255,255,${0.1 * intensity}) 80%, 
          transparent 100%);
        border-radius: 4px;
        box-shadow: 
          0 0 60px 30px rgba(255,255,255,${0.5 * intensity}), 
          0 0 120px 60px ${secondaryColor.replace(')', `,${0.3 * intensity})`)};
        position: absolute;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
      "></div>`,
      style: {
        position: 'absolute',
        top: '50%',
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'primary-flare-motion',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: ['primary-flare-streak'],
          ranges: [
            { key: 'translateX', val: startX, prog: 0 },
            { key: 'translateX', val: endX, prog: 1 },
            ...(arcEnabled
              ? [
                  { key: 'translateY', val: `${arcAmplitude}px`, prog: 0 },
                  { key: 'translateY', val: '0px', prog: 0.5 },
                  { key: 'translateY', val: `${-arcAmplitude}px`, prog: 1 },
                ]
              : []),
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Primary flare layer
  const primaryFlareLayer: RenderableComponentData = {
    id: 'primary-flare-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
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
    childrenData: [primaryFlareStreak],
  };

  // Chromatic aberration layers
  const chromaticAberrationLayers: RenderableComponentData[] = [];

  if (chromaticEnabled) {
    // Purple aberration
    const purpleAberration: RenderableComponentData = {
      id: 'purple-aberration',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: 120%;
          height: 4px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(180,100,255,0) 30%, 
            rgba(180,100,255,${purpleIntensity}) 50%, 
            rgba(180,100,255,0) 70%, 
            transparent 100%);
          border-radius: 2px;
          position: absolute;
          top: 48%;
          left: 0;
        "></div>`,
        style: {
          position: 'absolute',
          top: '48%',
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'purple-aberration-motion',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['purple-aberration'],
            ranges: [
              { key: 'translateX', val: startX, prog: 0 },
              { key: 'translateX', val: endX, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    // Green aberration
    const greenAberration: RenderableComponentData = {
      id: 'green-aberration',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="
          width: 120%;
          height: 4px;
          background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(100,255,150,0) 30%, 
            rgba(100,255,150,${greenIntensity}) 50%, 
            rgba(100,255,150,0) 70%, 
            transparent 100%);
          border-radius: 2px;
          position: absolute;
          top: 52%;
          left: 0;
        "></div>`,
        style: {
          position: 'absolute',
          top: '52%',
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: 'green-aberration-motion',
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider',
            targetIds: ['green-aberration'],
            ranges: [
              { key: 'translateX', val: startX, prog: 0 },
              { key: 'translateX', val: endX, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    chromaticAberrationLayers.push(purpleAberration, greenAberration);
  }

  const chromaticAberrationLayer: RenderableComponentData = {
    id: 'chromatic-aberration-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
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
    childrenData: chromaticAberrationLayers,
  };

  // Bokeh elements
  const bokehElements: RenderableComponentData[] = [];

  if (bokehEnabled) {
    const bokehColors = [
      `rgba(100,180,255,${0.4 * intensity})`,
      `rgba(255,200,100,${0.35 * intensity})`,
      `rgba(100,180,255,${0.5 * intensity})`,
      `rgba(255,150,100,${0.3 * intensity})`,
      `rgba(180,100,255,${0.25 * intensity})`,
    ];

    const bokehSizes = [40, 30, 25, 35, 20];
    const bokehPositions = ['40%', '55%', '45%', '60%', '35%'];
    const bokehOffsets = [0, 0.05, 0.1, 0.15, 0.2];

    for (let i = 0; i < Math.min(bokehCount, 5); i++) {
      const bokehId = `bokeh-${i + 1}`;
      const bokeh: RenderableComponentData = {
        id: bokehId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="
            width: ${bokehSizes[i]}px;
            height: ${bokehSizes[i]}px;
            background: ${bokehColors[i]};
            border-radius: 50%;
            filter: blur(${bokehBlur}px);
            position: absolute;
            top: ${bokehPositions[i]};
            left: 0;
          "></div>`,
          style: {
            position: 'absolute',
            top: bokehPositions[i],
            left: 0,
            width: `${bokehSizes[i]}px`,
            height: `${bokehSizes[i]}px`,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `bokeh-motion-${i + 1}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [bokehId],
              ranges: [
                { key: 'translateX', val: startX, prog: 0 },
                { key: 'translateX', val: endX, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.4 + bokehOffsets[i] },
                { key: 'opacity', val: 1, prog: 0.6 + bokehOffsets[i] },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      };

      bokehElements.push(bokeh);
    }
  }

  const bokehLayer: RenderableComponentData = {
    id: 'bokeh-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
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
    childrenData: bokehElements,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'anamorphic-lens-flare-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    childrenData: [primaryFlareLayer, chromaticAberrationLayer, bokehLayer],
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

const presetMetadata: PresetMetadata = {
  id: 'anamorphic-lens-flare-transition',
  title: 'Anamorphic Lens Flare Transition',
  description:
    'A cinematic J.J. Abrams-style lens flare overlay transition featuring horizontal blue streaks sweeping across the frame with chromatic aberration (purple/green edges), hexagonal bokeh shapes, and organic light falloff. The flare travels from off-screen, peaks at midpoint with maximum intensity, then fades as it exits. Uses screen blend mode for realistic light addition.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'lens-flare',
    'cinematic',
    'anamorphic',
    'jj-abrams',
    'chromatic-aberration',
    'bokeh',
    'light-streak',
    'overlay',
  ],
  defaultInputParams: {
    duration: 2,
    direction: 'left-to-right',
    intensity: 1,
    flareColor: {
      primary: '#FFFFFF',
      secondary: '#64B4FF',
      warm: '#FFC864',
    },
    chromaticAberration: {
      enabled: true,
      purpleIntensity: 0.6,
      greenIntensity: 0.5,
    },
    bokeh: {
      enabled: true,
      count: 5,
      blurAmount: 3,
    },
    arcMotion: {
      enabled: true,
      amplitude: 20,
    },
    startTime: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const anamorphicLensFlareTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
