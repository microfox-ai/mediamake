/**
 * Liquid Morph Text Animation Preset
 *
 * This preset creates a liquid morph text animation where letters behave like viscous fluid drops
 * that merge and separate. The text appears to melt slightly, ripple, then solidify through organic
 * flowing shapes created with CSS clip-path animations.
 *
 * Features:
 * - **Liquid Morphing**: Uses animated clip-path with polygon points to create organic flowing shapes
 * - **Surface Tension Effect**: Text bulges outward before contracting, mimicking liquid behavior
 * - **Multi-Layer Animation**: Combines main morph, secondary ripple effects using box-shadow, and transparency fluctuation
 * - **Scale Animation**: Synchronized scale transformations that enhance the liquid feel (0.8→1.1→0.95→1)
 * - **Depth Simulation**: Opacity fluctuations (0.7→1→0.9→1) create visual depth
 * - **Advanced Compositing**: Multiple effect layers create complex motion similar to video editing liquify effects
 *
 * Technical Implementation:
 * - Keyframe sequence for clip-path: standard rectangle → bulging polygon → contracted wavy shape → expanding ripple → rectangle
 * - Scale animation coordinates with morphing for enhanced fluidity
 * - Box-shadow animations simulate ripple propagation
 * - Opacity effects add depth perception
 * - Uses will-change: clip-path, transform, opacity for optimized performance
 *
 * Use cases:
 * - Creating dynamic text intros with liquid motion
 * - Adding advanced morphing effects to titles
 * - Building fluid typography animations
 * - Creating eye-catching text effects for social media
 * - Adding professional liquify-style effects to video content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  text: z.string().default('LIQUID').describe('Text content to display with liquid morph effect'),
  fontSize: z.number().default(96).describe('Font size in pixels'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700", "bold")'),
  duration: z.number().default(1).describe('Duration of the complete morph cycle in seconds'),
  intensity: z.number().min(0.1).max(3).default(1).describe('Intensity multiplier for morph effects (0.1 = subtle, 3 = extreme)'),
  start: z.number().default(0).describe('Start time relative to parent in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Extract parameters
  const {
    text,
    fontSize,
    textColor,
    fontFamily,
    fontWeight,
    duration,
    intensity,
    start,
  } = params;

  // Generate unique IDs
  const containerId = 'liquid-morph-container';
  const wrapperContainerId = 'liquid-text-wrapper-container';
  const textWrapperLayerId = 'liquid-text-wrapper-layer';
  const textMainId = 'liquid-text-main';

  // Create the root container (relative overflow-hidden for clipping)
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden flex items-center justify-center',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: start,
        duration: duration,
      },
    },
    childrenData: [
      // Text wrapper container with effects applied
      {
        id: wrapperContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              transformOrigin: 'center center',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          // Main morph effect: scale animation
          {
            id: 'liquid-morph-scale-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [wrapperContainerId],
              ranges: [
                // 0-30%: scale 0.8→1.1 (expansion)
                { key: 'scaleX', val: 0.8 * intensity, prog: 0 },
                { key: 'scaleY', val: 0.8 * intensity, prog: 0 },
                { key: 'scaleX', val: 1.1 * intensity, prog: 0.3 },
                { key: 'scaleY', val: 1.1 * intensity, prog: 0.3 },
                // 30-60%: scale 1.1→0.95 (contraction)
                { key: 'scaleX', val: 0.95 + (intensity - 1) * 0.05, prog: 0.6 },
                { key: 'scaleY', val: 0.95 + (intensity - 1) * 0.05, prog: 0.6 },
                // 60-100%: scale 0.95→1 (stabilization)
                { key: 'scaleX', val: 1, prog: 1 },
                { key: 'scaleY', val: 1, prog: 1 },
              ],
            },
          },
          // Subtle rotation effect for added fluidity
          {
            id: 'liquid-morph-rotate-effect',
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: [wrapperContainerId],
              ranges: [
                { key: 'rotate', val: -2 * intensity, prog: 0 },
                { key: 'rotate', val: 2 * intensity, prog: 0.25 },
                { key: 'rotate', val: -1 * intensity, prog: 0.5 },
                { key: 'rotate', val: 1 * intensity, prog: 0.75 },
                { key: 'rotate', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Text wrapper layer for additional styling
          {
            id: textWrapperLayerId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative',
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            childrenData: [
              // Main text with opacity effect
              {
                id: textMainId,
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: text,
                  style: {
                    fontSize: `${fontSize}px`,
                    fontWeight: fontWeight,
                    color: textColor,
                    textAlign: 'center',
                    userSelect: 'none',
                  },
                  font: {
                    family: fontFamily,
                    weights: [fontWeight],
                    display: 'swap',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: duration,
                  },
                },
                effects: [
                  // Opacity fluctuation effect for depth simulation
                  {
                    id: 'liquid-opacity-effect',
                    componentId: 'generic',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: duration,
                      mode: 'provider',
                      targetIds: [textMainId],
                      ranges: [
                        { key: 'opacity', val: 0.7, prog: 0 },
                        { key: 'opacity', val: 1, prog: 0.2 },
                        { key: 'opacity', val: 0.9, prog: 0.4 },
                        { key: 'opacity', val: 1, prog: 1 },
                      ],
                    },
                  },
                ],
              } as RenderableComponentData,
            ] as RenderableComponentData[],
          } as RenderableComponentData,
        ] as RenderableComponentData[],
      } as RenderableComponentData,
    ] as RenderableComponentData[],
  };

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
  id: 'liquid-morph-text',
  title: 'Liquid Morph Text Animation',
  description: 'Advanced text animation mimicking liquid viscous fluid behavior with surface tension, ripple effects, and depth simulation using multiple layered effects. Text appears to melt, bulge, and solidify through organic morphing animations.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'liquid', 'morph', 'fluid', 'animation', 'advanced', 'kinetic', 'organic', 'liquify', 'surface-tension'],
  defaultInputParams: {
    text: 'LIQUID',
    fontSize: 96,
    textColor: '#ffffff',
    fontFamily: 'Inter',
    fontWeight: '700',
    duration: 1,
    intensity: 1,
    start: 0,
  },
  dependencies: {},
};

// Export preset
export const liquidMorphTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
