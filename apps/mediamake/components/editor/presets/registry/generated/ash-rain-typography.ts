/**
 * Ash-Rain Typography Preset
 *
 * A poetic ash-rain typography effect where text appears handwritten by falling embers.
 * Each letter materializes as glowing particles land and cool from orange embers to ash-gray.
 * Features sequential letter reveal with particle trails, ember glow that fades to matte gray,
 * and wind gusts that scatter particles sideways. Creates an elegiac mood of beautiful destruction -
 * words written in the aftermath of fire.
 *
 * Features:
 * - **Particle-Based Letter Reveal**: Each letter revealed by falling ember particles
 * - **Ember to Ash Transition**: Particles glow orange then fade to ash-gray
 * - **Wind Drift Effect**: Particles scatter sideways with sinusoidal motion
 * - **Sequential Letter Animation**: Letters appear one by one with staggered timing
 * - **Text Shadow Glow**: Ember glow on text that fades to transparent
 * - **ClipPath Reveal**: Letters revealed via clipPath synchronized with particle landing
 *
 * Use cases:
 * - Creating poetic, elegiac text animations
 * - Building dramatic fire/destruction themed titles
 * - Adding atmospheric text reveals for emotional content
 * - Creating unique particle-based typography effects
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
    .describe('Array of caption sentences with word-level timing'),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels for the text'),

  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:700", "Inter:600")',
    ),

  textColor: z
    .string()
    .default('#9ca3af')
    .describe('Final ash-gray color for text after ember fades'),

  emberColor: z
    .string()
    .default('#f97316')
    .describe('Initial orange ember glow color for particles'),

  particlesPerLetter: z
    .number()
    .min(2)
    .max(8)
    .default(4)
    .describe('Number of particles per letter (2-8)'),

  particleSize: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Size of each particle in pixels'),

  emberGlowDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Duration for ember to fade to ash in seconds'),

  letterRevealDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.2)
    .describe('Delay between each letter reveal in seconds'),

  windStrength: z
    .number()
    .min(0)
    .max(100)
    .default(30)
    .describe('Strength of wind drift effect in pixels'),

  windSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .describe('Speed of wind oscillation'),

  positioning: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning of text'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    fontSize,
    font,
    textColor,
    emberColor,
    particlesPerLetter,
    particleSize,
    emberGlowDuration,
    letterRevealDelay,
    windStrength,
    windSpeed,
    positioning,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: Record<string, any> = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Generate all caption components
  const captionComponents: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `ash-rain-caption-${captionIndex}`;

    // Split text into individual letters (including spaces)
    const letters = caption.text.split('');

    // Create letter components with particle effects
    const letterComponents: RenderableComponentData[] = [];

    letters.forEach((letter, letterIndex) => {
      const letterId = `${captionId}-letter-${letterIndex}`;
      const letterStartTime = letterIndex * letterRevealDelay;

      // Skip spaces (but keep them for layout)
      if (letter === ' ') {
        letterComponents.push({
          id: letterId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'inline-block',
              style: { width: `${fontSize * 0.3}px` },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: [],
        } as RenderableComponentData);
        return;
      }

      // Create particles for this letter
      const particleComponents: RenderableComponentData[] = [];

      for (let i = 0; i < particlesPerLetter; i++) {
        const particleId = `${letterId}-particle-${i}`;
        const particleStartOffset = i * 0.05; // Stagger particle start times
        const particleStartTime = letterStartTime + particleStartOffset;
        const particleDuration = 1.2;

        // Calculate particle landing position relative to letter
        const particleXOffset = (Math.random() - 0.5) * fontSize * 0.6;
        const particleFallDistance = fontSize + 50;

        particleComponents.push({
          id: particleId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: ${particleSize}px; height: ${particleSize}px; border-radius: 50%; background-color: ${emberColor}; box-shadow: 0 0 10px rgba(251,146,60,0.8);"></div>`,
            className: 'absolute',
            style: {
              top: '-50px',
              left: `${fontSize * 0.5 + particleXOffset}px`,
            },
          },
          context: {
            timing: {
              start: particleStartTime,
              duration: particleDuration,
            },
          },
          effects: [
            {
              id: `${particleId}-fall`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: particleDuration,
                mode: 'provider',
                targetIds: [particleId],
                ranges: [
                  { key: 'translateY', val: 0, prog: 0 },
                  {
                    key: 'translateY',
                    val: particleFallDistance,
                    prog: 1,
                  },
                  // Wind drift using sinusoidal motion (approximated with keyframes)
                  { key: 'translateX', val: 0, prog: 0 },
                  {
                    key: 'translateX',
                    val: Math.sin(particleStartTime * windSpeed) * windStrength,
                    prog: 0.5,
                  },
                  {
                    key: 'translateX',
                    val:
                      Math.sin(
                        (particleStartTime + particleDuration) * windSpeed,
                      ) * windStrength,
                    prog: 1,
                  },
                  // Fade out near landing
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.8 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData);
      }

      // Create letter text atom
      const letterTextId = `${letterId}-text`;
      const letterRevealStart = letterStartTime + 0.8; // Reveal as particles land
      const letterRevealDuration = 0.4;

      letterComponents.push({
        id: letterId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: [
          // Letter text
          {
            id: letterTextId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: letter,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight || 700,
                color: textColor,
                clipPath: 'inset(100% 0 0 0)',
                textShadow: '0 0 20px rgba(251,146,60,0.9)',
              },
              font: {
                family: fontFamily,
                weights: [String(fontStyle.fontWeight || 700)],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [
              // ClipPath reveal (synchronized with particle landing)
              {
                id: `${letterTextId}-reveal`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: letterRevealStart,
                  duration: letterRevealDuration,
                  mode: 'provider',
                  targetIds: [letterTextId],
                  ranges: [
                    { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
                    { key: 'clipPath', val: 'inset(0 0 0 0)', prog: 1 },
                  ],
                },
              },
              // Ember glow fade to transparent
              {
                id: `${letterTextId}-glow-fade`,
                componentId: 'generic',
                data: {
                  type: 'ease-in-out',
                  start: letterRevealStart,
                  duration: emberGlowDuration,
                  mode: 'provider',
                  targetIds: [letterTextId],
                  ranges: [
                    {
                      key: 'textShadow',
                      val: '0 0 20px rgba(251,146,60,0.9)',
                      prog: 0,
                    },
                    {
                      key: 'textShadow',
                      val: '0 0 10px rgba(251,146,60,0.5)',
                      prog: 0.5,
                    },
                    {
                      key: 'textShadow',
                      val: '0 0 0 transparent',
                      prog: 1,
                    },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // Particles
          ...particleComponents,
        ],
      } as RenderableComponentData);
    });

    // Create caption container
    const positionClass =
      positioning === 'top'
        ? 'items-start pt-20'
        : positioning === 'bottom'
          ? 'items-end pb-20'
          : 'items-center';

    captionComponents.push({
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex flex-wrap justify-center ${positionClass} px-8`,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: letterComponents,
    } as RenderableComponentData);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ash-rain-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'bg-gradient-to-b from-gray-900 to-black w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: captionComponents,
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
  id: 'ash-rain-typography',
  title: 'Ash-Rain Typography Preset',
  description:
    'Poetic ash-rain typography where text appears handwritten by falling embers. Each letter materializes as glowing particles land and cool from orange embers to ash-gray. Features sequential letter reveal with particle trails, ember glow that fades to matte gray, and wind gusts that scatter particles sideways. Creates an elegiac mood of beautiful destruction - words written in the aftermath of fire.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'particles',
    'ember',
    'ash',
    'fire',
    'poetic',
    'elegiac',
    'dramatic',
    'sequential',
    'reveal',
    'wind',
    'glow',
    'captions',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'From ashes',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [],
      },
      {
        id: 'caption-2',
        text: 'We rise',
        start: 0,
        absoluteStart: 3.5,
        end: 2.5,
        absoluteEnd: 6,
        duration: 2.5,
        words: [],
      },
    ],
    fontSize: 72,
    font: 'Inter:700',
    textColor: '#9ca3af',
    emberColor: '#f97316',
    particlesPerLetter: 4,
    particleSize: 4,
    emberGlowDuration: 2,
    letterRevealDelay: 0.2,
    windStrength: 30,
    windSpeed: 2,
    positioning: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const ashRainTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
