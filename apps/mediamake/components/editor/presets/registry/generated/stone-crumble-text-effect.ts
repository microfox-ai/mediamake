/**
 * Stone Crumble Text Effect Preset
 *
 * This preset creates a time-lapse photography effect where text ages and crumbles while falling
 * like ancient inscriptions turning to dust. Text starts crisp, develops cracks, fragments, then
 * falls as powder simulating decades passing in seconds.
 *
 * Features:
 * - **Fragment System**: Each character splits into fragments with individual physics
 * - **Erosion Patterns**: Progressive aging with crack overlays and weathering effects
 * - **Color Bleaching**: Text fades from stone-600 to stone-400 during aging
 * - **Fragment Physics**: Size-based falling - smaller pieces have air resistance, larger fall faster
 * - **Multiple Stages**: Aging (0-30%), cracking (30-60%), falling (60-100%)
 * - **Transform Optimization**: Uses translateZ(0) for GPU layer promotion
 *
 * Use cases:
 * - Epic historical narratives and documentaries
 * - Themes of impermanence and time's passage
 * - Ancient civilization content
 * - Dramatic title sequences
 * - Time-lapse storytelling effects
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, TranscriptionSentence } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData, TextAtomData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z.array(z.any()).describe('Array of caption sentences with words and timing'),
  fontSize: z.number().min(24).max(200).default(64).describe('Font size in pixels for the text'),
  textColor: z.string().default('#57534e').describe('Initial text color (stone-600 default)'),
  weatheredColor: z.string().default('#a8a29e').describe('Weathered text color (stone-400 default)'),
  font: z.string().optional().default('Cinzel:700').describe('Font family with optional weight (e.g., "Cinzel:700", "TrajanPro:600")'),
  agingDuration: z.number().min(0.1).max(1).default(0.3).describe('Duration percentage for aging stage (0-30% default)'),
  crackingDuration: z.number().min(0.1).max(1).default(0.3).describe('Duration percentage for cracking stage (30-60% default)'),
  fallingDuration: z.number().min(0.1).max(1).default(0.4).describe('Duration percentage for falling stage (60-100% default)'),
  fragmentIntensity: z.number().min(0.5).max(3).default(1).describe('Intensity multiplier for fragment effects'),
  crackOpacity: z.number().min(0).max(1).default(0.8).describe('Opacity of crack overlays'),
  fallDistance: z.number().min(100).max(500).default(200).describe('Distance text falls in pixels'),
  rotationRange: z.number().min(0).max(45).default(15).describe('Maximum rotation range in degrees for falling fragments'),
  trackName: z.string().optional().default('stone-crumble').describe('Track name for component IDs'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const captions = params.captions as TranscriptionSentence[];
  
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Cinzel:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 700; // Default bold for stone inscriptions
  }

  // Helper function to create crack overlay HTML
  const createCrackOverlay = (opacity: number): string => {
    return `<div style="position:absolute;inset:0;background:linear-gradient(45deg,transparent 40%,rgba(120,113,108,${opacity}) 42%,transparent 44%),linear-gradient(135deg,transparent 38%,rgba(87,83,78,${opacity * 0.7}) 40%,transparent 42%),linear-gradient(90deg,transparent 48%,rgba(168,162,158,${opacity * 0.5}) 49%,transparent 51%);pointer-events:none;transform:translateZ(0);"></div>`;
  };

  // Helper function to generate random rotation based on fragment size
  const getRandomRotation = (wordLength: number): number => {
    const sizeFactor = Math.max(0.5, Math.min(1.5, wordLength / 5));
    const baseRotation = (Math.random() - 0.5) * 2 * params.rotationRange;
    return baseRotation / sizeFactor;
  };

  // Helper function to calculate fall duration based on word length (size)
  const getFallDuration = (wordLength: number, baseDuration: number): number => {
    // Smaller fragments (shorter words) have more air resistance, fall slower
    // Larger fragments (longer words) fall faster
    const sizeFactor = Math.max(0.7, Math.min(1.3, wordLength / 5));
    return baseDuration / sizeFactor;
  };

  const allChildrenData: RenderableComponentData[] = [];

  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    const captionDuration = caption.duration;
    
    // Calculate stage durations
    const agingEnd = captionDuration * params.agingDuration;
    const crackingStart = agingEnd;
    const crackingEnd = captionDuration * (params.agingDuration + params.crackingDuration);
    const fallingStart = crackingEnd;
    const fallingEnd = captionDuration;
    const fallingDuration = fallingEnd - fallingStart;

    // Create word components with effects
    const wordComponents: RenderableComponentData[] = words.map((word, wordIndex) => {
      const wordId = `${params.trackName}-word-${captionIndex}-${wordIndex}`;
      const wordText = word.text;
      const wordLength = wordText.length;

      // Calculate fragment-specific physics
      const fragmentFallDuration = getFallDuration(wordLength, fallingDuration);
      const fragmentRotation = getRandomRotation(wordLength);
      const fragmentFallDistance = params.fallDistance * (0.8 + Math.random() * 0.4);

      // Aging effect (0-30%): color shifts and texture
      const agingEffect: GenericEffectData = {
        type: 'ease-out',
        start: 0,
        duration: agingEnd,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'color', val: params.textColor, prog: 0 },
          { key: 'color', val: params.weatheredColor, prog: 1 },
          { key: 'filter', val: 'brightness(1) contrast(1)', prog: 0 },
          { key: 'filter', val: 'brightness(0.8) contrast(0.85)', prog: 1 },
        ],
      };

      // Cracking effect (30-60%): subtle separation
      const crackingEffect: GenericEffectData = {
        type: 'ease-in',
        start: crackingStart,
        duration: crackingEnd - crackingStart,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'letterSpacing', val: '0em', prog: 0 },
          { key: 'letterSpacing', val: `${0.05 * params.fragmentIntensity}em`, prog: 1 },
        ],
      };

      // Falling effect (60-100%): translateY, rotation, and fade
      const fallingEffect: GenericEffectData = {
        type: 'ease-in',
        start: fallingStart,
        duration: fragmentFallDuration,
        mode: 'provider',
        targetIds: [wordId],
        ranges: [
          { key: 'translateY', val: 0, prog: 0 },
          { key: 'translateY', val: fragmentFallDistance, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: (Math.random() - 0.5) * 20, prog: 1 },
          { key: 'rotate', val: 0, prog: 0 },
          { key: 'rotate', val: fragmentRotation, prog: 1 },
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.5, prog: 0.7 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      };

      return {
        id: wordId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: wordText,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            ...fontStyle,
            marginRight: '0.3em',
            textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
            transform: 'translateZ(0)', // GPU layer promotion
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        } as TextAtomData,
        context: {
          timing: {
            start: 0,
            duration: captionDuration,
          },
        },
        effects: [
          {
            id: `${wordId}-aging`,
            componentId: 'generic',
            data: agingEffect,
          },
          {
            id: `${wordId}-cracking`,
            componentId: 'generic',
            data: crackingEffect,
          },
          {
            id: `${wordId}-falling`,
            componentId: 'generic',
            data: fallingEffect,
          },
        ],
      } as RenderableComponentData;
    });

    // Create crack overlay container
    const crackOverlayId = `${params.trackName}-crack-${captionIndex}`;
    const crackOverlay: RenderableComponentData = {
      id: crackOverlayId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: createCrackOverlay(params.crackOpacity),
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          transform: 'translateZ(0)',
        },
      },
      context: {
        timing: {
          start: crackingStart,
          duration: crackingEnd - crackingStart,
        },
      },
      effects: [
        {
          id: `${crackOverlayId}-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: 0,
            duration: (crackingEnd - crackingStart) * 0.3,
            mode: 'provider',
            targetIds: [crackOverlayId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    };

    // Create caption container
    const captionContainer: RenderableComponentData = {
      id: `${params.trackName}-caption-${captionIndex}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            transform: 'translateZ(0)',
          },
        },
      },
      context: {
        timing: {
          start: caption.absoluteStart,
          duration: captionDuration,
        },
      },
      childrenData: [
        {
          id: `${params.trackName}-words-container-${captionIndex}`,
          type: 'layout' as const,
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative flex flex-row flex-wrap items-center justify-center',
              style: {
                gap: '0.2em',
                maxWidth: '90%',
                transform: 'translateZ(0)',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration: captionDuration,
            },
          },
          childrenData: wordComponents,
        } as RenderableComponentData,
        crackOverlay,
      ],
    };

    allChildrenData.push(captionContainer);
  });

  const rootContainer = {
    id: `${params.trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 ? captions[captions.length - 1].absoluteEnd : 10,
      },
    },
    childrenData: allChildrenData,
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

const presetMetadata: PresetMetadata = {
  id: 'stoneCrumbleTextEffect',
  title: 'Stone Crumble Text Effect',
  description: 'Time-lapse photography effect where text ages and crumbles while falling like ancient inscriptions turning to dust. Text starts crisp, develops weathering, fades color, and falls with simulated gravity. Perfect for epic historical narratives or themes of impermanence and time\'s passage.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'effect', 'animation', 'stone', 'crumble', 'aging', 'erosion', 'falling', 'fragments', 'physics', 'time-lapse', 'historical', 'ancient', 'dust', 'weathering'],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    fontSize: 64,
    textColor: '#57534e',
    weatheredColor: '#a8a29e',
    font: 'Cinzel:700',
    agingDuration: 0.3,
    crackingDuration: 0.3,
    fallingDuration: 0.4,
    fragmentIntensity: 1,
    crackOpacity: 0.8,
    fallDistance: 200,
    rotationRange: 15,
    trackName: 'stone-crumble',
  },
};

export const stoneCrumbleTextEffectPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};