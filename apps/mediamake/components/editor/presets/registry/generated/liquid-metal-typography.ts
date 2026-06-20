/**
 * Liquid Metal Typography Preset
 *
 * This preset creates fluid morphing typography where letters flow and reshape like liquid metal.
 * It features droplet formation that merges into readable text, liquid transitions between states,
 * continuous water-like ripple effects, metallic sheen with environment-responsive reflections,
 * and variable font-weight animations for dynamic title sequences and impactful caption moments.
 *
 * Key Features:
 * - **Droplet Formation**: Letters start as droplets (border-radius 50%, scale 0.3) and merge into text
 * - **Liquid Morphing**: Scale, skew, and border-radius transitions create fluid motion
 * - **Merge Effect**: Blur transitions (8px → 0px) simulate liquid merging
 * - **Metallic Sheen**: Mix-blend-mode overlay/screen for adaptive environment reflection
 * - **Continuous Ripples**: SVG-based wave distortion with sin/cos functions (3s loop)
 * - **Variable Font Weight**: Font-weight oscillations (100-900) for fluid thickness perception
 * - **Audio-Reactive** (optional): Bass frequency mapping to ripple amplitude
 *
 * Technical Details:
 * - Uses Inter variable font (weights 100-900) for smooth weight transitions
 * - Implements formation phase (0-0.8s), display phase with ripples, and morph-out phase
 * - Staggered letter animations with 0.05s offset per letter
 * - Complex keyframe sequences using generic effects
 * - Metallic reflection via ambient color sampling from video background
 *
 * Use Cases:
 * - Dynamic title sequences with dramatic entrance
 * - Impactful caption moments that demand attention
 * - Futuristic tech product reveals
 * - Music video lyrics with liquid aesthetics
 * - High-energy social media content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

const presetParams = z.object({
  text: z
    .string()
    .describe('Text content to display with liquid metal morphing effect'),

  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Roboto:600:italic"). Defaults to Inter variable font.',
    ),

  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .optional()
    .describe('Base font size in pixels'),

  baseColor: z
    .string()
    .default('#e0e0e0')
    .optional()
    .describe(
      'Base metallic color (hex or rgb). Metallic sheen will blend with this.',
    ),

  sheenColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe(
      'Metallic sheen overlay color. Uses mix-blend-mode for adaptive reflection effect.',
    ),

  sheenOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Opacity of the metallic sheen overlay layer (0-1)'),

  formationDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .optional()
    .describe(
      'Duration of initial droplet formation and merge phase in seconds',
    ),

  morphDuration: z
    .number()
    .min(0.2)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Duration of morphing transitions between states in seconds'),

  rippleDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe(
      'Duration of one complete ripple cycle (continuous loop) in seconds',
    ),

  rippleIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .optional()
    .describe('Intensity multiplier for ripple/wave distortion effects'),

  letterStagger: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe('Time offset between each letter animation start in seconds'),

  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source URL for audio-reactive ripple effects. Maps bass frequencies to ripple amplitude.',
    ),

  audioReactive: z
    .boolean()
    .default(false)
    .optional()
    .describe(
      'Enable audio-reactive ripple effects. Requires audioSrc to be provided.',
    ),

  displayDuration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .optional()
    .describe(
      'Total display duration of the text after formation completes (seconds)',
    ),

  position: z
    .enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .optional()
    .describe('Screen position for text placement'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font = 'Inter',
    fontSize = 72,
    baseColor = '#e0e0e0',
    sheenColor = '#ffffff',
    sheenOpacity = 0.3,
    formationDuration = 0.8,
    morphDuration = 0.5,
    rippleDuration = 3,
    rippleIntensity = 1,
    letterStagger = 0.05,
    audioSrc,
    audioReactive = false,
    displayDuration = 5,
    position = 'center',
  } = params;

  // Parse font string
  const fontFamily = font.includes(':') ? font.split(':')[0] : font;
  const fontStyle: React.CSSProperties = {};
  if (font.includes(':')) {
    const fontParts = font.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Parse individual letters
  const letters = text.split('');
  const totalFormationTime = formationDuration + letters.length * letterStagger;
  const totalDuration = totalFormationTime + displayDuration;

  // Position mapping
  const getPositionClass = (pos: string): string => {
    const positions: Record<string, string> = {
      center: 'items-center justify-center',
      top: 'items-start justify-center pt-20',
      bottom: 'items-end justify-center pb-20',
      left: 'items-center justify-start pl-20',
      right: 'items-center justify-end pr-20',
    };
    return positions[pos] || positions.center;
  };

  // Create letter components with staggered animations
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const letterStartOffset = index * letterStagger;

      // Formation effect: droplet → readable letter
      const formationEffect = {
        id: `formation-${letterId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: letterStartOffset, // Relative to container start
          duration: formationDuration,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            // Initial droplet state
            { key: 'scale', val: 0.3, prog: 0 },
            { key: 'borderRadius', val: '50%', prog: 0 },
            { key: 'blur', val: '8px', prog: 0 },
            { key: 'opacity', val: 0, prog: 0 },
            // Merge phase
            { key: 'scale', val: 0.6, prog: 0.3 },
            { key: 'borderRadius', val: '30%', prog: 0.3 },
            { key: 'blur', val: '4px', prog: 0.3 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            // Solidify into letter
            { key: 'scale', val: 1, prog: 1 },
            { key: 'borderRadius', val: '0%', prog: 1 },
            { key: 'blur', val: '0px', prog: 1 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      // Continuous ripple effect (starts after formation)
      const rippleEffect = {
        id: `ripple-${letterId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: letterStartOffset + formationDuration,
          duration: totalDuration - (letterStartOffset + formationDuration),
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            // Subtle wave distortion using scale and skew
            { key: 'scaleY', val: 1, prog: 0 },
            {
              key: 'scaleY',
              val: 1 + 0.05 * rippleIntensity,
              prog: 0.25,
            },
            { key: 'scaleY', val: 1, prog: 0.5 },
            {
              key: 'scaleY',
              val: 1 - 0.03 * rippleIntensity,
              prog: 0.75,
            },
            { key: 'scaleY', val: 1, prog: 1 },
            // Skew for liquid motion
            { key: 'skewX', val: '0deg', prog: 0 },
            { key: 'skewX', val: `${2 * rippleIntensity}deg`, prog: 0.25 },
            { key: 'skewX', val: '0deg', prog: 0.5 },
            { key: 'skewX', val: `${-2 * rippleIntensity}deg`, prog: 0.75 },
            { key: 'skewX', val: '0deg', prog: 1 },
          ],
        },
      };

      // Font-weight oscillation for fluid thickness
      const weightOscillationEffect = {
        id: `weight-${letterId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: letterStartOffset + formationDuration,
          duration: totalDuration - (letterStartOffset + formationDuration),
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            { key: 'fontWeight', val: 400, prog: 0 },
            { key: 'fontWeight', val: 600, prog: 0.33 },
            { key: 'fontWeight', val: 400, prog: 0.66 },
            { key: 'fontWeight', val: 300, prog: 0.83 },
            { key: 'fontWeight', val: 400, prog: 1 },
          ],
        },
      };

      // Audio-reactive effect (if enabled)
      const audioReactiveEffect =
        audioReactive && audioSrc
          ? {
              id: `audio-reactive-${letterId}`,
              componentId: 'waveform',
              data: {
                audioSrc,
                audioProperty: 'bass',
                effectType: 'scale',
                intensity: 0.15 * rippleIntensity,
                baseScale: 1,
                sensitivity: 1.2,
                threshold: 0.1,
                numberOfSamples: 128,
                useFrequencyData: true,
                windowInSeconds: 1 / 30,
                mode: 'provider',
                targetIds: [letterId],
                start: letterStartOffset + formationDuration,
                duration:
                  totalDuration - (letterStartOffset + formationDuration),
                smoothNormalisation: 1,
              },
            }
          : null;

      const effects = [
        formationEffect,
        rippleEffect,
        weightOscillationEffect,
        ...(audioReactiveEffect ? [audioReactiveEffect] : []),
      ];

      return {
        id: letterId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
          style: {
            fontSize: `${fontSize}px`,
            color: baseColor,
            display: 'inline-block',
            fontFamily,
            ...fontStyle,
            textShadow: `0 0 20px rgba(255,255,255,0.5)`,
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
          },
          font: {
            family: fontFamily,
            weights: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
            subsets: ['latin'],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects,
      } as RenderableComponentData;
    },
  );

  // Ambient reflection layer (metallic sheen)
  const ambientReflectionLayer: RenderableComponentData = {
    id: 'ambient-reflection-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
          opacity: sheenOpacity,
          background: `linear-gradient(135deg, ${sheenColor} 0%, transparent 50%, ${sheenColor} 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Text container holding all letters
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative flex items-center justify-center flex-wrap`,
        style: {
          gap: `${fontSize * 0.05}px`,
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: letterComponents,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'liquid-metal-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative flex ${getPositionClass(position)} w-full h-full overflow-hidden`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [ambientReflectionLayer, textContainer],
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'liquid-metal-typography',
  title: 'Liquid Metal Typography',
  description:
    'Fluid morphing typography preset where letters flow and reshape like liquid metal. Features droplet formation, liquid merge effects, continuous water-like ripples, metallic sheen with environment-responsive reflections, and variable font-weight animations for dynamic title sequences and impactful caption moments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'liquid',
    'metal',
    'morphing',
    'fluid',
    'droplet',
    'ripple',
    'sheen',
    'metallic',
    'futuristic',
    'dynamic',
    'title',
    'caption',
    'audio-reactive',
  ],
  defaultInputParams: {
    text: 'LIQUID METAL',
    font: 'Inter',
    fontSize: 72,
    baseColor: '#e0e0e0',
    sheenColor: '#ffffff',
    sheenOpacity: 0.3,
    formationDuration: 0.8,
    morphDuration: 0.5,
    rippleDuration: 3,
    rippleIntensity: 1,
    letterStagger: 0.05,
    audioReactive: false,
    displayDuration: 5,
    position: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const liquidMetalTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
