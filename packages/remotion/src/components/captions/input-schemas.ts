import { z } from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../core/param-meta';

const color = (title: string, description: string) =>
  z
    .string()
    .optional()
    .meta({ title, [paramMetaTypes.inputType]: paramInputTypes.color })
    .describe(description);

export const CaptionSmearInput = z.object({
  captions: z
    .array(z.any())
    .meta({ [paramMetaTypes.referrableDataType]: 'captions' })
    .describe('Caption doc; word timings drive each beat'),
  font: z.string().optional().meta({ title: 'Font' }).describe('Font, e.g. CoveredByYourGrace or Roboto:700:italic'),
  colorSpectrum: z
    .object({
      color1: color('Color 1', 'First beat color'),
      color2: color('Color 2', 'Second beat color'),
      color3: color('Color 3', 'Third beat color'),
      color4: color('Color 4', 'Fourth beat color'),
    })
    .optional()
    .meta({ title: 'Color spectrum', [paramMetaTypes.colorRows]: true })
    .describe('Beats cycle through these; neighbours tint the smear'),
  textStyle: z
    .object({
      fontSize: z.number().min(8).max(600).optional().meta({ title: 'Size' }).describe('Size in pixels'),
      textTransform: z
        .enum(['none', 'uppercase', 'lowercase', 'capitalize'])
        .optional()
        .meta({ title: 'Transform' }),
      letterSpacing: z
        .string()
        .optional()
        .meta({ title: 'Spacing', [paramMetaTypes.inputType]: paramInputTypes.text })
        .describe('e.g. 0.04em or 2px'),
    })
    .optional()
    .meta({ title: 'Text style', [paramMetaTypes.flatObject]: true }),
  minChars: z
    .number()
    .min(1)
    .max(12)
    .optional()
    .meta({ title: 'Join below' })
    .describe('Words shorter than this many letters are shown with the next word'),
});
