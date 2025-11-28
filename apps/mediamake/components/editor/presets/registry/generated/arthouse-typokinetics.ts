/**
 * Arthouse Cinema Typokinetics Preset
 * 
 * A dreamlike, meditative typography preset inspired by arthouse cinema aesthetics.
 * 
 * Features:
 * - Poetic text materializations with layered ghost effects (3 layers at varying opacities)
 * - Ethereal light leaks with organic Perlin-inspired motion paths
 * - Blur-to-focus transitions simulating eye adjustment
 * - Soft vignetting and film grain texture for cinematic depth
 * - Contemplative pacing (2x word duration) for meditative resonance
 * - Memory fade with unique curves per word (some linger, some fade faster)
 * - Multiple translucent text layers creating depth and subconsciousness-surfacing quality
 * 
 * Use Cases:
 * - Poetry readings and spoken word performances
 * - Artistic intros and outros
 * - Meditation and mindfulness content
 * - Abstract narrative sequences
 * - Experimental film titles
 * - Gallery/museum video installations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with text, timing, and word data'),
  
  // Font configuration
  font: z.string()
    .default('Playfair Display:400')
    .describe('Font family with optional weight and style (e.g., "Playfair Display:400", "Cormorant Garamond:300:italic")'),
  
  fontSize: z.number()
    .min(20)
    .max(120)
    .default(56)
    .describe('Base font size for primary text layer in pixels'),
  
  textColor: z.string()
    .default('#ffffff')
    .describe('Color for primary text layer'),
  
  // Ghost layer configuration
  ghostLayer1Opacity: z.number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity for deepest ghost layer'),
  
  ghostLayer2Opacity: z.number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity for middle ghost layer'),
  
  ghostOffsetX: z.number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Horizontal offset in pixels for ghost layers'),
  
  ghostOffsetY: z.number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Vertical offset in pixels for ghost layers'),
  
  // Blur transition
  initialBlur: z.number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Initial blur amount in pixels (blur-to-focus transition)'),
  
  blurDuration: z.number()
    .min(0.5)
    .max(5)
    .default(3)
    .describe('Duration of blur-to-focus transition in seconds'),
  
  // Light bloom configuration
  lightBloomIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe('Intensity of light bloom effects (0 = subtle, 1 = intense)'),
  
  lightBloomCount: z.number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Number of light bloom elements'),
  
  // Timing configuration
  pacingMultiplier: z.number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Multiplier for contemplative pacing (2 = twice as slow)'),
  
  memoryFadeVariation: z.number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Variation in fade curves (0 = uniform, 1 = highly varied)'),
  
  // Visual effects
  vignetteIntensity: z.number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of vignette effect (0 = none, 1 = strong)'),
  
  filmGrainOpacity: z.number()
    .min(0)
    .max(0.1)
    .default(0.03)
    .describe('Opacity of film grain overlay'),
  
  // Position
  verticalPosition: z.enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text on screen'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  if (!captions || captions.length === 0) {
    throw new Error('No captions provided for arthouse typokinetics preset');
  }

  // Parse font string
  const parseFontString = (fontStr: string) => {
    const parts = fontStr.split(':');
    const family = parts[0];
    const weight = parts.length > 1 ? parts[1] : '400';
    const style = parts.length > 2 ? parts[2] : 'normal';
    return { family, weight, style };
  };

  const fontConfig = parseFontString(params.font);

  // Calculate total duration
  const lastCaption = captions[captions.length - 1];
  const totalDuration = lastCaption.absoluteEnd;

  // Helper: Create Perlin-like organic motion path
  const createOrganicLightPath = (
    index: number,
    duration: number,
    intensity: number,
  ) => {
    const seed = index * 137.508; // Golden angle for distribution
    const points = 8; // Number of keyframe points
    const ranges: any[] = [];
    
    for (let i = 0; i <= points; i++) {
      const prog = i / points;
      const angle = seed + prog * Math.PI * 2 * 2; // Two full rotations
      const radius = 100 + Math.sin(angle * 1.3) * 80 * intensity;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      
      ranges.push(
        { key: 'translateX', val: `${x}px`, prog },
        { key: 'translateY', val: `${y}px`, prog },
      );
    }
    
    return ranges;
  };

  // Helper: Create scale pulsing for light bloom (breathing effect)
  const createBreathingScale = (index: number) => {
    const phase = index * 0.3; // Phase offset for variation
    const ranges: any[] = [];
    
    for (let i = 0; i <= 10; i++) {
      const prog = i / 10;
      const scale = 0.8 + Math.sin((prog + phase) * Math.PI * 2) * 0.2;
      ranges.push({ key: 'scale', val: scale, prog });
    }
    
    return ranges;
  };

  // Create light bloom elements
  const lightBlooms: RenderableComponentData[] = [];
  const lightBloomSizes = [400, 300, 250];
  const lightBloomBlurs = [40, 50, 60];
  
  for (let i = 0; i < params.lightBloomCount; i++) {
    const size = lightBloomSizes[i % lightBloomSizes.length];
    const blur = lightBloomBlurs[i % lightBloomBlurs.length];
    const baseOpacity = params.lightBloomIntensity * (0.2 - i * 0.05);
    
    const lightBloomId = `light-bloom-${i}`;
    
    // Organic motion effect (10s cycle)
    const motionEffect = {
      id: `${lightBloomId}-motion`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: 10,
        mode: 'provider' as const,
        targetIds: [lightBloomId],
        ranges: createOrganicLightPath(i, 10, params.lightBloomIntensity),
      },
    };
    
    // Breathing scale effect
    const breathingEffect = {
      id: `${lightBloomId}-breathing`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: i * 0.5, // Stagger starts
        duration: 10,
        mode: 'provider' as const,
        targetIds: [lightBloomId],
        ranges: createBreathingScale(i),
      },
    };
    
    lightBlooms.push({
      id: lightBloomId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${size}px; height: ${size}px; background: radial-gradient(ellipse at center, rgba(255,255,255,${baseOpacity}), rgba(255,255,255,${baseOpacity * 0.25}) 40%, transparent 70%); border-radius: 50%; filter: blur(${blur}px);"></div>`,
        className: 'absolute',
        style: {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [motionEffect, breathingEffect],
    } as RenderableComponentData);
  }

  // Create text layers for each caption
  const textLayersContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionDuration = caption.duration * params.pacingMultiplier;
    const words = caption.words || [{ 
      text: caption.text, 
      start: 0, 
      duration: caption.duration,
      absoluteStart: caption.absoluteStart,
    }];

    // Create word components for each layer
    const createWordComponents = (
      layerIndex: number,
      opacity: number,
      offsetX: number,
      offsetY: number,
      blur: number,
    ) => {
      return words.map((word, wordIndex) => {
        const wordId = `caption-${captionIndex}-layer-${layerIndex}-word-${wordIndex}`;
        const wordDuration = word.duration * params.pacingMultiplier;
        
        // Memory fade variation: some words linger, some fade faster
        const fadeVariation = 0.8 + Math.random() * params.memoryFadeVariation * 0.4;
        const fadeInDuration = Math.min(wordDuration * 0.3, params.blurDuration) * fadeVariation;
        const fadeOutDuration = Math.min(wordDuration * 0.2, 1.5) * fadeVariation;
        
        // Blur-to-focus transition (only for primary layer)
        const blurEffect = layerIndex === 2 ? {
          id: `${wordId}-blur`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: word.start,
            duration: params.blurDuration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'filter', val: `blur(${params.initialBlur}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        } : null;
        
        // Fade in effect
        const fadeInEffect = {
          id: `${wordId}-fade-in`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: word.start,
            duration: fadeInDuration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: opacity, prog: 1 },
            ],
          },
        };
        
        // Fade out effect
        const fadeOutEffect = {
          id: `${wordId}-fade-out`,
          componentId: 'generic',
          data: {
            type: 'ease-in' as const,
            start: word.start + wordDuration - fadeOutDuration,
            duration: fadeOutDuration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: opacity, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        };
        
        const effects = [fadeInEffect, fadeOutEffect];
        if (blurEffect) effects.unshift(blurEffect);

        return {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              fontWeight: parseInt(fontConfig.weight, 10),
              fontStyle: fontConfig.style,
              color: params.textColor,
              marginRight: '0.3em',
              filter: blur > 0 ? `blur(${blur}px)` : undefined,
            },
            font: {
              family: fontConfig.family,
              weights: [fontConfig.weight],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: captionDuration,
            },
          },
          effects,
        } as RenderableComponentData;
      });
    };

    // Ghost layer 1 (deepest)
    const ghostLayer1Words = createWordComponents(
      0,
      params.ghostLayer1Opacity,
      -params.ghostOffsetX,
      -params.ghostOffsetY,
      2,
    );

    // Ghost layer 2 (middle)
    const ghostLayer2Words = createWordComponents(
      1,
      params.ghostLayer2Opacity,
      params.ghostOffsetX,
      params.ghostOffsetY,
      1,
    );

    // Primary layer (full opacity, no blur)
    const primaryLayerWords = createWordComponents(
      2,
      1.0,
      0,
      0,
      0,
    );

    // Vertical position calculation
    const getVerticalAlignment = () => {
      switch (params.verticalPosition) {
        case 'top':
          return 'items-start pt-20';
        case 'bottom':
          return 'items-end pb-20';
        default:
          return 'items-center';
      }
    };

    const captionContainerId = `caption-${captionIndex}-container`;

    textLayersContainers.push({
      id: captionContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute inset-0 flex ${getVerticalAlignment()} justify-center`,
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: captionDuration,
        },
      },
      childrenData: [
        // Ghost layer 1 container
        {
          id: `caption-${captionIndex}-ghost-1-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute flex flex-row items-center',
              style: {
                transform: `translate(${-params.ghostOffsetX}px, ${-params.ghostOffsetY}px)`,
                zIndex: 1,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: captionDuration,
            },
          },
          childrenData: ghostLayer1Words,
        } as RenderableComponentData,
        // Ghost layer 2 container
        {
          id: `caption-${captionIndex}-ghost-2-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute flex flex-row items-center',
              style: {
                transform: `translate(${params.ghostOffsetX}px, ${params.ghostOffsetY}px)`,
                zIndex: 2,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: captionDuration,
            },
          },
          childrenData: ghostLayer2Words,
        } as RenderableComponentData,
        // Primary layer container
        {
          id: `caption-${captionIndex}-primary-container`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute flex flex-row items-center',
              style: {
                zIndex: 3,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: captionDuration,
            },
          },
          childrenData: primaryLayerWords,
        } as RenderableComponentData,
      ],
    } as RenderableComponentData);
  });

  // Create vignette layer
  const vignetteLayer: RenderableComponentData = {
    id: 'vignette-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${params.vignetteIntensity}) 100%); pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 50,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Create film grain layer
  const filmGrainLayer: RenderableComponentData = {
    id: 'film-grain-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.1) 3px), repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.1) 3px); opacity: ${params.filmGrainOpacity}; mix-blend-mode: overlay; pointer-events: none;"></div>`,
      className: 'absolute inset-0',
      style: {
        zIndex: 40,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'arthouse-typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Light bloom container
      {
        id: 'light-bloom-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              zIndex: 10,
              pointerEvents: 'none',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: lightBlooms,
      } as RenderableComponentData,
      // Text layers
      ...textLayersContainers,
      // Vignette layer
      vignetteLayer,
      // Film grain layer
      filmGrainLayer,
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'arthouse-typokinetics',
  title: 'Arthouse Cinema Typokinetics',
  description: 'A dreamlike, meditative typography preset inspired by arthouse cinema aesthetics. Features poetic text materializations through layered ghost effects, ethereal light leaks with organic Perlin-inspired motion, blur-to-focus transitions, and contemplative pacing. Includes soft vignetting, film grain texture, and multiple translucent text layers creating depth and memory-like emergence. Perfect for poetry readings, artistic intros, meditation content, or any project requiring a hypnotic, subconsciousness-surfacing visual quality.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'arthouse',
    'cinema',
    'poetic',
    'dreamlike',
    'ethereal',
    'light-leaks',
    'blur-to-focus',
    'meditative',
    'contemplative',
    'ghost-layers',
    'film-grain',
    'vignette',
    'organic-motion',
    'perlin-noise',
    'subconsciousness',
    'memory',
    'hypnotic',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    captions: [],
    font: 'Playfair Display:400',
    fontSize: 56,
    textColor: '#ffffff',
    ghostLayer1Opacity: 0.3,
    ghostLayer2Opacity: 0.6,
    ghostOffsetX: 2,
    ghostOffsetY: 2,
    initialBlur: 8,
    blurDuration: 3,
    lightBloomIntensity: 0.2,
    lightBloomCount: 3,
    pacingMultiplier: 2,
    memoryFadeVariation: 0.4,
    vignetteIntensity: 0.4,
    filmGrainOpacity: 0.03,
    verticalPosition: 'center',
  },
};

// --- Export ---
export const arthouseTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
