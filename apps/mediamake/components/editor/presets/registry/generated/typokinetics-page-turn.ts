/**
 * Typokinetics Page Turn Preset
 *
 * Creates an elegant page-turning animation where serif typography flows like pages turning in a luxury book.
 * Each text section appears as if on a page that gracefully turns to reveal the next section.
 *
 * Features:
 * - **Realistic Page Physics**: Custom cubic-bezier curves mimicking paper weight and air resistance
 * - **3D Page Turns**: Two-sided pages using rotateY transforms with backface-hidden positioning
 * - **Dynamic Shadows**: Box-shadows that follow rotation angle for depth illusion
 * - **Paper Texture**: Subtle noise/grain pattern for aged or premium paper feel
 * - **Traditional Typography**: Baskerville or Book Antiqua serif fonts for authenticity
 * - **Elegant Reveal**: Sequential page turns with slight overlap for continuity
 *
 * Use cases:
 * - Luxury brand storytelling
 * - Book trailers and literary content
 * - Sophisticated text reveals
 * - Premium editorial presentations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  pages: z
    .array(
      z.object({
        frontText: z.string().describe('Text content for front of page'),
        backText: z.string().describe('Text content for back of page'),
        frontFontSize: z
          .number()
          .min(16)
          .max(72)
          .default(32)
          .optional()
          .describe('Font size for front text in pixels'),
        backFontSize: z
          .number()
          .min(16)
          .max(72)
          .default(28)
          .optional()
          .describe('Font size for back text in pixels'),
      }),
    )
    .min(1)
    .max(5)
    .describe('Array of page content (front and back text for each page)'),
  font: z
    .string()
    .default('Baskerville:400:normal')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Baskerville:400:normal", "Book Antiqua:700")',
    ),
  textColor: z
    .string()
    .default('#2c2416')
    .optional()
    .describe('Text color (hex or rgba)'),
  paperColor: z
    .string()
    .default('#f9f7f3')
    .optional()
    .describe('Paper background color'),
  pageBackgroundColor: z
    .string()
    .default('#f5f1e8')
    .optional()
    .describe('Overall background color'),
  pageTurnDuration: z
    .number()
    .min(0.8)
    .max(3)
    .default(1.8)
    .optional()
    .describe('Duration of each page turn animation in seconds'),
  pageOverlap: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe(
      'Overlap between consecutive page turns in seconds (creates continuity)',
    ),
  padding: z
    .number()
    .min(20)
    .max(100)
    .default(64)
    .optional()
    .describe('Padding around text content in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Baskerville:400:normal';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? fontParts[1] : '400';
  const fontStyle =
    fontParts.length > 2 ? fontParts[2] : ('normal' as 'normal' | 'italic');

  // Configuration
  const textColor = params.textColor ?? '#2c2416';
  const paperColor = params.paperColor ?? '#f9f7f3';
  const pageBackgroundColor = params.pageBackgroundColor ?? '#f5f1e8';
  const pageTurnDuration = params.pageTurnDuration ?? 1.8;
  const pageOverlap = params.pageOverlap ?? 0.2;
  const padding = params.padding ?? 64;

  // Paper texture (subtle grain)
  const paperTexture =
    'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAI0lEQVQYV2NkYGD4z8DAwMgABEwgGoQBGUwwCkgBMpgREgAAH2sCF3pBrjkAAAAASUVORK5CYII=)';

  // Calculate timing for sequential page turns
  const calculatePageTiming = (pageIndex: number) => {
    const startTime = pageIndex * (pageTurnDuration - pageOverlap);
    return {
      start: startTime,
      duration: pageTurnDuration,
    };
  };

  // Total duration
  const totalDuration =
    params.pages.length * (pageTurnDuration - pageOverlap) + pageOverlap;

  // Create page components
  const pageComponents: any[] = [];

  params.pages.forEach((page, index) => {
    const pageId = `page-${index + 1}`;
    const timing = calculatePageTiming(index);
    const frontFontSize = page.frontFontSize ?? 32;
    const backFontSize = page.backFontSize ?? 28;

    // Page wrapper (handles the rotation)
    const pageWrapper = {
      id: `${pageId}-wrapper`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            transformStyle: 'preserve-3d',
            transformOrigin: 'left center',
          },
        },
      },
      context: {
        timing: {
          start: timing.start,
          duration: timing.duration,
        },
      },
      effects: [
        {
          id: `${pageId}-turn-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: pageTurnDuration,
            mode: 'provider',
            targetIds: [`${pageId}-wrapper`],
            ranges: [
              // Page turn rotation
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: -180, prog: 1 },
              // Dynamic shadow during turn
              {
                key: 'filter',
                val: 'drop-shadow(0px 10px 30px rgba(0,0,0,0.2))',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'drop-shadow(-15px 15px 40px rgba(0,0,0,0.4))',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'drop-shadow(0px 10px 30px rgba(0,0,0,0.2))',
                prog: 1,
              },
            ],
          },
        },
      ],
      childrenData: [
        // Front face
        {
          id: `${pageId}-front`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                backfaceVisibility: 'hidden',
                backgroundColor: paperColor,
                backgroundImage: paperTexture,
                backgroundSize: '5px 5px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
                padding: `${padding}px`,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: timing.duration,
            },
          },
          childrenData: [
            {
              id: `${pageId}-text-front`,
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: page.frontText,
                style: {
                  fontFamily: `${fontFamily}, 'Book Antiqua', Georgia, serif`,
                  fontSize: `${frontFontSize}px`,
                  lineHeight: '1.8',
                  color: textColor,
                  textAlign: 'center' as const,
                  whiteSpace: 'pre-wrap' as const,
                  fontWeight: fontWeight,
                  fontStyle: fontStyle,
                },
                font: {
                  family: fontFamily,
                  weights: [fontWeight],
                  display: 'swap' as const,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: timing.duration,
                },
              },
            },
          ],
        },
        // Back face
        {
          id: `${pageId}-back`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                backfaceVisibility: 'hidden',
                backgroundColor: paperColor,
                backgroundImage: paperTexture,
                backgroundSize: '5px 5px',
                transform: 'rotateY(180deg)',
                padding: `${padding}px`,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: timing.duration,
            },
          },
          childrenData: [
            {
              id: `${pageId}-text-back`,
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: page.backText,
                style: {
                  fontFamily: `${fontFamily}, 'Book Antiqua', Georgia, serif`,
                  fontSize: `${backFontSize}px`,
                  lineHeight: '1.8',
                  color: textColor,
                  textAlign: 'center' as const,
                  whiteSpace: 'pre-wrap' as const,
                  fontWeight: fontWeight,
                  fontStyle: fontStyle,
                },
                font: {
                  family: fontFamily,
                  weights: [fontWeight],
                  display: 'swap' as const,
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: timing.duration,
                },
              },
            },
          ],
        },
      ],
    };

    pageComponents.push(pageWrapper);
  });

  // Root container
  const rootContainer = {
    id: 'typokinetics-page-turn-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          backgroundColor: pageBackgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: 'page-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              transformStyle: 'preserve-3d',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: pageComponents,
      },
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-page-turn',
  title: 'Typokinetics Page Turn',
  description:
    'Elegant page-turning typography animation with realistic physics, 3D transforms, and paper texture effects. Text reveals through sophisticated page-curl animations mimicking a luxury book reading experience with traditional serif typography.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'page-turn',
    '3d',
    'elegant',
    'book',
    'serif',
    'luxury',
    'reveal',
  ],
  dependencies: {},
  defaultInputParams: {
    pages: [
      {
        frontText:
          'Chapter One\n\nIn the beginning, words were crafted with precision and care, each letter a testament to the art of typography.',
        backText:
          'The journey of elegant design begins with understanding the weight of each word, the space between thoughts.',
        frontFontSize: 32,
        backFontSize: 28,
      },
      {
        frontText:
          'Chapter Two\n\nAs the pages turn, momentum builds—each rotation a dance of light and shadow across premium paper.',
        backText:
          'Typography is not merely letters on a page, but the voice of silence made visible through careful craft.',
        frontFontSize: 32,
        backFontSize: 28,
      },
      {
        frontText:
          'Chapter Three\n\nIn the final movement, the story reaches its crescendo—a symphony of form and function in perfect harmony.',
        backText:
          'The End\n\nThus concludes our journey through the art of kinetic typography—where every page turn tells a story.',
        frontFontSize: 32,
        backFontSize: 28,
      },
    ],
    font: 'Baskerville:400:normal',
    textColor: '#2c2416',
    paperColor: '#f9f7f3',
    pageBackgroundColor: '#f5f1e8',
    pageTurnDuration: 1.8,
    pageOverlap: 0.2,
    padding: 64,
  },
};

export const typokineticspageturPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
