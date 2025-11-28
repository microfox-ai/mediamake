/**
 * Echo Convergence Blur Preset
 *
 * This preset creates a mesmerizing beat-synced effect where multiple offset ghost copies
 * of text with varying blur levels spiral and collapse into a single sharp instance on
 * musical beats. The effect simulates temporal echoes or parallel dimensions synchronizing,
 * with each echo featuring different opacity, blur values, and chromatic hue shifts.
 *
 * Features:
 * - **Multiple Echo Layers**: 6 echo copies + 1 main text (7 total)
 * - **Circular Offset Pattern**: Echoes positioned in a circular pattern around center
 * - **Progressive Blur Cascade**: Decreasing blur values (20px → 0px) for depth effect
 * - **Opacity Gradient**: Echo opacity ranges from 0.2 to 1.0 (main)
 * - **Chromatic Color Shifts**: Each echo has unique hue-rotate filter for dreamlike quality
 * - **Beat-Synced Convergence**: All echoes converge to center on audio beats
 * - **Rotational Alignment**: Echoes spiral from varied angles to 0° on convergence
 * - **Smooth Cubic-Bezier Easing**: Professional convergence animations
 * - **Performance Optimized**: Uses transform-origin and will-change properties
 *
 * Use cases:
 * - Creating cinematic beat-synced title reveals
 * - Building dimensional convergence effects for music videos
 * - Adding parallel universe synchronization visuals
 * - Creating dreamlike, chromatic text effects
 * - Designing impactful audio-reactive title sequences
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// ============================================================================
// PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  text: z.string().describe('Text content to display with echo convergence effect'),
  
  audio: z.object({
    src: z.string().describe('Audio source URL for beat detection'),
    start: z.number().optional().describe('Audio start time in seconds'),
    duration: z.number().optional().describe('Audio duration in seconds'),
  }).describe('Audio configuration for beat detection'),
  
  font: z.string()
    .optional()
    .default('Inter:700')
    .describe('Font family with optional weight and style (e.g., "Roboto:700", "Inter:600:italic")'),
  
  fontSize: z.number()
    .min(24)
    .max(200)
    .default(72)
    .describe('Base font size in pixels'),
  
  textColor: z.string()
    .default('#FFFFFF')
    .describe('Base text color (hex or CSS color)'),
  
  convergenceIntensity: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Convergence animation intensity multiplier (affects offset distance and duration)'),
  
  rotationRange: z.number()
    .min(0)
    .max(180)
    .default(45)
    .describe('Maximum rotation angle in degrees for echo spiral effect'),
  
  offsetRadius: z.number()
    .min(20)
    .max(200)
    .default(80)
    .describe('Radius in pixels for circular echo positioning'),
  
  beatSensitivity: z.number()
    .min(0.1)
    .max(3)
    .default(1.5)
    .describe('Beat detection sensitivity for convergence triggers'),
  
  minTimeBetweenConvergence: z.number()
    .min(0.3)
    .max(3)
    .default(0.8)
    .describe('Minimum time in seconds between convergence events'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Parse font configuration
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontStyle: React.CSSProperties = {};
    
    if (fontString.includes(':')) {
      const fontParts = fontString.split(':');
      if (fontParts.length > 2) {
        fontStyle.fontStyle = fontParts[2] as any;
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      } else if (fontParts.length > 1) {
        fontStyle.fontWeight = parseInt(fontParts[1], 10);
      }
    }
    
    return { fontFamily, fontStyle };
  };

  const { fontFamily, fontStyle } = parseFontString(params.font);

  // Fetch audio beat analysis
  if (!fetcher) {
    throw new Error('Fetcher is required for audio analysis');
  }

  const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
    audioSrc: params.audio.src,
  });

  if (!analysis || analysis.length === 0) {
    return {
      output: {
        childrenData: [],
      },
      options: {},
    };
  }

  // Filter and adjust beats based on audio start/duration
  const audioStart = params.audio.start || 0;
  const audioDuration = params.audio.duration || durationInSeconds;
  
  const clippedAnalysis = analysis
    .filter((beat: any) => 
      beat.timestamp >= audioStart && 
      beat.timestamp <= audioStart + audioDuration
    )
    .map((beat: any) => ({
      ...beat,
      timestamp: beat.timestamp - audioStart,
    }));

  // Select impactful beats for convergence events
  const selectImpactfulBeats = (beats: any[], sensitivity: number, minTimeDiff: number) => {
    const scoredBeats = beats.map((beat, index) => {
      const windowSize = 5;
      const start = Math.max(0, index - windowSize);
      const end = Math.min(beats.length, index + windowSize + 1);
      const neighbors = beats.slice(start, end);
      const avgNeighborIntensity = neighbors.reduce((sum: number, b: any) => sum + b.intensity, 0) / neighbors.length;

      const localPeakStrength = beat.intensity - avgNeighborIntensity;
      const isLocalPeak = localPeakStrength > 0.05;

      const intensityScore = beat.intensity * 0.4;
      const peakScore = isLocalPeak ? localPeakStrength * 0.4 : 0;
      const spectralScore = (beat.spectralCentroid || 0) * 0.2;

      return {
        ...beat,
        totalScore: (intensityScore + peakScore + spectralScore) * sensitivity,
      };
    });

    const sortedByImpact = scoredBeats.sort((a, b) => b.totalScore - a.totalScore);
    const selectedBeats: any[] = [];
    const usedTimestamps = new Set<number>();

    for (const beat of sortedByImpact) {
      const tooClose = Array.from(usedTimestamps).some(
        usedTime => Math.abs(beat.timestamp - usedTime) < minTimeDiff
      );

      if (!tooClose && selectedBeats.length < 30) {
        selectedBeats.push(beat);
        usedTimestamps.add(beat.timestamp);
      }
    }

    return selectedBeats.sort((a, b) => a.timestamp - b.timestamp);
  };

  const selectedBeats = selectImpactfulBeats(
    clippedAnalysis,
    params.beatSensitivity,
    params.minTimeBetweenConvergence
  );

  // Calculate circular positions for each echo layer
  const calculateEchoPosition = (index: number, totalEchoes: number) => {
    const angle = (index / totalEchoes) * 2 * Math.PI;
    const radius = params.offsetRadius * params.convergenceIntensity;
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      rotation: (angle * 180 / Math.PI) - 180, // Convert to degrees
    };
  };

  // Echo configuration: blur, opacity, hue-rotate
  const echoConfigs = [
    { blur: 20, opacity: 0.2, hueRotate: 30 },
    { blur: 15, opacity: 0.3, hueRotate: 60 },
    { blur: 10, opacity: 0.4, hueRotate: 90 },
    { blur: 5, opacity: 0.6, hueRotate: 120 },
    { blur: 2, opacity: 0.8, hueRotate: 150 },
    { blur: 1, opacity: 0.9, hueRotate: 180 },
  ];

  // Create convergence effects for each beat
  const createConvergenceEffects = (beat: any, echoIndex: number, position: any) => {
    const convergenceDuration = 0.6 / params.convergenceIntensity;
    const startTime = beat.timestamp - (convergenceDuration * 0.5);
    
    const effects: any[] = [];

    // Position convergence (translateX, translateY)
    effects.push({
      id: `convergence-position-${echoIndex}-${beat.timestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: convergenceDuration,
        mode: 'provider',
        targetIds: [`echo-layer-${echoIndex}`],
        ranges: [
          { key: 'translateX', val: position.x, prog: 0 },
          { key: 'translateX', val: 0, prog: 0.5 },
          { key: 'translateX', val: position.x, prog: 1 },
          { key: 'translateY', val: position.y, prog: 0 },
          { key: 'translateY', val: 0, prog: 0.5 },
          { key: 'translateY', val: position.y, prog: 1 },
        ],
      },
    });

    // Rotation convergence
    const rotationOffset = (position.rotation % 360) * (params.rotationRange / 180);
    effects.push({
      id: `convergence-rotation-${echoIndex}-${beat.timestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: convergenceDuration,
        mode: 'provider',
        targetIds: [`echo-layer-${echoIndex}`],
        ranges: [
          { key: 'rotate', val: rotationOffset, prog: 0 },
          { key: 'rotate', val: 0, prog: 0.5 },
          { key: 'rotate', val: rotationOffset, prog: 1 },
        ],
      },
    });

    // Blur convergence (to 0)
    const config = echoConfigs[echoIndex];
    effects.push({
      id: `convergence-blur-${echoIndex}-${beat.timestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: convergenceDuration,
        mode: 'provider',
        targetIds: [`echo-text-${echoIndex}`],
        ranges: [
          { key: 'filter', val: `blur(${config.blur}px) hue-rotate(${config.hueRotate}deg)`, prog: 0 },
          { key: 'filter', val: `blur(0px) hue-rotate(${config.hueRotate}deg)`, prog: 0.5 },
          { key: 'filter', val: `blur(${config.blur}px) hue-rotate(${config.hueRotate}deg)`, prog: 1 },
        ],
      },
    });

    // Opacity pulse (fade to main opacity)
    effects.push({
      id: `convergence-opacity-${echoIndex}-${beat.timestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: convergenceDuration,
        mode: 'provider',
        targetIds: [`echo-text-${echoIndex}`],
        ranges: [
          { key: 'opacity', val: config.opacity, prog: 0 },
          { key: 'opacity', val: 0.95, prog: 0.5 },
          { key: 'opacity', val: config.opacity, prog: 1 },
        ],
      },
    });

    return effects;
  };

  // Collect all convergence effects for all echoes
  const allEchoEffects: any[] = [];
  echoConfigs.forEach((config, echoIndex) => {
    const position = calculateEchoPosition(echoIndex, echoConfigs.length);
    selectedBeats.forEach(beat => {
      const effects = createConvergenceEffects(beat, echoIndex, position);
      allEchoEffects.push(...effects);
    });
  });

  // Main text convergence effects (opacity pulse only)
  const mainTextEffects: any[] = [];
  selectedBeats.forEach(beat => {
    const convergenceDuration = 0.6 / params.convergenceIntensity;
    const startTime = beat.timestamp - (convergenceDuration * 0.5);
    
    mainTextEffects.push({
      id: `main-convergence-${beat.timestamp}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: startTime,
        duration: convergenceDuration,
        mode: 'provider',
        targetIds: ['main-text'],
        ranges: [
          { key: 'opacity', val: 1, prog: 0 },
          { key: 'opacity', val: 0.7, prog: 0.25 },
          { key: 'opacity', val: 1, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 1.05, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
        ],
      },
    });
  });

  // Build echo layers
  const echoLayers: RenderableComponentData[] = echoConfigs.map((config, index) => {
    const position = calculateEchoPosition(index, echoConfigs.length);
    
    return {
      id: `echo-layer-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute',
          style: {
            transformOrigin: 'center center',
            willChange: 'transform, opacity, filter',
            transform: `translate(${position.x}px, ${position.y}px) rotate(${position.rotation}deg)`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      childrenData: [
        {
          id: `echo-text-${index}`,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: params.text,
            style: {
              fontSize: params.fontSize,
              color: params.textColor,
              filter: `blur(${config.blur}px) hue-rotate(${config.hueRotate}deg)`,
              opacity: config.opacity,
              ...fontStyle,
            },
            font: {
              family: fontFamily,
              weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration: audioDuration,
            },
          },
        } as RenderableComponentData,
      ],
    } as RenderableComponentData;
  });

  // Build main text layer
  const mainTextLayer: RenderableComponentData = {
    id: 'main-text-layer',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          transformOrigin: 'center center',
          willChange: 'transform, opacity, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: mainTextEffects,
    childrenData: [
      {
        id: 'main-text',
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text: params.text,
          style: {
            fontSize: params.fontSize,
            color: params.textColor,
            filter: 'blur(0px)',
            opacity: 1,
            ...fontStyle,
          },
          font: {
            family: fontFamily,
            weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
          },
        },
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'echo-convergence-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          willChange: 'transform, opacity, filter',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    effects: allEchoEffects,
    childrenData: [
      ...echoLayers,
      mainTextLayer,
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
// METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'echo-convergence-blur',
  title: 'Echo Convergence Blur',
  description: 'A beat-synced text effect where multiple offset ghost copies with varying blur levels, opacity gradients, and chromatic hue shifts spiral and collapse into a single sharp instance on musical beats. Creates a temporal echo or parallel dimensions synchronizing effect with dreamlike chromatic quality.',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'audio-reactive', 'beat-sync', 'echo', 'blur', 'convergence', 'chromatic', 'spiral', 'dimensional'],
  dependencies: {},
  defaultInputParams: {
    text: 'ECHO',
    audio: {
      src: 'https://example.com/audio.mp3',
      start: 0,
      duration: 30,
    },
    font: 'Inter:700',
    fontSize: 72,
    textColor: '#FFFFFF',
    convergenceIntensity: 1,
    rotationRange: 45,
    offsetRadius: 80,
    beatSensitivity: 1.5,
    minTimeBetweenConvergence: 0.8,
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export const echoConvergenceBlurPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};