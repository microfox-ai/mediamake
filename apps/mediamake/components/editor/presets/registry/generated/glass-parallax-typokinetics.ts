/**
 * Glass Parallax Typokinetics Preset
 *
 * This preset creates a sophisticated multi-plane parallax effect where text appears
 * carved into layers of glass sliding past each other at different depths. Inspired by
 * traditional multiplane camera techniques, it features:
 *
 * - Multiple glass layers at different Z-depths (-500px to 500px)
 * - Parallax motion with depth-based speed (foreground faster, background slower)
 * - Glassmorphism effects with backdrop blur and transparency
 * - Subtle light refraction via skewX transforms
 * - Depth-of-field blur with shifting focus between layers
 * - Brightness variations simulating light transmission through glass
 * - Caption data integration with importance-based layer distribution
 *
 * Use cases:
 * - Premium title sequences with depth and sophistication
 * - Cinematic caption displays with parallax motion
 * - Multi-layered text presentations with glass aesthetics
 * - Abstract typography animations with depth perception
 */

import { z } from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
            keyword: z.string().optional(),
          })
          .optional(),
      }),
    )
    .describe(
      'Array of caption sentences with words and metadata for multi-layer distribution',
    ),

  font: z
    .string()
    .default('Inter:700')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600")',
    ),

  layerDepths: z
    .object({
      foreground: z.number().default(500).describe('Z-depth of foreground layer in pixels'),
      midground: z.number().default(0).describe('Z-depth of midground layer in pixels'),
      background: z.number().default(-500).describe('Z-depth of background layer in pixels'),
    })
    .optional()
    .describe('Z-depth configuration for each glass layer'),

  driftSpeeds: z
    .object({
      foreground: z
        .number()
        .default(100)
        .describe('Horizontal drift speed for foreground layer (px/s)'),
      midground: z
        .number()
        .default(50)
        .describe('Horizontal drift speed for midground layer (px/s)'),
      background: z
        .number()
        .default(25)
        .describe('Horizontal drift speed for background layer (px/s)'),
    })
    .optional()
    .describe('Horizontal drift speeds for each layer (parallax effect)'),

  focusSequence: z
    .object({
      duration: z
        .number()
        .default(4)
        .describe('Duration each layer stays in focus (seconds)'),
      blurAmount: z
        .object({
          inFocus: z.number().default(0).describe('Blur amount for focused layer (px)'),
          outOfFocus: z.number().default(4).describe('Blur amount for out-of-focus layers (px)'),
          farOutOfFocus: z
            .number()
            .default(6)
            .describe('Blur amount for far out-of-focus layers (px)'),
        })
        .optional()
        .describe('Blur amounts for different focus states'),
    })
    .optional()
    .describe('Depth-of-field focus shifting configuration'),

  refractionIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .optional()
    .describe('Intensity of skewX refraction effect (degrees)'),

  brightnessRange: z
    .object({
      min: z.number().default(0.9).describe('Minimum brightness value'),
      max: z.number().default(1.1).describe('Maximum brightness value'),
    })
    .optional()
    .describe('Brightness variation range for light transmission effect'),

  glassmorphism: z
    .object({
      opacity: z.number().default(0.1).describe('Background opacity for glass layers'),
      backdropBlur: z.number().default(1).describe('Backdrop blur amount (px)'),
    })
    .optional()
    .describe('Glassmorphism styling configuration'),

  textSizes: z
    .object({
      foreground: z.number().default(64).describe('Font size for foreground layer (px)'),
      midground: z.number().default(56).describe('Font size for midground layer (px)'),
      background: z.number().default(48).describe('Font size for background layer (px)'),
    })
    .optional()
    .describe('Font sizes for each layer'),

  textOpacity: z
    .object({
      foreground: z.number().default(1).describe('Text opacity for foreground layer'),
      midground: z.number().default(0.85).describe('Text opacity for midground layer'),
      background: z.number().default(0.7).describe('Text opacity for background layer'),
    })
    .optional()
    .describe('Text opacity values for each layer'),

  animationDuration: z
    .number()
    .min(5)
    .max(20)
    .default(12)
    .optional()
    .describe('Total duration of parallax animation cycle (seconds)'),

  distributionStrategy: z
    .enum(['sequential', 'importance', 'balanced'])
    .default('importance')
    .optional()
    .describe(
      'Strategy for distributing words across layers: sequential (order-based), importance (metadata-based), balanced (even distribution)',
    ),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Configuration defaults
  const layerDepths = params.layerDepths || { foreground: 500, midground: 0, background: -500 };
  const driftSpeeds = params.driftSpeeds || { foreground: 100, midground: 50, background: 25 };
  const focusSequence = params.focusSequence || {
    duration: 4,
    blurAmount: { inFocus: 0, outOfFocus: 4, farOutOfFocus: 6 },
  };
  const refractionIntensity = params.refractionIntensity ?? 2;
  const brightnessRange = params.brightnessRange || { min: 0.9, max: 1.1 };
  const glassmorphism = params.glassmorphism || { opacity: 0.1, backdropBlur: 1 };
  const textSizes = params.textSizes || { foreground: 64, midground: 56, background: 48 };
  const textOpacity = params.textOpacity || { foreground: 1, midground: 0.85, background: 0.7 };
  const animationDuration = params.animationDuration ?? 12;
  const distributionStrategy = params.distributionStrategy || 'importance';

  // Helper function: Distribute words across layers
  const distributeWordsAcrossLayers = (captions: TranscriptionSentence[]) => {
    const allWords: Array<{
      text: string;
      start: number;
      absoluteStart: number;
      end: number;
      absoluteEnd: number;
      duration: number;
      impact: number;
      captionId: string;
    }> = [];

    // Collect all words with impact scores
    captions.forEach((caption) => {
      const captionImpact = caption.metadata?.impact ?? 1.0;
      caption.words.forEach((word) => {
        allWords.push({
          text: word.text,
          start: word.start,
          absoluteStart: word.absoluteStart,
          end: word.end,
          absoluteEnd: word.absoluteEnd,
          duration: word.duration,
          impact: captionImpact,
          captionId: caption.id,
        });
      });
    });

    const layers: {
      foreground: typeof allWords;
      midground: typeof allWords;
      background: typeof allWords;
    } = {
      foreground: [],
      midground: [],
      background: [],
    };

    // Distribution logic
    if (distributionStrategy === 'importance') {
      // Sort by impact (highest first) and distribute accordingly
      const sorted = [...allWords].sort((a, b) => b.impact - a.impact);
      sorted.forEach((word, index) => {
        const layerIndex = index % 3;
        if (layerIndex === 0) layers.foreground.push(word);
        else if (layerIndex === 1) layers.midground.push(word);
        else layers.background.push(word);
      });
    } else if (distributionStrategy === 'sequential') {
      // Sequential distribution based on order
      allWords.forEach((word, index) => {
        const layerIndex = index % 3;
        if (layerIndex === 0) layers.foreground.push(word);
        else if (layerIndex === 1) layers.midground.push(word);
        else layers.background.push(word);
      });
    } else {
      // Balanced distribution (even split)
      const third = Math.ceil(allWords.length / 3);
      layers.foreground = allWords.slice(0, third);
      layers.midground = allWords.slice(third, third * 2);
      layers.background = allWords.slice(third * 2);
    }

    return layers;
  };

  // Distribute words
  const distributedWords = distributeWordsAcrossLayers(params.captions);

  // Calculate total timeline span
  const allAbsoluteStarts = params.captions.map((c) => c.absoluteStart);
  const allAbsoluteEnds = params.captions.map((c) => c.absoluteEnd);
  const timelineStart = Math.min(...allAbsoluteStarts);
  const timelineEnd = Math.max(...allAbsoluteEnds);
  const totalDuration = timelineEnd - timelineStart;

  // Helper: Create text atoms for a layer
  const createLayerTextAtoms = (
    words: Array<{
      text: string;
      absoluteStart: number;
      absoluteEnd: number;
      duration: number;
    }>,
    layerName: 'foreground' | 'midground' | 'background',
  ): RenderableComponentData[] => {
    return words.map((word, index) => {
      const wordId = `glass-text-${layerName}-${index}`;
      const fontSize = textSizes[layerName];
      const opacity = textOpacity[layerName];

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 700,
            color: `rgba(255, 255, 255, ${opacity})`,
            textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          },
          font: {
            family: fontFamily,
            weights: [String(fontStyle.fontWeight || 700)],
          },
        },
        context: {
          timing: {
            start: word.absoluteStart - timelineStart,
            duration: word.duration,
          },
        },
      } as RenderableComponentData;
    });
  };

  // Create text atoms for each layer
  const foregroundTextAtoms = createLayerTextAtoms(distributedWords.foreground, 'foreground');
  const midgroundTextAtoms = createLayerTextAtoms(distributedWords.midground, 'midground');
  const backgroundTextAtoms = createLayerTextAtoms(distributedWords.background, 'background');

  // Helper: Create layer with effects
  const createGlassLayer = (
    layerId: string,
    layerName: 'foreground' | 'midground' | 'background',
    depth: number,
    driftSpeed: number,
    textAtoms: RenderableComponentData[],
    justifyContent: string,
  ): RenderableComponentData => {
    const driftDistance = driftSpeed * animationDuration;

    // Drift effect (translateX animation)
    const driftEffect = {
      id: `${layerId}-drift`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: animationDuration,
        mode: 'provider' as const,
        targetIds: [`${layerId}-text-group`],
        ranges: [
          { key: 'translateX', val: -driftDistance / 2, prog: 0 },
          { key: 'translateX', val: driftDistance / 2, prog: 1 },
        ],
      },
    };

    // Refraction effect (subtle skewX oscillation)
    const refractionEffect = {
      id: `${layerId}-refraction`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: animationDuration,
        mode: 'provider' as const,
        targetIds: [`${layerId}-text-group`],
        ranges: [
          { key: 'skewX', val: -refractionIntensity, prog: 0 },
          { key: 'skewX', val: refractionIntensity, prog: 0.5 },
          { key: 'skewX', val: -refractionIntensity, prog: 1 },
        ],
      },
    };

    // Brightness variation effect
    const brightnessEffect = {
      id: `${layerId}-brightness`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: animationDuration,
        mode: 'provider' as const,
        targetIds: [`${layerId}-text-group`],
        ranges: [
          { key: 'brightness', val: brightnessRange.min, prog: 0 },
          { key: 'brightness', val: brightnessRange.max, prog: 0.5 },
          { key: 'brightness', val: brightnessRange.min, prog: 1 },
        ],
      },
    };

    // Focus sequence effect (depth-of-field blur)
    const focusDuration = focusSequence.duration;
    const blurAmounts = focusSequence.blurAmount || {
      inFocus: 0,
      outOfFocus: 4,
      farOutOfFocus: 6,
    };

    // Calculate focus timing for three layers cycling
    // Each layer gets focused for focusDuration seconds
    // Pattern: foreground → midground → background → repeat
    const focusLayerOrder = ['foreground', 'midground', 'background'];
    const currentLayerIndex = focusLayerOrder.indexOf(layerName);
    const focusStartProg = (currentLayerIndex * focusDuration) / animationDuration;
    const focusEndProg = Math.min(
      ((currentLayerIndex + 1) * focusDuration) / animationDuration,
      1,
    );

    const focusEffect = {
      id: `${layerId}-focus`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: animationDuration,
        mode: 'provider' as const,
        targetIds: [layerId],
        ranges: [
          // Start out of focus
          { key: 'blur', val: `${blurAmounts.outOfFocus}px`, prog: 0 },
          // Transition to in-focus
          {
            key: 'blur',
            val: `${blurAmounts.inFocus}px`,
            prog: Math.max(focusStartProg - 0.05, 0),
          },
          { key: 'blur', val: `${blurAmounts.inFocus}px`, prog: focusStartProg },
          // Stay in focus
          { key: 'blur', val: `${blurAmounts.inFocus}px`, prog: focusEndProg },
          // Transition to out of focus
          {
            key: 'blur',
            val: `${blurAmounts.outOfFocus}px`,
            prog: Math.min(focusEndProg + 0.05, 1),
          },
          // Stay out of focus
          { key: 'blur', val: `${blurAmounts.outOfFocus}px`, prog: 1 },
        ],
      },
    };

    // Text group container with drift and refraction
    const textGroupContainer = {
      id: `${layerId}-text-group`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex items-center ${justifyContent}`,
          style: {
            gap: layerName === 'foreground' ? '30px' : layerName === 'midground' ? '50px' : '40px',
            paddingLeft: justifyContent.includes('start') ? '10%' : '0',
            paddingRight: justifyContent.includes('end') ? '10%' : '0',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: textAtoms,
      effects: [driftEffect, refractionEffect, brightnessEffect],
    } as RenderableComponentData;

    // Glass layer container with depth and focus effects
    return {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            zIndex: layerName === 'foreground' ? 3 : layerName === 'midground' ? 2 : 1,
            backdropFilter: `blur(${glassmorphism.backdropBlur}px)`,
            transform: `translateZ(${depth}px)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: [textGroupContainer],
      effects: [focusEffect],
    } as RenderableComponentData;
  };

  // Create glass layers
  const foregroundLayer = createGlassLayer(
    'glass-layer-foreground',
    'foreground',
    layerDepths.foreground,
    driftSpeeds.foreground,
    foregroundTextAtoms,
    'justify-end',
  );

  const midgroundLayer = createGlassLayer(
    'glass-layer-midground',
    'midground',
    layerDepths.midground,
    driftSpeeds.midground,
    midgroundTextAtoms,
    'justify-center',
  );

  const backgroundLayer = createGlassLayer(
    'glass-layer-background',
    'background',
    layerDepths.background,
    driftSpeeds.background,
    backgroundTextAtoms,
    'justify-start',
  );

  // Root parallax container
  const rootContainer: RenderableComponentData = {
    id: 'glass-parallax-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: timelineStart,
        duration: totalDuration,
      },
    },
    childrenData: [backgroundLayer, midgroundLayer, foregroundLayer],
  };

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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'glass-parallax-typokinetics',
  title: 'Glass Parallax Typokinetics',
  description:
    'A sophisticated typokinetics preset featuring text carved into multiple glass layers sliding at different depths with parallax motion, depth-of-field blur transitions, and subtle light refraction effects. Text drifts horizontally at speeds inversely proportional to depth (foreground faster, background slower) with focus shifting between layers. Uses glassmorphism aesthetics with backdrop blur and brightness variations to simulate light transmission through transparent planes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'typokinetics',
    'glass',
    'parallax',
    'multiplane',
    'depth',
    'glassmorphism',
    'refraction',
    'blur',
    'cinematic',
    'sophisticated',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:700',
    layerDepths: {
      foreground: 500,
      midground: 0,
      background: -500,
    },
    driftSpeeds: {
      foreground: 100,
      midground: 50,
      background: 25,
    },
    focusSequence: {
      duration: 4,
      blurAmount: {
        inFocus: 0,
        outOfFocus: 4,
        farOutOfFocus: 6,
      },
    },
    refractionIntensity: 2,
    brightnessRange: {
      min: 0.9,
      max: 1.1,
    },
    glassmorphism: {
      opacity: 0.1,
      backdropBlur: 1,
    },
    textSizes: {
      foreground: 64,
      midground: 56,
      background: 48,
    },
    textOpacity: {
      foreground: 1,
      midground: 0.85,
      background: 0.7,
    },
    animationDuration: 12,
    distributionStrategy: 'importance',
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const glassParallaxTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
