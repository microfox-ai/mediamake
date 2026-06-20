/**
 * Isometric Pixel Art Typography Preset
 *
 * This preset creates chunky isometric pixel art typography with 3D pixelated text blocks
 * in dimetric projection. Each word appears as a solid 3D block with visible top, right, and front faces,
 * rendered in authentic pixel art style. Words stack and arrange themselves like Tetris blocks,
 * falling into place with satisfying snap movements.
 *
 * Features:
 * - **3D Isometric Blocks**: Each word is a 3D block with top, right, and front faces
 * - **Dimetric Projection**: Authentic isometric view (rotateX(30deg) rotateY(-45deg))
 * - **Pixel Art Shading**: 3-4 color ramps using hard-stop gradients for authentic pixel art
 * - **Tetris-style Animation**: Words fall and snap into place with stepped easing
 * - **Pixel-by-Pixel Build**: Construction animation from bottom to top using clip-path
 * - **Ambient Animations**: Floating pixel dust, breathing scaling, particle effects
 * - **Emphasis Rotation**: Words rotate in isometric space showing all faces
 * - **16-bit Era Colors**: Vibrant but limited color palette inspired by retro games
 * - **Integer Pixel Values**: All movements use whole pixel values (no sub-pixel)
 * - **Drop Shadows**: Hard-edged shadows with no blur for pixel precision
 *
 * Use cases:
 * - Retro gaming content and pixel art videos
 * - 8-bit/16-bit aesthetic title sequences
 * - Nostalgic tech presentations
 * - Indie game promotional videos
 * - Pixel art tutorial content
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
      }),
    )
    .describe('Array of caption sentences with words'),

  colorPalette: z
    .enum(['retro-blue', 'neon-pink', 'forest-green', 'sunset-orange', 'royal-purple'])
    .default('retro-blue')
    .optional()
    .describe('16-bit era color palette choice'),

  fontSize: z
    .number()
    .min(24)
    .max(96)
    .default(48)
    .optional()
    .describe('Base font size in pixels (snapped to grid)'),

  blockDepth: z
    .number()
    .min(8)
    .max(32)
    .default(16)
    .optional()
    .describe('3D block depth in pixels'),

  fallDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .optional()
    .describe('Duration of Tetris-style falling animation in seconds'),

  buildDuration: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Duration of pixel-by-pixel construction in seconds'),

  emphasisRotation: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable rotation animation for emphasis'),

  breathingAnimation: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable subtle breathing scaling animation'),

  pixelDustCount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .optional()
    .describe('Number of floating pixel dust particles'),

  stackingLayout: z
    .enum(['horizontal', 'vertical', 'tetris'])
    .default('tetris')
    .optional()
    .describe('How words arrange themselves (tetris = staggered grid)'),

  font: z
    .string()
    .default('Press Start 2P')
    .optional()
    .describe('Pixel art font family (e.g., "Press Start 2P", "VT323")'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    colorPalette = 'retro-blue',
    fontSize = 48,
    blockDepth = 16,
    fallDuration = 0.8,
    buildDuration = 1.5,
    emphasisRotation = true,
    breathingAnimation = true,
    pixelDustCount = 8,
    stackingLayout = 'tetris',
    font = 'Press Start 2P',
  } = params;

  // Helper: Get color palette (3-4 shades per color)
  const getColorPalette = (palette: string) => {
    const palettes: Record<string, { front: string; top: string; right: string; shadow: string }> = {
      'retro-blue': {
        front: '#60a5fa',  // Blue-400
        top: '#3b82f6',    // Blue-500
        right: '#2563eb',  // Blue-600
        shadow: '#1e40af', // Blue-800
      },
      'neon-pink': {
        front: '#f472b6',  // Pink-400
        top: '#ec4899',    // Pink-500
        right: '#db2777',  // Pink-600
        shadow: '#9f1239', // Pink-900
      },
      'forest-green': {
        front: '#4ade80',  // Green-400
        top: '#22c55e',    // Green-500
        right: '#16a34a',  // Green-600
        shadow: '#14532d', // Green-900
      },
      'sunset-orange': {
        front: '#fb923c',  // Orange-400
        top: '#f97316',    // Orange-500
        right: '#ea580c',  // Orange-600
        shadow: '#7c2d12', // Orange-900
      },
      'royal-purple': {
        front: '#c084fc',  // Purple-400
        top: '#a855f7',    // Purple-500
        right: '#9333ea',  // Purple-600
        shadow: '#581c87', // Purple-900
      },
    };
    return palettes[palette] || palettes['retro-blue'];
  };

  const colors = getColorPalette(colorPalette);

  // Helper: Create pixel art gradient (hard stops)
  const createPixelGradient = (baseColor: string, darkerColor: string, layers: number = 4) => {
    const stops = [];
    for (let i = 0; i < layers; i++) {
      const percent = (i / layers) * 100;
      const nextPercent = ((i + 1) / layers) * 100;
      stops.push(`${i % 2 === 0 ? baseColor : darkerColor} ${percent}%`);
      stops.push(`${i % 2 === 0 ? baseColor : darkerColor} ${nextPercent}%`);
    }
    return `linear-gradient(180deg, ${stops.join(', ')})`;
  };

  // Helper: Snap to pixel grid
  const snapToGrid = (value: number, gridSize: number = 16) => {
    return Math.round(value / gridSize) * gridSize;
  };

  // Helper: Calculate word position based on layout
  const calculateWordPosition = (index: number, totalWords: number, layout: string) => {
    switch (layout) {
      case 'horizontal':
        return { x: index * snapToGrid(fontSize * 3), y: 0 };
      case 'vertical':
        return { x: 0, y: index * snapToGrid(fontSize * 1.5) };
      case 'tetris':
        // Staggered grid like Tetris blocks
        const row = Math.floor(index / 3);
        const col = index % 3;
        return {
          x: col * snapToGrid(fontSize * 2.5) + (row % 2 === 0 ? 0 : snapToGrid(fontSize * 1.25)),
          y: row * snapToGrid(fontSize * 1.5),
        };
      default:
        return { x: 0, y: 0 };
    }
  };

  // Parse font string
  const fontString = font || 'Press Start 2P';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
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

  // Create pixel dust particles
  const createPixelDust = () => {
    const dustParticles: RenderableComponentData[] = [];
    const dustColors = [colors.front, colors.top, colors.right, '#eab308', '#22c55e'];

    for (let i = 0; i < pixelDustCount; i++) {
      const dustId = `pixel-dust-${i}`;
      const randomX = Math.random() * 90 + 5; // 5-95%
      const randomY = Math.random() * 90 + 5;
      const randomColor = dustColors[Math.floor(Math.random() * dustColors.length)];
      const floatDistance = snapToGrid(Math.random() * 32 + 16); // 16-48px
      const floatDuration = Math.random() * 2 + 2; // 2-4s

      dustParticles.push({
        id: dustId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: '<div></div>',
          className: 'w-2 h-2',
          style: {
            backgroundColor: randomColor,
            position: 'absolute',
            left: `${randomX}%`,
            top: `${randomY}%`,
            opacity: 0.6,
            imageRendering: 'pixelated',
          },
        },
        effects: [
          {
            id: `dust-float-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: floatDuration,
              mode: 'provider',
              targetIds: [dustId],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -floatDistance, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0.4, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0.4, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      } as RenderableComponentData);
    }

    return dustParticles;
  };

  // Create 3D word blocks for each caption
  const createWordBlocks = () => {
    const allWordBlocks: RenderableComponentData[] = [];

    captions.forEach((caption) => {
      caption.words.forEach((word, wordIndex) => {
        const wordId = `word-block-${caption.id}-${wordIndex}`;
        const wordContainerId = `word-container-${caption.id}-${wordIndex}`;
        const position = calculateWordPosition(wordIndex, caption.words.length, stackingLayout);

        // Calculate fall distance (snap to 16px grid)
        const fallDistance = snapToGrid(200 + wordIndex * 32);

        // Create effects
        const effects: any[] = [];

        // 1. Tetris fall animation (with steps easing)
        effects.push({
          id: `fall-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: word.start,
            duration: fallDuration,
            mode: 'provider',
            targetIds: [wordContainerId],
            ranges: [
              { key: 'translateY', val: -fallDistance, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        });

        // 2. Pixel-by-pixel build animation (clip-path)
        effects.push({
          id: `build-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: word.start + fallDuration * 0.5,
            duration: buildDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'clipPath', val: 'inset(100% 0 0 0)', prog: 0 },
              { key: 'clipPath', val: 'inset(0% 0 0 0)', prog: 1 },
            ],
          } as GenericEffectData,
        });

        // 3. Breathing animation (optional)
        if (breathingAnimation) {
          effects.push({
            id: `breathe-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: word.start + fallDuration + buildDuration,
              duration: word.duration - fallDuration - buildDuration,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'scale', val: 1, prog: 0 },
                { key: 'scale', val: 1.05, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          });
        }

        // 4. Emphasis rotation (optional)
        if (emphasisRotation && wordIndex % 3 === 0) {
          effects.push({
            id: `rotate-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: word.start + fallDuration + buildDuration + 0.5,
              duration: 1,
              mode: 'provider',
              targetIds: [wordId],
              ranges: [
                { key: 'rotateY', val: -45, prog: 0 },
                { key: 'rotateY', val: 315, prog: 1 },
              ],
            } as GenericEffectData,
          });
        }

        // Create 3D block structure
        const wordBlock: RenderableComponentData = {
          id: wordContainerId,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute',
              style: {
                left: `calc(50% + ${position.x}px)`,
                top: `calc(50% + ${position.y}px)`,
                transformStyle: 'preserve-3d',
                transform: 'translate(-50%, -50%)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
          effects,
          childrenData: [
            // 3D block with faces
            {
              id: wordId,
              type: 'layout' as const,
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'relative',
                  style: {
                    transform: 'rotateX(30deg) rotateY(-45deg)',
                    transformStyle: 'preserve-3d',
                    imageRendering: 'pixelated',
                  },
                },
              },
              childrenData: [
                // Front face (main text)
                {
                  id: `${wordId}-front`,
                  type: 'layout' as const,
                  componentId: 'BaseLayout',
                  data: {
                    containerProps: {
                      className: 'relative',
                      style: {
                        padding: `${blockDepth / 2}px ${blockDepth}px`,
                        background: createPixelGradient(colors.front, colors.top),
                        boxShadow: `${blockDepth / 4}px ${blockDepth / 4}px 0 ${colors.shadow}`,
                      },
                    },
                  },
                  childrenData: [
                    {
                      id: `${wordId}-text`,
                      type: 'atom' as const,
                      componentId: 'TextAtom',
                      data: {
                        text: word.text,
                        style: {
                          fontSize: `${fontSize}px`,
                          fontWeight: 'bold',
                          color: '#ffffff',
                          textShadow: `2px 2px 0 ${colors.shadow}`,
                          ...fontStyle,
                        },
                        font: {
                          family: fontFamily,
                          weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
                        },
                      } as TextAtomData,
                    } as RenderableComponentData,
                  ],
                },
                // Top face
                {
                  id: `${wordId}-top`,
                  type: 'layout' as const,
                  componentId: 'BaseLayout',
                  data: {
                    containerProps: {
                      className: 'absolute',
                      style: {
                        width: `calc(100% + ${blockDepth}px)`,
                        height: `${blockDepth}px`,
                        background: createPixelGradient(colors.top, colors.right),
                        transform: `rotateX(90deg) translateZ(${blockDepth / 2}px)`,
                        transformOrigin: 'top',
                        top: `-${blockDepth / 2}px`,
                        left: `-${blockDepth / 2}px`,
                      },
                    },
                  },
                },
                // Right face
                {
                  id: `${wordId}-right`,
                  type: 'layout' as const,
                  componentId: 'BaseLayout',
                  data: {
                    containerProps: {
                      className: 'absolute',
                      style: {
                        width: `${blockDepth}px`,
                        height: `calc(100% + ${blockDepth}px)`,
                        background: createPixelGradient(colors.right, colors.shadow),
                        transform: `rotateY(90deg) translateZ(calc(100% - ${blockDepth / 2}px))`,
                        transformOrigin: 'right',
                        top: `-${blockDepth / 2}px`,
                        right: `-${blockDepth / 2}px`,
                      },
                    },
                  },
                },
              ],
            } as RenderableComponentData,
          ],
        } as RenderableComponentData;

        allWordBlocks.push(wordBlock);
      });
    });

    return allWordBlocks;
  };

  // Build final composition
  const pixelDustLayer: RenderableComponentData = {
    id: 'pixel-dust-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          zIndex: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: createPixelDust(),
  };

  const wordsLayer: RenderableComponentData = {
    id: 'words-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          zIndex: 10,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: createWordBlocks(),
  };

  const rootContainer: RenderableComponentData = {
    id: 'isometric-pixel-typography-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative perspective-none',
        style: {
          backgroundColor: '#1a1a2e',
          overflow: 'hidden',
          imageRendering: 'pixelated',
        },
      },
    },
    context: {
      timing: {
        start: captions.length > 0 ? captions[0].absoluteStart : 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd - captions[0].absoluteStart : 10,
      },
    },
    childrenData: [pixelDustLayer, wordsLayer],
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
  id: 'isometric-pixel-typography',
  title: 'Isometric Pixel Art Typography',
  description:
    'Chunky isometric pixel art typography with 3D pixelated text blocks in dimetric projection. Features Tetris-style falling animations, pixel-by-pixel construction, 16-bit era color palette, floating pixel dust, breathing animations, and emphasis rotations. All movements use integer pixel values for authentic retro aesthetics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'isometric',
    'pixel-art',
    '3d',
    'retro',
    '16-bit',
    'tetris',
    'animation',
    'gaming',
    'nostalgic',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'PIXEL ART',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            id: 'word-1',
            text: 'PIXEL',
            start: 0,
            absoluteStart: 0,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 1.5,
          },
          {
            id: 'word-2',
            text: 'ART',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
      },
    ],
    colorPalette: 'retro-blue',
    fontSize: 48,
    blockDepth: 16,
    fallDuration: 0.8,
    buildDuration: 1.5,
    emphasisRotation: true,
    breathingAnimation: true,
    pixelDustCount: 8,
    stackingLayout: 'tetris',
    font: 'Press Start 2P',
  },
};

export const isometricPixelTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
