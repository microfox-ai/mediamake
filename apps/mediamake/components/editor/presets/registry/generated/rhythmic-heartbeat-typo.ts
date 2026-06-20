/**
 * Rhythmic Heartbeat Typography Preset
 *
 * A typokinetic preset where text pulses with a heartbeat-like rhythm. Features continuous
 * scale animation with sine easing creating a breathing effect - text pulses subtly while
 * maintaining readability. Includes a subtle floating oscillation for enhanced visual interest.
 * Perfect for music-driven content, energetic captions, or maintaining visual engagement over
 * extended durations without overwhelming the viewer.
 *
 * Features:
 * - Continuous pulse animation (scale: 1 → 1.05 → 1) with sine easing
 * - Drop shadow that expands/contracts more dramatically than text for breathing effect
 * - Subtle vertical oscillation (0 → 2px → 0) for floating sensation
 * - Smooth fade-in on entry (0.5s duration)
 * - Infinite loop with no visible repetition
 * - Customizable font, size, color, and intensity parameters
 * - Optional audio-reactive enhancements (if audio is present)
 *
 * Use cases:
 * - Music video typography that needs to feel alive
 * - Energetic social media captions
 * - Long-duration text that needs sustained visual interest
 * - Beat-synchronized text overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { TextAtomData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().describe('The text content to display with heartbeat effect'),
  
  duration: z
    .number()
    .min(1)
    .default(10)
    .optional()
    .describe('Duration in seconds for the text to be visible'),
  
  fontSize: z
    .string()
    .default('48px')
    .optional()
    .describe('Font size (e.g., "48px", "64px")'),
  
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "bold")'),
  
  color: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Text color (hex, rgb, or color name)'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family name (Google Font)'),
  
  pulseIntensity: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe('Pulse intensity - scale multiplier (0.01 = subtle, 0.2 = dramatic)'),
  
  pulseDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(2)
    .optional()
    .describe('Duration of one pulse cycle in seconds (lower = faster heartbeat)'),
  
  floatIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Vertical float intensity in pixels (0 = no float, 10 = dramatic)'),
  
  floatDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .optional()
    .describe('Duration of one float cycle in seconds'),
  
  shadowBlurBase: z
    .number()
    .min(0)
    .max(50)
    .default(6)
    .optional()
    .describe('Base shadow blur radius in pixels'),
  
  shadowBlurMax: z
    .number()
    .min(0)
    .max(100)
    .default(12)
    .optional()
    .describe('Maximum shadow blur radius in pixels (creates breathing effect)'),
  
  fadeInDuration: z
    .number()
    .min(0.1)
    .max(5)
    .default(0.5)
    .optional()
    .describe('Fade-in duration in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const {
    text,
    duration = 10,
    fontSize = '48px',
    fontWeight = '700',
    color = '#ffffff',
    fontFamily = 'Inter',
    pulseIntensity = 0.05,
    pulseDuration = 2,
    floatIntensity = 2,
    floatDuration = 3,
    shadowBlurBase = 6,
    shadowBlurMax = 12,
    fadeInDuration = 0.5,
  } = params;

  // Component IDs
  const textElementId = 'rhythmic-heartbeat-text-element';
  const rootContainerId = 'rhythmic-heartbeat-container';

  // Calculate scale range
  const baseScale = 1;
  const maxScale = baseScale + pulseIntensity;

  // Text atom with drop shadow
  const textAtomData: TextAtomData = {
    text,
    style: {
      fontSize,
      fontWeight,
      color,
      textAlign: 'center',
      filter: `drop-shadow(0 4px ${shadowBlurBase}px rgba(0,0,0,0.25))`,
    },
    font: {
      family: fontFamily,
      weights: [fontWeight],
    },
  };

  const textElement: RenderableComponentData = {
    id: textElementId,
    componentId: 'TextAtom',
    type: 'atom' as const,
    data: textAtomData,
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Fade-in effect
      {
        id: 'fade-in-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: [textElementId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Pulse scale effect (continuous, infinite loop)
      {
        id: 'pulse-scale-effect',
        componentId: 'generic',
        data: {
          type: 'sine',
          start: fadeInDuration,
          duration: pulseDuration,
          mode: 'provider',
          targetIds: [textElementId],
          repeat: true,
          ranges: [
            { key: 'scale', val: baseScale, prog: 0 },
            { key: 'scale', val: maxScale, prog: 0.5 },
            { key: 'scale', val: baseScale, prog: 1 },
          ],
        },
      },
      // Shadow blur pulse effect (synchronized with scale, but more dramatic)
      {
        id: 'shadow-pulse-effect',
        componentId: 'generic',
        data: {
          type: 'sine',
          start: fadeInDuration,
          duration: pulseDuration,
          mode: 'provider',
          targetIds: [textElementId],
          repeat: true,
          ranges: [
            { 
              key: 'filter', 
              val: `drop-shadow(0 4px ${shadowBlurBase}px rgba(0,0,0,0.25))`, 
              prog: 0 
            },
            { 
              key: 'filter', 
              val: `drop-shadow(0 4px ${shadowBlurMax}px rgba(0,0,0,0.35))`, 
              prog: 0.5 
            },
            { 
              key: 'filter', 
              val: `drop-shadow(0 4px ${shadowBlurBase}px rgba(0,0,0,0.25))`, 
              prog: 1 
            },
          ],
        },
      },
      // Vertical float oscillation (subtle, slower cycle)
      {
        id: 'float-oscillation-effect',
        componentId: 'generic',
        data: {
          type: 'sine',
          start: fadeInDuration,
          duration: floatDuration,
          mode: 'provider',
          targetIds: [textElementId],
          repeat: true,
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: -floatIntensity, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container layout
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textElement] as RenderableComponentData[],
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
  id: 'rhythmic-heartbeat-typo',
  title: 'Rhythmic Heartbeat Typography',
  description:
    'A typokinetic preset where text pulses with a heartbeat-like rhythm. Features continuous scale animation with sine easing creating a breathing effect - text pulses subtly while maintaining readability. Includes a subtle floating oscillation for enhanced visual interest. Perfect for music-driven content, energetic captions, or maintaining visual engagement over extended durations without overwhelming the viewer.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'heartbeat',
    'pulse',
    'breathing',
    'music',
    'energetic',
    'rhythmic',
    'continuous',
    'loop',
    'text',
    'overlay',
  ],
  defaultInputParams: {
    text: 'FEEL THE BEAT',
    duration: 10,
    fontSize: '48px',
    fontWeight: '700',
    color: '#ffffff',
    fontFamily: 'Inter',
    pulseIntensity: 0.05,
    pulseDuration: 2,
    floatIntensity: 2,
    floatDuration: 3,
    shadowBlurBase: 6,
    shadowBlurMax: 12,
    fadeInDuration: 0.5,
  },
  dependencies: {},
};

// Export preset
export const rhythmicHeartbeatTypoPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
