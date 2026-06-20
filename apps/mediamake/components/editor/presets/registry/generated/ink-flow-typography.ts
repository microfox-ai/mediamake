/**
 * Elegant Ink Flow Typography Preset
 *
 * Creates an elegant ink-flow typography effect where words appear as if premium fountain pen
 * ink is flowing across paper, leaving behind lustrous metallic trails. Features:
 * - Leading edge ink flow animation with smooth gradient masking
 * - Blur-to-sharp crystallization effect (ink bleeding then settling)
 * - Metallic gradient finish with background-clip text effect
 * - Delicate ink pooling effects at letter junction points
 * - Final metallic shimmer pass that travels across completed text
 *
 * Use cases:
 * - Luxury branding and high-end product reveals
 * - Elegant title sequences and sophisticated text animations
 * - Premium content intros with refined aesthetics
 * - Upscale typography effects for sophisticated audiences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameters Schema ---

const presetParams = z.object({
  words: z
    .array(z.string())
    .describe('Array of words to display with ink flow effect'),
  
  font: z
    .string()
    .default('Cormorant Garamond:600')
    .describe('Font family with optional weight (e.g., "Cormorant Garamond:600", "Playfair Display:700")'),
  
  fontSize: z
    .number()
    .default(64)
    .describe('Font size in pixels'),
  
  flowDuration: z
    .number()
    .default(0.6)
    .describe('Duration in seconds for each word ink flow animation'),
  
  flowOverlap: z
    .number()
    .default(0.2)
    .describe('Overlap time in seconds between consecutive word flows (creates cascade effect)'),
  
  shimmerDuration: z
    .number()
    .default(1.5)
    .describe('Duration in seconds for the final shimmer pass'),
  
  shimmerDelay: z
    .number()
    .default(0.2)
    .describe('Delay in seconds after all words complete before shimmer starts'),
  
  metallic: z
    .object({
      color1: z.string().default('#C0C0C0').describe('First metallic color (silver)'),
      color2: z.string().default('#E5E5E5').describe('Second metallic color (light silver)'),
      color3: z.string().default('#C0C0C0').describe('Third metallic color (silver)'),
    })
    .default({
      color1: '#C0C0C0',
      color2: '#E5E5E5',
      color3: '#C0C0C0',
    })
    .describe('Metallic gradient colors for text finish'),
  
  containerClassName: z
    .string()
    .default('relative overflow-hidden px-8 py-4')
    .describe('CSS classes for the root container'),
  
  wordSpacing: z
    .number()
    .default(8)
    .describe('Horizontal margin between words in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    words,
    font,
    fontSize,
    flowDuration,
    flowOverlap,
    shimmerDuration,
    shimmerDelay,
    metallic,
    containerClassName,
    wordSpacing,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontWeight = fontString.includes(':')
      ? parseInt(fontString.split(':')[1], 10)
      : 600;
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(font);

  // Calculate total duration
  const wordStaggerDuration = flowDuration - flowOverlap;
  const totalWordsDuration = words.length * wordStaggerDuration + flowOverlap;
  const totalDuration = totalWordsDuration + shimmerDelay + shimmerDuration;

  // Metallic gradient string
  const metallicGradient = `linear-gradient(90deg, ${metallic.color1}, ${metallic.color2}, ${metallic.color3})`;

  // Build word components
  const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
    const wordId = `word-${wordIndex}`;
    const inkFlowOverlayId = `ink-flow-overlay-${wordIndex}`;
    const shimmerOverlayId = `shimmer-overlay-${wordIndex}`;
    const poolingDot1Id = `pooling-dot-1-${wordIndex}`;
    const poolingDot2Id = `pooling-dot-2-${wordIndex}`;

    // Word wrapper timing (all children use full duration for layout stability)
    const wordWrapperStart = wordIndex * wordStaggerDuration;

    return {
      id: `word-wrapper-${wordIndex}`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-block',
          style: {
            marginLeft: wordIndex === 0 ? '0px' : `${wordSpacing}px`,
            marginRight: wordIndex === words.length - 1 ? '0px' : `${wordSpacing}px`,
          },
        },
      },
      context: {
        timing: {
          start: wordWrapperStart,
          duration: totalDuration - wordWrapperStart, // Lasts until end
        },
      },
      childrenData: [
        // Ink flow overlay (absolutely positioned, flows from left to right)
        {
          id: inkFlowOverlayId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                background: `linear-gradient(90deg, rgba(192,192,192,0.8), rgba(229,229,229,0.6))`,
                maskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to right, black 90%, transparent 100%)',
                pointerEvents: 'none',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration - wordWrapperStart,
            },
          },
        } as RenderableComponentData,

        // Word text (TextAtom with metallic gradient)
        {
          id: wordId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: word,
            style: {
              background: metallicGradient,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight.toString(),
            },
            font: {
              family: fontFamily,
              weights: [fontWeight.toString()],
              subsets: ['latin'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration - wordWrapperStart,
            },
          },
        } as RenderableComponentData,

        // Shimmer overlay (travels from left to right after all words complete)
        {
          id: shimmerOverlayId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                mixBlendMode: 'overlay',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration - wordWrapperStart,
            },
          },
        } as RenderableComponentData,

        // Pooling dot 1 (small circle at letter junction)
        {
          id: poolingDot1Id,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            className: 'absolute rounded-full',
            style: {
              width: '6px',
              height: '6px',
              background: 'radial-gradient(circle, rgba(192,192,192,0.9) 0%, rgba(229,229,229,0.4) 100%)',
              bottom: '20%',
              left: '30%',
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration - wordWrapperStart,
            },
          },
        } as RenderableComponentData,

        // Pooling dot 2 (small circle at letter junction)
        {
          id: poolingDot2Id,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: '<div></div>',
            className: 'absolute rounded-full',
            style: {
              width: '5px',
              height: '5px',
              background: 'radial-gradient(circle, rgba(192,192,192,0.8) 0%, rgba(229,229,229,0.3) 100%)',
              bottom: '25%',
              right: '40%',
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration - wordWrapperStart,
            },
          },
        } as RenderableComponentData,
      ],
      effects: [
        // Ink flow reveal effect (width animates from 0% to 100%)
        {
          id: `ink-flow-reveal-${wordIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: flowDuration,
            mode: 'provider',
            targetIds: [inkFlowOverlayId],
            ranges: [
              { key: 'width', val: '0%', prog: 0 },
              { key: 'width', val: '100%', prog: 1 },
            ],
          },
        },

        // Text crystallize effect (blur from 2px to 0px, scale from 1.1 to 1)
        {
          id: `crystallize-blur-${wordIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0.1,
            duration: 0.5,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'filter', val: 'blur(2px)', prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
              { key: 'scale', val: 1.1, prog: 0 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },

        // Text opacity fade-in
        {
          id: `text-opacity-${wordIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: 0.4,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },

        // Pooling dots scale and opacity animation
        {
          id: `pooling-scale-${wordIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0.3,
            duration: 0.4,
            mode: 'provider',
            targetIds: [poolingDot1Id, poolingDot2Id],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8, prog: 0.5 },
              { key: 'opacity', val: 0.6, prog: 1 },
            ],
          },
        },

        // Shimmer pass effect (translateX from -100% to 100%)
        {
          id: `shimmer-pass-${wordIndex}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: totalWordsDuration + shimmerDelay - wordWrapperStart,
            duration: shimmerDuration,
            mode: 'provider',
            targetIds: [shimmerOverlayId],
            ranges: [
              { key: 'translateX', val: '-100%', prog: 0 },
              { key: 'translateX', val: '100%', prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
              { key: 'opacity', val: 1, prog: 0.7 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ink-flow-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: containerClassName,
        style: {
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: wordComponents,
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
  id: 'ink-flow-typography',
  title: 'Elegant Ink Flow Typography',
  description:
    'Premium fountain pen ink effect where words appear as if flowing across paper. Features leading edge flow animation, blur-to-sharp crystallization, metallic gradient finish with shimmer, and delicate ink pooling effects at letter junctions. Perfect for luxury branding, elegant titles, and sophisticated text reveals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'ink',
    'flow',
    'elegant',
    'luxury',
    'metallic',
    'shimmer',
    'fountain-pen',
    'calligraphy',
    'sophisticated',
    'premium',
  ],
  defaultInputParams: {
    words: ['Elegant', 'Ink', 'Flow'],
    font: 'Cormorant Garamond:600',
    fontSize: 64,
    flowDuration: 0.6,
    flowOverlap: 0.2,
    shimmerDuration: 1.5,
    shimmerDelay: 0.2,
    metallic: {
      color1: '#C0C0C0',
      color2: '#E5E5E5',
      color3: '#C0C0C0',
    },
    containerClassName: 'relative overflow-hidden px-8 py-4',
    wordSpacing: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export ---

export const inkFlowTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
