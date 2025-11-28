/**
 * Recursive Typography Tunnel Preset
 *
 * This preset creates an infinite spiral tunnel effect where text layers recede into 
 * a vanishing point with rotation, scaling, and depth-based styling. The tunnel features:
 * - 15-20 text layers with progressively decreasing scale (1.0 to 0.05)
 * - Z-axis depth positioning (-1000px range) creating 3D tunnel effect
 * - Continuous spiral rotation synchronized to music BPM
 * - Bass-reactive pulsing via waveform effects
 * - Hypnotic color gradients with animated background position
 * - Opacity and blur gradients for atmospheric depth-of-field
 * - Transform-origin manipulation for spiral path variations
 *
 * Use cases:
 * - Music visualizations with hypnotic text effects
 * - Psychedelic video intros/outros
 * - Abstract typography animations
 * - Meditation/trance video backgrounds
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters ---

const presetParams = z.object({
  text: z
    .string()
    .default('INFINITE')
    .describe('Text to display in the tunnel'),
  
  audio: z
    .object({
      src: z.string().describe('Audio source URL or ref:componentId'),
      volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
    })
    .describe('Audio track for BPM and bass synchronization'),
  
  layerCount: z
    .number()
    .int()
    .min(10)
    .max(30)
    .default(15)
    .describe('Number of text layers in tunnel (10-30)'),
  
  rotationSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Rotation speed multiplier (higher = faster spiral)'),
  
  bassIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.15)
    .describe('Bass pulse intensity (0.1-1.0)'),
  
  gradientColors: z
    .array(z.string())
    .default(['#ff00ff', '#00ffff', '#ffff00', '#ff00ff'])
    .describe('Color stops for gradient (CSS color values)'),
  
  fontSize: z
    .number()
    .int()
    .min(40)
    .max(200)
    .default(120)
    .describe('Base font size in pixels'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter:900", "Roboto:700")'),
  
  depthFogStart: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity at deepest layer (0-1)'),
  
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(7)
    .describe('Maximum blur at deepest layer (px)'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color (CSS color value)'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { config } = props;
  const fps = config?.fps || 30;
  
  // Parse font
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  let fontWeight = 900;
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = parseInt(fontParts[1], 10) || 900;
    }
  }
  
  // Build gradient string
  const gradientString = `linear-gradient(90deg, ${params.gradientColors.join(', ')})`;
  
  // Calculate layer properties
  const layerCount = params.layerCount;
  const minScale = 0.05;
  const maxScale = 1.0;
  const scaleStep = (maxScale - minScale) / (layerCount - 1);
  
  const minTranslateZ = -1000;
  const maxTranslateZ = 0;
  const translateZStep = (maxTranslateZ - minTranslateZ) / (layerCount - 1);
  
  const minOpacity = params.depthFogStart;
  const maxOpacity = 1.0;
  const opacityStep = (maxOpacity - minOpacity) / (layerCount - 1);
  
  const minBlur = 0;
  const maxBlur = params.blurIntensity;
  const blurStep = maxBlur / (layerCount - 1);
  
  // Generate layers
  const layers: RenderableComponentData[] = [];
  
  for (let i = 0; i < layerCount; i++) {
    const layerIndex = i;
    const layerId = `layer-${String(layerIndex + 1).padStart(2, '0')}`;
    const textId = `text-${String(layerIndex + 1).padStart(2, '0')}`;
    
    // Calculate properties for this layer
    const scale = maxScale - (scaleStep * layerIndex);
    const translateZ = maxTranslateZ - (translateZStep * layerIndex);
    const opacity = maxOpacity - (opacityStep * layerIndex);
    const blur = minBlur + (blurStep * layerIndex);
    const fontSize = params.fontSize * scale;
    
    // Rotation offset for spiral effect (each layer slightly rotated)
    const rotationOffset = (layerIndex * 360) / layerCount;
    
    // Create text atom
    const textAtom: RenderableComponentData = {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight.toString(),
          textAlign: 'center',
          background: gradientString,
          backgroundSize: '300% 100%',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          opacity: opacity,
          filter: `blur(${blur}px)`,
        },
        font: {
          family: fontFamily,
          weights: [fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-track',
        },
      },
    };
    
    // Create layer container with transforms
    const layerContainer: RenderableComponentData = {
      id: layerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transformStyle: 'preserve-3d',
            willChange: 'transform',
            transform: `translateZ(${translateZ}px) scale(${scale}) rotate(${rotationOffset}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-track',
        },
      },
      childrenData: [textAtom],
    };
    
    layers.push(layerContainer);
  }
  
  // Layers container (for bass pulsing effect)
  const tunnelLayersContainer: RenderableComponentData = {
    id: 'tunnel-layers-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: layers,
  };
  
  // Audio track
  const audioTrack: RenderableComponentData = {
    id: 'audio-track',
    type: 'atom' as const,
    componentId: 'AudioAtom',
    data: {
      src: params.audio.src,
      volume: params.audio.volume ?? 1,
    },
    context: {
      timing: {
        start: 0,
      },
    },
  };
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'tunnel-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
          perspectiveOrigin: '50% 50%',
          backgroundColor: params.backgroundColor,
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [tunnelLayersContainer, audioTrack],
  };
  
  // --- Effects ---
  
  // Rotation effect for all layers (spiral motion)
  const rotationEffect = {
    id: 'rotation-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      fitDurationTo: 'audio-track',
      mode: 'provider' as const,
      targetIds: layers.map((layer) => layer.id),
      ranges: [
        { key: 'rotateZ', val: 0, prog: 0 },
        { key: 'rotateZ', val: 360 * params.rotationSpeed, prog: 1 },
      ],
    },
  };
  
  // Gradient animation (background-position shift)
  const gradientEffect = {
    id: 'gradient-animation-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      fitDurationTo: 'audio-track',
      mode: 'provider' as const,
      targetIds: layers
        .map((layer) => layer.childrenData?.[0]?.id)
        .filter(Boolean) as string[],
      ranges: [
        { key: 'backgroundPosition', val: '0% 50%', prog: 0 },
        { key: 'backgroundPosition', val: '200% 50%', prog: 1 },
      ],
    },
  };
  
  // Bass pulse effect (scale pulsing on tunnel container)
  const bassPulseEffect = {
    id: 'bass-pulse-effect',
    componentId: 'waveform',
    data: {
      start: 0,
      fitDurationTo: 'audio-track',
      mode: 'provider' as const,
      targetIds: ['tunnel-layers-container'],
      audioSrc: params.audio.src,
      audioProperty: 'bass' as const,
      effectType: 'scale' as const,
      intensity: params.bassIntensity,
      baseScale: 1,
      sensitivity: 1.5,
      threshold: 0.2,
      numberOfSamples: 128,
      useFrequencyData: true,
      smoothNormalisation: 1,
    },
  };
  
  // Attach effects to root
  rootContainer.effects = [rotationEffect, gradientEffect, bassPulseEffect];
  
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
  id: 'recursiveTypographyTunnel',
  title: 'Recursive Typography Tunnel',
  description:
    'Creates an infinite spiral tunnel effect where text layers rotate and scale inward toward a vanishing point, with bass-reactive pulsing and hypnotic color gradients. Text appears to travel from the viewer into an infinite vortex with smooth rotation matching BPM and depth pulsing synchronized to bass hits.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'tunnel',
    'recursive',
    'spiral',
    'infinite',
    '3d',
    'depth',
    'bass-reactive',
    'music-visualization',
    'hypnotic',
    'gradient',
    'vortex',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'INFINITE',
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
    },
    layerCount: 15,
    rotationSpeed: 1,
    bassIntensity: 0.15,
    gradientColors: ['#ff00ff', '#00ffff', '#ffff00', '#ff00ff'],
    fontSize: 120,
    fontFamily: 'Inter:900',
    depthFogStart: 0.3,
    blurIntensity: 7,
    backgroundColor: '#000000',
  },
};

// --- Export ---

export const recursiveTypographyTunnelPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
