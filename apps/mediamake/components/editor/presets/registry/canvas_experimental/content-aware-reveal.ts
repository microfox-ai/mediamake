import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

/**
 * Content-Aware Reveal — migrated to the canvas pipeline architecture.
 *
 * Was: `effect-CanvasContentAwareReveal`, which rebuilt a full-image pixel
 * buffer on every frame.
 * Now: the `mask:content-aware` op — burn map and buffers are computed once
 * during init (behind delayRender) and only the alpha channel is rewritten
 * per frame, into reused memory.
 *
 * Gains: composable with other ops (embers/vignette/grain), a hold-then-
 * reveal delay, adjustable edge softness, and seconds-based timing.
 */

const presetParams = z.object({
  trackId: z.string().default('content-aware-reveal').describe('Unique ID.'),
  imageUrl: z.string().url().describe('URL of the image.'),
  rangeString: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe('Range in MM:SS-MM:SS format like 00:00-00:05'),
  start: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time in seconds (used when rangeString is not set).'),
  duration: z
    .number()
    .min(0)
    .default(5)
    .describe('Duration in seconds (used when rangeString is not set).'),
  revealDelay: z
    .number()
    .min(0)
    .default(0)
    .describe('Hold before the reveal begins, in seconds.'),
  revealDuration: z.number().min(0).default(3).describe('Reveal animation duration.'),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('linear')
    .describe('Reveal easing.'),
  burnColorOrder: z
    .enum(['vibgyor', 'luminance', 'random'])
    .default('vibgyor')
    .describe('Color analysis method.'),
  revealMode: z
    .enum(['color', 'direction', 'combined'])
    .default('combined')
    .describe('Reveal mode: color-only, direction-only, or combined.'),
  direction: z
    .enum(['horizontal', 'vertical', 'diagonal-down', 'diagonal-up', 'top-to-bottom'])
    .default('top-to-bottom')
    .describe(
      'Direction of reveal. horizontal/vertical snake back and forth in bands.',
    ),
  directionLayers: z
    .number()
    .default(10)
    .describe('Number of bands for horizontal/vertical patterns.'),
  softness: z
    .number()
    .min(0.005)
    .max(0.5)
    .default(0.06)
    .describe('Width of the dissolve edge. Lower = sharper front.'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  vignette: z.boolean().default(false),
  grain: z.boolean().default(false),
  seed: z.number().optional().describe('Deterministic seed override.'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: { config: InputCompositionProps['config'] },
): Promise<Partial<PresetOutput>> => {
  const {
    trackId,
    imageUrl,
    rangeString,
    revealDelay,
    revealDuration,
    easing,
    burnColorOrder,
    revealMode,
    direction,
    directionLayers,
    softness,
    backgroundColor,
    fit,
    vignette,
    grain,
    seed,
  } = params;

  const parseRangeString = (
    range: string | undefined,
  ): { start: number; duration: number } | null => {
    if (!range) return null;
    const match = range.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const s = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const e = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
    if (e <= s) return null;
    return { start: s, duration: e - s };
  };

  const range = parseRangeString(rangeString);
  const start = range ? range.start : params.start;
  const duration = range ? range.duration : params.duration;

  // Old preset semantics: 'horizontal'/'vertical' swept in alternating bands,
  // 'top-to-bottom' was a single straight pass.
  const serpentine = direction === 'horizontal' || direction === 'vertical';
  const opDirection =
    revealMode === 'color'
      ? 'none'
      : direction === 'top-to-bottom'
        ? 'vertical'
        : direction;
  const directionWeight =
    revealMode === 'direction' ? 1 : revealMode === 'color' ? 0 : 0.4;

  const pipeline: any[] = [
    {
      op: 'mask:content-aware',
      timing: { start: revealDelay, duration: revealDuration, easing },
      params: {
        source: 'hero',
        fit,
        order: burnColorOrder,
        direction: opDirection,
        directionWeight,
        serpentine,
        layers: directionLayers,
        softness,
      },
    },
  ];

  if (vignette) {
    pipeline.push({ op: 'post:vignette', params: { strength: 0.45, radius: 0.6 } });
  }
  if (grain) {
    pipeline.push({ op: 'post:grain', params: { opacity: 0.06 } });
  }

  const component = {
    id: `${trackId}-canvas`,
    componentId: 'CanvasPipeline',
    type: 'atom' as const,
    data: {
      sources: { hero: { type: 'image', src: imageUrl } },
      pipeline,
      ...(backgroundColor &&
        backgroundColor !== 'rgba(0,0,0,0)' && { background: backgroundColor }),
      ...(seed !== undefined && { seed }),
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
          context: { timing: { start, duration } },
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
  id: 'content-aware-reveal',
  title: 'Content-Aware Reveal',
  description: 'Reveal image based on color analysis (VIBGYOR, luminance, etc)',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'reveal', 'color', 'vibgyor', 'zigzag', 'smart', 'canvas'],
  defaultInputParams: {
    trackId: 'content-aware-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    rangeString: '00:00-00:05',
    revealDelay: 0,
    revealDuration: 3,
    easing: 'linear',
    burnColorOrder: 'vibgyor',
    revealMode: 'combined',
    direction: 'top-to-bottom',
    directionLayers: 20,
    softness: 0.06,
    backgroundColor: 'white',
    fit: 'cover',
    vignette: false,
    grain: false,
  },
};

export const contentAwarePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
