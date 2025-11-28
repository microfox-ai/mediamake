/**
 * TypewriterGhost Internal Effect Preset
 *
 * Creates an ethereal typewriter effect for text elements without animating individual characters.
 * Uses opacity, letter-spacing, horizontal scale, and text-shadow to simulate a ghostly typing illusion.
 *
 * SINGLE EFFECT:
 * Applies a composite animation that:
 * - Fades in opacity from 0 to the specified ghostOpacity level
 * - Pulses letter-spacing from compressed (negative) to normal
 * - Scales horizontally from 0.95 to 1
 * - Grows text-shadow for enhanced ghostly appearance
 *
 * Usage:
 * This internal effect preset is designed to be called by other presets for text animation.
 * It provides parameters for customizing the typing speed, letter-spacing range, and final opacity.
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Input parameters schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the effect to'),
  typeSpeed: z
    .number()
    .min(100)
    .max(5000)
    .default(1000)
    .optional()
    .describe('Duration of the typing effect in milliseconds (default: 1000ms)'),
  letterSpacingRange: z
    .number()
    .min(-10)
    .max(0)
    .default(-3)
    .optional()
    .describe(
      'Starting letter-spacing value (negative for compressed, default: -3px)',
    ),
  ghostOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.9)
    .optional()
    .describe(
      'Final opacity level for the text, allowing semi-transparent results (0-1, default: 0.9)',
    ),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID (auto-generated if not provided)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters with defaults
  const typeSpeed = params.typeSpeed ?? 1000;
  const letterSpacingRange = params.letterSpacingRange ?? -3;
  const ghostOpacity = params.ghostOpacity ?? 0.9;
  const targetIds = params.targetIds;

  // Convert typeSpeed from milliseconds to seconds
  const durationInSeconds = typeSpeed / 1000;

  // Generate unique effect ID
  const effectId =
    params.effectId || `typewriter-ghost-${targetIds.join('-')}-${Date.now()}`;

  // Construct the generic effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: durationInSeconds,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      // Opacity: fade in from 0 to ghostOpacity
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: ghostOpacity, prog: 1 },
      // Letter-spacing: pulse from compressed to normal
      { key: 'letterSpacing', val: letterSpacingRange, prog: 0 },
      { key: 'letterSpacing', val: 0, prog: 0.7 },
      // ScaleX: subtle horizontal scale from 0.95 to 1
      { key: 'scaleX', val: 0.95, prog: 0 },
      { key: 'scaleX', val: 1, prog: 1 },
      // Text-shadow: grow from transparent to subtle white glow
      { key: 'textShadow', val: '0 0 0px rgba(255,255,255,0)', prog: 0 },
      { key: 'textShadow', val: '0 0 20px rgba(255,255,255,0.3)', prog: 1 },
    ],
  };

  // Create the effect node
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };

  // Return effect in container structure for extraction
  return {
    output: {
      childrenData: [
        {
          id: 'typewriter-ghost-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: durationInSeconds,
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typewriter-ghost-effect',
  title: 'TypewriterGhost Effect',
  description:
    'An internal effect preset for text elements that simulates an ethereal typewriter effect. Uses opacity fade-in, letter-spacing pulse (from compressed negative values to normal), subtle horizontal scale, and growing text-shadow to create a ghostly typing illusion without animating individual characters. Returns effect definitions to be applied to target text components via mode: provider and targetIds pattern. Configurable via typeSpeed (ms), letterSpacingRange (negative start value), and ghostOpacity (final opacity 0-1).',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'text', 'typewriter', 'ghost', 'ethereal', 'internal'],
  // Mark as internal preset
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetIds: ['text-component-1'],
    typeSpeed: 1000,
    letterSpacingRange: -3,
    ghostOpacity: 0.9,
  },
};

// Export preset object
export const typewriterGhostEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
