/**
 * AR HUD Targeting Reticle Preset
 *
 * Creates a motion-tracked AR interface with Iron Man HUD-style targeting reticles,
 * circular data readouts, holographic assembly animations, and chromatic aberration effects.
 * Designed to feel like advanced military or sci-fi targeting software with rock-solid frame lock.
 *
 * Features:
 * - Rotating reticle rings (outer and inner) with SVG stroke-dasharray patterns
 * - Circular data readouts positioned radially around the reticle (distance, azimuth, elevation, target status)
 * - Holographic assembly animation (wireframe to solid) using opacity and scale effects
 * - Scanning animation with a sweeping gradient line
 * - Chromatic aberration text effect using three color-shifted text layers with screen blend mode
 * - Pulsing reactive elements on the center dot
 * - Backdrop blur for depth
 *
 * Use cases:
 * - Sci-fi/military targeting overlays
 * - AR interface demonstrations
 * - Iron Man HUD recreations
 * - Black Mirror augmented reality effects
 * - Advanced targeting software visualizations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Duration of the AR HUD overlay in seconds'),
  reticleColor: z
    .string()
    .default('rgba(34,211,238,1)')
    .describe('Color of the reticle rings and center dot (cyan by default)'),
  dataReadouts: z
    .object({
      top: z.string().default('DIST: 847.2m').describe('Top data readout text'),
      right: z.string().default('AZ: 127.4°').describe('Right data readout text'),
      bottom: z.string().default('ELV: +12.8°').describe('Bottom data readout text'),
      left: z.string().default('TGT: LOCKED').describe('Left data readout text'),
    })
    .optional()
    .describe('Data readout texts for each cardinal direction'),
  chromaticText: z
    .string()
    .default('TARGETING SYSTEM v2.4')
    .describe('Text displayed with chromatic aberration effect'),
  showScanLine: z
    .boolean()
    .default(true)
    .describe('Whether to show the scanning sweep line'),
  scanLineDuration: z
    .number()
    .min(1)
    .default(3)
    .describe('Duration of one scan line sweep cycle in seconds'),
  pulseIntensity: z
    .number()
    .min(1)
    .max(2)
    .default(1.5)
    .describe('Intensity of the center dot pulse effect (1 = normal, 1.5 = 50% brighter)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    reticleColor,
    dataReadouts,
    chromaticText,
    showScanLine,
    scanLineDuration,
    pulseIntensity,
  } = params;

  // Helper function to convert rgba to rgb channels
  const getRGBChannels = (color: string) => {
    // Parse rgba(r,g,b,a) or rgb(r,g,b)
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: match[1],
        g: match[2],
        b: match[3],
      };
    }
    // Default to cyan
    return { r: '34', g: '211', b: '238' };
  };

  const rgbChannels = getRGBChannels(reticleColor);

  // Data readout defaults
  const readoutTexts = dataReadouts || {
    top: 'DIST: 847.2m',
    right: 'AZ: 127.4°',
    bottom: 'ELV: +12.8°',
    left: 'TGT: LOCKED',
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [];

  // Root container for reticle and data readouts
  const reticleContainerId = 'ar-hud-reticle-container';
  const outerRingId = 'ar-hud-outer-ring';
  const innerRingId = 'ar-hud-inner-ring';
  const centerDotId = 'ar-hud-center-dot';

  // Reticle container (centered)
  const reticleContainer: RenderableComponentData = {
    id: reticleContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Outer ring SVG
      {
        id: outerRingId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg width="400" height="400" viewBox="0 0 400 400" style="display: block;"><circle cx="200" cy="200" r="180" fill="none" stroke="${reticleColor}" stroke-width="2" stroke-dasharray="20 10"/></svg>`,
          className: 'absolute',
          style: {
            filter: `drop-shadow(0 0 10px ${reticleColor})`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
      // Inner ring SVG
      {
        id: innerRingId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg width="300" height="300" viewBox="0 0 300 300" style="display: block;"><circle cx="150" cy="150" r="120" fill="none" stroke="${reticleColor}" stroke-width="1.5" stroke-dasharray="8 4"/></svg>`,
          className: 'absolute',
          style: {
            filter: `drop-shadow(0 0 6px ${reticleColor})`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
      // Center dot SVG
      {
        id: centerDotId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<svg width="20" height="20" viewBox="0 0 20 20" style="display: block;"><circle cx="10" cy="10" r="4" fill="${reticleColor}"/></svg>`,
          className: 'absolute',
          style: {
            filter: `drop-shadow(0 0 8px ${reticleColor})`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ],
    effects: [],
  };

  // Add rotation effects to reticle rings
  reticleContainer.effects = [
    // Outer ring rotation (clockwise)
    {
      id: 'effect-reticle-outer-rotation',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [outerRingId],
        type: 'linear',
        start: 0,
        duration: duration,
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: 360, prog: 1 },
        ],
      },
    },
    // Inner ring rotation (counter-clockwise)
    {
      id: 'effect-reticle-inner-rotation',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [innerRingId],
        type: 'linear',
        start: 0,
        duration: duration,
        ranges: [
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: -360, prog: 1 },
        ],
      },
    },
    // Holographic assembly for outer ring
    {
      id: 'effect-holographic-assembly-outer',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [outerRingId],
        type: 'ease-out',
        start: 0,
        duration: 0.5,
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    // Holographic assembly for inner ring
    {
      id: 'effect-holographic-assembly-inner',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [innerRingId],
        type: 'ease-out',
        start: 0.1,
        duration: 0.5,
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    // Holographic assembly for center dot
    {
      id: 'effect-holographic-assembly-center',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [centerDotId],
        type: 'ease-out',
        start: 0.2,
        duration: 0.4,
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 0, prog: 0 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    },
    // Pulse effect on center dot
    {
      id: 'effect-pulse-center-dot',
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [centerDotId],
        type: 'ease-in-out',
        start: 0.6,
        duration: 1.5,
        loop: true,
        ranges: [
          { key: 'brightness', val: 1, prog: 0 },
          { key: 'brightness', val: pulseIntensity, prog: 0.5 },
          { key: 'brightness', val: 1, prog: 1 },
        ],
      },
    },
  ];

  childrenData.push(reticleContainer);

  // Data readouts container (positioned around reticle)
  const dataReadoutsContainerId = 'ar-hud-data-readouts-container';
  const readoutTopId = 'ar-hud-readout-top';
  const readoutRightId = 'ar-hud-readout-right';
  const readoutBottomId = 'ar-hud-readout-bottom';
  const readoutLeftId = 'ar-hud-readout-left';

  const dataReadoutsContainer: RenderableComponentData = {
    id: dataReadoutsContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Top readout
      {
        id: readoutTopId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transform: 'rotate(0deg) translateY(-220px) rotate(0deg)',
              backdropFilter: 'blur(1px)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          {
            id: 'ar-hud-readout-top-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: readoutTexts.top,
              className: 'font-light text-cyan-300 uppercase tracking-widest text-xs',
              style: {
                textShadow: `0 0 10px ${reticleColor}`,
              },
              font: {
                family: 'Inter',
                weights: ['300'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Right readout
      {
        id: readoutRightId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transform: 'rotate(90deg) translateY(-220px) rotate(-90deg)',
              backdropFilter: 'blur(1px)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          {
            id: 'ar-hud-readout-right-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: readoutTexts.right,
              className: 'font-light text-cyan-300 uppercase tracking-widest text-xs',
              style: {
                textShadow: `0 0 10px ${reticleColor}`,
              },
              font: {
                family: 'Inter',
                weights: ['300'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Bottom readout
      {
        id: readoutBottomId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transform: 'rotate(180deg) translateY(-220px) rotate(-180deg)',
              backdropFilter: 'blur(1px)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          {
            id: 'ar-hud-readout-bottom-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: readoutTexts.bottom,
              className: 'font-light text-cyan-300 uppercase tracking-widest text-xs',
              style: {
                textShadow: `0 0 10px ${reticleColor}`,
              },
              font: {
                family: 'Inter',
                weights: ['300'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
      // Left readout
      {
        id: readoutLeftId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transform: 'rotate(270deg) translateY(-220px) rotate(-270deg)',
              backdropFilter: 'blur(1px)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        childrenData: [
          {
            id: 'ar-hud-readout-left-text',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: readoutTexts.left,
              className: 'font-light text-cyan-300 uppercase tracking-widest text-xs',
              style: {
                textShadow: `0 0 10px ${reticleColor}`,
              },
              font: {
                family: 'Inter',
                weights: ['300'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      },
    ],
    effects: [
      // Fade in readouts after holographic assembly
      {
        id: 'effect-readouts-fade-in',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [readoutTopId, readoutRightId, readoutBottomId, readoutLeftId],
          type: 'ease-out',
          start: 0.3,
          duration: 0.5,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(dataReadoutsContainer);

  // Scan line overlay (optional)
  if (showScanLine) {
    const scanLineId = 'ar-hud-scan-line';
    const scanOverlayContainer: RenderableComponentData = {
      id: 'ar-hud-scan-overlay',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 overflow-hidden pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: [
        {
          id: scanLineId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute left-0 right-0',
              style: {
                height: '4px',
                background: `linear-gradient(90deg, transparent 0%, ${reticleColor} 50%, transparent 100%)`,
                boxShadow: `0 0 20px ${reticleColor}`,
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
        },
      ],
      effects: [
        // Scan line sweep
        {
          id: 'effect-scan-line-sweep',
          componentId: 'generic',
          data: {
            mode: 'provider',
            targetIds: [scanLineId],
            type: 'linear',
            start: 0,
            duration: scanLineDuration,
            loop: true,
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 1080, prog: 1 },
            ],
          },
        },
      ],
    };

    childrenData.push(scanOverlayContainer);
  }

  // Chromatic aberration text layer
  const chromaticRedId = 'ar-hud-chromatic-red';
  const chromaticGreenId = 'ar-hud-chromatic-green';
  const chromaticBlueId = 'ar-hud-chromatic-blue';

  const chromaticTextLayer: RenderableComponentData = {
    id: 'ar-hud-chromatic-text-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-8 left-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Red channel
      {
        id: chromaticRedId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: chromaticText,
          className: 'absolute font-light uppercase tracking-widest text-sm',
          style: {
            color: `rgba(${rgbChannels.r},0,0,0.7)`,
            mixBlendMode: 'screen',
            transform: 'translateX(-1px)',
          },
          font: {
            family: 'Inter',
            weights: ['300'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
      // Green channel
      {
        id: chromaticGreenId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: chromaticText,
          className: 'absolute font-light uppercase tracking-widest text-sm',
          style: {
            color: `rgba(0,${rgbChannels.g},0,0.7)`,
            mixBlendMode: 'screen',
            transform: 'translateX(0px)',
          },
          font: {
            family: 'Inter',
            weights: ['300'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
      // Blue channel
      {
        id: chromaticBlueId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: chromaticText,
          className: 'absolute font-light uppercase tracking-widest text-sm',
          style: {
            color: `rgba(0,0,${rgbChannels.b},0.7)`,
            mixBlendMode: 'screen',
            transform: 'translateX(1px)',
          },
          font: {
            family: 'Inter',
            weights: ['300'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
      },
    ],
    effects: [
      // Subtle chromatic flicker
      {
        id: 'effect-chromatic-flicker',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [chromaticRedId, chromaticBlueId],
          type: 'linear',
          start: 0,
          duration: 0.1,
          loop: true,
          ranges: [
            { key: 'translateX', val: -1, prog: 0 },
            { key: 'translateX', val: -2, prog: 0.5 },
            { key: 'translateX', val: -1, prog: 1 },
          ],
        },
      },
    ],
  };

  childrenData.push(chromaticTextLayer);

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'ar-hud-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'fixed inset-0',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData,
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
  id: 'ar-hud-targeting-reticle',
  title: 'AR HUD Targeting Reticle',
  description:
    'A motion-tracked AR interface preset featuring Iron Man HUD-style targeting reticles with rotating rings, circular data readouts (distance, azimuth, elevation, target status), holographic assembly animations, scanning sweep line, chromatic aberration text effects, and pulsing reactive elements. Designed for sci-fi/military targeting software aesthetic with rock-solid frame lock.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'ar',
    'hud',
    'targeting',
    'reticle',
    'sci-fi',
    'military',
    'iron-man',
    'holographic',
    'chromatic-aberration',
    'scanning',
  ],
  dependencies: {},
  defaultInputParams: {
    duration: 10,
    reticleColor: 'rgba(34,211,238,1)',
    dataReadouts: {
      top: 'DIST: 847.2m',
      right: 'AZ: 127.4°',
      bottom: 'ELV: +12.8°',
      left: 'TGT: LOCKED',
    },
    chromaticText: 'TARGETING SYSTEM v2.4',
    showScanLine: true,
    scanLineDuration: 3,
    pulseIntensity: 1.5,
  },
};

// Export preset
export const arHudTargetingReticlePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
