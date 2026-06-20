/**
 * Retro-Futuristic Hologram Typokinetics Preset
 *
 * This preset creates an 80s sci-fi hologram display effect with laser scanner reveal,
 * liquid chrome T-1000 flowing reflections, interlacing scanlines, signal interference glitches,
 * flickering neon glow, and 3D float rotation. Features terminal-style cursor boot-up for caption words
 * and wave displacement effects that simulate hologram signal instability.
 *
 * Features:
 * - Laser scanner reveal: Text materializes line-by-line with scaleY animation
 * - Liquid chrome effect: Flowing gradient background animation (200% width)
 * - Interlacing scanlines: Repeating linear gradient for CRT effect
 * - Signal interference: Periodic wave displacement with blur, brightness, and hue-rotate
 * - Flickering neon glow: Randomized opacity and text-shadow intensity with steps() timing
 * - 3D float rotation: Continuous rotateY animation for 3D depth
 * - Terminal cursor effect: Blinking cursor before text reveal for caption words
 * - Grid overlay: Holographic grid pattern for background
 *
 * Use cases:
 * - 80s/90s retro sci-fi video intros
 * - Cyberpunk-themed content
 * - Tech demonstration videos
 * - Futuristic UI mockups
 * - Glitch art motion graphics
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import {
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  // Text content
  text: z
    .string()
    .optional()
    .describe('Static text to display (alternative to captions)'),

  // Caption data
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
        metadata: z.any().optional(),
      }),
    )
    .optional()
    .describe('Caption data for word-by-word reveal with cursor effect'),

  // Font configuration
  font: z
    .string()
    .default('Orbitron:700')
    .describe(
      'Font family with optional weight and style (e.g., "Orbitron:700")',
    ),

  // Text styling
  fontSize: z.number().default(64).describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#00ffff')
    .describe('Primary text color (cyan for hologram)'),

  // Chrome gradient colors
  chromeColors: z
    .array(z.string())
    .default(['#00ffff', '#ffffff', '#00ffff', '#ffffff', '#00ffff'])
    .describe('Chrome gradient color stops for liquid metal effect'),

  // Animation timing
  laserScanDuration: z
    .number()
    .default(0.3)
    .describe('Duration of laser scan reveal per word (seconds)'),
  chromeFlowSpeed: z
    .number()
    .default(3)
    .describe('Speed of liquid chrome animation (seconds per cycle)'),
  rotationSpeed: z
    .number()
    .default(6)
    .describe('Speed of 3D rotation animation (seconds per cycle)'),
  rotationRange: z
    .number()
    .default(5)
    .describe('Rotation angle range in degrees (+/-)'),

  // Glitch effects
  interferenceFrequency: z
    .number()
    .default(5)
    .describe('How often signal interference occurs (seconds between glitches)'),
  interferenceDuration: z
    .number()
    .default(0.15)
    .describe('Duration of each interference glitch (seconds)'),
  interferenceIntensity: z
    .number()
    .default(1)
    .describe('Intensity multiplier for interference effects'),

  // Flicker effects
  flickerEnabled: z
    .boolean()
    .default(true)
    .describe('Enable neon glow flickering'),
  flickerFrequency: z
    .number()
    .default(3)
    .describe('How often flicker occurs (seconds between flickers)'),

  // Positioning
  position: z
    .enum(['center', 'top', 'bottom'])
    .default('center')
    .describe('Vertical position of text'),
  margin: z.number().default(80).describe('Margin from edges (pixels)'),

  // Duration
  duration: z
    .number()
    .optional()
    .describe('Total duration (auto-calculated from captions if not provided)'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
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

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Build chrome gradient string
  const buildChromeGradient = () => {
    const colors = params.chromeColors;
    const stops = colors
      .map((color, index) => {
        const position = (index / (colors.length - 1)) * 100;
        return `${color} ${position}%`;
      })
      .join(', ');
    return `linear-gradient(135deg, ${stops})`;
  };

  const chromeGradient = buildChromeGradient();

  // Position classes
  const getPositionClasses = () => {
    switch (params.position) {
      case 'top':
        return `flex items-start pt-${params.margin}`;
      case 'bottom':
        return `flex items-end pb-${params.margin}`;
      case 'center':
      default:
        return 'flex items-center';
    }
  };

  // Determine if we're using text or captions
  const useText = !!params.text;
  const useCaptions = !!params.captions && params.captions.length > 0;

  // Calculate total duration
  let totalDuration = params.duration;
  if (!totalDuration && useCaptions) {
    const lastCaption = params.captions![params.captions!.length - 1];
    totalDuration = lastCaption.absoluteEnd;
  } else if (!totalDuration) {
    totalDuration = 10; // Default duration for static text
  }

  // ============================================================================
  // BUILD COMPONENTS
  // ============================================================================

  const childrenData: RenderableComponentData[] = [];

  // --- Grid Overlay ---
  childrenData.push({
    id: 'grid-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background-image: repeating-linear-gradient(0deg, transparent 0px, transparent 1px, rgba(0, 255, 255, 0.1) 1px, rgba(0, 255, 255, 0.1) 2px), repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(0, 255, 255, 0.05) 1px, rgba(0, 255, 255, 0.05) 2px); background-size: 4px 4px, 20px 20px; pointer-events: none;"></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // --- Main Text Container ---
  const textContainerId = 'hologram-text-container';
  const textWrapperEffects: any[] = [];

  // 3D Rotation effect
  textWrapperEffects.push({
    id: 'rotation-3d',
    componentId: 'generic',
    data: {
      type: 'ease-in-out' as const,
      start: 0,
      duration: totalDuration,
      mode: 'provider' as const,
      targetIds: [textContainerId],
      ranges: [
        { key: 'rotateY', val: -params.rotationRange, prog: 0 },
        { key: 'rotateY', val: params.rotationRange, prog: 0.5 },
        { key: 'rotateY', val: -params.rotationRange, prog: 1 },
      ],
    } as GenericEffectData,
  });

  // Signal interference (periodic glitch)
  if (params.interferenceFrequency > 0) {
    const interferenceCount = Math.floor(
      totalDuration / params.interferenceFrequency,
    );
    for (let i = 0; i < interferenceCount; i++) {
      const interferenceStart = i * params.interferenceFrequency;
      textWrapperEffects.push({
        id: `interference-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: interferenceStart,
          duration: params.interferenceDuration,
          mode: 'provider' as const,
          targetIds: [textContainerId],
          ranges: [
            {
              key: 'filter',
              val: `blur(${2 * params.interferenceIntensity}px) brightness(${1 + 0.3 * params.interferenceIntensity})`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `blur(${4 * params.interferenceIntensity}px) brightness(${1 + 0.5 * params.interferenceIntensity}) hue-rotate(${30 * params.interferenceIntensity}deg)`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: 'blur(0px) brightness(1) hue-rotate(0deg)',
              prog: 1,
            },
            {
              key: 'translateX',
              val: `${5 * params.interferenceIntensity}px`,
              prog: 0,
            },
            {
              key: 'translateX',
              val: `${-5 * params.interferenceIntensity}px`,
              prog: 0.5,
            },
            { key: 'translateX', val: '0px', prog: 1 },
          ],
        } as GenericEffectData,
      });
    }
  }

  // Flicker effect
  if (params.flickerEnabled && params.flickerFrequency > 0) {
    const flickerCount = Math.floor(totalDuration / params.flickerFrequency);
    for (let i = 0; i < flickerCount; i++) {
      const flickerStart = i * params.flickerFrequency;
      textWrapperEffects.push({
        id: `flicker-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: flickerStart,
          duration: 0.2,
          mode: 'provider' as const,
          targetIds: [textContainerId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.3 },
            { key: 'opacity', val: 1, prog: 0.6 },
            { key: 'opacity', val: 0.8, prog: 0.8 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });
    }
  }

  // ============================================================================
  // BUILD TEXT/CAPTION CONTENT
  // ============================================================================

  const textContentChildren: RenderableComponentData[] = [];

  if (useText) {
    // Static text mode
    const textId = 'hologram-text';
    const textEffects: any[] = [];

    // Laser scan reveal
    textEffects.push({
      id: 'laser-scan-reveal',
      componentId: 'generic',
      data: {
        type: 'ease-out' as const,
        start: 0,
        duration: params.laserScanDuration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'scaleY', val: 0, prog: 0 },
          { key: 'scaleY', val: 1, prog: 1 },
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.5 },
        ],
      } as GenericEffectData,
    });

    // Chrome flow animation
    textEffects.push({
      id: 'chrome-flow',
      componentId: 'generic',
      data: {
        type: 'linear' as const,
        start: 0,
        duration: totalDuration,
        mode: 'provider' as const,
        targetIds: [textId],
        ranges: [
          { key: 'backgroundPositionX', val: '0%', prog: 0 },
          { key: 'backgroundPositionX', val: '200%', prog: 1 },
        ],
      } as GenericEffectData,
    });

    textContentChildren.push({
      id: textId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text!,
        style: {
          fontSize: params.fontSize,
          fontWeight: fontStyle.fontWeight || 700,
          background: chromeGradient,
          backgroundSize: '200% 100%',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          textShadow: `0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3)`,
          filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.6))',
          transformOrigin: 'center center',
          ...fontStyle,
        },
        font: {
          family: fontFamily,
          weights: fontStyle.fontWeight
            ? [fontStyle.fontWeight.toString()]
            : ['700'],
        },
      },
      effects: textEffects,
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
    } as RenderableComponentData);
  } else if (useCaptions) {
    // Caption mode: word-by-word with terminal cursor
    params.captions!.forEach((caption) => {
      const captionId = `caption-${caption.id}`;
      const captionWords: RenderableComponentData[] = [];

      caption.words.forEach((word, wordIndex) => {
        const wordId = `word-${caption.id}-${wordIndex}`;
        const wordEffects: any[] = [];

        // Terminal cursor effect (blink before reveal)
        const cursorDuration = 0.5;
        if (word.start > cursorDuration) {
          wordEffects.push({
            id: `cursor-blink-${wordId}`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: Math.max(0, word.start - cursorDuration),
              duration: cursorDuration,
              mode: 'provider' as const,
              targetIds: [wordId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.2 },
                { key: 'opacity', val: 0, prog: 0.4 },
                { key: 'opacity', val: 1, prog: 0.6 },
                { key: 'opacity', val: 0, prog: 0.8 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          });
        }

        // Laser scan reveal
        wordEffects.push({
          id: `laser-scan-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'ease-out' as const,
            start: word.start,
            duration: params.laserScanDuration,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'scaleY', val: 0, prog: 0 },
              { key: 'scaleY', val: 1, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.5 },
            ],
          } as GenericEffectData,
        });

        // Chrome flow animation
        wordEffects.push({
          id: `chrome-flow-${wordId}`,
          componentId: 'generic',
          data: {
            type: 'linear' as const,
            start: word.start,
            duration: caption.duration - word.start,
            mode: 'provider' as const,
            targetIds: [wordId],
            ranges: [
              { key: 'backgroundPositionX', val: '0%', prog: 0 },
              { key: 'backgroundPositionX', val: '200%', prog: 1 },
            ],
          } as GenericEffectData,
        });

        captionWords.push({
          id: wordId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            style: {
              fontSize: params.fontSize,
              fontWeight: fontStyle.fontWeight || 700,
              background: chromeGradient,
              backgroundSize: '200% 100%',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: `0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3)`,
              filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.6))',
              transformOrigin: 'center center',
              marginRight: '0.3em',
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight
                ? [fontStyle.fontWeight.toString()]
                : ['700'],
            },
          },
          effects: wordEffects,
          context: {
            timing: {
              start: 0,
              duration: caption.duration,
            },
          },
        } as RenderableComponentData);
      });

      textContentChildren.push({
        id: captionId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row flex-wrap items-center justify-center',
            style: {
              gap: `${params.fontSize * 0.15}px`,
            },
          },
        },
        childrenData: captionWords,
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
      } as RenderableComponentData);
    });
  }

  // Interlacing overlay
  const interlacingOverlayId = 'interlacing-overlay';
  childrenData.push({
    id: interlacingOverlayId,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background-image: repeating-linear-gradient(180deg, transparent 0px, transparent 1px, rgba(0, 0, 0, 0.3) 1px, rgba(0, 0, 0, 0.3) 2px); pointer-events: none; z-index: 10;"></div>`,
      className: 'pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // Text container with 3D perspective
  childrenData.push({
    id: textContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `absolute inset-0 ${getPositionClasses()} justify-center`,
        style: {
          perspective: '1000px',
          transformStyle: 'preserve-3d',
        },
      },
    },
    effects: textWrapperEffects,
    childrenData: textContentChildren,
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData);

  // ============================================================================
  // BUILD ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'retro-hologram-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0, 255, 255, 0.03) 2px, rgba(0, 255, 255, 0.03) 4px)',
          boxShadow: 'inset 0 0 100px rgba(0, 255, 255, 0.1)',
        },
      },
    },
    childrenData: childrenData as RenderableComponentData[],
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // ============================================================================
  // RETURN OUTPUT
  // ============================================================================

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
  id: 'retro-hologram-typokinetics',
  title: 'Retro-Futuristic Hologram Typokinetics',
  description:
    '80s sci-fi hologram display with laser scanner reveal, liquid chrome T-1000 effect, interlacing scanlines, signal interference glitches, flickering neon glow, and 3D float rotation. Features terminal-style cursor boot-up for caption words and wave displacement effects simulating hologram signal instability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'hologram',
    'retro',
    'sci-fi',
    '80s',
    'chrome',
    'glitch',
    'neon',
    '3d',
    'kinetic',
    'futuristic',
    'cyberpunk',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'HOLOGRAM ACTIVATED',
    font: 'Orbitron:700',
    fontSize: 64,
    textColor: '#00ffff',
    chromeColors: ['#00ffff', '#ffffff', '#00ffff', '#ffffff', '#00ffff'],
    laserScanDuration: 0.3,
    chromeFlowSpeed: 3,
    rotationSpeed: 6,
    rotationRange: 5,
    interferenceFrequency: 5,
    interferenceDuration: 0.15,
    interferenceIntensity: 1,
    flickerEnabled: true,
    flickerFrequency: 3,
    position: 'center',
    margin: 80,
    duration: 10,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const retroHologramTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
