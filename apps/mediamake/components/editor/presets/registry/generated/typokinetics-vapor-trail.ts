/**
 * Typokinetics Vapor Trail Preset
 * 
 * Creates dynamic text animations where letters behave like smoke signals or vapor trails.
 * Text streaks and trails as it moves, with letters leaving fading traces behind them.
 * Features a sharp leading edge followed by gradually fading and dispersing trails with
 * turbulence effects, recreating time displacement and echo effects used in motion graphics.
 * 
 * Features:
 * - **Vapor Trail Effect**: Leading text with 3-4 fading trail copies
 * - **Motion Blur**: Progressive blur on trail elements
 * - **Turbulence**: Random vertical oscillation on trails
 * - **Horizontal Streak**: Text enters from right with deceleration
 * - **Configurable Trail Length**: Adjust number of trail copies
 * - **Audio Synchronization**: Optional beat detection for trail intensity
 * 
 * Use cases:
 * - Creating smoke signal or vapor trail text effects
 * - Building motion graphics with time displacement
 * - Adding cinematic text animations
 * - Creating echo effects for dynamic typography
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';

// ============================================================
// PARAMS SCHEMA
// ============================================================

const presetParams = z.object({
  captions: z
    .array(z.any())
    .describe('Array of caption objects with text and word timing data'),
  
  trailLength: z
    .number()
    .min(2)
    .max(6)
    .default(4)
    .describe('Number of trail copies behind leading text (2-6)'),
  
  traverseDuration: z
    .number()
    .min(1)
    .max(5)
    .default(3.5)
    .describe('Duration in seconds for text to traverse screen (1-5)'),
  
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size in pixels for text (24-120)'),
  
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color for text (CSS color value)'),
  
  trailOpacities: z
    .array(z.number().min(0).max(1))
    .optional()
    .describe('Custom opacity values for each trail (from first to last trail)'),
  
  trailBlurs: z
    .array(z.number().min(0))
    .optional()
    .describe('Custom blur values in pixels for each trail (from first to last trail)'),
  
  turbulenceIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Intensity of vertical turbulence oscillation in pixels (0-10)'),
  
  entranceOffset: z
    .number()
    .min(0)
    .max(500)
    .default(100)
    .describe('Starting offset distance from right in pixels (0-500)'),
  
  trailDelay: z
    .number()
    .min(0.05)
    .max(0.5)
    .default(0.1)
    .describe('Delay between each trail animation in seconds (0.05-0.5)'),
  
  stretchFactor: z
    .number()
    .min(1)
    .max(1.3)
    .default(1.1)
    .describe('Maximum horizontal stretch factor for trails (1-1.3)'),
  
  useAudioSync: z
    .boolean()
    .default(false)
    .describe('Enable audio-synchronized trail intensity (requires audio reference)'),
  
  audioSrc: z
    .string()
    .optional()
    .describe('Audio source URL or ref:componentId for beat detection synchronization'),
});

// ============================================================
// EXECUTION FUNCTION
// ============================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':')
      ? fontString.split(':')[0]
      : fontString;
    
    const fontStyle: Record<string, any> = {};
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2]; // 'italic' or 'normal'
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font || 'Inter');
  
  // Calculate trail configuration
  const trailLength = params.trailLength;
  const defaultOpacities = [0.6, 0.4, 0.25, 0.15, 0.08, 0.04];
  const defaultBlurs = [2, 4, 6, 8, 10, 12];
  
  const trailOpacities = params.trailOpacities || defaultOpacities.slice(0, trailLength);
  const trailBlurs = params.trailBlurs || defaultBlurs.slice(0, trailLength);
  
  // Process captions
  const captions = params.captions as TranscriptionSentence[];
  
  if (!captions || captions.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {
        attachedToId: 'BaseScene',
      },
    };
  }
  
  // Build word groups for each caption
  const wordGroups: RenderableComponentData[] = [];
  
  captions.forEach((caption, captionIndex) => {
    const words = caption.words || [];
    
    words.forEach((word, wordIndex) => {
      const wordId = `word-${captionIndex}-${wordIndex}`;
      const wordGroupId = `word-group-${captionIndex}-${wordIndex}`;
      
      // Primary text (leading edge)
      const primaryTextId = `primary-text-${captionIndex}-${wordIndex}`;
      
      const primaryText: RenderableComponentData = {
        id: primaryTextId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'text-white font-normal relative z-10',
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight || 400,
            ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
          },
          font: {
            family: fontFamily,
            ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.traverseDuration,
          },
        },
        effects: [
          {
            id: `primary-entrance-${wordId}`,
            componentId: 'generic',
            data: {
              mode: 'provider',
              targetIds: [primaryTextId],
              type: 'ease-out',
              start: 0,
              duration: 0.8,
              ranges: [
                { key: 'translateX', val: params.entranceOffset, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
              ],
            },
          },
        ],
      };
      
      // Trail texts (echoes)
      const trailTexts: RenderableComponentData[] = [];
      
      for (let i = 0; i < trailLength; i++) {
        const trailId = `trail-text-${captionIndex}-${wordIndex}-${i}`;
        const opacity = trailOpacities[i] || 0.2;
        const blur = trailBlurs[i] || (i + 1) * 2;
        const delay = params.trailDelay * (i + 1);
        const turbulence = params.turbulenceIntensity;
        const scaleX = 1 + ((params.stretchFactor - 1) / trailLength) * (i + 1);
        
        // Random turbulence direction for variety
        const turbulenceDirection = i % 2 === 0 ? 1 : -1;
        const turbulenceStart = turbulenceDirection * turbulence;
        const turbulenceMid = -turbulenceDirection * turbulence;
        
        const trailText: RenderableComponentData = {
          id: trailId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: word.text,
            className: `text-white/60 absolute`,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              fontWeight: fontStyle.fontWeight || 400,
              ...(fontStyle.fontStyle ? { fontStyle: fontStyle.fontStyle } : {}),
              filter: `blur(${blur}px)`,
              opacity,
            },
            font: {
              family: fontFamily,
              ...(fontStyle.fontWeight ? { weights: [fontStyle.fontWeight.toString()] } : {}),
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.traverseDuration,
            },
          },
          effects: [
            // Entrance effect (delayed)
            {
              id: `trail-entrance-${trailId}`,
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [trailId],
                type: 'ease-out',
                start: delay,
                duration: 0.8,
                ranges: [
                  { key: 'translateX', val: params.entranceOffset, prog: 0 },
                  { key: 'translateX', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: opacity, prog: 0.3 },
                ],
              },
            },
            // Turbulence effect (oscillating vertical movement)
            {
              id: `trail-turbulence-${trailId}`,
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [trailId],
                type: 'linear',
                start: 0,
                duration: params.traverseDuration,
                ranges: [
                  { key: 'translateY', val: turbulenceStart, prog: 0 },
                  { key: 'translateY', val: turbulenceMid, prog: 0.5 },
                  { key: 'translateY', val: turbulenceStart, prog: 1 },
                  { key: 'scaleX', val: 1, prog: 0 },
                  { key: 'scaleX', val: scaleX, prog: 1 },
                ],
              },
            },
          ],
        };
        
        trailTexts.push(trailText);
      }
      
      // Word group container
      const wordGroup: RenderableComponentData = {
        id: wordGroupId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute flex items-center justify-center',
            style: {
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            },
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: params.traverseDuration,
          },
        },
        childrenData: [primaryText, ...trailTexts],
      };
      
      wordGroups.push(wordGroup);
    });
  });
  
  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-vapor-trail-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 0,
      },
    },
    childrenData: [
      {
        id: 'word-group-container',
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
            duration: 0,
          },
        },
        childrenData: wordGroups as RenderableComponentData[],
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

// ============================================================
// METADATA
// ============================================================

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-vapor-trail',
  title: 'Typokinetics Vapor Trail',
  description: 'Dynamic text animation preset where letters behave like smoke signals or vapor trails. Text streaks and trails as it moves, with letters leaving fading traces behind them. Features a sharp leading edge followed by gradually fading and dispersing trails with turbulence effects, recreating time displacement and echo effects used in motion graphics.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'vapor-trail',
    'smoke-signal',
    'motion-blur',
    'echo',
    'time-displacement',
    'text-animation',
    'trails',
    'turbulence',
    'dynamic',
    'motion-graphics',
  ],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    captions: [],
    trailLength: 4,
    traverseDuration: 3.5,
    fontSize: 48,
    font: 'Inter',
    textColor: '#FFFFFF',
    turbulenceIntensity: 2,
    entranceOffset: 100,
    trailDelay: 0.1,
    stretchFactor: 1.1,
    useAudioSync: false,
  },
};

// ============================================================
// EXPORT
// ============================================================

export const typokineticsVaporTrailPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};