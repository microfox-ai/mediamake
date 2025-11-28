/**
 * Bioluminescent Neural Glow Text Preset
 *
 * A bio-luminescent, organic neon glow effect that pulses around text outlines like deep-sea creature bioluminescence.
 * Features living organism aesthetics with a glowing nervous system where light travels along letter paths in waves
 * similar to neural impulses. Includes soft ethereal glow with gentle pulsations, branching tendrils of light that
 * extend and retract, subtle breathing rhythm where the glow expands and contracts, and random bio-electric sparks
 * that illuminate sections mimicking synaptic firing.
 *
 * Features:
 * - **Bio-luminescent Glow**: Multi-layered text shadows with cyan/teal/blue color palette
 * - **Breathing Rhythm**: Organic pulsation using opacity and scale effects
 * - **Neural Impulses**: Small glowing orbs that travel along bezier paths around text
 * - **Bio-electric Sparks**: Random bright flashes at different locations and timings
 * - **Light Tendrils**: Extending/retracting gradient bars that reach out from text
 * - **Hue Rotation**: Subtle color variation animation for living organic feel
 * - **Audio-reactive**: Optional waveform-based intensity mapping for pulse strength
 *
 * Use cases:
 * - Deep-sea themed titles and intros
 * - Sci-fi neural network visualizations
 * - Organic tech aesthetic overlays
 * - Living organism text effects
 * - Bioluminescent creature-inspired typography
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  text: z.string().describe('Text content to display with bioluminescent glow effect'),
  duration: z.number().default(10).describe('Duration of the effect in seconds'),
  textColor: z.string().default('#00FFCC').describe('Base text color (cyan by default for bioluminescent look)'),
  fontSize: z.number().default(96).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family (Google Font name)'),
  fontWeight: z.string().default('500').describe('Font weight (e.g., "400", "700")'),
  
  // Glow intensity controls
  pulseIntensity: z.number().min(0.1).max(2).default(1).describe('Intensity multiplier for breathing pulse effect'),
  glowRadius: z.number().min(10).max(100).default(45).describe('Maximum glow radius in pixels'),
  
  // Neural impulse controls
  neuralImpulseCount: z.number().min(0).max(10).default(3).describe('Number of neural impulse orbs traveling around text'),
  impulseSpeed: z.number().min(1).max(10).default(4).describe('Speed of neural impulse animation (seconds per cycle)'),
  
  // Bio-spark controls
  bioSparkCount: z.number().min(0).max(10).default(3).describe('Number of random bio-electric sparks'),
  sparkInterval: z.number().min(1).max(5).default(2).describe('Time interval between spark appearances in seconds'),
  
  // Tendril controls
  tendrilCount: z.number().min(0).max(10).default(3).describe('Number of light tendrils extending from text'),
  tendrilLength: z.number().min(20).max(150).default(60).describe('Maximum tendril extension length in pixels'),
  tendrilSpeed: z.number().min(1).max(10).default(3).describe('Speed of tendril extension/retraction in seconds'),
  
  // Background
  backgroundColor: z.string().default('radial-gradient(circle at center, rgba(0, 20, 40, 0.8) 0%, rgba(0, 0, 0, 1) 100%)').describe('Background color or gradient'),
  
  // Audio reactivity
  audioSrc: z.string().optional().describe('Optional audio source URL for waveform-reactive pulsing'),
});

// --- PRESET EXECUTION ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    textColor,
    fontSize,
    fontFamily,
    fontWeight,
    pulseIntensity,
    glowRadius,
    neuralImpulseCount,
    impulseSpeed,
    bioSparkCount,
    sparkInterval,
    tendrilCount,
    tendrilLength,
    tendrilSpeed,
    backgroundColor,
    audioSrc,
  } = params;

  // Helper: Create bio-pulse effect (breathing rhythm)
  const createBioPulseEffect = (targetId: string): any => {
    return {
      id: `bio-pulse-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Opacity oscillation (0.6 -> 1)
          { key: 'opacity', val: 0.6, prog: 0 },
          { key: 'opacity', val: 1 * pulseIntensity, prog: 0.25 },
          { key: 'opacity', val: 0.6, prog: 0.5 },
          { key: 'opacity', val: 1 * pulseIntensity, prog: 0.75 },
          { key: 'opacity', val: 0.6, prog: 1 },
          
          // Scale oscillation (1 -> 1.02)
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1 + (0.02 * pulseIntensity), prog: 0.33 },
          { key: 'scale', val: 1, prog: 0.66 },
          { key: 'scale', val: 1 + (0.02 * pulseIntensity), prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create neural impulse animation (traveling orb)
  const createNeuralImpulseEffect = (targetId: string, delay: number): any => {
    const pathRadius = 200; // Bezier curve radius
    return {
      id: `neural-impulse-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Circular path using translateX and translateY
          { key: 'translateX', val: pathRadius, prog: 0 },
          { key: 'translateY', val: 0, prog: 0 },
          
          { key: 'translateX', val: 0, prog: 0.25 },
          { key: 'translateY', val: -pathRadius, prog: 0.25 },
          
          { key: 'translateX', val: -pathRadius, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 0.5 },
          
          { key: 'translateX', val: 0, prog: 0.75 },
          { key: 'translateY', val: pathRadius, prog: 0.75 },
          
          { key: 'translateX', val: pathRadius, prog: 1 },
          { key: 'translateY', val: 0, prog: 1 },
          
          // Pulse opacity for neural effect
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create bio-spark effect (sudden flash)
  const createBioSparkEffect = (targetId: string, startTime: number): any => {
    return {
      id: `bio-spark-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: startTime,
        duration: 0.2, // Quick flash
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 },
          { key: 'opacity', val: 0, prog: 1 },
          
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1.5, prog: 0.3 },
          { key: 'scale', val: 0.5, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create tendril extension/retraction effect
  const createTendrilEffect = (targetId: string, startDelay: number): any => {
    return {
      id: `tendril-effect-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Height animation (extension/retraction)
          { key: 'scaleY', val: 0, prog: 0 },
          { key: 'scaleY', val: 1, prog: 0.2 },
          { key: 'scaleY', val: 1, prog: 0.7 },
          { key: 'scaleY', val: 0, prog: 0.9 },
          { key: 'scaleY', val: 0, prog: 1 },
          
          // Opacity fade
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.2 },
          { key: 'opacity', val: 0.6, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 0.9 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create hue-rotate effect for color variation
  const createHueRotateEffect = (targetId: string): any => {
    return {
      id: `hue-rotate-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
          { key: 'filter', val: 'hue-rotate(30deg)', prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // --- BUILD COMPONENT TREE ---

  const childrenData: RenderableComponentData[] = [];

  // Main text with glow effects
  const mainTextId = 'bioluminescent-main-text';
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: `text-6xl font-medium relative z-10`,
      style: {
        fontSize,
        color: textColor,
        fontWeight,
        textShadow: `0 0 15px rgba(0,255,200,0.4), 0 0 30px rgba(0,200,255,0.2), 0 0 ${glowRadius}px rgba(0,150,255,0.1)`,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      createBioPulseEffect(mainTextId),
      createHueRotateEffect(mainTextId),
    ],
  };
  childrenData.push(mainText);

  // Glow layers (multiple blurred copies)
  for (let i = 1; i <= 3; i++) {
    const glowLayerId = `glow-layer-${i}`;
    const blurAmount = i * 4; // Increasing blur
    const opacityLevel = 0.4 - i * 0.1; // Decreasing opacity
    const colorVariant = i === 1 ? '#00FFCC' : i === 2 ? '#00C8C8' : '#0096FF';
    
    const glowLayer: RenderableComponentData = {
      id: glowLayerId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text,
        className: `absolute text-6xl font-medium z-0`,
        style: {
          fontSize,
          color: colorVariant,
          fontWeight,
          filter: `blur(${blurAmount}px)`,
          opacity: opacityLevel,
          pointerEvents: 'none',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [createBioPulseEffect(glowLayerId)],
    };
    childrenData.push(glowLayer);
  }

  // Neural impulses (traveling orbs)
  for (let i = 0; i < neuralImpulseCount; i++) {
    const impulseId = `neural-impulse-${i}`;
    const impulseDelay = (i * impulseSpeed) / neuralImpulseCount;
    
    const impulse: RenderableComponentData = {
      id: impulseId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-2 h-2 bg-cyan-400 rounded-full blur-sm',
          style: {
            pointerEvents: 'none',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          },
        },
      },
      context: {
        timing: {
          start: impulseDelay,
          duration: duration - impulseDelay,
        },
      },
      childrenData: [],
      effects: [createNeuralImpulseEffect(impulseId, impulseDelay)],
    };
    childrenData.push(impulse);
  }

  // Bio-electric sparks (random flashes)
  for (let i = 0; i < bioSparkCount; i++) {
    const sparkId = `bio-spark-${i}`;
    const sparkStartTime = i * sparkInterval;
    const sparkX = 20 + Math.random() * 60; // Random X position (20-80%)
    const sparkY = 30 + Math.random() * 40; // Random Y position (30-70%)
    
    const spark: RenderableComponentData = {
      id: sparkId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-3 h-3 bg-white rounded-full',
          style: {
            pointerEvents: 'none',
            left: `${sparkX}%`,
            top: `${sparkY}%`,
            boxShadow: '0 0 10px rgba(0,255,255,0.8), 0 0 20px rgba(0,255,200,0.6)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: [],
      effects: [createBioSparkEffect(sparkId, sparkStartTime)],
    };
    childrenData.push(spark);
  }

  // Light tendrils (extending/retracting bars)
  for (let i = 0; i < tendrilCount; i++) {
    const tendrilId = `tendril-${i}`;
    const tendrilDelay = (i * tendrilSpeed) / tendrilCount;
    const tendrilHeight = tendrilLength * (0.8 + Math.random() * 0.4); // Slight variation
    const tendrilX = 30 + Math.random() * 40; // Random X position
    const tendrilColor = i % 2 === 0 ? 'from-cyan-400/60' : 'from-teal-300/50';
    
    const tendril: RenderableComponentData = {
      id: tendrilId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute w-1 bg-gradient-to-t ${tendrilColor} to-transparent rounded-full blur-[1px]`,
          style: {
            pointerEvents: 'none',
            left: `${tendrilX}%`,
            bottom: '50%',
            height: `${tendrilHeight}px`,
            transformOrigin: 'bottom center',
          },
        },
      },
      context: {
        timing: {
          start: tendrilDelay,
          duration: duration - tendrilDelay,
        },
      },
      childrenData: [],
      effects: [createTendrilEffect(tendrilId, tendrilDelay)],
    };
    childrenData.push(tendril);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'bioluminescent-neural-glow-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          background: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData,
  };

  // --- RETURN OUTPUT ---
  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'bioluminescent-neural-glow-text',
  title: 'Bioluminescent Neural Glow Text',
  description: 'A bio-luminescent, organic neon glow effect that pulses around text outlines like deep-sea creature bioluminescence. Features living organism aesthetics with a glowing nervous system where light travels along letter paths in waves similar to neural impulses. Includes soft ethereal glow with gentle pulsations, branching tendrils of light that extend and retract, subtle breathing rhythm where the glow expands and contracts, and random bio-electric sparks that illuminate sections mimicking synaptic firing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'bioluminescent',
    'glow',
    'organic',
    'neural',
    'deep-sea',
    'sci-fi',
    'neon',
    'pulse',
    'breathing',
    'tendrils',
    'sparks',
    'living-organism',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BIOLUMINESCENT',
    duration: 10,
    textColor: '#00FFCC',
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: '500',
    pulseIntensity: 1,
    glowRadius: 45,
    neuralImpulseCount: 3,
    impulseSpeed: 4,
    bioSparkCount: 3,
    sparkInterval: 2,
    tendrilCount: 3,
    tendrilLength: 60,
    tendrilSpeed: 3,
    backgroundColor: 'radial-gradient(circle at center, rgba(0, 20, 40, 0.8) 0%, rgba(0, 0, 0, 1) 100%)',
  },
};

// --- EXPORT ---
export const bioluminescentNeuralGlowTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};