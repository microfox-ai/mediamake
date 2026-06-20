/**
 * Typokinetics Magnetic Attraction Preset
 * 
 * This preset creates a magnetic attraction typography effect where text starts at a random edge position
 * and gets pulled toward the center through an invisible magnetic field. The animation follows inverse square
 * law physics for realistic acceleration, overshoots the center with spring physics, then oscillates with
 * dampening until settling.
 * 
 * Features:
 * - **Random Edge Positioning**: Text starts at a random edge (top, right, bottom, or left)
 * - **Inverse Square Law Acceleration**: Realistic acceleration curve as word approaches center
 * - **Spring Physics Overshoot**: Natural overshoot past center point with dampened oscillation
 * - **Tumbling Rotation**: Continuous slow rotation (0deg → 720deg) throughout motion
 * - **Velocity-Based Motion Blur**: Dynamic blur that increases with speed
 * - **Scale Emphasis**: Word grows as it approaches center, suggesting proximity/intensity
 * - **Electric Glow Effect**: Intensifying glow suggesting magnetic field strength
 * - **Multi-Segment Animation**: Complex 5-7 keyframe animation with precise timing control
 * 
 * Technical Implementation:
 * - Uses multi-segment generic effect with custom easing curves
 * - Combines translateX/Y, scale, rotate, blur, and textShadow animations
 * - Follows inverse square law for acceleration (15-60% progress)
 * - Dampened oscillation with decreasing amplitude (70-85-95-100%)
 * - Electric blue glow effect intensifies at center point
 * 
 * Use cases:
 * - Kinetic typography animations
 * - Dynamic title sequences
 * - Physics-based text effects
 * - Space/sci-fi themed intros
 * - High-energy brand animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text to display with magnetic attraction effect'),
  duration: z.number().min(3).max(10).default(5).describe('Total animation duration in seconds (4-5 seconds recommended)'),
  fontSize: z.number().min(24).max(200).default(96).describe('Font size in pixels for the text'),
  fontFamily: z.string().default('Inter').describe('Font family for the text (e.g., "Inter", "Roboto")'),
  fontWeight: z.string().default('700').describe('Font weight (e.g., "400", "700", "900")'),
  textColor: z.string().default('#ffffff').describe('Text color in hex format'),
  backgroundColor: z.string().default('#000000').describe('Background color in hex format'),
  edgePosition: z.enum(['random', 'top', 'right', 'bottom', 'left']).default('random').describe('Starting edge position (random or specific edge)'),
  maxBlur: z.number().min(0).max(10).default(4).describe('Maximum motion blur in pixels at peak velocity'),
  overshootPercent: z.number().min(5).max(20).default(10).describe('Overshoot distance past center as percentage'),
  glowIntensity: z.number().min(0.5).max(2).default(1).describe('Intensity multiplier for electric glow effect'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  
  // Helper function to calculate random edge position
  const calculateEdgePosition = (edge: string): { x: number; y: number } => {
    const edges = ['top', 'right', 'bottom', 'left'];
    const selectedEdge = edge === 'random' ? edges[Math.floor(Math.random() * edges.length)] : edge;
    
    // Calculate position based on edge (in percentage of viewport)
    switch (selectedEdge) {
      case 'top':
        return { x: Math.random() * 100 - 50, y: -50 }; // Random horizontal, off top
      case 'right':
        return { x: 50, y: Math.random() * 100 - 50 }; // Off right, random vertical
      case 'bottom':
        return { x: Math.random() * 100 - 50, y: 50 }; // Random horizontal, off bottom
      case 'left':
        return { x: -50, y: Math.random() * 100 - 50 }; // Off left, random vertical
      default:
        return { x: -50, y: -50 };
    }
  };

  // Calculate starting position
  const startPos = calculateEdgePosition(params.edgePosition);
  
  // Convert percentage to pixels (assuming 1920x1080 viewport for calculation)
  const viewportWidth = 1920;
  const viewportHeight = 1080;
  const startX = (startPos.x / 100) * viewportWidth;
  const startY = (startPos.y / 100) * viewportHeight;

  // Calculate overshoot distance
  const overshootDistance = params.overshootPercent;
  
  // Calculate oscillation positions (dampened)
  const oscillation1 = -overshootDistance / 2; // 50% of overshoot in opposite direction
  const oscillation2 = overshootDistance / 4; // 25% of overshoot back
  
  // Glow intensity multiplier
  const glowMult = params.glowIntensity;

  // Component IDs
  const textId = 'magnetic-text';
  const effectId = 'magnetic-effect';

  // Create magnetic attraction effect with multi-segment animation
  const magneticEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textId],
    ranges: [
      // === TRANSLATION (X-axis) ===
      // Start: off-edge position
      { key: 'translateX', val: startX, prog: 0 },
      // Slow drift phase (0-15%)
      { key: 'translateX', val: startX * 0.8, prog: 0.15 },
      // Rapid acceleration following inverse square law (15-60%)
      { key: 'translateX', val: startX * 0.4, prog: 0.35 },
      { key: 'translateX', val: 0, prog: 0.6 },
      // Overshoot past center (60-70%)
      { key: 'translateX', val: -overshootDistance, prog: 0.7 },
      // First oscillation back (70-85%)
      { key: 'translateX', val: oscillation1, prog: 0.85 },
      // Second oscillation (85-95%)
      { key: 'translateX', val: oscillation2, prog: 0.95 },
      // Settle at center (95-100%)
      { key: 'translateX', val: 0, prog: 1 },

      // === TRANSLATION (Y-axis) ===
      { key: 'translateY', val: startY, prog: 0 },
      { key: 'translateY', val: startY * 0.8, prog: 0.15 },
      { key: 'translateY', val: startY * 0.4, prog: 0.35 },
      { key: 'translateY', val: 0, prog: 0.6 },
      { key: 'translateY', val: -overshootDistance * 0.5, prog: 0.7 },
      { key: 'translateY', val: oscillation1 * 0.5, prog: 0.85 },
      { key: 'translateY', val: oscillation2 * 0.5, prog: 0.95 },
      { key: 'translateY', val: 0, prog: 1 },

      // === ROTATION (tumbling through space) ===
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'rotate', val: 180, prog: 0.25 },
      { key: 'rotate', val: 360, prog: 0.5 },
      { key: 'rotate', val: 540, prog: 0.75 },
      { key: 'rotate', val: 720, prog: 1 },

      // === SCALE (grows as approaching center) ===
      { key: 'scale', val: 1, prog: 0 },
      { key: 'scale', val: 1.05, prog: 0.15 },
      { key: 'scale', val: 1.2, prog: 0.35 },
      { key: 'scale', val: 1.3, prog: 0.6 },
      { key: 'scale', val: 1.25, prog: 0.7 },
      { key: 'scale', val: 1.15, prog: 0.85 },
      { key: 'scale', val: 1.12, prog: 0.95 },
      { key: 'scale', val: 1.1, prog: 1 },

      // === MOTION BLUR (velocity-based) ===
      { key: 'blur', val: '0px', prog: 0 },
      { key: 'blur', val: '1px', prog: 0.15 },
      { key: 'blur', val: `${params.maxBlur * 0.6}px`, prog: 0.35 },
      { key: 'blur', val: `${params.maxBlur}px`, prog: 0.5 },
      { key: 'blur', val: `${params.maxBlur * 0.4}px`, prog: 0.6 },
      { key: 'blur', val: '1px', prog: 0.7 },
      { key: 'blur', val: '0px', prog: 0.85 },

      // === ELECTRIC GLOW (textShadow - intensifies at center) ===
      { 
        key: 'textShadow', 
        val: `0 0 ${5 * glowMult}px rgba(100,200,255,${0.2 * glowMult})`, 
        prog: 0 
      },
      { 
        key: 'textShadow', 
        val: `0 0 ${10 * glowMult}px rgba(100,200,255,${0.4 * glowMult})`, 
        prog: 0.15 
      },
      { 
        key: 'textShadow', 
        val: `0 0 ${20 * glowMult}px rgba(100,200,255,${0.6 * glowMult})`, 
        prog: 0.35 
      },
      { 
        key: 'textShadow', 
        val: `0 0 ${30 * glowMult}px rgba(100,200,255,${0.8 * glowMult}), 0 0 ${50 * glowMult}px rgba(100,200,255,${0.5 * glowMult})`, 
        prog: 0.6 
      },
      { 
        key: 'textShadow', 
        val: `0 0 ${25 * glowMult}px rgba(100,200,255,${0.7 * glowMult}), 0 0 ${40 * glowMult}px rgba(100,200,255,${0.4 * glowMult})`, 
        prog: 0.7 
      },
      { 
        key: 'textShadow', 
        val: `0 0 ${15 * glowMult}px rgba(100,200,255,${0.5 * glowMult})`, 
        prog: 0.85 
      },
      { 
        key: 'textShadow', 
        val: `0 0 ${10 * glowMult}px rgba(100,200,255,${0.3 * glowMult})`, 
        prog: 1 
      },
    ],
  };

  // Create text atom component
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'text-6xl font-bold',
      style: {
        fontSize: `${params.fontSize}px`,
        fontWeight: params.fontWeight,
        color: params.textColor,
        willChange: 'transform',
      },
      font: {
        family: params.fontFamily,
        weights: [params.fontWeight],
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
        id: effectId,
        componentId: 'generic',
        data: magneticEffect,
      },
    ],
  } as RenderableComponentData;

  // Create root container
  const rootContainer = {
    id: 'magnetic-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          overflow: 'hidden',
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textAtom],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'typokinetics-magnetic-attraction',
  title: 'Typokinetics Magnetic Attraction',
  description: 'A magnetic attraction typography effect where text starts at a random edge position and gets pulled toward the center through an invisible magnetic field. Features inverse square law acceleration, spring physics overshoot with dampened oscillation, continuous tumbling rotation, velocity-based motion blur, scale emphasis, and intensifying electric glow effect suggesting magnetic field strength.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'magnetic',
    'attraction',
    'physics',
    'spring',
    'oscillation',
    'rotation',
    'motion-blur',
    'glow',
    'electric',
    'dynamic',
    'animated',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MAGNETIC',
    duration: 5,
    fontSize: 96,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#ffffff',
    backgroundColor: '#000000',
    edgePosition: 'random',
    maxBlur: 4,
    overshootPercent: 10,
    glowIntensity: 1,
  },
};

// Export preset
export const typokineticsMagneticAttractionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
