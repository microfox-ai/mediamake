/**
 * Star Wars 3D Text Crawl with Starfield Preset
 * 
 * This preset creates a Star Wars-inspired 3D text crawl effect with a dynamic starfield background.
 * Text recedes into the distance along a perspective plane while drifting horizontally, simulating
 * the iconic opening crawl with added cosmic wind effects.
 * 
 * Features:
 * - **3D Perspective Text Crawl**: Text rotates on X-axis (60deg) and recedes into vanishing point
 * - **Z-axis Movement**: Text moves away from camera (translateZ: 0 to -2000px)
 * - **Y-axis Vertical Crawl**: Text scrolls vertically (100vh to -100vh)
 * - **X-axis Lateral Drift**: Horizontal sine wave movement (-50px to 50px) simulating cosmic winds
 * - **Metallic Gradient Text**: Yellow gradient (from-yellow-200 via-yellow-400 to-yellow-600)
 * - **Animated Glow**: Text shadow with pulsing glow effect
 * - **Parallax Starfield**: Three layers of stars at different depths and speeds
 * - **Caption Data Support**: Converts caption sentences into crawl lines
 * 
 * Use cases:
 * - Creating Star Wars-style opening sequences
 * - Epic space-themed text introductions
 * - Cinematic title crawls for sci-fi content
 * - Dramatic narrative text presentations
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

// Parameter schema
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
        words: z.array(z.any()).optional(),
      }),
    )
    .describe('Array of caption sentences to display as crawl lines'),
  duration: z
    .number()
    .default(12)
    .describe('Total duration of the crawl animation in seconds'),
  fontSize: z
    .number()
    .default(48)
    .describe('Font size for crawl text in pixels'),
  font: z
    .string()
    .default('Inter:700')
    .describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  textColor: z
    .string()
    .default('#FFD700')
    .describe('Base text color (used for glow, gradient is applied on top)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Intensity of text glow effect (0-1)'),
  driftAmplitude: z
    .number()
    .default(50)
    .describe('Horizontal drift amplitude in pixels'),
  starCount: z
    .number()
    .default(75)
    .describe('Total number of stars in starfield (distributed across 3 layers)'),
  lineSpacing: z
    .number()
    .default(30)
    .describe('Vertical spacing between text lines in pixels'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const duration = params.duration;
  const captions = params.captions;

  // Helper: Create starfield layer
  const createStarfieldLayer = (
    layerId: string,
    starCount: number,
    starSize: number,
    speed: number,
  ): RenderableComponentData => {
    const stars: RenderableComponentData[] = [];

    for (let i = 0; i < starCount; i++) {
      const starId = `${layerId}-star-${i}`;
      const randomX = Math.random() * 100; // 0-100%
      const randomY = Math.random() * 100; // 0-100%
      const startOffset = Math.random() * 2; // 0-2s stagger

      // Star visual (small white circle)
      const starHtml = `<div style="width: ${starSize}px; height: ${starSize}px; background: white; border-radius: 50%; opacity: ${0.6 + Math.random() * 0.4};"></div>`;

      // Star movement effect (vertical scroll)
      const starEffect: GenericEffectData = {
        type: 'linear',
        start: startOffset,
        duration: duration - startOffset,
        mode: 'provider',
        targetIds: [starId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: speed, prog: 1 },
        ],
      };

      stars.push({
        id: starId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: starHtml,
          className: 'absolute',
          style: {
            left: `${randomX}%`,
            top: `${randomY}%`,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [
          {
            id: `${starId}-movement`,
            componentId: 'generic',
            data: starEffect,
          },
        ],
      } as RenderableComponentData);
    }

    return {
      id: layerId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      childrenData: stars,
    } as RenderableComponentData;
  };

  // Create starfield layers (3 layers at different depths/speeds)
  const starfieldLayer1 = createStarfieldLayer(
    'starfield-layer-1',
    Math.floor(params.starCount * 0.4), // 30 stars
    2, // Small stars
    200, // Slow movement (background)
  );

  const starfieldLayer2 = createStarfieldLayer(
    'starfield-layer-2',
    Math.floor(params.starCount * 0.33), // 25 stars
    3, // Medium stars
    400, // Medium speed
  );

  const starfieldLayer3 = createStarfieldLayer(
    'starfield-layer-3',
    Math.floor(params.starCount * 0.27), // 20 stars
    4, // Larger stars
    600, // Fast movement (foreground)
  );

  // Starfield background container
  const starfieldBackground: RenderableComponentData = {
    id: 'starfield-background',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [starfieldLayer1, starfieldLayer2, starfieldLayer3],
  } as RenderableComponentData;

  // Create text lines from captions
  const textLines: RenderableComponentData[] = captions.map((caption, index) => {
    const lineId = `crawl-line-${index}`;
    const lineStartTime = index * 1; // Stagger by 1 second
    const lineDuration = duration;

    // Sine wave for X-axis drift
    const driftAmount = params.driftAmplitude;
    const numKeyframes = 10;
    const driftRanges = [];
    for (let i = 0; i <= numKeyframes; i++) {
      const prog = i / numKeyframes;
      const angle = prog * Math.PI * 2; // One full sine wave
      const xOffset = Math.sin(angle) * driftAmount;
      driftRanges.push({ key: 'translateX', val: xOffset, prog });
    }

    // Text line effects
    const lineEffects: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration: lineDuration,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        // Z-axis (recede into distance)
        { key: 'translateZ', val: 0, prog: 0 },
        { key: 'translateZ', val: -2000, prog: 1 },
        // Y-axis (vertical crawl)
        { key: 'translateY', val: '100vh', prog: 0 },
        { key: 'translateY', val: '-100vh', prog: 1 },
        // X-axis (lateral drift)
        ...driftRanges,
        // Opacity (fade out at end)
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.9 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    // Glow pulse effect
    const glowEffect: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: 2,
      mode: 'provider',
      targetIds: [lineId],
      ranges: [
        {
          key: 'textShadow',
          val: `0 0 20px rgba(255,255,100,${params.glowIntensity * 0.6})`,
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 30px rgba(255,255,100,${params.glowIntensity})`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: `0 0 20px rgba(255,255,100,${params.glowIntensity * 0.6})`,
          prog: 1,
        },
      ],
    };

    return {
      id: lineId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: caption.text,
        className: 'bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent',
        style: {
          fontSize: params.fontSize,
          fontWeight: fontStyle.fontWeight || 700,
          textAlign: 'center',
          marginBottom: params.lineSpacing,
          lineHeight: 1.4,
        },
        font: {
          family: fontFamily,
          weights: [fontStyle.fontWeight?.toString() || '700'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: lineStartTime,
          duration: lineDuration,
        },
      },
      effects: [
        {
          id: `${lineId}-movement`,
          componentId: 'generic',
          data: lineEffects,
        },
        {
          id: `${lineId}-glow`,
          componentId: 'generic',
          data: glowEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Text lines container
  const textLinesContainer: RenderableComponentData = {
    id: 'text-lines-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-col items-center',
        style: {
          gap: `${params.lineSpacing}px`,
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: textLines,
  } as RenderableComponentData;

  // 3D wrapper (rotated 60deg on X-axis)
  const text3DWrapper: RenderableComponentData = {
    id: 'text-3d-wrapper',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          transformStyle: 'preserve-3d',
          transform: 'rotateX(60deg)',
          width: '80%',
          maxWidth: '800px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [textLinesContainer],
  } as RenderableComponentData;

  // Text crawl container
  const textCrawlContainer: RenderableComponentData = {
    id: 'text-crawl-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [text3DWrapper],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'star-wars-3d-crawl-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 bg-black overflow-hidden',
        style: {
          perspective: '800px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [starfieldBackground, textCrawlContainer],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'star-wars-3d-crawl',
  title: 'Star Wars 3D Text Crawl with Starfield',
  description:
    '3D text crawl inspired by Star Wars opening - text recedes into distance along perspective plane with lateral drift movement. Features metallic gradient text that catches light as it moves through 3D space, accompanied by a parallax starfield background with stars at multiple depths. Text animates with Z-axis recession (moving away into vanishing point), Y-axis vertical crawl, and X-axis horizontal drift (cosmic wind effect). Includes animated glow highlights and metallic sheen through gradient fills.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    '3d',
    'crawl',
    'star-wars',
    'space',
    'perspective',
    'starfield',
    'gradient',
    'glow',
    'cinematic',
    'epic',
    'sci-fi',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [
      {
        id: 'line-1',
        text: 'A long time ago in a galaxy far, far away...',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
      },
      {
        id: 'line-2',
        text: 'It is a period of civil war.',
        start: 1,
        absoluteStart: 1,
        end: 4,
        absoluteEnd: 4,
        duration: 3,
      },
      {
        id: 'line-3',
        text: 'Rebel spaceships, striking from a hidden base,',
        start: 2,
        absoluteStart: 2,
        end: 5,
        absoluteEnd: 5,
        duration: 3,
      },
      {
        id: 'line-4',
        text: 'have won their first victory against the evil Galactic Empire.',
        start: 3,
        absoluteStart: 3,
        end: 6,
        absoluteEnd: 6,
        duration: 3,
      },
    ],
    duration: 12,
    fontSize: 48,
    font: 'Inter:700',
    textColor: '#FFD700',
    glowIntensity: 0.6,
    driftAmplitude: 50,
    starCount: 75,
    lineSpacing: 30,
  },
};

// Export preset
export const starWars3DCrawlPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
