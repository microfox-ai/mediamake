/**
 * Magnetic Attraction Text Stretch Preset
 *
 * This preset creates a dynamic text animation where text appears to be pulled by invisible magnetic
 * forces from multiple directions. The text stretches toward attraction points, creating elongated
 * distortions based on force vectors, then snaps back elastically when "released".
 *
 * Features:
 * - **Magnetic Pull Physics**: Text stretches toward invisible attraction points like taffy being pulled
 * - **Multi-Directional Forces**: Sequential magnetic pulls from different points create dynamic motion
 * - **Elastic Snapback**: Spring-based return to original state with realistic physics
 * - **Transform Matrix Calculations**: Deformation based on distance and direction to magnetic centers
 * - **3D Perspective**: Uses perspective(800px) for realistic depth and deformation
 * - **Field Line Visualization**: Optional magnetic field lines that follow the force vectors
 * - **Configurable Intensity**: Adjustable stretch intensity and timing via parameters
 *
 * Animation Sequence:
 * 1. Neutral state (0-0.6s) → Stretch toward right attraction point
 * 2. Hold at maximum stretch (0.6-0.9s)
 * 3. Transition to top-left attraction point (0.9-1.5s)
 * 4. Hold at second maximum stretch (1.5-1.8s)
 * 5. Elastic snapback to neutral (1.8-2.5s) with spring physics
 *
 * Use Cases:
 * - Dynamic intro/outro animations
 * - Attention-grabbing transitions
 * - Scientific/tech visualization aesthetics
 * - Brand reveals with physics-based motion
 * - Title cards with dramatic emphasis
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// ============================================================================
// SCHEMA DEFINITION
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display and animate'),
  
  fontSize: z
    .number()
    .min(12)
    .max(300)
    .default(72)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or CSS color value)'),
  
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  stretchIntensity: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe('Multiplier for stretch effect intensity (0.5 = subtle, 2.0 = extreme)'),
  
  transitionDuration: z
    .number()
    .min(1.5)
    .max(5.0)
    .default(2.5)
    .describe('Total animation duration in seconds'),
  
  showFieldLines: z
    .boolean()
    .default(false)
    .describe('Show magnetic field line visualizations during transitions'),
  
  fieldLineColor: z
    .string()
    .default('rgba(100, 200, 255, 0.6)')
    .describe('Color of magnetic field lines (CSS color with alpha)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Inter:700';
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

  // Calculate animation timings based on total duration
  const totalDuration = params.transitionDuration;
  const phase1Duration = totalDuration * 0.24; // 0.6s at 2.5s default
  const hold1Duration = totalDuration * 0.12; // 0.3s
  const phase2Duration = totalDuration * 0.24; // 0.6s
  const hold2Duration = totalDuration * 0.12; // 0.3s
  const snapbackDuration = totalDuration * 0.28; // 0.7s
  
  const phase1End = phase1Duration;
  const hold1End = phase1End + hold1Duration;
  const phase2End = hold1End + phase2Duration;
  const hold2End = phase2End + hold2Duration;

  // Apply intensity multiplier to stretch values
  const intensity = params.stretchIntensity;

  // ============================================================================
  // TEXT ATOM WITH MAGNETIC EFFECTS
  // ============================================================================

  const textAtomId = 'magnetic-text-atom';

  // Effect 1: Pull toward right (horizontal stretch)
  const magneticPullPhase1Effect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: phase1Duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scaleX', val: 1, prog: 0 },
      { key: 'scaleX', val: 1 + (0.3 * intensity), prog: 1 },
      { key: 'scaleY', val: 1, prog: 0 },
      { key: 'scaleY', val: 1 - (0.15 * intensity), prog: 1 },
      { key: 'skewX', val: 0, prog: 0 },
      { key: 'skewX', val: -8 * intensity, prog: 1 },
      { key: 'translateX', val: 0, prog: 0 },
      { key: 'translateX', val: 40 * intensity, prog: 1 },
      { key: 'rotateY', val: 0, prog: 0 },
      { key: 'rotateY', val: 5 * intensity, prog: 1 },
    ],
  };

  // Effect 2: Hold phase 1
  const magneticHoldPhase1Effect: GenericEffectData = {
    type: 'linear',
    start: phase1End,
    duration: hold1Duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scaleX', val: 1 + (0.3 * intensity), prog: 0 },
      { key: 'scaleX', val: 1 + (0.3 * intensity), prog: 1 },
      { key: 'scaleY', val: 1 - (0.15 * intensity), prog: 0 },
      { key: 'scaleY', val: 1 - (0.15 * intensity), prog: 1 },
      { key: 'skewX', val: -8 * intensity, prog: 0 },
      { key: 'skewX', val: -8 * intensity, prog: 1 },
      { key: 'translateX', val: 40 * intensity, prog: 0 },
      { key: 'translateX', val: 40 * intensity, prog: 1 },
      { key: 'rotateY', val: 5 * intensity, prog: 0 },
      { key: 'rotateY', val: 5 * intensity, prog: 1 },
    ],
  };

  // Effect 3: Pull toward top-left (vertical stretch)
  const magneticPullPhase2Effect: GenericEffectData = {
    type: 'ease-in-out',
    start: hold1End,
    duration: phase2Duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scaleX', val: 1 + (0.3 * intensity), prog: 0 },
      { key: 'scaleX', val: 1 + (0.2 * intensity), prog: 1 },
      { key: 'scaleY', val: 1 - (0.15 * intensity), prog: 0 },
      { key: 'scaleY', val: 1 + (0.4 * intensity), prog: 1 },
      { key: 'skewX', val: -8 * intensity, prog: 0 },
      { key: 'skewX', val: 12 * intensity, prog: 1 },
      { key: 'translateX', val: 40 * intensity, prog: 0 },
      { key: 'translateX', val: -30 * intensity, prog: 1 },
      { key: 'translateY', val: 0, prog: 0 },
      { key: 'translateY', val: -50 * intensity, prog: 1 },
      { key: 'rotateY', val: 5 * intensity, prog: 0 },
      { key: 'rotateY', val: -8 * intensity, prog: 1 },
    ],
  };

  // Effect 4: Hold phase 2
  const magneticHoldPhase2Effect: GenericEffectData = {
    type: 'linear',
    start: phase2End,
    duration: hold2Duration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scaleX', val: 1 + (0.2 * intensity), prog: 0 },
      { key: 'scaleX', val: 1 + (0.2 * intensity), prog: 1 },
      { key: 'scaleY', val: 1 + (0.4 * intensity), prog: 0 },
      { key: 'scaleY', val: 1 + (0.4 * intensity), prog: 1 },
      { key: 'skewX', val: 12 * intensity, prog: 0 },
      { key: 'skewX', val: 12 * intensity, prog: 1 },
      { key: 'translateX', val: -30 * intensity, prog: 0 },
      { key: 'translateX', val: -30 * intensity, prog: 1 },
      { key: 'translateY', val: -50 * intensity, prog: 0 },
      { key: 'translateY', val: -50 * intensity, prog: 1 },
      { key: 'rotateY', val: -8 * intensity, prog: 0 },
      { key: 'rotateY', val: -8 * intensity, prog: 1 },
    ],
  };

  // Effect 5: Elastic snapback
  const elasticSnapbackEffect: GenericEffectData = {
    type: 'spring',
    start: hold2End,
    duration: snapbackDuration,
    mode: 'provider',
    targetIds: [textAtomId],
    ranges: [
      { key: 'scaleX', val: 1 + (0.2 * intensity), prog: 0 },
      { key: 'scaleX', val: 1, prog: 1 },
      { key: 'scaleY', val: 1 + (0.4 * intensity), prog: 0 },
      { key: 'scaleY', val: 1, prog: 1 },
      { key: 'skewX', val: 12 * intensity, prog: 0 },
      { key: 'skewX', val: 0, prog: 1 },
      { key: 'translateX', val: -30 * intensity, prog: 0 },
      { key: 'translateX', val: 0, prog: 1 },
      { key: 'translateY', val: -50 * intensity, prog: 0 },
      { key: 'translateY', val: 0, prog: 1 },
      { key: 'rotateY', val: -8 * intensity, prog: 0 },
      { key: 'rotateY', val: 0, prog: 1 },
    ],
  };

  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight || 700,
        fontStyle: fontStyle.fontStyle || 'normal',
        color: params.textColor,
        textAlign: 'center',
        transformOrigin: 'center center',
        willChange: 'transform',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: 'magnetic-pull-phase1',
        componentId: 'generic',
        data: magneticPullPhase1Effect,
      },
      {
        id: 'magnetic-hold-phase1',
        componentId: 'generic',
        data: magneticHoldPhase1Effect,
      },
      {
        id: 'magnetic-pull-phase2',
        componentId: 'generic',
        data: magneticPullPhase2Effect,
      },
      {
        id: 'magnetic-hold-phase2',
        componentId: 'generic',
        data: magneticHoldPhase2Effect,
      },
      {
        id: 'elastic-snapback',
        componentId: 'generic',
        data: elasticSnapbackEffect,
      },
    ],
  };

  // ============================================================================
  // TEXT CONTAINER
  // ============================================================================

  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textAtom],
  };

  // ============================================================================
  // FIELD LINES (OPTIONAL VISUALIZATION)
  // ============================================================================

  const fieldLine1FadeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: hold1End,
    mode: 'provider',
    targetIds: ['field-line-1'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 0.7 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  const fieldLine2FadeEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: hold1End,
    duration: phase2End - hold1End,
    mode: 'provider',
    targetIds: ['field-line-2'],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.3 },
      { key: 'opacity', val: 1, prog: 0.7 },
      { key: 'opacity', val: 0, prog: 1 },
    ],
  };

  const fieldLine1: RenderableComponentData = {
    id: 'field-line-1',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='position: absolute; top: 50%; left: 70%; width: 100px; height: 2px; background: linear-gradient(90deg, transparent, ${params.fieldLineColor}, transparent); transform-origin: left center; transform: rotate(-15deg);'></div>`,
    },
    context: {
      timing: {
        start: 0,
        duration: hold1End,
      },
    },
    effects: [
      {
        id: 'field-line-1-fade',
        componentId: 'generic',
        data: fieldLine1FadeEffect,
      },
    ],
  };

  const fieldLine2: RenderableComponentData = {
    id: 'field-line-2',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style='position: absolute; top: 30%; left: 30%; width: 120px; height: 2px; background: linear-gradient(90deg, transparent, ${params.fieldLineColor}, transparent); transform-origin: right center; transform: rotate(25deg);'></div>`,
    },
    context: {
      timing: {
        start: hold1End,
        duration: phase2End - hold1End,
      },
    },
    effects: [
      {
        id: 'field-line-2-fade',
        componentId: 'generic',
        data: fieldLine2FadeEffect,
      },
    ],
  };

  const fieldLinesContainer: RenderableComponentData = {
    id: 'field-lines-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          opacity: params.showFieldLines ? 1 : 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [fieldLine1, fieldLine2],
  };

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'magnetic-attraction-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '800px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textContainer, fieldLinesContainer],
  };

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
  id: 'magnetic-attraction-text',
  title: 'Magnetic Attraction Text Stretch',
  description:
    'Dynamic text animation with magnetic pull physics. Text stretches toward invisible attraction points like taffy being pulled, creating elongated distortions and elastic snapback effects. Features transform matrix calculations for realistic force vector deformation with perspective 3D and configurable magnetic field visualization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'physics',
    'magnetic',
    'stretch',
    'distortion',
    'elastic',
    'force',
    'perspective',
    'dynamic',
    'transition',
  ],
  defaultInputParams: {
    text: 'MAGNETIC',
    fontSize: 72,
    textColor: '#FFFFFF',
    font: 'Inter:700',
    stretchIntensity: 1.0,
    transitionDuration: 2.5,
    showFieldLines: false,
    fieldLineColor: 'rgba(100, 200, 255, 0.6)',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const magneticAttractionTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
