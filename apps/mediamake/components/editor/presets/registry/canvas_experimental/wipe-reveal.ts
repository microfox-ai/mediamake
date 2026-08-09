import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

/**
 * Wipe Reveal — migrated to the canvas pipeline architecture.
 *
 * Was: `effect-CanvasWipeReveal`, a monolithic component that loaded its own
 * image and could only ever reveal that image.
 * Now: `clip:reveal` (the generic reveal geometry) wrapping `draw:image`, so
 * the same edge styles work over anything the pipeline can draw.
 *
 * Gains over the old version: optional vignette/grain finish, a hold-then-
 * reveal delay, ember sparks on burn edges, and reveal progress driven by op
 * timing in seconds instead of a hardcoded frame count.
 */

const presetParams = z.object({
  trackId: z.string().default('wipe-reveal').describe('Unique ID for this track.'),
  imageUrl: z.string().url().describe('URL of the image to reveal.'),
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
  revealDuration: z.number().min(0).default(2).describe('Reveal animation duration.'),
  easing: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out'])
    .default('ease-in-out')
    .describe('Reveal easing.'),
  revealType: z.enum(['wipe', 'radial']).default('wipe').describe('Type of reveal.'),
  edgeStyle: z.enum(['straight', 'organic', 'burn']).default('straight').describe('Edge style.'),
  wipeAngle: z.number().default(0).describe('Angle for wipe (0=left-to-right).'),
  edgeWaviness: z.number().default(30).optional(),
  edgeFrequency: z.number().default(4).optional(),
  invert: z
    .boolean()
    .default(false)
    .describe('Hide the image instead of revealing it.'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  burnGlow: z.boolean().default(true).optional(),
  burnGlowColor: z.string().default('#ff6600').optional(),
  burnGlowIntensity: z.number().default(1).optional(),
  embers: z
    .number()
    .min(0)
    .default(0)
    .describe('Ember sparks during a burn reveal (0 disables).'),
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
    revealType,
    edgeStyle,
    wipeAngle,
    edgeWaviness,
    edgeFrequency,
    invert,
    backgroundColor,
    fit,
    burnGlow,
    burnGlowColor,
    burnGlowIntensity,
    embers,
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

  const pipeline: any[] = [
    {
      op: 'clip:reveal',
      timing: { start: revealDelay, duration: revealDuration, easing },
      params: {
        revealType,
        edgeStyle,
        angle: wipeAngle,
        invert,
        ...(edgeWaviness !== undefined && { edgeWaviness }),
        ...(edgeFrequency !== undefined && { edgeFrequency }),
        ...(burnGlow !== undefined && { glow: burnGlow }),
        ...(burnGlowColor !== undefined && { glowColor: burnGlowColor }),
        ...(burnGlowIntensity !== undefined && { glowIntensity: burnGlowIntensity }),
      },
      children: [{ op: 'draw:image', params: { source: 'hero', fit } }],
    },
  ];

  if (embers > 0 && edgeStyle === 'burn') {
    pipeline.push({
      op: 'embers',
      timing: { start: revealDelay, duration: revealDuration * 1.4 },
      params: {
        count: embers,
        color: burnGlowColor ?? '#ff6600',
        size: 3,
        rise: 110,
        lifetime: 1.2,
        area: 'full',
      },
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.25 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    });
  }
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
  id: 'wipe-reveal',
  title: 'Wipe Reveal',
  description: 'Classic wipe or radial reveal with organic/burn edge effects',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'reveal', 'wipe', 'radial', 'burn', 'organic', 'canvas'],
  defaultInputParams: {
    trackId: 'wipe-reveal-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    rangeString: '00:00-00:05',
    revealDelay: 0,
    revealDuration: 2,
    easing: 'ease-in-out',
    revealType: 'wipe',
    edgeStyle: 'burn',
    edgeWaviness: 30,
    edgeFrequency: 4,
    wipeAngle: 45,
    invert: false,
    backgroundColor: 'black',
    fit: 'cover',
    burnGlow: true,
    burnGlowColor: '#ff6600',
    burnGlowIntensity: 5,
    embers: 18,
    vignette: false,
    grain: false,
  },
};

export const wipeRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
