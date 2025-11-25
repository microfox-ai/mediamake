import {
  InputCompositionProps,
  VideoAtomDataProps,
  WaveformEffectData,
} from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

const presetParams = z.object({
  audioUrl: z.string().describe('Audio URL for beat detection'),
  videoUrl: z
    .string()
    .optional()
    .describe('Video URL to apply shake effect to'),
  imageUrl: z
    .string()
    .optional()
    .describe('Image URL to apply shake effect to'),
  shakeIntensity: z
    .number()
    .min(5)
    .max(100)
    .default(20)
    .optional()
    .describe('Shake intensity in pixels (5-100)'),
  shakeAxis: z
    .enum(['x', 'y', 'both'])
    .default('both')
    .optional()
    .describe('Which axis to shake'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(2)
    .optional()
    .describe('Beat detection sensitivity (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Minimum audio value to trigger shake (0-1)'),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('mid')
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
  const shakeIntensity = params.shakeIntensity ?? 20;
  const shakeAxis = params.shakeAxis ?? 'both';
  const sensitivity = params.sensitivity ?? 2;
  const threshold = params.threshold ?? 0.15;
  const audioProperty = params.audioProperty ?? 'mid';
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Determine media source
  const mediaSrc = params.videoUrl || params.imageUrl;
  if (!mediaSrc) {
    throw new Error('Either videoUrl or imageUrl must be provided');
  }

  const isVideo = Boolean(params.videoUrl);
  const mediaId = 'beat-shake-media';

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
        id: 'beat-shake-effect',
        componentId: 'waveform',
        data: {
          audioSrc: audioUrl,
          audioProperty,
          effectType: 'shake',
          intensity: shakeIntensity,
          shakeAxis,
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
    id: 'beat-shake-layout',
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

const beatShakePresetMetadata: PresetMetadata = {
  id: 'beat-shake',
  title: 'Beat Shake',
  description:
    'Shake effect that reacts to audio beats using waveform analysis. Creates dynamic, energetic visuals synchronized with music.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'beat', 'shake', 'waveform', 'music', 'dynamic', 'energetic'],
  defaultInputParams: {
    audioUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/sample-audio.mp3',
    videoUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/sample-video.mp4',
    shakeIntensity: 20,
    shakeAxis: 'both',
    sensitivity: 2,
    threshold: 0.15,
    audioProperty: 'mid',
    smoothNormalisation: 1,
    duration: 20,
  },
};

const beatShakePresetFunction = presetExecution.toString();
const beatShakePresetParams = z.toJSONSchema(presetParams);

export const beatShakePreset = {
  metadata: beatShakePresetMetadata,
  presetFunction: beatShakePresetFunction,
  presetParams: beatShakePresetParams,
};
