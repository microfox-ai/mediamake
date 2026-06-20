/**
 * Chaotic Data-Moshing Typokinetics Preset
 *
 * This preset simulates competing video codecs fighting for control of text through:
 * - Datamoshing effects with temporal smearing and frame persistence
 * - Motion vector errors causing text to "leak" between frames
 * - Macro-blocking artifacts with pixelation effects
 * - P-frame and I-frame simulation with smooth motion vs sudden resets
 * - Codec error shakes simulating missing/corrupted keyframes
 *
 * Features:
 * - **Frame Buffer System**: 3-4 BaseLayout layers with staggered timing for temporal persistence
 * - **Datamosh Smear**: Previous frames persist with opacity decay and motion vector offsets
 * - **Macro-blocking**: Periodic pixelation effects simulating compression artifacts
 * - **P-frame/I-frame**: Smooth motion periods interrupted by sudden position resets
 * - **Motion Vector Errors**: Random translateX/Y jumps simulating codec glitches
 * - **Scanline Overlay**: Interlacing effect for retro compression aesthetic
 * - **Hardware Accelerated**: Uses translateZ(0) and CSS contain:strict for performance
 *
 * Use cases:
 * - Creating glitch art typography
 * - Simulating digital corruption aesthetics
 * - Tech/cyberpunk themed titles
 * - Experimental video art
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfx/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display with datamoshing effects'),
  duration: z
    .number()
    .min(1)
    .default(5)
    .describe('Total duration in seconds for the effect'),
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(96)
    .describe('Base font size in pixels (text-6xl default)'),
  textColor: z
    .string()
    .default('#00FF00')
    .describe('Text color (default: green-400 #00FF00)'),
  intensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall effect intensity multiplier (0.1-3.0, default: 1.0)'),
  glitchFrequency: z
    .number()
    .min(0.1)
    .max(2)
    .default(1)
    .describe(
      'Frequency of glitch events per second (0.1-2.0, default: 1.0)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { text, duration, fontSize, textColor, intensity, glitchFrequency } =
    params;

  // Calculate effect timings based on intensity and frequency
  const transitionDuration = 0.5 * intensity;
  const glitchInterval = 1 / glitchFrequency;

  // Helper: Create text layer with effects
  const createTextLayer = (
    layerId: string,
    layerIndex: number,
    startOffset: number,
  ): RenderableComponentData => {
    const textId = `${layerId}-text`;

    // Calculate effect timings for this layer
    const datamoshStart = startOffset;
    const datamoshDuration = 0.3 * intensity;

    const iframeResetStart = datamoshStart + 0.5;
    const iframeResetDuration = 0.05;

    const motionGlitchStart = 1.0 + layerIndex * 0.3;
    const motionGlitchDuration = 0.1;

    const compressionStart = 1.5 + layerIndex * 0.2;
    const compressionDuration = 0.4 * intensity;

    const codecShakeStart = 1.8 + layerIndex * 0.25;
    const codecShakeDuration = 0.1;

    // Create effects for this text layer
    const effects: any[] = [];

    // Datamosh smear effect
    effects.push({
      id: `datamosh-smear-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: datamoshStart,
        duration: datamoshDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 20 * intensity, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 1 },
        ],
      },
    });

    // I-frame reset (sudden position jump)
    effects.push({
      id: `iframe-reset-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: iframeResetStart,
        duration: iframeResetDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'translateX', val: 20 * intensity, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    });

    // Motion vector error glitch
    effects.push({
      id: `motion-vector-glitch-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: motionGlitchStart,
        duration: motionGlitchDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: -35 * intensity, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 40 * intensity, prog: 0.5 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    });

    // Compression artifact (blur + contrast)
    effects.push({
      id: `compression-artifact-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: compressionStart,
        duration: compressionDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'blur', val: 0, prog: 0 },
          { key: 'blur', val: 4 * intensity, prog: 0.5 },
          { key: 'blur', val: 0, prog: 1 },
          { key: 'contrast', val: 1, prog: 0 },
          { key: 'contrast', val: 0.5, prog: 0.5 },
          { key: 'contrast', val: 1, prog: 1 },
        ],
      },
    });

    // Codec shake
    effects.push({
      id: `codec-shake-${layerId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: codecShakeStart,
        duration: codecShakeDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 30 * intensity, prog: 0.33 },
          { key: 'translateX', val: -25 * intensity, prog: 0.67 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -20 * intensity, prog: 0.33 },
          { key: 'translateY', val: 35 * intensity, prog: 0.67 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      },
    });

    return {
      id: textId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'font-mono subpixel-antialiased',
        style: {
          fontSize: `${fontSize}px`,
          color: textColor,
          textShadow: `0 0 10px ${textColor}80`,
          willChange: 'transform, opacity',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration - startOffset,
        },
      },
      effects: effects,
    } as RenderableComponentData;
  };

  // Create frame buffer layers with staggered timing
  const frameBufferLayers: RenderableComponentData[] = [];

  // Layer 1: Main layer with difference blend
  frameBufferLayers.push({
    id: 'frame-buffer-layer-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: 'difference',
          transform: 'translateZ(0)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [createTextLayer('layer-1', 0, 0)],
  } as RenderableComponentData);

  // Layer 2: Offset layer with screen blend
  frameBufferLayers.push({
    id: 'frame-buffer-layer-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: 'screen',
          transform: 'translateZ(0)',
        },
      },
    },
    context: {
      timing: {
        start: 0.15,
        duration: duration - 0.15,
      },
    },
    childrenData: [createTextLayer('layer-2', 1, 0.15)],
  } as RenderableComponentData);

  // Layer 3: Second offset layer with difference blend
  frameBufferLayers.push({
    id: 'frame-buffer-layer-3',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: 'difference',
          transform: 'translateZ(0)',
        },
      },
    },
    context: {
      timing: {
        start: 0.3,
        duration: duration - 0.3,
      },
    },
    childrenData: [createTextLayer('layer-3', 2, 0.3)],
  } as RenderableComponentData);

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,255,0,0.03) 2px, rgba(0,255,0,0.03) 4px);"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  } as RenderableComponentData;

  // Pixel grid overlay with pulsing effect
  const pixelGridOverlay: RenderableComponentData = {
    id: 'pixel-grid-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 pointer-events-none" style="background-image: repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(0,255,0,0.05) 8px, rgba(0,255,0,0.05) 9px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,255,0,0.05) 8px, rgba(0,255,0,0.05) 9px);"></div>`,
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'macroblock-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.2 * intensity,
          mode: 'provider',
          targetIds: ['pixel-grid-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 0.6 },
            { key: 'opacity', val: 0.5, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'datamosh-typokinetics-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
        style: {
          contain: 'strict',
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
      scanlineOverlay,
      ...frameBufferLayers,
      pixelGridOverlay,
    ],
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
  id: 'datamoshTypokinetics',
  title: 'Chaotic Data-Moshing Typokinetics',
  description:
    'A preset that simulates competing video codecs fighting for control of text through datamoshing effects, temporal smearing, motion vector errors, macro-blocking artifacts, and P-frame/I-frame simulation. Creates the appearance of text being torn apart pixel by pixel by compression algorithms with codec-error shakes, frame persistence blending, and quality degradation artifacts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'datamosh',
    'codec',
    'compression',
    'experimental',
    'kinetic',
    'motion-graphics',
    'tech',
    'cyberpunk',
  ],
  defaultInputParams: {
    text: 'CORRUPTED',
    duration: 5,
    fontSize: 96,
    textColor: '#00FF00',
    intensity: 1,
    glitchFrequency: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const datamoshTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
