/**
 * Deep Ocean Pressure Text Animation Preset
 *
 * This preset creates an underwater pressure text animation where letters compress and expand
 * as if experiencing changing water pressure at different depths. The animation visualizes text
 * like a submarine depth gauge - text compresses (gets shorter and wider) when 'diving deep'
 * and expands (taller and thinner) when 'surfacing'.
 *
 * Features:
 * - **Pressure Compression Effects**: ScaleY (1 to 0.7) with inverse scaleX (1 to 1.4) for pressure compression
 * - **Letter Spacing Animation**: '0em to -0.05em' during compression phases
 * - **Depth Filter Effects**: Brightness, contrast, sepia, and hue-rotate filters that simulate deep water darkness
 * - **Bubble Particles**: Subtle bubble elements that occasionally escape from compressed letters
 * - **Blue Shift**: Reduced contrast and blue color shift during deep phases
 * - **Smooth Pressure Transitions**: Cubic-bezier easing for realistic pressure changes
 *
 * Use cases:
 * - Creating underwater-themed text animations
 * - Simulating submarine depth pressure effects
 * - Building ocean exploration content
 * - Adding aquatic theme animations to videos
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to animate with pressure effects'),
  duration: z
    .number()
    .min(3)
    .default(6)
    .describe(
      'Duration of the animation in seconds (minimum 3s for realistic pressure cycles)',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for text (e.g., Inter, Roboto)'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (e.g., #ffffff, rgb(255,255,255))'),
  pressureCycles: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Number of pressure compression/expansion cycles'),
  compressionIntensity: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.7)
    .describe(
      'Minimum scaleY during compression (0.5 = 50% height, 0.7 = 70% height)',
    ),
  expansionIntensity: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.4)
    .describe(
      'Maximum scaleX during compression (1.4 = 140% width, inverse of scaleY)',
    ),
  darknessLevel: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.7)
    .describe('Minimum brightness during deep phases (0.5 = 50% brightness)'),
  bubbleCount: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Number of bubble particles (0 = disabled)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    textColor,
    pressureCycles,
    compressionIntensity,
    expansionIntensity,
    darknessLevel,
    bubbleCount,
  } = params;

  // Calculate cycle duration
  const cycleDuration = duration / pressureCycles;
  const halfCycle = cycleDuration / 2;

  // Helper function to create pressure cycle effects for text
  const createPressureCycleEffects = (targetId: string) => {
    const effects = [];
    
    for (let i = 0; i < pressureCycles; i++) {
      const cycleStart = i * cycleDuration;
      
      // Compression phase (diving deep)
      effects.push({
        id: `pressure-compress-${i}-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: cycleStart,
          duration: halfCycle,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: compressionIntensity, prog: 1 },
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: expansionIntensity, prog: 1 },
            { key: 'letterSpacing', val: '0em', prog: 0 },
            { key: 'letterSpacing', val: '-0.05em', prog: 1 },
          ],
        },
      });

      // Expansion phase (surfacing)
      effects.push({
        id: `pressure-expand-${i}-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: cycleStart + halfCycle,
          duration: halfCycle,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'scaleY', val: compressionIntensity, prog: 0 },
            { key: 'scaleY', val: 1, prog: 1 },
            { key: 'scaleX', val: expansionIntensity, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'letterSpacing', val: '-0.05em', prog: 0 },
            { key: 'letterSpacing', val: '0em', prog: 1 },
          ],
        },
      });
    }
    
    return effects;
  };

  // Helper function to create depth filter effects
  const createDepthFilterEffects = (targetId: string) => {
    const effects = [];
    
    for (let i = 0; i < pressureCycles; i++) {
      const cycleStart = i * cycleDuration;
      
      // Darkening during compression (deep phase)
      effects.push({
        id: `depth-darken-${i}-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: cycleStart,
          duration: halfCycle,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            {
              key: 'filter',
              val: 'brightness(1) contrast(1) sepia(0) hue-rotate(0deg)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `brightness(${darknessLevel}) contrast(0.8) sepia(0.2) hue-rotate(-10deg)`,
              prog: 1,
            },
          ],
        },
      });

      // Lightening during expansion (surfacing)
      effects.push({
        id: `depth-lighten-${i}-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.45, 0.05, 0.55, 0.95)',
          start: cycleStart + halfCycle,
          duration: halfCycle,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            {
              key: 'filter',
              val: `brightness(${darknessLevel}) contrast(0.8) sepia(0.2) hue-rotate(-10deg)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: 'brightness(1) contrast(1) sepia(0) hue-rotate(0deg)',
              prog: 1,
            },
          ],
        },
      });
    }
    
    return effects;
  };

  // Helper function to create bubble effects
  const createBubbleEffects = (bubbleId: string, delayFactor: number) => {
    const effects = [];
    
    for (let i = 0; i < pressureCycles; i++) {
      const cycleStart = i * cycleDuration + delayFactor * 0.2;
      
      // Bubble rises during compression phase
      effects.push({
        id: `bubble-rise-${i}-${bubbleId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: cycleStart,
          duration: halfCycle * 1.5,
          mode: 'provider',
          targetIds: [bubbleId],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '-100px', prog: 1 },
            { key: 'opacity', val: 0.3, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }
    
    return effects;
  };

  // Create bubble components
  const bubbleComponents: RenderableComponentData[] = [];
  const bubblePositions = [20, 35, 55, 70, 85];
  
  for (let i = 0; i < Math.min(bubbleCount, bubblePositions.length); i++) {
    const bubbleId = `bubble-${i}`;
    const leftPosition = bubblePositions[i];
    const bubbleSize = 6 + Math.random() * 6;
    
    bubbleComponents.push({
      id: bubbleId,
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        html: `<div style="width: ${bubbleSize}px; height: ${bubbleSize}px; border-radius: 50%; background: rgba(255, 255, 255, 0.3); position: absolute; bottom: 50%; left: ${leftPosition}%;"></div>`,
        className: 'absolute',
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: createBubbleEffects(bubbleId, i),
    } as RenderableComponentData);
  }

  // Create text component
  const textId = 'ocean-pressure-text';
  const textComponent: RenderableComponentData = {
    id: textId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: 'bold',
        color: textColor,
        textAlign: 'center',
        letterSpacing: '0em',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      ...createPressureCycleEffects(textId),
      ...createDepthFilterEffects(textId),
    ],
  };

  // Root container with ocean gradient background
  const rootContainer: RenderableComponentData = {
    id: 'ocean-pressure-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          background:
            'linear-gradient(180deg, #001a33 0%, #000d1a 50%, #000000 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      // Bubble container (behind text)
      {
        id: 'bubble-container',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0 overflow-hidden pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        childrenData: bubbleComponents,
      } as RenderableComponentData,
      // Text component (on top)
      textComponent,
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
  id: 'ocean-pressure-text',
  title: 'Deep Ocean Pressure Text Animation',
  description:
    'Underwater pressure text animation where letters compress and expand simulating changing water pressure at different depths. Features submarine depth gauge mechanics with text compression (shorter/wider) when diving deep and expansion (taller/thinner) when surfacing. Includes darkening effect during compression, subtle escaping bubble particles, letter-spacing bunching under pressure, blue shift and reduced contrast during deep phases.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'ocean',
    'pressure',
    'underwater',
    'submarine',
    'depth',
    'compression',
    'bubbles',
    'aquatic',
    'kinetic',
  ],
  defaultInputParams: {
    text: 'DEEP OCEAN',
    duration: 6,
    fontSize: 72,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    pressureCycles: 2,
    compressionIntensity: 0.7,
    expansionIntensity: 1.4,
    darknessLevel: 0.7,
    bubbleCount: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const oceanPressureTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
