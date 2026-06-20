/**
 * Magnetic Repulsion Text Effect Preset
 *
 * This preset creates an advanced kinetic typography effect that simulates magnetic physics.
 * Letters initially repel from each other with elastic tension, spread apart with a force field,
 * then snap back together with overshoot before settling into final position.
 *
 * Features:
 * - **Magnetic Repulsion Physics**: Letters push away from center based on their position
 * - **Rotational Torque**: Outer letters rotate more than center letters
 * - **Electric Glow Effect**: Subtle glow during maximum repulsion to visualize magnetic field
 * - **Spring Physics Easing**: Realistic motion with cubic-bezier spring animation
 * - **Position-Based Forces**: Center letters move less, edge letters move more
 *
 * Animation Phases:
 * - 0-30%: Repulsion phase - letters spread apart (translateX to calculated position)
 * - 30-60%: Snap-back phase - letters overshoot inward (negative translateX)
 * - 60-100%: Settle phase - letters return to final position (0)
 *
 * Use cases:
 * - Kinetic typography for titles and headers
 * - Physics-based text animations
 * - Dynamic logo reveals
 * - Advanced motion graphics similar to After Effects expressions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('Text content to animate with magnetic repulsion effect'),
  
  // Timing parameters
  duration: z.number().min(0.5).max(5).default(1.2).describe('Total animation duration in seconds'),
  startTime: z.number().min(0).default(0).describe('Start time of the animation relative to parent (seconds)'),
  
  // Physics parameters
  spreadDistance: z.number().min(10).max(100).default(30).describe('Maximum spread distance per letter from center (pixels)'),
  overshootDistance: z.number().min(5).max(50).default(10).describe('Overshoot distance during snap-back (pixels)'),
  rotationAmount: z.number().min(5).max(45).default(15).describe('Maximum rotation per letter from center (degrees)'),
  
  // Style parameters
  fontSize: z.number().min(24).max(200).default(72).describe('Font size in pixels'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "700", "bold")'),
  textColor: z.string().default('#ffffff').describe('Text color (CSS color value)'),
  font: z.string().optional().describe('Font family with optional weight and style (e.g., "Inter:700")'),
  
  // Glow effect parameters
  glowColor: z.string().default('rgba(100,200,255,0.8)').describe('Glow color at peak repulsion'),
  glowSize: z.number().min(5).max(50).default(20).describe('Glow blur radius in pixels'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Split text into individual letters
  const letters = params.text.split('');
  const totalLetters = letters.length;
  const centerIndex = (totalLetters - 1) / 2;
  
  // Animation timing (as percentages of total duration)
  const repulsionEnd = 0.3; // 30% of duration
  const snapBackEnd = 0.6; // 60% of duration
  const settleEnd = 1.0; // 100% of duration
  
  // Spring physics easing
  const springEasing = 'cubic-bezier(0.68,-0.55,0.265,1.55)';
  
  // Create letter components with effects
  const letterComponents = letters.map((letter, index) => {
    const letterId = `letter-${index}`;
    const distanceFromCenter = Math.abs(index - centerIndex);
    
    // Calculate spread distance (center letters move less, edge letters move more)
    const spreadX = (index - centerIndex) * params.spreadDistance;
    const overshootX = (index - centerCenter) * -params.overshootDistance;
    
    // Calculate rotation (outer letters rotate more)
    const rotation = (index - centerIndex) * params.rotationAmount;
    
    // Phase durations
    const repulsionDuration = params.duration * repulsionEnd;
    const snapBackStart = repulsionDuration;
    const snapBackDuration = params.duration * (snapBackEnd - repulsionEnd);
    const settleStart = snapBackStart + snapBackDuration;
    const settleDuration = params.duration * (settleEnd - snapBackEnd);
    
    // Create effects for this letter
    const effects: any[] = [];
    
    // Phase 1: Repulsion (0-30%)
    const repulsionEffect: GenericEffectData = {
      type: springEasing as any,
      start: 0,
      duration: repulsionDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Translation
        { key: 'translateX', val: 0, prog: 0 },
        { key: 'translateX', val: spreadX, prog: 1 },
        // Rotation
        { key: 'rotate', val: 0, prog: 0 },
        { key: 'rotate', val: rotation, prog: 1 },
        // Glow effect
        { key: 'textShadow', val: '0 0 0px rgba(0,0,0,0)', prog: 0 },
        { key: 'textShadow', val: `0 0 ${params.glowSize}px ${params.glowColor}`, prog: 1 },
      ],
    };
    
    effects.push({
      id: `repulsion-${letterId}`,
      componentId: 'generic',
      data: repulsionEffect,
    });
    
    // Phase 2: Snap-back with overshoot (30-60%)
    const snapBackEffect: GenericEffectData = {
      type: springEasing as any,
      start: snapBackStart,
      duration: snapBackDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Translation (from spread to overshoot)
        { key: 'translateX', val: spreadX, prog: 0 },
        { key: 'translateX', val: overshootX, prog: 1 },
        // Rotation (reverse)
        { key: 'rotate', val: rotation, prog: 0 },
        { key: 'rotate', val: -rotation * 0.3, prog: 1 },
        // Glow fades out
        { key: 'textShadow', val: `0 0 ${params.glowSize}px ${params.glowColor}`, prog: 0 },
        { key: 'textShadow', val: '0 0 0px rgba(0,0,0,0)', prog: 1 },
      ],
    };
    
    effects.push({
      id: `snapback-${letterId}`,
      componentId: 'generic',
      data: snapBackEffect,
    });
    
    // Phase 3: Settle to final position (60-100%)
    const settleEffect: GenericEffectData = {
      type: springEasing as any,
      start: settleStart,
      duration: settleDuration,
      mode: 'provider',
      targetIds: [letterId],
      ranges: [
        // Translation (from overshoot to 0)
        { key: 'translateX', val: overshootX, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        // Rotation (settle to 0)
        { key: 'rotate', val: -rotation * 0.3, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },
      ],
    };
    
    effects.push({
      id: `settle-${letterId}`,
      componentId: 'generic',
      data: settleEffect,
    });
    
    // Create letter component
    return {
      id: letterId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: letter,
        style: {
          fontSize: params.fontSize,
          fontWeight: params.fontWeight,
          color: params.textColor,
          display: 'inline-block',
          ...fontStyle,
        },
        font: fontFamily !== 'Inter' ? {
          family: fontFamily,
          weights: [params.fontWeight],
        } : undefined,
      },
      context: {
        timing: {
          start: 0,
          duration: params.duration,
        },
      },
      effects,
    } as RenderableComponentData;
  });
  
  // Container for all letters
  const letterContainer: RenderableComponentData = {
    id: 'letter-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-row',
        style: {
          gap: '0px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: letterComponents,
  };
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-repulsion-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'visible',
        },
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.duration,
      },
    },
    childrenData: [letterContainer],
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
  id: 'magnetic-repulsion-text-effect',
  title: 'Magnetic Repulsion Text Effect',
  description: 'Advanced kinetic typography effect simulating magnetic physics: letters repel from each other with elastic tension, then snap back together with overshoot. Features position-based rotational torque and electric glow at peak repulsion. Uses spring physics easing for realistic motion.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'kinetic', 'typography', 'physics', 'magnetic', 'repulsion', 'spring', 'advanced', 'rotation', 'glow', 'after-effects'],
  dependencies: {},
  defaultInputParams: {
    text: 'MAGNETIC',
    duration: 1.2,
    startTime: 0,
    spreadDistance: 30,
    overshootDistance: 10,
    rotationAmount: 15,
    fontSize: 72,
    fontWeight: '700',
    textColor: '#ffffff',
    glowColor: 'rgba(100,200,255,0.8)',
    glowSize: 20,
  },
};

// Export preset
export const magneticRepulsionTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
