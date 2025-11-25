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
    .describe('Video URL to apply exposure effect to'),
  imageUrl: z
    .string()
    .optional()
    .describe('Image URL to apply exposure effect to'),
  brightnessIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .optional()
    .describe('Brightness intensity multiplier (0.1-2)'),
  baseBrightness: z
    .number()
    .min(0.5)
    .max(1.5)
    .default(1)
    .optional()
    .describe('Base brightness value (0.5-1.5)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .default(1.8)
    .optional()
    .describe('Beat detection sensitivity (0.1-5)'),
  threshold: z
    .number()
    .min(0)
    .max(1)
    .default(0.18)
    .optional()
    .describe('Minimum audio value to trigger exposure change (0-1)'),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .default('treble')
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
  const brightnessIntensity = params.brightnessIntensity ?? 0.5;
  const baseBrightness = params.baseBrightness ?? 1;
  const sensitivity = params.sensitivity ?? 1.8;
  const threshold = params.threshold ?? 0.18;
  const audioProperty = params.audioProperty ?? 'treble';
  const smoothNormalisation = params.smoothNormalisation ?? 1;

  // Determine media source
  const mediaSrc = params.videoUrl || params.imageUrl;
  if (!mediaSrc) {
    throw new Error('Either videoUrl or imageUrl must be provided');
  }

  const isVideo = Boolean(params.videoUrl);
  const mediaId = 'beat-exposure-media';

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
        id: 'beat-exposure-effect',
        componentId: 'waveform',
        data: {
          audioSrc: audioUrl,
          audioProperty,
          effectType: 'exposure',
          intensity: brightnessIntensity,
          baseBrightness,
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
    id: 'beat-exposure-layout',
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

const beatExposurePresetMetadata: PresetMetadata = {
  id: 'beat-exposure',
  title: 'Beat Exposure',
  description:
    'Exposure/brightness effect that reacts to audio beats using waveform analysis. Creates dramatic lighting effects synchronized with music.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'beat',
    'exposure',
    'brightness',
    'waveform',
    'music',
    'lighting',
  ],
  defaultInputParams: {
    audioUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/sample-audio.mp3',
    videoUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/sample-video.mp4',
    brightnessIntensity: 0.5,
    baseBrightness: 1,
    sensitivity: 1.8,
    threshold: 0.18,
    audioProperty: 'treble',
    smoothNormalisation: 1,
    duration: 20,
  },
};

const beatExposurePresetFunction = presetExecution.toString();
const beatExposurePresetParams = z.toJSONSchema(presetParams);

export const beatExposurePreset = {
  metadata: beatExposurePresetMetadata,
  presetFunction: beatExposurePresetFunction,
  presetParams: beatExposurePresetParams,
};
