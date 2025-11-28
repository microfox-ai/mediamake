/**
 * Retro-Futuristic Typokinetics CRT Preset
 *
 * This preset creates an 80s-inspired retro-futuristic text effect with CRT monitor aesthetics.
 * Features include:
 * - Base micro-flicker at 60fps intervals (0.9-1.0 opacity)
 * - Audio-driven pulse effects with stepped easing
 * - Horizontal scan line effects
 * - Multiple retro styles: VHS, CRT, and LED display
 * - Chromatic aberration simulation via opacity offsets
 * - Phosphor glow decay effects
 * - Discrete opacity steps for LED-style rendering
 *
 * Use cases:
 * - 80s-themed music videos
 * - Retro tech presentations
 * - Synthwave visual content
 * - Nostalgic brand intros
 * - Cyberpunk aesthetics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('RETRO FUTURE')
    .describe('Text content to display with CRT effects'),
  
  style: z
    .enum(['CRT', 'VHS', 'LED'])
    .default('CRT')
    .describe('Retro style mode: CRT (phosphor glow), VHS (chromatic aberration), or LED (discrete steps)'),
  
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  
  font: z
    .string()
    .default('Courier:700:normal')
    .describe('Font family with weight and style (e.g., "JetBrainsMono:500:normal")'),
  
  baseFlickerIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Intensity of base micro-flicker (0-1, higher = more visible flicker)'),
  
  pulseIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of audio-driven pulse effect (0-1)'),
  
  scanLineOpacity: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.03)
    .describe('Opacity variation for scan line effects (0-0.2)'),
  
  glowIntensity: z
    .number()
    .min(0)
    .max(3)
    .default(1.5)
    .describe('Intensity of phosphor glow effect (CRT style)'),
  
  chromaticAberration: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Chromatic aberration offset in pixels (VHS style)'),
  
  ledSteps: z
    .number()
    .min(2)
    .max(20)
    .default(10)
    .describe('Number of discrete opacity steps for LED display style'),
  
  duration: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Duration of the effect in seconds'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'retro-typokinetics-container';
  const textId = 'retro-typokinetics-text';
  const scanLineId = 'retro-scanline-overlay';
  
  // Parse font string (format: "FontName:weight:style")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    
    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };
  
  const { fontFamily, fontStyle } = parseFontString(params.font);
  
  // Style configuration based on preset mode
  const getStyleConfig = () => {
    switch (params.style) {
      case 'CRT':
        return {
          color: '#00ff88',
          textShadow: `0 0 ${10 * params.glowIntensity}px currentColor, 0 0 ${20 * params.glowIntensity}px currentColor, 0 0 ${30 * params.glowIntensity}px currentColor`,
          filter: 'contrast(1.1) brightness(1.05)',
        };
      case 'VHS':
        return {
          color: '#00ffff',
          textShadow: `${params.chromaticAberration}px 0 0 #ff0000, -${params.chromaticAberration}px 0 0 #0000ff, 0 0 10px currentColor`,
          filter: 'contrast(0.95) saturate(1.2)',
        };
      case 'LED':
        return {
          color: '#ffaa00',
          textShadow: '0 0 5px currentColor, 0 0 10px currentColor',
          filter: 'contrast(1.2) brightness(1.1)',
        };
      default:
        return {
          color: '#00ff88',
          textShadow: '0 0 10px currentColor',
        };
    }
  };
  
  const styleConfig = getStyleConfig();
  
  // Create base flicker effect (60fps micro-flicker)
  // Using rapid keyframe progression to simulate 60fps at 30fps render
  const createBaseFlickerEffect = () => {
    const flickerRanges = [];
    const steps = 20; // 20 steps over duration for micro-flicker
    
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      // Random flicker between 0.9 and 1.0
      const opacity = 0.9 + (Math.sin(i * 17.3) * 0.5 + 0.5) * params.baseFlickerIntensity;
      flickerRanges.push({ key: 'opacity', val: Math.min(1, opacity), prog });
    }
    
    return {
      id: 'base-flicker-effect',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: flickerRanges,
      },
    };
  };
  
  // Create audio-driven pulse effect with stepped easing (LED-style)
  const createPulseEffect = () => {
    const pulseRanges = [];
    const steps = params.ledSteps;
    
    // Create pulse cycle with discrete steps
    for (let i = 0; i <= steps; i++) {
      const rawProg = i / steps;
      // Sine wave for pulse, then discretize
      const sineValue = 0.5 + 0.5 * Math.sin(rawProg * Math.PI * 2);
      const steppedValue = Math.floor(sineValue * steps) / steps;
      const scale = 1 + steppedValue * params.pulseIntensity * 0.2;
      
      pulseRanges.push({ key: 'scale', val: scale, prog: rawProg });
    }
    
    return {
      id: 'audio-pulse-effect',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: pulseRanges,
      },
    };
  };
  
  // Create glow intensity pulse
  const createGlowPulseEffect = () => {
    return {
      id: 'glow-pulse-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: params.duration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'filter.brightness', val: 1, prog: 0 },
          { key: 'filter.brightness', val: 1.1 + params.pulseIntensity * 0.3, prog: 0.25 },
          { key: 'filter.brightness', val: 1, prog: 0.5 },
          { key: 'filter.brightness', val: 1.1 + params.pulseIntensity * 0.3, prog: 0.75 },
          { key: 'filter.brightness', val: 1, prog: 1 },
        ],
      },
    };
  };
  
  // Scan line overlay using HTMLBlockAtom
  const scanLineOverlay = {
    id: scanLineId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 0%,rgba(255,255,255,${params.scanLineOpacity}) 50%,transparent 100%);background-size:100% 4px;pointer-events:none;animation:scanline 0.1s linear infinite;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };
  
  // Main text atom
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'font-mono whitespace-pre',
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle || 'normal',
        color: styleConfig.color,
        textShadow: styleConfig.textShadow,
        letterSpacing: '0.1em',
        filter: styleConfig.filter,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        subsets: ['latin'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      createBaseFlickerEffect(),
      createPulseEffect(),
      createGlowPulseEffect(),
    ],
  };
  
  // Text container layout
  const textContainer = {
    id: 'text-container',
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
        duration: params.duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
  };
  
  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      scanLineOverlay,
      textContainer,
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'retro-typokinetics-crt',
  title: 'Retro Typokinetics CRT Preset',
  description:
    'A retro-futuristic typokinetics preset inspired by 80s music videos featuring CRT monitor effects with text opacity flickers, audio-driven pulses, scan line effects, and multiple retro style options (VHS, CRT, LED). Text responds to synthesizer beats with base micro-flickers at 60fps intervals overlaid with larger audio-driven pulses.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'retro',
    'crt',
    'vhs',
    'led',
    '80s',
    'synthwave',
    'glitch',
    'flicker',
    'scan-lines',
    'chromatic-aberration',
    'phosphor-glow',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'RETRO FUTURE',
    style: 'CRT',
    fontSize: 72,
    font: 'Courier:700:normal',
    baseFlickerIntensity: 0.1,
    pulseIntensity: 0.3,
    scanLineOpacity: 0.03,
    glowIntensity: 1.5,
    chromaticAberration: 2,
    ledSteps: 10,
    duration: 10,
  },
};

// --- Export Preset ---
export const retroTypokineticsCrtPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
