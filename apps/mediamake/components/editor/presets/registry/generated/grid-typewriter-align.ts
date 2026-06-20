/**
 * Grid Typewriter Align Effect Preset
 *
 * This preset simulates authentic typewriter physics with grid-based tab stops for text elements.
 * Characters type out with realistic mechanical effects including vertical jitter, variable opacity
 * for key pressure simulation, and snapping to grid-aligned tab positions. Includes carriage return
 * animations when moving to new grid rows.
 *
 * Features:
 * - **Grid-Based Tab Stops**: Characters snap to predefined x positions for typewriter-style alignment
 * - **Authentic Typewriter Physics**: Vertical jitter, variable opacity for key pressure effect
 * - **Per-Character Animation**: Each character animates independently with staggered timing
 * - **Carriage Return Effects**: Smooth transitions when moving to new grid rows
 * - **Optional Paper Texture**: Overlay for authentic typewriter aesthetic
 * - **Typing Sound Sync**: Optional audio synchronization with character appearance
 *
 * Use cases:
 * - Creating retro typewriter text effects
 * - Building vintage document animations
 * - Simulating mechanical typing for nostalgia content
 * - Creating grid-aligned monospace text layouts
 * - Adding authentic typing sound effects
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
  text: z.string().describe('Text content to type out with typewriter effect'),
  gridTabStops: z
    .array(z.number())
    .default([0, 100, 200, 300, 400, 500, 600, 700])
    .describe('Array of x positions (pixels) for grid-based tab stops'),
  lineHeight: z
    .number()
    .default(40)
    .describe('Grid-based line height in pixels for vertical spacing'),
  typeSpeed: z
    .number()
    .default(50)
    .describe('Time per character in milliseconds'),
  jitterAmount: z
    .number()
    .default(2)
    .describe('Vertical jitter amount in pixels for typewriter physics'),
  pressureVariation: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Opacity variation range (0-1) simulating key pressure'),
  carriageReturnDuration: z
    .number()
    .default(200)
    .describe('Duration in milliseconds for carriage return animation'),
  font: z
    .string()
    .optional()
    .default('Courier New')
    .describe(
      'Font family (typewriter fonts recommended: Courier New, Courier, monospace)',
    ),
  fontSize: z
    .number()
    .default(24)
    .describe('Font size in pixels for typewriter text'),
  textColor: z
    .string()
    .default('#000000')
    .describe('Text color (hex or rgba)'),
  paperTexture: z
    .object({
      enabled: z.boolean().default(false),
      src: z.string().optional(),
      opacity: z.number().min(0).max(1).default(0.15),
    })
    .optional()
    .describe('Optional paper texture overlay configuration'),
  typingSound: z
    .object({
      enabled: z.boolean().default(false),
      src: z.string().optional(),
      volume: z.number().min(0).max(1).default(0.5),
    })
    .optional()
    .describe('Optional typing sound effect configuration'),
  containerWidth: z
    .number()
    .default(1920)
    .describe('Container width in pixels for layout calculations'),
  containerHeight: z
    .number()
    .default(1080)
    .describe('Container height in pixels for layout calculations'),
  startX: z
    .number()
    .default(100)
    .describe('Starting x position (left margin) in pixels'),
  startY: z
    .number()
    .default(100)
    .describe('Starting y position (top margin) in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;

    const fontStyle: any = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2];
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }

    return { fontFamily, fontStyle };
  };

  // Helper function: Find nearest tab stop
  const findNearestTabStop = (currentX: number, tabStops: number[]) => {
    let nearest = tabStops[0];
    let minDiff = Math.abs(currentX - tabStops[0]);

    for (const stop of tabStops) {
      const diff = Math.abs(currentX - stop);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = stop;
      }
    }

    return nearest;
  };

  // Helper function: Calculate word positions with tab stops
  const calculateWordPositions = (
    text: string,
    gridTabStops: number[],
    lineHeight: number,
    startX: number,
    startY: number,
    containerWidth: number,
  ) => {
    const words = text.split(/(\s+)/); // Keep spaces
    const positions: Array<{
      word: string;
      x: number;
      y: number;
      tabStop: number;
      isNewLine: boolean;
    }> = [];

    let currentX = startX;
    let currentY = startY;
    let currentTabStopIndex = 0;

    for (const word of words) {
      if (word.trim() === '') {
        // Space - move to next tab stop
        currentTabStopIndex++;
        if (currentTabStopIndex >= gridTabStops.length) {
          // Carriage return - new line
          currentTabStopIndex = 0;
          currentY += lineHeight;
          currentX = startX;
        } else {
          currentX = gridTabStops[currentTabStopIndex];
        }
        continue;
      }

      // Check if word fits in current line
      const wordWidth = word.length * (params.fontSize * 0.6); // Approximate monospace width
      const nextTabStop =
        gridTabStops[
          Math.min(currentTabStopIndex + 1, gridTabStops.length - 1)
        ];

      if (currentX + wordWidth > nextTabStop && currentTabStopIndex > 0) {
        // Word doesn't fit - carriage return
        currentTabStopIndex = 0;
        currentY += lineHeight;
        currentX = startX;
      }

      const isNewLine = currentX === startX && positions.length > 0;

      positions.push({
        word,
        x: currentX,
        y: currentY,
        tabStop: gridTabStops[currentTabStopIndex],
        isNewLine,
      });

      // Move to next tab stop after word
      currentTabStopIndex++;
      if (currentTabStopIndex >= gridTabStops.length) {
        currentTabStopIndex = 0;
        currentY += lineHeight;
        currentX = startX;
      } else {
        currentX = gridTabStops[currentTabStopIndex];
      }
    }

    return positions;
  };

  // Parse font
  const { fontFamily, fontStyle } = parseFontString(params.font || 'Courier New');

  // Calculate word positions
  const wordPositions = calculateWordPositions(
    params.text,
    params.gridTabStops,
    params.lineHeight,
    params.startX,
    params.startY,
    params.containerWidth,
  );

  // Calculate total character count for duration
  let totalCharCount = 0;
  for (const pos of wordPositions) {
    totalCharCount += pos.word.length;
  }

  // Convert typeSpeed from ms to seconds
  const typeSpeedSec = params.typeSpeed / 1000;
  const totalDuration = totalCharCount * typeSpeedSec;

  // Create character components with effects
  const characterComponents: any[] = [];
  let currentTime = 0;

  for (let wordIndex = 0; wordIndex < wordPositions.length; wordIndex++) {
    const pos = wordPositions[wordIndex];
    const { word, x, y, isNewLine } = pos;

    // Add carriage return delay if new line
    if (isNewLine) {
      currentTime += params.carriageReturnDuration / 1000;
    }

    // Create characters for this word
    for (let charIndex = 0; charIndex < word.length; charIndex++) {
      const char = word[charIndex];
      const charId = `char-${wordIndex}-${charIndex}`;

      // Calculate character position (monospace approximation)
      const charX = x + charIndex * (params.fontSize * 0.6);
      const charY = y;

      // Random pressure variation for this character
      const pressureOpacity = 0.7 + Math.random() * params.pressureVariation;

      // Random jitter for this character
      const jitter = (Math.random() - 0.5) * 2 * params.jitterAmount;

      // Create character effect
      const charEffect = {
        id: `effect-${charId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: currentTime,
          duration: typeSpeedSec * 2,
          mode: 'provider' as const,
          targetIds: [charId],
          ranges: [
            // Opacity: fade in with pressure variation
            { key: 'opacity', val: pressureOpacity * 0.5, prog: 0 },
            { key: 'opacity', val: pressureOpacity, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 1 },
            // Vertical jitter: slight bounce
            { key: 'translateY', val: 0, prog: 0 },
            { key: 'translateY', val: jitter, prog: 0.5 },
            { key: 'translateY', val: 0, prog: 1 },
            // Scale: slight impact effect
            { key: 'scale', val: 0.95, prog: 0 },
            { key: 'scale', val: 1, prog: 0.2 },
          ],
        },
      };

      // Create character component
      const charComponent = {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            position: 'absolute' as const,
            left: `${charX}px`,
            top: `${charY}px`,
            fontSize: `${params.fontSize}px`,
            color: params.textColor,
            fontFamily: fontFamily,
            ...fontStyle,
            opacity: 0,
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
            start: 0,
            duration: totalDuration,
          },
        },
        effects: [charEffect],
      };

      characterComponents.push(charComponent);

      // Advance time for next character
      currentTime += typeSpeedSec;
    }
  }

  // Create container for characters
  const textContainer = {
    id: 'grid-typewriter-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          width: `${params.containerWidth}px`,
          height: `${params.containerHeight}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: characterComponents as RenderableComponentData[],
  };

  // Optional paper texture overlay
  const paperTextureOverlay =
    params.paperTexture?.enabled && params.paperTexture.src
      ? {
          id: 'paper-texture-overlay',
          type: 'atom' as const,
          componentId: 'ImageAtom',
          data: {
            src: params.paperTexture.src,
            className: 'absolute inset-0 pointer-events-none',
            style: {
              opacity: params.paperTexture.opacity,
              mixBlendMode: 'multiply' as const,
            },
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        }
      : null;

  // Optional typing sound
  const typingSound =
    params.typingSound?.enabled && params.typingSound.src
      ? {
          id: 'typing-sound',
          type: 'atom' as const,
          componentId: 'AudioAtom',
          data: {
            src: params.typingSound.src,
            volume: params.typingSound.volume,
          },
          context: {
            timing: {
              start: 0,
              duration: totalDuration,
            },
          },
        }
      : null;

  // Build final children array
  const allChildren: RenderableComponentData[] = [textContainer];
  if (paperTextureOverlay) {
    allChildren.unshift(paperTextureOverlay as RenderableComponentData);
  }
  if (typingSound) {
    allChildren.push(typingSound as RenderableComponentData);
  }

  // Root container
  const rootContainer = {
    id: 'grid-typewriter-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          backgroundColor: '#ffffff',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: allChildren,
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'grid-typewriter-align',
  title: 'Grid Typewriter Align Effect',
  description:
    'Authentic typewriter text animation with grid-based tab stops, character-level jitter, variable key pressure opacity, and carriage return animations. Supports optional paper texture overlay and typing sound synchronization.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'grid',
    'retro',
    'vintage',
    'mechanical',
    'animation',
    'effects',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'The quick brown fox jumps over the lazy dog.',
    gridTabStops: [0, 100, 200, 300, 400, 500, 600, 700],
    lineHeight: 40,
    typeSpeed: 50,
    jitterAmount: 2,
    pressureVariation: 0.3,
    carriageReturnDuration: 200,
    font: 'Courier New',
    fontSize: 24,
    textColor: '#000000',
    paperTexture: {
      enabled: false,
      opacity: 0.15,
    },
    typingSound: {
      enabled: false,
      volume: 0.5,
    },
    containerWidth: 1920,
    containerHeight: 1080,
    startX: 100,
    startY: 100,
  },
};

// Export preset
export const gridTypewriterAlignPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
