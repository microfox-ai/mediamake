/**
 * Carousel Cube Rotation Transition Preset
 *
 * A professional broadcast-style 3D cube rotation transition where video and b-roll content
 * are displayed on different faces of a rotating cube. This preset creates a dynamic video
 * wall effect similar to professional broadcast studios.
 *
 * Features:
 * - **3D Cube Rotation**: Y-axis rotation (90 degrees) with subtle X-axis tilt (5-10 degrees)
 * - **Motion Blur**: Blur effect applied during rotation for realistic motion
 * - **Zoom Effect**: Slight zoom-out during rotation emphasizing 3D depth
 * - **Glossy Floor Reflection**: Mirror reflection beneath cube with gradient mask
 * - **Rounded Corners**: Modern polished look with rounded cube faces
 * - **Gradient Overlays**: Subtle gradient on each face for depth and lighting simulation
 * - **Four Faces**: Front (video), back (b-roll), left (video), right (b-roll)
 *
 * Use cases:
 * - Professional broadcast-style transitions between content segments
 * - Dynamic video wall effects for presentations
 * - Creative transitions between main content and b-roll footage
 * - Modern, polished video transitions with 3D depth
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  primaryVideoSrc: z.string().describe('Video source for front face of the cube'),
  secondaryVideoSrc: z.string().describe('Video source for left face of the cube'),
  brollImageSrc: z.string().describe('Image source for back face of the cube'),
  tertiaryBrollSrc: z.string().describe('Image source for right face of the cube'),
  rotationDuration: z
    .number()
    .default(1.2)
    .describe('Duration of the rotation animation in seconds'),
  cubeSize: z
    .number()
    .default(384)
    .describe('Size of the cube in pixels (width and height)'),
  rotationDegrees: z
    .number()
    .default(90)
    .describe('Degrees to rotate the cube on Y-axis (90 for one face, 180 for opposite face)'),
  xAxisTilt: z
    .number()
    .default(7)
    .describe('Degrees of tilt on X-axis for dynamic movement (5-10 recommended)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    primaryVideoSrc,
    secondaryVideoSrc,
    brollImageSrc,
    tertiaryBrollSrc,
    rotationDuration,
    cubeSize,
    rotationDegrees,
    xAxisTilt,
  } = params;

  const cubeSizePx = `${cubeSize}px`;
  const translateZ = `${cubeSize / 2}px`;

  // --- Root Container ---
  const rootContainer = {
    id: 'carousel-cube-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-900 to-black overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: rotationDuration,
        fitDurationTo: 'parent',
      },
    },
    childrenData: [
      // Perspective Container
      {
        id: 'perspective-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full flex items-center justify-center',
            style: {
              perspective: '1200px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: rotationDuration,
            fitDurationTo: 'parent',
          },
        },
        childrenData: [
          // Cube Scene
          {
            id: 'cube-scene',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative mx-auto',
                style: {
                  width: cubeSizePx,
                  height: cubeSizePx,
                  transformStyle: 'preserve-3d',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: rotationDuration,
                fitDurationTo: 'parent',
              },
            },
            childrenData: [
              // Cube Container with rotation effects
              {
                id: 'cube-container',
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'relative w-full h-full',
                    style: {
                      transformStyle: 'preserve-3d',
                    },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: rotationDuration,
                    fitDurationTo: 'parent',
                  },
                },
                effects: [
                  // Rotation Y-axis effect
                  {
                    id: 'cube-rotation-y',
                    componentId: 'cube-container',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: rotationDuration,
                      mode: 'provider',
                      targetIds: ['cube-container'],
                      ranges: [
                        { key: 'rotateY', val: 0, prog: 0 },
                        { key: 'rotateY', val: 0, prog: 0.1 },
                        { key: 'rotateY', val: rotationDegrees, prog: 0.5 },
                        { key: 'rotateY', val: rotationDegrees, prog: 1 },
                      ],
                    },
                  },
                  // X-axis tilt effect
                  {
                    id: 'cube-tilt-x',
                    componentId: 'cube-container',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: rotationDuration,
                      mode: 'provider',
                      targetIds: ['cube-container'],
                      ranges: [
                        { key: 'rotateX', val: 5, prog: 0 },
                        { key: 'rotateX', val: 5, prog: 0.1 },
                        { key: 'rotateX', val: xAxisTilt, prog: 0.5 },
                        { key: 'rotateX', val: 5, prog: 0.9 },
                        { key: 'rotateX', val: 5, prog: 1 },
                      ],
                    },
                  },
                  // Scale (zoom-out) effect
                  {
                    id: 'cube-scale',
                    componentId: 'cube-container',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: rotationDuration,
                      mode: 'provider',
                      targetIds: ['cube-container'],
                      ranges: [
                        { key: 'scale', val: 1, prog: 0 },
                        { key: 'scale', val: 1, prog: 0.1 },
                        { key: 'scale', val: 0.9, prog: 0.5 },
                        { key: 'scale', val: 1, prog: 0.9 },
                        { key: 'scale', val: 1, prog: 1 },
                      ],
                    },
                  },
                  // Motion blur effect
                  {
                    id: 'cube-blur',
                    componentId: 'cube-container',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: rotationDuration,
                      mode: 'provider',
                      targetIds: ['cube-container'],
                      ranges: [
                        { key: 'blur', val: 0, prog: 0 },
                        { key: 'blur', val: 0, prog: 0.1 },
                        { key: 'blur', val: 2, prog: 0.3 },
                        { key: 'blur', val: 2, prog: 0.7 },
                        { key: 'blur', val: 0, prog: 0.9 },
                        { key: 'blur', val: 0, prog: 1 },
                      ],
                    },
                  },
                ],
                childrenData: [
                  // Front Face
                  {
                    id: 'face-front',
                    type: 'layout',
                    componentId: 'BaseLayout',
                    data: {
                      containerProps: {
                        className: 'absolute inset-0 rounded-2xl shadow-2xl overflow-hidden',
                        style: {
                          backfaceVisibility: 'hidden',
                          transform: `translateZ(${translateZ})`,
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: rotationDuration,
                        fitDurationTo: 'parent',
                      },
                    },
                    childrenData: [
                      {
                        id: 'face-front-video',
                        type: 'atom',
                        componentId: 'VideoAtom',
                        data: {
                          src: primaryVideoSrc,
                          style: {
                            objectFit: 'cover',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                      {
                        id: 'face-front-gradient',
                        type: 'atom',
                        componentId: 'ShapeAtom',
                        data: {
                          shapeType: 'rectangle',
                          style: {
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
                            pointerEvents: 'none',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                    ],
                  } as RenderableComponentData,
                  // Back Face
                  {
                    id: 'face-back',
                    type: 'layout',
                    componentId: 'BaseLayout',
                    data: {
                      containerProps: {
                        className: 'absolute inset-0 rounded-2xl shadow-2xl overflow-hidden',
                        style: {
                          backfaceVisibility: 'hidden',
                          transform: `rotateY(180deg) translateZ(${translateZ})`,
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: rotationDuration,
                        fitDurationTo: 'parent',
                      },
                    },
                    childrenData: [
                      {
                        id: 'face-back-image',
                        type: 'atom',
                        componentId: 'ImageAtom',
                        data: {
                          src: brollImageSrc,
                          style: {
                            objectFit: 'cover',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                      {
                        id: 'face-back-gradient',
                        type: 'atom',
                        componentId: 'ShapeAtom',
                        data: {
                          shapeType: 'rectangle',
                          style: {
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
                            pointerEvents: 'none',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                    ],
                  } as RenderableComponentData,
                  // Left Face
                  {
                    id: 'face-left',
                    type: 'layout',
                    componentId: 'BaseLayout',
                    data: {
                      containerProps: {
                        className: 'absolute inset-0 rounded-2xl shadow-2xl overflow-hidden',
                        style: {
                          backfaceVisibility: 'hidden',
                          transform: `rotateY(-90deg) translateZ(${translateZ})`,
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: rotationDuration,
                        fitDurationTo: 'parent',
                      },
                    },
                    childrenData: [
                      {
                        id: 'face-left-video',
                        type: 'atom',
                        componentId: 'VideoAtom',
                        data: {
                          src: secondaryVideoSrc,
                          style: {
                            objectFit: 'cover',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                      {
                        id: 'face-left-gradient',
                        type: 'atom',
                        componentId: 'ShapeAtom',
                        data: {
                          shapeType: 'rectangle',
                          style: {
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
                            pointerEvents: 'none',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                    ],
                  } as RenderableComponentData,
                  // Right Face
                  {
                    id: 'face-right',
                    type: 'layout',
                    componentId: 'BaseLayout',
                    data: {
                      containerProps: {
                        className: 'absolute inset-0 rounded-2xl shadow-2xl overflow-hidden',
                        style: {
                          backfaceVisibility: 'hidden',
                          transform: `rotateY(90deg) translateZ(${translateZ})`,
                        },
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: rotationDuration,
                        fitDurationTo: 'parent',
                      },
                    },
                    childrenData: [
                      {
                        id: 'face-right-image',
                        type: 'atom',
                        componentId: 'ImageAtom',
                        data: {
                          src: tertiaryBrollSrc,
                          style: {
                            objectFit: 'cover',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                      {
                        id: 'face-right-gradient',
                        type: 'atom',
                        componentId: 'ShapeAtom',
                        data: {
                          shapeType: 'rectangle',
                          style: {
                            background:
                              'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(0,0,0,0.2) 100%)',
                            pointerEvents: 'none',
                          },
                        },
                        context: {
                          timing: {
                            start: 0,
                            duration: rotationDuration,
                            fitDurationTo: 'parent',
                          },
                        },
                      },
                    ],
                  } as RenderableComponentData,
                ],
              } as RenderableComponentData,
            ],
          },
          // Glossy Floor Reflection
          {
            id: 'glossy-floor',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute left-1/2 pointer-events-none opacity-30',
                style: {
                  transform: 'translateX(-50%) scaleY(-1) translateY(-100%)',
                  top: `calc(50% + ${cubeSize / 2 + 20}px)`,
                  width: cubeSizePx,
                  height: cubeSizePx,
                  transformStyle: 'preserve-3d',
                  maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 60%)',
                  WebkitMaskImage:
                    'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 60%)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: rotationDuration,
                fitDurationTo: 'parent',
              },
            },
            effects: [
              // Sync rotation with main cube
              {
                id: 'reflection-rotation-y',
                componentId: 'glossy-floor',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: rotationDuration,
                  mode: 'provider',
                  targetIds: ['glossy-floor'],
                  ranges: [
                    { key: 'rotateY', val: 0, prog: 0 },
                    { key: 'rotateY', val: 0, prog: 0.1 },
                    { key: 'rotateY', val: rotationDegrees, prog: 0.5 },
                    { key: 'rotateY', val: rotationDegrees, prog: 1 },
                  ],
                },
              },
              {
                id: 'reflection-tilt-x',
                componentId: 'glossy-floor',
                data: {
                  type: 'ease-in-out',
                  start: 0,
                  duration: rotationDuration,
                  mode: 'provider',
                  targetIds: ['glossy-floor'],
                  ranges: [
                    { key: 'rotateX', val: 5, prog: 0 },
                    { key: 'rotateX', val: 5, prog: 0.1 },
                    { key: 'rotateX', val: xAxisTilt, prog: 0.5 },
                    { key: 'rotateX', val: 5, prog: 0.9 },
                    { key: 'rotateX', val: 5, prog: 1 },
                  ],
                },
              },
            ],
            childrenData: [
              {
                id: 'reflection-face',
                type: 'layout',
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'relative w-full h-full rounded-2xl overflow-hidden',
                    style: {
                      transformStyle: 'preserve-3d',
                    },
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration: rotationDuration,
                    fitDurationTo: 'parent',
                  },
                },
                childrenData: [
                  {
                    id: 'reflection-video',
                    type: 'atom',
                    componentId: 'VideoAtom',
                    data: {
                      src: primaryVideoSrc,
                      style: {
                        objectFit: 'cover',
                      },
                    },
                    context: {
                      timing: {
                        start: 0,
                        duration: rotationDuration,
                        fitDurationTo: 'parent',
                      },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'carousel-cube-rotation',
  title: 'Carousel Cube Rotation Transition',
  description:
    'A professional broadcast-style 3D cube rotation transition where video and b-roll content are displayed on different faces of a rotating cube. Features Y-axis rotation with subtle X-axis tilt (5-10 degrees), motion blur during rotation, zoom-out effect for 3D emphasis, glossy floor reflections, rounded corners on faces, and gradient overlays for a modern polished look. The cube rotates 90 degrees to switch between content faces, creating a dynamic video wall effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['3d', 'cube', 'rotation', 'transition', 'broadcast', 'carousel', 'perspective'],
  defaultInputParams: {
    primaryVideoSrc: 'https://example.com/video1.mp4',
    secondaryVideoSrc: 'https://example.com/video2.mp4',
    brollImageSrc: 'https://example.com/broll1.jpg',
    tertiaryBrollSrc: 'https://example.com/broll2.jpg',
    rotationDuration: 1.2,
    cubeSize: 384,
    rotationDegrees: 90,
    xAxisTilt: 7,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const carouselCubeRotationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};