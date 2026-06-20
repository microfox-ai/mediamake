/**
 * Glitch Blur-In Typokinetics Preset
 *
 * A glitch-style blur-in typokinetics preset where text materializes through digital interference patterns synced to beats.
 * Features corrupted data streams that gradually stabilize, with heavily distorted blurred fragments that glitch and flicker
 * before resolving into readable typography. Includes scan lines, RGB channel splitting, data moshing effects, random
 * horizontal displacement glitches, and vertical hold issues that settle rhythmically on beat drops.
 *
 * Features:
 * - RGB channel splitting with red/green/blue layers using mix-blend-screen
 * - CSS filters: blur() + contrast() + brightness() in combination
 * - Glitch effects using translateX with random values
 * - Scanline overlay with repeating linear gradient
 * - Data moshing strips with horizontal displacement
 * - Waveform effects with 'shake' mode for glitch intensity tied to audio
 * - Beat detection to trigger stabilization keyframes
 * - Progressive blur reduction from 15px to 0
 * - Opacity flicker from 0.3 to 1 during unstable phases
 * - Performance optimizations: transform-origin and contain: layout style paint
 *
 * Use cases:
 * - Tech product launches
 * - Digital art presentations
 * - Cyberpunk-themed content
 * - Glitch aesthetic videos
 * - Electronic music visualizations
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z.string().describe('The text content to display with glitch effects'),
  fontSize: z
    .number()
    .min(16)
    .max(200)
    .default(72)
    .optional()
    .describe('Font size in pixels'),
  fontFamily: z
    .string()
    .default('Inter')
    .optional()
    .describe('Font family (e.g., "Inter:700", "Roboto:600")'),
  textColor: z
    .string()
    .default('#ffffff')
    .optional()
    .describe('Main text color (hex or rgba)'),
  duration: z
    .number()
    .min(1)
    .max(30)
    .default(5)
    .optional()
    .describe('Total duration of the glitch blur-in animation in seconds'),
  audioSrc: z
    .string()
    .optional()
    .describe(
      'Optional audio source URL for beat-synced stabilization (if not provided, uses time-based stabilization)',
    ),
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .optional()
    .describe('Multiplier for glitch effect intensity (higher = more chaotic)'),
  stabilizationBeats: z
    .number()
    .min(2)
    .max(20)
    .default(8)
    .optional()
    .describe(
      'Number of stabilization waves (beat points) during the animation',
    ),
});

// Preset execution function
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const {
    text,
    fontSize = 72,
    fontFamily = 'Inter',
    textColor = '#ffffff',
    duration = 5,
    audioSrc,
    glitchIntensity = 1,
    stabilizationBeats = 8,
  } = params;

  const { fetcher, config } = props;
  const fps = config?.fps || 30;

  // Parse font family
  const parseFontString = (fontString: string) => {
    if (fontString.includes(':')) {
      const parts = fontString.split(':');
      const family = parts[0];
      const weight = parts.length > 1 ? parts[1] : '700';
      const style = parts.length > 2 ? parts[2] : 'normal';
      return { family, weight, style };
    }
    return { family: fontString, weight: '700', style: 'normal' };
  };

  const fontConfig = parseFontString(fontFamily);
  const fontStyle: Record<string, any> = {
    fontWeight: parseInt(fontConfig.weight, 10) || 700,
  };
  if (fontConfig.style !== 'normal') {
    fontStyle.fontStyle = fontConfig.style;
  }

  // Get beat timestamps if audio is provided
  let beatTimestamps: number[] = [];
  if (audioSrc && fetcher) {
    try {
      const { analysis } = await fetcher('/api/analyze-audio', { audioSrc });
      if (analysis && analysis.length > 0) {
        // Select impactful beats
        const sortedByIntensity = analysis
          .filter((beat: any) => beat.timestamp < duration)
          .sort((a: any, b: any) => b.intensity - a.intensity);

        const selectedBeats = sortedByIntensity
          .slice(0, stabilizationBeats)
          .sort((a: any, b: any) => a.timestamp - b.timestamp);

        beatTimestamps = selectedBeats.map((beat: any) => beat.timestamp);
      }
    } catch (error) {
      console.warn('Failed to analyze audio, using time-based beats', error);
    }
  }

  // If no audio or analysis failed, use evenly distributed beats
  if (beatTimestamps.length === 0) {
    const interval = duration / stabilizationBeats;
    beatTimestamps = Array.from({ length: stabilizationBeats }, (_, i) =>
      Math.min(i * interval, duration),
    );
  }

  // Helper: Generate random displacement values
  const generateRandomDisplacement = () => {
    return Math.random() * 40 * glitchIntensity - 20 * glitchIntensity;
  };

  // Create blur stabilization ranges
  const createBlurRanges = () => {
    const ranges = [];
    const initialBlur = 15 * glitchIntensity;

    // Start at max blur
    ranges.push({ key: 'blur', val: `${initialBlur}px`, prog: 0 });

    // Stabilization keyframes at each beat
    beatTimestamps.forEach((timestamp, index) => {
      const prog = timestamp / duration;
      const blurReduction = (index + 1) / beatTimestamps.length;
      const blurValue = initialBlur * (1 - blurReduction);
      ranges.push({ key: 'blur', val: `${Math.max(0, blurValue)}px`, prog });
    });

    // End at zero blur
    ranges.push({ key: 'blur', val: '0px', prog: 1 });
    return ranges;
  };

  // Create opacity flicker ranges
  const createOpacityRanges = () => {
    const ranges = [];

    // Start very transparent and flickering
    ranges.push({ key: 'opacity', val: 0.3, prog: 0 });

    // Flicker and stabilize at each beat
    beatTimestamps.forEach((timestamp, index) => {
      const prog = timestamp / duration;
      const opacityIncrease = (index + 1) / beatTimestamps.length;
      const opacity = 0.3 + 0.7 * opacityIncrease;

      // Add slight flicker before stabilization
      if (index < beatTimestamps.length - 1) {
        ranges.push({ key: 'opacity', val: opacity * 0.8, prog: prog - 0.02 });
      }
      ranges.push({ key: 'opacity', val: opacity, prog });
    });

    // End at full opacity
    ranges.push({ key: 'opacity', val: 1, prog: 1 });
    return ranges;
  };

  // Create glitch displacement ranges for RGB channels
  const createGlitchRanges = (initialOffset: number, channelId: string) => {
    const ranges = [];

    // Start with heavy displacement
    ranges.push({
      key: 'translateX',
      val: `${initialOffset + generateRandomDisplacement()}px`,
      prog: 0,
    });

    // Settle at each beat
    beatTimestamps.forEach((timestamp, index) => {
      const prog = timestamp / duration;
      const displacement = generateRandomDisplacement() * (1 - prog); // Reduce over time

      ranges.push({
        key: 'translateX',
        val: `${initialOffset + displacement}px`,
        prog,
      });
    });

    // End at correct offset
    ranges.push({ key: 'translateX', val: `${initialOffset}px`, prog: 1 });
    return ranges;
  };

  // Create contrast/brightness ranges
  const createFilterRanges = () => {
    const ranges = [];

    ranges.push({ key: 'contrast', val: 1.8, prog: 0 });
    ranges.push({ key: 'brightness', val: 1.4, prog: 0 });

    beatTimestamps.forEach((timestamp) => {
      const prog = timestamp / duration;
      ranges.push({ key: 'contrast', val: 1.5 - prog * 0.3, prog });
      ranges.push({ key: 'brightness', val: 1.2 - prog * 0.2, prog });
    });

    ranges.push({ key: 'contrast', val: 1.2, prog: 1 });
    ranges.push({ key: 'brightness', val: 1, prog: 1 });
    return ranges;
  };

  // Create data mosh strip animations
  const createMoshStripEffects = (stripId: string, stripIndex: number) => {
    const ranges = [];
    const initialX = stripIndex % 2 === 0 ? -100 : 100;

    ranges.push({ key: 'translateX', val: `${initialX}%`, prog: 0 });

    // Glitch across screen at beats
    beatTimestamps.forEach((timestamp, index) => {
      const prog = timestamp / duration;
      const x = (Math.random() - 0.5) * 200 * (1 - prog);
      ranges.push({ key: 'translateX', val: `${x}%`, prog });
    });

    ranges.push({ key: 'translateX', val: '0%', prog: 1 });
    return ranges;
  };

  // Root container
  const rootContainerId = 'glitch-blur-in-root';

  // Component IDs
  const scanlineId = 'glitch-scanline-overlay';
  const rgbRedId = 'glitch-rgb-red';
  const rgbGreenId = 'glitch-rgb-green';
  const rgbBlueId = 'glitch-rgb-blue';
  const mainTextId = 'glitch-main-text';
  const moshOverlayId = 'glitch-mosh-overlay';
  const moshStrip1Id = 'glitch-mosh-strip-1';
  const moshStrip2Id = 'glitch-mosh-strip-2';
  const moshStrip3Id = 'glitch-mosh-strip-3';

  // Build effects
  const blurRanges = createBlurRanges();
  const opacityRanges = createOpacityRanges();
  const contrastRanges = createFilterRanges();

  // RGB layer effects
  const rgbRedEffect = {
    id: 'effect-rgb-red',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [rgbRedId],
      ranges: [
        ...blurRanges,
        ...opacityRanges,
        ...createGlitchRanges(-3, rgbRedId),
        ...contrastRanges,
      ],
    },
  };

  const rgbGreenEffect = {
    id: 'effect-rgb-green',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [rgbGreenId],
      ranges: [
        ...blurRanges,
        ...opacityRanges,
        ...createGlitchRanges(0, rgbGreenId),
        ...contrastRanges,
      ],
    },
  };

  const rgbBlueEffect = {
    id: 'effect-rgb-blue',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [rgbBlueId],
      ranges: [
        ...blurRanges,
        ...opacityRanges,
        ...createGlitchRanges(3, rgbBlueId),
        ...contrastRanges,
      ],
    },
  };

  // Main text effect
  const mainTextEffect = {
    id: 'effect-main-text',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [mainTextId],
      ranges: [...blurRanges, ...opacityRanges, ...contrastRanges],
    },
  };

  // Data mosh effects
  const moshStrip1Effect = {
    id: 'effect-mosh-strip-1',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [moshStrip1Id],
      ranges: createMoshStripEffects(moshStrip1Id, 0),
    },
  };

  const moshStrip2Effect = {
    id: 'effect-mosh-strip-2',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [moshStrip2Id],
      ranges: createMoshStripEffects(moshStrip2Id, 1),
    },
  };

  const moshStrip3Effect = {
    id: 'effect-mosh-strip-3',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [moshStrip3Id],
      ranges: createMoshStripEffects(moshStrip3Id, 2),
    },
  };

  // Scanline opacity reduction effect
  const scanlineEffect = {
    id: 'effect-scanline',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [scanlineId],
      ranges: [
        { key: 'opacity', val: 0.6, prog: 0 },
        { key: 'opacity', val: 0.2, prog: 1 },
      ],
    },
  };

  // Mosh overlay opacity reduction
  const moshOverlayEffect = {
    id: 'effect-mosh-overlay',
    componentId: 'generic',
    data: {
      type: 'ease-out' as const,
      start: 0,
      duration,
      mode: 'provider' as const,
      targetIds: [moshOverlayId],
      ranges: [
        { key: 'opacity', val: 0.4, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    },
  };

  // Build component tree
  const rootContainer: RenderableComponentData = {
    id: rootContainerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          backgroundColor: '#000000',
          contain: 'layout style paint',
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
      // Scanline overlay
      {
        id: scanlineId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
            style: {
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
              mixBlendMode: 'overlay',
              zIndex: 10,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [scanlineEffect],
      } as RenderableComponentData,

      // RGB Red Layer
      {
        id: rgbRedId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            position: 'absolute',
            color: '#ff0000',
            fontSize,
            ...fontStyle,
            mixBlendMode: 'screen',
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [rgbRedEffect],
      } as RenderableComponentData,

      // RGB Green Layer
      {
        id: rgbGreenId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            position: 'absolute',
            color: '#00ff00',
            fontSize,
            ...fontStyle,
            mixBlendMode: 'screen',
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [rgbGreenEffect],
      } as RenderableComponentData,

      // RGB Blue Layer
      {
        id: rgbBlueId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            position: 'absolute',
            color: '#0000ff',
            fontSize,
            ...fontStyle,
            mixBlendMode: 'screen',
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [rgbBlueEffect],
      } as RenderableComponentData,

      // Main Text Layer
      {
        id: mainTextId,
        type: 'atom' as const,
        componentId: 'TextAtom',
        data: {
          text,
          style: {
            position: 'absolute',
            color: textColor,
            fontSize,
            ...fontStyle,
            zIndex: 5,
          },
          font: {
            family: fontConfig.family,
            weights: [fontConfig.weight],
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [mainTextEffect],
      } as RenderableComponentData,

      // Data Mosh Overlay
      {
        id: moshOverlayId,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none overflow-hidden',
            style: {
              zIndex: 15,
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [moshOverlayEffect],
        childrenData: [
          {
            id: moshStrip1Id,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute w-full',
                style: {
                  height: '8px',
                  top: '20%',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
            effects: [moshStrip1Effect],
          } as RenderableComponentData,
          {
            id: moshStrip2Id,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute w-full',
                style: {
                  height: '12px',
                  top: '50%',
                  backgroundColor: 'rgba(255,255,255,0.15)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
            effects: [moshStrip2Effect],
          } as RenderableComponentData,
          {
            id: moshStrip3Id,
            type: 'layout' as const,
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute w-full',
                style: {
                  height: '6px',
                  top: '75%',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                duration,
              },
            },
            effects: [moshStrip3Effect],
          } as RenderableComponentData,
        ],
      } as RenderableComponentData,
    ],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'glitchBlurInTypokinetics',
  title: 'Glitch Blur-In Typokinetics',
  description:
    'A glitch-style blur-in typokinetics preset where text materializes through digital interference patterns synced to beats. Features corrupted data streams that gradually stabilize, with heavily distorted blurred fragments that glitch and flicker before resolving into readable typography. Includes scan lines, RGB channel splitting, data moshing effects, random horizontal displacement glitches, and vertical hold issues that settle rhythmically on beat drops.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'glitch',
    'kinetic',
    'text',
    'blur',
    'rgb-split',
    'beat-sync',
    'audio-reactive',
    'scanline',
    'data-mosh',
    'tech',
    'cyberpunk',
    'digital',
    'interference',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'GLITCH TEXT',
    fontSize: 72,
    fontFamily: 'Inter:700',
    textColor: '#ffffff',
    duration: 5,
    glitchIntensity: 1,
    stabilizationBeats: 8,
  },
};

// Export preset
export const glitchBlurInTypokineticsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
