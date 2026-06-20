/**
 * Vintage Film Flicker Effect Preset
 *
 * This internal effect preset simulates old film projector flicker and frame instability
 * with a combination of subtle position shifts, intermittent brightness drops, occasional
 * color desaturation, and micro-movements to mimic damaged film reels.
 *
 * Features:
 * - **TranslateY Wobble**: Simulates film gate wobble with irregular vertical movements (±2-5px)
 * - **Brightness Flicker**: Periodic brightness dips (0.7-0.8) lasting 0.1-0.2s for bulb fluctuations
 * - **Sepia/Color Aging**: Fading sepia tone or faded color filter for aging effect
 * - **Scale Instability**: Subtle scale variations (0.995-1.005) for frame instability
 * - **Configurable Parameters**: Control flicker rate, wobble amount, and color aging intensity
 *
 * ARRAY OF EFFECTS:
 * Returns 4 separate effects that work together to create the vintage film look:
 * 1. TranslateY wobble effect (irregular vertical position shifts)
 * 2. Brightness flicker effect (sudden brightness dips)
 * 3. CSS filter effect (sepia/faded color aging)
 * 4. Scale effect (subtle size variations for frame instability)
 *
 * Use cases:
 * - Creating vintage film aesthetics for modern videos
 * - Simulating old projector playback effects
 * - Adding retro/nostalgic visual styles
 * - Creating damaged film reel effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  flickerRate: z
    .enum(['slow', 'normal', 'fast'])
    .describe('Speed of flicker effects: slow (0.5x), normal (1x), or fast (1.5x)'),
  wobbleAmount: z
    .enum(['subtle', 'moderate', 'extreme'])
    .describe('Intensity of position wobble: subtle (±2px), moderate (±3-4px), or extreme (±5px)'),
  colorAging: z
    .enum(['none', 'sepia', 'faded'])
    .describe('Type of color aging effect: none (no filter), sepia (brown tone), or faded (desaturated)'),
  duration: z
    .number()
    .default(5)
    .describe('Duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the vintage film effect to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { flickerRate, wobbleAmount, colorAging, duration, targetIds } = params;

  // Calculate rate multiplier for flicker speed
  const rateMultiplier = flickerRate === 'slow' ? 0.5 : flickerRate === 'fast' ? 1.5 : 1;

  // Calculate wobble distance based on amount
  const wobbleDistance =
    wobbleAmount === 'subtle' ? 2 : wobbleAmount === 'moderate' ? 3.5 : 5;

  // Generate irregular translateY wobble ranges
  const generateWobbleRanges = () => {
    const ranges = [];
    const steps = 20; // Number of keyframes for irregular wobble

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      // Use sine wave with random offsets for irregular movement
      const randomOffset = (Math.random() - 0.5) * 2; // -1 to 1
      const sineValue = Math.sin(prog * Math.PI * 6 * rateMultiplier) * wobbleDistance;
      const wobbleValue = sineValue + randomOffset * wobbleDistance * 0.3;

      ranges.push({
        key: 'translateY',
        val: wobbleValue,
        prog: prog,
      });
    }

    return ranges;
  };

  // Generate brightness flicker ranges with periodic dips
  const generateBrightnessRanges = () => {
    const ranges = [];
    const flickerInterval = 0.3 / rateMultiplier; // Time between flickers
    const flickerDuration = 0.15; // Duration of each dip

    let currentTime = 0;

    // Start at normal brightness
    ranges.push({ key: 'brightness', val: 1, prog: 0 });

    while (currentTime < duration) {
      const nextFlickerTime = currentTime + flickerInterval * (0.8 + Math.random() * 0.4);

      if (nextFlickerTime >= duration) break;

      // Normal brightness before flicker
      ranges.push({
        key: 'brightness',
        val: 1,
        prog: Math.min(nextFlickerTime / duration, 1),
      });

      // Sudden brightness dip
      const dipStart = nextFlickerTime;
      const dipEnd = Math.min(dipStart + flickerDuration, duration);
      const dipValue = 0.7 + Math.random() * 0.1; // 0.7-0.8 brightness

      ranges.push({
        key: 'brightness',
        val: dipValue,
        prog: Math.min((dipStart + 0.01) / duration, 1),
      });

      // Return to normal
      ranges.push({
        key: 'brightness',
        val: 1,
        prog: Math.min(dipEnd / duration, 1),
      });

      currentTime = dipEnd;
    }

    // End at normal brightness
    ranges.push({ key: 'brightness', val: 1, prog: 1 });

    return ranges;
  };

  // Generate color aging filter string
  const generateColorFilter = () => {
    if (colorAging === 'none') {
      return null;
    }

    if (colorAging === 'sepia') {
      // Sepia tone with slight desaturation
      return 'sepia(0.6) saturate(0.8) brightness(1.05)';
    }

    if (colorAging === 'faded') {
      // Faded look with desaturation and slight brightness boost
      return 'saturate(0.6) brightness(1.1) contrast(0.9)';
    }

    return null;
  };

  // Generate subtle scale variations for frame instability
  const generateScaleRanges = () => {
    const ranges = [];
    const steps = 15;

    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      // Irregular scale variations between 0.995 and 1.005
      const scaleValue = 0.995 + Math.random() * 0.01;

      ranges.push({
        key: 'scale',
        val: scaleValue,
        prog: prog,
      });
    }

    return ranges;
  };

  // Build effects array
  const effects = [];

  // Effect 1: TranslateY wobble
  const wobbleEffect = {
    id: `vintage-wobble-${targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: generateWobbleRanges(),
    } as GenericEffectData,
  };
  effects.push(wobbleEffect);

  // Effect 2: Brightness flicker
  const brightnessEffect = {
    id: `vintage-brightness-${targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: generateBrightnessRanges(),
    } as GenericEffectData,
  };
  effects.push(brightnessEffect);

  // Effect 3: Color aging filter (if enabled)
  const colorFilterString = generateColorFilter();
  if (colorFilterString) {
    // Create oscillating sepia/faded intensity
    const filterRanges = [];
    const filterSteps = 10;

    for (let i = 0; i <= filterSteps; i++) {
      const prog = i / filterSteps;
      // Oscillate filter intensity between 80% and 100%
      const intensity = 0.8 + Math.sin(prog * Math.PI * 4 * rateMultiplier) * 0.1;

      // Adjust filter string based on intensity
      let adjustedFilter = colorFilterString;
      if (colorAging === 'sepia') {
        adjustedFilter = `sepia(${0.6 * intensity}) saturate(${0.8 * intensity}) brightness(1.05)`;
      } else if (colorAging === 'faded') {
        adjustedFilter = `saturate(${0.6 * intensity}) brightness(${1.1}) contrast(${0.9 * intensity})`;
      }

      filterRanges.push({
        key: 'filter',
        val: adjustedFilter,
        prog: prog,
      });
    }

    const colorEffect = {
      id: `vintage-color-${targetIds.join('-')}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: targetIds,
        ranges: filterRanges,
      } as GenericEffectData,
    };
    effects.push(colorEffect);
  }

  // Effect 4: Scale instability
  const scaleEffect = {
    id: `vintage-scale-${targetIds.join('-')}`,
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: generateScaleRanges(),
    } as GenericEffectData,
  };
  effects.push(scaleEffect);

  // Return effects in container structure
  const rootContainer: RenderableComponentData = {
    id: 'vintage-film-flicker-container',
    type: 'layout',
    componentId: 'BaseLayout',
    effects: effects,
    childrenData: [],
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'VintageFilmFlicker',
  title: 'Vintage Film Flicker Effect',
  description:
    'Internal effect preset that simulates old film projector flicker and frame instability with position wobble, brightness dips, sepia tone, and scale variations. Returns an array of effects for provider-mode targeting.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'vintage', 'film', 'flicker', 'retro', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    flickerRate: 'normal',
    wobbleAmount: 'moderate',
    colorAging: 'sepia',
    duration: 5,
    targetIds: ['component-1'],
  },
};

export const VintageFilmFlickerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
