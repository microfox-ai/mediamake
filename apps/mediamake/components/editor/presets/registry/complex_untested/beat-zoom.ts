import {
  InputCompositionProps,
  VideoAtomDataProps,
  WaveformEffectData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

const presetParams = z.object({
  audioUrl: z.string().describe('Audio URL for beat detection'),
  videoUrl: z.string().optional().describe('Video URL to apply zoom effect to'),
  imageUrl: z.string().optional().describe('Image URL to apply zoom effect to'),
  zoomIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .optional()
    .describe('Zoom intensity multiplier (0.1-2)'),
  baseScale: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1)
    .optional()
    .describe('Base scale value (0.5-1.5)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.5)
    .optional()
    .describe('Beat detection sensitivity (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Minimum audio value to trigger zoom (0-1)'),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('bass')
    .optional()
    .describe('Which audio property to react to'),
  smoothNormalisation: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe(
      'Frame-based smoothing control (0 = no smoothing, 1 = default, >1 = more smoothing)',
    ),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .optional()
    .describe('Duration of the composition in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: Partial<PresetPassedProps>,
): PresetOutput => {
  const { config } = props;
  const duration = params.duration ?? 20;
  const audioUrl = params.audioUrl;
  const zoomIntensity = params.zoomIntensity ?? 0.3;
  const baseScale = params.baseScale ?? 1;
  const sensitivity = params.sensitivity ?? 1.5;
  const threshold = params.threshold ?? 0.2;
  const audioProperty = params.audioProperty ?? 'bass';
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Determine media source
  const mediaSrc = params.videoUrl || params.imageUrl;
  if (!mediaSrc) {
    throw new Error('Either videoUrl or imageUrl must be provided');
  }

  const isVideo = Boolean(params.videoUrl);
  const mediaId = 'beat-zoom-media';

  // Create media component with waveform effect
  const mediaComponent = {
    id: mediaId,
    componentId: isVideo ? 'VideoAtom' : 'ImageAtom',
    type: 'atom' as const,
    data: {
      src: mediaSrc,
      fit: 'cover' as const,
      className: 'w-full h-full object-cover',
      ...(isVideo ? {} : { objectFit: 'cover' }),
    } as VideoAtomDataProps,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'beat-zoom-effect',
        componentId: 'waveform',
        data: {
          audioSrc: audioUrl,
          audioProperty,
          effectType: 'zoom',
          intensity: zoomIntensity,
          baseScale,
          sensitivity,
          threshold,
          numberOfSamples: 128,
          useFrequencyData: true,
          windowInSeconds: 1 / 30,
          mode: 'wrapper',
          smoothNormalisation,
        } as WaveformEffectData,
      },
    ],
  };

  // Create layout wrapper
  const layout = {
    id: 'beat-zoom-layout',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [mediaComponent],
  };

  return {
    output: {
      config: {
        duration,
      },
      childrenData: [layout],
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

const beatZoomPresetMetadata: PresetMetadata = {
  id: 'beat-zoom',
  title: 'Beat Zoom',
  description:
    'Zoom effect that reacts to audio beats using waveform analysis. Perfect for music videos and dynamic content.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'beat', 'zoom', 'waveform', 'music', 'dynamic'],
  defaultInputParams: {
    audioUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/sample-audio.mp3',
    videoUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/sample-video.mp4',
    zoomIntensity: 0.3,
    baseScale: 1,
    sensitivity: 1.5,
    threshold: 0.2,
    audioProperty: 'bass',
    smoothNormalisation: 1,
    duration: 20,
  },
};

const beatZoomPresetFunction = presetExecution.toString();
const beatZoomPresetParams = z.toJSONSchema(presetParams);

export const beatZoomPreset = {
  metadata: beatZoomPresetMetadata,
  presetFunction: beatZoomPresetFunction,
  presetParams: beatZoomPresetParams,
};
