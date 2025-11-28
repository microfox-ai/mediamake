/**
 * Gradient Atmosphere Background Preset
 *
 * A cinematic gradient background preset featuring slow-evolving multi-stop gradients
 * that create atmospheric color flows like golden hour transitioning to blue hour.
 * The gradient angle rotates slowly (0° to 360°) while 3-5 color stops morph independently
 * using smooth bezier curves.
 *
 * Features:
 * - **Multi-Stop Gradients**: 3-5 color stops that morph independently
 * - **Gradient Rotation**: Angle rotates from 0° to 360° over the full duration
 * - **Atmospheric Color Palettes**: Golden hour, blue hour, twilight, aurora themes
 * - **Smooth Bezier Transitions**: Organic color flows with ease-in-out curves
 * - **Cinematic Vignette**: Optional overlay for depth and focus
 * - **SubtitlesOverlay Integration**: Words appear with glow effects matching gradient
 *
 * Use Cases:
 * - Video editor color grading layers
 * - Hypnotic backdrops for text reveals
 * - Atmospheric backgrounds for music videos
 * - Cinematic mood setting for presentations
 */

import z from 'zod';
import type { RenderableComponentData } from '@microfox/datamotion';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';

// Define color palette presets
const colorPalettes = {
  goldenHour: {
    colors: ['#1a0a2e', '#4a1a3d', '#8b3a4c', '#c97b3b', '#f4d35e'],
    name: 'Golden Hour',
  },
  blueHour: {
    colors: ['#0a0a1e', '#1a2a4e', '#2a4a6e', '#4a6a8e', '#6a8aae'],
    name: 'Blue Hour',
  },
  twilight: {
    colors: ['#1a0a2e', '#2d1b4e', '#4a2c6e', '#7b3f9e', '#a855f7'],
    name: 'Twilight',
  },
  aurora: {
    colors: ['#0a1a0a', '#1a3a2a', '#2a5a4a', '#4a8a6a', '#6aba8a'],
    name: 'Aurora',
  },
  sunset: {
    colors: ['#1a0a1a', '#3a1a2a', '#6a2a3a', '#9a4a4a', '#ca6a5a'],
    name: 'Sunset',
  },
  ocean: {
    colors: ['#0a1a2a', '#1a2a4a', '#2a4a6a', '#3a6a8a', '#4a8aaa'],
    name: 'Ocean',
  },
  forest: {
    colors: ['#0a1a0a', '#1a2a1a', '#2a4a2a', '#3a6a3a', '#4a8a4a'],
    name: 'Forest',
  },
  cosmic: {
    colors: ['#0a0a1a', '#1a1a3a', '#2a2a5a', '#4a3a7a', '#6a4a9a'],
    name: 'Cosmic',
  },
} as const;

type PaletteKey = keyof typeof colorPalettes;

const presetParams = z.object({
  palette: z
    .enum([
      'goldenHour',
      'blueHour',
      'twilight',
      'aurora',
      'sunset',
      'ocean',
      'forest',
      'cosmic',
    ])
    .default('twilight')
    .describe(
      'Color palette theme for the gradient atmosphere (e.g., goldenHour, blueHour, twilight)',
    ),
  secondaryPalette: z
    .enum([
      'goldenHour',
      'blueHour',
      'twilight',
      'aurora',
      'sunset',
      'ocean',
      'forest',
      'cosmic',
      'none',
    ])
    .default('none')
    .describe(
      'Secondary palette to transition to mid-way through the duration. Set to "none" to disable.',
    ),
  rotationSpeed: z
    .number()
    .min(0)
    .max(3)
    .default(1)
    .describe(
      'Speed multiplier for gradient angle rotation (0 = no rotation, 1 = full 360° rotation)',
    ),
  colorShiftSpeed: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Speed multiplier for color morphing transitions'),
  enableVignette: z
    .boolean()
    .default(true)
    .describe('Enable dark vignette overlay for cinematic depth'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Intensity of the vignette overlay (0-1)'),
  enableSubtitles: z
    .boolean()
    .default(false)
    .describe('Enable subtitles overlay with gradient-matching glow'),
  captions: z
    .array(z.any())
    .optional()
    .describe('Caption data array for subtitles (TranscriptionSentence format)'),
  subtitlePosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of subtitles on screen'),
  subtitleFontSize: z
    .number()
    .min(12)
    .max(200)
    .default(48)
    .describe('Font size for subtitle text in pixels'),
  subtitleFont: z
    .string()
    .default('Inter:700')
    .describe(
      'Font for subtitles in format "FontName:weight:style" (e.g., "Inter:700", "Roboto:600:italic")',
    ),
  glowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(0.8)
    .describe('Intensity of the glow effect on subtitle words'),
  duration: z
    .number()
    .min(1)
    .default(30)
    .describe('Total duration of the gradient animation in seconds'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    palette,
    secondaryPalette,
    rotationSpeed,
    colorShiftSpeed,
    enableVignette,
    vignetteIntensity,
    enableSubtitles,
    captions,
    subtitlePosition,
    subtitleFontSize,
    subtitleFont,
    glowIntensity,
    duration,
  } = params;

  // Helper: Get color palette by key
  const getPalette = (key: PaletteKey): readonly string[] => {
    const paletteData =
      colorPalettes[key] || colorPalettes.twilight;
    return paletteData.colors;
  };

  // Helper: Interpolate between two colors
  const interpolateColor = (
    color1: string,
    color2: string,
    t: number,
  ): string => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');

    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);

    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };

  // Helper: Parse font string
  const parseFont = (fontString: string) => {
    const parts = fontString.split(':');
    const family = parts[0] || 'Inter';
    const weight = parts[1] ? parseInt(parts[1], 10) : 400;
    const style = parts[2] || 'normal';
    return { family, weight, style };
  };

  // Helper: Get position styles for subtitles
  const getSubtitlePositionStyles = (position: string) => {
    switch (position) {
      case 'top':
        return 'top-[10%]';
      case 'center':
        return 'top-1/2 -translate-y-1/2';
      case 'bottom':
      default:
        return 'bottom-[10%]';
    }
  };

  const primaryColors = getPalette(palette as PaletteKey);
  const secondaryColors =
    secondaryPalette !== 'none'
      ? getPalette(secondaryPalette as PaletteKey)
      : primaryColors;

  const fps = props.config?.fps || 30;
  const totalFrames = Math.round(duration * fps);

  // Create gradient background component with animated CSS custom properties
  const gradientBackgroundId = 'gradientAtmosphere-background';

  // Build color stop effects for morphing colors
  const colorStopEffects: any[] = [];

  // Create effects for each color stop (5 stops)
  for (let i = 0; i < 5; i++) {
    const stopKey = `--gradient-stop-${i + 1}`;
    const primaryColor = primaryColors[i];
    const secondaryColor = secondaryColors[i];

    // Create color morphing effect with staggered timing
    const staggerOffset = (i * 0.15) / colorShiftSpeed;
    const morphDuration = duration * 0.5 * (1 / colorShiftSpeed);

    // Forward morph (primary to secondary)
    colorStopEffects.push({
      id: `color-stop-${i + 1}-forward-effect`,
      componentId: gradientBackgroundId,
      data: {
        type: 'ease-in-out',
        start: staggerOffset,
        duration: morphDuration,
        mode: 'provider',
        targetIds: [gradientBackgroundId],
        ranges: [
          { key: stopKey, val: primaryColor, prog: 0 },
          { key: stopKey, val: secondaryColor, prog: 1 },
        ],
      },
    });

    // Backward morph (secondary back to primary)
    if (secondaryPalette !== 'none') {
      colorStopEffects.push({
        id: `color-stop-${i + 1}-backward-effect`,
        componentId: gradientBackgroundId,
        data: {
          type: 'ease-in-out',
          start: morphDuration + staggerOffset,
          duration: morphDuration,
          mode: 'provider',
          targetIds: [gradientBackgroundId],
          ranges: [
            { key: stopKey, val: secondaryColor, prog: 0 },
            { key: stopKey, val: primaryColor, prog: 1 },
          ],
        },
      });
    }
  }

  // Create rotation effect for gradient angle
  const rotationEffect = {
    id: 'gradient-rotation-effect',
    componentId: gradientBackgroundId,
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: duration,
      mode: 'provider',
      targetIds: [gradientBackgroundId],
      ranges: [
        { key: '--gradient-angle', val: '0deg', prog: 0 },
        { key: '--gradient-angle', val: `${360 * rotationSpeed}deg`, prog: 1 },
      ],
    },
  };

  // Gradient background shape
  const gradientBackground: RenderableComponentData = {
    id: gradientBackgroundId,
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      style: {
        '--gradient-stop-1': primaryColors[0],
        '--gradient-stop-2': primaryColors[1],
        '--gradient-stop-3': primaryColors[2],
        '--gradient-stop-4': primaryColors[3],
        '--gradient-stop-5': primaryColors[4],
        '--gradient-angle': '0deg',
        backgroundImage:
          'linear-gradient(var(--gradient-angle), var(--gradient-stop-1) 0%, var(--gradient-stop-2) 25%, var(--gradient-stop-3) 50%, var(--gradient-stop-4) 75%, var(--gradient-stop-5) 100%)',
        willChange: 'transform, background-image',
      },
      className: 'absolute inset-0',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [rotationEffect, ...colorStopEffects],
    childrenData: [],
  };

  // Vignette overlay
  const vignetteOverlay: RenderableComponentData = {
    id: 'gradientAtmosphere-vignette',
    type: 'atom',
    componentId: 'ShapeAtom',
    data: {
      shape: 'rectangle',
      style: {
        background: `radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        mixBlendMode: 'overlay',
      },
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [],
  };

  // Build children array
  const childrenData: RenderableComponentData[] = [gradientBackground];

  if (enableVignette) {
    childrenData.push(vignetteOverlay);
  }

  // Add subtitles if enabled and captions provided
  if (enableSubtitles && captions && captions.length > 0) {
    const fontInfo = parseFont(subtitleFont);
    const positionClass = getSubtitlePositionStyles(subtitlePosition);

    // Process each caption
    captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
      const captionContainerId = `gradientAtmosphere-caption-${captionIndex}`;

      // Create word components with glow effects
      const wordComponents: RenderableComponentData[] = [];
      const wordEffects: any[] = [];

      if (caption.words && caption.words.length > 0) {
        caption.words.forEach((word, wordIndex) => {
          const wordId = `${captionContainerId}-word-${wordIndex}`;

          // Calculate dominant gradient color at word timing
          const wordProgress = word.absoluteStart / duration;
          const dominantColorIndex = Math.floor(wordProgress * 4);
          const dominantColor =
            primaryColors[Math.min(dominantColorIndex, 4)];

          // Lighten the color for glow effect
          const glowColor = interpolateColor(dominantColor, '#ffffff', 0.3);

          // Word component
          const wordComponent: RenderableComponentData = {
            id: wordId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              style: {
                fontSize: `${subtitleFontSize}px`,
                fontWeight: fontInfo.weight,
                fontStyle: fontInfo.style,
                color: '#ffffff',
                textShadow: `0 0 ${10 * glowIntensity}px ${glowColor}, 0 0 ${20 * glowIntensity}px ${glowColor}, 0 0 ${30 * glowIntensity}px ${glowColor}`,
                marginRight: '0.3em',
              },
              font: {
                family: fontInfo.family,
                weights: [fontInfo.weight.toString()],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: [],
          };

          // Fade-in effect for word
          const fadeInEffect = {
            id: `${wordId}-fade-effect`,
            componentId: wordId,
            data: {
              type: 'ease-out',
              start: word.start,
              duration: Math.min(word.duration * 0.5, 0.4),
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          };

          // Scale effect for word
          const scaleEffect = {
            id: `${wordId}-scale-effect`,
            componentId: wordId,
            data: {
              type: 'ease-out',
              start: word.start,
              duration: Math.min(word.duration * 0.5, 0.4),
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'scale', val: 0.8, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          };

          // Blur effect for word (blur in)
          const blurEffect = {
            id: `${wordId}-blur-effect`,
            componentId: wordId,
            data: {
              type: 'ease-out',
              start: word.start,
              duration: Math.min(word.duration * 0.5, 0.4),
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'filter', val: 'blur(8px)', prog: 0 },
                { key: 'filter', val: 'blur(0px)', prog: 1 },
              ],
            },
          };

          wordComponent.effects = [fadeInEffect, scaleEffect, blurEffect];
          wordComponents.push(wordComponent);
        });
      } else {
        // Fallback: show full caption text
        const fullTextId = `${captionContainerId}-fulltext`;
        const fullTextComponent: RenderableComponentData = {
          id: fullTextId,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: caption.text,
            style: {
              fontSize: `${subtitleFontSize}px`,
              fontWeight: fontInfo.weight,
              fontStyle: fontInfo.style,
              color: '#ffffff',
              textShadow: `0 0 ${10 * glowIntensity}px ${primaryColors[2]}, 0 0 ${20 * glowIntensity}px ${primaryColors[2]}`,
            },
            font: {
              family: fontInfo.family,
              weights: [fontInfo.weight.toString()],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects: [
            {
              id: `${fullTextId}-fade-effect`,
              componentId: fullTextId,
              data: {
                type: 'ease-out',
                start: 0,
                duration: 0.3,
                mode: 'provider',
                targetIds: [fullTextId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
          childrenData: [],
        };
        wordComponents.push(fullTextComponent);
      }

      // Caption container
      const captionContainer: RenderableComponentData = {
        id: captionContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute left-0 right-0 flex flex-wrap justify-center items-center px-8 ${positionClass}`,
            style: {
              gap: '0.2em',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: wordComponents,
      };

      childrenData.push(captionContainer);
    });
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'gradientAtmosphere-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 w-full h-full overflow-hidden',
        style: {
          willChange: 'transform, background-image',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
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
  id: 'gradientAtmosphereBackground',
  title: 'Gradient Atmosphere Background',
  description:
    'A cinematic gradient background preset featuring slow-evolving multi-stop gradients that create atmospheric color flows like golden hour transitioning to blue hour. The gradient angle rotates slowly (0° to 360°) while 3-5 color stops morph independently using smooth bezier curves. Designed to layer underneath subtitle presets, creating a hypnotic backdrop for text reveals with organic color movements reminiscent of slow camera movements through colored fog.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'background',
    'gradient',
    'cinematic',
    'atmosphere',
    'color-grading',
    'golden-hour',
    'blue-hour',
    'animated',
    'subtitles',
    'glow',
    'hypnotic',
  ],
  defaultInputParams: {
    palette: 'twilight',
    secondaryPalette: 'goldenHour',
    rotationSpeed: 1,
    colorShiftSpeed: 1,
    enableVignette: true,
    vignetteIntensity: 0.3,
    enableSubtitles: false,
    captions: [],
    subtitlePosition: 'center',
    subtitleFontSize: 48,
    subtitleFont: 'Inter:700',
    glowIntensity: 0.8,
    duration: 30,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const gradientAtmosphereBackgroundPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
