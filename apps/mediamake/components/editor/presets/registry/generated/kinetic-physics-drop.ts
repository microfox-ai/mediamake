/**
 * Kinetic Physics Drop Typography Preset
 *
 * This preset creates physics-based kinetic typography that treats text as a physical object
 * with mass and momentum. Words drop from above with realistic bounce, overshoot, rotation
 * wobble, and impact shadow effects mimicking Newton physics plugins used in motion design.
 *
 * Features:
 * - **Physics-Based Motion**: Text drops with realistic gravity, mass, and momentum
 * - **Overshoot & Bounce**: Word overshoots final position then settles with decay
 * - **Rotation Wobble**: Coin-like rotation settling effect
 * - **Impact Shadow**: Dynamic shadow that expands on impact then contracts
 * - **Vertical Compression**: Squash and stretch at impact moment
 * - **GPU-Accelerated**: Uses transform-gpu and will-change for smooth 60fps animation
 * - **Customizable Impact**: Configurable intensity, timing, and physics parameters
 *
 * Use cases:
 * - Title cards with impactful entrance
 * - Beat-synced text drops
 * - Dynamic typography for music videos
 * - Sports/action content title sequences
 * - Social media hook intros
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('IMPACT')
    .describe('Text content to display with physics drop animation'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:900", "BebasNeue:700")'),
  
  fontSize: z
    .number()
    .min(24)
    .max(300)
    .default(96)
    .optional()
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  
  dropHeight: z
    .number()
    .min(50)
    .max(200)
    .default(100)
    .optional()
    .describe('Initial drop height (percentage of viewport height)'),
  
  overshootAmount: z
    .number()
    .min(0)
    .max(20)
    .default(10)
    .optional()
    .describe('Overshoot distance in percentage of final position'),
  
  bounceDuration: z
    .number()
    .min(0.2)
    .max(1.5)
    .default(0.4)
    .optional()
    .describe('Total duration of drop and bounce animation in seconds'),
  
  rotationIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .optional()
    .describe('Maximum rotation angle during wobble in degrees'),
  
  shadowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Maximum shadow opacity on impact (0-1)'),
  
  compressionAmount: z
    .number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .optional()
    .describe('Vertical compression amount (0-0.2, where 0.05 = 5% squash)'),
  
  startTime: z
    .number()
    .min(0)
    .default(0)
    .optional()
    .describe('Start time of the animation in seconds'),
  
  displayDuration: z
    .number()
    .min(0.5)
    .default(5)
    .optional()
    .describe('Total duration text stays visible (includes animation)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style
  const fontStyle: React.CSSProperties = {};
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

  const fontSize = params.fontSize ?? 96;
  const textColor = params.textColor ?? '#FFFFFF';
  const dropHeight = params.dropHeight ?? 100;
  const overshootAmount = params.overshootAmount ?? 10;
  const bounceDuration = params.bounceDuration ?? 0.4;
  const rotationIntensity = params.rotationIntensity ?? 3;
  const shadowIntensity = params.shadowIntensity ?? 0.5;
  const compressionAmount = params.compressionAmount ?? 0.05;
  const startTime = params.startTime ?? 0;
  const displayDuration = params.displayDuration ?? 5;

  // IDs
  const containerId = 'kinetic-physics-container';
  const shadowId = 'impact-shadow';
  const textContainerId = 'text-container';
  const textAtomId = 'kinetic-text';

  // Calculate animation keyframe positions
  const overshootPos = overshootAmount; // % overshoot beyond center
  const finalPos = 0; // Final resting position

  // Create drop and bounce effect (translateY animation)
  const dropEffect = {
    id: 'physics-drop-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: bounceDuration,
      mode: 'provider' as const,
      targetIds: [textContainerId],
      ranges: [
        // Drop from above with overshoot and bounce
        { key: 'translateY', val: `-${dropHeight}vh`, prog: 0 },
        { key: 'translateY', val: `${overshootPos}%`, prog: 0.5 },
        { key: 'translateY', val: `${finalPos}%`, prog: 1 },
      ],
    },
  };

  // Create rotation wobble effect
  const wobbleEffect = {
    id: 'rotation-wobble-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: bounceDuration,
      mode: 'provider' as const,
      targetIds: [textContainerId],
      ranges: [
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: -rotationIntensity, prog: 0.3 },
        { key: 'rotate', val: rotationIntensity * 0.66, prog: 0.6 },
        { key: 'rotate', val: -rotationIntensity * 0.33, prog: 0.8 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    },
  };

  // Create vertical compression effect (squash and stretch)
  const compressionEffect = {
    id: 'compression-effect',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: bounceDuration,
      mode: 'provider' as const,
      targetIds: [textContainerId],
      ranges: [
        { key: 'scaleY', val: 1, prog: 0 },
        { key: 'scaleY', val: 1 - compressionAmount, prog: 0.5 }, // Squash on impact
        { key: 'scaleY', val: 1 + compressionAmount * 0.4, prog: 0.7 }, // Slight stretch
        { key: 'scaleY', val: 1, prog: 1 },
      ],
    },
  };

  // Create shadow expansion/contraction effect
  const shadowEffect = {
    id: 'shadow-expansion-effect',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration: bounceDuration,
      mode: 'provider' as const,
      targetIds: [shadowId],
      ranges: [
        // Shadow scaleX
        { key: 'scaleX', val: 0.5, prog: 0 },
        { key: 'scaleX', val: 1.5, prog: 0.5 },
        { key: 'scaleX', val: 1, prog: 1 },
        // Shadow opacity
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: shadowIntensity, prog: 0.5 },
        { key: 'opacity', val: shadowIntensity * 0.6, prog: 1 },
      ],
    },
  };

  // Build shadow component
  const shadowComponent: RenderableComponentData = {
    id: shadowId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute -bottom-2 left-1/2 -translate-x-1/2 h-4 w-32 bg-black/20 blur-xl rounded-full',
        style: {
          willChange: 'transform, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: displayDuration,
      },
    },
    effects: [shadowEffect],
    childrenData: [],
  };

  // Build text atom
  const textAtomComponent: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'font-black',
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        ...fontStyle,
        willChange: 'transform',
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
        duration: displayDuration,
      },
    },
    effects: [],
    childrenData: [],
  };

  // Build text container (wrapper for physics effects)
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
        style: {
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
    effects: [dropEffect, wobbleEffect, compressionEffect],
    childrenData: [textAtomComponent],
  };

  // Build root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: startTime,
        duration: displayDuration,
      },
    },
    effects: [],
    childrenData: [shadowComponent, textContainer],
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
  id: 'kinetic-physics-drop',
  title: 'Kinetic Physics Drop Typography',
  description:
    'Physics-based kinetic typography that treats text as a physical object with mass and momentum. Words drop from above with realistic bounce, overshoot, rotation wobble, and impact shadow effects mimicking Newton physics plugins.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'physics',
    'drop',
    'bounce',
    'impact',
    'motion-design',
    'newton',
    'gravity',
    'momentum',
    'title',
    'text',
    'dynamic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'IMPACT',
    font: 'Inter:900',
    fontSize: 96,
    textColor: '#FFFFFF',
    dropHeight: 100,
    overshootAmount: 10,
    bounceDuration: 0.4,
    rotationIntensity: 3,
    shadowIntensity: 0.5,
    compressionAmount: 0.05,
    startTime: 0,
    displayDuration: 5,
  },
};

// Export preset
export const kineticPhysicsDropPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
