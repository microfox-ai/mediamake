/**
 * Typokinetics Arc Path Preset
 *
 * Animates a single word along a smooth, cinematic bezier arc path - like a movie title card
 * gracefully entering and exiting frame. The word follows a curved trajectory from bottom-left,
 * rising to peak at center-top, then descending off-screen to the right. Features tangent-following
 * rotation, motion blur at movement peaks, fade-in/out at endpoints, and letter-spacing expansion
 * at the arc apex for dramatic emphasis.
 *
 * Features:
 * - **Cinematic Arc Path**: Smooth bezier curve trajectory (bottom-left → center-top → bottom-right)
 * - **Tangent-Following Rotation**: Word rotates to follow the arc tangent (-15deg → 0deg → 15deg)
 * - **Motion Blur Effect**: Subtle blur during fastest parts of movement (2px → 0px → 2px)
 * - **Fade-In/Out**: Gentle opacity transitions at trajectory endpoints (20% fade zones)
 * - **Letter-Spacing Expansion**: Dramatic emphasis at arc apex (0 → 0.2em → 0)
 * - **Performance Optimized**: Uses transform-gpu and will-change-transform
 *
 * Use cases:
 * - Creating cinematic title card sequences
 * - Building dramatic opening sequences
 * - Adding high-end motion graphics text
 * - Creating movie-style title arcs
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Preset parameters schema
const presetParams = z.object({
  word: z
    .string()
    .describe('The word to animate along the arc path'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family for the text (format: "FontName" or "FontName:weight")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .optional()
    .describe('Font size in pixels'),
  
  fontWeight: z
    .string()
    .default('700')
    .optional()
    .describe('Font weight (e.g., "400", "700", "bold")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .optional()
    .describe('Animation duration in seconds (4-6 seconds recommended)'),
  
  arcHeight: z
    .number()
    .min(-50)
    .max(50)
    .default(-20)
    .optional()
    .describe('Arc peak height as percentage from center (negative = upward, -20 = center-top)'),
  
  maxRotation: z
    .number()
    .min(0)
    .max(45)
    .default(15)
    .optional()
    .describe('Maximum rotation angle in degrees at trajectory endpoints'),
  
  letterSpacingExpansion: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Letter spacing expansion at apex in em units'),
  
  motionBlurIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe('Motion blur intensity in pixels'),
  
  fadeZonePercentage: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .optional()
    .describe('Percentage of animation duration for fade-in/out (20 = 20% at each end)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.fontFamily || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font weight
  let fontWeight = params.fontWeight || '700';
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontWeight = fontParts[1];
    }
  }

  // Calculate fade zone progress points
  const fadeZone = (params.fadeZonePercentage || 20) / 100;
  const fadeInEnd = fadeZone;
  const fadeOutStart = 1 - fadeZone;

  // Construct generic effect data for the arc animation
  const arcEffectData: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration || 5,
    mode: 'provider',
    targetIds: ['arc-text'],
    ranges: [
      // Horizontal arc motion: -50% → 0% → 50%
      { key: 'translateX', val: '-50%', prog: 0 },
      { key: 'translateX', val: '0%', prog: 0.5 },
      { key: 'translateX', val: '50%', prog: 1 },
      
      // Vertical arc motion: 100% → -20% → 100% (parabolic path)
      { key: 'translateY', val: '100%', prog: 0 },
      { key: 'translateY', val: `${params.arcHeight || -20}%`, prog: 0.5 },
      { key: 'translateY', val: '100%', prog: 1 },
      
      // Rotation following arc tangent: -15deg → 0deg → 15deg
      { key: 'rotate', val: -(params.maxRotation || 15), prog: 0 },
      { key: 'rotate', val: 0, prog: 0.5 },
      { key: 'rotate', val: (params.maxRotation || 15), prog: 1 },
      
      // Opacity fade-in/out at trajectory endpoints
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: fadeInEnd },
      { key: 'opacity', val: 1, prog: fadeOutStart },
      { key: 'opacity', val: 0, prog: 1 },
      
      // Letter spacing expansion at apex
      { key: 'letterSpacing', val: '0em', prog: 0 },
      { key: 'letterSpacing', val: `${params.letterSpacingExpansion || 0.2}em`, prog: 0.5 },
      { key: 'letterSpacing', val: '0em', prog: 1 },
      
      // Motion blur at movement peaks (start and end)
      { key: 'filter', val: `blur(${params.motionBlurIntensity || 2}px)`, prog: 0 },
      { key: 'filter', val: 'blur(0px)', prog: fadeInEnd },
      { key: 'filter', val: 'blur(0px)', prog: fadeOutStart },
      { key: 'filter', val: `blur(${params.motionBlurIntensity || 2}px)`, prog: 1 },
    ],
  };

  // Create the arc animation effect
  const arcEffect = {
    id: 'arc-motion-effect',
    componentId: 'generic',
    data: arcEffectData,
  };

  // Create TextAtom component
  const textComponent: RenderableComponentData = {
    id: 'arc-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.word,
      className: 'text-6xl font-bold tracking-normal transform-gpu will-change-transform',
      style: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        whiteSpace: 'nowrap',
        fontSize: `${params.fontSize || 96}px`,
        color: params.textColor || '#FFFFFF',
        fontWeight: fontWeight,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration || 5,
      },
    },
    effects: [],
  };

  // Create root container with effect
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-arc-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration || 5,
      },
    },
    effects: [arcEffect],
    childrenData: [textComponent] as RenderableComponentData[],
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
  id: 'typokinetics-arc-path',
  title: 'Typokinetics Arc Path',
  description:
    'Animates a single word along a smooth, cinematic bezier arc path - like a movie title card gracefully entering and exiting frame. The word follows a curved trajectory from bottom-left, rising to peak at center-top, then descending off-screen to the right. Features tangent-following rotation, motion blur at movement peaks, fade-in/out at endpoints, and letter-spacing expansion at the arc apex for dramatic emphasis.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'arc',
    'motion',
    'cinematic',
    'title',
    'bezier',
    'curve',
    'rotation',
    'motion-blur',
    'letter-spacing',
  ],
  dependencies: {},
  defaultInputParams: {
    word: 'CINEMATIC',
    fontFamily: 'Inter',
    fontSize: 96,
    fontWeight: '700',
    textColor: '#FFFFFF',
    duration: 5,
    arcHeight: -20,
    maxRotation: 15,
    letterSpacingExpansion: 0.2,
    motionBlurIntensity: 2,
    fadeZonePercentage: 20,
  },
};

// Export preset
export const typokineticsArcPathPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
