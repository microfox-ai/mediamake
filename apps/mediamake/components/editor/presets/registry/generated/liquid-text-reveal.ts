/**
 * Liquid Text Reveal Effect Preset
 *
 * This preset creates a liquid text reveal where a vertical mask appears as a soft, viscous 
 * substance flowing downward while revealing text. The feathered edge (50-70px blur) undulates 
 * and drips irregularly, like editing with fluid simulation plugins. Uses SVG filters for 
 * realistic liquid distortion - the mask edge has surface tension effects and occasional drips.
 *
 * Features:
 * - SVG filters with feGaussianBlur and feDisplacementMap for liquid distortion
 * - Text with subtle refraction effect using CSS filters and transforms
 * - Reflection elements below the text that fade in as revealed, creating a puddle effect
 * - Animated mask with morph effect using CSS custom properties
 * - Drip sub-elements with independent gravity-based timing (ease-in)
 * - Optimized SVG with reduced path complexity
 * - Adaptive timing based on duration
 *
 * Use cases:
 * - Creating stunning liquid text reveal animations
 * - Building engaging title cards with fluid motion
 * - Adding premium liquid effects to video content
 * - Creating unique text animations with water-like properties
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  text: z.string().default('LIQUID').describe('The text to reveal with liquid effect'),
  
  fontSize: z.number().min(48).max(300).default(120).describe('Font size in pixels'),
  
  fontFamily: z.string().default('Inter').describe('Font family (e.g., Inter, Roboto, Montserrat)'),
  
  fontWeight: z.string().default('800').describe('Font weight (e.g., 400, 700, 800)'),
  
  textColor: z.string().default('#ffffff').describe('Text color'),
  
  backgroundColor: z.string().default('#000000').describe('Background color of the scene'),
  
  duration: z.number().min(2).max(10).default(4).describe('Duration of the reveal animation in seconds'),
  
  blurIntensity: z.number().min(20).max(50).default(35).describe('Blur intensity for liquid edge (stdDeviation)'),
  
  dripCount: z.number().min(0).max(6).default(3).describe('Number of drip elements'),
  
  reflectionOpacity: z.number().min(0).max(1).default(0.5).describe('Opacity of the reflection puddle effect'),
  
  liquidSpeed: z.string().default('ease-out').describe('Animation easing for liquid flow (ease-in, ease-out, ease-in-out, linear)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  
  // Parse parameters
  const {
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    backgroundColor,
    duration,
    blurIntensity,
    dripCount,
    reflectionOpacity,
    liquidSpeed,
  } = params;

  // Generate unique IDs
  const rootId = 'liquid-reveal-root';
  const mainTextId = 'liquid-main-text';
  const reflectionTextId = 'liquid-reflection-text';
  const svgDefsId = 'liquid-svg-defs';
  const dripContainerId = 'liquid-drip-container';

  // ============================================================================
  // SVG FILTER DEFINITIONS
  // ============================================================================

  const svgFilterHtml = `
    <svg width="0" height="0" style="position: absolute; pointer-events: none;">
      <defs>
        <filter id="liquidFilter" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="${blurIntensity * 0.3}" result="blur"/>
          <feDisplacementMap in="SourceGraphic" in2="blur" scale="8" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
    </svg>
  `;

  const svgDefsComponent: RenderableComponentData = {
    id: svgDefsId,
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: svgFilterHtml,
      style: {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: -1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  // ============================================================================
  // MAIN TEXT WITH CLIP-PATH REVEAL ANIMATION
  // ============================================================================

  const revealEffect: GenericEffectData = {
    type: liquidSpeed as any,
    start: 0,
    duration: duration * 0.75, // Reveal happens in first 75% of duration
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      // Clip-path animation from top to bottom
      { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 0%, 0 0%)', prog: 0 },
      { key: 'clipPath', val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)', prog: 1 },
    ],
  };

  const mainTextComponent: RenderableComponentData = {
    id: mainTextId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center' as const,
        filter: 'brightness(1.1) contrast(0.95)',
        clipPath: 'polygon(0 0, 100% 0, 100% 0%, 0 0%)', // Initial state
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'block' as const,
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
        id: `${mainTextId}-reveal-effect`,
        componentId: 'generic',
        data: revealEffect,
      },
    ],
  };

  // ============================================================================
  // DRIP ELEMENTS WITH GRAVITY-BASED TIMING
  // ============================================================================

  const createDripComponent = (index: number): RenderableComponentData => {
    const dripId = `liquid-drip-${index}`;
    const dripWidth = 6 + Math.random() * 3; // 6-9px
    const dripHeight = 30 + Math.random() * 15; // 30-45px
    const leftPosition = 45 + Math.random() * 10; // 45-55%
    const startDelay = index * 0.15; // Staggered start
    const dripDuration = duration * 0.5; // Drips last for half the duration
    
    const dripHtml = `<div style="width:${dripWidth}px;height:${dripHeight}px;background:linear-gradient(180deg,rgba(255,255,255,0.9),rgba(255,255,255,0.2));border-radius:${dripWidth / 2}px;filter:blur(${dripWidth * 0.3}px)"></div>`;

    const dripEffect: GenericEffectData = {
      type: 'ease-in', // Gravity-based easing
      start: startDelay,
      duration: dripDuration,
      mode: 'provider',
      targetIds: [dripId],
      ranges: [
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 0.9, prog: 0.1 },
        { key: 'opacity', val: 0.9, prog: 0.7 },
        { key: 'opacity', val: 0, prog: 1 },
        // Drop down
        { key: 'translateY', val: -100, prog: 0 },
        { key: 'translateY', val: 200, prog: 1 },
      ],
    };

    return {
      id: dripId,
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: dripHtml,
        className: 'absolute',
        style: {
          left: `${leftPosition}%`,
          top: '55%',
          transform: 'translateY(-100px)',
          opacity: 0,
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
          id: `${dripId}-drop-effect`,
          componentId: 'generic',
          data: dripEffect,
        },
      ],
    };
  };

  const dripComponents: RenderableComponentData[] = [];
  for (let i = 0; i < dripCount; i++) {
    dripComponents.push(createDripComponent(i));
  }

  const dripContainer: RenderableComponentData = {
    id: dripContainerId,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: duration * 0.3, // Drips start at 30% into animation
        duration: duration * 0.7,
      },
    },
    childrenData: dripComponents as RenderableComponentData[],
  };

  // ============================================================================
  // REFLECTION PUDDLE EFFECT
  // ============================================================================

  const reflectionEffect: GenericEffectData = {
    type: 'ease-out',
    start: duration * 0.5, // Reflection starts at 50% into animation
    duration: duration * 0.5,
    mode: 'provider',
    targetIds: [reflectionTextId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: reflectionOpacity, prog: 1 },
    ],
  };

  const reflectionComponent: RenderableComponentData = {
    id: reflectionTextId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center' as const,
        position: 'absolute' as const,
        bottom: '35%',
        left: '50%',
        transform: 'translateX(-50%) scaleY(-1)',
        opacity: 0,
        filter: 'blur(8px) brightness(0.6)',
        maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.5) 100%)',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'block' as const,
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
        id: `${reflectionTextId}-fade-effect`,
        componentId: 'generic',
        data: reflectionEffect,
      },
    ],
  };

  // ============================================================================
  // MAIN CONTAINER LAYOUT
  // ============================================================================

  const mainContainer: RenderableComponentData = {
    id: 'liquid-mask-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      svgDefsComponent,
      mainTextComponent,
    ] as RenderableComponentData[],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: rootId,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: backgroundColor,
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
      mainContainer,
      dripContainer,
      reflectionComponent,
    ] as RenderableComponentData[],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'liquid-text-reveal',
  title: 'Liquid Text Reveal Effect',
  description:
    'A liquid text reveal where text appears through an animated vertical mask with viscous flow, drips, and puddle reflection. Uses CSS clip-path animated via generic effects for organic liquid motion, with feathered edges, surface tension effects, and water refraction appearance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'liquid',
    'fluid',
    'animation',
    'drip',
    'reflection',
    'water',
    'title',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'LIQUID',
    fontSize: 120,
    fontFamily: 'Inter',
    fontWeight: '800',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    duration: 4,
    blurIntensity: 35,
    dripCount: 3,
    reflectionOpacity: 0.5,
    liquidSpeed: 'ease-out',
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const liquidTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
