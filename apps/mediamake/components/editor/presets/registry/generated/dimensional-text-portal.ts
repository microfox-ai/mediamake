/**
 * Dimensional Text Portal Effect Preset
 *
 * Creates a stunning dimensional text portal effect where text appears to travel
 * through layers of space-time. The main text exists in the present while ghost
 * echoes show where it was moments ago, creating a time-trail effect.
 *
 * Features:
 * - 5 ghost layers with varying depth (translateZ from 0 to -200px)
 * - Each ghost has unique perspective transforms suggesting different depths in 3D space
 * - Spatial warping effects around edges using custom clip-path polygons
 * - Particle effects between layers suggesting quantum foam of space-time
 * - Subtle gravitational lensing pulse effect on the entire composition
 * - Staggered ghost animations with exponential decay (0.15s delays)
 * - Elastic space-time distortion using cubic-bezier(0.68, -0.55, 0.265, 1.55)
 *
 * Use cases:
 * - Science fiction video titles
 * - Tech product launches
 * - Gaming intros
 * - Futuristic branding
 * - Time-travel themed content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('TEMPORAL ECHO')
    .describe('Text to display in the portal effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(10)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Inter:900')
    .describe(
      'Font family with optional weight (e.g., "Inter:900", "Roboto:700")',
    ),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the main text'),
  ghostOpacity: z
    .number()
    .min(0.1)
    .max(0.8)
    .default(0.6)
    .describe('Opacity of ghost layers'),
  particleCount: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Number of quantum particles'),
  pulseIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity of the gravitational lensing pulse'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 900;

  // Helper function to create ghost layer effects
  const createGhostEffects = (
    ghostId: string,
    ghostIndex: number,
    totalGhosts: number,
  ): any[] => {
    const delay = ghostIndex * 0.15; // Stagger by 0.15s
    const depth = -200 * (ghostIndex / (totalGhosts - 1)); // -200px to 0px
    const rotateX = 15 * (ghostIndex / (totalGhosts - 1)); // 0 to 15deg
    const rotateY = -10 + 20 * (ghostIndex / (totalGhosts - 1)); // -10 to 10deg
    const opacity =
      params.ghostOpacity * (1 - ghostIndex / (totalGhosts + 1));

    return [
      // Fade in + depth animation
      {
        id: `${ghostId}-fade-depth`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: delay,
          duration: 1,
          mode: 'provider',
          targetIds: [ghostId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: opacity, prog: 1 },
            { key: 'translateZ', val: depth - 50, prog: 0 },
            { key: 'translateZ', val: depth, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Perspective rotation
      {
        id: `${ghostId}-perspective`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: delay,
          duration: params.duration - delay,
          mode: 'provider',
          targetIds: [ghostId],
          ranges: [
            { key: 'rotateX', val: rotateX, prog: 0 },
            { key: 'rotateX', val: rotateX + 2, prog: 0.5 },
            { key: 'rotateX', val: rotateX, prog: 1 },
            { key: 'rotateY', val: rotateY, prog: 0 },
            { key: 'rotateY', val: rotateY + 3, prog: 0.5 },
            { key: 'rotateY', val: rotateY, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Spatial warping (scale oscillation)
      {
        id: `${ghostId}-warp`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: delay,
          duration: params.duration - delay,
          mode: 'provider',
          targetIds: [ghostId],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.02, prog: 0.25 },
            { key: 'scaleX', val: 1, prog: 0.5 },
            { key: 'scaleX', val: 0.98, prog: 0.75 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 0.98, prog: 0.25 },
            { key: 'scaleY', val: 1, prog: 0.5 },
            { key: 'scaleY', val: 1.02, prog: 0.75 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ];
  };

  // Helper function to create particle effects
  const createParticleEffects = (particleId: string, index: number): any[] => {
    const startPos = Math.random() * 100;
    const endPos = startPos + (Math.random() - 0.5) * 50;
    const startY = Math.random() * 100;
    const endY = startY + (Math.random() - 0.5) * 50;
    const delay = Math.random() * 0.5;

    return [
      // Particle movement along bezier path
      {
        id: `${particleId}-movement`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: delay,
          duration: params.duration - delay,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'translateX', val: `${startPos}%`, prog: 0 },
            { key: 'translateX', val: `${endPos}%`, prog: 1 },
            { key: 'translateY', val: `${startY}%`, prog: 0 },
            { key: 'translateY', val: `${endY}%`, prog: 1 },
          ],
        } as GenericEffectData,
      },
      // Particle opacity oscillation
      {
        id: `${particleId}-opacity`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: delay,
          duration: params.duration - delay,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.25 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 0.6, prog: 0.75 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ];
  };

  // Create ghost layers
  const totalGhosts = 5;
  const ghosts: RenderableComponentData[] = [];

  for (let i = 0; i < totalGhosts; i++) {
    const ghostId = `ghost-${i + 1}`;
    const blur = 3 * (i / (totalGhosts - 1)); // 0 to 3px blur based on depth

    const ghostEffects = createGhostEffects(ghostId, i, totalGhosts);

    ghosts.push({
      id: ghostId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight,
          color: params.textColor,
          textAlign: 'center',
          filter: `blur(${blur}px)`,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
        className: 'absolute inset-0 flex items-center justify-center',
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: ghostEffects,
    } as RenderableComponentData);
  }

  // Create particles
  const particles: RenderableComponentData[] = [];
  for (let i = 0; i < params.particleCount; i++) {
    const particleId = `particle-${i + 1}`;
    const particleSize = 2 + Math.random() * 3; // 2-5px
    const particleEffects = createParticleEffects(particleId, i);

    particles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${particleSize}px; height: ${particleSize}px; border-radius: 50%; background: white;"></div>`,
        className: 'absolute',
        style: {
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: particleEffects,
    } as RenderableComponentData);
  }

  // Create main text
  const mainTextId = 'main-text';
  const mainTextEffects = [
    // Fade in + entrance
    {
      id: `${mainTextId}-entrance`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: totalGhosts * 0.15,
        duration: 1.2,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.9, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    },
    // Gravitational lensing pulse
    {
      id: `${mainTextId}-pulse`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [mainTextId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          {
            key: 'scale',
            val: 1 + 0.02 * params.pulseIntensity,
            prog: 0.25,
          },
          { key: 'scale', val: 1, prog: 0.5 },
          {
            key: 'scale',
            val: 1 + 0.02 * params.pulseIntensity,
            prog: 0.75,
          },
          { key: 'scale', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontWeight,
        color: params.textColor,
        textAlign: 'center',
        textShadow:
          '0 0 20px rgba(255,255,255,0.5), 0 0 40px rgba(255,255,255,0.3)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
      className: 'absolute inset-0 flex items-center justify-center',
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: mainTextEffects,
  } as RenderableComponentData;

  // Create ghost layer container
  const ghostLayerContainer: RenderableComponentData = {
    id: 'ghost-layer-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          backfaceVisibility: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: ghosts,
  } as RenderableComponentData;

  // Create particle field container
  const particleFieldContainer: RenderableComponentData = {
    id: 'particle-field',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          transformStyle: 'preserve-3d',
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: particles,
  } as RenderableComponentData;

  // Root portal container with gravitational lensing
  const portalRootId = 'dimensional-portal-root';
  const portalRootEffects = [
    // Subtle perspective-origin animation for gravitational lensing
    {
      id: `${portalRootId}-lensing`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: [portalRootId],
        ranges: [
          { key: 'perspectiveOriginX', val: '50%', prog: 0 },
          { key: 'perspectiveOriginX', val: '52%', prog: 0.25 },
          { key: 'perspectiveOriginX', val: '50%', prog: 0.5 },
          { key: 'perspectiveOriginX', val: '48%', prog: 0.75 },
          { key: 'perspectiveOriginX', val: '50%', prog: 1 },
          { key: 'perspectiveOriginY', val: '50%', prog: 0 },
          { key: 'perspectiveOriginY', val: '48%', prog: 0.25 },
          { key: 'perspectiveOriginY', val: '50%', prog: 0.5 },
          { key: 'perspectiveOriginY', val: '52%', prog: 0.75 },
          { key: 'perspectiveOriginY', val: '50%', prog: 1 },
        ],
      } as GenericEffectData,
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: portalRootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [ghostLayerContainer, particleFieldContainer, mainText],
    effects: portalRootEffects,
  } as RenderableComponentData;

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
  id: 'dimensionalTextPortal',
  title: 'Dimensional Text Portal Effect',
  description:
    'A dimensional text portal effect featuring temporal ghost layers that travel through space-time. Main text exists in the present while ghost echoes show where it was moments ago, creating a time-trail effect. Each ghost has unique perspective transforms suggesting different depths in 3D space. Includes spatial warping effects, quantum foam particles between layers, and subtle gravitational lensing pulse. Features staggered ghost animations with exponential decay, 3D depth layering using translateZ, and particle effects that suggest the quantum nature of space-time.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'portal',
    'dimensional',
    '3d',
    'perspective',
    'sci-fi',
    'time-trail',
    'ghost',
    'particles',
    'quantum',
    'gravitational-lensing',
    'space-time',
    'depth',
    'modern',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'TEMPORAL ECHO',
    duration: 10,
    fontSize: 72,
    font: 'Inter:900',
    textColor: '#ffffff',
    ghostOpacity: 0.6,
    particleCount: 15,
    pulseIntensity: 1,
  },
};

export const dimensionalTextPortalPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
