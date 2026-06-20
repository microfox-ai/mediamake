/**
 * Perspective Drift Typokinetics Preset
 *
 * Creates a sophisticated 3D carousel-style text animation where text appears to drift along
 * an invisible curved path in 3D space. The text moves horizontally while simultaneously
 * animating along a Z-axis sine wave, creating the illusion of movement along the inside
 * of a rotating cylinder. Combined with subtle Y-axis rotation and synchronized scaling,
 * this produces an elegant dimensional text reveal effect.
 *
 * Features:
 * - Horizontal translation (right to left) combined with Z-axis depth movement
 * - Sine wave pattern for translateZ (0 → 100px → 0) creates curved path illusion
 * - Subtle rotateY animation (15deg → -15deg) for gentle turning effect
 * - Synchronized scale animation (0.9 → 1.1 → 0.9) amplifies depth perception
 * - Depth-of-field blur based on Z position for enhanced realism
 * - Ultra-thin Raleway typography maintains elegant aesthetic
 * - Perspective container with 600px perspective for dimensional interest
 *
 * Technical Implementation:
 * - Root perspective container with perspective: 600px and perspective-origin: center
 * - Text element with transform-style: preserve-3d for proper 3D rendering
 * - Compound 3D transform using multiple animation ranges synchronized over duration
 * - Cubic-bezier(0.4, 0, 0.6, 1) easing for smooth acceleration curves
 * - Blur effect ranges synchronized with Z translation for depth of field
 *
 * Use Cases:
 * - Elegant title reveals for premium content
 * - Sophisticated text intros for luxury/tech brands
 * - Dimensional typography for modern presentations
 * - Cinematic text effects for high-end video production
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { GenericEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('PERSPECTIVE DRIFT')
    .describe('Text content to display with 3D drift effect'),
  
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(8)
    .describe('Duration of the complete drift animation in seconds'),
  
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(80)
    .describe('Font size in pixels for the text'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the text (hex or rgba)'),
  
  font: z
    .string()
    .default('Raleway:100')
    .describe('Font family with weight (format: "FontName:weight", e.g., "Raleway:100")'),
  
  perspectiveDistance: z
    .number()
    .min(300)
    .max(1200)
    .default(600)
    .describe('Perspective distance in pixels (affects 3D depth intensity)'),
  
  maxZDepth: z
    .number()
    .min(50)
    .max(200)
    .default(100)
    .describe('Maximum Z-axis translation in pixels (depth of sine wave)'),
  
  rotationRange: z
    .number()
    .min(5)
    .max(45)
    .default(15)
    .describe('Maximum Y-axis rotation angle in degrees (subtle turn effect)'),
  
  scaleRange: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .describe('Scale variation amount (e.g., 0.1 means scale varies from 0.9 to 1.1)'),
  
  maxBlur: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('Maximum blur amount in pixels for depth of field effect'),
  
  easingType: z
    .enum(['linear', 'ease-in', 'ease-out', 'ease-in-out', 'spring'])
    .default('ease-in-out')
    .describe('Easing function for the animation'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Raleway:100';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0] || 'Raleway';
  const fontWeight = fontParts[1] || '100';

  // Generate unique IDs
  const containerId = 'perspective-drift-container';
  const textElementId = 'perspective-drift-text';
  const driftEffectId = 'perspective-drift-3d-effect';

  // Calculate scale bounds
  const scaleMin = 1 - params.scaleRange;
  const scaleMax = 1 + params.scaleRange;

  // Create compound 3D transform effect
  // Synchronized animations:
  // - translateX: 50vw → -50vw (horizontal drift right to left)
  // - translateZ: 0 → maxZDepth → 0 (sine wave depth, peaks at middle)
  // - rotateY: rotationRange → -rotationRange (subtle turn)
  // - scale: scaleMin → scaleMax → scaleMin (synchronized with Z movement)
  // - blur: 0 → maxBlur → 0 (depth of field based on Z position)
  
  const driftEffectData: GenericEffectData = {
    type: params.easingType,
    start: 0,
    duration: params.duration,
    mode: 'provider',
    targetIds: [textElementId],
    ranges: [
      // Horizontal translation (right to left)
      { key: 'translateX', val: '50vw', prog: 0 },
      { key: 'translateX', val: 0, prog: 0.5 },
      { key: 'translateX', val: '-50vw', prog: 1 },
      
      // Z-axis depth (sine wave: 0 → peak → 0)
      { key: 'translateZ', val: 0, prog: 0 },
      { key: 'translateZ', val: params.maxZDepth, prog: 0.5 },
      { key: 'translateZ', val: 0, prog: 1 },
      
      // Y-axis rotation (subtle turn)
      { key: 'rotateY', val: params.rotationRange, prog: 0 },
      { key: 'rotateY', val: 0, prog: 0.5 },
      { key: 'rotateY', val: -params.rotationRange, prog: 1 },
      
      // Scale synchronized with Z movement
      { key: 'scale', val: scaleMin, prog: 0 },
      { key: 'scale', val: scaleMax, prog: 0.5 },
      { key: 'scale', val: scaleMin, prog: 1 },
      
      // Depth of field blur (synchronized with Z position)
      { key: 'blur', val: '0px', prog: 0 },
      { key: 'blur', val: `${params.maxBlur}px`, prog: 0.5 },
      { key: 'blur', val: '0px', prog: 1 },
    ],
  };

  const driftEffect = {
    id: driftEffectId,
    componentId: 'generic',
    data: driftEffectData,
  };

  // Text atom component
  const textElement = {
    id: textElementId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        fontWeight: fontWeight,
        whiteSpace: 'nowrap' as const,
        textAlign: 'center' as const,
        letterSpacing: '0.05em',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [driftEffect],
  } as RenderableComponentData;

  // Perspective container
  const perspectiveContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          perspective: `${params.perspectiveDistance}px`,
          perspectiveOrigin: 'center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textElement],
  } as RenderableComponentData;

  // Return output
  return {
    output: {
      childrenData: [perspectiveContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'perspective-drift-typokinetics',
  title: 'Perspective Drift Typokinetics',
  description:
    'Sophisticated 3D carousel-style text animation where text drifts along an invisible curved path in 3D space. Features horizontal translation combined with Z-axis sine wave movement, subtle rotateY turn, and synchronized scaling to create depth. Uses ultra-thin Raleway typography with depth-of-field blur based on Z position for an elegant, dimensional text reveal effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    '3d',
    'perspective',
    'drift',
    'carousel',
    'depth',
    'rotation',
    'scale',
    'blur',
    'elegant',
    'dimensional',
    'modern',
    'premium',
    'cinematic',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'PERSPECTIVE DRIFT',
    duration: 8,
    fontSize: 80,
    textColor: '#FFFFFF',
    font: 'Raleway:100',
    perspectiveDistance: 600,
    maxZDepth: 100,
    rotationRange: 15,
    scaleRange: 0.1,
    maxBlur: 3,
    easingType: 'ease-in-out',
  },
};

// Export preset
export const perspectiveDriftTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
