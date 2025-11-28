/**
 * Morse Code Telegraph Animation Preset
 *
 * A rhythmic morse code animation featuring compressed text that expands in dots and dashes pattern.
 * Creates a telegraph-like animation with green phosphor glow, CRT scanlines, and optional beep sounds
 * for authentic tech/hacker or historical aesthetics.
 *
 * Features:
 * - Compressed text (-0.45em) that expands in rhythmic morse pattern
 * - Quick dots (100ms, expand to 0.05em) and longer dashes (300ms hold, expand to 0.15em)
 * - Green phosphor glow effect with pulsing intensity
 * - CRT monitor scanline overlay for retro aesthetic
 * - Subtle screen flicker effect for authenticity
 * - Optional beep sounds synchronized with morse pattern
 * - Digital feel with steps(1) easing for crisp transitions
 *
 * Use cases:
 * - Tech/hacker themed content
 * - Historical telegraph demonstrations
 * - Cyberpunk aesthetics
 * - Retro computer interfaces
 * - Secret message reveals
 * - Data transmission visualizations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('MORSE CODE')
    .describe('Text content to display in morse code animation'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .describe('Total duration of the morse pattern animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#4ade80')
    .describe('Text color (green phosphor by default)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(2)
    .default(0.8)
    .describe('Intensity of the phosphor glow effect (0-2)'),
  scanlineIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.03)
    .describe('Opacity of CRT scanlines (0-1)'),
  flickerEnabled: z
    .boolean()
    .default(true)
    .describe('Enable subtle screen flicker effect'),
  beepsEnabled: z
    .boolean()
    .default(false)
    .describe('Enable beep sounds matching morse pattern (requires audio file)'),
  beepAudioSrc: z
    .string()
    .optional()
    .describe('Audio source for beep sounds (only used if beepsEnabled is true)'),
  morsePattern: z
    .enum(['standard', 'fast', 'slow', 'custom'])
    .default('standard')
    .describe('Preset morse code rhythm patterns or custom'),
  customPattern: z
    .array(
      z.object({
        type: z.enum(['dot', 'dash', 'pause']).describe('Type of morse element'),
        startProg: z.number().min(0).max(1).describe('Start progress (0-1)'),
        endProg: z.number().min(0).max(1).describe('End progress (0-1)'),
      })
    )
    .optional()
    .describe('Custom morse pattern (only used when morsePattern is "custom")'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const containerId = 'morse-code-container';
  const textId = 'morse-text';
  const scanlineId = 'scanline-overlay';

  // Helper function to generate morse pattern ranges
  const generateMorsePattern = () => {
    if (params.morsePattern === 'custom' && params.customPattern) {
      // Use custom pattern
      const ranges: Array<{ key: string; val: string; prog: number }> = [];
      params.customPattern.forEach(element => {
        ranges.push({
          key: 'letterSpacing',
          val:
            element.type === 'dash'
              ? '0.15em'
              : element.type === 'dot'
              ? '0.05em'
              : '-0.45em',
          prog: element.startProg,
        });
        ranges.push({
          key: 'letterSpacing',
          val: element.type === 'pause' ? '-0.45em' : '-0.45em',
          prog: element.endProg,
        });
      });
      return ranges;
    }

    // Predefined patterns
    const patterns: Record<string, Array<{ key: string; val: string; prog: number }>> = {
      standard: [
        // Start compressed
        { key: 'letterSpacing', val: '-0.45em', prog: 0 },
        // Dot 1 (quick expansion)
        { key: 'letterSpacing', val: '0.05em', prog: 0.05 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.1 },
        // Pause
        { key: 'letterSpacing', val: '-0.45em', prog: 0.15 },
        // Dash 1 (longer hold)
        { key: 'letterSpacing', val: '0.15em', prog: 0.2 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.3 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.35 },
        // Pause
        { key: 'letterSpacing', val: '-0.45em', prog: 0.4 },
        // Dot 2
        { key: 'letterSpacing', val: '0.05em', prog: 0.45 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.5 },
        // Pause
        { key: 'letterSpacing', val: '-0.45em', prog: 0.55 },
        // Dash 2
        { key: 'letterSpacing', val: '0.15em', prog: 0.6 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.7 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.75 },
        // Dot 3
        { key: 'letterSpacing', val: '0.05em', prog: 0.8 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.85 },
        // End compressed
        { key: 'letterSpacing', val: '-0.45em', prog: 1 },
      ],
      fast: [
        // Faster rhythm - shorter pauses
        { key: 'letterSpacing', val: '-0.45em', prog: 0 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.04 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.08 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.12 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.2 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.24 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.3 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.34 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.4 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.5 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.54 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.6 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.64 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.7 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.74 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.8 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.9 },
        { key: 'letterSpacing', val: '-0.45em', prog: 1 },
      ],
      slow: [
        // Slower, more deliberate rhythm
        { key: 'letterSpacing', val: '-0.45em', prog: 0 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.08 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.15 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.25 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.3 },
        { key: 'letterSpacing', val: '0.15em', prog: 0.45 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.5 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.6 },
        { key: 'letterSpacing', val: '0.05em', prog: 0.65 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.72 },
        { key: 'letterSpacing', val: '-0.45em', prog: 0.8 },
        { key: 'letterSpacing', val: '-0.45em', prog: 1 },
      ],
    };

    return patterns[params.morsePattern] || patterns.standard;
  };

  const morseRanges = generateMorsePattern();

  // Letter spacing effect
  const letterSpacingEffect = {
    id: 'morse-letter-spacing-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: params.duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: morseRanges,
    },
  };

  // Glow effect synchronized with expansion
  const glowRanges = morseRanges.map(range => {
    const isExpanded = range.val !== '-0.45em';
    const glowValue = isExpanded
      ? `0 0 ${10 + 10 * params.glowIntensity}px rgba(74, 222, 128, ${0.8 * params.glowIntensity}), 0 0 ${20 + 20 * params.glowIntensity}px rgba(74, 222, 128, ${0.4 * params.glowIntensity})`
      : `0 0 ${5 * params.glowIntensity}px rgba(74, 222, 128, ${0.4 * params.glowIntensity})`;
    return {
      key: 'textShadow',
      val: glowValue,
      prog: range.prog,
    };
  });

  const glowEffect = {
    id: 'morse-glow-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration: params.duration,
      mode: 'provider' as const,
      targetIds: [textId],
      ranges: glowRanges,
    },
  };

  // Flicker effect
  const flickerEffect = params.flickerEnabled
    ? {
        id: 'morse-flicker-effect',
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: params.duration,
          mode: 'provider' as const,
          targetIds: [textId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.95, prog: 0.1 },
            { key: 'opacity', val: 1, prog: 0.15 },
            { key: 'opacity', val: 0.97, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.35 },
            { key: 'opacity', val: 0.96, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 0.55 },
            { key: 'opacity', val: 0.98, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 0.75 },
            { key: 'opacity', val: 0.95, prog: 0.9 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      }
    : null;

  // Text atom
  const textAtom: RenderableComponentData = {
    id: textId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.text,
      className: 'font-mono',
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        letterSpacing: '-0.45em',
        textShadow: `0 0 ${5 * params.glowIntensity}px rgba(74, 222, 128, ${0.4 * params.glowIntensity})`,
        fontWeight: '400',
      },
      font: {
        family: 'Courier New',
        weights: ['400'],
        display: 'swap' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      letterSpacingEffect,
      glowEffect,
      ...(flickerEffect ? [flickerEffect] : []),
    ],
  };

  // Scanline overlay
  const scanlineOverlay: RenderableComponentData = {
    id: scanlineId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,0,${params.scanlineIntensity}) 2px, rgba(0,255,0,${params.scanlineIntensity}) 4px)`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
  };

  // Optional audio beeps
  const audioAtom =
    params.beepsEnabled && params.beepAudioSrc
      ? ({
          id: 'morse-beep-audio',
          type: 'atom',
          componentId: 'AudioAtom',
          data: {
            src: params.beepAudioSrc,
            volume: 0.7,
            loop: true,
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
        } as RenderableComponentData)
      : null;

  // Main container
  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black flex items-center justify-center',
        style: {
          padding: '32px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      scanlineOverlay,
      textAtom,
      ...(audioAtom ? [audioAtom] : []),
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'morse-code-telegraph',
  title: 'Morse Code Telegraph Animation',
  description:
    'A rhythmic morse code animation with compressed text that expands in dots and dashes pattern. Features green phosphor glow, CRT scanlines, and optional beep sounds for authentic telegraph aesthetics perfect for tech/hacker or historical content.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'animation',
    'morse-code',
    'telegraph',
    'tech',
    'hacker',
    'retro',
    'crt',
    'monochrome',
    'rhythm',
    'historical',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'MORSE CODE',
    duration: 5,
    fontSize: 48,
    textColor: '#4ade80',
    glowIntensity: 0.8,
    scanlineIntensity: 0.03,
    flickerEnabled: true,
    beepsEnabled: false,
    morsePattern: 'standard',
  },
};

// Export preset
export const morseCodeTelegraphPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
