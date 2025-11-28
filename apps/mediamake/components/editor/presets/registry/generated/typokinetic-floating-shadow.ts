/**
 * Atmospheric Typokinetic Floating Text with Dynamic Shadows Preset
 *
 * This preset creates an atmospheric effect where text appears to float in space with dynamic drop shadows
 * that shift based on imaginary light movement. The text has subtle micro-movements (tiny rotations and 
 * translations) while multiple shadow layers move independently, creating depth and environmental lighting 
 * effects reminiscent of candlelit scenes.
 *
 * Features:
 * - **Floating Text with Micro-Movements**: Text continuously animates with subtle translateY, rotateX, and rotateY
 * - **Dynamic Multi-Layer Shadows**: 3 shadow layers with different blur values and opacities
 * - **Independent Shadow Movement**: Shadows move with organic patterns using sine/cosine combinations
 * - **Parallax Effect**: Shadows move 1.5x more than text for enhanced depth perception
 * - **Color Temperature Shift**: Shadows transition from cool to warm tones suggesting changing light
 * - **Customizable Parameters**: Control text properties, movement intensity, shadow behavior, and colors
 * - **3D Perspective**: Uses preserve-3d transform style for true depth effect
 *
 * Use cases:
 * - Ambient content and meditation apps
 * - Artistic presentations requiring atmospheric text
 * - Title sequences with dynamic lighting
 * - Poetic or reflective content with mood-driven design
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  text: z.string().default('Floating Text').describe('The text content to display'),
  
  // Text styling
  fontSize: z.number().default(80).describe('Font size in pixels'),
  fontFamily: z.string().default('Inter').describe('Font family name (e.g., Inter, Roboto)'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., 400, 700, bold)'),
  textColor: z.string().default('#FFFFFF').describe('Text color (hex or rgba)'),
  
  // Animation timing
  duration: z.number().default(30).describe('Total duration of the animation in seconds'),
  
  // Text movement parameters
  floatAmplitude: z.number().default(3).describe('Vertical float amplitude in pixels (±)'),
  floatDuration: z.number().default(4).describe('Duration of one float cycle in seconds'),
  rotateAmplitude: z.number().default(1).describe('Rotation amplitude in degrees (± for rotateX/Y)'),
  
  // Shadow movement parameters
  shadowParallaxFactor: z.number().default(1.5).describe('Multiplier for shadow movement relative to text (creates parallax depth)'),
  shadowMovementSpeed: z.number().default(6).describe('Speed of shadow movement cycles in seconds'),
  shadowMovementRange: z.number().default(8).describe('Range of shadow movement in pixels (±)'),
  
  // Shadow color temperature
  shadowCoolColor: z.string().default('rgba(100, 150, 200, 0.3)').describe('Cool shadow color (blue tones)'),
  shadowWarmColor: z.string().default('rgba(200, 120, 80, 0.3)').describe('Warm shadow color (orange tones)'),
  
  // Shadow layer configuration
  shadowBlur1: z.number().default(4).describe('Blur amount for closest shadow layer (px)'),
  shadowBlur2: z.number().default(8).describe('Blur amount for middle shadow layer (px)'),
  shadowBlur3: z.number().default(12).describe('Blur amount for farthest shadow layer (px)'),
  shadowOpacity1: z.number().default(0.3).describe('Opacity for closest shadow layer (0-1)'),
  shadowOpacity2: z.number().default(0.2).describe('Opacity for middle shadow layer (0-1)'),
  shadowOpacity3: z.number().default(0.1).describe('Opacity for farthest shadow layer (0-1)'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'typokinetic-floating-shadow-container';
  const transformContainerId = 'transform-container';
  const mainTextId = 'main-text';
  const shadow1Id = 'shadow-layer-1';
  const shadow2Id = 'shadow-layer-2';
  const shadow3Id = 'shadow-layer-3';

  // Helper function to create shadow movement effects
  const createShadowEffect = (
    targetId: string,
    parallaxFactor: number,
    phaseOffset: number,
    layerIndex: number,
  ) => {
    const baseRange = params.shadowMovementRange;
    const speed = params.shadowMovementSpeed;
    const duration = params.duration;
    
    // Create organic movement using sine/cosine with phase offsets
    const numKeyframes = Math.ceil(duration / speed) * 4; // More keyframes for smoother motion
    const ranges = [];
    
    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const time = progress * duration;
      
      // Organic movement using sine/cosine combination with different frequencies
      const xOffset = Math.sin((time / speed) * Math.PI * 2 + phaseOffset) * baseRange * parallaxFactor;
      const yOffset = Math.cos((time / speed) * Math.PI * 2 + phaseOffset * 1.3) * baseRange * parallaxFactor * 0.8;
      
      ranges.push(
        { key: 'translateX', val: xOffset, prog: progress },
        { key: 'translateY', val: yOffset, prog: progress },
      );
    }
    
    return {
      id: `shadow-movement-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges,
      },
    };
  };

  // Helper function to create shadow color temperature shift
  const createShadowColorEffect = (targetId: string) => {
    const duration = params.duration;
    const numCycles = Math.floor(duration / 8); // Cycle every 8 seconds
    const ranges = [];
    
    for (let cycle = 0; cycle <= numCycles; cycle++) {
      const baseProgress = cycle / numCycles;
      
      // Transition from cool to warm and back
      ranges.push(
        { key: 'color', val: params.shadowCoolColor, prog: baseProgress },
        { key: 'color', val: params.shadowWarmColor, prog: Math.min(1, baseProgress + 0.5 / numCycles) },
      );
    }
    
    return {
      id: `shadow-color-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: 0,
        duration: duration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges,
      },
    };
  };

  // Create text micro-movement effect
  const textFloatDuration = params.floatDuration;
  const numFloatCycles = Math.ceil(params.duration / textFloatDuration);
  const textFloatRanges = [];
  
  for (let cycle = 0; cycle <= numFloatCycles; cycle++) {
    const baseProgress = (cycle / numFloatCycles);
    const cycleProgress = (cycle % 1);
    
    // Sine wave for vertical float
    const yOffset = Math.sin(cycle * Math.PI * 2) * params.floatAmplitude;
    
    // Subtle rotations
    const rotateX = Math.sin(cycle * Math.PI * 2 + 0.5) * params.rotateAmplitude;
    const rotateY = Math.cos(cycle * Math.PI * 2 + 0.8) * params.rotateAmplitude;
    
    textFloatRanges.push(
      { key: 'translateY', val: yOffset, prog: baseProgress },
      { key: 'rotateX', val: rotateX, prog: baseProgress },
      { key: 'rotateY', val: rotateY, prog: baseProgress },
    );
  }

  const textMicroMovementEffect = {
    id: 'text-micro-movement',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: params.duration,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: textFloatRanges,
    },
  };

  // Create shadow effects with different phase offsets for organic independent movement
  const shadow1Movement = createShadowEffect(shadow1Id, params.shadowParallaxFactor, 0, 1);
  const shadow2Movement = createShadowEffect(shadow2Id, params.shadowParallaxFactor, Math.PI / 3, 2);
  const shadow3Movement = createShadowEffect(shadow3Id, params.shadowParallaxFactor, (Math.PI * 2) / 3, 3);

  const shadow1Color = createShadowColorEffect(shadow1Id);
  const shadow2Color = createShadowColorEffect(shadow2Id);
  const shadow3Color = createShadowColorEffect(shadow3Id);

  // Build shadow layer nodes
  const shadow3Node = {
    id: shadow3Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.shadowCoolColor,
        filter: `blur(${params.shadowBlur3}px)`,
        willChange: 'transform',
        textAlign: 'center' as const,
        userSelect: 'none' as const,
        pointerEvents: 'none' as const,
        position: 'absolute' as const,
        opacity: params.shadowOpacity3,
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [shadow3Movement, shadow3Color],
  } as RenderableComponentData;

  const shadow2Node = {
    id: shadow2Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.shadowCoolColor,
        filter: `blur(${params.shadowBlur2}px)`,
        willChange: 'transform',
        textAlign: 'center' as const,
        userSelect: 'none' as const,
        pointerEvents: 'none' as const,
        position: 'absolute' as const,
        opacity: params.shadowOpacity2,
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [shadow2Movement, shadow2Color],
  } as RenderableComponentData;

  const shadow1Node = {
    id: shadow1Id,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.shadowCoolColor,
        filter: `blur(${params.shadowBlur1}px)`,
        willChange: 'transform',
        textAlign: 'center' as const,
        userSelect: 'none' as const,
        pointerEvents: 'none' as const,
        position: 'absolute' as const,
        opacity: params.shadowOpacity1,
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [shadow1Movement, shadow1Color],
  } as RenderableComponentData;

  // Main text node
  const mainTextNode = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: params.fontWeight,
        color: params.textColor,
        willChange: 'transform',
        textAlign: 'center' as const,
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        position: 'relative' as const,
        zIndex: 10,
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [textMicroMovementEffect],
  } as RenderableComponentData;

  // Transform container
  const transformContainer = {
    id: transformContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      shadow3Node,
      shadow2Node,
      shadow1Node,
      mainTextNode,
    ] as RenderableComponentData[],
  } as RenderableComponentData;

  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          transformStyle: 'preserve-3d' as const,
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [transformContainer] as RenderableComponentData[],
  } as RenderableComponentData;

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
  id: 'typokinetic-floating-shadow',
  title: 'Atmospheric Typokinetic Floating Text with Dynamic Shadows',
  description:
    'An atmospheric typokinetic preset featuring floating text with dynamic drop shadows that shift based on imaginary light movement. Text hovers with micro-movements (tiny rotations and translations) while multiple shadow layers move independently with parallax effects, creating depth and environmental lighting effects reminiscent of candlelit scenes. Perfect for ambient content, meditation apps, or artistic presentations.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'floating',
    'shadows',
    'atmospheric',
    'kinetic',
    'parallax',
    'depth',
    'ambient',
    'artistic',
    '3d',
    'micro-movements',
    'dynamic-lighting',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'Floating Text',
    fontSize: 80,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#FFFFFF',
    duration: 30,
    floatAmplitude: 3,
    floatDuration: 4,
    rotateAmplitude: 1,
    shadowParallaxFactor: 1.5,
    shadowMovementSpeed: 6,
    shadowMovementRange: 8,
    shadowCoolColor: 'rgba(100, 150, 200, 0.3)',
    shadowWarmColor: 'rgba(200, 120, 80, 0.3)',
    shadowBlur1: 4,
    shadowBlur2: 8,
    shadowBlur3: 12,
    shadowOpacity1: 0.3,
    shadowOpacity2: 0.2,
    shadowOpacity3: 0.1,
  },
};

// --- Export ---
export const typokineticFloatingShadowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};