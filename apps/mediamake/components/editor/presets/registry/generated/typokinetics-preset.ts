/**
 * Typokinetics Preset
 *
 * Creates a typewriter-meets-elegance effect where serif text flows onto the screen
 * character by character with smooth, fluid motion instead of mechanical typing.
 * Each character slides in from a slight angle with a graceful arc motion, as if being
 * placed by a careful hand.
 *
 * Features:
 * - **Character-by-Character Animation**: Text appears one character at a time with smooth motion
 * - **Graceful Arc Motion**: Characters slide in from a slight angle with translateX/Y/rotate
 * - **Carriage-Return Effect**: Completed lines slide smoothly upward to make room for new text
 * - **Flowing Cursor**: Subtle cursor element that guides the eye ahead of appearing text
 * - **Micro-Animations**: Character wobble on appearance and gentle settle effect
 * - **Classic Typography**: Georgia or Times New Roman serif fonts for optimal readability
 * - **Performance Optimized**: CSS containment for line containers, requestAnimationFrame timing
 *
 * Use cases:
 * - Elegant text reveals for titles and quotes
 * - Sophisticated typewriter effects without mechanical harshness
 * - Literary or poetic content presentation
 * - Graceful caption animations
 * - High-end typography effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

// ============================================================
// PRESET PARAMETERS SCHEMA
// ============================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display with typokinetics effect'),
  
  font: z
    .string()
    .default('Georgia:400:normal')
    .describe('Font family with weight and style (e.g., "Georgia:400:normal", "Times New Roman:700")'),
  
  fontSize: z
    .number()
    .min(12)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Text color (hex or CSS color)'),
  
  characterSpeed: z
    .number()
    .min(5)
    .max(30)
    .default(17)
    .describe('Characters per second typing speed (15-20 recommended for readability)'),
  
  entranceDuration: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .describe('Duration for each character entrance animation in seconds'),
  
  lineSpacing: z
    .number()
    .min(1)
    .max(2.5)
    .default(1.4)
    .describe('Line height multiplier for vertical spacing'),
  
  maxLineWidth: z
    .number()
    .min(300)
    .max(1200)
    .default(800)
    .describe('Maximum line width in pixels before wrapping'),
  
  showCursor: z
    .boolean()
    .default(true)
    .describe('Whether to show the flowing cursor element'),
  
  cursorColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color of the cursor element'),
  
  wobbleIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of character wobble effect (0 = none, 1 = maximum)'),
  
  containerAlignment: z
    .enum(['left', 'center', 'right'])
    .default('center')
    .describe('Horizontal alignment of text container'),
  
  verticalPosition: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .describe('Vertical position of text container'),
});

// ============================================================
// PRESET EXECUTION FUNCTION
// ============================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  /**
   * Parse font string format: "FontName:weight:style"
   */
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: React.CSSProperties = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10) || 400;
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10) || 400;
      }
    }

    return { fontFamily, fontStyle };
  };

  /**
   * Split text into lines based on word wrapping logic
   */
  const splitTextIntoLines = (
    text: string,
    maxWidth: number,
    fontSize: number,
  ): string[] => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = '';

    // Estimate average character width (varies by font, ~0.6 for serif)
    const avgCharWidth = fontSize * 0.6;

    words.forEach((word, index) => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const estimatedWidth = testLine.length * avgCharWidth;

      if (estimatedWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }

      // Push last line
      if (index === words.length - 1 && currentLine) {
        lines.push(currentLine);
      }
    });

    return lines.length > 0 ? lines : [text];
  };

  /**
   * Split line into individual characters
   */
  const splitLineIntoCharacters = (line: string): string[] => {
    return line.split('');
  };

  /**
   * Calculate timing for character appearance
   */
  const calculateCharacterTiming = (
    globalCharIndex: number,
    characterSpeed: number,
  ) => {
    const characterDelay = 1 / characterSpeed;
    return globalCharIndex * characterDelay;
  };

  /**
   * Create character entrance effect with arc motion and wobble
   */
  const createCharacterEffect = (
    targetId: string,
    startTime: number,
    entranceDuration: number,
    wobbleIntensity: number,
  ): GenericEffectData => {
    // Wobble parameters (scale oscillation on settle)
    const wobbleScale1 = 0.98;
    const wobbleScale2 = 1.02;
    const wobbleProgress1 = 0.6;
    const wobbleProgress2 = 0.8;

    return {
      type: 'ease-out',
      start: startTime,
      duration: entranceDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        // Arc motion: slide in from slight angle
        { key: 'translateX', val: -10, prog: 0 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: -5, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
        { key: 'rotate', val: -2, prog: 0 },
        { key: 'rotate', val: 0, prog: 1 },
        // Fade in
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.5 },
        // Wobble effect on settle (if intensity > 0)
        ...(wobbleIntensity > 0
          ? [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: wobbleScale1 * wobbleIntensity + (1 - wobbleIntensity), prog: wobbleProgress1 },
              { key: 'scale', val: wobbleScale2 * wobbleIntensity + (1 - wobbleIntensity), prog: wobbleProgress2 },
              { key: 'scale', val: 1, prog: 1 },
            ]
          : []),
      ],
    };
  };

  /**
   * Create line shift effect (carriage return)
   */
  const createLineShiftEffect = (
    targetId: string,
    shiftStartTime: number,
    lineHeight: number,
  ): GenericEffectData => {
    return {
      type: 'ease-in-out',
      start: shiftStartTime,
      duration: 0.3,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'translateY', val: 0, prog: 0 },
        { key: 'translateY', val: -lineHeight, prog: 1 },
      ],
    };
  };

  /**
   * Create cursor animation effect
   */
  const createCursorEffect = (
    targetId: string,
    totalDuration: number,
    totalCharacters: number,
    avgCharWidth: number,
  ): GenericEffectData => {
    // Cursor follows text progress
    const ranges: any[] = [];

    // Create keyframes for cursor position
    const steps = Math.min(totalCharacters, 50); // Limit keyframes for performance
    for (let i = 0; i <= steps; i++) {
      const prog = i / steps;
      const xPos = (totalCharacters * prog * avgCharWidth);
      ranges.push({ key: 'translateX', val: xPos, prog });
    }

    // Cursor fade out at end
    ranges.push({ key: 'opacity', val: 0.7, prog: 0 });
    ranges.push({ key: 'opacity', val: 0.7, prog: 0.95 });
    ranges.push({ key: 'opacity', val: 0, prog: 1 });

    return {
      type: 'linear',
      start: 0,
      duration: totalDuration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // ============================================================
  // MAIN EXECUTION LOGIC
  // ============================================================

  const { fontFamily, fontStyle } = parseFontString(params.font);
  const lines = splitTextIntoLines(params.text, params.maxLineWidth, params.fontSize);

  // Calculate line height in pixels
  const lineHeightPx = params.fontSize * params.lineSpacing;

  // Track global character index for timing
  let globalCharIndex = 0;

  // Container alignment classes
  const alignmentClasses = {
    left: 'items-start',
    center: 'items-center',
    right: 'items-end',
  };

  const verticalClasses = {
    top: 'justify-start',
    center: 'justify-center',
    bottom: 'justify-end',
  };

  // Build line containers with character atoms
  const lineContainers: RenderableComponentData[] = lines.map((lineText, lineIndex) => {
    const characters = splitLineIntoCharacters(lineText);
    const lineStartCharIndex = globalCharIndex;

    // Create character atoms with effects
    const characterAtoms: RenderableComponentData[] = characters.map((char, charIndex) => {
      const charId = `char-${lineIndex}-${charIndex}`;
      const charStartTime = calculateCharacterTiming(globalCharIndex, params.characterSpeed);

      globalCharIndex++;

      const charEffect = createCharacterEffect(
        charId,
        charStartTime,
        params.entranceDuration,
        params.wobbleIntensity,
      );

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            display: 'inline-block',
            fontSize: params.fontSize,
            color: params.textColor,
            fontFamily,
            ...fontStyle,
            transformOrigin: 'center center',
          },
          font: {
            family: fontFamily,
            weights: [fontStyle.fontWeight?.toString() || '400'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: calculateCharacterTiming(globalCharIndex, params.characterSpeed) + params.entranceDuration + 1,
          },
        },
        effects: [
          {
            id: `${charId}-entrance`,
            componentId: 'generic',
            data: charEffect,
          },
        ],
      } as RenderableComponentData;
    });

    // Line container
    const lineId = `line-${lineIndex}`;
    const lineContainer: RenderableComponentData = {
      id: lineId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'block w-full relative',
          style: {
            lineHeight: params.lineSpacing,
            contain: 'layout style',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: calculateCharacterTiming(globalCharIndex, params.characterSpeed) + params.entranceDuration + 1,
        },
      },
      childrenData: characterAtoms,
    };

    // Add line shift effect for previous lines when new line starts
    if (lineIndex > 0) {
      const lineShiftStartTime = calculateCharacterTiming(lineStartCharIndex, params.characterSpeed);
      const lineShiftEffect = createLineShiftEffect(lineId, lineShiftStartTime, lineHeightPx);

      lineContainer.effects = [
        {
          id: `${lineId}-shift`,
          componentId: 'generic',
          data: lineShiftEffect,
        },
      ];
    }

    return lineContainer;
  });

  // Calculate total duration
  const totalCharacters = globalCharIndex;
  const totalDuration = calculateCharacterTiming(totalCharacters, params.characterSpeed) + params.entranceDuration + 1;

  // Text container (holds all lines)
  const textContainer: RenderableComponentData = {
    id: 'typokinetics-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative flex flex-col',
        style: {
          gap: '0.5em',
          maxWidth: `${params.maxLineWidth}px`,
          contain: 'layout style',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: lineContainers,
  };

  // Cursor element (optional)
  const cursorAtom: RenderableComponentData | null = params.showCursor
    ? {
        id: 'typokinetics-cursor',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 2px; height: ${params.fontSize * 1.2}px; background: ${params.cursorColor}; border-radius: 1px;"></div>`,
          className: 'absolute pointer-events-none',
          style: {
            top: '0',
            left: '0',
            opacity: 0.7,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [
          {
            id: 'cursor-follow',
            componentId: 'generic',
            data: createCursorEffect(
              'typokinetics-cursor',
              totalDuration,
              totalCharacters,
              params.fontSize * 0.6,
            ),
          },
        ],
      }
    : null;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full h-full overflow-hidden flex ${alignmentClasses[params.containerAlignment]} ${verticalClasses[params.verticalPosition]}`,
        style: {
          fontFamily: `${fontFamily}, 'Times New Roman', serif`,
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [textContainer, ...(cursorAtom ? [cursorAtom] : [])],
  };

  // ============================================================
  // RETURN OUTPUT
  // ============================================================

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================
// PRESET METADATA
// ============================================================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-preset',
  title: 'Typokinetics - Elegant Typewriter Flow',
  description:
    'Creates a typewriter-meets-elegance effect where serif text flows onto the screen character by character with smooth, fluid motion. Each character slides in from a slight angle with graceful arc motion, as if being placed by a careful hand. Features carriage-return effects, flowing cursor, micro-animations with wobble and settle effects, and classic serif typography for optimal readability.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'typography', 'typewriter', 'elegant', 'animation', 'serif', 'kinetic'],
  dependencies: {},
  defaultInputParams: {
    text: 'The art of typography is the art of creating visual harmony and rhythm through the careful arrangement of letters, words, and space.',
    font: 'Georgia:400:normal',
    fontSize: 48,
    textColor: '#FFFFFF',
    characterSpeed: 17,
    entranceDuration: 0.1,
    lineSpacing: 1.4,
    maxLineWidth: 800,
    showCursor: true,
    cursorColor: '#FFFFFF',
    wobbleIntensity: 0.5,
    containerAlignment: 'center',
    verticalPosition: 'center',
  },
};

// ============================================================
// EXPORT PRESET
// ============================================================

export const typokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};