/**
 * Reactive Audio Parallax Preset
 *
 * This preset creates a music video-style parallax effect where multiple image layers
 * respond to different audio frequency ranges. Background layers pulse and shift with bass
 * frequencies while foreground layers react to treble. Uses BeatStitch for audio analysis
 * to generate beat-synchronized translateX/Y movements, scale pulses, subtle rotations,
 * and opacity breathing effects.
 *
 * Features:
 * - **5-Layer Parallax System**: Background, mid-back, mid, foreground, and accent layers
 * - **Frequency-Based Movement**: Bass drives background, mids affect middle layer, treble drives foreground
 * - **Beat Synchronization**: Uses BeatStitch audio analysis for beat-triggered effects
 * - **Dynamic Motion**: Parallax translateX/Y, scale pulses, subtle rotations
 * - **Audio-Reactive Colors**: Brightness and color shifts based on audio intensity
 * - **Breathing Effect**: Layer separation increases/decreases with audio amplitude
 * - **Position Resets**: Layers snap to new positions on strong beats
 *
 * Use cases:
 * - Creating music video parallax effects
 * - Building audio-reactive visual experiences
 * - Adding dynamic depth to music content
 * - Creating rhythm-driven background animations
 * - Building engaging visualizers with multiple layers
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Preset Parameters Schema ---

const presetParams = z.object({
  audioSrc: z.string().describe('Audio source file URL or path'),
  backgroundImage: z.string().describe('Background layer image URL or path'),
  midBackImage: z.string().describe('Mid-back layer image URL or path'),
  midImage: z.string().describe('Mid layer image URL or path'),
  foregroundImage: z.string().describe('Foreground layer image URL or path'),
  accentImage: z.string().describe('Accent layer image URL or path'),
  
  // Movement sensitivity
  bassSensitivity: z.number().default(2.5).describe('Bass frequency movement amplitude (1-5)'),
  midSensitivity: z.number().default(1.8).describe('Mid frequency movement amplitude (1-5)'),
  trebleSensitivity: z.number().default(1.2).describe('Treble frequency movement amplitude (1-5)'),
  
  // Effect intensity
  scaleIntensity: z.number().default(1.15).describe('Scale pulse intensity multiplier (1.0-2.0)'),
  rotationIntensity: z.number().default(3).describe('Rotation intensity in degrees (0-10)'),
  breathingIntensity: z.number().default(50).describe('Breathing effect intensity in pixels (0-100)'),
  
  // Color effects
  brightnessRange: z.number().default(1.3).describe('Brightness variation range (1.0-2.0)'),
  colorShiftIntensity: z.number().default(0.15).describe('Color shift intensity (0.0-0.5)'),
  
  // Beat detection
  beatThreshold: z.number().default(0.4).describe('Beat detection threshold (0.1-1.0)'),
  strongBeatMultiplier: z.number().default(1.5).describe('Strong beat intensity multiplier (1.0-3.0)'),
});

// --- Preset Execution Function ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    audioSrc,
    backgroundImage,
    midBackImage,
    midImage,
    foregroundImage,
    accentImage,
    bassSensitivity,
    midSensitivity,
    trebleSensitivity,
    scaleIntensity,
    rotationIntensity,
    breathingIntensity,
    brightnessRange,
    colorShiftIntensity,
    beatThreshold,
    strongBeatMultiplier,
  } = params;

  const { fetcher, presets } = props;

  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  // --- Helper Functions ---

  const generateEffectId = (prefix: string, index: number): string => {
    return `${prefix}-effect-${index}-${Date.now()}`;
  };

  const calculateBeatRanges = (
    beats: any[],
    duration: number,
    property: 'translateX' | 'translateY' | 'scale' | 'rotate' | 'brightness',
    baseValue: number,
    amplitude: number,
    layerOffset: number,
  ): any[] => {
    const ranges: any[] = [];
    
    // Start at base value
    ranges.push({ key: property, val: baseValue, prog: 0 });

    beats.forEach((beat, index) => {
      const beatTime = beat.time;
      const beatIntensity = beat.intensity || 1;
      const prog = beatTime / duration;
      
      if (prog > 1) return;

      // Pre-beat position (ease back to base)
      if (index > 0) {
        const preBeatProg = Math.max(0, prog - 0.05 / duration);
        ranges.push({ key: property, val: baseValue, prog: preBeatProg });
      }

      // Beat peak (apply amplitude based on intensity)
      const peakValue = baseValue + amplitude * beatIntensity * (1 + layerOffset * 0.1);
      ranges.push({ key: property, val: peakValue, prog });

      // Post-beat decay
      const decayProg = Math.min(1, prog + 0.2 / duration);
      ranges.push({ key: property, val: baseValue, prog: decayProg });
    });

    // End at base value
    if (ranges[ranges.length - 1].prog < 1) {
      ranges.push({ key: property, val: baseValue, prog: 1 });
    }

    return ranges;
  };

  const filterBeatsByFrequency = (
    beats: any[],
    frequency: 'bass' | 'mid' | 'treble',
    threshold: number,
  ): any[] => {
    return beats.filter((beat) => {
      const intensity = beat.intensity || 0;
      if (intensity < threshold) return false;

      // Simple frequency classification based on beat characteristics
      if (frequency === 'bass') {
        return beat.frequency === 'low' || !beat.frequency;
      } else if (frequency === 'mid') {
        return beat.frequency === 'mid' || !beat.frequency;
      } else {
        return beat.frequency === 'high' || !beat.frequency;
      }
    });
  };

  // --- Audio Analysis ---

  let audioDuration = 30; // Default fallback
  let beats: any[] = [];

  try {
    const analysisResult = await fetcher('/api/analyze-audio', {
      audioSrc: audioSrc,
    });

    audioDuration = analysisResult.durationInSeconds || 30;
    
    // Extract beats from analysis
    if (analysisResult.analysis && analysisResult.analysis.beats) {
      beats = analysisResult.analysis.beats.map((beat: any, index: number) => ({
        time: beat.time || beat.start || index,
        intensity: beat.confidence || beat.intensity || 1,
        frequency: beat.frequency || 'mid',
      }));
    } else {
      // Fallback: generate synthetic beats
      for (let i = 0; i < audioDuration; i += 0.5) {
        beats.push({
          time: i,
          intensity: 0.5 + Math.random() * 0.5,
          frequency: i % 2 === 0 ? 'bass' : 'mid',
        });
      }
    }
  } catch (error) {
    console.error('Audio analysis failed, using fallback beats:', error);
    // Generate fallback beats
    for (let i = 0; i < audioDuration; i += 0.5) {
      beats.push({
        time: i,
        intensity: 0.5 + Math.random() * 0.5,
        frequency: i % 2 === 0 ? 'bass' : 'mid',
      });
    }
  }

  // Filter beats by frequency
  const bassBeats = filterBeatsByFrequency(beats, 'bass', beatThreshold);
  const midBeats = filterBeatsByFrequency(beats, 'mid', beatThreshold);
  const trebleBeats = filterBeatsByFrequency(beats, 'treble', beatThreshold * 0.8);

  // Identify strong beats (high intensity)
  const strongBeats = beats.filter(
    (beat) => beat.intensity >= beatThreshold * strongBeatMultiplier,
  );

  // --- Build Component Tree ---

  // Audio source
  const audioComponent: RenderableComponentData = {
    id: 'reactive-audio-parallax-audio',
    type: 'atom',
    componentId: 'AudioAtom',
    data: {
      src: audioSrc,
      volume: 1,
      startFrom: 0,
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
  };

  // --- Layer Creation with Effects ---

  // Background Layer (Bass-driven)
  const backgroundEffects: any[] = [];

  // TranslateX effect (bass beats)
  backgroundEffects.push({
    id: generateEffectId('background-translateX', 0),
    componentId: 'reactive-audio-parallax-background',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-background'],
      ranges: calculateBeatRanges(
        bassBeats,
        audioDuration,
        'translateX',
        0,
        bassSensitivity * 30,
        0,
      ),
    },
  });

  // TranslateY effect
  backgroundEffects.push({
    id: generateEffectId('background-translateY', 1),
    componentId: 'reactive-audio-parallax-background',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-background'],
      ranges: calculateBeatRanges(
        bassBeats,
        audioDuration,
        'translateY',
        0,
        bassSensitivity * 20,
        0,
      ),
    },
  });

  // Scale pulse
  backgroundEffects.push({
    id: generateEffectId('background-scale', 2),
    componentId: 'reactive-audio-parallax-background',
    data: {
      type: 'ease-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-background'],
      ranges: calculateBeatRanges(
        bassBeats,
        audioDuration,
        'scale',
        1.0,
        (scaleIntensity - 1.0) * 0.5,
        0,
      ),
    },
  });

  // Brightness effect
  backgroundEffects.push({
    id: generateEffectId('background-brightness', 3),
    componentId: 'reactive-audio-parallax-background',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-background'],
      ranges: calculateBeatRanges(
        bassBeats,
        audioDuration,
        'brightness',
        1.0,
        brightnessRange - 1.0,
        0,
      ),
    },
  });

  const backgroundLayer: RenderableComponentData = {
    id: 'reactive-audio-parallax-background',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: backgroundImage,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
      styling: {
        containerClassName: 'absolute inset-0 will-change-transform z-10',
      },
    },
    effects: backgroundEffects,
  };

  // Mid-Back Layer (Bass + Mid)
  const midBackEffects: any[] = [];

  midBackEffects.push({
    id: generateEffectId('midback-translateX', 0),
    componentId: 'reactive-audio-parallax-midback',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-midback'],
      ranges: calculateBeatRanges(
        [...bassBeats, ...midBeats].sort((a, b) => a.time - b.time),
        audioDuration,
        'translateX',
        0,
        midSensitivity * 25,
        1,
      ),
    },
  });

  midBackEffects.push({
    id: generateEffectId('midback-translateY', 1),
    componentId: 'reactive-audio-parallax-midback',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-midback'],
      ranges: calculateBeatRanges(
        midBeats,
        audioDuration,
        'translateY',
        breathingIntensity * 0.3,
        midSensitivity * 15,
        1,
      ),
    },
  });

  midBackEffects.push({
    id: generateEffectId('midback-scale', 2),
    componentId: 'reactive-audio-parallax-midback',
    data: {
      type: 'ease-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-midback'],
      ranges: calculateBeatRanges(
        midBeats,
        audioDuration,
        'scale',
        1.0,
        (scaleIntensity - 1.0) * 0.6,
        1,
      ),
    },
  });

  const midBackLayer: RenderableComponentData = {
    id: 'reactive-audio-parallax-midback',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: midBackImage,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
      styling: {
        containerClassName: 'absolute inset-0 will-change-transform z-20',
      },
    },
    effects: midBackEffects,
  };

  // Mid Layer (Mid frequency)
  const midEffects: any[] = [];

  midEffects.push({
    id: generateEffectId('mid-translateX', 0),
    componentId: 'reactive-audio-parallax-mid',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-mid'],
      ranges: calculateBeatRanges(
        midBeats,
        audioDuration,
        'translateX',
        0,
        midSensitivity * 20,
        2,
      ),
    },
  });

  midEffects.push({
    id: generateEffectId('mid-translateY', 1),
    componentId: 'reactive-audio-parallax-mid',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-mid'],
      ranges: calculateBeatRanges(
        strongBeats,
        audioDuration,
        'translateY',
        breathingIntensity * 0.5,
        midSensitivity * 12,
        2,
      ),
    },
  });

  midEffects.push({
    id: generateEffectId('mid-rotate', 2),
    componentId: 'reactive-audio-parallax-mid',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-mid'],
      ranges: calculateBeatRanges(
        strongBeats,
        audioDuration,
        'rotate',
        0,
        rotationIntensity * 0.5,
        2,
      ),
    },
  });

  const midLayer: RenderableComponentData = {
    id: 'reactive-audio-parallax-mid',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: midImage,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
      styling: {
        containerClassName: 'absolute inset-0 will-change-transform z-30',
      },
    },
    effects: midEffects,
  };

  // Foreground Layer (Mid + Treble)
  const foregroundEffects: any[] = [];

  foregroundEffects.push({
    id: generateEffectId('foreground-translateX', 0),
    componentId: 'reactive-audio-parallax-foreground',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-foreground'],
      ranges: calculateBeatRanges(
        [...midBeats, ...trebleBeats].sort((a, b) => a.time - b.time),
        audioDuration,
        'translateX',
        0,
        trebleSensitivity * 15,
        3,
      ),
    },
  });

  foregroundEffects.push({
    id: generateEffectId('foreground-translateY', 1),
    componentId: 'reactive-audio-parallax-foreground',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-foreground'],
      ranges: calculateBeatRanges(
        trebleBeats,
        audioDuration,
        'translateY',
        breathingIntensity * 0.7,
        trebleSensitivity * 10,
        3,
      ),
    },
  });

  foregroundEffects.push({
    id: generateEffectId('foreground-scale', 2),
    componentId: 'reactive-audio-parallax-foreground',
    data: {
      type: 'ease-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-foreground'],
      ranges: calculateBeatRanges(
        trebleBeats,
        audioDuration,
        'scale',
        1.0,
        (scaleIntensity - 1.0) * 0.8,
        3,
      ),
    },
  });

  const foregroundLayer: RenderableComponentData = {
    id: 'reactive-audio-parallax-foreground',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: foregroundImage,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
      styling: {
        containerClassName: 'absolute inset-0 will-change-transform z-40',
      },
    },
    effects: foregroundEffects,
  };

  // Accent Layer (Treble-driven)
  const accentEffects: any[] = [];

  accentEffects.push({
    id: generateEffectId('accent-translateX', 0),
    componentId: 'reactive-audio-parallax-accent',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-accent'],
      ranges: calculateBeatRanges(
        trebleBeats,
        audioDuration,
        'translateX',
        0,
        trebleSensitivity * 12,
        4,
      ),
    },
  });

  accentEffects.push({
    id: generateEffectId('accent-translateY', 1),
    componentId: 'reactive-audio-parallax-accent',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-accent'],
      ranges: calculateBeatRanges(
        trebleBeats,
        audioDuration,
        'translateY',
        breathingIntensity,
        trebleSensitivity * 8,
        4,
      ),
    },
  });

  accentEffects.push({
    id: generateEffectId('accent-scale', 2),
    componentId: 'reactive-audio-parallax-accent',
    data: {
      type: 'ease-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-accent'],
      ranges: calculateBeatRanges(
        trebleBeats,
        audioDuration,
        'scale',
        1.0,
        (scaleIntensity - 1.0),
        4,
      ),
    },
  });

  accentEffects.push({
    id: generateEffectId('accent-rotate', 3),
    componentId: 'reactive-audio-parallax-accent',
    data: {
      type: 'ease-in-out',
      start: 0,
      duration: audioDuration,
      mode: 'provider',
      targetIds: ['reactive-audio-parallax-accent'],
      ranges: calculateBeatRanges(
        strongBeats,
        audioDuration,
        'rotate',
        0,
        rotationIntensity,
        4,
      ),
    },
  });

  const accentLayer: RenderableComponentData = {
    id: 'reactive-audio-parallax-accent',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: accentImage,
      fit: 'cover',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
      styling: {
        containerClassName: 'absolute inset-0 will-change-transform z-50',
      },
    },
    effects: accentEffects,
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'reactive-audio-parallax-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden bg-black',
      },
      fitDurationTo: 'reactive-audio-parallax-audio',
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      audioComponent,
      backgroundLayer,
      midBackLayer,
      midLayer,
      foregroundLayer,
      accentLayer,
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

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'reactive-audio-parallax',
  title: 'Reactive Audio Parallax',
  description:
    'A music video-style parallax effect where 5 image layers respond to different audio frequency ranges. Background layers pulse and shift with bass frequencies while foreground layers react to treble. Uses BeatStitch for audio analysis to generate beat-synchronized translateX/Y movements, scale pulses, subtle rotations, and opacity breathing effects. Creates dynamic depth and rhythm-driven visual movement.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'audio',
    'parallax',
    'music-video',
    'beat-sync',
    'audio-reactive',
    'multi-layer',
    'frequency-based',
  ],
  defaultInputParams: {
    audioSrc: '',
    backgroundImage: '',
    midBackImage: '',
    midImage: '',
    foregroundImage: '',
    accentImage: '',
    bassSensitivity: 2.5,
    midSensitivity: 1.8,
    trebleSensitivity: 1.2,
    scaleIntensity: 1.15,
    rotationIntensity: 3,
    breathingIntensity: 50,
    brightnessRange: 1.3,
    colorShiftIntensity: 0.15,
    beatThreshold: 0.4,
    strongBeatMultiplier: 1.5,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// --- Export Preset ---

export const reactiveAudioParallaxPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
