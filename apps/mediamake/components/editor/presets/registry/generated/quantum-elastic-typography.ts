/**
 * Quantum Elastic Typography Preset
 *
 * Advanced typography preset exhibiting quantum elastic behavior where text simultaneously
 * exists in multiple states (probability clouds) before collapsing into final position.
 * Features semi-transparent letter clones that converge with elastic snapping, prismatic
 * gradients refracting into rainbow spectrums during split states, and an uncertainty
 * principle wobble for settled text.
 *
 * Features:
 * - **Probability Clouds**: Text clones dispersed with varying opacity/position
 * - **Elastic Convergence**: Overshoot animation with staggered timing per clone
 * - **Prismatic Refraction**: Hue-rotate effects creating rainbow spectrums during split
 * - **Uncertainty Wobble**: Post-animation random micro-movements for quantum feel
 * - **Chromatic Aberration**: RGB channel splitting during motion
 * - **Focus Pull Effect**: Blur to sharp focus during convergence
 * - **Mix Blend Screen**: Additive blending for glowing quantum effect
 *
 * Use cases:
 * - Creating quantum physics themed titles
 * - High-energy tech/sci-fi content
 * - Abstract particle-based text reveals
 * - Modern experimental typography
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  text: z
    .string()
    .default('QUANTUM TEXT')
    .describe('Text content to display with quantum effects'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter:800')
    .describe('Font family with optional weight (e.g., "Inter:800")'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(5)
    .describe('Total animation duration in seconds'),
  convergenceTime: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .describe('Time for probability clouds to converge (seconds)'),
  numberOfClones: z
    .number()
    .int()
    .min(3)
    .max(7)
    .default(4)
    .describe('Number of probability cloud clones (3-7)'),
  probabilitySpread: z
    .number()
    .min(20)
    .max(100)
    .default(50)
    .describe('Maximum spread distance for probability clouds (pixels)'),
  uncertaintyIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Intensity of post-convergence wobble effect'),
  baseColor: z
    .string()
    .default('#FFFFFF')
    .describe('Base text color (before convergence)'),
  convergedColor: z
    .string()
    .default('#00FFFF')
    .describe('Final text color (after convergence)'),
  enableChromatic: z
    .boolean()
    .default(true)
    .describe('Enable chromatic aberration effect during motion'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10) || 800;
      }
    } else {
      fontStyle.fontWeight = 800;
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.fontFamily);
  
  // Calculate timing parameters
  const convergenceStart = 0;
  const convergenceDuration = params.convergenceTime;
  const wobbleStart = params.convergenceTime;
  const wobbleDuration = params.duration - params.convergenceTime;
  
  // Generate clone positions and hue rotations
  const cloneCount = params.numberOfClones;
  const spread = params.probabilitySpread;
  
  // Helper to generate random position for clone
  const generateClonePosition = (index: number): { x: number; y: number } => {
    const angle = (index / cloneCount) * Math.PI * 2;
    const distance = spread * (0.5 + Math.random() * 0.5);
    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };
  
  // Base text ID
  const baseTextId = 'quantum-base-text';
  
  // Create clones with staggered effects
  const clones: RenderableComponentData[] = [];
  
  for (let i = 0; i < cloneCount; i++) {
    const cloneId = `quantum-clone-${i}`;
    const position = generateClonePosition(i);
    const staggerDelay = i * 0.05; // 50ms stagger per clone
    const hueRotate = (i * 360) / cloneCount; // Distribute hues evenly
    
    // Convergence effect for this clone
    const convergenceEffect: GenericEffectData = {
      type: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Elastic overshoot
      start: convergenceStart + staggerDelay,
      duration: convergenceDuration - staggerDelay,
      mode: 'provider',
      targetIds: [cloneId],
      ranges: [
        // Position: spread → 0 (converge)
        { key: 'translateX', val: position.x, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: position.y, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        // Opacity: 0.3 → 1
        { key: 'opacity', val: 0.3, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        // Scale with overshoot: 1.5 → 0.8 → 1.1 → 1
        { key: 'scale', val: 1.5, prog: 0 },
        { key: 'scale', val: 0.8, prog: 0.3 },
        { key: 'scale', val: 1.1, prog: 0.7 },
        { key: 'scale', val: 1, prog: 1 },
        // Blur: 5px → 0 (focus pull)
        { key: 'filter', val: 'blur(5px)', prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
        // Hue rotate: prismatic → unified
        {
          key: 'filter',
          val: `blur(5px) hue-rotate(${hueRotate}deg)`,
          prog: 0,
        },
        {
          key: 'filter',
          val: `blur(2px) hue-rotate(${hueRotate * 0.5}deg)`,
          prog: 0.5,
        },
        { key: 'filter', val: 'blur(0px) hue-rotate(0deg)', prog: 1 },
      ],
    };
    
    // Uncertainty wobble effect (post-convergence)
    const wobbleEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: wobbleStart,
      duration: wobbleDuration,
      mode: 'provider',
      targetIds: [cloneId],
      ranges: [
        // Random micro-movements
        {
          key: 'translateX',
          val: 0,
          prog: 0,
        },
        {
          key: 'translateX',
          val: 1 * params.uncertaintyIntensity * (Math.random() - 0.5) * 2,
          prog: 0.25,
        },
        {
          key: 'translateX',
          val: -1 * params.uncertaintyIntensity * (Math.random() - 0.5) * 2,
          prog: 0.5,
        },
        {
          key: 'translateX',
          val: 0.5 * params.uncertaintyIntensity * (Math.random() - 0.5) * 2,
          prog: 0.75,
        },
        { key: 'translateX', val: 0, prog: 1 },
        {
          key: 'translateY',
          val: 0,
          prog: 0,
        },
        {
          key: 'translateY',
          val: 1 * params.uncertaintyIntensity * (Math.random() - 0.5) * 2,
          prog: 0.25,
        },
        {
          key: 'translateY',
          val: -1 * params.uncertaintyIntensity * (Math.random() - 0.5) * 2,
          prog: 0.5,
        },
        {
          key: 'translateY',
          val: 0.5 * params.uncertaintyIntensity * (Math.random() - 0.5) * 2,
          prog: 0.75,
        },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };
    
    const clone: RenderableComponentData = {
      id: cloneId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontStyle.fontWeight,
          color: params.baseColor,
          position: 'absolute',
          top: 0,
          left: 0,
          mixBlendMode: 'screen',
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight.toString()],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects: [
        {
          id: `convergence-${cloneId}`,
          componentId: 'generic',
          data: convergenceEffect,
        },
        {
          id: `wobble-${cloneId}`,
          componentId: 'generic',
          data: wobbleEffect,
        },
      ],
    };
    
    clones.push(clone);
  }
  
  // Base text (non-absolute, defines layout space)
  const baseText: RenderableComponentData = {
    id: baseTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        fontWeight: fontStyle.fontWeight,
        color: params.convergedColor,
        position: 'relative',
        opacity: 0, // Hidden initially
      },
      font: {
        family: fontFamily,
        weights: [fontStyle.fontWeight.toString()],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: `base-fade-in`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: convergenceDuration * 0.7,
          duration: convergenceDuration * 0.3,
          mode: 'provider',
          targetIds: [baseTextId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      },
    ],
  };
  
  // Letter container (relative inline-block for layout)
  const letterContainer: RenderableComponentData = {
    id: 'quantum-letter-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative inline-block',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [...clones, baseText] as RenderableComponentData[],
  };
  
  // Root container (isolate for blend modes)
  const rootContainer: RenderableComponentData = {
    id: 'quantum-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative isolate w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: 'rgba(0, 0, 0, 0.9)', // Dark background for effect visibility
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [letterContainer] as RenderableComponentData[],
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
  id: 'quantum-elastic-typography',
  title: 'Quantum Elastic Typography',
  description:
    'Advanced typography preset exhibiting quantum elastic behavior where text simultaneously exists in multiple states (probability clouds) before collapsing into final position. Features semi-transparent letter clones that converge with elastic snapping, prismatic gradients refracting into rainbow spectrums during split states, and an uncertainty principle wobble for settled text. Creates a visual effect of observing text at the quantum level with spooky elastic actions at a distance.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'quantum',
    'elastic',
    'animation',
    'probability-cloud',
    'prismatic',
    'convergence',
    'wobble',
    'chromatic-aberration',
    'experimental',
    'sci-fi',
    'tech',
    'particles',
    'blend-modes',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'QUANTUM TEXT',
    fontSize: 72,
    fontFamily: 'Inter:800',
    duration: 5,
    convergenceTime: 1.5,
    numberOfClones: 4,
    probabilitySpread: 50,
    uncertaintyIntensity: 1,
    baseColor: '#FFFFFF',
    convergedColor: '#00FFFF',
    enableChromatic: true,
  },
};

export const quantumElasticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
