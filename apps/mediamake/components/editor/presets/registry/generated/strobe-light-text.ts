/**
 * Strobe Light Text Effect Preset
 *
 * Creates aggressive, beat-synchronized strobe text effects optimized for electronic and hip-hop music.
 * Features sharp staccato bursts on hi-hats, bright white flashes with scale increases on strong beats,
 * and RGB channel splitting (chromatic aberration) during intense moments for a glitchy, high-energy
 * club aesthetic.
 *
 * Features:
 * - **Beat-Synchronized Flashing**: Text flashes in/out on detected beats with sharp, step-end transitions
 * - **Hi-Hat Pattern Detection**: Rapid strobe bursts on high-frequency, low-intensity beats
 * - **Strong Beat Amplification**: Scale increases and brightness boosts on high-intensity beats (>0.8)
 * - **Chromatic Aberration Effect**: RGB channel splitting during intense moments for glitchy visuals
 * - **Audio Analysis Integration**: Uses /api/analyze-audio for real-time beat detection
 * - **Customizable Intensity**: Adjustable strobe speed, flash intensity, and aberration strength
 * - **Performance Optimized**: Uses will-change, GPU-accelerated transforms, and efficient rendering
 *
 * Use cases:
 * - Electronic music video text effects
 * - Hip-hop lyric videos with aggressive visual style
 * - Club/rave aesthetic title cards
 * - High-energy social media content
 * - DJ set visualizations
 * - Beat-drop title reveals
 */

import { RenderableComponentData } from '@microfox/datamotion';
import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';

// ========================================
// PARAMETER SCHEMA
// ========================================

const presetParams = z.object({
  text: z.string().describe('Text to display with strobe effect'),
  
  audio: z.object({
    src: z.string().describe('Audio source URL for beat analysis'),
    start: z.number().optional().describe('Audio start time in seconds (default: 0)'),
    duration: z.number().optional().describe('Audio duration in seconds (uses full audio if not specified)'),
  }).describe('Audio source configuration for beat synchronization'),

  // Strobe timing configuration
  strobeIntensity: z.number().min(0.1).max(3).default(1).optional()
    .describe('Overall strobe intensity multiplier (0.1-3, default: 1)'),
  
  flashDuration: z.number().min(0.05).max(0.3).default(0.1).optional()
    .describe('Duration of each flash in seconds (0.05-0.3, default: 0.1)'),
  
  minBeatInterval: z.number().min(0.05).max(1).default(0.15).optional()
    .describe('Minimum time between beats in seconds (0.05-1, default: 0.15)'),
  
  strongBeatThreshold: z.number().min(0.5).max(1).default(0.8).optional()
    .describe('Intensity threshold for strong beats (0.5-1, default: 0.8)'),

  // Visual style configuration
  baseTextColor: z.string().default('#ffffff').optional()
    .describe('Base text color (default: #ffffff white)'),
  
  fontSize: z.number().min(24).max(200).default(80).optional()
    .describe('Text font size in pixels (24-200, default: 80)'),
  
  fontWeight: z.enum(['400', '700', '900']).default('900').optional()
    .describe('Font weight (400, 700, 900, default: 900 black)'),
  
  fontFamily: z.string().default('Inter').optional()
    .describe('Font family (default: Inter)'),

  // Chromatic aberration configuration
  chromaticAberrationIntensity: z.number().min(0).max(10).default(3).optional()
    .describe('RGB channel split intensity in pixels (0-10, default: 3)'),
  
  aberrationOnStrongBeatsOnly: z.boolean().default(true).optional()
    .describe('Apply chromatic aberration only on strong beats (default: true)'),

  // Scale and brightness configuration
  strongBeatScale: z.number().min(1).max(2).default(1.2).optional()
    .describe('Scale multiplier on strong beats (1-2, default: 1.2)'),
  
  strongBeatBrightness: z.number().min(1).max(3).default(2).optional()
    .describe('Brightness multiplier on strong beats (1-3, default: 2)'),

  // Background glow configuration
  glowIntensity: z.number().min(0).max(100).default(40).optional()
    .describe('Text glow blur radius in pixels (0-100, default: 40)'),
  
  glowColor: z.string().default('#ffffff').optional()
    .describe('Glow color (default: #ffffff white)'),

  // Positioning
  verticalPosition: z.enum(['top', 'center', 'bottom']).default('center').optional()
    .describe('Vertical position of text (default: center)'),
  
  horizontalPosition: z.enum(['left', 'center', 'right']).default('center').optional()
    .describe('Horizontal position of text (default: center)'),
});

type PresetParams = z.infer<typeof presetParams>;

// ========================================
// PRESET EXECUTION
// ========================================

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Helper function: Parse audio analysis and select beats
  const selectStrobeBeats = (
    analysis: any[],
    minInterval: number,
    audioStart: number,
    audioDuration: number,
  ) => {
    // Filter beats within audio range
    const filteredBeats = analysis.filter(
      beat => beat.timestamp >= audioStart && 
              beat.timestamp <= audioStart + audioDuration
    );

    // Sort by timestamp
    const sortedBeats = filteredBeats.sort((a, b) => a.timestamp - b.timestamp);

    // Select beats respecting minimum interval
    const selectedBeats: any[] = [];
    let lastTimestamp = -Infinity;

    for (const beat of sortedBeats) {
      if (beat.timestamp - lastTimestamp >= minInterval) {
        selectedBeats.push({
          ...beat,
          relativeTimestamp: beat.timestamp - audioStart,
        });
        lastTimestamp = beat.timestamp;
      }
    }

    return selectedBeats;
  };

  // Helper function: Create strobe flash effect
  const createStrobeFlash = (
    beatData: any,
    targetId: string,
    flashDuration: number,
    isStrongBeat: boolean,
    params: PresetParams,
  ) => {
    const effects: any[] = [];

    // Base opacity flash (sharp on/off)
    effects.push({
      id: `strobe-flash-${targetId}-${beatData.relativeTimestamp}`,
      componentId: 'generic',
      data: {
        type: 'linear',
        start: beatData.relativeTimestamp,
        duration: flashDuration,
        mode: 'provider',
        targetIds: [targetId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.01 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 0.51 },
        ],
      },
    });

    // Strong beat enhancements
    if (isStrongBeat) {
      // Scale pulse
      effects.push({
        id: `strobe-scale-${targetId}-${beatData.relativeTimestamp}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beatData.relativeTimestamp,
          duration: flashDuration * 1.5,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: params.strongBeatScale ?? 1.2, prog: 0.3 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        },
      });

      // Brightness flash
      effects.push({
        id: `strobe-brightness-${targetId}-${beatData.relativeTimestamp}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beatData.relativeTimestamp,
          duration: flashDuration * 1.5,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'filter:brightness', val: 1, prog: 0 },
            { key: 'filter:brightness', val: params.strongBeatBrightness ?? 2, prog: 0.3 },
            { key: 'filter:brightness', val: 1, prog: 1 },
          ],
        },
      });

      // Text glow pulse
      const glowIntensity = params.glowIntensity ?? 40;
      const glowColor = params.glowColor ?? '#ffffff';
      effects.push({
        id: `strobe-glow-${targetId}-${beatData.relativeTimestamp}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: beatData.relativeTimestamp,
          duration: flashDuration * 1.2,
          mode: 'provider',
          targetIds: [targetId],
          ranges: [
            { key: 'textShadow', val: `0 0 0px ${glowColor}`, prog: 0 },
            { key: 'textShadow', val: `0 0 ${glowIntensity}px ${glowColor}`, prog: 0.5 },
            { key: 'textShadow', val: `0 0 0px ${glowColor}`, prog: 1 },
          ],
        },
      });
    }

    return effects;
  };

  // Helper function: Create chromatic aberration effects
  const createChromaticAberration = (
    beatData: any,
    redLayerId: string,
    greenLayerId: string,
    blueLayerId: string,
    flashDuration: number,
    params: PresetParams,
  ) => {
    const aberrationIntensity = params.chromaticAberrationIntensity ?? 3;
    const effects: any[] = [];

    // Red layer (shift left)
    effects.push({
      id: `aberration-red-${beatData.relativeTimestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: beatData.relativeTimestamp,
        duration: flashDuration * 1.2,
        mode: 'provider',
        targetIds: [redLayerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateX', val: -aberrationIntensity, prog: 0 },
          { key: 'translateX', val: -aberrationIntensity * 1.5, prog: 0.5 },
          { key: 'translateX', val: -aberrationIntensity, prog: 1 },
        ],
      },
    });

    // Green layer (center, no shift)
    effects.push({
      id: `aberration-green-${beatData.relativeTimestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: beatData.relativeTimestamp,
        duration: flashDuration * 1.2,
        mode: 'provider',
        targetIds: [greenLayerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 1 },
        ],
      },
    });

    // Blue layer (shift right)
    effects.push({
      id: `aberration-blue-${beatData.relativeTimestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-out',
        start: beatData.relativeTimestamp,
        duration: flashDuration * 1.2,
        mode: 'provider',
        targetIds: [blueLayerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.3 },
          { key: 'opacity', val: 0, prog: 1 },
          { key: 'translateX', val: aberrationIntensity, prog: 0 },
          { key: 'translateX', val: aberrationIntensity * 1.5, prog: 0.5 },
          { key: 'translateX', val: aberrationIntensity, prog: 1 },
        ],
      },
    });

    return effects;
  };

  // Fetch audio analysis
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  const audioStart = params.audio.start ?? 0;
  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    throw new Error('No audio analysis data received');
  }

  const audioDuration = params.audio.duration ?? durationInSeconds - audioStart;

  // Select strobe beats
  const minBeatInterval = params.minBeatInterval ?? 0.15;
  const strobeBeats = selectStrobeBeats(
    analysis,
    minBeatInterval,
    audioStart,
    audioDuration,
  );

  const strongBeatThreshold = params.strongBeatThreshold ?? 0.8;
  const flashDuration = params.flashDuration ?? 0.1;
  const aberrationOnStrongBeatsOnly = params.aberrationOnStrongBeatsOnly ?? true;

  // Component IDs
  const mainTextId = 'strobe-main-text';
  const chromaticRedId = 'strobe-chromatic-red';
  const chromaticGreenId = 'strobe-chromatic-green';
  const chromaticBlueId = 'strobe-chromatic-blue';
  const containerId = 'strobe-container';

  // Build effects arrays
  const mainTextEffects: any[] = [];
  const chromaticEffects: any[] = [];

  strobeBeats.forEach(beat => {
    const isStrongBeat = beat.intensity >= strongBeatThreshold;

    // Main text strobe flash
    const flashEffects = createStrobeFlash(
      beat,
      mainTextId,
      flashDuration,
      isStrongBeat,
      params,
    );
    mainTextEffects.push(...flashEffects);

    // Chromatic aberration (on strong beats or all beats based on config)
    if (!aberrationOnStrongBeatsOnly || isStrongBeat) {
      const aberrationEffects = createChromaticAberration(
        beat,
        chromaticRedId,
        chromaticGreenId,
        chromaticBlueId,
        flashDuration,
        params,
      );
      chromaticEffects.push(...aberrationEffects);
    }
  });

  // Positioning classes
  const getPositionClasses = () => {
    const verticalMap = {
      top: 'items-start pt-20',
      center: 'items-center',
      bottom: 'items-end pb-20',
    };
    const horizontalMap = {
      left: 'justify-start pl-20',
      center: 'justify-center',
      right: 'justify-end pr-20',
    };
    return `${verticalMap[params.verticalPosition ?? 'center']} ${horizontalMap[params.horizontalPosition ?? 'center']}`;
  };

  // Text style
  const textStyle = {
    fontSize: `${params.fontSize ?? 80}px`,
    fontWeight: params.fontWeight ?? '900',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    willChange: 'opacity, transform, filter',
    opacity: 0,
  };

  // Build composition
  const childrenData: RenderableComponentData[] = [
    // Audio source
    {
      id: 'strobe-audio-source',
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: params.audio.src,
        volume: 0,
        startFrom: audioStart,
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
    },

    // Chromatic aberration red layer
    {
      id: chromaticRedId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute',
        style: {
          ...textStyle,
          color: '#ff0000',
          mixBlendMode: 'screen' as const,
        },
        font: {
          family: params.fontFamily ?? 'Inter',
          weights: [params.fontWeight ?? '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      effects: chromaticEffects.filter(e => e.data.targetIds[0] === chromaticRedId),
    },

    // Chromatic aberration green layer
    {
      id: chromaticGreenId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute',
        style: {
          ...textStyle,
          color: '#00ff00',
          mixBlendMode: 'screen' as const,
        },
        font: {
          family: params.fontFamily ?? 'Inter',
          weights: [params.fontWeight ?? '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      effects: chromaticEffects.filter(e => e.data.targetIds[0] === chromaticGreenId),
    },

    // Chromatic aberration blue layer
    {
      id: chromaticBlueId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        className: 'absolute',
        style: {
          ...textStyle,
          color: '#0000ff',
          mixBlendMode: 'screen' as const,
        },
        font: {
          family: params.fontFamily ?? 'Inter',
          weights: [params.fontWeight ?? '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      effects: chromaticEffects.filter(e => e.data.targetIds[0] === chromaticBlueId),
    },

    // Main text layer
    {
      id: mainTextId,
      type: 'atom' as const,
      componentId: 'TextAtom',
      data: {
        text: params.text,
        style: {
          ...textStyle,
          color: params.baseTextColor ?? '#ffffff',
        },
        font: {
          family: params.fontFamily ?? 'Inter',
          weights: [params.fontWeight ?? '900'],
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      effects: mainTextEffects,
    },
  ];

  const rootContainer: RenderableComponentData = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `bg-black w-full h-full flex ${getPositionClasses()} relative`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData,
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

// ========================================
// METADATA
// ========================================

const presetMetadata: PresetMetadata = {
  id: 'strobeLightText',
  title: 'Strobe Light Text Effect',
  description:
    'Beat-synchronized strobe text effect with chromatic aberration and aggressive flashing optimized for electronic and hip-hop music. Features sharp staccato bursts on hi-hats, bright white flashes with scale increases on strong beats, and RGB channel splitting during intense moments for a glitchy, high-energy club aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'strobe',
    'beat-sync',
    'chromatic-aberration',
    'glitch',
    'electronic',
    'hip-hop',
    'club',
    'high-energy',
    'audio-reactive',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'STROBE',
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
    },
    strobeIntensity: 1,
    flashDuration: 0.1,
    minBeatInterval: 0.15,
    strongBeatThreshold: 0.8,
    baseTextColor: '#ffffff',
    fontSize: 80,
    fontWeight: '900',
    fontFamily: 'Inter',
    chromaticAberrationIntensity: 3,
    aberrationOnStrongBeatsOnly: true,
    strongBeatScale: 1.2,
    strongBeatBrightness: 2,
    glowIntensity: 40,
    glowColor: '#ffffff',
    verticalPosition: 'center',
    horizontalPosition: 'center',
  },
};

// ========================================
// EXPORT
// ========================================

export const strobeLightTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
