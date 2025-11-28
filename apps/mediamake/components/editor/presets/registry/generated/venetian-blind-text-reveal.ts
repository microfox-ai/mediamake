/**
 * Venetian Blind Text Reveal Preset
 *
 * This preset creates a kinetic typography effect where text is revealed through a venetian blind animation.
 * Horizontal strips of text unfold from the center outward, creating a mechanical and precise reveal effect.
 *
 * Features:
 * - **Horizontal Strip Animation**: Text is sliced into 10 horizontal strips
 * - **Center-Outward Unfolding**: Strips animate from center to edges with staggered timing
 * - **Clip-Path Reveal**: Each strip uses clip-path polygon animation for the blind effect
 * - **Mechanical Timing**: Uses ease-in-out easing for precise, controlled motion
 * - **Full Text Duplication**: Each strip contains the full text, clipped to show only its portion
 * - **Configurable Parameters**: Strip count, duration, stagger delay, and direction control
 *
 * Use cases:
 * - Title reveals with a mechanical, precise aesthetic
 * - Transitional text effects with a unique opening style
 * - Modern kinetic typography for tech or design content
 * - Text reveals that mimic venetian blind mechanics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  fontSize: z.number().default(48).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  stripCount: z
    .number()
    .min(5)
    .max(20)
    .default(10)
    .describe('Number of horizontal strips (5-20)'),
  transitionDuration: z
    .number()
    .default(0.4)
    .describe('Duration of each strip animation in seconds'),
  staggerDelay: z
    .number()
    .default(0.03)
    .describe('Delay between strip animations in seconds'),
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-in-out')
    .describe('Easing function for strip animations'),
  alternateDirection: z
    .boolean()
    .default(false)
    .describe('Whether to alternate strip animation directions for added dynamism'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const {
    text,
    fontSize,
    textColor,
    stripCount,
    transitionDuration,
    staggerDelay,
    easingType,
    alternateDirection,
  } = params;

  // Calculate strip height as percentage
  const stripHeight = 100 / stripCount;

  // Calculate total duration (center strips start immediately, outer strips are staggered)
  const centerIndex = Math.floor(stripCount / 2);
  const maxStaggerDelay = centerIndex * staggerDelay;
  const totalDuration = transitionDuration + maxStaggerDelay;

  // Create strips
  const strips: RenderableComponentData[] = [];

  for (let i = 0; i < stripCount; i++) {
    const stripId = `venetian-strip-${i}`;
    const textId = `venetian-text-${i}`;

    // Calculate distance from center
    const distanceFromCenter = Math.abs(i - centerIndex);
    const effectStart = distanceFromCenter * staggerDelay;

    // Calculate text offset to show correct portion
    // Text needs to be positioned so that only this strip's portion is visible
    const textTopOffset = -i * stripHeight;

    // Create strip container
    const stripContainer: RenderableComponentData = {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-x-0 overflow-hidden',
          style: {
            top: `${i * stripHeight}%`,
            height: `${stripHeight}%`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [
        {
          id: `clip-effect-${i}`,
          componentId: 'generic',
          data: {
            type: easingType,
            start: effectStart,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              // Clip-path animation: start collapsed at vertical center, expand to full
              {
                key: 'clipPath',
                val: 'polygon(0% 50%, 100% 50%, 100% 50%, 0% 50%)',
                prog: 0,
              },
              {
                key: 'clipPath',
                val: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
                prog: 1,
              },
              // Optional: Add slight translateX for alternating direction effect
              ...(alternateDirection
                ? [
                    {
                      key: 'translateX',
                      val: i % 2 === 0 ? '-5px' : '5px',
                      prog: 0,
                    },
                    {
                      key: 'translateX',
                      val: '0px',
                      prog: 1,
                    },
                  ]
                : []),
            ],
          },
        },
      ],
      childrenData: [
        // Text atom containing full text, positioned to show this strip's portion
        {
          id: textId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: text,
            className: 'whitespace-nowrap',
            style: {
              position: 'absolute',
              top: `${textTopOffset}%`,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: `${fontSize}px`,
              color: textColor,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        },
      ],
    };

    strips.push(stripContainer);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'venetian-blind-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: strips,
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
  id: 'venetianBlindTextReveal',
  title: 'Venetian Blind Text Reveal',
  description:
    'A typokinetic preset that reveals text through a venetian blind effect. Horizontal strips unfold from the center outward, creating a mechanical, precise reveal animation. Each strip clips a portion of the full text using overflow-hidden, and animations stagger outward from center strips with alternating directions for added visual interest.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'text',
    'venetian',
    'blind',
    'reveal',
    'strips',
    'horizontal',
    'mechanical',
    'clip-path',
  ],
  defaultInputParams: {
    text: 'VENETIAN BLIND',
    font: 'Inter:700',
    fontSize: 64,
    textColor: '#FFFFFF',
    stripCount: 10,
    transitionDuration: 0.4,
    staggerDelay: 0.03,
    easingType: 'ease-in-out',
    alternateDirection: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const venetianBlindTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
