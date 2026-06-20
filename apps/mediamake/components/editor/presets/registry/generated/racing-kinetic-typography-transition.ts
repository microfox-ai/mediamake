/**
 * Racing Kinetic Typography Transition Preset
 *
 * Broadcast-quality racing typography preset with letter-by-letter 3D slice animations,
 * motion blur trails, metallic text treatments, camera shake, and audio-reactive pulsing.
 * Designed for racing highlight reels, driver name callouts, and high-speed content
 * with perspective shifts and speed-reactive scaling.
 *
 * Features:
 * - Letter-by-letter 3D rotation reveals with perspective
 * - Motion blur trails using text-shadow animations
 * - Metallic gradient text treatments with reflective surfaces
 * - Camera shake effects for documentary-style motion
 * - Engine rev-inspired pulsing (audio-reactive if available)
 * - Speed-reactive scaling with dynamic trail effects
 * - Staggered letter animations with configurable delays
 * - Flexible positioning (center, top, bottom, custom)
 *
 * Use cases:
 * - Racing broadcast callouts and driver name intros
 * - High-speed action video title cards
 * - Sports highlight reel typography
 * - Fast-paced documentary-style text reveals
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
        end: z.number(),
        duration: z.number(),
        absoluteStart: z.number(),
        absoluteEnd: z.number(),
        words: z.array(
          z.object({
            id: z.string().optional(),
            text: z.string(),
            start: z.number(),
            end: z.number(),
            duration: z.number(),
            absoluteStart: z.number(),
            absoluteEnd: z.number(),
            confidence: z.number().optional(),
          }),
        ),
        metadata: z
          .object({
            impact: z.number().optional(),
          })
          .optional(),
      }),
    )
    .describe('Caption data with word-level timing for letter-by-letter reveals'),

  font: z
    .string()
    .default('Bebas Neue:900')
    .optional()
    .describe(
      'Font family with optional weight and style (e.g., "Bebas Neue:900", "Oswald:700")',
    ),

  fontSize: z
    .number()
    .min(48)
    .max(200)
    .default(96)
    .describe('Font size in pixels (48-200)'),

  position: z
    .enum(['center', 'top', 'bottom', 'top-left', 'top-right', 'bottom-left', 'bottom-right'])
    .default('center')
    .describe('Text positioning on screen'),

  metalGradient: z
    .string()
    .default('linear-gradient(90deg, #9ca3af 0%, #ffffff 50%, #9ca3af 100%)')
    .optional()
    .describe('CSS gradient for metallic text effect'),

  letterDelay: z
    .number()
    .min(0.01)
    .max(0.1)
    .default(0.03)
    .describe('Stagger delay between letter animations in seconds'),

  effectIntensity: z
    .number()
    .min(0.1)
    .max(3.0)
    .default(1.0)
    .describe('Global effect intensity multiplier (0.1-3.0)'),

  enable3DRotation: z
    .boolean()
    .default(true)
    .describe('Enable 3D rotation slice-in animation'),

  enableMotionBlur: z
    .boolean()
    .default(true)
    .describe('Enable motion blur trail effects'),

  enableCameraShake: z
    .boolean()
    .default(true)
    .describe('Enable camera shake effect'),

  enablePulsing: z
    .boolean()
    .default(true)
    .describe('Enable engine rev-inspired pulsing'),

  audioSrc: z
    .string()
    .optional()
    .describe('Audio source for beat-reactive pulsing (optional)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    captions,
    font,
    fontSize,
    position,
    metalGradient,
    letterDelay,
    effectIntensity,
    enable3DRotation,
    enableMotionBlur,
    enableCameraShake,
    enablePulsing,
    audioSrc,
  } = params;

  // Parse font string
  const parseFontString = (fontStr: string) => {
    const fontFamily = fontStr.includes(':') ? fontStr.split(':')[0] : fontStr;
    const fontStyle: React.CSSProperties = {};
    if (fontStr.includes(':')) {
      const fontParts = fontStr.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(font || 'Bebas Neue:900');

  // Position mapping
  const getPositionClasses = (pos: string): string => {
    switch (pos) {
      case 'top':
        return 'absolute top-[8%] left-0 right-0 flex justify-center';
      case 'bottom':
        return 'absolute bottom-[8%] left-0 right-0 flex justify-center';
      case 'top-left':
        return 'absolute top-[8%] left-[5%]';
      case 'top-right':
        return 'absolute top-[8%] right-[5%]';
      case 'bottom-left':
        return 'absolute bottom-[8%] left-[5%]';
      case 'bottom-right':
        return 'absolute bottom-[8%] right-[5%]';
      case 'center':
      default:
        return 'absolute inset-0 flex items-center justify-center';
    }
  };

  // Create caption containers
  const captionContainers: RenderableComponentData[] = captions.map(
    (caption, captionIndex) => {
      const impact = caption.metadata?.impact ?? effectIntensity;
      const letters = caption.text.split('');

      // Create letter components
      const letterComponents: RenderableComponentData[] = letters.map(
        (letter, letterIndex) => {
          const letterId = `letter-${captionIndex}-${letterIndex}`;
          const relativeStart = (letterIndex * letterDelay) / impact;

          // Base letter component
          const letterComponent: RenderableComponentData = {
            id: letterId,
            type: 'atom',
            componentId: 'TextAtom',
            data: {
              text: letter === ' ' ? '\u00A0' : letter,
              style: {
                fontSize: `${fontSize}px`,
                fontWeight: fontStyle.fontWeight || 900,
                fontStyle: fontStyle.fontStyle || 'normal',
                textTransform: 'uppercase' as const,
                letterSpacing: '-0.02em',
                willChange: 'transform, opacity',
                color: 'transparent',
                backgroundImage: metalGradient,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                contain: 'layout style paint',
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['900'],
                subsets: ['latin'],
                display: 'block' as const,
                preload: true,
              },
            },
            context: {
              timing: {
                start: 0,
                duration: caption.duration,
              },
            },
            effects: [],
          };

          // 3D rotation slice-in effect
          if (enable3DRotation) {
            letterComponent.effects!.push({
              id: `${letterId}-3d-rotation`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: relativeStart,
                duration: 0.4 / impact,
                mode: 'provider',
                targetIds: [letterId],
                ranges: [
                  { key: 'rotateY', val: 90, prog: 0 },
                  { key: 'rotateY', val: 0, prog: 1 },
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.3 },
                  { key: 'perspective', val: '1000px', prog: 0 },
                ],
              },
            });
          } else {
            // Simple fade-in if 3D disabled
            letterComponent.effects!.push({
              id: `${letterId}-fade-in`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: relativeStart,
                duration: 0.3 / impact,
                mode: 'provider',
                targetIds: [letterId],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            });
          }

          // Motion blur trail effect
          if (enableMotionBlur) {
            letterComponent.effects!.push({
              id: `${letterId}-motion-blur`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: relativeStart,
                duration: 0.2 / impact,
                mode: 'provider',
                targetIds: [letterId],
                ranges: [
                  {
                    key: 'textShadow',
                    val: '20px 0 10px rgba(255,255,255,0.6), 40px 0 20px rgba(255,255,255,0.3)',
                    prog: 0,
                  },
                  { key: 'textShadow', val: 'none', prog: 1 },
                  { key: 'translateX', val: -10, prog: 0 },
                  { key: 'translateX', val: 0, prog: 1 },
                ],
              },
            });
          }

          // Speed-reactive scaling
          letterComponent.effects!.push({
            id: `${letterId}-speed-scale`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: relativeStart,
              duration: 0.5 / impact,
              mode: 'provider',
              targetIds: [letterId],
              ranges: [
                { key: 'scale', val: 0.8, prog: 0 },
                { key: 'scale', val: 1.05, prog: 0.5 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          });

          return letterComponent;
        },
      );

      // Text container with flex layout
      const textContainerId = `text-container-${captionIndex}`;
      const textContainer: RenderableComponentData = {
        id: textContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-row items-center justify-center',
            style: {
              gap: `${fontSize * 0.05}px`,
              perspective: '1000px',
              perspectiveOrigin: 'center center',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: caption.duration,
          },
        },
        childrenData: letterComponents,
        effects: [],
      };

      // Engine rev-inspired pulsing
      if (enablePulsing) {
        textContainer.effects!.push({
          id: `${textContainerId}-pulse`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: 0,
            duration: 0.5 / impact,
            mode: 'provider',
            targetIds: [textContainerId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 1.02, prog: 0.5 },
              { key: 'scale', val: 1, prog: 1 },
              {
                key: 'filter',
                val: 'brightness(1)',
                prog: 0,
              },
              {
                key: 'filter',
                val: 'brightness(1.15)',
                prog: 0.5,
              },
              {
                key: 'filter',
                val: 'brightness(1)',
                prog: 1,
              },
            ],
          },
        });
      }

      // Camera shake container
      const cameraShakeContainerId = `camera-shake-${captionIndex}`;
      const cameraShakeContainer: RenderableComponentData = {
        id: cameraShakeContainerId,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: getPositionClasses(position),
            style: {
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        childrenData: [textContainer],
        effects: [],
      };

      // Camera shake effect
      if (enableCameraShake) {
        cameraShakeContainer.effects!.push({
          id: `${cameraShakeContainerId}-shake`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: caption.duration,
            mode: 'provider',
            targetIds: [cameraShakeContainerId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: -1, prog: 0.1 },
              { key: 'translateX', val: 1, prog: 0.2 },
              { key: 'translateX', val: -0.5, prog: 0.3 },
              { key: 'translateX', val: 0.5, prog: 0.4 },
              { key: 'translateX', val: 0, prog: 0.5 },
              { key: 'translateY', val: 0, prog: 0 },
              { key: 'translateY', val: 1, prog: 0.15 },
              { key: 'translateY', val: -1, prog: 0.25 },
              { key: 'translateY', val: 0.5, prog: 0.35 },
              { key: 'translateY', val: 0, prog: 0.5 },
            ],
          },
        });
      }

      return cameraShakeContainer;
    },
  );

  // Metallic reflection overlay
  const reflectionOverlay: RenderableComponentData = {
    id: 'metallic-reflection-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
          mixBlendMode: 'overlay' as const,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: [],
  };

  // Speed trail underlay
  const speedTrailUnderlay: RenderableComponentData = {
    id: 'speed-trail-underlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none flex items-center justify-center',
        style: {
          opacity: 0.4,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: [
      {
        id: 'trail-line',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            style: {
              width: '100%',
              height: '4px',
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              filter: 'blur(8px)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: captions.length > 0 
              ? captions[captions.length - 1].absoluteEnd 
              : 10,
          },
        },
        childrenData: [],
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'racing-kinetic-typography-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          perspective: '1000px',
          perspectiveOrigin: 'center center',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: [
      speedTrailUnderlay,
      ...captionContainers,
      reflectionOverlay,
    ] as RenderableComponentData[],
  };

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
  id: 'racing-kinetic-typography-transition',
  title: 'Racing Kinetic Typography Transition',
  description:
    'Broadcast-quality racing typography preset with letter-by-letter 3D slice animations, motion blur trails, metallic text treatments, camera shake, and audio-reactive pulsing. Designed for racing highlight reels, driver name callouts, and high-speed content with perspective shifts and speed-reactive scaling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'racing',
    'kinetic',
    'typography',
    'callouts',
    'driver-names',
    '3d-rotation',
    'motion-blur',
    'metallic',
    'camera-shake',
    'broadcast',
    'high-speed',
    'sports',
  ],
  defaultInputParams: {
    captions: [
      {
        id: 'caption-1',
        text: 'MAX VERSTAPPEN',
        start: 0,
        end: 3,
        duration: 3,
        absoluteStart: 0,
        absoluteEnd: 3,
        words: [],
        metadata: {
          impact: 1.2,
        },
      },
    ],
    font: 'Bebas Neue:900',
    fontSize: 96,
    position: 'center',
    metalGradient: 'linear-gradient(90deg, #9ca3af 0%, #ffffff 50%, #9ca3af 100%)',
    letterDelay: 0.03,
    effectIntensity: 1.0,
    enable3DRotation: true,
    enableMotionBlur: true,
    enableCameraShake: true,
    enablePulsing: true,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const racingKineticTypographyTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};