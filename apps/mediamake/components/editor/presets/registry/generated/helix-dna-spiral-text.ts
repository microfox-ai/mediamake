/**
 * Helix DNA Spiral Typography Preset
 *
 * This preset creates a helix-style DNA rotation where text spirals into view along a helical path.
 * The typography appears to be wrapped around an invisible cylinder, rotating into the camera's view
 * while also traveling along a vertical axis.
 *
 * Features:
 * - **Helical Path Animation**: Text spirals from top, rotated away, corkscrewing down while rotating to face forward
 * - **Ribbon-like Appearance**: Per-character rotation offsets create a twisted ribbon effect
 * - **Trailing Light Streams**: Animated light streams follow the spiral path with delays
 * - **Color Shift**: Smooth color transition from cool (cyan/blue) to warm (orange/yellow) tones
 * - **Organic Flow**: Spring-based easing and perspective transforms for genetic code materialization effect
 * - **Performance Optimized**: Single rotation cycle with will-change hints
 *
 * Use cases:
 * - Tech/science content with DNA or genetic themes
 * - Product launches with dynamic 3D text reveals
 * - Title sequences requiring organic, flowing motion
 * - Brand animations with sophisticated motion graphics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import {
  RenderableComponentData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('GENETIC CODE')
    .describe('Text to display with helix spiral animation'),
  duration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration of the helix spiral animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .describe(
      'Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  startColor: z
    .string()
    .default('rgb(100, 200, 255)')
    .describe('Starting color (cool tone) - e.g., "rgb(100, 200, 255)"'),
  endColor: z
    .string()
    .default('rgb(255, 200, 100)')
    .describe('Ending color (warm tone) - e.g., "rgb(255, 200, 100)"'),
  characterRotation: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe(
      'Per-character rotation offset in degrees for ribbon-like appearance',
    ),
  helixRadius: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Radius of the helical path in pixels'),
  verticalTravel: z
    .number()
    .min(50)
    .max(300)
    .default(100)
    .describe('Vertical travel distance in pixels'),
  lightStreamOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Opacity of trailing light streams'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    font,
    startColor,
    endColor,
    characterRotation,
    helixRadius,
    verticalTravel,
    lightStreamOpacity,
  } = params;

  // Parse font string
  const parseFontString = (fontString: string) => {
    if (!fontString.includes(':')) {
      return { family: fontString, weight: undefined, style: undefined };
    }
    const parts = fontString.split(':');
    return {
      family: parts[0],
      weight: parts[1] ? parseInt(parts[1], 10) : undefined,
      style: parts[2] || undefined,
    };
  };

  const parsedFont = parseFontString(font);

  // Helper: Calculate helical path keyframes
  const calculateHelixKeyframes = () => {
    const keyframes = [];
    const steps = 5; // 0%, 25%, 50%, 75%, 100%

    for (let i = 0; i < steps; i++) {
      const prog = i / (steps - 1);
      const angle = prog * 360; // Full rotation
      const angleRad = (angle * Math.PI) / 180;

      // Calculate position on helix
      const x = Math.cos(angleRad) * helixRadius;
      const z = Math.sin(angleRad) * helixRadius;
      const y = -verticalTravel + prog * verticalTravel;

      // Rotation: start at 360deg (rotated away), end at 0deg (facing forward)
      const rotateY = 360 - prog * 360;

      keyframes.push({
        prog,
        translateX: x,
        translateY: y,
        translateZ: z,
        rotateY,
      });
    }

    return keyframes;
  };

  const helixKeyframes = calculateHelixKeyframes();

  // Helper: Parse RGB color string to components
  const parseRgb = (colorString: string) => {
    const match = colorString.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (!match) return { r: 100, g: 200, b: 255 };
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  };

  const startRgb = parseRgb(startColor);
  const endRgb = parseRgb(endColor);

  // Split text into words for per-character rotation offsets
  const words = text.trim().split(/\s+/);

  // IDs
  const containerId = 'helix-root-container';
  const textWrapperId = 'text-wrapper';
  const lightStreamBeforeId = 'light-stream-before';
  const lightStreamAfterId = 'light-stream-after';

  // Create word components with rotation offsets
  const wordComponents: RenderableComponentData[] = words.map(
    (word, wordIndex) => {
      const wordId = `helix-word-${wordIndex}`;
      const rotationOffset = wordIndex * characterRotation;

      const wordData: TextAtomData = {
        text: word,
        style: {
          fontSize: `${fontSize}px`,
          fontWeight: parsedFont.weight || 700,
          fontStyle: parsedFont.style || 'normal',
          color: startColor,
          textAlign: 'center',
          letterSpacing: '0.05em',
          willChange: 'color, transform',
          marginRight: wordIndex < words.length - 1 ? '0.3em' : '0',
        },
        font: {
          family: parsedFont.family,
          weights: parsedFont.weight ? [parsedFont.weight.toString()] : ['700'],
          display: 'swap',
        },
      };

      // Per-word rotation effect (creates ribbon-like twist)
      const wordRotationEffect: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'rotateZ', val: rotationOffset, prog: 0 },
          { key: 'rotateZ', val: 0, prog: 1 },
        ],
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: wordData,
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `word-rotation-${wordIndex}`,
            componentId: 'generic',
            data: wordRotationEffect,
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Helix spiral effect for text wrapper
  const helixSpiralEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textWrapperId],
    ranges: helixKeyframes.flatMap(kf => [
      { key: 'translateX', val: kf.translateX, prog: kf.prog },
      { key: 'translateY', val: kf.translateY, prog: kf.prog },
      { key: 'translateZ', val: kf.translateZ, prog: kf.prog },
      { key: 'rotateY', val: kf.rotateY, prog: kf.prog },
    ]),
  };

  // Color shift effect (applied to all words)
  const colorShiftEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: words.map((_, idx) => `helix-word-${idx}`),
    ranges: [
      {
        key: 'color',
        val: `rgb(${startRgb.r}, ${startRgb.g}, ${startRgb.b})`,
        prog: 0,
      },
      {
        key: 'color',
        val: `rgb(${endRgb.r}, ${endRgb.g}, ${endRgb.b})`,
        prog: 1,
      },
    ],
  };

  // Light stream before effect (follows helix with delay)
  const lightStreamBeforeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [lightStreamBeforeId],
    ranges: [
      // Opacity animation
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: lightStreamOpacity, prog: 0.2 },
      { key: 'opacity', val: lightStreamOpacity, prog: 0.8 },
      { key: 'opacity', val: 0, prog: 1 },
      // Follow helix path (slightly ahead)
      ...helixKeyframes.flatMap(kf => [
        { key: 'translateX', val: kf.translateX * 1.2, prog: kf.prog },
        { key: 'translateY', val: kf.translateY - 20, prog: kf.prog },
        { key: 'translateZ', val: kf.translateZ * 1.2, prog: kf.prog },
      ]),
    ],
  };

  // Light stream after effect (follows helix with delay)
  const lightStreamAfterEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: duration * 0.15, // Delayed start
    duration: duration * 0.85,
    mode: 'provider',
    targetIds: [lightStreamAfterId],
    ranges: [
      // Opacity animation
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: lightStreamOpacity * 0.7, prog: 0.2 },
      { key: 'opacity', val: lightStreamOpacity * 0.7, prog: 0.8 },
      { key: 'opacity', val: 0, prog: 1 },
      // Follow helix path (slightly behind)
      ...helixKeyframes.flatMap(kf => [
        { key: 'translateX', val: kf.translateX * 0.8, prog: kf.prog },
        { key: 'translateY', val: kf.translateY + 20, prog: kf.prog },
        { key: 'translateZ', val: kf.translateZ * 0.8, prog: kf.prog },
      ]),
    ],
  };

  // Text wrapper (holds all words)
  const textWrapper: RenderableComponentData = {
    id: textWrapperId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center justify-center',
        style: {
          transformOrigin: 'center center',
          willChange: 'transform',
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
    childrenData: wordComponents,
    effects: [
      {
        id: 'helix-spiral',
        componentId: 'generic',
        data: helixSpiralEffect,
      },
      {
        id: 'color-shift',
        componentId: 'generic',
        data: colorShiftEffect,
      },
    ],
  } as RenderableComponentData;

  // Light stream before element
  const lightStreamBefore: RenderableComponentData = {
    id: lightStreamBeforeId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="absolute h-1 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        willChange: 'transform, opacity',
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
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
        id: 'light-stream-before-effect',
        componentId: 'generic',
        data: lightStreamBeforeEffect,
      },
    ],
  } as RenderableComponentData;

  // Light stream after element
  const lightStreamAfter: RenderableComponentData = {
    id: lightStreamAfterId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="absolute h-1 w-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        willChange: 'transform, opacity',
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
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
        id: 'light-stream-after-effect',
        componentId: 'generic',
        data: lightStreamAfterEffect,
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [lightStreamBefore, textWrapper, lightStreamAfter],
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'helix-dna-spiral-text',
  title: 'Helix DNA Spiral Typography',
  description:
    'DNA-inspired helical text animation where typography spirals into view along a 3D helical path. Text rotates from edge-on to face-forward while corkscrewing down a vertical axis, with per-character twist offsets creating a ribbon-like appearance. Features trailing light streams and smooth color transitions from cool to warm tones, creating an organic genetic code materialization effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typography',
    'helix',
    'dna',
    'spiral',
    '3d',
    'rotation',
    'kinetic',
    'organic',
    'science',
    'tech',
    'genetic',
    'ribbon',
    'light-streams',
    'color-shift',
  ],
  defaultInputParams: {
    text: 'GENETIC CODE',
    duration: 3,
    fontSize: 72,
    font: 'Inter:700',
    startColor: 'rgb(100, 200, 255)',
    endColor: 'rgb(255, 200, 100)',
    characterRotation: 5,
    helixRadius: 150,
    verticalTravel: 100,
    lightStreamOpacity: 0.6,
  },
  dependencies: {},
};

// Export preset
export const helixDnaSpiralTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
