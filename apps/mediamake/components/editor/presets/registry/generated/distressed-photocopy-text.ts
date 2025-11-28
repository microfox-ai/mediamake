/**
 * Distressed Photocopy Text Preset
 *
 * This preset simulates the harsh, degraded look of repeatedly photocopied documents.
 * It creates a layered composition with multiple offset text duplicates at varying opacities,
 * simulating stacked photocopies. The main text features blown-out edges with harsh black-and-white
 * contrast, heavy grain texture overlays, a mechanical shake effect mimicking old copy machines,
 * and a scan line reveal animation that shows the text being "photocopied" in real-time.
 *
 * Features:
 * - **Layered Degradation**: 3-4 duplicate text layers with slight offsets (1-2px) and varying opacities
 * - **Harsh Contrast**: Heavy CSS filters (contrast(200%), brightness(1.2), blur(0.3px)) for blown-out edges
 * - **Grain Overlay**: Noise texture overlay using SVG-based grain pattern with multiply blend mode
 * - **Mechanical Shake**: Subtle shake effect (2-3px amplitude) with irregular rhythm via generic effects
 * - **Scan Line Reveal**: Top-to-bottom clip-path animation simulating real-time photocopying
 * - **Registration Errors**: Random 1-2px offsets and slight rotations on duplicate layers
 *
 * Use cases:
 * - Creating vintage document aesthetics
 * - Degraded text overlays for artistic effects
 * - Simulating analog copying artifacts
 * - Retro/grunge typography animations
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
  text: z
    .string()
    .describe('The text content to display in distressed photocopy style'),
  duration: z
    .number()
    .default(5)
    .describe('Duration of the text display in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size of the text in pixels'),
  fontFamily: z
    .string()
    .default('Arial, sans-serif')
    .describe('Font family (prefer sans-serif for photocopy look)'),
  scanRevealDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the scan line reveal animation in seconds'),
  shakeAmplitude: z
    .number()
    .min(1)
    .max(5)
    .default(3)
    .describe('Amplitude of mechanical shake effect in pixels'),
  shakeDuration: z
    .number()
    .min(0.1)
    .max(0.3)
    .default(0.15)
    .describe('Duration of each shake cycle in seconds'),
  grainOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity of the grain texture overlay'),
  contrastLevel: z
    .number()
    .min(150)
    .max(250)
    .default(200)
    .describe('Contrast level percentage for harsh photocopy look'),
  brightness: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.2)
    .describe('Brightness level for blown-out edges'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    scanRevealDuration,
    shakeAmplitude,
    shakeDuration,
    grainOpacity,
    contrastLevel,
    brightness,
  } = params;

  // Generate random offsets and rotations for degraded layers
  const generateRandomOffset = () => ({
    x: (Math.random() - 0.5) * 4, // -2px to 2px
    y: (Math.random() - 0.5) * 4, // -2px to 2px
    rotate: (Math.random() - 0.5) * 2, // -1deg to 1deg
  });

  const offset1 = generateRandomOffset();
  const offset2 = generateRandomOffset();
  const offset3 = generateRandomOffset();

  // SVG grain pattern (base64 encoded turbulence noise)
  const grainSvgBase64 =
    'PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxwYXRoIGQ9Ik0wIDBoMzAwdjMwMEgweiIgZmlsdGVyPSJ1cmwoI2EpIiBvcGFjaXR5PSIuNSIvPjwvc3ZnPg==';

  // IDs for components
  const rootId = 'distressed-photocopy-root';
  const grainId = 'grain-overlay';
  const degraded1Id = 'text-degraded-1';
  const degraded2Id = 'text-degraded-2';
  const degraded3Id = 'text-degraded-3';
  const mainTextId = 'text-main';

  // Create shake effect for all text layers
  const createShakeEffect = (targetId: string, delay: number = 0) => {
    // Create continuous shake with random X/Y offsets
    return {
      id: `shake-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: delay,
        duration: duration - delay,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          // Shake X axis
          {
            key: 'translateX',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0,
          },
          {
            key: 'translateX',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.2,
          },
          {
            key: 'translateX',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.4,
          },
          {
            key: 'translateX',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.6,
          },
          {
            key: 'translateX',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.8,
          },
          {
            key: 'translateX',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 1,
          },
          // Shake Y axis
          {
            key: 'translateY',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0,
          },
          {
            key: 'translateY',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.2,
          },
          {
            key: 'translateY',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.4,
          },
          {
            key: 'translateY',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.6,
          },
          {
            key: 'translateY',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 0.8,
          },
          {
            key: 'translateY',
            val: `${(Math.random() - 0.5) * shakeAmplitude * 2}px`,
            prog: 1,
          },
        ],
      },
    };
  };

  // Scan line reveal effect for main text
  const scanRevealEffect = {
    id: 'scan-reveal',
    componentId: 'generic',
    data: {
      type: 'ease-out',
      start: 0,
      duration: scanRevealDuration,
      mode: 'provider',
      targetIds: [mainTextId],
      ranges: [
        {
          key: 'clipPath',
          val: 'polygon(0 0, 100% 0, 100% 0%, 0 0%)',
          prog: 0,
        },
        {
          key: 'clipPath',
          val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
          prog: 1,
        },
      ],
    },
  };

  // Build child components
  const childrenData: RenderableComponentData[] = [
    // Grain overlay
    {
      id: grainId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 100%; height: 100%; background-image: url('data:image/svg+xml;base64,${grainSvgBase64}'); opacity: ${grainOpacity}; pointer-events: none; mix-blend-mode: multiply;"></div>`,
        className: 'absolute inset-0 pointer-events-none',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
    },
    // Degraded text layer 1
    {
      id: degraded1Id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: 'bold',
          color: '#000000',
          opacity: 0.15,
          filter: `contrast(${contrastLevel}%) brightness(${brightness}) blur(0.5px)`,
          mixBlendMode: 'multiply',
          transform: `translate(${offset1.x}px, ${offset1.y}px) rotate(${offset1.rotate}deg)`,
          willChange: 'transform',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createShakeEffect(degraded1Id)],
    },
    // Degraded text layer 2
    {
      id: degraded2Id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: 'bold',
          color: '#000000',
          opacity: 0.2,
          filter: `contrast(${contrastLevel}%) brightness(${brightness}) blur(0.4px)`,
          mixBlendMode: 'multiply',
          transform: `translate(${offset2.x}px, ${offset2.y}px) rotate(${offset2.rotate}deg)`,
          willChange: 'transform',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createShakeEffect(degraded2Id, 0.05)],
    },
    // Degraded text layer 3
    {
      id: degraded3Id,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: 'bold',
          color: '#000000',
          opacity: 0.18,
          filter: `contrast(${contrastLevel}%) brightness(${brightness}) blur(0.6px)`,
          mixBlendMode: 'multiply',
          transform: `translate(${offset3.x}px, ${offset3.y}px) rotate(${offset3.rotate}deg)`,
          willChange: 'transform',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [createShakeEffect(degraded3Id, 0.1)],
    },
    // Main text layer with scan reveal
    {
      id: mainTextId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: text,
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: 'bold',
          color: '#000000',
          filter: `contrast(${contrastLevel}%) brightness(${brightness}) blur(0.3px)`,
          mixBlendMode: 'multiply',
          willChange: 'transform, filter, clip-path',
          clipPath: 'polygon(0 0, 100% 0, 100% 0%, 0 0%)', // Initial state
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [scanRevealEffect, createShakeEffect(mainTextId, scanRevealDuration)],
    },
  ] as RenderableComponentData[];

  // Root container
  const rootContainer = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-white',
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
  id: 'distressed-photocopy-text',
  title: 'Distressed Photocopy Text',
  description:
    'A photocopy-degraded text preset that simulates repeatedly xeroxed documents with harsh contrast, grain, mechanical shake, scan line reveal, and registration errors. Features multiple offset text layers with blend modes for authentic degradation effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'photocopy',
    'distressed',
    'vintage',
    'grunge',
    'degraded',
    'analog',
    'xerox',
    'grain',
    'shake',
    'reveal',
  ],
  defaultInputParams: {
    text: 'PHOTOCOPIED',
    duration: 5,
    fontSize: 72,
    fontFamily: 'Arial, sans-serif',
    scanRevealDuration: 0.8,
    shakeAmplitude: 3,
    shakeDuration: 0.15,
    grainOpacity: 0.3,
    contrastLevel: 200,
    brightness: 1.2,
  },
  dependencies: {},
};

// Export preset
export const distressedPhotocopyTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};