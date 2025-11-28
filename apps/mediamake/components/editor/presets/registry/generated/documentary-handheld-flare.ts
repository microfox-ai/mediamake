/**
 * Documentary Handheld Lens Flare Preset
 *
 * Creates an authentic documentary-style lens flare effect that mimics unplanned camera movement
 * past a bright light source. Features include:
 *
 * - Handheld camera shake with micro-movements and organic acceleration
 * - Quick sweep motion across the frame (0.6-0.8s)
 * - Irregular light distribution using conic gradient for realistic flare
 * - Momentary sensor overload (white flash) at peak intensity
 * - Chromatic aberration (RGB separation/color fringing)
 * - Lens dust particles that become visible when backlit
 * - Imperfect timing with jarring movements using steps() easing
 * - Raw, immediate aesthetic for found footage/verité style
 *
 * Use cases:
 * - Documentary-style transitions
 * - Authentic camera feel overlays
 * - Raw/unpolished visual moments
 * - Verité filmmaking effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  trackName: z
    .string()
    .default('documentary-flare')
    .describe('Name/ID prefix for the flare track'),
  sweepDuration: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(0.7)
    .describe('Duration of the main flare sweep in seconds'),
  startDelay: z
    .number()
    .min(0)
    .default(0.1)
    .describe('Delay before flare sweep starts (seconds)'),
  peakFlashIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .describe('Maximum opacity of the overexposure flash (0-1)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .describe('Intensity of handheld shake in pixels'),
  dustParticleCount: z
    .number()
    .int()
    .min(0)
    .max(20)
    .default(6)
    .describe('Number of lens dust particles to display'),
  colorFringingAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Amount of chromatic aberration offset in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    trackName,
    sweepDuration,
    startDelay,
    peakFlashIntensity,
    shakeIntensity,
    dustParticleCount,
    colorFringingAmount,
  } = params;

  const fps = props.config?.fps || 30;
  const totalDuration = startDelay + sweepDuration + 0.3; // Extra time for shake settling

  // Helper: Generate random position for dust particles
  const generateDustParticle = (index: number) => {
    const positions = [
      { top: '25%', left: '35%' },
      { top: '45%', left: '55%' },
      { top: '60%', left: '42%' },
      { top: '35%', left: '62%' },
      { top: '52%', left: '30%' },
      { top: '20%', left: '48%' },
      { top: '70%', left: '65%' },
      { top: '15%', left: '25%' },
      { top: '80%', left: '50%' },
      { top: '40%', left: '70%' },
      { top: '55%', left: '20%' },
      { top: '30%', left: '80%' },
      { top: '65%', left: '38%' },
      { top: '18%', left: '60%' },
      { top: '75%', left: '45%' },
      { top: '48%', left: '15%' },
      { top: '62%', left: '75%' },
      { top: '28%', left: '40%' },
      { top: '85%', left: '30%' },
      { top: '38%', left: '68%' },
    ];

    const position = positions[index % positions.length];
    const size = 2 + Math.floor(index % 3); // 2px, 3px, or 4px

    return {
      id: `${trackName}-dust-particle-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.1)',
            top: position.top,
            left: position.left,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `${trackName}-dust-particle-${index}-glow`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: startDelay + 0.12 * index,
            duration: sweepDuration * 0.6,
            mode: 'provider',
            targetIds: [`${trackName}-dust-particle-${index}`],
            ranges: [
              { key: 'opacity', val: 0.1, prog: 0 },
              { key: 'opacity', val: 0.4 + 0.1 * (index % 3), prog: 0.5 },
              { key: 'opacity', val: 0.1, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Generate dust particles
  const dustParticles = Array.from({ length: dustParticleCount }, (_, i) =>
    generateDustParticle(i),
  );

  // Main flare core
  const flareCore: RenderableComponentData = {
    id: `${trackName}-flare-core`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '300px',
          height: '300px',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background:
            'conic-gradient(from 45deg, rgba(255,255,255,0.9) 0deg, rgba(255,240,200,0.7) 45deg, rgba(255,255,255,0.4) 90deg, rgba(255,220,180,0.8) 135deg, rgba(255,255,255,0.6) 180deg, rgba(255,245,220,0.5) 225deg, rgba(255,255,255,0.85) 270deg, rgba(255,230,190,0.7) 315deg, rgba(255,255,255,0.9) 360deg)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [],
  };

  // Main flare container with sweep motion
  const mainFlareContainer: RenderableComponentData = {
    id: `${trackName}-main-flare-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [flareCore],
    effects: [
      {
        id: `${trackName}-flare-sweep`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: startDelay,
          duration: sweepDuration,
          mode: 'provider',
          targetIds: [`${trackName}-main-flare-container`],
          ranges: [
            { key: 'translateX', val: '-120%', prog: 0 },
            { key: 'translateX', val: '120%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Overexposure flash (white washout)
  const overexposureFlash: RenderableComponentData = {
    id: `${trackName}-overexposure-flash`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: 'white',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${trackName}-flash-effect`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: startDelay + sweepDuration * 0.4,
          duration: sweepDuration * 0.4,
          mode: 'provider',
          targetIds: [`${trackName}-overexposure-flash`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: peakFlashIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Red fringe (chromatic aberration)
  const redFringe: RenderableComponentData = {
    id: `${trackName}-red-fringe`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '280px',
          height: '280px',
          top: '30%',
          left: `calc(50% - ${colorFringingAmount}px)`,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(255,100,100,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${trackName}-red-fringe-sweep`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: startDelay,
          duration: sweepDuration,
          mode: 'provider',
          targetIds: [`${trackName}-red-fringe`],
          ranges: [
            { key: 'translateX', val: '-120%', prog: 0 },
            { key: 'translateX', val: '120%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Blue fringe (chromatic aberration)
  const blueFringe: RenderableComponentData = {
    id: `${trackName}-blue-fringe`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '280px',
          height: '280px',
          top: '30%',
          left: `calc(50% + ${colorFringingAmount}px)`,
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(100,150,255,0.3) 0%, transparent 70%)',
          borderRadius: '50%',
          filter: 'blur(50px)',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${trackName}-blue-fringe-sweep`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: startDelay,
          duration: sweepDuration,
          mode: 'provider',
          targetIds: [`${trackName}-blue-fringe`],
          ranges: [
            { key: 'translateX', val: '-120%', prog: 0 },
            { key: 'translateX', val: '120%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Color fringe container
  const colorFringeContainer: RenderableComponentData = {
    id: `${trackName}-color-fringe-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none mix-blend-screen',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [redFringe, blueFringe],
    effects: [],
  };

  // Dust particles container
  const dustParticlesContainer: RenderableComponentData = {
    id: `${trackName}-dust-particles-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: dustParticles as RenderableComponentData[],
    effects: [],
  };

  // Handheld shake container
  const handheldContainer: RenderableComponentData = {
    id: `${trackName}-handheld-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      mainFlareContainer,
      overexposureFlash,
      dustParticlesContainer,
      colorFringeContainer,
    ] as RenderableComponentData[],
    effects: [
      // Continuous micro-shake (X axis)
      {
        id: `${trackName}-shake-x-1`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.1,
          mode: 'provider',
          targetIds: [`${trackName}-handheld-container`],
          ranges: [
            { key: 'translateX', val: `${shakeIntensity * 0.3}px`, prog: 0 },
            { key: 'translateX', val: `${-shakeIntensity * 0.5}px`, prog: 0.5 },
            { key: 'translateX', val: `${shakeIntensity * 0.2}px`, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-shake-x-2`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.1,
          duration: 0.15,
          mode: 'provider',
          targetIds: [`${trackName}-handheld-container`],
          ranges: [
            { key: 'translateX', val: `${shakeIntensity * 0.2}px`, prog: 0 },
            { key: 'translateX', val: `${-shakeIntensity * 0.4}px`, prog: 0.5 },
            { key: 'translateX', val: `${shakeIntensity * 0.1}px`, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-shake-x-3`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.25,
          duration: 0.12,
          mode: 'provider',
          targetIds: [`${trackName}-handheld-container`],
          ranges: [
            { key: 'translateX', val: `${shakeIntensity * 0.1}px`, prog: 0 },
            { key: 'translateX', val: `${-shakeIntensity * 0.6}px`, prog: 0.5 },
            { key: 'translateX', val: `${shakeIntensity * 0.3}px`, prog: 1 },
          ],
        },
      },
      // Continuous micro-shake (Y axis)
      {
        id: `${trackName}-shake-y-1`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.13,
          mode: 'provider',
          targetIds: [`${trackName}-handheld-container`],
          ranges: [
            { key: 'translateY', val: `${shakeIntensity * 0.4}px`, prog: 0 },
            { key: 'translateY', val: `${-shakeIntensity * 0.3}px`, prog: 0.5 },
            { key: 'translateY', val: `${shakeIntensity * 0.5}px`, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-shake-y-2`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.13,
          duration: 0.11,
          mode: 'provider',
          targetIds: [`${trackName}-handheld-container`],
          ranges: [
            { key: 'translateY', val: `${shakeIntensity * 0.5}px`, prog: 0 },
            { key: 'translateY', val: `${-shakeIntensity * 0.2}px`, prog: 0.5 },
            { key: 'translateY', val: `${shakeIntensity * 0.4}px`, prog: 1 },
          ],
        },
      },
      {
        id: `${trackName}-shake-y-3`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.24,
          duration: 0.14,
          mode: 'provider',
          targetIds: [`${trackName}-handheld-container`],
          ranges: [
            { key: 'translateY', val: `${shakeIntensity * 0.4}px`, prog: 0 },
            { key: 'translateY', val: `${-shakeIntensity * 0.7}px`, prog: 0.5 },
            { key: 'translateY', val: `${shakeIntensity * 0.1}px`, prog: 1 },
          ],
        },
      },
    ],
  };

  const rootContainer: RenderableComponentData = handheldContainer;

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
  id: 'documentary-handheld-flare',
  title: 'Documentary Handheld Lens Flare',
  description:
    'Authentic documentary-style lens flare with handheld camera shake, uneven intensity, quick sweep motion, momentary sensor overexposure, chromatic aberration, and backlit dust particles. Designed for raw verité filmmaking aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'lens-flare',
    'documentary',
    'handheld',
    'camera-shake',
    'verité',
    'found-footage',
    'chromatic-aberration',
    'dust-particles',
    'overlay',
  ],
  dependencies: {},
  defaultInputParams: {
    trackName: 'documentary-flare',
    sweepDuration: 0.7,
    startDelay: 0.1,
    peakFlashIntensity: 0.9,
    shakeIntensity: 3,
    dustParticleCount: 6,
    colorFringingAmount: 3,
  },
};

export const documentaryHandheldFlarePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
