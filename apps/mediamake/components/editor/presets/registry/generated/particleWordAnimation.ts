/**
 * Particle Word Animation System Preset
 *
 * A high-performance particle-based word animation system for impactful transcript words.
 * Features four distinct particle effect modes:
 * - Explosive scatter for power words (BOOM, IMPACT, FORCE)
 * - Confetti burst for achievement words (SUCCESS, WINNER, CHAMPION)
 * - Floating sparkle trails for magical words (MAGIC, WONDER, DREAM)
 * - Physics-based crumble for destruction words (DESTROY, SHATTER)
 *
 * Uses CSS transforms and GPU acceleration for smooth 60fps animations with 30-50 lightweight particles per word.
 *
 * Features:
 * - **Four Particle Modes**: Explosive, confetti, sparkle, and crumble effects
 * - **Smart Word Detection**: Automatically categorizes words based on content
 * - **Performance Optimized**: GPU-accelerated transforms, minimal repaints
 * - **Staggered Animation**: Wave effects using index-based delays
 * - **Dynamic Particle Count**: 30-50 particles per effect based on word category
 *
 * Use cases:
 * - Creating spectacular effects for power words in transcripts
 * - Adding celebration effects for achievement moments
 * - Creating magical atmosphere for wonder/dream content
 * - Simulating realistic destruction physics for impact words
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  word: z.string().describe('The word to animate with particle effects'),
  fontSize: z
    .number()
    .default(64)
    .describe('Font size for the main text in pixels'),
  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  color: z
    .string()
    .default('#ffffff')
    .describe('Text color for the main word'),
  particleColor: z
    .string()
    .optional()
    .describe(
      'Override particle color (defaults to word color or category-specific colors)',
    ),
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the animation in seconds'),
  particleCount: z
    .number()
    .default(40)
    .describe('Number of particles to generate (30-50 recommended)'),
  impact: z
    .number()
    .default(1.0)
    .describe(
      'Animation intensity multiplier (0.5 = subtle, 1.0 = normal, 2.0 = intense)',
    ),
  categoryOverride: z
    .enum(['power', 'achievement', 'magical', 'destruction', 'auto'])
    .default('auto')
    .describe(
      'Force specific particle effect category (auto = detect from word)',
    ),
  xPosition: z
    .string()
    .default('50%')
    .describe('Horizontal position of the word (CSS value)'),
  yPosition: z
    .string()
    .default('50%')
    .describe('Vertical position of the word (CSS value)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    word,
    fontSize,
    fontFamily,
    color,
    particleColor,
    duration,
    particleCount,
    impact,
    categoryOverride,
    xPosition,
    yPosition,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontParts = fontString.split(':');
    const family = fontParts[0];
    const fontStyle: any = {};

    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2];
    }

    return { family, fontStyle };
  };

  // Helper: Detect word category
  const detectCategory = (text: string): string => {
    if (categoryOverride !== 'auto') return categoryOverride;

    const upperText = text.toUpperCase();
    const powerWords = [
      'BOOM',
      'IMPACT',
      'FORCE',
      'POWER',
      'BLAST',
      'EXPLODE',
      'BANG',
      'CRASH',
    ];
    const achievementWords = [
      'SUCCESS',
      'WINNER',
      'CHAMPION',
      'VICTORY',
      'WIN',
      'ACHIEVE',
      'GOAL',
      'TRIUMPH',
    ];
    const magicalWords = [
      'MAGIC',
      'WONDER',
      'DREAM',
      'MYSTICAL',
      'ENCHANT',
      'SPARKLE',
      'SHINE',
      'GLOW',
    ];
    const destructionWords = [
      'DESTROY',
      'BREAK',
      'SHATTER',
      'CRUMBLE',
      'CRUSH',
      'SMASH',
      'DEMOLISH',
      'RUIN',
    ];

    if (powerWords.includes(upperText)) return 'power';
    if (achievementWords.includes(upperText)) return 'achievement';
    if (magicalWords.includes(upperText)) return 'magical';
    if (destructionWords.includes(upperText)) return 'destruction';

    return 'power'; // Default to power
  };

  // Helper: Generate random number in range
  const random = (min: number, max: number) => Math.random() * (max - min) + min;

  // Helper: Create particle effects based on category
  const createParticleEffects = (
    category: string,
    particleId: string,
    index: number,
    totalParticles: number,
  ) => {
    const effectDuration = duration * 0.8; // Complete at 80% of total duration
    const staggerDelay = (index / totalParticles) * 0.3 * impact; // Max 0.3s stagger

    const baseEffect = {
      id: `${particleId}-effect`,
      componentId: particleId,
      data: {
        type: 'ease-out',
        start: staggerDelay,
        duration: effectDuration,
        mode: 'provider' as const,
        targetIds: [particleId],
        ranges: [] as any[],
      },
    };

    switch (category) {
      case 'power': {
        // Explosive scatter: random direction, rotation, scale down, fade out
        const angle = random(0, Math.PI * 2);
        const distance = random(150, 300) * impact;
        const translateX = Math.cos(angle) * distance;
        const translateY = Math.sin(angle) * distance;
        const rotation = random(0, 1080);

        baseEffect.data.ranges = [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: translateY, prog: 1 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: rotation, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ];
        break;
      }

      case 'achievement': {
        // Confetti: upward burst, gravity fall, flip rotation
        const translateX = random(-200, 200) * impact;
        const initialY = random(-150, -250) * impact;
        const finalY = random(100, 200);
        const rotateY = random(0, 360);

        baseEffect.data.ranges = [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: initialY, prog: 0.3 },
          { key: 'translateY', val: finalY, prog: 1 },
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: rotateY, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.9 },
        ];
        break;
      }

      case 'magical': {
        // Sparkle: float upward, scale pulse, twinkle opacity
        const translateX = random(-100, 100);
        const translateY = random(-200, -300) * impact;
        const scalePulse = random(0.5, 1.5);

        baseEffect.data.ranges = [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: translateY, prog: 1 },
          { key: 'scale', val: 0.3, prog: 0 },
          { key: 'scale', val: scalePulse, prog: 0.5 },
          { key: 'scale', val: 0.3, prog: 1 },
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.3 },
          { key: 'opacity', val: 0.5, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ];
        break;
      }

      case 'destruction': {
        // Crumble: fall with gravity, tumble rotation, fade out
        const translateX = random(-50, 50);
        const translateY = random(200, 400) * impact;
        const rotateZ = random(-720, 720);

        baseEffect.data.ranges = [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: translateX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: translateY * 0.3, prog: 0.3 },
          { key: 'translateY', val: translateY, prog: 1 },
          { key: 'rotateZ', val: 0, prog: 0 },
          { key: 'rotateZ', val: rotateZ, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.6 },
          { key: 'opacity', val: 0, prog: 1 },
        ];
        break;
      }
    }

    return baseEffect;
  };

  // Helper: Get particle colors based on category
  const getParticleColors = (category: string): string[] => {
    if (particleColor) return [particleColor];

    switch (category) {
      case 'power':
        return ['#ff6b35', '#f7931e', '#fdc500', '#ff3838'];
      case 'achievement':
        return ['#ffd700', '#ff69b4', '#00ff88', '#00d4ff', '#ff4757'];
      case 'magical':
        return ['#a78bfa', '#c084fc', '#e879f9', '#f0abfc', '#ffffff'];
      case 'destruction':
        return ['#6b7280', '#4b5563', '#374151', '#1f2937'];
      default:
        return [color];
    }
  };

  // Detect category and get colors
  const category = detectCategory(word);
  const colors = getParticleColors(category);

  // Parse font
  const { family: fontFamilyName, fontStyle } = parseFontString(fontFamily);

  // Generate particles
  const particles: RenderableComponentData[] = [];

  for (let i = 0; i < particleCount; i++) {
    const particleId = `particle-${i}`;
    const particleColorValue = colors[Math.floor(Math.random() * colors.length)];
    const particleSize = category === 'magical' ? random(2, 6) : random(3, 8);
    const particleShape = category === 'achievement' ? 'rounded' : 'rounded-full';

    // Create particle effect
    const particleEffect = createParticleEffects(category, particleId, i, particleCount);

    // Add glow for magical particles
    const glowStyle =
      category === 'magical'
        ? {
            boxShadow: `0 0 ${random(10, 20)}px ${particleColorValue}`,
          }
        : {};

    const particle: RenderableComponentData = {
      id: particleId,
      type: 'atom',
      componentId: 'ShapeAtom',
      data: {
        width: particleSize,
        height: particleSize,
        backgroundColor: particleColorValue,
        containerProps: {
          className: `absolute left-1/2 top-1/2 ${particleShape} pointer-events-none transform-gpu`,
          style: {
            marginLeft: `-${particleSize / 2}px`,
            marginTop: `-${particleSize / 2}px`,
            ...glowStyle,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [particleEffect],
    };

    particles.push(particle);
  }

  // Create main text component
  const mainText: RenderableComponentData = {
    id: 'particleWord-mainText',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: word,
      style: {
        fontSize: `${fontSize}px`,
        color: color,
        ...fontStyle,
      },
      font: {
        family: fontFamilyName,
        ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
      },
      containerProps: {
        className: 'relative z-10 font-bold',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Create particle container
  const particleContainer: RenderableComponentData = {
    id: 'particleWord-particleContainer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-visible z-20',
        style: {
          contain: 'layout paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: particles,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'particleWord-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-block overflow-visible',
        style: {
          position: 'absolute',
          left: xPosition,
          top: yPosition,
          transform: 'translate(-50%, -50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mainText, particleContainer],
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
  id: 'particleWordAnimation',
  title: 'Particle Word Animation System',
  description:
    'A high-performance particle-based word animation system for impactful transcript words. Features four distinct particle effect modes: explosive scatter for power words (BOOM, IMPACT), confetti burst for achievement words (SUCCESS, WINNER), floating sparkle trails for magical words (MAGIC, WONDER), and physics-based crumble for destruction words (DESTROY, SHATTER). Uses CSS transforms and GPU acceleration for smooth 60fps animations with 30-50 lightweight particles per word.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'particles',
    'animation',
    'word',
    'explosive',
    'confetti',
    'sparkle',
    'crumble',
    'power',
    'achievement',
    'magical',
    'destruction',
    'performance',
    'gpu',
  ],
  defaultInputParams: {
    word: 'BOOM',
    fontSize: 64,
    fontFamily: 'Inter:700',
    color: '#ffffff',
    duration: 2,
    particleCount: 40,
    impact: 1.0,
    categoryOverride: 'auto',
    xPosition: '50%',
    yPosition: '50%',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const particleWordAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
