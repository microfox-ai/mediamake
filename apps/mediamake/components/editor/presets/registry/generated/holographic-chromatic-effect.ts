/**
 * Holographic Chromatic Effect Preset
 *
 * Creates an iridescent color-shifting holographic effect that simulates viewing angle changes
 * with rainbow reflections sweeping across surfaces. The effect combines hue-rotation, 
 * metallic sheen gradients, and interference patterns to create a convincing holographic 
 * sticker or security foil appearance.
 *
 * Features:
 * - **Iridescent Color Shifts**: Smooth hue-rotation cycling through the color spectrum
 * - **Rainbow Reflections**: Animated gradients that sweep across the surface
 * - **Metallic Sheen**: Adjustable metallic finish with dynamic highlights
 * - **Interference Patterns**: Thin-film optics simulation with waves, circles, or lines
 * - **Viewing Angle Simulation**: Continuous animation mimicking different viewing perspectives
 * - **Complex Keyframes**: Smooth 11-step keyframe sequences for fluid color transitions
 * - **Customizable Intensity**: Control hologram strength, cycle speed, and metallic finish
 *
 * Use cases:
 * - Making text, images, or video appear holographic
 * - Creating security foil-like overlays
 * - Adding premium, futuristic visual effects
 * - Simulating rainbow reflective materials
 * - Building product showcase effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  intensity: z
    .number()
    .min(0)
    .max(2)
    .default(1)
    .describe('Overall intensity of the holographic effect (0-2, default: 1)'),
  cycleSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Speed of color cycling animation (0.1-5, default: 1)'),
  metallicStrength: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Strength of metallic sheen overlay (0-1, default: 0.7)'),
  interferencePattern: z
    .enum(['waves', 'circles', 'lines'])
    .default('waves')
    .describe('Type of interference pattern to simulate thin-film optics'),
  targetDuration: z
    .number()
    .default(10)
    .describe('Duration of the holographic effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    intensity = 1,
    cycleSpeed = 1,
    metallicStrength = 0.7,
    interferencePattern = 'waves',
    targetDuration = 10,
  } = params;

  // Calculate effect duration based on cycle speed
  const effectDuration = targetDuration;
  
  // Generate 11-step keyframes for smooth color cycling (prog: 0, 0.1, 0.2, ..., 1.0)
  const generateKeyframes = (
    key: string,
    valueGenerator: (progress: number) => any,
  ) => {
    const keyframes = [];
    for (let i = 0; i <= 10; i++) {
      const prog = i / 10;
      keyframes.push({
        key,
        val: valueGenerator(prog),
        prog,
      });
    }
    return keyframes;
  };

  // Hue rotation cycling through full spectrum
  const hueRotateKeyframes = generateKeyframes('filter', (prog) => {
    const hue = prog * 360 * cycleSpeed;
    const brightness = 1 + (intensity * 0.3 * Math.sin(prog * Math.PI * 4));
    const contrast = 1 + (intensity * 0.2 * Math.cos(prog * Math.PI * 3));
    const saturate = 1 + (intensity * 0.5);
    return `hue-rotate(${hue}deg) brightness(${brightness}) contrast(${contrast}) saturate(${saturate})`;
  });

  // Iridescence gradient background position animation
  const iridescenceKeyframes = generateKeyframes('backgroundPosition', (prog) => {
    const x = Math.sin(prog * Math.PI * 2 * cycleSpeed) * 50 + 50;
    const y = Math.cos(prog * Math.PI * 2 * cycleSpeed) * 50 + 50;
    return `${x}% ${y}%`;
  });

  // Metallic sheen gradient position animation
  const metallicKeyframes = generateKeyframes('backgroundPosition', (prog) => {
    const x = prog * 200 * cycleSpeed;
    const y = Math.sin(prog * Math.PI * 3) * 50 + 50;
    return `${x % 200}% ${y}%`;
  });

  // Generate interference pattern based on type
  const generateInterferencePattern = () => {
    switch (interferencePattern) {
      case 'waves':
        return `
          repeating-linear-gradient(
            0deg,
            rgba(255, 255, 255, ${intensity * 0.1}) 0px,
            transparent 2px,
            transparent 4px,
            rgba(255, 255, 255, ${intensity * 0.1}) 6px
          ),
          repeating-linear-gradient(
            90deg,
            rgba(255, 255, 255, ${intensity * 0.1}) 0px,
            transparent 2px,
            transparent 4px,
            rgba(255, 255, 255, ${intensity * 0.1}) 6px
          )
        `;
      case 'circles':
        return `
          radial-gradient(
            circle at 30% 40%,
            rgba(255, 255, 255, ${intensity * 0.2}) 0%,
            transparent 30%
          ),
          radial-gradient(
            circle at 70% 60%,
            rgba(255, 255, 255, ${intensity * 0.2}) 0%,
            transparent 30%
          ),
          radial-gradient(
            circle at 50% 50%,
            rgba(255, 255, 255, ${intensity * 0.15}) 0%,
            transparent 40%
          )
        `;
      case 'lines':
        return `
          repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, ${intensity * 0.12}) 0px,
            transparent 1px,
            transparent 3px,
            rgba(255, 255, 255, ${intensity * 0.12}) 4px
          ),
          repeating-linear-gradient(
            -45deg,
            rgba(255, 255, 255, ${intensity * 0.12}) 0px,
            transparent 1px,
            transparent 3px,
            rgba(255, 255, 255, ${intensity * 0.12}) 4px
          )
        `;
      default:
        return '';
    }
  };

  // Create effect nodes
  const hologramBaseEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: ['hologram-base-layer'],
    ranges: hueRotateKeyframes,
  };

  const iridescenceEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: ['iridescence-gradient-layer'],
    ranges: iridescenceKeyframes,
  };

  const metallicSheenEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: effectDuration,
    mode: 'provider',
    targetIds: ['metallic-sheen-layer'],
    ranges: metallicKeyframes,
  };

  // Build composition structure
  const rootContainer: RenderableComponentData = {
    id: 'holographic-chromatic-effect-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: targetDuration,
      },
    },
    effects: [
      {
        id: 'hologram-base-effect',
        componentId: 'generic',
        data: hologramBaseEffect,
      },
      {
        id: 'iridescence-effect',
        componentId: 'generic',
        data: iridescenceEffect,
      },
      {
        id: 'metallic-sheen-effect',
        componentId: 'generic',
        data: metallicSheenEffect,
      },
    ],
    childrenData: [
      {
        id: 'hologram-base-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="hologram-base"></div>',
          className: 'absolute inset-0',
          style: {
            mixBlendMode: 'screen',
            opacity: 0.6 * intensity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: targetDuration,
          },
        },
      },
      {
        id: 'iridescence-gradient-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="iridescence-layer"></div>',
          className: 'absolute inset-0',
          style: {
            background:
              'linear-gradient(45deg, #ff0080, #ff8c00, #40e0d0, #9b30ff, #ff0080)',
            backgroundSize: '400% 400%',
            mixBlendMode: 'color-dodge',
            opacity: 0.7 * intensity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: targetDuration,
          },
        },
      },
      {
        id: 'interference-pattern-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="interference-pattern"></div>',
          className: 'absolute inset-0',
          style: {
            background: generateInterferencePattern(),
            mixBlendMode: 'overlay',
            opacity: 0.5 * intensity,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: targetDuration,
          },
        },
      },
      {
        id: 'metallic-sheen-layer',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div class="metallic-sheen"></div>',
          className: 'absolute inset-0',
          style: {
            background:
              'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.8) 100%)',
            backgroundSize: '200% 200%',
            mixBlendMode: 'soft-light',
            opacity: 0.4 * metallicStrength,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: targetDuration,
          },
        },
      },
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'holographic-chromatic-effect',
  title: 'Holographic Chromatic Effect',
  description:
    'Creates iridescent color shifts with rainbow reflections that sweep across surfaces, simulating holographic stickers or security foil with metallic sheen, interference patterns, and thin-film optics appearance',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'effects',
    'holographic',
    'iridescent',
    'chromatic',
    'metallic',
    'rainbow',
    'color-shift',
    'interference',
    'foil',
    'security',
    'premium',
  ],
  defaultInputParams: {
    intensity: 1,
    cycleSpeed: 1,
    metallicStrength: 0.7,
    interferencePattern: 'waves',
    targetDuration: 10,
  },
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
};

export const holographicChromaticEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
