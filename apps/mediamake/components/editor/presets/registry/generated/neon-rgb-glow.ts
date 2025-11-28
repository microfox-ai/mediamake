/**
 * Neon RGB Glow Internal Effect Preset
 *
 * Creates a cyberpunk-style neon glow effect with separated RGB color channels emanating from target elements.
 * Each color channel has its own glow radius and intensity, creating layered neon light bleeding.
 * Uses multiple text-shadow or box-shadow layers for each RGB component with different blur radii and offsets.
 * The effect animates the glow intensity and channel separation in a breathing pattern.
 *
 * Features:
 * - **Separated RGB Channels**: Each color channel (R, G, B) has independent glow radius and intensity
 * - **Layered Neon Light**: Multiple shadow layers create realistic neon light bleeding
 * - **Breathing Animation**: Glow intensity and channel separation animate in a pulsating pattern
 * - **Optional Electric Flicker**: Adds random flicker for realistic neon effect
 * - **Customizable Parameters**: Control glow radius, channel intensity, breathing speed, and flicker
 *
 * Use cases:
 * - Cyberpunk-style title effects
 * - Neon-themed UI elements
 * - Futuristic text overlays
 * - Sci-fi visual effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

// Define input parameters with Zod schema
const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the neon glow effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  effectDuration: z
    .number()
    .default(2.5)
    .describe('Duration of the effect (seconds) - also controls breathing speed'),
  glowRadius: z
    .number()
    .min(5)
    .max(100)
    .default(30)
    .describe('Maximum glow distance in pixels'),
  channelIntensity: z
    .array(z.number().min(0).max(1))
    .length(3)
    .default([0.8, 0.7, 0.8])
    .describe('Array of intensities for R, G, B channels (0-1)'),
  breathingSpeed: z
    .number()
    .min(0.5)
    .max(10)
    .default(2.5)
    .optional()
    .describe('Pulsation rate in seconds (overrides effectDuration if provided)'),
  electricFlicker: z
    .boolean()
    .default(false)
    .describe('Adds random flicker for realistic neon effect'),
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID, defaults to neon-rgb-glow-{targetId}'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to create RGB shadow layers
  const createRGBShadowLayers = (
    radius: number,
    intensities: number[],
    separationMultiplier: number,
  ): string => {
    const [rIntensity, gIntensity, bIntensity] = intensities;
    const baseRadius = radius * separationMultiplier;
    
    // Red channel - multiple layers with increasing blur
    const redLayers = [
      `0 0 ${baseRadius * 0.3}px rgba(255,0,0,${rIntensity * 0.9})`,
      `${separationMultiplier * 2}px ${separationMultiplier * 2}px ${baseRadius * 0.6}px rgba(255,0,0,${rIntensity * 0.7})`,
      `${separationMultiplier * 3}px ${separationMultiplier * 3}px ${baseRadius}px rgba(255,0,0,${rIntensity * 0.5})`,
    ];
    
    // Green channel - offset in opposite direction
    const greenLayers = [
      `0 0 ${baseRadius * 0.4}px rgba(0,255,0,${gIntensity * 0.9})`,
      `${-separationMultiplier * 2}px ${-separationMultiplier * 2}px ${baseRadius * 0.7}px rgba(0,255,0,${gIntensity * 0.7})`,
      `${-separationMultiplier * 3}px ${-separationMultiplier * 3}px ${baseRadius * 1.1}px rgba(0,255,0,${gIntensity * 0.5})`,
    ];
    
    // Blue channel - different offset pattern
    const blueLayers = [
      `0 0 ${baseRadius * 0.5}px rgba(0,0,255,${bIntensity * 0.9})`,
      `${separationMultiplier}px ${-separationMultiplier * 2}px ${baseRadius * 0.8}px rgba(0,0,255,${bIntensity * 0.7})`,
      `${separationMultiplier * 2}px ${-separationMultiplier * 3}px ${baseRadius * 1.2}px rgba(0,0,255,${bIntensity * 0.5})`,
    ];
    
    return [...redLayers, ...greenLayers, ...blueLayers].join(', ');
  };

  // Extract parameters
  const glowRadius = params.glowRadius ?? 30;
  const channelIntensity = params.channelIntensity ?? [0.8, 0.7, 0.8];
  const breathingSpeed = params.breathingSpeed ?? params.effectDuration ?? 2.5;
  const electricFlicker = params.electricFlicker ?? false;
  
  // Create animation ranges for breathing effect
  const ranges: any[] = [];
  
  // Breathing pattern: min glow -> max glow -> min glow
  // Minimum state (prog: 0 and 1)
  const minShadow = createRGBShadowLayers(glowRadius * 0.5, channelIntensity.map(i => i * 0.6), 0.5);
  
  // Maximum state (prog: 0.5)
  const maxShadow = createRGBShadowLayers(glowRadius, channelIntensity, 1);
  
  ranges.push(
    { key: 'textShadow', val: minShadow, prog: 0 },
    { key: 'textShadow', val: maxShadow, prog: 0.5 },
    { key: 'textShadow', val: minShadow, prog: 1 },
  );
  
  // Also animate box-shadow for non-text elements
  ranges.push(
    { key: 'boxShadow', val: minShadow, prog: 0 },
    { key: 'boxShadow', val: maxShadow, prog: 0.5 },
    { key: 'boxShadow', val: minShadow, prog: 1 },
  );
  
  // Add electric flicker if enabled
  if (electricFlicker) {
    // Add rapid opacity changes at specific progress points for flicker effect
    const flickerPoints = [0.15, 0.17, 0.35, 0.37, 0.65, 0.67, 0.85, 0.87];
    
    flickerPoints.forEach((prog, index) => {
      const flickerIntensity = index % 2 === 0 ? 0.7 : 1;
      ranges.push(
        { key: 'opacity', val: flickerIntensity, prog: prog }
      );
    });
    
    // Ensure opacity returns to normal at keyframes
    ranges.push(
      { key: 'opacity', val: 1, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.5 },
      { key: 'opacity', val: 1, prog: 1 },
    );
  }
  
  // Add subtle brightness filter for enhanced glow
  ranges.push(
    { key: 'filter', val: 'brightness(1)', prog: 0 },
    { key: 'filter', val: 'brightness(1.15)', prog: 0.5 },
    { key: 'filter', val: 'brightness(1)', prog: 1 },
  );
  
  // Construct effect data
  const effectData: GenericEffectData = {
    type: 'ease-in-out',
    start: params.effectStart,
    duration: breathingSpeed,
    mode: 'provider',
    targetIds: params.targetIds,
    ranges: ranges,
  };
  
  // Generate effect ID
  const effectId = params.effectId || `neon-rgb-glow-${params.targetIds.join('-')}`;
  
  // Create effect object
  const effect = {
    id: effectId,
    componentId: 'generic',
    data: effectData,
  };
  
  return {
    output: {
      childrenData: [
        {
          id: 'neon-rgb-glow-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: [effect],
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: 10,
            },
          },
          data: {
            containerProps: {
              className: 'absolute inset-0 pointer-events-none',
              style: {
                zIndex: 0,
              },
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

const presetMetadata: PresetMetadata = {
  id: 'neon-rgb-glow',
  title: 'Neon RGB Glow Effect',
  description:
    'Internal effect preset that creates a cyberpunk-style neon glow with separated RGB color channels emanating from target elements. Each channel has its own glow radius and intensity, creating layered neon light bleeding. Includes breathing pattern animation and optional electric flicker for realistic neon effects. Perfect for cyberpunk titles and UI elements.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'neon', 'glow', 'rgb', 'cyberpunk', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    effectStart: 0,
    effectDuration: 2.5,
    glowRadius: 30,
    channelIntensity: [0.8, 0.7, 0.8],
    breathingSpeed: 2.5,
    electricFlicker: false,
  },
};

export const neonRgbGlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
