/**
 * Typokinetics Neon Glitch Preset
 *
 * A dystopian neon sign text effect with beat-synchronized stabilization, flicker animations,
 * digital glitch artifacts, chromatic aberration, and random letter dropout. Text appears as a
 * worn industrial stencil with neon glow that flickers in idle state and stabilizes with full
 * brightness on kick drum hits.
 *
 * Features:
 * - Multi-layer neon glow effect (base text + 2 glow layers)
 * - Beat-synchronized stabilization (full brightness on kicks)
 * - Continuous flicker animation in idle state
 * - Chromatic aberration via animated text-shadow
 * - Random letter dropout effect
 * - Static noise overlay
 * - Electrical interference scanlines
 * - Digital glitch artifact overlay
 * - Industrial stencil aesthetic with neon glow
 *
 * Technical Implementation:
 * - BaseLayout container with black background
 * - Three text layers: base (chromatic aberration), mid-glow, heavy-glow
 * - Static noise and interference overlays using HTMLBlockAtom
 * - Flicker via opacity effects on all text layers
 * - Beat stabilization using generic effects triggered at kick timestamps
 * - Letter-by-letter dropout using individual TextAtom visibility
 *
 * Use Cases:
 * - Music video titles synchronized to bass kicks
 * - Dystopian/cyberpunk aesthetic overlays
 * - Underground electronic music visuals
 * - Glitchy, industrial motion graphics
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Params Schema ---

const presetParams = z.object({
  text: z.string().describe('Text to display with neon glitch effect'),
  
  beatData: z
    .array(z.number())
    .optional()
    .describe('Array of kick drum timestamps (in seconds) for beat synchronization'),
  
  startTime: z
    .number()
    .default(0)
    .describe('Start time of the text display (relative to parent)'),
  
  duration: z
    .number()
    .default(10)
    .describe('Duration of the text display in seconds'),
  
  fontSize: z
    .number()
    .default(96)
    .describe('Base font size in pixels'),
  
  neonColor: z
    .string()
    .default('#00ffff')
    .describe('Primary neon glow color (default cyan)'),
  
  secondaryColor: z
    .string()
    .default('#ff00ff')
    .describe('Secondary color for chromatic aberration (default magenta)'),
  
  flickerIntensity: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.5)
    .describe('Intensity of flicker effect (0.1 = subtle, 1 = extreme)'),
  
  letterDropoutChance: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Probability per frame for letter dropout (0.05 = 5% chance)'),
  
  beatStabilizationDuration: z
    .number()
    .default(0.3)
    .describe('Duration in seconds for full brightness on beat hits'),
  
  chromaticAberrationOffset: z
    .number()
    .default(2)
    .describe('Pixel offset for chromatic aberration effect'),
});

// --- Preset Execution ---

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    beatData = [],
    startTime = 0,
    duration = 10,
    fontSize = 96,
    neonColor = '#00ffff',
    secondaryColor = '#ff00ff',
    flickerIntensity = 0.5,
    letterDropoutChance = 0.05,
    beatStabilizationDuration = 0.3,
    chromaticAberrationOffset = 2,
  } = params;

  const config = props.config || { fps: 30, durationInFrames: 300 };
  const fps = config.fps || 30;

  // --- Helper Functions ---

  const generateFlickerKeyframes = (duration: number, intensity: number) => {
    // Create random flicker pattern over duration
    const numKeyframes = Math.floor(duration * 12); // 12 keyframes per second for rapid flicker
    const ranges = [];
    
    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      // Random opacity between (1 - intensity * 0.3) and 1
      const minOpacity = 1 - intensity * 0.3;
      const opacity = minOpacity + Math.random() * (intensity * 0.3);
      ranges.push({
        key: 'opacity',
        val: opacity,
        prog,
      });
    }
    
    return ranges;
  };

  const generateChromaticAberrationKeyframes = (duration: number, offset: number) => {
    // Animated chromatic aberration with varying offset
    const numKeyframes = 20;
    const ranges = [];
    
    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      const randomOffset = offset + (Math.random() - 0.5) * offset;
      ranges.push({
        key: 'textShadow',
        val: `${-randomOffset}px 0 ${secondaryColor}, ${randomOffset}px 0 ${neonColor}`,
        prog,
      });
    }
    
    return ranges;
  };

  // Split text into individual characters for letter dropout effect
  const characters = text.split('');

  // --- Static Noise Layer (SVG-based grain) ---
  const staticNoiseLayer: RenderableComponentData = {
    id: 'static-noise-layer',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: `<div style="width: 100%; height: 100%; opacity: 0.1; background: repeating-linear-gradient(0deg, transparent 0px, rgba(255,255,255,0.03) 1px, transparent 2px), repeating-linear-gradient(90deg, transparent 0px, rgba(255,255,255,0.03) 1px, transparent 2px); filter: contrast(200%) brightness(100%); animation: grain 0.5s steps(10) infinite;"></div><style>@keyframes grain { 0%, 100% { transform: translate(0, 0); } 10% { transform: translate(-5%, -5%); } 20% { transform: translate(5%, 5%); } 30% { transform: translate(-5%, 5%); } 40% { transform: translate(5%, -5%); } 50% { transform: translate(-2%, 2%); } 60% { transform: translate(2%, -2%); } 70% { transform: translate(-2%, -2%); } 80% { transform: translate(2%, 2%); } 90% { transform: translate(1%, -1%); } }</style>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // --- Interference Scanline Layer ---
  const interferenceLayer: RenderableComponentData = {
    id: 'interference-layer',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px);"></div>`,
      className: 'absolute inset-0 pointer-events-none mix-blend-overlay',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // --- Glitch Overlay Layer ---
  const glitchOverlay: RenderableComponentData = {
    id: 'glitch-overlay',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: `<div style="width: 100%; height: 100%; background: linear-gradient(transparent 50%, rgba(0,255,255,0.05) 50%); background-size: 100% 4px;"></div>`,
      className: 'absolute inset-0 pointer-events-none mix-blend-screen',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // --- Character TextAtoms with Dropout Effect ---
  const characterComponents = characters.map((char, index) => {
    const charId = `char-${index}`;
    
    // Generate random dropout intervals (5% chance per 0.5s interval)
    const dropoutEffects = [];
    const numIntervals = Math.floor(duration / 0.5);
    
    for (let i = 0; i < numIntervals; i++) {
      if (Math.random() < letterDropoutChance) {
        const dropoutStart = i * 0.5;
        const dropoutDuration = 0.1 + Math.random() * 0.2; // 0.1-0.3s dropout
        
        dropoutEffects.push({
          id: `dropout-${charId}-${i}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: dropoutStart,
            duration: dropoutDuration,
            mode: 'provider' as const,
            targetIds: [charId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        });
      }
    }

    return {
      id: charId,
      componentId: 'TextAtom',
      type: 'atom' as const,
      data: {
        text: char,
        style: {
          fontSize,
          fontWeight: '700',
          color: '#ffffff',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.1em',
          textShadow: `${-chromaticAberrationOffset}px 0 ${secondaryColor}, ${chromaticAberrationOffset}px 0 ${neonColor}`,
          filter: 'contrast(1.1)',
        },
        font: {
          family: 'Oswald',
          weights: ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: dropoutEffects,
    };
  });

  // --- Base Text Layer (with chromatic aberration) ---
  const baseTextLayer: RenderableComponentData = {
    id: 'base-text-layer',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
        style: {
          gap: '0.05em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: characterComponents as RenderableComponentData[],
    effects: [
      {
        id: 'chromatic-aberration-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration,
          mode: 'provider' as const,
          targetIds: characterComponents.map(c => c.id),
          ranges: generateChromaticAberrationKeyframes(duration, chromaticAberrationOffset),
        },
      },
    ],
  };

  // --- Glow Layer Mid (medium blur) ---
  const glowLayerMidChars = characters.map((char, index) => ({
    id: `glow-mid-char-${index}`,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: char,
      style: {
        fontSize,
        fontWeight: '700',
        color: neonColor,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
      },
      font: {
        family: 'Oswald',
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

  const glowLayerMid: RenderableComponentData = {
    id: 'glow-layer-mid',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          filter: 'blur(4px) brightness(2)',
          opacity: 0.8,
          gap: '0.05em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: glowLayerMidChars as RenderableComponentData[],
  };

  // --- Glow Layer Back (heavy blur) ---
  const glowLayerBackChars = characters.map((char, index) => ({
    id: `glow-back-char-${index}`,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: char,
      style: {
        fontSize,
        fontWeight: '700',
        color: neonColor,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.1em',
        WebkitTextStroke: `2px ${neonColor}`,
      },
      font: {
        family: 'Oswald',
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

  const glowLayerBack: RenderableComponentData = {
    id: 'glow-layer-back',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          filter: 'blur(8px) brightness(1.5)',
          opacity: 0.6,
          gap: '0.05em',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: glowLayerBackChars as RenderableComponentData[],
  };

  // --- Flicker Effect (applied to all text layers) ---
  const flickerEffect = {
    id: 'flicker-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: ['base-text-layer', 'glow-layer-mid', 'glow-layer-back'],
      ranges: generateFlickerKeyframes(duration, flickerIntensity),
    },
  };

  // --- Beat Stabilization Effects ---
  const beatStabilizationEffects = beatData
    .filter(beatTime => beatTime >= startTime && beatTime < startTime + duration)
    .map((beatTime, index) => {
      const relativeStart = beatTime - startTime;
      return {
        id: `beat-stabilization-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: relativeStart,
          duration: beatStabilizationDuration,
          mode: 'provider' as const,
          targetIds: ['base-text-layer', 'glow-layer-mid', 'glow-layer-back'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 1 },
            { key: 'filter', val: 'brightness(2.5)', prog: 0 },
            { key: 'filter', val: 'brightness(1)', prog: 1 },
          ],
        },
      };
    });

  // --- Text Layers Container ---
  const textLayersContainer: RenderableComponentData = {
    id: 'text-layers-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      glowLayerBack,
      glowLayerMid,
      baseTextLayer,
      glitchOverlay,
    ] as RenderableComponentData[],
    effects: [flickerEffect, ...beatStabilizationEffects],
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-neon-glitch-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: startTime,
        duration,
      },
    },
    childrenData: [
      staticNoiseLayer,
      interferenceLayer,
      textLayersContainer,
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

// --- Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-neon-glitch',
  title: 'Typokinetics Neon Glitch',
  description:
    'A dystopian neon sign text effect with beat-synchronized stabilization, flicker animations, digital glitch artifacts, chromatic aberration, and random letter dropout. Text appears as a worn industrial stencil with neon glow that flickers in idle state and stabilizes with full brightness on kick drum hits. Features electrical interference patterns, static noise overlays, and color channel separation for a broken sign aesthetic powered by unstable electricity, pulsing with underground bass music.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'neon',
    'glitch',
    'beat-sync',
    'flicker',
    'chromatic-aberration',
    'industrial',
    'dystopian',
    'cyberpunk',
    'underground',
    'music',
    'kinetic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'NEON GLITCH',
    beatData: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    startTime: 0,
    duration: 10,
    fontSize: 96,
    neonColor: '#00ffff',
    secondaryColor: '#ff00ff',
    flickerIntensity: 0.5,
    letterDropoutChance: 0.05,
    beatStabilizationDuration: 0.3,
    chromaticAberrationOffset: 2,
  },
};

// --- Export ---

export const typokineticsNeonGlitchPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
