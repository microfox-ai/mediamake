/**
 * Retrofuturistic Wireframe Typography Preset
 * 
 * A 90s-inspired wireframe typography effect featuring text that constructs itself from animated
 * wireframe outlines before filling with pink/cyan gradients. Words are positioned on depth layers
 * within a perspective grid, with 3D rotation animations revealing their construction lines and vertices.
 * The gradient pulses through the wireframes like data flowing through circuits, with grid distortion
 * effects that warp and bend the entire text field.
 * 
 * Features:
 * - Perspective 3D space with depth layers
 * - Wireframe outline construction (stroke-dasharray animation)
 * - Stroke-to-fill transition
 * - 3D rotation animations revealing wireframe nature
 * - Pink/cyan gradient pulse through wireframes
 * - Grid distortion effects
 * - Perspective grid background
 * 
 * Use cases:
 * - Retro tech/cyberpunk aesthetic videos
 * - 90s nostalgia content
 * - Early 3D modeling software tribute
 * - Vector graphics showcase
 * - Vaporwave/synthwave visuals
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  word1: z.string().default('RETRO').describe('First word (front layer)'),
  word2: z.string().default('FUTURE').describe('Second word (middle layer)'),
  word3: z.string().default('WAVE').describe('Third word (back layer)'),
  duration: z.number().default(10).describe('Total animation duration in seconds'),
  wireframeColor1: z.string().default('#00ffff').describe('Wireframe color for word 1 (cyan)'),
  wireframeColor2: z.string().default('#ff0080').describe('Wireframe color for word 2 (pink)'),
  wireframeColor3: z.string().default('#00ffff').describe('Wireframe color for word 3 (cyan)'),
  gradient1: z.string().default('linear-gradient(135deg, #ff0080 0%, #00ffff 50%, #ff0080 100%)').describe('Gradient for word 1'),
  gradient2: z.string().default('linear-gradient(135deg, #00ffff 0%, #ff0080 50%, #00ffff 100%)').describe('Gradient for word 2'),
  gradient3: z.string().default('linear-gradient(135deg, #ff0080 0%, #00ffff 100%)').describe('Gradient for word 3'),
  fontFamily: z.string().default('Orbitron').describe('Font family (default: Orbitron)'),
  backgroundColor: z.string().default('#0a0a0f').describe('Background color'),
  constructionDuration: z.number().default(2).describe('Wireframe construction animation duration in seconds'),
  fillDelay: z.number().default(1.5).describe('Delay before fill transition starts in seconds'),
  fillDuration: z.number().default(1.5).describe('Fill transition duration in seconds'),
  rotationIntensity: z.number().default(1).describe('3D rotation intensity multiplier (0.5-2.0)'),
  gridOpacity: z.number().default(0.6).describe('Perspective grid opacity (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    word1,
    word2,
    word3,
    duration,
    wireframeColor1,
    wireframeColor2,
    wireframeColor3,
    gradient1,
    gradient2,
    gradient3,
    fontFamily,
    backgroundColor,
    constructionDuration,
    fillDelay,
    fillDuration,
    rotationIntensity,
    gridOpacity,
  } = params;

  // Helper function to create word layer with wireframe and fill
  const createWordLayer = (
    word: string,
    layerId: string,
    fontSize: number,
    translateZ: number,
    wireframeColor: string,
    gradient: string,
    rotationPhase: number,
  ): RenderableComponentData => {
    const outlineId = `${layerId}-outline`;
    const fillId = `${layerId}-fill`;

    // Wireframe outline text
    const outlineText: RenderableComponentData = {
      id: outlineId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          color: 'transparent',
          WebkitTextStroke: `2px ${wireframeColor}`,
          textStroke: `2px ${wireframeColor}`,
        },
        font: {
          family: fontFamily,
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        // Wireframe construction (opacity fade-in with slight delay per layer)
        {
          id: `${outlineId}-construction`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: constructionDuration,
            mode: 'provider',
            targetIds: [outlineId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
        // Stroke fade out during fill transition
        {
          id: `${outlineId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: fillDelay,
            duration: fillDuration,
            mode: 'provider',
            targetIds: [outlineId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    };

    // Fill text with gradient
    const fillText: RenderableComponentData = {
      id: fillId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: 'bold',
          position: 'absolute',
          top: 0,
          left: 0,
        },
        gradient: gradient,
        font: {
          family: fontFamily,
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        // Fill fade in
        {
          id: `${fillId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: fillDelay,
            duration: fillDuration,
            mode: 'provider',
            targetIds: [fillId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };

    // Word layer container with 3D transforms
    const wordLayer: RenderableComponentData = {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transform: `translateZ(${translateZ}px)`,
            transformStyle: 'preserve-3d',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [outlineText, fillText],
      effects: [
        // 3D rotation animation (continuous throughout)
        {
          id: `${layerId}-rotate-x`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: constructionDuration,
            duration: duration - constructionDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 15 * rotationIntensity * rotationPhase, prog: 0.25 },
              { key: 'rotateX', val: 0, prog: 0.5 },
              { key: 'rotateX', val: -15 * rotationIntensity * rotationPhase, prog: 0.75 },
              { key: 'rotateX', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `${layerId}-rotate-y`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: constructionDuration,
            duration: duration - constructionDuration,
            mode: 'provider',
            targetIds: [layerId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -20 * rotationIntensity * rotationPhase, prog: 0.33 },
              { key: 'rotateY', val: 0, prog: 0.5 },
              { key: 'rotateY', val: 20 * rotationIntensity * rotationPhase, prog: 0.83 },
              { key: 'rotateY', val: 0, prog: 1 },
            ],
          },
        },
      ],
    };

    return wordLayer;
  };

  // Create perspective grid lines
  const horizontalGrid: RenderableComponentData = {
    id: 'horizontal-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `repeating-linear-gradient(0deg, transparent, transparent 49px, rgba(0, 255, 255, ${gridOpacity * 0.3}) 49px, rgba(0, 255, 255, ${gridOpacity * 0.3}) 50px)`,
          opacity: gridOpacity,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  const verticalGrid: RenderableComponentData = {
    id: 'vertical-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          background: `repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255, 0, 128, ${gridOpacity * 0.3}) 49px, rgba(255, 0, 128, ${gridOpacity * 0.3}) 50px)`,
          opacity: gridOpacity,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
    effects: [
      // Grid distortion animation
      {
        id: 'grid-distortion',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: constructionDuration,
          duration: duration - constructionDuration,
          mode: 'provider',
          targetIds: ['vertical-grid'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.05, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const perspectiveGridContainer: RenderableComponentData = {
    id: 'perspective-grid-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
          transform: 'rotateX(60deg) translateZ(-100px)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [horizontalGrid, verticalGrid],
  };

  // Create word layers
  const wordLayer1 = createWordLayer(word1, 'word-layer-1', 120, 50, wireframeColor1, gradient1, 1);
  const wordLayer2 = createWordLayer(word2, 'word-layer-2', 100, 0, wireframeColor2, gradient2, 0.8);
  const wordLayer3 = createWordLayer(word3, 'word-layer-3', 80, -50, wireframeColor3, gradient3, 1.2);

  const textLayersContainer: RenderableComponentData = {
    id: 'text-layers-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [wordLayer1, wordLayer2, wordLayer3],
  };

  // Gradient pulse overlay
  const gradientPulseOverlay: RenderableComponentData = {
    id: 'gradient-pulse-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 255, 255, 0.1) 25%, rgba(255, 0, 128, 0.1) 75%, transparent 100%)',
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
    effects: [
      // Gradient pulse animation (translate across screen)
      {
        id: 'pulse-animation',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: fillDelay,
          duration: duration - fillDelay,
          mode: 'provider',
          targetIds: ['gradient-pulse-overlay'],
          ranges: [
            { key: 'translateX', val: '-100%', prog: 0 },
            { key: 'translateX', val: '100%', prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.25 },
            { key: 'opacity', val: 0.8, prog: 0.75 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'retrofuturistic-wireframe-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '2000px',
          transformStyle: 'preserve-3d',
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
      perspectiveGridContainer,
      textLayersContainer,
      gradientPulseOverlay,
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
  id: 'retrofuturistic-wireframe-typography',
  title: 'Retrofuturistic Wireframe Typography',
  description: 'A 90s-inspired wireframe typography preset featuring text that constructs from animated outlines before filling with pink/cyan gradients. Words are positioned on depth layers within a perspective grid, with 3D rotation animations revealing construction lines. Includes pulsing gradient overlay and grid distortion effects for an authentic early 3D modeling aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'wireframe', 'retrofuturistic', '90s', 'vaporwave', 'synthwave', 'cyberpunk', '3d', 'perspective', 'gradient'],
  defaultInputParams: {
    word1: 'RETRO',
    word2: 'FUTURE',
    word3: 'WAVE',
    duration: 10,
    wireframeColor1: '#00ffff',
    wireframeColor2: '#ff0080',
    wireframeColor3: '#00ffff',
    gradient1: 'linear-gradient(135deg, #ff0080 0%, #00ffff 50%, #ff0080 100%)',
    gradient2: 'linear-gradient(135deg, #00ffff 0%, #ff0080 50%, #00ffff 100%)',
    gradient3: 'linear-gradient(135deg, #ff0080 0%, #00ffff 100%)',
    fontFamily: 'Orbitron',
    backgroundColor: '#0a0a0f',
    constructionDuration: 2,
    fillDelay: 1.5,
    fillDuration: 1.5,
    rotationIntensity: 1,
    gridOpacity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retrofuturisticWireframeTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
