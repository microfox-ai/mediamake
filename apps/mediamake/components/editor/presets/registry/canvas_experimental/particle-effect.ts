import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  trackId: z.string().default('particle-effect').describe('Unique ID.'),
  imageUrl: z.string().url().describe('URL of the image.'),
  start: z.number().min(0).default(0).describe('Start time in seconds.'),
  duration: z.number().min(0).default(5).describe('Total duration.'),
  revealDuration: z.number().min(0).default(2).describe('Animation duration.'),
  particleCount: z.number().default(2000).describe('Number of particles.'),
  particleSize: z.number().default(3).describe('Size of particles.'),
  particleEffect: z
    .enum(['assemble', 'disassemble', 'explode', 'pixelate'])
    .default('assemble'),
  assembleFrom: z
    .enum(['center', 'edges', 'random', 'bottom'])
    .default('random'),
  speed: z.number().default(1).describe('Speed multiplier.'),
  rotation: z.boolean().default(false).describe('Add particle rotation.'),
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
    revealDuration,
    particleCount,
    particleSize,
    particleEffect,
    assembleFrom,
    speed,
    rotation,
    backgroundColor,
    fit,
  } = params;
  const { fps } = props.config ?? { fps: 30 };

  const component = {
    id: trackId,
    componentId: 'effect-CanvasParticleEffect',
    type: 'layout' as const,
    data: {
      imageUrl,
      fit,
      backgroundColor,
      particleCount,
      particleSize,
      particleEffect,
      assembleFrom,
      speed,
      rotation,
      revealDurationInFrames: Math.round(revealDuration * (fps ?? 30)),
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
  id: 'particle-effect',
  title: 'Particle Effect',
  description: 'Particle-based image animations (assemble, explode, etc)',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'particles', 'assemble', 'explode', 'animation'],
  defaultInputParams: {
    trackId: 'particle-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    start: 0,
    duration: 5,
    revealDuration: 2,
    particleCount: 2000,
    particleSize: 3,
    particleEffect: 'assemble',
    assembleFrom: 'random',
    speed: 1,
    rotation: false,
    backgroundColor: 'black',
    fit: 'cover',
  },
};

export const particleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
