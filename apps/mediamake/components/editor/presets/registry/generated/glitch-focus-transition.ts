/**
 * Glitch Focus Transition Preset
 *
 * A glitch-inspired focus transition where text appears to struggle through digital
 * interference before achieving clarity. Picture a corrupted video signal gradually
 * stabilizing - the text flickers between blurry and sharp states with digital artifacts.
 *
 * Features:
 * - Datamosh-style RGB channel separation (red, green, blue channels momentarily desync)
 * - CRT-style scan lines that roll through the text during the blur phase
 * - Stuttered autofocus effect (hunting for correct focal point)
 * - Brief overshoot moments where text becomes too sharp before settling
 * - Diminishing static noise texture as focus improves
 * - Black background for maximum glitch contrast
 *
 * Perfect for:
 * - Tech/gaming content with edgy aesthetics
 * - Brand messaging requiring digital/glitch themes
 * - Cyberpunk or futuristic video intros
 * - Social media content targeting tech-savvy audiences
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
  text: z.string().describe('The text content to display with glitch focus effect'),
  duration: z
    .number()
    .min(0.5)
    .max(5)
    .default(1.8)
    .describe('Total duration of the glitch focus transition in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(200)
    .default(64)
    .describe('Font size of the text in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (format: "FontName" or "FontName:weight")'),
  fontWeight: z
    .number()
    .min(100)
    .max(900)
    .default(900)
    .describe('Font weight of the text (100-900)'),
  rgbSeparation: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Maximum RGB channel separation distance in pixels'),
  blurIntensity: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum blur intensity in pixels during glitch phase'),
  noiseOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Initial opacity of the static noise overlay'),
  scanlineSpeed: z
    .number()
    .min(0.5)
    .max(2)
    .default(1.2)
    .describe('Speed multiplier for scan line movement'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontSize,
    fontFamily,
    fontWeight,
    rgbSeparation,
    blurIntensity,
    noiseOpacity,
    scanlineSpeed,
  } = params;

  // Parse font family (format: "FontName" or "FontName:weight")
  const parseFontFamily = (fontString: string) => {
    if (fontString.includes(':')) {
      const [family] = fontString.split(':');
      return family;
    }
    return fontString;
  };

  const actualFontFamily = parseFontFamily(fontFamily);

  // Calculate scanline duration based on speed
  const scanlineDuration = duration * 0.67 * scanlineSpeed; // 67% of total duration

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'glitch-focus-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black flex items-center justify-center overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [
      // Noise overlay (diminishes as focus improves)
      {
        id: 'noise-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: 'noise-fade',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['noise-overlay'],
              ranges: [
                { key: 'opacity', val: noiseOpacity, prog: 0 },
                { key: 'opacity', val: noiseOpacity * 0.75, prog: 0.3 },
                { key: 'opacity', val: noiseOpacity * 0.4, prog: 0.7 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: 'noise-block',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: "<div style='width:100%;height:100%;background:repeating-linear-gradient(0deg,rgba(255,255,255,0.03) 0px,transparent 1px,transparent 2px,rgba(255,255,255,0.03) 3px),repeating-linear-gradient(90deg,rgba(255,255,255,0.03) 0px,transparent 1px,transparent 2px,rgba(255,255,255,0.03) 3px);'></div>",
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
          },
        ],
      } as RenderableComponentData,
      // Scanline overlay (rolls through text during blur phase)
      {
        id: 'scanline-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: scanlineDuration,
          },
        },
        effects: [
          {
            id: 'scanline-opacity-fade',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: scanlineDuration,
              mode: 'provider',
              targetIds: ['scanline-overlay'],
              ranges: [
                { key: 'opacity', val: 0.6, prog: 0 },
                { key: 'opacity', val: 0.4, prog: 0.5 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          {
            id: 'scanline-block',
            type: 'atom',
            componentId: 'HTMLBlockAtom',
            data: {
              html: "<div style='width:100%;height:3px;background:linear-gradient(to bottom,transparent,rgba(255,255,255,0.8),transparent);box-shadow:0 0 10px rgba(255,255,255,0.5);'></div>",
            },
            context: {
              timing: {
                start: 0,
                duration: scanlineDuration,
              },
            },
            effects: [
              {
                id: 'scanline-move',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: scanlineDuration,
                  mode: 'provider',
                  targetIds: ['scanline-block'],
                  ranges: [
                    { key: 'translateY', val: -100, prog: 0 },
                    { key: 'translateY', val: 100, prog: 1 },
                  ],
                },
              },
            ],
          },
        ],
      } as RenderableComponentData,
      // RGB container (holds three color-separated text layers)
      {
        id: 'rgb-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
            style: {
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          // Brightness spikes during glitch moments
          {
            id: 'brightness-spike',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['rgb-container'],
              ranges: [
                { key: 'filter:brightness', val: 1.4, prog: 0 },
                { key: 'filter:brightness', val: 1.2, prog: 0.25 },
                { key: 'filter:brightness', val: 1.5, prog: 0.45 },
                { key: 'filter:brightness', val: 1.1, prog: 0.65 },
                { key: 'filter:brightness', val: 1.3, prog: 0.75 },
                { key: 'filter:brightness', val: 1, prog: 1 },
              ],
            },
          },
          // Contrast spikes during glitch moments
          {
            id: 'contrast-spike',
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: duration,
              mode: 'provider',
              targetIds: ['rgb-container'],
              ranges: [
                { key: 'filter:contrast', val: 0.7, prog: 0 },
                { key: 'filter:contrast', val: 0.85, prog: 0.3 },
                { key: 'filter:contrast', val: 1.2, prog: 0.55 },
                { key: 'filter:contrast', val: 0.95, prog: 0.75 },
                { key: 'filter:contrast', val: 1, prog: 1 },
              ],
            },
          },
        ],
        childrenData: [
          // Red channel (separated left/negative X)
          {
            id: 'text-red',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: text,
              className: 'absolute font-bold',
              style: {
                fontSize: `${fontSize}px`,
                color: '#ff0000',
                textShadow: '0 0 20px rgba(255,0,0,0.8)',
                fontWeight: fontWeight,
              },
              font: {
                family: actualFontFamily,
                weights: [fontWeight.toString()],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: 'red-glitch',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['text-red'],
                  ranges: [
                    { key: 'translateX', val: -rgbSeparation, prog: 0 },
                    { key: 'translateX', val: -rgbSeparation * 0.625, prog: 0.15 },
                    { key: 'translateX', val: -rgbSeparation * 0.75, prog: 0.3 },
                    { key: 'translateX', val: -rgbSeparation * 0.375, prog: 0.5 },
                    { key: 'translateX', val: -rgbSeparation * 0.25, prog: 0.7 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
              {
                id: 'red-blur',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['text-red'],
                  ranges: [
                    { key: 'filter:blur', val: blurIntensity, prog: 0 },
                    { key: 'filter:blur', val: blurIntensity * 0.53, prog: 0.2 },
                    { key: 'filter:blur', val: blurIntensity * 0.8, prog: 0.35 },
                    { key: 'filter:blur', val: blurIntensity * 0.27, prog: 0.55 },
                    { key: 'filter:blur', val: blurIntensity * 0.4, prog: 0.7 },
                    { key: 'filter:blur', val: blurIntensity * 0.07, prog: 0.85 },
                    { key: 'filter:blur', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // Green channel (separated up/positive Y)
          {
            id: 'text-green',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: text,
              className: 'absolute font-bold',
              style: {
                fontSize: `${fontSize}px`,
                color: '#00ff00',
                textShadow: '0 0 20px rgba(0,255,0,0.8)',
                fontWeight: fontWeight,
              },
              font: {
                family: actualFontFamily,
                weights: [fontWeight.toString()],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: 'green-glitch',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['text-green'],
                  ranges: [
                    { key: 'translateY', val: rgbSeparation * 0.75, prog: 0 },
                    { key: 'translateY', val: rgbSeparation * 0.5, prog: 0.2 },
                    { key: 'translateY', val: rgbSeparation * 0.625, prog: 0.4 },
                    { key: 'translateY', val: rgbSeparation * 0.25, prog: 0.6 },
                    { key: 'translateY', val: rgbSeparation * 0.125, prog: 0.8 },
                    { key: 'translateY', val: 0, prog: 1 },
                  ],
                },
              },
              {
                id: 'green-blur',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['text-green'],
                  ranges: [
                    { key: 'filter:blur', val: blurIntensity, prog: 0 },
                    { key: 'filter:blur', val: blurIntensity * 0.67, prog: 0.15 },
                    { key: 'filter:blur', val: blurIntensity * 0.4, prog: 0.4 },
                    { key: 'filter:blur', val: blurIntensity * 0.53, prog: 0.5 },
                    { key: 'filter:blur', val: blurIntensity * 0.2, prog: 0.65 },
                    { key: 'filter:blur', val: blurIntensity * 0.13, prog: 0.8 },
                    { key: 'filter:blur', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
          // Blue channel (separated right/positive X)
          {
            id: 'text-blue',
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: text,
              className: 'absolute font-bold',
              style: {
                fontSize: `${fontSize}px`,
                color: '#0000ff',
                textShadow: '0 0 20px rgba(0,0,255,0.8)',
                fontWeight: fontWeight,
              },
              font: {
                family: actualFontFamily,
                weights: [fontWeight.toString()],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: duration,
              },
            },
            effects: [
              {
                id: 'blue-glitch',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['text-blue'],
                  ranges: [
                    { key: 'translateX', val: rgbSeparation * 0.875, prog: 0 },
                    { key: 'translateX', val: rgbSeparation * 0.75, prog: 0.1 },
                    { key: 'translateX', val: rgbSeparation * 0.5, prog: 0.25 },
                    { key: 'translateX', val: rgbSeparation * 0.625, prog: 0.4 },
                    { key: 'translateX', val: rgbSeparation * 0.25, prog: 0.6 },
                    { key: 'translateX', val: rgbSeparation * 0.125, prog: 0.75 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
              {
                id: 'blue-blur',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: duration,
                  mode: 'provider',
                  targetIds: ['text-blue'],
                  ranges: [
                    { key: 'filter:blur', val: blurIntensity, prog: 0 },
                    { key: 'filter:blur', val: blurIntensity * 0.73, prog: 0.18 },
                    { key: 'filter:blur', val: blurIntensity * 0.47, prog: 0.35 },
                    { key: 'filter:blur', val: blurIntensity * 0.6, prog: 0.48 },
                    { key: 'filter:blur', val: blurIntensity * 0.27, prog: 0.62 },
                    { key: 'filter:blur', val: blurIntensity * 0.13, prog: 0.78 },
                    { key: 'filter:blur', val: 0, prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-focus-transition',
  title: 'Glitch Focus Transition',
  description:
    'A glitch-inspired focus transition where text struggles through digital interference before achieving clarity. Features corrupted signal stabilization with flickering blur/sharp states, datamosh-style RGB channel separation, CRT-style scan lines, stuttered autofocus hunting, overshoot moments with visible halos, and diminishing static noise. Perfect for tech/gaming content or edgy brand messaging.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'focus',
    'transition',
    'rgb-split',
    'scanlines',
    'blur',
    'tech',
    'gaming',
    'cyberpunk',
    'datamosh',
    'chromatic-aberration',
    'digital-noise',
  ],
  defaultInputParams: {
    text: 'GLITCH FOCUS',
    duration: 1.8,
    fontSize: 64,
    fontFamily: 'Inter',
    fontWeight: 900,
    rgbSeparation: 8,
    blurIntensity: 15,
    noiseOpacity: 0.4,
    scanlineSpeed: 1.2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchFocusTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};