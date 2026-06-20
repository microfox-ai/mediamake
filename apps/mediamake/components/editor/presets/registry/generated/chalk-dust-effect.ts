/**
 * ChalkDust Internal Effect Preset
 *
 * This preset simulates a chalk drawing on a blackboard effect with dust particles
 * and texture fade-in. It combines opacity animation with a grainy filter overlay
 * that gradually reveals content, plus falling chalk dust particle effects.
 *
 * INTERNAL EFFECT:
 * Returns a complex effect structure that includes:
 * - Opacity fade-in with custom timing curve for realistic chalk appearance
 * - Filter effects (contrast, brightness, turbulence texture)
 * - Text shadow for chalk glow
 * - Falling dust particle animations
 *
 * Features:
 * - Configurable chalk color (white, yellow, pink, blue)
 * - Adjustable dust amount (subtle to heavy)
 * - Multiple reveal patterns ('write', 'dust-off', 'appear')
 * - Non-linear animation progression for realistic chalk drawing
 * - Particle effects using CSS animations on pseudo-elements
 *
 * Use cases:
 * - Educational video overlays with blackboard aesthetic
 * - Nostalgic or retro-style text reveals
 * - Hand-drawn effect simulations
 * - Creative transitions with chalk dust particles
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply chalk effect to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the chalk reveal effect in seconds'),
  chalkColor: z.enum(['white', 'yellow', 'pink', 'blue']).default('white').optional().describe('Color of the chalk (white, yellow, pink, blue)'),
  dustAmount: z.number().min(0).max(1).default(0.5).optional().describe('Amount of chalk dust particles (0 = subtle, 1 = heavy)'),
  revealPattern: z.enum(['write', 'dust-off', 'appear']).default('write').optional().describe('Reveal animation pattern: write (gradual), dust-off (wipe), appear (fade)'),
  effectId: z.string().optional().describe('Optional custom ID for the effect'),
});

// --- Preset Execution Function ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Convert chalk color to RGB values
  const getChalkColorRGB = (color: string): string => {
    const colorMap: Record<string, string> = {
      white: 'rgb(255, 255, 255)',
      yellow: 'rgb(255, 235, 59)',
      pink: 'rgb(255, 182, 193)',
      blue: 'rgb(135, 206, 250)',
    };
    return colorMap[color] || colorMap.white;
  };

  // Helper function: Get chalk glow shadow based on color
  const getChalkGlow = (color: string): string => {
    const colorRGB = getChalkColorRGB(color);
    // Extract RGB values for glow
    const match = colorRGB.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match;
      return `0 0 8px rgba(${r}, ${g}, ${b}, 0.8), 0 0 15px rgba(${r}, ${g}, ${b}, 0.6)`;
    }
    return '0 0 8px rgba(255, 255, 255, 0.8)';
  };

  const chalkColor = params.chalkColor ?? 'white';
  const dustAmount = params.dustAmount ?? 0.5;
  const revealPattern = params.revealPattern ?? 'write';
  const effectId = params.effectId || `chalk-dust-effect-${params.targetId}`;

  const colorRGB = getChalkColorRGB(chalkColor);
  const chalkGlow = getChalkGlow(chalkColor);

  // Non-linear progression for realistic chalk appearance [0, 0.1, 0.4, 0.7, 0.9, 1]
  const progressionPoints = [0, 0.1, 0.4, 0.7, 0.9, 1];

  // Define ranges based on reveal pattern
  let ranges: Array<{ key: string; val: any; prog: number }> = [];

  if (revealPattern === 'write') {
    // Gradual writing effect with opacity and contrast
    ranges = [
      { key: 'opacity', val: 0, prog: progressionPoints[0] },
      { key: 'opacity', val: 0.2, prog: progressionPoints[1] },
      { key: 'opacity', val: 0.5, prog: progressionPoints[2] },
      { key: 'opacity', val: 0.8, prog: progressionPoints[3] },
      { key: 'opacity', val: 0.95, prog: progressionPoints[4] },
      { key: 'opacity', val: 1, prog: progressionPoints[5] },
      // Contrast for chalk texture appearance
      { key: 'filter', val: 'contrast(0.5) brightness(0.7)', prog: progressionPoints[0] },
      { key: 'filter', val: 'contrast(0.8) brightness(0.85)', prog: progressionPoints[2] },
      { key: 'filter', val: 'contrast(1.2) brightness(1.1)', prog: progressionPoints[4] },
      { key: 'filter', val: 'contrast(1.3) brightness(1.15)', prog: progressionPoints[5] },
      // Text shadow for chalk glow
      { key: 'textShadow', val: `0 0 0px rgba(255, 255, 255, 0)`, prog: progressionPoints[0] },
      { key: 'textShadow', val: chalkGlow, prog: progressionPoints[3] },
      { key: 'textShadow', val: chalkGlow, prog: progressionPoints[5] },
    ];
  } else if (revealPattern === 'dust-off') {
    // Wipe-like dust-off effect with translateX
    ranges = [
      { key: 'opacity', val: 0, prog: progressionPoints[0] },
      { key: 'opacity', val: 0.5, prog: progressionPoints[1] },
      { key: 'opacity', val: 1, prog: progressionPoints[3] },
      // TranslateX for wipe effect
      { key: 'translateX', val: -20, prog: progressionPoints[0] },
      { key: 'translateX', val: 0, prog: progressionPoints[3] },
      // Filter for texture
      { key: 'filter', val: 'blur(4px) contrast(0.8)', prog: progressionPoints[0] },
      { key: 'filter', val: 'blur(0px) contrast(1.3)', prog: progressionPoints[4] },
      { key: 'textShadow', val: chalkGlow, prog: progressionPoints[2] },
    ];
  } else {
    // 'appear' - Simple fade-in with texture
    ranges = [
      { key: 'opacity', val: 0, prog: progressionPoints[0] },
      { key: 'opacity', val: 0.3, prog: progressionPoints[1] },
      { key: 'opacity', val: 0.7, prog: progressionPoints[3] },
      { key: 'opacity', val: 1, prog: progressionPoints[5] },
      { key: 'filter', val: 'contrast(0.8) brightness(0.9)', prog: progressionPoints[0] },
      { key: 'filter', val: 'contrast(1.3) brightness(1.15)', prog: progressionPoints[5] },
      { key: 'textShadow', val: chalkGlow, prog: progressionPoints[2] },
    ];
  }

  // Main chalk effect
  const chalkEffectData: GenericEffectData = {
    type: 'ease-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges,
  };

  const chalkEffect = {
    id: effectId,
    componentId: 'generic',
    data: chalkEffectData,
  };

  // Calculate dust particle count based on dustAmount
  const particleCount = Math.max(1, Math.floor(dustAmount * 8));

  // Create dust particles with falling animations
  const dustParticles: RenderableComponentData[] = [];
  
  for (let i = 0; i < particleCount; i++) {
    const particleId = `dust-particle-${params.targetId}-${i}`;
    
    // Random positioning and properties
    const leftPosition = 10 + (i * (80 / particleCount)) + Math.random() * 10;
    const particleSize = 3 + Math.random() * 3;
    const fallDuration = 1 + Math.random() * 1.5;
    const fallDelay = Math.random() * params.effectDuration * 0.3;
    const fallDistance = 300 + Math.random() * 200;
    
    // Particle opacity based on dust amount
    const particleOpacity = 0.3 + (dustAmount * 0.5);

    const particleColorRGBA = colorRGB.replace('rgb', 'rgba').replace(')', `, ${particleOpacity})`);

    // Falling animation effect
    const fallEffectData: GenericEffectData = {
      type: 'ease-in',
      start: params.effectStart + fallDelay,
      duration: fallDuration,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        { key: 'translateY', val: -10, prog: 0 },
        { key: 'translateY', val: fallDistance, prog: 1 },
        { key: 'opacity', val: particleOpacity, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.8 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    const fallEffect = {
      id: `fall-effect-${particleId}`,
      componentId: 'generic',
      data: fallEffectData,
    };

    dustParticles.push({
      id: particleId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute',
        style: {
          width: `${particleSize}px`,
          height: `${particleSize}px`,
          borderRadius: '50%',
          backgroundColor: particleColorRGBA,
          left: `${leftPosition}%`,
          top: '-20px',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.effectDuration,
        },
      },
      effects: [fallEffect],
    } as RenderableComponentData);
  }

  // Chalk texture overlay (grainy filter using base64 SVG turbulence)
  const textureOverlayId = `chalk-texture-${params.targetId}`;
  
  const textureOverlay: RenderableComponentData = {
    id: textureOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="chalk-grain"></div>',
      className: 'absolute inset-0',
      style: {
        mixBlendMode: 'overlay',
        opacity: 0.2 + (dustAmount * 0.15),
        background: "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPScxMDAnIGhlaWdodD0nMTAwJz48ZmlsdGVyIGlkPSd0dXJiJz48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9JzAuNScgbnVtT2N0YXZlcz0nMycgc2VlZD0nMicvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPScxMDAnIGhlaWdodD0nMTAwJyBmaWx0ZXI9J3VybCgjdHVyYiknIGZpbGw9J3doaXRlJy8+PC9zdmc+')",
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
  } as RenderableComponentData;

  // Root container for effect structure
  const effectContainer: RenderableComponentData = {
    id: `${effectId}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    effects: [chalkEffect],
    childrenData: [textureOverlay, ...dustParticles],
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration + 2, // Extra duration for particle animations
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [effectContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'chalk-dust-effect',
  title: 'ChalkDust Internal Effect',
  description: 'Internal effect preset that simulates chalk drawing on a blackboard with dust particles and texture fade-in. Applies opacity animation with grainy filter overlay that gradually reveals content. Supports chalk color variations (white, yellow, pink, blue), dust amount control (subtle to heavy), and reveal patterns (write, dust-off, appear). Includes falling chalk dust particle effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'chalk', 'dust', 'particles', 'texture', 'reveal', 'blackboard', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'text-component',
    effectStart: 0,
    effectDuration: 2.5,
    chalkColor: 'white',
    dustAmount: 0.5,
    revealPattern: 'write',
  },
};

// --- Export ---

export const chalkDustEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
