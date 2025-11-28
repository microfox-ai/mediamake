/**
 * Scratched Film Texture Effect Preset
 * 
 * An internal effect preset that overlays animated scratches, hair, and film damage marks
 * to simulate vintage film degradation. Features dynamic scratch lines that move vertically
 * across the screen, static hair and fiber elements, and burn marks with feathered edges.
 * 
 * Technical Features:
 * - Dynamic scratch generation: Creates configurable number of scratch lines (1-10)
 * - Vertical scratch animation: Scratches move from top to bottom at varying speeds
 * - Static hair elements: Random positioned fibers that fade in/out over 1-2 seconds
 * - Burn marks: Dark spots with radial gradients that pulse in and fade out
 * - Layered timing: Staggered animations create realistic film damage effect
 * - Speed control: slow/medium/fast scratch movement
 * - Damage intensity: light/medium/heavy affects density and opacity
 * 
 * Use Cases:
 * - Vintage film look
 * - Old movie aesthetic
 * - Historical footage simulation
 * - Artistic film grain effects
 * - Retro video overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  scratchDensity: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Number of scratch lines to display (1-10)'),
  scratchSpeed: z
    .enum(['slow', 'medium', 'fast'])
    .default('medium')
    .describe('Speed of scratch movement: slow (3-4s), medium (2-3s), fast (1-2s)'),
  damageLevel: z
    .enum(['light', 'medium', 'heavy'])
    .default('medium')
    .describe('Intensity of damage effects: light (fewer elements, lower opacity), medium (balanced), heavy (more elements, higher opacity)'),
  includeBurns: z
    .boolean()
    .default(true)
    .describe('Whether to include burn mark effects'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .default([])
    .describe('Optional target component IDs to apply the effect to (for provider mode)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Get speed duration range based on speed parameter
  const getSpeedDuration = (speed: 'slow' | 'medium' | 'fast'): [number, number] => {
    switch (speed) {
      case 'slow':
        return [3, 4];
      case 'medium':
        return [2, 3];
      case 'fast':
        return [1, 2];
    }
  };

  // Helper: Get opacity range based on damage level
  const getOpacityRange = (level: 'light' | 'medium' | 'heavy'): [number, number] => {
    switch (level) {
      case 'light':
        return [0.2, 0.4];
      case 'medium':
        return [0.3, 0.5];
      case 'heavy':
        return [0.4, 0.6];
    }
  };

  // Helper: Random number in range
  const random = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Random integer in range
  const randomInt = (min: number, max: number): number => {
    return Math.floor(random(min, max));
  };

  const [speedMin, speedMax] = getSpeedDuration(params.scratchSpeed);
  const [opacityMin, opacityMax] = getOpacityRange(params.damageLevel);

  // Calculate number of hair and burn elements based on damage level
  const hairCount = params.damageLevel === 'light' ? 3 : params.damageLevel === 'medium' ? 5 : 8;
  const burnCount = params.includeBurns
    ? params.damageLevel === 'light'
      ? 2
      : params.damageLevel === 'medium'
      ? 4
      : 6
    : 0;

  // ============================================================================
  // SCRATCH LINES GENERATION
  // ============================================================================

  const scratchLines: RenderableComponentData[] = [];

  for (let i = 0; i < params.scratchDensity; i++) {
    const scratchId = `scratch-line-${i}`;
    const scratchDuration = random(speedMin, speedMax);
    const scratchWidth = random(1, 3);
    const scratchLeft = random(5, 95); // Position as percentage
    const scratchOpacity = random(opacityMin, opacityMax);
    const scratchDelay = random(0, params.duration - scratchDuration);

    // Scratch effect: translateY from -100% to 100% with opacity fade
    const scratchEffect: GenericEffectData = {
      type: 'linear',
      start: scratchDelay,
      duration: scratchDuration,
      mode: 'provider',
      targetIds: [scratchId],
      ranges: [
        // Vertical movement
        { key: 'translateY', val: -100, prog: 0 },
        { key: 'translateY', val: 200, prog: 1 },
        // Opacity animation
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: scratchOpacity, prog: 0.1 },
        { key: 'opacity', val: scratchOpacity, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    scratchLines.push({
      id: scratchId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${scratchWidth}px; height: 100vh; background: white;"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          left: `${scratchLeft}%`,
          top: '-100%',
          filter: 'blur(0.5px)',
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `scratch-effect-${i}`,
          componentId: 'generic',
          data: scratchEffect,
        },
      ],
    } as RenderableComponentData);
  }

  // ============================================================================
  // HAIR ELEMENTS GENERATION
  // ============================================================================

  const hairElements: RenderableComponentData[] = [];

  for (let i = 0; i < hairCount; i++) {
    const hairId = `hair-element-${i}`;
    const hairWidth = randomInt(40, 100);
    const hairHeight = random(0.5, 1.5);
    const hairLeft = random(5, 95);
    const hairTop = random(10, 90);
    const hairRotation = randomInt(-45, 45);
    const hairOpacity = random(0.15, 0.35);
    const hairStart = random(0, params.duration - 2);
    const hairDuration = random(1, 2);

    // Hair effect: fade in and out
    const hairEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: hairStart,
      duration: hairDuration,
      mode: 'provider',
      targetIds: [hairId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: hairOpacity, prog: 0.05 },
        { key: 'opacity', val: hairOpacity, prog: 0.8 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    hairElements.push({
      id: hairId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${hairWidth}px; height: ${hairHeight}px; background: rgba(255,255,255,0.2); transform: rotate(${hairRotation}deg);"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          left: `${hairLeft}%`,
          top: `${hairTop}%`,
          opacity: 0,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `hair-effect-${i}`,
          componentId: 'generic',
          data: hairEffect,
        },
      ],
    } as RenderableComponentData);
  }

  // ============================================================================
  // BURN MARKS GENERATION
  // ============================================================================

  const burnMarks: RenderableComponentData[] = [];

  for (let i = 0; i < burnCount; i++) {
    const burnId = `burn-mark-${i}`;
    const burnSize = randomInt(40, 80);
    const burnLeft = random(10, 90);
    const burnTop = random(10, 90);
    const burnOpacity = params.damageLevel === 'light' ? random(0.5, 0.7) : params.damageLevel === 'medium' ? random(0.6, 0.8) : random(0.7, 0.9);
    const burnStart = random(0, params.duration - 2.5);
    const burnDuration = random(1.5, 2.5);

    // Burn effect: scale up and fade in/out
    const burnEffect: GenericEffectData = {
      type: 'ease-out',
      start: burnStart,
      duration: burnDuration,
      mode: 'provider',
      targetIds: [burnId],
      ranges: [
        // Scale animation
        { key: 'scale', val: 0, prog: 0 },
        { key: 'scale', val: 1.2, prog: 0.3 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        // Opacity animation
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: burnOpacity, prog: 0.2 },
        { key: 'opacity', val: burnOpacity, prog: 0.6 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    burnMarks.push({
      id: burnId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${burnSize}px; height: ${burnSize}px; background: radial-gradient(circle, rgba(0,0,0,0.8) 0%, transparent 70%); border-radius: 50%;"></div>`,
        className: 'absolute pointer-events-none',
        style: {
          left: `${burnLeft}%`,
          top: `${burnTop}%`,
          opacity: 0,
          transform: 'scale(0)',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `burn-effect-${i}`,
          componentId: 'generic',
          data: burnEffect,
        },
      ],
    } as RenderableComponentData);
  }

  // ============================================================================
  // CONTAINER STRUCTURE
  // ============================================================================

  const scratchContainer: RenderableComponentData = {
    id: 'scratch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: scratchLines,
  } as RenderableComponentData;

  const hairContainer: RenderableComponentData = {
    id: 'hair-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: hairElements,
  } as RenderableComponentData;

  const burnContainer: RenderableComponentData = {
    id: 'burn-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: burnMarks,
  } as RenderableComponentData;

  // Root container with screen blend mode for realistic film overlay
  const rootContainer: RenderableComponentData = {
    id: 'scratched-film-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'screen',
          zIndex: 1000,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [scratchContainer, hairContainer, burnContainer],
  } as RenderableComponentData;

  // ============================================================================
  // OUTPUT
  // ============================================================================

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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'ScratchedFilmTexture',
  title: 'Scratched Film Texture Effect',
  description:
    'Internal effect preset that overlays animated scratches, hair, and film damage marks on video content. Features dynamic scratch lines that move vertically, static hair elements, and burn marks with feathered edges. Creates authentic vintage film degradation effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'film',
    'vintage',
    'scratches',
    'grain',
    'damage',
    'retro',
    'texture',
    'overlay',
    'internal',
    'generic',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'children',
  defaultInputParams: {
    scratchDensity: 5,
    scratchSpeed: 'medium',
    damageLevel: 'medium',
    includeBurns: true,
    duration: 10,
    targetIds: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const ScratchedFilmTexturePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
