import { z } from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../core/param-meta';
import { styleSectionMeta } from '../atoms/input-schemas';
import { WaveformAudioSourceInput } from '../waveforms/input-schemas';
import { IMAGE_BLEND_MODES, IMAGE_FITS } from './image-style';
import { BeatmapInput } from './beatmap/normalize';
import { BEAT_CUE_SOURCES } from './beatmap/cues';
import { MONTAGE_ORDERS, MONTAGE_ROTATIONS, MONTAGE_TRANSITIONS } from './beat-montage-math';

const slider = (min: number, max: number, description: string) =>
  z.number().min(min).max(max).optional().describe(description);

const sliderMeta = (title: string, min: number, max: number, step: number, unit?: string) => ({
  title,
  [paramMetaTypes.inputType]: paramInputTypes.slider,
  [paramMetaTypes.inputOptions]: { min, max, step, ...(unit ? { unit } : {}) },
});

const imageStyleField = (description: string) =>
  z
    .object({
      objectFit: z.enum(IMAGE_FITS).optional().describe('How the media fits the block'),
      mixBlendMode: z.enum(IMAGE_BLEND_MODES).optional().describe('Blend mode'),
      opacity: slider(0, 1, 'Opacity (0-1). Default: 1.'),
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
    .describe(description);

const cueOnField = (description: string) =>
  z.enum(BEAT_CUE_SOURCES).optional().meta({ title: 'React to' }).describe(description);

const leadField = (defaultSec: number) =>
  slider(
    -0.1,
    0.25,
    `Seconds the picture moves before the hit, so it lands with the sound. Editors usually cut 1-5 frames early. Default: ${defaultSec}.`,
  ).meta(sliderMeta('Lead', -0.1, 0.25, 0.005, 's'));

export const ImageBeatInput = z.object({
  src: z.string().describe('Image URL'),
  audio: WaveformAudioSourceInput.describe('Audio the zooms lock to.'),
  beatmap: BeatmapInput,
  proxySrc: z.string().optional().describe('Custom proxy endpoint for CORS'),
  className: z.string().optional().describe('CSS class on the clipping block'),
  style: imageStyleField('Block, position, and image look'),
  cueOn: cueOnField(
    'Which hits punch: accent (strongest attacks of the mix), beats, downbeats, kick, snare, hat or kick+snare. Default: follows Audio band (bass = kick).',
  ),
  zoomIntensity: slider(0.05, 2, 'How far each beat punches in. Default: 0.32.').meta(
    sliderMeta('Zoom intensity', 0.05, 2, 0.01),
  ),
  baseScale: slider(
    1,
    2,
    'Resting crop. Stay above 1 so origin jumps do not show empty edges. Default: 1.08.',
  ).meta(sliderMeta('Base scale', 1, 2, 0.01)),
  sensitivity: slider(
    0.1,
    5,
    'How readily quieter hits count. Higher lands more hits (divides the threshold). Default: 1.6.',
  ).meta(sliderMeta('Sensitivity', 0.1, 5, 0.05)),
  threshold: slider(
    0,
    1,
    'Weakest hit strength that punches, before sensitivity. Raise to keep only the big hits. Default: 0.18.',
  ).meta(sliderMeta('Threshold', 0, 1, 0.01)),
  audioProperty: z
    .enum(['bass', 'mid', 'treble', 'waveform'])
    .optional()
    .meta({ title: 'Audio band' })
    .describe('Band that drives the punches when React to is unset: bass = kick, mid = snare, treble = hat, waveform = accent. Default: bass.'),
  minGapSec: slider(0.05, 2, 'Shortest time between punches; the stronger of two close hits wins. Default: 0.18.').meta(
    sliderMeta('Min gap', 0.05, 2, 0.01, 's'),
  ),
  leadSec: leadField(0),
  dynamics: slider(
    0,
    1,
    'How much a hit’s strength sizes its punch. 0 = every punch the same, 1 = soft hits barely move. Default: 0.6.',
  ).meta(sliderMeta('Dynamics', 0, 1, 0.05)),
  downbeatBoost: slider(0, 1, 'Extra punch on the first beat of a bar. Default: 0.3.').meta(
    sliderMeta('Downbeat boost', 0, 1, 0.05),
  ),
  originSpread: slider(
    0,
    1,
    'How far each punch sits from the centre. 0 is almost centred; 1 hugs the edges. Default: 0.7.',
  ).meta(sliderMeta('Origin spread', 0, 1, 0.05)),
  punchSec: slider(
    0.04,
    0.6,
    'Seconds to ease-in-out into the new crop after a beat. Pan and zoom share this. Default: 0.18.',
  ).meta(sliderMeta('Punch', 0.04, 0.6, 0.01, 's')),
  settleSec: slider(0.08, 1.2, 'Seconds to ease-out back after the punch. Default: 0.5.').meta(
    sliderMeta('Settle', 0.08, 1.2, 0.01, 's'),
  ),
  tilt: slider(0, 12, 'Degrees each punch may rotate, alternating sides. Default: 0.').meta(
    sliderMeta('Tilt', 0, 12, 0.5, '°'),
  ),
  flash: slider(0, 1, 'Exposure bump on each punch, fading with it. Default: 0.').meta(
    sliderMeta('Flash', 0, 1, 0.05),
  ),
});

const MontageItemInput = z
  .object({
    src: z.string().describe('Image or video URL'),
    type: z.enum(['image', 'video']).optional().describe('Media kind. Default: from the file extension.'),
    startFrom: z.number().optional().describe('Video only: seconds into the clip each shot starts at. Default: 0.'),
    rotate: z.enum(MONTAGE_ROTATIONS).optional().describe('Overrides the atom rotation for this item.'),
    objectPosition: z.string().optional().describe('CSS object-position, e.g. "30% 50%" to keep a face in the crop.'),
  })
  .loose();

export const BeatMontageInput = z.object({
  media: z
    .array(MontageItemInput)
    .meta({
      title: 'Media',
      [paramMetaTypes.mediasGroup]: true,
      [paramMetaTypes.referrableDataType]: 'medias',
    })
    .describe('Images and videos, shown one per shot in this order (or shuffled).'),
  audio: WaveformAudioSourceInput.describe('Audio the cuts follow.'),
  beatmap: BeatmapInput,
  className: z.string().optional().describe('CSS class on the clipping block'),
  style: imageStyleField('Block, position, and media look'),
  cueOn: cueOnField(
    'What cuts: accent (strongest attacks of the mix), beats, downbeats, kick, snare, hat or kick+snare. Default: accent.',
  ),
  threshold: slider(0, 1, 'Weakest hit that cuts, 0-1. Raise to cut only on the big hits. Default: 0.45.').meta(
    sliderMeta('Threshold', 0, 1, 0.01),
  ),
  minShotSec: slider(0.08, 4, 'Shortest shot; the stronger of two close hits wins. Default: 0.35.').meta(
    sliderMeta('Min shot', 0.08, 4, 0.01, 's'),
  ),
  maxShotSec: slider(0, 8, 'Longest shot: when no hit comes, cut on the next beat. 0 = hold. Default: 0.').meta(
    sliderMeta('Max shot', 0, 8, 0.05, 's'),
  ),
  every: z
    .number()
    .int()
    .min(1)
    .max(8)
    .optional()
    .meta(sliderMeta('Every n-th', 1, 8, 1))
    .describe('Cut on every n-th hit. Default: 1.'),
  leadSec: leadField(0.04),
  startOnFirstCue: z
    .boolean()
    .optional()
    .meta({ title: 'Black until first hit' })
    .describe('Hold black until the first hit, then cut in on it. Default: false.'),
  order: z.enum(MONTAGE_ORDERS).optional().meta({ title: 'Order' }).describe('Media order. Default: sequence.'),
  seed: z.number().optional().describe('Changes the shuffle, drift directions and whip directions. Default: 1.'),
  rotate: z
    .enum(MONTAGE_ROTATIONS)
    .optional()
    .meta({ title: 'Rotate' })
    .describe('auto turns landscape media a quarter to fill a portrait frame (and the reverse); cw / ccw always turn. Default: none.'),
  transition: z
    .enum(MONTAGE_TRANSITIONS)
    .optional()
    .meta({ title: 'Transition' })
    .describe('cut, flash (exposure pop), punch (zoom settle), whip (motion-blur slide), zoom (zoom through), dissolve, dip (through black). Default: cut.'),
  transitionSec: slider(0.04, 1.2, 'Length of the transition. Default: 0.2.').meta(
    sliderMeta('Transition length', 0.04, 1.2, 0.01, 's'),
  ),
  transitionStrength: slider(0, 1, 'How hard the transition hits; scaled by each hit’s strength. Default: 0.6.').meta(
    sliderMeta('Transition strength', 0, 1, 0.05),
  ),
  flashColor: z
    .string()
    .optional()
    .meta({ title: 'Flash colour', [paramMetaTypes.inputType]: paramInputTypes.color })
    .describe('Colour of the flash transition. Default: #ffffff.'),
  baseScale: slider(1, 1.5, 'Resting crop, so drift never shows an edge. Default: 1.04.').meta(
    sliderMeta('Base scale', 1, 1.5, 0.01),
  ),
  driftScale: slider(-0.3, 0.3, 'Zoom across each shot. Positive pushes in, negative pulls out. Default: 0.06.').meta(
    sliderMeta('Drift zoom', -0.3, 0.3, 0.01),
  ),
  driftPan: slider(0, 0.2, 'Pan across each shot, as a share of the frame, in a different direction per shot. Default: 0.03.').meta(
    sliderMeta('Drift pan', 0, 0.2, 0.005),
  ),
  beatPulse: slider(0, 0.15, 'Small zoom bump on every beat between cuts. Default: 0.').meta(
    sliderMeta('Beat pulse', 0, 0.15, 0.005),
  ),
  vignette: slider(0, 1, 'Darkened corners. Default: 0.').meta(sliderMeta('Vignette', 0, 1, 0.05)),
  backgroundColor: z
    .string()
    .optional()
    .meta({ title: 'Background', [paramMetaTypes.inputType]: paramInputTypes.color })
    .describe('Shown before the first hit and behind transitions. Default: #000000.'),
});
