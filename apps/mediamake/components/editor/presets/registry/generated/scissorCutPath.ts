/**
 * Scissor Cut Path Effect Preset
 *
 * This internal effects-only preset animates elements as if they're being cut out by invisible
 * scissors in real-time. The effect uses SVG clip-path animations that follow defined cutting
 * paths, progressively revealing or hiding content with subtle rotation and translation to
 * simulate paper movement during cutting.
 *
 * Features:
 * - Multiple cut patterns: straight, zigzag, wave, torn
 * - Configurable cut speed and paper drift
 * - Optional paper texture edges (simulated via filter effects)
 * - Subtle rotation and translation for realistic paper movement
 * - Targets specific component IDs for flexible application
 *
 * Cut Patterns:
 * - straight: Clean linear cut across the element
 * - zigzag: Jagged zigzag pattern cut
 * - wave: Smooth wavy cut pattern
 * - torn: Irregular torn paper edge effect
 *
 * ARRAY OF EFFECTS:
 * Returns multiple effects (clip-path, rotation, translation) that work together
 * to create the scissor cutting animation.
 *
 * Use cases:
 * - Text reveals with crafty aesthetic
 * - Image transitions with paper-cut effect
 * - Creative content reveals
 * - Handmade/scrapbook style animations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  targetIds: z
    .array(z.string())
    .describe('Array of component IDs to apply the scissor cut effect to'),
  cutPattern: z
    .enum(['straight', 'zigzag', 'wave', 'torn'])
    .default('straight')
    .describe('The cutting pattern to use (straight/zigzag/wave/torn)'),
  cutDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Duration of the cutting animation in seconds'),
  addPaperEdge: z
    .boolean()
    .default(false)
    .describe('Whether to add paper texture edge effects (slight blur and shadow)'),
  driftAmount: z
    .number()
    .min(0)
    .max(50)
    .default(10)
    .describe('Amount of vertical drift in pixels during cutting'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect (relative to parent component)'),
  direction: z
    .enum(['reveal', 'hide'])
    .default('reveal')
    .describe('Whether to reveal content (cut in) or hide it (cut out)'),
  cutDirection: z
    .enum(['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'])
    .default('left-to-right')
    .describe('Direction the cutting animation progresses'),
  effectIdPrefix: z
    .string()
    .optional()
    .describe('Optional prefix for effect IDs'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    targetIds,
    cutPattern,
    cutDuration,
    addPaperEdge,
    driftAmount,
    effectStart,
    direction,
    cutDirection,
    effectIdPrefix,
  } = params;

  // Helper function to generate clip-path based on pattern and progress
  const generateClipPath = (
    pattern: string,
    progress: number,
    dir: string,
  ): string => {
    // Normalize progress for reveal vs hide
    const prog = direction === 'reveal' ? progress : 1 - progress;

    switch (pattern) {
      case 'straight': {
        // Clean straight cut
        if (dir === 'left-to-right') {
          return `inset(0 ${(1 - prog) * 100}% 0 0)`;
        } else if (dir === 'right-to-left') {
          return `inset(0 0 0 ${(1 - prog) * 100}%)`;
        } else if (dir === 'top-to-bottom') {
          return `inset(0 0 ${(1 - prog) * 100}% 0)`;
        } else {
          // bottom-to-top
          return `inset(${(1 - prog) * 100}% 0 0 0)`;
        }
      }

      case 'zigzag': {
        // Zigzag pattern using polygon
        const points: string[] = [];
        const segments = 10;
        const amplitude = 5; // Zigzag amplitude in percentage

        if (dir === 'left-to-right' || dir === 'right-to-left') {
          const cutPosition = prog * 100;
          // Top edge
          for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * cutPosition;
            const y = i % 2 === 0 ? 0 : amplitude;
            points.push(`${x}% ${y}%`);
          }
          // Right edge
          points.push(`${cutPosition}% 100%`);
          // Bottom edge (reverse)
          for (let i = segments; i >= 0; i--) {
            const x = (i / segments) * cutPosition;
            const y = 100 - (i % 2 === 0 ? 0 : amplitude);
            points.push(`${x}% ${y}%`);
          }
          // Left edge
          points.push(`0% 100%`, `0% 0%`);

          return `polygon(${points.join(', ')})`;
        } else {
          // Vertical zigzag
          const cutPosition = prog * 100;
          // Left edge
          for (let i = 0; i <= segments; i++) {
            const y = (i / segments) * cutPosition;
            const x = i % 2 === 0 ? 0 : amplitude;
            points.push(`${x}% ${y}%`);
          }
          // Bottom edge
          points.push(`100% ${cutPosition}%`);
          // Right edge (reverse)
          for (let i = segments; i >= 0; i--) {
            const y = (i / segments) * cutPosition;
            const x = 100 - (i % 2 === 0 ? 0 : amplitude);
            points.push(`${x}% ${y}%`);
          }
          // Top edge
          points.push(`100% 0%`, `0% 0%`);

          return `polygon(${points.join(', ')})`;
        }
      }

      case 'wave': {
        // Smooth wavy cut using path (approximated with polygon)
        const points: string[] = [];
        const segments = 20;
        const amplitude = 8;
        const frequency = 2;

        if (dir === 'left-to-right' || dir === 'right-to-left') {
          const cutPosition = prog * 100;
          // Top edge with wave
          for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * cutPosition;
            const phase = (i / segments) * frequency * Math.PI * 2;
            const y = amplitude * Math.sin(phase) + amplitude;
            points.push(`${x}% ${y}%`);
          }
          // Right and bottom
          points.push(`${cutPosition}% 100%`, `0% 100%`, `0% ${amplitude}%`);

          return `polygon(${points.join(', ')})`;
        } else {
          // Vertical wave
          const cutPosition = prog * 100;
          // Left edge with wave
          for (let i = 0; i <= segments; i++) {
            const y = (i / segments) * cutPosition;
            const phase = (i / segments) * frequency * Math.PI * 2;
            const x = amplitude * Math.sin(phase) + amplitude;
            points.push(`${x}% ${y}%`);
          }
          // Bottom and right
          points.push(`100% ${cutPosition}%`, `100% 0%`, `${amplitude}% 0%`);

          return `polygon(${points.join(', ')})`;
        }
      }

      case 'torn': {
        // Irregular torn edge
        const points: string[] = [];
        const segments = 15;
        const maxAmplitude = 12;

        if (dir === 'left-to-right' || dir === 'right-to-left') {
          const cutPosition = prog * 100;
          // Top edge with irregular torn pattern
          for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * cutPosition;
            // Pseudo-random amplitude based on position
            const randomFactor = Math.sin(i * 2.7) * Math.cos(i * 1.3);
            const y = maxAmplitude * randomFactor + maxAmplitude;
            points.push(`${x}% ${Math.max(0, y)}%`);
          }
          // Right and bottom
          points.push(`${cutPosition}% 100%`, `0% 100%`, `0% 0%`);

          return `polygon(${points.join(', ')})`;
        } else {
          // Vertical torn
          const cutPosition = prog * 100;
          // Left edge with irregular torn pattern
          for (let i = 0; i <= segments; i++) {
            const y = (i / segments) * cutPosition;
            const randomFactor = Math.sin(i * 2.7) * Math.cos(i * 1.3);
            const x = maxAmplitude * randomFactor + maxAmplitude;
            points.push(`${Math.max(0, x)}% ${y}%`);
          }
          // Bottom and right
          points.push(`100% ${cutPosition}%`, `100% 0%`, `0% 0%`);

          return `polygon(${points.join(', ')})`;
        }
      }

      default:
        return `inset(0 ${(1 - prog) * 100}% 0 0)`;
    }
  };

  // Generate rotation values (subtle wobble during cutting)
  const generateRotation = (progress: number): number => {
    // Oscillate between -2 and 2 degrees during cutting
    const wobbleFrequency = 3;
    const wobbleAmount = 2;
    return Math.sin(progress * wobbleFrequency * Math.PI * 2) * wobbleAmount;
  };

  // Generate drift values (vertical movement)
  const generateDrift = (progress: number): number => {
    // Ease-in-out curve for smooth drift
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    return eased * driftAmount;
  };

  // Create effects array
  const effects: any[] = [];

  // Clip-path animation effect
  const clipPathEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: cutDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      {
        key: 'clipPath',
        val: generateClipPath(cutPattern, 0, cutDirection),
        prog: 0,
      },
      {
        key: 'clipPath',
        val: generateClipPath(cutPattern, 0.25, cutDirection),
        prog: 0.25,
      },
      {
        key: 'clipPath',
        val: generateClipPath(cutPattern, 0.5, cutDirection),
        prog: 0.5,
      },
      {
        key: 'clipPath',
        val: generateClipPath(cutPattern, 0.75, cutDirection),
        prog: 0.75,
      },
      {
        key: 'clipPath',
        val: generateClipPath(cutPattern, 1, cutDirection),
        prog: 1,
      },
    ],
  };

  effects.push({
    id: effectIdPrefix
      ? `${effectIdPrefix}-clip-path`
      : `scissor-cut-clip-${targetIds[0]}`,
    componentId: 'generic',
    data: clipPathEffect,
  });

  // Rotation effect (subtle wobble)
  const rotationEffect: GenericEffectData = {
    type: 'linear',
    start: effectStart,
    duration: cutDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'rotate', val: generateRotation(0), prog: 0 },
      { key: 'rotate', val: generateRotation(0.25), prog: 0.25 },
      { key: 'rotate', val: generateRotation(0.5), prog: 0.5 },
      { key: 'rotate', val: generateRotation(0.75), prog: 0.75 },
      { key: 'rotate', val: 0, prog: 1 }, // End at 0 rotation
    ],
  };

  effects.push({
    id: effectIdPrefix
      ? `${effectIdPrefix}-rotation`
      : `scissor-cut-rotation-${targetIds[0]}`,
    componentId: 'generic',
    data: rotationEffect,
  });

  // Drift effect (vertical translation)
  const driftEffect: GenericEffectData = {
    type: 'ease-out',
    start: effectStart,
    duration: cutDuration,
    mode: 'provider',
    targetIds: targetIds,
    ranges: [
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: generateDrift(0.5), prog: 0.5 },
      { key: 'translateY', val: generateDrift(1), prog: 1 },
    ],
  };

  effects.push({
    id: effectIdPrefix
      ? `${effectIdPrefix}-drift`
      : `scissor-cut-drift-${targetIds[0]}`,
    componentId: 'generic',
    data: driftEffect,
  });

  // Paper edge effect (optional subtle blur and shadow)
  if (addPaperEdge) {
    const paperEdgeEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: effectStart,
      duration: cutDuration,
      mode: 'provider',
      targetIds: targetIds,
      ranges: [
        {
          key: 'filter',
          val: 'blur(0px) drop-shadow(0px 0px 0px rgba(0,0,0,0))',
          prog: 0,
        },
        {
          key: 'filter',
          val: 'blur(0.5px) drop-shadow(2px 2px 3px rgba(0,0,0,0.2))',
          prog: 0.5,
        },
        {
          key: 'filter',
          val: 'blur(0px) drop-shadow(1px 1px 2px rgba(0,0,0,0.1))',
          prog: 1,
        },
      ],
    };

    effects.push({
      id: effectIdPrefix
        ? `${effectIdPrefix}-paper-edge`
        : `scissor-cut-paper-edge-${targetIds[0]}`,
      componentId: 'generic',
      data: paperEdgeEffect,
    });
  }

  return {
    output: {
      childrenData: [
        {
          id: 'scissor-cut-effect-container',
          type: 'layout',
          componentId: 'BaseLayout',
          effects: effects,
          childrenData: [],
          context: {
            timing: {
              start: 0,
              duration: cutDuration + effectStart,
            },
          },
          data: {
            containerProps: {
              className: 'absolute inset-0',
              style: {
                pointerEvents: 'none',
              },
            },
          },
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'scissorCutPath',
  title: 'Scissor Cut Path Effect',
  description:
    'An internal effects preset that animates elements as if being cut out by invisible scissors. Uses SVG clip-path animations following defined cutting paths (straight, zigzag, wave, torn) to progressively reveal or hide content. Includes subtle rotation and translation to simulate paper movement during cutting.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'scissor', 'cut', 'clip-path', 'reveal', 'paper', 'crafty', 'internal', 'generic'],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    targetIds: ['component-1'],
    cutPattern: 'straight',
    cutDuration: 1.5,
    addPaperEdge: false,
    driftAmount: 10,
    effectStart: 0,
    direction: 'reveal',
    cutDirection: 'left-to-right',
  },
};

export const scissorCutPathPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
