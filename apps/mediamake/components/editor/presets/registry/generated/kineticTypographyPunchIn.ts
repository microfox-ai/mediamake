/**
 * Kinetic Typography Punch-In Preset
 *
 * This preset creates an aggressive punch-in kinetic typography effect with elastic bounce-back,
 * shockwave ripple, and screen shake - perfect for action movie title cards. The animation mimics
 * a fist hitting an elastic surface with immediate impact and reverberating oscillations.
 *
 * Features:
 * - **Explosive Punch-In**: Text scales from 0 to 1.3 with rotation from -180° to +10° in first impact
 * - **Elastic Bounce-Back**: Multiple diminishing oscillations through scale and rotation keyframes
 * - **Shockwave Effect**: Expanding circular ring synchronized with impact moment
 * - **Screen Shake**: Parent container micro-movements (translateX/Y) during impact phase
 * - **Customizable Text**: Dynamic text content, font, colors, and sizing
 * - **Adjustable Timing**: Configurable animation duration and impact intensity
 *
 * Technical Details:
 * - Main animation: scale (0→1.3→0.85→1.1→0.95→1.0) + rotate (-180→10→-5→2→0) over 1.5s
 * - Shockwave: HTMLBlockAtom with circular border, scale (0.8→3) + opacity (1→0) during impact
 * - Screen shake: translateX/Y micro-movements (-5px to 5px) from 20-40% of animation timeline
 * - Nested BaseLayout structure for proper effect isolation
 * - All effects use provider mode with explicit targetIds
 *
 * Use Cases:
 * - Action movie title cards
 * - Sports highlight intros
 * - Game victory screens
 * - High-energy social media content
 * - Explosive brand reveals
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z
    .string()
    .default('IMPACT')
    .describe('Text content to display with punch-in effect'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Inter:900", "Roboto:700:italic")',
    ),
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  backgroundColor: z
    .string()
    .optional()
    .describe('Background color for composition (optional)'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.5)
    .describe('Total animation duration in seconds'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Impact intensity multiplier (affects shake and bounce strength)'),
  shockwaveColor: z
    .string()
    .default('#ffffff')
    .describe('Color of the shockwave ring'),
  shockwaveBorderWidth: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Border width of shockwave ring in pixels'),
  enableScreenShake: z
    .boolean()
    .default(true)
    .describe('Enable/disable screen shake effect during impact'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font configuration
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 900; // Default to black weight
  }

  const {
    text,
    fontSize,
    textColor,
    backgroundColor,
    duration,
    intensity,
    shockwaveColor,
    shockwaveBorderWidth,
    enableScreenShake,
  } = params;

  // Component IDs
  const outerContainerId = 'kinetic-punch-outer-container';
  const shakeContainerId = 'kinetic-punch-shake-container';
  const animationContainerId = 'kinetic-punch-animation-container';
  const shockwaveId = 'kinetic-punch-shockwave';
  const mainTextId = 'kinetic-punch-main-text';

  // Timing calculations
  const impactTime = duration * 0.2; // Impact happens at 20% (0.3s for default 1.5s)
  const shakeDuration = duration * 0.2; // Shake lasts 20% of total duration (0.3s)

  // Keyframe progress points (normalized 0-1 within duration)
  const keyframes = {
    initial: 0,
    impact: 0.27, // Peak overshoot at 27%
    bounce1: 0.47, // First bounce at 47%
    bounce2: 0.67, // Second bounce at 67%
    settle1: 0.8, // Near settle at 80%
    final: 1.0, // Final settle at 100%
  };

  // Scale keyframes (with intensity multiplier)
  const scaleMax = 1 + 0.3 * intensity;
  const scaleMin = 1 - 0.15 * intensity;

  // Rotation keyframes (with intensity multiplier)
  const rotateMax = 10 * intensity;
  const rotateMin = -5 * intensity;

  // Screen shake values (with intensity multiplier)
  const shakeXValues = [0, -5, 3, -2, 1, 0].map(v =&gt; v * intensity);
  const shakeYValues = [0, 4, -3, 2, -1, 0].map(v =&gt; v * intensity);

  // Create shockwave HTML block
  const shockwave: RenderableComponentData = {
    id: shockwaveId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 200px; height: 200px; border-radius: 50%; border: ${shockwaveBorderWidth}px solid ${shockwaveColor};"></div>`,
      className: 'absolute',
      style: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: impactTime,
        duration: shakeDuration * 2.67, // Shockwave lasts longer (0.8s)
      },
    },
    effects: [
      {
        id: 'shockwave-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: shakeDuration * 2.67,
          mode: 'provider',
          targetIds: [shockwaveId],
          ranges: [
            { key: 'scale', val: 0.8, prog: 0 },
            { key: 'scale', val: 3, prog: 1 },
          ],
        },
      },
      {
        id: 'shockwave-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: shakeDuration * 2.67,
          mode: 'provider',
          targetIds: [shockwaveId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create main text atom
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: fontStyle.fontWeight || 900,
        fontStyle: fontStyle.fontStyle || 'normal',
        color: textColor,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        textShadow: '0 0 20px rgba(255,255,255,0.5)',
      },
      font: {
        family: fontFamily,
        weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
        display: 'swap',
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
        id: 'text-scale-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [mainTextId],
          ranges: [
            { key: 'scale', val: 0, prog: keyframes.initial },
            { key: 'scale', val: scaleMax, prog: keyframes.impact },
            { key: 'scale', val: scaleMin, prog: keyframes.bounce1 },
            { key: 'scale', val: 1 + 0.1 * intensity, prog: keyframes.bounce2 },
            { key: 'scale', val: 1 - 0.05 * intensity, prog: keyframes.settle1 },
            { key: 'scale', val: 1, prog: keyframes.final },
          ],
        },
      },
      {
        id: 'text-rotation-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [mainTextId],
          ranges: [
            { key: 'rotate', val: -180, prog: keyframes.initial },
            { key: 'rotate', val: rotateMax, prog: keyframes.impact },
            { key: 'rotate', val: rotateMin, prog: keyframes.bounce1 },
            { key: 'rotate', val: 2 * intensity, prog: keyframes.bounce2 },
            { key: 'rotate', val: 0, prog: keyframes.final },
          ],
        },
      },
      {
        id: 'text-opacity-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration * 0.27, // Fade in during first 27%
          mode: 'provider',
          targetIds: [mainTextId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // Create animation container (holds shockwave and text)
  const animationContainer: RenderableComponentData = {
    id: animationContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [shockwave, mainText],
  };

  // Create shake container with screen shake effects (if enabled)
  const shakeContainerEffects = enableScreenShake
    ? [
        {
          id: 'screen-shake-x-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: impactTime,
            duration: shakeDuration,
            mode: 'provider',
            targetIds: [shakeContainerId],
            ranges: [
              { key: 'translateX', val: shakeXValues[0], prog: 0 },
              { key: 'translateX', val: shakeXValues[1], prog: 0.2 },
              { key: 'translateX', val: shakeXValues[2], prog: 0.4 },
              { key: 'translateX', val: shakeXValues[3], prog: 0.6 },
              { key: 'translateX', val: shakeXValues[4], prog: 0.8 },
              { key: 'translateX', val: shakeXValues[5], prog: 1 },
            ],
          },
        },
        {
          id: 'screen-shake-y-effect',
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: impactTime,
            duration: shakeDuration,
            mode: 'provider',
            targetIds: [shakeContainerId],
            ranges: [
              { key: 'translateY', val: shakeYValues[0], prog: 0 },
              { key: 'translateY', val: shakeYValues[1], prog: 0.2 },
              { key: 'translateY', val: shakeYValues[2], prog: 0.4 },
              { key: 'translateY', val: shakeYValues[3], prog: 0.6 },
              { key: 'translateY', val: shakeYValues[4], prog: 0.8 },
              { key: 'translateY', val: shakeYValues[5], prog: 1 },
            ],
          },
        },
      ]
    : [];

  const shakeContainer: RenderableComponentData = {
    id: shakeContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: shakeContainerEffects,
    childrenData: [animationContainer],
  };

  // Create outer container (root)
  const outerContainer: RenderableComponentData = {
    id: outerContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex items-center justify-center min-h-screen',
        style: backgroundColor ? { backgroundColor } : {},
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [shakeContainer],
  };

  return {
    output: {
      childrenData: [outerContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'kineticTypographyPunchIn',
  title: 'Kinetic Typography Punch-In',
  description:
    'Aggressive punch-in kinetic typography with elastic bounce-back, shockwave effect, and screen shake. Text explosively scales and rotates from zero with multiple diminishing oscillations, creating an action movie title card effect with impact reverberations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'punch-in',
    'action',
    'impact',
    'bounce',
    'elastic',
    'shockwave',
    'screen-shake',
    'title-card',
    'aggressive',
    'explosive',
    'high-energy',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'IMPACT',
    font: 'Inter:900',
    fontSize: 96,
    textColor: '#ffffff',
    duration: 1.5,
    intensity: 1,
    shockwaveColor: '#ffffff',
    shockwaveBorderWidth: 4,
    enableScreenShake: true,
  },
};

// --- Export Preset ---
export const kineticTypographyPunchInPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
