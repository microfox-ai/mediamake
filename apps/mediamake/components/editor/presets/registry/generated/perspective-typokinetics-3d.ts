/**
 * Perspective 3D Typokinetics Preset
 *
 * This preset creates a dynamic 3D typography effect where words slide in from a vanishing point,
 * simulating depth like a horizontal Star Wars opening crawl. Each word starts small and far away
 * (translateZ: -300px, scale: 0.5), then slides forward growing to full size with perspective
 * transforms. Words at the edges have more dramatic Y-axis rotation (up to 25deg) while center
 * words have subtle rotation (5deg), creating enhanced dimensionality. A synchronized blur-to-focus
 * effect simulates depth of field, with blur transitioning from 3px to 0px as words approach.
 * Words are staggered from center outward for symmetric reveal, creating a graceful 3D assembly effect.
 *
 * Features:
 * - **3D Perspective Transforms**: translateZ (-300px → 0px), scale (0.5 → 1), rotateY (25deg → 0deg)
 * - **Depth Blur Effect**: filter blur (3px → 0px) synchronized with translateZ animation
 * - **Position-Based Rotation**: Edge words have dramatic angles, center words subtle rotation
 * - **Center-Outward Stagger**: Symmetric reveal animation radiating from center
 * - **3D Space Preservation**: Uses transform-style: preserve-3d and backface-visibility: hidden
 * - **Perspective Container**: perspective: 1000px on parent container for depth rendering
 *
 * Use cases:
 * - Creating cinematic title sequences with depth
 * - Building sci-fi or futuristic typography effects
 * - Adding dramatic 3D text reveals
 * - Creating After Effects-style camera moves in 2D
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  caption: z
    .custom<TranscriptionSentence>()
    .describe('Caption data with words array containing timing information'),
  
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  
  wordSpacing: z
    .number()
    .min(0)
    .max(100)
    .default(12)
    .describe('Gap between words in pixels'),
  
  perspective: z
    .number()
    .min(500)
    .max(2000)
    .default(1000)
    .describe('Perspective distance in pixels (lower = more dramatic)'),
  
  startDepth: z
    .number()
    .min(-500)
    .max(0)
    .default(-300)
    .describe('Starting translateZ position in pixels (negative = away from viewer)'),
  
  startScale: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Starting scale value (0.5 = half size)'),
  
  maxRotation: z
    .number()
    .min(0)
    .max(45)
    .default(25)
    .describe('Maximum Y-axis rotation for edge words in degrees'),
  
  minRotation: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Minimum Y-axis rotation for center words in degrees'),
  
  blurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Starting blur amount in pixels'),
  
  animationDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of slide-in animation in seconds'),
  
  staggerDelay: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.08)
    .describe('Delay between word animations in seconds (center-outward)'),
  
  impact: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .optional()
    .describe('Effect intensity multiplier (from caption metadata or global)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { caption } = params;
  
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }
  
  // Get impact multiplier (from caption metadata or param)
  const impact = caption.metadata?.impact ?? params.impact ?? 1.0;
  
  // Extract words
  const words = caption.words || [];
  const wordCount = words.length;
  const centerIndex = Math.floor(wordCount / 2);
  
  // Helper: Calculate stagger delay based on distance from center
  const calculateStagger = (index: number): number => {
    const distanceFromCenter = Math.abs(index - centerIndex);
    return distanceFromCenter * params.staggerDelay * impact;
  };
  
  // Helper: Calculate Y-axis rotation based on position
  const calculateRotation = (index: number): number => {
    if (wordCount === 1) return params.minRotation;
    
    // Normalize position: 0 (left edge) to 1 (right edge)
    const normalizedPosition = index / (wordCount - 1);
    
    // Distance from center: 0 (center) to 1 (edge)
    const distanceFromCenter = Math.abs(normalizedPosition - 0.5) * 2;
    
    // Interpolate rotation: center gets minRotation, edges get maxRotation
    const rotation =
      params.minRotation +
      (params.maxRotation - params.minRotation) * distanceFromCenter;
    
    // Apply direction: left side rotates right (+), right side rotates left (-)
    const direction = normalizedPosition < 0.5 ? 1 : -1;
    
    return rotation * direction;
  };
  
  // Create word components with 3D effects
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${caption.id}-${index}`;
    const staggerDelay = calculateStagger(index);
    const startRotation = calculateRotation(index);
    
    // 3D slide effect
    const slideEffect: GenericEffectData = {
      type: 'ease-out',
      start: staggerDelay, // Stagger from center outward
      duration: params.animationDuration * impact,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // TranslateZ: far to near
        { key: 'translateZ', val: `${params.startDepth}px`, prog: 0 },
        { key: 'translateZ', val: '0px', prog: 1 },
        
        // Scale: small to full size
        { key: 'scale', val: params.startScale, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        
        // RotateY: angled to straight
        { key: 'rotateY', val: `${startRotation}deg`, prog: 0 },
        { key: 'rotateY', val: '0deg', prog: 1 },
      ],
    };
    
    // Blur-to-focus effect (synchronized with translateZ)
    const blurEffect: GenericEffectData = {
      type: 'ease-out',
      start: staggerDelay,
      duration: params.animationDuration * impact,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'filter', val: `blur(${params.blurAmount}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    };
    
    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: `${params.fontSize}px`,
          color: params.textColor,
          textShadow: '0 2px 8px rgba(0,0,0,0.3)',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `slide-effect-${wordId}`,
          componentId: 'generic',
          data: slideEffect,
        },
        {
          id: `blur-effect-${wordId}`,
          componentId: 'generic',
          data: blurEffect,
        },
      ],
    } as RenderableComponentData;
  });
  
  // Words container with preserve-3d
  const wordsContainer: RenderableComponentData = {
    id: `words-3d-container-${caption.id}`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center',
        style: {
          gap: `${params.wordSpacing}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: wordComponents,
  };
  
  // Perspective container
  const perspectiveContainer: RenderableComponentData = {
    id: `perspective-container-${caption.id}`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: `${params.perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: caption.absoluteStart,
        duration: caption.duration,
      },
    },
    childrenData: [wordsContainer],
  };
  
  return {
    output: {
      childrenData: [perspectiveContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'perspective-typokinetics-3d',
  title: 'Perspective 3D Typokinetics',
  description:
    'Dynamic 3D typography preset where words slide in from a vanishing point with perspective transforms, creating depth like a horizontal Star Wars crawl. Features translateZ animation, rotateY transforms based on position, and synchronized blur-to-focus depth of field effect. Words start small and far away, then slide forward growing to full size while maintaining perspective. Edge words have more dramatic rotation angles than center words for enhanced dimensionality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'perspective',
    'depth',
    'star-wars',
    'crawl',
    'translateZ',
    'rotateY',
    'blur',
    'depth-of-field',
    'cinematic',
    'sci-fi',
    'camera',
  ],
  defaultInputParams: {
    caption: {
      id: 'caption-1',
      text: 'Experience the depth',
      start: 0,
      end: 3,
      duration: 3,
      absoluteStart: 0,
      absoluteEnd: 3,
      words: [
        {
          text: 'Experience',
          start: 0,
          end: 1,
          duration: 1,
          absoluteStart: 0,
          absoluteEnd: 1,
        },
        {
          text: 'the',
          start: 1,
          end: 1.5,
          duration: 0.5,
          absoluteStart: 1,
          absoluteEnd: 1.5,
        },
        {
          text: 'depth',
          start: 1.5,
          end: 3,
          duration: 1.5,
          absoluteStart: 1.5,
          absoluteEnd: 3,
        },
      ],
    },
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    wordSpacing: 12,
    perspective: 1000,
    startDepth: -300,
    startScale: 0.5,
    maxRotation: 25,
    minRotation: 5,
    blurAmount: 3,
    animationDuration: 0.8,
    staggerDelay: 0.08,
    impact: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const perspectiveTypokinetics3dPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
