/**
 * Time-Lapse Decay Text Effect Preset
 *
 * This preset creates a dramatic three-phase text decay animation simulating centuries 
 * of aging in seconds. Perfect for historical content, time-passage transitions, and 
 * dramatic deterioration effects.
 *
 * Features:
 * - **Three-Phase Animation**: Aging → Crumbling → Collapse
 * - **Non-Linear Timing**: Maintains size while aging, then sudden irregular collapse
 * - **Organic Turbulence**: Non-uniform shrinking with subtle shake and rotation
 * - **Color Transitions**: Original → Sepia/Brown → Gray
 * - **Filter Effects**: Sepia, grayscale, brightness, and blur transitions
 * - **Multiple Text Shadows**: Layered shadows fading at different rates for depth
 *
 * Phase 1 (0-40%): Aging phase - opacity drops, sepia increases, no size change
 * Phase 2 (40-70%): Crumbling phase - scale reduces irregularly, grayscale begins
 * Phase 3 (70-100%): Collapse phase - rapid scale to zero, full disintegration
 *
 * Use cases:
 * - Historical documentary transitions
 * - Time-passage effects
 * - Ancient text reveals
 * - Deterioration storytelling
 * - Epic title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('The text content to display and decay'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the decay animation in seconds'),
  fontSize: z
    .number()
    .default(72)
    .describe('Font size in pixels for the text'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight (e.g., "400", "700", "bold")'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family name (Google Font or system font)'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Original text color before decay (hex or rgba)'),
  position: z
    .object({
      horizontal: z
        .enum(['left', 'center', 'right'])
        .default('center')
        .describe('Horizontal text alignment'),
      vertical: z
        .enum(['top', 'center', 'bottom'])
        .default('center')
        .describe('Vertical text alignment'),
    })
    .default({ horizontal: 'center', vertical: 'center' })
    .describe('Text positioning on screen'),
  agingPhasePercentage: z
    .number()
    .min(0)
    .max(100)
    .default(40)
    .describe('Percentage of total duration for aging phase (0-100)'),
  crumblingPhasePercentage: z
    .number()
    .min(0)
    .max(100)
    .default(30)
    .describe('Percentage of total duration for crumbling phase (0-100)'),
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Intensity multiplier for turbulence/shake effects (0-5)'),
  sepiaIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Maximum sepia intensity during aging (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontWeight,
    fontFamily,
    textColor,
    position,
    agingPhasePercentage,
    crumblingPhasePercentage,
    turbulenceIntensity,
    sepiaIntensity,
  } = params;

  // Calculate phase durations (in seconds)
  const agingDuration = (duration * agingPhasePercentage) / 100;
  const crumblingDuration = (duration * crumblingPhasePercentage) / 100;
  const collapseDuration = duration - agingDuration - crumblingDuration;

  // Calculate phase start times (relative to container)
  const crumblingStart = agingDuration;
  const collapseStart = agingDuration + crumblingDuration;

  // Position classes
  const horizontalClass =
    position.horizontal === 'left'
      ? 'justify-start'
      : position.horizontal === 'right'
        ? 'justify-end'
        : 'justify-center';
  const verticalClass =
    position.vertical === 'top'
      ? 'items-start'
      : position.vertical === 'bottom'
        ? 'items-end'
        : 'items-center';

  // Text atom ID for targeting effects
  const textId = 'decay-text-atom';

  // Create text atom with layered shadows for depth
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: textColor,
        textAlign: 'center',
        textShadow: `
          0 2px 4px rgba(0,0,0,0.3),
          0 4px 8px rgba(0,0,0,0.2),
          0 8px 16px rgba(0,0,0,0.1)
        `,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
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

  // Phase 1: Aging Effect (0-40%)
  // Opacity 1→0.7, Sepia 0→100%, Brightness 1→0.85, no size change
  if (agingDuration > 0) {
    textAtom.effects!.push({
      id: 'aging-phase-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: agingDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 1 },
          {
            key: 'filter',
            val: 'sepia(0) brightness(1)',
            prog: 0,
          },
          {
            key: 'filter',
            val: `sepia(${sepiaIntensity}) brightness(0.85)`,
            prog: 1,
          },
        ],
      },
    });
  }

  // Phase 2: Crumbling Effect (40-70%)
  // Opacity 0.7→0.4, Scale 1→0.6, Sepia→Grayscale transition, blur begins
  if (crumblingDuration > 0) {
    textAtom.effects!.push({
      id: 'crumbling-phase-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: crumblingStart,
        duration: crumblingDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 0.7, prog: 0 },
          { key: 'opacity', val: 0.4, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.6, prog: 1 },
          {
            key: 'filter',
            val: `sepia(${sepiaIntensity}) grayscale(0) brightness(0.85) blur(0px)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `sepia(${sepiaIntensity * 0.5}) grayscale(0.7) brightness(0.7) blur(2px)`,
            prog: 1,
          },
        ],
      },
    });
  }

  // Phase 3: Collapse Effect (70-100%)
  // Opacity 0.4→0, Scale 0.6→0 (rapid), Full grayscale, heavy blur, slight downward drift
  if (collapseDuration > 0) {
    textAtom.effects!.push({
      id: 'collapse-phase-effect',
      componentId: 'generic',
      data: {
        type: 'ease-in',
        start: collapseStart,
        duration: collapseDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 0.4, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'scale', val: 0.6, prog: 0 },
          { key: 'scale', val: 0, prog: 0.8 },
          { key: 'scale', val: 0, prog: 1 },
          {
            key: 'filter',
            val: `sepia(0) grayscale(0.7) brightness(0.7) blur(2px)`,
            prog: 0,
          },
          {
            key: 'filter',
            val: `sepia(0) grayscale(1) brightness(0.5) blur(8px)`,
            prog: 1,
          },
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: 20, prog: 1 },
        ],
      },
    });
  }

  // Turbulence/Shake Effect (40-100%, during crumbling and collapse)
  // Subtle irregular horizontal translation and rotation for organic feel
  const turbulenceStart = crumblingStart;
  const turbulenceDuration = crumblingDuration + collapseDuration;

  if (turbulenceDuration > 0 && turbulenceIntensity > 0) {
    const xIntensity = 3 * turbulenceIntensity;
    const rotIntensity = 2 * turbulenceIntensity;

    textAtom.effects!.push({
      id: 'turbulence-shake-effect',
      componentId: 'generic',
      data: {
        type: 'linear',
        start: turbulenceStart,
        duration: turbulenceDuration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: xIntensity * 0.7, prog: 0.1 },
          { key: 'translateX', val: -xIntensity * 0.7, prog: 0.2 },
          { key: 'translateX', val: xIntensity * 0.3, prog: 0.3 },
          { key: 'translateX', val: -xIntensity, prog: 0.5 },
          { key: 'translateX', val: xIntensity, prog: 0.7 },
          { key: 'translateX', val: -xIntensity * 0.3, prog: 0.85 },
          { key: 'translateX', val: 0, prog: 1 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: -rotIntensity * 0.5, prog: 0.25 },
          { key: 'rotate', val: rotIntensity * 0.5, prog: 0.5 },
          { key: 'rotate', val: -rotIntensity, prog: 0.75 },
          { key: 'rotate', val: 0, prog: 1 },
        ],
      },
    });
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'time-lapse-decay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 flex ${horizontalClass} ${verticalClass}`,
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom],
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

const presetMetadata: PresetMetadata = {
  id: 'time-lapse-decay-text',
  title: 'Time-Lapse Decay Text Effect',
  description:
    'A three-phase text decay animation that simulates centuries passing in seconds. Text ages from original color to sepia/brown, then crumbles away with organic turbulence patterns. Features non-linear timing with initial aging phase (maintaining size while opacity drops), irregular collapse phase (parts breaking off), and final rapid disintegration. Perfect for historical content, time-passage transitions, and dramatic deterioration effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'effect',
    'decay',
    'aging',
    'crumbling',
    'historical',
    'time-lapse',
    'deterioration',
    'sepia',
    'grayscale',
    'turbulence',
    'organic',
    'dramatic',
    'transition',
  ],
  defaultInputParams: {
    text: 'ANCIENT TEXT',
    duration: 5,
    fontSize: 72,
    fontWeight: '700',
    fontFamily: 'Inter',
    textColor: '#ffffff',
    position: {
      horizontal: 'center',
      vertical: 'center',
    },
    agingPhasePercentage: 40,
    crumblingPhasePercentage: 30,
    turbulenceIntensity: 1,
    sepiaIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const timeLapseDecayTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
