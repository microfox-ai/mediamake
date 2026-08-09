import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

/**
 * Particle Effect — migrated to the canvas pipeline architecture.
 *
 * Was: `effect-CanvasParticleEffect`, image-only, single hardcoded phase, and
 * unseeded (particles jumped between render-worker chunks in exports).
 * Now: the `particles` op, which morphs a cloud through a list of formations.
 * Each legacy mode becomes a formation sequence:
 *   assemble    scatter -> image
 *   disassemble image   -> scatter
 *   explode     image   -> explode scatter
 *   pixelate    image, with particle size animated large -> small
 *
 * Gains: even (non-clumping) pixel sampling, curved swirl paths, motion
 * trails, single-pass glow, deterministic output, and the ability to add
 * further formations (e.g. text) without new code.
 */

const presetParams = z.object({
  trackId: z.string().default('particle-effect').describe('Unique ID.'),
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
  revealDuration: z.number().min(0).default(2).describe('Animation duration.'),
  particleCount: z.number().default(2000).describe('Number of particles.'),
  particleSize: z.number().default(3).describe('Size of particles.'),
  particleShape: z
    .enum(['square', 'circle'])
    .default('square')
    .describe('Particle shape.'),
  particleSpread: z
    .number()
    .min(0)
    .max(1.5)
    .default(0.35)
    .describe('Organic scatter around each sampled point.'),
  particleEffect: z
    .enum(['assemble', 'disassemble', 'explode', 'pixelate'])
    .default('assemble'),
  assembleFrom: z.enum(['center', 'edges', 'random', 'bottom']).default('random'),
  speed: z.number().default(1).describe('Speed multiplier.'),
  swirl: z
    .number()
    .min(0)
    .max(2)
    .default(0.35)
    .describe('Curved-path strength while particles travel.'),
  trail: z.number().min(0).max(1).default(0).describe('Motion trail strength.'),
  glow: z.number().default(0).describe('Glow radius (0 disables).'),
  hold: z
    .number()
    .min(0)
    .max(0.9)
    .default(0.2)
    .describe('Rest time at each formation.'),
  resolveToImage: z
    .boolean()
    .default(true)
    .describe(
      'Cross-fade the crisp image in when assembling (and out when disassembling) so the clip does not end on sparse dots.',
    ),
  backgroundColor: z.string().default('rgba(0,0,0,0)'),
  fit: z.enum(['cover', 'contain']).default('cover'),
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
    revealDuration,
    particleCount,
    particleSize,
    particleShape,
    particleSpread,
    particleEffect,
    assembleFrom,
    speed,
    swirl,
    trail,
    glow,
    hold,
    resolveToImage,
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

  const imageFormation = {
    type: 'image',
    source: 'hero',
    fit,
    scale: 1,
  };

  // Each legacy mode is a formation sequence over the same particle cloud.
  let formations: any[];
  let sizeRanges: any[] | undefined;
  switch (particleEffect) {
    case 'disassemble':
      formations = [imageFormation, { type: 'scatter', pattern: assembleFrom }];
      break;
    case 'explode':
      formations = [imageFormation, { type: 'scatter', pattern: 'explode' }];
      break;
    case 'pixelate':
      // Particles stay put; the "pixels" shrink from chunky to fine.
      formations = [imageFormation];
      sizeRanges = [
        { key: 'size', val: particleSize * 4, prog: 0 },
        { key: 'size', val: particleSize, prog: 1 },
      ];
      break;
    default:
      formations = [{ type: 'scatter', pattern: assembleFrom }, imageFormation];
  }

  const particlePhase = Math.max(0.1, revealDuration / (speed || 1));
  const fade = Math.min(0.5, particlePhase * 0.35);
  const endsOnImage =
    resolveToImage && (particleEffect === 'assemble' || particleEffect === 'pixelate');
  const startsOnImage =
    resolveToImage && (particleEffect === 'disassemble' || particleEffect === 'explode');

  const pipeline: any[] = [];

  // Leaving the image: hold the crisp picture, then hand off to the particles.
  if (startsOnImage) {
    pipeline.push({
      op: 'draw:image',
      timing: { start: 0, duration: fade },
      params: { source: 'hero', fit },
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    });
  }

  pipeline.push({
    op: 'particles',
    timing: { start: 0, duration: particlePhase, easing: 'ease-out' },
    params: {
      formations,
      count: particleCount,
      size: particleSize,
      shape: particleShape,
      spread: particleSpread,
      hold,
      stagger: 0.25,
      swirl,
      trail,
      glow,
      glowOpacity: 0.5,
    },
    ...(sizeRanges && { ranges: sizeRanges }),
  });

  // Arriving at the image: particles are discrete dots and never fully cover
  // the picture, so cross-fade the real image in as they land (the legacy
  // effect hard-swapped to the full image at the end — this is the smooth
  // version of that).
  if (endsOnImage) {
    pipeline.push({
      op: 'draw:image',
      timing: { start: Math.max(0, particlePhase - fade), duration: fade },
      params: { source: 'hero', fit },
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
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
  id: 'particle-effect',
  title: 'Particle Effect',
  description: 'Particle-based image animations (assemble, explode, pixelate)',
  type: 'predefined',
  presetType: 'children',
  tags: ['image', 'particles', 'assemble', 'explode', 'pixelate', 'canvas'],
  defaultInputParams: {
    trackId: 'particle-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    rangeString: '00:00-00:05',
    revealDuration: 2,
    particleCount: 2500,
    particleSize: 3,
    particleShape: 'square',
    particleSpread: 0.35,
    particleEffect: 'assemble',
    assembleFrom: 'random',
    speed: 1,
    swirl: 0.35,
    trail: 0,
    glow: 0,
    hold: 0.2,
    resolveToImage: true,
    backgroundColor: 'black',
    fit: 'cover',
    vignette: false,
    grain: false,
  },
};

export const particleEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
