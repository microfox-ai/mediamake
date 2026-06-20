/**
 * Lens Breathing Focus Effect Preset
 *
 * A cinematic lens breathing focus effect that mimics professional cinema lenses.
 * As text comes into focus, it exhibits characteristic 'breathing' - subtle size
 * changes that occur during focus pulls. Starts with heavy blur (18px) and slightly
 * larger scale (1.08x), then animates to sharp focus with normal scale (1.0x).
 * Includes realistic vignetting that reduces as focus is achieved.
 *
 * Features:
 * - Synchronized blur and scale animations mimicking real lens breathing
 * - Heavy blur (18px) to sharp focus (0px)
 * - Slight scale change (1.08x to 1.0x) during focus pull
 * - Realistic vignetting overlay that reduces as focus is achieved
 * - Cinema-accurate timing (2.8s) with cubic-bezier easing
 * - GPU-accelerated transforms for smooth performance
 *
 * Use cases:
 * - Cinematic title reveals
 * - Professional focus pull effects
 * - Dramatic text introductions
 * - Film-style text overlays
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text to display with lens breathing effect'),
  fontSize: z
    .union([z.string(), z.number()])
    .default(72)
    .describe('Font size for the text (e.g., 72, "5rem")'),
  fontWeight: z
    .union([z.string(), z.number()])
    .default('bold')
    .describe('Font weight (e.g., "bold", 700, "normal")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (e.g., "#FFFFFF", "rgb(255,255,255)")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family (e.g., "Inter", "Roboto", "Montserrat")'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(2.8)
    .describe('Duration of the focus pull effect (cinema standard: 2.8s)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { text, fontSize, fontWeight, textColor, fontFamily, duration } = params;

  // Parse fontSize to number for calculations
  const fontSizeNum =
    typeof fontSize === 'string' ? parseFloat(fontSize) : fontSize;

  // Container IDs
  const containerId = 'lens-breathing-container';
  const vignetteOverlayId = 'lens-breathing-vignette-overlay';
  const textContainerId = 'lens-breathing-text-container';
  const textId = 'lens-breathing-focus-text';

  // Create vignette overlay component
  const vignetteOverlay: RenderableComponentData = {
    id: vignetteOverlayId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%)',
          zIndex: 10,
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
        id: `${vignetteOverlayId}-opacity-effect`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.645, 0.045, 0.355, 1.0)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [vignetteOverlayId],
          ranges: [
            { key: 'opacity', val: 1.0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [],
  };

  // Create text atom component
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize:
          typeof fontSize === 'string' ? fontSize : `${fontSize}px`,
        fontWeight: fontWeight,
        color: textColor,
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        weights: ['400', '700'],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Create text container with effects
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center',
        style: {
          position: 'relative',
          zIndex: 5,
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
        id: `${textContainerId}-blur-effect`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.645, 0.045, 0.355, 1.0)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'filter', val: 'blur(18px)', prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      {
        id: `${textContainerId}-scale-effect`,
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.645, 0.045, 0.355, 1.0)',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textContainerId],
          ranges: [
            { key: 'scale', val: 1.08, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      },
    ],
    childrenData: [textAtom],
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center w-full h-full',
        style: {
          overflow: 'hidden',
          position: 'relative',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [vignetteOverlay, textContainer],
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
  id: 'lens-breathing-focus',
  title: 'Lens Breathing Focus Effect',
  description:
    'A cinematic lens breathing focus effect that mimics professional cinema lenses. As text comes into focus, it exhibits characteristic "breathing" - subtle size changes that occur during focus pulls. Starts with heavy blur (18px) and slightly larger scale (1.08x), then animates to sharp focus with normal scale (1.0x). Includes realistic vignetting that reduces as focus is achieved. Timing matches real-world focus pulling speeds with natural acceleration and deceleration using cubic-bezier easing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'cinematic',
    'lens',
    'breathing',
    'focus',
    'blur',
    'scale',
    'vignette',
    'professional',
    'film',
    'text',
    'title',
  ],
  defaultInputParams: {
    text: 'Cinematic Focus',
    fontSize: 72,
    fontWeight: 'bold',
    textColor: '#FFFFFF',
    fontFamily: 'Inter',
    duration: 2.8,
  },
  dependencies: {},
};

// Export preset
export const lensBreathingFocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
