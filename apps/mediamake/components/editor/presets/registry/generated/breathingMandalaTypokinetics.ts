/**
 * Breathing Mandala Typokinetics Preset
 *
 * Creates a meditative typokinetics effect with text that scales in circular,
 * meditative patterns. Features:
 * - Multi-layered text breathing with golden ratio timing (1.618:1 inhale/exhale)
 * - Spiral rotation for each layer at different speeds
 * - Depth through multiple layers at different scales and opacities (1.0, 0.7, 0.4)
 * - Color shifts cycling through calming gradients using hue rotation
 * - Caption words arranged in circular polar coordinate patterns
 * - Circular caption breathing from center outward
 *
 * Golden ratio timing: 4.236s total cycle (2.618s expand, 1.618s contract)
 * where expand phase is at progress 0-0.618 and contract is 0.618-1.0.
 *
 * Use cases:
 * - Centered titles that expand like ripples on water
 * - Meditative video content with spiritual themes
 * - Wellness and mindfulness videos
 * - Ambient visual experiences with text
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  RenderableComponentData,
  TextAtomData,
  GenericEffectData,
} from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  titleText: z.string().default('BREATHE').describe('Main title text to display in breathing mandala'),
  
  captionText: z.string().optional().describe('Optional caption text to arrange in circular pattern around title'),
  
  font: z.string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Montserrat:600")'),
  
  duration: z.number()
    .default(20)
    .describe('Total duration of the preset in seconds'),
  
  // Color scheme
  colorScheme: z.enum(['purple', 'blue', 'green', 'warm', 'cool'])
    .default('purple')
    .describe('Color scheme for the mandala layers and captions'),
  
  // Golden ratio timing control
  breathingSpeed: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for breathing cycle (1 = default golden ratio timing)'),
  
  rotationSpeed: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Speed multiplier for rotation effects (1 = default speed)'),
  
  // Circular caption settings
  circularRadius: z.number()
    .min(100)
    .max(500)
    .default(300)
    .describe('Radius of circular caption arrangement in pixels'),
  
  showCircularCaptions: z.boolean()
    .default(true)
    .describe('Whether to show caption words in circular arrangement'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font
  const fontString = params.font || 'Inter:700';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? parseInt(fontParts[1], 10) : 700;

  // Golden ratio timing: 4.236s total (2.618s expand at 0-0.618 progress, 1.618s contract at 0.618-1.0)
  const baseBreathingDuration = 4.236 / params.breathingSpeed;
  const goldenRatioProgress = 0.618;

  // Rotation durations for spiral effect
  const baseRotationDuration = 20 / params.rotationSpeed;
  
  // Color scheme definitions
  const colorSchemes = {
    purple: {
      back: '#6366f1',
      middle: '#8b5cf6',
      front: '#c4b5fd',
      caption: '#a78bfa',
    },
    blue: {
      back: '#3b82f6',
      middle: '#60a5fa',
      front: '#93c5fd',
      caption: '#7dd3fc',
    },
    green: {
      back: '#10b981',
      middle: '#34d399',
      front: '#6ee7b7',
      caption: '#5eead4',
    },
    warm: {
      back: '#f59e0b',
      middle: '#fbbf24',
      front: '#fde047',
      caption: '#fcd34d',
    },
    cool: {
      back: '#06b6d4',
      middle: '#22d3ee',
      front: '#67e8f9',
      caption: '#a5f3fc',
    },
  };

  const colors = colorSchemes[params.colorScheme];

  // Process caption text into words
  const captionWords = params.captionText && params.showCircularCaptions
    ? params.captionText.split(' ').filter(w => w.length > 0)
    : [];

  // Calculate circular positions for caption words using polar coordinates
  const circularPositions = captionWords.map((word, index) => {
    const angleStep = (2 * Math.PI) / Math.max(captionWords.length, 1);
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const radius = params.circularRadius;
    
    // Convert polar to cartesian, centered in viewport
    const centerX = (props.config?.width ?? 1920) / 2;
    const centerY = (props.config?.height ?? 1080) / 2;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    
    return {
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -50%)', // Center the text on the calculated position
    };
  });

  // Create breathing layers (back, middle, front)
  const backLayerText: RenderableComponentData = {
    id: 'back-layer-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.titleText,
      style: {
        fontSize: '120px',
        fontWeight: fontWeight.toString(),
        color: colors.back,
        textAlign: 'center',
        transformOrigin: 'center center',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  const middleLayerText: RenderableComponentData = {
    id: 'middle-layer-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.titleText,
      style: {
        fontSize: '96px',
        fontWeight: fontWeight.toString(),
        color: colors.middle,
        textAlign: 'center',
        transformOrigin: 'center center',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  const frontLayerText: RenderableComponentData = {
    id: 'front-layer-text',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.titleText,
      style: {
        fontSize: '72px',
        fontWeight: fontWeight.toString(),
        color: colors.front,
        textAlign: 'center',
        transformOrigin: 'center center',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight.toString()],
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Create layer containers with opacity
  const backLayer: RenderableComponentData = {
    id: 'back-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex items-center justify-center',
        style: {
          opacity: 0.4,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [backLayerText],
  };

  const middleLayer: RenderableComponentData = {
    id: 'middle-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex items-center justify-center',
        style: {
          opacity: 0.7,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [middleLayerText],
  };

  const frontLayer: RenderableComponentData = {
    id: 'front-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex items-center justify-center',
        style: {
          opacity: 1.0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [frontLayerText],
  };

  // Breathing layers container
  const breathingLayersContainer: RenderableComponentData = {
    id: 'breathing-layers-container',
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
        duration: params.duration,
      },
    },
    childrenData: [backLayer, middleLayer, frontLayer],
  };

  // Create caption word components
  const captionWordComponents: RenderableComponentData[] = captionWords.map((word, index) => {
    const wordId = `caption-word-${index}`;
    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          position: 'absolute',
          fontSize: '24px',
          fontWeight: '500',
          color: colors.caption,
          transformOrigin: 'center center',
          ...circularPositions[index],
        },
        font: {
          family: fontFamily,
          weights: ['500'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
    };
  });

  // Circular captions container
  const circularCaptionsContainer: RenderableComponentData = {
    id: 'circular-captions-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: captionWordComponents,
  };

  // Create effects for breathing (scale animation with golden ratio timing)
  const breathingEffectBack: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: baseBreathingDuration,
    loop: true,
    mode: 'provider',
    targetIds: ['back-layer-text'],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.4, prog: goldenRatioProgress }, // Expand at golden ratio point
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const breathingEffectMiddle: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.3,
    duration: baseBreathingDuration,
    loop: true,
    mode: 'provider',
    targetIds: ['middle-layer-text'],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.3, prog: goldenRatioProgress },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const breathingEffectFront: GenericEffectData = {
    type: 'ease-in-out',
    start: 0.6,
    duration: baseBreathingDuration,
    loop: true,
    mode: 'provider',
    targetIds: ['front-layer-text'],
    ranges: [
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.2, prog: goldenRatioProgress },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  // Create rotation effects for spiral movement
  const rotationEffectBack: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: baseRotationDuration,
    loop: true,
    mode: 'provider',
    targetIds: ['back-layer-text'],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: 360, prog: 1 },
    ],
  };

  const rotationEffectMiddle: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: baseRotationDuration * 1.25,
    loop: true,
    mode: 'provider',
    targetIds: ['middle-layer-text'],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: -360, prog: 1 },
    ],
  };

  const rotationEffectFront: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: baseRotationDuration * 1.5,
    loop: true,
    mode: 'provider',
    targetIds: ['front-layer-text'],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: 360, prog: 1 },
    ],
  };

  // Create color shift effects (hue rotation through gradient stops)
  const colorShiftDuration = baseBreathingDuration * 2; // Slower color shifts
  
  const colorShiftBack: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: colorShiftDuration,
    loop: true,
    mode: 'provider',
    targetIds: ['back-layer-text'],
    ranges: [
      { key: 'hueRotate', val: 0, prog: 0 },
      { key: 'hueRotate', val: 60, prog: 0.333 },
      { key: 'hueRotate', val: 120, prog: 0.666 },
      { key: 'hueRotate', val: 0, prog: 1 },
    ],
  };

  const colorShiftMiddle: GenericEffectData = {
    type: 'ease-in-out',
    start: 1,
    duration: colorShiftDuration,
    loop: true,
    mode: 'provider',
    targetIds: ['middle-layer-text'],
    ranges: [
      { key: 'hueRotate', val: 30, prog: 0 },
      { key: 'hueRotate', val: 90, prog: 0.333 },
      { key: 'hueRotate', val: 150, prog: 0.666 },
      { key: 'hueRotate', val: 30, prog: 1 },
    ],
  };

  const colorShiftFront: GenericEffectData = {
    type: 'ease-in-out',
    start: 2,
    duration: colorShiftDuration,
    loop: true,
    mode: 'provider',
    targetIds: ['front-layer-text'],
    ranges: [
      { key: 'hueRotate', val: 60, prog: 0 },
      { key: 'hueRotate', val: 120, prog: 0.333 },
      { key: 'hueRotate', val: 180, prog: 0.666 },
      { key: 'hueRotate', val: 60, prog: 1 },
    ],
  };

  // Caption breathing effect
  const captionWordIds = captionWordComponents.map(c => c.id);
  const captionBreathingEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: baseBreathingDuration,
    loop: true,
    mode: 'provider',
    targetIds: captionWordIds,
    ranges: [
      { key: 'scale', val: 0.8, prog: 0 },
      { key: 'scale', val: 1.2, prog: goldenRatioProgress },
      { key: 'scale', val: 0.8, prog: 1 },
    ],
  };

  // Circular captions rotation effect
  const circularRotationEffect: GenericEffectData = {
    type: 'linear',
    start: 0,
    duration: baseRotationDuration * 2, // Slower rotation for captions
    loop: true,
    mode: 'provider',
    targetIds: ['circular-captions-container'],
    ranges: [
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: 360, prog: 1 },
    ],
  };

  // Assemble all effects
  const allEffects = [
    { id: 'breathing-effect-back', componentId: 'generic', data: breathingEffectBack },
    { id: 'breathing-effect-middle', componentId: 'generic', data: breathingEffectMiddle },
    { id: 'breathing-effect-front', componentId: 'generic', data: breathingEffectFront },
    { id: 'rotation-effect-back', componentId: 'generic', data: rotationEffectBack },
    { id: 'rotation-effect-middle', componentId: 'generic', data: rotationEffectMiddle },
    { id: 'rotation-effect-front', componentId: 'generic', data: rotationEffectFront },
    { id: 'color-shift-back', componentId: 'generic', data: colorShiftBack },
    { id: 'color-shift-middle', componentId: 'generic', data: colorShiftMiddle },
    { id: 'color-shift-front', componentId: 'generic', data: colorShiftFront },
  ];

  if (captionWords.length > 0) {
    allEffects.push(
      { id: 'caption-breathing-scale', componentId: 'generic', data: captionBreathingEffect },
      { id: 'circular-captions-rotation', componentId: 'generic', data: circularRotationEffect },
    );
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'breathing-mandala-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: '#0a0a1a', // Dark background for mandala
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: allEffects,
    childrenData: [
      breathingLayersContainer,
      ...(captionWords.length > 0 ? [circularCaptionsContainer] : []),
    ],
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
  id: 'breathingMandalaTypokinetics',
  title: 'Breathing Mandala Typokinetics',
  description: 'Creates a meditative breathing mandala effect with text that scales in circular patterns. Features golden ratio timing (1.618:1 inhale/exhale ratio), multiple layered text at different scales and opacities for depth, continuous spiral rotation, and calming color gradient shifts. Caption words are arranged in circular polar coordinate patterns that breathe outward from center.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'mandala', 'breathing', 'meditation', 'golden-ratio', 'circular', 'spiral', 'depth', 'calming', 'gradient', 'polar-coordinates'],
  dependencies: {},
  defaultInputParams: {
    titleText: 'BREATHE',
    captionText: 'Inhale Peace Exhale Tension',
    font: 'Inter:700',
    duration: 20,
    colorScheme: 'purple',
    breathingSpeed: 1,
    rotationSpeed: 1,
    circularRadius: 300,
    showCircularCaptions: true,
  },
};

export const breathingMandalaTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};