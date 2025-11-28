/**
 * Cinematic Title Sequence Typokinetic Preset
 *
 * This preset creates a dramatic Hollywood-style title sequence where text lines emerge
 * from darkness with epic motion. Each line starts completely black (brightness: 0) and
 * rises from below with a massive 3x scale, gradually illuminating and reducing to normal
 * size like stage lights turning on.
 *
 * Features:
 * - **Exponential Brightness Curve**: Text fades from 0 to 100% brightness with ease-in-out-expo
 * - **Dramatic Scale Motion**: Each line starts at 3x scale and reduces to 1x during rise
 * - **Vertical Rise Animation**: Lines translate from 200% below to center position
 * - **Letterbox Reveal**: Animated black bars (top/bottom) expand to reveal each line
 * - **Film Grain Overlay**: Subtle SVG turbulence texture for cinematic atmosphere
 * - **Optional Lens Flare**: Radial gradient effect that tracks with newest line
 * - **Generous Spacing**: Cinematic vertical stacking with dramatic gaps
 * - **Blockbuster Typography**: 7xl font size, black weight, wide tracking, uppercase
 *
 * Technical Details:
 * - Combined translateY (200% to 0), scale (3 to 1), brightness filter (0 to 100%)
 * - All animations use ease-in-out-expo easing (2.5s duration)
 * - Letterbox bars animate with scaleY transformations
 * - Film grain uses SVG turbulence with low opacity overlay
 * - Lens flare uses radial gradient with screen blend mode
 * - Timing: 2.5s per line with 1s overlap for dramatic build
 *
 * Use cases:
 * - Movie opening credits and title sequences
 * - Blockbuster film intros
 * - Epic trailer titles
 * - Dramatic reveal sequences
 * - High-impact brand presentations
 * - Cinematic event announcements
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData, TextAtomData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  lines: z
    .array(
      z.object({
        text: z.string().describe('Text content for this title line'),
        startTime: z
          .number()
          .optional()
          .describe('Start time for this line (seconds, relative to preset)'),
      }),
    )
    .min(1)
    .describe('Array of text lines to display in sequence'),

  font: z
    .string()
    .optional()
    .default('Inter:900')
    .describe(
      'Font family with optional weight (e.g., "Inter:900", "Bebas Neue:700")',
    ),

  textColor: z
    .string()
    .optional()
    .default('#FFFFFF')
    .describe('Base color for text (hex or rgba)'),

  fontSize: z
    .number()
    .optional()
    .default(96)
    .describe('Font size in pixels (blockbuster scale)'),

  letterSpacing: z
    .number()
    .optional()
    .default(20)
    .describe('Letter spacing in pixels for dramatic spacing'),

  lineSpacing: z
    .number()
    .optional()
    .default(40)
    .describe('Vertical spacing between lines in pixels'),

  animationDuration: z
    .number()
    .optional()
    .default(2.5)
    .describe('Duration of each line animation in seconds'),

  animationOverlap: z
    .number()
    .optional()
    .default(1.0)
    .describe('Overlap between successive line animations in seconds'),

  enableLensFlare: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable lens flare effect on newest line'),

  enableFilmGrain: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable film grain texture overlay'),

  letterboxHeight: z
    .number()
    .optional()
    .default(15)
    .describe('Height of letterbox bars as percentage (0-50)'),

  glowIntensity: z
    .number()
    .optional()
    .default(0.5)
    .describe('Text glow intensity (0-1)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: { fontWeight?: number; fontStyle?: string } = {};

    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
      }
    }

    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter:900');

  // Calculate total duration
  const calculateTotalDuration = () => {
    const lines = params.lines;
    const animationDuration = params.animationDuration || 2.5;
    const animationOverlap = params.animationOverlap || 1.0;

    if (lines.length === 0) return 0;
    if (lines.length === 1) return animationDuration;

    // Total = first line duration + (n-1) * (duration - overlap)
    return animationDuration + (lines.length - 1) * (animationDuration - animationOverlap);
  };

  const totalDuration = calculateTotalDuration();

  // Build children data array
  const childrenData: RenderableComponentData[] = [];

  // 1. Film Grain Overlay (if enabled)
  if (params.enableFilmGrain) {
    const filmGrainSvg = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300"><filter id="noise"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#noise)" opacity="0.05"/></svg>`)}`;

    childrenData.push({
      id: 'film-grain-overlay',
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="position: absolute; inset: 0; background-image: url('${filmGrainSvg}'); pointer-events: none; mix-blend-mode: overlay; opacity: 0.15;"></div>`,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          zIndex: 100,
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  }

  // 2. Letterbox Bars (Top and Bottom)
  const letterboxHeight = `${params.letterboxHeight || 15}%`;

  childrenData.push({
    id: 'letterbox-top',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute top-0 left-0 right-0 bg-black',
      style: {
        height: letterboxHeight,
        transformOrigin: 'top',
        zIndex: 50,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  childrenData.push({
    id: 'letterbox-bottom',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute bottom-0 left-0 right-0 bg-black',
      style: {
        height: letterboxHeight,
        transformOrigin: 'bottom',
        zIndex: 50,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // 3. Create text lines with effects
  const animationDuration = params.animationDuration || 2.5;
  const animationOverlap = params.animationOverlap || 1.0;

  params.lines.forEach((line, index) => {
    const lineId = `text-line-${index}`;
    const lensFlareId = `lens-flare-${index}`;

    // Calculate start time for this line
    const lineStartTime =
      line.startTime !== undefined
        ? line.startTime
        : index * (animationDuration - animationOverlap);

    // Text Atom
    const textAtomData: TextAtomData = {
      text: line.text,
      className: 'text-white mix-blend-screen text-7xl font-black tracking-widest uppercase',
      style: {
        fontSize: params.fontSize || 96,
        color: params.textColor || '#FFFFFF',
        letterSpacing: `${params.letterSpacing || 20}px`,
        textShadow: `0 0 30px rgba(255, 255, 255, ${params.glowIntensity || 0.5})`,
        filter: 'brightness(0)',
        opacity: 0,
        transform: 'translateY(200%) scale(3)',
        ...(index > 0 ? { marginTop: `${params.lineSpacing || 40}px` } : {}),
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
        subsets: ['latin'],
        display: 'swap',
      },
    };

    childrenData.push({
      id: lineId,
      type: 'atom',
      componentId: 'TextAtom',
      data: textAtomData,
      context: {
        timing: {
          start: lineStartTime,
          duration: animationDuration,
        },
      },
    } as RenderableComponentData);

    // Text Animation Effect (translateY, scale, brightness, opacity)
    const textEffectData: GenericEffectData = {
      type: 'ease-in-out-expo',
      start: 0, // Relative to line start
      duration: animationDuration,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        // TranslateY: 200% to 0
        { key: 'translateY', val: 200, prog: 0, unit: '%' },
        { key: 'translateY', val: 0, prog: 1, unit: '%' },
        // Scale: 3 to 1
        { key: 'scale', val: 3, prog: 0 },
        { key: 'scale', val: 1, prog: 1 },
        // Brightness: 0% to 100%
        { key: 'brightness', val: 0, prog: 0, unit: '%' },
        { key: 'brightness', val: 100, prog: 1, unit: '%' },
        // Opacity: 0 to 1 (quick fade-in at 30% progress)
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    };

    childrenData.push({
      id: `effect-${lineId}`,
      type: 'layout',
      componentId: 'BaseLayout',
      effects: [
        {
          id: `text-effect-${lineId}`,
          componentId: 'generic',
          data: textEffectData,
        },
      ],
      childrenData: [],
      context: {
        timing: {
          start: lineStartTime,
          duration: animationDuration,
        },
      },
    } as RenderableComponentData);

    // Letterbox animation for each line (pulse effect)
    if (index > 0) {
      const letterboxAnimDuration = 0.8;
      const letterboxEffectDataTop: GenericEffectData = {
        type: 'ease-in-out-expo',
        start: 0, // Relative to line start
        duration: letterboxAnimDuration,
        mode: 'provider',
        targetIds: ['letterbox-top'],
        ranges: [
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: 1.2, prog: 0.5 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      };

      const letterboxEffectDataBottom: GenericEffectData = {
        type: 'ease-in-out-expo',
        start: 0,
        duration: letterboxAnimDuration,
        mode: 'provider',
        targetIds: ['letterbox-bottom'],
        ranges: [
          { key: 'scaleY', val: 1, prog: 0 },
          { key: 'scaleY', val: 1.2, prog: 0.5 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      };

      childrenData.push({
        id: `effect-letterbox-top-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        effects: [
          {
            id: `letterbox-top-effect-${index}`,
            componentId: 'generic',
            data: letterboxEffectDataTop,
          },
        ],
        childrenData: [],
        context: {
          timing: {
            start: lineStartTime,
            duration: letterboxAnimDuration,
          },
        },
      } as RenderableComponentData);

      childrenData.push({
        id: `effect-letterbox-bottom-${index}`,
        type: 'layout',
        componentId: 'BaseLayout',
        effects: [
          {
            id: `letterbox-bottom-effect-${index}`,
            componentId: 'generic',
            data: letterboxEffectDataBottom,
          },
        ],
        childrenData: [],
        context: {
          timing: {
            start: lineStartTime,
            duration: letterboxAnimDuration,
          },
        },
      } as RenderableComponentData);
    } else {
      // First line: letterbox initial reveal
      const letterboxAnimDuration = 0.8;
      const letterboxEffectDataTop: GenericEffectData = {
        type: 'ease-in-out-expo',
        start: 0,
        duration: letterboxAnimDuration,
        mode: 'provider',
        targetIds: ['letterbox-top'],
        ranges: [
          { key: 'scaleY', val: 1.5, prog: 0 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      };

      const letterboxEffectDataBottom: GenericEffectData = {
        type: 'ease-in-out-expo',
        start: 0,
        duration: letterboxAnimDuration,
        mode: 'provider',
        targetIds: ['letterbox-bottom'],
        ranges: [
          { key: 'scaleY', val: 1.5, prog: 0 },
          { key: 'scaleY', val: 1, prog: 1 },
        ],
      };

      childrenData.push({
        id: 'effect-letterbox-top-initial',
        type: 'layout',
        componentId: 'BaseLayout',
        effects: [
          {
            id: 'letterbox-top-effect-initial',
            componentId: 'generic',
            data: letterboxEffectDataTop,
          },
        ],
        childrenData: [],
        context: {
          timing: {
            start: lineStartTime,
            duration: letterboxAnimDuration,
          },
        },
      } as RenderableComponentData);

      childrenData.push({
        id: 'effect-letterbox-bottom-initial',
        type: 'layout',
        componentId: 'BaseLayout',
        effects: [
          {
            id: 'letterbox-bottom-effect-initial',
            componentId: 'generic',
            data: letterboxEffectDataBottom,
          },
        ],
        childrenData: [],
        context: {
          timing: {
            start: lineStartTime,
            duration: letterboxAnimDuration,
          },
        },
      } as RenderableComponentData);
    }

    // Lens Flare (if enabled)
    if (params.enableLensFlare) {
      childrenData.push({
        id: lensFlareId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'absolute pointer-events-none',
          style: {
            width: '400px',
            height: '400px',
            background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)',
            filter: 'blur(20px)',
            opacity: 0,
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 20,
            mixBlendMode: 'screen',
          },
        },
        context: {
          timing: {
            start: lineStartTime,
            duration: animationDuration,
          },
        },
      } as RenderableComponentData);

      // Lens Flare Effect (opacity fade in/out)
      const lensFlareEffectData: GenericEffectData = {
        type: 'ease-in-out',
        start: 0,
        duration: animationDuration,
        mode: 'provider',
        targetIds: [lensFlareId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.6, prog: 0.4 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      childrenData.push({
        id: `effect-${lensFlareId}`,
        type: 'layout',
        componentId: 'BaseLayout',
        effects: [
          {
            id: `lens-flare-effect-${index}`,
            componentId: 'generic',
            data: lensFlareEffectData,
          },
        ],
        childrenData: [],
        context: {
          timing: {
            start: lineStartTime,
            duration: animationDuration,
          },
        },
      } as RenderableComponentData);
    }
  });

  // Root Container
  const rootContainer: RenderableComponentData = {
    id: 'cinematic-title-sequence-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black h-full flex flex-col justify-center items-center overflow-hidden',
        style: {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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
  id: 'cinematic-title-sequence',
  title: 'Cinematic Title Sequence Typokinetic',
  description:
    'A dramatic Hollywood-style title sequence preset where text lines emerge from darkness with epic motion. Features exponential brightness curves (0-100%), massive scale transformations (3x to 1x), vertical rise animations (200% to 0), animated letterbox bars, film grain overlay, and optional lens flare effects. Creates weighty, blockbuster-quality opening credits with generous cinematic spacing.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'cinematic',
    'title-sequence',
    'blockbuster',
    'dramatic',
    'hollywood',
    'opening-credits',
    'scale-animation',
    'brightness-curve',
    'letterbox',
    'film-grain',
    'lens-flare',
    'exponential-easing',
    'epic',
    'motion-graphics',
  ],
  defaultInputParams: {
    lines: [
      { text: 'LINE ONE', startTime: undefined },
      { text: 'LINE TWO', startTime: undefined },
      { text: 'LINE THREE', startTime: undefined },
    ],
    font: 'Inter:900',
    textColor: '#FFFFFF',
    fontSize: 96,
    letterSpacing: 20,
    lineSpacing: 40,
    animationDuration: 2.5,
    animationOverlap: 1.0,
    enableLensFlare: true,
    enableFilmGrain: true,
    letterboxHeight: 15,
    glowIntensity: 0.5,
  },
  dependencies: {},
};

// ============================================================================
// EXPORT
// ============================================================================

export const cinematicTitleSequencePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
