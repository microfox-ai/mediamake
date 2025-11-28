/**
 * Vinyl Record Slide Transition Preset
 *
 * This preset creates a music/album themed horizontal slide transition where images slide
 * horizontally with a vinyl record aesthetic. As the image slides out, a circular vinyl
 * record graphic briefly appears behind it (like sliding an album cover to reveal the record),
 * then the new album art slides in covering the record.
 *
 * Features:
 * - Horizontal slide transitions with vinyl record reveal
 * - Rotating vinyl disc element with radial gradient rings
 * - 800ms overlap for full reveal-and-cover cycle
 * - Album sleeve aesthetic with borders and drop shadows
 * - Smooth ease-in-out transitions for slide momentum
 * - Provider mode effects with proper z-index layering
 *
 * Use cases:
 * - Music video transitions between album covers
 * - Podcast episode artwork transitions
 * - Playlist visual sequences
 * - Album showcase presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  mediaItems: z
    .array(
      z.object({
        src: z.string().describe('Source URL of the media item'),
        type: z
          .enum(['image', 'video'])
          .default('image')
          .describe('Type of media'),
        duration: z
          .number()
          .positive()
          .describe('Duration of this media item in seconds'),
        fit: z
          .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
          .default('cover')
          .optional()
          .describe('How to fit the media in its container'),
        opacity: z
          .number()
          .min(0)
          .max(1)
          .default(1)
          .optional()
          .describe('Opacity of the media item'),
      }),
    )
    .min(2)
    .describe('Array of media items to transition between (minimum 2)'),
  overlapDuration: z
    .number()
    .positive()
    .default(0.8)
    .describe('Duration of the overlap/transition in seconds'),
  trackName: z
    .string()
    .default('vinyl-slide-track')
    .describe('Name for the track (used in IDs)'),
  vinylSize: z
    .number()
    .min(0.3)
    .max(0.9)
    .default(0.6)
    .describe('Size of vinyl disc as percentage of viewport (0.3-0.9)'),
  vinylRotationDuration: z
    .number()
    .positive()
    .default(8)
    .describe('Duration for one full vinyl rotation in seconds'),
  imageBorder: z
    .string()
    .default('4px solid white')
    .describe('Border style for album sleeve aesthetic'),
  imageShadow: z
    .string()
    .default('0 8px 24px rgba(0,0,0,0.4)')
    .describe('Drop shadow for album sleeve depth'),
  imageRounding: z
    .string()
    .default('rounded-sm')
    .describe('Border radius class for album sleeves'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    mediaItems,
    overlapDuration,
    trackName,
    vinylSize,
    vinylRotationDuration,
    imageBorder,
    imageShadow,
    imageRounding,
  } = params;

  // Calculate total duration: sum of all media durations minus overlaps
  const totalDuration =
    mediaItems.reduce((sum, item) => sum + item.duration, 0) -
    overlapDuration * (mediaItems.length - 1);

  // Create vinyl disc HTML with radial gradient rings
  const vinylHtml = `
    <div style="
      width: ${vinylSize * 100}%;
      padding-bottom: ${vinylSize * 100}%;
      background: radial-gradient(
        circle,
        #1a1a1a 0%,
        #1a1a1a 15%,
        #333 15%,
        #333 17%,
        #1a1a1a 17%,
        #1a1a1a 32%,
        #333 32%,
        #333 34%,
        #1a1a1a 34%,
        #1a1a1a 48%,
        #2a2a2a 48%,
        #2a2a2a 52%,
        #0a0a0a 52%,
        #0a0a0a 100%
      );
      border-radius: 50%;
      box-shadow: 0 0 30px rgba(0,0,0,0.8);
      position: relative;
    "></div>
  `;

  // Calculate rotation amount per frame for continuous rotation
  const fps = props.config?.fps || 30;
  const framesForFullRotation = vinylRotationDuration * fps;
  const degreesPerFrame = 360 / framesForFullRotation;

  // Build media items with slide transitions
  let currentTime = 0;
  const mediaChildren: RenderableComponentData[] = [];

  mediaItems.forEach((item, index) => {
    const isFirst = index === 0;
    const isLast = index === mediaItems.length - 1;

    // Determine start time and duration
    let startTime: number;
    let duration: number;

    if (isFirst) {
      startTime = 0;
      duration = item.duration;
    } else {
      startTime = currentTime - overlapDuration;
      duration = item.duration + overlapDuration;
    }

    const mediaId = `${trackName}-media-${index}`;
    const isVideo = item.type === 'video';

    // Determine z-index: outgoing is z-30, incoming starts z-10 then becomes z-30 at midpoint
    const isOutgoing = !isLast;
    const isIncoming = !isFirst;

    // Create media atom
    const mediaAtom: RenderableComponentData = {
      id: mediaId,
      type: 'atom' as const,
      componentId: isVideo ? 'VideoAtom' : 'ImageAtom',
      data: {
        src: item.src,
        className: `w-full h-full object-${item.fit || 'cover'} ${imageRounding}`,
        style: {
          border: imageBorder,
          boxShadow: imageShadow,
          opacity: item.opacity ?? 1,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: duration,
        },
      },
      effects: [],
    };

    // Add slide effects
    const effects: any[] = [];

    // Outgoing: slide from 0% to -110% (0.4rel to 1rel)
    if (isOutgoing) {
      const slideOutStart = item.duration * 0.4;
      const slideOutDuration = item.duration * 0.6;

      effects.push({
        id: `${mediaId}-slide-out`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: slideOutStart,
          duration: slideOutDuration,
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'translateX', val: '0%', prog: 0 },
            { key: 'translateX', val: '-110%', prog: 1 },
          ],
        },
      });
    }

    // Incoming: slide from 110% to 0% (0rel to 0.6rel)
    if (isIncoming) {
      const slideInDuration = duration * 0.6;

      effects.push({
        id: `${mediaId}-slide-in`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: slideInDuration,
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'translateX', val: '110%', prog: 0 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      });

      // Z-index transition: start at 10, become 30 at midpoint (0.3rel)
      const zIndexTransitionPoint = duration * 0.3;
      effects.push({
        id: `${mediaId}-z-index`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: zIndexTransitionPoint,
          mode: 'provider',
          targetIds: [mediaId],
          ranges: [
            { key: 'zIndex', val: 10, prog: 0 },
            { key: 'zIndex', val: 30, prog: 1 },
          ],
        },
      });
    } else {
      // First item starts at z-30
      mediaAtom.data = {
        ...mediaAtom.data,
        style: {
          ...mediaAtom.data.style,
          zIndex: 30,
        },
      };
    }

    mediaAtom.effects = effects;
    mediaChildren.push(mediaAtom);

    currentTime += item.duration;
  });

  // Create vinyl disc overlay with continuous rotation
  const vinylDisc: RenderableComponentData = {
    id: `${trackName}-vinyl-disc`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: vinylHtml,
      className: 'absolute inset-0 flex items-center justify-center',
      style: {
        zIndex: 20,
        pointerEvents: 'none',
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
        id: `${trackName}-vinyl-rotation`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: totalDuration,
          mode: 'provider',
          targetIds: [`${trackName}-vinyl-disc`],
          ranges: [
            { key: 'rotate', val: 0, prog: 0 },
            {
              key: 'rotate',
              val: (totalDuration / vinylRotationDuration) * 360,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gray-900 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [vinylDisc, ...mediaChildren],
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
  id: 'vinyl-record-slide',
  title: 'Vinyl Record Slide Transition',
  description:
    'Music/album themed transition where images slide horizontally revealing a rotating vinyl record graphic behind them, creating an album-sleeve aesthetic with borders and shadows',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'slide', 'vinyl', 'music', 'album', 'record'],
  defaultInputParams: {
    mediaItems: [
      {
        src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&h=800&fit=crop',
        type: 'image',
        duration: 5,
        fit: 'cover',
        opacity: 1,
      },
      {
        src: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&h=800&fit=crop',
        type: 'image',
        duration: 5,
        fit: 'cover',
        opacity: 1,
      },
    ],
    overlapDuration: 0.8,
    trackName: 'vinyl-slide-track',
    vinylSize: 0.6,
    vinylRotationDuration: 8,
    imageBorder: '4px solid white',
    imageShadow: '0 8px 24px rgba(0,0,0,0.4)',
    imageRounding: 'rounded-sm',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const vinylRecordSlidePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
