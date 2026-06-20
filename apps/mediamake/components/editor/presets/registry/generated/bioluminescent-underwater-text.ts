/**
 * Bioluminescent Underwater Text Effect Preset
 *
 * Creates an ethereal deep-sea text effect featuring:
 * - Pulsing bioluminescent glow that travels through letters like a wave
 * - Water current distortion with sine-wave motion (translateY + rotateZ)
 * - Color shifts from cyan to green to purple during glow pulses
 * - Glowing plankton particles drifting past with depth blur
 * - Glow intensity synchronized with wave peaks for otherworldly atmosphere
 *
 * Technical implementation:
 * - BaseLayout with dark background (bg-slate-950) for contrast
 * - TextAtom with base glow using multiple text-shadow layers
 * - Generic effects for:
 *   - Color animation through cyan/green/purple spectrum
 *   - Glow intensity pulsing (10px-30px radius)
 *   - Wave distortion (translateY -8px to 8px, rotateZ -3deg to 3deg)
 * - HTMLBlockAtom particles (10-15) with random positioning and drift animations
 * - All animations loop continuously for underwater ambiance
 *
 * Use cases:
 * - Ocean/underwater themed content
 * - Bioluminescent nature documentaries
 * - Deep-sea exploration videos
 * - Ethereal title sequences
 * - Science fiction water scenes
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().default('DEEP SEA').describe('Text to display with bioluminescent effect'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700")'),
  baseColor: z.string().default('#00ffff').describe('Base text color (cyan)'),
  glowIntensity: z.number().min(0.5).max(3).default(1).describe('Glow intensity multiplier (0.5-3)'),
  waveAmplitude: z.number().min(2).max(20).default(8).describe('Wave distortion amplitude in pixels'),
  waveSpeed: z.number().min(2).max(8).default(4).describe('Wave animation duration in seconds'),
  colorCycleSpeed: z.number().min(2).max(6).default(3).describe('Color cycle duration in seconds'),
  particleCount: z.number().min(5).max(20).default(13).describe('Number of glowing plankton particles (5-20)'),
  duration: z.number().default(10).describe('Total duration in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    baseColor,
    glowIntensity,
    waveAmplitude,
    waveSpeed,
    colorCycleSpeed,
    particleCount,
    duration,
  } = params;

  // Helper function to generate random particle properties
  const generateParticleData = (index: number) => {
    const seed = index * 12345;
    const random = (min: number, max: number, offset = 0) => {
      const x = Math.sin(seed + offset) * 10000;
      return min + ((x - Math.floor(x)) * (max - min));
    };

    const sizes = ['w-0.5 h-0.5', 'w-1 h-1', 'w-1.5 h-1.5'];
    const colors = ['bg-cyan-300', 'bg-cyan-400', 'bg-emerald-400', 'bg-purple-300', 'bg-purple-400'];
    
    const sizeClass = sizes[Math.floor(random(0, sizes.length, 100))];
    const colorClass = colors[Math.floor(random(0, colors.length, 200))];
    const left = random(0, 100, 300);
    const top = random(0, 100, 400);
    const animationDuration = random(15, 30, 500);
    const animationDelay = random(0, 5, 600);
    const opacity = random(0.4, 0.8, 700);
    const blurAmount = random(1, 3, 800);
    const glowSize = random(4, 8, 900);
    
    // Random drift direction
    const driftX = random(-30, 30, 1000);
    const driftY = random(-50, -20, 1100);

    return {
      sizeClass,
      colorClass,
      left,
      top,
      animationDuration,
      animationDelay,
      opacity,
      blurAmount,
      glowSize,
      driftX,
      driftY,
    };
  };

  // Generate particle components
  const particleComponents: RenderableComponentData[] = [];
  for (let i = 0; i < particleCount; i++) {
    const particleId = `plankton-particle-${i}`;
    const particleData = generateParticleData(i);

    particleComponents.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        className: `absolute ${particleData.sizeClass} rounded-full ${particleData.colorClass}`,
        style: {
          left: `${particleData.left}%`,
          top: `${particleData.top}%`,
          opacity: particleData.opacity,
          boxShadow: `0 0 ${particleData.glowSize}px 2px rgba(0, 255, 255, 0.6)`,
          backdropFilter: `blur(${particleData.blurAmount}px)`,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `particle-drift-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            loop: true,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: particleData.driftX, prog: 0.5 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: particleData.driftY, prog: 1 },
              { key: 'opacity', val: particleData.opacity, prog: 0 },
              { key: 'opacity', val: particleData.opacity * 0.5, prog: 0.5 },
              { key: 'opacity', val: particleData.opacity, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Create particle layer container
  const particleLayer: RenderableComponentData = {
    id: 'particle-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particleComponents,
  };

  // Text component ID
  const textId = 'bioluminescent-text';

  // Create text component with base glow
  const textComponent: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: '',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: baseColor,
        textShadow: `0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px rgba(0, 255, 255, 0.6)`,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Create text container with effects
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Wave distortion effect (translateY + rotateZ)
      {
        id: 'wave-distortion',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: waveSpeed,
          loop: true,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: waveAmplitude, prog: 0.25 },
            { key: 'translateY', val: 0, prog: 0.5 },
            { key: 'translateY', val: -waveAmplitude, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 1.5, prog: 0.25 },
            { key: 'rotateZ', val: 0, prog: 0.5 },
            { key: 'rotateZ', val: -1.5, prog: 0.75 },
            { key: 'rotateZ', val: 0, prog: 1 },
          ],
        },
      },
      // Color pulse effect (cyan -> green -> purple)
      {
        id: 'color-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: colorCycleSpeed,
          loop: true,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'color', val: '#00ffff', prog: 0 },      // Cyan
            { key: 'color', val: '#00ff88', prog: 0.33 },   // Green
            { key: 'color', val: '#8844ff', prog: 0.66 },   // Purple
            { key: 'color', val: '#00ffff', prog: 1 },      // Back to cyan
          ],
        },
      },
      // Glow intensity effect (synchronized with wave peaks)
      {
        id: 'glow-intensity',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: waveSpeed,
          loop: true,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { 
              key: 'textShadow', 
              val: `0 0 ${10 * glowIntensity}px currentColor, 0 0 ${20 * glowIntensity}px currentColor, 0 0 ${30 * glowIntensity}px rgba(0, 255, 255, 0.5)`, 
              prog: 0 
            },
            { 
              key: 'textShadow', 
              val: `0 0 ${20 * glowIntensity}px currentColor, 0 0 ${40 * glowIntensity}px currentColor, 0 0 ${60 * glowIntensity}px rgba(0, 255, 255, 0.8)`, 
              prog: 0.25 
            },
            { 
              key: 'textShadow', 
              val: `0 0 ${15 * glowIntensity}px currentColor, 0 0 ${30 * glowIntensity}px currentColor, 0 0 ${45 * glowIntensity}px rgba(0, 255, 255, 0.6)`, 
              prog: 0.5 
            },
            { 
              key: 'textShadow', 
              val: `0 0 ${25 * glowIntensity}px currentColor, 0 0 ${50 * glowIntensity}px currentColor, 0 0 ${75 * glowIntensity}px rgba(136, 68, 255, 0.8)`, 
              prog: 0.75 
            },
            { 
              key: 'textShadow', 
              val: `0 0 ${10 * glowIntensity}px currentColor, 0 0 ${20 * glowIntensity}px currentColor, 0 0 ${30 * glowIntensity}px rgba(0, 255, 255, 0.5)`, 
              prog: 1 
            },
          ],
        },
      },
    ],
    childrenData: [textComponent],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bioluminescent-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-slate-950 overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [particleLayer, textContainer],
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
  id: 'bioluminescent-underwater-text',
  title: 'Bioluminescent Underwater Text Effect',
  description: 'An ethereal deep-sea text effect featuring pulsing bioluminescent glow that travels through letters like a wave, combined with water current distortion. Letters undulate with sine-wave motion while emitting soft, cycling light from cyan to green to purple. Glowing plankton particles drift past in the background with depth blur. The glow intensity synchronizes with wave peaks for an otherworldly underwater atmosphere.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'effects', 'bioluminescent', 'underwater', 'glow', 'wave', 'distortion', 'particles', 'ethereal', 'ocean', 'deep-sea'],
  defaultInputParams: {
    text: 'DEEP SEA',
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    baseColor: '#00ffff',
    glowIntensity: 1,
    waveAmplitude: 8,
    waveSpeed: 4,
    colorCycleSpeed: 3,
    particleCount: 13,
    duration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const bioluminescenUnderwaterTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
