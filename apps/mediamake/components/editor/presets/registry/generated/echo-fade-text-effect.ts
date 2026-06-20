/**
 * Echo Fade Text Effect Preset
 *
 * Creates a dynamic echo fade effect where each character appears multiple times with 
 * decreasing opacity, creating trailing ghost copies with motion blur and position offsets.
 * Perfect for music-related content or action titles with energetic, sound-wave-like visualization.
 *
 * Features:
 * - Multiple ghost echoes per character (primary + 2-3 echo layers)
 * - Decreasing opacity for each echo layer (1.0 → 0.5 → 0.25)
 * - Position offsets creating depth (-5px, -10px)
 * - Motion blur on echoes (2px, 4px) for speed sensation
 * - Scale differences (1.0, 0.98, 0.96) for subtle depth
 * - Staggered character animation (80ms per character)
 * - Smooth fade-in with translateX animation
 * - Color desaturation on echoes for depth perception
 *
 * Use cases:
 * - Music video titles
 * - Action movie text effects
 * - Gaming overlays
 * - Sport highlight intros
 * - Energetic social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with echo effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Primary text color (hex or rgba)'),
  echoCount: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Number of echo layers (1-3)'),
  characterStaggerDelay: z
    .number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Delay between each character animation in milliseconds'),
  animationDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Duration of each character fade-in animation in seconds'),
  echoOpacities: z
    .array(z.number().min(0).max(1))
    .default([0.5, 0.25])
    .optional()
    .describe('Opacity values for each echo layer (default: [0.5, 0.25])'),
  echoOffsets: z
    .array(z.number())
    .default([-5, -10])
    .optional()
    .describe('X-axis offset in pixels for each echo layer (default: [-5, -10])'),
  echoBlurs: z
    .array(z.number().min(0).max(10))
    .default([2, 4])
    .optional()
    .describe('Blur amount in pixels for each echo layer (default: [2, 4])'),
  echoScales: z
    .array(z.number().min(0.8).max(1))
    .default([0.98, 0.96])
    .optional()
    .describe('Scale values for each echo layer (default: [0.98, 0.96])'),
  primaryTranslateDistance: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .describe('Distance in pixels for primary character slide-in animation'),
  colorDesaturation: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Desaturation factor for echo colors (0 = no desaturation, 1 = full desaturation)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to desaturate color
  const desaturateColor = (hex: string, factor: number): string => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');

    // Parse RGB values
    const r = parseInt(cleanHex.substring(0, 2), 16);
    const g = parseInt(cleanHex.substring(2, 4), 16);
    const b = parseInt(cleanHex.substring(4, 6), 16);

    // Calculate grayscale value (luminance)
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // Interpolate between original color and grayscale
    const newR = Math.round(r + (gray - r) * factor);
    const newG = Math.round(g + (gray - g) * factor);
    const newB = Math.round(b + (gray - b) * factor);

    // Convert back to hex
    const toHex = (n: number) => {
      const hex = n.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
  };

  // Parse text into characters
  const characters = params.text.split('');

  // Calculate stagger delay in seconds
  const staggerDelay = params.characterStaggerDelay / 1000;

  // Get echo configuration
  const echoOpacities = params.echoOpacities || [0.5, 0.25];
  const echoOffsets = params.echoOffsets || [-5, -10];
  const echoBlurs = params.echoBlurs || [2, 4];
  const echoScales = params.echoScales || [0.98, 0.96];

  // Ensure arrays match echoCount
  const normalizedEchoCount = Math.min(params.echoCount, 3);
  const opacities = echoOpacities.slice(0, normalizedEchoCount);
  const offsets = echoOffsets.slice(0, normalizedEchoCount);
  const blurs = echoBlurs.slice(0, normalizedEchoCount);
  const scales = echoScales.slice(0, normalizedEchoCount);

  // Build character stacks
  const characterStacks: RenderableComponentData[] = characters.map(
    (char, charIndex) => {
      const stackStartTime = charIndex * staggerDelay;
      const stackDuration = params.duration - stackStartTime;

      // Build echo layers (in reverse order so primary is on top)
      const layers: RenderableComponentData[] = [];

      // Create echo layers (bottom to top)
      for (let echoIndex = normalizedEchoCount - 1; echoIndex >= 0; echoIndex--) {
        const echoId = `char-${charIndex}-echo-${echoIndex}`;
        const echoOpacity = opacities[echoIndex] || 0.25;
        const echoOffset = offsets[echoIndex] || -5;
        const echoBlur = blurs[echoIndex] || 2;
        const echoScale = scales[echoIndex] || 0.98;
        const echoDelay = (echoIndex + 1) * 0.05; // 50ms stagger between echoes
        const echoColor = desaturateColor(params.color, params.colorDesaturation);

        // Echo layer
        const echoLayer: RenderableComponentData = {
          id: echoId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: char,
            style: {
              fontSize: `${params.fontSize}px`,
              fontWeight: params.fontWeight,
              color: echoColor,
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: 8 + echoIndex,
              transform: `translateX(${echoOffset}px) scale(${echoScale})`,
              filter: `blur(${echoBlur}px)`,
              pointerEvents: 'none',
            },
            font: {
              family: params.fontFamily,
              weights: [params.fontWeight],
              subsets: ['latin'],
            },
          },
          context: {
            timing: {
              start: echoDelay,
              duration: stackDuration - echoDelay,
            },
          },
          effects: [
            {
              id: `echo-${echoIndex}-fade-${charIndex}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: params.animationDuration,
                mode: 'provider',
                targetIds: [echoId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: echoOpacity, prog: 1 },
                  {
                    key: 'translateX',
                    val: echoOffset - params.primaryTranslateDistance,
                    prog: 0,
                  },
                  { key: 'translateX', val: echoOffset, prog: 1 },
                ],
              } as GenericEffectData,
            },
          ],
        };

        layers.push(echoLayer);
      }

      // Primary character layer (on top)
      const primaryId = `char-${charIndex}-primary`;
      const primaryLayer: RenderableComponentData = {
        id: primaryId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: `${params.fontSize}px`,
            fontWeight: params.fontWeight,
            color: params.color,
            position: 'relative',
            zIndex: 10,
          },
          font: {
            family: params.fontFamily,
            weights: [params.fontWeight],
            subsets: ['latin'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: stackDuration,
          },
        },
        effects: [
          {
            id: `primary-fade-${charIndex}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: params.animationDuration,
              mode: 'provider',
              targetIds: [primaryId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'translateX', val: params.primaryTranslateDistance, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      };

      layers.push(primaryLayer);

      // Character stack container
      const characterStack: RenderableComponentData = {
        id: `char-stack-${charIndex}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              minWidth: char === ' ' ? '0.3em' : undefined,
            },
          },
        },
        context: {
          timing: {
            start: stackStartTime,
            duration: stackDuration,
          },
        },
        childrenData: layers,
      };

      return characterStack;
    },
  );

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'echo-fade-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: 'echo-fade-character-group',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-flex flex-row',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: characterStacks as RenderableComponentData[],
      },
    ],
  };

  return {
    output: {
      childrenData: [rootContainer as RenderableComponentData],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'echo-fade-text-effect',
  title: 'Echo Fade Text Effect',
  description:
    'Dynamic echo fade effect where each character appears multiple times with decreasing opacity, creating trailing ghost copies with motion blur. Perfect for music-related content or action titles with energetic, sound-wave-like visualization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'echo',
    'fade',
    'motion-blur',
    'kinetic',
    'music',
    'action',
    'energetic',
    'dynamic',
    'sound-wave',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ECHO WAVE',
    duration: 5,
    fontSize: 72,
    fontFamily: 'Inter',
    fontWeight: '700',
    color: '#FFFFFF',
    echoCount: 2,
    characterStaggerDelay: 80,
    animationDuration: 0.5,
    echoOpacities: [0.5, 0.25],
    echoOffsets: [-5, -10],
    echoBlurs: [2, 4],
    echoScales: [0.98, 0.96],
    primaryTranslateDistance: 20,
    colorDesaturation: 0.3,
  },
};

// Export preset
export const echoFadeTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
