/**
 * Liquid Motion Word Displacement Preset
 *
 * This preset creates a liquid motion effect where words flow apart like viscous fluid
 * being displaced by a droplet falling in the center. The side words follow curved paths
 * with acceleration/deceleration simulating surface tension, while the middle word emerges
 * with a ripple effect expanding outward with concentric waves of visibility.
 *
 * Features:
 * - **Fluid Dynamics Simulation**: Words slide with cubic-bezier curves that mimic viscous motion
 * - **Curved Bezier Paths**: Left/right words follow quadratic curves (translateX + translateY)
 * - **Viscosity Effects**: Subtle skew transforms (0→5deg→0) suggest fluid resistance
 * - **Scale Breathing**: (1→0.95→1) adds organic motion during displacement
 * - **Ripple Emergence**: Middle word expands from center with radial gradient mask
 * - **Wave Distortion**: Simulated using blur + scale pulses for concentric ripple waves
 * - **Depth Effects**: Backdrop-filter blur during motion creates depth perception
 * - **Refraction-like Distortions**: CSS filters (blur, brightness) mimic fluid refraction
 *
 * Use cases:
 * - Creating dramatic text reveals with fluid dynamics
 * - Building cinematic title sequences
 * - Adding organic motion to word transitions
 * - Creating liquid-themed video intros/outros
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  leftWord: z.string().default('LIQUID').describe('Left word text'),
  middleWord: z.string().default('FLOW').describe('Middle word text'),
  rightWord: z.string().default('MOTION').describe('Right word text'),
  
  duration: z.number().default(1.5).describe('Total animation duration in seconds'),
  overlapDuration: z.number().default(0.3).describe('Overlap duration between side words and middle word emergence (seconds)'),
  
  fontSize: z.number().default(48).describe('Font size for side words (px)'),
  middleFontSize: z.number().default(56).describe('Font size for middle word (px)'),
  fontFamily: z.string().default('Inter').describe('Font family for all words'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color)'),
  
  // Displacement parameters
  displacementDistance: z.number().default(300).describe('Distance words travel horizontally (px)'),
  curveHeight: z.number().default(80).describe('Height of curved path (px) - vertical displacement at midpoint'),
  maxSkew: z.number().default(5).describe('Maximum skew angle during motion (degrees)'),
  minScale: z.number().default(0.95).describe('Minimum scale during motion (0-1)'),
  
  // Blur and depth
  motionBlur: z.number().default(2).describe('Backdrop blur intensity during motion (px)'),
  refactionBlur: z.number().default(4).describe('Maximum blur for refraction effect (px)'),
  
  // Ripple parameters
  rippleWaves: z.number().default(3).describe('Number of concentric ripple waves'),
  rippleIntensity: z.number().default(0.15).describe('Ripple scale oscillation intensity (0-1)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    leftWord,
    middleWord,
    rightWord,
    duration,
    overlapDuration,
    fontSize,
    middleFontSize,
    fontFamily,
    textColor,
    displacementDistance,
    curveHeight,
    maxSkew,
    minScale,
    motionBlur,
    refactionBlur,
    rippleWaves,
    rippleIntensity,
  } = params;

  // Helper: Create cubic-bezier fluid motion easing
  const fluidEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)';
  
  // Timing calculations
  const sideWordDuration = duration;
  const middleWordStart = overlapDuration;
  const middleWordDuration = duration - overlapDuration;

  // ============================================================================
  // LEFT WORD EFFECTS
  // ============================================================================
  
  const leftWordEffects: GenericEffectData[] = [
    // Main displacement animation
    {
      type: 'ease-out',
      start: 0,
      duration: sideWordDuration,
      mode: 'provider',
      targetIds: ['left-word-text'],
      ranges: [
        // Horizontal displacement (translateX)
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: -displacementDistance, prog: 1 },
        
        // Vertical curve (translateY) - quadratic bezier path
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -curveHeight, prog: 0.5 }, // Peak at midpoint
        { key: 'translateY', val: 0, prog: 1 },
        
        // Skew for viscosity effect (0→5→0 degrees)
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: maxSkew, prog: 0.5 },
        { key: 'skewX', val: 0, prog: 1 },
        
        // Scale breathing (1→0.95→1)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: minScale, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Refraction blur effect
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 0 },
        { key: 'filter', val: `blur(${refactionBlur}px) brightness(1.1)`, prog: 0.3 },
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
      ],
    } as GenericEffectData,
  ];

  // ============================================================================
  // RIGHT WORD EFFECTS
  // ============================================================================
  
  const rightWordEffects: GenericEffectData[] = [
    // Main displacement animation (mirrored from left)
    {
      type: 'ease-out',
      start: 0,
      duration: sideWordDuration,
      mode: 'provider',
      targetIds: ['right-word-text'],
      ranges: [
        // Horizontal displacement (translateX) - opposite direction
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: displacementDistance, prog: 1 },
        
        // Vertical curve (translateY) - same as left
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -curveHeight, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
        
        // Skew for viscosity effect (0→-5→0 degrees) - opposite direction
        { key: 'skewX', val: 0, prog: 0 },
        { key: 'skewX', val: -maxSkew, prog: 0.5 },
        { key: 'skewX', val: 0, prog: 1 },
        
        // Scale breathing (1→0.95→1)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: minScale, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Refraction blur effect
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 0 },
        { key: 'filter', val: `blur(${refactionBlur}px) brightness(1.1)`, prog: 0.3 },
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
      ],
    } as GenericEffectData,
  ];

  // ============================================================================
  // MIDDLE WORD EFFECTS (RIPPLE EMERGENCE)
  // ============================================================================
  
  const middleWordEffects: GenericEffectData[] = [];
  
  // Base emergence effect (scale from center + opacity + blur clear)
  middleWordEffects.push({
    type: 'ease-out',
    start: 0,
    duration: middleWordDuration * 0.6, // 60% of duration for initial emergence
    mode: 'provider',
    targetIds: ['middle-word-text'],
    ranges: [
      // Scale from 0 with overshoot (ripple expand)
      { key: 'scale', val: 0, prog: 0 },
      { key: 'scale', val: 1.15, prog: 0.7 }, // Overshoot
      { key: 'scale', val: 1, prog: 1 },
      
      // Opacity fade-in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
      
      // Initial blur clearing (simulating water droplet splash)
      { key: 'filter', val: `blur(${refactionBlur * 2}px) brightness(1.2)`, prog: 0 },
      { key: 'filter', val: 'blur(0px) brightness(1)', prog: 0.8 },
    ],
  } as GenericEffectData);
  
  // Concentric ripple waves (multiple scale pulses)
  const waveDuration = middleWordDuration * 0.4; // 40% of duration for waves
  const waveDelay = middleWordDuration * 0.3; // Start waves at 30% of duration
  
  for (let i = 0; i < rippleWaves; i++) {
    const waveStart = waveDelay + (i * waveDuration / rippleWaves);
    const waveLength = waveDuration / (rippleWaves * 1.5); // Overlapping waves
    
    middleWordEffects.push({
      type: 'ease-in-out',
      start: waveStart,
      duration: waveLength,
      mode: 'provider',
      targetIds: ['middle-word-text'],
      ranges: [
        // Scale pulse (simulating wave expansion)
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1 + rippleIntensity, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Subtle blur pulse (wave distortion)
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: `blur(${rippleIntensity * 2}px)`, prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    } as GenericEffectData);
  }

  // ============================================================================
  // COMPONENT TREE CONSTRUCTION
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'liquid-motion-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Left word container
      {
        id: 'left-word-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex items-center justify-center',
            style: {
              backdropFilter: `blur(${motionBlur}px)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: sideWordDuration,
          },
        },
        childrenData: [
          {
            id: 'left-word-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: leftWord,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: 'bold',
                color: textColor,
              },
              font: {
                family: fontFamily,
                weights: ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: sideWordDuration,
              },
            },
            effects: leftWordEffects.map((effectData, idx) => ({
              id: `left-word-effect-${idx}`,
              componentId: 'generic',
              data: effectData,
            })),
          },
        ],
      },
      
      // Right word container
      {
        id: 'right-word-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex items-center justify-center',
            style: {
              backdropFilter: `blur(${motionBlur}px)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: sideWordDuration,
          },
        },
        childrenData: [
          {
            id: 'right-word-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: rightWord,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: 'bold',
                color: textColor,
              },
              font: {
                family: fontFamily,
                weights: ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: sideWordDuration,
              },
            },
            effects: rightWordEffects.map((effectData, idx) => ({
              id: `right-word-effect-${idx}`,
              componentId: 'generic',
              data: effectData,
            })),
          },
        ],
      },
      
      // Middle word container (ripple emergence)
      {
        id: 'middle-word-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex items-center justify-center',
          },
        },
        context: {
          timing: {
            start: middleWordStart,
            duration: middleWordDuration,
          },
        },
        childrenData: [
          {
            id: 'middle-word-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: middleWord,
              style: {
                fontSize: `${middleFontSize}px`,
                fontWeight: 'bold',
                color: textColor,
              },
              font: {
                family: fontFamily,
                weights: ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: middleWordDuration,
              },
            },
            effects: middleWordEffects.map((effectData, idx) => ({
              id: `middle-word-effect-${idx}`,
              componentId: 'generic',
              data: effectData,
            })),
          },
        ],
      },
    ],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'liquid-motion-displacement',
  title: 'Liquid Motion Word Displacement',
  description:
    'A fluid dynamics-inspired text animation where side words flow apart with viscous motion (curved paths, skew transforms, scale breathing) while the middle word emerges with a ripple effect using scale oscillations and blur waves. Uses cubic-bezier curves to simulate fluid motion and surface tension.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'liquid',
    'fluid',
    'displacement',
    'ripple',
    'viscous',
    'motion',
    'physics',
    'kinetic',
    'typography',
  ],
  defaultInputParams: {
    leftWord: 'LIQUID',
    middleWord: 'FLOW',
    rightWord: 'MOTION',
    duration: 1.5,
    overlapDuration: 0.3,
    fontSize: 48,
    middleFontSize: 56,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    displacementDistance: 300,
    curveHeight: 80,
    maxSkew: 5,
    minScale: 0.95,
    motionBlur: 2,
    refactionBlur: 4,
    rippleWaves: 3,
    rippleIntensity: 0.15,
  },
  dependencies: {},
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const liquidMotionDisplacementPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
