/**
 * Split-Screen Parallax Preset
 *
 * This preset creates a visually stunning split-screen parallax effect that divides the viewport
 * into multiple vertical panels, each with independent parallax scrolling at different speeds.
 * Think of it as a split-screen effect in video editing where each segment shows different
 * perspective speeds, creating depth and visual interest.
 *
 * Features:
 * - **4 Vertical Panels**: Grid-based layout dividing the viewport into equal columns
 * - **Independent Parallax**: Each panel has 3 depth layers (back, mid, front) with different scroll speeds
 * - **Alternating Directions**: Panels 1 & 3 scroll upward, panels 2 & 4 scroll downward
 * - **Glowing Dividers**: White divider lines with glow effects separating panels
 * - **Progressive Reveal**: Mask transition that progressively reveals panels using clip-path
 * - **Spanning Text Overlay**: Text that spans across multiple panels with its own parallax movement
 * - **Synchronized Moments**: Brief alignment points where all panels sync up
 *
 * Use cases:
 * - Creating dynamic video intros with multiple perspectives
 * - Building engaging social media content with split-screen effects
 * - Adding professional parallax effects to presentations
 * - Creating music videos or artistic content with layered depth
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  // Panel 1 Images
  panel1BackgroundImage: z
    .string()
    .describe('Background image URL for panel 1 (slowest moving layer)'),
  panel1MidImage: z
    .string()
    .describe('Mid-layer image URL for panel 1 (medium speed)'),
  panel1FrontImage: z
    .string()
    .describe('Front layer image URL for panel 1 (fastest moving layer)'),

  // Panel 2 Images
  panel2BackgroundImage: z
    .string()
    .describe('Background image URL for panel 2 (slowest moving layer)'),
  panel2MidImage: z
    .string()
    .describe('Mid-layer image URL for panel 2 (medium speed)'),
  panel2FrontImage: z
    .string()
    .describe('Front layer image URL for panel 2 (fastest moving layer)'),

  // Panel 3 Images
  panel3BackgroundImage: z
    .string()
    .describe('Background image URL for panel 3 (slowest moving layer)'),
  panel3MidImage: z
    .string()
    .describe('Mid-layer image URL for panel 3 (medium speed)'),
  panel3FrontImage: z
    .string()
    .describe('Front layer image URL for panel 3 (fastest moving layer)'),

  // Panel 4 Images
  panel4BackgroundImage: z
    .string()
    .describe('Background image URL for panel 4 (slowest moving layer)'),
  panel4MidImage: z
    .string()
    .describe('Mid-layer image URL for panel 4 (medium speed)'),
  panel4FrontImage: z
    .string()
    .describe('Front layer image URL for panel 4 (fastest moving layer)'),

  // Text Overlay
  overlayText: z
    .string()
    .default('SPLIT SCREEN')
    .describe('Text overlay that spans across all panels'),

  // Animation Settings
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the animation in seconds'),

  parallaxSpeed: z
    .number()
    .default(1.0)
    .describe('Global parallax speed multiplier (0.5 = slower, 2.0 = faster)'),

  syncMoment: z
    .number()
    .default(0.5)
    .describe(
      'Point in timeline (0-1) where all panels briefly align and synchronize',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    panel1BackgroundImage,
    panel1MidImage,
    panel1FrontImage,
    panel2BackgroundImage,
    panel2MidImage,
    panel2FrontImage,
    panel3BackgroundImage,
    panel3MidImage,
    panel3FrontImage,
    panel4BackgroundImage,
    panel4MidImage,
    panel4FrontImage,
    overlayText,
    duration,
    parallaxSpeed,
    syncMoment,
  } = params;

  // Helper function to create parallax effects
  const createParallaxEffect = (
    targetId: string,
    direction: 'up' | 'down',
    speed: number,
  ) => {
    const moveAmount = speed * parallaxSpeed * 100; // Convert to percentage
    const startVal = direction === 'up' ? '0%' : '0%';
    const endVal = direction === 'up' ? `-${moveAmount}%` : `${moveAmount}%`;

    // Calculate sync point where movement temporarily pauses
    const syncPoint = syncMoment;
    const syncDuration = 0.1; // Brief pause at sync moment

    return {
      id: `parallax-${targetId}`,
      componentId: targetId,
      data: {
        type: 'linear',
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'translateY', val: startVal, prog: 0 },
          {
            key: 'translateY',
            val: direction === 'up' ? `-${moveAmount * syncPoint}%` : `${moveAmount * syncPoint}%`,
            prog: syncPoint - syncDuration / 2,
          },
          {
            key: 'translateY',
            val: direction === 'up' ? `-${moveAmount * syncPoint}%` : `${moveAmount * syncPoint}%`,
            prog: syncPoint + syncDuration / 2,
          },
          { key: 'translateY', val: endVal, prog: 1 },
        ],
      },
    };
  };

  // Helper function to create panel structure
  const createPanel = (
    panelNumber: number,
    backImage: string,
    midImage: string,
    frontImage: string,
    direction: 'up' | 'down',
  ) => {
    const panelId = `panel-${panelNumber}`;
    const backLayerId = `${panelId}-layer-back`;
    const midLayerId = `${panelId}-layer-mid`;
    const frontLayerId = `${panelId}-layer-front`;

    // Parallax speeds: back (slowest), mid (medium), front (fastest)
    const backSpeed = 0.15;
    const midSpeed = 0.1;
    const frontSpeed = 0.05;

    return {
      id: panelId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden',
          style: {
            isolation: 'isolate' as const,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [],
      childrenData: [
        // Back Layer
        {
          id: backLayerId,
          type: 'layout' as const,
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
          effects: [createParallaxEffect(backLayerId, direction, backSpeed)],
          childrenData: [
            {
              id: `${backLayerId}-image`,
              type: 'atom' as const,
              componentId: 'ImageAtom',
              data: {
                src: backImage,
                className: 'w-full h-full object-cover',
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
              effects: [],
              childrenData: [],
            },
          ],
        },
        // Mid Layer
        {
          id: midLayerId,
          type: 'layout' as const,
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
          effects: [createParallaxEffect(midLayerId, direction, midSpeed)],
          childrenData: [
            {
              id: `${midLayerId}-image`,
              type: 'atom' as const,
              componentId: 'ImageAtom',
              data: {
                src: midImage,
                className: 'w-full h-full object-cover opacity-80',
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
              effects: [],
              childrenData: [],
            },
          ],
        },
        // Front Layer
        {
          id: frontLayerId,
          type: 'layout' as const,
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
          effects: [createParallaxEffect(frontLayerId, direction, frontSpeed)],
          childrenData: [
            {
              id: `${frontLayerId}-image`,
              type: 'atom' as const,
              componentId: 'ImageAtom',
              data: {
                src: frontImage,
                className: 'w-full h-full object-cover opacity-60',
              },
              context: {
                timing: {
                  start: 0,
                  duration: duration,
                },
              },
              effects: [],
              childrenData: [],
            },
          ],
        },
      ],
    };
  };

  // Create divider with glow effect
  const createDivider = (dividerId: string, position: string) => {
    return {
      id: dividerId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute w-px h-full bg-white/30 z-10',
          style: {
            left: position,
            boxShadow: '0 0 10px 2px rgba(255,255,255,0.5)',
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
        {
          id: `${dividerId}-glow`,
          componentId: dividerId,
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: duration,
            mode: 'provider' as const,
            targetIds: [dividerId],
            ranges: [
              { key: 'opacity', val: '0.5', prog: 0 },
              { key: 'opacity', val: '1', prog: 0.25 },
              { key: 'opacity', val: '0.5', prog: 0.5 },
              { key: 'opacity', val: '1', prog: 0.75 },
              { key: 'opacity', val: '0.5', prog: 1 },
            ],
          },
        },
      ],
      childrenData: [],
    };
  };

  // Create spanning text overlay with parallax
  const spanningTextId = 'spanning-text';
  const spanningText = {
    id: spanningTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: overlayText,
      className: 'absolute z-50 text-white text-6xl font-bold text-center',
      style: {
        left: '10%',
        right: '10%',
        top: '50%',
        transform: 'translateY(-50%)',
        textShadow: '0 4px 20px rgba(0,0,0,0.8)',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      // Fade in
      {
        id: `${spanningTextId}-fade`,
        componentId: spanningTextId,
        data: {
          type: 'ease-out',
          start: 0,
          duration: 1,
          mode: 'provider' as const,
          targetIds: [spanningTextId],
          ranges: [
            { key: 'opacity', val: '0', prog: 0 },
            { key: 'opacity', val: '1', prog: 1 },
          ],
        },
      },
      // Subtle vertical parallax
      {
        id: `${spanningTextId}-parallax`,
        componentId: spanningTextId,
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider' as const,
          targetIds: [spanningTextId],
          ranges: [
            { key: 'translateY', val: '-50%', prog: 0 },
            { key: 'translateY', val: '-45%', prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Create mask reveal overlay
  const maskOverlayId = 'mask-reveal-overlay';
  const maskOverlay = {
    id: maskOverlayId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black z-40 pointer-events-none',
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
        id: `${maskOverlayId}-reveal`,
        componentId: maskOverlayId,
        data: {
          type: 'ease-out',
          start: 0,
          duration: 2,
          mode: 'provider' as const,
          targetIds: [maskOverlayId],
          ranges: [
            {
              key: 'clipPath',
              val: 'polygon(0 0, 0 0, 0 100%, 0 100%)',
              prog: 0,
            },
            {
              key: 'clipPath',
              val: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)',
              prog: 1,
            },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Build root container with all panels
  const rootContainer = {
    id: 'split-screen-parallax-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [],
    childrenData: [
      // 4 Panels with alternating directions
      createPanel(1, panel1BackgroundImage, panel1MidImage, panel1FrontImage, 'up'),
      createPanel(2, panel2BackgroundImage, panel2MidImage, panel2FrontImage, 'down'),
      createPanel(3, panel3BackgroundImage, panel3MidImage, panel3FrontImage, 'up'),
      createPanel(4, panel4BackgroundImage, panel4MidImage, panel4FrontImage, 'down'),
      // Dividers
      createDivider('divider-1', '25%'),
      createDivider('divider-2', '50%'),
      createDivider('divider-3', '75%'),
      // Spanning text overlay
      spanningText,
      // Mask reveal
      maskOverlay,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'split-screen-parallax',
  title: 'Split-Screen Parallax',
  description:
    'A multi-panel split-screen preset with independent parallax scrolling per panel. Features 4 vertical panels, each with 3 depth layers moving at different speeds. Alternating scroll directions (up/down) between panels create visual contrast. Includes glowing divider lines, progressive mask reveal transition, and text overlays that span across panels with their own parallax movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'parallax',
    'multi-panel',
    'depth',
    'kinetic',
    'visual-effects',
    'grid',
    'layered',
  ],
  defaultInputParams: {
    panel1BackgroundImage: 'https://picsum.photos/seed/panel1-back/800/1200',
    panel1MidImage: 'https://picsum.photos/seed/panel1-mid/800/1200',
    panel1FrontImage: 'https://picsum.photos/seed/panel1-front/800/1200',
    panel2BackgroundImage: 'https://picsum.photos/seed/panel2-back/800/1200',
    panel2MidImage: 'https://picsum.photos/seed/panel2-mid/800/1200',
    panel2FrontImage: 'https://picsum.photos/seed/panel2-front/800/1200',
    panel3BackgroundImage: 'https://picsum.photos/seed/panel3-back/800/1200',
    panel3MidImage: 'https://picsum.photos/seed/panel3-mid/800/1200',
    panel3FrontImage: 'https://picsum.photos/seed/panel3-front/800/1200',
    panel4BackgroundImage: 'https://picsum.photos/seed/panel4-back/800/1200',
    panel4MidImage: 'https://picsum.photos/seed/panel4-mid/800/1200',
    panel4FrontImage: 'https://picsum.photos/seed/panel4-front/800/1200',
    overlayText: 'SPLIT SCREEN',
    duration: 10,
    parallaxSpeed: 1.0,
    syncMoment: 0.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const splitScreenParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
