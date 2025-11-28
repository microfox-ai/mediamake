/**
 * Caustic Water Light Text Effect Preset
 *
 * This preset creates a mesmerizing caustic light effect that simulates sunlight filtering through water
 * onto text at the bottom of a pool. Features include:
 * - Dancing caustic light patterns created with moving radial gradients and mix-blend-mode overlay
 * - Subtle text distortion via scaleX and skewY transforms that simulate light refraction
 * - Blue-green water tinting with gradient backgrounds that create depth perception
 * - Random sparkle points that appear and disappear like light catching water droplets
 * - Performance-optimized with 3 caustic layers and will-change-transform hints
 *
 * Use cases:
 * - Creating underwater text effects for aquatic-themed videos
 * - Simulating pool or ocean light effects on titles
 * - Adding dreamy, fluid motion to text overlays
 * - Building summer/beach/tropical video intros
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('The text to display with caustic water light effect'),
  
  fontSize: z
    .union([z.string(), z.number()])
    .default('72px')
    .describe('Font size for the text (e.g., "72px" or 72)'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (default: white)'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (Google Font name)'),
  
  duration: z
    .number()
    .default(10)
    .describe('Duration in seconds for the effect'),
  
  causticIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for caustic light patterns (0.1-2, default: 1)'),
  
  distortionIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for text distortion effects (0.1-2, default: 1)'),
  
  sparkleCount: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Number of sparkle points to generate (0-10, default: 5)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    fontFamily,
    duration,
    causticIntensity,
    distortionIntensity,
    sparkleCount,
  } = params;

  // Helper: Convert fontSize to number
  const getFontSizeNumber = (size: string | number): number => {
    if (typeof size === 'number') return size;
    const match = size.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 72;
  };

  const fontSizeNum = getFontSizeNumber(fontSize);
  const fontSizeStr = typeof fontSize === 'string' ? fontSize : `${fontSize}px`;

  // Helper: Generate random sparkle positions
  const generateSparklePositions = (count: number) => {
    const positions = [];
    for (let i = 0; i < count; i++) {
      positions.push({
        top: `${20 + Math.random() * 60}%`,
        left: `${15 + Math.random() * 70}%`,
        size: Math.floor(3 + Math.random() * 3),
        delay: Math.random() * duration * 0.3,
      });
    }
    return positions;
  };

  const sparklePositions = generateSparklePositions(sparkleCount);

  // ============================================================================
  // MAIN TEXT COMPONENT
  // ============================================================================

  const mainTextId = 'caustic-main-text';
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSizeStr,
        fontWeight: 'bold',
        color: textColor,
        textShadow:
          '0 0 20px rgba(100, 200, 255, 0.3), 0 0 40px rgba(100, 200, 255, 0.2), 0 0 60px rgba(100, 200, 255, 0.1)',
        willChange: 'transform',
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
      // Subtle distortion effect 1: scaleX oscillation
      {
        id: 'text-distortion-scaleX',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [mainTextId],
          ranges: [
            { key: 'scaleX', val: 0.98 * distortionIntensity, prog: 0 },
            { key: 'scaleX', val: 1.02 * distortionIntensity, prog: 0.25 },
            { key: 'scaleX', val: 0.99 * distortionIntensity, prog: 0.5 },
            { key: 'scaleX', val: 1.01 * distortionIntensity, prog: 0.75 },
            { key: 'scaleX', val: 0.98 * distortionIntensity, prog: 1 },
          ],
        },
      },
      // Subtle distortion effect 2: skewY oscillation
      {
        id: 'text-distortion-skewY',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [mainTextId],
          ranges: [
            { key: 'skewY', val: '-2deg', prog: 0 },
            { key: 'skewY', val: '2deg', prog: 0.33 },
            { key: 'skewY', val: '-1deg', prog: 0.66 },
            { key: 'skewY', val: '2deg', prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // TEXT LAYER CONTAINER
  // ============================================================================

  const textLayer: RenderableComponentData = {
    id: 'text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center z-10',
        style: {
          willChange: 'transform',
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

  // ============================================================================
  // CAUSTIC LIGHT LAYERS
  // ============================================================================

  const causticLayer1Id = 'caustic-layer-1';
  const causticLayer1: RenderableComponentData = {
    id: causticLayer1Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute inset-0 z-20 pointer-events-none',
      style: {
        mixBlendMode: 'overlay',
        background:
          'radial-gradient(ellipse 100px 80px at 30% 40%, rgba(255,255,255,0.4) 0%, transparent 70%)',
        willChange: 'transform',
        opacity: 0.7 * causticIntensity,
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
        id: 'caustic1-movement',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [causticLayer1Id],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '50px', prog: 0.5 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-30px', prog: 0.5 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  const causticLayer2Id = 'caustic-layer-2';
  const causticLayer2: RenderableComponentData = {
    id: causticLayer2Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute inset-0 z-20 pointer-events-none',
      style: {
        mixBlendMode: 'overlay',
        background:
          'radial-gradient(ellipse 120px 60px at 70% 60%, rgba(200,255,255,0.5) 0%, transparent 60%)',
        willChange: 'transform',
        opacity: 0.6 * causticIntensity,
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
        id: 'caustic2-movement',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [causticLayer2Id],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '-40px', prog: 0.4 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '40px', prog: 0.6 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  const causticLayer3Id = 'caustic-layer-3';
  const causticLayer3: RenderableComponentData = {
    id: causticLayer3Id,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute inset-0 z-20 pointer-events-none',
      style: {
        mixBlendMode: 'soft-light',
        background:
          'radial-gradient(ellipse 80px 100px at 50% 30%, rgba(150,220,255,0.45) 0%, transparent 65%)',
        willChange: 'transform',
        opacity: 0.5 * causticIntensity,
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
        id: 'caustic3-movement',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [causticLayer3Id],
          ranges: [
            { key: 'translateX', val: '0px', prog: 0 },
            { key: 'translateX', val: '30px', prog: 0.3 },
            { key: 'translateX', val: '-20px', prog: 0.7 },
            { key: 'translateX', val: '0px', prog: 1 },
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-20px', prog: 0.5 },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // SPARKLE ELEMENTS
  // ============================================================================

  const sparkleChildren: RenderableComponentData[] = sparklePositions.map(
    (pos, index) => {
      const sparkleId = `sparkle-${index}`;
      return {
        id: sparkleId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="width: 100%; height: 100%;"></div>',
          className: 'absolute rounded-full',
          style: {
            width: `${pos.size}px`,
            height: `${pos.size}px`,
            background: `radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(200,255,255,0.8) 40%, transparent 70%)`,
            top: pos.top,
            left: pos.left,
            boxShadow: '0 0 6px 2px rgba(255,255,255,0.8)',
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
            id: `sparkle-${index}-pulse`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: pos.delay,
              duration: duration - pos.delay,
              mode: 'provider',
              targetIds: [sparkleId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.1 },
                { key: 'opacity', val: 0, prog: 0.2 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'opacity', val: 0, prog: 0.4 },
                { key: 'opacity', val: 1, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 0.6 },
                { key: 'opacity', val: 1, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 0.8 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  const sparkleContainer: RenderableComponentData = {
    id: 'sparkle-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-30 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: sparkleChildren,
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'caustic-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'relative bg-gradient-to-b from-cyan-50/20 to-blue-100/30 w-full h-full flex items-center justify-center overflow-hidden',
        style: {
          filter: 'brightness(0.9) contrast(1.1) saturate(1.2)',
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
      textLayer,
      causticLayer1,
      causticLayer2,
      causticLayer3,
      sparkleContainer,
    ],
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
  id: 'caustic-water-light-text',
  title: 'Caustic Water Light Text Effect',
  description:
    'A mesmerizing text effect that simulates sunlight filtering through water onto a pool bottom. Features dancing caustic light patterns with overlapping radial gradients using mix-blend-mode overlay, subtle text distortion via scaleX and skewY transforms, blue-green water tinting with depth variation, and random sparkle points that appear and disappear like light catching water droplets. Uses 3 caustic layers for performance while maintaining visual richness.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effect',
    'caustic',
    'water',
    'light',
    'pool',
    'underwater',
    'shimmer',
    'distortion',
    'sparkle',
    'ocean',
    'aquatic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'OCEAN VIBES',
    fontSize: '72px',
    textColor: '#FFFFFF',
    fontFamily: 'Inter',
    duration: 10,
    causticIntensity: 1,
    distortionIntensity: 1,
    sparkleCount: 5,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const causticWaterLightTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
