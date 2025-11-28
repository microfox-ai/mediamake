/**
 * Watercolor Hand-Drawn Text Preset
 *
 * This preset creates soft, hand-drawn text that appears as if being sketched
 * in real-time with a watercolor brush. Each character has a subtle wobble
 * animation simulating natural hand tremor. The fill gradually appears like
 * watercolor paint soaking into paper (transparent → opaque). Gentle horizontal
 * drifting motion creates a floating-on-water effect. A subtle paper texture
 * overlay interacts with text through blend modes. The animation feels
 * contemplative and artistic, with each word having slightly different timing
 * for an organic, non-uniform appearance. Small paint droplets occasionally
 * fall from letters.
 *
 * Features:
 * - **Hand-Drawn Aesthetic**: SVG turbulence filter creates rough paper texture
 * - **Watercolor Fill Animation**: Gradual opacity reveal (transparent → opaque)
 * - **Natural Hand Tremor**: Continuous subtle wobble (-1deg → 1deg → -1deg)
 * - **Floating Effect**: Gentle horizontal drift animation
 * - **Paper Texture Overlay**: SVG-based texture with multiply blend mode
 * - **Non-Uniform Timing**: Each word animates with slight timing variations
 * - **Paint Droplets**: Optional small droplets that fall from letters
 * - **Custom Font Support**: Handwritten fonts (Amatic SC, Caveat, etc.)
 *
 * Use cases:
 * - Artistic video intros with handwritten feel
 * - Poetry or quote presentations
 * - Creative storytelling with organic text animations
 * - Watercolor-style lyric videos
 * - Contemplative meditation or mindfulness content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Zod parameter schema
const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption objects with text and word-level timing'),
  font: z
    .string()
    .optional()
    .default('Amatic SC:400')
    .describe('Font family with optional weight (e.g., "Amatic SC:400", "Caveat:700")'),
  fontSize: z
    .number()
    .min(20)
    .max(200)
    .default(64)
    .optional()
    .describe('Base font size in pixels'),
  textColor: z
    .string()
    .default('#2c3e50')
    .optional()
    .describe('Text color (CSS color value)'),
  wobbleIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .optional()
    .describe('Wobble rotation intensity multiplier (0 = no wobble, 1 = default, 2 = intense)'),
  driftDistance: z
    .number()
    .min(0)
    .max(100)
    .default(20)
    .optional()
    .describe('Horizontal drift distance in pixels'),
  fadeInDuration: z
    .number()
    .min(0.3)
    .max(3)
    .default(1.5)
    .optional()
    .describe('Duration of watercolor fade-in effect in seconds'),
  dropletChance: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .optional()
    .describe('Probability of droplet appearing per word (0 = none, 1 = all words)'),
  textureOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.15)
    .optional()
    .describe('Paper texture overlay opacity'),
  position: z
    .enum(['top', 'center', 'bottom'])
    .default('center')
    .optional()
    .describe('Vertical position of text'),
  wordOverlap: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .optional()
    .describe('Time overlap between word animations in seconds (creates flow effect)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Amatic SC:400';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: any = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10) || 400;
    }
  }

  const fontSize = params.fontSize ?? 64;
  const textColor = params.textColor ?? '#2c3e50';
  const wobbleIntensity = params.wobbleIntensity ?? 1;
  const driftDistance = params.driftDistance ?? 20;
  const fadeInDuration = params.fadeInDuration ?? 1.5;
  const dropletChance = params.dropletChance ?? 0.3;
  const textureOpacity = params.textureOpacity ?? 0.15;
  const wordOverlap = params.wordOverlap ?? 0.2;

  // Position mapping
  const positionClasses: Record<string, string> = {
    top: 'items-start pt-20',
    center: 'items-center',
    bottom: 'items-end pb-20',
  };
  const positionClass = positionClasses[params.position ?? 'center'] || 'items-center';

  // Parse captions
  const captions = params.captions as TranscriptionSentence[];
  if (!captions || captions.length === 0) {
    return {
      output: { childrenData: [] },
      options: { attachedToId: 'BaseScene' },
    };
  }

  // Calculate total duration
  const totalDuration = Math.max(
    ...captions.map((c) => c.absoluteEnd),
    10,
  );

  // Helper: Create word component with effects
  const createWordComponent = (
    word: any,
    wordIndex: number,
    captionStart: number,
    captionIndex: number,
  ): RenderableComponentData => {
    const wordId = `word-${captionIndex}-${wordIndex}`;
    const wordRelativeStart = word.start; // Relative to caption
    const wordDuration = word.duration;

    // Slight timing variation for organic feel
    const timingVariation = (Math.random() - 0.5) * 0.1; // ±50ms
    const effectiveStart = Math.max(0, wordRelativeStart + timingVariation);

    // Wobble effect (continuous rotation -1deg to 1deg)
    const wobbleRotation = wobbleIntensity * 1; // Base ±1 degree
    const wobbleDuration = 2 + Math.random() * 0.5; // 2-2.5s for variety

    // Drift effect (horizontal movement)
    const driftStart = -driftDistance;
    const driftEnd = 0;

    // Watercolor fade-in effect
    const fadeInProg = Math.min(fadeInDuration / wordDuration, 0.8); // Max 80% of word duration

    // Droplet (random chance)
    const hasDroplet = Math.random() < dropletChance;
    const dropletStartProg = 0.7; // Start at 70% through word
    const dropletFallDistance = 30 + Math.random() * 20; // 30-50px

    // Effects array
    const effects: any[] = [
      // Watercolor fade-in (opacity)
      {
        id: `${wordId}-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: effectiveStart,
          duration: fadeInDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.3 },
            { key: 'opacity', val: 0.9, prog: 1 },
          ],
        },
      },
      // Horizontal drift (translateX)
      {
        id: `${wordId}-drift`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: effectiveStart,
          duration: 1,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'translateX', val: driftStart, prog: 0 },
            { key: 'translateX', val: driftEnd, prog: 1 },
          ],
        },
      },
      // Continuous wobble (rotate)
      {
        id: `${wordId}-wobble`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: effectiveStart,
          duration: wobbleDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'rotate', val: -wobbleRotation, prog: 0 },
            { key: 'rotate', val: wobbleRotation, prog: 0.5 },
            { key: 'rotate', val: -wobbleRotation, prog: 1 },
          ],
        },
      },
    ];

    // Droplet child (if enabled)
    const dropletChild: RenderableComponentData | null = hasDroplet
      ? ({
          id: `${wordId}-droplet`,
          componentId: 'HTMLBlockAtom',
          type: 'atom' as const,
          data: {
            html: `<div style="width: 4px; height: 4px; background: ${textColor}80; border-radius: 50%; position: absolute; top: 0; left: 50%;"></div>`,
            style: {
              position: 'absolute',
              top: '0',
              left: '50%',
              pointerEvents: 'none' as const,
            },
          },
          context: {
            timing: {
              start: wordRelativeStart + wordDuration * dropletStartProg,
              duration: wordDuration * (1 - dropletStartProg),
            },
          },
          effects: [
            {
              id: `${wordId}-droplet-fall`,
              componentId: 'generic',
              data: {
                type: 'ease-in',
                start: 0,
                duration: wordDuration * (1 - dropletStartProg),
                mode: 'provider',
                targetIds: [`${wordId}-droplet`],
                ranges: [
                  { key: 'translateY', val: 0, prog: 0 },
                  { key: 'translateY', val: dropletFallDistance, prog: 1 },
                  { key: 'opacity', val: 0.4, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData)
      : null;

    // Word wrapper (contains text + droplet)
    return {
      id: `${wordId}-wrapper`,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: 'relative inline-block mx-1',
        },
      },
      context: {
        timing: {
          start: wordRelativeStart - wordOverlap, // Start slightly earlier for overlap
          duration: wordDuration + wordOverlap,
        },
      },
      childrenData: [
        {
          id: wordId,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: word.text,
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['400'],
            },
            style: {
              fontSize: `${fontSize}px`,
              color: textColor,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1), 1px 1px 2px rgba(0,0,0,0.05)',
              filter: 'url(#roughPaper)',
              mixBlendMode: 'darken' as const,
              transform: 'translateZ(0)',
              ...fontStyle,
            },
            className: 'antialiased subpixel-antialiased',
          },
          context: {
            timing: {
              start: 0,
              duration: wordDuration + wordOverlap,
            },
          },
          effects,
        } as RenderableComponentData,
        ...(dropletChild ? [dropletChild] : []),
      ],
    } as RenderableComponentData;
  };

  // Build caption containers (one per caption)
  const captionContainers: RenderableComponentData[] = captions.map((caption, captionIndex) => {
    const words = caption.words || [];
    if (words.length === 0) {
      return null;
    }

    const wordComponents = words.map((word, wordIndex) =>
      createWordComponent(word, wordIndex, caption.start, captionIndex),
    );

    return {
      id: `caption-${captionIndex}`,
      componentId: 'BaseLayout',
      type: 'layout' as const,
      data: {
        containerProps: {
          className: 'relative inline-block',
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: caption.duration + wordOverlap, // Extended for overlap
        },
      },
      childrenData: wordComponents,
    } as RenderableComponentData;
  }).filter((c) => c !== null) as RenderableComponentData[];

  // Paper texture overlay (SVG filter + overlay)
  const paperTextureOverlay: RenderableComponentData = {
    id: 'paper-texture-overlay',
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      html: `
        <svg width="0" height="0" style="position: absolute;">
          <defs>
            <filter id="roughPaper">
              <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="5" result="noise"/>
              <feDiffuseLighting in="noise" lighting-color="white" surfaceScale="1">
                <feDistantLight azimuth="45" elevation="60"/>
              </feDiffuseLighting>
            </filter>
          </defs>
        </svg>
        <div style="position: absolute; inset: 0; background: rgba(255,255,255,0.05); mix-blend-mode: multiply; pointer-events: none; opacity: ${textureOpacity};"></div>
      `,
      style: {
        position: 'absolute' as const,
        inset: '0',
        pointerEvents: 'none' as const,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'watercolor-handdrawn-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: `absolute inset-0 grid gap-2 place-items-center ${positionClass}`,
        style: {
          perspective: '1000px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      paperTextureOverlay,
      ...captionContainers,
    ],
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
  id: 'watercolor-handdrawn-text',
  title: 'Watercolor Hand-Drawn Text',
  description:
    'Soft, hand-drawn text preset where letters appear as if being sketched in real-time with a watercolor brush. Features subtle wobble animation simulating natural hand tremor, gradual watercolor fill effect, gentle horizontal drifting motion, paper texture overlay with blend modes, and organic non-uniform timing per word. Includes optional paint droplets falling from letters for artistic contemplative feel.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'captions',
    'watercolor',
    'hand-drawn',
    'artistic',
    'organic',
    'wobble',
    'drift',
    'contemplative',
    'handwritten',
    'paint',
    'droplets',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Amatic SC:400',
    fontSize: 64,
    textColor: '#2c3e50',
    wobbleIntensity: 1,
    driftDistance: 20,
    fadeInDuration: 1.5,
    dropletChance: 0.3,
    textureOpacity: 0.15,
    position: 'center',
    wordOverlap: 0.2,
  },
};

export const watercolorHanddrawnTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
