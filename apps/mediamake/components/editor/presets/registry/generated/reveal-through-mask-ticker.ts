/**
 * Reveal-Through-Mask Ticker Preset
 *
 * This preset creates a text reveal animation where text slides through a masked viewport window,
 * similar to a film strip moving through a projector gate. The text itself maintains consistent
 * appearance while moving through a defined rectangular reveal area.
 *
 * Features:
 * - **Mask-Based Reveal**: Text slides through an invisible viewport window with overflow-hidden
 * - **Consistent Appearance**: Text opacity remains constant - only position changes
 * - **Smooth Motion**: Ease-in-out timing for professional acceleration/deceleration
 * - **Complete Pass-Through**: Text animates from fully off-screen right to fully off-screen left
 * - **Configurable Sizing**: Dynamic mask container dimensions (width/height)
 * - **Direction Variants**: Support for horizontal/vertical/diagonal motion via rotation
 * - **Loop Support**: Optional continuous scrolling with configurable loop behavior
 * - **Speed Adaptation**: fitDurationTo scene duration for automatic speed adjustment
 *
 * Use cases:
 * - News tickers and breaking news overlays
 * - Scrolling credits and end-roll sequences
 * - Continuous information displays
 * - Animated marquee text
 * - Film-style text reveals
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  text: z.string().describe('Text content to reveal through the mask'),
  
  // Mask container configuration
  maskWidth: z
    .number()
    .default(384)
    .describe('Width of the mask viewport in pixels (default: 384px)'),
  maskHeight: z
    .number()
    .default(64)
    .describe('Height of the mask viewport in pixels (default: 64px)'),
  
  // Positioning
  position: z
    .object({
      top: z.string().optional().describe('Top position (CSS value, e.g., "50%")'),
      left: z.string().optional().describe('Left position (CSS value, e.g., "50%")'),
      transform: z.string().optional().describe('Transform for centering (e.g., "translate(-50%, -50%)")'),
    })
    .default({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })
    .describe('Position of the mask container on screen'),
  
  // Text styling
  fontSize: z
    .number()
    .default(32)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (CSS color value)'),
  fontWeight: z
    .string()
    .default('600')
    .describe('Font weight (e.g., "400", "600", "700")'),
  font: z
    .string()
    .optional()
    .describe('Font family with optional weight and style (e.g., "Inter:600", "Roboto:700")'),
  
  // Animation configuration
  duration: z
    .number()
    .default(4)
    .describe('Duration of the complete pass-through animation in seconds'),
  timingFunction: z
    .enum(['ease-in-out', 'ease-in', 'ease-out', 'linear'])
    .default('ease-in-out')
    .describe('Easing function for the animation'),
  
  // Direction and rotation
  direction: z
    .enum(['left-to-right', 'right-to-left', 'top-to-bottom', 'bottom-to-top'])
    .default('right-to-left')
    .describe('Direction of text movement through the mask'),
  
  // Loop configuration
  loop: z
    .boolean()
    .default(false)
    .describe('Whether to loop the animation continuously'),
  loopDelay: z
    .number()
    .default(0)
    .describe('Delay between loop iterations in seconds'),
  
  // Timing
  startTime: z
    .number()
    .default(0)
    .describe('Start time of the animation (relative to parent)'),
  fitDurationTo: z
    .string()
    .optional()
    .describe('Component ID to match duration to (e.g., "BaseScene", "audio-track")'),
  
  // Track identification
  trackName: z
    .string()
    .default('ticker-track')
    .describe('Unique identifier for this ticker track'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter';
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
  
  // Determine animation direction and rotation
  const getDirectionConfig = (direction: string) => {
    switch (direction) {
      case 'left-to-right':
        return {
          startX: '-100%',
          endX: '100%',
          startY: '0',
          endY: '0',
          rotation: 0,
        };
      case 'right-to-left':
        return {
          startX: '100%',
          endX: '-100%',
          startY: '0',
          endY: '0',
          rotation: 0,
        };
      case 'top-to-bottom':
        return {
          startX: '0',
          endX: '0',
          startY: '-100%',
          endY: '100%',
          rotation: 0,
        };
      case 'bottom-to-top':
        return {
          startX: '0',
          endX: '0',
          startY: '100%',
          endY: '-100%',
          rotation: 0,
        };
      default:
        return {
          startX: '100%',
          endX: '-100%',
          startY: '0',
          endY: '0',
          rotation: 0,
        };
    }
  };
  
  const directionConfig = getDirectionConfig(params.direction);
  
  // Component IDs
  const maskContainerId = `${params.trackName}-mask-container`;
  const textId = `${params.trackName}-text`;
  const effectId = `${params.trackName}-slide-effect`;
  
  // Calculate timing
  const animationDuration = params.loop 
    ? params.duration + params.loopDelay 
    : params.duration;
  
  // Create sliding text effect
  const slideEffect = {
    id: effectId,
    componentId: 'generic',
    data: {
      type: params.timingFunction,
      start: 0,
      duration: params.duration,
      mode: 'provider',
      targetIds: [textId],
      ranges: [
        { key: 'translateX', val: directionConfig.startX, prog: 0 },
        { key: 'translateX', val: directionConfig.endX, prog: 1 },
        { key: 'translateY', val: directionConfig.startY, prog: 0 },
        { key: 'translateY', val: directionConfig.endY, prog: 1 },
      ],
    },
  };
  
  // Create text atom
  const textAtom = {
    id: textId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'absolute whitespace-nowrap',
      style: {
        fontSize: `${params.fontSize}px`,
        color: params.textColor,
        fontWeight: params.fontWeight,
        ...fontStyle,
        left: '0',
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
      } as React.CSSProperties,
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : { weights: [params.fontWeight] }),
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.fitDurationTo ? undefined : animationDuration,
        ...(params.fitDurationTo && { fitDurationTo: params.fitDurationTo }),
      },
    },
    effects: [slideEffect],
  } as RenderableComponentData;
  
  // Create mask container
  const maskContainer = {
    id: maskContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute overflow-hidden',
        style: {
          width: `${params.maskWidth}px`,
          height: `${params.maskHeight}px`,
          top: params.position.top,
          left: params.position.left,
          transform: params.position.transform,
          ...(directionConfig.rotation !== 0 && {
            rotate: `${directionConfig.rotation}deg`,
          }),
        } as React.CSSProperties,
      },
    },
    context: {
      timing: {
        start: params.startTime,
        duration: params.fitDurationTo ? undefined : animationDuration,
        ...(params.fitDurationTo && { fitDurationTo: params.fitDurationTo }),
      },
    },
    childrenData: [textAtom],
  } as RenderableComponentData;
  
  return {
    output: {
      childrenData: [maskContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'reveal-through-mask-ticker',
  title: 'Reveal-Through-Mask Ticker',
  description:
    'Text reveal animation where text slides through a masked viewport window with smooth ease-in-out motion, perfect for news tickers, scrolling credits, or continuous scrolling effects. Text maintains consistent appearance while moving through a defined rectangular reveal area.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'ticker',
    'reveal',
    'mask',
    'news',
    'credits',
    'scrolling',
    'marquee',
    'film-strip',
    'projector',
  ],
  defaultInputParams: {
    text: 'BREAKING NEWS • Latest updates rolling in • Stay tuned for more information',
    maskWidth: 384,
    maskHeight: 64,
    position: {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    },
    fontSize: 32,
    textColor: '#ffffff',
    fontWeight: '600',
    font: 'Inter:600',
    duration: 4,
    timingFunction: 'ease-in-out',
    direction: 'right-to-left',
    loop: false,
    loopDelay: 0,
    startTime: 0,
    trackName: 'ticker-track',
  },
  dependencies: {},
};

// Export preset
export const revealThroughMaskTickerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
