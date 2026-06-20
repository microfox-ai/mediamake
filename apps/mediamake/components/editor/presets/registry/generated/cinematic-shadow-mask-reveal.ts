/**
 * Cinematic Typokinetic Drop Shadow Mask Preset
 *
 * This preset creates a dramatic film noir style text reveal effect where text burns through 
 * an animated drop shadow mask. The shadow appears first as a solid black shape, then the 
 * actual text reveals through it like light through darkness, with the shadow softening as 
 * the text becomes fully visible.
 *
 * Features:
 * - Film noir aesthetic with dramatic shadow-to-text reveal
 * - Drop shadow appears first as solid black shape
 * - Text burns through shadow using clip-path circular reveal
 * - Mix-blend-mode: 'screen' creates burn-through effect
 * - Shadow softens (blur + opacity fade) as text completes reveal
 * - Subtle glow effect during burn phase for dramatic impact
 * - Optimized with will-change for smooth clip-path animations
 * - Customizable colors, fonts, and timing
 *
 * Use cases:
 * - Movie titles and opening credits
 * - Dramatic captions and quotes
 * - Impactful text overlays
 * - Theatrical presentations
 * - Film noir style content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('DRAMATIC TITLE')
    .describe('Text to display with cinematic shadow mask reveal'),
  
  // Font configuration
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:900", "Roboto:700:italic")'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Font size in pixels'),
  
  // Colors
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  shadowColor: z
    .string()
    .default('#000000')
    .describe('Drop shadow color (hex or rgba)'),
  backgroundColor: z
    .string()
    .default('transparent')
    .describe('Background color (hex, rgba, or gradient)'),
  
  // Timing configuration
  duration: z
    .number()
    .min(0.5)
    .max(10)
    .default(1.2)
    .describe('Total duration of the effect in seconds'),
  shadowAppearDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.3)
    .describe('Duration of shadow appearance phase in seconds'),
  burnThroughDuration: z
    .number()
    .min(0.2)
    .max(5)
    .default(0.7)
    .describe('Duration of text burn-through phase in seconds'),
  shadowSoftenDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.2)
    .describe('Duration of shadow softening phase in seconds'),
  
  // Effect intensity
  glowIntensity: z
    .number()
    .min(0)
    .max(100)
    .default(40)
    .describe('Maximum glow intensity in pixels during burn phase'),
  shadowBlurAmount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Final blur amount for softened shadow in pixels'),
  shadowFinalOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Final opacity of shadow after softening (0-1)'),
  
  // Positioning
  position: z
    .object({
      top: z.number().optional().describe('Top position (0-100%)'),
      left: z.number().optional().describe('Left position (0-100%)'),
      bottom: z.number().optional().describe('Bottom position (0-100%)'),
      right: z.number().optional().describe('Right position (0-100%)'),
    })
    .optional()
    .describe('Position configuration (defaults to center)'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:900';
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

  // Default font weight if not specified
  if (!fontStyle.fontWeight) {
    fontStyle.fontWeight = 900;
  }

  // Calculate timing phases
  const totalDuration = params.duration;
  const shadowAppearDuration = params.shadowAppearDuration;
  const burnThroughDuration = params.burnThroughDuration;
  const shadowSoftenDuration = params.shadowSoftenDuration;
  
  // Timeline: shadow appears (0-0.3s), text burns (0.3-1s), shadow softens (1-1.2s)
  const shadowAppearStart = 0;
  const burnThroughStart = shadowAppearDuration;
  const shadowSoftenStart = totalDuration - shadowSoftenDuration;

  // Position styling
  const positionStyle: React.CSSProperties = params.position
    ? {
        position: 'absolute',
        top: params.position.top !== undefined ? `${params.position.top}%` : undefined,
        left: params.position.left !== undefined ? `${params.position.left}%` : undefined,
        bottom: params.position.bottom !== undefined ? `${params.position.bottom}%` : undefined,
        right: params.position.right !== undefined ? `${params.position.right}%` : undefined,
      }
    : {};

  // Generate unique IDs
  const containerId = 'cinematic-shadow-mask-container';
  const shadowLayerId = 'shadow-layer';
  const textLayerId = 'text-layer';

  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          background: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      // Shadow layer (appears first as solid black shape)
      {
        id: shadowLayerId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${params.fontSize}px;
            font-weight: ${fontStyle.fontWeight};
            color: ${params.shadowColor};
            text-align: center;
            font-family: ${fontFamily}, sans-serif;
            text-shadow: 0 0 80px ${params.shadowColor};
            ${params.position ? '' : 'position: absolute; inset: 0;'}
          ">${params.text}</div>`,
          className: params.position ? 'absolute' : 'absolute inset-0',
          style: {
            ...positionStyle,
            opacity: 1,
            filter: 'blur(0px)',
            willChange: 'opacity, filter',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
      
      // Text layer (burns through shadow)
      {
        id: textLayerId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: params.text,
          className: params.position ? 'absolute' : 'absolute inset-0 flex items-center justify-center',
          style: {
            ...positionStyle,
            fontSize: params.fontSize,
            fontWeight: fontStyle.fontWeight,
            fontStyle: fontStyle.fontStyle,
            color: params.textColor,
            textAlign: 'center',
            mixBlendMode: 'screen',
            opacity: 0,
            clipPath: 'circle(0% at 50% 50%)',
            willChange: 'clip-path, opacity',
            textShadow: '0 0 0px rgba(255,255,255,0)',
            ...(params.position ? {} : { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }),
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['900'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData,
    ],
    effects: [
      // Effect 1: Shadow appears (0-0.3s)
      {
        id: 'shadow-appear-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: shadowAppearStart,
          duration: shadowAppearDuration,
          mode: 'provider',
          targetIds: [shadowLayerId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      
      // Effect 2: Text burns through via clip-path (0.3-1s)
      {
        id: 'burn-through-mask-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: burnThroughStart,
          duration: burnThroughDuration,
          mode: 'provider',
          targetIds: [textLayerId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'clipPath', val: 'circle(0% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 1 },
          ],
        },
      },
      
      // Effect 3: Text glow during burn (0.3-0.8s)
      {
        id: 'text-glow-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: burnThroughStart,
          duration: burnThroughDuration * 0.7,
          mode: 'provider',
          targetIds: [textLayerId],
          ranges: [
            { key: 'textShadow', val: '0 0 0px rgba(255,255,255,0)', prog: 0 },
            { key: 'textShadow', val: `0 0 ${params.glowIntensity}px rgba(255,255,255,0.8)`, prog: 0.5 },
            { key: 'textShadow', val: `0 0 ${params.glowIntensity / 2}px rgba(255,255,255,0.4)`, prog: 1 },
          ],
        },
      },
      
      // Effect 4: Shadow softens (1-1.2s)
      {
        id: 'shadow-soften-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: shadowSoftenStart,
          duration: shadowSoftenDuration,
          mode: 'provider',
          targetIds: [shadowLayerId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: params.shadowFinalOpacity, prog: 1 },
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${params.shadowBlurAmount}px)`, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

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
  id: 'cinematic-shadow-mask-reveal',
  title: 'Cinematic Typokinetic Drop Shadow Mask',
  description:
    'A dramatic film noir style text reveal effect where text burns through an animated drop shadow mask. The shadow appears first as a solid black shape, then the text reveals through it like light through darkness, with the shadow softening as the text becomes fully visible. Perfect for movie titles, dramatic captions, and impactful quotes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'cinematic',
    'typokinetic',
    'shadow',
    'mask',
    'reveal',
    'dramatic',
    'film-noir',
    'burn-through',
    'title',
    'movie',
    'theatrical',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'DRAMATIC TITLE',
    font: 'Inter:900',
    fontSize: 72,
    textColor: '#ffffff',
    shadowColor: '#000000',
    backgroundColor: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.05))',
    duration: 1.2,
    shadowAppearDuration: 0.3,
    burnThroughDuration: 0.7,
    shadowSoftenDuration: 0.2,
    glowIntensity: 40,
    shadowBlurAmount: 8,
    shadowFinalOpacity: 0.3,
  },
};

// Export preset
export const cinematicShadowMaskRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
