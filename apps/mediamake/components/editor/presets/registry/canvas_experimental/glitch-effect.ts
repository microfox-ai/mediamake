import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

/**
 * Glitch Effect — migrated to the canvas pipeline architecture.
 *
 * Was: `effect-CanvasGlitchEffect`, which allocated three full-size ImageData
 * buffers per frame and used unseeded randomness (glitches differed between
 * render workers).
 * Now: the `glitch` op — composite-based, deterministic per burst, and it
 * distorts whatever its child ops draw rather than a hardcoded image.
 *
 * Gains: glitch types now stack (`rgb-shift` + `scan` together), the effect
 * can wrap any content, and timing is in seconds.
 */

const presetParams = z.object({
  trackId: z.string().default('glitch-effect').describe('Unique ID.'),
  imageUrl: z.string().url().describe('URL of the image.'),
  rangeString: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe('Range in MM:SS-MM:SS format like 00:00-00:10'),
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
  glitchTypes: z
    .array(z.enum(['rgb-shift', 'slice', 'corrupt', 'static', 'scan']))
    .default(['rgb-shift'])
    .describe('Glitch types to layer together.'),
  intensity: z.number().default(10).describe('Glitch intensity.'),
  frequency: z.number().default(0.3).describe('Glitch frequency (0-1).'),
  continuous: z.boolean().default(false).describe('Continuous vs periodic glitch.'),
  holdFrames: z
    .number()
    .min(1)
    .default(3)
    .describe('How many frames each glitch burst holds.'),
  glitchStartTime: z
    .number()
    .default(0)
    .describe('When to start glitching (seconds from start).'),
  glitchEndTime: z
    .number()
    .default(-1)
    .describe('When to end glitching (seconds, -1 = full duration).'),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  fit: z.enum(['cover', 'contain', 'fill']).default('cover'),
  scanlines: z.boolean().default(false).describe('CRT scanline overlay.'),
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
    glitchTypes,
    intensity,
    frequency,
    continuous,
    holdFrames,
    glitchStartTime,
    glitchEndTime,
    backgroundColor,
    fit,
    scanlines,
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

  // 'corrupt' was the old name for displaced blocks.
  const types = (glitchTypes?.length ? glitchTypes : ['rgb-shift']).map((t) =>
    t === 'corrupt' ? 'blocks' : t,
  );

  const glitchWindowStart = glitchStartTime;
  const glitchWindowDuration =
    glitchEndTime === -1 ? duration - glitchStartTime : glitchEndTime - glitchStartTime;

  const pipeline: any[] = [
    // Base image, always visible; the glitch layer sits on top so the picture
    // never disappears between bursts.
    { op: 'draw:image', params: { source: 'hero', fit } },
    {
      op: 'glitch',
      timing: {
        start: glitchWindowStart,
        duration: Math.max(0.1, glitchWindowDuration),
      },
      params: { types, intensity, frequency, continuous, holdFrames },
      children: [{ op: 'draw:image', params: { source: 'hero', fit } }],
    },
  ];

  if (scanlines) {
    pipeline.push({
      op: 'post:scanlines',
      params: { spacing: 4, thickness: 1, color: 'rgba(0,0,0,0.28)' },
    });
  }
  if (vignette) {
    pipeline.push({ op: 'post:vignette', params: { strength: 0.45, radius: 0.6 } });
  }
  if (grain) {
    pipeline.push({ op: 'post:grain', params: { opacity: 0.07 } });
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
  id: 'glitch-effect',
  title: 'Glitch Effect',
  description: 'Various glitch effects (RGB shift, corruption, static, etc)',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'glitch', 'distortion', 'rgb', 'corruption', 'vhs', 'canvas'],
  defaultInputParams: {
    trackId: 'glitch-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    rangeString: '00:00-00:10',
    glitchTypes: ['rgb-shift', 'slice'],
    intensity: 50,
    frequency: 0.7,
    continuous: false,
    holdFrames: 3,
    glitchStartTime: 0,
    glitchEndTime: -1,
    backgroundColor: 'black',
    fit: 'cover',
    scanlines: false,
    vignette: false,
    grain: false,
  },
};

export const glitchEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
