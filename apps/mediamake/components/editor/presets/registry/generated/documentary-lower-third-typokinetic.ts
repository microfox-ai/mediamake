/**
 * Documentary Lower Third Typokinetic Preset
 *
 * A professional broadcast-style lower third preset with locked screen coordinates,
 * slide-in animation with motion blur, bounce settle effect, animated gradient underline,
 * and periodic RGB glitch effects. Designed to appear rock-solid like CNN/BBC graphics
 * overlays during handheld footage.
 *
 * Features:
 * - Two-tier layout: main title and subtitle
 * - Slide-in from off-screen with motion blur effect
 * - Subtle bounce that settles into perfect stillness
 * - Animated underline extending from 0 to 100% width
 * - RGB glitch effect triggering every 3-4 seconds
 * - Locked to specific screen coordinates (absolute positioning)
 * - Independent of camera movement (post-production feel)
 *
 * Use cases:
 * - Professional broadcast overlays (news, documentaries)
 * - Lower thirds for interviews and testimonials
 * - Professional video production overlays
 * - Rock-solid text graphics during handheld footage
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMS SCHEMA
// ============================================================================

const presetParams = z.object({
  title: z
    .string()
    .default('Documentary Title')
    .describe('Main title text to display'),
  subtitle: z
    .string()
    .default('Supporting subtitle text')
    .describe('Subtitle text to display below the title'),
  duration: z
    .number()
    .min(1)
    .default(10)
    .describe('Total duration of the lower third in seconds'),
  font: z
    .string()
    .optional()
    .default('Inter')
    .describe(
      'Font family with optional weight and style (e.g., "Roboto:600:italic", "Inter:700", "BebasNeue")',
    ),
  titleColor: z
    .string()
    .optional()
    .default('#ffffff')
    .describe('Color of the main title text'),
  subtitleColor: z
    .string()
    .optional()
    .default('#d1d5db')
    .describe('Color of the subtitle text'),
  underlineGradientStart: z
    .string()
    .optional()
    .default('#3b82f6')
    .describe('Start color of the underline gradient'),
  underlineGradientEnd: z
    .string()
    .optional()
    .default('#22d3ee')
    .describe('End color of the underline gradient'),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(2)
    .optional()
    .default(1)
    .describe('Intensity multiplier for the RGB glitch effect'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter';
  const fontFamily = fontString.includes(':')
    ? fontString.split(':')[0]
    : fontString;

  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any;
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }

  const titleId = 'documentary-lower-third-title';
  const subtitleId = 'documentary-lower-third-subtitle';
  const underlineId = 'documentary-lower-third-underline';
  const glitchRedId = 'documentary-lower-third-glitch-red';
  const glitchGreenId = 'documentary-lower-third-glitch-green';
  const glitchBlueId = 'documentary-lower-third-glitch-blue';

  // ============================================================================
  // ROOT CONTAINER
  // ============================================================================

  const rootContainer: RenderableComponentData = {
    id: 'documentary-lower-third-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute bottom-20 left-10 w-auto',
        style: {
          willChange: 'transform, filter',
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
      // Title text
      {
        id: titleId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.title,
          className: 'text-4xl font-bold tracking-tight',
          style: {
            color: params.titleColor,
            willChange: 'transform, filter',
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight
              ? [fontStyle.fontWeight.toString()]
              : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      },
      // Subtitle text
      {
        id: subtitleId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.subtitle,
          className: 'text-xl font-light mt-2 text-gray-300',
          style: {
            color: params.subtitleColor,
            willChange: 'transform, filter',
            fontWeight: 300,
          },
          font: {
            family: fontFamily,
            weights: ['300'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      },
      // Underline element
      {
        id: underlineId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'h-1 mt-2',
            style: {
              background: `linear-gradient(to right, ${params.underlineGradientStart}, ${params.underlineGradientEnd})`,
              transformOrigin: 'left center',
              willChange: 'transform',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
      },
      // RGB glitch container
      {
        id: 'documentary-lower-third-glitch-container',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        childrenData: [
          // Glitch red channel
          {
            id: glitchRedId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: params.title,
              className: 'text-4xl font-bold tracking-tight absolute',
              style: {
                color: '#ff0000',
                mixBlendMode: 'screen',
                opacity: 0,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
          },
          // Glitch green channel
          {
            id: glitchGreenId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: params.title,
              className: 'text-4xl font-bold tracking-tight absolute',
              style: {
                color: '#00ff00',
                mixBlendMode: 'screen',
                opacity: 0,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
          },
          // Glitch blue channel
          {
            id: glitchBlueId,
            type: 'atom' as const,
            componentId: 'TextAtom',
            data: {
              text: params.title,
              className: 'text-4xl font-bold tracking-tight absolute',
              style: {
                color: '#0000ff',
                mixBlendMode: 'screen',
                opacity: 0,
                ...fontStyle,
              },
              font: {
                family: fontFamily,
                weights: fontStyle.fontWeight
                  ? [fontStyle.fontWeight.toString()]
                  : ['700'],
              },
            },
            context: {
              timing: {
                start: 0,
                duration: params.duration,
              },
            },
          },
        ],
      },
    ],
    effects: [
      // Slide-in effect
      {
        id: 'documentary-slide-in-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [titleId, subtitleId],
          type: 'spring',
          start: 0,
          duration: 0.6,
          ranges: [
            { key: 'translateX', val: -100, unit: 'vw', prog: 0 },
            { key: 'translateX', val: 0, unit: 'vw', prog: 1 },
          ],
        },
      },
      // Motion blur effect
      {
        id: 'documentary-motion-blur-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [titleId, subtitleId],
          type: 'ease-out',
          start: 0,
          duration: 0.6,
          ranges: [
            { key: 'blur', val: 8, prog: 0 },
            { key: 'blur', val: 0, prog: 1 },
          ],
        },
      },
      // Bounce settle effect
      {
        id: 'documentary-bounce-settle-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [titleId, subtitleId],
          type: 'spring',
          start: 0.5,
          duration: 0.3,
          ranges: [
            { key: 'translateX', val: 5, prog: 0 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // Underline scale effect
      {
        id: 'documentary-underline-scale-effect',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [underlineId],
          type: 'ease-out',
          start: 0.6,
          duration: 0.5,
          ranges: [
            { key: 'scaleX', val: 0, prog: 0 },
            { key: 'scaleX', val: 1, prog: 1 },
          ],
        },
      },
      // RGB glitch effect 1 (at 3s)
      {
        id: 'documentary-rgb-glitch-effect-1',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [glitchRedId, glitchGreenId, glitchBlueId],
          type: 'linear',
          start: 3,
          duration: 0.15,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8 * params.glitchIntensity, prog: 0.3 },
            { key: 'opacity', val: 0.8 * params.glitchIntensity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'documentary-rgb-glitch-translate-red-1',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [glitchRedId],
          type: 'linear',
          start: 3,
          duration: 0.15,
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -4 * params.glitchIntensity, prog: 0.3 },
            { key: 'translateX', val: -4 * params.glitchIntensity, prog: 0.7 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'documentary-rgb-glitch-translate-blue-1',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [glitchBlueId],
          type: 'linear',
          start: 3,
          duration: 0.15,
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 4 * params.glitchIntensity, prog: 0.3 },
            { key: 'translateX', val: 4 * params.glitchIntensity, prog: 0.7 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // RGB glitch effect 2 (at 6.5s)
      {
        id: 'documentary-rgb-glitch-effect-2',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [glitchRedId, glitchGreenId, glitchBlueId],
          type: 'linear',
          start: 6.5,
          duration: 0.15,
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.8 * params.glitchIntensity, prog: 0.3 },
            { key: 'opacity', val: 0.8 * params.glitchIntensity, prog: 0.7 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'documentary-rgb-glitch-translate-red-2',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [glitchRedId],
          type: 'linear',
          start: 6.5,
          duration: 0.15,
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: -4 * params.glitchIntensity, prog: 0.3 },
            { key: 'translateX', val: -4 * params.glitchIntensity, prog: 0.7 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'documentary-rgb-glitch-translate-blue-2',
        componentId: 'generic',
        data: {
          mode: 'provider',
          targetIds: [glitchBlueId],
          type: 'linear',
          start: 6.5,
          duration: 0.15,
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 4 * params.glitchIntensity, prog: 0.3 },
            { key: 'translateX', val: 4 * params.glitchIntensity, prog: 0.7 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // RGB glitch effect 3 (at 10s, only if duration > 10s)
      ...(params.duration > 10
        ? [
            {
              id: 'documentary-rgb-glitch-effect-3',
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [glitchRedId, glitchGreenId, glitchBlueId],
                type: 'linear',
                start: 10,
                duration: 0.15,
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  {
                    key: 'opacity',
                    val: 0.8 * params.glitchIntensity,
                    prog: 0.3,
                  },
                  {
                    key: 'opacity',
                    val: 0.8 * params.glitchIntensity,
                    prog: 0.7,
                  },
                  { key: 'opacity', val: 0, prog: 1 },
                ],
              },
            },
            {
              id: 'documentary-rgb-glitch-translate-red-3',
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [glitchRedId],
                type: 'linear',
                start: 10,
                duration: 0.15,
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  {
                    key: 'translateX',
                    val: -4 * params.glitchIntensity,
                    prog: 0.3,
                  },
                  {
                    key: 'translateX',
                    val: -4 * params.glitchIntensity,
                    prog: 0.7,
                  },
                  { key: 'translateX', val: 0, prog: 1 },
                ],
              },
            },
            {
              id: 'documentary-rgb-glitch-translate-blue-3',
              componentId: 'generic',
              data: {
                mode: 'provider',
                targetIds: [glitchBlueId],
                type: 'linear',
                start: 10,
                duration: 0.15,
                ranges: [
                  { key: 'translateX', val: 0, prog: 0 },
                  {
                    key: 'translateX',
                    val: 4 * params.glitchIntensity,
                    prog: 0.3,
                  },
                  {
                    key: 'translateX',
                    val: 4 * params.glitchIntensity,
                    prog: 0.7,
                  },
                  { key: 'translateX', val: 0, prog: 1 },
                ],
              },
            },
          ]
        : []),
    ],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'documentaryLowerThirdTypokinetic',
  title: 'Documentary Lower Third Typokinetic',
  description:
    'A professional broadcast-style lower third preset with locked screen coordinates, slide-in animation with motion blur, bounce settle effect, animated gradient underline, and periodic RGB glitch effects. Designed to appear rock-solid like CNN/BBC graphics overlays during handheld footage.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'lower-third',
    'documentary',
    'broadcast',
    'typokinetic',
    'professional',
    'news',
    'cnn',
    'bbc',
    'overlay',
    'glitch',
    'rgb-split',
    'motion-blur',
    'bounce',
    'underline',
    'gradient',
  ],
  dependencies: {},
  defaultInputParams: {
    title: 'Documentary Title',
    subtitle: 'Supporting subtitle text',
    duration: 10,
    font: 'Inter:700',
    titleColor: '#ffffff',
    subtitleColor: '#d1d5db',
    underlineGradientStart: '#3b82f6',
    underlineGradientEnd: '#22d3ee',
    glitchIntensity: 1,
  },
};

// ============================================================================
// EXPORT PRESET
// ============================================================================

export const documentaryLowerThirdTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
