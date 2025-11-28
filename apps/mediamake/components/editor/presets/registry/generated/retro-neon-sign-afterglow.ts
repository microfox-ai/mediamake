/**
 * Retro Neon Sign Text with Electrical Afterglow Preset
 *
 * This preset creates a retro neon sign text effect with electrical 'afterglow' ghosting 
 * that simulates the persistence of vision from bright neon tubes. The main text glows 
 * brightly like fresh neon, while ghost copies represent the fading afterimage burned 
 * into the retina.
 *
 * Features:
 * - Main neon text with bright white glow
 * - Multiple ghost layers with color temperature shift (hot white → cyan → deep blue)
 * - Electrical flicker and interference effects on ghosts
 * - Bloom effect with larger, softer ghost halos for brightest parts
 * - Subtle electrical vibration (scale pulsing)
 * - Ambient radial bloom layer for enhanced realism
 * - Simulates neon transformer struggle with periodic flicker spikes
 *
 * Use cases:
 * - Retro-style title cards
 * - Neon sign animations
 * - 80s/cyberpunk aesthetic overlays
 * - Music video text effects
 * - Vintage signage recreation
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ─────────────────────────────────────────────────────────────────────────────
// PARAMS SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const presetParams = z.object({
  text: z.string().describe('The text to display with neon afterglow effect'),
  duration: z
    .number()
    .default(5)
    .describe('Duration of the effect in seconds'),
  fontSize: z
    .number()
    .default(96)
    .describe('Font size for the neon text in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter:700" for bold)'),
  mainColor: z
    .string()
    .default('#ffffff')
    .describe('Main neon text color (hot white)'),
  glowColor: z
    .string()
    .default('#00ffff')
    .describe('Secondary glow color for main text (cyan)'),
  transitionDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the ghost fade transition in seconds'),
  flickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of electrical flicker (0 = none, 1 = maximum)'),
  vibrationIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of electrical vibration scale pulsing (0 = none, 1 = maximum)'),
  ambientBloomIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.05)
    .describe('Intensity of ambient radial bloom (0 = none, 1 = maximum)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ─────────────────────────────────────────────────────────────────────────────
// PRESET EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    mainColor,
    glowColor,
    transitionDuration,
    flickerIntensity,
    vibrationIntensity,
    ambientBloomIntensity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const family = fontString.includes(':')
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
    return { family, fontStyle };
  };

  const { family, fontStyle } = parseFontString(fontFamily);

  // Ghost layer configurations with color temperature shift
  // Order: deepest blue (ghost-5) → hot white (main)
  const ghostLayers = [
    {
      id: 'ghost-layer-5',
      color: '#0066ff', // Deep blue (coolest, most faded)
      blur: 4,
      shadowSize: 20,
      opacity: 0.4,
      fadeStart: 0,
      fadeDuration: transitionDuration,
    },
    {
      id: 'ghost-layer-4',
      color: '#0088ff', // Blue
      blur: 3,
      shadowSize: 24,
      opacity: 0.5,
      fadeStart: 0.2,
      fadeDuration: transitionDuration * 0.9,
    },
    {
      id: 'ghost-layer-3',
      color: '#00aaff', // Light blue
      blur: 2.5,
      shadowSize: 30,
      opacity: 0.6,
      fadeStart: 0.4,
      fadeDuration: transitionDuration * 0.8,
    },
    {
      id: 'ghost-layer-2',
      color: '#00ccff', // Cyan-blue
      blur: 2,
      shadowSize: 36,
      opacity: 0.7,
      fadeStart: 0.6,
      fadeDuration: transitionDuration * 0.7,
    },
    {
      id: 'ghost-layer-1',
      color: '#00ffff', // Cyan (closest to main)
      blur: 1.5,
      shadowSize: 40,
      opacity: 0.8,
      fadeStart: 0.8,
      fadeDuration: transitionDuration * 0.6,
    },
  ];

  // Create ghost layer components with effects
  const ghostLayerComponents: RenderableComponentData[] = ghostLayers.map(
    (ghost) => {
      const ghostId = `${ghost.id}-text`;

      // Calculate flicker effect ranges with periodic spikes
      const flickerRanges = [];
      // Fade out base
      flickerRanges.push(
        { key: 'opacity', val: ghost.opacity, prog: 0 },
        { key: 'opacity', val: ghost.opacity * 0.7, prog: 0.3 },
        { key: 'opacity', val: ghost.opacity * 0.4, prog: 0.6 },
        { key: 'opacity', val: 0, prog: 1 },
      );

      // Add flicker spikes if intensity > 0
      if (flickerIntensity > 0) {
        // Spike at 20%
        flickerRanges.push({
          key: 'opacity',
          val: ghost.opacity * (0.8 + flickerIntensity * 0.2),
          prog: 0.2,
        });
        // Spike at 40%
        flickerRanges.push({
          key: 'opacity',
          val: ghost.opacity * (0.6 + flickerIntensity * 0.3),
          prog: 0.4,
        });
        // Spike at 70%
        flickerRanges.push({
          key: 'opacity',
          val: ghost.opacity * (0.3 + flickerIntensity * 0.3),
          prog: 0.7,
        });
      }

      // Blur progression ranges
      const blurRanges = [
        { key: 'filter', val: `blur(0px)`, prog: 0 },
        { key: 'filter', val: `blur(${ghost.blur}px)`, prog: 1 },
      ];

      // Vibration scale pulsing ranges
      const vibrationRanges = [];
      if (vibrationIntensity > 0) {
        const scaleMin = 1 - vibrationIntensity * 0.02; // 0.98 at max intensity
        const scaleMax = 1 + vibrationIntensity * 0.02; // 1.02 at max intensity
        vibrationRanges.push(
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: scaleMin, prog: 0.15 },
          { key: 'scale', val: scaleMax, prog: 0.35 },
          { key: 'scale', val: scaleMin, prog: 0.55 },
          { key: 'scale', val: scaleMax, prog: 0.75 },
          { key: 'scale', val: 1, prog: 1 },
        );
      }

      return {
        id: ghostId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 700,
            color: ghost.color,
            textShadow: `0 0 ${ghost.shadowSize / 2}px currentColor, 0 0 ${ghost.shadowSize}px currentColor`,
            transform: 'translateZ(0)', // Layer promotion for performance
          },
          font: {
            family,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        },
        context: {
          timing: {
            start: ghost.fadeStart,
            duration: duration - ghost.fadeStart,
          },
        },
        effects: [
          // Flicker effect with opacity spikes
          {
            id: `${ghostId}-flicker`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: ghost.fadeDuration,
              mode: 'provider',
              targetIds: [ghostId],
              ranges: flickerRanges,
            },
          },
          // Blur progression for bloom effect
          {
            id: `${ghostId}-blur`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: 0,
              duration: ghost.fadeDuration,
              mode: 'provider',
              targetIds: [ghostId],
              ranges: blurRanges,
            },
          },
          // Vibration scale pulsing
          ...(vibrationIntensity > 0
            ? [
                {
                  id: `${ghostId}-vibration`,
                  componentId: 'generic',
                  data: {
                    type: 'linear',
                    start: 0,
                    duration: ghost.fadeDuration,
                    mode: 'provider',
                    targetIds: [ghostId],
                    ranges: vibrationRanges,
                  },
                },
              ]
            : []),
        ],
      } as RenderableComponentData;
    },
  );

  // Main neon text (brightest, white with cyan glow)
  const mainTextId = 'main-neon-text';
  const mainTextComponent: RenderableComponentData = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontStyle.fontWeight || 700,
        color: mainColor,
        textShadow: `0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor, 0 0 40px ${glowColor}, 0 0 70px ${glowColor}`,
        transform: 'translateZ(0)', // Layer promotion for performance
      },
      font: {
        family,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Subtle pulse for electrical effect
      ...(vibrationIntensity > 0
        ? [
            {
              id: `${mainTextId}-pulse`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: duration,
                mode: 'provider',
                targetIds: [mainTextId],
                ranges: [
                  { key: 'scale', val: 1, prog: 0 },
                  {
                    key: 'scale',
                    val: 1 + vibrationIntensity * 0.01,
                    prog: 0.25,
                  },
                  { key: 'scale', val: 1, prog: 0.5 },
                  {
                    key: 'scale',
                    val: 1 + vibrationIntensity * 0.01,
                    prog: 0.75,
                  },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ]
        : []),
    ],
  };

  // Ambient bloom layer (radial gradient for soft bloom)
  const ambientBloomComponent: RenderableComponentData = {
    id: 'ambient-bloom-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, rgba(255, 255, 255, ${ambientBloomIntensity}) 0%, transparent 60%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Assemble all layers (order: ambient bloom → ghosts (back to front) → main text)
  const childrenData: RenderableComponentData[] = [
    ambientBloomComponent,
    ...ghostLayerComponents,
    mainTextComponent,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-neon-afterglow-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData,
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

// ─────────────────────────────────────────────────────────────────────────────
// PRESET METADATA
// ─────────────────────────────────────────────────────────────────────────────

const presetMetadata: PresetMetadata = {
  id: 'retro-neon-sign-afterglow',
  title: 'Retro Neon Sign Text with Electrical Afterglow',
  description:
    'A neon sign text effect with electrical afterglow ghosting that simulates persistence of vision. Features multiple ghost layers with color temperature shifts (white→cyan→blue), electrical flicker interference, bloom halos, and subtle vibration for authentic neon transformer struggle effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'neon',
    'retro',
    'glow',
    'afterglow',
    'ghost',
    'electrical',
    'flicker',
    'bloom',
    'cyberpunk',
    '80s',
    'vintage',
    'persistence-of-vision',
  ],
  defaultInputParams: {
    text: 'NEON DREAMS',
    duration: 5,
    fontSize: 96,
    fontFamily: 'Inter:700',
    mainColor: '#ffffff',
    glowColor: '#00ffff',
    transitionDuration: 2.5,
    flickerIntensity: 0.6,
    vibrationIntensity: 0.5,
    ambientBloomIntensity: 0.05,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────────────────────

export const retroNeonSignAfterglowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
