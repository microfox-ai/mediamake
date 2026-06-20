/**
 * Aggressive Punk Shake Typokinetics Preset
 * 
 * This preset creates a raw, unpolished aesthetic mimicking 90s skateboarding videos
 * and punk rock flyers. Text appears to be violently shaking and glitching as if
 * being physically attacked by invisible hammers. Features multi-frequency shake layers,
 * rapid vibrations, explosive movements, motion blur via text-shadow, and filter oscillations.
 * 
 * Features:
 * - **Multi-frequency shake layers**: Base tremor (60Hz), mid-range wobble (15Hz), violent jerks (random)
 * - **Explosive movements**: Text occasionally breaks free with sudden position shifts
 * - **Motion blur effects**: Rapidly changing text-shadow values create motion blur
 * - **Filter oscillations**: Blur and brightness changes simulate camera shake
 * - **Absolute positioning**: Each word positioned independently with random initial offsets
 * - **GPU acceleration**: Transform: translateZ(0) and will-change for performance
 * 
 * Use cases:
 * - Raw, aggressive video content (skateboarding, extreme sports, punk rock)
 * - Chaotic, unstable typography effects
 * - Underground/DIY aesthetic videos
 * - High-energy, dangerous-feeling text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time'),
        duration: z.number(),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number().describe('Relative to caption start'),
            duration: z.number(),
          })
        ),
      })
    )
    .describe('Array of caption objects with word timing data'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "BebasNeue:900", "Impact:800")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or CSS color)'),
  
  fontSize: z
    .number()
    .min(40)
    .max(200)
    .default(80)
    .describe('Base font size in pixels'),
  
  baseShakeIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Base shake intensity multiplier (1 = normal, 2 = extreme)'),
  
  highFreqIntensity: z
    .number()
    .min(1)
    .max(30)
    .default(20)
    .describe('High-frequency tremor amplitude in pixels (base layer)'),
  
  midFreqIntensity: z
    .number()
    .min(5)
    .max(50)
    .default(15)
    .describe('Mid-frequency wobble amplitude in pixels'),
  
  violentJerkIntensity: z
    .number()
    .min(10)
    .max(80)
    .default(30)
    .describe('Violent jerk amplitude in pixels (explosive movements)'),
  
  rotationRange: z
    .number()
    .min(0)
    .max(15)
    .default(5)
    .describe('Maximum rotation in degrees'),
  
  blurRange: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Maximum blur amount in pixels'),
  
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .describe('Text shadow spread for motion blur effect in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps
): PresetOutput => {
  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    if (!fontString) return { family: 'Inter', weight: '900', style: 'normal' };
    
    const parts = fontString.split(':');
    const family = parts[0] || 'Inter';
    const weight = parts[1] || '900';
    const style = parts[2] || 'normal';
    
    return { family, weight, style };
  };

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate keyframes for shake effect
  const generateShakeKeyframes = (
    amplitude: number,
    keyframeCount: number,
    property: 'translateX' | 'translateY' | 'rotate'
  ) => {
    const keyframes = [];
    for (let i = 0; i <= keyframeCount; i++) {
      const prog = i / keyframeCount;
      const val = randomInRange(-amplitude, amplitude);
      keyframes.push({ key: property, val, prog });
    }
    return keyframes;
  };

  // Parse font configuration
  const fontConfig = parseFontString(params.font || 'Impact:900');
  const baseIntensity = params.baseShakeIntensity;

  // Build caption components
  const captionComponents: RenderableComponentData[] = [];

  params.captions.forEach((caption, captionIndex) => {
    const words = caption.text.split(' ').filter(w => w.trim());
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordData = caption.words[wordIndex];
      
      if (!wordData) return;

      // Random initial offset for each word
      const initialOffsetX = randomInRange(-50, 50);
      const initialOffsetY = randomInRange(-30, 30);
      
      // Effect duration: 2-3x the caption duration for continuous shaking
      const effectDuration = caption.duration * 2.5;

      // Layer 1: Base tremor (high-frequency, small amplitude)
      const baseTremorX = generateShakeKeyframes(
        params.highFreqIntensity * baseIntensity,
        12, // High keyframe count for rapid oscillation
        'translateX'
      );
      const baseTremorY = generateShakeKeyframes(
        params.highFreqIntensity * baseIntensity * 0.75,
        10,
        'translateY'
      );

      // Layer 2: Mid-range wobble (medium frequency)
      const midWobbleX = generateShakeKeyframes(
        params.midFreqIntensity * baseIntensity,
        6,
        'translateX'
      );
      const midWobbleY = generateShakeKeyframes(
        params.midFreqIntensity * baseIntensity * 0.8,
        5,
        'translateY'
      );

      // Layer 3: Violent jerks (explosive movements)
      const violentJerkX = generateShakeKeyframes(
        params.violentJerkIntensity * baseIntensity,
        4,
        'translateX'
      );
      const violentJerkY = generateShakeKeyframes(
        params.violentJerkIntensity * baseIntensity * 0.7,
        3,
        'translateY'
      );

      // Rotation jerks
      const rotationJerks = generateShakeKeyframes(
        params.rotationRange * baseIntensity,
        5,
        'rotate'
      );

      // Blur oscillation
      const blurKeyframes = [];
      for (let i = 0; i <= 8; i++) {
        const prog = i / 8;
        const blurVal = randomInRange(0, params.blurRange);
        blurKeyframes.push({ key: 'filter', val: `blur(${blurVal}px)`, prog });
      }

      // Brightness oscillation
      const brightnessKeyframes = [];
      for (let i = 0; i <= 6; i++) {
        const prog = i / 6;
        const brightnessVal = randomInRange(0.8, 1.2);
        brightnessKeyframes.push({ 
          key: 'filter', 
          val: `blur(${randomInRange(0, params.blurRange)}px) brightness(${brightnessVal})`, 
          prog 
        });
      }

      // Motion blur via text-shadow (rapidly changing)
      const shadowKeyframes = [];
      for (let i = 0; i <= 10; i++) {
        const prog = i / 10;
        const shadowX = randomInRange(-params.motionBlurIntensity, params.motionBlurIntensity);
        const shadowY = randomInRange(-params.motionBlurIntensity, params.motionBlurIntensity);
        const shadowBlur = randomInRange(5, params.motionBlurIntensity);
        shadowKeyframes.push({
          key: 'textShadow',
          val: `${shadowX}px ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.8)`,
          prog,
        });
      }

      // Create word component with all shake layers
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          className: 'font-black text-6xl md:text-8xl text-white mix-blend-difference',
          style: {
            position: 'absolute' as const,
            left: `${50 + initialOffsetX}%`,
            top: `${50 + initialOffsetY}%`,
            transform: 'translateZ(0) translate(-50%, -50%)',
            willChange: 'transform',
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            fontWeight: fontConfig.weight,
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
          },
        },
        context: {
          timing: {
            start: wordData.start,
            duration: wordData.duration,
          },
        },
        effects: [
          // Effect 1: Base tremor X
          {
            id: `${wordId}-tremor-x`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: baseTremorX,
            },
          },
          // Effect 2: Base tremor Y
          {
            id: `${wordId}-tremor-y`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: baseTremorY,
            },
          },
          // Effect 3: Mid wobble X (delayed start for layering)
          {
            id: `${wordId}-wobble-x`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: wordIndex * 0.05, // Slight stagger
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: midWobbleX,
            },
          },
          // Effect 4: Mid wobble Y
          {
            id: `${wordId}-wobble-y`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: wordIndex * 0.05,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: midWobbleY,
            },
          },
          // Effect 5: Violent jerk X
          {
            id: `${wordId}-jerk-x`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: wordIndex * 0.1,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: violentJerkX,
            },
          },
          // Effect 6: Violent jerk Y
          {
            id: `${wordId}-jerk-y`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: wordIndex * 0.1,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: violentJerkY,
            },
          },
          // Effect 7: Rotation jerks
          {
            id: `${wordId}-rotate`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: wordIndex * 0.08,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: rotationJerks,
            },
          },
          // Effect 8: Filter blur/brightness oscillation
          {
            id: `${wordId}-filter`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: brightnessKeyframes,
            },
          },
          // Effect 9: Motion blur text-shadow
          {
            id: `${wordId}-shadow`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: effectDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: shadowKeyframes,
            },
          },
        ],
      };

      wordComponents.push(wordComponent);
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            width: '100%',
            height: '100%',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    };

    captionComponents.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'aggressive-punk-shake-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.captions.length > 0 
          ? Math.max(...params.captions.map(c => c.absoluteStart + c.duration))
          : 10,
      },
    },
    childrenData: captionComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'AggressivePunkShakeTypokinetics',
  title: 'Aggressive Punk Shake Typokinetics',
  description: 'Raw, unpolished 90s skateboarding/punk rock aesthetic with violent shaking, glitching text that appears physically attacked. Words positioned absolutely with explosive movements, rapid vibrations, and unpredictable shifts. Features multi-frequency shake layers, motion blur via text-shadow, and filter oscillations simulating camera shake during an earthquake.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'shake',
    'glitch',
    'punk',
    '90s',
    'skateboarding',
    'aggressive',
    'violent',
    'raw',
    'unpolished',
    'motion-blur',
    'camera-shake',
    'explosive',
    'dangerous',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'EXTREME CHAOS',
        start: 0,
        duration: 3,
        absoluteStart: 0,
        words: [
          { text: 'EXTREME', start: 0, duration: 1.5 },
          { text: 'CHAOS', start: 1.5, duration: 1.5 },
        ],
      },
    ],
    font: 'Impact:900',
    textColor: '#FFFFFF',
    fontSize: 80,
    baseShakeIntensity: 1,
    highFreqIntensity: 20,
    midFreqIntensity: 15,
    violentJerkIntensity: 30,
    rotationRange: 5,
    blurRange: 2,
    motionBlurIntensity: 10,
  },
};

// Export preset
export const AggressivePunkShakeTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};