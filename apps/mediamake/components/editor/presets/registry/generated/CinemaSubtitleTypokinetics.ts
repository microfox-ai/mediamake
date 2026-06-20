/**
 * Cinema Subtitle Typokinetics Preset
 *
 * Professional film-style subtitle preset that emulates professional film subtitling with instant appearance/disappearance.
 * Implements clean, readable text with hard-cut transitions (no gradual fades) and high-contrast backgrounds.
 * 
 * Features:
 * - **Instant Hard-Cut Transitions**: Text and backgrounds appear/disappear instantly (0.01s transitions)
 * - **Line-by-Line Reveals**: Multi-line captions reveal each line as a hard cut
 * - **High-Contrast Backgrounds**: Semi-transparent black backgrounds for optimal readability
 * - **Position Options**: Bottom, top, or following speaker position with instant position changes
 * - **Professional Styling**: Clean sans-serif fonts optimized for subtitle readability
 * - **Media-Synced Duration**: Automatically syncs with video duration using fitDurationTo
 * - **Non-Blocking**: Uses pointer-events-none to prevent interaction blocking
 *
 * Use cases:
 * - Professional film subtitles with instant transitions
 * - Foreign film subtitle emulation
 * - Accessibility-focused captions with high readability
 * - Multi-speaker dialogue with position-based subtitles
 * - Documentary and interview subtitles
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  captionData: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number().describe('Relative start time within caption'),
        end: z.number().describe('Relative end time within caption'),
        duration: z.number().describe('Caption duration'),
        absoluteStart: z.number().describe('Absolute start in scene timeline'),
        absoluteEnd: z.number().describe('Absolute end in scene timeline'),
        words: z.array(
          z.object({
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
          }),
        ),
        metadata: z
          .object({
            speaker: z.string().optional().describe('Speaker identifier for position changes'),
            position: z.enum(['bottom', 'top', 'center']).optional().describe('Specific position for this caption'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption/sentence objects with timing and word data'),
  
  position: z
    .enum(['bottom', 'top', 'speaker-following'])
    .default('bottom')
    .describe('Subtitle position: bottom (default), top, or speaker-following (uses metadata)'),
  
  fontSize: z
    .number()
    .min(16)
    .max(48)
    .default(24)
    .describe('Font size for subtitle text in pixels'),
  
  font: z
    .string()
    .default('Inter:500:normal')
    .describe('Font family with weight and style (e.g., "Inter:500:normal")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color in hex or CSS color format'),
  
  backgroundColor: z
    .string()
    .default('rgba(0, 0, 0, 0.8)')
    .describe('Background color with transparency (e.g., "rgba(0, 0, 0, 0.8)")'),
  
  padding: z
    .object({
      x: z.number().default(16).describe('Horizontal padding in pixels'),
      y: z.number().default(8).describe('Vertical padding in pixels'),
    })
    .default({ x: 16, y: 8 })
    .describe('Padding around subtitle text'),
  
  containerPadding: z
    .number()
    .default(32)
    .describe('Padding from screen edges in pixels'),
  
  lineSpacing: z
    .number()
    .default(8)
    .describe('Spacing between lines for multi-line captions in pixels'),
  
  maxLinesPerCaption: z
    .number()
    .min(1)
    .max(3)
    .default(2)
    .describe('Maximum number of lines to display per caption'),
  
  staggerDelay: z
    .number()
    .min(0)
    .max(1)
    .default(0.1)
    .describe('Delay between line reveals for multi-line captions in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captionData,
    position,
    fontSize,
    font,
    textColor,
    backgroundColor,
    padding,
    containerPadding,
    lineSpacing,
    maxLinesPerCaption,
    staggerDelay,
  } = params;

  // Parse font string (format: "FontName:weight:style")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    
    let fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10) || 500;
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10) || 500;
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Split caption text into lines
  const splitIntoLines = (text: string, maxLines: number): string[] => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      
      // Simple heuristic: ~40 characters per line for readability
      if (testLine.length > 40 && currentLine) {
        lines.push(currentLine);
        currentLine = word;
        
        if (lines.length >= maxLines - 1) {
          // Last line: add remaining words
          const remaining = words.slice(words.indexOf(word)).join(' ');
          lines.push(remaining);
          break;
        }
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine && lines.length < maxLines) {
      lines.push(currentLine);
    }
    
    return lines.slice(0, maxLines);
  };

  // Helper: Create hard-cut opacity effect
  const createHardCutEffect = (
    targetId: string,
    effectStart: number,
    effectDuration: number,
  ) => {
    return {
      id: `hard-cut-${targetId}`,
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: effectStart,
        duration: effectDuration,
        mode: 'provider' as const,
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.01 }, // Instant appearance
          { key: 'opacity', val: 1, prog: 0.99 }, // Hold
          { key: 'opacity', val: 0, prog: 1 }, // Instant disappearance
        ],
      },
    };
  };

  // Helper: Get position classes based on position parameter
  const getPositionClasses = (pos: string): string => {
    switch (pos) {
      case 'top':
        return 'absolute top-0 left-0 right-0 flex justify-center items-start';
      case 'center':
        return 'absolute inset-0 flex justify-center items-center';
      case 'bottom':
      default:
        return 'absolute bottom-0 left-0 right-0 flex justify-center items-end';
    }
  };

  // Build caption containers
  const captionContainers: RenderableComponentData[] = [];

  captionData.forEach((caption, captionIndex) => {
    const captionId = `caption-${captionIndex}`;
    const lines = splitIntoLines(caption.text, maxLinesPerCaption);
    
    // Determine position for this caption
    let captionPosition = position;
    if (position === 'speaker-following' && caption.metadata?.position) {
      captionPosition = caption.metadata.position;
    }

    // Create line components with staggered hard-cut timing
    const lineComponents: RenderableComponentData[] = lines.map((lineText, lineIndex) => {
      const lineId = `${captionId}-line-${lineIndex}`;
      const lineStart = lineIndex * staggerDelay; // Stagger each line
      const lineDuration = caption.duration - lineStart;

      return {
        id: lineId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: lineText,
          style: {
            fontSize: `${fontSize}px`,
            color: textColor,
            textAlign: 'center',
            lineHeight: '1.4',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['500'],
            subsets: ['latin'],
            display: 'swap' as const,
          },
        },
        context: {
          timing: {
            start: lineStart,
            duration: lineDuration,
          },
        },
        effects: [createHardCutEffect(lineId, 0, lineDuration)],
      } as RenderableComponentData;
    });

    // Background container with hard-cut effect
    const backgroundId = `${captionId}-background`;
    const backgroundContainer: RenderableComponentData = {
      id: backgroundId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'rounded',
          style: {
            backgroundColor,
            paddingLeft: `${padding.x}px`,
            paddingRight: `${padding.x}px`,
            paddingTop: `${padding.y}px`,
            paddingBottom: `${padding.y}px`,
            gap: `${lineSpacing}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: caption.duration,
        },
      },
      effects: [createHardCutEffect(backgroundId, 0, caption.duration)],
      childrenData: lineComponents,
    };

    // Caption container with position
    const captionContainer: RenderableComponentData = {
      id: captionId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: getPositionClasses(captionPosition),
          style: {
            padding: `${containerPadding}px`,
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      childrenData: [backgroundContainer],
    };

    captionContainers.push(captionContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'cinema-subtitle-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'media' as const,
      },
    },
    childrenData: captionContainers,
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
  id: 'CinemaSubtitleTypokinetics',
  title: 'Cinema Subtitle Typokinetics',
  description:
    'Professional film-style subtitle preset with instant hard-cut appearance/disappearance, high-contrast backgrounds, line-by-line reveals for multi-line captions, and instant position changes for speaker switching. Emulates professional subtitle tracks with no transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'subtitles',
    'cinema',
    'film',
    'professional',
    'hard-cut',
    'instant',
    'accessibility',
    'multi-line',
    'speaker',
  ],
  defaultInputParams: {
    captionData: [
      {
        id: 'caption-1',
        text: 'Welcome to the cinema subtitle preset',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [],
        metadata: { position: 'bottom' },
      },
      {
        id: 'caption-2',
        text: 'This is a multi-line caption that will be split into multiple lines for better readability',
        start: 0,
        end: 4,
        duration: 4,
        absoluteStart: 3.5,
        absoluteEnd: 7.5,
        words: [],
        metadata: { position: 'bottom', speaker: 'Speaker 1' },
      },
      {
        id: 'caption-3',
        text: 'Speaker changes can trigger position changes',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 8,
        absoluteEnd: 11,
        words: [],
        metadata: { position: 'top', speaker: 'Speaker 2' },
      },
    ],
    position: 'bottom',
    fontSize: 24,
    font: 'Inter:500:normal',
    textColor: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: { x: 16, y: 8 },
    containerPadding: 32,
    lineSpacing: 8,
    maxLinesPerCaption: 2,
    staggerDelay: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const CinemaSubtitleTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
