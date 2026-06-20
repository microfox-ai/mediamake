/**
 * Gentle Polaroid Float-Down Transition Preset
 *
 * Creates a dreamy, nostalgic transition where polaroid-framed images drift down
 * like falling leaves with gentle swaying motion. Features:
 * - Vintage cream-colored polaroid frames with rounded corners
 * - Sine-wave swaying motion (oscillating translateX) during descent
 * - Growing shadow as image descends, creating depth
 * - Outgoing image sinks into stack with scale reduction and shadow blur
 * - 1.2-second overlap for leisurely, nostalgic pacing
 * - Neutral stone-200 table surface background
 *
 * Use cases:
 * - Nostalgic photo slideshows with vintage aesthetic
 * - Memory lane transitions for family videos
 * - Scrapbook-style presentations
 * - Gentle, organic transitions for travel content
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  media1: z.object({
    src: z.string().describe('Source URL of the first (outgoing) media'),
    duration: z.number().describe('Duration of the first media in seconds'),
  }),
  media2: z.object({
    src: z.string().describe('Source URL of the second (incoming) media'),
    duration: z.number().describe('Duration of the second media in seconds'),
  }),
  transitionDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the transition overlap in seconds (default: 1.2s for leisurely feel)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { media1, media2, transitionDuration } = params;

  // Calculate total duration with overlap
  const totalDuration = media1.duration + media2.duration - transitionDuration;

  // Timing calculations
  const outgoingStart = 0;
  const outgoingDuration = media1.duration;
  const outgoingEffectStart = media1.duration - transitionDuration;

  const incomingStart = media1.duration - transitionDuration;
  const incomingDuration = media2.duration + transitionDuration;

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Outgoing polaroid container
    {
      id: 'outgoing-polaroid-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: outgoingStart,
          duration: outgoingDuration,
        },
      },
      childrenData: [
        {
          id: 'outgoing-image',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: media1.src,
            className: 'absolute p-3 pb-10 bg-amber-50 rounded shadow-xl',
            style: {
              width: '80%',
              height: 'auto',
              maxWidth: '600px',
              aspectRatio: '4/3',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: outgoingDuration,
            },
          },
          effects: [
            {
              id: 'outgoing-scale-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: outgoingEffectStart,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['outgoing-image'],
                ranges: [
                  { key: 'scale', val: 1, prog: 0 },
                  { key: 'scale', val: 0.92, prog: 1 },
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: 2, prog: 1 },
                  {
                    key: 'filter',
                    val: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'drop-shadow(0 10px 60px rgba(0,0,0,0.5))',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,

    // Incoming polaroid container
    {
      id: 'incoming-polaroid-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
        },
      },
      context: {
        timing: {
          start: incomingStart,
          duration: incomingDuration,
        },
      },
      childrenData: [
        {
          id: 'incoming-image',
          type: 'atom',
          componentId: 'ImageAtom',
          data: {
            src: media2.src,
            className: 'absolute p-3 pb-10 bg-amber-50 rounded shadow-xl',
            style: {
              width: '80%',
              height: 'auto',
              maxWidth: '600px',
              aspectRatio: '4/3',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: incomingDuration,
            },
          },
          effects: [
            // Float down with rotation
            {
              id: 'incoming-float-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out-quad',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-image'],
                ranges: [
                  { key: 'translateY', val: -100, prog: 0 },
                  { key: 'translateY', val: 0, prog: 1 },
                  { key: 'rotateZ', val: -5, prog: 0 },
                  { key: 'rotateZ', val: 0, prog: 1 },
                ],
              },
            },
            // Sine-wave swaying motion
            {
              id: 'incoming-sway-effect',
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-image'],
                ranges: [
                  { key: 'translateX', val: -3, prog: 0 },
                  { key: 'translateX', val: 3, prog: 0.25 },
                  { key: 'translateX', val: -2, prog: 0.5 },
                  { key: 'translateX', val: 1, prog: 0.75 },
                  { key: 'translateX', val: 0, prog: 1 },
                ],
              },
            },
            // Growing shadow
            {
              id: 'incoming-shadow-effect',
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: 0,
                duration: transitionDuration,
                mode: 'provider',
                targetIds: ['incoming-image'],
                ranges: [
                  {
                    key: 'filter',
                    val: 'drop-shadow(0 0 0px rgba(0,0,0,0))',
                    prog: 0,
                  },
                  {
                    key: 'filter',
                    val: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
                    prog: 1,
                  },
                ],
              },
            },
          ],
        } as RenderableComponentData,
      ],
    } as RenderableComponentData,
  ];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'gentle-polaroid-float-down-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-stone-200',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData,
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'gentle-polaroid-float-down',
  title: 'Gentle Polaroid Float-Down Transition',
  description:
    'A dreamy transition where polaroid-framed images drift down like falling leaves with gentle swaying motion, vintage cream frames, growing shadows, and nostalgic aesthetic. Features sine-wave oscillation, subtle rotation, and 1.2-second overlap for leisurely pacing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'polaroid', 'nostalgic', 'vintage', 'float', 'dreamy', 'gentle'],
  defaultInputParams: {
    media1: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop',
      duration: 5,
    },
    media2: {
      src: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&h=600&fit=crop',
      duration: 5,
    },
    transitionDuration: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const gentlePolaroidFloatDownPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
