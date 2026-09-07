import { InputCompositionProps } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';
import { paramMetaTypes } from '../../dataTypes';

/**
 * Particle Morph Reveal — showcase of the canvas pipeline system.
 *
 * A slow cinematic push-in over four beats:
 *  1. Particles swirl in from outside the frame along curved paths and
 *     assemble into the headline (single-pass glow, motion trails).
 *  2. The headline holds with a gentle shimmer, then flows into the image —
 *     every particle gliding to a pixel and taking its color.
 *  3. The crisp image burns in through the particle version with a glowing
 *     organic burn edge while embers float up.
 *  4. Vignette + film grain finish the frame.
 *
 * Not expressible with Image/Video atoms + CSS effects: needs pixel sampling
 * of text AND image, a particle system, arbitrary clip geometry and canvas
 * compositing — all composed from registered canvas ops as plain JSON.
 */

const presetParams = z.object({
  trackId: z.string().default('particle-morph').describe('Unique track ID.'),
  imageUrl: z.string().url().describe('Image the particles morph into.'),
  headline: z
    .string()
    .default('MEDIAMAKE')
    .describe('Text the particles form first.'),
  rangeString: z
    .string()
    .optional()
    .meta({ [paramMetaTypes.rangeField]: true })
    .describe('Range in MM:SS-MM:SS format like 00:00-00:08'),
  start: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time in seconds (used when rangeString is not set).'),
  duration: z
    .number()
    .min(1)
    .default(8)
    .describe('Duration in seconds (used when rangeString is not set).'),
  fontFamily: z.string().default('Impact, sans-serif'),
  fontSize: z.number().default(170),
  particleCount: z
    .number()
    .min(200)
    .max(12000)
    .default(4000)
    .describe('Higher counts make the headline more readable.'),
  particleSize: z.number().default(4),
  particleSpread: z
    .number()
    .min(0)
    .max(1.5)
    .default(0.35)
    .describe('Organic scatter around each sampled point. 0 = crisp lattice.'),
  swirl: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Curved-path strength while particles travel.'),
  scatterFrom: z
    .enum(['random', 'center', 'edges', 'bottom', 'top', 'explode'])
    .default('explode')
    .describe('Where particles fly in from.'),
  textColor: z.string().default('#ffffff').describe('Headline particle color.'),
  glow: z.number().default(6).describe('Particle glow radius (0 disables). Large values wash out text.'),
  trail: z.number().min(0).max(1).default(0.35).describe('Motion trail strength.'),
  accentColor: z
    .string()
    .default('#ff7a1a')
    .describe('Burn edge and ember color.'),
  burnIntensity: z.number().default(2.5),
  emberCount: z.number().default(24),
  backgroundColor: z.string().default('#05060f'),
  zoom: z.boolean().default(true).describe('Slow cinematic push-in.'),
  vignette: z.boolean().default(true),
  grain: z.boolean().default(true),
  seed: z.number().optional().describe('Deterministic seed override.'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: { config: InputCompositionProps['config'] },
): Promise<Partial<PresetOutput>> => {
  const {
    trackId,
    imageUrl,
    headline,
    rangeString,
    fontFamily,
    fontSize,
    particleCount,
    particleSize,
    particleSpread,
    swirl,
    scatterFrom,
    textColor,
    glow,
    trail,
    accentColor,
    burnIntensity,
    emberCount,
    backgroundColor,
    zoom,
    vignette,
    grain,
    seed,
  } = params;

  // Parse range string (MM:SS-MM:SS) into start/duration seconds.
  // Priority: rangeString > start/duration params.
  const parseRangeString = (
    range: string | undefined,
  ): { start: number; duration: number } | null => {
    if (!range) return null;
    const match = range.match(/(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const start = parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    const end = parseInt(match[3], 10) * 60 + parseInt(match[4], 10);
    if (end <= start) return null;
    return { start, duration: end - start };
  };

  const range = parseRangeString(rangeString);
  const start = range ? range.start : params.start;
  const duration = range ? range.duration : params.duration;

  // The scene content (particles + burn reveal) sits inside a `group` so the
  // whole thing gets a slow push-in; backdrop and film treatments stay fixed.
  const sceneChildren: any[] = [
    {
      op: 'particles',
      timing: { start: 0, duration: '76%', easing: 'linear' },
      params: {
        formations: [
          { type: 'scatter', pattern: scatterFrom },
          {
            type: 'text',
            text: headline,
            fontFamily,
            fontSize,
            fontWeight: 'bold',
            color: textColor,
          },
          { type: 'image', source: 'hero', fit: 'cover', scale: 1 },
        ],
        count: particleCount,
        size: particleSize,
        shape: 'circle',
        spread: particleSpread,
        // Longer rest so the headline is on screen and readable, not just
        // passed through on the way to the image.
        hold: 0.42,
        stagger: 0.28,
        swirl,
        // Shimmer only while travelling — at rest the letters stay sharp.
        jitter: 1.2,
        glow,
        glowOpacity: 0.45,
        trail,
      },
      // Fade the particle layer down once the crisp image has burned in.
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.92 },
        { key: 'opacity', val: 0.15, prog: 1 },
      ],
    },
    {
      op: 'clip:reveal',
      timing: { start: '58%', duration: '34%', easing: 'ease-in-out' },
      params: {
        revealType: 'radial',
        edgeStyle: 'burn',
        edgeWaviness: 45,
        glow: true,
        glowColor: accentColor,
        glowIntensity: burnIntensity,
      },
      children: [{ op: 'draw:image', params: { source: 'hero', fit: 'cover' } }],
    },
    {
      op: 'embers',
      timing: { start: '55%', duration: '45%' },
      params: {
        count: emberCount,
        color: accentColor,
        size: 3,
        rise: 140,
        lifetime: 1.4,
        area: 'full',
      },
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.25 },
        { key: 'opacity', val: 1, prog: 0.75 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  ];

  const pipeline: any[] = [
    {
      op: 'draw:gradient',
      params: {
        kind: 'radial',
        stops: [
          { offset: 0, color: backgroundColor },
          { offset: 1, color: '#000000' },
        ],
      },
    },
    zoom
      ? {
          op: 'group',
          timing: { start: 0, duration: '100%', easing: 'ease-in-out' },
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.06, prog: 1 },
          ],
          children: sceneChildren,
        }
      : { op: 'group', children: sceneChildren },
  ];

  if (vignette) {
    pipeline.push({
      op: 'post:vignette',
      params: { strength: 0.5, radius: 0.55 },
    });
  }
  if (grain) {
    pipeline.push({ op: 'post:grain', params: { opacity: 0.06 } });
  }

  const component = {
    id: trackId,
    componentId: 'CanvasPipeline',
    type: 'atom' as const,
    data: {
      sources: { hero: { type: 'image', src: imageUrl } },
      pipeline,
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
  id: 'particle-morph-reveal',
  title: 'Particle Morph Reveal',
  description:
    'Particles swirl in, form a headline, flow into the image, then the real image burns in with glowing edges and embers',
  type: 'predefined',
  presetType: 'children',
  tags: ['canvas', 'particles', 'text', 'morph', 'reveal', 'burn', 'intro'],
  defaultInputParams: {
    trackId: 'particle-morph-1',
    imageUrl:
      'https://aidev.blr1.cdn.digitaloceanspaces.com/mediamake/vswjt2025/1762303605130-Why%20Burglars%20Will%20Skip%20Your%20House%20If%20You%20Do%20This_%20The%2030-Minute%20Home%20Fortress%20Plan%203-59%20screenshot.png',
    headline: 'MEDIAMAKE',
    rangeString: '00:00-00:08',
    fontFamily: 'Impact, sans-serif',
    fontSize: 170,
    particleCount: 4000,
    particleSize: 4,
    particleSpread: 0.35,
    swirl: 0.5,
    scatterFrom: 'explode',
    textColor: '#ffffff',
    glow: 6,
    trail: 0.35,
    accentColor: '#ff7a1a',
    burnIntensity: 2.5,
    emberCount: 24,
    backgroundColor: '#05060f',
    zoom: true,
    vignette: true,
    grain: true,
  },
};

export const particleMorphRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
