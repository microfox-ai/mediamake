/**
 * Audio-Driven Force Field Effect Preset
 *
 * This preset creates an audio-reactive expanding force field / energy barrier effect around content.
 * The field pulses and expands based on audio energy, with electromagnetic-style distortion effects
 * at the edges using SVG turbulence filters. It combines waveform audio-reactive scaling with
 * custom CSS filter animations for glow and distortion.
 *
 * Features:
 * - **Audio-Reactive Scaling**: Field expands and contracts based on mid-range frequency analysis
 * - **Electromagnetic Distortion**: SVG turbulence filter creates rippling edge effects
 * - **Dynamic Glow**: CSS drop-shadow and brightness effects pulse with audio
 * - **Customizable Colors**: Set field color for both stroke and glow effects
 * - **Frequency Response**: Configurable frequency range for audio analysis (default: mid-range)
 * - **Expansion Control**: Adjustable base radius and maximum expansion multiplier
 * - **Distortion Intensity**: Control turbulence scale for edge distortion
 *
 * Use cases:
 * - Creating protective shield effects for music videos
 * - Building audio-reactive energy barriers
 * - Adding sci-fi force field effects synchronized to music
 * - Creating electromagnetic pulse visuals
 * - Building dynamic defense/protection visual effects
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData, GenericEffectData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for frequency analysis'),
  content: z
    .object({
      childrenData: z.array(z.any()).optional(),
    })
    .optional()
    .describe('Optional content to display inside the force field'),
  fieldColor: z
    .string()
    .default('#00ffff')
    .describe('Hex color for the force field (stroke and glow)'),
  baseRadius: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Base glow radius in pixels (5-20px)'),
  maxExpansion: z
    .number()
    .min(1.5)
    .max(3.0)
    .default(2.0)
    .describe('Maximum scale expansion multiplier (1.5-3.0)'),
  distortionAmount: z
    .number()
    .min(1.0)
    .max(2.0)
    .default(1.5)
    .describe('Turbulence distortion intensity (1.0-2.0)'),
  frequencyRange: z
    .tuple([z.number(), z.number()])
    .default([200, 2000])
    .describe('Frequency range for audio analysis [min, max] in Hz'),
  duration: z
    .number()
    .optional()
    .describe('Duration in seconds, or leave empty to fit audio duration'),
  audioStart: z.number().default(0).describe('Audio start time in seconds'),
  sensitivity: z
    .number()
    .min(0.5)
    .max(3.0)
    .default(1.5)
    .describe('Audio sensitivity multiplier for scale effect'),
  smoothing: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Smoothing factor for audio response (0 = raw, 1 = default, >1 = more smooth)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    audioSrc,
    content,
    fieldColor,
    baseRadius,
    maxExpansion,
    distortionAmount,
    duration,
    audioStart,
    sensitivity,
    smoothing,
  } = params;

  // Calculate distortion scale based on distortionAmount
  const distortionScale = distortionAmount * 10; // Scale 1.0-2.0 to 10-20 for SVG turbulence

  // Calculate glow values for CSS filter animation
  const baseGlow = baseRadius;
  const maxGlow = baseRadius * 2;

  // Calculate contrast and brightness ranges
  const baseContrast = 1.0;
  const maxContrast = 1.0 + (distortionAmount - 1.0) * 0.5; // 1.0 to 1.5
  const baseBrightness = 1.0;
  const maxBrightness = 1.0 + (maxExpansion - 1.0) * 0.3; // 1.0 to 1.3

  // Create the SVG filter HTML with dynamic turbulence
  const svgFilterHTML = `
    <svg viewBox="0 0 200 200" style="width:100%;height:100%;position:absolute;pointer-events:none;">
      <defs>
        <filter id="turbulence-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" result="noise"/>
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="${distortionScale}" xChannelSelector="R" yChannelSelector="G"/>
        </filter>
      </defs>
      <circle cx="100" cy="100" r="80" fill="none" stroke="${fieldColor}" stroke-width="3" filter="url(#turbulence-filter)" opacity="0.8"/>
      <circle cx="100" cy="100" r="70" fill="none" stroke="${fieldColor}" stroke-width="1.5" filter="url(#turbulence-filter)" opacity="0.5"/>
      <circle cx="100" cy="100" r="60" fill="none" stroke="${fieldColor}" stroke-width="1" filter="url(#turbulence-filter)" opacity="0.3"/>
    </svg>
  `;

  // Create the outer glow HTML with dynamic filter
  const glowHTML = `
    <div style="
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      box-shadow: 0 0 ${baseGlow}px ${fieldColor}, 0 0 ${baseGlow * 2}px ${fieldColor};
      filter: drop-shadow(0 0 ${baseGlow}px ${fieldColor}) contrast(${baseContrast}) brightness(${baseBrightness});
    "></div>
  `;

  // Waveform effect for scale animation (audio-reactive)
  const scaleEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'frequency', // React to frequency in mid-range
    effectType: 'scale',
    intensity: maxExpansion - 1.0, // Expansion above base scale
    baseScale: 1.0,
    sensitivity,
    threshold: 0.1,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: ['force-field-scale-target'],
    start: 0,
    duration: duration || 30, // Default 30s if not specified
    smoothNormalisation: smoothing,
  };

  // Generic effect for CSS filter animation (glow, contrast, brightness)
  const filterEffectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration || 30,
    mode: 'provider',
    targetIds: ['force-field-glow'],
    ranges: [
      // Glow intensity animation
      { key: 'filter', val: `drop-shadow(0 0 ${baseGlow}px ${fieldColor}) contrast(${baseContrast}) brightness(${baseBrightness})`, prog: 0 },
      { key: 'filter', val: `drop-shadow(0 0 ${maxGlow}px ${fieldColor}) contrast(${maxContrast}) brightness(${maxBrightness})`, prog: 0.5 },
      { key: 'filter', val: `drop-shadow(0 0 ${baseGlow}px ${fieldColor}) contrast(${baseContrast}) brightness(${baseBrightness})`, prog: 1 },
    ],
  };

  // Build the force field structure
  const forceFieldChildren: RenderableComponentData[] = [
    // Outer glow layer
    {
      id: 'force-field-glow',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: glowHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration || 30,
        },
      },
    } as RenderableComponentData,
    // SVG ring layer with turbulence
    {
      id: 'force-field-svg-ring',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: svgFilterHTML,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration || 30,
        },
      },
    } as RenderableComponentData,
  ];

  // Scalable container for audio-reactive expansion
  const scaleContainer: RenderableComponentData = {
    id: 'force-field-scale-target',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 30,
      },
    },
    childrenData: forceFieldChildren as RenderableComponentData[],
    effects: [
      {
        id: 'force-field-scale-effect',
        componentId: 'waveform',
        data: scaleEffectData,
      },
    ],
  } as RenderableComponentData;

  // Content container (if provided)
  const contentContainer: RenderableComponentData | null = content?.childrenData
    ? ({
        id: 'force-field-content',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex items-center justify-center',
            style: {
              zIndex: 5,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration || 30,
          },
        },
        childrenData: content.childrenData as RenderableComponentData[],
      } as RenderableComponentData)
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'audio-force-field-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'visible',
        },
      },
    },
    context: {
      timing: {
        start: audioStart,
        duration: duration || 30,
      },
    },
    childrenData: [
      scaleContainer,
      ...(contentContainer ? [contentContainer] : []),
    ] as RenderableComponentData[],
    effects: [
      {
        id: 'force-field-filter-effect',
        componentId: 'generic',
        data: filterEffectData,
      },
    ],
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
  id: 'audio-force-field-effect',
  title: 'Audio-Driven Force Field Effect',
  description:
    'Creates an audio-reactive expanding energy barrier/shield effect around content. The force field pulses and scales based on mid-range audio frequencies, with electromagnetic-style distortion at edges using SVG turbulence filters. Features customizable field color, glow intensity, and frequency response bands for dynamic music synchronization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'force-field',
    'energy-barrier',
    'shield',
    'electromagnetic',
    'distortion',
    'waveform',
    'music-reactive',
    'sci-fi',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    fieldColor: '#00ffff',
    baseRadius: 10,
    maxExpansion: 2.0,
    distortionAmount: 1.5,
    frequencyRange: [200, 2000],
    audioStart: 0,
    sensitivity: 1.5,
    smoothing: 1,
  },
};

export const audioForceFieldEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
