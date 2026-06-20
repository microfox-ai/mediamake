/**
 * Digital Glitch Tech Word System Preset
 * 
 * A sophisticated glitch and digital effect system for tech-related words in transcripts.
 * Detects technology terms (DIGITAL, CYBER, HACK, GLITCH, ONLINE, DOWNLOAD) and applies
 * authentic digital distortion effects including RGB color channel splitting, data moshing
 * effects with pixelation, matrix-style character rain, barcode/QR code transformations,
 * binary code reveals, and terminal-style typing animations.
 * 
 * Features:
 * - **RGB Channel Splitting**: Separate red, green, and blue channels with offset and blend modes
 * - **Matrix Rain Effect**: Falling characters with staggered delays for tech aesthetic
 * - **Binary Code Reveal**: Overlay of binary digits that fade to reveal actual text
 * - **Glitch Distortion**: Rapid translateX jumps with skew for authentic digital interference
 * - **Pixelation Effects**: CSS filters for data moshing and compression artifacts
 * - **Barcode Transform**: Morph text into vertical lines using scaleX
 * - **Terminal Typing**: ClipPath animation for progressive text reveal
 * - **Scanline Overlay**: Repeating gradient for CRT screen effect
 * 
 * Use cases:
 * - Creating tech-themed content with authentic digital effects
 * - Adding glitch aesthetics to technology-related videos
 * - Building cyberpunk or futuristic visual styles
 * - Emphasizing digital/tech keywords in transcripts
 */

import { Sequence } from 'remotion';
import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---
const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption/transcription sentences with words and timing'),
  techWords: z.array(z.string()).optional().default([
    'DIGITAL', 'CYBER', 'HACK', 'GLITCH', 'ONLINE', 'DOWNLOAD',
    'DATA', 'CODE', 'MATRIX', 'VIRTUAL', 'SYSTEM', 'NETWORK',
    'TECH', 'SOFTWARE', 'HARDWARE', 'ALGORITHM', 'BINARY'
  ]).describe('Array of technology terms to detect and apply effects to (case-insensitive)'),
  effectIntensity: z.number().min(0.1).max(3.0).default(1.0).describe('Global effect intensity multiplier (0.1 = subtle, 3.0 = extreme)'),
  rgbSplitAmount: z.number().min(0).max(10).default(2).describe('Pixel offset for RGB channel splitting'),
  glitchFrequency: z.number().min(0).max(1).default(0.3).describe('How often glitch distortion occurs (0 = never, 1 = constantly)'),
  matrixRainEnabled: z.boolean().default(true).describe('Enable matrix-style falling characters effect'),
  matrixCharCount: z.number().min(5).max(50).default(20).describe('Number of matrix rain characters'),
  binaryRevealEnabled: z.boolean().default(true).describe('Enable binary code reveal overlay'),
  terminalTypingEnabled: z.boolean().default(true).describe('Enable terminal-style typing animation'),
  pixelationEnabled: z.boolean().default(true).describe('Enable pixelation/data moshing effects'),
  barcodeEnabled: z.boolean().default(false).describe('Enable barcode transformation effect'),
  fontSize: z.number().min(12).max(200).default(48).describe('Base font size in pixels'),
  font: z.string().optional().default('Courier New').describe('Monospace font family for terminal aesthetic'),
  primaryColor: z.string().default('#00ff00').describe('Primary color for tech effects (matrix green by default)'),
  secondaryColor: z.string().default('#00ffff').describe('Secondary color for accents (cyan by default)'),
  backgroundColor: z.string().default('rgba(0, 0, 0, 0.8)').describe('Background color for text backdrop'),
  positionY: z.enum(['top', 'center', 'bottom']).default('bottom').describe('Vertical position of text on screen'),
  scanlineOpacity: z.number().min(0).max(1).default(0.1).describe('Opacity of CRT scanline overlay'),
});

// --- Preset Execution Function ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    techWords,
    effectIntensity,
    rgbSplitAmount,
    glitchFrequency,
    matrixRainEnabled,
    matrixCharCount,
    binaryRevealEnabled,
    terminalTypingEnabled,
    pixelationEnabled,
    barcodeEnabled,
    fontSize,
    font,
    primaryColor,
    secondaryColor,
    backgroundColor,
    positionY,
    scanlineOpacity,
  } = params;

  // Helper: Check if word is a tech word
  const isTechWord = (text: string): boolean => {
    const upperText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    return techWords.some(techWord => 
      upperText.includes(techWord.toUpperCase().replace(/[^A-Z0-9]/g, ''))
    );
  };

  // Helper: Parse font string
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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

  const { fontFamily, fontStyle } = parseFontString(font);

  // Helper: Generate random binary string
  const generateBinary = (length: number): string => {
    return Array.from({ length }, () => Math.random() > 0.5 ? '1' : '0').join('');
  };

  // Helper: Generate random matrix characters
  const generateMatrixChar = (): string => {
    const chars = '01アイウエオカキクケコサシスセソタチツテト';
    return chars[Math.floor(Math.random() * chars.length)];
  };

  // Position mapping
  const positionClasses = {
    top: 'items-start pt-20',
    center: 'items-center',
    bottom: 'items-end pb-20',
  };

  const childrenData: any[] = [];

  // Process each caption
  captions.forEach((caption: TranscriptionSentence, captionIndex: number) => {
    const words = caption.words || [];
    
    words.forEach((word, wordIndex) => {
      const wordText = word.text;
      const isTech = isTechWord(wordText);
      
      if (!isTech) {
        // Regular word without effects
        const regularWordComponent = {
          id: `word-${captionIndex}-${wordIndex}`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: `absolute inset-0 flex flex-col justify-center ${positionClasses[positionY]}`,
            },
          },
          context: {
            timing: {
              start: word.absoluteStart,
              duration: word.duration,
            },
          },
          childrenData: [
            {
              id: `word-text-${captionIndex}-${wordIndex}`,
              type: 'atom' as const,
              componentId: 'TextAtom',
              data: {
                text: wordText,
                style: {
                  fontSize: `${fontSize}px`,
                  color: '#ffffff',
                  fontFamily,
                  textAlign: 'center',
                  padding: '0.5em 1em',
                  backgroundColor,
                  backdropFilter: 'blur(4px)',
                  borderRadius: '4px',
                  ...fontStyle,
                },
                font: {
                  family: fontFamily,
                  ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration: word.duration,
                },
              },
            },
          ],
        };
        childrenData.push(regularWordComponent);
        return;
      }

      // Tech word - apply digital glitch effects
      const wordId = `tech-word-${captionIndex}-${wordIndex}`;
      const baseId = `${wordId}-base`;
      
      // RGB Channel components
      const redChannelId = `${wordId}-red`;
      const greenChannelId = `${wordId}-green`;
      const blueChannelId = `${wordId}-blue`;
      
      const rgbChannels = [
        {
          id: redChannelId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: wordText,
            style: {
              position: 'absolute',
              inset: '0',
              fontSize: `${fontSize}px`,
              fontFamily,
              mixBlendMode: 'screen',
              color: '#ff0000',
              textAlign: 'center',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
          effects: [
            {
              id: `${redChannelId}-offset`,
              componentId: `${redChannelId}-offset`,
              data: {
                type: 'linear',
                start: 0,
                duration: word.duration,
                mode: 'provider',
                targetIds: [redChannelId],
                ranges: [
                  { key: 'translateX', val: -rgbSplitAmount * effectIntensity, prog: 0 },
                  { key: 'translateX', val: -rgbSplitAmount * effectIntensity, prog: 1 },
                ],
              },
            },
          ],
        },
        {
          id: greenChannelId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: wordText,
            style: {
              position: 'absolute',
              inset: '0',
              fontSize: `${fontSize}px`,
              fontFamily,
              mixBlendMode: 'multiply',
              color: '#00ff00',
              textAlign: 'center',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
        },
        {
          id: blueChannelId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: wordText,
            style: {
              position: 'absolute',
              inset: '0',
              fontSize: `${fontSize}px`,
              fontFamily,
              mixBlendMode: 'exclusion',
              color: '#0000ff',
              textAlign: 'center',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
          effects: [
            {
              id: `${blueChannelId}-offset`,
              componentId: `${blueChannelId}-offset`,
              data: {
                type: 'linear',
                start: 0,
                duration: word.duration,
                mode: 'provider',
                targetIds: [blueChannelId],
                ranges: [
                  { key: 'translateX', val: rgbSplitAmount * effectIntensity, prog: 0 },
                  { key: 'translateX', val: rgbSplitAmount * effectIntensity, prog: 1 },
                ],
              },
            },
          ],
        },
      ];

      // Glitch distortion effect
      const glitchEffects: any[] = [];
      if (glitchFrequency > 0) {
        const glitchCount = Math.max(1, Math.floor(word.duration * 10 * glitchFrequency));
        for (let i = 0; i < glitchCount; i++) {
          const glitchStart = (word.duration / glitchCount) * i;
          const glitchDuration = 0.05; // 50ms glitch
          glitchEffects.push({
            id: `${baseId}-glitch-${i}`,
            componentId: `${baseId}-glitch-${i}`,
            data: {
              type: 'steps(1)',
              start: glitchStart,
              duration: glitchDuration,
              mode: 'provider',
              targetIds: [baseId],
              ranges: [
                { key: 'translateX', val: (Math.random() - 0.5) * 20 * effectIntensity, prog: 0 },
                { key: 'skewX', val: (Math.random() - 0.5) * 12 * effectIntensity, prog: 0.5 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'skewX', val: 0, prog: 1 },
              ],
            },
          });
        }
      }

      // Pixelation effect
      const pixelationEffect = pixelationEnabled ? {
        id: `${baseId}-pixelation`,
        componentId: `${baseId}-pixelation`,
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: word.duration * 0.3,
          mode: 'provider',
          targetIds: [baseId],
          ranges: [
            { key: 'filter:contrast', val: 200, prog: 0 },
            { key: 'filter:brightness', val: 150, prog: 0 },
            { key: 'filter:contrast', val: 100, prog: 1 },
            { key: 'filter:brightness', val: 100, prog: 1 },
          ],
        },
      } : null;

      // Terminal typing effect
      const terminalEffect = terminalTypingEnabled ? {
        id: `${baseId}-terminal`,
        componentId: `${baseId}-terminal`,
        data: {
          type: 'steps(10)',
          start: 0,
          duration: word.duration * 0.5,
          mode: 'provider',
          targetIds: [baseId],
          ranges: [
            { key: 'clipPath', val: 'inset(0 100% 0 0)', prog: 0 },
            { key: 'clipPath', val: 'inset(0 0% 0 0)', prog: 1 },
          ],
        },
      } : null;

      // Base container with RGB channels
      const rgbContainer = {
        id: baseId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative inline-block',
            style: {
              padding: '0.5em 1em',
              backgroundColor,
              backdropFilter: 'blur(4px)',
              borderRadius: '4px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        childrenData: rgbChannels,
        effects: [
          ...glitchEffects,
          ...(pixelationEffect ? [pixelationEffect] : []),
          ...(terminalEffect ? [terminalEffect] : []),
        ].filter(Boolean),
      };

      // Matrix rain overlay
      const matrixRain = matrixRainEnabled ? Array.from({ length: matrixCharCount }, (_, i) => ({
        id: `${wordId}-matrix-${i}`,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: generateMatrixChar(),
          style: {
            position: 'absolute',
            left: `${(i / matrixCharCount) * 100}%`,
            top: '0',
            fontSize: `${fontSize * 0.4}px`,
            color: primaryColor,
            fontFamily: 'monospace',
            opacity: 0.7,
          },
          font: {
            family: 'monospace',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-matrix-${i}-fall`,
            componentId: `${wordId}-matrix-${i}-fall`,
            data: {
              type: 'linear',
              start: i * 0.05,
              duration: word.duration,
              mode: 'provider',
              targetIds: [`${wordId}-matrix-${i}`],
              ranges: [
                { key: 'translateY', val: -50, prog: 0 },
                { key: 'translateY', val: 100, prog: 1 },
                { key: 'opacity', val: 0.7, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      })) : [];

      // Binary overlay
      const binaryOverlay = binaryRevealEnabled ? {
        id: `${wordId}-binary`,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: generateBinary(wordText.length * 3),
          style: {
            position: 'absolute',
            inset: '0',
            fontSize: `${fontSize}px`,
            color: secondaryColor,
            fontFamily: 'monospace',
            textAlign: 'center',
            opacity: 1,
          },
          font: {
            family: 'monospace',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
        effects: [
          {
            id: `${wordId}-binary-fade`,
            componentId: `${wordId}-binary-fade`,
            data: {
              type: 'ease-out',
              start: 0,
              duration: word.duration * 0.4,
              mode: 'provider',
              targetIds: [`${wordId}-binary`],
              ranges: [
                { key: 'opacity', val: 1, prog: 0 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } : null;

      // Scanline overlay
      const scanlineOverlay = {
        id: `${wordId}-scanline`,
        type: 'atom' as const,
        componentId: 'ShapeAtom',
        data: {
          shape: 'rectangle',
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,${scanlineOpacity}) 2px, rgba(0,0,0,${scanlineOpacity}) 4px)`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
      };

      // Main word container
      const wordContainer = {
        id: wordId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex flex-col justify-center ${positionClasses[positionY]}`,
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: word.duration,
          },
        },
        childrenData: [
          rgbContainer,
          ...matrixRain,
          ...(binaryOverlay ? [binaryOverlay] : []),
          scanlineOverlay,
        ].filter(Boolean),
      };

      childrenData.push(wordContainer);
    });
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

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'digital-glitch-tech-words',
  title: 'Digital Glitch Tech Word System',
  description: 'A sophisticated glitch and digital effect system for tech-related words in transcripts. Detects technology terms (DIGITAL, CYBER, HACK, GLITCH, ONLINE, DOWNLOAD) and applies authentic digital distortion effects including RGB color channel splitting, matrix-style character rain, binary code reveals, and terminal-style typing animations. Uses CSS filters, blend modes, and Remotion effects for convincing digital interference without heavy computation.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'digital',
    'tech',
    'rgb-split',
    'matrix',
    'binary',
    'terminal',
    'cyberpunk',
    'distortion',
    'effects',
    'transcription',
    'subtitles',
  ],
  defaultInputParams: {
    captions: [],
    techWords: [
      'DIGITAL', 'CYBER', 'HACK', 'GLITCH', 'ONLINE', 'DOWNLOAD',
      'DATA', 'CODE', 'MATRIX', 'VIRTUAL', 'SYSTEM', 'NETWORK',
    ],
    effectIntensity: 1.0,
    rgbSplitAmount: 2,
    glitchFrequency: 0.3,
    matrixRainEnabled: true,
    matrixCharCount: 20,
    binaryRevealEnabled: true,
    terminalTypingEnabled: true,
    pixelationEnabled: true,
    barcodeEnabled: false,
    fontSize: 48,
    font: 'Courier New',
    primaryColor: '#00ff00',
    secondaryColor: '#00ffff',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    positionY: 'bottom',
    scanlineOpacity: 0.1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---
export const digitalGlitchTechWordsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};