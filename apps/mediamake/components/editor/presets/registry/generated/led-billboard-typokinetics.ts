/**
 * LED Billboard Typokinetics Preset
 *
 * This preset creates an urban LED display/jumbotron-inspired typography effect with pixelated
 * digital transitions. Text appears and disappears through instant on/off LED pixel effects,
 * similar to how stadium scoreboards and urban LED displays refresh content.
 *
 * Features:
 * - **Pixelated Visual Style**: Grid-based pixel background simulation for authentic LED display look
 * - **Instant LED On/Off Effects**: Words appear/disappear with instant opacity changes (no easing)
 * - **Scanning Reveal**: Horizontal band scanning effect for progressive text reveal
 * - **Color Modes**: Monochrome (single color with glow) or RGB (chromatic aberration effect)
 * - **Urban Aesthetic**: Bold uppercase typography with pixelated rendering and LED-style glow
 * - **Word-by-Word Animation**: Each word treated as a separate LED display segment
 *
 * Use cases:
 * - Creating jumbotron-style title cards
 * - Building urban tech-themed typography
 * - Simulating LED billboard animations
 * - Creating retro digital display effects
 * - Adding stadium scoreboard-style text reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captionData: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .describe('Array of caption objects with word-level timing data'),
  transitionStyle: z
    .enum(['instant', 'scan'])
    .default('instant')
    .describe(
      'Transition style: instant (LED on/off) or scan (horizontal band reveal)',
    ),
  colorMode: z
    .enum(['monochrome', 'rgb'])
    .default('monochrome')
    .describe('Color mode: monochrome (single color + glow) or rgb (chromatic aberration)'),
  ledColor: z
    .string()
    .default('#00ff00')
    .describe('LED color for monochrome mode (e.g., #00ff00 for classic green)'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the LED text'),
  pixelDensity: z
    .enum(['low', 'medium', 'high'])
    .default('medium')
    .describe('Pixel grid density: low (8px), medium (4px), high (2px)'),
  wordSpacing: z
    .number()
    .default(20)
    .describe('Spacing between words in pixels'),
  instantTransitionDuration: z
    .number()
    .default(0.05)
    .describe('Duration of instant on/off transitions in seconds'),
  scanRevealDuration: z
    .number()
    .default(0.3)
    .describe('Duration of scanning reveal effect in seconds (when transitionStyle is scan)'),
  glowIntensity: z
    .number()
    .default(20)
    .describe('Glow intensity in pixels for monochrome mode'),
  rgbOffset: z
    .number()
    .default(2)
    .describe('Pixel offset for RGB chromatic aberration effect'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captionData,
    transitionStyle,
    colorMode,
    ledColor,
    fontSize,
    pixelDensity,
    wordSpacing,
    instantTransitionDuration,
    scanRevealDuration,
    glowIntensity,
    rgbOffset,
  } = params;

  // Map pixel density to grid size
  const pixelGridSize =
    pixelDensity === 'low' ? 8 : pixelDensity === 'high' ? 2 : 4;

  // Calculate total duration from caption data
  const totalDuration =
    captionData.length > 0
      ? Math.max(...captionData.map((c) => c.absoluteEnd))
      : 10;

  // Generate word segments for each caption
  const allWordSegments: RenderableComponentData[] = [];

  captionData.forEach((caption) => {
    caption.words.forEach((word, wordIndex) => {
      const wordId = `led-word-${caption.id}-${wordIndex}`;
      const textAtomId = `led-text-${caption.id}-${wordIndex}`;

      // Build effects array based on transition style
      const effects: any[] = [];

      // Always add instant on/off effects
      // Fade in at start
      effects.push({
        id: `led-on-${wordId}`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [textAtomId],
          type: 'linear',
          start: 0,
          duration: instantTransitionDuration,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });

      // Fade out at end
      effects.push({
        id: `led-off-${wordId}`,
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [textAtomId],
          type: 'linear',
          start: word.duration - instantTransitionDuration,
          duration: instantTransitionDuration,
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });

      // Add scan reveal effect if enabled
      if (transitionStyle === 'scan') {
        effects.push({
          id: `led-scan-${wordId}`,
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [textAtomId],
            type: 'ease-out',
            start: 0,
            duration: scanRevealDuration,
            ranges: [
              { key: 'clipPath', val: 'inset(0 0 100% 0)', prog: 0 },
              { key: 'clipPath', val: 'inset(0 0 0% 0)', prog: 1 },
            ],
          },
        });
      }

      // Create text atom with LED styling
      const textAtom: RenderableComponentData = {
        id: textAtomId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: word.text,
          style: {
            fontSize: fontSize,
            color: colorMode === 'monochrome' ? ledColor : '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: 'bold',
            imageRendering: 'pixelated',
            transform: 'translateZ(0)',
            textShadow:
              colorMode === 'monochrome'
                ? `0 0 ${glowIntensity}px ${ledColor}`
                : 'none',
          },
          font: {
            family: 'Bebas Neue',
            weights: ['400'],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
      };

      // Wrap text atom in container
      const wordSegment: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: word.duration,
          },
        },
        effects: effects,
        childrenData: [textAtom],
      };

      allWordSegments.push(wordSegment);
    });
  });

  // Create RGB overlay layers if RGB mode is enabled
  const rgbOverlayLayers: RenderableComponentData[] = [];

  if (colorMode === 'rgb') {
    // RGB mode: Create 3 layered text atoms with red/green/blue colors
    // This creates a chromatic aberration effect
    const fullText = captionData.map((c) => c.text).join(' ');

    // Red layer (offset left-up)
    rgbOverlayLayers.push({
      id: 'rgb-red-layer',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: fullText,
        style: {
          fontSize: fontSize,
          color: '#ff0000',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 'bold',
          transform: `translate(-${rgbOffset}px, -${rgbOffset}px) translateZ(0)`,
          imageRendering: 'pixelated',
        },
        className: 'mix-blend-screen',
        font: {
          family: 'Bebas Neue',
          weights: ['400'],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    });

    // Green layer (no offset)
    rgbOverlayLayers.push({
      id: 'rgb-green-layer',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: fullText,
        style: {
          fontSize: fontSize,
          color: '#00ff00',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 'bold',
          transform: 'translateZ(0)',
          imageRendering: 'pixelated',
        },
        className: 'mix-blend-screen',
        font: {
          family: 'Bebas Neue',
          weights: ['400'],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    });

    // Blue layer (offset right-down)
    rgbOverlayLayers.push({
      id: 'rgb-blue-layer',
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: fullText,
        style: {
          fontSize: fontSize,
          color: '#0000ff',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontWeight: 'bold',
          transform: `translate(${rgbOffset}px, ${rgbOffset}px) translateZ(0)`,
          imageRendering: 'pixelated',
        },
        className: 'mix-blend-screen',
        font: {
          family: 'Bebas Neue',
          weights: ['400'],
          display: 'swap',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    });
  }

  // Create pixel grid background
  const pixelGridBackground: RenderableComponentData = {
    id: 'pixel-grid-background',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent ${pixelGridSize - 1}px, rgba(255,255,255,0.02) ${pixelGridSize - 1}px, rgba(255,255,255,0.02) ${pixelGridSize}px), repeating-linear-gradient(90deg, transparent, transparent ${pixelGridSize - 1}px, rgba(255,255,255,0.02) ${pixelGridSize - 1}px, rgba(255,255,255,0.02) ${pixelGridSize}px)`,
          backgroundSize: `${pixelGridSize}px ${pixelGridSize}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [],
  };

  // Create text container
  const textContainer: RenderableComponentData = {
    id: 'led-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-wrap items-center justify-center',
        style: {
          gap: `${wordSpacing}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allWordSegments,
  };

  // Create RGB overlay container (if RGB mode)
  let rgbOverlayContainer: RenderableComponentData | null = null;
  if (colorMode === 'rgb') {
    rgbOverlayContainer = {
      id: 'rgb-overlay-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      childrenData: rgbOverlayLayers,
    };
  }

  // Build final children data
  const children: RenderableComponentData[] = [
    pixelGridBackground,
    textContainer,
  ];

  if (rgbOverlayContainer) {
    children.push(rgbOverlayContainer);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'led-billboard-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black p-8 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: children,
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
  id: 'led-billboard-typokinetics',
  title: 'LED Billboard Typokinetics',
  description:
    'Urban LED display-inspired typokinetics with pixelated digital transitions. Text appears through instant on/off LED pixel effects and scanning refresh patterns similar to jumbotron displays. Features adjustable pixel density, color modes (monochrome/RGB), and scanning reveal effects that mimic how LED displays refresh content in horizontal bands.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'led',
    'billboard',
    'jumbotron',
    'urban',
    'digital',
    'pixelated',
    'scoreboard',
    'scanning',
    'monochrome',
    'rgb',
    'chromatic-aberration',
  ],
  defaultInputParams: {
    captionData: [
      {
        id: 'caption-1',
        text: 'LED BILLBOARD',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'LED',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            id: 'word-2',
            text: 'BILLBOARD',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
      },
    ],
    transitionStyle: 'instant',
    colorMode: 'monochrome',
    ledColor: '#00ff00',
    fontSize: 72,
    pixelDensity: 'medium',
    wordSpacing: 20,
    instantTransitionDuration: 0.05,
    scanRevealDuration: 0.3,
    glowIntensity: 20,
    rgbOffset: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const ledBillboardTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
