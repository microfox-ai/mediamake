/**
 * HardCut Internal Effect Preset
 *
 * This preset mimics professional video editing hard cuts with instant visibility changes.
 * Supports hard cuts (simultaneous hide/show), L-cuts (audio leads - hide delays), 
 * and J-cuts (video leads - show starts early) for audio/video desynchronization.
 *
 * Features:
 * - **Hard Cut**: Instant simultaneous hide/show at the same frame
 * - **L-Cut**: Audio leads video (hide effect is delayed by audioOffset)
 * - **J-Cut**: Video leads audio (show effect starts earlier by audioOffset)
 * - **Frame-Perfect Timing**: Uses instant animation ranges (prog 0 to 0.01)
 * - **Multiple Target Pairs**: Support for multiple element pairs in a single cut
 * - **Precise Timing Control**: Exact frame timing with cutFrame parameter
 *
 * Use cases:
 * - Creating seamless cuts between multiple video/image elements
 * - Implementing professional L-cut and J-cut editing techniques
 * - Building dynamic transitions with audio/video desynchronization
 * - Creating montages with precise timing control
 *
 * Technical Notes:
 * - This is an INTERNAL EFFECT PRESET (returns effect data, not components)
 * - Returns ARRAY OF EFFECTS (multiple hide/show effects for each pair)
 * - All timing is RELATIVE to parent component's timeline
 * - Uses generic effects with provider mode and targetIds
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetPairs: z
    .array(
      z.object({
        hideId: z.string().describe('ID of the element to hide'),
        showId: z.string().describe('ID of the element to show'),
      })
    )
    .describe('Array of element pairs to hide/show'),
  cutType: z
    .enum(['hard', 'L-cut', 'J-cut'])
    .describe('Type of cut: hard (simultaneous), L-cut (audio leads), or J-cut (video leads)'),
  audioOffset: z
    .number()
    .optional()
    .describe('Time offset in seconds for L/J cuts (audio/video desynchronization)'),
  cutFrame: z
    .number()
    .describe('Exact timing in seconds when the cut occurs (relative to parent timeline)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetPairs, cutType, audioOffset = 0, cutFrame } = params;

  // Instant animation duration (frame-perfect)
  const instantDuration = 0.01;

  // Create hide animation ranges (opacity 1 -> 0)
  const hideRanges = [
    { key: 'opacity', val: 1, prog: 0 },
    { key: 'opacity', val: 0, prog: 1 },
  ];

  // Create show animation ranges (opacity 0 -> 1)
  const showRanges = [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ];

  // Calculate timing offsets based on cut type
  const getHideOffset = (): number => {
    if (cutType === 'L-cut') {
      // L-cut: audio leads, video (hide) delays
      return audioOffset;
    }
    return 0;
  };

  const getShowOffset = (): number => {
    if (cutType === 'J-cut') {
      // J-cut: video leads, audio (show) starts early
      return -audioOffset;
    }
    return 0;
  };

  const hideOffset = getHideOffset();
  const showOffset = getShowOffset();

  // Create effects for each target pair
  const effects: any[] = [];

  targetPairs.forEach((pair, index) => {
    // Hide effect
    const hideEffectData: GenericEffectData = {
      type: 'linear',
      start: cutFrame + hideOffset,
      duration: instantDuration,
      mode: 'provider',
      targetIds: [pair.hideId],
      ranges: hideRanges,
    };

    const hideEffect = {
      id: `hard-cut-hide-${pair.hideId}-${index}`,
      componentId: 'generic',
      data: hideEffectData,
    };

    // Show effect
    const showEffectData: GenericEffectData = {
      type: 'linear',
      start: cutFrame + showOffset,
      duration: instantDuration,
      mode: 'provider',
      targetIds: [pair.showId],
      ranges: showRanges,
    };

    const showEffect = {
      id: `hard-cut-show-${pair.showId}-${index}`,
      componentId: 'generic',
      data: showEffectData,
    };

    effects.push(hideEffect, showEffect);
  });

  // Return effects in a container structure for extraction
  const rootContainer: RenderableComponentData = {
    id: 'hard-cut-effect-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: cutFrame + instantDuration + Math.abs(audioOffset),
      },
    },
    effects: effects,
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'hard-cut-effect',
  title: 'HardCut Internal Effect',
  description:
    'Internal effect preset that mimics professional video editing hard cuts with instant visibility changes. Supports hard cuts (simultaneous hide/show), L-cuts (audio leads - hide delays), and J-cuts (video leads - show starts early). Creates paired hide/show effects with frame-perfect timing for seamless transitions between multiple elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'hard-cut', 'l-cut', 'j-cut', 'transition', 'editing'],
  defaultInputParams: {
    targetPairs: [
      {
        hideId: 'element-1',
        showId: 'element-2',
      },
    ],
    cutType: 'hard',
    audioOffset: 0.1,
    cutFrame: 5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

// Export preset
export const hardCutEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
