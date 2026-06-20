/**
 * Cinematic Lens Flare Burst Preset
 *
 * High-energy, action-oriented lens flare burst effect that creates a dramatic explosion
 * of light. This preset mimics the intense flare bursts seen in superhero movies during
 * power-up sequences, with radial light rays, hexagonal bokeh artifacts, circular halos,
 * and anamorphic streaks.
 *
 * Features:
 * - Central core burst that rapidly expands and collapses
 * - 8 radial light rays extending outward at different angles
 * - Hexagonal iris bokeh shapes for lens artifacts
 * - Circular halos with animated scale and opacity
 * - Anamorphic horizontal streak with blue tint
 * - Camera shake effect for added impact
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Emphasizing dramatic moments in action sequences
 * - Beat drops in music videos
 * - Power-up or transformation sequences
 * - Impactful transitions between scenes
 * - High-energy title reveals
 *
 * The entire burst sequence completes in approximately 0.8 seconds, with overlapping
 * phases for a cohesive visual experience. Camera shake is applied to the root container
 * to amplify the feeling of a powerful light explosion.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  trackName: z
    .string()
    .default('lens-flare-burst')
    .describe('Name of the track (used for component IDs)'),
  startTime: z
    .number()
    .default(0)
    .describe('Start time for the lens flare burst effect'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for the effect (0.5 = subtle, 2 = extreme)'),
  color: z
    .string()
    .default('#ffffff')
    .describe('Primary color of the flare (hex color)'),
  duration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Total duration of the flare burst effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { trackName, startTime, intensity, color, duration } = params;

  // Calculate timing phases based on duration and intensity
  const expandDuration = duration * 0.3; // Core expansion: 30% of total
  const holdDuration = duration * 0.1; // Hold at peak: 10% of total
  const collapseDuration = duration * 0.6; // Collapse: 60% of total

  const rayStartDelay = 0.05; // Rays start shortly after core
  const rayExpandDuration = 0.3;
  const rayStagger = 0.02; // Delay between each ray

  const artifactStartDelay = 0.1; // Artifacts appear slightly after rays
  const artifactFadeDuration = 0.3;

  const shakeStartDelay = 0;
  const shakeDuration = 0.3;
  const shakeIterations = 4;

  // Core burst component
  const coreBurst: RenderableComponentData = {
    id: `${trackName}-core-burst`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute w-4 h-4 rounded-full',
        style: {
          backgroundColor: color,
          boxShadow: `0 0 ${60 * intensity}px ${30 * intensity}px ${color}80, 0 0 ${100 * intensity}px ${60 * intensity}px ${color}40`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        },
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
        id: `${trackName}-core-burst-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: expandDuration,
          mode: 'provider',
          targetIds: [`${trackName}-core-burst`],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 50 * intensity, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-core-burst-collapse`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: expandDuration + holdDuration,
          duration: collapseDuration,
          mode: 'provider',
          targetIds: [`${trackName}-core-burst`],
          ranges: [
            { key: 'scale', val: 50 * intensity, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Create 8 radial rays
  const rayAngles = [0, 45, 90, 135, 180, 225, 270, 315];
  const rays: RenderableComponentData[] = rayAngles.map((angle, index) => {
    const rayId = `${trackName}-ray-${index}`;
    return {
      id: rayId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-[3px] w-[50vw]',
          style: {
            background: `linear-gradient(to right, ${color}E6, ${color}4D, transparent)`,
            left: '50%',
            top: '50%',
            transformOrigin: 'left center',
            transform: `translate(0, -50%) rotate(${angle}deg)`,
          },
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
          id: `${rayId}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: rayStartDelay + index * rayStagger,
            duration: rayExpandDuration,
            mode: 'provider',
            targetIds: [rayId],
            ranges: [
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: `${rayId}-collapse`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: expandDuration + holdDuration,
            duration: collapseDuration,
            mode: 'provider',
            targetIds: [rayId],
            ranges: [
              { key: 'scaleX', val: 1, prog: 0 },
              { key: 'scaleX', val: 0, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };
  });

  // Hexagonal bokeh artifacts
  const bokehHex1: RenderableComponentData = {
    id: `${trackName}-bokeh-hex-1`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '40px',
          height: '40px',
          backgroundColor: `${color}33`,
          clipPath:
            'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          top: '30%',
          left: '60%',
          filter: 'blur(1px)',
        },
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
        id: `${trackName}-bokeh-hex-1-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: artifactStartDelay,
          duration: artifactFadeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-bokeh-hex-1`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.6 * intensity, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-bokeh-hex-1-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: expandDuration + holdDuration,
          duration: collapseDuration,
          mode: 'provider',
          targetIds: [`${trackName}-bokeh-hex-1`],
          ranges: [
            { key: 'opacity', val: 0.6 * intensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  const bokehHex2: RenderableComponentData = {
    id: `${trackName}-bokeh-hex-2`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '25px',
          height: '25px',
          backgroundColor: `${color}26`,
          clipPath:
            'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          top: '65%',
          left: '35%',
          filter: 'blur(1px)',
        },
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
        id: `${trackName}-bokeh-hex-2-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: artifactStartDelay + 0.05,
          duration: artifactFadeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-bokeh-hex-2`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5 * intensity, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-bokeh-hex-2-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: expandDuration + holdDuration,
          duration: collapseDuration,
          mode: 'provider',
          targetIds: [`${trackName}-bokeh-hex-2`],
          ranges: [
            { key: 'opacity', val: 0.5 * intensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Circular halos
  const haloPrimary: RenderableComponentData = {
    id: `${trackName}-halo-primary`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute rounded-full',
        style: {
          width: '200px',
          height: '200px',
          border: `2px solid ${color}4D`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        },
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
        id: `${trackName}-halo-primary-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: artifactStartDelay,
          duration: artifactFadeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-halo-primary`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7 * intensity, prog: 1 },
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.5, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-halo-primary-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: expandDuration + holdDuration,
          duration: collapseDuration,
          mode: 'provider',
          targetIds: [`${trackName}-halo-primary`],
          ranges: [
            { key: 'opacity', val: 0.7 * intensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1.5, prog: 0 },
            { key: 'scale', val: 2, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  const haloSecondary: RenderableComponentData = {
    id: `${trackName}-halo-secondary`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute rounded-full',
        style: {
          width: '350px',
          height: '350px',
          border: `1px solid ${color}26`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        },
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
        id: `${trackName}-halo-secondary-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: artifactStartDelay + 0.05,
          duration: artifactFadeDuration,
          mode: 'provider',
          targetIds: [`${trackName}-halo-secondary`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5 * intensity, prog: 1 },
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'scale', val: 1.2, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-halo-secondary-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: expandDuration + holdDuration,
          duration: collapseDuration,
          mode: 'provider',
          targetIds: [`${trackName}-halo-secondary`],
          ranges: [
            { key: 'opacity', val: 0.5 * intensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1.2, prog: 0 },
            { key: 'scale', val: 1.8, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Anamorphic horizontal streak
  const anamorphicStreak: RenderableComponentData = {
    id: `${trackName}-anamorphic-streak`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '100vw',
          height: '4px',
          background: `linear-gradient(to right, transparent, rgba(135,206,250,${0.4 * intensity}), ${color}99, rgba(135,206,250,${0.4 * intensity}), transparent)`,
          left: '0',
          top: '50%',
          transform: 'translateY(-50%)',
        },
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
        id: `${trackName}-anamorphic-streak-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: rayStartDelay,
          duration: rayExpandDuration,
          mode: 'provider',
          targetIds: [`${trackName}-anamorphic-streak`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scaleX', val: 0, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-anamorphic-streak-fade-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: expandDuration + holdDuration,
          duration: collapseDuration,
          mode: 'provider',
          targetIds: [`${trackName}-anamorphic-streak`],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Camera shake effect
  const cameraShakeEffect = {
    id: `${trackName}-camera-shake`,
    componentId: 'shake',
    data: {
      type: 'linear',
      start: shakeStartDelay,
      duration: shakeDuration,
      mode: 'provider',
      targetIds: [`${trackName}-burst-container`],
      amplitude: 10 * intensity,
      frequency: 0.1,
      decay: true,
      axis: 'both' as const,
    },
  };

  // Burst container with all visual elements
  const burstContainer: RenderableComponentData = {
    id: `${trackName}-burst-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [cameraShakeEffect],
    childrenData: [
      coreBurst,
      ...rays,
      haloPrimary,
      haloSecondary,
      bokehHex1,
      bokehHex2,
      anamorphicStreak,
    ] as RenderableComponentData[],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'fixed inset-0 flex items-center justify-center overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    childrenData: [burstContainer],
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
  id: 'cinematic-lens-flare-burst',
  title: 'Cinematic Lens Flare Burst',
  description:
    'High-energy, action-oriented lens flare burst effect with radial light explosion, hexagonal bokeh, circular halos, anamorphic streaks, and camera shake. Designed for dramatic moments, beat drops, and superhero-style power-up sequences.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'effects',
    'lens-flare',
    'burst',
    'cinematic',
    'action',
    'dramatic',
    'light',
    'explosion',
    'superhero',
    'power-up',
  ],
  defaultInputParams: {
    trackName: 'lens-flare-burst',
    startTime: 0,
    intensity: 1,
    color: '#ffffff',
    duration: 1,
  },
  dependencies: {},
};

// Export preset
export const cinematicLensFlareBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
