/**
 * Typokinetics Seismograph Preset
 *
 * This preset creates an industrial stencil text overlay that behaves like a seismograph
 * responding to kick drums. Text experiences horizontal compression waves that ripple
 * through letters from left to right (or center outward). The aesthetic is mechanical
 * and precise, resembling warning labels on heavy machinery with CRT monitor effects.
 *
 * Features:
 * - **Seismograph Response**: Text reacts to kick drum hits with compression waves
 * - **Horizontal Displacement**: Wave propagation through letters with staggered delays
 * - **Shock Absorber Mechanics**: Compression (scaleX 1.0 → 0.7) then rebound (1.1 → 1.0)
 * - **Industrial Stencil Aesthetic**: Monospace stencil fonts with mechanical feel
 * - **CRT Monitor Effect**: Scan lines, subtle border-radius, and vignette overlay
 * - **Power Surge**: Text brightens and scales up on strongest kicks
 * - **Technical Readout**: Industrial warning label styling with depth shadows
 *
 * Use cases:
 * - Music videos with heavy bass/kick drums
 * - Industrial or mechanical themed content
 * - Technical readout visualizations
 * - Cyberpunk or retrofuturistic aesthetics
 * - Audio-reactive typography for electronic music
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, WaveformEffectData } from '@microfox/remotion';

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
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  audio: z
    .object({
      src: z.string().describe('Audio source URL or ref:componentId'),
      duration: z.number().optional().describe('Audio duration in seconds'),
    })
    .describe('Audio source configuration for kick drum detection'),

  // Typography Configuration
  font: z
    .string()
    .default('Courier Prime:700')
    .describe(
      'Monospace stencil font (format: "FontName:weight", e.g., "Courier Prime:700", "OCR A:900")',
    ),

  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels for text display'),

  textColor: z
    .string()
    .default('#00ff00')
    .describe('Text color in hex format (default: terminal green #00ff00)'),

  letterSpacing: z
    .string()
    .default('0.1em')
    .describe('Letter spacing for stencil aesthetic'),

  // Compression Wave Configuration
  compressionIntensity: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.3)
    .describe(
      'Compression intensity (0.1 = subtle, 0.5 = extreme). Controls scaleX range (1.0 - intensity)',
    ),

  waveSpeed: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .describe(
      'Wave propagation speed in milliseconds per character (30ms = fast, 100ms = slow)',
    ),

  reboundOvershoot: z
    .number()
    .min(1.0)
    .max(1.3)
    .default(1.1)
    .describe(
      'Rebound overshoot scale (1.0 = no overshoot, 1.1 = 10% overshoot)',
    ),

  compressionDuration: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Compression phase duration in milliseconds'),

  reboundDuration: z
    .number()
    .min(100)
    .max(500)
    .default(250)
    .describe('Rebound phase duration in milliseconds'),

  // Kick Response Configuration
  kickSensitivity: z
    .number()
    .min(0.5)
    .max(3.0)
    .default(1.5)
    .describe('Kick drum detection sensitivity (1.0 = normal, 2.0 = very sensitive)'),

  kickThreshold: z
    .number()
    .min(0.0)
    .max(0.5)
    .default(0.2)
    .describe('Minimum audio level to trigger kick response (0.0 = all, 0.5 = strong only)'),

  powerSurgeIntensity: z
    .number()
    .min(0.0)
    .max(0.5)
    .default(0.3)
    .describe('Power surge brightness and scale increase on strongest kicks'),

  // CRT Effect Configuration
  scanlineOpacity: z
    .number()
    .min(0.0)
    .max(0.1)
    .default(0.03)
    .describe('Scan line opacity (0.0 = invisible, 0.1 = very visible)'),

  scanlineSpeed: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .describe('Scan line animation speed in seconds'),

  crtBorderOpacity: z
    .number()
    .min(0.0)
    .max(0.3)
    .default(0.1)
    .describe('CRT monitor border glow opacity'),

  vignetteStrength: z
    .number()
    .min(0.0)
    .max(1.0)
    .default(0.7)
    .describe('Vignette effect strength (0.0 = none, 1.0 = strong)'),

  // Layout Configuration
  textPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text on screen'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { config } = props;
  const fps = config?.fps || 30;

  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    let fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Helper: Calculate text position class
  const getPositionClass = (position: 'top' | 'center' | 'bottom'): string => {
    switch (position) {
      case 'top':
        return 'items-start pt-20';
      case 'bottom':
        return 'items-end pb-20';
      case 'center':
      default:
        return 'items-center';
    }
  };

  // Helper: Create compression wave effect for a word
  const createCompressionWaveEffect = (
    wordId: string,
    wordStart: number,
    wordDuration: number,
    wordText: string,
  ): GenericEffectData[] => {
    const effects: GenericEffectData[] = [];
    const charCount = wordText.length;

    // Calculate timing
    const compressionSec = params.compressionDuration / 1000;
    const reboundSec = params.reboundDuration / 1000;
    const totalCycleSec = compressionSec + reboundSec;

    // Compression scale range
    const minScale = 1.0 - params.compressionIntensity;
    const overshootScale = params.reboundOvershoot;

    // Create staggered compression wave for each character position
    for (let i = 0; i < charCount; i++) {
      const delayMs = i * params.waveSpeed;
      const delaySec = delayMs / 1000;

      // Skip if delay exceeds word duration
      if (delaySec >= wordDuration) continue;

      const effectStart = wordStart + delaySec;
      const effectDuration = Math.min(totalCycleSec, wordDuration - delaySec);

      // Calculate progress points for keyframes
      const compressionEndProg = compressionSec / effectDuration;
      const overshootEndProg = Math.min(
        (compressionSec + reboundSec * 0.5) / effectDuration,
        1.0,
      );

      const waveEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: effectStart,
        duration: effectDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          // Compression phase: 1.0 → minScale
          { key: 'scaleX', val: 1.0, prog: 0 },
          { key: 'scaleX', val: minScale, prog: compressionEndProg },
          // Rebound overshoot: minScale → overshootScale
          { key: 'scaleX', val: overshootScale, prog: overshootEndProg },
          // Settle back: overshootScale → 1.0
          { key: 'scaleX', val: 1.0, prog: 1.0 },
        ],
      };

      effects.push(waveEffect);
    }

    return effects;
  };

  // Create child components for all caption words
  const createCaptionComponents = (): RenderableComponentData[] => {
    const captionContainers: RenderableComponentData[] = [];

    params.captions.forEach((caption, capIndex) => {
      const words = caption.words;
      if (!words || words.length === 0) return;

      // Create word components with compression wave effects
      const wordComponents: RenderableComponentData[] = words.map(
        (word, wordIndex) => {
          const wordId = `word-${capIndex}-${wordIndex}`;

          // Create compression wave effect
          const compressionEffects = createCompressionWaveEffect(
            wordId,
            0, // Relative to word component start
            word.duration,
            word.text,
          );

          // Create power surge effect (waveform-based)
          const powerSurgeEffect: WaveformEffectData = {
            audioSrc: params.audio.src,
            audioProperty: 'bass',
            effectType: 'zoom',
            intensity: params.powerSurgeIntensity,
            baseScale: 1.0,
            sensitivity: params.kickSensitivity,
            threshold: params.kickThreshold,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / fps,
            mode: 'provider',
            targetIds: [wordId],
            start: 0,
            duration: word.duration,
            smoothNormalisation: 1,
          };

          // Brightness surge on kick
          const brightnessSurgeEffect: WaveformEffectData = {
            audioSrc: params.audio.src,
            audioProperty: 'bass',
            effectType: 'exposure',
            intensity: params.powerSurgeIntensity,
            baseBrightness: 1.0,
            sensitivity: params.kickSensitivity,
            threshold: params.kickThreshold,
            numberOfSamples: 128,
            useFrequencyData: true,
            windowInSeconds: 1 / fps,
            mode: 'provider',
            targetIds: [wordId],
            start: 0,
            duration: word.duration,
            smoothNormalisation: 1,
          };

          return {
            id: wordId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: params.fontSize,
                color: params.textColor,
                fontWeight: fontStyle.fontWeight || 900,
                letterSpacing: params.letterSpacing,
                textTransform: 'uppercase' as const,
                textShadow: `2px 2px 0 rgba(0, 0, 0, 0.5), 0 0 20px ${params.textColor}80`,
                fontFamily: fontFamily,
                marginRight: '0.3em',
              },
              font: {
                family: fontFamily,
                weights: [String(fontStyle.fontWeight || 700)],
                subsets: ['latin'],
                display: 'swap' as const,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: word.duration,
              },
            },
            effects: [
              // Compression wave effects (generic)
              ...compressionEffects.map((effectData, idx) => ({
                id: `compression-${wordId}-${idx}`,
                componentId: 'generic',
                data: effectData,
              })),
              // Power surge effect (waveform)
              {
                id: `power-surge-${wordId}`,
                componentId: 'waveform',
                data: powerSurgeEffect,
              },
              // Brightness surge effect (waveform)
              {
                id: `brightness-surge-${wordId}`,
                componentId: 'waveform',
                data: brightnessSurgeEffect,
              },
            ],
          } as RenderableComponentData;
        },
      );

      // Create sentence container
      const sentenceContainer: RenderableComponentData = {
        id: `caption-container-${capIndex}`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `flex flex-row flex-wrap ${getPositionClass(params.textPosition)} justify-center px-8`,
            style: {
              gap: `${params.fontSize * 0.2}px`,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      };

      captionContainers.push(sentenceContainer);
    });

    return captionContainers;
  };

  // Create overlay components
  const crtOverlay: RenderableComponentData = {
    id: 'crt-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          border: `2px solid rgba(0, 255, 0, ${params.crtBorderOpacity})`,
          borderRadius: '4px',
          boxShadow: `inset 0 0 60px rgba(0, 255, 0, ${params.crtBorderOpacity * 0.5})`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [],
  };

  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 255, 0, ${params.scanlineOpacity}) 2px, rgba(0, 255, 0, ${params.scanlineOpacity}) 4px); animation: scanlineMove ${params.scanlineSpeed}s linear infinite;"></div><style>@keyframes scanlineMove { 0% { transform: translateY(0); } 100% { transform: translateY(4px); } }</style>`,
      className: 'absolute inset-0',
      style: {},
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
  };

  const vignetteOverlay: RenderableComponentData = {
    id: 'vignette-overlay',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, ${params.vignetteStrength}) 100%)`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [],
  };

  // Create audio track
  const audioTrack: RenderableComponentData = {
    id: 'audio-track',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration: params.audio.duration || 10,
      },
    },
  };

  // Build caption container
  const captionComponents = createCaptionComponents();

  const captionWordsContainer: RenderableComponentData = {
    id: 'caption-words-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: captionComponents,
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-seismograph-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [
      audioTrack,
      crtOverlay,
      scanlineOverlay,
      vignetteOverlay,
      captionWordsContainer,
    ] as RenderableComponentData[],
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
  id: 'typokinetics-seismograph',
  title: 'Typokinetics Seismograph',
  description:
    'Industrial stencil text with seismograph-style compression waves responding to kick drums. Features horizontal displacement ripples, shock absorber mechanics, CRT scan lines, and power surge effects on strong kicks. Mechanical and precise animations with industrial aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'audio-reactive',
    'kinetic',
    'seismograph',
    'industrial',
    'stencil',
    'compression-wave',
    'kick-response',
    'crt-effect',
    'mechanical',
    'power-surge',
    'technical-readout',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'WARNING SYSTEM ACTIVE',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1-1',
            text: 'WARNING',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
          },
          {
            id: 'word-1-2',
            text: 'SYSTEM',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
          },
          {
            id: 'word-1-3',
            text: 'ACTIVE',
            start: 2,
            absoluteStart: 2,
            end: 3,
            absoluteEnd: 3,
            duration: 1,
          },
        ],
      },
    ],
    audio: {
      src: 'https://example.com/audio.mp3',
      duration: 10,
    },
    font: 'Courier Prime:700',
    fontSize: 72,
    textColor: '#00ff00',
    letterSpacing: '0.1em',
    compressionIntensity: 0.3,
    waveSpeed: 30,
    reboundOvershoot: 1.1,
    compressionDuration: 150,
    reboundDuration: 250,
    kickSensitivity: 1.5,
    kickThreshold: 0.2,
    powerSurgeIntensity: 0.3,
    scanlineOpacity: 0.03,
    scanlineSpeed: 8,
    crtBorderOpacity: 0.1,
    vignetteStrength: 0.7,
    textPosition: 'center',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const typokineticsSeismographPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
