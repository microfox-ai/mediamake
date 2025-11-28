/**
 * Audio-Reactive Candlestick Chart Typokinetic Preset
 *
 * This preset creates a dynamic financial data visualization merged with music visualizer aesthetics.
 * Candlestick heights and animations respond to audio beats, with waveform effects making bodies pulse
 * on bass hits. Action words ('BUY', 'SELL', 'HOLD', 'WIN') appear at beat timestamps, scaling up
 * with impact. The composition expresses victory through intensifying audio-visual synchronization
 * as the chart trends upward.
 *
 * Features:
 * - **Audio-Reactive Candlesticks**: Heights and animation intensity respond to audio beats
 * - **Waveform Effects**: Candlestick bodies expand/contract rhythmically with bass hits
 * - **Beat-Synced Typography**: Action words appear at detected beat timestamps with scaling impact
 * - **Dynamic Styling**: Green (bullish) and red (bearish) candlesticks with gradient backgrounds
 * - **Victory Expression**: Increasing intensity as chart trends upward
 * - **Audio Analysis**: Fetches beat detection data via API for precise synchronization
 *
 * Use cases:
 * - Creating engaging financial content with music
 * - Building audio-reactive data visualizations
 * - Producing energetic market analysis videos
 * - Creating social media content for trading/finance
 * - Building beat-synced educational content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import {
  BaseLayoutData,
  WaveformEffectData,
  GenericEffectData,
  TextAtomData,
} from '@microfox/remotion';

const presetParams = z.object({
  audioSrc: z.string().describe('Audio source URL for beat detection and reactive effects'),
  audioVolume: z.number().min(0).max(2).default(1).optional().describe('Audio playback volume (0-2)'),
  candlestickCount: z.number().min(3).max(12).default(8).optional().describe('Number of candlesticks to display'),
  candlestickData: z.array(z.object({
    type: z.enum(['bullish', 'bearish']).describe('Candlestick type (green or red)'),
    bodyHeight: z.number().describe('Body height in pixels'),
    wickTopHeight: z.number().describe('Top wick height in pixels'),
    wickBottomHeight: z.number().describe('Bottom wick height in pixels'),
    priceValue: z.string().describe('Price label text'),
  })).optional().describe('Custom candlestick data (if not provided, generates automatically)'),
  bassSensitivity: z.number().min(0.1).max(5).default(1.5).optional().describe('Sensitivity of bass-reactive effects'),
  bassThreshold: z.number().min(0).max(1).default(0.3).optional().describe('Minimum bass value to trigger effects'),
  actionWords: z.array(z.string()).default(['BUY', 'SELL', 'HOLD', 'WIN']).optional().describe('Action words to display at beats'),
  wordColors: z.array(z.string()).default(['#10b981', '#ef4444', '#f59e0b', '#8b5cf6']).optional().describe('Colors for action words (same order)'),
  maxBeatsForWords: z.number().min(4).max(20).default(12).optional().describe('Maximum number of beats to show words'),
  backgroundGradient: z.object({
    from: z.string().default('#0f172a').describe('Gradient start color'),
    via: z.string().default('#1e293b').describe('Gradient middle color'),
    to: z.string().default('#0f172a').describe('Gradient end color'),
  }).optional().describe('Background gradient colors'),
});

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Helper: Generate default candlestick data
  const generateCandlestickData = (count: number) => {
    const data = [];
    let prevHeight = 100;
    
    for (let i = 0; i < count; i++) {
      const isBullish = Math.random() > 0.4; // 60% bullish (uptrend bias)
      const trend = i / count; // Increasing trend factor
      
      const bodyHeight = prevHeight + (Math.random() * 80 - 20) + (trend * 40); // Upward trend
      const wickTopHeight = 20 + Math.random() * 40;
      const wickBottomHeight = 15 + Math.random() * 35;
      
      data.push({
        type: isBullish ? 'bullish' : 'bearish',
        bodyHeight: Math.max(60, Math.min(280, bodyHeight)),
        wickTopHeight,
        wickBottomHeight,
        priceValue: `$${(100 + i * 5 + Math.random() * 10).toFixed(2)}`,
      });
      
      prevHeight = bodyHeight;
    }
    
    return data;
  };

  const candlestickCount = params.candlestickCount ?? 8;
  const candlestickData = params.candlestickData ?? generateCandlestickData(candlestickCount);
  
  // Fetch audio analysis for beat detection
  let audioAnalysis: any = null;
  let audioDuration = 30; // Default duration
  let selectedBeats: any[] = [];
  
  if (fetcher) {
    try {
      const { analysis, durationInSeconds } = await fetcher('/api/analyze-audio', {
        audioSrc: params.audioSrc,
      });
      
      audioAnalysis = analysis;
      audioDuration = durationInSeconds;
      
      // Select impactful beats for word display
      if (analysis && analysis.length > 0) {
        const scoredBeats = analysis.map((beat: any) => ({
          ...beat,
          score: beat.intensity * 0.5 + (beat.spectralCentroid || 0) * 0.3 + (beat.frequency / 3000) * 0.2,
        }));
        
        scoredBeats.sort((a: any, b: any) => b.score - a.score);
        
        const maxBeats = Math.min(params.maxBeatsForWords ?? 12, scoredBeats.length);
        selectedBeats = scoredBeats.slice(0, maxBeats).sort((a: any, b: any) => a.timestamp - b.timestamp);
      }
    } catch (error) {
      console.warn('Audio analysis failed, using default timing', error);
    }
  }

  const bassSensitivity = params.bassSensitivity ?? 1.5;
  const bassThreshold = params.bassThreshold ?? 0.3;
  const actionWords = params.actionWords ?? ['BUY', 'SELL', 'HOLD', 'WIN'];
  const wordColors = params.wordColors ?? ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'];
  const backgroundGradient = params.backgroundGradient ?? {
    from: '#0f172a',
    via: '#1e293b',
    to: '#0f172a',
  };

  // Create candlesticks
  const candlestickComponents: RenderableComponentData[] = candlestickData.map((stick, index) => {
    const candlestickId = `candlestick-${index}`;
    const bodyId = `body-${index}`;
    const wickTopId = `wick-top-${index}`;
    const wickBottomId = `wick-bottom-${index}`;
    
    const isBullish = stick.type === 'bullish';
    const bodyColor = isBullish ? '#10b981' : '#ef4444';
    
    // Waveform effect on body: scaleY based on bass
    const bodyWaveformEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'bass',
      effectType: 'scaleY',
      sensitivity: bassSensitivity,
      threshold: bassThreshold,
      numberOfSamples: 128,
      useFrequencyData: true,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [bodyId],
      start: 0,
      duration: audioDuration,
      smoothNormalisation: 1,
      intensity: 0.3,
      baseScale: 1,
    };
    
    // Additional waveform effect: opacity based on intensity
    const opacityWaveformEffect: WaveformEffectData = {
      audioSrc: params.audioSrc,
      audioProperty: 'intensity',
      effectType: 'scale',
      sensitivity: 1.0,
      threshold: 0.2,
      numberOfSamples: 128,
      useFrequencyData: false,
      windowInSeconds: 1 / 30,
      mode: 'provider',
      targetIds: [candlestickId],
      start: 0,
      duration: audioDuration,
      smoothNormalisation: 1,
      intensity: 0.1,
      baseScale: 1,
    };
    
    // Base animation for candlestick entrance
    const entranceEffect: GenericEffectData = {
      type: 'ease-out',
      start: 0,
      duration: 0.3 * (index + 1),
      mode: 'provider',
      targetIds: [candlestickId],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
        { key: 'translateY', val: 50, prog: 0 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    };

    return {
      id: candlestickId,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative flex flex-col items-center',
        },
      } as BaseLayoutData,
      context: {
        timing: {
          start: 0,
          duration: audioDuration,
        },
      },
      effects: [
        {
          id: `body-waveform-${index}`,
          componentId: 'waveform',
          data: bodyWaveformEffect,
        },
        {
          id: `opacity-waveform-${index}`,
          componentId: 'waveform',
          data: opacityWaveformEffect,
        },
        {
          id: `entrance-${index}`,
          componentId: 'generic',
          data: entranceEffect,
        },
      ],
      childrenData: [
        // Top wick
        {
          id: wickTopId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'w-0.5 bg-gray-400',
              style: {
                height: `${stick.wickTopHeight}px`,
              },
            },
          } as BaseLayoutData,
          context: {
            timing: {
              start: 0,
              duration: audioDuration,
            },
          },
        },
        // Body
        {
          id: bodyId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'w-10 rounded',
              style: {
                backgroundColor: bodyColor,
                height: `${stick.bodyHeight}px`,
              },
            },
          } as BaseLayoutData,
          context: {
            timing: {
              start: 0,
              duration: audioDuration,
            },
          },
        },
        // Bottom wick
        {
          id: wickBottomId,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'w-0.5 bg-gray-400',
              style: {
                height: `${stick.wickBottomHeight}px`,
              },
            },
          } as BaseLayoutData,
          context: {
            timing: {
              start: 0,
              duration: audioDuration,
            },
          },
        },
        // Price label
        {
          id: `price-label-${index}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: stick.priceValue,
            style: {
              fontSize: '12px',
              color: '#9ca3af',
              marginTop: '8px',
            },
          } as TextAtomData,
          context: {
            timing: {
              start: 0,
              duration: audioDuration,
            },
          },
        },
      ] as RenderableComponentData[],
    } as RenderableComponentData;
  });

  // Create action words with beat-synced appearance
  const actionWordComponents: RenderableComponentData[] = selectedBeats.map((beat, index) => {
    const wordIndex = index % actionWords.length;
    const word = actionWords[wordIndex];
    const color = wordColors[wordIndex];
    const wordId = `action-word-${index}`;
    
    const beatTime = beat.timestamp;
    const displayDuration = 1.5;
    
    // Beat-synchronized scale effect
    const beatZoomEffect: GenericEffectData = {
      type: 'ease-out',
      start: beatTime,
      duration: 0.6,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'scale', val: 0.5, prog: 0 },
        { key: 'scale', val: 1.3, prog: 0.3 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.2 },
      ],
    };
    
    // Fade out effect
    const fadeOutEffect: GenericEffectData = {
      type: 'ease-in',
      start: beatTime + displayDuration - 0.5,
      duration: 0.5,
      mode: 'provider',
      targetIds: [wordId],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    };

    return {
      id: wordId,
      type: 'atom',
      componentId: 'TextAtom',
      data: {
        text: word,
        style: {
          fontSize: '96px',
          fontWeight: '900',
          color: color,
          textShadow: `0 0 40px ${color}80`,
          opacity: 0,
        },
        font: {
          family: 'Inter',
          weights: ['900'],
        },
      } as TextAtomData,
      context: {
        timing: {
          start: beatTime,
          duration: displayDuration,
        },
      },
      effects: [
        {
          id: `beat-zoom-${index}`,
          componentId: 'generic',
          data: beatZoomEffect,
        },
        {
          id: `fade-out-${index}`,
          componentId: 'generic',
          data: fadeOutEffect,
        },
      ],
    } as RenderableComponentData;
  });

  // Main container
  const rootContainer: RenderableComponentData = {
    id: 'audio-reactive-candlestick-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: `flex items-end justify-center gap-4 h-full w-full bg-gradient-to-t p-8`,
        style: {
          background: `linear-gradient(to top, ${backgroundGradient.from}, ${backgroundGradient.via}, ${backgroundGradient.to})`,
        },
      },
    } as BaseLayoutData,
    context: {
      timing: {
        start: 0,
        duration: audioDuration,
      },
    },
    childrenData: [
      // Audio source
      {
        id: 'audio-source',
        type: 'atom',
        componentId: 'AudioAtom',
        data: {
          src: params.audioSrc,
          volume: params.audioVolume ?? 1,
        },
        context: {
          timing: {
            start: 0,
          },
        },
      },
      // Candlestick container
      {
        id: 'candlestick-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex items-end justify-center gap-4 h-full',
          },
        } as BaseLayoutData,
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: candlestickComponents,
      },
      // Action words overlay
      {
        id: 'action-words-overlay',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
          },
        } as BaseLayoutData,
        context: {
          timing: {
            start: 0,
            duration: audioDuration,
          },
        },
        childrenData: actionWordComponents,
      },
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'audioReactiveCandlestickTypokinetic',
  title: 'Audio-Reactive Candlestick Chart Typokinetic',
  description: 'Audio-reactive candlestick chart where height and animation intensity respond to audio beats. Candlesticks pulse on bass hits with waveform effects. Action words appear at beat timestamps, scaling up with impact. Combines music visualizer aesthetics with financial data visualization.',
  type: 'predefined',
  presetType: 'children',
  tags: ['audio', 'reactive', 'candlestick', 'chart', 'typokinetic', 'financial', 'visualizer', 'waveform', 'beats'],
  dependencies: {},
  defaultInputParams: {
    audioSrc: 'https://example.com/audio.mp3',
    audioVolume: 1,
    candlestickCount: 8,
    bassSensitivity: 1.5,
    bassThreshold: 0.3,
    actionWords: ['BUY', 'SELL', 'HOLD', 'WIN'],
    wordColors: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
    maxBeatsForWords: 12,
    backgroundGradient: {
      from: '#0f172a',
      via: '#1e293b',
      to: '#0f172a',
    },
  },
};

export const audioReactiveCandlestickTypokineticPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};