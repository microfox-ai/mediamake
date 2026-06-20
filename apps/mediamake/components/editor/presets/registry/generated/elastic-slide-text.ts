/**
 * Elastic Slide Text Preset
 *
 * This preset creates an energetic text animation where text stretches horizontally
 * as it slides in, mimicking the effect of pulling taffy. The text begins compressed,
 * slides in while expanding to slightly over-scale, then snaps back to normal size.
 * Perfect for youth-oriented content, gaming graphics, and fun brand animations.
 *
 * Features:
 * - **Elastic Stretch Effect**: Text scales from 0.3x to 1.15x and back to 1.0x
 * - **Horizontal Slide**: Text slides in from left (translateX: -100% to 0%)
 * - **Dynamic Skew**: Skewing from 0° to -8° to 3° to 0° enhances motion dynamics
 * - **Motion Blur**: Optional blur effect during peak velocity (40-60% of animation)
 * - **Transform Origin**: Left-anchored to maintain left edge during stretch/skew
 * - **Custom Timing**: 0.8s duration with cubic-bezier easing for bounce effect
 *
 * Use cases:
 * - Youth-oriented content and gaming graphics
 * - Fun brand animations and product launches
 * - Energetic title cards and lower thirds
 * - Social media content with playful energy
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display with elastic slide effect'),
  
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Roboto", "BebasNeue")'),
  
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "900")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(80)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (CSS color value, e.g., "#FFFFFF", "rgb(255,255,255)")'),
  
  duration: z
    .number()
    .min(0.3)
    .max(2.0)
    .default(0.8)
    .describe('Animation duration in seconds (0.6-0.8s recommended)'),
  
  startOffset: z
    .string()
    .default('-100%')
    .describe('Starting horizontal offset (e.g., "-100%", "-200px")'),
  
  maxStretch: z
    .number()
    .min(1.0)
    .max(2.0)
    .default(1.15)
    .describe('Maximum horizontal stretch scale at peak (50% progress)'),
  
  maxSkew: z
    .number()
    .min(-15)
    .max(15)
    .default(-8)
    .describe('Maximum skew angle in degrees at 40% progress'),
  
  motionBlurAmount: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Motion blur amount in pixels during peak velocity (0 = disabled)'),
  
  containerPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text in frame'),
  
  start: z
    .number()
    .default(0)
    .describe('Start time in seconds (relative to parent)'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // ========================================
  // Extract and Validate Parameters
  // ========================================
  
  const {
    text,
    fontFamily,
    fontWeight,
    fontSize,
    textColor,
    duration,
    startOffset,
    maxStretch,
    maxSkew,
    motionBlurAmount,
    containerPosition,
    start,
  } = params;

  // ========================================
  // Helper: Get Container Alignment
  // ========================================
  
  const getContainerAlignment = (position: 'top' | 'center' | 'bottom'): string => {
    switch (position) {
      case 'top':
        return 'items-start justify-start';
      case 'bottom':
        return 'items-end justify-end';
      case 'center':
      default:
        return 'items-center justify-center';
    }
  };

  // ========================================
  // IDs
  // ========================================
  
  const containerId = 'elastic-slide-container';
  const textElementId = 'elastic-slide-text';

  // ========================================
  // Create Text Element
  // ========================================
  
  const textElement: RenderableComponentData = {
    id: textElementId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: textColor,
        transformOrigin: 'left center', // Left-anchored for stretch/skew
        whiteSpace: 'nowrap',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [],
  };

  // ========================================
  // Create Effects
  // ========================================

  // Effect 1: Slide Effect (translateX: startOffset → 0%)
  const slideEffect: GenericEffectData = {
    type: 'cubic-bezier',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [textElementId],
    ranges: [
      { key: 'translateX', val: startOffset, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
    ],
  };

  // Effect 2: Stretch Effect (scaleX: 0.3 → 0.7 → maxStretch → 1.05 → 1.0)
  const stretchEffect: GenericEffectData = {
    type: 'cubic-bezier',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [textElementId],
    ranges: [
      { key: 'scaleX', val: 0.3, prog: 0 },
      { key: 'scaleX', val: 0.7, prog: 0.3 },
      { key: 'scaleX', val: maxStretch, prog: 0.5 },
      { key: 'scaleX', val: 1.05, prog: 0.7 },
      { key: 'scaleX', val: 1.0, prog: 1 },
    ],
  };

  // Effect 3: Skew Effect (skewX: 0° → maxSkew → -3° → 0°)
  const skewEffect: GenericEffectData = {
    type: 'cubic-bezier',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [textElementId],
    ranges: [
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewX', val: maxSkew, prog: 0.4 },
      { key: 'skewX', val: -3, prog: 0.6 },
      { key: 'skewX', val: 0, prog: 1 },
    ],
  };

  // Effect 4: Motion Blur Effect (blur: 0 → motionBlurAmount → motionBlurAmount → 0)
  const blurEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration,
    mode: 'provider',
    targetIds: [textElementId],
    ranges: [
      { key: 'blur', val: 0, prog: 0 },
      { key: 'blur', val: motionBlurAmount, prog: 0.4 },
      { key: 'blur', val: motionBlurAmount, prog: 0.6 },
      { key: 'blur', val: 0, prog: 1 },
    ],
  };

  // Attach all effects to text element
  textElement.effects = [
    { id: 'slide-effect', componentId: 'generic', data: slideEffect },
    { id: 'stretch-effect', componentId: 'generic', data: stretchEffect },
    { id: 'skew-effect', componentId: 'generic', data: skewEffect },
    ...(motionBlurAmount > 0
      ? [{ id: 'blur-effect', componentId: 'generic', data: blurEffect }]
      : []),
  ];

  // ========================================
  // Create Container Layout
  // ========================================
  
  const containerAlignment = getContainerAlignment(containerPosition);

  const elasticContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${containerAlignment} overflow-hidden`,
      },
    },
    context: {
      timing: {
        start,
        duration,
      },
    },
    childrenData: [textElement],
  };

  // ========================================
  // Return Preset Output
  // ========================================
  
  return {
    output: {
      childrenData: [elasticContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'elastic-slide-text',
  title: 'Elastic Slide Text',
  description:
    'An energetic text animation preset featuring horizontal elastic stretching effects. Text slides in from the left while dramatically stretching and compressing like taffy, creating a playful speed-blur effect. Features synchronized translateX, scaleX, and skewX animations with peak stretch during mid-animation (40-60%). Perfect for youth content, gaming graphics, and fun brand animations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'elastic',
    'slide',
    'stretch',
    'taffy',
    'kinetic',
    'gaming',
    'youth',
    'energetic',
    'motion-blur',
    'skew',
    'bounce',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'ELASTIC SLIDE',
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 80,
    textColor: '#FFFFFF',
    duration: 0.8,
    startOffset: '-100%',
    maxStretch: 1.15,
    maxSkew: -8,
    motionBlurAmount: 3,
    containerPosition: 'center',
    start: 0,
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const elasticSlideTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
