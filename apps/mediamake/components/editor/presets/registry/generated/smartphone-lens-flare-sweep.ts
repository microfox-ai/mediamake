/**
 * Smartphone Lens Flare Light Sweep Transition Preset
 *
 * A modern, minimalist light sweep transition inspired by smartphone camera lens flares.
 * Features a sharp, precise diagonal sweep with subtle chromatic aberration (RGB channel separation),
 * clean geometric profile, and smooth cubic-bezier acceleration curves.
 *
 * Features:
 * - Thin, elegant diagonal sweep with smooth acceleration/deceleration
 * - Subtle chromatic aberration with RGB channel separation
 * - Contemporary tech-inspired aesthetic
 * - Professional-grade subtle effect suitable for modern app-style videos
 * - Dynamic scaleY animation for thickness variation
 * - Optimized performance with transform properties
 *
 * Use cases:
 * - Modern app UI transitions
 * - Tech product videos
 * - Professional presentations
 * - Contemporary video content
 * - Sleek scene transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  duration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Duration of the sweep transition in seconds'),
  startTime: z
    .number()
    .min(0)
    .default(0)
    .describe('Start time of the transition (relative to parent)'),
  sweepWidth: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Width of the main sweep line in pixels'),
  chromaticOffset: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Offset distance for RGB separation in pixels'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of the glow effect (0-1)'),
  dynamicThickness: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Maximum scale multiplier for dynamic thickness (scaleY)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    startTime,
    sweepWidth,
    chromaticOffset,
    glowIntensity,
    dynamicThickness,
  } = params;

  // Helper: Create sweep effect with movement and scale
  const createSweepEffect = (
    targetId: string,
    effectId: string,
  ): any => {
    return {
      id: effectId,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0, // Relative to container start
        duration: duration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Diagonal movement from top-left to bottom-right
          { key: 'translateX', val: '-150%', prog: 0 },
          { key: 'translateX', val: '150%', prog: 1 },
          { key: 'translateY', val: '-150%', prog: 0 },
          { key: 'translateY', val: '150%', prog: 1 },
          // Dynamic thickness: thin at start/end, thick in middle
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: dynamicThickness, prog: 0.5 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      },
    };
  };

  // Create RGB sweep elements
  const redSweep: RenderableComponentData = {
    id: 'red-sweep',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute',
      style: {
        width: '200%',
        height: '2px',
        left: '-50%',
        top: '50%',
        background: `linear-gradient(90deg, transparent 0%, transparent 20%, rgba(255,0,0,0.3) 45%, rgba(255,0,0,0.5) 50%, rgba(255,0,0,0.3) 55%, transparent 80%, transparent 100%)`,
        transform: 'rotate(45deg)',
        transformOrigin: 'center',
        backfaceVisibility: 'hidden',
        filter: 'blur(1px)',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [createSweepEffect('red-sweep', 'red-sweep-effect')],
  };

  const greenSweep: RenderableComponentData = {
    id: 'green-sweep',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute',
      style: {
        width: '200%',
        height: '2px',
        left: '-50%',
        top: '50%',
        background: `linear-gradient(90deg, transparent 0%, transparent 20%, rgba(0,255,0,0.3) 45%, rgba(0,255,0,0.5) 50%, rgba(0,255,0,0.3) 55%, transparent 80%, transparent 100%)`,
        transform: `rotate(45deg) translate(${chromaticOffset}px, ${-chromaticOffset}px)`,
        transformOrigin: 'center',
        backfaceVisibility: 'hidden',
        filter: 'blur(1px)',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [createSweepEffect('green-sweep', 'green-sweep-effect')],
  };

  const blueSweep: RenderableComponentData = {
    id: 'blue-sweep',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute',
      style: {
        width: '200%',
        height: '2px',
        left: '-50%',
        top: '50%',
        background: `linear-gradient(90deg, transparent 0%, transparent 20%, rgba(0,0,255,0.3) 45%, rgba(0,0,255,0.5) 50%, rgba(0,0,255,0.3) 55%, transparent 80%, transparent 100%)`,
        transform: `rotate(45deg) translate(${-chromaticOffset}px, ${chromaticOffset}px)`,
        transformOrigin: 'center',
        backfaceVisibility: 'hidden',
        filter: 'blur(1px)',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [createSweepEffect('blue-sweep', 'blue-sweep-effect')],
  };

  // Main white sweep with glow
  const mainSweep: RenderableComponentData = {
    id: 'main-sweep',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 100%; height: 100%;"></div>',
      className: 'absolute',
      style: {
        width: '200%',
        height: `${sweepWidth}px`,
        left: '-50%',
        top: '50%',
        background: `linear-gradient(90deg, transparent 0%, transparent 15%, rgba(255,255,255,0.1) 35%, rgba(255,255,255,0.6) 48%, white 50%, rgba(255,255,255,0.6) 52%, rgba(255,255,255,0.1) 65%, transparent 85%, transparent 100%)`,
        transform: 'rotate(45deg)',
        transformOrigin: 'center',
        backfaceVisibility: 'hidden',
        boxShadow: `0 0 8px 2px rgba(255,255,255,${glowIntensity}), 0 0 16px 4px rgba(255,255,255,${glowIntensity * 0.5})`,
        filter: 'brightness(1.5)',
        willChange: 'transform',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [createSweepEffect('main-sweep', 'main-sweep-effect')],
  };

  // Chromatic group container with screen blend mode
  const chromaticGroup: RenderableComponentData = {
    id: 'chromatic-group',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'screen',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [redSweep, greenSweep, blueSweep, mainSweep],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'light-sweep-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'fixed inset-0 overflow-hidden pointer-events-none',
        style: {
          zIndex: 9999,
        },
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: duration,
      },
    },
    childrenData: [chromaticGroup],
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
  id: 'smartphone-lens-flare-sweep',
  title: 'Smartphone Lens Flare Light Sweep',
  description:
    'Modern, minimalist light sweep transition inspired by smartphone camera lens flares with chromatic aberration',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'light-sweep',
    'lens-flare',
    'chromatic',
    'modern',
    'tech',
    'smartphone',
    'elegant',
  ],
  defaultInputParams: {
    duration: 0.8,
    startTime: 0,
    sweepWidth: 3,
    chromaticOffset: 1,
    glowIntensity: 0.4,
    dynamicThickness: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const smartphoneLensFlareSweepPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
