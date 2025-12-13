/**
 * Speech Bubble Preset
 *
 * Professional comic-style speech bubbles with smooth bezier curves, realistic tails,
 * and dynamic sizing based on text content. Uses SVG paths for authentic appearance.
 *
 * Features:
 * - **Smooth Organic Shapes**: Bezier curves for natural, professional look
 * - **Dynamic Sizing**: Auto-adjusts to text length and line count
 * - **Four Pointer Directions**: up, down, left, right
 * - **Customizable Styling**: Colors, borders, shadows, opacity
 * - **Multiple Styles**: Classic, thought bubble, shouting, etc.
 *
 * Use cases:
 * - Character dialogue in animated videos
 * - Comic-style narratives
 * - Tutorial callouts and explanations
 * - Annotation overlays
 */

import { TextAtomData } from '@microfox/remotion';
import z from 'zod';
import { PresetMetadata, PresetOutput } from '../../types';

const presetParams = z.object({
  // Core content
  dialogueText: z.string().describe('Text content for the speech bubble'),
  
  // Position - where the pointer tip points to
  pointerX: z.number().describe('X coordinate where pointer tip points (pixels)'),
  pointerY: z.number().describe('Y coordinate where pointer tip points (pixels)'),
  
  // Timing
  duration: z.number().default(5).describe('Duration in seconds'),
  startTime: z.number().default(0).describe('Start time in seconds'),
  
  // Pointer configuration
  pointerDirection: z
    .enum(['down', 'up', 'left', 'right'])
    .default('down')
    .describe('Direction the pointer points'),
  pointerSize: z.number().default(40).describe('Length of pointer tail'),
  pointerWidth: z.number().default(30).describe('Width of pointer base'),
  
  // Bubble style
  bubbleStyle: z
    .enum(['classic', 'thought', 'shout', 'rounded', 'comic'])
    .default('classic')
    .describe('Speech bubble style'),
  
  // Appearance
  bubbleColor: z
    .string()
    .default('#FFFFFF')
    .describe('Background color of bubble'),
  borderColor: z.string().default('#000000').describe('Border color'),
  borderWidth: z.number().default(4).describe('Border width in pixels'),
  opacity: z.number().min(0).max(1).default(1).describe('Bubble opacity'),
  
  // Shadow
  shadow: z
    .object({
      enabled: z.boolean().default(true),
      blur: z.number().default(6),
      offsetX: z.number().default(2),
      offsetY: z.number().default(4),
      opacity: z.number().default(0.15),
    })
    .default({ enabled: true, blur: 6, offsetX: 2, offsetY: 4, opacity: 0.15 }),
  
  // Size constraints
  minWidth: z.number().default(200).describe('Minimum bubble width'),
  maxWidth: z.number().default(500).describe('Maximum bubble width'),
  padding: z
    .object({
      x: z.number().default(35),
      y: z.number().default(25),
    })
    .default({ x: 35, y: 25 }),
  
  // Text styling
  textStyle: z
    .object({
      fontSize: z.number().default(20),
      color: z.string().default('#000000'),
      fontFamily: z.string().default('Inter'),
      fontWeight: z.union([z.string(), z.number()]).default('500'),
      lineHeight: z.number().default(1.5),
      textAlign: z.enum(['left', 'center', 'right']).default('center'),
    })
    .default({ fontSize: 20, color: '#000000', fontFamily: 'Inter', fontWeight: '500', lineHeight: 1.5, textAlign: 'center' }),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: any,
): PresetOutput => {
  // Helper function to estimate text dimensions
  const measureText = (text: string, fontSize: number, maxWidth: number) => {
    const avgCharWidth = fontSize * 0.55; // Slightly tighter estimate
    const words = text.split(' ');
    
    let lines = 1;
    let currentLineWidth = 0;
    let maxLineWidth = 0;
    const spaceWidth = avgCharWidth * 0.3;
    
    words.forEach((word, index) => {
      const wordWidth = word.length * avgCharWidth;
      const addSpace = index > 0 ? spaceWidth : 0;
      
      if (currentLineWidth + wordWidth + addSpace > maxWidth && currentLineWidth > 0) {
        lines++;
        maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
        currentLineWidth = wordWidth;
      } else {
        currentLineWidth += wordWidth + addSpace;
      }
    });
    
    maxLineWidth = Math.max(maxLineWidth, currentLineWidth);
    
    return {
      width: Math.max(params.minWidth, Math.min(maxWidth, maxLineWidth + params.padding.x * 2)),
      height: lines * fontSize * params.textStyle.lineHeight + params.padding.y * 2,
      lines: lines,
    };
  };
  
  // Calculate bubble dimensions based on text
  const textMetrics = measureText(
    params.dialogueText,
    params.textStyle.fontSize,
    params.maxWidth - params.padding.x * 2
  );
  
  const bubbleWidth = textMetrics.width;
  const bubbleHeight = textMetrics.height;
  const pointerSize = params.pointerSize;
  const pointerWidth = params.pointerWidth;
  
  // Generate professional speech bubble SVG with smooth bezier curves
  const generateSpeechBubbleSVG = () => {
    const w = bubbleWidth;
    const h = bubbleHeight;
    const ps = pointerSize;
    const pw = pointerWidth;
    const bw = params.borderWidth;
    
    // Shadow filter
    const shadowFilter = params.shadow.enabled
      ? `<filter id="bubble-shadow-${Math.random().toString(36).substr(2, 9)}" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="${params.shadow.blur / 2}"/>
          <feOffset dx="${params.shadow.offsetX}" dy="${params.shadow.offsetY}" result="offsetblur"/>
          <feComponentTransfer>
            <feFuncA type="linear" slope="${params.shadow.opacity}"/>
          </feComponentTransfer>
          <feMerge>
            <feMergeNode/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>`
      : '';
    
    const filterAttr = params.shadow.enabled ? `filter="url(#bubble-shadow-${Math.random().toString(36).substr(2, 9)})"` : '';
    
    // Generate bubble path with smooth bezier curves (similar to professional SVG)
    const generateBubblePath = () => {
      if (params.bubbleStyle === 'thought') {
        // Thought bubble made of overlapping circles
        const cx = w / 2;
        const cy = h / 2;
        const r1 = Math.min(w, h) * 0.28;
        const r2 = Math.min(w, h) * 0.32;
        const r3 = Math.min(w, h) * 0.26;
        const r4 = Math.min(w, h) * 0.30;
        
        return `
          <circle cx="${cx - w * 0.15}" cy="${cy - h * 0.05}" r="${r1}" fill="${params.bubbleColor}" stroke="${params.borderColor}" stroke-width="${bw}"/>
          <circle cx="${cx + w * 0.12}" cy="${cy - h * 0.12}" r="${r2}" fill="${params.bubbleColor}" stroke="${params.borderColor}" stroke-width="${bw}"/>
          <circle cx="${cx + w * 0.15}" cy="${cy + h * 0.08}" r="${r3}" fill="${params.bubbleColor}" stroke="${params.borderColor}" stroke-width="${bw}"/>
          <circle cx="${cx - w * 0.08}" cy="${cy + h * 0.10}" r="${r4}" fill="${params.bubbleColor}" stroke="${params.borderColor}" stroke-width="${bw}"/>
        `;
      }
      
      // Professional organic bubble - smooth curves throughout (scales proportionally)
      // This creates a smooth, organic shape similar to professional comic bubbles
      const cx = w / 2; // center x
      const cy = h / 2; // center y
      const rx = (w - bw * 2) / 2; // horizontal radius
      const ry = (h - bw * 2) / 2; // vertical radius
      
      // Control point offsets for smooth bezier curves (proportional to size)
      const cpx = rx * 0.55; // horizontal control point offset (magic number for smooth curves)
      const cpy = ry * 0.55; // vertical control point offset
      
      return `
        <path d="M ${bw + rx},${bw}
                 C ${bw + rx + cpx},${bw} ${w - bw},${bw + ry - cpy} ${w - bw},${bw + ry}
                 C ${w - bw},${bw + ry + cpy} ${bw + rx + cpx},${h - bw} ${bw + rx},${h - bw}
                 C ${bw + rx - cpx},${h - bw} ${bw},${bw + ry + cpy} ${bw},${bw + ry}
                 C ${bw},${bw + ry - cpy} ${bw + rx - cpx},${bw} ${bw + rx},${bw} Z"
              fill="${params.bubbleColor}"
              stroke="${params.borderColor}"
              stroke-width="${bw}"
              stroke-linejoin="round"/>
      `;
    };
    
    // Generate pointer tail with smooth curves
    const generatePointerPath = () => {
      if (params.bubbleStyle === 'thought') {
        // Small thought clouds instead of pointer
        const clouds = `
          <circle cx="${w / 2 - 5}" cy="${h + 18}" r="12" fill="${params.bubbleColor}" stroke="${params.borderColor}" stroke-width="${bw}"/>
          <circle cx="${w / 2 + 2}" cy="${h + 30}" r="8" fill="${params.bubbleColor}" stroke="${params.borderColor}" stroke-width="${bw}"/>
          <circle cx="${w / 2 + 5}" cy="${h + 40}" r="5" fill="${params.bubbleColor}" stroke="${params.borderColor}" stroke-width="${bw}"/>
        `;
        return clouds;
      }
      
      const mid = w / 2;
      const hw = pw / 2;
      
      switch (params.pointerDirection) {
        case 'down':
          // Smooth curved tail pointing down
          return `
            <path d="M ${mid - hw},${h - bw}
                     Q ${mid - hw * 0.3},${h + ps * 0.6} ${mid},${h + ps}
                     Q ${mid + hw * 0.3},${h + ps * 0.6} ${mid + hw},${h - bw}
                     Q ${mid},${h - bw * 2} ${mid - hw},${h - bw} Z"
                  fill="${params.bubbleColor}"
                  stroke="${params.borderColor}"
                  stroke-width="${bw}"
                  stroke-linejoin="round"/>
          `;
        
        case 'up':
          return `
            <path d="M ${mid - hw},${ps + bw}
                     Q ${mid - hw * 0.3},${ps * 0.4} ${mid},${bw}
                     Q ${mid + hw * 0.3},${ps * 0.4} ${mid + hw},${ps + bw}
                     Q ${mid},${ps + bw * 2} ${mid - hw},${ps + bw} Z"
                  fill="${params.bubbleColor}"
                  stroke="${params.borderColor}"
                  stroke-width="${bw}"
                  stroke-linejoin="round"/>
          `;
        
        case 'left':
          const vMid = h / 2;
          return `
            <path d="M ${ps + bw},${vMid - hw}
                     Q ${ps * 0.4},${vMid - hw * 0.3} ${bw},${vMid}
                     Q ${ps * 0.4},${vMid + hw * 0.3} ${ps + bw},${vMid + hw}
                     Q ${ps + bw * 2},${vMid} ${ps + bw},${vMid - hw} Z"
                  fill="${params.bubbleColor}"
                  stroke="${params.borderColor}"
                  stroke-width="${bw}"
                  stroke-linejoin="round"/>
          `;
        
        case 'right':
          const vMidR = h / 2;
          return `
            <path d="M ${w - ps - bw},${vMidR - hw}
                     Q ${w - ps * 0.4},${vMidR - hw * 0.3} ${w - bw},${vMidR}
                     Q ${w - ps * 0.4},${vMidR + hw * 0.3} ${w - ps - bw},${vMidR + hw}
                     Q ${w - ps - bw * 2},${vMidR} ${w - ps - bw},${vMidR - hw} Z"
                  fill="${params.bubbleColor}"
                  stroke="${params.borderColor}"
                  stroke-width="${bw}"
                  stroke-linejoin="round"/>
          `;
      }
    };
    
    // Calculate SVG viewBox based on pointer direction
    let svgWidth, svgHeight, viewBox;
    switch (params.pointerDirection) {
      case 'down':
        svgWidth = w + bw * 2;
        svgHeight = h + ps + bw * 2;
        viewBox = `0 0 ${svgWidth} ${svgHeight}`;
        break;
      case 'up':
        svgWidth = w + bw * 2;
        svgHeight = h + ps + bw * 2;
        viewBox = `0 0 ${svgWidth} ${svgHeight}`;
        break;
      case 'left':
        svgWidth = w + ps + bw * 2;
        svgHeight = h + bw * 2;
        viewBox = `0 0 ${svgWidth} ${svgHeight}`;
        break;
      case 'right':
        svgWidth = w + ps + bw * 2;
        svgHeight = h + bw * 2;
        viewBox = `0 0 ${svgWidth} ${svgHeight}`;
        break;
      default:
        svgWidth = w + bw * 2;
        svgHeight = h + ps + bw * 2;
        viewBox = `0 0 ${svgWidth} ${svgHeight}`;
    }
    
    return `
      <svg width="${svgWidth}" height="${svgHeight}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        <defs>${shadowFilter}</defs>
        <g opacity="${params.opacity}" ${filterAttr}>
          ${generateBubblePath()}
          ${generatePointerPath()}
        </g>
      </svg>
    `;
  };
  
  // Calculate container position based on pointer direction and location
  const getContainerPosition = () => {
    const dims = getContainerDimensions();
    
    switch (params.pointerDirection) {
      case 'down':
        return {
          left: params.pointerX - dims.width / 2,
          top: params.pointerY - dims.height,
        };
      case 'up':
        return {
          left: params.pointerX - dims.width / 2,
          top: params.pointerY,
        };
      case 'left':
        return {
          left: params.pointerX,
          top: params.pointerY - dims.height / 2,
        };
      case 'right':
        return {
          left: params.pointerX - dims.width,
          top: params.pointerY - dims.height / 2,
        };
    }
  };
  
  const getContainerDimensions = () => {
    const bw = params.borderWidth;
    const ps = pointerSize;
    
    switch (params.pointerDirection) {
      case 'down':
      case 'up':
        return {
          width: bubbleWidth + bw * 2,
          height: bubbleHeight + ps + bw * 2,
        };
      case 'left':
      case 'right':
        return {
          width: bubbleWidth + ps + bw * 2,
          height: bubbleHeight + bw * 2,
        };
    }
  };
  
  // Calculate text padding offset based on pointer direction
  const getTextPaddingOffset = () => {
    const ps = pointerSize;
    switch (params.pointerDirection) {
      case 'down':
        return { paddingBottom: `${ps + 10}px` };
      case 'up':
        return { paddingTop: `${ps + 10}px` };
      case 'left':
        return { paddingLeft: `${ps + 10}px` };
      case 'right':
        return { paddingRight: `${ps + 10}px` };
    }
  };
  
  const position = getContainerPosition();
  const dimensions = getContainerDimensions();
  const textPaddingOffset = getTextPaddingOffset();
  
  return {
    output: {
      childrenData: [
        {
          id: `speech-bubble-${Date.now()}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                left: `${position.left}px`,
                top: `${position.top}px`,
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
              },
            },
          },
          context: {
            timing: {
              start: params.startTime,
              duration: params.duration,
            },
          },
          childrenData: [
            // SVG Bubble
            {
              id: `bubble-svg-${Date.now()}`,
              type: 'atom',
              componentId: 'HTMLBlockAtom',
              data: {
                html: generateSpeechBubbleSVG(),
                className: 'absolute inset-0',
                style: {
                  pointerEvents: 'none',
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: params.duration,
                },
              },
            },
            // Text Content
            {
              id: `bubble-text-${Date.now()}`,
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: params.dialogueText,
                className: 'absolute inset-0 flex items-center justify-center',
                style: {
                  fontSize: params.textStyle.fontSize,
                  color: params.textStyle.color,
                  fontWeight: params.textStyle.fontWeight,
                  lineHeight: params.textStyle.lineHeight,
                  textAlign: params.textStyle.textAlign,
                  padding: `${params.padding.y}px ${params.padding.x}px`,
                  wordWrap: 'break-word',
                  ...textPaddingOffset,
                },
                font: {
                  family: params.textStyle.fontFamily,
                  weights: ['400', '500', '600', '700'],
                },
              } as TextAtomData,
              context: {
                timing: {
                  start: 0,
                  duration: params.duration,
                },
              },
            },
          ],
        },
      ],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'speechBubble',
  title: 'Speech Bubble',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'overlay', 'dialogue', 'comic', 'speech', 'bubble', 'callout'],
  defaultInputParams: {
    dialogueText: 'Hello! This is a speech bubble.',
    pointerX: 540,
    pointerY: 700,
    duration: 5,
    startTime: 0,
    pointerDirection: 'down',
    bubbleStyle: 'classic',
  },
};

export const speechBubble = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};

