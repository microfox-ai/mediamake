/**
 * Parallax Tunnel Racing Transition
 *
 * Creates a hyperspeed tunnel transition effect that simulates traveling through a racing circuit.
 * The transition constructs a 3D tunnel from multiple layers of geometric shapes, racing imagery,
 * and speed lines all moving at different velocities to create parallax depth.
 *
 * Features:
 * - 8 layers of geometric shapes with different z-depths and parallax speeds
 * - Speed lines streaming horizontally across the screen
 * - Rotating rings spiraling around tunnel walls
 * - Light streaks zooming past with blur effects
 * - Focal point glow that pulls everything toward center
 * - White flash overlay at transition peak
 * - GPU-accelerated 3D transforms with perspective
 * - Build-up phase, chaos phase, and snap-to-next-scene phase
 *
 * Technical:
 * - Uses perspective(1000px) for 3D depth
 * - Layers at different translateZ values (-800px to -20px)
 * - Parallax achieved through varying animation speeds (closer = faster)
 * - Transform3d for hardware acceleration
 * - Effects synchronized to create cohesive tunnel motion
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .min(1)
    .max(5)
    .default(2.5)
    .describe('Total duration of the tunnel transition in seconds'),
  buildUpPhaseRatio: z
    .number()
    .min(0.1)
    .max(0.5)
    .default(0.4)
    .describe('Ratio of duration for speed build-up phase (0-1)'),
  chaosPhaseRatio: z
    .number()
    .min(0.2)
    .max(0.6)
    .default(0.4)
    .describe('Ratio of duration for maximum chaos phase (0-1)'),
  flashDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Duration of the white flash at transition peak (seconds)'),
  tunnelSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Overall speed multiplier for tunnel motion'),
  rotationSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Speed multiplier for rotating elements'),
  primaryColor: z
    .string()
    .default('cyan')
    .describe('Primary accent color for tunnel elements (cyan, red, yellow, etc)'),
  secondaryColor: z
    .string()
    .default('red')
    .describe('Secondary accent color for tunnel elements'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    buildUpPhaseRatio,
    chaosPhaseRatio,
    flashDuration,
    tunnelSpeed,
    rotationSpeed,
    primaryColor,
    secondaryColor,
  } = params;

  // Calculate phase timings
  const buildUpDuration = duration * buildUpPhaseRatio;
  const chaosDuration = duration * chaosPhaseRatio;
  const pullPhaseStart = buildUpDuration + chaosDuration;
  const pullPhaseDuration = duration - pullPhaseStart - flashDuration;
  const flashStart = duration - flashDuration;

  // Color mapping
  const colorMap: Record<string, string> = {
    cyan: 'rgba(0, 255, 255, 0.3)',
    red: 'rgba(255, 0, 0, 0.25)',
    yellow: 'rgba(255, 255, 0, 0.3)',
    green: 'rgba(0, 255, 0, 0.3)',
    purple: 'rgba(128, 0, 255, 0.3)',
    orange: 'rgba(255, 165, 0, 0.3)',
  };

  const primaryColorValue = colorMap[primaryColor] || colorMap.cyan;
  const secondaryColorValue = colorMap[secondaryColor] || colorMap.red;

  // Helper: Create geometric shape for tunnel layer
  const createGeometricShape = (
    id: string,
    size: number,
    rotation: number,
    opacity: number,
    borderColor: string,
    isCircle: boolean = false,
  ): RenderableComponentData => ({
    id,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: isCircle ? 'circle' : 'rectangle',
      color: 'transparent',
      style: {
        width: `${size}px`,
        height: `${size}px`,
        border: `2px solid ${borderColor}`,
        borderRadius: isCircle ? '50%' : '0',
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  });

  // Build tunnel layers (8 layers with geometric shapes)
  const tunnelLayers: RenderableComponentData[] = [
    // Layer 1: Furthest back (-800px)
    {
      id: 'tunnel-layer-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-800px)',
            zIndex: 1,
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
        createGeometricShape('shape-1-1', 400, 45, 0.1, 'rgba(255, 255, 255, 0.1)', false),
        createGeometricShape('shape-1-2', 350, 22.5, 0.15, 'rgba(255, 255, 255, 0.15)', false),
        createGeometricShape('shape-1-3', 300, 0, 0.1, 'rgba(255, 255, 255, 0.1)', true),
        createGeometricShape('shape-1-4', 250, 67.5, 0.2, 'rgba(255, 255, 255, 0.2)', false),
      ],
      effects: [
        {
          id: 'layer-1-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-1'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: 360 * tunnelSpeed * rotationSpeed * 0.3, prog: 1 },
            ],
          },
        },
        {
          id: 'layer-1-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-1'],
            ranges: [
              { key: 'translateZ', val: -800, prog: 0 },
              { key: 'translateZ', val: 100, prog: 1 },
            ],
          },
        },
      ],
    },
    // Layer 2: -600px
    {
      id: 'tunnel-layer-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-600px)',
            zIndex: 2,
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
        createGeometricShape('shape-2-1', 320, 30, 0.2, 'rgba(255, 255, 255, 0.2)', false),
        createGeometricShape('shape-2-2', 280, 0, 0.3, primaryColorValue, true),
        createGeometricShape('shape-2-3', 240, 60, 0.15, 'rgba(255, 255, 255, 0.15)', false),
      ],
      effects: [
        {
          id: 'layer-2-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-2'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: -360 * tunnelSpeed * rotationSpeed * 0.5, prog: 1 },
            ],
          },
        },
        {
          id: 'layer-2-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-2'],
            ranges: [
              { key: 'translateZ', val: -600, prog: 0 },
              { key: 'translateZ', val: 200, prog: 1 },
            ],
          },
        },
      ],
    },
    // Layer 3: -450px
    {
      id: 'tunnel-layer-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-450px)',
            zIndex: 3,
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
        createGeometricShape('shape-3-1', 260, 15, 0.25, 'rgba(255, 255, 255, 0.25)', false),
        createGeometricShape('shape-3-2', 220, 0, 0.25, secondaryColorValue, true),
      ],
      effects: [
        {
          id: 'layer-3-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-3'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: 360 * tunnelSpeed * rotationSpeed * 0.7, prog: 1 },
            ],
          },
        },
        {
          id: 'layer-3-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-3'],
            ranges: [
              { key: 'translateZ', val: -450, prog: 0 },
              { key: 'translateZ', val: 300, prog: 1 },
            ],
          },
        },
      ],
    },
    // Layer 4: -300px
    {
      id: 'tunnel-layer-4',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-300px)',
            zIndex: 4,
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
        createGeometricShape('shape-4-1', 200, 45, 0.3, 'rgba(255, 255, 255, 0.3)', false),
        createGeometricShape('shape-4-2', 170, 0, 0.3, colorMap.yellow || 'rgba(255, 255, 0, 0.3)', true),
      ],
      effects: [
        {
          id: 'layer-4-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-4'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: -360 * tunnelSpeed * rotationSpeed * 1, prog: 1 },
            ],
          },
        },
        {
          id: 'layer-4-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-4'],
            ranges: [
              { key: 'translateZ', val: -300, prog: 0 },
              { key: 'translateZ', val: 400, prog: 1 },
            ],
          },
        },
      ],
    },
    // Layer 5: -200px
    {
      id: 'tunnel-layer-5',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-200px)',
            zIndex: 5,
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
        createGeometricShape('shape-5-1', 160, 30, 0.35, 'rgba(255, 255, 255, 0.35)', false),
        createGeometricShape('shape-5-2', 130, 0, 0.35, primaryColorValue, true),
      ],
      effects: [
        {
          id: 'layer-5-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-5'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: 360 * tunnelSpeed * rotationSpeed * 1.3, prog: 1 },
            ],
          },
        },
        {
          id: 'layer-5-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-5'],
            ranges: [
              { key: 'translateZ', val: -200, prog: 0 },
              { key: 'translateZ', val: 500, prog: 1 },
            ],
          },
        },
      ],
    },
    // Layer 6: -120px
    {
      id: 'tunnel-layer-6',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-120px)',
            zIndex: 6,
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
        createGeometricShape('shape-6-1', 100, 60, 0.4, 'rgba(255, 255, 255, 0.4)', false),
      ],
      effects: [
        {
          id: 'layer-6-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-6'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: -360 * tunnelSpeed * rotationSpeed * 1.6, prog: 1 },
            ],
          },
        },
        {
          id: 'layer-6-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-6'],
            ranges: [
              { key: 'translateZ', val: -120, prog: 0 },
              { key: 'translateZ', val: 600, prog: 1 },
            ],
          },
        },
      ],
    },
    // Layer 7: -60px
    {
      id: 'tunnel-layer-7',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-60px)',
            zIndex: 7,
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
        createGeometricShape('shape-7-1', 70, 45, 0.5, 'rgba(255, 255, 255, 0.5)', false),
      ],
      effects: [
        {
          id: 'layer-7-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-7'],
            ranges: [
              { key: 'rotateZ', val: 0, prog: 0 },
              { key: 'rotateZ', val: 360 * tunnelSpeed * rotationSpeed * 2, prog: 1 },
            ],
          },
        },
        {
          id: 'layer-7-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-7'],
            ranges: [
              { key: 'translateZ', val: -60, prog: 0 },
              { key: 'translateZ', val: 700, prog: 1 },
            ],
          },
        },
      ],
    },
    // Layer 8: -20px (closest)
    {
      id: 'tunnel-layer-8',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(-20px)',
            zIndex: 8,
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
        createGeometricShape('shape-8-1', 40, 0, 0.6, 'rgba(255, 255, 255, 0.6)', true),
      ],
      effects: [
        {
          id: 'layer-8-zoom',
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['tunnel-layer-8'],
            ranges: [
              { key: 'translateZ', val: -20, prog: 0 },
              { key: 'translateZ', val: 800, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Speed lines (8 lines streaming across screen)
  const speedLines: RenderableComponentData[] = [
    {
      id: 'speed-line-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '300px',
            height: '2px',
            background: 'linear-gradient(to right, white, transparent)',
            top: '20%',
            left: '-300px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-1-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration * 0.8,
            mode: 'provider',
            targetIds: ['speed-line-1'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'speed-line-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '250px',
            height: '2px',
            background: 'linear-gradient(to right, white, transparent)',
            top: '35%',
            left: '-250px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-2-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration * 0.3,
            duration: duration * 0.7,
            mode: 'provider',
            targetIds: ['speed-line-2'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'speed-line-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '350px',
            height: '2px',
            background: 'linear-gradient(to right, white, transparent)',
            top: '50%',
            left: '-350px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-3-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration * 0.9,
            mode: 'provider',
            targetIds: ['speed-line-3'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'speed-line-4',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '280px',
            height: '2px',
            background: 'linear-gradient(to right, white, transparent)',
            top: '65%',
            left: '-280px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-4-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration * 0.5,
            duration: duration * 0.6,
            mode: 'provider',
            targetIds: ['speed-line-4'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'speed-line-5',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '320px',
            height: '2px',
            background: 'linear-gradient(to right, white, transparent)',
            top: '80%',
            left: '-320px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-5-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration * 0.85,
            mode: 'provider',
            targetIds: ['speed-line-5'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'speed-line-6',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '200px',
            height: '2px',
            background: 'linear-gradient(to left, white, transparent)',
            top: '25%',
            right: '-200px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-6-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration * 0.2,
            duration: duration * 0.7,
            mode: 'provider',
            targetIds: ['speed-line-6'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'speed-line-7',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '280px',
            height: '2px',
            background: 'linear-gradient(to left, white, transparent)',
            top: '55%',
            right: '-280px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-7-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: duration * 0.8,
            mode: 'provider',
            targetIds: ['speed-line-7'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'speed-line-8',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '240px',
            height: '2px',
            background: 'linear-gradient(to left, white, transparent)',
            top: '75%',
            right: '-240px',
            zIndex: 10,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'speed-line-8-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration * 0.4,
            duration: duration * 0.65,
            mode: 'provider',
            targetIds: ['speed-line-8'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -2000 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Rotating rings (3 dashed circles rotating)
  const rotatingRings: RenderableComponentData[] = [
    {
      id: 'rotating-ring-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '500px',
            height: '500px',
            border: `2px dashed ${primaryColorValue}`,
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'ring-1-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['rotating-ring-1'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360 * rotationSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'rotating-ring-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '400px',
            height: '400px',
            border: `2px dashed ${secondaryColorValue}`,
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'ring-2-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['rotating-ring-2'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: -360 * rotationSpeed * 1.2, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'rotating-ring-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '300px',
            height: '300px',
            border: `2px dashed ${colorMap.yellow || 'rgba(255, 255, 0, 0.35)'}`,
            borderRadius: '50%',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 9,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'ring-3-rotation',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration,
            mode: 'provider',
            targetIds: ['rotating-ring-3'],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360 * rotationSpeed * 1.5, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Light streaks (4 elongated divs with blur)
  const lightStreaks: RenderableComponentData[] = [
    {
      id: 'light-streak-1',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '400px',
            height: '4px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)',
            filter: 'blur(2px)',
            top: '30%',
            left: '-400px',
            zIndex: 11,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'streak-1-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration,
            duration: chaosDuration,
            mode: 'provider',
            targetIds: ['light-streak-1'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2500 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'light-streak-2',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '350px',
            height: '3px',
            background: `linear-gradient(to right, transparent, ${primaryColorValue}, transparent)`,
            filter: 'blur(3px)',
            top: '45%',
            left: '-350px',
            zIndex: 11,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'streak-2-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration + chaosDuration * 0.2,
            duration: chaosDuration * 0.8,
            mode: 'provider',
            targetIds: ['light-streak-2'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: 2500 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'light-streak-3',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '380px',
            height: '4px',
            background: 'linear-gradient(to left, transparent, rgba(255,255,255,0.8), transparent)',
            filter: 'blur(2px)',
            top: '60%',
            right: '-380px',
            zIndex: 11,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'streak-3-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration,
            duration: chaosDuration,
            mode: 'provider',
            targetIds: ['light-streak-3'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -2500 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
    {
      id: 'light-streak-4',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            width: '300px',
            height: '3px',
            background: `linear-gradient(to left, transparent, ${secondaryColorValue}, transparent)`,
            filter: 'blur(3px)',
            top: '70%',
            right: '-300px',
            zIndex: 11,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: 'streak-4-move',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: buildUpDuration + chaosDuration * 0.3,
            duration: chaosDuration * 0.7,
            mode: 'provider',
            targetIds: ['light-streak-4'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -2500 * tunnelSpeed, prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Focal point glow at center
  const focalPoint: RenderableComponentData = {
    id: 'focal-point-glow',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.3) 30%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%) scale(0.5)',
          zIndex: 12,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'focal-point-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: buildUpDuration + chaosDuration,
          mode: 'provider',
          targetIds: ['focal-point-glow'],
          ranges: [
            { key: 'scale', val: 0.5, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 0.8, prog: 1 },
          ],
        },
      },
      {
        id: 'focal-point-expand',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: pullPhaseStart,
          duration: pullPhaseDuration,
          mode: 'provider',
          targetIds: ['focal-point-glow'],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 10, prog: 1 },
          ],
        },
      },
    ],
  };

  // White flash overlay
  const whiteFlash: RenderableComponentData = {
    id: 'white-flash-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#ffffff',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 100,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'white-flash-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: flashStart,
          duration: flashDuration,
          mode: 'provider',
          targetIds: ['white-flash-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Tunnel layers container with preserve-3d
  const tunnelLayersContainer: RenderableComponentData = {
    id: 'tunnel-layers-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [...tunnelLayers, ...speedLines, ...rotatingRings, ...lightStreaks],
  };

  // Root container with perspective
  const rootContainer: RenderableComponentData = {
    id: 'parallax-tunnel-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [tunnelLayersContainer, focalPoint, whiteFlash],
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
  id: 'parallax-tunnel-racing-transition',
  title: 'Parallax Tunnel Racing Transition',
  description:
    'A hyperspeed tunnel transition effect that creates the sensation of traveling through a racing circuit. Features multiple layers of geometric shapes with parallax depth, speed lines, rotating rings, light streaks, and a focal point that pulls everything toward the center. Builds speed gradually, peaks with maximum visual chaos, then snaps to the next scene with a white flash.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'tunnel', 'parallax', 'racing', 'hyperspeed', '3d', 'depth', 'geometric', 'speed-lines', 'kinetic'],
  defaultInputParams: {
    duration: 2.5,
    buildUpPhaseRatio: 0.4,
    chaosPhaseRatio: 0.4,
    flashDuration: 0.1,
    tunnelSpeed: 1,
    rotationSpeed: 1,
    primaryColor: 'cyan',
    secondaryColor: 'red',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const parallaxTunnelRacingTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};