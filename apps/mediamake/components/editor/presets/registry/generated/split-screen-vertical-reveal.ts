/**
 * Split-Screen Vertical Reveal with Light Leak Preset
 *
 * This preset creates a dreamy split-screen vertical reveal where text is unveiled
 * through two soft-edged masks moving in opposite directions (one up, one down) that
 * meet in the middle. Features feathered masks with 30-40px blur creating a curtain
 * effect, slightly overlapping at center with increased blur (60px) for seamless blend,
 * subtle light leak effect at center seam with white gradient flash, and letter-spacing
 * animation that contracts as text is revealed for a 'coming together' feeling.
 *
 * Use cases:
 * - Creating cinematic text reveals with soft mask transitions
 * - Building dreamy, ethereal title sequences
 * - Adding professional split-screen reveal effects
 * - Creating emotional text unveilings with light leak accents
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- PARAMS SCHEMA ---
const presetParams = z.object({
  text: z.string().describe('Text content to reveal'),
  duration: z.number().default(3).describe('Duration of reveal animation in seconds'),
  
  // Font configuration
  font: z
    .string()
    .default('Inter:600')
    .describe('Font family with optional weight and style (e.g., "Roboto:600", "Inter:700")'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  textColor: z.string().default('#FFFFFF').describe('Text color'),
  
  // Mask configuration
  maskBlurTop: z.number().default(35).describe('Blur amount for top mask in pixels (30-40px recommended)'),
  maskBlurBottom: z.number().default(35).describe('Blur amount for bottom mask in pixels (30-40px recommended)'),
  maskOverlap: z.number().default(0.1).describe('Overlap amount at center as fraction of height (0-1)'),
  
  // Center glow configuration
  centerGlowHeight: z.number().default(150).describe('Height of center glow effect in pixels'),
  centerGlowBlur: z.number().default(60).describe('Blur amount for center glow in pixels'),
  centerGlowOpacity: z.number().default(0.8).describe('Maximum opacity of center glow (0-1)'),
  centerGlowTiming: z.object({
    start: z.number().default(0.4).describe('When center glow starts as fraction of duration (0-1)'),
    peak: z.number().default(0.5).describe('When center glow peaks as fraction of duration (0-1)'),
    end: z.number().default(0.6).describe('When center glow ends as fraction of duration (0-1)'),
  }).default({ start: 0.4, peak: 0.5, end: 0.6 }).describe('Timing configuration for center glow'),
  
  // Letter spacing animation
  initialLetterSpacing: z.number().default(0.2).describe('Initial letter spacing in em units'),
  finalLetterSpacing: z.number().default(0).describe('Final letter spacing in em units'),
  
  // Easing configuration
  easingType: z.enum(['ease-in-out', 'ease-in', 'ease-out', 'linear']).default('ease-in-out').describe('Easing function for animations'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- EXECUTION ---
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    font,
    fontSize,
    textColor,
    maskBlurTop,
    maskBlurBottom,
    maskOverlap,
    centerGlowHeight,
    centerGlowBlur,
    centerGlowOpacity,
    centerGlowTiming,
    initialLetterSpacing,
    finalLetterSpacing,
    easingType,
  } = params;

  // Parse font string
  const fontString = font || 'Inter:600';
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

  // Component IDs
  const textId = 'split-reveal-text';
  const topMaskId = 'split-reveal-top-mask';
  const bottomMaskId = 'split-reveal-bottom-mask';
  const centerGlowId = 'split-reveal-center-glow';

  // --- TEXT ATOM ---
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        textAlign: 'center',
        zIndex: 1,
        position: 'relative',
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
        duration,
      },
    },
    effects: [
      {
        id: 'letter-spacing-animation',
        componentId: 'generic',
        data: {
          type: easingType,
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [textId],
          ranges: [
            { key: 'letterSpacing', val: `${initialLetterSpacing}em`, prog: 0 },
            { key: 'letterSpacing', val: `${finalLetterSpacing}em`, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- TOP MASK ---
  const topMask: RenderableComponentData = {
    id: topMaskId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute w-full h-1/2',
      style: {
        top: 0,
        left: 0,
        background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
        filter: `blur(${maskBlurTop}px)`,
        zIndex: 10,
        pointerEvents: 'none',
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
        id: 'top-mask-translate',
        componentId: 'generic',
        data: {
          type: easingType,
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [topMaskId],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // --- BOTTOM MASK ---
  const bottomMask: RenderableComponentData = {
    id: bottomMaskId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute w-full h-1/2',
      style: {
        bottom: 0,
        left: 0,
        background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
        filter: `blur(${maskBlurBottom}px)`,
        zIndex: 10,
        pointerEvents: 'none',
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
        id: 'bottom-mask-translate',
        componentId: 'generic',
        data: {
          type: easingType,
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [bottomMaskId],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '100%', prog: 1 },
          ],
        },
      },
    ],
  };

  // --- CENTER GLOW ---
  const centerGlow: RenderableComponentData = {
    id: centerGlowId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute',
      style: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: `${centerGlowHeight}px`,
        background: 'linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)',
        filter: `blur(${centerGlowBlur}px)`,
        zIndex: 5,
        pointerEvents: 'none',
        opacity: 0,
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
        id: 'center-glow-pulse',
        componentId: 'generic',
        data: {
          type: easingType,
          start: centerGlowTiming.start * duration,
          duration: (centerGlowTiming.end - centerGlowTiming.start) * duration,
          mode: 'provider',
          targetIds: [centerGlowId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { 
              key: 'opacity', 
              val: centerGlowOpacity, 
              prog: (centerGlowTiming.peak - centerGlowTiming.start) / (centerGlowTiming.end - centerGlowTiming.start)
            },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // --- ROOT CONTAINER ---
  const rootContainer: RenderableComponentData = {
    id: 'split-reveal-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom, topMask, bottomMask, centerGlow],
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

// --- METADATA ---
const presetMetadata: PresetMetadata = {
  id: 'split-screen-vertical-reveal',
  title: 'Split-Screen Vertical Reveal with Light Leak',
  description:
    'A dreamy split-screen vertical reveal where text is unveiled through two soft-edged masks moving in opposite directions (one up, one down) that meet in the middle. Features feathered masks with 30-40px blur creating a curtain effect, slightly overlapping at center with increased blur (60px) for seamless blend, subtle light leak effect at center seam with white gradient flash, and letter-spacing animation that contracts as text is revealed for a "coming together" feeling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'split-screen',
    'mask',
    'light-leak',
    'dreamy',
    'curtain',
    'cinematic',
    'transition',
  ],
  defaultInputParams: {
    text: 'Split Reveal',
    duration: 3,
    font: 'Inter:600',
    fontSize: 72,
    textColor: '#FFFFFF',
    maskBlurTop: 35,
    maskBlurBottom: 35,
    maskOverlap: 0.1,
    centerGlowHeight: 150,
    centerGlowBlur: 60,
    centerGlowOpacity: 0.8,
    centerGlowTiming: {
      start: 0.4,
      peak: 0.5,
      end: 0.6,
    },
    initialLetterSpacing: 0.2,
    finalLetterSpacing: 0,
    easingType: 'ease-in-out',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- EXPORT ---
export const splitScreenVerticalRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
