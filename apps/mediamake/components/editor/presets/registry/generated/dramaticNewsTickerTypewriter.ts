/**
 * Dramatic News Ticker Typewriter Effect Preset
 * 
 * This preset creates a high-impact breaking news style typewriter effect designed for urgent announcements
 * and dramatic reveals. The preset features rapid character-by-character typing with bold visual emphasis,
 * screen shake effects, and a flashing alert prefix.
 * 
 * Features:
 * - **Rapid Character Typing**: Each character appears quickly (20-30ms intervals) with slam-in animation
 * - **Screen Shake**: Subtle micro-shake effect (±1px) on text container for impact
 * - **Alert Prefix**: Flashing "BREAKING" or "URGENT" prefix with red glow
 * - **Animated Background**: Scrolling grid pattern for urgency atmosphere
 * - **Pulsing Cursor**: Thick red block cursor that pulses continuously
 * - **Post-typing Glow**: Completed text maintains attention with subtle pulsing glow
 * - **Uppercase Transform**: All text automatically converted to uppercase
 * - **Condensed Fonts**: Maximum impact with space-efficient typography
 * 
 * Use cases:
 * - Breaking news announcements
 * - Urgent alerts and warnings
 * - Dramatic title reveals
 * - High-impact messaging
 * - Emergency broadcasts
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  text: z.string().describe('Main text to display with typewriter effect'),
  alertPrefix: z
    .enum(['BREAKING', 'URGENT', 'ALERT', 'LIVE', 'NONE'])
    .default('BREAKING')
    .describe('Alert prefix to flash before main text'),
  duration: z
    .number()
    .min(2)
    .max(30)
    .default(10)
    .describe('Total duration of the effect in seconds'),
  characterDelay: z
    .number()
    .min(10)
    .max(100)
    .default(25)
    .describe('Delay between each character appearance in milliseconds'),
  prefixFlashDuration: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.5)
    .describe('Duration of the prefix flash animation in seconds'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size for main text in pixels'),
  prefixFontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size for alert prefix in pixels'),
  textColor: z
    .string()
    .default('#FFFFFF')
    .describe('Main text color (hex or rgba)'),
  prefixColor: z
    .string()
    .default('#EF4444')
    .describe('Alert prefix color (hex or rgba)'),
  backgroundColor: z
    .string()
    .default('from-red-900 to-red-950')
    .describe('Background gradient classes (Tailwind format)'),
  shakeIntensity: z
    .number()
    .min(0)
    .max(5)
    .default(1)
    .describe('Intensity of screen shake effect (0 = no shake)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of text glow effect (0-1)'),
  font: z
    .string()
    .default('Roboto Condensed:900')
    .describe(
      'Font family with optional weight (e.g., "Roboto Condensed:900", "Oswald:700")',
    ),
  enableGridBackground: z
    .boolean()
    .default(true)
    .describe('Enable animated scrolling grid background'),
  cursorPulseSpeed: z
    .number()
    .min(0.3)
    .max(2)
    .default(0.8)
    .describe('Speed of cursor pulse animation in seconds'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight" or "FontName")
  const fontString = params.font || 'Roboto Condensed:900';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;
  let fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  } else {
    fontStyle.fontWeight = 900; // Default to black weight
  }

  // Calculate timing parameters
  const characterDelaySeconds = params.characterDelay / 1000;
  const textLength = params.text.length;
  const totalTypingDuration = textLength * characterDelaySeconds;
  const prefixEndTime = params.prefixFlashDuration;
  const mainTextStartTime = prefixEndTime;
  const typingEndTime = mainTextStartTime + totalTypingDuration;
  const postGlowStartTime = typingEndTime;

  // Generate character data
  const characters = params.text.toUpperCase().split('');

  // Create character components with staggered animations
  const characterComponents: RenderableComponentData[] = characters.map(
    (char, index) => {
      const charId = `char-${index}`;
      const relativeStartTime = index * characterDelaySeconds;

      return {
        id: charId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: char,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            fontWeight: fontStyle.fontWeight,
            letterSpacing: '0.05em',
            display: 'inline-block',
            textTransform: 'uppercase' as const,
          },
          font: {
            family: fontFamily,
            weights: [fontStyle.fontWeight?.toString() || '900'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration - mainTextStartTime,
          },
        },
        effects: [
          // Character slam-in effect
          {
            id: `char-slam-${index}`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: relativeStartTime,
              duration: 0.05,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
                { key: 'scale', val: 1.3, prog: 0 },
                { key: 'scale', val: 1, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData;
    },
  );

  // Create shake effect for text container
  const shakeEffects: any[] = [];
  if (params.shakeIntensity > 0) {
    // Create multiple shake keyframes during typing
    const shakeCount = Math.min(textLength, 20); // Limit shake instances
    for (let i = 0; i < shakeCount; i++) {
      const shakeTime = (i / shakeCount) * totalTypingDuration;
      const shakeOffset = params.shakeIntensity;

      shakeEffects.push({
        id: `shake-${i}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: shakeTime,
          duration: 0.05,
          mode: 'provider',
          targetIds: ['main-text-container'],
          ranges: [
            {
              key: 'translateX',
              val: `${Math.random() > 0.5 ? shakeOffset : -shakeOffset}px`,
              prog: 0,
            },
            { key: 'translateX', val: '0px', prog: 1 },
            {
              key: 'translateY',
              val: `${Math.random() > 0.5 ? shakeOffset : -shakeOffset}px`,
              prog: 0,
            },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      });
    }
  }

  // Create cursor component
  const cursorComponent: RenderableComponentData = {
    id: 'cursor-block',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'inline-block w-1 bg-red-500 ml-1',
        style: {
          height: `${params.fontSize}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration - mainTextStartTime,
      },
    },
    effects: [
      // Cursor pulse effect
      {
        id: 'cursor-pulse',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: totalTypingDuration,
          duration: params.duration - mainTextStartTime - totalTypingDuration,
          mode: 'provider',
          targetIds: ['cursor-block'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Create main text container with all characters
  const mainTextContainer: RenderableComponentData = {
    id: 'main-text-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'flex flex-row items-center',
        style: {
          gap: '0',
        },
      },
    },
    context: {
      timing: {
        start: mainTextStartTime,
        duration: params.duration - mainTextStartTime,
      },
    },
    childrenData: [...characterComponents, cursorComponent],
    effects: [
      // Post-typing glow effect
      {
        id: 'post-glow',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: totalTypingDuration,
          duration: params.duration - mainTextStartTime - totalTypingDuration,
          mode: 'provider',
          targetIds: ['main-text-container'],
          ranges: [
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${5 * params.glowIntensity}px ${params.textColor})`,
              prog: 0,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${15 * params.glowIntensity}px ${params.textColor})`,
              prog: 0.5,
            },
            {
              key: 'filter',
              val: `drop-shadow(0 0 ${5 * params.glowIntensity}px ${params.textColor})`,
              prog: 1,
            },
          ],
        },
      },
      ...shakeEffects,
    ],
  } as RenderableComponentData;

  // Create alert prefix component
  const alertPrefixComponent: RenderableComponentData | null =
    params.alertPrefix !== 'NONE'
      ? ({
          id: 'alert-prefix-text',
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: `${params.alertPrefix}:`,
            style: {
              fontSize: params.prefixFontSize,
              color: params.prefixColor,
              fontWeight: 900,
              letterSpacing: '0.05em',
              textTransform: 'uppercase' as const,
              textShadow: `0 0 10px ${params.prefixColor}`,
              marginRight: '1rem',
            },
            font: {
              family: fontFamily,
              weights: ['900'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: params.duration,
            },
          },
          effects: [
            // Prefix flash animation
            {
              id: 'prefix-flash',
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: 0,
                duration: params.prefixFlashDuration,
                mode: 'provider',
                targetIds: ['alert-prefix-text'],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 1, prog: 0.25 },
                  { key: 'opacity', val: 0.7, prog: 0.5 },
                  { key: 'opacity', val: 1, prog: 1 },
                ],
              },
            },
          ],
        } as RenderableComponentData)
      : null;

  // Create text container layer with prefix and main text
  const textContainerLayer: RenderableComponentData = {
    id: 'text-container-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center px-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      ...(alertPrefixComponent ? [alertPrefixComponent] : []),
      mainTextContainer,
    ],
  } as RenderableComponentData;

  // Create animated background grid layer
  const backgroundGridLayer: RenderableComponentData = params.enableGridBackground
    ? ({
        id: 'background-grid-layer',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 opacity-10 overflow-hidden',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [
          {
            id: 'grid-pattern-html',
            type: 'atom' as const,
            componentId: 'HTMLBlockAtom',
            data: {
              html: `<div style="width:100%;height:100%;background-image:repeating-linear-gradient(0deg,transparent,transparent 50px,rgba(255,255,255,0.1) 50px,rgba(255,255,255,0.1) 51px),repeating-linear-gradient(90deg,transparent,transparent 50px,rgba(255,255,255,0.1) 50px,rgba(255,255,255,0.1) 51px);"></div>`,
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
            effects: [
              // Scrolling grid animation
              {
                id: 'grid-scroll',
                componentId: 'generic',
                data: {
                  type: 'linear',
                  start: 0,
                  duration: params.duration,
                  mode: 'provider',
                  targetIds: ['grid-pattern-html'],
                  ranges: [
                    { key: 'translateX', val: '0px', prog: 0 },
                    { key: 'translateX', val: '-50px', prog: 1 },
                  ],
                },
              },
            ],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData)
    : null;

  // Create root container
  const rootContainer: RenderableComponentData = {
    id: 'news-ticker-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `relative w-full bg-gradient-to-r ${params.backgroundColor} overflow-hidden`,
        style: {
          minHeight: `${params.fontSize * 2}px`,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      ...(backgroundGridLayer ? [backgroundGridLayer] : []),
      textContainerLayer,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'dramaticNewsTickerTypewriter',
  title: 'Dramatic News Ticker Typewriter Effect',
  description:
    'Breaking news style typewriter effect with rapid character typing, screen shake, flashing alert prefix (BREAKING/URGENT), animated background with scrolling grid, pulsing cursor block, and post-typing glow effect. Features uppercase text transformation and condensed fonts for maximum impact.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'typewriter',
    'news',
    'breaking',
    'urgent',
    'dramatic',
    'alert',
    'animated',
    'ticker',
    'character-by-character',
    'shake',
    'glow',
    'cursor',
    'uppercase',
    'condensed',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BREAKING NEWS UPDATE',
    alertPrefix: 'BREAKING',
    duration: 10,
    characterDelay: 25,
    prefixFlashDuration: 0.5,
    fontSize: 48,
    prefixFontSize: 48,
    textColor: '#FFFFFF',
    prefixColor: '#EF4444',
    backgroundColor: 'from-red-900 to-red-950',
    shakeIntensity: 1,
    glowIntensity: 0.8,
    font: 'Roboto Condensed:900',
    enableGridBackground: true,
    cursorPulseSpeed: 0.8,
  },
};

// Export preset
export const dramaticNewsTickerTypewriterPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJsonSchema(presetParams),
};
