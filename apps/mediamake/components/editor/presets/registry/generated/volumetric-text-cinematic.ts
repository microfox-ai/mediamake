/**
 * Volumetric Text Cinematic Reveal Preset
 *
 * This preset creates a cinematic text reveal with volumetric depth effects, atmospheric fog,
 * dramatic lighting, and floating particles. The text rotates from -60deg to 0deg on the Y-axis
 * while emerging from atmospheric haze, creating a thriller-style title reveal effect.
 *
 * Features:
 * - **3D Volumetric Text**: Text with physical depth using layered shadows and 3D transforms
 * - **Rotational Animation**: Smooth rotateY animation from -60deg to 0deg with perspective
 * - **Atmospheric Fog**: Depth-based fog effect that fades from opaque to transparent
 * - **Volumetric Lighting**: Dramatic lighting effects with gradient overlays
 * - **Floating Particles**: Atmospheric dust motes with parallax movement
 * - **Cinematic Timing**: Slow, deliberate animation for maximum impact
 *
 * Use cases:
 * - Movie title reveals
 * - Thriller/suspense film intros
 * - Dramatic text presentations
 * - Cinematic branding reveals
 * - Atmospheric title sequences
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  text: z.string().default('VOLUMETRIC').describe('Text content to display with volumetric effects'),
  duration: z.number().default(5).describe('Total duration of the animation in seconds'),
  fontFamily: z.string().default('Inter').optional().describe('Font family for the text (e.g., "Inter", "Roboto")'),
  textColor: z.string().default('#ffffff').describe('Base color of the text'),
  fogIntensity: z.number().min(0).max(1).default(0.8).describe('Initial fog opacity (0-1)'),
  rotationDuration: z.number().min(0).max(1).default(0.8).describe('Percentage of total duration for rotation (0-1)'),
  particleCount: z.number().min(0).max(20).default(10).describe('Number of floating particles'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    text,
    duration,
    fontFamily = 'Inter',
    textColor,
    fogIntensity,
    rotationDuration,
    particleCount,
  } = params;

  // Calculate timing values
  const rotationEnd = duration * rotationDuration;
  
  // Generate unique IDs
  const containerId = 'volumetric-container';
  const textId = 'volumetric-text';
  const fogId = 'fog-overlay';

  // --- Text Rotation Effect (rotateY: -60deg → 0deg) ---
  const textRotationEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: rotationEnd,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'rotateY', val: -60, prog: 0 },
      { key: 'rotateY', val: 0, prog: 1 },
    ],
  };

  // --- Fog Fade Effect (opacity: 0.8 → 0.2) ---
  const fogFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [fogId],
    ranges: [
      { key: 'opacity', val: fogIntensity, prog: 0 },
      { key: 'opacity', val: 0.2, prog: 1 },
    ],
  };

  // --- Volumetric Text Component ---
  const volumetricText: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      className: 'text-8xl font-black',
      style: {
        color: textColor,
        textShadow: '3px 3px 0 rgba(0,0,0,0.8), 6px 6px 0 rgba(0,0,0,0.6), 9px 9px 15px rgba(0,0,0,0.4)',
        transformStyle: 'preserve-3d',
        transform: 'scaleZ(1.2)',
      },
      font: {
        family: fontFamily,
        weights: ['900'],
        display: 'swap',
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
        id: 'text-rotation',
        componentId: 'generic',
        data: textRotationEffect,
      },
    ],
  };

  // --- Fog Overlay Component ---
  const fogOverlay: RenderableComponentData = {
    id: fogId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="absolute inset-0 bg-gradient-to-t from-gray-100/20 to-transparent pointer-events-none"></div>',
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'fog-fade',
        componentId: 'generic',
        data: fogFadeEffect,
      },
    ],
  };

  // --- Particle Generation Helper ---
  const generateParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    const positions = [
      { left: '15%', top: '20%', size: 8 },
      { left: '75%', top: '35%', size: 6 },
      { left: '45%', top: '65%', size: 10 },
      { left: '85%', top: '15%', size: 7 },
      { left: '25%', top: '75%', size: 5 },
      { left: '60%', top: '45%', size: 9 },
      { left: '35%', top: '10%', size: 4 },
      { left: '70%', top: '80%', size: 11 },
      { left: '10%', top: '50%', size: 6 },
      { left: '90%', top: '60%', size: 7 },
    ];

    for (let i = 0; i < Math.min(particleCount, positions.length); i++) {
      const pos = positions[i];
      const particleId = `particle-${i + 1}`;
      
      // Create float animation for each particle with staggered timing
      const particleEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: i * 0.15, // Staggered start
        duration: duration - (i * 0.15),
        mode: 'provider',
        targetIds: [particleId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -30, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      };

      particles.push({
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div class='rounded-full bg-white/30' style='width: ${pos.size}px; height: ${pos.size}px;'></div>`,
          className: 'absolute',
          style: {
            left: pos.left,
            top: pos.top,
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
            id: `particle-effect-${i + 1}`,
            componentId: 'generic',
            data: particleEffect,
          },
        ],
      });
    }

    return particles;
  };

  const particles = generateParticles();

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-gradient-to-br from-gray-900 to-black flex items-center justify-center',
        style: {
          perspective: '1500px',
          perspectiveOrigin: '50% 50%',
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
      fogOverlay,
      volumetricText,
      ...particles,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'volumetric-text-cinematic',
  title: 'Volumetric Text Cinematic Reveal',
  description: 'Cinematic 3D text preset with volumetric depth, atmospheric fog, dramatic lighting, and floating particles. Features rotateY animation from -60deg to 0deg with depth-based fog effects and particle atmosphere for thriller-style title reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    '3d',
    'volumetric',
    'cinematic',
    'thriller',
    'fog',
    'atmosphere',
    'particles',
    'rotation',
    'dramatic',
    'title-reveal',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    text: 'VOLUMETRIC',
    duration: 5,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    fogIntensity: 0.8,
    rotationDuration: 0.8,
    particleCount: 10,
  },
};

// --- Export Preset ---
export const volumetricTextCinematicPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
