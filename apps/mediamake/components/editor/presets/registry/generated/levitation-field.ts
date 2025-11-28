/**
 * Levitation Field Internal Effect Preset
 *
 * ARRAY OF EFFECTS:
 * Simulates anti-gravity hovering with slow rotation and vertical oscillation.
 * Returns an array of modular effect definitions that create a zero-gravity floating illusion.
 *
 * Features:
 * - Vertical oscillation (translateY sine wave pattern) for hovering motion
 * - Continuous rotation (0-360° linear progression) for gentle spinning
 * - Subtle scale pulsing (0.95-1.05) to enhance floating effect
 * - Optional audio reactivity (treble frequencies trigger upward boosts)
 *
 * Use Cases:
 * - Futuristic UI elements floating in space-themed interfaces
 * - Weightless product displays in zero-gravity environments
 * - Cosmic or sci-fi content with anti-gravity aesthetics
 * - Audio-reactive floating elements riding on sound waves
 *
 * Technical Details:
 * - Base hover cycle: 6000ms (6 seconds) for complete oscillation
 * - Rotation cycle: Calculated as 60000/rotationSpeed ms for full 360° rotation
 * - Scale pulse: Synced with hover cycle for cohesive floating motion
 * - Audio boost: Vertical translation boost triggered by treble frequencies (optional)
 *
 * @param hoverAmplitude - Vertical oscillation distance in pixels
 * @param rotationSpeed - Rotation speed in revolutions per minute (RPM)
 * @param includeAudioBoost - Enable audio-reactive upward boosts
 * @param scaleAmount - Scale variation amount (e.g., 0.05 = 0.95-1.05 scale range)
 * @param targetId - ID of the component to apply levitation effect
 * @param audioSrc - Audio source URL (required if includeAudioBoost is true)
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  targetId: z.string().describe('ID of the component to apply levitation effect to'),
  hoverAmplitude: z
    .number()
    .min(5)
    .max(100)
    .default(20)
    .describe('Vertical oscillation distance in pixels (hover height variation)'),
  rotationSpeed: z
    .number()
    .min(1)
    .max(60)
    .default(10)
    .describe('Rotation speed in revolutions per minute (RPM)'),
  includeAudioBoost: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive upward boosts triggered by treble frequencies'),
  scaleAmount: z
    .number()
    .min(0.01)
    .max(0.2)
    .default(0.05)
    .describe('Scale variation amount (e.g., 0.05 = 0.95-1.05 scale range)'),
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL (required if includeAudioBoost is true)'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the levitation effect (relative to parent)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the levitation effect in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetId,
    hoverAmplitude,
    rotationSpeed,
    includeAudioBoost,
    scaleAmount,
    audioSrc,
    effectStart,
    effectDuration,
  } = params;

  // Validate audio source if audio boost is enabled
  if (includeAudioBoost && !audioSrc) {
    throw new Error(
      'audioSrc is required when includeAudioBoost is true for levitation-field effect',
    );
  }

  const effects = [];

  // Base hover cycle duration (6 seconds for complete vertical oscillation)
  const hoverCycleDuration = 6;

  // Calculate rotation duration based on RPM
  // rotationSpeed is in RPM (revolutions per minute)
  // Duration for one full 360° rotation = 60 seconds / rotationSpeed
  const rotationDuration = 60 / rotationSpeed;

  // 1. Vertical Oscillation Effect (translateY sine wave pattern)
  // Creates the hovering/bobbing motion
  effects.push({
    id: `levitation-hover-${targetId}`,
    componentId: 'generic',
    data: {
      type: 'linear', // Linear for smooth sine wave pattern
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Sine wave pattern: start at 0, peak at 0.25, return to 0 at 0.5, trough at 0.75, return to 0 at 1.0
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -hoverAmplitude, prog: 0.25 }, // Rise up
        { key: 'translateY', val: 0, prog: 0.5 }, // Return to center
        { key: 'translateY', val: hoverAmplitude, prog: 0.75 }, // Dip down
        { key: 'translateY', val: 0, prog: 1 }, // Return to center
      ],
    },
  });

  // 2. Continuous Rotation Effect (0-360° linear progression)
  // Creates the gentle spinning motion
  effects.push({
    id: `levitation-rotation-${targetId}`,
    componentId: 'generic',
    data: {
      type: 'linear', // Linear for constant rotation speed
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: 360, prog: 1 }, // Full 360° rotation
      ],
    },
  });

  // 3. Subtle Scale Pulsing Effect (0.95-1.05)
  // Enhances the floating illusion with breathing motion
  const minScale = 1 - scaleAmount;
  const maxScale = 1 + scaleAmount;

  effects.push({
    id: `levitation-scale-pulse-${targetId}`,
    componentId: 'generic',
    data: {
      type: 'ease-in-out', // Ease for smooth breathing effect
      start: effectStart,
      duration: effectDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: maxScale, prog: 0.25 }, // Scale up
        { key: 'scale', val: 1, prog: 0.5 }, // Return to normal
        { key: 'scale', val: minScale, prog: 0.75 }, // Scale down
        { key: 'scale', val: 1, prog: 1 }, // Return to normal
      ],
    },
  });

  // 4. Optional Audio-Reactive Boost (treble frequencies)
  // Adds vertical translation boost triggered by treble frequencies
  if (includeAudioBoost && audioSrc) {
    effects.push({
      id: `levitation-audio-boost-${targetId}`,
      componentId: 'waveform',
      data: {
        audioSrc: audioSrc,
        audioProperty: 'treble', // React to treble frequencies
        effectType: 'translateY', // Vertical translation
        sensitivity: 0.4, // Sensitivity to audio
        threshold: 0.2, // Minimum threshold to trigger boost
        intensity: hoverAmplitude * 0.3, // Boost intensity (30% of hover amplitude)
        numberOfSamples: 128,
        useFrequencyData: true,
        mode: 'provider',
        targetIds: [targetId],
        start: effectStart,
        duration: effectDuration,
        smoothNormalisation: 1,
      },
    });
  }

  // Return effects in a container structure
  // System will extract effects based on _internalPresetOutput: 'effects'
  const rootContainer = {
    id: 'levitation-field-effect-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none', // Allow interaction with underlying elements
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: effectDuration,
      },
    },
    effects: effects,
    childrenData: [],
  } as RenderableComponentData;

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
  id: 'levitation-field',
  title: 'Levitation Field Effect',
  description:
    'Internal effect preset that simulates anti-gravity hovering with slow rotation and vertical oscillation. Combines translateY oscillation (sine wave bobbing), continuous rotation (0-360° linear), and subtle scale pulsing (0.95-1.05) to create a zero-gravity floating illusion. Optional audio reactivity allows treble frequencies to trigger upward boosts. Returns an array of modular effect definitions for flexible composition. Parameters: hoverAmplitude (px), rotationSpeed (rpm), includeAudioBoost (boolean), scaleAmount (number).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'levitation', 'hover', 'float', 'rotation', 'anti-gravity', 'zero-gravity', 'audio-reactive'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetId: 'component-1',
    hoverAmplitude: 20,
    rotationSpeed: 10,
    includeAudioBoost: false,
    scaleAmount: 0.05,
    effectStart: 0,
    effectDuration: 10,
  },
};

// Export preset
export const levitationFieldPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
