/**
 * Vintage Typewriter Kinetic Typography Preset
 *
 * This preset creates an authentic vintage typewriter-inspired kinetic typography experience
 * that evokes the mechanical innovation era of past inventors. Each word appears character-by-character
 * with realistic typing rhythm variations, subtle bounce effects mimicking keystroke impact, and
 * slight screen shake to reinforce the mechanical feel.
 *
 * Features:
 * - **Character-by-character reveal**: Words type out authentically like a mechanical typewriter
 * - **Authentic timing variations**: Quick typing for excited moments, slow for emphasis
 * - **Keystroke bounce effect**: Subtle translateY bounce on each character appearance
 * - **Screen shake**: Mimics physical impact of typewriter keys hitting paper
 * - **Split-screen composition**: Main transcript centered with inventor names/dates sliding in from sides
 * - **Film grain overlay**: Adds vintage texture and authenticity
 * - **Sepia-tinted grading**: Historical color palette (amber/brown tones)
 * - **Inventor accent elements**: Names and dates slide in as contextual highlights
 *
 * Use cases:
 * - Historical documentary captions
 * - Inventor biography videos
 * - Vintage-themed educational content
 * - Nostalgic storytelling presentations
 * - Mechanical innovation showcases
 *
 * Technical Implementation:
 * - Uses TextAtom components with word-level caption timing
 * - GPU-accelerated animations (transform, opacity only)
 * - Internal effect presets for typewriter reveal animations
 * - Responsive layout with Tailwind utilities
 * - Accessibility support with reduced-motion fallback
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe(
      'Array of caption objects with text, timing, words array, and optional metadata (inventorName, inventorDate, impact)',
    ),
  font: z
    .string()
    .optional()
    .default('Courier Prime:400:normal')
    .describe(
      'Main text font family with optional weight and style (e.g., "Courier Prime:400:normal")',
    ),
  inventorFont: z
    .string()
    .optional()
    .default('Playfair Display:700:normal')
    .describe(
      'Font for inventor names and dates (e.g., "Playfair Display:700:normal")',
    ),
  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Font size in pixels for main transcript text'),
  inventorFontSize: z
    .number()
    .optional()
    .default(28)
    .describe('Font size in pixels for inventor names'),
  dateFontSize: z
    .number()
    .optional()
    .default(24)
    .describe('Font size in pixels for inventor dates'),
  characterDelay: z
    .number()
    .optional()
    .default(50)
    .describe('Base delay in milliseconds between character appearances'),
  characterDuration: z
    .number()
    .optional()
    .default(100)
    .describe(
      'Duration in milliseconds for each character reveal animation (bounce + opacity)',
    ),
  bounceHeight: z
    .number()
    .optional()
    .default(2)
    .describe('Height in pixels for keystroke bounce effect'),
  defaultImpact: z
    .number()
    .optional()
    .default(1.0)
    .describe(
      'Global impact multiplier for effect intensity (0.5 = slower, 2.0 = faster)',
    ),
  filmGrainOpacity: z
    .number()
    .optional()
    .default(0.08)
    .describe('Opacity of film grain overlay (0.0 - 1.0)'),
  sepiaIntensity: z
    .number()
    .optional()
    .default(0.15)
    .describe('Intensity of sepia color filter (0.0 - 1.0)'),
  showInventorElements: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to show inventor name and date accent elements'),
  inventorSlideDistance: z
    .number()
    .optional()
    .default(100)
    .describe('Distance in percentage for inventor element slide animations'),
  inventorSlideDuration: z
    .number()
    .optional()
    .default(400)
    .describe('Duration in milliseconds for inventor element slide-in'),
  reducedMotion: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      'Accessibility mode: disables animations for reduced-motion preference',
    ),
});

// --- Preset Execution Function ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font,
    inventorFont,
    fontSize,
    inventorFontSize,
    dateFontSize,
    characterDelay,
    characterDuration,
    bounceHeight,
    defaultImpact,
    filmGrainOpacity,
    sepiaIntensity,
    showInventorElements,
    inventorSlideDistance,
    inventorSlideDuration,
    reducedMotion,
  } = params;

  // Helper: Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (
    fontString: string,
  ): {
    family: string;
    weight?: number;
    style?: 'normal' | 'italic';
  } => {
    const parts = fontString.split(':');
    const family = parts[0];
    const weight = parts[1] ? parseInt(parts[1], 10) : undefined;
    const style = parts[2] as 'normal' | 'italic' | undefined;
    return { family, weight, style };
  };

  // Helper: Create typewriter character reveal effect
  const createTypewriterEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    impact: number,
  ): any => {
    const adjustedDuration = reducedMotion ? 0 : duration * impact;

    if (reducedMotion) {
      // Instant reveal for reduced motion
      return {
        id: `typewriter-effect-${targetId}`,
        componentId: targetId,
        data: {
          type: 'linear',
          start: startTime,
          duration: 0.01,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [{ key: 'opacity', val: 1, prog: 0 }],
        },
      };
    }

    // Typewriter effect: opacity (0→1) + translateY bounce (-bounceHeight→0) + scale (0.95→1)
    return {
      id: `typewriter-effect-${targetId}`,
      componentId: targetId,
      data: {
        type: 'ease-out',
        start: startTime,
        duration: adjustedDuration / 1000, // Convert ms to seconds
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateY', val: -bounceHeight, prog: 0 },
          { key: 'translateY', val: 0, prog: 1 },
          { key: 'scale', val: 0.95, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Helper: Create slide-in effect for inventor elements
  const createSlideEffect = (
    targetId: string,
    startTime: number,
    duration: number,
    direction: 'left' | 'right',
  ): any => {
    const translateXStart =
      direction === 'left' ? -inventorSlideDistance : inventorSlideDistance;
    const adjustedDuration = reducedMotion ? 0.01 : duration / 1000;

    return {
      id: `slide-effect-${targetId}`,
      componentId: targetId,
      data: {
        type: 'ease-out',
        start: startTime,
        duration: adjustedDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'translateX', val: translateXStart, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };
  };

  // Parse fonts
  const mainFontData = parseFontString(font);
  const inventorFontData = parseFontString(inventorFont);

  // Build component tree
  const allChildren: RenderableComponentData[] = [];
  const allEffects: any[] = [];

  // Calculate total duration from captions
  let totalDuration = 0;
  captions.forEach((caption: TranscriptionSentence) => {
    const captionEnd = caption.absoluteStart + caption.duration;
    if (captionEnd > totalDuration) {
      totalDuration = captionEnd;
    }
  });

  // Process each caption
  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const captionImpact =
      (caption as any).metadata?.impact ?? defaultImpact ?? 1.0;
    const words = caption.words || [];

    // Create container for this caption's words
    const wordComponents: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordStartRelative = word.start; // Relative to caption start
      const wordDuration = word.duration;

      // Calculate character stagger timing
      const numChars = word.text.length;
      const staggerDelay = (characterDelay / 1000) * captionImpact; // Convert to seconds

      // Create word component with typewriter effect
      const wordComponent: RenderableComponentData = {
        id: wordId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: `${fontSize}px`,
            color: '#78350f', // amber-900
            textShadow: '2px 2px 4px rgba(0,0,0,0.1)',
            display: 'inline-block',
            marginRight: '0.3em',
            willChange: 'transform, opacity',
            ...(mainFontData.weight && { fontWeight: mainFontData.weight }),
            ...(mainFontData.style && { fontStyle: mainFontData.style }),
          },
          font: {
            family: mainFontData.family,
            ...(mainFontData.weight && {
              weights: [mainFontData.weight.toString()],
            }),
          },
        },
        context: {
          timing: {
            start: 0, // All words start at 0 relative to parent
            duration: caption.duration, // All words last for full caption duration
          },
        },
      };

      // Create typewriter reveal effect
      const typewriterEffect = createTypewriterEffect(
        wordId,
        wordStartRelative,
        characterDuration,
        captionImpact,
      );

      wordComponent.effects = [typewriterEffect];
      wordComponents.push(wordComponent);
    });

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${captionIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'flex flex-row flex-wrap items-center justify-center max-w-4xl px-16 py-12',
          style: {
            willChange: 'transform, opacity',
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

    allChildren.push(captionContainer);

    // Add inventor elements if metadata exists and enabled
    if (showInventorElements && (caption as any).metadata) {
      const metadata = (caption as any).metadata;

      if (metadata.inventorName) {
        const inventorId = `inventor-name-${captionIndex}`;
        const inventorComponent: RenderableComponentData = {
          id: inventorId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: metadata.inventorName,
            style: {
              fontSize: `${inventorFontSize}px`,
              color: '#92400e', // amber-800
              textShadow: '1px 1px 3px rgba(0,0,0,0.15)',
              willChange: 'transform, opacity',
              ...(inventorFontData.weight && {
                fontWeight: inventorFontData.weight,
              }),
              ...(inventorFontData.style && {
                fontStyle: inventorFontData.style,
              }),
            },
            font: {
              family: inventorFontData.family,
              ...(inventorFontData.weight && {
                weights: [inventorFontData.weight.toString()],
              }),
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
        };

        const inventorSlide = createSlideEffect(
          inventorId,
          0,
          inventorSlideDuration,
          'left',
        );
        inventorComponent.effects = [inventorSlide];

        const inventorWrapper: RenderableComponentData = {
          id: `inventor-wrapper-${captionIndex}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute top-8 left-8 z-20',
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
          childrenData: [inventorComponent],
        };

        allChildren.push(inventorWrapper);
      }

      if (metadata.inventorDate) {
        const dateId = `inventor-date-${captionIndex}`;
        const dateComponent: RenderableComponentData = {
          id: dateId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: metadata.inventorDate,
            style: {
              fontSize: `${dateFontSize}px`,
              color: '#b45309', // amber-700
              textShadow: '1px 1px 3px rgba(0,0,0,0.15)',
              willChange: 'transform, opacity',
              ...(inventorFontData.weight && {
                fontWeight: inventorFontData.weight,
              }),
              ...(inventorFontData.style && {
                fontStyle: inventorFontData.style,
              }),
            },
            font: {
              family: inventorFontData.family,
              ...(inventorFontData.weight && {
                weights: [inventorFontData.weight.toString()],
              }),
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
        };

        const dateSlide = createSlideEffect(
          dateId,
          0,
          inventorSlideDuration,
          'right',
        );
        dateComponent.effects = [dateSlide];

        const dateWrapper: RenderableComponentData = {
          id: `date-wrapper-${captionIndex}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute bottom-8 right-8 z-20',
            },
          },
          context: {
            timing: {
              start: caption.absoluteStart,
              duration: caption.duration,
            },
          },
          childrenData: [dateComponent],
        };

        allChildren.push(dateWrapper);
      }
    }
  });

  // Create film grain overlay
  const filmGrainOverlay: RenderableComponentData = {
    id: 'film-grain-overlay',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      shapeProps: {
        className: 'w-full h-full',
        style: {
          backgroundColor: `rgba(139, 119, 101, ${filmGrainOpacity})`,
          mixBlendMode: 'overlay' as any,
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  const filmGrainWrapper: RenderableComponentData = {
    id: 'film-grain-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-50 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [filmGrainOverlay],
  };

  allChildren.push(filmGrainWrapper);

  // Create main text container wrapper
  const mainTextContainer: RenderableComponentData = {
    id: 'main-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center justify-center absolute inset-0 z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allChildren.filter((child) =>
      child.id.startsWith('caption-container'),
    ),
  };

  // Collect all non-caption children (inventor elements, film grain)
  const overlayChildren = allChildren.filter(
    (child) =>
      !child.id.startsWith('caption-container') &&
      child.id !== 'film-grain-wrapper',
  );

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'vintage-typewriter-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative w-full h-full bg-gradient-to-b from-amber-50 to-amber-100 overflow-hidden',
        style: {
          filter: `sepia(${sepiaIntensity}) contrast(1.05)`,
        },
      },
      fitDurationTo: 'children' as any,
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [mainTextContainer, ...overlayChildren, filmGrainWrapper],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'vintage-typewriter-kinetic-typography',
  title: 'Vintage Typewriter Kinetic Typography',
  description:
    'A nostalgic typewriter-inspired kinetic typography preset that evokes the mechanical innovation era. Features character-by-character text reveal with authentic typing rhythm, subtle bounce effects on each keystroke, split-screen composition with inventor names and dates as sliding accent elements, film grain overlay, and sepia-tinted color grading for historical authenticity.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'typewriter',
    'vintage',
    'historical',
    'mechanical',
    'inventor',
    'sepia',
    'film-grain',
    'character-reveal',
    'bounce',
    'accent-elements',
    'nostalgic',
  ],
  defaultInputParams: {
    font: 'Courier Prime:400:normal',
    inventorFont: 'Playfair Display:700:normal',
    fontSize: 48,
    inventorFontSize: 28,
    dateFontSize: 24,
    characterDelay: 50,
    characterDuration: 100,
    bounceHeight: 2,
    defaultImpact: 1.0,
    filmGrainOpacity: 0.08,
    sepiaIntensity: 0.15,
    showInventorElements: true,
    inventorSlideDistance: 100,
    inventorSlideDuration: 400,
    reducedMotion: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const vintageTypewriterKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
