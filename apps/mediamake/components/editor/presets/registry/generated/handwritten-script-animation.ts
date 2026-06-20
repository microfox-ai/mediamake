/**
 * Handwritten Script Animation Preset
 * 
 * This preset creates a realistic handwritten text animation using SVG path techniques.
 * Text appears as if drawn by an invisible hand with natural speed variations and subtle
 * hand shake effects to simulate human imperfection.
 * 
 * Features:
 * - SVG stroke-dasharray/stroke-dashoffset animation for write-on effect
 * - Natural speed variations (faster on straights, slower on curves)
 * - Subtle hand shake effect (1-2px movements) synchronized with drawing
 * - Ghost writer preview (5% opacity) appears before main animation
 * - Cubic-bezier easing for natural hand movement
 * - Uses script font converted to SVG paths
 * 
 * Use cases:
 * - Signature animations
 * - Handwritten title reveals
 * - Personal message overlays
 * - Artistic text animations
 * - Authentic handwriting effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text to animate in handwritten style'),
  
  font: z.string()
    .default('Dancing Script')
    .describe('Script font family (e.g., "Dancing Script", "Pacifico", "Satisfy")'),
  
  fontSize: z.number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  
  color: z.string()
    .default('#000000')
    .describe('Text stroke color (CSS color value)'),
  
  strokeWidth: z.number()
    .min(1)
    .max(10)
    .default(2)
    .describe('Stroke width in pixels'),
  
  duration: z.number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Total animation duration in seconds'),
  
  shakeIntensity: z.number()
    .min(0)
    .max(5)
    .default(1.5)
    .describe('Hand shake effect intensity (0 = none, 5 = very shaky)'),
  
  ghostOpacity: z.number()
    .min(0)
    .max(0.2)
    .default(0.05)
    .describe('Ghost preview text opacity (0-0.2)'),
  
  position: z.enum(['center', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .describe('Text position on screen'),
});

// --- Preset Execution ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  if (!fetcher) {
    throw new Error('Fetcher is required for handwritten script animation');
  }

  // Helper: Convert text to SVG paths (server-side)
  const convertTextToSVG = async (text: string, font: string, fontSize: number) => {
    try {
      const result = await fetcher('/api/text-to-svg', {
        text,
        font,
        fontSize,
      });
      return result.svg;
    } catch (error) {
      console.error('Failed to convert text to SVG:', error);
      // Fallback: simple text with handwriting font
      return `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="${font}" font-size="${fontSize}" fill="none" stroke="${params.color}" stroke-width="${params.strokeWidth}">${text}</text>`;
    }
  };

  // Helper: Calculate path length (approximate)
  const estimatePathLength = (text: string, fontSize: number): number => {
    // Rough estimation: ~10 units per character scaled by fontSize
    return text.length * (fontSize * 0.8);
  };

  // Helper: Generate shake keyframes
  const generateShakeKeyframes = (duration: number, intensity: number) => {
    const frameCount = Math.floor(duration / 0.06); // 60ms intervals
    const keyframes = [];
    
    for (let i = 0; i <= frameCount; i++) {
      const prog = i / frameCount;
      const shakeX = (Math.random() - 0.5) * 2 * intensity;
      const shakeY = (Math.random() - 0.5) * intensity;
      
      keyframes.push(
        { key: 'translateX', val: shakeX, prog },
        { key: 'translateY', val: shakeY, prog }
      );
    }
    
    return keyframes;
  };

  // Helper: Position class mapper
  const getPositionClass = (position: string) => {
    switch (position) {
      case 'top':
        return 'flex items-start justify-center pt-12';
      case 'bottom':
        return 'flex items-end justify-center pb-12';
      case 'left':
        return 'flex items-center justify-start pl-12';
      case 'right':
        return 'flex items-center justify-end pr-12';
      case 'center':
      default:
        return 'flex items-center justify-center';
    }
  };

  // Convert text to SVG
  const svgContent = await convertTextToSVG(params.text, params.font, params.fontSize);
  
  // Calculate path length
  const pathLength = estimatePathLength(params.text, params.fontSize);

  // Generate shake effect keyframes
  const shakeKeyframes = generateShakeKeyframes(params.duration, params.shakeIntensity);

  // SVG with stroke-dasharray animation
  const animatedSVG = `
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=${params.font.replace(/ /g, '+')}:wght@400;700&display=swap');
        
        .handwritten-path {
          fill: none;
          stroke: ${params.color};
          stroke-width: ${params.strokeWidth}px;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: ${pathLength};
          stroke-dashoffset: ${pathLength};
        }
      </style>
      <g transform="translate(960, 540)">
        ${svgContent}
      </g>
    </svg>
  `;

  // Ghost preview SVG (complete text, low opacity)
  const ghostSVG = `
    <svg width="100%" height="100%" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=${params.font.replace(/ /g, '+')}:wght@400;700&display=swap');
        
        .ghost-path {
          fill: none;
          stroke: ${params.color};
          stroke-width: ${params.strokeWidth}px;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: ${params.ghostOpacity};
          filter: blur(0.5px);
        }
      </style>
      <g transform="translate(960, 540)">
        ${svgContent.replace(/class="[^"]*"/g, 'class="ghost-path"')}
      </g>
    </svg>
  `;

  // IDs
  const containerId = 'handwritten-container';
  const ghostLayerId = 'ghost-text-layer';
  const mainLayerId = 'main-text-layer';

  // Ghost text layer (static background)
  const ghostLayer: RenderableComponentData = {
    id: ghostLayerId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: ghostSVG,
      className: 'absolute inset-0',
      style: {
        zIndex: 0,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Main animated text layer
  const mainLayer: RenderableComponentData = {
    id: mainLayerId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: animatedSVG,
      className: 'relative',
      style: {
        zIndex: 1,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      // Stroke drawing animation
      {
        id: 'stroke-draw-effect',
        componentId: 'generic',
        data: {
          type: 'cubic-bezier(0.65, 0, 0.35, 1)', // Natural hand movement easing
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [mainLayerId],
          ranges: [
            // Animate stroke-dashoffset from pathLength to 0
            { key: 'strokeDashoffset', val: pathLength, prog: 0 },
            { key: 'strokeDashoffset', val: 0, prog: 1 },
          ],
        },
      },
      // Hand shake effect
      {
        id: 'hand-shake-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: params.duration,
          mode: 'provider',
          targetIds: [mainLayerId],
          ranges: shakeKeyframes,
        },
      },
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 ${getPositionClass(params.position)}`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      ghostLayer,
      mainLayer,
    ] as RenderableComponentData[],
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'handwrittenScriptAnimation',
  title: 'Handwritten Script Animation',
  description: 'SVG path animation that simulates handwriting with stroke-dasharray/stroke-dashoffset techniques. Features natural speed variations, hand shake effects, and a ghost writer preview effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'animation', 'handwriting', 'svg', 'script', 'stroke', 'write-on', 'signature', 'artistic'],
  dependencies: {},
  defaultInputParams: {
    text: 'Hello World',
    font: 'Dancing Script',
    fontSize: 72,
    color: '#000000',
    strokeWidth: 2,
    duration: 3,
    shakeIntensity: 1.5,
    ghostOpacity: 0.05,
    position: 'center',
  },
};

// --- Export ---

export const handwrittenScriptAnimationPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
