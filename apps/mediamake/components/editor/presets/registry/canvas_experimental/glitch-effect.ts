import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  trackId: z.string().default('glitch-effect').describe('Unique ID.'),
  imageUrl: z.string().url().describe('URL of the image.'),
  start: z.number().min(0).default(0).describe('Start time in seconds.'),
  duration: z.number().min(0).default(5).describe('Total duration.'),
  glitchType: z
    .enum(['rgb-shift', 'slice', 'corrupt', 'static', 'scan'])
    .default('rgb-shift'),
  intensity: z.number().default(10).describe('Glitch intensity.'),
  frequency: z.number().default(0.3).describe('Glitch frequency (0-1).'),
  continuous: z
    .boolean()
    .default(false)
    .describe('Continuous vs periodic glitch.'),
  glitchStartTime: z
    .number()
    .default(0)
    .describe('When to start glitching (seconds from start).'),
  glitchEndTime: z
    .number()
    .default(-1)
    .describe('When to end glitching (seconds, -1 = full duration).'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  fit: z.enum(['cover', 'contain']).default('cover'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: { config: InputCompositionProps['config'] },
): Promise<Partial<PresetOutput>> => {
  const {
    trackId,
    imageUrl,
    start,
    duration,
    glitchType,
    intensity,
    frequency,
    continuous,
    glitchStartTime,
    glitchEndTime,
    backgroundColor,
    fit,
  } = params;
  const { fps } = props.config ?? { fps: 30 };

  const component = {
    id: trackId,
    componentId: 'effect-CanvasGlitchEffect',
    type: 'layout' as const,
    data: {
      imageUrl,
      fit,
      backgroundColor,
      glitchType,
      intensity,
      frequency,
      continuous,
      glitchStartFrame: Math.round(glitchStartTime * (fps ?? 30)),
      glitchEndFrame:
        glitchEndTime === -1 ? -1 : Math.round(glitchEndTime * (fps ?? 30)),
      durationInFrames: Math.round(duration * (fps ?? 30)),
    },
    context: {
      timing: { start, duration },
    },
  };

  return {
    output: {
      childrenData: [
        {
          id: trackId,
          componentId: 'BaseLayout',
          type: 'layout' as const,
          data: {
            containerProps: { className: 'absolute inset-0' },
            repeatChildrenProps: { className: 'absolute inset-0' },
          },
          childrenData: [component],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'glitch-effect',
  title: 'Glitch Effect',
  description: 'Various glitch effects (RGB shift, corruption, static, etc)',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'glitch', 'distortion', 'rgb', 'corruption', 'vhs'],
  defaultInputParams: {
    trackId: 'glitch-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    start: 0,
    duration: 10,
    glitchType: 'rgb-shift',
    intensity: 50,
    frequency: 0.7,
    continuous: false,
    glitchStartTime: 0,
    glitchEndTime: -1, // -1 for full duration
    backgroundColor: 'black',
    fit: 'cover',
  },
};

export const glitchEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
