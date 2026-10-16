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
    .object({})
    .loose()
    .optional()
    .meta({
      title: 'Text style',
      [paramMetaTypes.textStyle]: true,
      [paramMetaTypes.positionStyle]: true,
    })
    .describe('Typography and position'),
  smearThreshold: z
    .number()
    .min(0.05)
    .max(2)
    .optional()
    .default(0.5)
    .meta({
      title: 'Smear threshold',
      [paramMetaTypes.inputType]: paramInputTypes.slider,
      [paramMetaTypes.inputOptions]: { min: 0.05, max: 2, step: 0.05, unit: 's' },
    })
    .describe('Max smear length in seconds. Longer words still snap after this'),
  letterSpacingSettle: z
    .object({
      enabled: z
        .boolean()
        .optional()
        .default(true)
        .meta({ title: 'Enabled' })
        .describe('Ease letter-spacing toward rest across the word'),
      impact: z
        .number()
        .min(0)
        .max(2)
        .optional()
        .default(1)
        .meta({
          title: 'Impact',
          [paramMetaTypes.inputType]: paramInputTypes.slider,
          [paramMetaTypes.inputOptions]: { min: 0, max: 2, step: 0.05 },
        })
        .describe('Tighter start spacing, and more leftover settle after the word'),
    })
    .optional()
    .meta({ title: 'Letter-spacing settle', [paramMetaTypes.flatObject]: true }),
  minChars: z
    .number()
    .min(1)
    .max(12)
    .optional()
    .meta({ title: 'Join below' })
    .describe('Words shorter than this many letters are shown with the next word'),
});
