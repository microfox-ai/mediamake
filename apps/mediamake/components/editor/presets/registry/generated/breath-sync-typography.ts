/**
 * Breath-Synchronized Typography Preset
 * 
 * A meditative, organic typography preset where text expands and contracts like breathing.
 * Words scale rhythmically from 0.98 to 1.02 with opacity pulsing from 0.9 to 1.0 in sync.
 * Each word is phase-offset to create a natural wave effect across the text block.
 * Words slowly drift upward 5-10px over their lifetime like warm air ascending.
 * 
 * Features:
 * - 4-second breathing cycle (2s inhale/expand, 2s exhale/contract)
 * - Phase-offset word animation for undulating wave effect
 * - Gentle vertical drift over time
 * - Natural breathing curve using cubic-bezier easing
 * - Transform origin at center bottom for natural expansion
 * 
 * Use cases:
 * - Meditative video content
 * - Calm, mindful presentations
 * - Wellness and relaxation videos
 * - Poetic or contemplative text overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to display with breath animation'),
  duration: z.number().default(10).describe('Total duration of the preset in seconds'),
  fontSize: z.number().default(48).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family name (e.g., "Inter", "Roboto")'),
  fontWeight: z.string().default('500').describe('Font weight (e.g., "400", "500", "700")'),
  textColor: z.string().default('#ffffff').describe('Text color in hex or rgba format'),
  breathCycleDuration: z.number().default(4).describe('Duration of one complete breath cycle in seconds (inhale + exhale)'),
  phaseOffset: z.number().default(0.15).describe('Time offset between each word\'s breath cycle in seconds (creates wave effect)'),
  minScale: z.number().default(0.98).describe('Minimum scale value during breathing (exhale)'),
  maxScale: z.number().default(1.02).describe('Maximum scale value during breathing (inhale)'),
  minOpacity: z.number().default(0.9).describe('Minimum opacity during breathing'),
  maxOpacity: z.number().default(1.0).describe('Maximum opacity during breathing'),
  verticalDrift: z.number().default(10).describe('Maximum vertical drift distance in pixels (upward movement)'),
  driftDuration: z.number().default(20).describe('Duration of vertical drift animation in seconds'),
  gap: z.string().default('0.75rem').describe('Gap between words (CSS value like "0.75rem" or "12px")'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    breathCycleDuration,
    phaseOffset,
    minScale,
    maxScale,
    minOpacity,
    maxOpacity,
    verticalDrift,
    driftDuration,
    gap,
  } = params;

  // Split text into words
  const words = text.split(/\s+/).filter(word => word.length > 0);

  // Create word components with breath animations
  const wordComponents = words.map((word, index) => {
    const wordId = `breath-word-${index}`;
    
    // Calculate phase offset for this word
    const wordPhaseOffset = index * phaseOffset;

    // Create breathing effect (scale + opacity)
    const breathEffect: GenericEffectData = {
      type: 'ease-in-out', // Using ease-in-out as closest to cubic-bezier(0.445, 0.05, 0.55, 0.95)
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        // Scale animation (0.98 → 1.02 → 0.98 cycle)
        { key: 'scale', val: minScale, prog: 0 },
        { key: 'scale', val: maxScale, prog: 0.5 },
        { key: 'scale', val: minScale, prog: 1 },
        // Opacity animation (0.9 → 1.0 → 0.9 cycle)
        { key: 'opacity', val: minOpacity, prog: 0 },
        { key: 'opacity', val: maxOpacity, prog: 0.5 },
        { key: 'opacity', val: minOpacity, prog: 1 },
      ],
    };

    // Create vertical drift effect
    const driftEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: driftDuration,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -verticalDrift, prog: 1 },
      ],
    };

    // Word component with effects
    return {
      id: wordId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: fontWeight,
          color: textColor,
          transformOrigin: 'center bottom',
          willChange: 'transform, opacity',
        },
        font: {
          family: fontFamily,
          weights: [fontWeight],
          display: 'swap' as const,
        },
      },
      context: {
        timing: {
          start: wordPhaseOffset, // Phase offset creates wave effect
          duration: duration - wordPhaseOffset,
        },
      },
      effects: [
        {
          id: `breath-effect-${index}`,
          componentId: 'generic',
          data: breathEffect,
        },
        {
          id: `drift-effect-${index}`,
          componentId: 'generic',
          data: driftEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Root container with flex layout
  const rootContainer = {
    id: 'breath-sync-typography-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-wrap items-center justify-center px-6',
        style: {
          width: '100%',
          height: '100%',
          gap: gap,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: wordComponents,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'breathSyncTypography',
  title: 'Breath-Synchronized Typography',
  description: 'Meditative breath-synchronized typography where words expand and contract with organic rhythm. Features natural breathing cycles (4s inhale/exhale), phase-offset word waves, subtle vertical drift, and connected biological movements. Perfect for calm, meditative video content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'breathing',
    'meditation',
    'calm',
    'organic',
    'wave',
    'drift',
    'mindfulness',
    'wellness',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Breathe in peace, breathe out calm',
    duration: 10,
    fontSize: 48,
    fontFamily: 'Inter',
    fontWeight: '500',
    textColor: '#ffffff',
    breathCycleDuration: 4,
    phaseOffset: 0.15,
    minScale: 0.98,
    maxScale: 1.02,
    minOpacity: 0.9,
    maxOpacity: 1.0,
    verticalDrift: 10,
    driftDuration: 20,
    gap: '0.75rem',
  },
};

// Export preset
export const breathSyncTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
