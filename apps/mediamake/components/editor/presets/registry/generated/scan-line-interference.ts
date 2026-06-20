/**
 * Scan Line Interference Effect Preset
 *
 * Simulates authentic CRT monitor interference patterns with multiple animated scan lines,
 * opacity flickering, and subtle brightness oscillation. This preset creates a vintage
 * display effect by layering multiple scan patterns at different speeds for visual complexity.
 *
 * Features:
 * - **Multiple Scan Line Layers**: Three independent scan line patterns with different speeds
 * - **Vertical Movement**: Animated horizontal lines moving vertically across the screen
 * - **Opacity Flickering**: Rapid opacity fluctuation (0.8-1.0) for CRT flicker effect
 * - **Brightness Oscillation**: Subtle brightness variation (95%-105%) for authentic feel
 * - **Customizable Parameters**: Control line speed, opacity, and interference color
 * - **Complex Layering**: Multiple effect objects with different timing offsets
 *
 * Use cases:
 * - Adding retro CRT monitor effects to modern videos
 * - Creating vintage technology aesthetics
 * - Simulating old TV screen interference
 * - Building retro-futuristic visual styles
 * - Enhancing nostalgia-themed content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  lineSpeed: z
    .number()
    .min(10)
    .max(500)
    .default(100)
    .describe('Speed of scan line movement in pixels per second'),
  lineOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Base opacity of scan lines (0-1)'),
  interferenceColor: z
    .string()
    .default('rgba(0, 255, 0, 0.5)')
    .describe('Color of the interference lines (CSS color, hex or rgba)'),
  targetIds: z
    .array(z.string())
    .default([])
    .optional()
    .describe('Optional array of target component IDs to apply effect to'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .optional()
    .describe('Duration of the effect in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { lineSpeed, lineOpacity, interferenceColor, duration } = params;

  // Calculate animation durations based on lineSpeed
  // Higher speed = shorter duration for full cycle
  // Assuming screen height ~1080px, calculate how long to traverse it
  const screenHeight = props.config?.height || 1080;
  const baseDuration = screenHeight / lineSpeed; // Duration for one full cycle

  // Layer 1: Fast scan lines (2px stripe pattern)
  const layer1Duration = baseDuration;
  const layer1Distance = screenHeight;

  // Layer 2: Medium speed (1px stripe pattern, slightly slower)
  const layer2Duration = baseDuration * 1.5;
  const layer2Distance = screenHeight;

  // Layer 3: Slow scan lines (3px stripe pattern)
  const layer3Duration = baseDuration * 2;
  const layer3Distance = screenHeight;

  // Build scan line layers with effects
  const scanLayer1: RenderableComponentData = {
    id: 'scan-layer-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: repeating-linear-gradient(0deg, transparent, transparent 2px, ${interferenceColor} 2px, ${interferenceColor} 4px); opacity: ${lineOpacity};"></div>`,
      style: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 10,
      },
    },
    effects: [
      {
        id: 'scan-1-translate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: layer1Duration,
          loop: true,
          mode: 'provider',
          targetIds: ['scan-layer-1'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: layer1Distance, prog: 1 },
          ],
        },
      },
      {
        id: 'scan-1-opacity-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: 0.15,
          loop: true,
          mode: 'provider',
          targetIds: ['scan-layer-1'],
          ranges: [
            { key: 'opacity', val: 0.8, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  const scanLayer2: RenderableComponentData = {
    id: 'scan-layer-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: repeating-linear-gradient(0deg, transparent, transparent 1px, ${interferenceColor} 1px, ${interferenceColor} 3px); opacity: ${lineOpacity};"></div>`,
      style: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 10,
      },
    },
    effects: [
      {
        id: 'scan-2-translate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: layer2Duration,
          loop: true,
          mode: 'provider',
          targetIds: ['scan-layer-2'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: layer2Distance, prog: 1 },
          ],
        },
      },
      {
        id: 'scan-2-opacity-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0.08,
          duration: 0.2,
          loop: true,
          mode: 'provider',
          targetIds: ['scan-layer-2'],
          ranges: [
            { key: 'opacity', val: 0.85, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.85, prog: 1 },
          ],
        },
      },
    ],
  };

  const scanLayer3: RenderableComponentData = {
    id: 'scan-layer-3',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background-image: repeating-linear-gradient(0deg, transparent, transparent 3px, ${interferenceColor} 3px, ${interferenceColor} 5px); opacity: ${lineOpacity};"></div>`,
      style: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 10,
      },
    },
    effects: [
      {
        id: 'scan-3-translate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: layer3Duration,
          loop: true,
          mode: 'provider',
          targetIds: ['scan-layer-3'],
          ranges: [
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: layer3Distance, prog: 1 },
          ],
        },
      },
      {
        id: 'scan-3-brightness',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: 1.5,
          loop: true,
          mode: 'provider',
          targetIds: ['scan-layer-3'],
          ranges: [
            { key: 'brightness', val: 0.95, prog: 0 },
            { key: 'brightness', val: 1.05, prog: 0.5 },
            { key: 'brightness', val: 0.95, prog: 1 },
          ],
        },
      },
    ],
  };

  // Root container holding all scan layers
  const rootContainer: RenderableComponentData = {
    id: 'scan-line-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          mixBlendMode: 'overlay',
          zIndex: 9999,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration || 10,
      },
    },
    childrenData: [scanLayer1, scanLayer2, scanLayer3] as RenderableComponentData[],
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
  id: 'scan-line-interference',
  title: 'CRT Scan Line Interference Effect',
  description:
    'Simulates CRT monitor interference patterns with multiple animated scan lines, opacity flickering, and brightness oscillation. Layers multiple scan patterns at different speeds for authentic vintage display effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['effects', 'visual', 'retro', 'crt', 'vintage', 'overlay', 'interference'],
  dependencies: {},
  defaultInputParams: {
    lineSpeed: 100,
    lineOpacity: 0.3,
    interferenceColor: 'rgba(0, 255, 0, 0.5)',
    duration: 10,
  },
};

// Export preset
export const scanLineInterferencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
