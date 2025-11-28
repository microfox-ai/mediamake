/**
 * Cinematic 3D Text Rotation Preset
 *
 * Professional cinematic 3D text rotation preset that mimics film trailer title sequences.
 * Features dramatic Y-axis rotation from 90° edge-on to face-forward, with depth-of-field blur,
 * intensifying glow, and a subtle scale pulse for emphasis.
 *
 * Features:
 * - **Dramatic 3D Rotation**: Y-axis rotation from 90° to 0° (edge-on to face-forward)
 * - **Depth-of-Field Effect**: Blur animates from 10px to 0px for coming-into-focus feeling
 * - **Intensifying Glow**: Text shadow grows from 0px to 20px spread as text rotates
 * - **Two-Stage Animation**: Rotation (0-70% duration), then scale pulse (70-100%)
 * - **Scale Pulse**: Subtle scale from 1 → 1.05 → 1 for arrival emphasis
 * - **Opacity Fade**: Smooth fade from 0.3 to 1 during rotation
 * - **GPU Optimization**: Uses will-change: transform for performance
 * - **3D Perspective**: Container with perspective: 1000px and preserve-3d
 *
 * Use cases:
 * - Film trailer title sequences
 * - Professional video intros
 * - Monument-style dramatic reveals
 * - Cinematic text presentations
 * - High-impact title cards
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  text: z.string().describe('Text content to display'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total animation duration in seconds'),
  fontSize: z
    .string()
    .optional()
    .default('72px')
    .describe('Font size (e.g., "72px", "96px")'),
  fontWeight: z
    .string()
    .optional()
    .default('bold')
    .describe('Font weight (e.g., "bold", "900")'),
  fontFamily: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family name (e.g., "Inter", "Montserrat")'),
  color: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  glowColor: z
    .string()
    .optional()
    .default('rgba(255, 255, 255, 0.8)')
    .describe('Glow effect color (rgba recommended for transparency)'),
  rotationDuration: z
    .number()
    .min(0.1)
    .max(1)
    .default(0.7)
    .optional()
    .describe('Rotation phase duration as fraction of total (0.7 = 70%)'),
  initialBlur: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .optional()
    .describe('Initial blur amount in pixels (depth-of-field effect)'),
  pulseScale: z
    .number()
    .min(1)
    .max(1.2)
    .default(1.05)
    .optional()
    .describe('Maximum scale during pulse phase (1.05 = 5% larger)'),
  initialOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Initial opacity value (0 = transparent, 1 = opaque)'),
  glowSpread: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .optional()
    .describe('Maximum glow spread in pixels'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize = '72px',
    fontWeight = 'bold',
    fontFamily = 'Inter',
    color = '#ffffff',
    glowColor = 'rgba(255, 255, 255, 0.8)',
    rotationDuration = 0.7,
    initialBlur = 10,
    pulseScale = 1.05,
    initialOpacity = 0.3,
    glowSpread = 20,
  } = params;

  // Calculate phase durations
  const rotationPhaseDuration = duration * rotationDuration;
  const pulsePhaseDuration = duration * (1 - rotationDuration);

  // Component IDs
  const containerId = 'cinematic-3d-rotation-container';
  const textId = 'cinematic-3d-rotation-text';

  // --- Effects ---

  // 1. Rotation Effect (0 to rotationPhaseDuration)
  const rotationEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: rotationPhaseDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'rotateY', val: 90, prog: 0 },
      { key: 'rotateY', val: 0, prog: 1 },
    ],
  };

  // 2. Opacity Fade Effect (0 to rotationPhaseDuration)
  const opacityEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: rotationPhaseDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'opacity', val: initialOpacity, prog: 0 },
      { key: 'opacity', val: 1, prog: 1 },
    ],
  };

  // 3. Blur Depth Effect (0 to rotationPhaseDuration)
  const blurEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: rotationPhaseDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'blur', val: initialBlur, prog: 0 },
      { key: 'blur', val: 0, prog: 1 },
    ],
  };

  // 4. Scale Pulse Effect (rotationPhaseDuration to duration)
  const scalePulseEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: rotationPhaseDuration,
    duration: pulsePhaseDuration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: pulseScale, prog: 0.5 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // 5. Glow Intensify Effect (0 to duration)
  const glowEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      { key: 'textShadow', val: '0 0 0px rgba(255, 255, 255, 0)', prog: 0 },
      {
        key: 'textShadow',
        val: `0 0 ${glowSpread}px ${glowColor}, 0 0 ${glowSpread * 2}px ${glowColor}`,
        prog: 1,
      },
    ],
  };

  // --- Text Atom ---
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: text,
      style: {
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
        textAlign: 'center',
        willChange: 'transform, filter, opacity',
      },
      font: {
        family: fontFamily,
        weights: ['700', '900'],
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
        id: 'rotation-effect',
        componentId: 'generic',
        data: rotationEffect,
      },
      {
        id: 'opacity-fade-effect',
        componentId: 'generic',
        data: opacityEffect,
      },
      {
        id: 'blur-depth-effect',
        componentId: 'generic',
        data: blurEffect,
      },
      {
        id: 'scale-pulse-effect',
        componentId: 'generic',
        data: scalePulseEffect,
      },
      {
        id: 'glow-intensify-effect',
        componentId: 'generic',
        data: glowEffect,
      },
    ],
  };

  // --- Root Container ---
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textAtom] as RenderableComponentData[],
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'cinematic-3d-text-rotation',
  title: 'Cinematic 3D Text Rotation',
  description:
    'Professional cinematic 3D text rotation preset that mimics film trailer title sequences. Features dramatic Y-axis rotation from 90° edge-on to face-forward, with depth-of-field blur, intensifying glow, and a subtle scale pulse for emphasis. Two-stage animation: rotation (0-70% duration), then scale-up pulse (70-100%).',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    '3d',
    'rotation',
    'dramatic',
    'title-sequence',
    'film',
    'trailer',
    'glow',
    'depth-of-field',
    'blur',
    'pulse',
    'professional',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'CINEMATIC TITLE',
    duration: 5,
    fontSize: '72px',
    fontWeight: 'bold',
    fontFamily: 'Inter',
    color: '#ffffff',
    glowColor: 'rgba(255, 255, 255, 0.8)',
    rotationDuration: 0.7,
    initialBlur: 10,
    pulseScale: 1.05,
    initialOpacity: 0.3,
    glowSpread: 20,
  },
};

// --- Export Preset ---
export const cinematic3dTextRotationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
