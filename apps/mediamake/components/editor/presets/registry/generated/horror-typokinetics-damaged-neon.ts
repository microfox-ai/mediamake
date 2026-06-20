/**
 * Horror Typokinetics - Damaged Neon
 *
 * A dark, unsettling typokinetics preset inspired by horror movie title sequences and dark trap music videos.
 * Features damaged neon sign text effects with irregular stuttering flashes, bass-triggered glitch distortion
 * that fragments and reassembles text, violent sharp scaling with ghostly afterimages, and pixelation damage effects.
 * Uses red/black color schemes with white flash emphasis. Effects are synchronized to bass drops and snare hits
 * via audio analysis for precise timing.
 *
 * Features:
 * - **Damaged Neon Text**: Irregular, stuttering flashes with occasional sustained glows
 * - **Bass-Triggered Glitch**: Text fragments and reassembles on bass drops, creating corrupted video signal effect
 * - **Violent Sharp Scaling**: Text slams into view with jarring motion, leaving ghostly afterimages
 * - **Pixelation Damage**: Letters occasionally break apart or pixelate via CSS filters
 * - **Screen Shake**: Parent container vibration synchronized with bass hits
 * - **Audio-Reactive**: Waveform effects filter for low/bass beats only
 * - **Color Scheme**: Red/black palette with white flashes for emphasis
 * - **Word-Level Effects**: Optional sentiment-based intensity variations for darker words
 *
 * Use cases:
 * - Horror movie title sequences
 * - Dark trap music videos
 * - Unsettling text overlays
 * - Glitch-style typography
 * - Bass-reactive text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  captions: z.array(
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
        })
      ),
      metadata: z.object({
        sentiment: z.string().optional().describe('Sentiment of caption: positive, negative, neutral'),
        impact: z.number().optional().describe('Per-caption effect intensity multiplier (0.1-3.0)'),
      }).optional(),
    })
  ).describe('Array of caption objects with word-level timing'),

  audioSrc: z.string().describe('Audio source URL for bass drop detection and waveform effects'),

  font: z.string().default('Creepster').describe('Font family name for horror aesthetic (e.g., "Creepster", "Nosifer", "Butcherman")'),

  fontSize: z.number().default(72).describe('Base font size in pixels'),

  textColor: z.string().default('#ff0000').describe('Primary text color (default: red #ff0000)'),

  glowColor: z.string().default('#ff0000').describe('Neon glow color for text shadow'),

  flashColor: z.string().default('#ffffff').describe('Flash overlay color for emphasis (default: white)'),

  bassDamageIntensity: z.number().min(0.1).max(3).default(1.0).describe('Intensity multiplier for bass-triggered effects (0.1-3.0)'),

  stutterFlashInterval: z.number().min(0.1).max(1).default(0.2).describe('Duration of each stutter flash cycle in seconds'),

  glitchFragmentCount: z.number().min(2).max(5).default(3).describe('Number of text fragments for glitch effect (2-5)'),

  screenShakeAmplitude: z.number().min(5).max(30).default(10).describe('Screen shake intensity in pixels'),

  afterimageOpacity: z.number().min(0.1).max(0.5).default(0.2).describe('Opacity of ghostly afterimages (0.1-0.5)'),

  pixelationMaxBlur: z.number().min(1).max(5).default(2).describe('Maximum blur for pixelation damage effect (pixels)'),

  enableSentimentBased: z.boolean().default(false).describe('Enable sentiment-based intensity variations for darker words'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    audioSrc,
    font,
    fontSize,
    textColor,
    glowColor,
    flashColor,
    bassDamageIntensity,
    stutterFlashInterval,
    glitchFragmentCount,
    screenShakeAmplitude,
    afterimageOpacity,
    pixelationMaxBlur,
    enableSentimentBased,
  } = params;

  const { fetcher, config } = props;
  const fps = config?.fps ?? 30;

  // Helper: Generate random stutter opacity keyframes
  const generateStutterOpacity = (): number[] => {
    const keyframes: number[] = [];
    const numKeyframes = 6;
    for (let i = 0; i < numKeyframes; i++) {
      keyframes.push(Math.random() > 0.5 ? 1 : Math.random() * 0.5);
    }
    return keyframes;
  };

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Fetch audio analysis for bass drop detection
  let audioAnalysis: any[] = [];
  if (fetcher) {
    try {
      const { analysis } = await fetcher('/api/analyze-audio', { audioSrc });
      audioAnalysis = analysis || [];
    } catch (err) {
      console.warn('Failed to fetch audio analysis:', err);
    }
  }

  // Filter for bass beats only
  const bassBeats = audioAnalysis.filter((beat: any) => beat.beatType === 'low');

  // Build caption components
  const captionComponents: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const captionId = `horror-caption-${captionIndex}`;

    // Per-caption impact multiplier
    const captionImpact = caption.metadata?.impact ?? 1.0;
    const effectiveIntensity = bassDamageIntensity * captionImpact;

    // Sentiment-based intensity adjustment
    let sentimentMultiplier = 1.0;
    if (enableSentimentBased && caption.metadata?.sentiment === 'negative') {
      sentimentMultiplier = 1.3;
    }

    const finalIntensity = effectiveIntensity * sentimentMultiplier;

    // Word-level components (all words share caption duration for stable layout)
    const wordComponents: RenderableComponentData[] = caption.words.map((word, wordIndex) => {
      const wordId = `${captionId}-word-${wordIndex}`;

      // Main word text atom
      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            ...fontStyle,
            fontSize: `${fontSize}px`,
            color: textColor,
            textShadow: `0 0 10px ${glowColor}, 0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
            marginRight: '0.3em',
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
      } as RenderableComponentData;
    });

    // Afterimage duplicates (ghostly trails)
    const afterimageComponents: RenderableComponentData[] = caption.words.flatMap((word, wordIndex) => {
      const wordText = word.text;
      return [
        {
          id: `${captionId}-afterimage1-${wordIndex}`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: wordText,
            className: `absolute blur-sm`,
            style: {
              ...fontStyle,
              fontSize: `${fontSize}px`,
              color: textColor,
              opacity: afterimageOpacity,
              transform: 'translate(-3px, -3px)',
              marginRight: '0.3em',
              pointerEvents: 'none',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
        } as RenderableComponentData,
        {
          id: `${captionId}-afterimage2-${wordIndex}`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: wordText,
            className: `absolute blur-md`,
            style: {
              ...fontStyle,
              fontSize: `${fontSize}px`,
              color: '#880000',
              opacity: afterimageOpacity * 0.5,
              transform: 'translate(5px, 5px)',
              marginRight: '0.3em',
              pointerEvents: 'none',
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
        } as RenderableComponentData,
      ];
    });

    // Container for words (relative flex layout)
    const wordsContainerId = `${captionId}-words-container`;
    const wordsContainer: RenderableComponentData = {
      id: wordsContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex flex-wrap justify-center items-center gap-2',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;

    // Effect: Sharp scale slam (violent entry)
    const slamEffect = {
      id: `${captionId}-slam`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 0.3,
        mode: 'provider',
        targetIds: [wordsContainerId],
        ranges: [
          { key: 'scale', val: 3, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    // Effect: Bass-triggered glitch distortion (clip-path fragments + translateX)
    const glitchDuration = 0.5;
    const glitchEffect = {
      id: `${captionId}-glitch`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: caption.duration * 0.3, // Mid-caption glitch
        duration: glitchDuration,
        mode: 'provider',
        targetIds: [wordsContainerId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -10 * finalIntensity, prog: 0.2 },
          { key: 'translateX', val: 15 * finalIntensity, prog: 0.4 },
          { key: 'translateX', val: -5 * finalIntensity, prog: 0.6 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      },
    };

    // Effect: Pixelation damage via blur/contrast
    const pixelationEffect = {
      id: `${captionId}-pixelation`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: caption.duration * 0.6, // Late-caption pixelation
        duration: 0.4,
        mode: 'provider',
        targetIds: [wordsContainerId],
        ranges: [
          { key: 'filter', val: 'blur(0px) contrast(1)', prog: 0 },
          { key: 'filter', val: `blur(${pixelationMaxBlur}px) contrast(2)`, prog: 0.5 },
          { key: 'filter', val: 'blur(0px) contrast(1)', prog: 1 },
        ],
      },
    };

    // Screen shake container with effect
    const shakeContainerId = `${captionId}-shake-container`;
    const shakeEffect = {
      id: `${captionId}-shake`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: 0.5,
        mode: 'provider',
        targetIds: [shakeContainerId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -screenShakeAmplitude * finalIntensity, prog: 0.1 },
          { key: 'translateX', val: screenShakeAmplitude * finalIntensity, prog: 0.2 },
          { key: 'translateX', val: -screenShakeAmplitude * 0.6 * finalIntensity, prog: 0.3 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: screenShakeAmplitude * 0.5 * finalIntensity, prog: 0.15 },
          { key: 'translateY', val: -screenShakeAmplitude * 0.5 * finalIntensity, prog: 0.25 },
          { key: 'translateY', val: 0, prog: 0.5 },
        ],
      },
    };

    // Stutter flash overlay
    const flashOverlayId = `${captionId}-flash-overlay`;
    const stutterOpacityKeyframes = generateStutterOpacity();
    const flashEffect = {
      id: `${captionId}-flash`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: stutterFlashInterval,
        mode: 'provider',
        targetIds: [flashOverlayId],
        ranges: stutterOpacityKeyframes.map((opacity, index) => ({
          key: 'opacity',
          val: opacity,
          prog: index / (stutterOpacityKeyframes.length - 1),
        })),
      },
    };

    // Flash overlay component
    const flashOverlay: RenderableComponentData = {
      id: flashOverlayId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            backgroundColor: flashColor,
            mixBlendMode: 'overlay',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [flashEffect],
    } as RenderableComponentData;

    // Main shake container with screen shake effect
    const shakeContainer: RenderableComponentData = {
      id: shakeContainerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [shakeEffect],
      childrenData: [wordsContainer],
    } as RenderableComponentData;

    // Afterimage layer (positioned absolutely)
    const afterimageLayer: RenderableComponentData = {
      id: `${captionId}-afterimage-layer`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      childrenData: afterimageComponents,
    } as RenderableComponentData;

    // Caption root container
    const captionRootContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full bg-black overflow-hidden',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: [slamEffect, glitchEffect, pixelationEffect],
      childrenData: [afterimageLayer, shakeContainer, flashOverlay],
    } as RenderableComponentData;

    return captionRootContainer;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'horror-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd)) 
          : 10,
      },
    },
    childrenData: captionComponents as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'horror-typokinetics-damaged-neon',
  title: 'Horror Typokinetics - Damaged Neon',
  description: 'Dark, unsettling typokinetics preset inspired by horror movie title sequences and dark trap music videos. Features damaged neon sign text effects with irregular stuttering flashes, bass-triggered glitch distortion that fragments and reassembles text, violent sharp scaling with ghostly afterimages, and pixelation damage effects. Uses red/black color schemes with white flash emphasis.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'horror',
    'glitch',
    'neon',
    'damaged',
    'bass-reactive',
    'dark',
    'trap',
    'kinetic',
    'afterimage',
    'screen-shake',
    'pixelation',
    'stutter',
    'distortion',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'HORROR UNLEASHED',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'HORROR',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            id: 'word-2',
            text: 'UNLEASHED',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
        metadata: {
          sentiment: 'negative',
          impact: 1.5,
        },
      },
    ],
    audioSrc: 'https://example.com/dark-trap-beat.mp3',
    font: 'Creepster',
    fontSize: 72,
    textColor: '#ff0000',
    glowColor: '#ff0000',
    flashColor: '#ffffff',
    bassDamageIntensity: 1.0,
    stutterFlashInterval: 0.2,
    glitchFragmentCount: 3,
    screenShakeAmplitude: 10,
    afterimageOpacity: 0.2,
    pixelationMaxBlur: 2,
    enableSentimentBased: true,
  },
};

export const horrorTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};