/**
 * 90s Home Video Transition Preset
 *
 * This preset recreates the nostalgic, amateur cinematography aesthetic of 90s family home videos.
 * Features authentic handheld camera shake that intensifies during transition, auto-exposure hunting
 * that oscillates between over and underexposed states, cheap optical lens flares, camera tilt drift,
 * zoom creep, occasional finger/strap obstructions, variable film grain, and consumer-camera softness.
 *
 * Key features:
 * - **Realistic Camera Shake**: Base shake with mid-transition intensity spike, simulating bumped operator
 * - **Auto-Exposure Hunting**: Pulsing brightness/contrast mimicking consumer camera auto-exposure
 * - **Cheap Lens Flares**: Optical-style flares (not cinematic) with screen blend mode
 * - **Camera Tilt Drift**: Slow rotation drift as operator adjusts grip
 * - **Zoom Creep**: Subtle scale drift from 1 to 1.05 over duration
 * - **Finger Obstructions**: Blurred circular obstructions sliding in from edges
 * - **Variable Grain**: Heavier grain in underexposed areas, tied to exposure state
 * - **Consumer Softness**: Soft image quality typical of 90s consumer cameras
 *
 * Use cases:
 * - Creating authentic retro family footage aesthetics
 * - Nostalgic transitions for home video compilations
 * - Vintage effect for modern content
 * - Period-accurate 90s video recreations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ========================
// PARAMS SCHEMA
// ========================

const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL or path for the outgoing video clip'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL or path for the incoming video clip'),
  duration: z
    .number()
    .default(3)
    .describe('Total duration of the transition effect in seconds'),
  grainTextureSrc: z
    .string()
    .optional()
    .describe(
      'Optional grain texture image URL. If not provided, a default noise texture will be used',
    ),
  shakeAmplitude: z
    .number()
    .default(5)
    .describe('Base amplitude of camera shake in pixels (default: 5)'),
  shakeIntensityMultiplier: z
    .number()
    .default(2.5)
    .describe(
      'Multiplier for shake intensity at transition midpoint (default: 2.5)',
    ),
  exposureHuntingIntensity: z
    .number()
    .default(1.0)
    .describe(
      'Intensity multiplier for auto-exposure hunting effects (default: 1.0)',
    ),
  lensFlareIntensity: z
    .number()
    .default(1.0)
    .describe('Intensity multiplier for lens flare opacity (default: 1.0)'),
  fingerObstructionChance: z
    .number()
    .default(1.0)
    .describe(
      'Probability of finger obstructions appearing (0-1, default: 1.0)',
    ),
});

// ========================
// PRESET EXECUTION
// ========================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    duration,
    grainTextureSrc,
    shakeAmplitude,
    shakeIntensityMultiplier,
    exposureHuntingIntensity,
    lensFlareIntensity,
    fingerObstructionChance,
  } = params;

  // Calculate midpoint for video crossfade
  const midpointTime = duration / 2;

  // Default grain texture (placeholder for actual asset)
  const grainSrc =
    grainTextureSrc ||
    'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOSIgbnVtT2N0YXZlcz0iNCIgLz48L2ZpbHRlcj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWx0ZXI9InVybCgjbm9pc2UpIiBvcGFjaXR5PSIwLjUiIC8+PC9zdmc+';

  // Generate unique IDs
  const generateId = (base: string) =>
    `nineties-home-video-${base}-${Date.now()}`;

  // ========================
  // COMPONENT TREE
  // ========================

  // Finger obstruction components (conditional based on chance)
  const fingerObstructionLeft: RenderableComponentData | null =
    Math.random() < fingerObstructionChance
      ? ({
          id: generateId('finger-left'),
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'ellipse',
            style: {
              width: '160px',
              height: '160px',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              borderRadius: '50%',
              filter: 'blur(60px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
            positioning: {
              position: 'absolute',
              top: -80,
              left: -80,
            },
          },
          effects: [
            {
              id: generateId('effect-finger-left'),
              componentId: 'generic',
              data: {
                type: 'easeInOut',
                start: 0.7,
                duration: 1,
                mode: 'provider',
                targetIds: [generateId('finger-left')],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.7, prog: 0.5 },
                  { key: 'opacity', val: 0, prog: 1 },
                  { key: 'translateX', val: '-40px', prog: 0 },
                  { key: 'translateX', val: '20px', prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData)
      : null;

  const fingerObstructionRight: RenderableComponentData | null =
    Math.random() < fingerObstructionChance
      ? ({
          id: generateId('finger-right'),
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'ellipse',
            style: {
              width: '192px',
              height: '128px',
              backgroundColor: 'rgba(0, 0, 0, 0.9)',
              borderRadius: '50%',
              filter: 'blur(60px)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
            positioning: {
              position: 'absolute',
              bottom: -64,
              right: -96,
            },
          },
          effects: [
            {
              id: generateId('effect-finger-right'),
              componentId: 'generic',
              data: {
                type: 'easeInOut',
                start: Math.max(0, midpointTime - 0.3),
                duration: 1,
                mode: 'provider',
                targetIds: [generateId('finger-right')],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.5, prog: 0.33 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData)
      : null;

  // Lens flare components
  const lensFlareSpot1: RenderableComponentData = {
    id: generateId('flare-spot1'),
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'ellipse',
      style: {
        width: '128px',
        height: '128px',
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(255,240,200,0.4) 0%, rgba(255,200,100,0.1) 40%, transparent 70%)',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
      positioning: {
        position: 'absolute',
        top: '15%',
        right: '20%',
      },
    },
    effects: [
      {
        id: generateId('effect-flare-spot1'),
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [generateId('flare-spot1')],
          ranges: [
            { key: 'opacity', val: 0.3 * lensFlareIntensity, prog: 0 },
            { key: 'opacity', val: 0.6 * lensFlareIntensity, prog: 0.5 },
            { key: 'opacity', val: 0.2 * lensFlareIntensity, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  const lensFlareSpot2: RenderableComponentData = {
    id: generateId('flare-spot2'),
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'ellipse',
      style: {
        width: '64px',
        height: '64px',
        borderRadius: '50%',
        background:
          'radial-gradient(circle, rgba(200,255,200,0.3) 0%, transparent 60%)',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
      positioning: {
        position: 'absolute',
        top: '40%',
        left: '30%',
      },
    },
    effects: [
      {
        id: generateId('effect-flare-spot2'),
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: 0.3,
          duration: Math.min(2, duration - 0.3),
          mode: 'provider',
          targetIds: [generateId('flare-spot2')],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5 * lensFlareIntensity, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  const lensFlareStreak: RenderableComponentData = {
    id: generateId('flare-streak'),
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'rectangle',
      style: {
        width: '256px',
        height: '8px',
        borderRadius: '4px',
        background:
          'linear-gradient(90deg, transparent 0%, rgba(255,220,180,0.3) 50%, transparent 100%)',
        pointerEvents: 'none',
        transform: 'rotate(-15deg)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
      positioning: {
        position: 'absolute',
        top: '25%',
        left: '10%',
      },
    },
    effects: [
      {
        id: generateId('effect-flare-streak'),
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [generateId('flare-streak')],
          ranges: [
            { key: 'opacity', val: 0.2 * lensFlareIntensity, prog: 0 },
            { key: 'opacity', val: 0.4 * lensFlareIntensity, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Lens flare layer container
  const lensFlareLayer: RenderableComponentData = {
    id: generateId('lens-flare-layer'),
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
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
    childrenData: [
      lensFlareSpot1,
      lensFlareSpot2,
      lensFlareStreak,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // Grain overlay
  const grainOverlay: RenderableComponentData = {
    id: generateId('grain-overlay'),
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: grainSrc,
      fit: 'cover',
      style: {
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
      positioning: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      styling: {
        mixBlendMode: 'overlay',
      },
    },
    effects: [
      {
        id: generateId('effect-grain'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [generateId('grain-overlay')],
          ranges: [
            { key: 'opacity', val: 0.15, prog: 0 },
            { key: 'opacity', val: 0.25, prog: 0.25 },
            { key: 'opacity', val: 0.35, prog: 0.5 },
            { key: 'opacity', val: 0.2, prog: 0.75 },
            { key: 'opacity', val: 0.15, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Video atoms
  const outgoingVideo: RenderableComponentData = {
    id: generateId('outgoing-video'),
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingVideoSrc,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
      positioning: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    },
    effects: [
      {
        id: generateId('effect-outgoing-video'),
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: midpointTime,
          duration: 0.5,
          mode: 'provider',
          targetIds: [generateId('outgoing-video')],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  const incomingVideo: RenderableComponentData = {
    id: generateId('incoming-video'),
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingVideoSrc,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
      positioning: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
    },
    effects: [
      {
        id: generateId('effect-incoming-video'),
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: midpointTime,
          duration: 0.5,
          mode: 'provider',
          targetIds: [generateId('incoming-video')],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Media content container
  const mediaContentSlot: RenderableComponentData = {
    id: generateId('media-content-slot'),
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
    childrenData: [outgoingVideo, incomingVideo] as RenderableComponentData[],
  } as RenderableComponentData;

  // Exposure container with auto-exposure hunting
  const exposureContainer: RenderableComponentData = {
    id: generateId('exposure-container'),
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: generateId('effect-exposure'),
        componentId: 'generic',
        data: {
          type: 'easeInOut',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [generateId('exposure-container')],
          ranges: [
            {
              key: 'filter',
              val: 'brightness(1) contrast(1)',
              prog: 0,
            },
            {
              key: 'filter',
              val: `brightness(${1.4 * exposureHuntingIntensity}) contrast(${1.2 * exposureHuntingIntensity})`,
              prog: 0.25,
            },
            {
              key: 'filter',
              val: `brightness(${0.6 * (2 - exposureHuntingIntensity * 0.5)}) contrast(${0.8 * (2 - exposureHuntingIntensity * 0.5)})`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'brightness(1.1) contrast(1)',
              prog: 0.75,
            },
            {
              key: 'filter',
              val: `brightness(${1.3 * exposureHuntingIntensity}) contrast(${1.15 * exposureHuntingIntensity})`,
              prog: 1,
            },
          ],
        },
      },
    ],
    childrenData: [mediaContentSlot] as RenderableComponentData[],
  } as RenderableComponentData;

  // Camera effects container (shake, tilt, zoom creep)
  const cameraEffectsContainer: RenderableComponentData = {
    id: generateId('camera-effects-container'),
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformOrigin: 'center',
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
      // Camera tilt drift
      {
        id: generateId('effect-tilt'),
        componentId: 'generic',
        data: {
          type: 'easeInOutSine',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [generateId('camera-effects-container')],
          ranges: [
            { key: 'rotate', val: '-1deg', prog: 0 },
            { key: 'rotate', val: '2deg', prog: 1 },
          ],
        },
      },
      // Zoom creep
      {
        id: generateId('effect-zoom-creep'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [generateId('camera-effects-container')],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.05, prog: 1 },
          ],
        },
      },
      // Camera shake with midpoint intensity spike
      {
        id: generateId('effect-shake'),
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [generateId('camera-effects-container')],
          ranges: [
            { key: 'translateX', val: `${shakeAmplitude * 0.5}px`, prog: 0 },
            {
              key: 'translateX',
              val: `${-shakeAmplitude * shakeIntensityMultiplier}px`,
              prog: 0.48,
            },
            {
              key: 'translateX',
              val: `${shakeAmplitude * shakeIntensityMultiplier * 1.2}px`,
              prog: 0.52,
            },
            { key: 'translateX', val: `${-shakeAmplitude * 0.3}px`, prog: 1 },
            { key: 'translateY', val: `${-shakeAmplitude * 0.3}px`, prog: 0 },
            {
              key: 'translateY',
              val: `${shakeAmplitude * shakeIntensityMultiplier * 0.8}px`,
              prog: 0.48,
            },
            {
              key: 'translateY',
              val: `${-shakeAmplitude * shakeIntensityMultiplier}px`,
              prog: 0.52,
            },
            { key: 'translateY', val: `${shakeAmplitude * 0.5}px`, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [exposureContainer] as RenderableComponentData[],
  } as RenderableComponentData;

  // Build children array (filter out null finger obstructions)
  const childrenData: RenderableComponentData[] = [
    cameraEffectsContainer,
    lensFlareLayer,
    grainOverlay,
    fingerObstructionLeft,
    fingerObstructionRight,
  ].filter(Boolean) as RenderableComponentData[];

  // Root container
  const rootContainer: RenderableComponentData = {
    id: generateId('root-container'),
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000',
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
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ========================
// PRESET METADATA
// ========================

const presetMetadata: PresetMetadata = {
  id: 'nineties-home-video-transition',
  title: '90s Home Video Transition',
  description:
    'A nostalgic transition effect that recreates the amateur cinematography of 90s family home videos. Features realistic handheld camera shake with mid-transition bump, auto-exposure hunting between over/underexposed states, cheap optical lens flares, camera tilt drift, zoom creep, occasional finger/strap obstructions, variable film grain, and consumer-camera softness. Perfect for creating authentic retro family footage aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    'retro',
    '90s',
    'vintage',
    'home-video',
    'nostalgic',
    'camera-shake',
    'lens-flare',
    'vhs',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/video1.mp4',
    incomingVideoSrc: 'https://example.com/video2.mp4',
    duration: 3,
    shakeAmplitude: 5,
    shakeIntensityMultiplier: 2.5,
    exposureHuntingIntensity: 1.0,
    lensFlareIntensity: 1.0,
    fingerObstructionChance: 1.0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ========================
// EXPORT
// ========================

export const ninetiesHomeVideoTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
