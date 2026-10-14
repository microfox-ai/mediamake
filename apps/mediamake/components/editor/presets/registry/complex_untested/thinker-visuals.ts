import {
  GenericEffectData,
  InputCompositionProps,
  VideoAtomDataProps,
  PanEffectData,
  WaveformHistogramRangedDataProps,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { Layout } from 'lucide-react';

const presetParams = z.object({
  imageUrl: z.string().describe('Background image URL'),
  titleText: z.string().describe("Main title text (e.g., 'Get into Zone')"),
  keystoneText: z.string().describe("Keystone text (e.g., 'keystone')"),
  titleColor: z.string().optional().describe('Title text color (hex)'),
  titleFont: z
    .string()
    .optional()
    .describe('Title font family (e.g., "Roboto:600:italic" or "BebasNeue")'),
  keystoneColor: z.string().optional().describe('Keystone text color (hex)'),
  keystoneFont: z
    .string()
    .optional()
    .describe(
      'Keystone font family (e.g., "Roboto:600:italic" or "BebasNeue")',
    ),
  aspectRatio: z
    .string()
    .optional()
    .describe('Aspect ratio (e.g., "16:9" or "9:16")'),
  background: z
    .object({
      imageUrl: z.string().describe('Background image URL'),
      videoUrl: z.string().optional().describe('Background video URL'),
      opacity: z.number().optional().describe('Background opacity'),
    })
    .optional(),
  bottomArtWork: z
    .object({
      src: z.string(),
      text: z.string(),
      audioUrl: z.string(),
    })
    .optional(),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
): PresetOutput => {
  // Parse aspect ratio
  const [widthRatio, heightRatio] = params.aspectRatio
    ?.split(':')
    .map(Number) ?? [16, 9];
  const aspectRatio = widthRatio / heightRatio;
  const isVertical = aspectRatio < 1;

  // 1st slowed out video track.
  const video = {
    id: `video-1-alkefn`,
    componentId: 'VideoAtom',
    type: 'atom' as const,
    effects: [
      {
        id: `video-1-effects-alkefn`,
        componentId: 'generic',
        data: {
          start: 0,
          duration: 1,
          mode: 'provider',
          targetIds: ['video-1-alkefn'],
          type: 'ease-in-out',
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: params.background?.opacity ?? 0.35,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      },
    ],
    data: {
      src:
        params.background?.videoUrl ||
        'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/social_u6251845547_httpss.mj.run9l2KyQUVPrM_camera_rotates_around._-_e8d79e2e-6ed9-4fc6-946d-b182e6f84b88_0.mp4',
      className: 'w-full h-full object-cover bg-black',
      fit: 'cover' as const,
      playbackRate: 1,
      loop: true,
    } as VideoAtomDataProps,
    context: {
      timing: {
        fitDurationTo: 'audio-track',
      },
    },
  };

  // 2nd moving animation
  const image = {
    id: `image-1-alkefn`,
    componentId: 'ImageAtom',
    type: 'atom' as const,
    effects: [
      {
        id: `video-1-effects-alkefn`,
        componentId: 'generic',
        data: {
          start: 0,
          duration: 2,
          mode: 'provider',
          targetIds: ['image-1-alkefn'],
          type: 'ease-in-out',
          ranges: [
            {
              key: 'opacity',
              val: 0,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 1,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      },
      {
        id: `right-moveout`,
        componentId: 'generic',
        data: {
          start: 0,
          ranges: [
            {
              key: 'translateX',
              val: '0%',
              prog: 0,
            },
            {
              key: 'translateX',
              val: '25%',
              prog: 1,
            },
          ],
          targetIds: ['image-1-alkefn'],
          type: 'ease-out',
          mode: 'provider',
          duration: 10,
        } as GenericEffectData,
      },
    ],
    data: {
      src: params.imageUrl,
      className: 'w-full h-auto object-cover bg-black',
      //   containerClassName: 'w-full h-full bg-black',
    },
    context: {
      timing: {
        duration: 12,
      },
    },
  };

  // Title intro with "Get into Zone" and "keystone" text
  const titleIntro = {
    id: `title-intro-alkefn`,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className:
          'absolute left-30 top-0 bottom-0 flex flex-col items-start justify-center z-10',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 16,
      },
    },
    childrenData: [
      // "Get into Zone" text (similar to middleText from waveform)
      {
        id: 'get-into-zone-text',
        componentId: 'TextAtom',
        type: 'atom' as const,
        effects: [
          {
            id: 'get-into-zone-fade-in',
            componentId: 'generic',
            data: {
              start: 2,
              duration: 1,
              mode: 'provider',
              targetIds: ['get-into-zone-text'],
              type: 'ease-in',
              ranges: [
                {
                  key: 'opacity',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: 1,
                  prog: 1,
                },
              ],
            } as GenericEffectData,
          },
          {
            id: 'get-into-zone-slide-in',
            componentId: 'generic',
            data: {
              start: 2,
              duration: 10,
              mode: 'provider',
              targetIds: ['get-into-zone-text'],
              type: 'ease-in',
              ranges: [
                {
                  key: 'translateX',
                  val: '-50px',
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: '0px',
                  prog: 1,
                },
              ],
            },
          },
          {
            id: 'get-into-zone-letter-spacing',
            componentId: 'generic',
            data: {
              start: 2,
              duration: 10,
              mode: 'provider',
              targetIds: ['get-into-zone-text'],
              type: 'ease-in-out',
              ranges: [
                {
                  key: 'letterSpacing',
                  val: 10,
                  prog: 0,
                },
                {
                  key: 'letterSpacing',
                  val: 40,
                  prog: 2,
                },
              ],
            } as GenericEffectData,
          },
        ],
        data: {
          text: params.titleText,
          className: 'px-0 py-4 text-center',
          style: {
            fontSize: 25,
            color: params.titleColor || '#FFF',
            textTransform: 'uppercase',
            letterSpacing: 30,
            fontWeight: 700,
          },
          font: {
            family: params.titleFont?.includes(':')
              ? params.titleFont.split(':')[0]
              : params.titleFont || 'Inter',
            ...(params.titleFont?.includes(':')
              ? { weights: [params.titleFont.split(':')[1]] }
              : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 12,
          },
        },
      },
      // "keystone" text (similar to titleText from waveform)
      {
        id: 'keystone-text',
        componentId: 'TextAtom',
        type: 'atom' as const,
        effects: [
          {
            id: 'keystone-fade-in',
            componentId: 'generic',
            data: {
              start: 5,
              duration: 1,
              mode: 'provider',
              targetIds: ['keystone-text'],
              type: 'ease-in',
              ranges: [
                {
                  key: 'opacity',
                  val: 0,
                  prog: 0,
                },
                {
                  key: 'opacity',
                  val: 1,
                  prog: 1,
                },
              ],
            } as GenericEffectData,
          },
          {
            id: 'keystone-slide-in',
            componentId: 'generic',
            data: {
              start: 5,
              duration: 7,
              mode: 'provider',
              targetIds: ['keystone-text'],
              type: 'ease-out',
              ranges: [
                {
                  key: 'translateX',
                  val: '-50px',
                  prog: 0,
                },
                {
                  key: 'translateX',
                  val: '0px',
                  prog: 1,
                },
              ],
            } as GenericEffectData,
          },
          {
            id: 'keystone-letter-spacing',
            componentId: 'generic',
            data: {
              start: 5,
              duration: 7,
              mode: 'provider',
              targetIds: ['keystone-text'],
              type: 'ease-in-out',
              ranges: [
                {
                  key: 'letterSpacing',
                  val: 10,
                  prog: 0,
                },
                {
                  key: 'letterSpacing',
                  val: 30,
                  prog: 2,
                },
              ],
            } as GenericEffectData,
          },
          {
            id: 'keystone-glow',
            componentId: 'generic',
            data: {
              start: 5,
              duration: 7,
              mode: 'provider',
              targetIds: ['keystone-text'],
              type: 'ease-in-out',
              ranges: [
                {
                  key: 'textShadow',
                  val: '0 0 0px #FFF',
                  prog: 0,
                },
                {
                  key: 'textShadow',
                  val: '0 0 20px #FFF, 0 0 40px #FFF, 0 0 60px #FFF',
                  prog: 0.5,
                },
                {
                  key: 'textShadow',
                  val: '0 0 0px #FFF',
                  prog: 1,
                },
              ],
            } as GenericEffectData,
          },
        ],
        data: {
          text: params.keystoneText,
          className: 'rounded-xl',
          style: {
            fontSize: 150,
            color: params.keystoneColor || '#FFF',
            borderRadius: 40,
            letterSpacing: 10,
            fontWeight: 100,
          },
          font: {
            family: params.keystoneFont?.includes(':')
              ? params.keystoneFont.split(':')[0]
              : params.keystoneFont || 'BebasNeue',
            weights: params.keystoneFont?.includes(':')
              ? [params.keystoneFont.split(':')[1]]
              : ['400'],
          },
        },
        context: {
          timing: {
            duration: 12,
          },
        },
      },
    ],
  };

  const layout = {
    id: `layout-1-alkefn`,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      repeatChildrenProps: {
        className: `absolute inset-0`,
      },
    },
    effects: [
      {
        id: 'keystone-fade-out',
        componentId: 'generic',
        data: {
          start: 10,
          duration: 2,
          mode: 'provider',
          targetIds: ['title-intro-alkefn'],
          type: 'ease-out',
          ranges: [
            {
              key: 'opacity',
              val: 1,
              prog: 0,
            },
            {
              key: 'opacity',
              val: 0,
              prog: 1,
            },
          ],
        } as GenericEffectData,
      },
    ],
    context: {
      timing: {
        duration: 12,
      },
    },
    childrenData: [...(params.imageUrl ? [image] : []), titleIntro],
  };

  const image2 = {
    id: `image-2-alkefn`,
    componentId: 'ImageAtom',
    type: 'atom' as const,
    effects: [
      {
        id: 'image2-pan-effect',
        componentId: 'pan',
        data: {
          panDirection: 'up',
          panDistance: 400,
          loopTimes: 3,
        } as PanEffectData,
      },
    ],
    data: {
      src: params.background?.imageUrl,
      className: isVertical
        ? 'w-[100%] h-[130%] object-cover'
        : 'w-full h-auto object-cover',
      style: {
        opacity: params.background?.opacity ?? 0.5,
        transform: isVertical ? 'translateX(0%)' : 'translateX(25%)',
      },
    },
  };

  const histogramStatic = {
    id: 'histogram-static-alkefn',
    componentId: 'WaveformHistogramRanged',
    type: 'atom' as const,
    data: {
      audio: { src: params.bottomArtWork?.audioUrl ?? '', start: 0 },
      width: 1920,
      height: 300,
      numberOfSamples: 64,
      windowInSeconds: 1 / 30,
      barSpacing: 10,
      barBorderRadius: 8,
      barWidth: 4,
      multiplier: 1,
      horizontalSymmetry: false,
      verticalMirror: true,
      histogramStyle: 'full-width',
      amplitude: 0.75,
      gradientStartColor: '#FFF',
      gradientEndColor: params.keystoneColor ?? '#FDCE99',
      gradientDirection: 'vertical',
      gradientStyle: 'mirrored',
      className: 'rounded-lg absolute bottom-0',
      waveDirection: 'right-to-left',
      style: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '30%',
      },
    } as WaveformHistogramRangedDataProps,
  };

  const image3 = {
    id: `image-3-alkefn`,
    componentId: 'ImageAtom',
    type: 'atom' as const,
    data: {
      src: params.bottomArtWork?.src,
      className: 'w-[400px] h-[400px] object-cover',
      style: {
        opacity: 1,
        borderRadius: 40,
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: '15%',
        filter: 'drop-shadow(0 0 10px #000)',
      },
    },
  };

  const text = {
    id: `text-1-alkefn`,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: {
      text: params.bottomArtWork?.text,
      className: 'text-white text-2xl font-bold',
      style: {
        fontSize: 45,
        color: '#FFF',
        textTransform: 'uppercase',
        letterSpacing: 10,
        fontWeight: 900,
        position: 'absolute',
        bottom: '10%',
        left: '50%',
        transform: 'translateX(-50%)',
      },
      font: {
        family: 'Inter',
        weights: ['100', '400', '700'],
      },
    },
  };

  const layout2 = {
    id: `layout-2-alkefn`,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: `absolute inset-0`,
      },
      repeatChildrenProps: {
        className: `absolute inset-0`,
      },
    },
    context: {
      timing: {
        start: 12,
        fitDurationTo: 'audio-track',
      },
    },
    childrenData: [
      ...(params.background?.videoUrl ? [video] : []),
      ...(params.background?.imageUrl ? [image2] : []),
      ...(params.bottomArtWork?.audioUrl ? [histogramStatic] : []),
      ...(params.bottomArtWork?.src ? [image3] : []),
      ...(params.bottomArtWork?.text ? [text] : []),
    ],
  };

  return {
    output: {
      config: {
        fitDurationTo: 'title-intro-alkefn', // Fit duration to the title intro (10 seconds)
      },
      childrenData: [
        // Title intro overlay
        layout,
        layout2,
      ],
    },
    options: {
      attachedToId: `BaseScene`,
      attachedContainers: [
        {
          className: 'absolute inset-0',
        },
      ],
    },
  };
};

const videoStitchPresetMetadata: PresetMetadata = {
  id: 'thinker-visuals',
  title: 'Thinker Visuals',
  description:
    'Stitches multiple videos together in sequence with customizable aspect ratio',
  type: 'predefined',
  presetType: 'children',
  tags: ['video', 'stitch', 'sequence', 'aspect-ratio'],
  defaultInputParams: {
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/u6251845547_Rodins_The_Thinker_in_a_luxry_chromium_black_art__a3a22513-8951-4171-8f21-485c8ae346e5_2.png',
    titleText: 'Get into Zone',
    keystoneText: 'keystone',
  },
};

const videoStitchPresetFunction = presetExecution.toString();
const videoStitchPresetParams = z.toJSONSchema(presetParams);

export const thinkerVisualsPreset = {
  metadata: videoStitchPresetMetadata,
  presetFunction: videoStitchPresetFunction,
  presetParams: videoStitchPresetParams,
};
