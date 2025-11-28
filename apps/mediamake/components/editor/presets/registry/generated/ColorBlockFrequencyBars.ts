/**
 * ColorBlockFrequencyBars - Audio Visualizer Effect Preset
 *
 * This preset creates an audio visualizer effect using colored blocks that respond to different frequency ranges.
 * Each block represents a frequency band and scales/colors based on audio intensity. Perfect for music-driven content
 * where visual rhythm needs to match audio.
 *
 * Features:
 * - Multiple frequency-specific bars (5-32 configurable)
 * - Color mapping (gradient, rainbow, monochrome, or custom discrete colors)
 * - Orientation options (vertical equalizer, horizontal, radial)
 * - Smoothing factor for animation
 * - Peak hold indicators
 * - Decay timing control
 * - Optional glow effects on high intensity
 * - Waveform audio-reactive effects
 *
 * Use cases:
 * - Music visualizers
 * - Audio-reactive backgrounds
 * - Beat-synchronized graphics
 * - Podcast/music player interfaces
 * - DJ visual displays
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { WaveformEffectData } from '@microfox/remotion';
import { RenderableComponentData } from '@microfox/datamotion';

// Input parameters schema
const presetParams = z.object({
  barCount: z
    .number()
    .min(5)
    .max(32)
    .describe('Number of frequency bars to display (5-32)'),
  colorScheme: z
    .union([
      z.array(z.string()),
      z.enum(['rainbow', 'gradient', 'monochrome']),
    ])
    .describe(
      'Color scheme: array of hex colors, or preset (rainbow/gradient/monochrome)',
    ),
  orientation: z
    .enum(['vertical', 'horizontal', 'radial'])
    .optional()
    .describe(
      'Orientation of the bars: vertical (equalizer), horizontal, or radial',
    ),
  smoothing: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Smoothing factor for animation (0 = no smoothing, 1 = max)'),
  showPeaks: z
    .boolean()
    .optional()
    .describe('Show peak hold indicators on high intensity'),
  targetIds: z
    .array(z.string())
    .describe('Target component IDs to apply the visualizer to'),
  audioSrc: z
    .string()
    .describe('Audio source URL or ref:componentId for waveform analysis'),
  barWidth: z
    .number()
    .optional()
    .describe('Width of each bar in pixels (default: 32)'),
  barGap: z.number().optional().describe('Gap between bars in pixels (default: 8)'),
  sensitivity: z
    .number()
    .min(0.1)
    .max(5)
    .optional()
    .describe('Audio sensitivity multiplier (default: 0.8)'),
  glowIntensity: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Glow effect intensity on high intensity bars (0-1, default: 0)'),
  minScale: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Minimum scale value for bars (default: 0.1)'),
  maxScale: z
    .number()
    .min(1)
    .max(3)
    .optional()
    .describe('Maximum scale value for bars (default: 1)'),
  decayTime: z
    .number()
    .optional()
    .describe('Peak hold decay time in seconds (default: 0.5)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Helper function to generate frequency ranges
  const generateFrequencyRanges = (barCount: number): [number, number][] => {
    const ranges: [number, number][] = [];
    const minFreq = 20; // 20 Hz (low bass)
    const maxFreq = 16000; // 16 kHz (high treble)

    // Logarithmic frequency distribution (more bars in lower frequencies)
    const logMin = Math.log(minFreq);
    const logMax = Math.log(maxFreq);
    const logStep = (logMax - logMin) / barCount;

    for (let i = 0; i < barCount; i++) {
      const lowFreq = Math.round(Math.exp(logMin + logStep * i));
      const highFreq = Math.round(Math.exp(logMin + logStep * (i + 1)));
      ranges.push([lowFreq, highFreq]);
    }

    return ranges;
  };

  // Helper function to generate colors
  const generateColors = (
    scheme: string | string[],
    barCount: number,
  ): string[] => {
    if (Array.isArray(scheme)) {
      // Custom discrete colors - repeat if needed
      const colors: string[] = [];
      for (let i = 0; i < barCount; i++) {
        colors.push(scheme[i % scheme.length]);
      }
      return colors;
    }

    if (scheme === 'rainbow') {
      // Rainbow gradient (red -> orange -> yellow -> green -> cyan -> blue -> purple)
      const colors: string[] = [];
      for (let i = 0; i < barCount; i++) {
        const hue = (i / barCount) * 360;
        colors.push(`hsl(${hue}, 100%, 60%)`);
      }
      return colors;
    }

    if (scheme === 'gradient') {
      // Blue to red gradient
      const colors: string[] = [];
      for (let i = 0; i < barCount; i++) {
        const ratio = i / (barCount - 1);
        const r = Math.round(0 + 255 * ratio);
        const g = Math.round(100 - 100 * ratio);
        const b = Math.round(255 - 255 * ratio);
        colors.push(`rgb(${r}, ${g}, ${b})`);
      }
      return colors;
    }

    if (scheme === 'monochrome') {
      // White bars
      return Array(barCount).fill('#ffffff');
    }

    // Default fallback
    return Array(barCount).fill('#ffffff');
  };

  // Extract parameters
  const barCount = params.barCount;
  const colorScheme = params.colorScheme;
  const orientation = params.orientation || 'vertical';
  const smoothing = params.smoothing ?? 0.5;
  const showPeaks = params.showPeaks ?? false;
  const targetIds = params.targetIds;
  const audioSrc = params.audioSrc;
  const barWidth = params.barWidth || 32;
  const barGap = params.barGap || 8;
  const sensitivity = params.sensitivity ?? 0.8;
  const glowIntensity = params.glowIntensity ?? 0;
  const minScale = params.minScale ?? 0.1;
  const maxScale = params.maxScale ?? 1;
  const decayTime = params.decayTime ?? 0.5;

  // Generate frequency ranges and colors
  const frequencyRanges = generateFrequencyRanges(barCount);
  const barColors = generateColors(colorScheme, barCount);

  // Container layout class based on orientation
  const containerClass = 'absolute inset-0 flex items-center justify-center';
  let barsContainerClass = '';

  if (orientation === 'vertical') {
    barsContainerClass = 'flex flex-row gap-2 items-end';
  } else if (orientation === 'horizontal') {
    barsContainerClass = 'flex flex-col gap-2 items-start';
  } else if (orientation === 'radial') {
    barsContainerClass = 'relative flex items-center justify-center';
  }

  // Create frequency bar components
  const barComponents: any[] = [];
  const waveformEffects: any[] = [];

  for (let i = 0; i < barCount; i++) {
    const barId = `frequency-bar-${i}`;
    const [lowFreq, highFreq] = frequencyRanges[i];
    const barColor = barColors[i];

    // Determine bar dimensions and rotation based on orientation
    let barStyle: any = {
      backgroundColor: barColor,
      borderRadius: '4px',
    };

    if (orientation === 'vertical') {
      barStyle.width = `${barWidth}px`;
      barStyle.height = '200px';
    } else if (orientation === 'horizontal') {
      barStyle.width = '200px';
      barStyle.height = `${barWidth}px`;
    } else if (orientation === 'radial') {
      // Radial: bars rotate around center
      const angle = (i / barCount) * 360;
      const radius = 150;
      const x = Math.cos((angle * Math.PI) / 180) * radius;
      const y = Math.sin((angle * Math.PI) / 180) * radius;
      barStyle = {
        ...barStyle,
        position: 'absolute',
        width: `${barWidth}px`,
        height: '100px',
        transform: `translate(${x}px, ${y}px) rotate(${angle + 90}deg)`,
        transformOrigin: 'center bottom',
      };
    }

    // Add glow effect if specified
    if (glowIntensity > 0) {
      barStyle.boxShadow = `0 0 ${20 * glowIntensity}px ${barColor}`;
    }

    // Create bar HTML
    const barHtml = `<div style='${Object.entries(barStyle)
      .map(([key, val]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${val}`)
      .join('; ')}'></div>`;

    // Create bar component
    barComponents.push({
      id: barId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: barHtml,
        className: 'transition-transform duration-100',
      },
      context: {
        timing: {
          start: 0,
          duration: 'auto',
        },
      },
    });

    // Create waveform effect for this bar
    const scaleAxis =
      orientation === 'vertical' || orientation === 'radial'
        ? 'scaleY'
        : 'scaleX';

    const waveformEffect: WaveformEffectData = {
      audioSrc: audioSrc,
      audioProperty: 'frequency',
      effectType: 'scale',
      frequencyRange: [lowFreq, highFreq],
      sensitivity: sensitivity,
      threshold: 0.05,
      minValue: minScale,
      maxValue: maxScale,
      baseScale: minScale,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      smoothNormalisation: smoothing,
      mode: 'provider',
      targetIds: [barId],
      start: 0,
      duration: 'auto',
    };

    waveformEffects.push({
      id: `waveform-effect-${i}`,
      componentId: 'waveform',
      data: waveformEffect,
    });
  }

  // Create peak hold indicators if enabled
  const peakComponents: any[] = [];
  const peakEffects: any[] = [];

  if (showPeaks) {
    for (let i = 0; i < barCount; i++) {
      const peakId = `peak-indicator-${i}`;
      const [lowFreq, highFreq] = frequencyRanges[i];
      const barColor = barColors[i];

      const peakStyle: any = {
        backgroundColor: barColor,
        borderRadius: '2px',
        opacity: 0.8,
      };

      if (orientation === 'vertical') {
        peakStyle.width = `${barWidth}px`;
        peakStyle.height = '4px';
        peakStyle.marginBottom = '196px'; // Position above bar
      } else if (orientation === 'horizontal') {
        peakStyle.width = '4px';
        peakStyle.height = `${barWidth}px`;
        peakStyle.marginLeft = '196px'; // Position next to bar
      }

      const peakHtml = `<div style='${Object.entries(peakStyle)
        .map(([key, val]) => `${key.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${val}`)
        .join('; ')}'></div>`;

      peakComponents.push({
        id: peakId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: peakHtml,
          className: 'transition-all duration-300',
        },
        context: {
          timing: {
            start: 0,
            duration: 'auto',
          },
        },
      });

      // Peak hold waveform effect
      const peakWaveformEffect: WaveformEffectData = {
        audioSrc: audioSrc,
        audioProperty: 'frequency',
        effectType: orientation === 'vertical' ? 'translateY' : 'translateX',
        frequencyRange: [lowFreq, highFreq],
        sensitivity: sensitivity * 0.8,
        threshold: 0.1,
        intensity: orientation === 'vertical' ? -200 : 200,
        numberOfSamples: 128,
        useFrequencyData: true,
        windowInSeconds: 1 / 30,
        smoothNormalisation: smoothing * 2, // More smoothing for peaks
        mode: 'provider',
        targetIds: [peakId],
        start: 0,
        duration: 'auto',
      };

      peakEffects.push({
        id: `peak-effect-${i}`,
        componentId: 'waveform',
        data: peakWaveformEffect,
      });
    }
  }

  // Build child components with bars and peaks interleaved
  const visualizerChildren: any[] = [];
  for (let i = 0; i < barCount; i++) {
    if (showPeaks) {
      visualizerChildren.push(peakComponents[i]);
    }
    visualizerChildren.push(barComponents[i]);
  }

  // Root container
  const rootContainer = {
    id: 'color-block-frequency-bars-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: containerClass,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: 'auto',
      },
    },
    childrenData: [
      {
        id: 'bars-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: barsContainerClass,
            style: {
              gap: `${barGap}px`,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: 'auto',
          },
        },
        childrenData: visualizerChildren as RenderableComponentData[],
        effects: [...waveformEffects, ...peakEffects],
      },
    ],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'ColorBlockFrequencyBars',
  title: 'Color Block Frequency Bars Audio Visualizer',
  description:
    'Audio visualizer with colored blocks responding to frequency ranges. Creates vertical/horizontal/radial equalizer bars that scale and color based on audio intensity, with peak hold indicators, decay timing, and optional glow effects for music-driven content.',
  type: 'predefined',
  presetType: 'effects',
  tags: [
    'audio',
    'visualizer',
    'waveform',
    'frequency',
    'music',
    'effects',
    'internal',
  ],
  dependencies: {},
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  defaultInputParams: {
    barCount: 16,
    colorScheme: 'rainbow',
    orientation: 'vertical',
    smoothing: 0.5,
    showPeaks: true,
    targetIds: [],
    audioSrc: 'ref:audio-track',
    barWidth: 32,
    barGap: 8,
    sensitivity: 0.8,
    glowIntensity: 0.3,
    minScale: 0.1,
    maxScale: 1,
    decayTime: 0.5,
  },
};

export const ColorBlockFrequencyBarsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
