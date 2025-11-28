/**
 * Spring Launch Typography Preset
 * 
 * High-energy spring-loaded typography preset where text launches from compressed state
 * with explosive overshoot and bounce-back settling. Features compressed spring start
 * (30% scaleX, 15% scaleY), explosive release overshooting to 120-130%, bounce-back
 * settling, rapid 360-degree rotation with deceleration, and motion blur shadow simulation.
 * 
 * Features:
 * - **Compressed Spring Start**: Text begins at 30% horizontal scale and 15% vertical scale
 * - **Explosive Release**: Overshoots to 120% scale (or 130% with high excitement)
 * - **Bounce-Back Settling**: Settles through 90% before reaching 100%
 * - **Rapid Rotation**: 0 to 360 degrees with deceleration curve
 * - **Motion Blur Simulation**: Multiple shadow copies with decreasing opacity during peak velocity
 * - **Word-Level Stagger**: Sequential triggering with 0.08 second gaps for machine-gun effect
 * - **Sentiment-Based Intensity**: Increases overshoot to 130% for excitement/energy captions
 * - **Intensity Parameter**: Scales all motion values proportionally
 * 
 * Use cases:
 * - Sports highlight reels with scores and stats bursting onto screen
 * - Action sequences requiring kinetic force
 * - Promotional text that needs serious punch
 * - High-energy content where text needs explosive entry
 * - Dynamic announcements with mechanical spring physics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text content to animate (will be split into words for stagger effect)'),
  fontSize: z.number().default(64).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family with optional weight and style (e.g., "Inter:900", "BebasNeue:700")'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  intensity: z.number().min(0.5).max(2).default(1).describe('Intensity parameter that scales all motion values (0.5 = half intensity, 2 = double intensity)'),
  wordStagger: z.number().min(0).max(0.2).default(0.08).describe('Time gap between word triggers in seconds (machine-gun effect)'),
  duration: z.number().default(0.7).describe('Duration of spring animation per word in seconds'),
  overshootScale: z.number().min(1.1).max(1.5).default(1.2).describe('Maximum overshoot scale (default 1.2 = 120%, can increase to 1.3 for excitement)'),
  useExcitementBoost: z.boolean().default(false).optional().describe('If true, increases overshoot to 130% for excitement/energy (simulates caption sentiment)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  // Parse font weight from font string
  let fontWeight: number | undefined;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Apply intensity scaling
  const intensity = params.intensity ?? 1;
  const wordStagger = params.wordStagger ?? 0.08;
  const animationDuration = params.duration ?? 0.7;
  
  // Determine overshoot scale (sentiment-based or parameter)
  let overshootScale = params.overshootScale ?? 1.2;
  if (params.useExcitementBoost) {
    overshootScale = 1.3; // Boost to 130% for excitement
  }
  
  // Apply intensity to overshoot (scale the overshoot amount beyond 1.0)
  const finalOvershootScale = 1 + ((overshootScale - 1) * intensity);
  
  // Split text into words
  const words = params.text.trim().split(/\s+/);
  
  // Calculate total duration (last word start + animation duration)
  const totalDuration = (words.length - 1) * wordStagger + animationDuration;
  
  // Create word components with staggered timing
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `spring-word-${index}`;
    const wordStart = index * wordStagger;
    
    // Spring animation keyframes with custom cubic-bezier
    // Scale: 0% at {x:0.3, y:0.15}, 40% at {x:overshoot, y:overshoot*1.08}, 60% at {x:0.9, y:0.85}, 100% at {x:1, y:1}
    // Rotation: 0deg to 360deg with deceleration
    
    // Motion blur simulation: multiple text shadows during peak velocity (0-40%)
    const createMotionBlurShadows = (progress: number): string => {
      // Peak velocity is around 20% progress
      if (progress < 0.4) {
        const blurIntensity = Math.sin(progress * Math.PI / 0.4) * intensity;
        const shadowCount = 5;
        const shadows: string[] = [];
        
        for (let i = 1; i <= shadowCount; i++) {
          const offset = i * 2 * blurIntensity;
          const opacity = (1 - i / shadowCount) * 0.3;
          shadows.push(`${offset}px ${offset}px 4px rgba(0, 0, 0, ${opacity})`);
        }
        
        return shadows.join(', ');
      }
      return 'none';
    };
    
    // Spring launch effect with complex keyframes
    const springEffect: GenericEffectData = {
      type: 'spring',
      start: wordStart,
      duration: animationDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale X: 0.3 -> overshoot -> 0.9 -> 1.0
        { key: 'scaleX', val: 0.3 * intensity, prog: 0 },
        { key: 'scaleX', val: finalOvershootScale, prog: 0.4 },
        { key: 'scaleX', val: 0.9, prog: 0.6 },
        { key: 'scaleX', val: 1, prog: 1 },
        
        // Scale Y: 0.15 -> overshoot*1.08 -> 0.85 -> 1.0 (more vertical compression/expansion)
        { key: 'scaleY', val: 0.15 * intensity, prog: 0 },
        { key: 'scaleY', val: finalOvershootScale * 1.08, prog: 0.4 },
        { key: 'scaleY', val: 0.85, prog: 0.6 },
        { key: 'scaleY', val: 1, prog: 1 },
        
        // Rotation: 0deg -> 360deg with deceleration
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360 * intensity, prog: 0.4 },
        { key: 'rotate', val: 360 * intensity, prog: 1 },
        
        // Opacity: fade in quickly
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.15 },
        
        // Motion blur simulation using filter (blur peaks at 40%)
        { key: 'filter', val: `blur(${8 * intensity}px)`, prog: 0 },
        { key: 'filter', val: `blur(${4 * intensity}px)`, prog: 0.2 },
        { key: 'filter', val: 'blur(0px)', prog: 0.4 },
        
        // Text shadow for motion blur effect (peaks during acceleration)
        { key: 'textShadow', val: createMotionBlurShadows(0), prog: 0 },
        { key: 'textShadow', val: createMotionBlurShadows(0.2), prog: 0.2 },
        { key: 'textShadow', val: createMotionBlurShadows(0.4), prog: 0.4 },
        { key: 'textShadow', val: 'none', prog: 0.6 },
      ],
    };
    
    const wordComponent: RenderableComponentData = {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontWeight || 700,
          color: params.textColor,
          marginRight: '0.2em',
          transformOrigin: 'center center',
          willChange: 'transform',
        },
        font: {
          family: fontFamily,
          weights: fontWeight ? [fontWeight.toString()] : ['700', '900'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `spring-effect-${index}`,
          componentId: 'generic',
          data: springEffect,
        },
      ],
    };
    
    return wordComponent;
  });
  
  // Create container layout
  const rootContainer: RenderableComponentData = {
    id: 'spring-launch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          gap: '8px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
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
  id: 'spring-launch-typography',
  title: 'Spring Launch Typography',
  description: 'High-energy spring-loaded typography preset where text launches from compressed state with explosive overshoot and bounce-back settling. Features compressed spring start (30% scaleX, 15% scaleY), explosive release overshooting to 120-130%, bounce-back settling, rapid 360-degree rotation with deceleration, and motion blur shadow simulation. Includes word-level sequential triggering with 80ms stagger for machine-gun effect. Perfect for sports content, action sequences, scores, stats, and promotional text requiring kinetic punch. Supports intensity parameter and sentiment-based overshoot adjustment.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'spring', 'launch', 'explosive', 'sports', 'action', 'high-energy', 'rotation', 'overshoot', 'bounce', 'motion-blur', 'stagger', 'machine-gun'],
  dependencies: {},
  defaultInputParams: {
    text: 'GAME WINNING GOAL',
    fontSize: 64,
    fontFamily: 'Inter:900',
    textColor: '#ffffff',
    intensity: 1,
    wordStagger: 0.08,
    duration: 0.7,
    overshootScale: 1.2,
    useExcitementBoost: false,
  },
};

export const springLaunchTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
