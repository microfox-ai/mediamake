/**
 * HUD Caption System Preset
 *
 * This preset creates a parallax-free floating caption system inspired by video game HUDs
 * (Destiny, Apex Legends). It features:
 * 
 * - **Pixel-Perfect Stability**: Captions behave like UI elements, unaffected by camera motion
 * - **Grid-Based Layout**: 3x3 grid system allowing captions to appear in any quadrant
 * - **Digital Data Stream Effect**: Characters materialize with typewriter animation
 * - **Scanline Overlay**: Subtle CRT/holographic aesthetic
 * - **Holographic Shimmer**: Animated gradients create energy field effect
 * - **Energy Pulse**: Gentle brightness pulse as if powered by internal light source
 *
 * Use cases:
 * - Gaming-style HUD text overlays
 * - Futuristic UI elements in tech videos
 * - Cyberpunk/sci-fi aesthetic captions
 * - Dynamic on-screen text that stays stable during camera movement
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time within caption'),
        end: z.number().describe('Relative end time within caption'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in caption timeline'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
          }),
        ),
        metadata: z
          .object({
            gridColumn: z.number().min(1).max(3).optional().describe('Grid column (1-3)'),
            gridRow: z.number().min(1).max(3).optional().describe('Grid row (1-3)'),
          })
          .optional(),
      }),
    )
    .describe('Caption data with grid position metadata'),

  font: z
    .string()
    .optional()
    .default('JetBrains Mono')
    .describe('Font family (monospace recommended for tech aesthetic)'),

  fontSize: z
    .number()
    .min(12)
    .max(48)
    .optional()
    .default(24)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .optional()
    .default('#22d3ee')
    .describe('Text color (cyan default for tech aesthetic)'),

  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.8)
    .describe('Text glow intensity (0-1)'),

  typewriterSpeed: z
    .number()
    .min(10)
    .max(200)
    .optional()
    .default(50)
    .describe('Typewriter character delay in milliseconds'),

  pulseSpeed: z
    .number()
    .min(0.5)
    .max(5)
    .optional()
    .default(2)
    .describe('Energy pulse animation duration in seconds'),

  defaultGridColumn: z
    .number()
    .min(1)
    .max(3)
    .optional()
    .default(2)
    .describe('Default grid column if metadata not provided'),

  defaultGridRow: z
    .number()
    .min(1)
    .max(3)
    .optional()
    .default(3)
    .describe('Default grid row if metadata not provided'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    glowIntensity,
    typewriterSpeed,
    pulseSpeed,
    defaultGridColumn,
    defaultGridRow,
  } = params;

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
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

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'JetBrains Mono');

  // Calculate total duration from captions
  const totalDuration = captions.reduce(
    (max, caption) => Math.max(max, caption.absoluteEnd),
    0,
  );

  // Build caption blocks
  const captionBlocks: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const gridColumn = caption.metadata?.gridColumn ?? defaultGridColumn;
      const gridRow = caption.metadata?.gridRow ?? defaultGridRow;

      // Build character components with staggered timing
      const characters = caption.text.split('');
      const characterComponents: RenderableComponentData[] = characters.map(
        (char, charIndex) => {
          const charId = `char-${captionIndex}-${charIndex}`;
          const charDelay = (charIndex * typewriterSpeed) / 1000; // Convert ms to seconds

          return {
            id: charId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: char === ' ' ? '\u00A0' : char, // Non-breaking space for proper spacing
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                display: 'inline-block',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['400'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [
              // Typewriter fade-in effect
              {
                id: `typewriter-${charId}`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: charDelay,
                  duration: 0.15,
                  mode: 'provider',
                  targetIds: [charId],
                  ranges: [
                    { key: 'opacity', val: 0, prog: 0 },
                    { key: 'opacity', val: 1, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData;
        },
      );

      const captionBlockId = `caption-block-${captionIndex}`;
      const characterContainerId = `char-container-${captionIndex}`;

      // Create caption block with holographic background and scanlines
      const captionBlock: RenderableComponentData = {
        id: captionBlockId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `col-start-${gridColumn} row-start-${gridRow} relative overflow-hidden flex items-center justify-center`,
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [
          // Scanline overlay
          {
            id: `scanline-${captionIndex}`,
            type: 'atom' as const,
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,255,0.03) 2px, rgba(0,255,255,0.03) 4px); mix-blend-mode: overlay;"></div>`,
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
          } as RenderableComponentData,
          // Character container with holographic background
          {
            id: characterContainerId,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-wrap font-mono',
                style: {
                  background:
                    'linear-gradient(90deg, rgba(0,255,255,0.1), rgba(0,150,255,0.1), rgba(0,255,255,0.1))',
                  backgroundSize: '200% 100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid rgba(0,255,255,0.3)',
                  textShadow: `0 0 ${20 * glowIntensity}px currentColor, 0 0 ${40 * glowIntensity}px currentColor`,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [
              // Holographic shimmer (background position animation)
              {
                id: `shimmer-${captionIndex}`,
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: caption.duration,
                  mode: 'provider',
                  targetIds: [characterContainerId],
                  ranges: [
                    { key: 'backgroundPosition', val: '0% 0%', prog: 0 },
                    { key: 'backgroundPosition', val: '200% 0%', prog: 1 },
                  ],
                },
              },
              // Energy pulse (opacity and brightness)
              {
                id: `pulse-${captionIndex}`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: pulseSpeed,
                  mode: 'provider',
                  targetIds: [characterContainerId],
                  ranges: [
                    { key: 'opacity', val: 0.9, prog: 0 },
                    { key: 'opacity', val: 1, prog: 0.5 },
                    { key: 'opacity', val: 0.9, prog: 1 },
                    { key: 'filter', val: 'brightness(100%)', prog: 0 },
                    { key: 'filter', val: 'brightness(120%)', prog: 0.5 },
                    { key: 'filter', val: 'brightness(100%)', prog: 1 },
                  ],
                },
              },
            ],
            childrenData: characterComponents,
          } as RenderableComponentData,
        ],
      };

      return captionBlock;
    },
  );

  // Root container: 3x3 grid layout
  const rootContainer: RenderableComponentData = {
    id: 'hud-caption-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-cols-3 grid-rows-3 fixed inset-0 gap-4 p-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: captionBlocks,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'hud-caption-system',
  title: 'HUD Caption System',
  description:
    'Parallax-free floating caption system inspired by video game HUDs (Destiny, Apex Legends). Features a 3x3 grid layout where captions appear pixel-perfect and stable regardless of background motion. Includes typewriter character-by-character reveal with staggered animations, scanline overlay, holographic shimmer gradient, and energy pulse glow effects. Text uses monospace tech aesthetic with cyan coloring and dynamic text-shadow glow.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'hud',
    'gaming',
    'futuristic',
    'cyberpunk',
    'typewriter',
    'holographic',
    'grid',
    'stable',
    'parallax-free',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'SYSTEMS ONLINE',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [],
        metadata: {
          gridColumn: 1,
          gridRow: 1,
        },
      },
      {
        id: 'caption-2',
        text: 'TARGET ACQUIRED',
        start: 0,
        end: 2.5,
        duration: 2.5,
        absoluteStart: 3.5,
        absoluteEnd: 6,
        words: [],
        metadata: {
          gridColumn: 3,
          gridRow: 1,
        },
      },
      {
        id: 'caption-3',
        text: 'MISSION CRITICAL',
        start: 0,
        end: 4,
        duration: 4,
        absoluteStart: 7,
        absoluteEnd: 11,
        words: [],
        metadata: {
          gridColumn: 2,
          gridRow: 2,
        },
      },
    ],
    font: 'JetBrains Mono',
    fontSize: 24,
    textColor: '#22d3ee',
    glowIntensity: 0.8,
    typewriterSpeed: 50,
    pulseSpeed: 2,
    defaultGridColumn: 2,
    defaultGridRow: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const hudCaptionSystemPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
