/**
 * Tidal Wave Text Preset
 *
 * Creates a shore break text animation where letters are swept by periodic large waves
 * followed by smaller ripples. Each major wave consists of four phases:
 * 1. Tension (0.5s): Subtle vibration indicating incoming surge
 * 2. Surge (0.3s): Rapid, powerful movement - the big wave hits
 * 3. Flow (1s): Smooth motion as the wave carries letters
 * 4. Settle (0.5s): Letters return but never quite to their original position
 *
 * Features:
 * - **Wave Phases**: Tension → Surge → Flow → Settle (2.3s cycle)
 * - **Persistent Displacement**: Letters never return to exact original spots
 * - **Foam Particles**: Small white dots appear at wave crests during surge
 * - **Wet Effect**: Glossy sheen on recently hit letters
 * - **Position Scrambling**: Letters slightly scramble during big waves
 * - **Ripple Effects**: Small aftershocks follow major waves
 *
 * Use cases:
 * - Dynamic text animations with natural wave motion
 * - Shore break / ocean-themed text effects
 * - Kinetic typography with realistic physics
 * - Eye-catching title sequences
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ===========================
// PARAMETERS SCHEMA
// ===========================

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to animate with tidal wave effect'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(80)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  backgroundColor: z
    .string()
    .optional()
    .default('#001a33')
    .describe('Background color for the scene'),
  waveIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Wave intensity multiplier (affects displacement and effect strength)'),
  waveCycleDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2.3)
    .describe('Duration of one complete wave cycle in seconds'),
  foamParticleCount: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Number of foam particles per wave'),
  displacementRange: z
    .number()
    .min(0)
    .max(100)
    .default(15)
    .describe('Maximum persistent displacement in pixels after each wave'),
});

// ===========================
// PRESET EXECUTION
// ===========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    font,
    backgroundColor,
    waveIntensity,
    waveCycleDuration,
    foamParticleCount,
    displacementRange,
  } = params;

  const { config } = props;
  const fps = config?.fps ?? 30;

  // Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Inter');

  // Wave phase timings (relative to wave cycle start)
  const tensionDuration = 0.5;
  const surgeDuration = 0.3;
  const flowDuration = 1.0;
  const settleDuration = 0.5;

  // Calculate phase start times within cycle
  const tensionStart = 0;
  const surgeStart = tensionStart + tensionDuration;
  const flowStart = surgeStart + surgeDuration;
  const settleStart = flowStart + flowDuration;

  // Split text into letters
  const letters = text.split('');

  // Generate persistent displacement for each letter (random offsets that accumulate)
  const generatePersistentOffset = (index: number): { x: number; y: number } => {
    // Use index as seed for pseudo-random but consistent offsets
    const seed = index * 7919 + 2654435761;
    const random = (seed % 1000) / 1000;
    const angle = random * Math.PI * 2;
    const distance = (random * displacementRange * waveIntensity) / 2;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Create letter components with wave effects
  const letterComponents = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const stagger = index * 0.05; // Stagger each letter by 50ms

    // Calculate persistent offset
    const persistentOffset = generatePersistentOffset(index);

    // Random values for wave motion (unique per letter)
    const seed = index * 13 + 42;
    const randomX = ((seed * 9301 + 49297) % 233280) / 233280 - 0.5;
    const randomY = ((seed * 4567 + 12345) % 233280) / 233280 - 0.5;
    const randomRotate = ((seed * 7919 + 2341) % 233280) / 233280 - 0.5;

    // Wave amplitudes (scaled by intensity)
    const bigWaveY = -30 * waveIntensity;
    const bigWaveX = randomX * 20 * waveIntensity;
    const bigWaveRotate = randomRotate * 15 * waveIntensity;
    const rippleY = 3 * waveIntensity;

    // Create wave effect for this letter
    const waveEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: stagger,
      duration: waveCycleDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // === TENSION PHASE (subtle vibration) ===
        // Start position
        { key: 'translateY', val: 0, prog: tensionStart / waveCycleDuration },
        { key: 'translateX', val: persistentOffset.x, prog: tensionStart / waveCycleDuration },
        { key: 'rotate', val: 0, prog: tensionStart / waveCycleDuration },
        // Vibration
        {
          key: 'translateY',
          val: randomY * 2 * waveIntensity,
          prog: (tensionStart + tensionDuration * 0.5) / waveCycleDuration,
        },
        {
          key: 'translateX',
          val: persistentOffset.x + randomX * 2 * waveIntensity,
          prog: (tensionStart + tensionDuration * 0.5) / waveCycleDuration,
        },

        // === SURGE PHASE (rapid powerful movement) ===
        // Big wave hits
        {
          key: 'translateY',
          val: bigWaveY,
          prog: (surgeStart + surgeDuration * 0.5) / waveCycleDuration,
        },
        {
          key: 'translateX',
          val: persistentOffset.x + bigWaveX,
          prog: (surgeStart + surgeDuration * 0.5) / waveCycleDuration,
        },
        {
          key: 'rotate',
          val: bigWaveRotate,
          prog: (surgeStart + surgeDuration * 0.5) / waveCycleDuration,
        },
        {
          key: 'scale',
          val: 1.1,
          prog: (surgeStart + surgeDuration * 0.3) / waveCycleDuration,
        },

        // === FLOW PHASE (smooth motion) ===
        // Carried by wave
        {
          key: 'translateY',
          val: bigWaveY * 0.5,
          prog: (flowStart + flowDuration * 0.5) / waveCycleDuration,
        },
        {
          key: 'translateX',
          val: persistentOffset.x + bigWaveX * 0.7,
          prog: (flowStart + flowDuration * 0.5) / waveCycleDuration,
        },
        {
          key: 'rotate',
          val: bigWaveRotate * 0.5,
          prog: (flowStart + flowDuration * 0.5) / waveCycleDuration,
        },
        {
          key: 'scale',
          val: 1.05,
          prog: (flowStart + flowDuration * 0.5) / waveCycleDuration,
        },

        // === SETTLE PHASE (return with offset) ===
        // Ripple
        {
          key: 'translateY',
          val: rippleY,
          prog: (settleStart + settleDuration * 0.3) / waveCycleDuration,
        },
        // Final position (displaced)
        {
          key: 'translateY',
          val: persistentOffset.y,
          prog: (settleStart + settleDuration) / waveCycleDuration,
        },
        {
          key: 'translateX',
          val: persistentOffset.x,
          prog: (settleStart + settleDuration) / waveCycleDuration,
        },
        {
          key: 'rotate',
          val: 0,
          prog: (settleStart + settleDuration) / waveCycleDuration,
        },
        {
          key: 'scale',
          val: 1,
          prog: (settleStart + settleDuration) / waveCycleDuration,
        },
      ],
    };

    // Wet effect (glossy sheen after surge)
    const wetEffect: GenericEffectData = {
      type: 'ease-out',
      start: stagger + surgeStart,
      duration: flowDuration + settleDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Glossy during/after surge
        {
          key: 'filter',
          val: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))',
          prog: 0,
        },
        {
          key: 'filter',
          val: 'drop-shadow(0 0 3px rgba(255,255,255,0.6))',
          prog: 0.3,
        },
        // Fade out glossy
        {
          key: 'filter',
          val: 'drop-shadow(0 0 0px rgba(255,255,255,0))',
          prog: 1,
        },
      ],
    };

    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          display: 'inline-block',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: 10, // Long duration for continuous animation
        },
      },
      effects: [
        {
          id: `wave-${letterId}`,
          componentId: 'generic',
          data: waveEffect,
        },
        {
          id: `wet-${letterId}`,
          componentId: 'generic',
          data: wetEffect,
        },
      ],
    };
  });

  // Create foam particles
  const foamParticles = Array.from({ length: foamParticleCount }).map((_, i) => {
    const particleId = `foam-${i}`;
    
    // Random position along the text (horizontally distributed)
    const seed = i * 17 + 83;
    const horizontalPos = ((seed * 9301 + 49297) % 233280) / 233280;
    const verticalOffset = ((seed * 4567 + 12345) % 233280) / 233280;
    
    // Position relative to wave crest (appears during surge)
    const leftPos = `${horizontalPos * 100}%`;
    const topPos = `${30 + verticalOffset * 20}%`; // Wave crest area
    
    // Stagger appearance
    const stagger = i * 0.02;
    
    // Foam particle effect (appear during surge, fade during flow)
    const foamEffect: GenericEffectData = {
      type: 'ease-out',
      start: stagger + surgeStart,
      duration: surgeDuration + flowDuration * 0.5,
      mode: 'provider',
      targetIds: [particleId],
      ranges: [
        // Appear
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.8, prog: 0.2 },
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1.2, prog: 0.3 },
        // Fade out
        { key: 'opacity', val: 0, prog: 1 },
        { key: 'scale', val: 0.8, prog: 1 },
        // Float up
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -20, prog: 1 },
      ],
    };

    return {
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute w-1 h-1 bg-white rounded-full',
        style: {
          top: topPos,
          left: leftPos,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: 10,
        },
      },
      effects: [
        {
          id: `foam-effect-${particleId}`,
          componentId: 'generic',
          data: foamEffect,
        },
      ],
    };
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'tidal-wave-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-full w-full overflow-hidden flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    childrenData: [
      // Text letters container
      {
        id: 'text-letters-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center relative',
            style: {
              gap: '0.1em',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 10,
          },
        },
        childrenData: letterComponents as RenderableComponentData[],
      },
      // Foam particles container
      {
        id: 'foam-particles-container',
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
            duration: 10,
          },
        },
        childrenData: foamParticles as RenderableComponentData[],
      },
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

// ===========================
// PRESET METADATA
// ===========================

const presetMetadata: PresetMetadata = {
  id: 'tidal-wave-text',
  title: 'Tidal Wave Text',
  description:
    'A shore break text animation where letters are swept by periodic large waves followed by smaller ripples. Features tension-building tremors before each major wave, foam-like particles at wave crests, and a wet glossy sheen effect on recently hit letters. Letters are displaced and scrambled by waves, never quite returning to their exact original positions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'kinetic',
    'wave',
    'ocean',
    'shore-break',
    'animated',
    'particles',
    'foam',
    'wet-effect',
    'displacement',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'TIDAL WAVE',
    fontSize: 80,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    backgroundColor: '#001a33',
    waveIntensity: 1,
    waveCycleDuration: 2.3,
    foamParticleCount: 20,
    displacementRange: 15,
  },
};

// ===========================
// EXPORTS
// ===========================

export const tidalWaveTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
