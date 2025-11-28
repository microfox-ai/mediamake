/**
 * Kinetic Glitch Transmission Typography Preset
 *
 * This preset creates a kinetic typography effect simulating damaged fiber optic transmission.
 * Text behaves like data packets arriving out of order, with glitch effects, character scrambling,
 * corruption phases, and neon color shifts that pulse through the electromagnetic spectrum during
 * transmission errors.
 *
 * Features:
 * - **Data Packet Simulation**: Words download with staggered timing, mimicking packet arrival delays
 * - **Character Scrambling**: Random Unicode characters (█▓▒░) replace text during glitch phase
 * - **Corruption Phases**: Three-layer system (glitch → corrupt → final) for realistic data reassembly
 * - **Neon Color Shifts**: Hue rotation through violet to red spectrum during transmission errors
 * - **Packet Loss Effects**: Stuttering, freezing, and rapid catchup to simulate network issues
 * - **Digital Stepping**: Uses steps() easing for authentic digital/binary animation feel
 *
 * Technical Details:
 * - Each word has 3 text layers: glitch layer (80ms), corrupt layer (120ms), final layer (200ms+)
 * - Glitch characters cycle through: █▓▒░▓█▒ with rapid opacity changes
 * - Hue rotation animates from 280deg (violet) → 0deg → 60deg (red) during download
 * - Packet loss stutter uses steps(3) for digital freeze/catch-up effect
 * - Scale catchup effect (1.15 → 1.0) simulates rapid data synchronization
 *
 * Use Cases:
 * - Tech/cyberpunk video content
 * - Gaming streams with glitch aesthetic
 * - Digital art presentations
 * - Social media content with edgy, modern style
 * - Live stream simulations with packet loss
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// ==================== PARAMETERS ====================

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),

  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(48)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (hex or rgba)'),

  glitchDuration: z
    .number()
    .min(0.05)
    .max(0.2)
    .default(0.08)
    .describe('Duration of initial glitch scramble phase in seconds'),

  corruptDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.12)
    .describe('Duration of corruption phase in seconds'),

  resolveDuration: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.2)
    .describe('Duration of final resolution phase in seconds'),

  wordStagger: z
    .number()
    .min(0)
    .max(0.3)
    .default(0.1)
    .describe('Stagger delay between word downloads in seconds'),

  glitchIntensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Multiplier for glitch effect intensity'),

  enablePacketLoss: z
    .boolean()
    .default(true)
    .describe('Enable packet loss stutter effect'),

  enableColorShift: z
    .boolean()
    .default(true)
    .describe('Enable neon color shift during transmission'),
});

// ==================== EXECUTION ====================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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

  // Helper: Generate random glitch characters
  const generateGlitchText = (length: number): string => {
    const glitchChars = ['█', '▓', '▒', '░'];
    let result = '';
    for (let i = 0; i < length; i++) {
      result += glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }
    return result;
  };

  // Helper: Generate partially corrupted text
  const generateCorruptText = (originalText: string): string => {
    const glitchChars = ['█', '▓', '▒', '░'];
    const chars = originalText.split('');
    const numCorrupt = Math.max(1, Math.floor(chars.length * 0.4));

    for (let i = 0; i < numCorrupt; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      chars[randomIndex] =
        glitchChars[Math.floor(Math.random() * glitchChars.length)];
    }

    return chars.join('');
  };

  // Build caption children
  const allCaptionChildren: RenderableComponentData[] = [];

  params.captions.forEach((caption: TranscriptionSentence) => {
    const words = caption.words;

    // Create word grid layout for this caption
    const wordChildren: RenderableComponentData[] = [];

    words.forEach((word, wordIndex) => {
      const wordId = `word-${caption.id}-${wordIndex}`;
      const wordContainerId = `container-${wordId}`;

      const glitchText = generateGlitchText(word.text.length);
      const corruptText = generateCorruptText(word.text);

      // Calculate timings (all relative to caption start)
      const wordRelativeStart = word.start; // Already relative to caption
      const glitchEnd = params.glitchDuration;
      const corruptEnd = glitchEnd + params.corruptDuration;
      const resolveStart = corruptEnd;

      // Three text layers: glitch, corrupt, final
      const glitchLayerId = `glitch-${wordId}`;
      const corruptLayerId = `corrupt-${wordId}`;
      const finalLayerId = `final-${wordId}`;

      // Glitch layer (random characters)
      const glitchLayer: RenderableComponentData = {
        id: glitchLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: glitchText,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle,
            color: params.textColor,
            textShadow: '0 0 20px rgba(138, 43, 226, 0.8)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: glitchEnd,
          },
        },
      };

      // Corrupt layer (partially corrupted)
      const corruptLayer: RenderableComponentData = {
        id: corruptLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: corruptText,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle,
            color: params.textColor,
            textShadow: '0 0 15px rgba(255, 0, 255, 0.6)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: glitchEnd,
            duration: params.corruptDuration,
          },
        },
      };

      // Final layer (resolved text)
      const finalLayer: RenderableComponentData = {
        id: finalLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle,
            color: params.textColor,
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: resolveStart,
            duration: word.duration - resolveStart,
          },
        },
      };

      // Effects for glitch layer (strobe effect with steps)
      const glitchEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: glitchEnd,
        mode: 'provider',
        targetIds: [glitchLayerId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.125 },
          { key: 'opacity', val: 1, prog: 0.25 },
          { key: 'opacity', val: 0, prog: 0.375 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 0.625 },
          { key: 'opacity', val: 1, prog: 0.75 },
          { key: 'opacity', val: 0, prog: 0.875 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      // Effects for corrupt layer (strobe with steps)
      const corruptEffect: GenericEffectData = {
        type: 'linear',
        start: glitchEnd,
        duration: params.corruptDuration,
        mode: 'provider',
        targetIds: [corruptLayerId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.166 },
          { key: 'opacity', val: 1, prog: 0.333 },
          { key: 'opacity', val: 0, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 0.666 },
          { key: 'opacity', val: 0, prog: 0.833 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      // Effects for final layer (fade in with ease-out)
      const resolveEffect: GenericEffectData = {
        type: 'ease-out',
        start: resolveStart,
        duration: params.resolveDuration,
        mode: 'provider',
        targetIds: [finalLayerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      // Packet loss stutter effect (optional)
      const packetLossEffect: GenericEffectData | null = params.enablePacketLoss
        ? {
            type: 'linear',
            start: resolveStart,
            duration: 0.15,
            mode: 'provider',
            targetIds: [finalLayerId],
            ranges: [
              { key: 'opacity', val: 0.3, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.33 },
              { key: 'opacity', val: 0.5, prog: 0.66 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          }
        : null;

      // Hue rotation effect (color shift during transmission)
      const hueShiftEffect: GenericEffectData | null = params.enableColorShift
        ? {
            type: 'ease-in-out',
            start: 0,
            duration: Math.min(0.4, word.duration),
            mode: 'provider',
            targetIds: [wordContainerId],
            ranges: [
              { key: 'filter:hue-rotate', val: '280deg', prog: 0 },
              { key: 'filter:hue-rotate', val: '0deg', prog: 0.5 },
              { key: 'filter:hue-rotate', val: '60deg', prog: 1 },
            ],
          }
        : null;

      // Scale catchup effect (rapid data synchronization)
      const scaleCatchupEffect: GenericEffectData = {
        type: 'ease-out',
        start: resolveStart + 0.15,
        duration: 0.1,
        mode: 'provider',
        targetIds: [wordContainerId],
        ranges: [
          { key: 'scale', val: 1.15, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Word container with all layers and effects
      const wordContainer: RenderableComponentData = {
        id: wordContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: wordRelativeStart + wordIndex * params.wordStagger,
            duration: word.duration,
          },
        },
        childrenData: [glitchLayer, corruptLayer, finalLayer],
        effects: [
          {
            id: `glitch-effect-${wordId}`,
            componentId: 'generic',
            data: glitchEffect,
          },
          {
            id: `corrupt-effect-${wordId}`,
            componentId: 'generic',
            data: corruptEffect,
          },
          {
            id: `resolve-effect-${wordId}`,
            componentId: 'generic',
            data: resolveEffect,
          },
          ...(packetLossEffect
            ? [
                {
                  id: `packet-loss-${wordId}`,
                  componentId: 'generic',
                  data: packetLossEffect,
                },
              ]
            : []),
          ...(hueShiftEffect
            ? [
                {
                  id: `hue-shift-${wordId}`,
                  componentId: 'generic',
                  data: hueShiftEffect,
                },
              ]
            : []),
          {
            id: `scale-catchup-${wordId}`,
            componentId: 'generic',
            data: scaleCatchupEffect,
          },
        ],
      };

      wordChildren.push(wordContainer);
    });

    // Caption container (word grid)
    const captionContainer: RenderableComponentData = {
      id: `caption-container-${caption.id}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'grid grid-flow-col auto-cols-max gap-2',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: wordChildren,
    };

    allCaptionChildren.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'kinetic-glitch-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 10,
      },
    },
    childrenData: allCaptionChildren,
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

// ==================== METADATA ====================

const presetMetadata: PresetMetadata = {
  id: 'kinetic-glitch-transmission',
  title: 'Kinetic Glitch Transmission Typography',
  description:
    'Kinetic typography simulating damaged fiber optic transmission with data packet corruption, glitch effects, neon color shifts, and packet loss stuttering',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'glitch',
    'transmission',
    'data-corruption',
    'neon',
    'fiber-optic',
    'packet-loss',
    'cyberpunk',
    'tech',
    'digital',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#ffffff',
    glitchDuration: 0.08,
    corruptDuration: 0.12,
    resolveDuration: 0.2,
    wordStagger: 0.1,
    glitchIntensity: 1,
    enablePacketLoss: true,
    enableColorShift: true,
  },
};

// ==================== EXPORT ====================

export const kineticGlitchTransmissionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
