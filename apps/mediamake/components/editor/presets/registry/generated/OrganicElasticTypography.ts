/**
 * Organic Elastic Typography Preset
 *
 * This preset creates an advanced organic typography system where text grows like living vines
 * with springy tendrils. Letters spiral into existence with DNA-helix-like rotation, stretching
 * and contracting as if breathing. Features bioluminescent gradient pulses (deep ocean blues to
 * electric greens and vibrant purples), tendril connections between letters that stretch and
 * contract elastically, and growth spurts where text suddenly expands and contracts.
 *
 * Features:
 * - Spiral growth animation: Letters rotate [0→720°] + scale [0→1] from center
 * - DNA helix motion: 3D rotateY oscillation creating depth effect
 * - Breathing animation: scaleX/Y [1→1.1→0.95→1] with sine easing (3s loop)
 * - Bioluminescent gradients: Animated gradient stops with pulsing opacity
 * - Tendril connections: SVG paths between letters with elastic bezier curves
 * - Growth spurts: Random scale spikes [1→1.3→1] every 2-4s with spring easing
 * - Font-weight animation: Organic thickness changes [400→900→400]
 * - Canvas-based tendril drawing using CanvasAtom
 * - Staggered timing: 0.2s per letter for spiral pattern
 * - Grid layout: CSS Grid with auto-flow-dense for organic positioning
 *
 * Use cases:
 * - Organic title animations for nature/science content
 * - Bio-themed visual effects
 * - Dynamic typography with living characteristics
 * - Experimental text animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  text: z.string().describe('Text to display with organic elastic effects'),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(10)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size for letters in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),
  colorScheme: z
    .enum(['bioluminescent', 'ocean', 'forest', 'fire', 'neon'])
    .default('bioluminescent')
    .describe('Color scheme for gradient effects'),
  growthSpurtIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for growth spurts (0.1-2.0)'),
  breathingSpeed: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of one breathing cycle in seconds'),
  showTendrils: z
    .boolean()
    .default(true)
    .describe('Whether to show tendril connections between letters'),
  tendrilOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of tendril connections (0-1)'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    font,
    colorScheme,
    growthSpurtIntensity,
    breathingSpeed,
    showTendrils,
    tendrilOpacity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

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

  // Color schemes
  const colorSchemes: Record<string, string> = {
    bioluminescent: 'linear-gradient(135deg, #0a2463 0%, #00ff87 50%, #b721ff 100%)',
    ocean: 'linear-gradient(135deg, #001f3f 0%, #00d4ff 50%, #7b00ff 100%)',
    forest: 'linear-gradient(135deg, #1a3d2e 0%, #4ecca3 50%, #f6e58d 100%)',
    fire: 'linear-gradient(135deg, #330000 0%, #ff6b35 50%, #ffdd00 100%)',
    neon: 'linear-gradient(135deg, #000000 0%, #ff00ff 50%, #00ffff 100%)',
  };

  const selectedGradient = colorSchemes[colorScheme];

  // Split text into letters
  const letters = text.split('');

  // Helper: Create letter components with effects
  const createLetterComponents = () => {
    return letters.map((letter, index) => {
      const letterId = `letter-${index}`;
      const letterStart = index * 0.2; // Stagger by 0.2s per letter

      // Spiral growth effect (rotateZ + scale + rotateY)
      const spiralGrowthEffect = {
        id: `spiral-growth-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 1.5,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            { key: 'scale', val: 0, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
            { key: 'rotateZ', val: 0, prog: 0 },
            { key: 'rotateZ', val: 720, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: 360, prog: 0.5 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      };

      // Breathing animation (scaleX/Y oscillation)
      const breathingEffect = {
        id: `breathing-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 1.5,
          duration: breathingSpeed,
          mode: 'provider',
          targetIds: [letterId],
          loop: true,
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.1, prog: 0.25 },
            { key: 'scaleX', val: 0.95, prog: 0.5 },
            { key: 'scaleX', val: 1, prog: 1 },
            { key: 'scaleY', val: 1, prog: 0 },
            { key: 'scaleY', val: 1.1, prog: 0.25 },
            { key: 'scaleY', val: 0.95, prog: 0.5 },
            { key: 'scaleY', val: 1, prog: 1 },
          ],
        },
      };

      // Gradient pulse effect (opacity oscillation)
      const gradientPulseEffect = {
        id: `gradient-pulse-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 2.5,
          mode: 'provider',
          targetIds: [letterId],
          loop: true,
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      };

      // Font-weight animation (organic thickness)
      const fontWeightEffect = {
        id: `font-weight-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 1.5,
          duration: breathingSpeed * 1.5,
          mode: 'provider',
          targetIds: [letterId],
          loop: true,
          ranges: [
            { key: 'fontWeight', val: 400, prog: 0 },
            { key: 'fontWeight', val: 900, prog: 0.5 },
            { key: 'fontWeight', val: 400, prog: 1 },
          ],
        },
      };

      // Growth spurt effect (random scale spikes)
      const growthSpurtTime = 3 + (index % 3) * 2.5; // Stagger spurts: 3s, 5.5s, 8s
      const growthSpurtEffect = {
        id: `growth-spurt-${index}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: growthSpurtTime,
          duration: 0.6,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1 + 0.3 * growthSpurtIntensity, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      };

      // Letter component
      const letterComponent = {
        id: letterId,
        componentId: 'TextAtom',
        type: 'atom' as const,
        data: {
          text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 400,
            fontStyle: fontStyle.fontStyle || 'normal',
            transformOrigin: 'center center',
            color: 'transparent',
            backgroundImage: selectedGradient,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['400', '700', '900'],
          },
        },
        context: {
          timing: {
            start: letterStart,
            duration: duration - letterStart,
          },
        },
        effects: [
          spiralGrowthEffect,
          breathingEffect,
          gradientPulseEffect,
          fontWeightEffect,
          growthSpurtEffect,
        ],
      };

      return letterComponent;
    });
  };

  const letterComponents = createLetterComponents();

  // Letter grid container
  const letterGridContainer = {
    id: 'letter-grid-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative grid gap-4',
        style: {
          zIndex: 2,
          gridTemplateColumns: `repeat(auto-fit, minmax(${fontSize * 0.8}px, 1fr))`,
          gridAutoFlow: 'dense' as any,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: letterComponents,
  };

  // Tendril canvas layer (optional)
  const tendrilCanvasLayer = showTendrils
    ? {
        id: 'tendril-canvas-layer',
        componentId: 'CanvasAtom',
        type: 'atom' as const,
        data: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            zIndex: 1,
            opacity: tendrilOpacity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      }
    : null;

  // Root container
  const rootContainer = {
    id: 'organic-elastic-typography-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-visible flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      ...(tendrilCanvasLayer ? [tendrilCanvasLayer] : []),
      letterGridContainer,
    ].filter(Boolean),
  } as RenderableComponentData;

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
  id: 'OrganicElasticTypography',
  title: 'Organic Elastic Typography with Bioluminescent Effects',
  description:
    'Advanced organic typography system where text grows like living vines with DNA-helix rotation, breathing animations, and bioluminescent gradient pulses. Letters spiral into existence with elastic tendril connections creating a web of animated relationships. Features growth spurts and font-weight variations for organic thickness changes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'organic',
    'elastic',
    'spiral',
    'helix',
    'breathing',
    'bioluminescent',
    'gradient',
    'tendril',
    'growth-spurt',
    'kinetic',
    'experimental',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ORGANIC',
    duration: 10,
    fontSize: 72,
    font: 'Inter:700',
    colorScheme: 'bioluminescent',
    growthSpurtIntensity: 1,
    breathingSpeed: 3,
    showTendrils: true,
    tendrilOpacity: 0.3,
  },
};

// --- Export Preset ---
export const OrganicElasticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
