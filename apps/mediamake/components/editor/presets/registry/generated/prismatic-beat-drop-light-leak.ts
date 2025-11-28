/**
 * Prismatic Beat Drop Light Leak Preset
 *
 * A music video-style prismatic light leak effect with multi-stage animations synchronized to an imaginary 128 BPM beat.
 * Creates festival-stage lighting captured through a prism with rainbow spectrums that split and merge.
 *
 * Features:
 * - **Build-up Phase (0-40%)**: Thin light rays with gradient colors that fade in sequentially
 * - **Drop Burst (40-50%)**: Explosive scale burst from center with full spectrum fan of 7 rainbow rays
 * - **Breakdown Phase (50-100%)**: Rhythmic pulsing rings and rotating prismatic refractions
 * - **Stroboscopic Moments**: Rapid opacity toggling during intense drop sections
 * - **Light Trails**: Motion blur ghost frames with decreasing opacity for energy and movement
 * - **Beat Synchronization**: Designed for 4/4 time at 128 BPM with animations aligned to 16th notes
 *
 * Use cases:
 * - Music video light leak effects
 * - Festival stage lighting visualizations
 * - Energetic beat drop moments
 * - Rainbow spectrum animations
 * - Dynamic light show overlays
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z.number().default(12).describe('Total duration of the effect in seconds'),
  buildUpDuration: z.number().default(4.8).describe('Duration of the build-up phase in seconds'),
  dropDuration: z.number().default(1.2).describe('Duration of the drop burst phase in seconds'),
  breakdownDuration: z.number().default(6).describe('Duration of the breakdown phase in seconds'),
  
  // Build-up phase
  buildUpRayCount: z.number().min(3).max(10).default(5).describe('Number of light rays in build-up phase'),
  buildUpIntensity: z.number().min(0.5).max(1.5).default(1).describe('Intensity multiplier for build-up rays'),
  
  // Drop burst phase
  burstIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity of the drop burst explosion'),
  burstCenterGlow: z.boolean().default(true).describe('Whether to show glowing burst center'),
  
  // Breakdown phase
  pulseRingCount: z.number().min(2).max(5).default(3).describe('Number of pulsing rings in breakdown'),
  prismRotationSpeed: z.number().min(0.5).max(3).default(1).describe('Rotation speed multiplier for prisms'),
  
  // Strobe effect
  strobeEnabled: z.boolean().default(true).describe('Enable stroboscopic flashing during drop'),
  strobeIntensity: z.number().min(0.3).max(1).default(0.7).describe('Opacity of strobe flashes'),
  
  // Light trails
  trailCount: z.number().min(2).max(5).default(3).describe('Number of light trail ghost frames'),
  trailBlur: z.number().min(0).max(20).default(10).describe('Motion blur amount for trails in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    buildUpDuration,
    dropDuration,
    breakdownDuration,
    buildUpRayCount,
    buildUpIntensity,
    burstIntensity,
    burstCenterGlow,
    pulseRingCount,
    prismRotationSpeed,
    strobeEnabled,
    strobeIntensity,
    trailCount,
    trailBlur,
  } = params;

  // Calculate phase timings (absolute times for reference)
  const buildUpStart = 0;
  const dropStart = buildUpDuration;
  const breakdownStart = buildUpDuration + dropDuration;
  
  // Build-up phase: Thin light rays
  const buildUpRays: RenderableComponentData[] = [];
  const rayColors = [
    { from: 'violet-500', via: 'cyan-500' },
    { from: 'blue-500', via: 'green-500' },
    { from: 'cyan-500', via: 'yellow-500' },
    { from: 'green-500', via: 'orange-500' },
    { from: 'orange-500', via: 'red-500' },
  ];
  
  const angleStep = 60 / (buildUpRayCount - 1); // -30 to +30 degrees
  const baseAngle = -30;
  
  for (let i = 0; i < buildUpRayCount; i++) {
    const angle = baseAngle + i * angleStep;
    const color = rayColors[i % rayColors.length];
    const rayStart = i * 0.5; // Stagger starts
    const rayDuration = buildUpDuration - rayStart;
    const width = 180 + i * 10; // Varying widths
    
    buildUpRays.push({
      id: `build-ray-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute h-[1px] bg-gradient-to-r from-${color.from} via-${color.via} to-transparent`,
          style: {
            width: `${width}px`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'center',
            left: '50%',
            top: '50%',
            marginLeft: `-${width / 2}px`,
          },
        },
      },
      context: {
        timing: {
          start: rayStart,
          duration: rayDuration,
        },
      },
      effects: [
        {
          id: `build-ray-fade-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: Math.min(1, rayDuration * 0.3),
            mode: 'provider',
            targetIds: [`build-ray-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8 * buildUpIntensity, prog: 1 },
            ],
          },
        },
        {
          id: `build-ray-scale-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: rayDuration,
            mode: 'provider',
            targetIds: [`build-ray-${i}`],
            ranges: [
              { key: 'scaleX', val: 0.8, prog: 0 },
              { key: 'scaleX', val: 1.2, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const buildUpPhase: RenderableComponentData = {
    id: 'build-up-phase',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: buildUpDuration,
      },
    },
    childrenData: buildUpRays,
  };

  // Drop burst phase: Explosive spectrum fan
  const spectrumRays: RenderableComponentData[] = [];
  const spectrumColors = [
    { hue: 0, name: 'red' },      // Red
    { hue: 30, name: 'orange' },  // Orange
    { hue: 60, name: 'yellow' },  // Yellow
    { hue: 120, name: 'green' },  // Green
    { hue: 180, name: 'cyan' },   // Cyan
    { hue: 240, name: 'blue' },   // Blue
    { hue: 280, name: 'violet' }, // Violet
  ];
  
  const spectrumAngleStep = 90 / (spectrumColors.length - 1); // -45 to +45 degrees
  const spectrumBaseAngle = -45;
  
  for (let i = 0; i < spectrumColors.length; i++) {
    const angle = spectrumBaseAngle + i * spectrumAngleStep;
    const colorData = spectrumColors[i];
    
    spectrumRays.push({
      id: `spectrum-ray-${colorData.name}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute h-[8px]',
          style: {
            width: '400px',
            background: `linear-gradient(90deg, hsl(${colorData.hue}, 100%, 50%) 0%, transparent 100%)`,
            transform: `rotate(${angle}deg)`,
            transformOrigin: 'left center',
            left: '50%',
            top: '50%',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: dropDuration,
        },
      },
      effects: [
        {
          id: `spectrum-ray-scale-${colorData.name}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: dropDuration * 0.5,
            mode: 'provider',
            targetIds: [`spectrum-ray-${colorData.name}`],
            ranges: [
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1 * burstIntensity, prog: 1 },
            ],
          },
        },
        {
          id: `spectrum-ray-fade-${colorData.name}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: dropDuration * 0.5,
            duration: dropDuration * 0.5,
            mode: 'provider',
            targetIds: [`spectrum-ray-${colorData.name}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Burst center glow
  const burstCenterChildren: RenderableComponentData[] = [];
  if (burstCenterGlow) {
    burstCenterChildren.push({
      id: 'burst-center',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full',
          style: {
            width: '50px',
            height: '50px',
            background: 'radial-gradient(circle, #ffffff 0%, #ffff00 30%, #ff00ff 60%, transparent 100%)',
            left: '50%',
            top: '50%',
            marginLeft: '-25px',
            marginTop: '-25px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: dropDuration,
        },
      },
      effects: [
        {
          id: 'burst-center-scale',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: dropDuration * 0.3,
            mode: 'provider',
            targetIds: ['burst-center'],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 2 * burstIntensity, prog: 1 },
            ],
          },
        },
        {
          id: 'burst-center-fade',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: dropDuration * 0.3,
            duration: dropDuration * 0.7,
            mode: 'provider',
            targetIds: ['burst-center'],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const dropBurstPhase: RenderableComponentData = {
    id: 'drop-burst-phase',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: dropStart,
        duration: dropDuration,
      },
    },
    childrenData: [...burstCenterChildren, ...spectrumRays],
  };

  // Breakdown phase: Pulsing rings and rotating prisms
  const pulseRings: RenderableComponentData[] = [];
  const ringColors = ['violet-500', 'cyan-500', 'yellow-500', 'magenta-500', 'lime-500'];
  const ringHues = [280, 180, 60, 300, 120];
  
  for (let i = 0; i < pulseRingCount; i++) {
    const size = 100 + i * 50;
    const color = ringColors[i % ringColors.length];
    const hue = ringHues[i % ringHues.length];
    const staggerDelay = i * 0.234; // 16th note stagger
    const pulseDuration = 0.468; // 8th note duration
    
    pulseRings.push({
      id: `pulse-ring-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute rounded-full border-4 border-${color}`,
          style: {
            width: `${size}px`,
            height: `${size}px`,
            left: '50%',
            top: '50%',
            marginLeft: `-${size / 2}px`,
            marginTop: `-${size / 2}px`,
            boxShadow: `0 0 20px hsl(${hue}, 100%, 50%)`,
          },
        },
      },
      context: {
        timing: {
          start: staggerDelay,
          duration: breakdownDuration - staggerDelay,
        },
      },
      effects: [
        {
          id: `pulse-ring-scale-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: breakdownDuration - staggerDelay,
            mode: 'provider',
            targetIds: [`pulse-ring-${i}`],
            ranges: [
              { key: 'scale', val: 0.9, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.25 },
              { key: 'scale', val: 0.95, prog: 0.5 },
              { key: 'scale', val: 1.05, prog: 0.75 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
        {
          id: `pulse-ring-opacity-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: breakdownDuration - staggerDelay,
            mode: 'provider',
            targetIds: [`pulse-ring-${i}`],
            ranges: [
              { key: 'opacity', val: 0.6, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.25 },
              { key: 'opacity', val: 0.7, prog: 0.5 },
              { key: 'opacity', val: 0.9, prog: 0.75 },
              { key: 'opacity', val: 0.8, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Prismatic refractions
  const prismRefractions: RenderableComponentData[] = [
    {
      id: 'prism-refraction-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '120px',
            height: '120px',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: 'linear-gradient(135deg, rgba(255,0,0,0.3), rgba(255,255,0,0.3), rgba(0,255,0,0.3), rgba(0,255,255,0.3), rgba(0,0,255,0.3), rgba(255,0,255,0.3))',
            left: '50%',
            top: '50%',
            marginLeft: '-60px',
            marginTop: '-60px',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: breakdownDuration,
        },
      },
      effects: [
        {
          id: 'prism-refraction-1-rotate',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: breakdownDuration,
            mode: 'provider',
            targetIds: ['prism-refraction-1'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360 * prismRotationSpeed, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'prism-refraction-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '80px',
            height: '80px',
            clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
            background: 'linear-gradient(45deg, rgba(255,0,255,0.4), rgba(0,255,255,0.4), rgba(255,255,0,0.4))',
            left: '60%',
            top: '30%',
            marginLeft: '-40px',
            marginTop: '-40px',
          },
        },
      },
      context: {
        timing: {
          start: 0.5,
          duration: breakdownDuration - 0.5,
        },
      },
      effects: [
        {
          id: 'prism-refraction-2-rotate',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: breakdownDuration - 0.5,
            mode: 'provider',
            targetIds: ['prism-refraction-2'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -360 * prismRotationSpeed, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  const breakdownPhase: RenderableComponentData = {
    id: 'breakdown-phase',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: breakdownStart,
        duration: breakdownDuration,
      },
    },
    childrenData: [...pulseRings, ...prismRefractions],
  };

  // Strobe layer
  const strobeLayer: RenderableComponentData | null = strobeEnabled ? {
    id: 'strobe-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#ffffff',
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: dropStart,
        duration: dropDuration,
      },
    },
    effects: [
      {
        id: 'strobe-flash',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: dropDuration,
          mode: 'provider',
          targetIds: ['strobe-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: strobeIntensity, prog: 0.1 },
            { key: 'opacity', val: 0, prog: 0.2 },
            { key: 'opacity', val: strobeIntensity, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.4 },
            { key: 'opacity', val: strobeIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 0.6 },
            { key: 'opacity', val: strobeIntensity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 0.8 },
            { key: 'opacity', val: strobeIntensity, prog: 0.9 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData : null;

  // Light trails
  const lightTrails: RenderableComponentData[] = [];
  const trailOpacities = [0.6, 0.4, 0.2, 0.15, 0.1];
  
  for (let i = 0; i < trailCount; i++) {
    const opacity = trailOpacities[i] || 0.1;
    const delay = i * 0.1;
    const hue = (i * 360) / trailCount;
    
    lightTrails.push({
      id: `trail-ghost-${i}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute rounded-full',
          style: {
            width: '60px',
            height: '60px',
            background: `radial-gradient(circle, hsla(${hue}, 100%, 60%, ${opacity}) 0%, transparent 70%)`,
            left: '50%',
            top: '50%',
            marginLeft: '-30px',
            marginTop: '-30px',
            filter: trailBlur > 0 ? `blur(${trailBlur}px)` : 'none',
          },
        },
      },
      context: {
        timing: {
          start: breakdownStart + delay,
          duration: breakdownDuration - delay,
        },
      },
      effects: [
        {
          id: `trail-ghost-move-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: breakdownDuration - delay,
            mode: 'provider',
            targetIds: [`trail-ghost-${i}`],
            ranges: [
              { key: 'translateX', val: -100 - i * 20, prog: 0 },
              { key: 'translateX', val: 100 + i * 20, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  const lightTrailsLayer: RenderableComponentData = {
    id: 'light-trails-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: breakdownStart,
        duration: breakdownDuration,
      },
    },
    childrenData: lightTrails,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'prismatic-beat-drop-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      buildUpPhase,
      dropBurstPhase,
      breakdownPhase,
      ...(strobeLayer ? [strobeLayer] : []),
      lightTrailsLayer,
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

const presetMetadata: PresetMetadata = {
  id: 'prismatic-beat-drop-light-leak',
  title: 'Prismatic Beat Drop Light Leak',
  description: 'A music video-style prismatic light leak effect with multi-stage animations synchronized to an imaginary 128 BPM beat. Features build-up phase with thin gradient rays, explosive drop burst with full spectrum fan, and breakdown phase with pulsing rings and rotating prismatic refractions. Includes stroboscopic flashes and motion blur light trails for festival-stage energy.',
  type: 'predefined',
  presetType: 'children',
  tags: ['light-leak', 'music-video', 'prismatic', 'beat-drop', 'spectrum', 'festival', 'strobe', 'effects'],
  defaultInputParams: {
    duration: 12,
    buildUpDuration: 4.8,
    dropDuration: 1.2,
    breakdownDuration: 6,
    buildUpRayCount: 5,
    buildUpIntensity: 1,
    burstIntensity: 1,
    burstCenterGlow: true,
    pulseRingCount: 3,
    prismRotationSpeed: 1,
    strobeEnabled: true,
    strobeIntensity: 0.7,
    trailCount: 3,
    trailBlur: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const prismaticBeatDropLightLeakPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};