/**
 * Typokinetic Slam Word Preset
 *
 * A sharp-cut single word typokinetic preset that appears instantly on a musical downbeat,
 * mimicking how a video editor would use a hard cut at a critical moment. The word slams
 * into frame with maximum impact - think of it as a visual percussion hit.
 *
 * Features:
 * - Instant opacity change (0 to 1) at exact start time - no fade-in
 * - Scale overshoot effect (1.2 to 1.0) over 100-200ms using spring easing
 * - Brief white flash overlay (50ms) on impact for emphasis
 * - Heavy, authoritative typography with bold sans-serif font
 * - Center-screen positioning with strong presence
 * - Subtle text shadow for depth
 * - GPU-accelerated transforms for performance
 *
 * Use cases:
 * - Beat-synchronized title cards for music videos
 * - Visual percussion hits in rhythm-driven content
 * - Hard cuts at critical moments in storytelling
 * - Impact text for social media content
 * - Dynamic typography for sports highlights
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  word: z.string().describe('The word to display with slam effect'),
  displayDuration: z.number().default(3).describe('Duration to display the word in seconds'),
  fontSize: z.string().default('120px').describe('Font size (e.g., "120px", "8rem")'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  fontFamily: z.string().default('Inter').describe('Font family name'),
  scaleOvershoot: z.number().default(1.2).min(1.0).max(1.5).describe('Initial scale value for overshoot effect (1.0 to 1.5)'),
  scaleAnimationDuration: z.number().default(0.2).min(0.1).max(0.5).describe('Duration of scale animation in seconds'),
  flashDuration: z.number().default(0.05).min(0.01).max(0.1).describe('Duration of white flash in seconds'),
  flashOpacity: z.number().default(0.8).min(0.3).max(1.0).describe('Initial opacity of flash (0.3 to 1.0)'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    word,
    displayDuration,
    fontSize,
    textColor,
    fontFamily,
    scaleOvershoot,
    scaleAnimationDuration,
    flashDuration,
    flashOpacity,
  } = params;

  // Create flash overlay container
  const flashOverlay: RenderableComponentData = {
    id: 'typokinetic-flash-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-white pointer-events-none',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: displayDuration,
      },
    },
    effects: [
      {
        id: 'flash-opacity-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['typokinetic-flash-overlay'],
          type: 'linear',
          start: 0,
          duration: flashDuration,
          ranges: [
            { key: 'opacity', val: flashOpacity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create text atom with effects
  const textAtom: RenderableComponentData = {
    id: 'typokinetic-word-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: word,
      style: {
        fontSize: fontSize,
        fontWeight: 900,
        color: textColor,
        textAlign: 'center',
        filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))',
      },
      font: {
        family: fontFamily,
        weights: ['900'],
        display: 'swap',
        preload: true,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: displayDuration,
      },
    },
    effects: [
      // Instant opacity change (no transition - 1ms duration)
      {
        id: 'instant-opacity-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['typokinetic-word-text'],
          type: 'linear',
          start: 0,
          duration: 0.001,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Scale overshoot effect with spring easing
      {
        id: 'scale-overshoot-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: ['typokinetic-word-text'],
          type: 'spring',
          start: 0,
          duration: scaleAnimationDuration,
          ranges: [
            { key: 'scale', val: scaleOvershoot, prog: 0 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create text container with GPU optimization
  const textContainer: RenderableComponentData = {
    id: 'typokinetic-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transform: 'translateZ(0)',
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: displayDuration,
      },
    },
    childrenData: [textAtom],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetic-slam-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: displayDuration,
      },
    },
    childrenData: [flashOverlay, textContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetic-slam-word',
  title: 'Typokinetic Slam Word',
  description: 'A sharp-cut single word typokinetic preset that appears instantly on a musical downbeat with maximum impact. Features instant opacity change, scale overshoot animation with spring easing, and a brief white flash overlay to emphasize the visual percussion hit - mimicking hard cuts used by video editors at critical moments.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'slam', 'impact', 'beat-sync', 'hard-cut', 'percussion'],
  defaultInputParams: {
    word: 'IMPACT',
    displayDuration: 3,
    fontSize: '120px',
    textColor: '#ffffff',
    fontFamily: 'Inter',
    scaleOvershoot: 1.2,
    scaleAnimationDuration: 0.2,
    flashDuration: 0.05,
    flashOpacity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const typokineticSlamWordPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
