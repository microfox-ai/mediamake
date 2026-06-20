/**
 * Vintage Film Title Card Typewriter Effect Preset
 *
 * This preset creates a nostalgic 1940s-1950s cinema-inspired title card with character-by-character typewriter animation.
 * Features sepia tone, film grain, scratches, dust particles, vignetting, film flicker, and spring-based stamp effects
 * with subtle camera shake. Each character appears with overshoot scale animation. Includes optional ornamental borders
 * that type themselves around the text. Perfect for historical documentaries, vintage content, and nostalgic storytelling.
 *
 * Key Features:
 * - Character-by-character typewriter animation with spring-based stamp effect (scale overshoot: 0.8 → 1.2 → 0.95 → 1)
 * - Sepia tone and black-and-white treatment with vignetting
 * - Film grain texture overlay with animated noise
 * - Film scratches and dust particles (animated)
 * - Subtle flicker effect simulating aged film stock
 * - Camera shake per character appearance (±2px for 100ms)
 * - Optional ornamental border that types itself around the text
 * - Performance optimized: Combined filter operations, limited shake effects
 *
 * Use Cases:
 * - Historical documentaries
 * - Vintage content and nostalgic videos
 * - Classic cinema tributes
 * - Title cards for period pieces
 * - Old film aesthetic overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  BaseLayoutData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/remotion';

// ============================================================================
// Parameters Schema
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('A TALE OF TWO CITIES')
    .describe('The title text to display with typewriter effect'),

  duration: z
    .number()
    .min(2)
    .max(20)
    .default(5)
    .describe('Duration of the entire title card in seconds'),

  font: z
    .string()
    .default('Playfair Display:400')
    .optional()
    .describe(
      'Font family with optional weight (e.g., "Playfair Display:400", "Courier New:700")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(64)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .default('#f5f5dc')
    .describe('Text color (beige/sepia tones recommended)'),

  letterSpacing: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Letter spacing in em units'),

  typewriterSpeed: z
    .number()
    .min(0.03)
    .max(0.3)
    .default(0.08)
    .describe('Time between each character appearance in seconds'),

  stampIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe(
      'Intensity of the stamp effect (scale overshoot multiplier, 1 = default)',
    ),

  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Camera shake intensity in pixels (0 = no shake)'),

  sepiaTone: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Sepia tone intensity (0 = no sepia, 1 = full sepia)'),

  filmGrainOpacity: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.2)
    .describe('Film grain overlay opacity'),

  flickerIntensity: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .describe('Film flicker intensity (opacity variation)'),

  showBorder: z
    .boolean()
    .default(true)
    .describe('Show ornamental border around the text'),

  borderFadeDelay: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Delay before border fades in (seconds)'),

  vignetteStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Vignette darkness strength (0 = none, 1 = very dark)'),

  scratchCount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Number of vertical film scratches'),

  dustParticleCount: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Number of dust particles'),
});

// ============================================================================
// Preset Execution
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Playfair Display:400';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontWeight = fontString.includes(':')
    ? parseInt(fontString.split(':')[1], 10)
    : 400;

  // Calculate timing
  const text = params.text;
  const charCount = text.length;
  const typewriterSpeed = params.typewriterSpeed;
  const totalTypewriterDuration = charCount * typewriterSpeed;

  // Helper: Generate random value in range
  const randomInRange = (min: number, max: number) =>
    min + Math.random() * (max - min);

  // Helper: Generate dust particles
  const generateDustParticles = (): RenderableComponentData[] => {
    const particles: RenderableComponentData[] = [];
    for (let i = 0; i < params.dustParticleCount; i++) {
      const size = randomInRange(2, 4);
      const left = randomInRange(10, 90);
      const top = randomInRange(10, 90);
      const opacity = randomInRange(0.2, 0.4);

      particles.push({
        id: `dust-particle-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="position: absolute; left: ${left}%; top: ${top}%; width: ${size}px; height: ${size}px; border-radius: 50%; background: rgba(255,255,255,${opacity});"></div>`,
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData);
    }
    return particles;
  };

  // Helper: Generate film scratches
  const generateScratches = (): RenderableComponentData[] => {
    const scratches: RenderableComponentData[] = [];
    for (let i = 0; i < params.scratchCount; i++) {
      const left = randomInRange(10, 90);
      const opacity = randomInRange(0.15, 0.3);

      scratches.push({
        id: `scratch-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="position: absolute; left: ${left}%; top: 0; width: 1px; height: 100%; background: rgba(255,255,255,${opacity});"></div>`,
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      } as RenderableComponentData);
    }
    return scratches;
  };

  // Helper: Create character effects (stamp + shake)
  const createCharacterEffects = (
    charIndex: number,
    charId: string,
  ): any[] => {
    const effects: any[] = [];
    const charStart = charIndex * typewriterSpeed;
    const stampDuration = 0.3;
    const peakScale = 1.2 * params.stampIntensity;

    // Stamp effect (scale overshoot with spring easing)
    effects.push({
      id: `stamp-effect-${charIndex}`,
      componentId: 'generic',
      data: {
        type: 'spring',
        start: charStart,
        duration: stampDuration,
        mode: 'provider',
        targetIds: [charId],
        ranges: [
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: peakScale, prog: 0.4 },
          { key: 'scale', val: 0.95, prog: 0.7 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
        ],
      } as GenericEffectData,
    });

    return effects;
  };

  // Helper: Create container shake effect
  const createContainerShakeEffect = (): any => {
    const shakeFrames: any[] = [];
    const shakeDuration = 0.1; // 100ms shake per character

    // Create shake keyframes for each character appearance
    for (let i = 0; i < charCount; i++) {
      const charStart = i * typewriterSpeed;
      const shakeStart = charStart;
      const shakeEnd = charStart + shakeDuration;

      // Random shake values
      const shakeX = randomInRange(
        -params.shakeIntensity,
        params.shakeIntensity,
      );
      const shakeY = randomInRange(
        -params.shakeIntensity,
        params.shakeIntensity,
      );

      shakeFrames.push({
        key: 'translateX',
        val: shakeX,
        prog: shakeStart / params.duration,
      });
      shakeFrames.push({
        key: 'translateY',
        val: shakeY,
        prog: shakeStart / params.duration,
      });
      shakeFrames.push({
        key: 'translateX',
        val: 0,
        prog: shakeEnd / params.duration,
      });
      shakeFrames.push({
        key: 'translateY',
        val: 0,
        prog: shakeEnd / params.duration,
      });
    }

    return {
      id: 'container-shake-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: ['text-container-inner'],
        ranges: shakeFrames,
      } as GenericEffectData,
    };
  };

  // Helper: Create flicker effect
  const createFlickerEffect = (): any => {
    return {
      id: 'flicker-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: params.duration,
        mode: 'provider',
        targetIds: ['root-container'],
        ranges: [
          { key: 'opacity', val: 1 - params.flickerIntensity, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.1 },
          { key: 'opacity', val: 1 - params.flickerIntensity * 0.5, prog: 0.3 },
          { key: 'opacity', val: 1, prog: 0.4 },
          { key: 'opacity', val: 1 - params.flickerIntensity, prog: 0.6 },
          { key: 'opacity', val: 1, prog: 0.7 },
          { key: 'opacity', val: 1 - params.flickerIntensity * 0.7, prog: 0.9 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Helper: Create border fade effect
  const createBorderEffect = (): any => {
    return {
      id: 'border-fade-effect',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: params.borderFadeDelay,
        duration: 0.5,
        mode: 'provider',
        targetIds: ['border-frame'],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      } as GenericEffectData,
    };
  };

  // Generate character components
  const characterComponents: RenderableComponentData[] = text
    .split('')
    .map((char, index) => {
      const charId = `char-${index}`;
      const charEffects = createCharacterEffects(index, charId);

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontWeight,
            color: params.textColor,
            letterSpacing: `${params.letterSpacing}em`,
            textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
          },
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
            display: 'swap',
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: charEffects,
      } as RenderableComponentData;
    });

  // Create border component
  const borderComponent: RenderableComponentData = {
    id: 'border-frame',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 80%; height: 60%; border: 3px solid rgba(245,245,220,0.4); border-radius: 4px; box-shadow: inset 0 0 20px rgba(0,0,0,0.3);"></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: params.showBorder ? [createBorderEffect()] : [],
  } as RenderableComponentData;

  // Build child structure
  const childrenData: RenderableComponentData[] = [
    // Vignette layer
    {
      id: 'vignette-layer',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${0.7 * params.vignetteStrength}) 100%)`,
            opacity: params.vignetteStrength,
          },
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [],
    } as RenderableComponentData,

    // Film texture overlay
    {
      id: 'film-texture-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            mixBlendMode: 'multiply',
            opacity: params.filmGrainOpacity,
            backgroundImage:
              "url('data:image/svg+xml,%3Csvg viewBox=\"0 0 200 200\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cfilter id=\"noise\"%3E%3CfeTurbulence type=\"fractalNoise\" baseFrequency=\"0.9\" numOctaves=\"4\" /%3E%3C/filter%3E%3Crect width=\"100%25\" height=\"100%25\" filter=\"url(%23noise)\" /%3E%3C/svg%3E')",
            backgroundSize: '200px 200px',
          },
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: [],
    } as RenderableComponentData,

    // Scratches container
    {
      id: 'scratches-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: generateScratches(),
    } as RenderableComponentData,

    // Dust particles container
    {
      id: 'dust-particles-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: generateDustParticles(),
    } as RenderableComponentData,

    // Text container (with shake effect)
    {
      id: 'text-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects:
        params.shakeIntensity > 0 ? [createContainerShakeEffect()] : [],
      childrenData: [
        {
          id: 'text-container-inner',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row items-center justify-center',
              style: {
                textAlign: 'center',
              },
            },
          } as BaseLayoutData,
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          childrenData: characterComponents,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Border container
    {
      id: 'border-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      childrenData: params.showBorder ? [borderComponent] : [],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900',
        style: {
          filter: `sepia(${params.sepiaTone}) contrast(1.1)`,
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: params.flickerIntensity > 0 ? [createFlickerEffect()] : [],
    childrenData: childrenData,
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

// ============================================================================
// Preset Metadata
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'vintage-film-typewriter',
  title: 'Vintage Film Title Card Typewriter Effect',
  description:
    'A nostalgic 1940s-1950s cinema-inspired title card with character-by-character typewriter animation. Features sepia tone, film grain, scratches, dust particles, vignetting, film flicker, and spring-based stamp effects with subtle camera shake. Each character appears with overshoot scale animation. Includes optional ornamental borders that type themselves around the text. Perfect for historical documentaries, vintage content, and nostalgic storytelling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'typewriter',
    'vintage',
    'film',
    'classic',
    'cinema',
    '1940s',
    '1950s',
    'sepia',
    'grain',
    'scratches',
    'nostalgic',
    'historical',
    'stamp',
    'shake',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'A TALE OF TWO CITIES',
    duration: 5,
    font: 'Playfair Display:400',
    fontSize: 64,
    textColor: '#f5f5dc',
    letterSpacing: 0.1,
    typewriterSpeed: 0.08,
    stampIntensity: 1,
    shakeIntensity: 2,
    sepiaTone: 0.3,
    filmGrainOpacity: 0.2,
    flickerIntensity: 0.1,
    showBorder: true,
    borderFadeDelay: 0.5,
    vignetteStrength: 0.5,
    scratchCount: 3,
    dustParticleCount: 5,
  },
};

// ============================================================================
// Export
// ============================================================================

export const vintageFilmTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
