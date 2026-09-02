import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  trackId: z
    .string()
    .default('wipe-reveal')
    .describe('Unique ID for this track.'),
  imageUrl: z.string().url().describe('URL of the image to reveal.'),
  start: z.number().min(0).default(0).describe('Start time in seconds.'),
  duration: z.number().min(0).default(5).describe('Total duration.'),
  revealDuration: z
    .number()
    .min(0)
    .default(2)
    .describe('Reveal animation duration.'),
  revealType: z
    .enum(['wipe', 'radial'])
    .default('wipe')
    .describe('Type of reveal.'),
  edgeStyle: z
    .enum(['straight', 'organic', 'burn'])
    .default('straight')
    .describe('Edge style.'),
  wipeAngle: z
    .number()
    .default(0)
    .describe('Angle for wipe (0=left-to-right).'),
  edgeWaviness: z.number().default(30).optional(),
  edgeFrequency: z.number().default(4).optional(),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  fit: z.enum(['cover', 'contain']).default('cover'),
  burnGlow: z.boolean().default(true).optional(),
  burnGlowColor: z.string().default('#ff6600').optional(),
  burnGlowIntensity: z.number().default(1).optional(),
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
    revealType,
    edgeStyle,
    wipeAngle,
    edgeWaviness,
    edgeFrequency,
    backgroundColor,
    fit,
    burnGlow,
    burnGlowColor,
    burnGlowIntensity,
  } = params;
  const { fps } = props.config ?? { fps: 30 };

  const component = {
    id: trackId,
    componentId: 'effect-CanvasWipeReveal',
    type: 'layout' as const,
    data: {
      imageUrl,
      fit,
      backgroundColor,
      revealType,
      edgeStyle,
      angle: wipeAngle,
      revealDurationInFrames: Math.round(revealDuration * (fps ?? 30)),
      ...(edgeWaviness !== undefined && { edgeWaviness }),
      ...(edgeFrequency !== undefined && { edgeFrequency }),
      ...(burnGlow !== undefined && { burnGlow }),
      ...(burnGlowColor !== undefined && { burnGlowColor }),
      ...(burnGlowIntensity !== undefined && { burnGlowIntensity }),
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
  id: 'wipe-reveal',
  title: 'Wipe Reveal',
  description: 'Classic wipe or radial reveal with organic/burn edge effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'reveal', 'wipe', 'radial', 'burn', 'organic'],
  defaultInputParams: {
    trackId: 'wipe-reveal-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    start: 0,
    duration: 5,
    revealDuration: 2,
    revealType: 'wipe',
    edgeStyle: 'burn',
    edgeWaviness: 30,
    edgeFrequency: 4,
    wipeAngle: 45,
    backgroundColor: 'black',
    fit: 'cover',
    burnGlow: true,
    burnGlowColor: '#ff6600',
    burnGlowIntensity: 5,
  },
};

export const wipeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
