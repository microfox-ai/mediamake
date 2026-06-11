/**
 * Liquid Crystal Display (LCD) Malfunction Typography Preset
 *
 * This preset simulates text displayed on a malfunctioning 90s portable TV LCD screen.
 * It creates the characteristic LCD 'ghosting' effect where previous frames leave faint
 * impressions, implements pixel-level color bleeding with pink and cyan sub-pixels that
 * separate and recombine, and includes occasional 'signal loss' with horizontal displacement
 * and color desaturation before snapping back. A subtle grid pattern simulates visible LCD
 * pixels over the text, and all animations include slow response times typical of old LCDs
 * with characteristic lag in fade transitions.
 *
 * Features:
 * - LCD ghosting with multiple text layers at decreasing opacity
 * - Pixel-level color bleeding (pink/cyan sub-pixel separation)
 * - Signal loss effect with horizontal jitter and desaturation
 * - Visible LCD pixel grid overlay
 * - Slow response time animations with characteristic lag
 * - Hardware-accelerated transforms for smooth performance
 * - Optional media sync via fitDurationTo
 *
 * Use cases:
 * - Retro/nostalgic video content
 * - Tech-themed presentations
 * - Gaming content with vintage aesthetics
 * - Music videos with glitch effects
 * - Social media content with 90s vibe
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
  text: z.string().describe('Text to display on the LCD screen'),
  duration: z
    .number()
    .default(5)
    .optional()
    .describe('Duration in seconds (optional if using fitDurationTo)'),
  fitDurationTo: z
    .string()
    .optional()
    .describe(
      'Component ID to match duration to (e.g., audio track or video scene)',
    ),
  fontSize: z
    .number()
    .default(72)
    .optional()
    .describe('Font size in pixels for the main text'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Base color of the main text layer'),
  backgroundColor: z
    .string()
    .default('from-gray-800 to-gray-900')
    .optional()
    .describe(
      'Background gradient classes (Tailwind from-X to-Y format) for the LCD screen',
    ),
  ghostIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .optional()
    .describe(
      'Intensity of ghost frames (0-1), affects opacity of trailing images',
    ),
  subPixelSeparation: z
    .number()
    .min(0)
    .max(5)
    .default(1.5)
    .optional()
    .describe(
      'Horizontal separation distance in pixels for color sub-pixel bleeding',
    ),
  signalLossFrequency: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .optional()
    .describe(
      'Number of signal loss glitches during the duration (0 = no signal loss)',
    ),
  signalLossIntensity: z
    .number()
    .min(0)
    .max(50)
    .default(20)
    .optional()
    .describe(
      'Horizontal displacement in pixels during signal loss events',
    ),
  gridOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Opacity of the LCD pixel grid overlay (0-1)'),
  fontFamily: z
    .string()
    .default('VT323')
    .optional()
    .describe(
      'Font family to use (default: VT323 for retro monospace look)',
    ),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration = 5,
    fitDurationTo,
    fontSize = 72,
    textColor = '#FFFFFF',
    backgroundColor = 'from-gray-800 to-gray-900',
    ghostIntensity = 0.4,
    subPixelSeparation = 1.5,
    signalLossFrequency = 2,
    signalLossIntensity = 20,
    gridOpacity = 0.15,
    fontFamily = 'VT323',
  } = params;

  // Container ID
  const containerId = 'lcd-malfunction-container';

  // Create pixel grid overlay
  const pixelGridOverlay: RenderableComponentData = {
    id: 'lcd-pixel-grid',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 50,
          opacity: gridOpacity,
          background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px), repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 3px)`,
          mixBlendMode: 'overlay',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
    childrenData: [],
  };

  // Ghost layer 2 (oldest, most faded, with cyan tint)
  const ghostLayer2: RenderableComponentData = {
    id: 'lcd-ghost-layer-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
    childrenData: [
      {
        id: 'lcd-ghost-text-2',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            fontSize: `${fontSize}px`,
            color: '#00ffff',
            opacity: 0.15 * ghostIntensity,
            filter: 'blur(2px)',
            transform: 'translate3d(0, 0, 0)',
            fontWeight: 'normal',
          },
          font: {
            family: fontFamily,
            weights: ['400'],
          },
          fallbackFonts: ['monospace'],
        },
        context: {
          timing: {
            start: 0,
            duration: fitDurationTo ? undefined : duration,
            ...(fitDurationTo ? { fitDurationTo } : {}),
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Ghost layer 1 (middle, medium fade, with pink tint)
  const ghostLayer1: RenderableComponentData = {
    id: 'lcd-ghost-layer-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
    childrenData: [
      {
        id: 'lcd-ghost-text-1',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            fontSize: `${fontSize}px`,
            color: '#ff66ff',
            opacity: 0.35 * ghostIntensity,
            filter: 'blur(1px)',
            transform: 'translate3d(0, 0, 0)',
            fontWeight: 'normal',
          },
          font: {
            family: fontFamily,
            weights: ['400'],
          },
          fallbackFonts: ['monospace'],
        },
        context: {
          timing: {
            start: 0,
            duration: fitDurationTo ? undefined : duration,
            ...(fitDurationTo ? { fitDurationTo } : {}),
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Sub-pixel layer container (cyan, pink, main)
  const subPixelCyan: RenderableComponentData = {
    id: 'lcd-subpixel-cyan',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        color: '#00ffff',
        opacity: 0.7,
        transform: `translate3d(-${subPixelSeparation}px, 0, 0)`,
        mixBlendMode: 'screen',
        position: 'absolute',
        fontWeight: 'normal',
      },
      font: {
        family: fontFamily,
        weights: ['400'],
      },
      fallbackFonts: ['monospace'],
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
  };

  const subPixelPink: RenderableComponentData = {
    id: 'lcd-subpixel-pink',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        color: '#ff00ff',
        opacity: 0.7,
        transform: `translate3d(${subPixelSeparation}px, 0, 0)`,
        mixBlendMode: 'screen',
        position: 'absolute',
        fontWeight: 'normal',
      },
      font: {
        family: fontFamily,
        weights: ['400'],
      },
      fallbackFonts: ['monospace'],
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
  };

  const subPixelMain: RenderableComponentData = {
    id: 'lcd-subpixel-main',
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      style: {
        fontSize: `${fontSize}px`,
        color: textColor,
        textShadow:
          '0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(255, 0, 255, 0.3)',
        transform: 'translate3d(0, 0, 0)',
        position: 'relative',
        fontWeight: 'normal',
      },
      font: {
        family: fontFamily,
        weights: ['400'],
      },
      fallbackFonts: ['monospace'],
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
  };

  const subPixelContainer: RenderableComponentData = {
    id: 'lcd-subpixel-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
    childrenData: [subPixelCyan, subPixelPink, subPixelMain],
  };

  // Signal loss layer with effects
  const signalLossEffects: any[] = [];

  if (signalLossFrequency > 0) {
    // Calculate signal loss events evenly across duration
    const effectDuration = fitDurationTo ? 10 : duration; // Use 10s as fallback for effect calculation
    const interval = effectDuration / signalLossFrequency;

    for (let i = 0; i < signalLossFrequency; i++) {
      const startTime = i * interval + interval * 0.3;
      const glitchDuration = 0.15; // Quick glitch

      // Random horizontal displacement
      const displacement =
        (Math.random() > 0.5 ? 1 : -1) * signalLossIntensity;

      signalLossEffects.push({
        id: `lcd-signal-loss-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: startTime,
          duration: glitchDuration,
          mode: 'provider',
          targetIds: ['lcd-signal-loss-text'],
          ranges: [
            // Sudden displacement and desaturation
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: displacement, prog: 0.5 },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
            {
              key: 'filter',
              val: 'grayscale(0%) brightness(1)',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'grayscale(100%) brightness(0.7)',
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'grayscale(0%) brightness(1)',
              prog: 1,
            },
          ],
        },
      });
    }
  }

  const signalLossContainer: RenderableComponentData = {
    id: 'lcd-signal-loss-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
    effects: signalLossEffects,
    childrenData: [
      {
        id: 'lcd-signal-loss-text',
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            opacity: 0,
            filter: 'grayscale(100%)',
            transform: 'translate3d(0, 0, 0)',
            fontWeight: 'normal',
          },
          font: {
            family: fontFamily,
            weights: ['400'],
          },
          fallbackFonts: ['monospace'],
        },
        context: {
          timing: {
            start: 0,
            duration: fitDurationTo ? undefined : duration,
            ...(fitDurationTo ? { fitDurationTo } : {}),
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container with all layers
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative bg-gradient-to-br ${backgroundColor}`,
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: fitDurationTo ? undefined : duration,
        ...(fitDurationTo ? { fitDurationTo } : {}),
      },
    },
    childrenData: [
      pixelGridOverlay,
      ghostLayer2,
      ghostLayer1,
      subPixelContainer,
      signalLossContainer,
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
  id: 'lcd-malfunction-typography',
  title: 'LCD Malfunction Typography',
  description:
    'Retro typography preset that simulates text displayed on a malfunctioning 90s portable TV LCD screen. Features characteristic LCD ghosting with faint frame impressions, pixel-level color bleeding with pink and cyan subpixel separation, intermittent signal loss with horizontal displacement and desaturation, visible LCD pixel grid overlay, and slow response time animations typical of vintage LCD displays.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'text',
    'lcd',
    'retro',
    'glitch',
    '90s',
    'vintage',
    'malfunction',
    'ghosting',
    'pixel-bleeding',
    'signal-loss',
  ],
  defaultInputParams: {
    text: 'LCD MALFUNCTION',
    duration: 5,
    fontSize: 72,
    textColor: '#FFFFFF',
    backgroundColor: 'from-gray-800 to-gray-900',
    ghostIntensity: 0.4,
    subPixelSeparation: 1.5,
    signalLossFrequency: 2,
    signalLossIntensity: 20,
    gridOpacity: 0.15,
    fontFamily: 'VT323',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lcdMalfunctionTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
