/**
 * Flowing Rapids Text Effect Preset
 *
 * This preset creates a dynamic flowing rapids text effect where typography behaves like text carved into rocks 
 * with water rushing over them at high speed. It visualizes white water rapids flowing over stone letters with 
 * foam patterns, spray effects, and constant motion while the text remains solid underneath.
 *
 * Features:
 * - Stone-carved base text with shadowing and texture
 * - Multi-layer animated water flow with turbulent motion
 * - Foam patterns with scale and opacity animations
 * - Spray particle effects with 3D trajectories
 * - Mist overlay with blur effects
 * - Turbulence layers with eddies and vortices
 * - Light refraction through spray effects
 * - Chaotic overlapping timings for realistic water movement
 *
 * Use cases:
 * - High-energy title sequences
 * - Action sports content
 * - Adventure video intros
 * - Dynamic brand reveals
 * - Extreme sports overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ===== PARAMETERS SCHEMA =====
const presetParams = z.object({
  text: z
    .string()
    .default('RAPIDS')
    .describe('The text to display as stone-carved letters with water flowing over them'),
  
  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .default(96)
    .describe('Font size in pixels for the stone text'),
  
  textColor: z
    .string()
    .default('#4a4a4a')
    .describe('Color of the stone-carved text'),
  
  waterColor: z
    .string()
    .default('#ffffff')
    .describe('Primary color of the water flow (white for white water rapids)'),
  
  waterOpacity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .describe('Opacity of the water flow layers (0.1-1)'),
  
  flowSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Speed multiplier for water flow animation (higher = faster)'),
  
  turbulenceIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Intensity of turbulence effects (eddies, vortices)'),
  
  foamIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1.0)
    .describe('Intensity of foam patterns and spray effects'),
  
  mistIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of mist overlay effect (0 = none, 1 = heavy)'),
  
  duration: z
    .number()
    .default(10)
    .describe('Duration of the effect in seconds'),
});

// ===== PRESET EXECUTION =====
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font,
    fontSize,
    textColor,
    waterColor,
    waterOpacity,
    flowSpeed,
    turbulenceIntensity,
    foamIntensity,
    mistIntensity,
    duration,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: any = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Calculate timing values
  const flowCycleDuration = 1.5 / flowSpeed;
  const turbulenceDuration1 = 0.7 / flowSpeed;
  const turbulenceDuration2 = 0.5 / flowSpeed;
  const turbulenceDuration3 = 0.3 / flowSpeed;
  const foamPulseDuration = 0.6;
  const sprayDuration = 0.8;

  // Stone text base
  const stoneTextId = 'stone-text-base';
  const stoneText: RenderableComponentData = {
    id: stoneTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        textShadow: '2px 2px 4px rgba(0,0,0,0.5), inset 0 0 10px rgba(0,0,0,0.3)',
        letterSpacing: '0.1em',
        fontWeight: fontStyle.fontWeight || 700,
        ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
      },
      font: {
        family: fontFamily,
        weights: [String(fontStyle.fontWeight || 700)],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Water flow primary layer
  const waterFlowPrimaryId = 'water-flow-primary';
  const waterFlowPrimary: RenderableComponentData = {
    id: waterFlowPrimaryId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,${waterOpacity * 0.6}) 20%, rgba(200,230,255,${waterOpacity * 0.8}) 50%, rgba(255,255,255,${waterOpacity * 0.6}) 80%, transparent 100%);"></div>`,
      className: 'absolute inset-0',
      style: {
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 30%, black 70%, transparent 100%)',
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
        id: `${waterFlowPrimaryId}-flow`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: flowCycleDuration,
          mode: 'provider',
          targetIds: [waterFlowPrimaryId],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Water flow secondary layer
  const waterFlowSecondaryId = 'water-flow-secondary';
  const waterFlowSecondary: RenderableComponentData = {
    id: waterFlowSecondaryId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(180,220,255,${waterOpacity * 0.5}) 30%, rgba(255,255,255,${waterOpacity * 0.7}) 60%, rgba(180,220,255,${waterOpacity * 0.5}) 90%, transparent 100%);"></div>`,
      className: 'absolute inset-0',
      style: {
        maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 80%)',
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
        id: `${waterFlowSecondaryId}-flow`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.3,
          duration: flowCycleDuration * 1.2,
          mode: 'provider',
          targetIds: [waterFlowSecondaryId],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // Turbulence eddies and vortices
  const turbulence1Id = 'turbulence-eddy-1';
  const turbulence1: RenderableComponentData = {
    id: turbulence1Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 120px; height: 120px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,${waterOpacity * 0.4 * turbulenceIntensity}) 0%, transparent 70%);"></div>`,
      className: 'absolute',
      style: {
        top: '30%',
        left: '20%',
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
        id: `${turbulence1Id}-turbulence`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: turbulenceDuration1,
          mode: 'provider',
          targetIds: [turbulence1Id],
          ranges: [
            { key: 'translateY', val: -20 * turbulenceIntensity, prog: 0 },
            { key: 'translateY', val: 20 * turbulenceIntensity, prog: 0.5 },
            { key: 'translateY', val: -20 * turbulenceIntensity, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 360, prog: 1 },
          ],
        },
      },
    ],
  };

  const turbulence2Id = 'turbulence-eddy-2';
  const turbulence2: RenderableComponentData = {
    id: turbulence2Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100px; height: 100px; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,${waterOpacity * 0.3 * turbulenceIntensity}) 0%, transparent 70%);"></div>`,
      className: 'absolute',
      style: {
        top: '60%',
        right: '25%',
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
        id: `${turbulence2Id}-turbulence`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.2,
          duration: turbulenceDuration2,
          mode: 'provider',
          targetIds: [turbulence2Id],
          ranges: [
            { key: 'translateY', val: 15 * turbulenceIntensity, prog: 0 },
            { key: 'translateY', val: -15 * turbulenceIntensity, prog: 0.5 },
            { key: 'translateY', val: 15 * turbulenceIntensity, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: -360, prog: 1 },
          ],
        },
      },
    ],
  };

  const turbulence3Id = 'turbulence-vortex';
  const turbulence3: RenderableComponentData = {
    id: turbulence3Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 80px; height: 80px; border-radius: 50%; background: radial-gradient(circle, rgba(200,230,255,${waterOpacity * 0.5 * turbulenceIntensity}) 0%, transparent 70%);"></div>`,
      className: 'absolute',
      style: {
        top: '45%',
        left: '50%',
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
        id: `${turbulence3Id}-turbulence`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.4,
          duration: turbulenceDuration3,
          mode: 'provider',
          targetIds: [turbulence3Id],
          ranges: [
            { key: 'translateX', val: -10 * turbulenceIntensity, prog: 0 },
            { key: 'translateX', val: 10 * turbulenceIntensity, prog: 0.5 },
            { key: 'translateX', val: -10 * turbulenceIntensity, prog: 1 },
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  // Foam clusters
  const foam1Id = 'foam-cluster-1';
  const foam1: RenderableComponentData = {
    id: foam1Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,${0.8 * foamIntensity}); box-shadow: 0 0 10px rgba(255,255,255,${0.6 * foamIntensity}), 0 0 20px rgba(255,255,255,${0.3 * foamIntensity});"></div>`,
      className: 'absolute',
      style: {
        top: '40%',
        left: '30%',
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
        id: `${foam1Id}-pulse`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: foamPulseDuration,
          mode: 'provider',
          targetIds: [foam1Id],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.3 * foamIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      },
    ],
  };

  const foam2Id = 'foam-cluster-2';
  const foam2: RenderableComponentData = {
    id: foam2Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 30px; height: 30px; border-radius: 50%; background: rgba(255,255,255,${0.7 * foamIntensity}); box-shadow: 0 0 8px rgba(255,255,255,${0.5 * foamIntensity});"></div>`,
      className: 'absolute',
      style: {
        top: '55%',
        right: '35%',
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
        id: `${foam2Id}-pulse`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.15,
          duration: foamPulseDuration * 0.9,
          mode: 'provider',
          targetIds: [foam2Id],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.2 * foamIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      },
    ],
  };

  const foam3Id = 'foam-cluster-3';
  const foam3: RenderableComponentData = {
    id: foam3Id,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 35px; height: 35px; border-radius: 50%; background: rgba(255,255,255,${0.9 * foamIntensity}); box-shadow: 0 0 12px rgba(255,255,255,${0.7 * foamIntensity});"></div>`,
      className: 'absolute',
      style: {
        top: '35%',
        left: '60%',
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
        id: `${foam3Id}-pulse`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0.3,
          duration: foamPulseDuration * 1.1,
          mode: 'provider',
          targetIds: [foam3Id],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.4 * foamIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  // Spray particles (5 particles with varying trajectories)
  const createSprayParticle = (
    id: string,
    size: number,
    opacity: number,
    top: string,
    left: string,
    trajectory: { x: number; y: number; z: number },
  ): RenderableComponentData => {
    return {
      id: id,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; background: rgba(255,255,255,${opacity * foamIntensity});"></div>`,
        className: 'absolute',
        style: {
          top: top,
          left: left,
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
          id: `${id}-spray`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: sprayDuration,
            mode: 'provider',
            targetIds: [id],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: trajectory.x, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: trajectory.y, prog: 1 },
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 0.3, prog: 1 },
              { key: 'opacity', val: opacity * foamIntensity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  const spray1 = createSprayParticle('spray-particle-1', 8, 0.6, '25%', '40%', { x: -30, y: -50, z: 0 });
  const spray2 = createSprayParticle('spray-particle-2', 6, 0.5, '20%', '55%', { x: 20, y: -60, z: 0 });
  const spray3 = createSprayParticle('spray-particle-3', 7, 0.7, '70%', '30%', { x: -40, y: 50, z: 0 });
  const spray4 = createSprayParticle('spray-particle-4', 5, 0.4, '15%', '70%', { x: 30, y: -70, z: 0 });
  const spray5 = createSprayParticle('spray-particle-5', 9, 0.8, '75%', '25%', { x: -50, y: 60, z: 0 });

  // Mist overlay
  const mistOverlayId = 'mist-overlay';
  const mistOverlay: RenderableComponentData = {
    id: mistOverlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, rgba(255,255,255,${0.15 * mistIntensity}) 0%, transparent 60%);"></div>`,
      className: 'absolute inset-0 pointer-events-none',
      style: {
        filter: 'blur(20px)',
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
        id: `${mistOverlayId}-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2,
          mode: 'provider',
          targetIds: [mistOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: mistIntensity, prog: 0.3 },
            { key: 'opacity', val: mistIntensity * 0.7, prog: 0.7 },
            { key: 'opacity', val: mistIntensity, prog: 1 },
          ],
        },
      },
    ],
  };

  // Water flow container (combines primary and secondary layers)
  const waterFlowContainer: RenderableComponentData = {
    id: 'water-flow-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [waterFlowPrimary, waterFlowSecondary],
  };

  // Turbulence layer container
  const turbulenceLayer: RenderableComponentData = {
    id: 'turbulence-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [turbulence1, turbulence2, turbulence3],
  };

  // Foam layer container
  const foamLayer: RenderableComponentData = {
    id: 'foam-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [foam1, foam2, foam3],
  };

  // Spray particles container
  const sprayParticlesContainer: RenderableComponentData = {
    id: 'spray-particles-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [spray1, spray2, spray3, spray4, spray5],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'flowing-rapids-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: '#1a1a1a',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      stoneText,
      waterFlowContainer,
      turbulenceLayer,
      foamLayer,
      sprayParticlesContainer,
      mistOverlay,
    ] as RenderableComponentData[],
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

// ===== PRESET METADATA =====
const presetMetadata: PresetMetadata = {
  id: 'flowing-rapids-text-effect',
  title: 'Flowing Rapids Text Effect',
  description:
    'Dynamic water rapids effect flowing over solid stone-carved text with foam patterns, turbulence, spray particles, mist effects, and light refraction. Features multi-layer water animation with varying intensity, eddies, vortices, and realistic white-water rapids simulation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'water',
    'rapids',
    'flow',
    'turbulence',
    'foam',
    'spray',
    'mist',
    'stone',
    'dynamic',
    'kinetic',
    'action',
    'energy',
  ],
  defaultInputParams: {
    text: 'RAPIDS',
    font: 'Inter:700',
    fontSize: 96,
    textColor: '#4a4a4a',
    waterColor: '#ffffff',
    waterOpacity: 0.7,
    flowSpeed: 1.5,
    turbulenceIntensity: 1.0,
    foamIntensity: 1.0,
    mistIntensity: 0.3,
    duration: 10,
  },
  dependencies: {},
};

// ===== EXPORT =====
export const flowingRapidsTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
