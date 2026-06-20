/**
 * Cinema Lens Breathing Focus Effect Preset
 *
 * This preset simulates real cinema lens characteristics during focus pulls.
 * As focus transitions, the text exhibits 'breathing' - a subtle zoom effect
 * that occurs in real lenses when focal distance changes. The image slightly
 * expands and contracts, mimicking professional cinema lens behavior.
 *
 * Features:
 * - Lens Breathing: Subtle scale animation (0.95 → 1.05 → 1.0) synchronized with blur
 * - Barrel Distortion: Distortion at extreme blur that corrects to rectilinear as focus sharpens
 * - Anamorphic Lens Flares: Horizontal blue streaks that appear during transition
 * - Cinematic Blur Quality: Proper circle of confusion rendering with blur (25px → 0)
 * - Breathing Leads Blur: 200ms timing offset for realism
 * - Micro-Movements: Depth effects using translateZ for enhanced realism
 *
 * Use cases:
 * - Film-style title cards with Hollywood production value
 * - Dramatic caption reveals with cinematic feel
 * - Professional video intros with lens characteristics
 * - High-end video overlays with realistic focus effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        text: z.string().describe('Caption text content'),
        absoluteStart: z.number().describe('Absolute start time in seconds'),
        duration: z.number().describe('Caption duration in seconds'),
        words: z
          .array(
            z.object({
              text: z.string().describe('Word text'),
              start: z
                .number()
                .describe('Word start time relative to caption'),
              duration: z.number().describe('Word duration'),
            }),
          )
          .optional()
          .describe('Optional word-level timing'),
      }),
    )
    .describe('Array of caption objects with timing information'),

  breathingIntensity: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe(
      'Intensity of breathing effect (scale variation from base, e.g., 0.05 = 5% variation)',
    ),

  breathingDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Duration of breathing cycle in seconds'),

  initialBlur: z
    .number()
    .min(10)
    .max(50)
    .default(25)
    .describe('Initial blur amount in pixels at extreme defocus'),

  blurOffset: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe(
      'Time offset for blur animation start (seconds after breathing starts)',
    ),

  distortionAmount: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.08)
    .describe('Amount of barrel distortion at extreme blur (0-0.2)'),

  flareIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of anamorphic lens flares (0-1)'),

  flareColor: z
    .string()
    .default('rgba(100, 149, 237, 0.3)')
    .describe('Color of anamorphic lens flares (CSS color value)'),

  depthMovement: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .describe('Amount of depth micro-movement in pixels (translateZ range)'),

  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(48)
    .describe('Font size for caption text in pixels'),

  fontFamily: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700")',
    ),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),

  textAlign: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Text alignment'),

  positionY: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical positioning of text'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution Function ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    breathingIntensity,
    breathingDuration,
    initialBlur,
    blurOffset,
    distortionAmount,
    flareIntensity,
    flareColor,
    depthMovement,
    fontSize,
    fontFamily,
    textColor,
    textAlign,
    positionY,
  } = params;

  // Parse font string
  const fontString = fontFamily || 'Inter:700';
  const fontFamilyName = fontString.includes(':')
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

  // Vertical position mapping
  const positionClass =
    positionY === 'top'
      ? 'items-start pt-20'
      : positionY === 'bottom'
        ? 'items-end pb-20'
        : 'items-center';

  // Text alignment mapping
  const alignClass =
    textAlign === 'left'
      ? 'text-left'
      : textAlign === 'right'
        ? 'text-right'
        : 'text-center';

  // Calculate scale range based on breathing intensity
  const minScale = 1 - breathingIntensity;
  const maxScale = 1 + breathingIntensity;

  // Calculate distortion values
  const maxDistortionX = 1 + distortionAmount;
  const maxDistortionY = 1 - distortionAmount * 0.7;

  const childrenData: RenderableComponentData[] = [];

  // Process each caption
  captions.forEach((caption, captionIndex) => {
    const captionId = `cinema-caption-${captionIndex}`;
    const textContainerId = `cinema-text-container-${captionIndex}`;
    const flare1Id = `cinema-flare-1-${captionIndex}`;
    const flare2Id = `cinema-flare-2-${captionIndex}`;

    // Create anamorphic flare elements
    const flareHTML1 = `<div style="width: 100%; height: 4px; background: linear-gradient(90deg, transparent 0%, ${flareColor} 50%, transparent 100%);"></div>`;
    const flareHTML2 = `<div style="width: 100%; height: 4px; background: linear-gradient(90deg, transparent 0%, ${flareColor.replace('0.3', '0.2')} 50%, transparent 100%);"></div>`;

    // Create caption container with all layers
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full',
          style: {
            perspective: '1000px',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        // Lens flare layer
        {
          id: `cinema-flare-layer-${captionIndex}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                overflow: 'hidden',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: [
            // Flare 1
            {
              id: flare1Id,
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: flareHTML1,
                className: 'absolute top-1/3',
                style: {
                  transform: 'scaleX(3)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: caption.duration,
                },
              },
              effects: [
                // Flare opacity animation
                {
                  id: `flare-opacity-${captionIndex}-1`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-in-out',
                    start: 0.3,
                    duration: 2.4,
                    mode: 'provider',
                    targetIds: [flare1Id],
                    ranges: [
                      { key: 'opacity', val: 0, prog: 0 },
                      {
                        key: 'opacity',
                        val: flareIntensity,
                        prog: 0.2,
                      },
                      {
                        key: 'opacity',
                        val: flareIntensity * 0.8,
                        prog: 0.5,
                      },
                      { key: 'opacity', val: 0, prog: 1 },
                    ],
                  },
                },
                // Flare translateX animation
                {
                  id: `flare-translate-${captionIndex}-1`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: 0.3,
                    duration: 1.5,
                    mode: 'provider',
                    targetIds: [flare1Id],
                    ranges: [
                      { key: 'translateX', val: -100, prog: 0 },
                      { key: 'translateX', val: 0, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
            // Flare 2
            {
              id: flare2Id,
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: flareHTML2,
                className: 'absolute bottom-1/3',
                style: {
                  transform: 'scaleX(3)',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: caption.duration,
                },
              },
              effects: [
                // Flare opacity animation
                {
                  id: `flare-opacity-${captionIndex}-2`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-in-out',
                    start: 0.3,
                    duration: 2.4,
                    mode: 'provider',
                    targetIds: [flare2Id],
                    ranges: [
                      { key: 'opacity', val: 0, prog: 0 },
                      {
                        key: 'opacity',
                        val: flareIntensity * 0.7,
                        prog: 0.2,
                      },
                      {
                        key: 'opacity',
                        val: flareIntensity * 0.6,
                        prog: 0.5,
                      },
                      { key: 'opacity', val: 0, prog: 1 },
                    ],
                  },
                },
                // Flare translateX animation (opposite direction)
                {
                  id: `flare-translate-${captionIndex}-2`,
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: 0.3,
                    duration: 1.5,
                    mode: 'provider',
                    targetIds: [flare2Id],
                    ranges: [
                      { key: 'translateX', val: 100, prog: 0 },
                      { key: 'translateX', val: 0, prog: 1 },
                    ],
                  },
                },
              ],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData,

        // Text content layer
        {
          id: textContainerId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: `relative w-full h-full flex ${positionClass} justify-center`,
              style: {
                transformOrigin: 'center',
                transformStyle: 'preserve-3d',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          childrenData: [
            // Caption text atom
            {
              id: `cinema-text-${captionIndex}`,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: caption.text,
                className: `${alignClass}`,
                style: {
                  fontSize: `${fontSize}px`,
                  color: textColor,
                  ...fontStyle,
                },
                font: {
                  family: fontFamilyName,
                  weights: fontStyle.fontWeight
                    ? [fontStyle.fontWeight.toString()]
                    : ['700'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: caption.duration,
                },
              },
            } as RenderableComponentData,
          ],
          effects: [
            // Breathing scale effect (starts at 0s)
            {
              id: `breathing-scale-${captionIndex}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: breathingDuration,
                mode: 'provider',
                targetIds: [textContainerId],
                ranges: [
                  { key: 'scale', val: minScale, prog: 0 },
                  { key: 'scale', val: maxScale, prog: 0.33 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
            // Blur focus effect (starts at blurOffset)
            {
              id: `blur-focus-${captionIndex}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: blurOffset,
                duration: breathingDuration - blurOffset,
                mode: 'provider',
                targetIds: [textContainerId],
                ranges: [
                  { key: 'filter', val: `blur(${initialBlur}px)`, prog: 0 },
                  {
                    key: 'filter',
                    val: `blur(${initialBlur * 0.6}px)`,
                    prog: 0.3,
                  },
                  {
                    key: 'filter',
                    val: `blur(${initialBlur * 0.2}px)`,
                    prog: 0.7,
                  },
                  { key: 'filter', val: 'blur(0px)', prog: 1 },
                ],
              },
            },
            // Barrel distortion effect (corrects over time)
            {
              id: `barrel-distortion-${captionIndex}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: breathingDuration,
                mode: 'provider',
                targetIds: [textContainerId],
                ranges: [
                  { key: 'scaleX', val: maxDistortionX, prog: 0 },
                  { key: 'scaleY', val: maxDistortionY, prog: 0 },
                  { key: 'scaleX', val: 1, prog: 1 },
                  { key: 'scaleY', val: 1, prog: 1 },
                ],
              },
            },
            // Depth micro-movement effect
            {
              id: `depth-movement-${captionIndex}`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: breathingDuration,
                mode: 'provider',
                targetIds: [textContainerId],
                ranges: [
                  { key: 'translateZ', val: -depthMovement, prog: 0 },
                  { key: 'translateZ', val: depthMovement * 0.25, prog: 0.5 },
                  { key: 'translateZ', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;

    childrenData.push(captionContainer);
  });

  return {
    output: {
      childrenData: childrenData as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'cinema-lens-breathing-focus',
  title: 'Cinema Lens Breathing Focus Effect',
  description:
    'Film-style focus pull effect with lens breathing (subtle zoom during focus transitions), barrel distortion correction, anamorphic lens flares, and cinematic bokeh blur. Simulates real cinema lens characteristics with breathing leading blur by 200ms, horizontal blue flares during transitions, and distortion that corrects from barrel to rectilinear. Perfect for Hollywood-quality title cards and dramatic caption reveals with proper circle of confusion rendering.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'captions',
    'cinema',
    'lens',
    'breathing',
    'focus',
    'cinematic',
    'blur',
    'distortion',
    'anamorphic',
    'flares',
    'hollywood',
    'film',
    'title-cards',
  ],
  defaultInputParams: {
    captions: [
      {
        text: 'HOLLYWOOD PRODUCTION',
        absoluteStart: 0,
        duration: 5,
      },
    ],
    breathingIntensity: 0.05,
    breathingDuration: 3,
    initialBlur: 25,
    blurOffset: 0.2,
    distortionAmount: 0.08,
    flareIntensity: 0.3,
    flareColor: 'rgba(100, 149, 237, 0.3)',
    depthMovement: 20,
    fontSize: 64,
    fontFamily: 'Inter:700',
    textColor: '#FFFFFF',
    textAlign: 'center',
    positionY: 'center',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Preset Export ---

export const cinemaLensBreathingFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
