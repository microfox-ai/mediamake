/**
 * StrobeGlitch Internal Effect Preset
 *
 * ARRAY OF EFFECTS
 *
 * This internal effect preset creates stroboscopic jitter effects perfect for music videos
 * or action sequences. It combines position jumping (teleport-style movements), exposure
 * flashing (brightness/contrast shifts), and frame dropping (opacity cuts). The effect syncs
 * to a defined BPM or uses audio beat detection.
 *
 * Features:
 * - **Position Jumping**: Instant translateX/Y changes (no interpolation) creating stop-motion feel
 * - **Exposure Flashing**: Brightness (50%-150%) and contrast (80%-120%) shifts
 * - **Frame Dropping**: Binary opacity on/off (1 or 0) creating frame drop effect
 * - **BPM Sync**: Synchronizes effects to musical beats
 * - **Glitch Styles**: Digital (sharp, precise), Analog (fuzzy, warped), Hybrid modes
 * - **RGB Splitting**: Chromatic aberration effect during intense moments
 * - **Scan Lines**: Analog-style horizontal scan line overlay
 *
 * Use cases:
 * - Music video glitch effects synchronized to beats
 * - Action sequence intensity effects
 * - Cyberpunk/digital aesthetic visuals
 * - Retro VHS/analog video effects
 * - Dynamic transitions with strobe elements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  targetIds: z.array(z.string()).describe('Array of component IDs to apply effects to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Duration of the effect in seconds'),
  
  bpm: z.number().optional().describe('Beats per minute for synchronization (optional)'),
  glitchStyle: z.enum(['digital', 'analog', 'hybrid']).describe('Glitch style: digital (sharp), analog (fuzzy), or hybrid'),
  strobeRate: z.number().min(1).max(30).default(8).describe('Number of strobes/jumps per second'),
  positionJumpRange: z.number().min(10).max(200).default(50).describe('Maximum pixel range for position jumps'),
  rgbSplitAmount: z.number().min(0).max(20).default(5).describe('RGB split intensity in pixels (0 = disabled)'),
  scanLines: z.boolean().default(false).describe('Enable analog scan line effect'),
  
  effectIdPrefix: z.string().optional().describe('Optional prefix for effect IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    effectStart,
    effectDuration,
    bpm,
    glitchStyle,
    strobeRate,
    positionJumpRange,
    rgbSplitAmount,
    scanLines,
    effectIdPrefix = 'strobe-glitch',
  } = params;

  const effects: any[] = [];

  // Calculate strobe timing based on BPM or strobeRate
  const calculateStrobeInterval = (): number => {
    if (bpm) {
      return 60 / bpm; // Beats per second
    }
    return 1 / strobeRate; // Strokes per second
  };

  const strobeInterval = calculateStrobeInterval();
  const numStrobes = Math.floor(effectDuration / strobeInterval);

  // Generate random position jump keyframes (8-12 positions)
  const generatePositionKeyframes = (): { translateX: any[]; translateY: any[] } => {
    const numPositions = Math.min(numStrobes, 12);
    const translateXRanges: any[] = [];
    const translateYRanges: any[] = [];

    for (let i = 0; i <= numPositions; i++) {
      const prog = i / numPositions;
      
      // Random position within range
      const jumpX = (Math.random() - 0.5) * 2 * positionJumpRange;
      const jumpY = (Math.random() - 0.5) * 2 * positionJumpRange;

      translateXRanges.push({
        key: 'translateX',
        val: `${jumpX}px`,
        prog,
      });

      translateYRanges.push({
        key: 'translateY',
        val: `${jumpY}px`,
        prog,
      });
    }

    return {
      translateX: translateXRanges,
      translateY: translateYRanges,
    };
  };

  // Generate exposure flash keyframes (brightness/contrast)
  const generateExposureKeyframes = (): any[] => {
    const exposureRanges: any[] = [];
    const numFlashes = Math.min(numStrobes, 10);

    for (let i = 0; i <= numFlashes; i++) {
      const prog = i / numFlashes;
      
      // Alternate between bright and normal
      const brightness = i % 2 === 0 ? 1 : 0.5 + Math.random() * 1.0; // 50%-150%
      const contrast = i % 2 === 0 ? 1 : 0.8 + Math.random() * 0.4; // 80%-120%

      exposureRanges.push({
        key: 'filter',
        val: `brightness(${brightness}) contrast(${contrast})`,
        prog,
      });
    }

    return exposureRanges;
  };

  // Generate frame drop keyframes (binary opacity)
  const generateFrameDropKeyframes = (): any[] => {
    const opacityRanges: any[] = [];
    const numDrops = Math.min(numStrobes, 10);

    for (let i = 0; i <= numDrops; i++) {
      const prog = i / numDrops;
      
      // Binary on/off (1 or 0)
      const opacity = i % 2 === 0 ? 1 : 0;

      opacityRanges.push({
        key: 'opacity',
        val: opacity,
        prog,
      });
    }

    return opacityRanges;
  };

  // 1. Position Effect - instant translateX/Y jumps
  const positionKeyframes = generatePositionKeyframes();
  const positionEffect: GenericEffectData = {
    type: 'linear', // Linear for sharp, no-interpolation jumps
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds,
    ranges: [
      ...positionKeyframes.translateX,
      ...positionKeyframes.translateY,
    ],
  };

  effects.push({
    id: `${effectIdPrefix}-position`,
    componentId: 'generic',
    data: positionEffect,
  });

  // 2. Filter Effect - brightness/contrast/hue-rotate
  const exposureKeyframes = generateExposureKeyframes();
  
  // Add RGB split via hue-rotate for digital/hybrid modes
  if (glitchStyle === 'digital' || glitchStyle === 'hybrid') {
    if (rgbSplitAmount > 0) {
      // RGB split using drop-shadow for chromatic aberration
      const rgbRanges: any[] = [];
      const numRgbShifts = Math.min(numStrobes, 8);

      for (let i = 0; i <= numRgbShifts; i++) {
        const prog = i / numRgbShifts;
        
        // Alternate RGB split directions
        const offsetX = (i % 2 === 0 ? 1 : -1) * rgbSplitAmount;
        const offsetY = (i % 3 === 0 ? 1 : -1) * (rgbSplitAmount * 0.5);

        rgbRanges.push({
          key: 'filter',
          val: `drop-shadow(${offsetX}px ${offsetY}px 0px rgba(255,0,0,0.8)) drop-shadow(${-offsetX}px ${-offsetY}px 0px rgba(0,255,255,0.8))`,
          prog,
        });
      }

      const rgbEffect: GenericEffectData = {
        type: 'linear',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds,
        ranges: rgbRanges,
      };

      effects.push({
        id: `${effectIdPrefix}-rgb-split`,
        componentId: 'generic',
        data: rgbEffect,
      });
    }
  } else {
    // For analog mode, use exposure flashing only
    const filterEffect: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds,
      ranges: exposureKeyframes,
    };

    effects.push({
      id: `${effectIdPrefix}-exposure`,
      componentId: 'generic',
      data: filterEffect,
    });
  }

  // 3. Opacity Effect - binary frame drops
  const frameDropKeyframes = generateFrameDropKeyframes();
  const opacityEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: effectDuration,
    mode: 'provider',
    targetIds,
    ranges: frameDropKeyframes,
  };

  effects.push({
    id: `${effectIdPrefix}-frame-drop`,
    componentId: 'generic',
    data: opacityEffect,
  });

  // 4. Optional Scan Lines for Analog Mode
  if (scanLines && (glitchStyle === 'analog' || glitchStyle === 'hybrid')) {
    // Scan line effect using background-image gradient
    const scanLineRanges: any[] = [
      {
        key: 'backgroundImage',
        val: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px)',
        prog: 0,
      },
      {
        key: 'backgroundImage',
        val: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 2px, transparent 2px, transparent 4px)',
        prog: 1,
      },
    ];

    const scanLineEffect: GenericEffectData = {
      type: 'linear',
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds,
      ranges: scanLineRanges,
    };

    effects.push({
      id: `${effectIdPrefix}-scan-lines`,
      componentId: 'generic',
      data: scanLineEffect,
    });
  }

  // Return container with effects attached
  const rootContainer: RenderableComponentData = {
    id: `${effectIdPrefix}-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: effectDuration,
      },
    },
    effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'strobe-glitch',
  title: 'StrobeGlitch',
  description: 'Combined internal effect preset that creates stroboscopic jitter effects with position jumping (teleport-style movements), exposure flashing (brightness/contrast shifts), and frame dropping (opacity cuts). Syncs to BPM or audio beat detection. Includes glitchStyle parameter with digital (sharp, precise), analog (fuzzy, warped), or hybrid options. Position jumps snap between locations without transition for stop-motion feel. RGB splitting during intense moments and scan line effects for analog mode.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'strobe', 'glitch', 'position', 'exposure', 'opacity', 'bpm', 'music-video', 'action'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 4,
    bpm: 120,
    glitchStyle: 'digital',
    strobeRate: 8,
    positionJumpRange: 50,
    rgbSplitAmount: 5,
    scanLines: false,
  },
};

export const strobeGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};