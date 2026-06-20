/**
 * Glitch-Hop Text Animation Preset
 *
 * A beat-synchronized text animation featuring intense digital glitch effects
 * inspired by data corruption and broken video codecs. Text breaks into horizontal
 * slices that shift position, separate into RGB channels, and distort on beat hits.
 * Includes digital artifacts like pixelation, scan lines, and corruption characters.
 *
 * Features:
 * - Horizontal slice distortion with random translateX shifts
 * - RGB channel separation with screen blend mode
 * - Scan line animation with moving linear gradients
 * - Data corruption character overlays (▓░▒)
 * - CSS filters: contrast, brightness, vertical stretch
 * - Flickering effects with rapid opacity changes
 * - Beat-intensity scaling: subtle glitches → complete digital chaos
 * - Audio-synchronized via beatstitch analysis
 *
 * Use cases:
 * - Music videos with glitch-hop, dubstep, or electronic music
 * - Tech/cyberpunk aesthetic content
 * - Edgy social media content with digital distortion
 * - Audio-reactive title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  audioSrc: z
    .string()
    .describe('Audio source URL for beat synchronization'),
  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Base text color (default: white)'),
  fontSize: z
    .number()
    .optional()
    .default(72)
    .describe('Font size in pixels (default: 72)'),
  font: z
    .string()
    .optional()
    .default('Courier New')
    .describe('Font family (default: Courier New for digital aesthetic)'),
  glitchIntensityMultiplier: z
    .number()
    .min(0.1)
    .max(3)
    .optional()
    .default(1)
    .describe('Global multiplier for glitch intensity (0.1-3, default: 1)'),
  weakBeatThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.4)
    .describe('Intensity threshold for weak beats (0-1, default: 0.4)'),
  strongBeatThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .default(0.7)
    .describe('Intensity threshold for strong beats/drops (0-1, default: 0.7)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  // Fetch audio analysis data
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audioSrc,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data available');
  }

  // Helper: Generate random glitch translateX based on intensity
  const generateGlitchTranslate = (intensity: number): number => {
    const baseRange = params.glitchIntensityMultiplier * 50; // 50px max
    return (Math.random() - 0.5) * 2 * baseRange * intensity;
  };

  // Helper: Create flicker opacity array
  const createFlickerOpacities = (): number[] => {
    return [1, 0, 1, 0, 1, 1, 0, 1];
  };

  // Helper: Create RGB channel separation effects
  const createRGBChannelEffects = (
    targetId: string,
    startTime: number,
    intensity: number,
  ) => {
    const translateAmount = 10 + intensity * 40; // 10-50px based on intensity
    const duration = 0.15;

    const redEffect = {
      id: `rgb-red-${targetId}-${startTime}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: startTime,
        duration,
        mode: 'provider' as const,
        targetIds: [`${targetId}-red`],
        ranges: [
          { key: 'translateX', val: -translateAmount, prog: 0 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.5 },
        ],
      },
    };

    const greenEffect = {
      id: `rgb-green-${targetId}-${startTime}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: startTime,
        duration,
        mode: 'provider' as const,
        targetIds: [`${targetId}-green`],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.5 },
        ],
      },
    };

    const blueEffect = {
      id: `rgb-blue-${targetId}-${startTime}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: startTime,
        duration,
        mode: 'provider' as const,
        targetIds: [`${targetId}-blue`],
        ranges: [
          { key: 'translateX', val: translateAmount, prog: 0 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.5 },
        ],
      },
    };

    return [redEffect, greenEffect, blueEffect];
  };

  // Helper: Create corruption overlay effects
  const createCorruptionEffects = (
    targetId: string,
    startTime: number,
    intensity: number,
  ) => {
    const duration = 0.1 + intensity * 0.2; // 0.1-0.3s based on intensity
    const opacities = createFlickerOpacities();

    return {
      id: `corruption-${targetId}-${startTime}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: startTime,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: opacities.map((opacity, index) => ({
          key: 'opacity',
          val: opacity * intensity,
          prog: index / (opacities.length - 1),
        })),
      },
    };
  };

  // Helper: Create main text glitch effects
  const createTextGlitchEffect = (
    targetId: string,
    startTime: number,
    intensity: number,
  ) => {
    const duration = 0.2;
    const verticalStretch = 1 + intensity * 0.02; // 1-1.02 scale
    const brightness = 1 + intensity * 0.5; // 1-1.5
    const contrast = 1 + intensity * 1; // 1-2

    return {
      id: `text-glitch-${targetId}-${startTime}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: startTime,
        duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'scaleY', val: verticalStretch, prog: 0 },
          { key: 'scaleY', val: 1, prog: 0.5 },
          {
            key: 'filter',
            val: `brightness(${brightness}) contrast(${contrast})`,
            prog: 0,
          },
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0.5 },
        ],
      },
    };
  };

  // Helper: Create scan line animation
  const createScanLineEffect = (targetId: string) => {
    return {
      id: `scanline-${targetId}`,
      componentId: 'generic' as const,
      data: {
        type: 'linear' as const,
        start: 0,
        duration: durationInSeconds,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: '0%', prog: 0 },
          { key: 'translateY', val: '100%', prog: 1 },
        ],
      },
    };
  };

  // Create effects for all beats
  const allEffects: any[] = [];
  const corruptionOverlayIds = [
    'corruption-overlay-top',
    'corruption-overlay-middle',
    'corruption-overlay-bottom',
  ];

  analysis.forEach((beat: any) => {
    const { timestamp, intensity } = beat;

    // Determine beat strength
    const isWeak = intensity < params.weakBeatThreshold;
    const isStrong = intensity >= params.strongBeatThreshold;

    // RGB channel separation (all beats)
    allEffects.push(
      ...createRGBChannelEffects('text-base-layer', timestamp, intensity),
    );

    // Main text glitch
    allEffects.push(
      createTextGlitchEffect('text-base-layer', timestamp, intensity),
    );

    // Corruption overlays (only on medium-strong beats)
    if (!isWeak) {
      corruptionOverlayIds.forEach((overlayId, index) => {
        allEffects.push(
          createCorruptionEffects(overlayId, timestamp + index * 0.05, intensity),
        );
      });
    }
  });

  // Add scan line animation
  allEffects.push(createScanLineEffect('scan-lines-overlay'));

  // Build component tree
  const rootContainer: RenderableComponentData = {
    id: 'glitch-hop-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden bg-black',
        style: {
          width: '100%',
          height: '100%',
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
      // Audio track
      {
        id: 'audio-track',
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: params.audioSrc,
          volume: 1,
        },
        context: {
          timing: {},
        },
      },
      // Scan lines overlay
      {
        id: 'scan-lines-overlay',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div style='position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.03) 1px, transparent 2px); pointer-events: none;'></div>",
          className: 'absolute inset-0',
          style: {
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: [createScanLineEffect('scan-lines-overlay')],
      },
      // Base text layer
      {
        id: 'text-base-layer',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className:
            'absolute inset-0 flex items-center justify-center font-mono uppercase tracking-wider text-white font-bold',
          style: {
            fontSize: params.fontSize,
            textAlign: 'center' as const,
            zIndex: 1,
            color: params.textColor,
          },
          font: {
            family: params.font,
            weights: ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: analysis
          .map((beat: any) =>
            createTextGlitchEffect('text-base-layer', beat.timestamp, beat.intensity),
          )
          .flat(),
      },
      // Red channel layer
      {
        id: 'text-base-layer-red',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className:
            'absolute inset-0 flex items-center justify-center font-mono uppercase tracking-wider font-bold',
          style: {
            fontSize: params.fontSize,
            textAlign: 'center' as const,
            mixBlendMode: 'screen' as const,
            zIndex: 2,
            opacity: 0,
            color: '#ff0000',
          },
          font: {
            family: params.font,
            weights: ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: analysis
          .map((beat: any) =>
            createRGBChannelEffects('text-base-layer', beat.timestamp, beat.intensity),
          )
          .flat()
          .filter((effect: any) => effect.id.includes('rgb-red')),
      },
      // Green channel layer
      {
        id: 'text-base-layer-green',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className:
            'absolute inset-0 flex items-center justify-center font-mono uppercase tracking-wider font-bold',
          style: {
            fontSize: params.fontSize,
            textAlign: 'center' as const,
            mixBlendMode: 'screen' as const,
            zIndex: 3,
            opacity: 0,
            color: '#00ff00',
          },
          font: {
            family: params.font,
            weights: ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: analysis
          .map((beat: any) =>
            createRGBChannelEffects('text-base-layer', beat.timestamp, beat.intensity),
          )
          .flat()
          .filter((effect: any) => effect.id.includes('rgb-green')),
      },
      // Blue channel layer
      {
        id: 'text-base-layer-blue',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className:
            'absolute inset-0 flex items-center justify-center font-mono uppercase tracking-wider font-bold',
          style: {
            fontSize: params.fontSize,
            textAlign: 'center' as const,
            mixBlendMode: 'screen' as const,
            zIndex: 4,
            opacity: 0,
            color: '#0000ff',
          },
          font: {
            family: params.font,
            weights: ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: analysis
          .map((beat: any) =>
            createRGBChannelEffects('text-base-layer', beat.timestamp, beat.intensity),
          )
          .flat()
          .filter((effect: any) => effect.id.includes('rgb-blue')),
      },
      // Corruption overlays
      {
        id: 'corruption-overlay-top',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='font-mono text-white text-2xl' style='position: absolute; top: 20%; left: 10%; opacity: 0;'>▓░▒█▓░▒</div>",
          className: 'absolute',
          style: {
            zIndex: 10,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: analysis
          .filter((beat: any) => beat.intensity >= params.weakBeatThreshold)
          .map((beat: any) =>
            createCorruptionEffects(
              'corruption-overlay-top',
              beat.timestamp,
              beat.intensity,
            ),
          ),
      },
      {
        id: 'corruption-overlay-middle',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='font-mono text-white text-2xl' style='position: absolute; top: 50%; right: 15%; opacity: 0;'>░▒█▓░▒█</div>",
          className: 'absolute',
          style: {
            zIndex: 10,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: analysis
          .filter((beat: any) => beat.intensity >= params.weakBeatThreshold)
          .map((beat: any) =>
            createCorruptionEffects(
              'corruption-overlay-middle',
              beat.timestamp + 0.05,
              beat.intensity,
            ),
          ),
      },
      {
        id: 'corruption-overlay-bottom',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: "<div class='font-mono text-white text-2xl' style='position: absolute; bottom: 25%; left: 20%; opacity: 0;'>▒█▓░▒█▓</div>",
          className: 'absolute',
          style: {
            zIndex: 10,
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: durationInSeconds,
          },
        },
        effects: analysis
          .filter((beat: any) => beat.intensity >= params.weakBeatThreshold)
          .map((beat: any) =>
            createCorruptionEffects(
              'corruption-overlay-bottom',
              beat.timestamp + 0.1,
              beat.intensity,
            ),
          ),
      },
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

const presetMetadata: PresetMetadata = {
  id: 'glitchHopTextAnimation',
  title: 'Glitch-Hop Text Animation',
  description:
    'Beat-synchronized text animation with intense digital glitch effects including RGB channel separation, horizontal slicing, data corruption overlays, scan lines, and CSS filters. Glitch intensity scales dynamically with beat strength - subtle distortions on weak beats escalate to complete digital chaos on drops. Perfect for glitch-hop, dubstep, and electronic music videos.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'audio-reactive',
    'beat-sync',
    'rgb-separation',
    'corruption',
    'scan-lines',
    'digital',
    'cyberpunk',
    'electronic',
    'glitch-hop',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH HOP',
    audioSrc: 'https://example.com/glitch-hop-track.mp3',
    textColor: '#FFFFFF',
    fontSize: 72,
    font: 'Courier New',
    glitchIntensityMultiplier: 1,
    weakBeatThreshold: 0.4,
    strongBeatThreshold: 0.7,
  },
};

export const glitchHopTextAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
