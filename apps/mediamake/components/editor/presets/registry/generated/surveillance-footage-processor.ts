/**
 * Surveillance Footage Processor Preset
 *
 * Creates a multi-screen surveillance control room aesthetic where each word appears on a different monitor
 * with authentic CCTV characteristics (grainy B&W, night vision green, thermal imaging), motion detection boxes,
 * timestamp overlays, recording indicators, and glitch effects including frame drops, compression artifacts,
 * and connection loss for stop-motion jitter.
 *
 * Features:
 * - **Multi-Screen Grid Layout**: Words displayed across multiple surveillance monitors
 * - **CCTV Characteristics**: Grainy B&W, night vision green, thermal imaging filters
 * - **Motion Detection**: Animated tracking boxes with dashed borders
 * - **Security UI Elements**: Timestamps, camera IDs, recording indicators
 * - **Glitch Effects**: Frame drops, compression artifacts, connection loss simulation
 * - **Stop-Motion Jitter**: Timing-based glitches for authentic surveillance feel
 *
 * Use cases:
 * - Creating surveillance-themed caption overlays
 * - Building security camera aesthetic content
 * - Adding tech/cyber aesthetic to videos
 * - Creating ransom note or found footage style text
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

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
      }),
    )
    .describe('Array of caption sentences with word timing data'),
  surveillanceFootage: z
    .string()
    .optional()
    .describe(
      'Optional background surveillance footage URL (static noise if not provided)',
    ),
  gridColumns: z
    .number()
    .min(2)
    .max(4)
    .default(3)
    .describe('Number of columns in the surveillance grid (2-4)'),
  showTimestamps: z
    .boolean()
    .default(true)
    .describe('Show timestamp overlays on each screen'),
  showCameraIds: z
    .boolean()
    .default(true)
    .describe('Show camera ID labels on each screen'),
  showRecordingIndicator: z
    .boolean()
    .default(true)
    .describe('Show pulsing red recording indicator'),
  showMotionBoxes: z
    .boolean()
    .default(true)
    .describe('Show motion detection tracking boxes'),
  glitchIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of glitch effects (0 = none, 1 = maximum)'),
  compressionArtifacts: z
    .boolean()
    .default(true)
    .describe('Enable compression artifact effects'),
  frameDropRate: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Rate of frame drops for stop-motion jitter (0 = none, 1 = constant)'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Color for word text overlays'),
  fontSize: z
    .number()
    .min(12)
    .max(48)
    .default(24)
    .describe('Font size for word text in pixels'),
  font: z
    .string()
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Courier:700", "Roboto Mono")',
    ),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to parse font string
  const parseFont = (fontString?: string) => {
    if (!fontString) return { family: 'Courier New', weight: '400' };
    const parts = fontString.split(':');
    return {
      family: parts[0] || 'Courier New',
      weight: parts[1] || '400',
    };
  };

  // Helper function to generate timestamp
  const generateTimestamp = (wordIndex: number, wordStart: number) => {
    const baseDate = new Date(2024, 0, 1, 0, 0, 0);
    const timestamp = new Date(baseDate.getTime() + wordStart * 1000);
    const hours = String(timestamp.getHours()).padStart(2, '0');
    const minutes = String(timestamp.getMinutes()).padStart(2, '0');
    const seconds = String(timestamp.getSeconds()).padStart(2, '0');
    const frames = String(Math.floor((wordStart % 1) * 30)).padStart(2, '0');
    
    // Add glitch to timestamp randomly
    const glitchChance = params.glitchIntensity * 0.3;
    if (Math.random() < glitchChance) {
      return `${hours}:${minutes}:██:${frames}`;
    }
    return `${hours}:${minutes}:${seconds}:${frames}`;
  };

  // Helper function to get filter style based on camera type
  const getCameraFilter = (wordIndex: number) => {
    const filterType = wordIndex % 3;
    switch (filterType) {
      case 0: // Grainy B&W
        return 'grayscale(100%) contrast(1.2) brightness(0.9)';
      case 1: // Night vision green
        return 'grayscale(100%) sepia(100%) hue-rotate(50deg) saturate(300%) brightness(0.8)';
      case 2: // Thermal imaging
        return 'contrast(1.5) brightness(1.1) saturate(200%)';
      default:
        return 'grayscale(100%)';
    }
  };

  // Helper function to create frame drop effect
  const createFrameDropEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    const dropCount = Math.floor(duration * params.frameDropRate * 10);
    const ranges: Array<{ key: string; val: number; prog: number }> = [];
    
    for (let i = 0; i < dropCount; i++) {
      const prog = Math.random();
      ranges.push({ key: 'opacity', val: 0, prog });
    }
    
    // Ensure start and end are visible
    ranges.push({ key: 'opacity', val: 1, prog: 0 });
    ranges.push({ key: 'opacity', val: 1, prog: 1 });
    
    ranges.sort((a, b) => a.prog - b.prog);

    return {
      type: 'linear',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges,
    };
  };

  // Helper function to create compression artifact effect
  const createCompressionEffect = (
    targetId: string,
    startTime: number,
    duration: number,
  ): GenericEffectData => {
    return {
      type: 'linear',
      start: startTime,
      duration: duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'filter', val: 'blur(0px)', prog: 0 },
        { key: 'filter', val: 'blur(2px)', prog: 0.3 },
        { key: 'filter', val: 'blur(0px)', prog: 0.4 },
        { key: 'filter', val: 'blur(1px)', prog: 0.7 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    };
  };

  // Collect all words from all captions
  const allWords: Array<{
    text: string;
    absoluteStart: number;
    duration: number;
    captionId: string;
  }> = [];

  params.captions.forEach((caption) => {
    caption.words.forEach((word) => {
      allWords.push({
        text: word.text,
        absoluteStart: word.absoluteStart,
        duration: word.duration,
        captionId: caption.id,
      });
    });
  });

  const fontConfig = parseFont(params.font);

  // Create screen containers for each word
  const screenContainers: RenderableComponentData[] = allWords.map(
    (word, wordIndex) => {
      const screenId = `screen-${wordIndex}`;
      const wordTextId = `word-text-${wordIndex}`;
      const backgroundId = `bg-${wordIndex}`;
      const timestampId = `timestamp-${wordIndex}`;
      const cameraFilter = getCameraFilter(wordIndex);
      const cameraNumber = String(wordIndex + 1).padStart(2, '0');

      // Build effects array
      const effects: any[] = [];

      // Frame drop effect
      if (params.frameDropRate > 0) {
        effects.push({
          id: `frame-drop-${wordIndex}`,
          componentId: 'generic',
          data: createFrameDropEffect(screenId, 0, word.duration),
        });
      }

      // Compression artifacts
      if (params.compressionArtifacts && params.glitchIntensity > 0.5) {
        effects.push({
          id: `compression-${wordIndex}`,
          componentId: 'generic',
          data: createCompressionEffect(backgroundId, 0, word.duration),
        });
      }

      // Children for this screen
      const screenChildren: RenderableComponentData[] = [];

      // Background (static noise or surveillance footage)
      screenChildren.push({
        id: backgroundId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.1) 0px, transparent 2px), repeating-linear-gradient(90deg, rgba(0,0,0,0.1) 0px, transparent 2px), #1a1a1a; filter: ${cameraFilter};"></div>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: word.duration,
          },
        },
      });

      // Timestamp overlay
      if (params.showTimestamps) {
        screenChildren.push({
          id: timestampId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="font-family: monospace; font-size: 10px; color: #ff0000; text-shadow: 0 0 4px black; font-weight: bold;">${generateTimestamp(wordIndex, word.absoluteStart)}</div>`,
            className: 'absolute top-1 left-1 z-10',
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
        });
      }

      // Camera ID
      if (params.showCameraIds) {
        screenChildren.push({
          id: `camera-id-${wordIndex}`,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="font-family: monospace; font-size: 10px; color: white; text-shadow: 0 0 4px black; font-weight: bold;">CAM ${cameraNumber}</div>`,
            className: 'absolute top-1 right-1 z-10',
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
        });
      }

      // Recording indicator
      if (params.showRecordingIndicator) {
        screenChildren.push({
          id: `recording-${wordIndex}`,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 6px; height: 6px; border-radius: 50%; background-color: #ff0000; animation: pulse 1s infinite;"></div>`,
            className: 'absolute bottom-1 left-1 z-10',
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
          effects: [
            {
              id: `pulse-${wordIndex}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: word.duration,
                mode: 'provider',
                targetIds: [`recording-${wordIndex}`],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0.3, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              } as GenericEffectData,
            },
          ],
        });
      }

      // Motion detection box
      if (params.showMotionBoxes) {
        screenChildren.push({
          id: `motion-box-${wordIndex}`,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="position: absolute; border: 2px dashed #00ff00; width: 70%; height: 50%; top: 25%; left: 15%; pointer-events: none; box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);"></div>`,
          },
          context: {
            timing: {
              start: 0,
              duration: word.duration,
            },
          },
          effects: [
            {
              id: `motion-anim-${wordIndex}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                duration: word.duration,
                mode: 'provider',
                targetIds: [`motion-box-${wordIndex}`],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.1 },
                  { key: 'opacity', val: 0.7, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              } as GenericEffectData,
            },
          ],
        });
      }

      // Word text
      screenChildren.push({
        id: wordTextId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: word.text,
          className: 'absolute inset-0 flex items-center justify-center z-20',
          style: {
            fontSize: params.fontSize,
            fontWeight: 'bold',
            color: params.textColor,
            textTransform: 'uppercase',
            textShadow: '0 0 8px black, 0 0 16px black, 0 0 2px #ff0000',
            letterSpacing: '2px',
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
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
            id: `word-fade-${wordIndex}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: Math.min(0.3, word.duration * 0.3),
              mode: 'provider',
              targetIds: [wordTextId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            } as GenericEffectData,
          },
        ],
      });

      // Screen container
      return {
        id: screenId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'relative aspect-video bg-black overflow-hidden border-2 border-gray-600 rounded-sm',
            style: {
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
            },
          },
        },
        context: {
          timing: {
            start: word.absoluteStart,
            duration: word.duration,
          },
        },
        childrenData: screenChildren,
        effects,
      } as RenderableComponentData;
    },
  );

  // Root container - grid layout
  const rootContainer: RenderableComponentData = {
    id: 'surveillance-grid-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `grid grid-cols-${params.gridColumns} gap-2 bg-gray-900 p-4`,
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'this',
      },
    },
    childrenData: screenContainers,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'surveillanceFootageProcessor',
  title: 'Surveillance Footage Processor',
  description:
    'Creates a multi-screen surveillance control room aesthetic where each word appears on a different monitor with authentic CCTV characteristics (grainy B&W, night vision green, thermal imaging), motion detection boxes, timestamp overlays, recording indicators, and glitch effects including frame drops, compression artifacts, and connection loss for stop-motion jitter.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'surveillance',
    'cctv',
    'security',
    'captions',
    'glitch',
    'ransom',
    'tech',
    'cyber',
    'grid',
    'motion-detection',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    gridColumns: 3,
    showTimestamps: true,
    showCameraIds: true,
    showRecordingIndicator: true,
    showMotionBoxes: true,
    glitchIntensity: 0.7,
    compressionArtifacts: true,
    frameDropRate: 0.3,
    textColor: '#FFFFFF',
    fontSize: 24,
    font: 'Courier New:700',
  },
};

// Export preset
export const surveillanceFootageProcessorPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
