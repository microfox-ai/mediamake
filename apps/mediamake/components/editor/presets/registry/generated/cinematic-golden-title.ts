/**
 * Cinematic Golden Title with Lens Flares Preset
 *
 * A warm, cinematic title preset featuring elegant script typography with a graceful,
 * handwritten reveal animation. The text appears to be written by golden light with
 * a multi-layered lens flare system that moves independently across the composition.
 * Includes a gentle breathing zoom effect, subtle film grain texture, and warm color
 * temperatures (amber, gold, soft orange) with additive blend modes for authentic
 * cinematic feel.
 *
 * Features:
 * - Elegant script typography (Dancing Script or Great Vibes)
 * - Word-by-word reveal animation with subtle glow that peaks and fades
 * - Multi-layered lens flare system with independent movement
 * - Gentle breathing zoom (0.95 to 1.05 scale) for dynamic composition
 * - Warm golden color palette with additive blend modes
 * - Subtle film grain texture overlay for authenticity
 * - Smooth, continuous animations with ease-in-out timing
 *
 * Use cases:
 * - Romantic film opening sequences
 * - Wedding video titles
 * - Elegant brand introductions
 * - Luxury product reveals
 * - Cinematic storytelling openings
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  TextAtomData,
  GenericEffectData,
} from '@microfex/remotion';

// ============================================================================
// PARAMETER SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('The title text to display with golden light effect'),
  
  duration: z
    .number()
    .min(3)
    .max(30)
    .default(8)
    .describe('Duration in seconds for the entire composition'),
  
  font: z
    .string()
    .optional()
    .default('Dancing Script:400:normal')
    .describe('Font family with optional weight and style (e.g., "Dancing Script:400:normal", "Great Vibes:400", "Allura")'),
  
  fontSize: z
    .number()
    .min(32)
    .max(200)
    .default(72)
    .describe('Font size in pixels for the title text'),
  
  textColor: z
    .string()
    .default('#FFD700')
    .describe('Main color for the title text (golden color recommended)'),
  
  glowIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Intensity multiplier for the glow effect (0.5 = subtle, 3 = very intense)'),
  
  zoomIntensity: z
    .number()
    .min(0.02)
    .max(0.15)
    .default(0.05)
    .describe('Scale range for breathing zoom effect (0.05 means 0.95 to 1.05)'),
  
  showLensFlares: z
    .boolean()
    .default(true)
    .describe('Whether to show the lens flare overlay system'),
  
  showFilmGrain: z
    .boolean()
    .default(true)
    .describe('Whether to show the film grain texture overlay'),
  
  revealDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Duration in seconds for each word reveal animation'),
  
  wordStagger: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.3)
    .describe('Delay in seconds between each word reveal'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Dancing Script:400:normal';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Split text into words
  const words = params.text.split(' ').filter((w) => w.length > 0);
  
  // Calculate glow layers based on intensity
  const glowBase = params.glowIntensity;
  const glowColor1 = `rgba(255, 200, 100, ${0.8 * glowBase})`;
  const glowColor2 = `rgba(255, 180, 80, ${0.4 * glowBase})`;
  const glowColor3 = `rgba(255, 160, 60, ${0.2 * glowBase})`;
  
  const textShadow = `0 0 20px ${glowColor1}, 0 0 40px ${glowColor2}, 0 0 60px ${glowColor3}`;

  // Create word components with staggered reveal
  const wordComponents: RenderableComponentData[] = words.map((word, index) => {
    const wordId = `word-${index}`;
    const wordStart = index * params.wordStagger;
    
    // Word reveal effect: opacity 0 to 1 with subtle translateY
    const wordEffect: GenericEffectData = {
      type: 'ease-out',
      start: wordStart,
      duration: params.revealDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'translateY', val: -10, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: params.fontSize,
          color: params.textColor,
          textShadow: textShadow,
          marginRight: '0.3em',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `${wordId}-reveal`,
          componentId: 'generic',
          data: wordEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Background glow layer (radial gradient)
  const backgroundGlow: RenderableComponentData = {
    id: 'background-glow-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; background: radial-gradient(circle at center, rgba(255,200,100,0.15) 0%, transparent 70%);"></div>',
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Main text container with flexbox layout
  const mainTextContainer: RenderableComponentData = {
    id: 'main-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10 flex flex-wrap items-center justify-center gap-3 px-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: wordComponents,
  } as RenderableComponentData;

  // Lens flare layer 1 (larger, moves horizontally)
  const lensFlare1Effect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 5,
    mode: 'provider',
    targetIds: ['lens-flare-layer-1'],
    ranges: [
      { key: 'translateX', val: -200, prog: 0 },
      { key: 'translateX', val: 200, prog: 0.5 },
      { key: 'translateX', val: -200, prog: 1 },
      { key: 'translateY', val: -50, prog: 0 },
      { key: 'translateY', val: 50, prog: 0.5 },
      { key: 'translateY', val: -50, prog: 1 },
    ],
  };

  const lensFlare1: RenderableComponentData = {
    id: 'lens-flare-layer-1',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 300px; height: 300px; border-radius: 50%; background: radial-gradient(circle, rgba(255,200,100,0.4) 0%, rgba(255,180,80,0.2) 30%, transparent 60%); mix-blend-mode: screen; filter: blur(40px);"></div>',
      className: 'absolute pointer-events-none',
      style: {
        top: '20%',
        left: '10%',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: params.showLensFlares
      ? [
          {
            id: 'lens-flare-1-movement',
            componentId: 'generic',
            data: lensFlare1Effect,
          },
        ]
      : [],
  } as RenderableComponentData;

  // Lens flare layer 2 (smaller, moves diagonally)
  const lensFlare2Effect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 4,
    mode: 'provider',
    targetIds: ['lens-flare-layer-2'],
    ranges: [
      { key: 'translateX', val: 150, prog: 0 },
      { key: 'translateX', val: -150, prog: 0.5 },
      { key: 'translateX', val: 150, prog: 1 },
      { key: 'translateY', val: 100, prog: 0 },
      { key: 'translateY', val: -100, prog: 0.5 },
      { key: 'translateY', val: 100, prog: 1 },
    ],
  };

  const lensFlare2: RenderableComponentData = {
    id: 'lens-flare-layer-2',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(255,220,120,0.3) 0%, rgba(255,200,100,0.15) 40%, transparent 70%); mix-blend-mode: screen; filter: blur(30px);"></div>',
      className: 'absolute pointer-events-none',
      style: {
        bottom: '30%',
        right: '15%',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: params.showLensFlares
      ? [
          {
            id: 'lens-flare-2-movement',
            componentId: 'generic',
            data: lensFlare2Effect,
          },
        ]
      : [],
  } as RenderableComponentData;

  // Film grain overlay
  const filmGrainOverlay: RenderableComponentData = {
    id: 'film-grain-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%; opacity: 0.15; mix-blend-mode: overlay; pointer-events: none; background-image: url(\'data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E\');"></div>',
      className: 'absolute inset-0 pointer-events-none z-20',
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  } as RenderableComponentData;

  // Breathing zoom effect for main container
  const zoomEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: 8,
    mode: 'provider',
    targetIds: ['zoom-container'],
    ranges: [
      { key: 'scale', val: 1 - params.zoomIntensity, prog: 0 },
      { key: 'scale', val: 1 + params.zoomIntensity, prog: 0.5 },
      { key: 'scale', val: 1 - params.zoomIntensity, prog: 1 },
    ],
  };

  // Build children array conditionally
  const children: RenderableComponentData[] = [
    backgroundGlow,
    mainTextContainer,
  ];

  if (params.showLensFlares) {
    children.push(lensFlare1, lensFlare2);
  }

  if (params.showFilmGrain) {
    children.push(filmGrainOverlay);
  }

  // Root zoom container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-golden-title-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'breathing-zoom-effect',
        componentId: 'generic',
        data: zoomEffect,
      },
    ],
    childrenData: children,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'cinematic-golden-title',
  title: 'Cinematic Golden Title with Lens Flares',
  description:
    'A warm, cinematic title preset featuring elegant script typography with a handwritten reveal animation, multi-layered lens flare system, and gentle breathing zoom effect. Uses golden light aesthetics with additive blend modes, subtle film grain, and continuous scale animation for a romantic film opening sequence feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'title',
    'cinematic',
    'golden',
    'lens-flare',
    'script',
    'elegant',
    'romantic',
    'film',
    'glow',
    'zoom',
    'typography',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Golden Moments',
    duration: 8,
    font: 'Dancing Script:400:normal',
    fontSize: 72,
    textColor: '#FFD700',
    glowIntensity: 1.2,
    zoomIntensity: 0.05,
    showLensFlares: true,
    showFilmGrain: true,
    revealDuration: 0.8,
    wordStagger: 0.3,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const cinematicGoldenTitlePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
