import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  trackId: z.string().default('content-aware-reveal').describe('Unique ID.'),
  imageUrl: z.string().url().describe('URL of the image.'),
  start: z.number().min(0).default(0).describe('Start time in seconds.'),
  duration: z.number().min(0).default(5).describe('Total duration.'),
  revealDuration: z.number().min(0).default(3).describe('Reveal animation duration.'),
  burnColorOrder: z.enum(['vibgyor', 'luminance', 'random']).default('vibgyor'),
  zigzagReveal: z.boolean().default(false).describe('Use zigzag pattern.'),
  zigzagDirection: z.enum(['horizontal', 'vertical', 'diagonal-down', 'diagonal-up']).default('horizontal').optional(),
  zigzagLayers: z.number().default(10).optional(),
  combineWithZigzag: z.boolean().default(false).optional(),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  fit: z.enum(['cover', 'contain']).default('cover'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: { config: InputCompositionProps['config'] }
): Promise<Partial<PresetOutput>> => {
  const { trackId, imageUrl, start, duration, revealDuration, burnColorOrder,
    zigzagReveal, zigzagDirection, zigzagLayers, combineWithZigzag,
    backgroundColor, fit } = params;
  const { fps } = props.config ?? { fps: 30 };

  const component = {
    id: trackId,
    componentId: 'effect-CanvasContentAwareReveal',
    type: 'layout' as const,
    data: {
      imageUrl,
      fit,
      backgroundColor,
      burnColorOrder,
      zigzagReveal,
      revealDurationInFrames: Math.round(revealDuration * (fps ?? 30)),
      ...(zigzagDirection !== undefined && { zigzagDirection }),
      ...(zigzagLayers !== undefined && { zigzagLayers }),
      ...(combineWithZigzag !== undefined && { combineWithZigzag }),
    },
    context: {
      timing: { start, duration },
    },
  };

  return {
    output: {
      childrenData: [{
        id: trackId,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: { className: 'absolute inset-0' },
          repeatChildrenProps: { className: 'absolute inset-0' },
        },
        childrenData: [component],
      }],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'content-aware-reveal',
  title: 'Content-Aware Reveal',
  description: "Reveal image based on color analysis (VIBGYOR, luminance, etc)",
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'reveal', 'color', 'vibgyor', 'zigzag', 'smart'],
  defaultInputParams: {
    trackId: 'content-aware-1',
    imageUrl: 'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    start: 0,
    duration: 5,
    revealDuration: 3,
    burnColorOrder: 'vibgyor',
    zigzagReveal: true,
    zigzagDirection: 'vertical',
    zigzagLayers: 20,
    combineWithZigzag: true,
    backgroundColor: 'white',
    fit: 'cover',
  },
};

export const contentAwarePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
