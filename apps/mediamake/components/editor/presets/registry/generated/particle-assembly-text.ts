/**
 * Particle Assembly Text Effect Preset
 *
 * Creates a magical particle-to-text effect where each character materializes from scattered
 * dots/particles that converge into letter shapes. Particles swirl together with rotation,
 * creating a vortex effect as they fade and scale down while the actual text fades in.
 *
 * Features:
 * - 10-20 particles per character with random initial positions
 * - Particles converge from scattered positions to character center
 * - 720-degree rotation during convergence for swirling vortex effect
 * - Opacity fade from 1 to 0 as particles reach final position
 * - Scale from 0.5 to 0 for vanishing effect
 * - Text fades in simultaneously (opacity 0 to 1)
 * - Staggered animation per character (100ms delay)
 * - Uses HTMLBlockAtom for particle circles (ShapeAtom is deprecated)
 *
 * Use cases:
 * - Magical text reveals for titles and headings
 * - Ethereal stardust formation effects
 * - Fantasy-themed text animations
 * - Sci-fi particle materialization effects
 * - Brand reveal animations with particle effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z.string().describe('Text to display with particle assembly effect'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .optional()
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (format: "FontName" or "FontName:weight" or "FontName:weight:style")'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (CSS color value)'),
  particlesPerCharacter: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .optional()
    .describe('Number of particles per character (10-20 recommended)'),
  particleSize: z
    .number()
    .min(2)
    .max(20)
    .default(6)
    .optional()
    .describe('Size of each particle in pixels'),
  particleColor: z
    .string()
    .optional()
    .describe('Particle color (defaults to text color if not specified)'),
  spreadRadius: z
    .number()
    .min(20)
    .max(200)
    .default(50)
    .optional()
    .describe('Maximum random distance particles start from character center'),
  convergenceDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Duration for particles to converge into text (seconds)'),
  staggerDelay: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .optional()
    .describe('Delay between each character animation in milliseconds'),
  absoluteStart: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time in video timeline (seconds)'),
  position: z
    .object({
      horizontal: z.enum(['left', 'center', 'right']).default('center').optional(),
      vertical: z.enum(['top', 'center', 'bottom']).default('center').optional(),
    })
    .default({ horizontal: 'center', vertical: 'center' })
    .optional()
    .describe('Text position on screen'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Generate random position for particle
  const getRandomPosition = (radius: number): { x: number; y: number } => {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * radius;
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  // Helper function: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontStyle: React.CSSProperties = {};
    
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

  // Extract parameters
  const text = params.text;
  const fontSize = params.fontSize ?? 48;
  const fontString = params.fontFamily ?? 'Inter';
  const { fontFamily, fontStyle } = parseFontString(fontString);
  const textColor = params.textColor ?? '#ffffff';
  const particlesPerCharacter = params.particlesPerCharacter ?? 15;
  const particleSize = params.particleSize ?? 6;
  const particleColor = params.particleColor ?? textColor;
  const spreadRadius = params.spreadRadius ?? 50;
  const convergenceDuration = params.convergenceDuration ?? 1.5;
  const staggerDelay = (params.staggerDelay ?? 100) / 1000; // Convert to seconds
  const absoluteStart = params.absoluteStart ?? 0;
  const position = params.position ?? { horizontal: 'center', vertical: 'center' };

  // Calculate total duration
  const characterCount = text.length;
  const totalDuration = characterCount * staggerDelay + convergenceDuration;

  // Position mapping
  const horizontalAlign: Record<string, string> = {
    left: 'flex-start',
    center: 'center',
    right: 'flex-end',
  };

  const verticalAlign: Record<string, string> = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end',
  };

  // Build character components
  const characters = text.split('');
  const characterComponents: RenderableComponentData[] = [];

  characters.forEach((char, charIndex) => {
    const charId = `char-${charIndex}`;
    const charStartTime = charIndex * staggerDelay;

    // Generate particles for this character
    const particleComponents: RenderableComponentData[] = [];

    for (let i = 0; i < particlesPerCharacter; i++) {
      const particleId = `particle-${charIndex}-${i}`;
      const randomPos = getRandomPosition(spreadRadius);

      // Particle element (using HTMLBlockAtom instead of deprecated ShapeAtom)
      const particleAtom: RenderableComponentData = {
        id: particleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${particleSize}px; height: ${particleSize}px; border-radius: 50%; background: ${particleColor};"></div>`,
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: convergenceDuration,
          },
        },
        effects: [],
      };

      // Particle convergence effect
      const particleEffect = {
        id: `effect-${particleId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: convergenceDuration,
          mode: 'provider',
          targetIds: [particleId],
          ranges: [
            // Translate from random position to center
            { key: 'translateX', val: randomPos.x, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: randomPos.y, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            // Rotate 720 degrees
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: 720, prog: 1 },
            // Fade out
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            // Scale down
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
          ],
        },
      };

      particleAtom.effects = [particleEffect];
      particleComponents.push(particleAtom);
    }

    // Particles group container
    const particlesGroup: RenderableComponentData = {
      id: `particles-group-${charIndex}`,
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
          duration: convergenceDuration,
        },
      },
      childrenData: particleComponents,
    };

    // Text atom (actual character)
    const textAtom: RenderableComponentData = {
      id: `text-${charIndex}`,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          fontWeight: fontStyle.fontWeight ?? 600,
          ...(fontStyle.fontStyle && { fontStyle: fontStyle.fontStyle }),
        },
        font: {
          family: fontFamily,
          ...(fontStyle.fontWeight && { weights: [fontStyle.fontWeight.toString()] }),
        },
      },
      context: {
        timing: {
          start: 0,
          duration: convergenceDuration,
        },
      },
      effects: [
        {
          id: `fade-text-${charIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: convergenceDuration * 0.3, // Slight delay
            duration: convergenceDuration * 0.7,
            mode: 'provider',
            targetIds: [`text-${charIndex}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    // Character container
    const characterContainer: RenderableComponentData = {
      id: charId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative',
          style: {
            width: 'fit-content',
            height: 'fit-content',
            display: 'inline-block',
          },
        },
      },
      context: {
        timing: {
          start: charStartTime,
          duration: convergenceDuration,
        },
      },
      childrenData: [particlesGroup, textAtom],
    };

    characterComponents.push(characterContainer);
  });

  // Main container
  const mainContainer: RenderableComponentData = {
    id: 'particle-assembly-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex items-${verticalAlign[position.vertical ?? 'center']} justify-${horizontalAlign[position.horizontal ?? 'center']}`,
        style: {
          padding: '40px',
        },
      },
    },
    context: {
      timing: {
        start: absoluteStart,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents,
  };

  return {
    output: {
      childrenData: [mainContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'particle-assembly-text',
  title: 'Particle Assembly Text Effect',
  description:
    'Magical particle-to-text effect where each character materializes from scattered particles that converge with swirling motion. Particles rotate 720deg while fading out as they reach their final positions, while the actual text fades in simultaneously. Creates an ethereal stardust formation effect with configurable particle count and timing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'particles',
    'animation',
    'magical',
    'ethereal',
    'stardust',
    'converge',
    'vortex',
    'swirl',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HELLO',
    fontSize: 48,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    particlesPerCharacter: 15,
    particleSize: 6,
    spreadRadius: 50,
    convergenceDuration: 1.5,
    staggerDelay: 100,
    absoluteStart: 0,
    position: {
      horizontal: 'center',
      vertical: 'center',
    },
  },
};

// Export preset
export const particleAssemblyTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
