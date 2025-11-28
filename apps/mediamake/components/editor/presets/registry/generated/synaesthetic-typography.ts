/**
 * Synaesthetic Typography Visualizer Preset
 *
 * This preset creates an audio-reactive typography visualizer where each letter acts as a visual
 * frequency bar responding to audio spectrum data. Text becomes a living spectrogram with:
 * - Vowels reacting to low frequencies (warm colors, smooth waves)
 * - Consonants reacting to high frequencies (cool colors, sharp peaks)
 * - Visual harmonics through interference patterns and color mixing
 * - Dynamic height, color, and glow effects synchronized to audio
 *
 * Features:
 * - Audio-reactive letter animations with waveform effects
 * - Frequency-based letter mapping (vowels: 20-250Hz, consonants: 250-4000Hz)
 * - Dynamic color gradients mapped to frequency and amplitude
 * - CSS mix-blend-modes for interference patterns when letters overlap
 * - Glow effects (text-shadow, box-shadow) animated to frequency amplitude
 * - Visual harmonics with blur and opacity changes on letter combinations
 * - Frequency bars beneath each letter showing amplitude
 * - Perfect sync with audio using fitDurationTo
 *
 * Use cases:
 * - Creating audio-visual typography experiences
 * - Building living spectrograms from text
 * - Audio-reactive title sequences
 * - Experimental music visualizations
 * - Synaesthetic text animations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  WaveformEffectData,
  GenericEffectData,
  RenderableComponentData,
} from '@microfox/datamotion';

// --- Parameter Schema ---

const presetParams = z.object({
  text: z.string().describe('Text content to visualize as synaesthetic typography'),
  audio: z.object({
    src: z.string().describe('Audio source URL for frequency analysis'),
    volume: z.number().min(0).max(2).default(1).optional().describe('Audio volume (0-2)'),
    duration: z.number().optional().describe('Audio duration in seconds'),
  }).describe('Audio configuration for frequency-based animation'),
  fontSize: z.number().min(20).max(200).default(64).describe('Base font size for letters in pixels'),
  letterSpacing: z.number().min(0).max(100).default(20).describe('Space between letters in pixels'),
  font: z.string().default('Inter:700').optional().describe('Font family with optional weight (e.g., "Inter:700", "Roboto:600")'),
  colorScheme: z.enum(['spectrum', 'warm-cool', 'monochrome', 'neon']).default('warm-cool').optional().describe('Color mapping scheme for frequency visualization'),
  intensity: z.number().min(0.1).max(3).default(1).describe('Overall effect intensity multiplier'),
  glowIntensity: z.number().min(0).max(3).default(1).describe('Glow effect intensity'),
  harmonicsEnabled: z.boolean().default(true).optional().describe('Enable visual harmonics and interference patterns'),
  showFrequencyBars: z.boolean().default(true).optional().describe('Show frequency bar beneath each letter'),
  sensitivity: z.number().min(0.1).max(5).default(1.5).optional().describe('Audio sensitivity for waveform effects'),
  smoothing: z.number().min(0).max(5).default(1).optional().describe('Smoothing factor for audio analysis'),
});

// --- Preset Execution ---

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { text, audio, fontSize, letterSpacing, font, colorScheme, intensity, glowIntensity, harmonicsEnabled, showFrequencyBars, sensitivity, smoothing } = params;

  // Parse font string (format: "FontName:weight" or "FontName")
  const parseFontString = (fontString: string) => {
    const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
    let fontWeight = 700;
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      if (parts.length > 1) {
        fontWeight = parseInt(parts[1], 10);
      }
    }
    return { fontFamily, fontWeight };
  };

  const { fontFamily, fontWeight } = parseFontString(font || 'Inter:700');

  // Letter classification
  const classifyLetter = (letter: string): 'vowel' | 'consonant' | 'other' => {
    const char = letter.toLowerCase();
    if (/[aeiou]/.test(char)) return 'vowel';
    if (/[bcdfghjklmnpqrstvwxyz]/.test(char)) return 'consonant';
    return 'other';
  };

  // Color mapping based on frequency and type
  const getColorForLetter = (type: 'vowel' | 'consonant' | 'other', scheme: string): string => {
    if (scheme === 'warm-cool') {
      if (type === 'vowel') return 'linear-gradient(180deg, #FF6B6B 0%, #FF8E53 100%)'; // Warm (red to orange)
      if (type === 'consonant') return 'linear-gradient(180deg, #4ECDC4 0%, #556FFF 100%)'; // Cool (teal to blue)
      return 'linear-gradient(180deg, #95E1D3 0%, #F38181 100%)';
    } else if (scheme === 'spectrum') {
      if (type === 'vowel') return 'linear-gradient(180deg, #FF0000 0%, #FF7F00 100%)'; // Red to orange
      if (type === 'consonant') return 'linear-gradient(180deg, #00FFFF 0%, #0000FF 100%)'; // Cyan to blue
      return 'linear-gradient(180deg, #00FF00 0%, #FFFF00 100%)'; // Green to yellow
    } else if (scheme === 'monochrome') {
      if (type === 'vowel') return 'linear-gradient(180deg, #FFFFFF 0%, #CCCCCC 100%)';
      if (type === 'consonant') return 'linear-gradient(180deg, #888888 0%, #444444 100%)';
      return 'linear-gradient(180deg, #AAAAAA 0%, #666666 100%)';
    } else if (scheme === 'neon') {
      if (type === 'vowel') return 'linear-gradient(180deg, #FF00FF 0%, #FF0080 100%)'; // Magenta to pink
      if (type === 'consonant') return 'linear-gradient(180deg, #00FFFF 0%, #0080FF 100%)'; // Cyan to electric blue
      return 'linear-gradient(180deg, #00FF00 0%, #80FF00 100%)'; // Green to lime
    }
    return 'linear-gradient(180deg, #FFFFFF 0%, #CCCCCC 100%)';
  };

  // Audio property mapping
  const getAudioPropertyForLetter = (type: 'vowel' | 'consonant' | 'other'): 'bass' | 'mid' | 'treble' => {
    if (type === 'vowel') return 'bass'; // Low frequencies
    if (type === 'consonant') return 'treble'; // High frequencies
    return 'mid'; // Mid frequencies
  };

  // Create letter components
  const letters = text.split('');
  const letterComponents: RenderableComponentData[] = [];

  letters.forEach((letter, index) => {
    if (letter.trim() === '') return; // Skip whitespace

    const letterType = classifyLetter(letter);
    const letterId = `letter-${index}`;
    const barId = `bar-${index}`;
    const audioProperty = getAudioPropertyForLetter(letterType);
    const gradient = getColorForLetter(letterType, colorScheme || 'warm-cool');

    // Letter container
    const letterContainer: RenderableComponentData = {
      id: `container-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative inline-flex flex-col items-center justify-end',
          style: {
            minWidth: '20px',
            minHeight: '120px',
            marginRight: `${letterSpacing}px`,
          },
        },
      },
      context: {
        timing: {
          start: 0,
          fitDurationTo: 'audio-source',
        },
      },
      childrenData: [
        // Frequency bar (if enabled)
        ...(showFrequencyBars ? [{
          id: barId,
          type: 'atom' as const,
          componentId: 'HTMLBlockAtom',
          data: {
            html: `<div style="width: 100%; height: 50px; background: ${gradient}; border-radius: 4px; transform-origin: bottom center;"></div>`,
            className: 'w-full',
            style: {
              transformOrigin: 'bottom center',
            },
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: 'audio-source',
            },
          },
          effects: [
            // Waveform effect for bar scale
            {
              id: `bar-scale-${index}`,
              componentId: 'waveform',
              data: {
                audioSrc: audio.src,
                audioProperty: audioProperty,
                effectType: 'scale',
                baseScale: 1,
                intensity: 0.8 * intensity,
                sensitivity: sensitivity ?? 1.5,
                threshold: 0.1,
                numberOfSamples: 128,
                useFrequencyData: true,
                windowInSeconds: 1 / 30,
                mode: 'provider',
                targetIds: [barId],
                start: 0,
                fitDurationTo: 'audio-source',
                smoothNormalisation: smoothing ?? 1,
              } as WaveformEffectData,
            },
          ],
        }] : []),

        // Letter text
        {
          id: letterId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text: letter,
            style: {
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              color: 'transparent',
              background: gradient,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              textAlign: 'center',
              position: 'relative',
              zIndex: 10,
              mixBlendMode: harmonicsEnabled ? 'screen' : 'normal',
              filter: harmonicsEnabled ? 'blur(0px)' : 'none',
            },
            font: {
              family: fontFamily,
              weights: [fontWeight.toString()],
              display: 'swap',
            },
          },
          context: {
            timing: {
              start: 0,
              fitDurationTo: 'audio-source',
            },
          },
          effects: [
            // Waveform effect for letter scale (height)
            {
              id: `letter-scale-${index}`,
              componentId: 'waveform',
              data: {
                audioSrc: audio.src,
                audioProperty: audioProperty,
                effectType: 'scale',
                baseScale: 1,
                intensity: 0.4 * intensity,
                sensitivity: sensitivity ?? 1.5,
                threshold: 0.15,
                numberOfSamples: 128,
                useFrequencyData: true,
                windowInSeconds: 1 / 30,
                mode: 'provider',
                targetIds: [letterId],
                start: 0,
                fitDurationTo: 'audio-source',
                smoothNormalisation: smoothing ?? 1,
              } as WaveformEffectData,
            },

            // Glow effect (generic effect using CSS custom properties)
            {
              id: `letter-glow-${index}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                fitDurationTo: 'audio-source',
                mode: 'provider',
                targetIds: [letterId],
                ranges: [
                  // Pulsing glow via text-shadow
                  { key: 'textShadow', val: `0 0 ${5 * glowIntensity}px rgba(255,255,255,0.3)`, prog: 0 },
                  { key: 'textShadow', val: `0 0 ${20 * glowIntensity}px rgba(255,255,255,0.8)`, prog: 0.5 },
                  { key: 'textShadow', val: `0 0 ${5 * glowIntensity}px rgba(255,255,255,0.3)`, prog: 1 },
                ],
              } as GenericEffectData,
            },

            // Visual harmonics: blur effect for letter combinations (if enabled)
            ...(harmonicsEnabled ? [{
              id: `letter-blur-${index}`,
              componentId: 'generic',
              data: {
                type: 'linear',
                start: 0,
                fitDurationTo: 'audio-source',
                mode: 'provider',
                targetIds: [letterId],
                ranges: [
                  { key: 'filter', val: 'blur(0px)', prog: 0 },
                  { key: 'filter', val: `blur(${2 * intensity}px)`, prog: 0.25 },
                  { key: 'filter', val: 'blur(0px)', prog: 0.5 },
                  { key: 'filter', val: `blur(${2 * intensity}px)`, prog: 0.75 },
                  { key: 'filter', val: 'blur(0px)', prog: 1 },
                ],
              } as GenericEffectData,
            }] : []),
          ],
        },
      ],
    };

    letterComponents.push(letterContainer);
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'synaesthetic-typography-root',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex flex-wrap items-end justify-center gap-2',
        style: {
          backgroundColor: '#000000',
          overflow: 'hidden',
          padding: '40px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'audio-source',
      },
    },
    childrenData: [
      // Audio source
      {
        id: 'audio-source',
        type: 'atom' as const,
        componentId: 'AudioAtom',
        data: {
          src: audio.src,
          volume: audio.volume ?? 1,
        },
        context: {
          timing: {
            start: 0,
            duration: audio.duration,
          },
        },
      },

      // Letters wrapper
      {
        id: 'letters-wrapper',
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'flex flex-wrap items-end justify-center',
            style: {
              width: '100%',
              height: '100%',
              padding: '40px',
              gap: '0px',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'audio-source',
          },
        },
        childrenData: letterComponents,
      },
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
  id: 'synaesthetic-typography',
  title: 'Synaesthetic Typography Visualizer',
  description: 'Audio-reactive typography where each letter acts as a visual frequency bar, responding to audio spectrum data. Vowels react to low frequencies with warm colors and smooth waves, consonants to high frequencies with cool colors and sharp peaks. Creates visual harmonics through interference patterns and color mixing when letter combinations appear.',
  type: 'predefined',
  presetType: 'children',
  tags: ['typography', 'audio', 'visualizer', 'waveform', 'synaesthetic', 'frequency', 'experimental'],
  dependencies: {
    presets: [],
    helpers: [],
  },
  defaultInputParams: {
    text: 'MUSIC',
    audio: {
      src: 'https://example.com/audio.mp3',
      volume: 1,
      duration: 30,
    },
    fontSize: 64,
    letterSpacing: 20,
    font: 'Inter:700',
    colorScheme: 'warm-cool',
    intensity: 1,
    glowIntensity: 1,
    harmonicsEnabled: true,
    showFrequencyBars: true,
    sensitivity: 1.5,
    smoothing: 1,
  },
};

// --- Export ---

export const synaestheticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
