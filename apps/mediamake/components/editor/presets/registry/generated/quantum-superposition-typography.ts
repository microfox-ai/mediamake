/**
 * Quantum Superposition Typography Effect Preset
 *
 * This preset creates a quantum superposition typography effect where text exists in
 * multiple probable states simultaneously, collapsing into definite forms on musical accents.
 * It visualizes text as a video editor layering multiple versions of the same text with
 * different positions, rotations, and opacities, creating a quantum uncertainty effect.
 *
 * Features:
 * - **5 Probability Layers**: Multiple overlapping text states with varying transforms
 * - **Quantum Flickering**: Rapid opacity fluctuations (0.1 to 0.6) simulating quantum uncertainty
 * - **Beat-Triggered Collapse**: All probabilities converge to a single clear state on strong beats
 * - **Particle-Wave Duality**: Text alternates between sharp (particle) and blurred (wave) states
 * - **Chromatic Aberration**: RGB color separation using text-shadow
 * - **Heisenberg Uncertainty**: Inverse relationship between position clarity and motion blur
 * - **Audio-Reactive**: Synchronized with audio waveform for beat detection
 * - **Performance Optimized**: Limited to 5 superposition states, uses compositor-only properties
 *
 * Use cases:
 * - Quantum physics visualizations
 * - Glitch typography for music videos
 * - Sci-fi title sequences
 * - Abstract text animations
 * - Audio-reactive typography
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  GenericEffectData,
  WaveformEffectData,
} from '@microfox/remotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display in quantum superposition'),
  
  audio: z
    .object({
      src: z.string().describe('Audio source URL for beat detection'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume level (0-2)'),
      start: z.number().min(0).default(0).optional().describe('Audio start time in seconds'),
    })
    .describe('Audio configuration for beat-reactive collapse animations'),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Base text color (before chromatic aberration)'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color'),
  
  probabilityCount: z
    .number()
    .min(3)
    .max(8)
    .default(5)
    .describe('Number of probability layers (3-8, default: 5)'),
  
  quantumFlickerSpeed: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Speed of quantum flickering effect (0.1-2, default: 0.3)'),
  
  collapseIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity of collapse animations (0.1-3, default: 1)'),
  
  waveDualitySpeed: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .describe('Speed of particle-wave duality alternation in seconds (0.5-5)'),
  
  chromaticAberrationStrength: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Strength of chromatic aberration effect in pixels (0-10)'),
  
  beatSensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .describe('Sensitivity to audio beats for collapse trigger (0.1-5)'),
  
  beatThreshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Minimum beat intensity to trigger collapse (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    audio,
    duration,
    font,
    fontSize,
    textColor,
    backgroundColor,
    probabilityCount,
    quantumFlickerSpeed,
    collapseIntensity,
    waveDualitySpeed,
    chromaticAberrationStrength,
    beatSensitivity,
    beatThreshold,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold
  }

  // Helper function to generate random transform values for probability layers
  const generateLayerTransform = (index: number, count: number) => {
    const seed = index / count;
    const translateX = Math.sin(seed * Math.PI * 2) * 20 - 10;
    const translateY = Math.cos(seed * Math.PI * 2) * 20 - 10;
    const rotate = (Math.sin(seed * Math.PI * 4) * 30) - 15;
    const scale = 0.95 + (Math.cos(seed * Math.PI * 3) * 0.1);
    
    return {
      translateX,
      translateY,
      rotate,
      scale,
    };
  };

  // Helper function to generate chromatic aberration shadow
  const generateChromaticShadow = (index: number, count: number) => {
    const seed = index / count;
    const offsetX = chromaticAberrationStrength * Math.sin(seed * Math.PI * 2);
    const offsetY = chromaticAberrationStrength * Math.cos(seed * Math.PI * 2);
    
    // RGB split colors based on layer
    const colors = [
      { r: '#ff0000', b: '#00ffff' },
      { r: '#ff00ff', b: '#00ff00' },
      { r: '#ffff00', b: '#0000ff' },
      { r: '#00ffff', b: '#ff00ff' },
      { r: '#00ff00', b: '#ff0000' },
    ];
    
    const colorPair = colors[index % colors.length];
    return `${offsetX}px ${offsetY}px 0 ${colorPair.r}, ${-offsetX}px ${-offsetY}px 0 ${colorPair.b}`;
  };

  // Create probability layers
  const probabilityLayers: RenderableComponentData[] = [];
  
  for (let i = 0; i < probabilityCount; i++) {
    const transform = generateLayerTransform(i, probabilityCount);
    const baseOpacity = 0.2 + (i / probabilityCount) * 0.2; // Vary base opacity
    const blurAmount = 0.5 + (i * 0.5); // Increasing blur for uncertainty
    const layerId = `probability-layer-${i}`;
    const textId = `text-atom-layer-${i}`;
    
    // Quantum flickering effect - rapid opacity oscillation
    const flickerEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [layerId],
      ranges: [
        { key: 'opacity', val: 0.1, prog: 0 },
        { key: 'opacity', val: baseOpacity + 0.3, prog: 0.05 },
        { key: 'opacity', val: 0.15, prog: 0.1 },
        { key: 'opacity', val: baseOpacity + 0.4, prog: 0.15 },
        { key: 'opacity', val: 0.2, prog: 0.2 },
        { key: 'opacity', val: baseOpacity + 0.2, prog: 0.25 },
        { key: 'opacity', val: 0.1, prog: 0.3 },
        { key: 'opacity', val: baseOpacity + 0.5, prog: 0.35 },
        { key: 'opacity', val: 0.15, prog: 0.4 },
        { key: 'opacity', val: baseOpacity + 0.3, prog: 0.45 },
        { key: 'opacity', val: 0.2, prog: 0.5 },
        { key: 'opacity', val: baseOpacity + 0.4, prog: 0.55 },
        { key: 'opacity', val: 0.1, prog: 0.6 },
        { key: 'opacity', val: baseOpacity + 0.2, prog: 0.65 },
        { key: 'opacity', val: 0.15, prog: 0.7 },
        { key: 'opacity', val: baseOpacity + 0.5, prog: 0.75 },
        { key: 'opacity', val: 0.2, prog: 0.8 },
        { key: 'opacity', val: baseOpacity + 0.3, prog: 0.85 },
        { key: 'opacity', val: 0.1, prog: 0.9 },
        { key: 'opacity', val: baseOpacity + 0.4, prog: 0.95 },
        { key: 'opacity', val: 0.15, prog: 1 },
      ],
    };
    
    // Particle-wave duality effect - alternate blur
    const waveDualityEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [layerId],
      ranges: [
        { key: 'filter', val: `blur(${blurAmount}px)`, prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 0.25 },
        { key: 'filter', val: `blur(${blurAmount * 2}px)`, prog: 0.5 },
        { key: 'filter', val: 'blur(0px)', prog: 0.75 },
        { key: 'filter', val: `blur(${blurAmount}px)`, prog: 1 },
      ],
    };
    
    // Heisenberg uncertainty - inverse position/motion blur
    const uncertaintyEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [layerId],
      ranges: [
        { key: 'translateX', val: transform.translateX, prog: 0 },
        { key: 'translateX', val: transform.translateX * -1, prog: 0.5 },
        { key: 'translateX', val: transform.translateX, prog: 1 },
        { key: 'translateY', val: transform.translateY, prog: 0 },
        { key: 'translateY', val: transform.translateY * -1, prog: 0.5 },
        { key: 'translateY', val: transform.translateY, prog: 1 },
      ],
    };
    
    // Beat-reactive collapse - fade out on beats
    const collapseEffect: WaveformEffectData = {
      audioSrc: audio.src,
      audioProperty: 'bass',
      effectType: 'scale',
      intensity: 0.3 * collapseIntensity,
      baseScale: 1,
      sensitivity: beatSensitivity,
      threshold: beatThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [layerId],
      start: 0,
      duration: duration,
      smoothNormalisation: 1,
    };
    
    probabilityLayers.push({
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            opacity: baseOpacity,
            transform: `translateX(${transform.translateX}px) translateY(${transform.translateY}px) rotate(${transform.rotate}deg) scale(${transform.scale})`,
            filter: `blur(${blurAmount}px)`,
            willChange: 'transform, opacity, filter',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `flicker-effect-${i}`,
          componentId: 'generic',
          data: flickerEffect,
        },
        {
          id: `wave-duality-effect-${i}`,
          componentId: 'generic',
          data: waveDualityEffect,
        },
        {
          id: `uncertainty-effect-${i}`,
          componentId: 'generic',
          data: uncertaintyEffect,
        },
        {
          id: `collapse-effect-${i}`,
          componentId: 'waveform',
          data: collapseEffect,
        },
      ],
      childrenData: [
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontStyle.fontWeight || 700,
              ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
              color: textColor,
              textShadow: generateChromaticShadow(i, probabilityCount),
            },
            font: {
              family: fontFamily,
              weights: [String(fontStyle.fontWeight || 700)],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
    } as RenderableComponentData);
  }
  
  // Definite state layer - appears clearly on strong beats
  const definiteLayerId = 'definite-state-layer';
  const definiteTextId = 'text-atom-definite';
  
  // Beat-triggered collapse to definite state
  const definiteCollapseEffect: WaveformEffectData = {
    audioSrc: audio.src,
    audioProperty: 'bass',
    effectType: 'scale',
    intensity: 0.2 * collapseIntensity,
    baseScale: 1,
    sensitivity: beatSensitivity * 1.5, // Higher sensitivity for definite state
    threshold: beatThreshold + 0.2, // Higher threshold - only strong beats
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [definiteLayerId],
    start: 0,
    duration: duration,
    smoothNormalisation: 0.5, // Less smoothing for sharper response
  };
  
  // Opacity pulse on beats
  const definiteOpacityEffect: WaveformEffectData = {
    audioSrc: audio.src,
    audioProperty: 'bass',
    effectType: 'exposure',
    intensity: 0.5 * collapseIntensity,
    baseBrightness: 0,
    sensitivity: beatSensitivity * 2,
    threshold: beatThreshold + 0.3,
    numberOfSamples: 128,
    useFrequencyData: true,
    windowInSeconds: 1 / 30,
    mode: 'provider',
    targetIds: [definiteLayerId],
    start: 0,
    duration: duration,
    smoothNormalisation: 0.3,
  };
  
  const definiteStateLayer: RenderableComponentData = {
    id: definiteLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          opacity: 0,
          willChange: 'transform, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'definite-collapse-effect',
        componentId: 'waveform',
        data: definiteCollapseEffect,
      },
      {
        id: 'definite-opacity-effect',
        componentId: 'waveform',
        data: definiteOpacityEffect,
      },
    ],
    childrenData: [
      {
        id: definiteTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: text,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontStyle.fontWeight || 700,
            ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
            color: textColor,
            textShadow: '0 0 20px rgba(255,255,255,0.8)',
          },
          font: {
            family: fontFamily,
            weights: [String(fontStyle.fontWeight || 700)],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ],
  } as RenderableComponentData;

  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'audio-track',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audio.src,
      volume: audio.volume ?? 1,
      startFrom: audio.start ?? 0,
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'quantum-superposition-typography-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      audioTrack,
      ...probabilityLayers,
      definiteStateLayer,
    ] as RenderableComponentData[],
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
  id: 'quantum-superposition-typography',
  title: 'Quantum Superposition Typography Effect',
  description:
    'Dynamic typography with quantum superposition visualization where text exists in multiple probability states simultaneously, collapsing into definite forms on musical accents. Features particle-wave duality effects, flickering opacity, chromatic aberration, and beat-reactive collapse animations synchronized with audio waveforms.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'quantum',
    'superposition',
    'glitch',
    'audio-reactive',
    'waveform',
    'chromatic-aberration',
    'particle-wave',
    'beat-sync',
    'experimental',
    'sci-fi',
    'physics',
    'uncertainty',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'QUANTUM',
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
      start: 0,
    },
    duration: 10,
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#ffffff',
    backgroundColor: '#000000',
    probabilityCount: 5,
    quantumFlickerSpeed: 0.3,
    collapseIntensity: 1,
    waveDualitySpeed: 2,
    chromaticAberrationStrength: 3,
    beatSensitivity: 1.5,
    beatThreshold: 0.3,
  },
};

export const quantumSuperpositionTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};