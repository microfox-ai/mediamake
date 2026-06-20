/**
 * 3D Rotating Cubes Typokinetics Preset
 *
 * This preset creates a dynamic 3D typography effect where text is projected onto
 * invisible rotating cubes in 3D space. As cubes rotate, different faces reveal
 * different text elements with proper perspective transformation. Features include:
 *
 * - Multiple 3D cubes positioned at different depths with preserve-3d transform
 * - Text mapped to cube faces (front, back, left, right, top, bottom)
 * - Continuous rotation animations with synchronized breathing scale effects
 * - Depth-based blur effects (closer cubes sharp, distant cubes blurred)
 * - Particle trail effects that spawn and drift with opacity fade
 * - Proper 3D perspective rendering (1200px perspective origin)
 *
 * Use cases:
 * - Motion graphics information displays
 * - Tech/sci-fi title sequences
 * - Data visualization overlays
 * - Futuristic brand presentations
 * - Interactive product showcases
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  cubes: z
    .array(
      z.object({
        texts: z
          .array(z.string())
          .length(6)
          .describe(
            'Text for each cube face [front, back, left, right, top, bottom]',
          ),
        position: z
          .object({
            x: z.number().describe('X position offset in pixels'),
            y: z.number().describe('Y position offset in pixels'),
            z: z.number().describe('Z position (depth) in pixels'),
          })
          .describe('3D position coordinates'),
        size: z.number().min(100).max(300).describe('Cube size in pixels'),
        colors: z
          .array(z.string())
          .length(6)
          .describe(
            'Text colors for each face [front, back, left, right, top, bottom]',
          ),
        backgroundColors: z
          .array(z.string())
          .length(6)
          .describe(
            'Background colors for each face [front, back, left, right, top, bottom]',
          ),
        rotationSpeed: z
          .number()
          .min(0.5)
          .max(3)
          .default(1)
          .describe('Rotation speed multiplier'),
        startDelay: z
          .number()
          .min(0)
          .default(0)
          .describe('Start delay in seconds'),
      }),
    )
    .min(1)
    .max(5)
    .describe('Array of cube configurations (1-5 cubes)'),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(12)
    .describe('Total duration in seconds'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe(
      'Font family with optional weight (e.g., "Inter:700", "Roboto:600")',
    ),
  perspective: z
    .number()
    .min(800)
    .max(2000)
    .default(1200)
    .describe('Perspective distance in pixels'),
  particleCount: z
    .number()
    .min(0)
    .max(20)
    .default(4)
    .describe('Number of particle effects (0 to disable)'),
  breathingDuration: z
    .number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Breathing scale animation duration in seconds'),
  blurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(1)
    .describe('Depth-based blur intensity multiplier'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    cubes,
    duration,
    font,
    perspective,
    particleCount,
    breathingDuration,
    blurIntensity,
  } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper to create cube face
  const createCubeFace = (
    cubeIndex: number,
    faceIndex: number,
    faceName: string,
    transform: string,
    text: string,
    color: string,
    bgColor: string,
    cubeSize: number,
  ): RenderableComponentData => {
    const faceId = `cube-${cubeIndex}-face-${faceName}`;
    const textId = `cube-${cubeIndex}-text-${faceName}`;
    const halfSize = cubeSize / 2;

    return {
      id: faceId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform,
            backfaceVisibility: 'hidden' as any,
            backgroundColor: bgColor,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: [
        {
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text,
            style: {
              fontSize: Math.max(24, Math.min(48, cubeSize / 6)),
              ...fontStyle,
              color,
              textAlign: 'center' as const,
              textShadow: `0 0 20px ${color}80`,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight
                ? { weights: [fontStyle.fontWeight.toString()] }
                : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Helper to create cube
  const createCube = (
    cubeConfig: z.infer<typeof presetParams>['cubes'][0],
    index: number,
  ): RenderableComponentData => {
    const cubeId = `cube-${index}`;
    const {
      texts,
      position,
      size,
      colors,
      backgroundColors,
      rotationSpeed,
      startDelay,
    } = cubeConfig;
    const halfSize = size / 2;

    // Calculate blur based on z-position (negative z = further away)
    const zDepth = Math.abs(position.z);
    const blurAmount = Math.min(
      4 * blurIntensity,
      (zDepth / 200) * blurIntensity,
    );

    // Face transforms
    const faces = [
      {
        name: 'front',
        transform: `rotateY(0deg) translateZ(${halfSize}px)`,
        text: texts[0],
        color: colors[0],
        bgColor: backgroundColors[0],
      },
      {
        name: 'back',
        transform: `rotateY(180deg) translateZ(${halfSize}px)`,
        text: texts[1],
        color: colors[1],
        bgColor: backgroundColors[1],
      },
      {
        name: 'left',
        transform: `rotateY(-90deg) translateZ(${halfSize}px)`,
        text: texts[2],
        color: colors[2],
        bgColor: backgroundColors[2],
      },
      {
        name: 'right',
        transform: `rotateY(90deg) translateZ(${halfSize}px)`,
        text: texts[3],
        color: colors[3],
        bgColor: backgroundColors[3],
      },
      {
        name: 'top',
        transform: `rotateX(90deg) translateZ(${halfSize}px)`,
        text: texts[4],
        color: colors[4],
        bgColor: backgroundColors[4],
      },
      {
        name: 'bottom',
        transform: `rotateX(-90deg) translateZ(${halfSize}px)`,
        text: texts[5],
        color: colors[5],
        bgColor: backgroundColors[5],
      },
    ];

    const faceComponents = faces.map((face, faceIndex) =>
      createCubeFace(
        index,
        faceIndex,
        face.name,
        face.transform,
        face.text,
        face.color,
        face.bgColor,
        size,
      ),
    );

    // Rotation duration (10s base divided by speed)
    const rotationDuration = 10 / rotationSpeed;
    const actualDuration = duration - startDelay;

    return {
      id: cubeId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: `${size}px`,
            height: `${size}px`,
            left: '50%',
            top: '50%',
            marginLeft: `${-size / 2}px`,
            marginTop: `${-size / 2}px`,
            transformStyle: 'preserve-3d' as any,
            transform: `translateX(${position.x}px) translateY(${position.y}px) translateZ(${position.z}px)`,
          },
        },
      },
      context: {
        timing: {
          start: startDelay,
          duration: actualDuration,
        },
      },
      effects: [
        // Continuous rotation effect
        {
          id: `${cubeId}-rotation`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: rotationDuration,
            mode: 'provider',
            targetIds: [cubeId],
            ranges: [
              { key: 'rotateY', val: 0, prog: 0 },
              { key: 'rotateY', val: 360, prog: 1 },
              { key: 'rotateX', val: 0, prog: 0 },
              { key: 'rotateX', val: 180, prog: 1 },
            ],
          },
        },
        // Breathing scale effect
        {
          id: `${cubeId}-breathing`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: breathingDuration,
            mode: 'provider',
            targetIds: [cubeId],
            ranges: [
              { key: 'scale', val: 0.9, prog: 0 },
              { key: 'scale', val: 1.1, prog: 0.5 },
              { key: 'scale', val: 0.9, prog: 1 },
            ],
          },
        },
        // Depth-based blur effect
        {
          id: `${cubeId}-blur`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: actualDuration,
            mode: 'provider',
            targetIds: [cubeId],
            ranges: [
              { key: 'filter:blur', val: `${blurAmount}px`, prog: 0 },
              { key: 'filter:blur', val: `${blurAmount}px`, prog: 1 },
            ],
          },
        },
      ],
      childrenData: faceComponents,
    } as RenderableComponentData;
  };

  // Create particle effects
  const createParticle = (index: number): RenderableComponentData => {
    const particleId = `particle-${index}`;
    const colors = [
      '#00ffff',
      '#ff00ff',
      '#ffff00',
      '#00ff00',
      '#ff6600',
      '#ff0066',
    ];
    const color = colors[index % colors.length];
    const size = Math.random() > 0.5 ? 4 : 3;
    const startTime = index * 1.5;
    const driftDuration = 2.5 + Math.random();
    const leftPos = 45 + Math.random() * 10;
    const topPos = 45 + Math.random() * 10;
    const zPos = -20 + Math.random() * 70;
    const driftY = -80 - Math.random() * 40;

    return {
      id: particleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: ${size}px; height: ${size}px; background: ${color}; border-radius: 50%; box-shadow: 0 0 10px ${color};"></div>`,
        className: 'absolute',
        style: {
          left: `${leftPos}%`,
          top: `${topPos}%`,
          transform: `translateZ(${zPos}px)`,
        },
      },
      context: {
        timing: {
          start: startTime,
          duration: driftDuration,
        },
      },
      effects: [
        {
          id: `${particleId}-drift`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: driftDuration,
            mode: 'provider',
            targetIds: [particleId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: driftY, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData;
  };

  // Build cube components
  const cubeComponents = cubes.map((cubeConfig, index) =>
    createCube(cubeConfig, index),
  );

  // Build particle components
  const particleComponents =
    particleCount > 0
      ? Array.from({ length: particleCount }, (_, i) => createParticle(i))
      : [];

  // Particle container
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          transformStyle: 'preserve-3d' as any,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: particleComponents,
  };

  // Cube container group
  const cubeContainerGroup: RenderableComponentData = {
    id: 'cube-container-group',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d' as any,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [...cubeComponents, particleContainer],
  };

  // Root perspective container
  const rootContainer: RenderableComponentData = {
    id: 'root-perspective-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex items-center justify-center perspective-[${perspective}px]`,
        style: {
          perspective: `${perspective}px`,
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [cubeContainerGroup],
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
  id: 'TypoKinetics3DCubesPreset',
  title: '3D Rotating Cubes Typokinetics',
  description:
    'Advanced typokinetics preset featuring text projected onto rotating 3D cubes with proper perspective. Text elements are mapped to cube faces that rotate in 3D space, revealing different phrases as cubes turn. Includes depth-based blur effects, particle trails, and breathing scale animations synchronized with rotation. Supports multiple rotating cubes at different depths for dynamic information display effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'cubes',
    'rotation',
    'perspective',
    'particles',
    'motion-graphics',
    'tech',
    'futuristic',
    'information-display',
  ],
  dependencies: {},
  defaultInputParams: {
    cubes: [
      {
        texts: [
          'Innovation',
          'Technology',
          'Future',
          'Design',
          'Creative',
          'Digital',
        ],
        position: { x: -150, y: -50, z: 100 },
        size: 200,
        colors: [
          '#00ffff',
          '#ff00ff',
          '#ffff00',
          '#00ff00',
          '#ff6600',
          '#ff0066',
        ],
        backgroundColors: [
          'rgba(20, 20, 40, 0.7)',
          'rgba(40, 20, 40, 0.7)',
          'rgba(20, 40, 40, 0.7)',
          'rgba(40, 40, 20, 0.7)',
          'rgba(30, 30, 50, 0.7)',
          'rgba(50, 30, 30, 0.7)',
        ],
        rotationSpeed: 1,
        startDelay: 0,
      },
      {
        texts: ['Motion', 'Graphics', 'Visual', 'Effect', 'Dynamic', 'Style'],
        position: { x: 150, y: 80, z: -50 },
        size: 180,
        colors: [
          '#66ccff',
          '#ff66cc',
          '#ccff66',
          '#66ff99',
          '#ff9966',
          '#9966ff',
        ],
        backgroundColors: [
          'rgba(25, 25, 45, 0.7)',
          'rgba(45, 25, 45, 0.7)',
          'rgba(25, 45, 25, 0.7)',
          'rgba(45, 45, 25, 0.7)',
          'rgba(35, 25, 35, 0.7)',
          'rgba(45, 35, 25, 0.7)',
        ],
        rotationSpeed: 1.2,
        startDelay: 1,
      },
      {
        texts: ['3D', 'Space', 'Depth', 'Layer', 'Transform', 'Render'],
        position: { x: 0, y: -120, z: -150 },
        size: 160,
        colors: [
          '#99ff66',
          '#66ffff',
          '#ff6699',
          '#ffff66',
          '#6699ff',
          '#ff99ff',
        ],
        backgroundColors: [
          'rgba(30, 30, 55, 0.7)',
          'rgba(30, 50, 50, 0.7)',
          'rgba(50, 30, 40, 0.7)',
          'rgba(50, 50, 30, 0.7)',
          'rgba(30, 40, 50, 0.7)',
          'rgba(50, 30, 50, 0.7)',
        ],
        rotationSpeed: 0.8,
        startDelay: 2,
      },
    ],
    duration: 12,
    font: 'Inter:700',
    perspective: 1200,
    particleCount: 4,
    breathingDuration: 4,
    blurIntensity: 1,
  },
};

export const TypoKinetics3DCubesPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
