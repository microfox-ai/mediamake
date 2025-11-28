/**
 * Magnetic Typokinetics Preset
 *
 * This preset creates animated typography that mimics the behavior of magnetic letters 
 * being attracted to their final positions - imagine stop-motion animation where magnetic 
 * forces pull letters across a surface. Characters accelerate as they get closer to their 
 * destination, with follow-through showing them 'snapping' into place with a satisfying click.
 *
 * Features:
 * - **Magnetic Attraction Animation**: Characters start scattered in circular distribution 
 *   and accelerate toward final positions using inverse-square physics simulation
 * - **Curved Motion Paths**: Letters follow bezier curves (not straight lines) with 3-4 
 *   control points for realistic magnetic field navigation
 * - **Dynamic Rotation**: Characters spin (0-360° or 720°) during approach, with spin 
 *   speed proportional to movement speed
 * - **Snap Effect**: Fast deceleration in last 10% of animation with slight scale bounce 
 *   (1.0 → 0.95 → 1.05 → 1.0)
 * - **Magnetic Lock**: Subtle box-shadow pulse when letters lock into place
 * - **Customizable Intensity**: Global impact multiplier for effect strength
 * - **Font Customization**: Support for custom Google Fonts with weight selection
 *
 * Use cases:
 * - Creating kinetic typography with stop-motion aesthetic
 * - Building magnetic letter attraction effects for titles
 * - Adding personality to each character's movement journey
 * - Creating satisfying snap-into-place animations
 * - Building dynamic text reveals with physics-based motion
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
  text: z
    .string()
    .default('MAGNETIC')
    .describe('Text content to display with magnetic animation'),
  
  fontSize: z
    .number()
    .min(12)
    .max(500)
    .default(64)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  scatterRadius: z
    .number()
    .min(50)
    .max(300)
    .default(100)
    .describe('Radius of circular scatter distribution for starting positions (80-120px recommended)'),
  
  animationDuration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.2)
    .describe('Base animation duration in seconds'),
  
  impactMultiplier: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Global intensity multiplier for all effects (0.1 - 3.0)'),
  
  rotationIntensity: z
    .enum(['single', 'double'])
    .default('single')
    .describe('Rotation during approach: single (360°) or double (720°)'),
  
  startDelay: z
    .number()
    .min(0)
    .max(5)
    .default(0)
    .describe('Delay before animation starts (seconds)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    fontSize,
    textColor,
    font,
    scatterRadius,
    animationDuration,
    impactMultiplier,
    rotationIntensity,
    startDelay,
  } = params;

  // Parse font string
  const parseFontString = (fontString?: string) => {
    if (!fontString) {
      return {
        family: 'Inter',
        fontStyle: { fontWeight: 700 },
      };
    }
    
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    
    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { family: fontFamily, fontStyle };
  };

  const { family: fontFamily, fontStyle } = parseFontString(font);

  // Split text into characters
  const characters = text.split('');
  const characterCount = characters.length;

  // Calculate circular scatter positions for each character
  const calculateScatterPosition = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2;
    const radius = scatterRadius;
    
    // Add some randomness to radius (80-120% of base)
    const randomRadius = radius * (0.8 + Math.random() * 0.4);
    
    return {
      x: Math.cos(angle) * randomRadius,
      y: Math.sin(angle) * randomRadius,
    };
  };

  // Generate bezier curve control points for curved motion path
  const generateBezierPath = (startX: number, startY: number) => {
    // Create 3-4 control points for curved trajectory
    const midX1 = startX * 0.7 + (Math.random() - 0.5) * 40;
    const midY1 = startY * 0.7 + (Math.random() - 0.5) * 40;
    const midX2 = startX * 0.3 + (Math.random() - 0.5) * 20;
    const midY2 = startY * 0.3 + (Math.random() - 0.5) * 20;
    
    return { midX1, midY1, midX2, midY2 };
  };

  // Create character components with effects
  const characterComponents: RenderableComponentData[] = characters.map((char, index) => {
    const charId = `char-${index}`;
    const scatterPos = calculateScatterPosition(index, characterCount);
    const bezierPath = generateBezierPath(scatterPos.x, scatterPos.y);
    
    // Calculate rotation amount based on intensity
    const maxRotation = rotationIntensity === 'double' ? 720 : 360;
    const rotationDirection = Math.random() > 0.5 ? 1 : -1;
    const finalRotation = maxRotation * rotationDirection;

    // Motion effect with bezier curve path (inverse-square acceleration simulation)
    const motionEffect = {
      id: `motion-${charId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in' as const,
        start: 0,
        duration: animationDuration * impactMultiplier,
        mode: 'provider' as const,
        targetIds: [charId],
        ranges: [
          // X-axis movement with bezier curve
          { key: 'translateX', val: scatterPos.x, prog: 0 },
          { key: 'translateX', val: bezierPath.midX1, prog: 0.3 },
          { key: 'translateX', val: bezierPath.midX2, prog: 0.7 },
          { key: 'translateX', val: 0, prog: 1 },
          
          // Y-axis movement with bezier curve
          { key: 'translateY', val: scatterPos.y, prog: 0 },
          { key: 'translateY', val: bezierPath.midY1, prog: 0.3 },
          { key: 'translateY', val: bezierPath.midY2, prog: 0.7 },
          { key: 'translateY', val: 0, prog: 1 },
          
          // Rotation during motion
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: finalRotation * 0.5, prog: 0.5 },
          { key: 'rotate', val: finalRotation, prog: 1 },
          
          // Opacity (always visible)
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 1, prog: 1 },
        ],
      },
    };

    // Snap effect (last 10% with scale bounce)
    const snapStartTime = animationDuration * impactMultiplier * 0.9;
    const snapDuration = animationDuration * impactMultiplier * 0.1;
    
    const snapEffect = {
      id: `snap-${charId}`,
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: snapStartTime,
        duration: snapDuration,
        mode: 'provider' as const,
        targetIds: [charId],
        ranges: [
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.95, prog: 0.3 },
          { key: 'scale', val: 1.05, prog: 0.6 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    };

    // Magnetic lock shadow pulse effect
    const shadowEffect = {
      id: `shadow-${charId}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out' as const,
        start: snapStartTime,
        duration: snapDuration * 1.5,
        mode: 'provider' as const,
        targetIds: [charId],
        ranges: [
          { key: 'filter', val: 'drop-shadow(0 0 0px rgba(255,255,255,0))', prog: 0 },
          { key: 'filter', val: 'drop-shadow(0 0 20px rgba(255,255,255,0.8))', prog: 0.5 },
          { key: 'filter', val: 'drop-shadow(0 0 5px rgba(255,255,255,0.3))', prog: 1 },
        ],
      },
    };

    // Character atom
    return {
      id: charId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: char,
        style: {
          fontSize: fontSize,
          fontWeight: fontStyle.fontWeight || 700,
          color: textColor,
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
          duration: animationDuration * impactMultiplier * 1.1,
        },
      },
      effects: [motionEffect, snapEffect, shadowEffect],
    } as RenderableComponentData;
  });

  // Root container with perspective for 3D effect
  const rootContainer: RenderableComponentData = {
    id: 'magnetic-typokinetics-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: startDelay,
        duration: animationDuration * impactMultiplier * 1.2,
      },
    },
    childrenData: [
      {
        id: 'magnetic-text-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative flex flex-row items-center justify-center',
            style: {
              gap: `${fontSize * 0.1}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: animationDuration * impactMultiplier * 1.1,
          },
        },
        childrenData: characterComponents,
      } as RenderableComponentData,
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'magnetic-typokinetics',
  title: 'Magnetic Typokinetics',
  description: 'Animated typography preset mimicking magnetic letter attraction with curved motion paths, rotation during travel, and satisfying snap-into-place effects. Characters start scattered in circular distribution and accelerate toward final positions following bezier curves with inverse-square acceleration simulation. Features spin animations, scale bounce on snap, and subtle shadow pulse on lock.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'magnetic',
    'animation',
    'text',
    'attraction',
    'physics',
    'stop-motion',
    'curved-paths',
    'rotation',
    'snap',
    'bounce',
  ],
  defaultInputParams: {
    text: 'MAGNETIC',
    fontSize: 64,
    textColor: '#ffffff',
    font: 'Inter:700',
    scatterRadius: 100,
    animationDuration: 1.2,
    impactMultiplier: 1,
    rotationIntensity: 'single',
    startDelay: 0,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const magneticTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
