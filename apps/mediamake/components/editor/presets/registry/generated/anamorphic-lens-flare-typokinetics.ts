/**
 * Anamorphic Lens Flare Typokinetics Preset
 *
 * This preset recreates the aesthetic of anamorphic lens flares and cinematic text treatments from sci-fi blockbusters.
 * Text appears to be carved from light itself, with horizontal lens flares stretching across the frame as letters materialize.
 * Each character has a chromatic aberration effect during entry, splitting into RGB channels that converge into focus.
 * The animation timeline feels like a slow-motion light burst - starting with a thin horizontal line that expands vertically to reveal the text.
 * 
 * Features:
 * - Anamorphic horizontal lens flares that expand across the frame
 * - Chromatic aberration text treatment (RGB channel split/convergence)
 * - Vertical clip-path reveal animation (thin line expands to full text)
 * - Power-up brightness effect (brightness peaks mid-animation, then settles)
 * - Metallic sheen with animated highlights traveling across text surface
 * - Film grain texture overlay and vignetting for cinematic quality
 * - Word-level timing from caption data with impact-based intensity
 * - Spring easing for organic motion
 * - Cinematic color grading (contrast/brightness filters)
 *
 * Use cases:
 * - Sci-fi title sequences and movie trailers
 * - Tech product reveals and launches
 * - Futuristic brand intros
 * - Cyberpunk aesthetic content
 * - High-energy action sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMETERS SCHEMA ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string().describe('Caption ID'),
        text: z.string().describe('Caption text'),
        start: z.number().describe('Start time relative to caption'),
        end: z.number().describe('End time relative to caption'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in video timeline'),
        absoluteEnd: z.number().describe('Absolute end in video timeline'),
        words: z
          .array(
            z.object({
              id: z.string().optional().describe('Word ID'),
              text: z.string().describe('Word text'),
              start: z.number().describe('Start time relative to caption'),
              end: z.number().describe('End time relative to caption'),
              duration: z.number().describe('Word duration'),
              absoluteStart: z.number().describe('Absolute start in video timeline'),
              absoluteEnd: z.number().describe('Absolute end in video timeline'),
              confidence: z.number().optional().describe('Recognition confidence'),
            }),
          )
          .describe('Array of word objects'),
        metadata: z
          .object({
            impact: z.number().optional().describe('Effect intensity multiplier (0.1-3.0)'),
          })
          .optional()
          .describe('Caption metadata for customization'),
      }),
    )
    .describe('Array of caption objects with word-level timing'),

  font: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),

  fontSize: z
    .number()
    .default(72)
    .describe('Base font size in pixels'),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (RGB channels overlay this)'),

  defaultImpact: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .describe('Default effect intensity multiplier when caption metadata.impact is not available'),

  animationDuration: z
    .number()
    .default(3.0)
    .describe('Total animation duration in seconds for text reveal'),

  wordDelay: z
    .number()
    .default(0.1)
    .describe('Delay in seconds between word animations'),

  chromaticAberrationAmount: z
    .number()
    .default(2)
    .describe('Chromatic aberration offset in pixels (RGB channel separation)'),

  flareIntensity: z
    .number()
    .min(0.1)
    .max(2.0)
    .default(1.0)
    .describe('Intensity of horizontal lens flares'),

  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Vignette darkness intensity (0 = none, 1 = full)'),

  filmGrainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.08)
    .describe('Film grain texture opacity (0 = none, 1 = full)'),

  peakBrightness: z
    .number()
    .min(1.0)
    .max(3.0)
    .default(1.8)
    .describe('Peak brightness during power-up effect'),

  finalBrightness: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.2)
    .describe('Final settled brightness after power-up'),
});

// --- PRESET EXECUTION ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;

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

  const childrenData: any[] = [];

  // Process each caption
  params.captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;
    const impact = caption.metadata?.impact ?? params.defaultImpact;

    // Create container for this caption
    const captionContainer: any = {
      id: `${captionId}-container`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            filter: 'contrast(1.2) brightness(1.1)',
            overflow: 'hidden',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [] as any[],
    };

    // Vignette overlay
    captionContainer.childrenData.push({
      id: `${captionId}-vignette`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            background: `radial-gradient(ellipse at center, transparent ${(1 - params.vignetteIntensity) * 60}%, rgba(0,0,0,${params.vignetteIntensity}) 100%)`,
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: [],
    });

    // Film grain overlay (using HTMLBlockAtom for pattern/texture)
    captionContainer.childrenData.push({
      id: `${captionId}-film-grain`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.03) 3px), repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, transparent 1px, transparent 2px, rgba(255,255,255,0.03) 3px);"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: params.filmGrainOpacity,
          mixBlendMode: 'overlay' as any,
          zIndex: 11,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
    });

    // Primary horizontal flare
    const primaryFlareId = `${captionId}-flare-primary`;
    captionContainer.childrenData.push({
      id: primaryFlareId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,${0.9 * params.flareIntensity}), transparent);"></div>`,
        className: 'absolute left-0 right-0',
        style: {
          top: '50%',
          zIndex: 5,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `${primaryFlareId}-effect`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: Math.min(params.animationDuration * 0.5 * impact, caption.duration),
            mode: 'provider',
            targetIds: [primaryFlareId],
            ranges: [
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1.5, prog: 0.6 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
    });

    // Secondary horizontal flare (colored)
    const secondaryFlareId = `${captionId}-flare-secondary`;
    captionContainer.childrenData.push({
      id: secondaryFlareId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 4px; background: linear-gradient(to right, transparent 10%, rgba(100,180,255,${0.4 * params.flareIntensity}) 30%, rgba(255,255,255,${0.6 * params.flareIntensity}) 50%, rgba(255,180,100,${0.4 * params.flareIntensity}) 70%, transparent 90%); filter: blur(2px);"></div>`,
        className: 'absolute left-0 right-0',
        style: {
          top: '50%',
          zIndex: 4,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `${secondaryFlareId}-effect`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: Math.min(params.animationDuration * 0.5 * impact, caption.duration),
            mode: 'provider',
            targetIds: [secondaryFlareId],
            ranges: [
              { key: 'scaleX', val: 0, prog: 0 },
              { key: 'scaleX', val: 1.5, prog: 0.6 },
              { key: 'scaleX', val: 1, prog: 1 },
            ],
          },
        },
      ],
    });

    // Chromatic text group (RGB layers)
    const chromaticGroupId = `${captionId}-chromatic-group`;
    const chromaticGroup: any = {
      id: chromaticGroupId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex items-center justify-center',
          style: {
            zIndex: 6,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: [] as any[],
    };

    // Create RGB text layers for each word
    caption.words.forEach((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;
      const wordStartRelative = word.start;
      const wordDurationRelative = word.duration;

      // Red channel layer
      const redLayerId = `${wordId}-red`;
      chromaticGroup.childrenData.push({
        id: redLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            position: 'absolute' as any,
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: 'rgba(255,0,0,0.7)',
            mixBlendMode: 'screen' as any,
            textShadow: '0 0 20px rgba(255,0,0,0.5)',
            marginRight: '0.1em',
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
          {
            id: `${redLayerId}-aberration`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: wordStartRelative,
              duration: Math.min(params.animationDuration * 0.5 * impact, wordDurationRelative * 2),
              mode: 'provider',
              targetIds: [redLayerId],
              ranges: [
                { key: 'translateX', val: -params.chromaticAberrationAmount * 3, prog: 0 },
                { key: 'translateX', val: -params.chromaticAberrationAmount, prog: 1 },
              ],
            },
          },
          {
            id: `${redLayerId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: wordStartRelative,
              duration: Math.min(0.3 * impact, wordDurationRelative),
              mode: 'provider',
              targetIds: [redLayerId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      });

      // Green channel layer
      const greenLayerId = `${wordId}-green`;
      chromaticGroup.childrenData.push({
        id: greenLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            position: 'absolute' as any,
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: 'rgba(0,255,0,0.7)',
            mixBlendMode: 'screen' as any,
            textShadow: '0 0 20px rgba(0,255,0,0.5)',
            marginRight: '0.1em',
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
          {
            id: `${greenLayerId}-aberration`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: wordStartRelative,
              duration: Math.min(params.animationDuration * 0.5 * impact, wordDurationRelative * 2),
              mode: 'provider',
              targetIds: [greenLayerId],
              ranges: [
                { key: 'translateX', val: 0, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
              ],
            },
          },
          {
            id: `${greenLayerId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: wordStartRelative,
              duration: Math.min(0.3 * impact, wordDurationRelative),
              mode: 'provider',
              targetIds: [greenLayerId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      });

      // Blue channel layer
      const blueLayerId = `${wordId}-blue`;
      chromaticGroup.childrenData.push({
        id: blueLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            position: 'absolute' as any,
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 700,
            fontStyle: fontStyle.fontStyle || 'normal',
            color: 'rgba(0,100,255,0.7)',
            mixBlendMode: 'screen' as any,
            textShadow: '0 0 20px rgba(0,100,255,0.5)',
            marginRight: '0.1em',
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
          {
            id: `${blueLayerId}-aberration`,
            componentId: 'generic',
            data: {
              type: 'spring',
              start: wordStartRelative,
              duration: Math.min(params.animationDuration * 0.5 * impact, wordDurationRelative * 2),
              mode: 'provider',
              targetIds: [blueLayerId],
              ranges: [
                { key: 'translateX', val: params.chromaticAberrationAmount * 3, prog: 0 },
                { key: 'translateX', val: params.chromaticAberrationAmount, prog: 1 },
              ],
            },
          },
          {
            id: `${blueLayerId}-opacity`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: wordStartRelative,
              duration: Math.min(0.3 * impact, wordDurationRelative),
              mode: 'provider',
              targetIds: [blueLayerId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 0.7, prog: 1 },
              ],
            },
          },
        ],
      });
    });

    // Clip-path reveal effect on chromatic group
    chromaticGroup.effects = [
      {
        id: `${chromaticGroupId}-reveal`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: Math.min(params.animationDuration * 0.6 * impact, caption.duration),
          mode: 'provider',
          targetIds: [chromaticGroupId],
          ranges: [
            { key: 'clipPath', val: 'inset(50% 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0)', prog: 1 },
          ],
        },
      },
      {
        id: `${chromaticGroupId}-blur`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: Math.min(params.animationDuration * 0.4 * impact, caption.duration),
          mode: 'provider',
          targetIds: [chromaticGroupId],
          ranges: [
            { key: 'filter', val: 'blur(5px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: `${chromaticGroupId}-brightness`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: Math.min(params.animationDuration * 0.8 * impact, caption.duration),
          mode: 'provider',
          targetIds: [chromaticGroupId],
          ranges: [
            { key: 'brightness', val: 1.0, prog: 0 },
            { key: 'brightness', val: params.peakBrightness, prog: 0.5 },
            { key: 'brightness', val: params.finalBrightness, prog: 1 },
          ],
        },
      },
      {
        id: `${chromaticGroupId}-letter-spacing`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: Math.min(params.animationDuration * 0.6 * impact, caption.duration),
          mode: 'provider',
          targetIds: [chromaticGroupId],
          ranges: [
            { key: 'letterSpacing', val: '0.2em', prog: 0 },
            { key: 'letterSpacing', val: '0.1em', prog: 1 },
          ],
        },
      },
    ];

    captionContainer.childrenData.push(chromaticGroup);

    // Metallic highlight layer (sweeping highlight)
    const highlightLayerId = `${captionId}-highlight`;
    captionContainer.childrenData.push({
      id: highlightLayerId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%); background-size: 200% 100%; mix-blend-mode: overlay;"></div>`,
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 7,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [
        {
          id: `${highlightLayerId}-sweep`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: Math.min(params.animationDuration * 0.3 * impact, caption.duration * 0.3),
            duration: Math.min(params.animationDuration * 0.7 * impact, caption.duration * 0.6),
            mode: 'provider',
            targetIds: [highlightLayerId],
            ranges: [
              { key: 'backgroundPositionX', val: '0%', prog: 0 },
              { key: 'backgroundPositionX', val: '100%', prog: 1 },
            ],
          },
        },
      ],
    });

    childrenData.push(captionContainer);
  });

  // Root container
  const rootContainer: any = {
    id: 'anamorphic-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-900 to-black',
        style: {
          filter: 'contrast(1.2) brightness(1.1)',
          overflow: 'hidden',
        },
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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

// --- METADATA ---

const presetMetadata: PresetMetadata = {
  id: 'anamorphicLensFlareTypokinetics',
  title: 'Anamorphic Lens Flare Typokinetics',
  description:
    'A cinematic typokinetics preset inspired by sci-fi blockbuster aesthetics featuring anamorphic lens flares, chromatic aberration text treatments, metallic sheen highlights, and power-up brightness effects. Text appears to materialize from light with horizontal flares stretching across the frame, RGB channel separation that converges into focus, vertical clip-path reveal animation, and film grain/vignette overlays for authentic cinematic quality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typokinetics',
    'cinematic',
    'sci-fi',
    'anamorphic',
    'lens-flare',
    'chromatic-aberration',
    'rgb-split',
    'light-burst',
    'metallic',
    'film-grain',
    'vignette',
    'text-effects',
    'captions',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'LIGHT BURST',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [
          {
            id: 'word-1',
            text: 'LIGHT',
            start: 0,
            end: 1.5,
            duration: 1.5,
            absoluteStart: 0,
            absoluteEnd: 1.5,
            confidence: 1.0,
          },
          {
            id: 'word-2',
            text: 'BURST',
            start: 1.5,
            end: 3,
            duration: 1.5,
            absoluteStart: 1.5,
            absoluteEnd: 3,
            confidence: 1.0,
          },
        ],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    defaultImpact: 1.0,
    animationDuration: 3.0,
    wordDelay: 0.1,
    chromaticAberrationAmount: 2,
    flareIntensity: 1.0,
    vignetteIntensity: 0.7,
    filmGrainOpacity: 0.08,
    peakBrightness: 1.8,
    finalBrightness: 1.2,
  },
};

// --- EXPORT ---

export const anamorphicLensFlareTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
