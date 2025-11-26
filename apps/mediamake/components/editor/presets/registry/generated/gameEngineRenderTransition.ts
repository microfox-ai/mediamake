/**
 * Game Engine Render Pipeline Transition Preset
 *
 * This preset simulates a technical game engine rendering pipeline transition. The outgoing scene
 * converts to a wireframe debug view with color-coded mesh overlays (cyan for geometry, magenta
 * for UI elements, yellow for interactive objects). A scanning line sweeps across the scene,
 * progressively filling in surfaces with colors, gradients, and textures. Technical HUD displays
 * real-time polygon counts, shader compilation progress, and FPS metrics. Post-processing effects
 * (bloom, ambient occlusion) fade in to complete the transition to the new scene.
 *
 * Features:
 * - **Wireframe Debug View**: Converts outgoing scene to edge-detected wireframe with color-coded meshes
 * - **Scanning Line Effect**: Sweeping scan line that "paints" in details as it passes
 * - **Progressive Rendering**: Surfaces fill in with colors → gradients → textures in sequence
 * - **Technical HUD**: Real-time readouts for polygon count, shader compilation, FPS, and render phase
 * - **Post-Processing Effects**: Bloom and ambient occlusion fade in to complete the scene
 * - **Pulsing Wireframe**: Animated stroke opacity and brightness for wireframe meshes
 *
 * Use cases:
 * - Game development showcases or tutorials
 * - Technical content about 3D rendering pipelines
 * - Futuristic tech-themed transitions
 * - Behind-the-scenes content showing rendering processes
 * - Developer diaries or technical breakdowns
 */

import z from 'zod';
import { RenderableComponentData } from '@microfox/datamotion';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// Parameter schema
const presetParams = z.object({
  outgoingVideoSrc: z
    .string()
    .describe('Source URL for the outgoing video clip'),
  incomingVideoSrc: z
    .string()
    .describe('Source URL for the incoming video clip'),
  transitionDuration: z
    .number()
    .default(2.6)
    .describe('Total duration of the transition in seconds'),
  wireframeDuration: z
    .number()
    .default(0.5)
    .describe('Duration of the wireframe phase in seconds'),
  scanningDuration: z
    .number()
    .default(1.0)
    .describe('Duration of the scanning phase in seconds'),
  surfaceFillingDuration: z
    .number()
    .default(0.8)
    .describe('Duration of the surface filling phase in seconds'),
  postProcessDuration: z
    .number()
    .default(0.3)
    .describe('Duration of the post-processing phase in seconds'),
  texturePattern: z
    .string()
    .optional()
    .describe('Optional URL for texture pattern image'),
  initialPolygonCount: z
    .number()
    .default(1247)
    .describe('Initial polygon count displayed in HUD'),
  finalPolygonCount: z
    .number()
    .default(8543)
    .describe('Final polygon count displayed in HUD'),
  showTechnicalHUD: z
    .boolean()
    .default(true)
    .describe('Whether to display the technical HUD overlay'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideoSrc,
    incomingVideoSrc,
    transitionDuration = 2.6,
    wireframeDuration = 0.5,
    scanningDuration = 1.0,
    surfaceFillingDuration = 0.8,
    postProcessDuration = 0.3,
    texturePattern,
    initialPolygonCount = 1247,
    finalPolygonCount = 8543,
    showTechnicalHUD = true,
  } = params;

  // Calculate phase timings
  const wireframeStart = 0;
  const wireframeEnd = wireframeDuration;
  const scanningStart = wireframeEnd;
  const scanningEnd = scanningStart + scanningDuration;
  const surfaceFillingStart = scanningEnd;
  const surfaceFillingEnd = surfaceFillingStart + surfaceFillingDuration;
  const postProcessStart = surfaceFillingEnd;
  const postProcessEnd = postProcessStart + postProcessDuration;

  // Generate unique IDs
  const containerId = 'gameEngineRender-container';
  const outgoingContainerId = 'gameEngineRender-outgoingContainer';
  const outgoingVideoId = 'gameEngineRender-outgoingVideo';
  const incomingContainerId = 'gameEngineRender-incomingContainer';
  const incomingVideoId = 'gameEngineRender-incomingVideo';
  const wireframeOverlayId = 'gameEngineRender-wireframeOverlay';
  const geometryWireframeId = 'gameEngineRender-geometryWireframe';
  const uiWireframeId = 'gameEngineRender-uiWireframe';
  const interactiveWireframeId = 'gameEngineRender-interactiveWireframe';
  const scanLineContainerId = 'gameEngineRender-scanLineContainer';
  const scanLineId = 'gameEngineRender-scanLine';
  const surfaceFillLayersId = 'gameEngineRender-surfaceFillLayers';
  const solidColorFillId = 'gameEngineRender-solidColorFill';
  const gradientFillId = 'gameEngineRender-gradientFill';
  const textureFillId = 'gameEngineRender-textureFill';
  const postProcessingLayerId = 'gameEngineRender-postProcessingLayer';
  const bloomEffectId = 'gameEngineRender-bloomEffect';
  const ambientOcclusionId = 'gameEngineRender-ambientOcclusion';
  const technicalHUDId = 'gameEngineRender-technicalHUD';
  const polygonCounterId = 'gameEngineRender-polygonCounter';
  const shaderProgressContainerId = 'gameEngineRender-shaderProgressContainer';
  const shaderLabelId = 'gameEngineRender-shaderLabel';
  const shaderBarWrapperId = 'gameEngineRender-shaderBarWrapper';
  const shaderBarBgId = 'gameEngineRender-shaderBarBg';
  const shaderBarFillId = 'gameEngineRender-shaderBarFill';
  const fpsCounterId = 'gameEngineRender-fpsCounter';
  const renderPhaseIndicatorId = 'gameEngineRender-renderPhaseIndicator';

  // Build effects array
  const effects: any[] = [];

  // Outgoing scene effects (fade to grayscale wireframe view)
  effects.push({
    id: `${outgoingVideoId}-wireframeEffect`,
    componentId: outgoingVideoId,
    data: {
      type: 'linear',
      start: wireframeStart,
      duration: wireframeDuration,
      mode: 'provider',
      targetIds: [outgoingVideoId],
      ranges: [
        { key: 'filter:brightness', val: 1, prog: 0 },
        { key: 'filter:brightness', val: 0.75, prog: 1 },
        { key: 'filter:contrast', val: 1, prog: 0 },
        { key: 'filter:contrast', val: 1.5, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${outgoingContainerId}-fadeOut`,
    componentId: outgoingContainerId,
    data: {
      type: 'linear',
      start: surfaceFillingStart,
      duration: surfaceFillingDuration * 0.5,
      mode: 'provider',
      targetIds: [outgoingContainerId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });

  // Wireframe mesh animations (geometry - cyan)
  effects.push({
    id: `${geometryWireframeId}-pulseIn`,
    componentId: geometryWireframeId,
    data: {
      type: 'ease-in-out',
      start: wireframeStart,
      duration: wireframeDuration,
      mode: 'provider',
      targetIds: [geometryWireframeId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'filter:brightness', val: 1, prog: 0 },
        { key: 'filter:brightness', val: 1.5, prog: 0.5 },
        { key: 'filter:brightness', val: 1, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${geometryWireframeId}-pulseLoop`,
    componentId: geometryWireframeId,
    data: {
      type: 'ease-in-out',
      start: wireframeEnd,
      duration: scanningDuration,
      mode: 'provider',
      targetIds: [geometryWireframeId],
      ranges: [
        { key: 'filter:brightness', val: 1, prog: 0 },
        { key: 'filter:brightness', val: 1.3, prog: 0.5 },
        { key: 'filter:brightness', val: 1, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${geometryWireframeId}-fadeOut`,
    componentId: geometryWireframeId,
    data: {
      type: 'ease-out',
      start: postProcessStart,
      duration: postProcessDuration,
      mode: 'provider',
      targetIds: [geometryWireframeId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });

  // Wireframe mesh animations (UI - magenta)
  effects.push({
    id: `${uiWireframeId}-pulseIn`,
    componentId: uiWireframeId,
    data: {
      type: 'ease-in-out',
      start: wireframeStart,
      duration: wireframeDuration,
      mode: 'provider',
      targetIds: [uiWireframeId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'filter:brightness', val: 1, prog: 0 },
        { key: 'filter:brightness', val: 1.5, prog: 0.5 },
        { key: 'filter:brightness', val: 1, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${uiWireframeId}-fadeOut`,
    componentId: uiWireframeId,
    data: {
      type: 'ease-out',
      start: postProcessStart,
      duration: postProcessDuration,
      mode: 'provider',
      targetIds: [uiWireframeId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });

  // Wireframe mesh animations (interactive - yellow)
  effects.push({
    id: `${interactiveWireframeId}-pulseIn`,
    componentId: interactiveWireframeId,
    data: {
      type: 'ease-in-out',
      start: wireframeStart,
      duration: wireframeDuration,
      mode: 'provider',
      targetIds: [interactiveWireframeId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'filter:brightness', val: 1, prog: 0 },
        { key: 'filter:brightness', val: 1.8, prog: 0.5 },
        { key: 'filter:brightness', val: 1, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${interactiveWireframeId}-fadeOut`,
    componentId: interactiveWireframeId,
    data: {
      type: 'ease-out',
      start: postProcessStart,
      duration: postProcessDuration,
      mode: 'provider',
      targetIds: [interactiveWireframeId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  });

  // Scanning line animation
  effects.push({
    id: `${scanLineId}-scan`,
    componentId: scanLineId,
    data: {
      type: 'ease-in-out',
      start: scanningStart,
      duration: scanningDuration,
      mode: 'provider',
      targetIds: [scanLineId],
      ranges: [
        { key: 'translateX', val: '-100%', prog: 0 },
        { key: 'translateX', val: '100vw', prog: 1 },
      ],
    },
  });

  // Surface fill layers (sequential fade-in)
  effects.push({
    id: `${solidColorFillId}-fadeIn`,
    componentId: solidColorFillId,
    data: {
      type: 'ease-in',
      start: surfaceFillingStart,
      duration: surfaceFillingDuration * 0.3,
      mode: 'provider',
      targetIds: [solidColorFillId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${gradientFillId}-fadeIn`,
    componentId: gradientFillId,
    data: {
      type: 'ease-in',
      start: surfaceFillingStart + surfaceFillingDuration * 0.2,
      duration: surfaceFillingDuration * 0.3,
      mode: 'provider',
      targetIds: [gradientFillId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${textureFillId}-fadeIn`,
    componentId: textureFillId,
    data: {
      type: 'ease-in',
      start: surfaceFillingStart + surfaceFillingDuration * 0.4,
      duration: surfaceFillingDuration * 0.4,
      mode: 'provider',
      targetIds: [textureFillId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  // Incoming scene fade-in
  effects.push({
    id: `${incomingContainerId}-fadeIn`,
    componentId: incomingContainerId,
    data: {
      type: 'ease-in',
      start: surfaceFillingStart,
      duration: surfaceFillingDuration,
      mode: 'provider',
      targetIds: [incomingContainerId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  // Post-processing effects fade-in
  effects.push({
    id: `${bloomEffectId}-fadeIn`,
    componentId: bloomEffectId,
    data: {
      type: 'ease-in',
      start: postProcessStart,
      duration: postProcessDuration,
      mode: 'provider',
      targetIds: [bloomEffectId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  effects.push({
    id: `${ambientOcclusionId}-fadeIn`,
    componentId: ambientOcclusionId,
    data: {
      type: 'ease-in',
      start: postProcessStart,
      duration: postProcessDuration,
      mode: 'provider',
      targetIds: [ambientOcclusionId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    },
  });

  // Shader progress bar animation
  effects.push({
    id: `${shaderBarFillId}-progress`,
    componentId: shaderBarFillId,
    data: {
      type: 'ease-in-out',
      start: scanningStart,
      duration: scanningDuration,
      mode: 'provider',
      targetIds: [shaderBarFillId],
      ranges: [
        { key: 'width', val: '0%', prog: 0 },
        { key: 'width', val: '100%', prog: 1 },
      ],
    },
  });

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    // Outgoing scene container
    {
      id: outgoingContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            filter: 'grayscale(1)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: outgoingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: outgoingVideoSrc,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData,

    // Incoming scene container
    {
      id: incomingContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            opacity: 0,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: incomingVideoId,
          type: 'atom',
          componentId: 'VideoAtom',
          data: {
            src: incomingVideoSrc,
            className: 'w-full h-full object-cover',
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData,

    // Wireframe mesh overlay
    {
      id: wireframeOverlayId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: geometryWireframeId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'custom',
            className: 'absolute inset-0',
            svgContent: `<svg viewBox="0 0 1920 1080" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L640,360 L320,720 Z M640,0 L1280,360 L960,720 Z M1280,0 L1920,360 L1600,720 Z M0,360 L640,720 L320,1080 Z M640,360 L1280,720 L960,1080 Z M1280,360 L1920,720 L1600,1080 Z M320,180 L960,540 L640,900 Z M960,180 L1600,540 L1280,900 Z" stroke="#22d3ee" fill="none" stroke-width="1" opacity="0"/></svg>`,
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: uiWireframeId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'custom',
            className: 'absolute top-0 left-0',
            svgContent: `<svg width="384" height="256" xmlns="http://www.w3.org/2000/svg"><path d="M0,0 L384,0 L384,256 L0,256 Z M0,0 L384,256 M384,0 L0,256" stroke="#e879f9" fill="none" stroke-width="1" opacity="0"/></svg>`,
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: interactiveWireframeId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'custom',
            className: 'absolute',
            style: {
              bottom: '5rem',
              right: '5rem',
            },
            svgContent: `<svg width="192" height="192" xmlns="http://www.w3.org/2000/svg"><path d="M96,0 L192,96 L96,192 L0,96 Z M96,48 L144,96 L96,144 L48,96 Z" stroke="#facc15" fill="none" stroke-width="1.5" opacity="0"/></svg>`,
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData,

    // Scanning line container
    {
      id: scanLineContainerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: scanLineId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'rectangle',
            className: 'absolute left-0 top-0 bottom-0',
            style: {
              width: '4px',
              background:
                'linear-gradient(to right, transparent, rgba(255,255,255,0.9), transparent)',
              boxShadow: '0 0 20px 5px rgba(255,255,255,0.5)',
              transform: 'translateX(-100%)',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData,

    // Surface fill layers
    {
      id: surfaceFillLayersId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: solidColorFillId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'rectangle',
            className: 'absolute inset-0',
            style: {
              backgroundColor: 'rgba(100, 100, 100, 0.3)',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: gradientFillId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'rectangle',
            className: 'absolute inset-0',
            style: {
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(147,51,234,0.4))',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: textureFillId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'rectangle',
            className: 'absolute inset-0',
            style: {
              backgroundImage: texturePattern
                ? `url(${texturePattern})`
                : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 10px, transparent 10px, transparent 20px)',
              backgroundSize: 'cover',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData,

    // Post-processing layer
    {
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
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: bloomEffectId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'rectangle',
            className: 'absolute inset-0',
            style: {
              background:
                'radial-gradient(ellipse at center, rgba(255,255,255,0.15), transparent 70%)',
              mixBlendMode: 'overlay',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: ambientOcclusionId,
          type: 'atom',
          componentId: 'ShapeAtom',
          data: {
            shapeType: 'rectangle',
            className: 'absolute inset-0',
            style: {
              background:
                'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3))',
              mixBlendMode: 'multiply',
              opacity: 0,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Technical HUD (optional)
  if (showTechnicalHUD) {
    childrenData.push({
      id: technicalHUDId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className:
            'absolute top-4 left-4 font-mono text-xs text-green-400 flex flex-col gap-1 z-50',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      childrenData: [
        {
          id: polygonCounterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: `POLYGONS: ${initialPolygonCount}`,
            className: 'text-green-400 font-mono text-xs',
            style: {
              fontFamily: 'monospace',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: shaderProgressContainerId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row items-center gap-2',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
          childrenData: [
            {
              id: shaderLabelId,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: 'SHADER COMPILE:',
                className: 'text-green-400 font-mono text-xs',
                style: {
                  fontFamily: 'monospace',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
            },
            {
              id: shaderBarWrapperId,
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'relative w-24 h-2',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: transitionDuration,
                },
              },
              childrenData: [
                {
                  id: shaderBarBgId,
                  type: 'atom',
                  componentId: 'ShapeAtom',
                  data: {
                    shapeType: 'rectangle',
                    className: 'absolute inset-0 rounded',
                    style: {
                      backgroundColor: 'rgba(34, 197, 94, 0.3)',
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: transitionDuration,
                    },
                  },
                },
                {
                  id: shaderBarFillId,
                  type: 'atom',
                  componentId: 'ShapeAtom',
                  data: {
                    shapeType: 'rectangle',
                    className: 'absolute left-0 top-0 h-full rounded',
                    style: {
                      backgroundColor: '#22c55e',
                      width: '0%',
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration: transitionDuration,
                    },
                  },
                },
              ],
            },
          ],
        },
        {
          id: fpsCounterId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: 'FPS: 60',
            className: 'text-green-400 font-mono text-xs',
            style: {
              fontFamily: 'monospace',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
        {
          id: renderPhaseIndicatorId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: 'PHASE: WIREFRAME',
            className: 'text-cyan-400 font-mono text-xs uppercase',
            style: {
              fontFamily: 'monospace',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: transitionDuration,
            },
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects,
    childrenData,
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
  id: 'gameEngineRenderTransition',
  title: 'Game Engine Render Pipeline Transition',
  description:
    'A technical scene transition that simulates a game engine rendering pipeline. The outgoing scene converts to a wireframe debug view with color-coded mesh overlays (cyan for geometry, magenta for UI, yellow for interactive elements). A scanning line sweeps across, progressively filling in surfaces with colors, gradients, and textures. Technical HUD displays real-time polygon counts, shader compilation progress, and FPS metrics. Post-processing effects (bloom, ambient occlusion) fade in to complete the transition to the new scene.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'wireframe',
    'game-engine',
    'technical',
    'rendering',
    'debug',
    'hud',
    'scanning',
    'mesh',
    'shader',
    'post-processing',
    'bloom',
    'ambient-occlusion',
  ],
  defaultInputParams: {
    outgoingVideoSrc: 'https://example.com/outgoing.mp4',
    incomingVideoSrc: 'https://example.com/incoming.mp4',
    transitionDuration: 2.6,
    wireframeDuration: 0.5,
    scanningDuration: 1.0,
    surfaceFillingDuration: 0.8,
    postProcessDuration: 0.3,
    texturePattern: undefined,
    initialPolygonCount: 1247,
    finalPolygonCount: 8543,
    showTechnicalHUD: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const gameEngineRenderTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
