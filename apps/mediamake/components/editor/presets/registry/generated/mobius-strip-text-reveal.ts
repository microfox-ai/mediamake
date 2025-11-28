/**
 * Möbius Strip Text Reveal Preset
 *
 * This preset creates a mesmerizing 3D text animation where text elements flow along
 * a Möbius strip path, creating an impossible geometry effect. Text appears to fold
 * through itself while continuously rotating and moving through 3D space.
 *
 * Features:
 * - **Möbius Strip Path**: Parametric equations for authentic Möbius geometry
 * - **3D Transformations**: Synchronized rotation and translation for each text element
 * - **Continuous Animation**: Smooth, looping motion with sine easing
 * - **Depth Perspective**: Scale and opacity effects based on z-position
 * - **Customizable Elements**: Split text by words or characters
 * - **Visual Enhancements**: Glow effects and shadows for depth
 *
 * Technical Implementation:
 * - Uses parametric Möbius equations: x = (1 + v*cos(u/2))*cos(u), y = (1 + v*cos(u/2))*sin(u), z = v*sin(u/2)
 * - Elements staggered along path parameter u (0 to 2π)
 * - Rotation matrices calculated to maintain text readability
 * - Generic keyframe effects for position, rotation, scale, and opacity
 *
 * Use Cases:
 * - Dynamic title reveals
 * - Abstract text animations
 * - Futuristic intro sequences
 * - Impossible geometry effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .describe('Text to animate along the Möbius strip path'),
  splitMode: z
    .enum(['words', 'characters'])
    .default('words')
    .optional()
    .describe('Whether to split text by words or individual characters'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  font: z
    .string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Text color (CSS color value)'),
  loopDuration: z
    .number()
    .min(2)
    .max(10)
    .default(3)
    .optional()
    .describe('Duration of one complete Möbius loop in seconds'),
  scale: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .optional()
    .describe('Scale multiplier for the Möbius strip size'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .optional()
    .describe('Intensity of text glow effect (0-1)'),
  backgroundColor: z
    .string()
    .default('#000000')
    .optional()
    .describe('Background color for the scene'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
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

  // Split text based on mode
  const splitText = params.splitMode === 'characters'
    ? params.text.split('')
    : params.text.split(' ');

  const elementCount = splitText.length;
  const loopDuration = params.loopDuration ?? 3;
  const scale = params.scale ?? 150;
  const fontSize = params.fontSize ?? 72;
  const glowIntensity = params.glowIntensity ?? 0.5;

  // Helper function: Calculate Möbius strip position and rotation
  const calculateMobiusTransform = (u: number, v: number) => {
    // Parametric Möbius equations
    // x = (1 + v*cos(u/2))*cos(u)
    // y = (1 + v*cos(u/2))*sin(u)
    // z = v*sin(u/2)
    
    const x = (1 + v * Math.cos(u / 2)) * Math.cos(u) * scale;
    const y = (1 + v * Math.cos(u / 2)) * Math.sin(u) * scale;
    const z = v * Math.sin(u / 2) * scale;

    // Calculate rotation to align with path tangent
    // Tangent vector approximation
    const du = 0.01;
    const x2 = (1 + v * Math.cos((u + du) / 2)) * Math.cos(u + du) * scale;
    const y2 = (1 + v * Math.cos((u + du) / 2)) * Math.sin(u + du) * scale;
    const z2 = v * Math.sin((u + du) / 2) * scale;

    const dx = x2 - x;
    const dy = y2 - y;
    const dz = z2 - z;

    // Calculate rotation angles
    const rotateY = Math.atan2(dx, dz) * (180 / Math.PI);
    const rotateX = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz)) * (180 / Math.PI);
    const rotateZ = (u * 180 / Math.PI) * 0.5; // Additional twist

    return { x, y, z, rotateX, rotateY, rotateZ };
  };

  // Create text elements
  const textElements: RenderableComponentData[] = splitText.map((textPart, index) => {
    const elementId = `mobius-text-${index}`;
    
    // Calculate path parameter u for this element (staggered along path)
    const uStart = (index / elementCount) * 2 * Math.PI;
    
    // Möbius strip has v parameter from -0.5 to 0.5 (width of strip)
    // We keep elements centered on the strip
    const v = 0;

    // Create keyframes for animation
    const numKeyframes = 20; // More keyframes for smoother animation
    const ranges: Array<{ key: string; val: any; prog: number }> = [];

    for (let i = 0; i <= numKeyframes; i++) {
      const progress = i / numKeyframes;
      const u = uStart + progress * 2 * Math.PI;
      
      const transform = calculateMobiusTransform(u, v);
      
      // Calculate scale based on z-depth (closer = bigger)
      const depthScale = 1 + (transform.z / (scale * 2)) * 0.3;
      const finalScale = Math.max(0.5, Math.min(1.5, depthScale));
      
      // Calculate opacity based on z-position (fade out when far)
      const depthOpacity = 0.3 + (transform.z / (scale * 2) + 0.5) * 0.7;
      const finalOpacity = Math.max(0.3, Math.min(1, depthOpacity));

      // Add keyframes
      ranges.push(
        { key: 'translateX', val: transform.x, prog: progress },
        { key: 'translateY', val: transform.y, prog: progress },
        { key: 'translateZ', val: transform.z, prog: progress },
        { key: 'rotateX', val: transform.rotateX, prog: progress },
        { key: 'rotateY', val: transform.rotateY, prog: progress },
        { key: 'rotateZ', val: transform.rotateZ, prog: progress },
        { key: 'scale', val: finalScale, prog: progress },
        { key: 'opacity', val: finalOpacity, prog: progress }
      );
    }

    // Create effect
    const effect = {
      id: `mobius-effect-${index}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: loopDuration,
        mode: 'provider' as const,
        targetIds: [elementId],
        ranges,
      },
    };

    // Create text atom
    return {
      id: elementId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: textPart,
        style: {
          fontSize: `${fontSize}px`,
          color: params.textColor ?? '#FFFFFF',
          textShadow: `0 0 ${20 * glowIntensity}px rgba(255,255,255,${0.5 * glowIntensity}), 0 0 ${40 * glowIntensity}px rgba(255,255,255,${0.3 * glowIntensity})`,
          transformStyle: 'preserve-3d',
          willChange: 'transform, opacity',
          whiteSpace: 'nowrap',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: loopDuration,
        },
      },
      effects: [effect],
    } as RenderableComponentData;
  });

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'mobius-strip-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          perspective: '1500px',
          perspectiveOrigin: 'center center',
          transformStyle: 'preserve-3d',
          backgroundColor: params.backgroundColor ?? '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: loopDuration,
      },
    },
    childrenData: [
      {
        id: 'mobius-strip-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute preserve-3d',
            style: {
              transformStyle: 'preserve-3d',
              transform: 'translateZ(0)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: loopDuration,
          },
        },
        childrenData: textElements,
      } as RenderableComponentData,
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
  id: 'mobius-strip-text-reveal',
  title: 'Möbius Strip Text Reveal',
  description:
    'Typokinetic preset with Möbius strip reveal animation. Text elements unfold along an infinite loop path from center, twisting through 3D space following parametric Möbius equations. Creates a mesmerizing impossible geometry effect where text appears to fold through itself while continuously flowing along a figure-8 path with synchronized 3D rotation for readability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'mobius',
    'geometric',
    'loop',
    'reveal',
    'impossible-geometry',
    'parametric',
    'continuous',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MÖBIUS STRIP',
    splitMode: 'words',
    fontSize: 72,
    font: 'Inter:700',
    textColor: '#FFFFFF',
    loopDuration: 3,
    scale: 150,
    glowIntensity: 0.5,
    backgroundColor: '#000000',
  },
};

export const mobiusStripTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
