/**
 * Scanline Distortion Internal Effect Preset
 *
 * This internal effect preset creates an old CRT monitor distortion effect with rolling scanlines,
 * horizontal tears, brightness modulation, and optional phosphor glow and noise interference.
 *
 * Features:
 * - **Rolling Scanlines**: Vertical scrolling scanline pattern using animated background gradients
 * - **Horizontal Tears**: Intermittent skewY transform distortions at corruption points
 * - **Brightness Modulation**: CRT glow simulation with brightness fluctuations
 * - **Phosphor Glow**: Optional green tint filter for authentic CRT phosphor effect
 * - **Interference Noise**: Optional noise pattern overlay simulating signal degradation
 *
 * Technical Implementation:
 * - Uses CSS linear gradients for scanline patterns (transparent 50%, dark 50%)
 * - Animates background-position-y for continuous vertical roll
 * - Creates random tear sequences with skewY transforms at calculated intervals
 * - Modulates brightness in wave pattern for CRT flicker effect
 * - Applies hue-rotate filter for phosphor glow when enabled
 * - Overlays semi-transparent noise texture when interference is enabled
 *
 * Use Cases:
 * - Creating retro CRT monitor effects
 * - Simulating analog video signal interference
 * - Adding vintage TV aesthetic to modern content
 * - Building glitch art and vaporwave visuals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  scanlineSpeed: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe('Speed multiplier for vertical scanline roll (higher = faster)'),
  tearFrequency: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('How often horizontal tears occur (tears per second)'),
  distortionStrength: z
    .number()
    .min(0)
    .max(10)
    .default(5)
    .describe('Maximum skew angle in degrees for tear distortions'),
  phosphorGlow: z
    .boolean()
    .default(false)
    .describe('Enable green phosphor CRT glow effect'),
  interference: z
    .boolean()
    .default(false)
    .describe('Enable noise pattern overlay for signal interference'),
  duration: z
    .number()
    .min(0.1)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  targetIds: z
    .array(z.string())
    .min(1)
    .describe('Array of component IDs to apply the effect to'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    scanlineSpeed,
    tearFrequency,
    distortionStrength,
    phosphorGlow,
    interference,
    duration,
    targetIds,
  } = params;

  // Helper function to generate tear sequences
  const generateTearRanges = () => {
    const ranges: any[] = [];
    const numTears = Math.floor(tearFrequency * duration);

    if (numTears <= 0) {
      // No tears - just keep skewY at 0
      ranges.push({ key: 'skewY', val: '0deg', prog: 0 });
      ranges.push({ key: 'skewY', val: '0deg', prog: 1 });
      return ranges;
    }

    // Generate random tear points across the duration
    const tearPoints: number[] = [];
    for (let i = 0; i < numTears; i++) {
      const randomProg = Math.random();
      tearPoints.push(randomProg);
    }
    tearPoints.sort((a, b) => a - b);

    // Build ranges with tears at calculated points
    let lastProg = 0;
    ranges.push({ key: 'skewY', val: '0deg', prog: 0 });

    tearPoints.forEach((tearProg) => {
      // Add transition to tear point
      const tearStart = Math.max(0, tearProg - 0.02);
      const tearPeak = tearProg;
      const tearEnd = Math.min(1, tearProg + 0.02);

      // Random direction for tear
      const direction = Math.random() > 0.5 ? 1 : -1;
      const skewValue = direction * distortionStrength;

      // Before tear
      if (tearStart > lastProg) {
        ranges.push({ key: 'skewY', val: '0deg', prog: tearStart });
      }

      // At tear peak
      ranges.push({ key: 'skewY', val: `${skewValue}deg`, prog: tearPeak });

      // After tear
      ranges.push({ key: 'skewY', val: '0deg', prog: tearEnd });

      lastProg = tearEnd;
    });

    // Ensure we end at 0
    if (lastProg < 1) {
      ranges.push({ key: 'skewY', val: '0deg', prog: 1 });
    }

    return ranges;
  };

  // Helper function to generate brightness modulation ranges
  const generateBrightnessRanges = () => {
    return [
      { key: 'brightness', val: 1, prog: 0 },
      { key: 'brightness', val: 1.15, prog: 0.25 },
      { key: 'brightness', val: 1, prog: 0.5 },
      { key: 'brightness', val: 0.95, prog: 0.75 },
      { key: 'brightness', val: 1, prog: 1 },
    ];
  };

  // Calculate scanline animation duration based on speed
  const scanlineDuration = duration / scanlineSpeed;

  // Effect 1: Rolling scanlines with background-position animation
  const scanlineEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: scanlineDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      {
        key: 'backgroundImage',
        val: 'linear-gradient(transparent 50%, rgba(0,0,0,0.25) 50%)',
        prog: 0,
      },
      {
        key: 'backgroundSize',
        val: '100% 4px',
        prog: 0,
      },
      {
        key: 'backgroundPositionY',
        val: '0px',
        prog: 0,
      },
      {
        key: 'backgroundPositionY',
        val: '100%',
        prog: 1,
      },
    ],
  };

  // Effect 2: Horizontal tear distortions
  const tearEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: generateTearRanges(),
  };

  // Effect 3: Brightness modulation
  const brightnessEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: generateBrightnessRanges(),
  };

  // Build effects array
  const effects: any[] = [
    {
      id: `scanline-${targetIds[0]}`,
      componentId: 'generic',
      data: scanlineEffect,
    },
    {
      id: `tear-${targetIds[0]}`,
      componentId: 'generic',
      data: tearEffect,
    },
    {
      id: `brightness-${targetIds[0]}`,
      componentId: 'generic',
      data: brightnessEffect,
    },
  ];

  // Effect 4: Phosphor glow (optional)
  if (phosphorGlow) {
    const phosphorEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        {
          key: 'filter',
          val: 'hue-rotate(90deg) saturate(1.3)',
          prog: 0,
        },
      ],
    };

    effects.push({
      id: `phosphor-${targetIds[0]}`,
      componentId: 'generic',
      data: phosphorEffect,
    });
  }

  // Effect 5: Interference noise (optional)
  if (interference) {
    // Create a simple noise pattern using data URI
    const noisePattern =
      'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuMDUiLz48L3N2Zz4=';

    const interferenceEffect: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        {
          key: 'backgroundImage',
          val: `linear-gradient(transparent 50%, rgba(0,0,0,0.25) 50%), url(${noisePattern})`,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 0.9,
          prog: 0,
        },
        {
          key: 'opacity',
          val: 0.95,
          prog: 0.5,
        },
        {
          key: 'opacity',
          val: 0.9,
          prog: 1,
        },
      ],
    };

    effects.push({
      id: `interference-${targetIds[0]}`,
      componentId: 'generic',
      data: interferenceEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'scanline-distortion-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: duration,
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
  id: 'scanlineDistortion',
  title: 'Scanline Distortion Internal Effect',
  description:
    'Internal effect preset that overlays rolling scanlines with intermittent horizontal tears, simulating old CRT monitors experiencing signal interference. Combines CSS linear gradients for scanlines, transform skewing for tears, and brightness modulation for CRT glow. Accepts parameters for scanlineSpeed, tearFrequency, distortionStrength, phosphorGlow, and interference to create customizable retro visual effects.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'internal', 'generic', 'crt', 'retro', 'scanlines', 'glitch'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    scanlineSpeed: 1,
    tearFrequency: 2,
    distortionStrength: 5,
    phosphorGlow: false,
    interference: false,
    duration: 10,
    targetIds: ['target-component'],
  },
};

export const scanlineDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
