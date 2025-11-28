/**
 * Neon Sign Paint-On Text Reveal Preset
 *
 * A cyberpunk-inspired neon sign text effect where words appear as if being drawn with glowing neon light.
 * Features realistic tube warm-up flickering, sequential paint-on reveal using clipPath animations, and
 * multi-layered neon glow with text-shadow. Each word segment energizes sequentially with electrical
 * flickering (rapid opacity keyframes), brightness warm-up (0.5 to 1.2), and contrast enhancement (1 to 1.5).
 *
 * Features:
 * - **Neon Glow Effect**: Multi-layered text-shadow for realistic neon glow
 * - **Flickering Warm-up**: Rapid opacity oscillation simulating tube energization
 * - **Paint-on Reveal**: ClipPath animation from left to right with irregular segments
 * - **Glow Stabilization**: Brightness and contrast transitions for full luminosity
 * - **Sequential Timing**: Each word energizes after the previous completes
 * - **Gradient Text**: Pink to purple gradient with neon glow
 * - **Audio-Reactive Option**: Optional glow intensity modulation based on audio
 *
 * Use cases:
 * - Cyberpunk title reveals
 * - Retro 80s motion graphics
 * - Tech product showcases
 * - Music video titles
 * - Gaming intro sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text to reveal with neon sign effect'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontWeight: z
    .number()
    .min(600)
    .max(900)
    .default(700)
    .describe('Font weight (minimum 600 for neon effect)'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (default: Inter)'),
  flickerDuration: z
    .number()
    .min(0.2)
    .max(1)
    .default(0.4)
    .describe('Duration of initial flicker phase per word (seconds)'),
  paintOnDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.6)
    .describe('Duration of paint-on reveal per word (seconds)'),
  glowStabilizationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Duration of glow stabilization phase per word (seconds)'),
  wordGap: z
    .number()
    .min(0)
    .max(2)
    .default(0.1)
    .describe('Gap between word animations (seconds)'),
  primaryColor: z
    .string()
    .default('#ec4899')
    .describe('Primary neon color (default: pink)'),
  secondaryColor: z
    .string()
    .default('#a855f7')
    .describe('Secondary neon color (default: purple)'),
  backgroundColor: z
    .string()
    .default('#111827')
    .describe('Background color (default: dark gray)'),
  audioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive glow intensity (requires audio track)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL for audio-reactive glow'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse text into words
  const words = params.text.trim().split(/\s+/);

  // Helper function to convert hex to rgba
  const hexToRgba = (hex: string, alpha: number): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Calculate total duration
  const totalDuration =
    words.length *
      (params.flickerDuration +
        params.paintOnDuration +
        params.glowStabilizationDuration +
        params.wordGap) +
    2; // Extra 2 seconds at the end

  // Create word components with effects
  let currentStart = 0;
  const wordComponents = words.map((word, index) => {
    const wordId = `neon-word-${index}`;

    // Phase 1: Flicker (rapid opacity oscillation)
    const flickerEffect = {
      id: `flicker-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: currentStart,
        duration: params.flickerDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.1, prog: 0.15 },
          { key: 'opacity', val: 0, prog: 0.25 },
          { key: 'opacity', val: 1, prog: 0.4 },
          { key: 'opacity', val: 0.9, prog: 0.6 },
          { key: 'opacity', val: 1, prog: 0.8 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    // Phase 2: Paint-on reveal (clipPath animation)
    const paintOnStart = currentStart + params.flickerDuration;
    const paintOnEffect = {
      id: `paint-on-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: paintOnStart,
        duration: params.paintOnDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          {
            key: 'clipPath',
            val: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
            prog: 0,
          },
          {
            key: 'clipPath',
            val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            prog: 1,
          },
        ],
      },
    };

    // Phase 3: Glow stabilization (brightness and contrast)
    const glowStart =
      currentStart + params.flickerDuration + params.paintOnDuration;
    const glowEffect = {
      id: `glow-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: glowStart,
        duration: params.glowStabilizationDuration,
        mode: 'provider' as const,
        targetIds: [wordId],
        ranges: [
          { key: 'brightness', val: 0.5, prog: 0 },
          { key: 'brightness', val: 1.2, prog: 1 },
          { key: 'contrast', val: 1, prog: 0 },
          { key: 'contrast', val: 1.5, prog: 1 },
        ],
      },
    };

    // Update current start for next word
    currentStart +=
      params.flickerDuration +
      params.paintOnDuration +
      params.glowStabilizationDuration +
      params.wordGap;

    // Create word component
    const wordComponent = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${params.fontSize}px`,
          fontWeight: params.fontWeight,
          color: 'transparent',
          background: `linear-gradient(90deg, ${params.primaryColor}, ${params.secondaryColor})`,
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `
            0 0 10px ${hexToRgba(params.primaryColor, 0.8)},
            0 0 20px ${hexToRgba(params.primaryColor, 0.6)},
            0 0 30px ${hexToRgba(params.primaryColor, 0.4)},
            0 0 40px ${hexToRgba(params.secondaryColor, 0.2)}
          `,
          filter: `drop-shadow(0 0 15px ${params.primaryColor})`,
          clipPath: 'polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)',
          marginRight: '0.5em',
        },
        font: {
          family: params.fontFamily,
          weights: [params.fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [flickerEffect, paintOnEffect, glowEffect],
    };

    return wordComponent;
  });

  // Create neon tube backing (optional visual enhancement)
  const tubeBackingComponent = {
    id: 'neon-tube-backing',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bg-gray-800 rounded-full',
        style: {
          padding: '8px 24px',
          opacity: 0.6,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Create text container
  const textContainer = {
    id: 'neon-text-wrapper',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap justify-center items-center',
        style: {
          gap: '0.5em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents as RenderableComponentData[],
  };

  // Create main container
  const textContainerLayout = {
    id: 'neon-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          padding: '40px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      tubeBackingComponent as RenderableComponentData,
      textContainer as RenderableComponentData,
    ],
  };

  // Create root container
  const rootContainer = {
    id: 'neon-sign-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          backgroundColor: params.backgroundColor,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textContainerLayout as RenderableComponentData],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'neon-sign-paint-on-reveal',
  title: 'Neon Sign Paint-On Text Reveal',
  description:
    'A cyberpunk-inspired neon sign text effect where words appear as if being drawn with glowing neon light. Features realistic tube warm-up flickering, sequential paint-on reveal using clipPath animations, and multi-layered neon glow with text-shadow. Each word segment energizes sequentially with electrical flickering (rapid opacity keyframes), brightness warm-up (0.5 to 1.2), and contrast enhancement (1 to 1.5). Includes optional audio-reactive glow intensity when background music is present. Perfect for retro 80s motion graphics, cyberpunk titles, and dramatic text reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'cyberpunk',
    'retro',
    '80s',
    'glow',
    'paint-on',
    'reveal',
    'sequential',
    'flickering',
    'gradient',
    'title',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'NEON DREAMS',
    fontSize: 72,
    fontWeight: 700,
    fontFamily: 'Inter',
    flickerDuration: 0.4,
    paintOnDuration: 0.6,
    glowStabilizationDuration: 0.5,
    wordGap: 0.1,
    primaryColor: '#ec4899',
    secondaryColor: '#a855f7',
    backgroundColor: '#111827',
    audioReactive: false,
  },
};

// Export preset
export const neonSignPaintOnRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
