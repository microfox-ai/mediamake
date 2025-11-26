/**
 * Game Engine Wireframe Render Transition Preset
 *
 * This preset creates a technical transition effect that mimics a game engine rendering process.
 * It transforms the outgoing scene into a wireframe mesh with color-coded neon edges (cyan for 
 * geometry, magenta for UI, yellow for interactive elements), then progressively fills surfaces 
 * through a scanning render pass with technical HUD overlays showing polygon count, shader 
 * compilation, and FPS counters, culminating in post-processing effects like bloom and ambient 
 * occlusion.
 *
 * Features:
 * - **Wireframe Phase**: Outgoing scene converts to wireframe with pulsing neon edges
 * - **Color-Coded Elements**: Cyan for geometry, magenta for UI, yellow for interactive objects
 * - **Scanning Effect**: Horizontal scan line "paints" details as it sweeps across
 * - **Surface Fill**: Progressive rendering with solid colors, gradients, then textures
 * - **Technical HUD**: Live polygon count, shader progress, FPS counter, and render phase
 * - **Post-Processing**: Bloom overlay and ambient occlusion for cinematic finish
 *
 * Use cases:
 * - Tech/gaming content transitions
 * - Behind-the-scenes rendering visualizations
 * - Developer diary or making-of sequences
 * - Futuristic/cyberpunk aesthetic transitions
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Define preset parameters
const presetParams = z.object({
  outgoingMediaSrc: z.string().describe('Source URL for the outgoing media (video or image)'),
  incomingMediaSrc: z.string().describe('Source URL for the incoming media (video or image)'),
  textureSrc: z.string().optional().describe('Optional texture image for surface fill phase'),
  duration: z.number().default(2.6).describe('Total transition duration in seconds'),
  wireframePulseDuration: z.number().default(0.8).describe('Duration of wireframe pulse animation'),
  scanSpeed: z.number().default(1.0).describe('Speed multiplier for scanning line (1.0 = normal)'),
  postProcessIntensity: z.number().default(1.0).describe('Intensity of bloom and AO effects (0.5-2.0)'),
  showTechnicalHUD: z.boolean().default(true).describe('Show or hide technical HUD overlay'),
  polygonCount: z.number().default(128456).describe('Polygon count to display in HUD'),
  targetFPS: z.number().default(60).describe('Target FPS to display in HUD'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingMediaSrc,
    incomingMediaSrc,
    textureSrc,
    duration,
    wireframePulseDuration,
    scanSpeed,
    postProcessIntensity,
    showTechnicalHUD,
    polygonCount,
    targetFPS,
  } = params;

  // Calculate phase timings
  const wireframePhaseStart = 0;
  const wireframePhaseDuration = duration * 0.5; // 0-50%
  
  const scanPhaseStart = duration * 0.2; // 20%
  const scanPhaseDuration = duration * 0.4; // 20-60%
  
  const fillPhaseStart = duration * 0.4; // 40%
  const fillPhaseDuration = duration * 0.45; // 40-85%
  
  const incomingSceneStart = duration * 0.4; // 40%
  const incomingSceneDuration = duration * 0.6; // 40-100%
  
  const postProcessStart = duration * 0.85; // 85%
  const postProcessDuration = duration * 0.15; // 85-100%

  const hudStart = duration * 0.1; // 10%
  const hudDuration = duration * 0.85; // 10-95%

  // Helper: Generate unique IDs
  const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).substr(2, 9)}`;

  // === OUTGOING SCENE ===
  const outgoingMediaId = generateId('outgoing-media');
  const outgoingMedia: RenderableComponentData = {
    id: outgoingMediaId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: outgoingMediaSrc,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: wireframePhaseDuration,
      },
    },
    effects: [
      // Fade out during wireframe phase
      {
        id: generateId('outgoing-fade-effect'),
        componentId: outgoingMediaId,
        data: {
          type: 'linear',
          start: 0,
          duration: wireframePhaseDuration * 0.6,
          mode: 'provider',
          targetIds: [outgoingMediaId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // === WIREFRAME MESH LAYER ===
  // Geometry wireframe (cyan)
  const geoLines: RenderableComponentData[] = [
    // Vertical lines
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: 2, height: '100%', fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-[10%] top-0' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: 2, height: '100%', fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-[30%] top-0' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: 2, height: '100%', fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-[50%] top-0' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: 2, height: '100%', fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-[70%] top-0' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    // Horizontal lines
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: '100%', height: 2, fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-0 top-[20%]' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: '100%', height: 2, fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-0 top-[40%]' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: '100%', height: 2, fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-0 top-[60%]' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('geo-line'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: '100%', height: 2, fill: 'transparent', stroke: '#22d3ee', strokeWidth: 1, className: 'absolute left-0 top-[80%]' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
  ];

  // Add pulse effect to geometry wireframe
  geoLines.forEach((line) => {
    line.effects = [
      {
        id: generateId('geo-pulse-effect'),
        componentId: line.id,
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: wireframePulseDuration,
          mode: 'loop',
          targetIds: [line.id],
          ranges: [
            { key: 'opacity', val: 0.4, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.4, prog: 1 },
          ],
        },
      },
    ];
  });

  // UI wireframe (magenta)
  const uiBoxes: RenderableComponentData[] = [
    { id: generateId('ui-box'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: 200, height: 100, fill: 'transparent', stroke: '#e879f9', strokeWidth: 2, className: 'absolute top-4 right-4' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('ui-box'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: 150, height: 60, fill: 'transparent', stroke: '#e879f9', strokeWidth: 2, className: 'absolute bottom-4 left-4' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
  ];

  uiBoxes.forEach((box) => {
    box.effects = [
      {
        id: generateId('ui-pulse-effect'),
        componentId: box.id,
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: wireframePulseDuration * 1.2,
          mode: 'loop',
          targetIds: [box.id],
          ranges: [
            { key: 'opacity', val: 0.5, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        },
      },
    ];
  });

  // Interactive wireframe (yellow)
  const interactiveElements: RenderableComponentData[] = [
    { id: generateId('interactive'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'circle', width: 80, height: 80, fill: 'transparent', stroke: '#facc15', strokeWidth: 2, className: 'absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
    { id: generateId('interactive'), type: 'atom', componentId: 'ShapeAtom', data: { shapeType: 'rect', width: 120, height: 50, fill: 'transparent', stroke: '#facc15', strokeWidth: 2, className: 'absolute top-1/3 right-1/4' }, context: { timing: { start: 0, duration: wireframePhaseDuration } } },
  ];

  interactiveElements.forEach((elem) => {
    elem.effects = [
      {
        id: generateId('interactive-pulse-effect'),
        componentId: elem.id,
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: wireframePulseDuration * 0.9,
          mode: 'loop',
          targetIds: [elem.id],
          ranges: [
            { key: 'opacity', val: 0.6, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0.6, prog: 1 },
          ],
        },
      },
    ];
  });

  const wireframeMeshLayerId = generateId('wireframe-mesh-layer');
  const wireframeMeshLayer: RenderableComponentData = {
    id: wireframeMeshLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: wireframePhaseStart,
        duration: wireframePhaseDuration,
      },
    },
    childrenData: [...geoLines, ...uiBoxes, ...interactiveElements],
  };

  // === SCANNING LINE ===
  const scanLineId = generateId('scan-line');
  const scanLine: RenderableComponentData = {
    id: scanLineId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shapeType: 'rect',
      width: 4,
      height: '100%',
      fill: 'white',
      className: 'absolute top-0 left-0',
      style: {
        boxShadow: '0 0 20px 8px rgba(255, 255, 255, 0.8)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: scanPhaseDuration,
      },
    },
    effects: [
      {
        id: generateId('scan-effect'),
        componentId: scanLineId,
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: scanPhaseDuration / scanSpeed,
          mode: 'provider',
          targetIds: [scanLineId],
          ranges: [
            { key: 'translateX', val: '0vw', prog: 0 },
            { key: 'translateX', val: '100vw', prog: 1 },
          ],
        },
      },
    ],
  };

  const scanningLayerId = generateId('scanning-layer');
  const scanningLayer: RenderableComponentData = {
    id: scanningLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
      },
    },
    context: {
      timing: {
        start: scanPhaseStart,
        duration: scanPhaseDuration,
      },
    },
    childrenData: [scanLine],
  };

  // === SURFACE FILL LAYER ===
  const solidColorFillId = generateId('solid-color-fill');
  const solidColorFill: RenderableComponentData = {
    id: solidColorFillId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-[#1a1a2e]',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fillPhaseDuration,
      },
    },
    effects: [
      {
        id: generateId('solid-fade-in'),
        componentId: solidColorFillId,
        data: {
          type: 'ease-in',
          start: 0,
          duration: fillPhaseDuration * 0.3,
          mode: 'provider',
          targetIds: [solidColorFillId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  const gradientOverlayId = generateId('gradient-overlay');
  const gradientOverlay: RenderableComponentData = {
    id: gradientOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600',
      },
    },
    context: {
      timing: {
        start: fillPhaseDuration * 0.3,
        duration: fillPhaseDuration * 0.7,
      },
    },
    effects: [
      {
        id: generateId('gradient-fade-in'),
        componentId: gradientOverlayId,
        data: {
          type: 'ease-in',
          start: 0,
          duration: fillPhaseDuration * 0.3,
          mode: 'provider',
          targetIds: [gradientOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 1 },
          ],
        },
      },
    ],
  };

  const textureLayerId = generateId('texture-layer');
  const textureLayer: RenderableComponentData | null = textureSrc ? {
    id: textureLayerId,
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: textureSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: fillPhaseDuration * 0.5,
        duration: fillPhaseDuration * 0.5,
      },
    },
    effects: [
      {
        id: generateId('texture-fade-in'),
        componentId: textureLayerId,
        data: {
          type: 'ease-in',
          start: 0,
          duration: fillPhaseDuration * 0.3,
          mode: 'provider',
          targetIds: [textureLayerId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      },
    ],
  } : null;

  const surfaceFillLayerId = generateId('surface-fill-layer');
  const surfaceFillLayer: RenderableComponentData = {
    id: surfaceFillLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: fillPhaseStart,
        duration: fillPhaseDuration,
      },
    },
    childrenData: [
      solidColorFill,
      gradientOverlay,
      ...(textureLayer ? [textureLayer] : []),
    ],
  };

  // === INCOMING SCENE ===
  const incomingMediaId = generateId('incoming-media');
  const incomingMedia: RenderableComponentData = {
    id: incomingMediaId,
    type: 'atom',
    componentId: 'VideoAtom',
    data: {
      src: incomingMediaSrc,
      className: 'w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: incomingSceneDuration,
      },
    },
    effects: [
      {
        id: generateId('incoming-fade-in'),
        componentId: incomingMediaId,
        data: {
          type: 'ease-in',
          start: 0,
          duration: incomingSceneDuration * 0.4,
          mode: 'provider',
          targetIds: [incomingMediaId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const incomingSceneId = generateId('incoming-scene');
  const incomingScene: RenderableComponentData = {
    id: incomingSceneId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: incomingSceneStart,
        duration: incomingSceneDuration,
      },
    },
    childrenData: [incomingMedia],
  };

  // === POST-PROCESSING LAYER ===
  const bloomOverlayId = generateId('bloom-overlay');
  const bloomOverlay: RenderableComponentData = {
    id: bloomOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gradient-radial from-white/20 to-transparent',
        style: {
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: postProcessDuration,
      },
    },
    effects: [
      {
        id: generateId('bloom-fade-in'),
        componentId: bloomOverlayId,
        data: {
          type: 'ease-in',
          start: 0,
          duration: postProcessDuration,
          mode: 'provider',
          targetIds: [bloomOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: postProcessIntensity * 0.8, prog: 1 },
          ],
        },
      },
    ],
  };

  const aoOverlayId = generateId('ao-overlay');
  const aoOverlay: RenderableComponentData = {
    id: aoOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/30',
        style: {
          mixBlendMode: 'multiply',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: postProcessDuration,
      },
    },
    effects: [
      {
        id: generateId('ao-fade-in'),
        componentId: aoOverlayId,
        data: {
          type: 'ease-in',
          start: 0,
          duration: postProcessDuration,
          mode: 'provider',
          targetIds: [aoOverlayId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: postProcessIntensity * 0.6, prog: 1 },
          ],
        },
      },
    ],
  };

  const postProcessingLayerId = generateId('post-processing-layer');
  const postProcessingLayer: RenderableComponentData = {
    id: postProcessingLayerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: postProcessStart,
        duration: postProcessDuration,
      },
    },
    childrenData: [bloomOverlay, aoOverlay],
  };

  // === TECHNICAL HUD ===
  const hudChildren: RenderableComponentData[] = [];

  if (showTechnicalHUD) {
    hudChildren.push(
      {
        id: generateId('polygon-text'),
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: `POLYGONS: ${polygonCount.toLocaleString()}`,
          style: { fontSize: '12px', color: '#4ade80', fontFamily: 'monospace' },
        },
        context: { timing: { start: 0, duration: hudDuration } },
      },
      {
        id: generateId('shader-label'),
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: 'SHADER COMPILE:',
          style: { fontSize: '12px', color: '#4ade80', fontFamily: 'monospace', marginTop: '4px' },
        },
        context: { timing: { start: 0, duration: hudDuration } },
      },
    );

    const shaderBarFillId = generateId('shader-bar-fill');
    const shaderBarContainer: RenderableComponentData = {
      id: generateId('shader-bar-container'),
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'w-32 h-2 bg-gray-800 rounded overflow-hidden',
          style: { marginTop: '4px' },
        },
      },
      context: { timing: { start: 0, duration: hudDuration } },
      childrenData: [
        {
          id: shaderBarFillId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'h-full bg-green-500',
            },
          },
          context: { timing: { start: 0, duration: hudDuration } },
          effects: [
            {
              id: generateId('shader-progress-effect'),
              componentId: shaderBarFillId,
              data: {
                type: 'linear',
                start: 0,
                duration: hudDuration * 0.7,
                mode: 'provider',
                targetIds: [shaderBarFillId],
                ranges: [
                  { key: 'scaleX', val: 0, prog: 0 },
                  { key: 'scaleX', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
      ],
    };

    hudChildren.push(shaderBarContainer);

    hudChildren.push(
      {
        id: generateId('fps-text'),
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: `FPS: ${targetFPS}`,
          style: { fontSize: '12px', color: '#4ade80', fontFamily: 'monospace', marginTop: '4px' },
        },
        context: { timing: { start: 0, duration: hudDuration } },
      },
      {
        id: generateId('phase-text'),
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: 'PHASE: RENDERING',
          style: { fontSize: '12px', color: '#22d3ee', fontFamily: 'monospace', marginTop: '4px' },
        },
        context: { timing: { start: 0, duration: hudDuration } },
      },
    );
  }

  const technicalHudId = generateId('technical-hud');
  const technicalHud: RenderableComponentData | null = showTechnicalHUD ? {
    id: technicalHudId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-4 left-4 flex flex-col gap-1 z-50',
      },
    },
    context: {
      timing: {
        start: hudStart,
        duration: hudDuration,
      },
    },
    childrenData: hudChildren,
  } : null;

  // === ROOT CONTAINER ===
  const rootContainerId = generateId('wireframe-render-root');
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden bg-black',
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
        id: generateId('outgoing-scene-container'),
        type: 'layout',
        componentId: 'BaseLayout',
        data: { containerProps: { className: 'absolute inset-0' } },
        context: { timing: { start: 0, duration: wireframePhaseDuration } },
        childrenData: [outgoingMedia],
      },
      wireframeMeshLayer,
      scanningLayer,
      surfaceFillLayer,
      incomingScene,
      postProcessingLayer,
      ...(technicalHud ? [technicalHud] : []),
    ],
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
  id: 'wireframeRenderTransition',
  title: 'Game Engine Wireframe Render Transition',
  description:
    'A technical transition effect that mimics a game engine rendering process, transforming the outgoing scene into a wireframe mesh with color-coded neon edges (cyan for geometry, magenta for UI, yellow for interactive elements), then progressively filling surfaces through a scanning render pass with technical HUD overlays showing polygon count, shader compilation, and FPS counters, culminating in post-processing effects like bloom and ambient occlusion.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'wireframe',
    'game-engine',
    'technical',
    'rendering',
    'neon',
    'scanning',
    'hud',
    'bloom',
    'post-processing',
    'cyberpunk',
    'tech',
  ],
  defaultInputParams: {
    outgoingMediaSrc: 'https://example.com/outgoing.mp4',
    incomingMediaSrc: 'https://example.com/incoming.mp4',
    duration: 2.6,
    wireframePulseDuration: 0.8,
    scanSpeed: 1.0,
    postProcessIntensity: 1.0,
    showTechnicalHUD: true,
    polygonCount: 128456,
    targetFPS: 60,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const wireframeRenderTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
