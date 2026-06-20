/**
 * DNA Helix Double Spiral Text Reveal Preset
 *
 * A typokinetic preset featuring a DNA helix-inspired double spiral reveal animation.
 * Text unfolds from center in two interweaving strands (odd/even words or first/second half),
 * each following a helical path with opposite phase. The strands rotate around each other
 * while expanding outward, creating a dynamic molecular visualization effect with 3D transforms,
 * perspective depth, and elegant scientific aesthetics.
 *
 * Features:
 * - **Double Helix Animation**: Two text strands follow helical paths with opposite phases
 * - **3D Perspective**: Uses CSS 3D transforms for realistic depth and rotation
 * - **Flexible Text Splitting**: Split by odd/even words or first/second half
 * - **Helix Path Calculation**: Mathematical helix path (radius * cos/sin for x/z, linear for y)
 * - **Staggered Timing**: Strands start with slight offset for interweaving effect
 * - **Spring Easing**: Smooth, organic motion with spring or ease-in-out easing
 * - **Depth Perception**: Text shadows and glow for enhanced 3D effect
 * - **Customizable Parameters**: Control radius, rotation speed, text splitting mode, colors
 *
 * Use cases:
 * - Scientific and tech content titles
 * - Molecular visualization aesthetics
 * - Dynamic kinetic typography
 * - Educational content with DNA/molecular themes
 * - Elegant reveal animations for sophisticated content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  TextAtomData,
  RenderableComponentData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to reveal in double helix pattern'),
  
  splitMode: z
    .enum(['odd-even', 'first-second-half'])
    .default('odd-even')
    .describe('How to split text into two strands: odd/even words or first/second half'),
  
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Total animation duration in seconds'),
  
  helixRadius: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Radius of the helix spiral in pixels'),
  
  rotationSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for helix rotation (1 = normal, 2 = faster)'),
  
  strandOffset: z
    .number()
    .min(0)
    .max(0.5)
    .default(0.1)
    .describe('Time offset between strands in seconds (for interweaving effect)'),
  
  fontSize: z
    .number()
    .min(16)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., Inter, Roboto, Montserrat)'),
  
  fontWeight: z
    .string()
    .default('600')
    .describe('Font weight (e.g., 400, 600, 700)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color for both strands'),
  
  strand1Glow: z
    .string()
    .default('rgba(100, 200, 255, 0.5)')
    .describe('Glow color for first strand (blue-ish by default)'),
  
  strand2Glow: z
    .string()
    .default('rgba(150, 100, 255, 0.5)')
    .describe('Glow color for second strand (purple-ish by default)'),
  
  easingType: z
    .enum(['spring', 'ease-in-out', 'ease-out'])
    .default('spring')
    .describe('Easing function for animations'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Split text into two strands
  const splitTextIntoStrands = (
    text: string,
    mode: 'odd-even' | 'first-second-half',
  ): [string[], string[]] => {
    const words = text.trim().split(/\s+/);
    
    if (mode === 'odd-even') {
      const oddWords: string[] = [];
      const evenWords: string[] = [];
      words.forEach((word, index) => {
        if (index % 2 === 0) {
          oddWords.push(word);
        } else {
          evenWords.push(word);
        }
      });
      return [oddWords, evenWords];
    } else {
      // first-second-half
      const midpoint = Math.ceil(words.length / 2);
      const firstHalf = words.slice(0, midpoint);
      const secondHalf = words.slice(midpoint);
      return [firstHalf, secondHalf];
    }
  };

  // Helper function: Calculate helix position at progress
  const calculateHelixPosition = (
    progress: number,
    radius: number,
    rotations: number,
    phaseOffset: number,
  ) => {
    const angle = (progress * rotations * 2 * Math.PI) + phaseOffset;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle);
    const y = progress * 100 - 50; // Linear vertical progression (-50 to +50)
    
    return { x, y, z };
  };

  // Helper function: Create helix effect for a word
  const createHelixEffect = (
    wordId: string,
    wordIndex: number,
    totalWords: number,
    duration: number,
    radius: number,
    rotationSpeed: number,
    phaseOffset: number,
    easingType: string,
  ): GenericEffectData => {
    const startDelay = (wordIndex / totalWords) * 0.5; // Stagger by 50% of duration
    const effectDuration = duration * 0.8; // Effect takes 80% of total duration
    
    // Calculate start and end positions on helix
    const startPos = calculateHelixPosition(0, 0, rotationSpeed, phaseOffset);
    const midPos = calculateHelixPosition(0.5, radius, rotationSpeed, phaseOffset);
    const endPos = calculateHelixPosition(1, radius, rotationSpeed, phaseOffset);
    
    return {
      type: easingType as any,
      start: startDelay,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Position animation (helix path)
        { key: 'translateX', val: startPos.x, prog: 0 },
        { key: 'translateX', val: midPos.x, prog: 0.5 },
        { key: 'translateX', val: endPos.x, prog: 1 },
        
        { key: 'translateY', val: startPos.y, prog: 0 },
        { key: 'translateY', val: midPos.y, prog: 0.5 },
        { key: 'translateY', val: endPos.y, prog: 1 },
        
        { key: 'translateZ', val: startPos.z, prog: 0 },
        { key: 'translateZ', val: midPos.z, prog: 0.5 },
        { key: 'translateZ', val: endPos.z, prog: 1 },
        
        // Rotation for 3D effect
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: 180 * rotationSpeed, prog: 0.5 },
        { key: 'rotateY', val: 360 * rotationSpeed, prog: 1 },
        
        // Scale animation (expand outward)
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1, prog: 0.5 },
        { key: 'scale', val: 1, prog: 1 },
        
        // Opacity fade-in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };
  };

  // Split text into two strands
  const [strand1Words, strand2Words] = splitTextIntoStrands(
    params.text,
    params.splitMode,
  );

  // Create word components for strand 1
  const strand1Children: RenderableComponentData[] = strand1Words.map(
    (word, index) => {
      const wordId = `dna-helix-strand1-word-${index}`;
      const effect = createHelixEffect(
        wordId,
        index,
        strand1Words.length,
        params.duration,
        params.helixRadius,
        params.rotationSpeed,
        0, // Phase offset 0 for strand 1
        params.easingType,
      );

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: params.fontSize,
            fontWeight: params.fontWeight,
            color: params.textColor,
            textShadow: `0 0 20px ${params.strand1Glow}`,
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            marginRight: '0.3em',
          },
          font: {
            family: params.fontFamily,
            weights: [params.fontWeight],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-helix-effect`,
            componentId: 'generic',
            data: effect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create word components for strand 2
  const strand2Children: RenderableComponentData[] = strand2Words.map(
    (word, index) => {
      const wordId = `dna-helix-strand2-word-${index}`;
      const effect = createHelixEffect(
        wordId,
        index,
        strand2Words.length,
        params.duration,
        params.helixRadius,
        params.rotationSpeed,
        Math.PI, // Phase offset 180° (π radians) for strand 2 (opposite phase)
        params.easingType,
      );

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word,
          style: {
            fontSize: params.fontSize,
            fontWeight: params.fontWeight,
            color: params.textColor,
            textShadow: `0 0 20px ${params.strand2Glow}`,
            transformStyle: 'preserve-3d',
            backfaceVisibility: 'hidden',
            marginRight: '0.3em',
          },
          font: {
            family: params.fontFamily,
            weights: [params.fontWeight],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: params.strandOffset, // Offset second strand
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-helix-effect`,
            componentId: 'generic',
            data: effect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Strand 1 container
  const strand1Container: RenderableComponentData = {
    id: 'dna-helix-strand1-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration + params.strandOffset,
      },
    },
    childrenData: strand1Children,
  };

  // Strand 2 container
  const strand2Container: RenderableComponentData = {
    id: 'dna-helix-strand2-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration + params.strandOffset,
      },
    },
    childrenData: strand2Children,
  };

  // Root container with 3D perspective
  const rootContainer: RenderableComponentData = {
    id: 'dna-helix-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration + params.strandOffset,
      },
    },
    childrenData: [strand1Container, strand2Container],
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
  id: 'dna-helix-text-reveal',
  title: 'DNA Helix Double Spiral Text Reveal',
  description:
    'A typokinetic preset featuring a DNA helix-inspired double spiral reveal animation. Text unfolds from center in two interweaving strands (odd/even words or first/second half), each following a helical path with opposite phase. The strands rotate around each other while expanding outward, creating a dynamic molecular visualization effect with 3D transforms, perspective depth, and elegant scientific aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'dna',
    'helix',
    'spiral',
    'double-helix',
    '3d',
    'perspective',
    'molecular',
    'scientific',
    'reveal',
    'animation',
    'text',
    'elegant',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'DNA Helix Double Spiral Reveal Animation',
    splitMode: 'odd-even',
    duration: 2.5,
    helixRadius: 150,
    rotationSpeed: 1,
    strandOffset: 0.1,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '600',
    textColor: '#FFFFFF',
    strand1Glow: 'rgba(100, 200, 255, 0.5)',
    strand2Glow: 'rgba(150, 100, 255, 0.5)',
    easingType: 'spring',
  },
};

// Export preset
export const dnaHelixTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
