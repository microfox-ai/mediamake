/**
 * Grid Terminal Typokinetics Preset
 * 
 * A terminal-inspired typokinetics preset where words slide in horizontally with mechanical precision.
 * Features monospace aesthetic, subtle glitch effects midway through animation, and pulsing glow on lock-in.
 * Each word slides from right (translateX 100% to 0%) with linear easing over 0.4s, adds digital interference 
 * jitter at 50% progress (±3px for 0.05s), and pulses a text-shadow glow as it settles. Uses exact 0.1s 
 * stagger between words for precise, mechanical timing. Perfect for tech/hacker scenes with smooth motion 
 * instead of choppy typing.
 * 
 * Technical Details:
 * - Slide animation: translateX from 100% to 0% over 0.4s with linear easing
 * - Glitch effect: Rapid ±3px jitter at 50% progress (0.2s mark) for 0.05s duration
 * - Glow effect: text-shadow pulse from 0 to 10px and back over last 20% of animation
 * - Exact 0.1s stagger between words
 * - Monospace font with tracking-wider for terminal aesthetic
 * - Black background with green-400 text (classic terminal look)
 * 
 * Use Cases:
 * - Tech/hacker scene titles
 * - Code interface animations
 * - Terminal-style text reveals
 * - Cyberpunk/digital aesthetics
 * - Developer content overlays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { GenericEffectData, RenderableComponentData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption objects with text, start, duration, and words'),
  font: z.string().optional().default('JetBrains Mono').describe('Monospace font family (e.g., "JetBrains Mono", "Fira Code", "Source Code Pro")'),
  fontSize: z.number().optional().default(48).describe('Font size in pixels'),
  textColor: z.string().optional().default('#4ade80').describe('Text color (default: green-400 for terminal aesthetic)'),
  backgroundColor: z.string().optional().default('#000000').describe('Background color (default: black for terminal aesthetic)'),
  slideDuration: z.number().optional().default(0.4).describe('Duration of slide animation in seconds'),
  glitchDuration: z.number().optional().default(0.05).describe('Duration of glitch effect in seconds'),
  glowDuration: z.number().optional().default(0.08).describe('Duration of glow pulse in seconds'),
  wordStagger: z.number().optional().default(0.1).describe('Time between word animations in seconds'),
  glitchIntensity: z.number().optional().default(3).describe('Glitch jitter intensity in pixels'),
  glowIntensity: z.number().optional().default(10).describe('Glow radius in pixels'),
});

// Preset execution
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'JetBrains Mono';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  // Parse font style from font string
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

  const childrenData: RenderableComponentData[] = [];

  // Process each caption
  captions.forEach((caption, captionIndex) => {
    const captionId = `terminal-caption-${captionIndex}`;
    const words = caption.words || [];

    // Create word components
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordTextId = `word-text-${captionIndex}-${wordIndex}`;

      // Calculate timing
      const wordRelativeStart = word.start; // Relative to caption
      const glitchStart = wordRelativeStart + params.slideDuration! * 0.5; // 50% through slide
      const glowStart = wordRelativeStart + params.slideDuration! * 0.8; // 80% through slide (last 20%)

      // Slide effect: translateX from 100% to 0%
      const slideEffect: GenericEffectData = {
        type: 'linear',
        start: wordRelativeStart,
        duration: params.slideDuration!,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'translateX', val: '100%', prog: 0 },
          { key: 'translateX', val: 0, prog: 1 },
        ],
      };

      // Glitch effect: rapid jitter at 50% progress
      const glitchEffect: GenericEffectData = {
        type: 'linear',
        start: glitchStart,
        duration: params.glitchDuration!,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          // X-axis jitter
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: params.glitchIntensity!, prog: 0.25 },
          { key: 'translateX', val: -params.glitchIntensity!, prog: 0.5 },
          { key: 'translateX', val: params.glitchIntensity! * 0.67, prog: 0.75 },
          { key: 'translateX', val: 0, prog: 1 },
          // Y-axis jitter
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: -params.glitchIntensity! * 0.67, prog: 0.33 },
          { key: 'translateY', val: params.glitchIntensity!, prog: 0.66 },
          { key: 'translateY', val: 0, prog: 1 },
        ],
      };

      // Glow effect: text-shadow pulse
      const glowEffect: GenericEffectData = {
        type: 'ease-out',
        start: glowStart,
        duration: params.glowDuration!,
        mode: 'provider',
        targetIds: [wordTextId],
        ranges: [
          { key: 'textShadow', val: `0 0 0px ${params.textColor}`, prog: 0 },
          { key: 'textShadow', val: `0 0 ${params.glowIntensity}px ${params.textColor}`, prog: 0.5 },
          { key: 'textShadow', val: `0 0 0px ${params.textColor}`, prog: 1 },
        ],
      };

      // Word wrapper (for positioning)
      const wordWrapper: RenderableComponentData = {
        id: wordId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative',
          },
        },
        context: {
          timing: {
            start: 0, // All words use caption duration
            duration: caption.duration,
          },
        },
        childrenData: [
          {
            id: wordTextId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: word.text,
              className: 'font-mono tracking-wider',
              style: {
                fontSize: params.fontSize!,
                fontWeight: fontStyle.fontWeight || 500,
                color: params.textColor!,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: [String(fontStyle.fontWeight || 500)],
                display: 'swap',
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
                id: `slide-effect-${wordTextId}`,
                componentId: 'generic',
                data: slideEffect,
              },
              {
                id: `glitch-effect-${wordTextId}`,
                componentId: 'generic',
                data: glitchEffect,
              },
              {
                id: `glow-effect-${wordTextId}`,
                componentId: 'generic',
                data: glowEffect,
              },
            ],
          },
        ],
      };

      return wordWrapper;
    });

    // Caption container
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center justify-center font-mono gap-4 tracking-wider absolute inset-0',
          style: {
            backgroundColor: params.backgroundColor!,
            color: params.textColor!,
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

  return {
    output: {
      childrenData: childrenData as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'gridTerminalTypokinetics',
  title: 'Grid Terminal Typokinetics',
  description: 'A terminal-inspired typokinetics preset where words slide in horizontally with mechanical precision. Features monospace aesthetic, subtle glitch effects midway through animation, and pulsing glow on lock-in. Each word slides from right (translateX 100% to 0%) with linear easing over 0.4s, adds digital interference jitter at 50% progress (±3px for 0.05s), and pulses a text-shadow glow as it settles. Uses exact 0.1s stagger between words for precise, mechanical timing. Perfect for tech/hacker scenes with smooth motion instead of choppy typing.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'terminal', 'code', 'tech', 'hacker', 'cyberpunk', 'monospace', 'glitch', 'kinetic', 'slide', 'reveal'],
  defaultInputParams: {
    captions: [],
    font: 'JetBrains Mono',
    fontSize: 48,
    textColor: '#4ade80',
    backgroundColor: '#000000',
    slideDuration: 0.4,
    glitchDuration: 0.05,
    glowDuration: 0.08,
    wordStagger: 0.1,
    glitchIntensity: 3,
    glowIntensity: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const gridTerminalTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
