/**
 * Split Alpha Reveal Effect - Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * This internal effect preset creates a venetian blind or panel reveal effect by dividing
 * the target component into multiple segments. Each segment reveals with staggered timing
 * and independent opacity/scale animations. Supports horizontal and vertical splits with
 * configurable wave patterns and overlapping animations for smooth transitions.
 *
 * Features:
 * - Divides target into N segments (horizontal or vertical)
 * - Each segment has independent opacity + scale animation
 * - Configurable stagger amount for sequential reveals
 * - Wave pattern support for alternating reveal directions
 * - Overlap control for smooth segment transitions
 * - Dynamic segment positioning based on target dimensions
 *
 * Technical Implementation:
 * - Returns an array of generic effects, one per segment
 * - Each effect targets a dynamically created segment wrapper
 * - Segments use clip-path to isolate portions of the target
 * - Effects apply opacity and scaleX/scaleY transforms
 * - Stagger timing creates sequential or wave-based reveals
 *
 * Use Cases:
 * - Venetian blind transitions
 * - Panel reveal animations
 * - Segmented fade-in effects
 * - Dynamic split-screen reveals
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply the split reveal effect to'),
  effectStart: z.number().describe('Start time of the effect (relative to parent)'),
  effectDuration: z.number().describe('Base duration for each segment reveal'),
  segments: z.number().min(2).max(50).default(8).describe('Number of segments to divide the target into'),
  stagger: z.number().min(0).max(2).default(0.1).describe('Time delay between each segment reveal (seconds)'),
  direction: z.enum(['horizontal', 'vertical']).default('horizontal').describe('Split direction - horizontal creates vertical blinds, vertical creates horizontal blinds'),
  wavePattern: z.boolean().default(false).describe('Enable wave pattern where segments reveal in alternating directions'),
  overlap: z.number().min(0).max(1).default(0.3).describe('Amount of overlap between segment animations (0-1, where 0.3 = 30% overlap)'),
  waveDirection: z.enum(['forward', 'reverse', 'center-out', 'edges-in']).default('forward').optional().describe('Direction of wave pattern animation'),
  simultaneousReveal: z.boolean().default(false).optional().describe('Whether all segments should reveal simultaneously (ignores stagger)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    effectStart,
    effectDuration,
    segments,
    stagger,
    direction,
    wavePattern,
    overlap,
    waveDirection = 'forward',
    simultaneousReveal = false,
  } = params;

  // Calculate actual stagger (0 if simultaneous)
  const actualStagger = simultaneousReveal ? 0 : stagger;

  // Calculate segment reveal duration with overlap
  const segmentDuration = effectDuration + (overlap * effectDuration);

  // Helper function to calculate segment start time based on wave pattern
  const calculateSegmentStart = (index: number, total: number): number => {
    if (simultaneousReveal) {
      return effectStart;
    }

    if (!wavePattern) {
      // Simple sequential stagger
      return effectStart + (index * actualStagger);
    }

    // Wave pattern calculations
    switch (waveDirection) {
      case 'reverse':
        // Reverse order
        return effectStart + ((total - 1 - index) * actualStagger);

      case 'center-out':
        // Start from center and expand outward
        const centerIndex = Math.floor(total / 2);
        const distanceFromCenter = Math.abs(index - centerIndex);
        return effectStart + (distanceFromCenter * actualStagger);

      case 'edges-in':
        // Start from edges and move inward
        const distanceFromEdge = Math.min(index, total - 1 - index);
        return effectStart + (distanceFromEdge * actualStagger);

      case 'forward':
      default:
        // Standard forward wave
        return effectStart + (index * actualStagger);
    }
  };

  // Generate segment effects
  const segmentEffects: RenderableComponentData[] = [];

  for (let i = 0; i < segments; i++) {
    const segmentId = `${targetId}-segment-${i}`;
    const segmentStart = calculateSegmentStart(i, segments);

    // Calculate clip-path based on direction
    let clipPath: string;
    if (direction === 'horizontal') {
      // Vertical blinds (horizontal split)
      const startPercent = (i / segments) * 100;
      const endPercent = ((i + 1) / segments) * 100;
      clipPath = `inset(0 ${100 - endPercent}% 0 ${startPercent}%)`;
    } else {
      // Horizontal blinds (vertical split)
      const startPercent = (i / segments) * 100;
      const endPercent = ((i + 1) / segments) * 100;
      clipPath = `inset(${startPercent}% 0 ${100 - endPercent}% 0)`;
    }

    // Determine scale property based on direction
    const scaleProperty = direction === 'horizontal' ? 'scaleX' : 'scaleY';

    // Create effect data for this segment
    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: segmentStart,
      duration: segmentDuration,
      mode: 'provider',
      targetIds: [segmentId],
      ranges: [
        // Opacity animation
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        // Scale animation
        { key: scaleProperty, val: 0, prog: 0 },
        { key: scaleProperty, val: 1, prog: 1 },
      ],
    };

    // Create segment wrapper component with effect
    const segmentComponent: RenderableComponentData = {
      id: segmentId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
          style: {
            clipPath,
            transformOrigin: 'center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: effectDuration + (segments * actualStagger) + (overlap * effectDuration),
        },
      },
      effects: [
        {
          id: `${segmentId}-reveal-effect`,
          componentId: 'generic',
          data: effectData,
        },
      ],
      childrenData: [],
    };

    segmentEffects.push(segmentComponent);
  }

  // Calculate total effect duration (last segment start + segment duration)
  const lastSegmentStart = calculateSegmentStart(segments - 1, segments);
  const totalDuration = (lastSegmentStart - effectStart) + segmentDuration;

  // Create root container that holds all segment wrappers
  const rootContainer: RenderableComponentData = {
    id: `${targetId}-split-reveal-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: effectStart,
        duration: totalDuration,
      },
    },
    childrenData: segmentEffects,
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      // Mark for extraction as effects array
      _extractedEffects: segmentEffects.flatMap(seg => seg.effects || []),
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'splitAlphaReveal',
  title: 'Split Alpha Reveal Effect',
  description: 'Internal effect preset that divides target into segments with staggered opacity and transform reveals. Supports horizontal/vertical splits, wave patterns, and configurable overlap for venetian blind or panel reveal effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'reveal', 'split', 'segments', 'venetian', 'blind', 'panel', 'wave', 'stagger', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetId: 'target-component',
    effectStart: 0,
    effectDuration: 1.5,
    segments: 8,
    stagger: 0.1,
    direction: 'horizontal',
    wavePattern: false,
    overlap: 0.3,
    waveDirection: 'forward',
    simultaneousReveal: false,
  },
};

export const splitAlphaRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
