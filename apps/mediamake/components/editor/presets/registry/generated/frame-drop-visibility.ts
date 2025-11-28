/**
 * FrameDrop Instant Visibility Preset
 *
 * Simulates dropped frames in video streaming with stuttered frame-skipping artifacts.
 * Creates the effect of bandwidth issues or codec errors where frames are dropped,
 * causing instant visibility changes with temporal artifacts.
 *
 * Features:
 * - **Drop Pattern Configuration**: Define frame visibility pattern (1=visible, 0=dropped)
 * - **Buffer Glitch Simulation**: Adds loading state visual with rotation during drops
 * - **Codec Artifacts**: Simulates compression artifacts with contrast/brightness shifts
 * - **Recovery Time Control**: Configurable duration for the frame drop effect sequence
 *
 * Use Cases:
 * - Found footage aesthetic
 * - Streaming content simulation
 * - Glitch art visuals
 * - Technical error effects
 * - Lo-fi/retro video aesthetics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply frame drop effect to'),
  dropPattern: z
    .array(z.number())
    .default([1, 0, 0, 1, 0, 1, 1])
    .describe(
      'Frame visibility pattern where 1=visible, 0=dropped. Example: [1,0,0,1,0,1,1] creates a stuttered drop sequence',
    ),
  bufferGlitch: z
    .boolean()
    .default(false)
    .describe('Enable loading spinner simulation during dropped frames'),
  codecArtifacts: z
    .boolean()
    .default(true)
    .describe('Enable compression artifact simulation (contrast/brightness shifts)'),
  recoveryTime: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.6)
    .describe('Total duration of the frame drop effect sequence in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { targetIds, dropPattern, bufferGlitch, codecArtifacts, recoveryTime } =
    params;

  // Helper function to create frame drop effect ranges
  const createDropRanges = (): GenericEffectData['ranges'] => {
    const ranges: GenericEffectData['ranges'] = [];
    const patternLength = dropPattern.length;

    dropPattern.forEach((visible, index) => {
      const progress = index / patternLength;
      ranges.push({
        key: 'opacity',
        val: visible,
        prog: progress,
      });
    });

    // Add final frame to complete the pattern
    ranges.push({
      key: 'opacity',
      val: dropPattern[dropPattern.length - 1],
      prog: 1,
    });

    return ranges;
  };

  // Helper function to create codec artifact ranges
  const createArtifactRanges = (): GenericEffectData['ranges'] => {
    if (!codecArtifacts) return [];

    const ranges: GenericEffectData['ranges'] = [];
    const patternLength = dropPattern.length;

    // Add compression artifacts during dropped frames
    dropPattern.forEach((visible, index) => {
      const progress = index / patternLength;

      if (visible === 0) {
        // During dropped frames, add compression artifacts
        ranges.push({
          key: 'filter',
          val: 'contrast(50%) brightness(120%)',
          prog: progress,
        });
      } else {
        // During visible frames, clear artifacts
        ranges.push({
          key: 'filter',
          val: 'none',
          prog: progress,
        });
      }
    });

    // Final state - clear artifacts
    ranges.push({
      key: 'filter',
      val: 'none',
      prog: 1,
    });

    return ranges;
  };

  // Helper function to create buffer glitch rotation ranges
  const createBufferGlitchRanges = (): GenericEffectData['ranges'] => {
    if (!bufferGlitch) return [];

    const ranges: GenericEffectData['ranges'] = [];
    const patternLength = dropPattern.length;

    // Track cumulative rotation during drops
    let currentRotation = 0;

    dropPattern.forEach((visible, index) => {
      const progress = index / patternLength;

      if (visible === 0) {
        // During dropped frames, rotate (loading spinner effect)
        currentRotation += 720 / patternLength; // Distribute rotation across drops
        ranges.push({
          key: 'rotate',
          val: currentRotation,
          prog: progress,
        });
      } else {
        // During visible frames, maintain rotation
        ranges.push({
          key: 'rotate',
          val: currentRotation,
          prog: progress,
        });
      }
    });

    // Final rotation state
    ranges.push({
      key: 'rotate',
      val: currentRotation,
      prog: 1,
    });

    return ranges;
  };

  // Create combined effect ranges
  const dropRanges = createDropRanges();
  const artifactRanges = createArtifactRanges();
  const bufferGlitchRanges = createBufferGlitchRanges();

  // Combine all ranges
  const combinedRanges = [...dropRanges, ...artifactRanges, ...bufferGlitchRanges];

  // Create the frame drop effect
  const frameDropEffect = {
    id: 'frame-drop-effect',
    componentId: 'generic',
    data: {
      type: 'linear',
      start: 0,
      duration: recoveryTime,
      mode: 'provider',
      targetIds: targetIds,
      ranges: combinedRanges,
    } as GenericEffectData,
  };

  // Root container structure
  const rootContainer: RenderableComponentData = {
    id: 'frame-drop-root',
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
        duration: recoveryTime,
      },
    },
    effects: [frameDropEffect],
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
  id: 'frame-drop-visibility',
  title: 'FrameDrop Instant Visibility Preset',
  description:
    'Simulates dropped frames in video streaming with stuttered frame-skipping artifacts. Creates the effect of bandwidth issues or codec errors where frames are dropped, causing instant visibility changes with temporal artifacts. Features configurable drop patterns, buffer glitch simulation, codec artifact effects, and recovery time. Perfect for found footage, streaming content, or glitch art aesthetics.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'glitch',
    'frame-drop',
    'streaming',
    'artifact',
    'visibility',
    'temporal',
    'codec',
    'buffer',
    'found-footage',
  ],
  defaultInputParams: {
    targetIds: ['component-1'],
    dropPattern: [1, 0, 0, 1, 0, 1, 1],
    bufferGlitch: false,
    codecArtifacts: true,
    recoveryTime: 0.6,
  },
  dependencies: {},
};

// Export preset
export const frameDropVisibilityPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
