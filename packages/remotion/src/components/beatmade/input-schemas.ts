import { z } from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../core/param-meta';
import { styleSectionMeta } from '../atoms/input-schemas';
import { WaveformAudioSourceInput } from '../waveforms/input-schemas';
import { IMAGE_BLEND_MODES, IMAGE_FITS } from './image-style';

const slider = (min: number, max: number, description: string) =>
  z.number().min(min).max(max).optional().describe(description);

export const ImageBeatInput = z.object({
  src: z.string().describe('Image URL'),
  audio: WaveformAudioSourceInput.describe('Audio the zooms lock to.'),
  proxySrc: z.string().optional().describe('Custom proxy endpoint for CORS'),
  className: z.string().optional().describe('CSS class on the clipping block'),
  style: z
    .object({
      objectFit: z.enum(IMAGE_FITS).optional().describe('How the image fits the block'),
      mixBlendMode: z.enum(IMAGE_BLEND_MODES).optional().describe('Blend mode'),
      opacity: slider(0, 1, 'Image opacity (0-1). Default: 1.'),
    })
    .loose()
    .optional()
    .meta(
      styleSectionMeta({
        title: 'Style',
        block: true,
        position: true,
        image: true,
      }),
    )
    .describe('Block, position, and image look'),
  zoomIntensity: slider(
    0.05,
    2,
    'How far each beat punches in. Default: 0.32.',
  ).meta({
    title: 'Zoom intensity',
    [paramMetaTypes.inputType]: paramInputTypes.slider,
    [paramMetaTypes.inputOptions]: { min: 0.05, max: 2, step: 0.01 },
  }),
  baseScale: slider(
    1,
    2,
    'Resting crop. Stay above 1 so origin jumps do not show empty edges. Default: 1.08.',
  ).meta({
    title: 'Base scale',
    [paramMetaTypes.inputType]: paramInputTypes.slider,
    [paramMetaTypes.inputOptions]: { min: 1, max: 2, step: 0.01 },
  }),
  sensitivity: slider(
    0.1,
    5,
    'How readily quiet hits count as beats. Default: 1.6.',
  ).meta({
    title: 'Sensitivity',
    [paramMetaTypes.inputType]: paramInputTypes.slider,
    [paramMetaTypes.inputOptions]: { min: 0.1, max: 5, step: 0.05 },
  }),
  threshold: slider(
    0,
    1,
    'Minimum onset strength. Raise to ignore ghost hits. Default: 0.18.',
  ).meta({
    title: 'Threshold',
    [paramMetaTypes.inputType]: paramInputTypes.slider,
    [paramMetaTypes.inputOptions]: { min: 0, max: 1, step: 0.01 },
  }),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .optional()
    .meta({ title: 'Audio band' })
    .describe('Which band drives onsets. Default: bass.'),
  originSpread: slider(
    0,
    1,
    'How far each punch sits from the centre. 0 is almost centred; 1 hugs the edges. Default: 0.7.',
  ).meta({
    title: 'Origin spread',
    [paramMetaTypes.inputType]: paramInputTypes.slider,
    [paramMetaTypes.inputOptions]: { min: 0, max: 1, step: 0.05 },
  }),
  punchSec: slider(
    0.04,
    0.6,
    'Seconds to ease-in-out into the new crop after a beat. Pan and zoom share this. Default: 0.18.',
  ).meta({
    title: 'Punch',
    [paramMetaTypes.inputType]: paramInputTypes.slider,
    [paramMetaTypes.inputOptions]: { min: 0.04, max: 0.6, step: 0.01, unit: 's' },
  }),
  settleSec: slider(
    0.08,
    1.2,
    'Seconds to ease-out back after the punch. Default: 0.5.',
  ).meta({
    title: 'Settle',
    [paramMetaTypes.inputType]: paramInputTypes.slider,
    [paramMetaTypes.inputOptions]: { min: 0.08, max: 1.2, step: 0.01, unit: 's' },
  }),
});
