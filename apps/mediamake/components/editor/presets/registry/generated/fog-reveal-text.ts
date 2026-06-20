/**
 * Atmospheric Fog Reveal Text Preset
 *
 * This preset creates an atmospheric text reveal using a soft vertical mask that simulates fog lifting.
 * The mask has variable feathering (20-80px blur) that changes dynamically as it moves, creating an
 * organic, weather-like reveal effect.
 *
 * Features:
 * - **Multiple Layered Gradients**: Three fog layers with different blur and opacity values for depth
 * - **Variable Feathering**: Fog layers use backdrop-filter blur ranging from 20px to 80px
 * - **Dynamic Opacity**: Fog is denser at bottom (more opaque) and transparent at top
 * - **Offset Timing**: Each fog layer animates with staggered start times for organic motion
 * - **Custom Cubic-Bezier**: Variable speed animation using custom easing curves
 * - **Breathing Scale Effect**: Gentle scale animation (0.98 to 1.02) on text
 * - **Subtle Vertical Float**: Text floats vertically with slight movement
 * - **Glass Morphism**: Backdrop-filter blur for depth effect
 * - **Performance Optimized**: Uses CSS contain and will-change sparingly
 *
 * Technical Details:
 * - Root: BaseLayout with contain for performance
 * - Text: TextAtom with combined scale and translateY effects
 * - Fog Layers: 3 BaseLayout overlays with gradient masks and backdrop-filter blur
 * - Animations: Custom cubic-bezier timing for organic fog movement
 *
 * Use Cases:
 * - Atmospheric video intros with weather-like reveals
 * - Cinematic text animations with depth
 * - Post-production style fog compositing effects
 * - Dramatic title sequences with organic motion
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  text: z
    .string()
    .default('Sample Text')
    .describe('Text content to display and reveal through the fog'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Font size in pixels for the text'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the text (CSS color value)'),

  duration: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .describe('Total duration of the fog reveal animation in seconds'),

  // Fog layer configuration
  fogColor: z
    .string()
    .default('rgba(255,255,255,0.8)')
    .describe(
      'Base color of the fog layers (use rgba for transparency control)',
    ),

  fogBlurMin: z
    .number()
    .min(10)
    .max(50)
    .default(20)
    .describe('Minimum blur amount for fog layers in pixels'),

  fogBlurMax: z
    .number()
    .min(40)
    .max(120)
    .default(80)
    .describe('Maximum blur amount for fog layers in pixels'),

  // Text animation configuration
  breathingIntensity: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.02)
    .describe('Intensity of the breathing scale effect (0.02 = 2% scale change)'),

  floatDistance: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .describe('Vertical float distance in pixels'),

  // Fog animation timing
  fogSpeed: z
    .enum(['slow', 'normal', 'fast'])
    .default('normal')
    .describe('Speed of fog lifting animation'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2]; // 'normal' | 'italic'
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  // Parse font configuration
  const fontString = params.font || 'Inter';
  const { fontFamily, fontStyle } = parseFontString(fontString);

  // Calculate fog animation speeds based on preset
  const getFogDurations = () => {
    switch (params.fogSpeed) {
      case 'slow':
        return { layer1: 7, layer2: 7.5, layer3: 8 };
      case 'fast':
        return { layer1: 4, layer2: 4.5, layer3: 5 };
      default:
        return { layer1: 6, layer2: 6.5, layer3: 7 };
    }
  };

  const fogDurations = getFogDurations();

  // Calculate fog layer colors with varying opacity
  const getFogLayerGradient = (opacity1: number, opacity2: number) => {
    const color = params.fogColor;
    return `linear-gradient(to top, ${color.replace(/[\d.]+\)$/g, `${opacity1})`)} 0%, ${color.replace(/[\d.]+\)$/g, `${opacity2})`)} 40%, ${color.replace(/[\d.]+\)$/g, `${opacity2 * 0.5})`)} 70%, transparent 100%)`;
  };

  // ============================================================================
  // TEXT ELEMENT
  // ============================================================================

  const textElementId = 'fog-reveal-text';

  const textElement = {
    id: textElementId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle || 'normal',
        color: params.textColor,
        textAlign: 'center',
        textShadow: '0 4px 20px rgba(0,0,0,0.3)',
        willChange: 'transform',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Breathing scale effect
      {
        id: 'text-breathing-scale',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            { key: 'scale', val: 1 - params.breathingIntensity, prog: 0 },
            { key: 'scale', val: 1 + params.breathingIntensity, prog: 0.5 },
            { key: 'scale', val: 1 - params.breathingIntensity, prog: 1 },
          ],
        },
      },
      // Vertical float effect
      {
        id: 'text-vertical-float',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -params.floatDistance, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // FOG LAYER 1 (Bottom layer - densest fog)
  // ============================================================================

  const fogLayer1Id = 'fog-layer-1';

  const fogLayer1 = {
    id: fogLayer1Id,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: getFogLayerGradient(0.8, 0.4),
          willChange: 'transform',
          backdropFilter: `blur(${params.fogBlurMin}px)`,
          WebkitBackdropFilter: `blur(${params.fogBlurMin}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'fog-layer-1-reveal',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.33, 0, 0.2, 1)',
          start: 0,
          duration: fogDurations.layer1,
          mode: 'provider',
          targetIds: [fogLayer1Id],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -120, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // ============================================================================
  // FOG LAYER 2 (Middle layer - medium fog)
  // ============================================================================

  const fogLayer2Id = 'fog-layer-2';

  const fogLayer2 = {
    id: fogLayer2Id,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: getFogLayerGradient(0.6, 0.3),
          willChange: 'transform',
          backdropFilter: `blur(${(params.fogBlurMin + params.fogBlurMax) / 2}px)`,
          WebkitBackdropFilter: `blur(${(params.fogBlurMin + params.fogBlurMax) / 2}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'fog-layer-2-reveal',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          start: 0.5,
          duration: fogDurations.layer2,
          mode: 'provider',
          targetIds: [fogLayer2Id],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -150, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // ============================================================================
  // FOG LAYER 3 (Top layer - lightest fog)
  // ============================================================================

  const fogLayer3Id = 'fog-layer-3';

  const fogLayer3 = {
    id: fogLayer3Id,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: getFogLayerGradient(0.4, 0.15),
          willChange: 'transform',
          backdropFilter: `blur(${params.fogBlurMax}px)`,
          WebkitBackdropFilter: `blur(${params.fogBlurMax}px)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'fog-layer-3-reveal',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.6, 1)',
          start: 1,
          duration: fogDurations.layer3,
          mode: 'provider',
          targetIds: [fogLayer3Id],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -180, prog: 1 },
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer = {
    id: 'fog-reveal-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textElement, fogLayer1, fogLayer2, fogLayer3] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'fog-reveal-text',
  title: 'Atmospheric Fog Reveal Text',
  description:
    'Atmospheric text reveal using soft vertical mask that simulates fog lifting with variable feathering (20-80px blur) and dynamic opacity gradients. Features multiple layered gradients for depth, breathing scale effect (0.98-1.02), and subtle vertical float animation. Fog mask has variable opacity (denser at bottom, transparent at top) with custom cubic-bezier timing for organic weather-like reveal.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'fog',
    'atmospheric',
    'gradient',
    'mask',
    'depth',
    'cinematic',
    'weather',
    'organic',
    'glass-morphism',
    'post-production',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Sample Text',
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    duration: 8,
    fogColor: 'rgba(255,255,255,0.8)',
    fogBlurMin: 20,
    fogBlurMax: 80,
    breathingIntensity: 0.02,
    floatDistance: 8,
    fogSpeed: 'normal',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const fogRevealTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
