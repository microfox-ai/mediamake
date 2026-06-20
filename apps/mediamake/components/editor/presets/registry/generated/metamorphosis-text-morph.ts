/**
 * Metamorphosis Text Morph Preset
 *
 * A word transformation preset where text appears to liquify and flow apart like melting,
 * then reforms into new words through a morphing effect. Uses opacity crossfades between
 * multiple text layers with synchronized scale, blur, and transform effects to simulate
 * liquid metamorphosis. Color overlays with blend modes create energy transformation
 * visuals during the morph peak.
 *
 * Features:
 * - **Three-Phase Morphing**: Outgoing word dissolves, middle word assembles, incoming word forms
 * - **Liquify Effects**: Scale, blur, and opacity transitions simulate melting text
 * - **Color Energy Flow**: RGB color overlays with blend modes during peak transformation
 * - **Synchronized Timing**: All layers timed relative to parent for smooth morphing
 * - **Customizable Impact**: Adjustable intensity, durations, and color schemes
 *
 * Use cases:
 * - Creating dramatic word transitions with liquid effects
 * - Building morphing text animations for titles
 * - Adding energy transformation visuals to text reveals
 * - Creating fluid, organic word metamorphosis effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  outgoingWord: z.string().describe('The word that liquifies and flows apart'),
  middleWord: z.string().describe('The word that assembles from flowing particles'),
  incomingWord: z.string().describe('The word that forms after the transformation'),
  fontSize: z.string().default('72px').describe('Font size for all text layers (e.g., "72px", "5vw")'),
  fontFamily: z.string().default('Inter').describe('Font family for text rendering'),
  transitionDuration: z.number().default(3.0).describe('Total duration of the morphing effect in seconds'),
  outgoingDuration: z.number().default(1.2).describe('Duration for outgoing word to dissolve (Phase 1)'),
  middleDuration: z.number().default(1.2).describe('Duration for middle word to assemble (Phase 2)'),
  incomingDuration: z.number().default(1.2).describe('Duration for incoming word to form (Phase 3)'),
  impactMultiplier: z.number().default(1.0).describe('Intensity multiplier for all effects (0.5 = subtle, 2.0 = intense)'),
  colorScheme: z.enum(['rgb', 'cmyk', 'neon', 'fire', 'ice']).default('rgb').describe('Color scheme for energy transformation overlays'),
  backgroundColor: z.string().default('#0a0a0a').describe('Background color for the composition'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingWord,
    middleWord,
    incomingWord,
    fontSize,
    fontFamily,
    transitionDuration,
    outgoingDuration,
    middleDuration,
    incomingDuration,
    impactMultiplier,
    colorScheme,
    backgroundColor,
  } = params;

  // Calculate phase timing (all relative to root container)
  const outgoingPhaseStart = 0;
  const outgoingPhaseEnd = outgoingDuration;
  
  const middlePhaseStart = transitionDuration * 0.3; // Start at 30%
  const middlePhaseEnd = middlePhaseStart + middleDuration;
  
  const incomingPhaseStart = transitionDuration * 0.6; // Start at 60%
  const incomingPhaseEnd = incomingPhaseStart + incomingDuration;

  // Color overlay schemes
  const getColorOverlays = (scheme: string) => {
    switch (scheme) {
      case 'cmyk':
        return ['#00FFFF', '#FF00FF', '#FFFF00'];
      case 'neon':
        return ['#FF006E', '#00FFFF', '#39FF14'];
      case 'fire':
        return ['#FF4500', '#FFD700', '#FF0000'];
      case 'ice':
        return ['#00CED1', '#E0FFFF', '#4682B4'];
      case 'rgb':
      default:
        return ['#FF00FF', '#00FFFF', '#FFFF00'];
    }
  };

  const overlayColors = getColorOverlays(colorScheme);

  // Create outgoing word layer (Phase 1: Dissolve)
  const outgoingTextLayer: RenderableComponentData = {
    id: 'outgoing-text-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: outgoingWord,
      style: {
        fontSize: fontSize,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingPhaseEnd,
      },
    },
    effects: [
      // Fade out + scale down + blur (liquify effect)
      {
        id: 'outgoing-dissolve',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingPhaseStart,
          duration: outgoingDuration,
          mode: 'provider',
          targetIds: ['outgoing-text-layer'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8 * impactMultiplier, prog: 1 },
            { key: 'blur', val: '0px', prog: 0 },
            { key: 'blur', val: `${15 * impactMultiplier}px`, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create middle word layer (Phase 2: Assemble from particles)
  const middleTextLayer: RenderableComponentData = {
    id: 'middle-text-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: middleWord,
      style: {
        fontSize: fontSize,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: middlePhaseStart,
        duration: middleDuration,
      },
    },
    effects: [
      // Fade in + scale up + blur clear (coalesce effect)
      {
        id: 'middle-assemble',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to middle layer start
          duration: middleDuration,
          mode: 'provider',
          targetIds: ['middle-text-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.5 * impactMultiplier, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'blur', val: `${20 * impactMultiplier}px`, prog: 0 },
            { key: 'blur', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create incoming word layer (Phase 3: Form)
  const incomingTextLayer: RenderableComponentData = {
    id: 'incoming-text-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: incomingWord,
      style: {
        fontSize: fontSize,
        fontWeight: 'bold',
        color: '#ffffff',
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: incomingPhaseStart,
        duration: incomingDuration,
      },
    },
    effects: [
      // Fade in + scale normalize + slight blur clear
      {
        id: 'incoming-form',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0, // Relative to incoming layer start
          duration: incomingDuration,
          mode: 'provider',
          targetIds: ['incoming-text-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'scale', val: 0.9 * impactMultiplier, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'blur', val: `${8 * impactMultiplier}px`, prog: 0 },
            { key: 'blur', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // Create color overlay layers (peak morph phase 30-70%)
  const colorOverlayPeakStart = transitionDuration * 0.3;
  const colorOverlayPeakDuration = transitionDuration * 0.4; // 30% to 70%

  const createColorOverlay = (color: string, index: number): RenderableComponentData => {
    const staggerDelay = 0.1 * index; // Stagger overlay animations
    return {
      id: `color-overlay-${index + 1}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: color,
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: colorOverlayPeakStart + staggerDelay,
          duration: colorOverlayPeakDuration - staggerDelay,
        },
      },
      effects: [
        {
          id: `color-overlay-${index + 1}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: colorOverlayPeakDuration - staggerDelay,
            mode: 'provider',
            targetIds: [`color-overlay-${index + 1}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.3 * impactMultiplier, prog: 0.5 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };
  };

  const colorOverlays = overlayColors.map((color, index) => createColorOverlay(color, index));

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'metamorphosis-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      outgoingTextLayer,
      middleTextLayer,
      incomingTextLayer,
      ...colorOverlays,
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

const presetMetadata: PresetMetadata = {
  id: 'metamorphosis-text-morph',
  title: 'Metamorphosis Text Morph',
  description: 'A word transformation preset where text appears to liquify and flow apart like melting, then reforms into new words through a morphing effect. Uses opacity crossfades between multiple text layers with synchronized scale, blur, and transform effects to simulate liquid metamorphosis. Color overlays with blend modes create energy transformation visuals during the morph peak.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'morph', 'transformation', 'liquify', 'metamorphosis', 'transition', 'energy', 'color-flow'],
  defaultInputParams: {
    outgoingWord: 'TRANSFORM',
    middleWord: 'MORPH',
    incomingWord: 'EVOLVE',
    fontSize: '72px',
    fontFamily: 'Inter',
    transitionDuration: 3.0,
    outgoingDuration: 1.2,
    middleDuration: 1.2,
    incomingDuration: 1.2,
    impactMultiplier: 1.0,
    colorScheme: 'rgb',
    backgroundColor: '#0a0a0a',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const metamorphosisTextMorphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
