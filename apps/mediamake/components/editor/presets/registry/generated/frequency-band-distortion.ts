/**
 * Frequency Band Distortion Waveform Effect Preset
 *
 * This preset creates a synaesthetic audio visualization where different frequency bands
 * trigger distinct corruption types. Low frequencies cause horizontal displacement (translation),
 * mid frequencies create rotation glitches, and high frequencies trigger color inversions.
 *
 * Features:
 * - **Multi-Band Frequency Mapping**: Bass, mid, and treble frequencies each control different visual properties
 * - **Customizable Corruption Types**: Configure which frequency band affects which property (translate, rotate, filter)
 * - **Audio-Reactive**: Uses real-time audio analysis to drive visual distortions
 * - **Coordinated Effects**: Three separate waveform effects work together to create a complex corruption signature
 * - **Synaesthetic Visualization**: Each frequency band has its own distinct visual identity
 *
 * Technical Implementation:
 * - Uses three waveform effects targeting the same component
 * - Bass (20-250 Hz) → Horizontal translation
 * - Mid (250-4000 Hz) → Rotation distortion
 * - Treble (4000-20000 Hz) → Color inversion filter
 * - Each effect operates independently but coordinates through shared target
 *
 * Use cases:
 * - Creating audio-reactive visual corruption effects
 * - Building multi-frequency visualizations
 * - Adding dynamic distortion to images or video content
 * - Creating synaesthetic audio-visual experiences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { WaveformEffectData } from '@microfox/remotion';

// Parameter schema
const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL or reference for frequency analysis'),
  
  targetContent: z.object({
    type: z.enum(['image', 'video', 'text']).describe('Type of content to apply distortion to'),
    src: z.string().optional().describe('Source URL for image/video (not needed for text)'),
    text: z.string().optional().describe('Text content (only if type is text)'),
    fit: z.enum(['cover', 'contain', 'fill', 'none', 'scale-down']).default('cover').optional().describe('Object fit for image/video'),
  }).describe('Content configuration to apply frequency distortion effects'),

  frequencyMapping: z.object({
    bass: z.enum(['translate', 'scale', 'blur']).default('translate').describe('Visual property controlled by bass frequencies (20-250 Hz)'),
    mid: z.enum(['rotate', 'skew']).default('rotate').describe('Visual property controlled by mid frequencies (250-4000 Hz)'),
    treble: z.enum(['invert', 'hue']).default('invert').describe('Visual property controlled by treble frequencies (4000-20000 Hz)'),
  }).describe('Mapping of frequency bands to corruption types'),

  intensity: z.object({
    bass: z.number().min(0.1).max(5).default(1.5).optional().describe('Intensity multiplier for bass effect'),
    mid: z.number().min(0.1).max(5).default(1.2).optional().describe('Intensity multiplier for mid effect'),
    treble: z.number().min(0.1).max(5).default(1.0).optional().describe('Intensity multiplier for treble effect'),
  }).optional().describe('Intensity multipliers for each frequency band'),

  sensitivity: z.object({
    bass: z.number().min(0.1).max(5).default(1.8).optional().describe('Sensitivity to bass frequencies'),
    mid: z.number().min(0.1).max(5).default(1.5).optional().describe('Sensitivity to mid frequencies'),
    treble: z.number().min(0.1).max(5).default(1.3).optional().describe('Sensitivity to treble frequencies'),
  }).optional().describe('Sensitivity settings for each frequency band'),

  duration: z.number().positive().optional().describe('Duration in seconds (defaults to audio duration)'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    audioSrc,
    targetContent,
    frequencyMapping,
    intensity,
    sensitivity,
    duration,
  } = params;

  const { config } = props;
  const fps = config?.fps || 30;

  // Helper function to create property mappings based on frequency mapping configuration
  const createPropertyMapping = (
    frequencyBand: 'bass' | 'mid' | 'treble',
    effectType: string,
  ): Record<string, any> => {
    const baseIntensity = intensity?.[frequencyBand] ?? 1;
    
    switch (effectType) {
      case 'translate':
        return {
          translateX: {
            min: -50 * baseIntensity,
            max: 50 * baseIntensity,
          },
        };
      case 'scale':
        return {
          scale: {
            min: 1 - (0.2 * baseIntensity),
            max: 1 + (0.3 * baseIntensity),
          },
        };
      case 'blur':
        return {
          blur: {
            min: 0,
            max: 10 * baseIntensity,
          },
        };
      case 'rotate':
        return {
          rotate: {
            min: -15 * baseIntensity,
            max: 15 * baseIntensity,
          },
        };
      case 'skew':
        return {
          skewX: {
            min: -10 * baseIntensity,
            max: 10 * baseIntensity,
          },
        };
      case 'invert':
        return {
          filter: {
            type: 'invert',
            min: 0,
            max: 1,
          },
        };
      case 'hue':
        return {
          filter: {
            type: 'hue-rotate',
            min: 0,
            max: 360 * baseIntensity,
          },
        };
      default:
        return {};
    }
  };

  // Create content component based on type
  const createContentComponent = (): RenderableComponentData => {
    const contentId = 'target-content';
    
    switch (targetContent.type) {
      case 'image':
        return {
          id: contentId,
          componentId: 'ImageAtom',
          type: 'atom' as const,
          data: {
            src: targetContent.src || '',
            className: 'w-full h-full',
            style: {
              objectFit: targetContent.fit || 'cover',
            },
          },
        };
      case 'video':
        return {
          id: contentId,
          componentId: 'VideoAtom',
          type: 'atom' as const,
          data: {
            src: targetContent.src || '',
            className: 'w-full h-full',
            fit: targetContent.fit || 'cover',
            volume: 0,
            muted: true,
            loop: true,
          },
        };
      case 'text':
        return {
          id: contentId,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: targetContent.text || 'FREQUENCY DISTORTION',
            className: 'text-6xl font-bold',
            style: {
              color: '#ffffff',
              textAlign: 'center',
            },
          },
        };
      default:
        return {
          id: contentId,
          componentId: 'TextAtom',
          type: 'atom' as const,
          data: {
            text: 'AUDIO REACTIVE',
            className: 'text-6xl font-bold',
            style: { color: '#ffffff' },
          },
        };
    }
  };

  // Create waveform effects for each frequency band
  const bassEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'bass',
    mode: 'provider',
    targetIds: ['target-content-container'],
    frequencyRange: {
      low: 20,
      high: 250,
    },
    numberOfSamples: 128,
    useFrequencyData: true,
    sensitivity: sensitivity?.bass ?? 1.8,
    threshold: 0.1,
    smoothNormalisation: 1,
    propertyMappings: createPropertyMapping('bass', frequencyMapping.bass),
  };

  const midEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'mid',
    mode: 'provider',
    targetIds: ['target-content-container'],
    frequencyRange: {
      low: 250,
      high: 4000,
    },
    numberOfSamples: 128,
    useFrequencyData: true,
    sensitivity: sensitivity?.mid ?? 1.5,
    threshold: 0.1,
    smoothNormalisation: 1,
    propertyMappings: createPropertyMapping('mid', frequencyMapping.mid),
  };

  const trebleEffectData: WaveformEffectData = {
    audioSrc,
    audioProperty: 'treble',
    mode: 'provider',
    targetIds: ['target-content-container'],
    frequencyRange: {
      low: 4000,
      high: 20000,
    },
    numberOfSamples: 128,
    useFrequencyData: true,
    sensitivity: sensitivity?.treble ?? 1.3,
    threshold: 0.1,
    smoothNormalisation: 1,
    propertyMappings: createPropertyMapping('treble', frequencyMapping.treble),
  };

  // Build container with content and effects
  const contentContainer: RenderableComponentData = {
    id: 'target-content-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    effects: [
      {
        id: 'bass-waveform-effect',
        componentId: 'waveform',
        data: bassEffectData,
      },
      {
        id: 'mid-waveform-effect',
        componentId: 'waveform',
        data: midEffectData,
      },
      {
        id: 'treble-waveform-effect',
        componentId: 'waveform',
        data: trebleEffectData,
      },
    ],
    childrenData: [],
  };

  // Audio component
  const audioComponent: RenderableComponentData = {
    id: 'audio-source',
    componentId: 'AudioAtom',
    type: 'atom' as const,
    data: {
      src: audioSrc,
      volume: 1,
    },
    context: {
      timing: {
        start: 0,
        ...(duration ? { duration } : {}),
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'frequency-band-distortion-root',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: [
      contentContainer,
      createContentComponent(),
      audioComponent,
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
  id: 'frequency-band-distortion',
  title: 'Frequency Band Distortion Waveform Effect',
  description:
    'A synaesthetic audio visualization that maps different frequency bands to distinct corruption types. Low frequencies trigger horizontal displacement, mids cause rotation glitches, and highs create color inversions. Each frequency band has its own corruption signature.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'waveform', 'effects', 'distortion', 'frequency', 'visualization', 'glitch'],
  dependencies: {},
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    targetContent: {
      type: 'text',
      text: 'FREQUENCY DISTORTION',
    },
    frequencyMapping: {
      bass: 'translate',
      mid: 'rotate',
      treble: 'invert',
    },
    intensity: {
      bass: 1.5,
      mid: 1.2,
      treble: 1.0,
    },
    sensitivity: {
      bass: 1.8,
      mid: 1.5,
      treble: 1.3,
    },
  },
};

export const frequencyBandDistortionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};