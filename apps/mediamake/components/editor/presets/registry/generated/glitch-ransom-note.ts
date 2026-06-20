/**
 * Glitchy Digital Ransom Note Text Effect Preset
 *
 * Creates a cyberpunk-aesthetic glitchy text effect with multi-phase animations:
 * - Phase 1 (0-30%): Random character substitution with rapid opacity flickers
 * - Phase 2 (30-70%): RGB color separation via textShadow offsets
 * - Phase 3 (70-100%): Settling with residual jitter using step() timing
 *
 * Features:
 * - Terminal-style typing effect with glitch transitions
 * - Matrix-rain-style character substitution during animation
 * - RGB split chromatic aberration
 * - Scan line overlay
 * - CRT monitor simulation (blur + contrast filters)
 * - Stop-motion stuttery aesthetic with step() timing
 * - Digital artifacts and data moshing effects
 *
 * Use cases:
 * - Cyberpunk-themed title cards
 * - Hacker/tech aesthetic videos
 * - Glitch art compositions
 * - Digital corruption effects
 * - Ransom note / distorted message visuals
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
    .default('CORRUPTED MESSAGE')
    .describe('Text to display with glitch effect'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the effect in seconds'),
  fontSize: z
    .number()
    .min(20)
    .max(300)
    .default(72)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#00ff00')
    .describe('Base text color (neon green default)'),
  rgbSplitIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(3)
    .describe('RGB split offset intensity in pixels'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Overall glitch effect intensity multiplier'),
  jitterAmount: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum jitter/shake amount in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Courier New:700", "Roboto Mono:600:italic")',
    ),
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
    textColor,
    rgbSplitIntensity,
    glitchIntensity,
    jitterAmount,
    font,
  } = params;

  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = font || 'Courier New';
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

  // Generate glitch character substitution string
  const generateGlitchString = (original: string): string => {
    const glitchChars =
      '█▓▒░!@#$%^&*()_+-=[]{}|;:,.<>?/~`0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    return original
      .split('')
      .map(() => glitchChars[Math.floor(Math.random() * glitchChars.length)])
      .join('');
  };

  // Create multiple glitch text variations for phase 1
  const glitchVariations = Array.from({ length: 10 }, () =>
    generateGlitchString(text),
  );

  // Phase timings (relative to container)
  const phase1Duration = duration * 0.3; // 0-30%: character substitution
  const phase2Duration = duration * 0.4; // 30-70%: RGB split
  const phase3Duration = duration * 0.3; // 70-100%: settling with jitter

  const textAtomId = 'glitch-text-atom';
  const containerId = 'glitch-ransom-note-container';

  // Phase 1: Character substitution effect (rapid text changes)
  // We'll create multiple text atoms that rapidly switch visibility
  const phase1Children: RenderableComponentData[] = glitchVariations.map(
    (glitchText, index) => {
      const startOffset = (index / glitchVariations.length) * phase1Duration;
      const textDuration = phase1Duration / glitchVariations.length;

      return {
        id: `glitch-char-${index}`,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: glitchText,
          className: 'font-mono font-bold',
          style: {
            fontSize,
            color: textColor,
            textAlign: 'center' as const,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight
              ? { weights: [fontStyle.fontWeight.toString()] }
              : {}),
          },
        },
        context: {
          timing: {
            start: startOffset,
            duration: textDuration,
          },
        },
        effects: [
          {
            id: `flicker-${index}`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: 0,
              duration: textDuration,
              mode: 'provider',
              targetIds: [`glitch-char-${index}`],
              ranges: [
                { key: 'opacity', val: Math.random() * 0.5 + 0.5, prog: 0 },
                {
                  key: 'opacity',
                  val: Math.random() * 0.5 + 0.5,
                  prog: 0.33,
                },
                {
                  key: 'opacity',
                  val: Math.random() * 0.5 + 0.5,
                  prog: 0.66,
                },
                { key: 'opacity', val: Math.random() * 0.5 + 0.5, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Phase 2: Main text with RGB split
  const phase2TextId = 'glitch-text-phase2';
  const phase2Child: RenderableComponentData = {
    id: phase2TextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono font-bold',
      style: {
        fontSize,
        color: textColor,
        textAlign: 'center' as const,
        textShadow: `${rgbSplitIntensity}px 0 #ff0000, -${rgbSplitIntensity}px 0 #00ffff`,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    },
    context: {
      timing: {
        start: phase1Duration,
        duration: phase2Duration,
      },
    },
    effects: [
      {
        id: 'rgb-split-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: phase2Duration,
          mode: 'provider',
          targetIds: [phase2TextId],
          ranges: [
            {
              key: 'textShadow',
              val: `${rgbSplitIntensity * glitchIntensity}px 0 #ff0000, -${rgbSplitIntensity * glitchIntensity}px 0 #00ffff`,
              prog: 0,
            },
            {
              key: 'textShadow',
              val: `${rgbSplitIntensity * glitchIntensity * 1.5}px 0 #ff0000, -${rgbSplitIntensity * glitchIntensity * 1.5}px 0 #00ffff`,
              prog: 0.5,
            },
            {
              key: 'textShadow',
              val: `${rgbSplitIntensity}px 0 #ff0000, -${rgbSplitIntensity}px 0 #00ffff`,
              prog: 1,
            },
          ],
        },
      },
    ],
  };

  // Phase 3: Final text with residual jitter (stop-motion feel)
  const phase3TextId = 'glitch-text-phase3';
  const phase3Child: RenderableComponentData = {
    id: phase3TextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      className: 'font-mono font-bold',
      style: {
        fontSize,
        color: textColor,
        textAlign: 'center' as const,
        textShadow: `${rgbSplitIntensity * 0.5}px 0 #ff0000, -${rgbSplitIntensity * 0.5}px 0 #00ffff`,
        ...fontStyle,
      },
      font: {
        family: fontFamily,
        ...(fontStyle.fontWeight
          ? { weights: [fontStyle.fontWeight.toString()] }
          : {}),
      },
    },
    context: {
      timing: {
        start: phase1Duration + phase2Duration,
        duration: phase3Duration,
      },
    },
    effects: [
      {
        id: 'jitter-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: phase3Duration,
          mode: 'provider',
          targetIds: [phase3TextId],
          ranges: [
            {
              key: 'translateX',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0,
            },
            {
              key: 'translateY',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0,
            },
            {
              key: 'translateX',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.2,
            },
            {
              key: 'translateY',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.2,
            },
            {
              key: 'translateX',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.4,
            },
            {
              key: 'translateY',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.4,
            },
            {
              key: 'translateX',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.6,
            },
            {
              key: 'translateY',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.6,
            },
            {
              key: 'translateX',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.8,
            },
            {
              key: 'translateY',
              val: Math.random() * jitterAmount - jitterAmount / 2,
              prog: 0.8,
            },
            { key: 'translateX', val: 0, prog: 1 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Scan line overlay (persistent throughout)
  const scanlineOverlayId = 'scanline-overlay';
  const scanlineOverlay: RenderableComponentData = {
    id: scanlineOverlayId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(0deg, rgba(0, 255, 255, 0.03) 0px, rgba(0, 255, 255, 0.03) 1px, transparent 1px, transparent 2px); z-index: 10;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Text container with CRT filter
  const textContainerId = 'glitch-text-container';
  const textContainer: RenderableComponentData = {
    id: textContainerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          filter: 'blur(0.5px) contrast(1.2)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [...phase1Children, phase2Child, phase3Child],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black overflow-hidden w-full h-full',
        style: {
          fontFamily: 'monospace',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [scanlineOverlay, textContainer],
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
  id: 'glitch-ransom-note',
  title: 'Glitchy Digital Ransom Note Effect',
  description:
    'Cyberpunk-aesthetic text effect with multi-phase glitch animations including character substitution, RGB separation, scan lines, and digital artifacts. Features terminal-style typing with stop-motion stuttery transitions simulating corrupted video feed.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'glitch',
    'cyberpunk',
    'digital',
    'ransom-note',
    'typography',
    'rgb-split',
    'chromatic-aberration',
    'scan-lines',
    'crt',
    'corrupted',
    'hacker',
    'terminal',
    'matrix',
    'stop-motion',
  ],
  defaultInputParams: {
    text: 'CORRUPTED MESSAGE',
    duration: 5,
    fontSize: 72,
    textColor: '#00ff00',
    rgbSplitIntensity: 3,
    glitchIntensity: 1,
    jitterAmount: 5,
    font: 'Courier New:700',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const glitchRansomNotePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
