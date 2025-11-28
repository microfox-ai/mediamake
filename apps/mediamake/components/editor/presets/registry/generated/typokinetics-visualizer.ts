/**
 * Typokinetics Music Visualizer Preset
 *
 * A kinetic typography preset inspired by music visualizer aesthetics where text elements pulse and
 * breathe in response to an imagined slow tempo beat. Text grows on the downbeat and contracts on
 * the upbeat, similar to how a bass drum compressor visualization works.
 *
 * Features:
 * - Multiple text layers (main title, subtitle, decorative) stacked with absolute positioning
 * - Waveform effects responding to audio intensity - scale up when high, normal when low
 * - Continuous subtle rotation (-2 to +2 degrees) for organic movement
 * - Each layer responds to different frequency ranges (bass, mids, treble)
 * - Smooth transitions with configurable sensitivity and threshold
 * - Fallback breathing effects when no audio source is available
 *
 * Use cases:
 * - Creating music video title sequences with audio-reactive text
 * - Building dynamic intro/outro cards for music content
 * - Adding kinetic typography to podcast visualizers
 * - Creating rhythmic text animations for social media music posts
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { WaveformEffectData, GenericEffectData } from '@microfox/remotion';

// Parameter schema with descriptions
const presetParams = z.object({
  mainTitle: z.string().default('MAIN TITLE').describe('Main title text (bass-responsive)'),
  subtitle: z.string().default('Subtitle').describe('Subtitle text (mids-responsive)'),
  decorativeText: z.string().default('decorative').describe('Decorative text (treble-responsive)'),
  
  mainTitleSize: z.string().default('96px').describe('Font size for main title'),
  subtitleSize: z.string().default('48px').describe('Font size for subtitle'),
  decorativeSize: z.string().default('24px').describe('Font size for decorative text'),
  
  mainTitleColor: z.string().default('#FFFFFF').describe('Color for main title'),
  subtitleColor: z.string().default('#CCCCCC').describe('Color for subtitle'),
  decorativeColor: z.string().default('#999999').describe('Color for decorative text'),
  
  fontFamily: z.string().default('Inter').describe('Font family for all text (e.g., "Inter", "Roboto")'),
  
  audioSrc: z.string().optional().describe('Audio source URL for beat detection (optional)'),
  
  sensitivity: z.number().min(0.1).max(5).default(0.8).describe('Audio sensitivity multiplier (0.1-5)'),
  threshold: z.number().min(0).max(1).default(0.3).describe('Minimum audio intensity to trigger effect (0-1)'),
  smoothing: z.number().min(0).max(1).default(0.2).describe('Smoothing factor for fluid transitions (0-1)'),
  
  scaleIntensity: z.number().min(0).max(1).default(0.2).describe('Scale effect intensity (0-1, where 0.2 = 1.0 to 1.2 scale)'),
  rotationRange: z.number().min(0).max(10).default(2).describe('Rotation range in degrees (-range to +range)'),
  
  duration: z.number().default(10).describe('Duration of the preset in seconds'),
  
  backgroundColor: z.string().default('#000000').describe('Background color (hex or rgba)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const fps = props.config?.fps || 30;
  const width = props.config?.width || 1920;
  const height = props.config?.height || 1080;

  // Extract parameters
  const {
    mainTitle,
    subtitle,
    decorativeText,
    mainTitleSize,
    subtitleSize,
    decorativeSize,
    mainTitleColor,
    subtitleColor,
    decorativeColor,
    fontFamily,
    audioSrc,
    sensitivity,
    threshold,
    smoothing,
    scaleIntensity,
    rotationRange,
    duration,
    backgroundColor,
  } = params;

  // Helper function to create waveform scale effect
  const createWaveformScaleEffect = (
    targetId: string,
    audioProperty: 'bass' | 'mid' | 'treble',
    effectId: string,
  ): RenderableComponentData => {
    const baseScale = 1.0;
    const maxScale = baseScale + scaleIntensity;

    const waveformData: WaveformEffectData = {
      audioSrc: audioSrc || '',
      audioProperty,
      effectType: 'scale',
      intensity: scaleIntensity,
      baseScale,
      sensitivity,
      threshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / fps,
      mode: 'provider',
      targetIds: [targetId],
      start: 0,
      duration,
      smoothNormalisation: 1,
    };

    return {
      id: effectId,
      componentId: 'waveform',
      data: waveformData,
    } as RenderableComponentData;
  };

  // Helper function to create continuous rotation effect
  const createRotationEffect = (
    targetId: string,
    effectId: string,
  ): RenderableComponentData => {
    const genericData: GenericEffectData = {
      type: 'linear',
      start: 0,
      duration,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'rotate', val: -rotationRange, prog: 0 },
        { key: 'rotate', val: rotationRange, prog: 0.25 },
        { key: 'rotate', val: 0, prog: 0.5 },
        { key: 'rotate', val: -rotationRange, prog: 0.75 },
        { key: 'rotate', val: rotationRange, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: genericData,
    } as RenderableComponentData;
  };

  // Helper function to create fallback breathing effect (when no audio)
  const createBreathingEffect = (
    targetId: string,
    effectId: string,
    breathSpeed: number = 2,
  ): RenderableComponentData => {
    const baseScale = 1.0;
    const maxScale = baseScale + scaleIntensity;

    const genericData: GenericEffectData = {
      type: 'ease-in-out',
      start: 0,
      duration: breathSpeed,
      mode: 'provider',
      targetIds: [targetId],
      ranges: [
        { key: 'scale', val: baseScale, prog: 0 },
        { key: 'scale', val: maxScale, prog: 0.5 },
        { key: 'scale', val: baseScale, prog: 1 },
      ],
    };

    return {
      id: effectId,
      componentId: 'generic',
      data: genericData,
    } as RenderableComponentData;
  };

  // Build main title layer (bass-responsive)
  const mainTitleId = 'typokinetics-main-title';
  const mainTitleEffects: RenderableComponentData[] = [];

  if (audioSrc) {
    mainTitleEffects.push(
      createWaveformScaleEffect(mainTitleId, 'bass', 'main-title-waveform-scale')
    );
  } else {
    mainTitleEffects.push(
      createBreathingEffect(mainTitleId, 'main-title-breathing', 2)
    );
  }
  
  mainTitleEffects.push(
    createRotationEffect(mainTitleId, 'main-title-rotation')
  );

  const mainTitleLayer: RenderableComponentData = {
    id: 'typokinetics-bass-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: mainTitleEffects,
    childrenData: [
      {
        id: mainTitleId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: mainTitle,
          style: {
            fontSize: mainTitleSize,
            fontWeight: 'bold',
            color: mainTitleColor,
            textAlign: 'center',
          },
          font: {
            family: fontFamily,
            weights: ['400', '700', '900'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Build subtitle layer (mids-responsive)
  const subtitleId = 'typokinetics-subtitle';
  const subtitleEffects: RenderableComponentData[] = [];

  if (audioSrc) {
    subtitleEffects.push(
      createWaveformScaleEffect(subtitleId, 'mid', 'subtitle-waveform-scale')
    );
  } else {
    subtitleEffects.push(
      createBreathingEffect(subtitleId, 'subtitle-breathing', 2.5)
    );
  }
  
  subtitleEffects.push(
    createRotationEffect(subtitleId, 'subtitle-rotation')
  );

  const subtitleLayer: RenderableComponentData = {
    id: 'typokinetics-mids-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          paddingTop: '120px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: subtitleEffects,
    childrenData: [
      {
        id: subtitleId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: subtitle,
          style: {
            fontSize: subtitleSize,
            fontWeight: '500',
            color: subtitleColor,
            textAlign: 'center',
            opacity: 0.9,
          },
          font: {
            family: fontFamily,
            weights: ['400', '500'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Build decorative layer (treble-responsive)
  const decorativeId = 'typokinetics-decorative';
  const decorativeEffects: RenderableComponentData[] = [];

  if (audioSrc) {
    decorativeEffects.push(
      createWaveformScaleEffect(decorativeId, 'treble', 'decorative-waveform-scale')
    );
  } else {
    decorativeEffects.push(
      createBreathingEffect(decorativeId, 'decorative-breathing', 3)
    );
  }
  
  decorativeEffects.push(
    createRotationEffect(decorativeId, 'decorative-rotation')
  );

  const decorativeLayer: RenderableComponentData = {
    id: 'typokinetics-treble-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-end justify-center',
        style: {
          paddingBottom: '80px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: decorativeEffects,
    childrenData: [
      {
        id: decorativeId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: decorativeText,
          style: {
            fontSize: decorativeSize,
            fontWeight: '300',
            color: decorativeColor,
            textAlign: 'center',
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            opacity: 0.7,
          },
          font: {
            family: fontFamily,
            weights: ['300', '400'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container with background
  const rootContainer: RenderableComponentData = {
    id: 'typokinetics-visualizer-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
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
    childrenData: [
      mainTitleLayer,
      subtitleLayer,
      decorativeLayer,
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

const presetMetadata: PresetMetadata = {
  id: 'typokinetics-visualizer',
  title: 'Typokinetics Music Visualizer',
  description: 'A kinetic typography preset inspired by music visualizer aesthetics where text elements pulse and breathe in response to audio intensity. Features three stacked text layers (main title, subtitle, decorative) each responding to different frequency ranges (bass, mids, treble). Text scales up on high intensity (downbeat) and contracts on low intensity (upbeat), with subtle continuous rotation (-2 to +2 degrees) for organic movement. Uses waveform effects with configurable sensitivity, threshold, and smoothing for fluid audio-reactive animations. Falls back to generic keyframe breathing effects when no audio is present.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'kinetic', 'music', 'visualizer', 'audio-reactive', 'waveform', 'animation'],
  defaultInputParams: {
    mainTitle: 'MAIN TITLE',
    subtitle: 'Subtitle',
    decorativeText: 'decorative',
    mainTitleSize: '96px',
    subtitleSize: '48px',
    decorativeSize: '24px',
    mainTitleColor: '#FFFFFF',
    subtitleColor: '#CCCCCC',
    decorativeColor: '#999999',
    fontFamily: 'Inter',
    sensitivity: 0.8,
    threshold: 0.3,
    smoothing: 0.2,
    scaleIntensity: 0.2,
    rotationRange: 2,
    duration: 10,
    backgroundColor: '#000000',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const typokineticsVisualizerPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
