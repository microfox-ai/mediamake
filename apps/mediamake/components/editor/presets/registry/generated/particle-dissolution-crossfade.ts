/**
 * Particle Dissolution Cross-Fade Typography Preset
 *
 * This preset creates an elegant kinetic typography transition where the first line of text
 * breaks apart into individual particles that swirl, drift, and reform into the second line.
 * Features organic particle motion with bezier trajectories, wind/gravity effects, and natural
 * flow patterns resembling murmuration or fluid dynamics.
 *
 * Features:
 * - Each character fragments into 4-8 particles
 * - Particles drift, tumble, and reassemble with bezier motion curves
 * - Wind/gravity effects for natural organic movement
 * - Motion blur during mid-transition
 * - Complex transform animations (translateX/Y, scale, rotate, opacity)
 * - Smooth 60fps animation feel with cubic-bezier easing
 *
 * Technical Implementation:
 * - Uses HTMLBlockAtom for particle elements (small text fragments)
 * - BaseLayout with absolute positioning for particle container
 * - Physics-based motion with custom bezier curves
 * - Complex keyframe arrays for each particle's trajectory
 * - Custom helper functions for particle path calculations
 *
 * Use cases:
 * - Kinetic typography transitions between sentences
 * - Elegant text reveals and transformations
 * - Title sequences with particle effects
 * - Dynamic text animations for social media
 * - Poetic or artistic text presentations
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text1: z.string().describe('First line of text that will dissolve into particles'),
  text2: z.string().describe('Second line of text that particles will reform into'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  fontSize: z
    .number()
    .min(12)
    .max(200)
    .default(64)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of text and particles'),
  transitionDuration: z
    .number()
    .min(1)
    .max(10)
    .default(2.5)
    .describe('Duration of the particle transition in seconds'),
  particlesPerChar: z
    .number()
    .min(4)
    .max(8)
    .default(6)
    .describe('Number of particles each character breaks into'),
  windStrength: z
    .number()
    .min(0)
    .max(2)
    .default(0.5)
    .describe('Strength of wind/drift effect (0 = none, 1 = moderate, 2 = strong)'),
  gravityStrength: z
    .number()
    .min(0)
    .max(2)
    .default(0.3)
    .describe('Strength of gravity effect (0 = none, 1 = moderate, 2 = strong)'),
  motionBlur: z
    .boolean()
    .default(true)
    .describe('Add motion blur during mid-transition for enhanced motion effect'),
  swirl: z
    .boolean()
    .default(true)
    .describe('Add swirl/vortex motion to particles during transition'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text1,
    text2,
    font,
    fontSize,
    textColor,
    transitionDuration,
    particlesPerChar,
    windStrength,
    gravityStrength,
    motionBlur,
    swirl,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Inter:700';
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

  // Helper function: Generate particle trajectory
  const generateParticleTrajectory = (
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    particleIndex: number,
    totalParticles: number,
  ) => {
    // Create unique bezier curve for each particle
    const t = particleIndex / totalParticles;
    
    // Calculate control points for bezier curve
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;
    
    // Add variation based on particle index
    const variation = Math.sin(t * Math.PI * 2) * 100;
    const controlX1 = midX + variation * windStrength;
    const controlY1 = midY - 150 + variation * gravityStrength;
    const controlX2 = midX - variation * windStrength * 0.5;
    const controlY2 = midY + 100 - variation * gravityStrength * 0.5;
    
    // Add swirl effect
    const swirlAngle = swirl ? t * Math.PI * 4 : 0;
    const swirlRadius = swirl ? 80 : 0;
    const swirlX = Math.cos(swirlAngle) * swirlRadius;
    const swirlY = Math.sin(swirlAngle) * swirlRadius;
    
    return {
      start: { x: startX, y: startY },
      control1: { x: controlX1 + swirlX, y: controlY1 + swirlY },
      control2: { x: controlX2 - swirlX, y: controlY2 - swirlY },
      end: { x: endX, y: endY },
    };
  };

  // Helper function: Create keyframes for particle animation
  const createParticleKeyframes = (
    trajectory: any,
    particleIndex: number,
    totalParticles: number,
  ) => {
    const t = particleIndex / totalParticles;
    const rotationVariation = (Math.random() - 0.5) * 720; // Random rotation -360 to 360
    
    // Calculate positions along bezier curve at different progress points
    const getPointOnCurve = (progress: number) => {
      const t1 = 1 - progress;
      const x =
        t1 * t1 * t1 * trajectory.start.x +
        3 * t1 * t1 * progress * trajectory.control1.x +
        3 * t1 * progress * progress * trajectory.control2.x +
        progress * progress * progress * trajectory.end.x;
      const y =
        t1 * t1 * t1 * trajectory.start.y +
        3 * t1 * t1 * progress * trajectory.control1.y +
        3 * t1 * progress * progress * trajectory.control2.y +
        progress * progress * progress * trajectory.end.y;
      return { x, y };
    };
    
    // Create keyframes at key progress points
    const keyframes = [];
    
    // Start: original position
    keyframes.push(
      { key: 'translateX', val: trajectory.start.x, prog: 0 },
      { key: 'translateY', val: trajectory.start.y, prog: 0 },
      { key: 'scale', val: 1, prog: 0 },
      { key: 'rotate', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0 },
    );
    
    // Dissolve phase (0 - 0.3): break apart and shrink
    const pos1 = getPointOnCurve(0.15);
    keyframes.push(
      { key: 'translateX', val: pos1.x, prog: 0.15 },
      { key: 'translateY', val: pos1.y, prog: 0.15 },
      { key: 'scale', val: 0.4, prog: 0.15 },
      { key: 'rotate', val: rotationVariation * 0.3, prog: 0.15 },
      { key: 'opacity', val: 0.8, prog: 0.15 },
    );
    
    // Mid-transition (0.3 - 0.7): drift and swirl, minimal size
    const pos2 = getPointOnCurve(0.5);
    keyframes.push(
      { key: 'translateX', val: pos2.x, prog: 0.5 },
      { key: 'translateY', val: pos2.y, prog: 0.5 },
      { key: 'scale', val: 0.2, prog: 0.5 },
      { key: 'rotate', val: rotationVariation, prog: 0.5 },
      { key: 'opacity', val: 0.6, prog: 0.5 },
    );
    
    // Reform phase (0.7 - 1.0): reassemble and grow
    const pos3 = getPointOnCurve(0.85);
    keyframes.push(
      { key: 'translateX', val: pos3.x, prog: 0.85 },
      { key: 'translateY', val: pos3.y, prog: 0.85 },
      { key: 'scale', val: 0.6, prog: 0.85 },
      { key: 'rotate', val: rotationVariation * 0.2, prog: 0.85 },
      { key: 'opacity', val: 0.9, prog: 0.85 },
    );
    
    // End: target position
    keyframes.push(
      { key: 'translateX', val: trajectory.end.x, prog: 1 },
      { key: 'translateY', val: trajectory.end.y, prog: 1 },
      { key: 'scale', val: 1, prog: 1 },
      { key: 'rotate', val: 0, prog: 1 },
      { key: 'opacity', val: 1, prog: 1 },
    );
    
    // Add motion blur during mid-transition
    if (motionBlur) {
      keyframes.push(
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: 'blur(2px)', prog: 0.3 },
        { key: 'filter', val: 'blur(4px)', prog: 0.5 },
        { key: 'filter', val: 'blur(2px)', prog: 0.7 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      );
    }
    
    return keyframes;
  };

  // Helper function: Create particles for a character
  const createCharacterParticles = (
    char: string,
    charIndex: number,
    totalChars: number,
    isText1: boolean,
  ) => {
    const particles = [];
    
    // Calculate character position in layout
    // Approximate character width
    const charWidth = fontSize * 0.6;
    const text1Width = text1.length * charWidth;
    const text2Width = text2.length * charWidth;
    
    // Position for text1 (starting position)
    const text1StartX = -text1Width / 2 + charIndex * charWidth;
    const text1StartY = -fontSize / 2;
    
    // Position for text2 (ending position)
    const text2EndX = -text2Width / 2 + charIndex * charWidth;
    const text2EndY = -fontSize / 2;
    
    // Calculate actual start/end positions based on which text this particle belongs to
    let startX: number, startY: number, endX: number, endY: number;
    
    if (isText1) {
      // Particles from text1: start at text1 position, end at corresponding text2 position
      startX = text1StartX;
      startY = text1StartY;
      // Map to corresponding character in text2 (proportional mapping)
      const text2CharIndex = Math.floor((charIndex / text1.length) * text2.length);
      endX = -text2Width / 2 + text2CharIndex * charWidth;
      endY = text2EndY;
    } else {
      // Particles from text2: start at off-screen or dispersed, end at text2 position
      startX = text2EndX + (Math.random() - 0.5) * 200;
      startY = text2EndY - 200;
      endX = text2EndX;
      endY = text2EndY;
    }
    
    // Create particles for this character
    for (let i = 0; i < particlesPerChar; i++) {
      const particleId = `particle-${isText1 ? 't1' : 't2'}-${charIndex}-${i}`;
      
      // Add small offset to each particle's start position
      const offsetX = (Math.random() - 0.5) * (fontSize * 0.3);
      const offsetY = (Math.random() - 0.5) * (fontSize * 0.3);
      
      // Generate trajectory
      const trajectory = generateParticleTrajectory(
        startX + offsetX,
        startY + offsetY,
        endX + (Math.random() - 0.5) * (fontSize * 0.2),
        endY + (Math.random() - 0.5) * (fontSize * 0.2),
        i,
        particlesPerChar,
      );
      
      // Create keyframes
      const keyframes = createParticleKeyframes(trajectory, i, particlesPerChar);
      
      // Create particle component (HTMLBlockAtom with small text fragment)
      const particle: RenderableComponentData = {
        id: particleId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="
            font-family: ${fontFamily};
            font-size: ${fontSize / 4}px;
            font-weight: ${fontStyle.fontWeight || 700};
            color: ${textColor};
            white-space: nowrap;
            user-select: none;
          ">${char}</div>`,
          className: 'absolute',
          style: {
            left: '50%',
            top: '50%',
            transformOrigin: 'center',
            willChange: 'transform, opacity, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
        effects: [
          {
            id: `${particleId}-effect`,
            componentId: 'generic',
            data: {
              type: 'cubic-bezier',
              start: 0,
              duration: transitionDuration,
              mode: 'provider',
              targetIds: [particleId],
              ranges: keyframes,
              props: {
                customEasing: [0.4, 0.0, 0.2, 1.0], // Custom cubic-bezier for organic motion
              },
            },
          },
        ],
      };
      
      particles.push(particle);
    }
    
    return particles;
  };

  // Generate all particles
  const allParticles: RenderableComponentData[] = [];
  
  // Create particles from text1 characters
  for (let i = 0; i < text1.length; i++) {
    const char = text1[i];
    if (char !== ' ') {
      const charParticles = createCharacterParticles(char, i, text1.length, true);
      allParticles.push(...charParticles);
    }
  }
  
  // Create particles from text2 characters (for additional effect density)
  for (let i = 0; i < text2.length; i++) {
    const char = text2[i];
    if (char !== ' ') {
      const charParticles = createCharacterParticles(char, i, text2.length, false);
      allParticles.push(...charParticles);
    }
  }

  // Create particle container
  const particleContainer: RenderableComponentData = {
    id: 'particle-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          position: 'relative',
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: allParticles,
  };

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'particle-dissolution-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [particleContainer],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'particle-dissolution-crossfade',
  title: 'Particle Dissolution Cross-Fade Typography',
  description:
    'Elegant kinetic typography transition where text breaks apart into individual particles that swirl and reform into new text. Features organic particle motion with bezier trajectories, wind/gravity effects, and natural flow patterns resembling murmuration or fluid dynamics. Each character fragments into 4-8 particles that drift, tumble, and reassemble with motion blur.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'particles',
    'transition',
    'dissolution',
    'crossfade',
    'organic',
    'physics',
    'murmuration',
    'text-animation',
    'bezier',
    'motion-blur',
  ],
  defaultInputParams: {
    text1: 'Hello World',
    text2: 'Welcome Home',
    font: 'Inter:700',
    fontSize: 64,
    textColor: '#FFFFFF',
    transitionDuration: 2.5,
    particlesPerChar: 6,
    windStrength: 0.5,
    gravityStrength: 0.3,
    motionBlur: true,
    swirl: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const particleDissolutionCrossfadePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
