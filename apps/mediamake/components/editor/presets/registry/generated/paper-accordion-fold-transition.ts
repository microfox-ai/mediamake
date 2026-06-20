/**
 * Paper Accordion Fold Transition Preset
 *
 * Creates a visually striking transition where the screen folds and unfolds like an accordion.
 * The outgoing video compresses into vertical strips while the incoming video simultaneously
 * unfolds from those same strips. Each strip has alternating light/shadow effects to create
 * realistic depth, and the animation propagates from left to right in a wave-like pattern.
 *
 * Features:
 * - **Accordion Fold Effect**: Screen divides into 8 vertical strips that compress/expand
 * - **Wave Animation**: Staggered timing creates left-to-right wave propagation
 * - **Depth Simulation**: Alternating brightness (0.9/1.1) on strips for 3D fold illusion
 * - **Synchronized Transition**: Outgoing fades out as incoming fades in per strip
 * - **3D Skew Effects**: SkewY transforms during compression enhance folding realism
 *
 * Technical Implementation:
 * - 8 vertical strips (12.5% width each) with absolute positioning
 * - ScaleX animations: 1 → 0.05 → 1 (compress then unfold)
 * - Staggered delays: strip-i starts at i * 100ms for wave effect
 * - Each strip contains both videos with proper alignment (objectPosition and left offset)
 * - Brightness filters alternate between strips (even: 0.9, odd: 1.1)
 * - SkewY transforms applied during compression phase for 3D effect
 * - Opacity crossfade: outgoing 1→0, incoming 0→1, synchronized with unfold
 *
 * Use Cases:
 * - Creative transitions between video clips or images
 * - Music video scene changes
 * - Presentation slide transitions
 * - Stylized content reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  media1: z
    .object({
      src: z.string().describe('Source URL or path of outgoing media'),
      type: z.enum(['image', 'video']).describe('Type of outgoing media'),
      duration: z.number().describe('Duration of outgoing media in seconds'),
    })
    .describe('Outgoing media configuration'),
  media2: z
    .object({
      src: z.string().describe('Source URL or path of incoming media'),
      type: z.enum(['image', 'video']).describe('Type of incoming media'),
      duration: z.number().describe('Duration of incoming media in seconds'),
    })
    .describe('Incoming media configuration'),
  transitionDuration: z
    .number()
    .default(1.8)
    .describe(
      'Duration of the accordion fold transition overlap in seconds (default: 1.8s)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate total duration with overlap
  const baseLayoutDuration =
    media1.duration + media2.duration - transitionDuration;

  // Helper: Determine component ID from media type
  const getComponentId = (type: 'image' | 'video'): string => {
    return type === 'video' ? 'VideoAtom' : 'ImageAtom';
  };

  // Constants for strip configuration
  const NUM_STRIPS = 8;
  const STRIP_WIDTH = 12.5; // percentage
  const STAGGER_DELAY = 0.1; // 100ms between strips
  const COMPRESSION_SCALE = 0.05; // How much strips compress (5% of original)
  const SKEW_MAX = 8; // Maximum skew angle in degrees

  // Helper: Create a single strip with both videos
  const createStrip = (index: number): RenderableComponentData => {
    const isEven = index % 2 === 0;
    const brightness = isEven ? 0.9 : 1.1;
    const leftPosition = index * STRIP_WIDTH;
    const stripDelay = index * STAGGER_DELAY;
    const skewAngle = isEven ? SKEW_MAX : -SKEW_MAX;

    // For video positioning inside strip
    const videoWidth = NUM_STRIPS * 100; // 800%
    const videoLeft = -index * 100; // Offset to align with strip position

    const stripId = `strip-${index}`;
    const outgoingId = `${stripId}-outgoing`;
    const incomingId = `${stripId}-incoming`;

    return {
      id: stripId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute overflow-hidden',
          style: {
            left: `${leftPosition}%`,
            top: '0',
            width: `${STRIP_WIDTH}%`,
            height: '100%',
            filter: `brightness(${brightness})`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: baseLayoutDuration,
        },
      },
      effects: [
        // ScaleX animation: compress then unfold
        {
          id: `${stripId}-scale-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: stripDelay,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'scaleX', val: 1, prog: 0 }, // Start normal
              {
                key: 'scaleX',
                val: COMPRESSION_SCALE,
                prog: 0.5,
              }, // Compress
              { key: 'scaleX', val: 1, prog: 1 }, // Unfold
            ],
          },
        },
        // SkewY for 3D fold effect during compression
        {
          id: `${stripId}-skew-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: stripDelay,
            duration: transitionDuration * 0.6, // Skew only during compression phase
            mode: 'provider',
            targetIds: [stripId],
            ranges: [
              { key: 'skewY', val: 0, prog: 0 },
              { key: 'skewY', val: skewAngle, prog: 0.5 },
              { key: 'skewY', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        // Outgoing video in this strip
        {
          id: outgoingId,
          type: 'atom',
          componentId: getComponentId(media1.type),
          data: {
            src: media1.src,
            className: 'absolute',
            style: {
              width: `${videoWidth}%`,
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${leftPosition}% center`,
              left: `${videoLeft}%`,
              top: '0',
            },
            ...(media1.type === 'video' && {
              muted: false,
              volume: 1,
            }),
          },
          context: {
            timing: {
              start: 0,
              duration: media1.duration,
            },
          },
          effects: [
            // Fade out during compression
            {
              id: `${outgoingId}-fade-out`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: stripDelay,
                duration: transitionDuration * 0.5,
                mode: 'provider',
                targetIds: [outgoingId],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
        // Incoming video in this strip
        {
          id: incomingId,
          type: 'atom',
          componentId: getComponentId(media2.type),
          data: {
            src: media2.src,
            className: 'absolute',
            style: {
              width: `${videoWidth}%`,
              height: '100%',
              objectFit: 'cover',
              objectPosition: `${leftPosition}% center`,
              left: `${videoLeft}%`,
              top: '0',
            },
            ...(media2.type === 'video' && {
              muted: false,
              volume: 1,
            }),
          },
          context: {
            timing: {
              start: media1.duration - transitionDuration,
              duration: media2.duration + transitionDuration,
            },
          },
          effects: [
            // Fade in during unfold
            {
              id: `${incomingId}-fade-in`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: stripDelay + transitionDuration * 0.5, // Start fade-in at midpoint
                duration: transitionDuration * 0.5,
                mode: 'provider',
                targetIds: [incomingId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    };
  };

  // Generate all 8 strips
  const strips: RenderableComponentData[] = [];
  for (let i = 0; i < NUM_STRIPS; i++) {
    strips.push(createStrip(i));
  }

  const rootContainer: RenderableComponentData = {
    id: 'paper-accordion-transition-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
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
  id: 'paper-accordion-fold-transition',
  title: 'Paper Accordion Fold Transition',
  description:
    'A transition effect that folds the screen into vertical accordion strips. The outgoing media compresses horizontally while the incoming media unfolds, with alternating light/shadow on strips creating depth. The fold animation waves from left to right with staggered timing per strip.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'accordion',
    'fold',
    'wave',
    '3d-effect',
    'creative',
    'strips',
  ],
  defaultInputParams: {
    media1: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      type: 'video',
      duration: 5,
    },
    media2: {
      src: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 1.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const paperAccordionFoldTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
