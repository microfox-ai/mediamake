/**
 * Ripple Text Typokinetics Preset
 *
 * A typokinetic text animation preset where text unfolds through a ripple effect emanating from 
 * the center, like dropping a stone in water. Each word or letter appears with wave-like distortion 
 * (translateY oscillation, scale pulsing 0.8→1.2→1, subtle rotation wobble -5° to 5° to 0°) that 
 * settles into place. The ripple has decreasing amplitude as it moves outward, creating a fluid, 
 * organic emergence effect like text rising from liquid.
 *
 * Features:
 * - Radial positioning from center with distance-based staggering
 * - Wave-like vertical oscillation with decreasing amplitude
 * - Scale pulsing (0.8 → 1.2 → 1) for organic expansion
 * - Subtle rotation wobble (-5° → 5° → 0°) for fluid motion
 * - Custom cubic-bezier easing for natural settling
 * - Configurable wave speed, amplitude decay, and ripple parameters
 * - Multi-stage oscillation with keyframes at 0%, 25%, 50%, 75%, 100%
 *
 * Use cases:
 * - Creating liquid-like text emergence effects
 * - Dramatic title reveals with organic motion
 * - Water-ripple inspired typography animations
 * - Fluid brand intros and motion graphics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text to display with ripple effect'),
  
  // Layout configuration
  radialSpacing: z
    .number()
    .min(50)
    .max(500)
    .default(150)
    .describe('Distance between words/letters in radial layout (px)'),
  
  // Typography
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .describe('Font size for text elements (px)'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:700" for weight 700)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or CSS color)'),
  
  // Timing configuration
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total duration of the ripple effect (seconds)'),
  
  waveSpeed: z
    .number()
    .min(100)
    .max(1000)
    .default(500)
    .describe('Wave propagation speed (px/second) - determines stagger delay'),
  
  settleDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration for each element to settle (seconds)'),
  
  // Wave parameters
  initialAmplitude: z
    .number()
    .min(10)
    .max(200)
    .default(80)
    .describe('Initial wave amplitude (vertical oscillation in px)'),
  
  amplitudeDecay: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.6)
    .describe('Amplitude decay factor based on distance (0 = no decay, 1 = full decay)'),
  
  // Effect intensities
  scaleIntensity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Scale pulsing intensity (0.2 = scales 0.8→1.2→1)'),
  
  rotationIntensity: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Rotation wobble intensity (degrees, e.g., 5 = -5° to 5°)'),
  
  // Advanced options
  splitMode: z
    .enum(['word', 'letter'])
    .default('word')
    .describe('Split text by words or letters'),
  
  easingType: z
    .enum(['ease-out', 'ease-in-out', 'spring'])
    .default('ease-out')
    .describe('Easing function for natural motion'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
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

  // Helper: Calculate distance from center
  const calculateDistance = (x: number, y: number): number => {
    return Math.sqrt(x * x + y * y);
  };

  // Helper: Create ripple effect with multi-stage oscillation
  const createRippleEffect = (
    targetId: string,
    distance: number,
    index: number,
  ): GenericEffectData => {
    const { viewport } = props.config;
    const centerX = viewport.width / 2;
    const centerY = viewport.height / 2;

    // Calculate delay based on distance and wave speed
    const delaySeconds = distance / params.waveSpeed;

    // Calculate amplitude based on distance (decreasing amplitude)
    const normalizedDistance = distance / Math.sqrt(centerX * centerX + centerY * centerY);
    const amplitudeMultiplier = 1 - (normalizedDistance * params.amplitudeDecay);
    const amplitude = params.initialAmplitude * Math.max(0.1, amplitudeMultiplier);

    // Scale parameters
    const scaleMin = 1 - params.scaleIntensity;
    const scaleMax = 1 + params.scaleIntensity;

    // Rotation parameters
    const rotationMin = -params.rotationIntensity;
    const rotationMax = params.rotationIntensity;

    // Create multi-stage oscillation keyframes
    const effectData: GenericEffectData = {
      type: params.easingType as any,
      start: delaySeconds, // Staggered start based on distance
      duration: params.settleDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Opacity: fade in quickly
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
        { key: 'opacity', val: 1, prog: 1 },

        // TranslateY: wave oscillation with decreasing amplitude
        { key: 'translateY', val: `${-amplitude}px`, prog: 0 },
        { key: 'translateY', val: `${amplitude * 0.6}px`, prog: 0.25 },
        { key: 'translateY', val: `${-amplitude * 0.3}px`, prog: 0.5 },
        { key: 'translateY', val: `${amplitude * 0.1}px`, prog: 0.75 },
        { key: 'translateY', val: '0px', prog: 1 },

        // Scale: pulse effect (0.8 → 1.2 → 1)
        { key: 'scale', val: scaleMin, prog: 0 },
        { key: 'scale', val: scaleMax, prog: 0.25 },
        { key: 'scale', val: 1 + params.scaleIntensity * 0.3, prog: 0.5 },
        { key: 'scale', val: 1 + params.scaleIntensity * 0.1, prog: 0.75 },
        { key: 'scale', val: 1, prog: 1 },

        // Rotate: wobble effect (-5° → 5° → 0°)
        { key: 'rotate', val: rotationMin, prog: 0 },
        { key: 'rotate', val: rotationMax, prog: 0.25 },
        { key: 'rotate', val: rotationMin * 0.4, prog: 0.5 },
        { key: 'rotate', val: rotationMax * 0.2, prog: 0.75 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };

    return effectData;
  };

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);

  // Split text
  const textUnits =
    params.splitMode === 'word'
      ? params.text.split(/\s+/).filter((w) => w.length > 0)
      : params.text.split('').filter((c) => c.trim().length > 0);

  // Calculate radial positions
  const { viewport } = props.config;
  const centerX = viewport.width / 2;
  const centerY = viewport.height / 2;

  // Arrange elements in a radial pattern (circular or spiral)
  const angleStep = (2 * Math.PI) / textUnits.length;
  const radius = params.radialSpacing;

  // Create text components with effects
  const textComponents: RenderableComponentData[] = textUnits.map((unit, index) => {
    const angle = index * angleStep;
    const x = centerX + Math.cos(angle) * radius * (1 + index * 0.1); // Spiral outward
    const y = centerY + Math.sin(angle) * radius * (1 + index * 0.1);

    // Calculate distance from center for stagger delay
    const distance = calculateDistance(x - centerX, y - centerY);

    const unitId = `ripple-unit-${index}`;

    // Create ripple effect
    const rippleEffect = createRippleEffect(unitId, distance, index);

    const effect = {
      id: `ripple-effect-${index}`,
      componentId: 'generic',
      data: rippleEffect,
    };

    return {
      id: unitId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: unit,
        style: {
          position: 'absolute',
          left: `${x}px`,
          top: `${y}px`,
          fontSize: params.fontSize,
          color: params.textColor,
          transformOrigin: 'center center',
          willChange: 'transform, opacity',
          ...fontStyle,
        },
        className: 'absolute transform-gpu transition-none',
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [effect],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ripple-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: textComponents as RenderableComponentData[],
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'ripple-text-typokinetics',
  title: 'Ripple Text Typokinetics',
  description:
    'A typokinetic text animation preset where text unfolds through a ripple effect emanating from the center, like dropping a stone in water. Each word or letter appears with wave-like distortion (translateY oscillation, scale pulsing 0.8→1.2→1, subtle rotation wobble -5° to 5° to 0°) that settles into place. The ripple has decreasing amplitude as it moves outward, creating a fluid, organic emergence effect like text rising from liquid.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'ripple',
    'wave',
    'water',
    'liquid',
    'organic',
    'radial',
    'oscillation',
    'emergence',
  ],
  defaultInputParams: {
    text: 'Ripple Effect',
    radialSpacing: 150,
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    duration: 3,
    waveSpeed: 500,
    settleDuration: 1.5,
    initialAmplitude: 80,
    amplitudeDecay: 0.6,
    scaleIntensity: 0.2,
    rotationIntensity: 5,
    splitMode: 'word',
    easingType: 'ease-out',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const rippleTextTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
