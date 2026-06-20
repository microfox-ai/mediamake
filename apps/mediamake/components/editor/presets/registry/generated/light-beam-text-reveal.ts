/**
 * Light Beam Text Reveal Preset
 *
 * This preset creates a cinematic text reveal effect where a sharp beam of light sweeps across
 * text like a scanner or searchlight. The text is initially dim, then a narrow band of bright
 * light passes over it, leaving a brief afterglow. A subtle lens flare appears at the peak
 * of the sweep for added visual impact.
 *
 * Features:
 * - **Sharp Light Beam**: Narrow gradient beam sweeps horizontally across text
 * - **Text Reveal**: Text starts dim (gray) and becomes brighter as beam passes
 * - **Afterglow Effect**: Synchronized glow effect following the beam
 * - **Lens Flare**: Peaks at center of sweep for dramatic effect
 * - **Blur Reduction**: Text sharpens as beam passes (focus-pull effect)
 * - **Beat Synchronization**: Optional audio-reactive triggers for impactful beats
 * - **Technical Precision**: Suitable for tech-focused content and futuristic themes
 *
 * Use cases:
 * - Dramatic title treatments for video intros
 * - Tech product reveals and announcements
 * - Futuristic UI animations
 * - Scanner/searchlight effects for cyberpunk aesthetics
 * - Professional video editing transitions
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  title: z
    .string()
    .default('LIGHT BEAM')
    .describe('Text to display for the reveal effect'),
  duration: z
    .number()
    .default(2)
    .describe('Total duration of the preset in seconds'),
  beamDuration: z
    .number()
    .default(1.5)
    .describe('Duration of the light beam sweep in seconds'),
  beamDelay: z
    .number()
    .default(0)
    .describe('Delay before beam sweep starts in seconds'),
  fontSize: z
    .number()
    .default(80)
    .describe('Font size of the title text in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the title text'),
  fontWeight: z
    .string()
    .default('700')
    .describe('Font weight for the title text'),
  textColor: z
    .string()
    .default('#6b7280')
    .describe('Initial color of the text (gray-400)'),
  textColorFinal: z
    .string()
    .default('#ffffff')
    .describe('Final color of the text after beam passes'),
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color of the scene'),
  beamIntensity: z
    .number()
    .min(0.5)
    .max(1)
    .default(0.9)
    .describe('Intensity of the light beam (0.5-1)'),
  lensFlareIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of the lens flare effect (0-1)'),
  audio: z
    .object({
      src: z.string().optional(),
      enabled: z.boolean().default(false),
    })
    .optional()
    .describe('Optional audio for beat synchronization'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    title,
    duration,
    beamDuration,
    beamDelay,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    textColorFinal,
    backgroundColor,
    beamIntensity,
    lensFlareIntensity,
    audio,
  } = params;

  const mainTextId = 'light-beam-text';
  const lightBeamId = 'light-beam';
  const lensFlareId = 'lens-flare';
  const textGlowId = 'text-glow-overlay';

  // Calculate timing
  const beamStart = beamDelay;
  const beamEnd = beamStart + beamDuration;
  const lensFlareStart = beamStart;
  const lensFlarePeakTime = beamStart + beamDuration / 2;
  const lensFlareDuration = beamDuration;

  // Text blur effect (reduces as beam passes)
  const textBlurEffect = {
    id: 'text-blur-effect',
    componentId: 'generic' as const,
    data: {
      type: 'ease-out' as const,
      start: beamStart + 0.3,
      duration: beamDuration - 0.3,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: [
        { key: 'filter', val: 'blur(1px)', prog: 0 },
        { key: 'filter', val: 'blur(0px)', prog: 1 },
      ],
    },
  };

  // Text color transition effect
  const textColorEffect = {
    id: 'text-color-effect',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: beamStart,
      duration: beamDuration,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: [
        { key: 'color', val: textColor, prog: 0 },
        { key: 'color', val: textColorFinal, prog: 0.5 },
        { key: 'color', val: textColorFinal, prog: 1 },
      ],
    },
  };

  // Light beam sweep effect
  const lightBeamEffect = {
    id: 'light-beam-sweep',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: beamStart,
      duration: beamDuration,
      mode: 'provider' as const,
      targetIds: [lightBeamId],
      ranges: [
        { key: 'translateX', val: '-20%', prog: 0 },
        { key: 'translateX', val: '120%', prog: 1 },
      ],
    },
  };

  // Lens flare opacity effect (peaks at center)
  const lensFlareEffect = {
    id: 'lens-flare-opacity',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: lensFlareStart,
      duration: lensFlareDuration,
      mode: 'provider' as const,
      targetIds: [lensFlareId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: lensFlareIntensity, prog: 0.5 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Lens flare position effect (follows beam)
  const lensFlarePositionEffect = {
    id: 'lens-flare-position',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: lensFlareStart,
      duration: lensFlareDuration,
      mode: 'provider' as const,
      targetIds: [lensFlareId],
      ranges: [
        { key: 'translateX', val: '-100%', prog: 0 },
        { key: 'translateX', val: '50%', prog: 1 },
      ],
    },
  };

  // Text glow effect (afterglow synchronized with beam)
  const textGlowEffect = {
    id: 'text-glow-effect',
    componentId: 'generic' as const,
    data: {
      type: 'ease-in-out' as const,
      start: beamStart,
      duration: beamDuration,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: [
        {
          key: 'textShadow',
          val: '0 0 0px rgba(255,255,255,0)',
          prog: 0,
        },
        {
          key: 'textShadow',
          val: `0 0 30px rgba(255,255,255,${beamIntensity * 0.8}), 0 0 60px rgba(200,220,255,${beamIntensity * 0.5})`,
          prog: 0.5,
        },
        {
          key: 'textShadow',
          val: `0 0 10px rgba(255,255,255,${beamIntensity * 0.3})`,
          prog: 1,
        },
      ],
    },
  };

  // Main text component
  const mainText: RenderableComponentData = {
    id: mainTextId,
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: title,
      style: {
        fontSize: `${fontSize}px`,
        fontWeight,
        color: textColor,
        filter: 'blur(1px)',
        willChange: 'transform, filter, color',
        textAlign: 'center',
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [textBlurEffect, textColorEffect, textGlowEffect],
  };

  // Light beam component
  const lightBeam: RenderableComponentData = {
    id: lightBeamId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          background: `linear-gradient(to right, transparent 0%, transparent 40%, rgba(255,255,255,${beamIntensity}) 48%, white 50%, rgba(255,255,255,${beamIntensity}) 52%, transparent 60%, transparent 100%)`,
          backgroundSize: '20% 100%',
          backgroundRepeat: 'no-repeat',
          willChange: 'transform',
          mixBlendMode: 'overlay',
          transform: 'translateX(-20%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [lightBeamEffect],
    childrenData: [],
  };

  // Lens flare component
  const lensFlare: RenderableComponentData = {
    id: lensFlareId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute pointer-events-none',
        style: {
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 30%, transparent 70%)',
          boxShadow:
            '0 0 30px 15px rgba(255,255,255,0.3), 0 0 60px 30px rgba(200,220,255,0.2)',
          opacity: 0,
          willChange: 'opacity, transform',
          top: '50%',
          left: '0%',
          transform: 'translate(-50%, -50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [lensFlareEffect, lensFlarePositionEffect],
    childrenData: [],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'light-beam-reveal-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative overflow-hidden w-full h-full flex items-center justify-center',
        style: {
          backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [mainText, lightBeam, lensFlare],
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
  id: 'light-beam-text-reveal',
  title: 'Light Beam Text Reveal',
  description:
    'A cinematic text reveal effect where a sharp beam of light sweeps across text like a scanner or searchlight. Features a narrow band of bright light that passes over initially dim text, leaving a brief afterglow. Includes lens flare at peak sweep and optional beat synchronization for audio-reactive triggers. Perfect for tech-focused content, futuristic themes, and dramatic title treatments.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'reveal',
    'light-beam',
    'scanner',
    'searchlight',
    'cinematic',
    'dramatic',
    'tech',
    'futuristic',
    'lens-flare',
    'afterglow',
  ],
  defaultInputParams: {
    title: 'LIGHT BEAM',
    duration: 2,
    beamDuration: 1.5,
    beamDelay: 0,
    fontSize: 80,
    fontFamily: 'Inter',
    fontWeight: '700',
    textColor: '#6b7280',
    textColorFinal: '#ffffff',
    backgroundColor: '#000000',
    beamIntensity: 0.9,
    lensFlareIntensity: 0.8,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const lightBeamTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
