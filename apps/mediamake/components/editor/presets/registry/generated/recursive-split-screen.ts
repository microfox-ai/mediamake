/**
 * Recursive Split Screen Cascade Preset
 *
 * A fractal edit pattern where panels subdivide recursively with cascading animations.
 * The main split happens, then each panel splits again into smaller segments, creating
 * a complex geometric reveal.
 *
 * Features:
 * - **Recursive Subdivision**: Panels split into 2, then 4, then 8 segments
 * - **Decreasing Animation Duration**: 1s → 0.5s → 0.25s per subdivision level
 * - **Ripple Effect**: Increasing delay offsets create wave-like reveals
 * - **Checkerboard Movement**: Alternating slide directions based on grid position
 * - **Subtle Rotation**: ±2 degrees during slides to break rigid geometry
 * - **Performance Optimized**: CSS containment and limited recursion depth
 *
 * Use cases:
 * - Creating complex geometric transitions
 * - Building fractal-style reveals
 * - Advanced compositing techniques
 * - Dynamic split-screen effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  recursionDepth: z
    .number()
    .min(1)
    .max(3)
    .default(3)
    .describe('Number of subdivision levels (1=2 panels, 2=4 panels, 3=8 panels)'),
  level1Duration: z
    .number()
    .default(1)
    .describe('Animation duration for level 1 splits (seconds)'),
  level2Duration: z
    .number()
    .default(0.5)
    .describe('Animation duration for level 2 splits (seconds)'),
  level3Duration: z
    .number()
    .default(0.25)
    .describe('Animation duration for level 3 splits (seconds)'),
  delayBetweenSiblings: z
    .number()
    .default(0.1)
    .describe('Delay between sibling panel animations (seconds)'),
  level2StartDelay: z
    .number()
    .default(1.5)
    .describe('Delay before level 2 subdivision starts (seconds)'),
  level3StartDelay: z
    .number()
    .default(1)
    .describe('Delay before level 3 subdivision starts relative to level 2 (seconds)'),
  rotationAmount: z
    .number()
    .default(2)
    .describe('Maximum rotation in degrees during slide animations'),
  colors: z
    .array(z.string())
    .default([
      'from-purple-600 to-blue-600',
      'from-pink-600 to-orange-600',
      'from-cyan-600 to-teal-600',
      'from-green-600 to-lime-600',
      'from-yellow-600 to-amber-600',
      'from-red-600 to-rose-600',
      'from-indigo-600 to-purple-600',
      'from-violet-600 to-fuchsia-600',
    ])
    .describe('Gradient color classes for panels (Tailwind format)'),
  totalDuration: z
    .number()
    .default(10)
    .describe('Total duration of the composition (seconds)'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    recursionDepth,
    level1Duration,
    level2Duration,
    level3Duration,
    delayBetweenSiblings,
    level2StartDelay,
    level3StartDelay,
    rotationAmount,
    colors,
    totalDuration,
  } = params;

  // Helper function to generate panel ID
  const generatePanelId = (level: number, ...indices: number[]): string => {
    return `level-${level}-panel-${indices.join('-')}`;
  };

  // Helper function to get color gradient for a panel
  const getColorGradient = (colorIndex: number): string => {
    return colors[colorIndex % colors.length];
  };

  // Helper function to create slide effect
  const createSlideEffect = (
    targetId: string,
    effectId: string,
    duration: number,
    direction: 'horizontal' | 'vertical',
    index: number,
    rotation: number,
  ): RenderableComponentData => {
    const isEven = index % 2 === 0;
    const translateKey = direction === 'horizontal' ? 'translateX' : 'translateY';
    const translateValue = isEven ? -100 : 100;

    const effectData: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: translateKey, val: translateValue, prog: 0, unit: '%' },
        { key: translateKey, val: 0, prog: 1, unit: '%' },
        { key: 'rotate', val: rotation, prog: 0, unit: 'deg' },
        { key: 'rotate', val: 0, prog: 1, unit: 'deg' },
      ],
    };

    return {
      id: effectId,
      type: 'layout',
      componentId: 'generic',
      effectData,
      childrenData: [],
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData;
  };

  // Helper function to create panel content
  const createPanelContent = (
    panelId: string,
    colorGradient: string,
    duration: number,
  ): RenderableComponentData => {
    return {
      id: `${panelId}-content`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div class='w-full h-full bg-gradient-to-br ${colorGradient}'></div>`,
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    } as RenderableComponentData;
  };

  // Generate all panels and effects
  const allChildren: RenderableComponentData[] = [];
  const allEffects: RenderableComponentData[] = [];

  // Level 1: 2 panels (horizontal split)
  const level1Children: RenderableComponentData[] = [];
  for (let i = 0; i < 2; i++) {
    const panelId = generatePanelId(1, i);
    const contentId = `${panelId}-content`;
    const panelContent = createPanelContent(contentId, getColorGradient(i), level1Duration);

    // Create level 2 container if recursion depth allows
    const level2ContainerId = `level-2-container-${i}`;
    const level2Children: RenderableComponentData[] = [];

    if (recursionDepth >= 2) {
      // Level 2: 2 panels per level 1 panel (vertical split)
      for (let j = 0; j < 2; j++) {
        const level2PanelId = generatePanelId(2, i, j);
        const level2ContentId = `${level2PanelId}-content`;
        const level2PanelContent = createPanelContent(
          level2ContentId,
          getColorGradient(i * 2 + j + 2),
          level2Duration,
        );

        // Create level 3 container if recursion depth allows
        const level3ContainerId = `level-3-container-${i}-${j}`;
        const level3Children: RenderableComponentData[] = [];

        if (recursionDepth >= 3) {
          // Level 3: 2 panels per level 2 panel (horizontal split)
          for (let k = 0; k < 2; k++) {
            const level3PanelId = generatePanelId(3, i, j, k);
            const level3PanelContent = createPanelContent(
              level3PanelId,
              getColorGradient(i * 4 + j * 2 + k + 4),
              level3Duration,
            );

            // Level 3 slide effect (horizontal)
            const level3EffectId = `level-3-slide-effect-${i}-${j}-${k}`;
            const level3Rotation = k % 2 === 0 ? -rotationAmount * 0.75 : rotationAmount * 0.75;
            const level3Effect = createSlideEffect(
              level3PanelId,
              level3EffectId,
              level3Duration,
              'horizontal',
              k,
              level3Rotation,
            );
            allEffects.push(level3Effect);

            level3Children.push(level3PanelContent);
          }

          // Level 3 container
          const level3Container: RenderableComponentData = {
            id: level3ContainerId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 grid grid-cols-2 gap-0',
              },
            },
            context: {
              timing: {
                start: level3StartDelay,
                duration: totalDuration - level3StartDelay,
              },
            },
            childrenData: level3Children,
          } as RenderableComponentData;

          // Level 2 panel with level 3 container
          const level2Panel: RenderableComponentData = {
            id: level2PanelId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative w-full h-full overflow-hidden',
                style: {
                  contain: 'layout style paint',
                },
              },
            },
            context: {
              timing: {
                start: j * delayBetweenSiblings,
                duration: totalDuration - j * delayBetweenSiblings,
              },
            },
            childrenData: [level2PanelContent, level3Container],
          } as RenderableComponentData;

          level2Children.push(level2Panel);
        } else {
          // Level 2 panel without level 3 (final level)
          const level2Panel: RenderableComponentData = {
            id: level2PanelId,
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'relative w-full h-full overflow-hidden',
                style: {
                  contain: 'layout style paint',
                },
              },
            },
            context: {
              timing: {
                start: j * delayBetweenSiblings,
                duration: totalDuration - j * delayBetweenSiblings,
              },
            },
            childrenData: [level2PanelContent],
          } as RenderableComponentData;

          level2Children.push(level2Panel);
        }

        // Level 2 slide effect (vertical)
        const level2EffectId = `level-2-slide-effect-${i}-${j}`;
        const level2Rotation = j % 2 === 0 ? -rotationAmount : rotationAmount;
        const level2Effect = createSlideEffect(
          level2ContentId,
          level2EffectId,
          level2Duration,
          'vertical',
          j,
          level2Rotation,
        );
        allEffects.push(level2Effect);
      }

      // Level 2 container
      const level2Container: RenderableComponentData = {
        id: level2ContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 grid grid-cols-2 gap-0',
          },
        },
        context: {
          timing: {
            start: level2StartDelay,
            duration: totalDuration - level2StartDelay,
          },
        },
        childrenData: level2Children,
      } as RenderableComponentData;

      // Level 1 panel with level 2 container
      const level1Panel: RenderableComponentData = {
        id: panelId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full overflow-hidden',
            style: {
              contain: 'layout style paint',
            },
          },
        },
        context: {
          timing: {
            start: i * delayBetweenSiblings,
            duration: totalDuration - i * delayBetweenSiblings,
          },
        },
        childrenData: [panelContent, level2Container],
      } as RenderableComponentData;

      level1Children.push(level1Panel);
    } else {
      // Level 1 panel without level 2 (final level)
      const level1Panel: RenderableComponentData = {
        id: panelId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative w-full h-full overflow-hidden',
            style: {
              contain: 'layout style paint',
            },
          },
        },
        context: {
          timing: {
            start: i * delayBetweenSiblings,
            duration: totalDuration - i * delayBetweenSiblings,
          },
        },
        childrenData: [panelContent],
      } as RenderableComponentData;

      level1Children.push(level1Panel);
    }

    // Level 1 slide effect (horizontal)
    const level1EffectId = `level-1-slide-effect-${i}`;
    const level1Rotation = i % 2 === 0 ? -rotationAmount : rotationAmount;
    const level1Effect = createSlideEffect(
      contentId,
      level1EffectId,
      level1Duration,
      'horizontal',
      i,
      level1Rotation,
    );
    allEffects.push(level1Effect);
  }

  // Level 1 container
  const level1Container: RenderableComponentData = {
    id: 'level-1-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 grid grid-cols-2 gap-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: level1Children,
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'recursive-split-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [level1Container, ...allEffects],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'recursive-split-screen',
  title: 'Recursive Split Screen Cascade',
  description:
    'A fractal edit pattern where panels subdivide recursively with cascading animations. Features geometric reveals with sliding panels, rotation, and ripple effects. Each subdivision level has decreasing animation duration creating complex compositions from simple recursive rules.',
  type: 'predefined',
  presetType: 'children',
  tags: ['split-screen', 'recursive', 'fractal', 'geometric', 'transition', 'cascade'],
  defaultInputParams: {
    recursionDepth: 3,
    level1Duration: 1,
    level2Duration: 0.5,
    level3Duration: 0.25,
    delayBetweenSiblings: 0.1,
    level2StartDelay: 1.5,
    level3StartDelay: 1,
    rotationAmount: 2,
    colors: [
      'from-purple-600 to-blue-600',
      'from-pink-600 to-orange-600',
      'from-cyan-600 to-teal-600',
      'from-green-600 to-lime-600',
      'from-yellow-600 to-amber-600',
      'from-red-600 to-rose-600',
      'from-indigo-600 to-purple-600',
      'from-violet-600 to-fuchsia-600',
    ],
    totalDuration: 10,
  },
  dependencies: {},
};

// Export preset
export const recursiveSplitScreenPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
