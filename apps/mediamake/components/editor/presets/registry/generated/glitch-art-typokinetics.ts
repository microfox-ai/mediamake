/**
 * Glitch Art Typokinetics Preset
 *
 * Audio-reactive glitch typography preset featuring opacity corruption effects triggered by
 * audio transients. Creates intentional digital corruption aesthetic with multi-layer text,
 * datamoshing-style sticky frames, and exponential recovery between peaks.
 *
 * Features:
 * - Transient detection via audio analysis (intensity spike > 0.8)
 * - Multiple duplicate text layers with 1-2px offsets for RGB split effect
 * - Random opacity corruption (0, 0.3, 0.7, 1.2 via CSS brightness filter)
 * - Sticky frame delays (50-100ms) for datamoshing effect
 * - Exponential decay recovery to normal opacity (500ms)
 * - Mix-blend-difference for chromatic aberration
 * - Glitch effect pooling (limit 3 simultaneous glitches)
 *
 * Perfect for:
 * - Electronic music videos
 * - Cyberpunk aesthetics
 * - Tech/digital content
 * - Glitch art compositions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
} from '@microfox/datamotion';

// --- Preset Parameters ---
const presetParams = z.object({
  text: z.string().describe('Text to display with glitch effects'),
  audioSrc: z.string().describe('Audio source URL for transient analysis'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family for text (default: Inter)'),
  fontSize: z
    .string()
    .default('text-6xl')
    .optional()
    .describe('Tailwind font size class (default: text-6xl)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base text color (default: #FFFFFF)'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Glitch effect intensity multiplier (0.1-3, default: 1)'),
  transientThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .optional()
    .describe('Audio intensity threshold for triggering glitches (0-1, default: 0.8)'),
  recoveryDuration: z
    .number()
    .min(100)
    .max(2000)
    .default(500)
    .optional()
    .describe('Opacity recovery duration in milliseconds (default: 500ms)'),
  maxSimultaneousGlitches: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Maximum number of simultaneous glitches (default: 3)'),
});

// --- Preset Execution ---
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Helper: Parse font string (format: "FontName:weight:style")
  const fontString = params.fontFamily || 'Inter';
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

  // Fetch audio analysis data
  let audioDuration = 30; // Default fallback
  let transientTimestamps: number[] = [];

  if (fetcher && params.audioSrc) {
    try {
      const { analysis, durationInSeconds } = await fetcher(
        '/api/analyze-audio',
        {
          audioSrc: params.audioSrc,
        },
      );

      audioDuration = durationInSeconds || 30;

      // Extract transient timestamps where intensity > threshold
      if (analysis && Array.isArray(analysis)) {
        transientTimestamps = analysis
          .filter(
            (beat: any) =>
              beat.intensity >= (params.transientThreshold || 0.8),
          )
          .map((beat: any) => beat.timestamp);
      }
    } catch (error) {
      console.warn('Audio analysis failed, using default duration:', error);
    }
  }

  // Generate glitch effects based on transients
  const createGlitchEffects = (): any[] => {
    const effects: any[] = [];
    const glitchIntensity = params.glitchIntensity || 1;
    const recoveryDuration = (params.recoveryDuration || 500) / 1000; // Convert to seconds
    const maxGlitches = params.maxSimultaneousGlitches || 3;

    // Limit to maxSimultaneousGlitches
    const selectedTransients = transientTimestamps.slice(0, maxGlitches * 10);

    selectedTransients.forEach((timestamp, index) => {
      // Random opacity values for corruption effect
      const opacityValues = [0, 0.3, 0.7, 1.2];
      const randomOpacity =
        opacityValues[Math.floor(Math.random() * opacityValues.length)];

      // Random sticky delay (50-100ms)
      const stickyDelay = 0.05 + Math.random() * 0.05; // 50-100ms in seconds

      // Determine which layer to target
      const layerIndex = index % 4; // 4 layers: base, red, green, blue
      const layerIds = [
        'base-text-layer',
        'glitch-layer-red',
        'glitch-layer-green',
        'glitch-layer-blue',
      ];
      const targetId = layerIds[layerIndex];

      // Glitch trigger effect (corruption)
      const glitchEffect: GenericEffectData = {
        type: 'linear',
        start: timestamp + stickyDelay,
        duration: 0.05, // Very short corruption flash
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: randomOpacity * glitchIntensity, prog: 0 },
          { key: 'opacity', val: randomOpacity * glitchIntensity, prog: 1 },
        ],
      };

      effects.push({
        id: `glitch-corruption-${index}`,
        componentId: 'generic',
        data: glitchEffect,
      });

      // Recovery effect (exponential decay back to 1.0)
      const recoveryEffect: GenericEffectData = {
        type: 'ease-out', // Exponential decay
        start: timestamp + stickyDelay + 0.05,
        duration: recoveryDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: randomOpacity * glitchIntensity, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      };

      effects.push({
        id: `glitch-recovery-${index}`,
        componentId: 'generic',
        data: recoveryEffect,
      });
    });

    return effects;
  };

  const glitchEffects = createGlitchEffects();

  // --- Build Component Structure ---

  // Base text layer (white)
  const baseTextLayer: RenderableComponentData = {
    id: 'base-text-layer',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `${params.fontSize || 'text-6xl'} font-bold`,
      style: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: params.textColor || '#FFFFFF',
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
  };

  // Glitch layer - red (1px offset)
  const glitchLayerRed: RenderableComponentData = {
    id: 'glitch-layer-red',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `${params.fontSize || 'text-6xl'} font-bold`,
      style: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) translateX(1px)',
        color: '#ff0000',
        mixBlendMode: 'difference' as const,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
  };

  // Glitch layer - green (-1px offset)
  const glitchLayerGreen: RenderableComponentData = {
    id: 'glitch-layer-green',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `${params.fontSize || 'text-6xl'} font-bold`,
      style: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) translateX(-1px)',
        color: '#00ff00',
        mixBlendMode: 'difference' as const,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
  };

  // Glitch layer - blue (1px Y offset)
  const glitchLayerBlue: RenderableComponentData = {
    id: 'glitch-layer-blue',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: `${params.fontSize || 'text-6xl'} font-bold`,
      style: {
        position: 'absolute' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) translateY(1px)',
        color: '#0000ff',
        mixBlendMode: 'difference' as const,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight
          ? [fontStyle.fontWeight.toString()]
          : ['700'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
  };

  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'audio-track',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // Text stack container
  const textStackContainer: RenderableComponentData = {
    id: 'text-stack-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [
      baseTextLayer,
      glitchLayerRed,
      glitchLayerGreen,
      glitchLayerBlue,
    ] as RenderableComponentData[],
    effects: glitchEffects,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-typo-root',
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
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [audioTrack, textStackContainer] as RenderableComponentData[],
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
  id: 'glitch-art-typokinetics',
  title: 'Glitch Art Typokinetics',
  description:
    'Audio-reactive glitch art typography preset with opacity corruption effects triggered by transients. Features multi-layer text with intentional digital corruption, datamoshing-style sticky frames, and exponential recovery between peaks. Perfect for electronic music videos and cyberpunk aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'audio-reactive',
    'kinetic',
    'cyberpunk',
    'electronic',
    'corruption',
    'datamosh',
    'rgb-split',
    'chromatic-aberration',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH',
    audioSrc: 'https://example.com/audio.mp3',
    fontFamily: 'Inter',
    fontSize: 'text-6xl',
    textColor: '#FFFFFF',
    glitchIntensity: 1,
    transientThreshold: 0.8,
    recoveryDuration: 500,
    maxSimultaneousGlitches: 3,
  },
};

// --- Export Preset ---
export const glitchArtTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
