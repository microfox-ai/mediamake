/**
 * Typokinetics Stencil Explosion Preset
 *
 * Audio-reactive typokinetics preset treating stencil text as a live VJ performance.
 * Letters fragment and reassemble on kick hits with physics-based scatter animations,
 * elastic returns, strobe opacity flickers on intense beats, and RGB chromatic aberration
 * scaling with beat intensity. Designed for deconstructed stencil typography with
 * glitched-out aesthetics driven by bass frequencies.
 *
 * Features:
 * - Individual letter entities with independent motion
 * - Kick-triggered explosion effect (scatter with random directions/speeds/rotations)
 * - Physics-based spring animation for elastic return to origin
 * - Strobe-like opacity flicker on intense beats (intensity > 0.7)
 * - RGB split/chromatic aberration effect scaled by beat intensity
 * - Audio analysis with 'low' frequency (bass) filtering
 * - Performance-optimized with transform3d and batched DOM updates
 *
 * Use cases:
 * - VJ-style live text performances
 * - Bass-reactive typography
 * - Glitched-out stencil aesthetics
 * - Music video titles
 * - Audio-visual experimental content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  RenderableComponentData,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define preset parameters
const presetParams = z.object({
  text: z.string().describe('Text to display (split into individual letters)'),
  audioSrc: z.string().describe('Audio source URL for beat detection'),
  font: z
    .string()
    .optional()
    .default('Bebas Neue:900')
    .describe(
      'Font family with weight (e.g., "Bebas Neue:900", "Impact:900")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(500)
    .optional()
    .default(96)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Base text color (hex or CSS color)'),
  letterSpacing: z
    .number()
    .min(0)
    .max(100)
    .optional()
    .default(5)
    .describe('Letter spacing in pixels'),
  explosionIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .optional()
    .default(1)
    .describe('Explosion intensity multiplier (0.1-3)'),
  explosionDuration: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .default(0.3)
    .describe('Explosion scatter duration in seconds'),
  returnDuration: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .default(0.5)
    .describe('Return spring animation duration in seconds'),
  rgbIntensity: z
    .number()
    .min(0)
    .max(5)
    .optional()
    .default(2)
    .describe('RGB split intensity multiplier (0-5)'),
  strobeDuration: z
    .number()
    .min(0.05)
    .max(0.5)
    .optional()
    .default(0.1)
    .describe('Strobe effect duration in seconds'),
  beatSensitivity: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .default(1)
    .describe('Beat detection sensitivity multiplier'),
  beatThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.5)
    .describe('Minimum intensity threshold for beat detection (0-1)'),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher, config } = props;

  // Parse font string
  const fontString = params.font || 'Bebas Neue:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontStyle: Record<string, any> = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Fetch audio analysis
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audioSrc,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data available');
  }

  // Filter for bass frequencies (low beatType) and above threshold
  const bassBeats = analysis.filter(
    (beat: any) =>
      beat.beatType === 'low' &&
      beat.intensity >= params.beatThreshold &&
      beat.intensity * params.beatSensitivity >= params.beatThreshold,
  );

  if (bassBeats.length === 0) {
    throw new Error(
      'No bass beats detected above threshold - try lowering beatThreshold',
    );
  }

  // Split text into individual letters (including spaces)
  const letters = params.text.split('');

  // Helper function to generate random value in range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Create letter components with effects
  const letterComponents: RenderableComponentData[] = letters.map(
    (letter, index) => {
      const letterId = `letter-${index}`;
      const effects: any[] = [];

      // For each bass beat, create explosion and RGB effects
      bassBeats.forEach((beat: any, beatIndex: number) => {
        const beatTime = beat.timestamp;
        const intensity = beat.intensity * params.explosionIntensity;

        // Random explosion parameters for this letter
        const translateX = randomRange(-50, 50) * intensity;
        const translateY = randomRange(-30, 30) * intensity;
        const rotate = randomRange(-45, 45) * intensity;

        // Explosion effect (scatter)
        const explosionEffect: GenericEffectData = {
          type: 'linear',
          start: beatTime,
          duration: params.explosionDuration,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: translateX, prog: 1 },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: translateY, prog: 1 },
            { key: 'rotate', val: 0, prog: 0 },
            { key: 'rotate', val: rotate, prog: 1 },
          ],
        };

        // Return effect (spring back to origin)
        const returnEffect: GenericEffectData = {
          type: 'spring',
          start: beatTime + params.explosionDuration,
          duration: params.returnDuration,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            { key: 'translateX', val: translateX, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: translateY, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
            { key: 'rotate', val: rotate, prog: 0 },
            { key: 'rotate', val: 0, prog: 1 },
          ],
        };

        // RGB split effect (chromatic aberration)
        const rgbSplit = Math.min(beat.intensity * params.rgbIntensity, 5);
        const rgbEffect: GenericEffectData = {
          type: 'ease-out',
          start: beatTime,
          duration: params.explosionDuration + params.returnDuration,
          mode: 'provider',
          targetIds: [letterId],
          ranges: [
            {
              key: 'filter',
              val: `drop-shadow(-${rgbSplit}px 0 0 red) drop-shadow(${rgbSplit}px 0 0 cyan)`,
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(0 0 0 red) drop-shadow(0 0 0 cyan)',
              prog: 1,
            },
          ],
        };

        effects.push(
          {
            id: `explosion-${letterId}-${beatIndex}`,
            componentId: 'generic',
            data: explosionEffect,
          },
          {
            id: `return-${letterId}-${beatIndex}`,
            componentId: 'generic',
            data: returnEffect,
          },
          {
            id: `rgb-${letterId}-${beatIndex}`,
            componentId: 'generic',
            data: rgbEffect,
          },
        );

        // Add strobe effect for intense beats (intensity > 0.7)
        if (beat.intensity > 0.7) {
          const strobeEffect: GenericEffectData = {
            type: 'linear',
            start: beatTime,
            duration: params.strobeDuration,
            mode: 'provider',
            targetIds: [letterId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          };

          effects.push({
            id: `strobe-${letterId}-${beatIndex}`,
            componentId: 'generic',
            data: strobeEffect,
          });
        }
      });

      return {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter === ' ' ? '\u00A0' : letter, // Non-breaking space for spaces
          style: {
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight || 900,
            color: params.textColor,
            lineHeight: 1,
            textTransform: 'uppercase' as const,
            letterSpacing: 0,
            userSelect: 'none' as const,
          },
          font: {
            family: fontFamily,
            weights: [fontStyle.fontWeight?.toString() || '900'],
            display: 'swap' as const,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects,
      } as RenderableComponentData;
    },
  );

  // Create container layout
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-stencil-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: durationInSeconds,
      },
    },
    childrenData: [
      {
        id: 'letter-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
            style: {
              gap: `${params.letterSpacing}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        childrenData: letterComponents,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-stencil-explosion',
  title: 'Typokinetics Stencil Explosion',
  description:
    'Audio-reactive typokinetics preset treating stencil text as a live VJ performance. Letters fragment and reassemble on kick hits with physics-based scatter animations, elastic returns, strobe opacity flickers on intense beats, and RGB chromatic aberration scaling with beat intensity. Designed for deconstructed stencil typography with glitched-out aesthetics driven by bass frequencies.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'audio-reactive',
    'vj',
    'glitch',
    'stencil',
    'kinetic',
    'bass-reactive',
    'explosion',
    'chromatic-aberration',
    'strobe',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'STENCIL',
    audioSrc: 'https://example.com/audio.mp3',
    font: 'Bebas Neue:900',
    fontSize: 96,
    textColor: '#ffffff',
    letterSpacing: 5,
    explosionIntensity: 1,
    explosionDuration: 0.3,
    returnDuration: 0.5,
    rgbIntensity: 2,
    strobeDuration: 0.1,
    beatSensitivity: 1,
    beatThreshold: 0.5,
  },
};

// Export preset
export const typokineticsStencilExplosionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
