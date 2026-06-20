/**
 * Split-Screen Curtain Reveal Typography Preset
 *
 * This preset creates a kinetic typography effect inspired by split-screen video editing.
 * Words slide apart vertically (like opening curtains) to reveal text emerging from behind.
 * 
 * Features:
 * - Foreground words split vertically with smooth bezier easing (cubic-bezier(0.4, 0, 0.2, 1))
 * - Background text fades in with directional motion blur that clears as it settles
 * - Parallax effect: background moves slightly slower than foreground
 * - Growing shadow simulates lifted layers (After Effects style)
 * - Nested BaseLayout structure for proper layering and overflow handling
 * - Hardware-accelerated transforms using translate3d
 * 
 * Use cases:
 * - Title reveals with dramatic split-curtain effect
 * - Social media intros with layered typography
 * - Video transitions with text reveals
 * - Kinetic typography animations
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  topWord: z.string().describe('Top foreground word that slides upward'),
  bottomWord: z.string().describe('Bottom foreground word that slides downward'),
  revealWord: z.string().describe('Background word that is revealed behind the split'),
  
  fontSize: z.string().default('72px').describe('Font size for all text (e.g., "72px", "4rem")'),
  fontFamily: z.string().default('Inter').describe('Font family for all text (e.g., "Inter", "Roboto")'),
  
  foregroundTextColor: z.string().default('#FFFFFF').describe('Color of the foreground split words'),
  revealTextColor: z.string().default('#FFD700').describe('Color of the revealed background text'),
  
  splitDistance: z.number().default(150).describe('Distance the foreground words move apart (in pixels)'),
  splitDuration: z.number().default(1.2).describe('Duration of the split animation (in seconds)'),
  revealDelay: z.number().default(0.1).describe('Delay before the reveal text starts fading in (in seconds) - creates parallax effect'),
  
  blurIntensity: z.number().default(8).describe('Initial blur intensity for the reveal text (in pixels)'),
  shadowSpread: z.number().default(20).describe('Maximum shadow spread for lifted foreground words (in pixels)'),
  
  totalDuration: z.number().default(3).describe('Total duration of the animation (in seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    topWord,
    bottomWord,
    revealWord,
    fontSize,
    fontFamily,
    foregroundTextColor,
    revealTextColor,
    splitDistance,
    splitDuration,
    revealDelay,
    blurIntensity,
    shadowSpread,
    totalDuration,
  } = params;

  // Parse font family for weights
  const fontString = fontFamily || 'Inter';
  const parsedFontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;

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

  // Component IDs for effects targeting
  const topWordId = 'top-word';
  const bottomWordId = 'bottom-word';
  const topContainerId = 'top-word-container';
  const bottomContainerId = 'bottom-word-container';
  const revealTextId = 'reveal-text';

  // ============================================================================
  // LAYER 1: BACKGROUND (REVEAL TEXT)
  // ============================================================================
  
  const backgroundLayer: RenderableComponentData = {
    id: 'background-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      {
        id: revealTextId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: revealWord,
          style: {
            fontSize: fontSize,
            fontWeight: 'bold',
            color: revealTextColor,
            transform: 'translate3d(0, 0, 0)',
            ...fontStyle,
          },
          font: {
            family: parsedFontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          // Reveal text effect: fade in + slight upward movement + blur-to-clear
          {
            id: 'reveal-fade-in',
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: revealDelay,
              duration: splitDuration * 0.8,
              mode: 'provider',
              targetIds: [revealTextId],
              ranges: [
                // Fade in opacity
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                // Slight upward movement (parallax)
                { key: 'translateY', val: -5, prog: 0 },
                { key: 'translateY', val: 0, prog: 1 },
                // Motion blur clears
                { key: 'filter', val: `blur(${blurIntensity}px)`, prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // ============================================================================
  // LAYER 2: FOREGROUND (SPLIT WORDS)
  // ============================================================================
  
  const foregroundLayer: RenderableComponentData = {
    id: 'foreground-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Top word container
      {
        id: topContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -100%) translate3d(0, 0, 0)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          {
            id: topWordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: topWord,
              style: {
                fontSize: fontSize,
                fontWeight: 'bold',
                color: foregroundTextColor,
                whiteSpace: 'nowrap',
                ...fontStyle,
              },
              font: {
                family: parsedFontFamily,
                ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          // Top word slides up
          {
            id: 'top-slide-up',
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              start: 0,
              duration: splitDuration,
              mode: 'provider',
              targetIds: [topContainerId],
              ranges: [
                // Slide upward
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -splitDistance, prog: 1 },
                // Growing shadow
                { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 0 },
                { key: 'filter', val: `drop-shadow(0 ${shadowSpread * 0.5}px ${shadowSpread}px rgba(0,0,0,0.1))`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
      // Bottom word container
      {
        id: bottomContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, 0%) translate3d(0, 0, 0)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: [
          {
            id: bottomWordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: bottomWord,
              style: {
                fontSize: fontSize,
                fontWeight: 'bold',
                color: foregroundTextColor,
                whiteSpace: 'nowrap',
                ...fontStyle,
              },
              font: {
                family: parsedFontFamily,
                ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
              },
            },
            context: {
              timing: {
                start: 0,
                duration: totalDuration,
              },
            },
          } as RenderableComponentData,
        ],
        effects: [
          // Bottom word slides down
          {
            id: 'bottom-slide-down',
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              start: 0,
              duration: splitDuration,
              mode: 'provider',
              targetIds: [bottomContainerId],
              ranges: [
                // Slide downward
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: splitDistance, prog: 1 },
                // Growing shadow
                { key: 'filter', val: 'drop-shadow(0 0 0px rgba(0,0,0,0))', prog: 0 },
                { key: 'filter', val: `drop-shadow(0 ${shadowSpread * 0.5}px ${shadowSpread}px rgba(0,0,0,0.1))`, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================
  
  const rootContainer: RenderableComponentData = {
    id: 'split-curtain-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      backgroundLayer,
      foregroundLayer,
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

// ============================================================================
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'split-curtain-reveal-typography',
  title: 'Split Screen Curtain Reveal Typography',
  description:
    'A kinetic typography preset inspired by split-screen video editing. Foreground words slide apart vertically like opening curtains to reveal text emerging from behind with a blur-to-clear fade effect. Features smooth bezier easing, parallax depth with staggered timing, and growing shadows that simulate lifted layers.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'split-screen',
    'curtain',
    'reveal',
    'parallax',
    'motion-blur',
    'shadow',
    'video-editing',
    'after-effects',
  ],
  defaultInputParams: {
    topWord: 'AMAZING',
    bottomWord: 'RESULTS',
    revealWord: 'WATCH',
    fontSize: '72px',
    fontFamily: 'Inter',
    foregroundTextColor: '#FFFFFF',
    revealTextColor: '#FFD700',
    splitDistance: 150,
    splitDuration: 1.2,
    revealDelay: 0.1,
    blurIntensity: 8,
    shadowSpread: 20,
    totalDuration: 3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const splitCurtainRevealTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
