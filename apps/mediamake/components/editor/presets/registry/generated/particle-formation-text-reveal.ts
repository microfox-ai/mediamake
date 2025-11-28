/**
 * Particle Formation Text Reveal Preset
 * 
 * This preset creates a magical particle-based text reveal where thousands of tiny particles
 * coalesce to form letterforms, simulating sand art or ethereal energy. Particles flow from
 * scattered random positions and gravitate toward their final positions with physics-based
 * spring animation providing momentum and deceleration.
 * 
 * Features:
 * - **Particle System**: 50-100 particles per word, each with unique physics
 * - **Spring Physics**: Momentum and deceleration through spring easing
 * - **Motion Blur**: Blur increases with particle velocity, decreases as they settle
 * - **Staggered Animation**: Index-based delay cascade for smooth reveal
 * - **Glow Effects**: Subtle glow on particles for magical feel
 * - **Text Reveal**: Text appears at 70% completion when particles have settled
 * - **Randomized Start**: Each particle begins at random offset position
 * 
 * Use cases:
 * - Epic title reveals
 * - Mystical content openings
 * - Dramatic scene transitions
 * - Brand logo formations
 * - Magical visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  text: z.string().describe('Text to reveal through particle formation'),
  
  particleCount: z
    .number()
    .min(30)
    .max(200)
    .default(75)
    .optional()
    .describe('Number of particles per word (30-200)'),
  
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .optional()
    .describe('Total animation duration in seconds'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(96)
    .optional()
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter:700" for weight 700)'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),
  
  particleColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Particle color (CSS color value)'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .optional()
    .describe('Particle glow intensity (0-1)'),
  
  randomSpread: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .optional()
    .describe('Maximum random offset distance for particles (pixels)'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color'),
  
  startTime: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time relative to parent (seconds)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate random offset
  const getRandomOffset = (spread: number): { x: number; y: number } => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spread;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
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

  // Extract parameters
  const text = params.text;
  const particleCount = params.particleCount ?? 75;
  const duration = params.duration ?? 2.5;
  const fontSize = params.fontSize ?? 96;
  const textColor = params.textColor ?? '#ffffff';
  const particleColor = params.particleColor ?? '#ffffff';
  const glowIntensity = params.glowIntensity ?? 0.6;
  const randomSpread = params.randomSpread ?? 200;
  const backgroundColor = params.backgroundColor ?? '#000000';
  const startTime = params.startTime ?? 0;

  // Split text into words
  const words = text.split(' ').filter(w => w.length > 0);

  // Generate particles for each word
  const particleContainers: RenderableComponentData[] = words.map((word, wordIndex) => {
    const wordId = `word-${wordIndex}`;
    
    // Generate particles for this word
    const particles: RenderableComponentData[] = [];
    const effects: any[] = [];

    for (let i = 0; i < particleCount; i++) {
      const particleId = `particle-${wordId}-${i}`;
      const offset = getRandomOffset(randomSpread);
      
      // Calculate stagger delay
      const staggerDelay = i * 0.01;
      const particleDuration = duration - staggerDelay;

      // Create particle using HTMLBlockAtom (ShapeAtom is deprecated)
      particles.push({
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 4px; height: 4px; border-radius: 50%; background-color: ${particleColor}; box-shadow: 0 0 8px 2px rgba(${parseInt(particleColor.slice(1, 3), 16)}, ${parseInt(particleColor.slice(3, 5), 16)}, ${parseInt(particleColor.slice(5, 7), 16)}, ${glowIntensity});"></div>`,
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            marginLeft: '-2px',
            marginTop: '-2px',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData);

      // Particle movement effect (translateX, translateY, scale, opacity)
      effects.push({
        id: `movement-${particleId}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: staggerDelay,
          duration: particleDuration,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            // Start from random offset
            { key: 'translateX', val: offset.x, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: offset.y, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Scale animation
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 0.7 },
            { key: 'scale', val: 1, prog: 1 },
            // Opacity animation
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Blur effect (motion blur)
      effects.push({
        id: `blur-${particleId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: staggerDelay,
          duration: particleDuration,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            { key: 'blur', val: 4, prog: 0 },
            { key: 'blur', val: 0, prog: 0.7 },
          ],
        },
      });
    }

    // Create particle container for this word
    return {
      id: `particles-${wordId}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${(wordIndex / words.length) * 100}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: `${fontSize * word.length * 0.6}px`,
            height: `${fontSize * 1.2}px`,
          },
        },
      },
      effects: effects,
      childrenData: particles,
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData;
  });

  // Create text reveal
  const textAtoms: RenderableComponentData[] = words.map((word, wordIndex) => {
    const wordId = `text-word-${wordIndex}`;
    
    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        className: 'font-bold',
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          textShadow: `0 0 20px rgba(${parseInt(textColor.slice(1, 3), 16)}, ${parseInt(textColor.slice(3, 5), 16)}, ${parseInt(textColor.slice(5, 7), 16)}, 0.5)`,
          marginRight: wordIndex < words.length - 1 ? '0.3em' : '0',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight
            ? { weights: [fontStyle.fontWeight.toString()] }
            : {}),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    } as RenderableComponentData;
  });

  // Text reveal effect (opacity animation at 70% completion)
  const textRevealEffect = {
    id: 'text-reveal-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: textAtoms.map(atom => atom.id),
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0, prog: 0.65 },
        { key: 'opacity', val: 1, prog: 0.85 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  };

  // Text container
  const textContainer: RenderableComponentData = {
    id: 'text-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          gap: '0.3em',
        },
      },
    },
    effects: [textRevealEffect],
    childrenData: textAtoms,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-formation-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    childrenData: [
      // Particles layer (behind text)
      {
        id: 'particles-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        childrenData: particleContainers,
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      } as RenderableComponentData,
      // Text layer (on top)
      textContainer,
    ],
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
  id: 'particle-formation-text-reveal',
  title: 'Particle Formation Text Reveal',
  description:
    'A magical particle-based text reveal where thousands of tiny particles coalesce to form letterforms, simulating sand art or ethereal energy. Particles flow from scattered random positions and gravitate toward their final letter positions with physics-based spring animation providing momentum and deceleration. Features motion blur on fast-moving particles, subtle glow effects, and staggered animation timing. The actual text reveals once particles have mostly settled (around 70% completion). Perfect for epic titles, mystical content, or dramatic openings.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'particles',
    'reveal',
    'physics',
    'spring',
    'motion-blur',
    'glow',
    'epic',
    'mystical',
    'dramatic',
    'sand-art',
    'coalesce',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'EPIC REVEAL',
    particleCount: 75,
    duration: 2.5,
    fontSize: 96,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    particleColor: '#ffffff',
    glowIntensity: 0.6,
    randomSpread: 200,
    backgroundColor: '#000000',
    startTime: 0,
  },
};

// Export preset
export const particleFormationTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
