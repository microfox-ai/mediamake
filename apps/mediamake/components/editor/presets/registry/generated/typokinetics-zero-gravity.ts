/**
 * Zero Gravity Typokinetics Preset
 *
 * Mimics floating in zero gravity with text drifting slowly using momentum-based physics.
 * Each word has its own trajectory, rotating slowly on multiple axes while drifting across
 * the viewport with subtle size changes to simulate depth. Emulates 3D camera tracking and
 * depth-of-field effects from space cinematography.
 *
 * Features:
 * - Individual word trajectories with physics-based drift
 * - Multi-axis 3D rotation (rotateX, rotateY, rotateZ)
 * - Depth simulation via translateZ and scale correlation
 * - Atmospheric perspective via opacity changes
 * - Long-duration animations (10-15 seconds) for realistic floating
 * - 3D transforms with preserve-3d styling
 * - Random initial positions and unique timing offsets per word
 *
 * Use cases:
 * - Creating space-themed motion typography
 * - Simulating zero-gravity environments for sci-fi content
 * - Abstract floating text animations
 * - Cinematic depth-of-field text effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// ============================================================================
// Parameters Schema
// ============================================================================

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption sentences with words to animate'),
  
  // Drift parameters
  driftSpeed: z.number().min(0.1).max(3).default(1).optional()
    .describe('Drift speed multiplier for X/Y movement (default: 1)'),
  driftRangeX: z.number().min(50).max(500).default(200).optional()
    .describe('Maximum horizontal drift distance in pixels (default: 200)'),
  driftRangeY: z.number().min(50).max(500).default(150).optional()
    .describe('Maximum vertical drift distance in pixels (default: 150)'),
  
  // Rotation parameters
  rotationSpeed: z.number().min(0.1).max(3).default(1).optional()
    .describe('Rotation speed multiplier for all axes (default: 1)'),
  rotateXRange: z.number().min(0).max(720).default(360).optional()
    .describe('Maximum rotation on X axis in degrees (default: 360)'),
  rotateYRange: z.number().min(0).max(720).default(360).optional()
    .describe('Maximum rotation on Y axis in degrees (default: 360)'),
  rotateZRange: z.number().min(0).max(360).default(180).optional()
    .describe('Maximum rotation on Z axis in degrees (default: 180)'),
  
  // Depth parameters
  depthRange: z.number().min(50).max(200).default(100).optional()
    .describe('Maximum Z-axis depth in pixels (default: 100)'),
  scaleMin: z.number().min(0.5).max(1).default(0.8).optional()
    .describe('Minimum scale when far away (default: 0.8)'),
  scaleMax: z.number().min(1).max(2).default(1.2).optional()
    .describe('Maximum scale when close (default: 1.2)'),
  
  // Opacity parameters
  opacityMin: z.number().min(0).max(1).default(0.6).optional()
    .describe('Minimum opacity for atmospheric perspective (default: 0.6)'),
  opacityMax: z.number().min(0).max(1).default(1).optional()
    .describe('Maximum opacity when close (default: 1)'),
  
  // Timing parameters
  durationMin: z.number().min(5).max(20).default(10).optional()
    .describe('Minimum animation duration in seconds (default: 10)'),
  durationMax: z.number().min(5).max(30).default(15).optional()
    .describe('Maximum animation duration in seconds (default: 15)'),
  
  // Text styling
  font: z.string().default('Inter:400').optional()
    .describe('Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")'),
  fontSize: z.number().min(12).max(120).default(48).optional()
    .describe('Base font size in pixels (default: 48)'),
  textColor: z.string().default('#E5E5E5').optional()
    .describe('Text color (default: #E5E5E5 - light gray)'),
  
  // Perspective
  perspective: z.number().min(500).max(2000).default(1000).optional()
    .describe('3D perspective distance in pixels (default: 1000)'),
});

// ============================================================================
// Preset Execution
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    driftSpeed = 1,
    driftRangeX = 200,
    driftRangeY = 150,
    rotationSpeed = 1,
    rotateXRange = 360,
    rotateYRange = 360,
    rotateZRange = 180,
    depthRange = 100,
    scaleMin = 0.8,
    scaleMax = 1.2,
    opacityMin = 0.6,
    opacityMax = 1,
    durationMin = 10,
    durationMax = 15,
    font = 'Inter:400',
    fontSize = 48,
    textColor = '#E5E5E5',
    perspective = 1000,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Random number in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Random sign
  const randomSign = (): number => {
    return Math.random() > 0.5 ? 1 : -1;
  };

  // Process all words from all captions
  const allWords: Array<{
    word: any;
    caption: TranscriptionSentence;
    wordIndex: number;
    globalIndex: number;
  }> = [];

  let globalWordIndex = 0;
  captions.forEach((caption: TranscriptionSentence) => {
    caption.words.forEach((word, wordIndex) => {
      allWords.push({
        word,
        caption,
        wordIndex,
        globalIndex: globalWordIndex++,
      });
    });
  });

  // Create word components with zero-gravity effects
  const wordComponents: RenderableComponentData[] = allWords.map(({ word, caption, globalIndex }) => {
    const wordId = `word-${globalIndex}`;
    
    // Random initial position (viewport coordinates)
    const initialX = randomInRange(10, 90); // percentage
    const initialY = randomInRange(10, 90); // percentage
    
    // Random drift trajectory
    const driftX = randomSign() * randomInRange(50, driftRangeX) * driftSpeed;
    const driftY = randomSign() * randomInRange(50, driftRangeY) * driftSpeed;
    
    // Random rotation amounts
    const rotateX = randomSign() * randomInRange(90, rotateXRange) * rotationSpeed;
    const rotateY = randomSign() * randomInRange(90, rotateYRange) * rotationSpeed;
    const rotateZ = randomSign() * randomInRange(60, rotateZRange) * rotationSpeed;
    
    // Random duration for this word
    const wordDuration = randomInRange(durationMin, durationMax);
    
    // Staggered start time based on word appearance time
    const wordStartTime = word.absoluteStart;
    
    // Create effects for this word
    const effects: any[] = [];

    // Effect 1: Drift (translateX, translateY)
    effects.push({
      id: `drift-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: driftX, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: driftY, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Effect 2: Depth (translateZ) with oscillation
    effects.push({
      id: `depth-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateZ', val: -depthRange, prog: 0 },
          { key: 'translateZ', val: depthRange, prog: 0.5 },
          { key: 'translateZ', val: -depthRange, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Effect 3: Multi-axis rotation
    effects.push({
      id: `rotate-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'rotateX', val: 0, prog: 0 },
          { key: 'rotateX', val: rotateX, prog: 1 },
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: rotateY, prog: 1 },
          { key: 'rotateZ', val: 0, prog: 0 },
          { key: 'rotateZ', val: rotateZ, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Effect 4: Scale (tied to depth for realistic perspective)
    effects.push({
      id: `scale-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'scale', val: scaleMin, prog: 0 },
          { key: 'scale', val: scaleMax, prog: 0.5 },
          { key: 'scale', val: scaleMin, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Effect 5: Opacity (atmospheric perspective)
    effects.push({
      id: `opacity-${wordId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: wordDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'opacity', val: opacityMin, prog: 0 },
          { key: 'opacity', val: opacityMax, prog: 0.5 },
          { key: 'opacity', val: opacityMin, prog: 1 },
        ],
      } as GenericEffectData,
    });

    // Create word container with absolute positioning
    const wordContainer: RenderableComponentData = {
      id: wordId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            left: `${initialX}%`,
            top: `${initialY}%`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: wordStartTime,
          duration: wordDuration,
        },
      },
      effects,
      childrenData: [
        {
          id: `text-${wordId}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: 'text-gray-200 font-medium',
            style: {
              fontSize,
              color: textColor,
              ...fontStyle,
              transformStyle: 'preserve-3d',
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
        } as RenderableComponentData,
      ],
    };

    return wordContainer;
  });

  // Create root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-zero-gravity-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: `${perspective}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: [
      {
        id: 'word-container-layout',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'this',
          },
        },
        childrenData: wordComponents,
      } as RenderableComponentData,
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

// ============================================================================
// Preset Metadata
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'typokineticsZeroGravity',
  title: 'Zero Gravity Typokinetics',
  description: 'Mimics floating in zero gravity with text drifting slowly using momentum-based physics. Each word has its own trajectory, rotating slowly on multiple axes while drifting across the viewport with subtle size changes to simulate depth. Emulates 3D camera tracking and depth-of-field effects from space cinematography.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'zero-gravity', 'space', '3d', 'physics', 'floating', 'rotation', 'depth', 'perspective'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    driftSpeed: 1,
    driftRangeX: 200,
    driftRangeY: 150,
    rotationSpeed: 1,
    rotateXRange: 360,
    rotateYRange: 360,
    rotateZRange: 180,
    depthRange: 100,
    scaleMin: 0.8,
    scaleMax: 1.2,
    opacityMin: 0.6,
    opacityMax: 1,
    durationMin: 10,
    durationMax: 15,
    font: 'Inter:400',
    fontSize: 48,
    textColor: '#E5E5E5',
    perspective: 1000,
  },
};

// ============================================================================
// Export
// ============================================================================

export const typokineticsZeroGravityPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};