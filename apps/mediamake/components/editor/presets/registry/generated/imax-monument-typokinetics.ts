/**
 * IMAX Monument Typokinetics Preset
 *
 * Ultra-slow, massive scale text reveal preset channeling IMAX documentary title aesthetics.
 * Features viewport-breaking oversized canvas, dual-layer ghost/solid text system, lens distortion
 * simulation at edges, and atmospheric haze that clears as monumental text locks into position.
 * 
 * Geological pacing with 8-second reveals creates sense of unprecedented scale and inevitability.
 *
 * Features:
 * - **Viewport-Breaking Layout**: 200vw x 200vh oversized canvas for massive scale
 * - **Dual-Layer Text System**: Ghost layer at 10% opacity + solid main text emerging from within
 * - **Lens Distortion Simulation**: Edge vignette effects simulating wide-angle cinematography
 * - **Atmospheric Haze**: Clears as text locks into position
 * - **Ultra-Slow Motion**: 8-second geological pacing for monumental reveals
 * - **Extreme Text Scaling**: clamp(8rem, 20vw, 30rem) with tight leading
 *
 * Use cases:
 * - IMAX-style documentary titles
 * - Monumental brand reveals
 * - Epic opening sequences
 * - Large-scale typography animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  title: z.string().describe('Title text to display with monumental scale'),
  duration: z.number().default(10).describe('Total duration of the sequence in seconds'),
  
  fontSize: z.string().default('clamp(8rem, 20vw, 30rem)').describe('Responsive font size using clamp for massive scale'),
  fontFamily: z.string().default('Inter').describe('Font family for the title text'),
  fontWeight: z.string().default('900').describe('Font weight (900 = ultra-bold)'),
  textColor: z.string().default('#ffffff').describe('Color of the main title text'),
  letterSpacing: z.string().default('-0.02em').describe('Letter spacing (tight for impact)'),
  lineHeight: z.number().default(0.8).describe('Line height (tight leading for compactness)'),
  
  revealDuration: z.number().default(8).describe('Duration of the main text reveal animation in seconds'),
  
  ghostOpacity: z.number().min(0).max(1).default(0.1).describe('Opacity of the ghost layer (0-1)'),
  ghostBlur: z.string().default('2px').describe('Blur amount for ghost layer'),
  ghostScale: z.number().default(1.05).describe('Scale multiplier for ghost layer'),
  
  hazeOpacityStart: z.number().min(0).max(1).default(0.6).describe('Starting opacity of atmospheric haze'),
  hazeOpacityEnd: z.number().min(0).max(1).default(0).describe('Ending opacity of atmospheric haze'),
  hazeDuration: z.number().default(8).describe('Duration of haze clearance animation in seconds'),
  
  lensBlurAmount: z.string().default('4px').describe('Blur amount for lens distortion edges'),
  lensBlurOpacity: z.number().min(0).max(1).default(0.2).describe('Opacity of lens blur gradient (0-1)'),
  
  initialScale: z.number().default(1.2).describe('Initial scale of main text before reveal'),
  initialTranslateZ: z.number().default(200).describe('Initial translateZ value for depth effect (px)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    title,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    letterSpacing,
    lineHeight,
    revealDuration,
    ghostOpacity,
    ghostBlur,
    ghostScale,
    hazeOpacityStart,
    hazeOpacityEnd,
    hazeDuration,
    lensBlurAmount,
    lensBlurOpacity,
    initialScale,
    initialTranslateZ,
  } = params;

  // --- IDs ---
  const rootContainerId = 'imax-monument-root';
  const atmosphericHazeLayerId = 'atmospheric-haze-layer';
  const hazeGradientTopId = 'haze-gradient-top';
  const hazeGradientBottomId = 'haze-gradient-bottom';
  const ghostTextLayerId = 'ghost-text-layer';
  const ghostTextId = 'ghost-text';
  const mainTextLayerId = 'main-text-layer';
  const mainTextId = 'main-text';
  const lensBlurLayerId = 'lens-blur-layer';
  const lensBlurLeftId = 'lens-blur-left';
  const lensBlurRightId = 'lens-blur-right';

  // --- Ghost Text Data ---
  const ghostTextData: TextAtomData = {
    text: title,
    style: {
      fontSize: fontSize,
      lineHeight: lineHeight.toString(),
      opacity: ghostOpacity,
      filter: `blur(${ghostBlur})`,
      transform: `scale(${ghostScale})`,
      color: textColor,
      textTransform: 'uppercase',
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
    },
    font: {
      family: fontFamily,
      weights: [fontWeight],
    },
  };

  // --- Main Text Data ---
  const mainTextData: TextAtomData = {
    text: title,
    style: {
      fontSize: fontSize,
      lineHeight: lineHeight.toString(),
      color: textColor,
      textTransform: 'uppercase',
      fontWeight: fontWeight,
      letterSpacing: letterSpacing,
    },
    font: {
      family: fontFamily,
      weights: [fontWeight],
    },
  };

  // --- Main Text Reveal Effect ---
  const mainTextRevealEffect: GenericEffectData = {
    type: 'cubic-bezier' as any, // Using custom cubic-bezier
    start: 0,
    duration: revealDuration,
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      { key: 'scale', val: initialScale, prog: 0 },
      { key: 'scale', val: 1, prog: 1 },
      { key: 'translateZ', val: initialTranslateZ, prog: 0 },
      { key: 'translateZ', val: 0, prog: 1 },
    ],
  };

  // --- Haze Top Gradient Fade Effect ---
  const hazeTopFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: hazeDuration,
    mode: 'provider',
    targetIds: [hazeGradientTopId],
    ranges: [
      { key: 'opacity', val: hazeOpacityStart, prog: 0 },
      { key: 'opacity', val: hazeOpacityEnd, prog: 1 },
    ],
  };

  // --- Haze Bottom Gradient Fade Effect ---
  const hazeBottomFadeEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: hazeDuration,
    mode: 'provider',
    targetIds: [hazeGradientBottomId],
    ranges: [
      { key: 'opacity', val: hazeOpacityStart, prog: 0 },
      { key: 'opacity', val: hazeOpacityEnd, prog: 1 },
    ],
  };

  // --- Component Tree ---

  // Lens Blur Left
  const lensBlurLeft: RenderableComponentData = {
    id: lensBlurLeftId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute left-0 top-0 bottom-0 w-1/6 pointer-events-none',
        style: {
          background: `linear-gradient(to right, rgba(0,0,0,${lensBlurOpacity}), transparent)`,
          filter: `blur(${lensBlurAmount})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Lens Blur Right
  const lensBlurRight: RenderableComponentData = {
    id: lensBlurRightId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute right-0 top-0 bottom-0 w-1/6 pointer-events-none',
        style: {
          background: `linear-gradient(to left, rgba(0,0,0,${lensBlurOpacity}), transparent)`,
          filter: `blur(${lensBlurAmount})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Lens Blur Layer
  const lensBlurLayer: RenderableComponentData = {
    id: lensBlurLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 15,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [lensBlurLeft, lensBlurRight],
  };

  // Main Text Atom
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: mainTextData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'main-text-reveal',
        componentId: 'generic',
        data: mainTextRevealEffect,
      },
    ],
  };

  // Main Text Layer
  const mainTextLayer: RenderableComponentData = {
    id: mainTextLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 5,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mainText],
  };

  // Ghost Text Atom
  const ghostText: RenderableComponentData = {
    id: ghostTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: ghostTextData,
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // Ghost Text Layer
  const ghostTextLayer: RenderableComponentData = {
    id: ghostTextLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 1,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [ghostText],
  };

  // Haze Gradient Top
  const hazeGradientTop: RenderableComponentData = {
    id: hazeGradientTopId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/30 to-transparent pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'haze-top-fade',
        componentId: 'generic',
        data: hazeTopFadeEffect,
      },
    ],
  };

  // Haze Gradient Bottom
  const hazeGradientBottom: RenderableComponentData = {
    id: hazeGradientBottomId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/30 to-transparent pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'haze-bottom-fade',
        componentId: 'generic',
        data: hazeBottomFadeEffect,
      },
    ],
  };

  // Atmospheric Haze Layer
  const atmosphericHazeLayer: RenderableComponentData = {
    id: atmosphericHazeLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [hazeGradientTop, hazeGradientBottom],
  };

  // Root Container
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-[200vw] h-[200vh] -translate-x-1/4 -translate-y-1/4 overflow-hidden',
        style: {
          contain: 'content',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      atmosphericHazeLayer,
      ghostTextLayer,
      mainTextLayer,
      lensBlurLayer,
    ],
  };

  // --- Return Output ---
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
  id: 'imaxMonumentTypokinetics',
  title: 'IMAX Monument Typokinetics',
  description:
    'Ultra-slow, massive scale text reveal preset channeling IMAX documentary title aesthetics. Features viewport-breaking oversized canvas, dual-layer ghost/solid text system, lens distortion simulation at edges, and atmospheric haze that clears as monumental text locks into position. Geological pacing with 8-second reveals creates sense of unprecedented scale and inevitability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'imax',
    'documentary',
    'monumental',
    'massive-scale',
    'ultra-slow',
    'geological-pacing',
    'dual-layer',
    'ghost-text',
    'lens-distortion',
    'atmospheric-haze',
    'viewport-breaking',
    'epic',
    'title-reveal',
  ],
  defaultInputParams: {
    title: 'MONUMENT',
    duration: 10,
    fontSize: 'clamp(8rem, 20vw, 30rem)',
    fontFamily: 'Inter',
    fontWeight: '900',
    textColor: '#ffffff',
    letterSpacing: '-0.02em',
    lineHeight: 0.8,
    revealDuration: 8,
    ghostOpacity: 0.1,
    ghostBlur: '2px',
    ghostScale: 1.05,
    hazeOpacityStart: 0.6,
    hazeOpacityEnd: 0,
    hazeDuration: 8,
    lensBlurAmount: '4px',
    lensBlurOpacity: 0.2,
    initialScale: 1.2,
    initialTranslateZ: 200,
  },
  dependencies: {},
};

// --- Export Preset ---

export const imaxMonumentTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: presetParams,
};
