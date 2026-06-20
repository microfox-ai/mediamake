/**
 * Pixel RPG Dialogue Box Preset
 *
 * This preset creates a classic JRPG-style dialogue box system with character portraits,
 * pixelated borders, character-by-character text reveal, emotion indicators, and special effects.
 *
 * Features:
 * - **Pixelated 9-slice borders** with corner and edge tiles
 * - **Character-by-character reveal** with typewriter effect and bounce animation
 * - **Character portraits** with blinking and mouth movement animations
 * - **Emotion indicators** (exclamation marks, ellipses, emotion bubbles)
 * - **Menu cursor animations** for highlighted words
 * - **Screen shake and flash effects** for dramatic moments
 * - **Special text effects**: Wavy text for mysterious speech, shaking text for loud voices, rainbow gradient for magical words
 * - **Speaker color coding** with restricted palettes
 * - **Automatic line breaks** respecting box boundaries
 *
 * Use cases:
 * - Creating retro JRPG-style dialogue systems
 * - Building narrative-driven video game cutscenes
 * - Adding nostalgic visual novel effects
 * - Creating pixel art text presentations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// ZODS SCHEMA
// ============================================================================

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
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            speaker: z.string().optional().describe('Speaker name'),
            emotion: z
              .enum([
                'normal',
                'surprise',
                'thinking',
                'happy',
                'sad',
                'angry',
                'shocked',
              ])
              .optional()
              .describe('Emotion indicator type'),
            textEffect: z
              .enum(['normal', 'wavy', 'shake', 'rainbow'])
              .optional()
              .describe('Special text effect type'),
            dramaticMoment: z
              .boolean()
              .optional()
              .describe('Enable screen shake/flash'),
            highlightWords: z
              .array(z.string())
              .optional()
              .describe('Words to highlight with menu cursor'),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with metadata'),

  portraitSrc: z
    .string()
    .optional()
    .describe('Character portrait image source URL'),

  portraitBlinkSrc: z
    .string()
    .optional()
    .describe('Portrait blink overlay image source'),

  portraitMouthSrc: z
    .string()
    .optional()
    .describe('Portrait mouth animation image source'),

  dialogueBoxColor: z
    .string()
    .default('rgba(0,0,0,0.9)')
    .optional()
    .describe('Dialogue box background color'),

  borderColor: z
    .string()
    .default('#FFFFFF')
    .optional()
    .describe('Border tile color'),

  textColor: z.string().default('#FFFFFF').optional().describe('Text color'),

  font: z
    .string()
    .default('monospace')
    .optional()
    .describe('Font family (monospace recommended for pixel style)'),

  fontSize: z
    .number()
    .default(16)
    .optional()
    .describe('Base font size in pixels'),

  characterRevealDelay: z
    .number()
    .min(10)
    .max(100)
    .default(30)
    .optional()
    .describe('Delay between character reveals in milliseconds'),

  bounceHeight: z
    .number()
    .default(2)
    .optional()
    .describe('Character bounce height in pixels'),

  speakerColors: z
    .record(z.string(), z.string())
    .optional()
    .describe('Speaker name to color mapping'),

  enablePortraitBlink: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable portrait blinking animation'),

  enablePortraitMouth: z
    .boolean()
    .default(true)
    .optional()
    .describe('Enable portrait mouth sync animation'),

  boxWidth: z
    .string()
    .default('90%')
    .optional()
    .describe('Dialogue box width (CSS value)'),

  boxMaxWidth: z
    .string()
    .default('800px')
    .optional()
    .describe('Dialogue box max width'),

  boxPosition: z
    .enum(['bottom', 'top', 'center'])
    .default('bottom')
    .optional()
    .describe('Dialogue box vertical position'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    portraitSrc,
    portraitBlinkSrc,
    portraitMouthSrc,
    dialogueBoxColor = 'rgba(0,0,0,0.9)',
    borderColor = '#FFFFFF',
    textColor = '#FFFFFF',
    font = 'monospace',
    fontSize = 16,
    characterRevealDelay = 30,
    bounceHeight = 2,
    speakerColors = {},
    enablePortraitBlink = true,
    enablePortraitMouth = true,
    boxWidth = '90%',
    boxMaxWidth = '800px',
    boxPosition = 'bottom',
  } = params;

  // Helper: Get speaker color
  const getSpeakerColor = (speaker?: string): string => {
    if (!speaker) return textColor;
    return speakerColors[speaker] || textColor;
  };

  // Helper: Create emotion indicator
  const createEmotionIndicator = (emotion?: string) => {
    if (!emotion || emotion === 'normal') return null;

    const emotionMap: Record<string, string> = {
      surprise: '!',
      thinking: '...',
      happy: '♥',
      sad: '💧',
      angry: '💢',
      shocked: '‼',
    };

    const emotionText = emotionMap[emotion] || '';

    return {
      id: `emotion-${emotion}`,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: emotionText,
        style: {
          fontSize: fontSize * 1.5,
          color: '#FFFF00',
          fontWeight: 'bold',
        },
      },
      effects: [
        {
          id: `emotion-pulse-${emotion}`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.5,
            mode: 'provider',
            targetIds: [`emotion-${emotion}`],
            ranges: [
              { key: 'scale', val: 0.8, prog: 0 },
              { key: 'scale', val: 1.2, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Helper: Create character spans with bounce effect
  const createCharacterSpans = (
    text: string,
    captionId: string,
    textEffect?: string,
    speaker?: string,
  ) => {
    const characters = text.split('');
    const speakerColor = getSpeakerColor(speaker);

    return characters.map((char, index) => {
      const charId = `char-${captionId}-${index}`;

      // Base styles
      let charStyle: any = {
        fontSize: fontSize,
        color: textEffect === 'rainbow' ? 'transparent' : speakerColor,
        fontFamily: font,
        display: 'inline-block',
        whiteSpace: 'pre',
      };

      // Rainbow gradient effect
      if (textEffect === 'rainbow') {
        charStyle = {
          ...charStyle,
          backgroundImage:
            'linear-gradient(90deg, #ff0000, #ff7f00, #ffff00, #00ff00, #0000ff, #4b0082, #9400d3)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
        };
      }

      const charEffects: any[] = [];

      // Character reveal effect (fade in + bounce)
      const revealStart = (index * characterRevealDelay) / 1000;
      const revealDuration = 0.2;

      charEffects.push({
        id: `reveal-${charId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: revealStart,
          duration: revealDuration,
          mode: 'provider',
          targetIds: [charId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
            { key: 'translateY', val: -bounceHeight, prog: 0 },
            { key: 'translateY', val: 0, prog: 0.5 },
          ],
        },
      });

      // Wavy text effect
      if (textEffect === 'wavy') {
        const waveDelay = index * 0.05;
        charEffects.push({
          id: `wave-${charId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: waveDelay,
            duration: 2,
            mode: 'provider',
            targetIds: [charId],
            ranges: [
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: -3, prog: 0.25 },
              { key: 'translateY', val: 0, prog: 0.5 },
              { key: 'translateY', val: 3, prog: 0.75 },
              { key: 'translateY', val: 0, prog: 1 },
            ],
          },
        });
      }

      // Shake text effect
      if (textEffect === 'shake') {
        charEffects.push({
          id: `shake-${charId}`,
          componentId: 'shake',
          data: {
            type: 'linear',
            start: 0,
            duration: 2,
            mode: 'provider',
            targetIds: [charId],
            amplitude: 2,
            frequency: 0.1,
            axis: 'both',
          },
        });
      }

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: charStyle,
        },
        effects: charEffects,
      };
    });
  };

  // Helper: Create menu cursor
  const createMenuCursor = (
    captionId: string,
    highlightWords: string[] = [],
  ) => {
    if (!highlightWords || highlightWords.length === 0) return null;

    return {
      id: `menu-cursor-${captionId}`,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        style: {
          position: 'absolute',
          width: 0,
          height: 0,
          borderTop: '6px solid transparent',
          borderBottom: '6px solid transparent',
          borderLeft: '8px solid white',
          top: '50%',
          left: '0',
          transform: 'translateY(-50%)',
        },
      },
      effects: [
        {
          id: `cursor-blink-${captionId}`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 1,
            mode: 'provider',
            targetIds: [`menu-cursor-${captionId}`],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 0.5 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        },
      ],
    };
  };

  // Helper: Create screen effects (shake/flash)
  const createScreenEffects = (dramaticMoment: boolean, captionDuration: number) => {
    if (!dramaticMoment) return [];

    const effects = [];

    // Screen shake effect
    effects.push({
      id: 'screen-shake',
      componentId: 'shake',
      data: {
        type: 'linear',
        start: 0,
        duration: 0.5,
        mode: 'provider',
        targetIds: ['dialogue-box-container'],
        amplitude: 10,
        frequency: 0.1,
        axis: 'both',
        decay: true,
      },
    });

    // Screen flash effect
    effects.push({
      id: 'screen-flash',
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: 0,
        duration: 0.3,
        mode: 'provider',
        targetIds: ['screen-flash-overlay'],
        ranges: [
          { key: 'opacity', val: 0.8, prog: 0 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });

    return effects;
  };

  // Helper: Create portrait animations
  const createPortraitAnimations = (captionDuration: number) => {
    const effects = [];

    // Blink animation
    if (enablePortraitBlink && portraitBlinkSrc) {
      effects.push({
        id: 'portrait-blink',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: captionDuration,
          mode: 'provider',
          targetIds: ['portrait-blink-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.32 },
            { key: 'opacity', val: 0, prog: 0.34 },
            { key: 'opacity', val: 0, prog: 0.7 },
            { key: 'opacity', val: 1, prog: 0.72 },
            { key: 'opacity', val: 0, prog: 0.74 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    // Mouth animation (synced with text speed)
    if (enablePortraitMouth && portraitMouthSrc) {
      const mouthCycleDuration = (characterRevealDelay / 1000) * 2;
      effects.push({
        id: 'portrait-mouth',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: mouthCycleDuration,
          mode: 'provider',
          targetIds: ['portrait-mouth-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    }

    return effects;
  };

  // Build dialogue boxes for each caption
  const dialogueBoxes: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const captionId = caption.id || `caption-${captionIndex}`;
    const speaker = caption.metadata?.speaker;
    const emotion = caption.metadata?.emotion;
    const textEffect = caption.metadata?.textEffect;
    const dramaticMoment = caption.metadata?.dramaticMoment || false;
    const highlightWords = caption.metadata?.highlightWords || [];

    // Create character spans
    const characterSpans = createCharacterSpans(
      caption.text,
      captionId,
      textEffect,
      speaker,
    );

    // Create emotion indicator
    const emotionIndicator = createEmotionIndicator(emotion);

    // Create menu cursor
    const menuCursor = createMenuCursor(captionId, highlightWords);

    // Screen effects
    const screenEffects = createScreenEffects(dramaticMoment, caption.duration);

    // Portrait animations
    const portraitEffects = createPortraitAnimations(caption.duration);

    // Position based on boxPosition param
    let positionClasses = '';
    if (boxPosition === 'bottom') {
      positionClasses = 'bottom-8';
    } else if (boxPosition === 'top') {
      positionClasses = 'top-8';
    } else {
      positionClasses = 'top-1/2 -translate-y-1/2';
    }

    // Dialogue box container
    const dialogueBox: RenderableComponentData = {
      id: `dialogue-box-${captionId}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: `absolute ${positionClasses} left-1/2 -translate-x-1/2`,
          style: {
            width: boxWidth,
            maxWidth: boxMaxWidth,
            imageRendering: 'pixelated',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration,
        },
      },
      effects: screenEffects,
      childrenData: [
        // Portrait container
        ...(portraitSrc
          ? [
              {
                id: `portrait-container-${captionId}`,
                type: 'layout' as const,
                componentId: 'BaseLayout',
                data: {
                  containerProps: {
                    className: 'absolute left-2 bottom-2',
                    style: {
                      width: '64px',
                      height: '64px',
                      zIndex: 10,
                      imageRendering: 'pixelated',
                    },
                  },
                },
                childrenData: [
                  {
                    id: `portrait-image-${captionId}`,
                    type: 'atom' as const,
                    componentId: 'ImageAtom',
                    data: {
                      src: portraitSrc,
                      className: 'w-full h-full object-contain',
                      style: { imageRendering: 'pixelated' },
                    },
                  },
                  ...(portraitBlinkSrc
                    ? [
                        {
                          id: 'portrait-blink-overlay',
                          type: 'atom' as const,
                          componentId: 'ImageAtom',
                          data: {
                            src: portraitBlinkSrc,
                            className: 'absolute inset-0',
                            style: {
                              imageRendering: 'pixelated',
                              opacity: 0,
                            },
                          },
                          effects: portraitEffects.filter((e) =>
                            e.id.includes('blink'),
                          ),
                        },
                      ]
                    : []),
                  ...(portraitMouthSrc
                    ? [
                        {
                          id: 'portrait-mouth-overlay',
                          type: 'atom' as const,
                          componentId: 'ImageAtom',
                          data: {
                            src: portraitMouthSrc,
                            className: 'absolute inset-0',
                            style: {
                              imageRendering: 'pixelated',
                              opacity: 0,
                            },
                          },
                          effects: portraitEffects.filter((e) =>
                            e.id.includes('mouth'),
                          ),
                        },
                      ]
                    : []),
                ],
              } as RenderableComponentData,
            ]
          : []),

        // Dialogue border box
        {
          id: `dialogue-border-box-${captionId}`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative',
              style: {
                borderStyle: 'solid',
                borderWidth: '9px',
                borderColor: borderColor,
                borderImageSlice: 9,
                borderImageRepeat: 'repeat',
                backgroundColor: dialogueBoxColor,
                imageRendering: 'pixelated',
              },
            },
          },
          childrenData: [
            // Content area
            {
              id: `dialogue-content-${captionId}`,
              type: 'layout' as const,
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'p-4 relative',
                  style: {
                    minHeight: '80px',
                    marginLeft: portraitSrc ? '70px' : '0',
                    fontFamily: font,
                  },
                },
              },
              childrenData: [
                // Speaker name tag
                ...(speaker
                  ? [
                      {
                        id: `speaker-name-${captionId}`,
                        type: 'atom' as const,
                        componentId: 'TextAtom',
                        data: {
                          text: speaker,
                          style: {
                            position: 'absolute',
                            top: '-24px',
                            left: '16px',
                            fontSize: fontSize * 0.75,
                            fontWeight: 'bold',
                            color: getSpeakerColor(speaker),
                            backgroundColor: dialogueBoxColor,
                            padding: '2px 8px',
                            fontFamily: font,
                          },
                        },
                      } as RenderableComponentData,
                    ]
                  : []),

                // Emotion indicator
                ...(emotionIndicator
                  ? [
                      {
                        id: `emotion-container-${captionId}`,
                        type: 'layout' as const,
                        componentId: 'BaseLayout',
                        data: {
                          containerProps: {
                            className: 'absolute',
                            style: {
                              top: '-20px',
                              right: '16px',
                              zIndex: 20,
                            },
                          },
                        },
                        childrenData: [emotionIndicator],
                      } as RenderableComponentData,
                    ]
                  : []),

                // Text content wrapper with characters
                {
                  id: `text-content-${captionId}`,
                  type: 'layout' as const,
                  componentId: 'BaseLayout',
                  data: {
                    containerProps: {
                      className: 'relative',
                      style: {
                        display: 'flex',
                        flexWrap: 'wrap',
                        lineHeight: 1.5,
                      },
                    },
                  },
                  childrenData: characterSpans as RenderableComponentData[],
                },

                // Menu cursor
                ...(menuCursor ? [menuCursor as RenderableComponentData] : []),
              ],
            },
          ],
        },
      ],
    };

    return dialogueBox;
  });

  // Screen flash overlay (top-level, absolute positioned)
  const screenFlashOverlay: RenderableComponentData = {
    id: 'screen-flash-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        backgroundColor: 'white',
        opacity: 0,
        zIndex: 100,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'pixel-rpg-dialogue-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          fontFamily: font,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: [
      screenFlashOverlay,
      {
        id: 'dialogue-box-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
          },
        },
        childrenData: dialogueBoxes,
      },
    ],
  };

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'pixel-rpg-dialogue-box',
  title: 'Pixel RPG Dialogue Box',
  description:
    'Classic JRPG-style dialogue box typography preset featuring pixelated speech bubbles with 9-slice scaling borders, character-by-character text reveal with bounce animation, character portraits with blink/mouth sync, emotion indicators, menu selection cursors, screen shake/flash effects, and special text effects (wavy, shaking, rainbow gradient). Supports speaker color coding with restricted palettes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'dialogue',
    'rpg',
    'jrpg',
    'pixel',
    'retro',
    'game',
    'typewriter',
    'portrait',
    'emotion',
    'text-effects',
    'screen-shake',
    'menu-cursor',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'Welcome to the pixel RPG world!',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [],
        metadata: {
          speaker: 'Hero',
          emotion: 'happy',
          textEffect: 'normal',
        },
      },
    ],
    portraitSrc: '',
    dialogueBoxColor: 'rgba(0,0,0,0.9)',
    borderColor: '#FFFFFF',
    textColor: '#FFFFFF',
    font: 'monospace',
    fontSize: 16,
    characterRevealDelay: 30,
    bounceHeight: 2,
    speakerColors: {
      Hero: '#FFFF00',
      Villain: '#FF0000',
      Guide: '#00FF00',
    },
    enablePortraitBlink: true,
    enablePortraitMouth: true,
    boxWidth: '90%',
    boxMaxWidth: '800px',
    boxPosition: 'bottom',
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const pixelRpgDialogueBoxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
