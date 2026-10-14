import { z } from 'zod';
import { paramInputTypes, paramMetaTypes } from '../../core/param-meta';

const color = (description: string) =>
  z
    .string()
    .optional()
    .meta({ [paramMetaTypes.inputType]: paramInputTypes.color })
    .describe(description);

const jsonObject = (description: string) =>
  z.record(z.string(), z.any()).optional().describe(description);

const slider = (min: number, max: number, description: string) =>
  z.number().min(min).max(max).optional().describe(description);

export const WaveformAudioSourceInput = z.object({
  src: z
    .string()
    .describe(
      'The audio this visual reacts to: an audio URL, a static file path, or ref:<id> to follow an existing audio track (its start offset is picked up automatically). Required.'
    ),
  start: z
    .number()
    .optional()
    .describe(
      'Seconds into the audio to start reading from, so the visual lines up with where playback starts. Negative values make the visual react slightly early. Default: 0.'
    ),
});

const sourceAndSize = {
  audio: WaveformAudioSourceInput.describe('Audio source the waveform listens to.'),
  width: z
    .number()
    .optional()
    .describe('Width of the waveform in px. Default: the composition width.'),
  height: z
    .number()
    .optional()
    .describe('Height of the waveform in px. Default: the composition height.'),
  className: z
    .string()
    .optional()
    .describe('Extra Tailwind/CSS classes added to the waveform container. Default: none.'),
  style: jsonObject(
    'Inline CSS applied to the waveform container (e.g. {"backgroundColor": "#000"}). Default: none.'
  ),
};

const fftSizeField = (defaultSize: number) =>
  z
    .union([z.literal(1024), z.literal(2048), z.literal(4096), z.literal(8192), z.literal(16384)])
    .optional()
    .describe(
      `How many audio samples each frequency analysis uses. Larger sizes separate notes more precisely (narrower peaks) but react a little slower; smaller sizes are snappier but blurrier. Default: ${defaultSize}.`
    );

const spectrumFrequencyFields = (defaults: {
  minFrequency: number;
  maxFrequency: number;
  tilt: number;
  gain: number;
}) => ({
  minFrequency: slider(
    10,
    2000,
    `Lowest frequency shown at the bass end, in Hz. Raise it to skip rumble. Default: ${defaults.minFrequency}.`
  ),
  maxFrequency: slider(
    200,
    20000,
    `Highest frequency shown at the treble end, in Hz. Lower it to spend more width on bass and vocals. Default: ${defaults.maxFrequency}.`
  ),
  frequencyScale: z
    .enum(['log', 'linear'])
    .optional()
    .describe(
      'How frequencies are spread across the width. log gives each octave equal space, like a piano (bass is wide, treble is compressed); linear gives every Hz equal space, so bass gets squeezed to the edge. Default: log.'
    ),
  tilt: slider(
    -1,
    2,
    `Boosts higher frequencies relative to bass. Music is naturally bass-heavy, so a positive tilt balances the picture; 0 = no boost, negative values favour bass. Default: ${defaults.tilt}.`
  ),
  gain: slider(
    0,
    60,
    `Overall sensitivity: how tall the shape gets for a given loudness. Loud peaks are softly rounded off instead of being cut flat. Default: ${defaults.gain}.`
  ),
});

const spectrumDirectionField = z
  .enum(['low-to-high', 'high-to-low'])
  .optional()
  .describe('low-to-high puts bass on the left and treble on the right; high-to-low flips it. Default: low-to-high.');

export interface HistogramStyleDefaults {
  horizontalSymmetry: boolean;
}

/** Bar styling shared by WaveformHistogram and WaveformHistogramRanged. */
export const histogramStyleFields = (defaults: HistogramStyleDefaults) => ({
  barColor: color(
    'Color of every bar. Ignored when both gradient colors are set. Default: #FF6B6B.'
  ),
  barWidth: slider(1, 40, 'Width of each bar in px. Default: 4.'),
  barSpacing: slider(
    0,
    40,
    'Gap between bars in px. With full-width style this is the minimum gap. Default: 2.'
  ),
  barBorderRadius: slider(
    0,
    40,
    'Rounding of the bar ends in px (only the outer ends are rounded). Default: 2.'
  ),
  opacity: slider(0, 1, 'Transparency of the bars, from 0 (invisible) to 1 (solid). Default: 1.'),
  horizontalSymmetry: z
    .boolean()
    .optional()
    .describe(
      `Mirrors the bars left to right so the pattern is symmetric around the center. Default: ${defaults.horizontalSymmetry}.`
    ),
  verticalMirror: z
    .boolean()
    .optional()
    .describe(
      'On: bars grow up from the middle line and are mirrored downward, like a reflection. Off: one row of bars growing upward. Default: false.'
    ),
  waveDirection: z
    .enum(['right-to-left', 'left-to-right'])
    .optional()
    .describe('Which side the data starts from; flips the order of the bars. Default: right-to-left.'),
  histogramStyle: z
    .enum(['centered', 'full-width'])
    .optional()
    .describe(
      'centered packs the bars together in the middle; full-width spreads them evenly from edge to edge. Default: centered.'
    ),
  amplitude: slider(
    0,
    4,
    'Multiplies bar height. A bar can never be taller than half the waveform height. Default: 1.'
  ),
  barSlant: slider(
    -90,
    90,
    'Tilts every bar by this many degrees around its base, for a slanted look. Default: 0 (upright).'
  ),
  gradientStartColor: color(
    'Gradient color at the base of each bar. Needs the gradient end color too, and replaces the bar color. Default: none (solid bar color).'
  ),
  gradientEndColor: color(
    'Gradient color at the tip of each bar. Needs the gradient start color too. Default: none (solid bar color).'
  ),
  gradientDirection: z
    .enum(['vertical', 'horizontal'])
    .optional()
    .describe('vertical runs the gradient along each bar\'s height; horizontal runs it across its width. Default: vertical.'),
  gradientStyle: z
    .enum(['mirrored', 'normal'])
    .optional()
    .describe(
      'mirrored draws the downward (reflected) bars at 25% opacity, like a reflection; normal draws both halves at full strength. Default: normal.'
    ),
});

export const WaveformHistogramInput = z.object({
  ...sourceAndSize,
  numberOfSamples: slider(
    1,
    256,
    'How many values are read from the audio each frame, rounded to a power of 2 (32, 64, 128...). More samples means more, thinner bars. Default: 128.'
  ),
  windowInSeconds: slider(
    0.01,
    5,
    'How much audio each frame looks at, in seconds. Longer windows show slower, broader movement. Default: one frame (1/fps).'
  ),
  useFrequencyData: z
    .boolean()
    .optional()
    .describe(
      'On: bars show frequencies from bass to treble (an equaliser look). Off: bars follow the raw waveform shape. Default: false.'
    ),
  smoothNormalisation: slider(
    0,
    5,
    'Averages neighbouring frames to reduce flicker: 0 = off, 1 = ±3 frames, 2 = ±6 frames. Default: 1.'
  ),
  ...histogramStyleFields({ horizontalSymmetry: true }),
  multiplier: slider(
    0,
    4,
    'Repeats the bar pattern this many times across the width (whole numbers only). Only used when horizontal symmetry is off. Default: 1.'
  ),
});

export const WaveformSpectrumLineInput = z.object({
  ...sourceAndSize,
  strokeColor: color('Color of the line. Default: #FFFFFF.'),
  strokeWidth: slider(1, 20, 'Thickness of the line in px. Default: 5.'),
  opacity: slider(0, 1, 'Transparency of the line, from 0 (invisible) to 1 (solid). Default: 1.'),
  glowColor: color('Color of the soft glow behind the line (needs glow blur above 0). Default: the line color.'),
  glowBlur: slider(
    0,
    40,
    'Blur radius of a soft glow behind the line, in px. 0 turns the glow off. Default: 0 (no glow).'
  ),
  baselineOffset: slider(
    0,
    400,
    'How far the flat resting line sits above the bottom edge, in px. Default: the line thickness (so it is not clipped).'
  ),
  peakHeight: slider(
    0,
    1,
    'How much of the space above the baseline the tallest peak may use, from 0 (flat) to 1 (full height). Default: 1.'
  ),
  direction: spectrumDirectionField,
  pointCount: slider(
    16,
    512,
    'How many points the line is drawn through across the width. More points give finer, spikier detail; fewer give a smoother, simpler line. Default: 200.'
  ),
  fftSize: fftSizeField(8192),
  ...spectrumFrequencyFields({ minFrequency: 20, maxFrequency: 2200, tilt: 0.3, gain: 15 }),
  noiseFloor: slider(
    0,
    0.5,
    'Quiet values below this level are pressed flat onto the baseline, keeping it clean between peaks. Default: 0.02.'
  ),
  sharpness: slider(
    0.5,
    4,
    'Shapes the peaks: values above 1 make them narrower and spikier with a flatter baseline; below 1 makes them broader. Default: 1.6.'
  ),
  spread: slider(
    0,
    6,
    'How many times neighbouring points are blended together, rounding off each peak. 0 = raw, sharp peaks. Default: 1.'
  ),
  temporalSmoothing: slider(
    0,
    0.95,
    'How long peaks linger after the sound fades: 0 = instant (jittery), towards 0.95 = slow and floaty. Default: 0.5.'
  ),
  smoothingFrames: slider(
    0,
    12,
    'How many previous frames are blended in for temporal smoothing. More frames give a longer tail. Default: 4.'
  ),
});

export const WaveformSpectrumFillInput = z.object({
  ...sourceAndSize,
  fillColor: color(
    'Color of the filled shape (or the bottom color, when a gradient end color is set). Default: #FFFFFF.'
  ),
  gradientEndColor: color(
    'Color at the top of the shape; the fill fades from the fill color at the bottom to this at the top. Default: none (solid fill).'
  ),
  opacity: slider(0, 1, 'Transparency of the shape, from 0 (invisible) to 1 (solid). Default: 1.'),
  strokeColor: color('Color of an outline along the top edge (needs stroke width above 0). Default: the fill color.'),
  strokeWidth: slider(
    0,
    20,
    'Thickness of the outline along the top edge, in px. 0 turns it off. Default: 0 (no outline).'
  ),
  restHeight: slider(
    0,
    200,
    'Thickness of the solid band left at the bottom when the audio is silent, in px. Default: 8.'
  ),
  baselineOffset: slider(
    0,
    400,
    'How far the bottom of the shape sits above the bottom edge, in px. Default: 0 (touching the edge).'
  ),
  peakHeight: slider(
    0,
    1,
    'How much of the space above the rest band the tallest hill may use, from 0 (flat) to 1 (full height). Default: 1.'
  ),
  direction: spectrumDirectionField,
  pointCount: slider(
    8,
    256,
    'How many points the top edge is drawn through. Fewer points give broad, rolling hills; more give busier detail. Default: 36.'
  ),
  fftSize: fftSizeField(4096),
  ...spectrumFrequencyFields({ minFrequency: 30, maxFrequency: 6000, tilt: 0.2, gain: 14 }),
  noiseFloor: slider(
    0,
    0.5,
    'Quiet values below this level are pressed flat onto the rest band. Default: 0.03.'
  ),
  sharpness: slider(
    0.2,
    4,
    'Shapes the hills: values below 1 make them fuller and rounder; above 1 makes them steeper and more pointed. Default: 0.7.'
  ),
  spread: slider(
    0,
    16,
    'How many times neighbouring points are blended together; higher values merge detail into wide, smooth hills. Default: 6.'
  ),
  temporalSmoothing: slider(
    0,
    0.95,
    'How long hills linger after the sound fades: 0 = instant (jittery), towards 0.95 = slow and floaty. Default: 0.7.'
  ),
  smoothingFrames: slider(
    0,
    16,
    'How many previous frames are blended in for temporal smoothing. More frames give a longer tail. Default: 8.'
  ),
});

export const WaveformHistogramRangedInput = z.object({
  ...sourceAndSize,
  numberOfSamples: slider(
    1,
    256,
    'How many frequency values are read from the audio each frame, rounded to a power of 2 (32, 64, 128...). The values are split into bass, mid and treble groups, so more samples means more, thinner bars. Default: 64.'
  ),
  windowInSeconds: slider(
    0.01,
    5,
    'How much audio each frame looks at, in seconds. Longer windows show slower, broader movement. Default: 1/30 (about 0.033).'
  ),
  smoothNormalisation: slider(
    0,
    5,
    'Averages neighbouring frames to reduce flicker: 0 = off, 1 = ±3 frames, 2 = ±6 frames. Default: 1.'
  ),
  ...histogramStyleFields({ horizontalSymmetry: false }),
  showFrequencyRanges: z
    .boolean()
    .optional()
    .describe('Reserved for showing bass, mid and treble sections; currently has no visible effect. Default: true.'),
  rangeDividerColor: color('Text color of the range labels. Default: #666.'),
  rangeLabels: z
    .boolean()
    .optional()
    .describe('Writes Bass / Mid / Treble labels under the first three bars. Default: false.'),
  bassBarColor: color('Kept for older projects; currently has no visible effect. Default: #5DADE2.'),
  midBarColor: color('Kept for older projects; currently has no visible effect. Default: #58D68D.'),
  trebleBarColor: color('Kept for older projects; currently has no visible effect. Default: #F5B041.'),
});
