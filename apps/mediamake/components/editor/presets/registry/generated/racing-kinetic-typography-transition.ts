/**
 * Racing Kinetic Typography Transition Preset
 *
 * This preset creates broadcast-quality kinetic typography effects specifically
 * designed for racing video callouts and driver names. Features dynamic text
 * animations that slice into frame like racing cars cutting through air, with
 * motion blur trails, 3D rotation effects, and speed-reactive scaling.
 *
 * Features:
 * - **Letter-by-letter Reveal**: Staggered entrance animations for each character
 * - **3D Rotation Effects**: Perspective shifts with rotateY transformations
 * - **Metallic Text Treatments**: Gradient text with reflective surface appearance
 * - **Motion Blur Trails**: Speed-line effects that follow text movement
 * - **Camera Shake**: Subtle vibration for documentary racing footage aesthetic
 * - **Audio-Reactive Pulsing**: Syncs with engine revs when audio data available
 * - **Dynamic Perspective**: Transform-based depth and rotation effects
 *
 * Use cases:
 * - Racing highlight reels and broadcast overlays
 * - Driver name introductions with authority
 * - High-speed action callouts
 * - Motorsport documentary graphics
 * - Sports broadcasting title sequences
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

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
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
          }),
        ),
        metadata: z
          .object({
            keyword: z.string().optional(),
            splitParts: z.array(z.string()).optional(),
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Array of caption sentences with word-level timing data'),

  alignment: z
    .enum(['left', 'center', 'right'])
    .default('left')
    .describe('Text alignment position on screen'),

  calloutFontSize: z
    .number()
    .min(20)
    .max(100)
    .default(48)
    .describe('Font size for callout label in pixels'),

  driverNameFontSize: z
    .number()
    .min(40)
    .max(150)
    .default(96)
    .describe('Font size for driver name in pixels'),

  font: z
    .string()
    .default('Inter:900')
    .describe(
      'Font family with weight (e.g., "Inter:900", "Roboto:700", "BebasNeue")',
    ),

  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Primary text color (CSS color value)'),

  accentColor: z
    .string()
    .default('#FF0000')
    .describe('Accent color for highlights and trails'),

  impact: z
    .number()
    .min(0.5)
    .max(3)
    .default(1.2)
    .describe('Effect intensity multiplier (0.5 = subtle, 3 = extreme)'),

  letterStagger: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.03)
    .describe('Delay between letter animations in seconds'),

  rotationIntensity: z
    .number()
    .min(30)
    .max(120)
    .default(90)
    .describe('3D rotation angle in degrees'),

  cameraShakeIntensity: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe('Camera shake amplitude in pixels'),

  audioSrc: z
    .string()
    .optional()
    .describe('Optional audio source for engine rev-inspired pulsing'),

  useAudioReactive: z
    .boolean()
    .default(false)
    .describe('Enable audio-reactive pulsing effects'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    alignment,
    calloutFontSize,
    driverNameFontSize,
    font,
    textColor,
    accentColor,
    impact,
    letterStagger,
    rotationIntensity,
    cameraShakeIntensity,
    audioSrc,
    useAudioReactive,
  } = params;

  // Parse font string
  const parseFontString = (fontStr: string) => {
    const fontFamily = fontStr.includes(':') ? fontStr.split(':')[0] : fontStr;
    const fontWeight = fontStr.includes(':')
      ? parseInt(fontStr.split(':')[1], 10)
      : 900;
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(font);

  // Helper: Get alignment className
  const getAlignmentClass = () => {
    if (alignment === 'left') return 'items-start';
    if (alignment === 'right') return 'items-end';
    return 'items-center';
  };

  // Helper: Create letter components with staggered animations
  const createLetterComponents = (
    text: string,
    baseId: string,
    fontSize: number,
    isDriverName: boolean,
    startTime: number,
  ): RenderableComponentData[] => {
    const letters = text.split('');

    return letters.map((letter, index) => {
      const letterId = `${baseId}-letter-${index}`;
      const staggerDelay = index * letterStagger * impact;

      // Metallic gradient for text
      const gradient = isDriverName
        ? `linear-gradient(90deg, ${accentColor} 0%, ${textColor} 25%, #E5E7EB 50%, ${textColor} 75%, ${accentColor} 100%)`
        : `linear-gradient(90deg, #9CA3AF 0%, ${textColor} 50%, #9CA3AF 100%)`;

      return {
        id: letterId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: letter === ' ' ? '\u00A0' : letter,
          style: {
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight.toString(),
            textTransform: 'uppercase' as const,
            letterSpacing: isDriverName ? '-0.02em' : '0.05em',
            willChange: 'transform, opacity',
            textShadow: `0 0 20px ${accentColor}40`,
          },
          gradient,
          font: {
            family: fontFamily,
            weights: [fontWeight.toString()],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.captions[0]?.duration || 5,
          },
        },
        effects: [
          // 3D rotation entrance
          {
            id: `${letterId}-rotation-entrance`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: staggerDelay,
              duration: 0.4 * impact,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 0.3 },
                { key: 'rotateY', val: rotationIntensity, prog: 0 },
                { key: 'rotateY', val: 0, prog: 1 },
                { key: 'translateX', val: -50, prog: 0 },
                { key: 'translateX', val: 0, prog: 1 },
                { key: 'scale', val: 0.8, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
          // Motion blur trail effect
          {
            id: `${letterId}-blur-trail`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: staggerDelay,
              duration: 0.3 * impact,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                {
                  key: 'filter',
                  val: 'blur(8px) brightness(1.5)',
                  prog: 0,
                },
                { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    });
  };

  // Process captions into text layouts
  const textContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const captionId = `racing-typography-caption-${captionIndex}`;

      // Split into callout and driver name (if metadata provides split)
      const splitParts = caption.metadata?.splitParts || [caption.text];
      const calloutText = splitParts[0] || '';
      const driverNameText = splitParts[1] || splitParts[0] || '';

      // Create letter components for callout
      const calloutLetters = createLetterComponents(
        calloutText,
        `${captionId}-callout`,
        calloutFontSize,
        false,
        caption.absoluteStart,
      );

      // Create letter components for driver name
      const driverNameLetters = createLetterComponents(
        driverNameText,
        `${captionId}-driver`,
        driverNameFontSize,
        true,
        caption.absoluteStart + 0.2,
      );

      // Audio-reactive pulsing effect (if enabled)
      const audioReactiveEffects =
        useAudioReactive && audioSrc
          ? [
              {
                id: `${captionId}-audio-pulse`,
                componentId: 'waveform',
                data: {
                  audioSrc,
                  audioProperty: 'bass' as const,
                  effectType: 'scale' as const,
                  intensity: 0.15 * impact,
                  baseScale: 1,
                  sensitivity: 2,
                  threshold: 0.3,
                  numberOfSamples: 128,
                  useFrequencyData: true,
                  mode: 'provider',
                  targetIds: driverNameLetters.map((l) => l.id),
                  start: 0,
                  duration: caption.duration,
                  smoothNormalisation: 1,
                },
              },
            ]
          : [];

      return {
        id: `${captionId}-container`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: `absolute inset-0 flex flex-col ${getAlignmentClass()} justify-end`,
            style: {
              padding: '40px',
              perspective: '1000px',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        effects: audioReactiveEffects,
        childrenData: [
          // Callout label container
          {
            id: `${captionId}-callout-container`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-row',
                style: {
                  gap: '2px',
                  marginBottom: '8px',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: calloutLetters,
          } as RenderableComponentData,
          // Driver name container
          {
            id: `${captionId}-driver-container`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'flex flex-row',
                style: {
                  gap: '4px',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            childrenData: driverNameLetters,
          } as RenderableComponentData,
          // Speed trail underline
          {
            id: `${captionId}-speed-trail`,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute',
                style: {
                  bottom: '30px',
                  left: alignment === 'right' ? 'auto' : '40px',
                  right: alignment === 'right' ? '40px' : 'auto',
                  height: '4px',
                  width: '0%',
                  background: `linear-gradient(90deg, transparent 0%, ${accentColor} 20%, ${accentColor} 80%, transparent 100%)`,
                  boxShadow: `0 0 10px ${accentColor}`,
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [
              {
                id: `${captionId}-trail-expand`,
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: 0.6 * impact,
                  mode: 'provider',
                  targetIds: [`${captionId}-speed-trail`],
                  ranges: [
                    { key: 'width', val: '0%', prog: 0 },
                    { key: 'width', val: '60%', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData;
    },
  );

  // Camera shake container
  const cameraShakeContainer: RenderableComponentData = {
    id: 'racing-camera-shake-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          willChange: 'transform',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions[captions.length - 1]?.absoluteEnd || 10,
      },
    },
    effects:
      cameraShakeIntensity > 0
        ? [
            {
              id: 'camera-shake-effect',
              componentId: 'shake',
              data: {
                amplitude: cameraShakeIntensity,
                frequency: 0.5,
                duration: captions[captions.length - 1]?.absoluteEnd || 10,
                start: 0,
                shakeAxis: 'both' as const,
                mode: 'provider',
                targetIds: ['racing-camera-shake-container'],
              },
            },
          ]
        : [],
    childrenData: textContainers,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'racing-kinetic-typography-root',
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
        duration: captions[captions.length - 1]?.absoluteEnd || 10,
      },
    },
    childrenData: [cameraShakeContainer],
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

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'racing-kinetic-typography-transition',
  title: 'Racing Kinetic Typography Transition',
  description:
    'Broadcast-quality kinetic typography preset for racing video callouts and driver names. Features letter-by-letter reveals with 3D rotation, metallic gradient text, motion blur speed trails, camera shake, and audio-reactive pulsing. Designed for high-speed racing highlight reels with authority and dynamic perspective shifts.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'kinetic',
    'racing',
    'callouts',
    'driver-names',
    '3d-rotation',
    'motion-blur',
    'metallic',
    'camera-shake',
    'audio-reactive',
    'broadcast',
    'sports',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'DRIVER: MAX VERSTAPPEN',
        start: 0,
        absoluteStart: 0,
        end: 3,
        absoluteEnd: 3,
        duration: 3,
        words: [
          {
            text: 'DRIVER:',
            start: 0,
            absoluteStart: 0,
            end: 0.8,
            absoluteEnd: 0.8,
            duration: 0.8,
          },
          {
            text: 'MAX',
            start: 0.8,
            absoluteStart: 0.8,
            end: 1.5,
            absoluteEnd: 1.5,
            duration: 0.7,
          },
          {
            text: 'VERSTAPPEN',
            start: 1.5,
            absoluteStart: 1.5,
            end: 3,
            absoluteEnd: 3,
            duration: 1.5,
          },
        ],
        metadata: {
          splitParts: ['DRIVER:', 'MAX VERSTAPPEN'],
          impact: 1.5,
        },
      },
    ],
    alignment: 'left',
    calloutFontSize: 48,
    driverNameFontSize: 96,
    font: 'Inter:900',
    textColor: '#FFFFFF',
    accentColor: '#FF0000',
    impact: 1.2,
    letterStagger: 0.03,
    rotationIntensity: 90,
    cameraShakeIntensity: 2,
    useAudioReactive: false,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export
export const racingKineticTypographyTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
