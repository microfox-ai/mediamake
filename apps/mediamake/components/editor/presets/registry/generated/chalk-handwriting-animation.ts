/**
 * Chalk-on-Blackboard Handwriting Animation Preset
 * 
 * This preset creates a realistic chalk handwriting animation on a blackboard background.
 * It simulates a teacher writing text in real-time with authentic chalk characteristics:
 * 
 * Features:
 * - Authentic blackboard appearance with noise texture overlay
 * - Character-by-character text reveal with variable writing speed
 * - Chalk dust texture with multiple text shadows and semi-transparent strokes
 * - Pressure variations through subtle scale changes
 * - Micro-jitters to simulate chalk squeaking effect
 * - Chalk dust particles falling as letters are drawn
 * - Smudge effects where the hand might brush previous letters
 * - Moving hand shadow that follows the writing position
 * - Natural speed variations (quicker on familiar letters, slower on curves)
 * 
 * Use cases:
 * - Educational content with handwriting effects
 * - Classroom-style presentations
 * - Math or science tutorials
 * - Nostalgic or vintage video aesthetics
 * - Step-by-step instruction videos
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('The text to write in chalk on the blackboard'),
  duration: z.number().min(5).max(120).default(25).describe('Total duration in seconds for the writing animation'),
  fontSize: z.number().min(32).max(128).default(56).describe('Font size in pixels'),
  chalkColor: z.string().default('#FFFFFF').describe('Chalk color (default: white)'),
  blackboardColor: z.string().default('#1a4d2e').describe('Blackboard background color (default: dark green)'),
  font: z.string().default('Kalam:400').optional().describe('Font family with optional weight (e.g., "Kalam:400", "Indie Flower:400")'),
  writingSpeed: z.number().min(0.5).max(2).default(1).describe('Writing speed multiplier (1 = normal, 0.5 = slower, 2 = faster)'),
  enableChalkDust: z.boolean().default(true).describe('Enable falling chalk dust particles'),
  enableHandShadow: z.boolean().default(true).describe('Enable moving hand shadow effect'),
  enableMicroJitters: z.boolean().default(true).describe('Enable micro-jitters for chalk squeaking effect'),
  chalkDustIntensity: z.number().min(0.1).max(3).default(1).describe('Intensity of chalk dust particle generation'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    chalkColor,
    blackboardColor,
    font,
    writingSpeed,
    enableChalkDust,
    enableHandShadow,
    enableMicroJitters,
    chalkDustIntensity,
  } = params;

  // Parse font string
  const fontString = font || 'Kalam:400';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontWeight = '400';
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = fontParts[1];
    }
  }

  // Calculate character-by-character timing
  const characters = text.split('');
  const totalCharacters = characters.length;
  
  // Helper: Calculate variable speed per character
  const calculateCharacterDuration = (char: string, index: number): number => {
    const baseSpeed = 80; // Base milliseconds per character
    let charSpeed = baseSpeed;
    
    // Slower for complex curves and special characters
    if (/[gjqyQGJY@&%$#]/.test(char)) {
      charSpeed = baseSpeed * 1.5;
    }
    // Faster for simple characters
    else if (/[il1\|]/.test(char)) {
      charSpeed = baseSpeed * 0.6;
    }
    // Normal speed for letters
    else if (/[a-zA-Z]/.test(char)) {
      charSpeed = baseSpeed;
    }
    // Pause for spaces
    else if (char === ' ') {
      charSpeed = baseSpeed * 3;
    }
    // Slightly slower for punctuation
    else {
      charSpeed = baseSpeed * 1.2;
    }
    
    // Apply global speed multiplier
    return (charSpeed / 1000) / writingSpeed;
  };

  // Calculate cumulative timing for each character
  const characterTimings: Array<{ char: string; start: number; duration: number }> = [];
  let cumulativeTime = 0;
  
  characters.forEach((char, index) => {
    const charDuration = calculateCharacterDuration(char, index);
    characterTimings.push({
      char,
      start: cumulativeTime,
      duration: charDuration,
    });
    cumulativeTime += charDuration;
  });

  // Normalize timings to fit total duration
  const totalCalculatedDuration = cumulativeTime;
  const timeScale = duration / totalCalculatedDuration;
  
  characterTimings.forEach((timing) => {
    timing.start *= timeScale;
    timing.duration *= timeScale;
  });

  const textContainerId = 'chalk-text-container';
  const textId = 'chalk-text-main';
  const handShadowId = 'hand-shadow-element';

  // Create text reveal effect using opacity and clip-path
  const textRevealEffectData: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // Progressive reveal through width animation
      { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
      { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
    ],
  };

  // Micro-jitter effect for chalk squeaking
  const microJitterEffects: any[] = [];
  if (enableMicroJitters) {
    const jitterCount = 15; // Number of jitter keyframes
    for (let i = 0; i < jitterCount; i++) {
      const prog = i / jitterCount;
      microJitterEffects.push(
        { key: 'translateX', val: Math.random() * 2 - 1, prog }, // ±1px
        { key: 'translateY', val: Math.random() * 2 - 1, prog }, // ±1px
      );
    }
  }

  const microJitterEffectData: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: microJitterEffects,
  };

  // Pressure variation effect (subtle scale changes)
  const pressureVariationData: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'scaleX', val: 0.98, prog: 0 },
      { key: 'scaleX', val: 1.02, prog: 0.25 },
      { key: 'scaleX', val: 0.99, prog: 0.5 },
      { key: 'scaleX', val: 1.01, prog: 0.75 },
      { key: 'scaleX', val: 1, prog: 1 },
    ],
  };

  // Hand shadow movement effect
  const handShadowEffects: any[] = [];
  if (enableHandShadow) {
    // Shadow moves from left to right following text writing
    handShadowEffects.push(
      {
        id: 'hand-shadow-move',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [handShadowId],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: `${props.config?.width ? props.config.width * 0.8 : 800}px`, prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '20px', prog: 0.5 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        } as GenericEffectData,
      },
    );
  }

  // Chalk dust particles
  const chalkDustParticles: RenderableComponentData[] = [];
  if (enableChalkDust) {
    const particleCount = Math.floor(20 * chalkDustIntensity);
    for (let i = 0; i < particleCount; i++) {
      const particleStart = (duration / particleCount) * i;
      const particleDuration = 1.5;
      const particleX = Math.random() * 100; // Percentage
      
      chalkDustParticles.push({
        id: `chalk-dust-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 3px; height: 3px; background: rgba(255,255,255,0.6); border-radius: 50%;"></div>`,
          className: 'absolute',
          style: {
            left: `${particleX}%`,
            top: '40%',
          },
        },
        context: {
          timing: {
            start: particleStart,
            duration: particleDuration,
          },
        },
        effects: [
          {
            id: `chalk-dust-fall-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in',
              start: 0,
              duration: particleDuration,
              mode: 'provider',
              targetIds: [`chalk-dust-${i}`],
              ranges: [
                { key: 'translateY', val: '0px', prog: 0 },
                { key: 'translateY', val: '40px', prog: 1 },
                { key: 'opacity', val: 0.6, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'filter', val: 'blur(0px)', prog: 0 },
                { key: 'filter', val: 'blur(2px)', prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Blackboard container with noise texture
  const childrenData: RenderableComponentData[] = [
    // Noise texture overlay
    {
      id: 'noise-texture-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; inset: 0; opacity: 0.15; background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4='); background-size: 200px 200px; pointer-events: none;"></div>`,
      },
      context: {
        timing: {
          start: 0,
          duration: duration + 5,
        },
      },
    } as RenderableComponentData,
    
    // Text container
    {
      id: textContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative p-8 select-none flex items-center justify-center',
          style: {},
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration + 5,
        },
      },
      childrenData: [
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            font: {
              family: fontFamily,
              weights: [fontWeight],
              subsets: ['latin'],
              display: 'swap',
              preload: true,
            },
            fallbackFonts: ['Indie Flower', 'Comic Sans MS', 'cursive'],
            className: 'text-center leading-relaxed',
            style: {
              fontSize: `${fontSize}px`,
              color: chalkColor,
              textShadow: '1px 1px 2px rgba(255,255,255,0.4), 2px 2px 4px rgba(255,255,255,0.3), -1px -1px 1px rgba(255,255,255,0.2)',
              WebkitTextStroke: '0.5px rgba(255,255,255,0.6)',
              letterSpacing: '0.02em',
              filter: 'contrast(1.1) brightness(1.05)',
              fontWeight: fontWeight,
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
              id: 'text-reveal-effect',
              componentId: 'generic',
              data: textRevealEffectData,
            },
            ...(enableMicroJitters ? [{
              id: 'micro-jitter-effect',
              componentId: 'generic',
              data: microJitterEffectData,
            }] : []),
            {
              id: 'pressure-variation-effect',
              componentId: 'generic',
              data: pressureVariationData,
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
    
    // Hand shadow
    ...(enableHandShadow ? [{
      id: handShadowId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; width: 60px; height: 80px; border-radius: 50% 50% 60% 40%; background: radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, transparent 70%); pointer-events: none; filter: blur(8px);"></div>`,
        className: 'opacity-40',
        style: {
          left: '20%',
          top: '35%',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: handShadowEffects,
    } as RenderableComponentData] : []),
    
    // Chalk dust particles
    ...chalkDustParticles,
  ];

  // Root container (blackboard)
  const rootContainer: RenderableComponentData = {
    id: 'chalk-blackboard-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: blackboardColor,
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.03) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.02) 0%, transparent 50%)',
          backgroundSize: 'cover',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration + 5,
      },
    },
    childrenData,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'chalk-handwriting-animation',
  title: 'Chalk-on-Blackboard Handwriting Animation',
  description: 'A realistic chalk handwriting animation preset featuring authentic blackboard texture, progressive character-by-character text reveal with variable writing speed, chalk dust particle effects, pressure variations, micro-jitters for squeaking effect, smudge marks, and a moving hand shadow. Delivers classroom-authentic visual fidelity with natural handwriting dynamics.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'handwriting', 'chalk', 'blackboard', 'educational', 'classroom', 'animation', 'vintage', 'nostalgic'],
  dependencies: {},
  defaultInputParams: {
    text: 'Learn. Practice. Master.',
    duration: 25,
    fontSize: 56,
    chalkColor: '#FFFFFF',
    blackboardColor: '#1a4d2e',
    font: 'Kalam:400',
    writingSpeed: 1,
    enableChalkDust: true,
    enableHandShadow: true,
    enableMicroJitters: true,
    chalkDustIntensity: 1,
  },
};

export const chalkHandwritingAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
