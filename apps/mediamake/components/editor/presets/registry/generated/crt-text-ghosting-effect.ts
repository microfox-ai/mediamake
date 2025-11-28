/**
 * CRT Text Ghosting Effect Preset
 * 
 * A glitchy digital text ghosting effect inspired by old CRT monitors and VHS tape artifacts.
 * The text appears to 'smear' horizontally as if the video signal is degraded, creating RGB 
 * channel separation. Each color channel (red, green, blue) is offset slightly in position 
 * and time, creating chromatic aberration trails.
 * 
 * Features:
 * - RGB channel separation with individual offsets
 * - Horizontal ghosting with multiple overlapping copies
 * - Scan line interference patterns
 * - Rhythmic pulsing between clarity and intense ghosting
 * - Random flicker effects simulating signal interference
 * - Skew distortion for enhanced realism
 * 
 * Use cases:
 * - Retro tech aesthetic titles
 * - VHS/CRT-styled video effects
 * - Glitch art typography
 * - Cyberpunk or dystopian themes
 * - Digital corruption effects
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text content to display with CRT ghosting effect'),
  duration: z.number().default(5).describe('Duration of the effect in seconds'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family name (e.g., "Inter", "Roboto")'),
  textColor: z.string().default('#ffffff').describe('Base text color (hex format)'),
  rgbIntensity: z.number().min(0.1).max(3).default(1).describe('Intensity multiplier for RGB separation effect'),
  ghostCount: z.number().min(1).max(5).default(3).describe('Number of ghost layers'),
  ghostIntensity: z.number().min(0.1).max(3).default(1).describe('Intensity multiplier for ghosting effect'),
  flickerIntensity: z.number().min(0.1).max(3).default(1).describe('Intensity multiplier for flicker effect'),
  scanlineOpacity: z.number().min(0).max(1).default(0.6).describe('Opacity of scanline overlay'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    textColor,
    rgbIntensity,
    ghostCount,
    ghostIntensity,
    flickerIntensity,
    scanlineOpacity,
  } = params;

  // Helper function to generate flicker opacity values
  const generateFlickerKeyframes = (count: number = 15) => {
    const keyframes = [];
    for (let i = 0; i <= count; i++) {
      keyframes.push({
        key: 'opacity',
        val: 0.7 + Math.random() * 0.3,
        prog: i / count,
      });
    }
    return keyframes;
  };

  // Base text layer (non-RGB, for pulsing clarity)
  const baseTextLayer: RenderableComponentData = {
    id: 'crt-base-text-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: textColor,
        textAlign: 'center',
        textShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // RGB channel layers
  const redChannelLayer: RenderableComponentData = {
    id: 'crt-red-channel-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: '#ff0000',
        textAlign: 'center',
        mixBlendMode: 'screen',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const greenChannelLayer: RenderableComponentData = {
    id: 'crt-green-channel-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: '#00ff00',
        textAlign: 'center',
        mixBlendMode: 'screen',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const blueChannelLayer: RenderableComponentData = {
    id: 'crt-blue-channel-layer',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: '#0000ff',
        textAlign: 'center',
        mixBlendMode: 'screen',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Ghost layers
  const ghostLayers: RenderableComponentData[] = Array.from({ length: ghostCount }, (_, i) => ({
    id: `crt-ghost-layer-${i + 1}`,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '700',
        color: '#ffffff',
        textAlign: 'center',
        mixBlendMode: 'screen',
      },
      font: {
        family: fontFamily,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  }));

  // Scanlines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: 'crt-scanlines-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.15) 0px, rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px)',
          mixBlendMode: 'multiply',
          opacity: scanlineOpacity,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // Effects: RGB chromatic aberration
  const rgbChromaticEffect = {
    id: 'crt-rgb-chromatic-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      type: 'ease-in-out',
      start: 0,
      duration,
      targetIds: ['crt-red-channel-layer', 'crt-green-channel-layer', 'crt-blue-channel-layer'],
      ranges: [
        // Red channel
        { key: 'translateX', val: -2 * rgbIntensity, prog: 0, targetId: 'crt-red-channel-layer' },
        { key: 'translateX', val: -5 * rgbIntensity, prog: 0.25, targetId: 'crt-red-channel-layer' },
        { key: 'translateX', val: -2 * rgbIntensity, prog: 0.5, targetId: 'crt-red-channel-layer' },
        { key: 'translateX', val: -4 * rgbIntensity, prog: 0.75, targetId: 'crt-red-channel-layer' },
        { key: 'translateX', val: -2 * rgbIntensity, prog: 1, targetId: 'crt-red-channel-layer' },
        // Green channel (stays centered)
        { key: 'translateX', val: 0, prog: 0, targetId: 'crt-green-channel-layer' },
        { key: 'translateX', val: 0, prog: 1, targetId: 'crt-green-channel-layer' },
        // Blue channel
        { key: 'translateX', val: 2 * rgbIntensity, prog: 0, targetId: 'crt-blue-channel-layer' },
        { key: 'translateX', val: 5 * rgbIntensity, prog: 0.25, targetId: 'crt-blue-channel-layer' },
        { key: 'translateX', val: 2 * rgbIntensity, prog: 0.5, targetId: 'crt-blue-channel-layer' },
        { key: 'translateX', val: 4 * rgbIntensity, prog: 0.75, targetId: 'crt-blue-channel-layer' },
        { key: 'translateX', val: 2 * rgbIntensity, prog: 1, targetId: 'crt-blue-channel-layer' },
      ],
    },
  };

  // Effects: Ghost horizontal shift
  const ghostTargetIds = ghostLayers.map((layer) => layer.id);
  const ghostHorizontalShiftRanges = [];
  
  ghostLayers.forEach((layer, i) => {
    const offset = (i + 1) * 10 * ghostIntensity;
    const variance = 5 * ghostIntensity;
    
    ghostHorizontalShiftRanges.push(
      { key: 'translateX', val: -(offset + variance), prog: 0, targetId: layer.id },
      { key: 'translateX', val: -(offset - variance), prog: 0.3, targetId: layer.id },
      { key: 'translateX', val: -(offset + variance * 1.5), prog: 0.6, targetId: layer.id },
      { key: 'translateX', val: -(offset + variance * 0.5), prog: 1, targetId: layer.id },
      { key: 'opacity', val: 0.2 + (0.2 * (ghostLayers.length - i)) / ghostLayers.length, prog: 0, targetId: layer.id },
      { key: 'opacity', val: 0.4 + (0.2 * (ghostLayers.length - i)) / ghostLayers.length, prog: 0.5, targetId: layer.id },
      { key: 'opacity', val: 0.15 + (0.15 * (ghostLayers.length - i)) / ghostLayers.length, prog: 1, targetId: layer.id },
    );
  });

  const ghostHorizontalShiftEffect = {
    id: 'crt-ghost-horizontal-shift-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      type: 'spring',
      start: 0,
      duration,
      targetIds: ghostTargetIds,
      ranges: ghostHorizontalShiftRanges,
    },
  };

  // Effects: Ghost skew distortion
  const ghostSkewDistortionRanges = [];
  
  ghostLayers.forEach((layer, i) => {
    const skewAmount = (i + 1) * 0.5;
    
    ghostSkewDistortionRanges.push(
      { key: 'skewX', val: -skewAmount, prog: 0, targetId: layer.id },
      { key: 'skewX', val: skewAmount, prog: 0.5, targetId: layer.id },
      { key: 'skewX', val: -skewAmount * 0.5, prog: 1, targetId: layer.id },
    );
  });

  const ghostSkewDistortionEffect = {
    id: 'crt-ghost-skew-distortion-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      type: 'ease-in-out',
      start: 0,
      duration,
      targetIds: ghostTargetIds,
      ranges: ghostSkewDistortionRanges,
    },
  };

  // Effects: Flicker interference
  const allLayerIds = [
    'crt-red-channel-layer',
    'crt-green-channel-layer',
    'crt-blue-channel-layer',
    ...ghostTargetIds,
  ];

  const flickerInterferenceEffect = {
    id: 'crt-flicker-interference-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      type: 'linear',
      start: 0,
      duration,
      targetIds: allLayerIds,
      ranges: generateFlickerKeyframes(15).map(kf => ({
        ...kf,
        val: 0.7 + (kf.val - 0.7) * flickerIntensity,
      })),
    },
  };

  // Effects: Clarity pulse (base text)
  const clarityPulseEffect = {
    id: 'crt-clarity-pulse-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      type: 'ease-in-out',
      start: 0,
      duration,
      targetIds: ['crt-base-text-layer'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0.3, prog: 0.25 },
        { key: 'opacity', val: 0.9, prog: 0.5 },
        { key: 'opacity', val: 0.2, prog: 0.75 },
        { key: 'opacity', val: 0.8, prog: 1 },
      ],
    },
  };

  // Effects: Scanlines distortion
  const scanlinesDistortionEffect = {
    id: 'crt-scanlines-distortion-effect',
    componentId: 'generic',
    data: {
      mode: 'provider',
      type: 'ease-in-out',
      start: 0,
      duration,
      targetIds: ['crt-scanlines-overlay'],
      ranges: [
        { key: 'opacity', val: scanlineOpacity, prog: 0 },
        { key: 'opacity', val: scanlineOpacity * 1.3, prog: 0.3 },
        { key: 'opacity', val: scanlineOpacity * 0.8, prog: 0.6 },
        { key: 'opacity', val: scanlineOpacity * 1.5, prog: 0.8 },
        { key: 'opacity', val: scanlineOpacity, prog: 1 },
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: 2, prog: 0.5 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'crt-text-ghosting-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      rgbChromaticEffect,
      ghostHorizontalShiftEffect,
      ghostSkewDistortionEffect,
      flickerInterferenceEffect,
      clarityPulseEffect,
      scanlinesDistortionEffect,
    ],
    childrenData: [
      baseTextLayer,
      redChannelLayer,
      greenChannelLayer,
      blueChannelLayer,
      ...ghostLayers,
      scanlinesOverlay,
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
  id: 'crt-text-ghosting-effect',
  title: 'CRT Text Ghosting Effect',
  description: 'A glitchy digital text ghosting effect inspired by old CRT monitors and VHS tape artifacts. Features RGB channel separation with chromatic aberration trails, scan line interference patterns, and rhythmic pulsing between clarity and intense ghosting with random flicker effects simulating signal interference.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'glitch', 'crt', 'vhs', 'retro', 'ghosting', 'rgb', 'chromatic-aberration', 'scanline', 'typography', 'effect'],
  defaultInputParams: {
    text: 'GLITCH TEXT',
    duration: 5,
    fontSize: 72,
    fontFamily: 'Inter',
    textColor: '#ffffff',
    rgbIntensity: 1,
    ghostCount: 3,
    ghostIntensity: 1,
    flickerIntensity: 1,
    scanlineOpacity: 0.6,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const crtTextGhostingEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};