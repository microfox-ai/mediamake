import { z } from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../core/param-meta';

/**
 * Style-section flags. A schema that extends one of the atom inputs below
 * keeps these flags, so Block and Special Effects show up on the extension too.
 * Special Effects is shown for `text` or `block`.
 */
export function styleSectionMeta(flags: {
  text?: boolean;
  block?: boolean;
  position?: boolean;
  image?: boolean;
  video?: boolean;
  audio?: boolean;
  title?: string;
}): Record<string, unknown> {
  return {
    ...(flags.title ? { title: flags.title } : {}),
    ...(flags.text ? { [paramMetaTypes.textStyle]: true } : {}),
    ...(flags.block ? { [paramMetaTypes.blockStyle]: true } : {}),
    ...(flags.position ? { [paramMetaTypes.positionStyle]: true } : {}),
    ...(flags.image ? { [paramMetaTypes.imageStyle]: true } : {}),
    ...(flags.video ? { [paramMetaTypes.videoStyle]: true } : {}),
    ...(flags.audio ? { [paramMetaTypes.audioStyle]: true } : {}),
  };
}

const blockStyleField = (description = 'CSS style') =>
  z
    .record(z.string(), z.any())
    .optional()
    .meta(styleSectionMeta({ block: true }))
    .describe(description);

export const ShapeAtomInput = z.object({
  shape: z.enum(['circle', 'rectangle', 'star', 'triangle']).describe('Shape'),
  color: z
    .string()
    .meta({ [paramMetaTypes.inputType]: paramInputTypes.color })
    .describe('Fill color'),
  rotation: z
    .object({
      duration: z.number().min(1).max(600).optional().describe('Rotation length in frames'),
    })
    .optional(),
  style: blockStyleField(),
});

export const ImageAtomInput = z.object({
  src: z.string().describe('Image URL'),
  className: z.string().optional().describe('CSS class'),
  proxySrc: z.string().optional().describe('Custom proxy endpoint for CORS'),
  style: z
    .record(z.string(), z.any())
    .optional()
    .meta(styleSectionMeta({ block: true, position: true, image: true }))
    .describe('CSS style'),
});

export const TextAtomInput = z.object({
  text: z
    .string()
    .meta({ [paramMetaTypes.inputType]: paramInputTypes.textarea })
    .describe('Text content'),
  style: z
    .object({
      color: z
        .string()
        .optional()
        .meta({ [paramMetaTypes.inputType]: paramInputTypes.color })
        .describe('Text color'),
    })
    .loose()
    .optional()
    .meta(styleSectionMeta({ text: true, block: true, position: true }))
    .describe('Style'),
});

export const VideoAtomDataProps = z.object({
  src: z.string(),
  srcDuration: z.number().optional(),
  style: z
    .record(z.string(), z.any())
    .optional()
    .meta(styleSectionMeta({ block: true, video: true }))
    .describe('CSS style'),
  containerClassName: z.string().optional(),
  className: z.string().optional(),
  startFrom: z.number().optional(),
  endAt: z.number().optional(),
  playbackRate: z.number().optional(),
  volume: z.number().optional(),
  muted: z.boolean().optional(),
  loop: z.boolean().optional(),
  fit: z.enum(['contain', 'cover', 'fill', 'none', 'scale-down']).optional(),
});
export type VideoAtomDataProps = z.infer<typeof VideoAtomDataProps>;

export const AudioAtomMutedRangeProps = z.object({
  type: z.literal('range'),
  values: z.array(
    z.object({
      start: z.number(),
      end: z.number(),
    }),
  ),
});
export type AudioAtomMutedRangeProps = z.infer<typeof AudioAtomMutedRangeProps>;

export const AudioAtomMutedFullProps = z.object({
  type: z.literal('full'),
  value: z.boolean(),
});
export type AudioAtomMutedFullProps = z.infer<typeof AudioAtomMutedFullProps>;

export const AudioAtomDataProps = z.object({
  src: z.string(),
  startFrom: z.number().optional(),
  endAt: z.number().optional(),
  volume: z.number().optional(),
  playbackRate: z.number().optional(),
  muted: z.union([AudioAtomMutedFullProps, AudioAtomMutedRangeProps]).optional(),
  style: z
    .record(z.string(), z.any())
    .optional()
    .meta(styleSectionMeta({ audio: true }))
    .describe('Audio'),
});
export type AudioAtomDataProps = z.infer<typeof AudioAtomDataProps>;

export const LottieAtomDataProps = z.object({
  src: z.string(),
  style: z.record(z.string(), z.any()).optional(),
  className: z.string().optional(),
  loop: z.boolean().optional(),
  playbackRate: z.number().optional(),
  direction: z.enum(['forward', 'reverse']).optional(),
});
export type LottieAtomDataProps = z.infer<typeof LottieAtomDataProps>;

export const HTMLBlockAtomInput = z.object({
  html: z
    .string()
    .meta({ [paramMetaTypes.inputType]: paramInputTypes.textarea })
    .describe('HTML content'),
  className: z.string().optional().describe('CSS class'),
  style: z
    .record(z.string(), z.any())
    .optional()
    .meta(styleSectionMeta({ block: true, position: true }))
    .describe('CSS style'),
});
