/**
 * Retro CRT Typokinetics Preset
 * 
 * A kinetic typography preset that simulates a retro CRT monitor aesthetic with magnetic distortion, 
 * phosphor bloom, scan lines, chromatic aberration, and horizontal sync glitches. Text transitions 
 * from a distorted barrel-warped state to clear text with elastic spring-back animation.
 * 
 * Features:
 * - **Magnetic Distortion**: Text starts with barrel distortion (like a magnet on CRT) and springs back
 * - **Phosphor Bloom**: Bright parts of chrome text bleed slightly, creating CRT glow
 * - **Scan Lines**: Horizontal raster lines overlay across the surface
 * - **Chromatic Aberration**: RGB channel separation, strongest at screen edges
 * - **Horizontal Hold Issues**: Periodic vertical jumps simulating sync problems
 * - **Static Noise Transition**: Each word "tunes in" like changing channels with static noise
 * - **Brushed Aluminum Chrome**: Subtle metallic finish rather than mirror chrome
 * 
 * Use cases:
 * - Retro TV commercial title sequences
 * - Nostalgic 80s/90s aesthetic video intros
 * - Tech/gaming content with vintage vibes
 * - Music videos with retro-futuristic themes
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  caption: z.custom<TranscriptionSentence>().describe('Caption data with word-level timing'),
  font: z.string().optional().default('Orbitron:700').describe('Font family with optional weight and style (e.g., "Orbitron:700", "Share Tech Mono:400")'),
  fontSize: z.number().optional().default(72).describe('Font size in pixels'),
  textColor: z.string().optional().default('#c0c0c0').describe('Base text color (brushed aluminum default)'),
  barrelDistortionDegrees: z.number().optional().default(30).describe('Initial barrel distortion rotation in degrees'),
  phosphorBlurAmount: z.number().optional().default(8).describe('Phosphor bloom blur radius in pixels'),
  chromaticAberrationOffset: z.number().optional().default(2).describe('RGB channel offset in pixels at edges'),
  horizontalHoldInterval: z.number().optional().default(1.5).describe('Interval between horizontal hold glitches in seconds'),
  horizontalHoldAmount: z.number().optional().default(5).describe('Vertical jump amount in pixels for sync glitches'),
  staticTransitionDuration: z.number().optional().default(0.3).describe('Duration of static noise transition per word'),
  impact: z.number().optional().default(1.0).describe('Effect intensity multiplier (0.5 = subtle, 1.0 = default, 2.0 = intense)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    caption,
    font = 'Orbitron:700',
    fontSize = 72,
    textColor = '#c0c0c0',
    barrelDistortionDegrees = 30,
    phosphorBlurAmount = 8,
    chromaticAberrationOffset = 2,
    horizontalHoldInterval = 1.5,
    horizontalHoldAmount = 5,
    staticTransitionDuration = 0.3,
    impact = 1.0,
  } = params;

  // Parse font string
  const parseFontString = (fontStr: string) => {
    if (fontStr.includes(':')) {
      const parts = fontStr.split(':');
      return {
        family: parts[0],
        weight: parts[1] ? parseInt(parts[1], 10) : 700,
        style: parts[2] || 'normal',
      };
    }
    return { family: fontStr, weight: 700, style: 'normal' };
  };

  const fontConfig = parseFontString(font);

  // Apply impact to effect parameters
  const adjustedBarrelDistortion = barrelDistortionDegrees * impact;
  const adjustedPhosphorBlur = phosphorBlurAmount * impact;
  const adjustedChromaticOffset = chromaticAberrationOffset * impact;
  const adjustedStaticDuration = staticTransitionDuration / impact;

  // Create word components for each RGB channel + glow layer
  const createWordLayer = (word: any, index: number, channelColor: string, offset: number, isGlow: boolean = false) => {
    const wordId = `${channelColor}-word-${index}`;
    
    // Calculate chromatic aberration offset (stronger at edges)
    const totalWords = caption.words.length;
    const normalizedPosition = index / (totalWords - 1 || 1); // 0 at start, 1 at end
    const edgeDistance = Math.abs(normalizedPosition - 0.5) * 2; // 0 at center, 1 at edges
    const chromaticOffset = offset * edgeDistance * adjustedChromaticOffset;

    const wordData: any = {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word.text,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontConfig.weight,
          fontStyle: fontConfig.style,
          color: isGlow ? textColor : 'inherit',
          marginRight: '0.3em',
          // Brushed aluminum gradient effect
          background: isGlow ? 'none' : 'linear-gradient(90deg, #999, #ccc, #999)',
          WebkitBackgroundClip: isGlow ? 'initial' : 'text',
          WebkitTextFillColor: isGlow ? 'inherit' : 'transparent',
          backgroundClip: isGlow ? 'initial' : 'text',
        },
        font: {
          family: fontConfig.family,
          weights: [fontConfig.weight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [] as any[],
    };

    // Static noise transition effect (word-by-word reveal)
    if (!isGlow) {
      wordData.effects.push({
        id: `static-reveal-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: word.start,
          duration: adjustedStaticDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });
    }

    // Chromatic aberration offset effect
    if (chromaticOffset !== 0 && !isGlow) {
      wordData.effects.push({
        id: `chromatic-offset-${wordId}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: caption.duration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: chromaticOffset, prog: 0 },
            { key: 'translateX', val: chromaticOffset, prog: 1 },
          ],
        },
      });
    }

    return wordData;
  };

  // Create red, green, blue channel layers + glow layer
  const redChannelWords = caption.words.map((word: any, index: number) => 
    createWordLayer(word, index, 'red', -1)
  );

  const greenChannelWords = caption.words.map((word: any, index: number) => 
    createWordLayer(word, index, 'green', 0)
  );

  const blueChannelWords = caption.words.map((word: any, index: number) => 
    createWordLayer(word, index, 'blue', 1)
  );

  const glowLayerWords = caption.words.map((word: any, index: number) => 
    createWordLayer(word, index, 'glow', 0, true)
  );

  // Red channel layer
  const redChannelLayer: RenderableComponentData = {
    id: 'red-channel-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: 'screen' as any,
          color: '#ff0000',
          filter: 'blur(0.5px)',
        },
      },
      repeatChildrenProps: {
        className: 'inline-block mx-1',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: redChannelWords as RenderableComponentData[],
  };

  // Green channel layer
  const greenChannelLayer: RenderableComponentData = {
    id: 'green-channel-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: 'screen' as any,
          color: '#00ff00',
          filter: 'blur(0.5px)',
        },
      },
      repeatChildrenProps: {
        className: 'inline-block mx-1',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: greenChannelWords as RenderableComponentData[],
  };

  // Blue channel layer
  const blueChannelLayer: RenderableComponentData = {
    id: 'blue-channel-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: 'screen' as any,
          color: '#0000ff',
          filter: 'blur(0.5px)',
        },
      },
      repeatChildrenProps: {
        className: 'inline-block mx-1',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: blueChannelWords as RenderableComponentData[],
  };

  // Glow layer (phosphor bloom)
  const glowLayer: RenderableComponentData = {
    id: 'glow-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          mixBlendMode: 'screen' as any,
          filter: `blur(${adjustedPhosphorBlur}px)`,
          opacity: 0.6,
        },
      },
      repeatChildrenProps: {
        className: 'inline-block mx-1',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    childrenData: glowLayerWords as RenderableComponentData[],
  };

  // Chromatic aberration container with all layers
  const chromaticAberrationContainer: RenderableComponentData = {
    id: 'chromatic-aberration-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as any,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    effects: [
      // Barrel distortion effect (perspective transform with spring easing)
      {
        id: 'barrel-distortion',
        componentId: 'generic',
        data: {
          type: 'spring',
          start: 0,
          duration: caption.duration * 0.5,
          mode: 'provider',
          targetIds: ['chromatic-aberration-container'],
          ranges: [
            { key: 'rotateY', val: adjustedBarrelDistortion, prog: 0 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
      // Horizontal hold glitch effect (periodic translateY jumps)
      ...(Array.from({ length: Math.ceil(caption.duration / horizontalHoldInterval) }, (_, i) => {
        const glitchTime = i * horizontalHoldInterval;
        if (glitchTime >= caption.duration) return null;
        
        return {
          id: `horizontal-hold-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: glitchTime,
            duration: 0.05,
            mode: 'provider',
            targetIds: ['chromatic-aberration-container'],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: horizontalHoldAmount * (Math.random() > 0.5 ? 1 : -1), prog: 0.5 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        };
      }).filter(Boolean) as any[]),
    ],
    childrenData: [redChannelLayer, greenChannelLayer, blueChannelLayer, glowLayer],
  };

  // Scan lines overlay
  const scanlinesOverlay: RenderableComponentData = {
    id: 'scanlines-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.03) 1px, transparent 2px); z-index: 10;"></div>',
      style: {
        mixBlendMode: 'overlay' as any,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
  };

  // Static noise overlay (animated per word)
  const staticNoiseOverlay: RenderableComponentData = {
    id: 'static-noise-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="position: absolute; inset: 0; pointer-events: none; background-image: url(\'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjUiLz48L3N2Zz4=\'); background-size: 200px 200px; mix-blend-mode: overlay; z-index: 20;"></div>',
      style: {
        opacity: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: caption.duration,
      },
    },
    effects: caption.words.map((word: any, index: number) => ({
      id: `static-flash-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: word.start,
        duration: adjustedStaticDuration,
        mode: 'provider',
        targetIds: ['static-noise-overlay'],
        ranges: [
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    })),
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'retro-crt-typokinetics-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: caption.absoluteStart,
        duration: caption.duration,
      },
    },
    childrenData: [scanlinesOverlay, chromaticAberrationContainer, staticNoiseOverlay],
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
  id: 'retro-crt-typokinetics',
  title: 'Retro CRT Typokinetics',
  description: 'A kinetic typography preset that simulates a retro CRT monitor aesthetic with magnetic distortion, phosphor bloom, scan lines, chromatic aberration, and horizontal sync glitches. Text transitions from distorted barrel-warped state to clear with elastic spring-back animation. Features word-by-word "channel tuning" reveals with static noise transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'retro',
    'crt',
    'vintage',
    '80s',
    '90s',
    'distortion',
    'chromatic-aberration',
    'phosphor',
    'scan-lines',
    'glitch',
    'magnetic',
    'tv',
    'commercial',
    'title-sequence',
  ],
  defaultInputParams: {
    caption: {
      id: 'caption-1',
      text: 'Retro CRT Effect',
      start: 0,
      end: 3,
      duration: 3,
      absoluteStart: 0,
      absoluteEnd: 3,
      words: [
        {
          id: 'word-1',
          text: 'Retro',
          start: 0,
          end: 1,
          duration: 1,
          absoluteStart: 0,
          absoluteEnd: 1,
          confidence: 1,
        },
        {
          id: 'word-2',
          text: 'CRT',
          start: 1,
          end: 2,
          duration: 1,
          absoluteStart: 1,
          absoluteEnd: 2,
          confidence: 1,
        },
        {
          id: 'word-3',
          text: 'Effect',
          start: 2,
          end: 3,
          duration: 1,
          absoluteStart: 2,
          absoluteEnd: 3,
          confidence: 1,
        },
      ],
    },
    font: 'Orbitron:700',
    fontSize: 72,
    textColor: '#c0c0c0',
    barrelDistortionDegrees: 30,
    phosphorBlurAmount: 8,
    chromaticAberrationOffset: 2,
    horizontalHoldInterval: 1.5,
    horizontalHoldAmount: 5,
    staticTransitionDuration: 0.3,
    impact: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retroCrtTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
