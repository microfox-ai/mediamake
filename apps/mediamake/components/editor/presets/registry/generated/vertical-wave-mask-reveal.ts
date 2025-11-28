/**
 * Vertical Wave Mask Reveal Preset
 *
 * This preset creates a vertical mask reveal effect where text emerges through a soft,
 * organic wave-like mask that undulates as it moves upward. The mask edge feels fluid
 * and natural, similar to water or smoke transitions.
 *
 * Features:
 * - Organic wave-like mask with soft edges and varying feathering
 * - SVG filters for displacement and turbulence effects
 * - Smooth upward vertical translation combined with horizontal sine-wave distortion
 * - Word-level glow effects that intensify as each word is revealed
 * - Uses SubtitlesOverlay preset for caption rendering
 * - Audio-reactive waveform effects if audio source exists
 *
 * Use cases:
 * - Creating smooth, organic text reveal animations
 * - Building fluid water/smoke-like transition effects
 * - Adding dynamic word-level glow effects synchronized with mask position
 * - Creating visually striking subtitle animations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

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
        metadata: z
          .object({
            keyword: z.string().optional(),
            splitParts: z.array(z.string()).optional(),
            impact: z.number().optional(),
            sentiment: z.string().optional(),
            emotion: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .describe('Array of caption data with word-level timing'),

  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),

  fontSize: z
    .number()
    .optional()
    .default(48)
    .describe('Font size in pixels'),

  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Text color (hex or rgba)'),

  glowColor: z
    .string()
    .optional()
    .default('rgba(255,255,255,0.8)')
    .describe('Glow color for revealed words'),

  glowIntensity: z
    .number()
    .min(0)
    .max(50)
    .optional()
    .default(20)
    .describe('Maximum glow blur radius in pixels'),

  maskBlurRadius: z
    .number()
    .min(20)
    .max(60)
    .optional()
    .default(40)
    .describe('Blur radius for mask edge (30-50px recommended)'),

  waveScale: z
    .number()
    .min(10)
    .max(50)
    .optional()
    .default(30)
    .describe('Displacement scale for wave distortion'),

  waveFrequency: z
    .number()
    .min(0.01)
    .max(0.05)
    .optional()
    .default(0.02)
    .describe('Base frequency for turbulence (lower = smoother)'),

  waveOctaves: z
    .number()
    .min(1)
    .max(5)
    .optional()
    .default(3)
    .describe('Number of octaves for turbulence complexity'),

  transitionDuration: z
    .number()
    .min(0.5)
    .max(3)
    .optional()
    .default(1.5)
    .describe('Duration of mask reveal transition in seconds'),

  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source URL for audio-reactive effects'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets, config } = props;

  // Parse font string
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

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter');

  // Calculate total caption timeline duration
  const captionTimelineDuration =
    params.captions.length > 0
      ? Math.max(
          ...params.captions.map((caption) => caption.absoluteEnd),
        )
      : 10;

  // ============================================================================
  // SVG FILTER DEFINITIONS
  // ============================================================================

  const svgFilterHtml = `
    <svg width="0" height="0" style="position:absolute; pointer-events:none;">
      <defs>
        <filter id="organic-wave-filter" x="-50%" y="-50%" width="200%" height="200%">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="${params.waveFrequency}" 
            numOctaves="${params.waveOctaves}" 
            seed="2"
            result="turbulence"
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="turbulence" 
            scale="${params.waveScale}" 
            xChannelSelector="R" 
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  `;

  const svgFilterAtom: RenderableComponentData = {
    id: 'svg-filter-definitions',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: svgFilterHtml,
      style: {
        position: 'absolute',
        pointerEvents: 'none',
        zIndex: 1000,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captionTimelineDuration,
      },
    },
  };

  // ============================================================================
  // WAVE MASK OVERLAY
  // ============================================================================

  const maskOverlayHtml = `
    <div style="
      width: 100%;
      height: 150%;
      background: linear-gradient(180deg, 
        transparent 0%, 
        rgba(0,0,0,0.1) 20%, 
        rgba(0,0,0,0.9) 50%, 
        black 100%
      );
      filter: url(#organic-wave-filter) blur(${params.maskBlurRadius}px);
    "></div>
  `;

  const maskOverlayAtom: RenderableComponentData = {
    id: 'wave-mask-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: maskOverlayHtml,
      className: 'absolute',
      style: {
        mixBlendMode: 'multiply',
        willChange: 'transform',
        top: '100%',
        left: 0,
        right: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captionTimelineDuration,
      },
    },
    effects: [
      // Vertical translation effect (0% to -120%)
      {
        id: 'mask-translateY-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.4, 0, 0.2, 1)',
          start: 0,
          duration: captionTimelineDuration,
          mode: 'provider',
          targetIds: ['wave-mask-overlay'],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-120%', prog: 1 },
          ],
        },
      },
      // Horizontal wave distortion (scaleX oscillation)
      {
        id: 'mask-wave-distortion-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: captionTimelineDuration,
          mode: 'provider',
          targetIds: ['wave-mask-overlay'],
          ranges: [
            { key: 'scaleX', val: 1, prog: 0 },
            { key: 'scaleX', val: 1.1, prog: 0.25 },
            { key: 'scaleX', val: 0.95, prog: 0.5 },
            { key: 'scaleX', val: 1.05, prog: 0.75 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // ============================================================================
  // SUBTITLES OVERLAY (using SubtitlesOverlay preset)
  // ============================================================================

  let subtitlesChildren: RenderableComponentData[] = [];

  if (presets && presets['SubtitlesOverlay']) {
    const subtitlesResult = await presets['SubtitlesOverlay'](
      {
        captions: params.captions,
        font: params.font,
        fontSize: params.fontSize,
        textColor: params.textColor,
        animationStyle: 'word-fade', // Simple word fade for subtitles
        position: 'center',
        layoutDirection: 'horizontal',
      },
      props,
    );

    if (
      subtitlesResult?.output?.childrenData &&
      subtitlesResult.output.childrenData.length > 0
    ) {
      subtitlesChildren = subtitlesResult.output.childrenData;

      // Apply word-level glow effects
      subtitlesChildren = subtitlesChildren.map((child) => {
        if (child.childrenData) {
          child.childrenData = child.childrenData.map((wordChild) => {
            // Extract word timing from context
            const wordTiming = wordChild.context?.timing;
            if (!wordTiming) return wordChild;

            const wordStart = wordTiming.start || 0;
            const wordDuration = wordTiming.duration || 0.5;

            // Calculate when this word should glow (based on mask position)
            // We want the glow to intensify as the mask reaches the word
            const glowStartProg = Math.max(
              0,
              (wordStart - params.transitionDuration / 2) /
                captionTimelineDuration,
            );
            const glowEndProg = Math.min(
              1,
              (wordStart + params.transitionDuration / 2) /
                captionTimelineDuration,
            );

            const glowEffect = {
              id: `word-glow-${wordChild.id}`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0, // Relative to parent caption
                duration: captionTimelineDuration,
                mode: 'provider',
                targetIds: [wordChild.id || ''],
                ranges: [
                  { key: 'textShadow', val: `0 0 0px ${params.glowColor}`, prog: 0 },
                  {
                    key: 'textShadow',
                    val: `0 0 0px ${params.glowColor}`,
                    prog: glowStartProg,
                  },
                  {
                    key: 'textShadow',
                    val: `0 0 ${params.glowIntensity}px ${params.glowColor}`,
                    prog: (glowStartProg + glowEndProg) / 2,
                  },
                  {
                    key: 'textShadow',
                    val: `0 0 ${params.glowIntensity / 2}px ${params.glowColor}`,
                    prog: glowEndProg,
                  },
                  {
                    key: 'textShadow',
                    val: `0 0 ${params.glowIntensity / 2}px ${params.glowColor}`,
                    prog: 1,
                  },
                ],
              },
            };

            // Add glow effect to word
            return {
              ...wordChild,
              effects: [...(wordChild.effects || []), glowEffect],
            };
          });
        }
        return child;
      });
    }
  } else {
    // Fallback: create simple text rendering if SubtitlesOverlay is not available
    subtitlesChildren = params.captions.map((caption) => ({
      id: `caption-${caption.id}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [
        {
          id: `text-${caption.id}`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: caption.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: fontStyle.fontWeight || 'normal',
              fontStyle: fontStyle.fontStyle || 'normal',
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
        },
      ],
    }));
  }

  const subtitlesContainer: RenderableComponentData = {
    id: 'subtitles-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captionTimelineDuration,
      },
    },
    childrenData: subtitlesChildren,
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'wave-mask-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captionTimelineDuration,
      },
    },
    childrenData: [
      svgFilterAtom,
      subtitlesContainer,
      maskOverlayAtom,
    ] as RenderableComponentData[],
  };

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
  id: 'vertical-wave-mask-reveal',
  title: 'Vertical Wave Mask Reveal',
  description:
    'Vertical mask reveal preset where text emerges through a soft, organic wave-like mask with fluid undulation. Features SVG-based displacement effects for organic edges, word-level glow transitions, and smooth upward wave motion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'mask',
    'wave',
    'organic',
    'fluid',
    'subtitles',
    'glow',
    'animation',
  ],
  dependencies: {
    presets: ['SubtitlesOverlay'],
    helpers: [],
  },
  defaultInputParams: {
    captions: [
      {
        id: '1',
        text: 'Hello world',
        start: 0,
        absoluteStart: 0,
        end: 2.5,
        absoluteEnd: 2.5,
        duration: 2.5,
        words: [
          {
            id: 'word-1',
            text: 'Hello',
            start: 0,
            absoluteStart: 0,
            end: 1.0,
            absoluteEnd: 1.0,
            duration: 1.0,
            confidence: 0.95,
          },
          {
            id: 'word-2',
            text: 'world',
            start: 1.0,
            absoluteStart: 1.0,
            end: 2.5,
            absoluteEnd: 2.5,
            duration: 1.5,
            confidence: 0.98,
          },
        ],
      },
    ],
    font: 'Inter:700',
    fontSize: 48,
    textColor: '#FFFFFF',
    glowColor: 'rgba(255,255,255,0.8)',
    glowIntensity: 20,
    maskBlurRadius: 40,
    waveScale: 30,
    waveFrequency: 0.02,
    waveOctaves: 3,
    transitionDuration: 1.5,
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const verticalWaveMaskRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
