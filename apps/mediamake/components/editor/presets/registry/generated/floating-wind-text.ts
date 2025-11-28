/**
 * Floating Wind Text Animation Preset
 *
 * This preset creates text elements that float like dandelion seeds or feathers in a gentle breeze.
 * Each text element has organic, unpredictable movement with compound curves, varying speeds, and
 * multi-axis rotation for realistic tumbling effects. The animation simulates invisible wind currents
 * with sudden lifts, gentle falls, and swirling patterns. Text fades and scales down as it floats away,
 * simulating distance. Includes periodic wind "gusts" where all text temporarily speeds up and changes direction.
 *
 * Features:
 * - **Organic Movement**: Complex Bezier curve paths with 8-10 keyframe points for natural trajectories
 * - **Wind Simulation**: Base horizontal drift with periodic gust acceleration (1.5x speed)
 * - **Vertical Sine Wave**: Oscillating up/down motion with amplitude varying by text weight
 * - **Multi-Axis Rotation**: rotateZ (-180° to 180°) and rotateX (-30° to 30°) for tumbling effects
 * - **Distance Fade**: Scale (1 to 0.5) and opacity (1 to 0) as text floats away
 * - **Individual Weight**: Each text has its own weight property affecting wind response
 * - **Random Positioning**: Text starts at random positions across the frame
 *
 * Use cases:
 * - Creating dreamy, poetic text animations
 * - Simulating dandelion seeds or feather floating effects
 * - Building atmospheric, organic text reveals
 * - Adding ethereal motion to titles or quotes
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  texts: z
    .array(z.string())
    .min(1)
    .max(10)
    .default(['Float', 'Drift', 'Breeze', 'Gentle', 'Wind'])
    .describe(
      'Array of text strings to float (1-10 texts). Each text will have its own weight and trajectory.',
    ),
  duration: z
    .number()
    .min(5)
    .max(60)
    .default(20)
    .describe('Total duration of the animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Base font size in pixels for all text elements'),
  color: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value)'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('400')
    .describe('Font weight (e.g., "400", "700", or 400, 700)'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:400", "Roboto:700:italic")',
    ),
  baseWindSpeed: z
    .number()
    .min(50)
    .max(500)
    .default(200)
    .describe(
      'Base horizontal wind drift speed in pixels (affects translateX range)',
    ),
  gustIntensity: z
    .number()
    .min(1)
    .max(3)
    .default(1.5)
    .describe(
      'Wind gust speed multiplier (e.g., 1.5 means 1.5x faster during gusts)',
    ),
  gustDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Duration of each wind gust in seconds'),
  gustFrequency: z
    .number()
    .min(3)
    .max(10)
    .default(5)
    .describe('How often gusts occur (interval in seconds between gusts)'),
  verticalAmplitude: z
    .number()
    .min(30)
    .max(150)
    .default(80)
    .describe(
      'Vertical sine wave amplitude in pixels (how much text moves up/down)',
    ),
  rotationRange: z
    .number()
    .min(90)
    .max(360)
    .default(180)
    .describe(
      'Maximum rotation range in degrees for rotateZ tumbling effect',
    ),
  tumblingIntensity: z
    .number()
    .min(10)
    .max(60)
    .default(30)
    .describe(
      'Maximum rotateX tumbling angle in degrees (3D rotation effect)',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    texts,
    duration,
    fontSize,
    color,
    fontWeight,
    font,
    baseWindSpeed,
    gustIntensity,
    gustDuration,
    gustFrequency,
    verticalAmplitude,
    rotationRange,
    tumblingIntensity,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  // Helper: Generate random value in range
  const randomRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper: Generate random weight for text (lighter = more responsive to wind)
  const generateWeight = (): number => {
    return randomRange(0.5, 2.0); // 0.5 = light (feather), 2.0 = heavy (seed)
  };

  // Helper: Calculate gust timings
  const calculateGustTiming = (totalDuration: number) => {
    const gusts: Array<{ start: number; end: number }> = [];
    let currentTime = randomRange(2, 4); // First gust after 2-4 seconds

    while (currentTime < totalDuration - gustDuration) {
      gusts.push({
        start: currentTime,
        end: currentTime + gustDuration,
      });
      currentTime += gustFrequency;
    }

    return gusts;
  };

  const gustTimings = calculateGustTiming(duration);

  // Helper: Generate organic trajectory with 10 keyframes
  const generateTrajectory = (
    weight: number,
    textIndex: number,
  ): Array<{ prog: number; translateX: number; translateY: number }> => {
    const points: Array<{
      prog: number;
      translateX: number;
      translateY: number;
    }> = [];

    // Adjust wind drift based on weight (lighter = more drift)
    const weightFactor = 1 / weight;
    const maxDrift = baseWindSpeed * weightFactor;

    // Vertical amplitude varies by weight
    const vertAmp = verticalAmplitude * weightFactor;

    // Generate 10 keyframe points
    for (let i = 0; i <= 10; i++) {
      const prog = i / 10;

      // Horizontal: gradual drift with compound curve
      const baseDriftX = maxDrift * prog;
      // Add sine wave variation for swirling
      const swirl = Math.sin(prog * Math.PI * 4 + textIndex) * 40;
      const translateX = baseDriftX + swirl;

      // Vertical: sine wave pattern
      const frequency = randomRange(2, 4) * weight; // Heavier = slower oscillation
      const translateY =
        Math.sin(prog * Math.PI * frequency + textIndex * 0.5) * vertAmp;

      points.push({ prog, translateX, translateY });
    }

    return points;
  };

  // Helper: Generate rotation keyframes
  const generateRotation = (
    weight: number,
  ): Array<{ prog: number; rotateZ: number; rotateX: number }> => {
    const points: Array<{ prog: number; rotateZ: number; rotateX: number }> =
      [];

    // Heavier objects rotate slower
    const rotationSpeed = 1 / weight;

    for (let i = 0; i <= 10; i++) {
      const prog = i / 10;

      // rotateZ: full tumbling rotation
      const rotateZ =
        (prog * rotationRange * 2 - rotationRange) * rotationSpeed;

      // rotateX: 3D tumbling
      const rotateX =
        Math.sin(prog * Math.PI * 3) * tumblingIntensity * rotationSpeed;

      points.push({ prog, rotateZ, rotateX });
    }

    return points;
  };

  // Helper: Generate scale and opacity fade
  const generateFade = (): Array<{
    prog: number;
    scale: number;
    opacity: number;
  }> => {
    return [
      { prog: 0, scale: 1, opacity: 1 },
      { prog: 0.3, scale: 0.95, opacity: 0.9 },
      { prog: 0.6, scale: 0.75, opacity: 0.6 },
      { prog: 1, scale: 0.5, opacity: 0 },
    ];
  };

  // Create text elements with effects
  const textElements: RenderableComponentData[] = texts.map((text, index) => {
    const textId = `floating-text-${index}`;
    const weight = generateWeight();

    // Random initial position
    const initialTop = randomRange(10, 70); // 10%-70% from top
    const initialLeft = randomRange(10, 70); // 10%-70% from left

    // Generate trajectory, rotation, and fade
    const trajectory = generateTrajectory(weight, index);
    const rotation = generateRotation(weight);
    const fade = generateFade();

    // Build effect ranges for base animation
    const baseRanges: Array<{
      key: string;
      val: number | string;
      prog: number;
    }> = [];

    // Add trajectory keyframes
    trajectory.forEach((point) => {
      baseRanges.push({
        key: 'translateX',
        val: point.translateX,
        prog: point.prog,
      });
      baseRanges.push({
        key: 'translateY',
        val: point.translateY,
        prog: point.prog,
      });
    });

    // Add rotation keyframes
    rotation.forEach((point) => {
      baseRanges.push({ key: 'rotateZ', val: point.rotateZ, prog: point.prog });
      baseRanges.push({ key: 'rotateX', val: point.rotateX, prog: point.prog });
    });

    // Add fade keyframes
    fade.forEach((point) => {
      baseRanges.push({ key: 'scale', val: point.scale, prog: point.prog });
      baseRanges.push({ key: 'opacity', val: point.opacity, prog: point.prog });
    });

    // Base animation effect
    const baseEffect = {
      id: `${textId}-base-animation`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [textId],
        ranges: baseRanges,
      },
    };

    // Gust effects (temporary speed increase and direction change)
    const gustEffects = gustTimings.map((gust, gustIndex) => {
      // Calculate gust-specific movement
      const gustDriftX = baseWindSpeed * gustIntensity * (1 / weight);
      const gustDriftY = randomRange(-50, 50); // Random vertical push

      return {
        id: `${textId}-gust-${gustIndex}`,
        componentId: 'generic',
        data: {
          type: 'spring',
          start: gust.start,
          duration: gust.end - gust.start,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            {
              key: 'translateX',
              val: gustDriftX * (gust.start / duration),
              prog: 0,
            },
            {
              key: 'translateX',
              val: gustDriftX * (gust.end / duration),
              prog: 1,
            },
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: gustDriftY, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      };
    });

    return {
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: text,
        style: {
          fontSize: fontSize,
          color: color,
          fontWeight: fontWeight,
          position: 'absolute',
          top: `${initialTop}%`,
          left: `${initialLeft}%`,
          transformOrigin: 'center center',
          ...fontStyle,
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
          duration: duration,
        },
      },
      effects: [baseEffect, ...gustEffects],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'floating-wind-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textElements as RenderableComponentData[],
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
  id: 'floating-wind-text',
  title: 'Floating Wind Text Animation',
  description:
    'Text elements that float like dandelion seeds or feathers in a gentle breeze with organic trajectories, multi-axis rotation, and distance-based fade effects. Features wind simulation with periodic gusts, weight-based movement, and unpredictable organic patterns using complex bezier curves.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'floating',
    'wind',
    'organic',
    'dandelion',
    'feather',
    'breeze',
    'tumbling',
    'rotation',
    'fade',
    'distance',
    'gust',
    'drift',
  ],
  dependencies: {},
  defaultInputParams: {
    texts: ['Float', 'Drift', 'Breeze', 'Gentle', 'Wind'],
    duration: 20,
    fontSize: 64,
    color: '#FFFFFF',
    fontWeight: '400',
    font: 'Inter',
    baseWindSpeed: 200,
    gustIntensity: 1.5,
    gustDuration: 1.5,
    gustFrequency: 5,
    verticalAmplitude: 80,
    rotationRange: 180,
    tumblingIntensity: 30,
  },
};

// Export preset
export const floatingWindTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
