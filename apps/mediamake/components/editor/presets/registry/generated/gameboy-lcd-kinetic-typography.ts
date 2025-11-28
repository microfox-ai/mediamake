/**
 * Game Boy LCD Kinetic Typography Preset
 *
 * A retro Game Boy-inspired kinetic typography preset featuring authentic 4-color palette 
 * (#0f380f, #306230, #8bac0f, #9bbc0f), tile-based 8-pixel increment movement, LCD ghosting 
 * trails, backlight flicker, power-up emphasis animations, typewriter reveal for sentences, 
 * and pixel grid overlay.
 *
 * Features:
 * - **Authentic Game Boy Palette**: 4-color monochrome green palette matching original hardware
 * - **Tile-Based Movement**: All animations use strict 8-pixel increments mimicking sprite movement
 * - **LCD Ghosting Effect**: Previous positions leave faint trails that quickly fade
 * - **Backlight Flicker**: Subtle brightness variations simulating LCD backlight
 * - **Power-Up Animations**: Emphasis words trigger color inversion and stepped scale effects
 * - **Typewriter Reveal**: Horizontal scrolling text reveal with stepped progression
 * - **LCD Refresh Artifacts**: Pixel transition delays and scanline effects
 * - **Pixel Grid Overlay**: Visible 8x8 pixel grid matching Game Boy resolution
 *
 * Use cases:
 * - Retro gaming content and nostalgia videos
 * - 8-bit/chiptune music visualizations
 * - Pixel art showcase videos
 * - Retro tech review intros/outros
 * - Gaming channel branding elements
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time within caption timeline'),
        absoluteStart: z.number().describe('Absolute start in caption timeline (scene-relative)'),
        end: z.number().describe('Relative end time within caption timeline'),
        absoluteEnd: z.number().describe('Absolute end in caption timeline'),
        duration: z.number().describe('Caption duration in seconds'),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number().describe('Relative start within caption'),
            absoluteStart: z.number().describe('Absolute start in caption timeline'),
            end: z.number().describe('Relative end within caption'),
            absoluteEnd: z.number().describe('Absolute end in caption timeline'),
            duration: z.number().describe('Word duration in seconds'),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional().describe('Keyword to emphasize with power-up effect'),
            impact: z.number().optional().describe('Effect intensity multiplier (0.5-2.0)'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing'),

  displayMode: z
    .enum(['word-by-word', 'typewriter'])
    .default('word-by-word')
    .describe('Display mode: word-by-word sliding or typewriter horizontal scroll'),

  fontSize: z
    .number()
    .min(16)
    .max(64)
    .default(32)
    .describe('Base font size in pixels (must be multiple of 8)'),

  slideDirection: z
    .enum(['left', 'right', 'top', 'bottom'])
    .default('left')
    .describe('Direction from which words slide in'),

  ghostingIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of LCD ghosting trail effect (0 = none, 1 = strong)'),

  flickerIntensity: z
    .number()
    .min(0)
    .max(0.1)
    .default(0.02)
    .describe('Intensity of backlight flicker effect'),

  powerUpScale: z
    .number()
    .min(1)
    .max(2)
    .default(1.25)
    .describe('Maximum scale for power-up emphasis animation'),

  showPixelGrid: z
    .boolean()
    .default(true)
    .describe('Show visible 8x8 pixel grid overlay'),

  showScanlines: z
    .boolean()
    .default(true)
    .describe('Show LCD scanline effect'),

  textColor: z
    .string()
    .default('#9bbc0f')
    .describe('Main text color (Game Boy palette: #0f380f, #306230, #8bac0f, #9bbc0f)'),

  backgroundColor: z
    .string()
    .default('#0f380f')
    .describe('Background color (darkest Game Boy green)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    displayMode,
    fontSize,
    slideDirection,
    ghostingIntensity,
    flickerIntensity,
    powerUpScale,
    showPixelGrid,
    showScanlines,
    textColor,
    backgroundColor,
  } = params;

  // Helper: Generate slide-in translation value based on direction
  const getSlideTranslation = (
    direction: string,
    step: number,
  ): { key: string; values: number[] } => {
    const baseDistance = 64; // 8 pixels * 8 steps
    const stepValue = (step / 8) * baseDistance;

    switch (direction) {
      case 'left':
        return {
          key: 'translateX',
          values: [-64, -56, -48, -40, -32, -24, -16, -8, 0].map(
            (v) => v + (step === 0 ? 0 : stepValue),
          ),
        };
      case 'right':
        return {
          key: 'translateX',
          values: [64, 56, 48, 40, 32, 24, 16, 8, 0].map(
            (v) => v - (step === 0 ? 0 : stepValue),
          ),
        };
      case 'top':
        return {
          key: 'translateY',
          values: [-64, -56, -48, -40, -32, -24, -16, -8, 0].map(
            (v) => v + (step === 0 ? 0 : stepValue),
          ),
        };
      case 'bottom':
        return {
          key: 'translateY',
          values: [64, 56, 48, 40, 32, 24, 16, 8, 0].map(
            (v) => v - (step === 0 ? 0 : stepValue),
          ),
        };
      default:
        return { key: 'translateX', values: [-64, -56, -48, -40, -32, -24, -16, -8, 0] };
    }
  };

  // Helper: Create stepped slide-in animation ranges
  const createSlideInRanges = (
    direction: string,
  ): Array<{ key: string; val: number; prog: number }> => {
    const { key, values } = getSlideTranslation(direction, 0);
    return values.map((val, index) => ({
      key,
      val,
      prog: index / (values.length - 1),
    }));
  };

  // Helper: Create ghosting trail layers
  const createGhostLayers = (
    wordId: string,
    wordText: string,
    wordDuration: number,
    intensity: number,
  ): RenderableComponentData[] => {
    if (intensity === 0) return [];

    const ghostLayers: RenderableComponentData[] = [];
    const numLayers = 3;

    for (let i = 0; i < numLayers; i++) {
      const layerOpacity = intensity * (0.3 - i * 0.1);
      const layerDuration = 0.1 + i * 0.05;
      const layerOffset = 8 * (numLayers - i);

      const ghostEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: layerDuration,
        mode: 'provider',
        targetIds: [`${wordId}-ghost-${i}`],
        ranges: [
          { key: 'translateX', val: -layerOffset, prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'opacity', val: layerOpacity * 2, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      ghostLayers.push({
        id: `${wordId}-ghost-${i}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: wordText,
          style: {
            fontFamily: 'monospace',
            fontSize: fontSize,
            color: '#306230',
            position: 'absolute',
            opacity: layerOpacity,
          },
          className: 'font-mono',
        },
        context: {
          timing: {
            start: 0,
            duration: wordDuration,
          },
        },
        effects: [
          {
            id: `ghost-effect-${i}`,
            componentId: 'generic',
            data: ghostEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return ghostLayers;
  };

  // Helper: Create flicker effect
  const createFlickerEffect = (
    targetId: string,
    duration: number,
    intensity: number,
  ): GenericEffectData => {
    const steps = 10;
    const ranges: Array<{ key: string; val: number; prog: number }> = [];

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const brightness = 1 + (Math.sin(prog * Math.PI * 6) * intensity);
      ranges.push({ key: 'brightness', val: brightness, prog });
    }

    return {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper: Create power-up effect for emphasis words
  const createPowerUpEffect = (
    targetId: string,
    wordStart: number,
    scale: number,
  ): Array<{ id: string; componentId: string; data: GenericEffectData }> => {
    const scaleEffect: GenericEffectData = {
      type: 'linear',
      start: wordStart,
      duration: 0.3,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: scale * 0.6 + 0.4, prog: 0.33 },
        { key: 'scale', val: scale, prog: 0.66 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    };

    const invertEffect: GenericEffectData = {
      type: 'linear',
      start: wordStart,
      duration: 0.2,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'invert', val: 0, prog: 0 },
        { key: 'invert', val: 1, prog: 0.5 },
        { key: 'invert', val: 0, prog: 1 },
      ],
    };

    return [
      {
        id: `${targetId}-power-scale`,
        componentId: 'generic',
        data: scaleEffect,
      },
      {
        id: `${targetId}-power-invert`,
        componentId: 'generic',
        data: invertEffect,
      },
    ];
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;
    const keyword = caption.metadata?.keyword?.toLowerCase();
    const impact = caption.metadata?.impact ?? 1.0;

    if (displayMode === 'word-by-word') {
      // Word-by-word mode with sliding animation
      const wordComponents: RenderableComponentData[] = [];

      caption.words.forEach((word, wordIndex) => {
        const wordId = `${captionId}-word-${wordIndex}`;
        const isEmphasis = keyword && word.text.toLowerCase().includes(keyword);
        const wordDuration = caption.duration;

        // Ghost layers
        const ghostLayers = createGhostLayers(
          wordId,
          word.text,
          wordDuration,
          ghostingIntensity * impact,
        );

        // Main word text
        const slideRanges = createSlideInRanges(slideDirection);
        const flickerEffect = createFlickerEffect(wordId, wordDuration, flickerIntensity);

        const wordEffects: Array<{ id: string; componentId: string; data: GenericEffectData }> = [
          {
            id: `${wordId}-slide`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: word.start,
              duration: 0.3,
              mode: 'provider',
              targetIds: [wordId],
              ranges: slideRanges,
            },
          },
          {
            id: `${wordId}-flicker`,
            componentId: 'generic',
            data: flickerEffect,
          },
        ];

        // Add power-up effects for emphasis words
        if (isEmphasis) {
          wordEffects.push(...createPowerUpEffect(wordId, word.start, powerUpScale));
        }

        const mainWord: RenderableComponentData = {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontFamily: 'monospace',
              fontSize: fontSize,
              color: textColor,
              textShadow: `0 0 2px ${textColor}`,
              fontWeight: isEmphasis ? 'bold' : 'normal',
            },
            className: 'font-mono',
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
          effects: wordEffects,
        };

        // Word wrapper with ghost layers
        const wordWrapper: RenderableComponentData = {
          id: `${wordId}-wrapper`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative inline-block',
              style: {
                marginRight: '0.5em',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration,
            },
          },
          childrenData: [...ghostLayers, mainWord],
        };

        wordComponents.push(wordWrapper);
      });

      // Caption container
      const captionContainer: RenderableComponentData = {
        id: captionId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex flex-wrap items-center justify-center',
            style: {
              padding: '16px',
              gap: '8px',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      };

      captionContainers.push(captionContainer);
    } else {
      // Typewriter mode with horizontal scroll
      const typewriterEffect: GenericEffectData = {
        type: 'linear',
        start: 0,
        duration: caption.duration * 0.8,
        mode: 'provider',
        targetIds: [`${captionId}-text`],
        ranges: [
          { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
          { key: 'clipPath', val: 'inset(0 80% 0 0)', prog: 0.2 },
          { key: 'clipPath', val: 'inset(0 60% 0 0)', prog: 0.4 },
          { key: 'clipPath', val: 'inset(0 40% 0 0)', prog: 0.6 },
          { key: 'clipPath', val: 'inset(0 20% 0 0)', prog: 0.8 },
          { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
        ],
      };

      const flickerEffect = createFlickerEffect(
        `${captionId}-text`,
        caption.duration,
        flickerIntensity,
      );

      const typewriterText: RenderableComponentData = {
        id: `${captionId}-text`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: caption.text,
          style: {
            fontFamily: 'monospace',
            fontSize: fontSize - 4,
            color: textColor,
            whiteSpace: 'nowrap',
          },
          className: 'font-mono',
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        effects: [
          {
            id: `${captionId}-typewriter`,
            componentId: 'generic',
            data: typewriterEffect,
          },
          {
            id: `${captionId}-flicker`,
            componentId: 'generic',
            data: flickerEffect,
          },
        ],
      };

      const typewriterContainer: RenderableComponentData = {
        id: captionId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute bottom-8 left-4 right-4 overflow-hidden',
            style: {
              height: `${fontSize + 16}px`,
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [typewriterText],
      };

      captionContainers.push(typewriterContainer);
    }
  });

  // Pixel grid overlay
  const pixelGridOverlay: RenderableComponentData = {
    id: 'pixel-grid-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width:100%;height:100%;background-image:repeating-linear-gradient(0deg,transparent,transparent 7px,rgba(0,0,0,0.03) 7px,rgba(0,0,0,0.03) 8px),repeating-linear-gradient(90deg,transparent,transparent 7px,rgba(0,0,0,0.03) 7px,rgba(0,0,0,0.03) 8px);background-size:8px 8px;pointer-events:none;"></div>`,
      style: {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
  };

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: 'scanline-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width:100%;height:100%;background:repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(0,0,0,0.05) 1px,rgba(0,0,0,0.05) 2px);pointer-events:none;"></div>`,
      style: {
        position: 'absolute',
        inset: '0',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
  };

  // LCD refresh artifact overlay
  const lcdArtifactOverlay: RenderableComponentData = {
    id: 'lcd-artifact-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'multiply',
          background: 'linear-gradient(180deg, transparent 0%, rgba(139,172,15,0.03) 50%, transparent 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: showScanlines ? [scanlineOverlay] : [],
  };

  // Main container with Game Boy styling
  const overlayChildren: RenderableComponentData[] = [
    ...captionContainers,
    lcdArtifactOverlay,
  ];

  if (showPixelGrid) {
    overlayChildren.push(pixelGridOverlay);
  }

  const rootContainer: RenderableComponentData = {
    id: 'gameboy-lcd-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
          filter: 'contrast(1.1) saturate(0.8)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? Math.max(...captions.map(c => c.absoluteEnd))
          : 10,
      },
    },
    childrenData: overlayChildren,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'gameboyLcdKineticTypography',
  title: 'Game Boy LCD Kinetic Typography',
  description:
    'A retro Game Boy-inspired kinetic typography preset featuring authentic 4-color palette (#0f380f, #306230, #8bac0f, #9bbc0f), tile-based 8-pixel increment movement, LCD ghosting trails, backlight flicker, power-up emphasis animations, typewriter reveal for sentences, and pixel grid overlay. Text slides in with discrete stepped animations mimicking classic Game Boy sprite movement, with fading ghost trails simulating the LCD response time. Emphasis words trigger a power-up animation with color inversion and stepped scale increase.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'retro',
    'gameboy',
    'lcd',
    '8-bit',
    'pixel',
    'monochrome',
    'green',
    'ghosting',
    'tile-based',
    'gaming',
    'nostalgia',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'GAME BOY RETRO',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'GAME',
            start: 0,
            absoluteStart: 0,
            end: 1,
            absoluteEnd: 1,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-2',
            text: 'BOY',
            start: 1,
            absoluteStart: 1,
            end: 2,
            absoluteEnd: 2,
            duration: 1,
            confidence: 1,
          },
          {
            id: 'word-3',
            text: 'RETRO',
            start: 2,
            absoluteStart: 2,
            end: 3,
            absoluteEnd: 3,
            duration: 1,
            confidence: 1,
          },
        ],
        metadata: {
          keyword: 'RETRO',
          impact: 1.5,
        },
      },
    ],
    displayMode: 'word-by-word',
    fontSize: 32,
    slideDirection: 'left',
    ghostingIntensity: 0.3,
    flickerIntensity: 0.02,
    powerUpScale: 1.25,
    showPixelGrid: true,
    showScanlines: true,
    textColor: '#9bbc0f',
    backgroundColor: '#0f380f',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const gameboyLcdKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
