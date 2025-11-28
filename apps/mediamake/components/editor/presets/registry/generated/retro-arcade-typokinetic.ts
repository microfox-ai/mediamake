/**
 * Retro Arcade Typokinetic Preset
 *
 * Classic arcade-style typokinetic preset with 8-bit game physics and pixel-perfect animations.
 * Text lines slam up from the bottom with discrete, stepped movements like classic arcade game UI.
 * Features RGB channel separation glitch effects on arrival and optional scanline overlay.
 *
 * Features:
 * - Stepped translateY animation with instant transitions (0%, 25%, 50%, 75%, 100%)
 * - Digital glitch effect with chromatic aberration (RGB channel separation)
 * - Pixel-perfect spacing (multiples of 8px)
 * - Optional scanline overlay with repeating linear gradient
 * - Retro terminal look with monospace font and green text
 * - Sharp, digital, nostalgic aesthetic inspired by vintage arcade terminals
 *
 * Use cases:
 * - Retro gaming content and arcade-style titles
 * - Tech/cyberpunk aesthetic videos
 * - Nostalgic throwback content
 * - Digital/glitch art presentations
 * - 8-bit style motion graphics
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  textLines: z
    .array(z.string())
    .default(['PLAYER 1 READY', 'PRESS START', 'GAME OVER'])
    .describe('Array of text lines to display in arcade style'),
  lineDelay: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Delay between each line appearing (seconds)'),
  slideUpDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Duration of the stepped slide-up animation per line (seconds)'),
  textColor: z
    .string()
    .default('#00ff00')
    .describe('Text color in hex format (default: green #00ff00)'),
  fontSize: z
    .number()
    .min(16)
    .max(64)
    .default(32)
    .describe('Font size in pixels'),
  glitchDuration: z
    .number()
    .min(0.05)
    .max(0.3)
    .default(0.1)
    .describe('Duration of the RGB glitch effect on arrival (seconds)'),
  showScanlines: z
    .boolean()
    .default(true)
    .describe('Whether to show the scanline overlay effect'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color in hex format (default: black)'),
  pixelSpacing: z
    .number()
    .min(4)
    .max(32)
    .default(8)
    .describe('Pixel-perfect spacing between lines (must be multiple of 4)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    textLines,
    lineDelay,
    slideUpDuration,
    textColor,
    fontSize,
    glitchDuration,
    showScanlines,
    backgroundColor,
    pixelSpacing,
  } = params;

  // Ensure pixel spacing is a multiple of 4
  const actualPixelSpacing = Math.round(pixelSpacing / 4) * 4;

  // Calculate total duration: all lines + their delays
  const totalDuration =
    textLines.length * lineDelay + slideUpDuration + glitchDuration;

  // Create text line components with stepped animation
  const textLineComponents: RenderableComponentData[] = textLines.map(
    (line, index) => {
      const lineId = `arcade-text-line-${index}`;
      const startTime = index * lineDelay;

      // Create stepped slide-up effect
      const slideEffect = {
        id: `slide-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: slideUpDuration,
          mode: 'provider' as const,
          targetIds: [lineId],
          ranges: [
            { key: 'translateY', val: 100, prog: 0 },
            { key: 'translateY', val: 75, prog: 0.25 },
            { key: 'translateY', val: 50, prog: 0.5 },
            { key: 'translateY', val: 25, prog: 0.75 },
            { key: 'translateY', val: 0, prog: 1 },
            // Also add opacity for instant appearance
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      };

      // Create RGB glitch effect on arrival
      const glitchEffect = {
        id: `glitch-${lineId}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: slideUpDuration - glitchDuration * 0.5,
          duration: glitchDuration,
          mode: 'provider' as const,
          targetIds: [lineId],
          ranges: [
            {
              key: 'filter',
              val: 'drop-shadow(-2px 0 red) drop-shadow(2px 0 cyan)',
              prog: 0,
            },
            {
              key: 'filter',
              val: 'drop-shadow(-3px 0 red) drop-shadow(3px 0 cyan)',
              prog: 0.5,
            },
            { key: 'filter', val: 'none', prog: 1 },
          ],
        },
      };

      return {
        id: lineId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: line,
          className: 'uppercase tracking-wider',
          style: {
            color: textColor,
            fontSize: `${fontSize}px`,
            fontFamily: 'monospace',
            textShadow: `0 0 8px ${textColor}80`,
            imageRendering: 'pixelated' as any,
          },
        },
        context: {
          timing: {
            start: startTime,
            duration: totalDuration - startTime,
          },
        },
        effects: [slideEffect, glitchEffect],
      } as RenderableComponentData;
    },
  );

  // Create scanline overlay if enabled
  const scanlineOverlay: RenderableComponentData | null = showScanlines
    ? ({
        id: 'arcade-scanline-overlay',
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 255, 0, 0.03) 2px, rgba(0, 255, 0, 0.03) 4px);"></div>',
          className: 'absolute inset-0 pointer-events-none',
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
      } as RenderableComponentData)
    : null;

  // Create text lines container
  const textLinesContainer: RenderableComponentData = {
    id: 'arcade-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-col-reverse items-start',
        style: {
          gap: `${actualPixelSpacing}px`,
          padding: '16px',
          justifyContent: 'flex-start',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: textLineComponents,
  } as RenderableComponentData;

  // Root container with retro terminal styling
  const rootContainer: RenderableComponentData = {
    id: 'arcade-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative font-mono overflow-hidden',
        style: {
          backgroundColor,
          width: '100%',
          height: '100%',
          imageRendering: 'pixelated' as any,
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
      ...(scanlineOverlay ? [scanlineOverlay] : []),
      textLinesContainer,
    ],
  } as RenderableComponentData;

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
  id: 'retro-arcade-typokinetic',
  title: 'Retro Arcade Typokinetic',
  description:
    'Classic arcade-style typokinetic preset with 8-bit game physics. Text lines slam up from bottom with discrete stepped movements, RGB glitch effects on arrival, and optional scanline overlay. Features pixel-perfect spacing and sharp digital aesthetics reminiscent of vintage arcade terminals.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'arcade',
    'retro',
    '8-bit',
    'glitch',
    'pixel',
    'nostalgia',
    'digital',
    'terminal',
    'scanline',
    'rgb-split',
  ],
  defaultInputParams: {
    textLines: ['PLAYER 1 READY', 'PRESS START', 'GAME OVER'],
    lineDelay: 0.5,
    slideUpDuration: 0.5,
    textColor: '#00ff00',
    fontSize: 32,
    glitchDuration: 0.1,
    showScanlines: true,
    backgroundColor: '#000000',
    pixelSpacing: 8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const retroArcadeTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
