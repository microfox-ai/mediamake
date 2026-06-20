/**
 * MTV 90s Typokinetics VJ Tunnel Preset
 *
 * A typokinetics preset inspired by 90s MTV music video typography and electronic music VJ aesthetics.
 * Features depth tunnel effect with multiple word layers at different z-depths, RGB chromatic aberration 
 * driven by bass frequencies (20-200Hz), cannon-shot spring scaling with motion blur trails, and neon glow 
 * pulsing synced to mid-frequencies. Words flash in beat-aligned patterns following musical measures.
 *
 * Key Features:
 * - Depth tunnel effect using transform: perspective + translateZ()
 * - RGB chromatic aberration (red/cyan channel splitting) driven by bass (20-200Hz)
 * - Spring-based cannon-shot scaling with motion blur trails
 * - Neon glow pulsing synced to mid-frequencies (200-2000Hz)
 * - Beat-aligned word flashing (modulo-based timing)
 * - Mix-blend-mode: screen for RGB channel compositing
 *
 * Technical Implementation:
 * - Uses BaseLayout with perspective(1000px) for 3D depth effect
 * - Three depth layers (back: -300px, mid: -100px, front: 0px)
 * - Waveform effects for bass-driven RGB splitting and mid-frequency glow
 * - Spring easing (damping: 0.3, stiffness: 300) for explosive scaling
 * - Motion blur via staggered opacity trails
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, WaveformEffectData, TextAtomData } from '@microfox/remotion';

// ============================================================================
// PARAMETER SCHEMA
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
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  audioSrc: z
    .string()
    .describe('Audio source URL for waveform analysis (bass and mid-frequency detection)'),

  font: z
    .string()
    .default('Impact')
    .optional()
    .describe('Font family (format: "FontName:weight:style" or "FontName:weight" or "FontName")'),

  bassIntensity: z
    .number()
    .min(0.1)
    .max(5)
    .default(2.0)
    .optional()
    .describe('Sensitivity for bass-driven RGB split effect (default: 2.0)'),

  glowIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Sensitivity for mid-frequency glow pulsing (default: 1.5)'),

  scaleSpringDamping: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Spring damping for cannon-shot scaling (default: 0.3)'),

  scaleSpringStiffness: z
    .number()
    .min(100)
    .max(500)
    .default(300)
    .optional()
    .describe('Spring stiffness for cannon-shot scaling (default: 300)'),

  beatAlignment: z
    .enum(['half', 'full', 'quarter'])
    .default('half')
    .optional()
    .describe('Beat alignment pattern: half (0.5s), full (1.0s), quarter (0.25s)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    audioSrc,
    font = 'Impact',
    bassIntensity = 2.0,
    glowIntensity = 1.5,
    scaleSpringDamping = 0.3,
    scaleSpringStiffness = 300,
    beatAlignment = 'half',
  } = params;

  // Parse font configuration
  const parseFontString = (fontString: string) => {
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
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Beat alignment modulo
  const beatModulo = beatAlignment === 'half' ? 0.5 : beatAlignment === 'full' ? 1.0 : 0.25;

  // Helper: Check if word should flash based on beat alignment
  const shouldFlash = (wordStart: number): boolean => {
    return Math.abs((wordStart % beatModulo) - 0) < 0.05; // Tolerance of 0.05s
  };

  // Create depth layers for each caption
  const allCaptionLayers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;

    // Filter words that should flash based on beat alignment
    const flashingWords = caption.words.filter((word) => shouldFlash(word.start));

    if (flashingWords.length === 0) return; // Skip captions with no flashing words

    flashingWords.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;

      // ========================================================================
      // DEPTH LAYER: BACK (translateZ: -300px, opacity: 0.4)
      // ========================================================================

      const backLayerId = `${wordId}-back`;
      const backRedId = `${backLayerId}-red`;
      const backCyanId = `${backLayerId}-cyan`;
      const backMainId = `${backLayerId}-main`;

      const backLayer: RenderableComponentData = {
        id: backLayerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              zIndex: 1,
              transform: 'translateZ(-300px)',
              opacity: 0.4,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart + word.start,
            duration: word.duration,
          },
        },
        childrenData: [
          // Red channel (RGB split)
          {
            id: backRedId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '80px',
                fontWeight: 900,
                color: 'red',
                position: 'absolute',
                mixBlendMode: 'screen',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          // Cyan channel (RGB split)
          {
            id: backCyanId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '80px',
                fontWeight: 900,
                color: 'cyan',
                position: 'absolute',
                mixBlendMode: 'screen',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          // Main white channel
          {
            id: backMainId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '80px',
                fontWeight: 900,
                color: 'white',
                position: 'absolute',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
        ] as RenderableComponentData[],
      };

      // ========================================================================
      // DEPTH LAYER: MID (translateZ: -100px, opacity: 0.7)
      // ========================================================================

      const midLayerId = `${wordId}-mid`;
      const midRedId = `${midLayerId}-red`;
      const midCyanId = `${midLayerId}-cyan`;
      const midMainId = `${midLayerId}-main`;

      const midLayer: RenderableComponentData = {
        id: midLayerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              zIndex: 5,
              transform: 'translateZ(-100px)',
              opacity: 0.7,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart + word.start,
            duration: word.duration,
          },
        },
        childrenData: [
          {
            id: midRedId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '120px',
                fontWeight: 900,
                color: 'red',
                position: 'absolute',
                mixBlendMode: 'screen',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          {
            id: midCyanId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '120px',
                fontWeight: 900,
                color: 'cyan',
                position: 'absolute',
                mixBlendMode: 'screen',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          {
            id: midMainId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '120px',
                fontWeight: 900,
                color: 'white',
                position: 'absolute',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
        ] as RenderableComponentData[],
      };

      // ========================================================================
      // DEPTH LAYER: FRONT (translateZ: 0px, opacity: 1) + Motion Blur Trails
      // ========================================================================

      const frontLayerId = `${wordId}-front`;
      const frontRedId = `${frontLayerId}-red`;
      const frontCyanId = `${frontLayerId}-cyan`;
      const frontMainId = `${frontLayerId}-main`;
      const trail1Id = `${frontLayerId}-trail-1`;
      const trail2Id = `${frontLayerId}-trail-2`;
      const trail3Id = `${frontLayerId}-trail-3`;

      const frontLayer: RenderableComponentData = {
        id: frontLayerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center',
            style: {
              zIndex: 10,
              transform: 'translateZ(0px)',
              opacity: 1,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart + word.start,
            duration: word.duration,
          },
        },
        childrenData: [
          {
            id: frontRedId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '160px',
                fontWeight: 900,
                color: 'red',
                position: 'absolute',
                mixBlendMode: 'screen',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          {
            id: frontCyanId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '160px',
                fontWeight: 900,
                color: 'cyan',
                position: 'absolute',
                mixBlendMode: 'screen',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          {
            id: frontMainId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '160px',
                fontWeight: 900,
                color: 'white',
                position: 'absolute',
                textShadow: '0 0 20px #ff00ff, 0 0 40px #ff00ff, 0 0 60px #ff00ff',
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          // Motion blur trails
          {
            id: trail1Id,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '160px',
                fontWeight: 900,
                color: 'white',
                position: 'absolute',
                opacity: 0.3,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          {
            id: trail2Id,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '160px',
                fontWeight: 900,
                color: 'white',
                position: 'absolute',
                opacity: 0.15,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
          {
            id: trail3Id,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: '160px',
                fontWeight: 900,
                color: 'white',
                position: 'absolute',
                opacity: 0.05,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
              },
            } as TextAtomData,
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
          },
        ] as RenderableComponentData[],
      };

      // ========================================================================
      // EFFECTS: Bass RGB Split (Waveform) + Scale Spring + Glow Pulse
      // ========================================================================

      // Bass-driven RGB split (red channel)
      const bassRGBRedEffect: WaveformEffectData = {
        audioSrc,
        audioProperty: 'bass',
        effectType: 'translateX',
        sensitivity: bassIntensity,
        threshold: 0.1,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: [backRedId, midRedId, frontRedId],
        start: 0,
        duration: word.duration,
        minValue: -8,
        maxValue: 8,
        smoothNormalisation: 1,
      };

      // Bass-driven RGB split (cyan channel - opposite direction)
      const bassRGBCyanEffect: WaveformEffectData = {
        audioSrc,
        audioProperty: 'bass',
        effectType: 'translateX',
        sensitivity: bassIntensity,
        threshold: 0.1,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: [backCyanId, midCyanId, frontCyanId],
        start: 0,
        duration: word.duration,
        minValue: 8,
        maxValue: -8,
        smoothNormalisation: 1,
      };

      // Spring-based cannon-shot scaling for main layers
      const scaleSpringEffect: GenericEffectData = {
        type: 'spring',
        start: 0,
        duration: 0.4,
        mode: 'provider',
        targetIds: [backMainId, midMainId, frontMainId],
        damping: scaleSpringDamping,
        stiffness: scaleSpringStiffness,
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.6 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      };

      // Motion blur trail 1 (delayed spring)
      const trail1Effect: GenericEffectData = {
        type: 'spring',
        start: 0.02,
        duration: 0.4,
        mode: 'provider',
        targetIds: [trail1Id],
        damping: scaleSpringDamping,
        stiffness: scaleSpringStiffness,
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.15, prog: 0.6 },
          { key: 'scale', val: 0.95, prog: 1 },
        ],
      };

      // Motion blur trail 2 (delayed spring)
      const trail2Effect: GenericEffectData = {
        type: 'spring',
        start: 0.04,
        duration: 0.4,
        mode: 'provider',
        targetIds: [trail2Id],
        damping: scaleSpringDamping,
        stiffness: scaleSpringStiffness,
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.1, prog: 0.6 },
          { key: 'scale', val: 0.9, prog: 1 },
        ],
      };

      // Motion blur trail 3 (delayed spring)
      const trail3Effect: GenericEffectData = {
        type: 'spring',
        start: 0.06,
        duration: 0.4,
        mode: 'provider',
        targetIds: [trail3Id],
        damping: scaleSpringDamping,
        stiffness: scaleSpringStiffness,
        ranges: [
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.6 },
          { key: 'scale', val: 0.85, prog: 1 },
        ],
      };

      // Mid-frequency glow pulsing for front main text
      const glowPulseEffect: WaveformEffectData = {
        audioSrc,
        audioProperty: 'mid',
        effectType: 'scale',
        sensitivity: glowIntensity,
        threshold: 0.1,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        mode: 'provider',
        targetIds: [frontMainId],
        start: 0,
        duration: word.duration,
        baseScale: 1,
        intensity: 0.1,
        smoothNormalisation: 1,
      };

      // Attach effects to layers
      backLayer.effects = [
        {
          id: `bass-rgb-red-${wordId}`,
          componentId: 'waveform',
          data: bassRGBRedEffect,
        },
        {
          id: `bass-rgb-cyan-${wordId}`,
          componentId: 'waveform',
          data: bassRGBCyanEffect,
        },
        {
          id: `scale-spring-${wordId}`,
          componentId: 'generic',
          data: scaleSpringEffect,
        },
      ];

      frontLayer.effects = [
        {
          id: `glow-pulse-${wordId}`,
          componentId: 'waveform',
          data: glowPulseEffect,
        },
        {
          id: `trail1-${wordId}`,
          componentId: 'generic',
          data: trail1Effect,
        },
        {
          id: `trail2-${wordId}`,
          componentId: 'generic',
          data: trail2Effect,
        },
        {
          id: `trail3-${wordId}`,
          componentId: 'generic',
          data: trail3Effect,
        },
      ];

      // Add all layers to the caption layers array
      allCaptionLayers.push(backLayer, midLayer, frontLayer);
    });
  });

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'mtv-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          background: 'linear-gradient(to bottom, #581c87, #000000)',
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'children',
      },
    },
    childrenData: allCaptionLayers,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'mtv-90s-typokinetics-vj-tunnel',
  title: 'MTV 90s Typokinetics VJ Tunnel',
  description:
    'A typokinetics preset inspired by 90s MTV music video typography and electronic music VJ aesthetics. Features depth tunnel effect with multiple word layers at different z-depths, RGB chromatic aberration driven by bass frequencies (20-200Hz), cannon-shot spring scaling with motion blur trails, and neon glow pulsing synced to mid-frequencies. Words flash in beat-aligned patterns following musical measures. Uses perspective transforms for depth, mix-blend-mode screen for RGB channel splitting, and staggered opacity trails for motion blur effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'mtv',
    '90s',
    'vj',
    'tunnel',
    'depth',
    'rgb-split',
    'chromatic-aberration',
    'bass-reactive',
    'audio-reactive',
    'neon',
    'glow',
    'motion-blur',
    'spring',
    'beat-aligned',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    audioSrc: '',
    font: 'Impact',
    bassIntensity: 2.0,
    glowIntensity: 1.5,
    scaleSpringDamping: 0.3,
    scaleSpringStiffness: 300,
    beatAlignment: 'half',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const mtv90sTypokineticsVjTunnelPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
