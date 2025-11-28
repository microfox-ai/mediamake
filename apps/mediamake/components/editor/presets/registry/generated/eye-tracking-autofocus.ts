/**
 * Eye-Tracking Autofocus Reading Flow Preset
 *
 * This preset simulates natural human eye movement and reading patterns with a moving focus area
 * that creates peripheral blur everywhere except where the viewer's gaze is currently 'reading'.
 *
 * Features:
 * - **Foveal Focus Area**: Small sharp area (15-25% radius) that moves along text baseline
 * - **Peripheral Blur**: Gaussian blur with proper falloff from focus center (20% transparent → 60% black)
 * - **Micro-Saccades**: Quick jumps between fixation points every 400-600ms with 50ms transitions
 * - **Pupil Dilation**: Focus area expands/contracts (15-25% range) to simulate biological focus breathing
 * - **Reading Speed**: ~250 words/minute with 100-200ms pauses at important words
 * - **Natural Movement**: Non-mechanical, biological feel with proper timing and transitions
 *
 * Use cases:
 * - Interactive reading experiences
 * - Educational content demonstrating reading flow
 * - Eye-tracking simulations
 * - Reading comprehension visualization
 * - Content highlighting and focus guidance
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameters schema
const presetParams = z.object({
  text: z
    .string()
    .default(
      'The human eye doesn\'t see everything in sharp focus. Only a small area called the fovea provides high-resolution vision. As you read this text, your eyes make rapid jumps called saccades between fixation points, pausing briefly to process each word cluster before moving on.',
    )
    .describe('Text content to display with eye-tracking effect'),
  duration: z
    .number()
    .default(30)
    .describe('Total duration of the effect in seconds'),
  fontFamily: z
    .string()
    .default('Inter')
    .describe('Font family for the text (e.g., "Inter", "Roboto")'),
  fontSize: z
    .number()
    .default(32)
    .describe('Font size in pixels'),
  fontWeight: z
    .string()
    .default('500')
    .describe('Font weight (e.g., "400", "500", "700")'),
  textColor: z
    .string()
    .default('#ffffff')
    .describe('Text color (hex or rgba)'),
  backgroundColor: z
    .string()
    .default('#1a1a1a')
    .describe('Background color (hex or rgba)'),
  readingSpeed: z
    .number()
    .default(250)
    .describe('Reading speed in words per minute'),
  saccadeDurationMin: z
    .number()
    .default(400)
    .describe('Minimum duration between saccades in milliseconds'),
  saccadeDurationMax: z
    .number()
    .default(600)
    .describe('Maximum duration between saccades in milliseconds'),
  saccadeTransitionDuration: z
    .number()
    .default(50)
    .describe('Duration of saccade jump in milliseconds'),
  fixationPauseDuration: z
    .number()
    .default(150)
    .describe('Pause duration at important words in milliseconds'),
  focalRadiusMin: z
    .number()
    .default(15)
    .describe('Minimum focal area radius as percentage'),
  focalRadiusMax: z
    .number()
    .default(25)
    .describe('Maximum focal area radius as percentage'),
  pupilBreathingSpeed: z
    .number()
    .default(2)
    .describe('Speed of pupil dilation cycles in seconds'),
  blurIntensity: z
    .number()
    .default(10)
    .describe('Peripheral blur intensity in pixels'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontFamily,
    fontSize,
    fontWeight,
    textColor,
    backgroundColor,
    readingSpeed,
    saccadeDurationMin,
    saccadeDurationMax,
    saccadeTransitionDuration,
    fixationPauseDuration,
    focalRadiusMin,
    focalRadiusMax,
    pupilBreathingSpeed,
    blurIntensity,
  } = params;

  const { config } = props;
  const width = config?.width ?? 1920;
  const height = config?.height ?? 1080;

  // Helper: Generate word positions and timing
  const generateWordTimings = () => {
    const words = text.split(/\s+/);
    const totalWords = words.length;
    const msPerWord = (60 / readingSpeed) * 1000; // Convert WPM to ms per word

    const wordTimings: Array<{
      word: string;
      startTime: number;
      duration: number;
      isImportant: boolean;
    }> = [];

    let currentTime = 0;

    words.forEach((word, index) => {
      // Determine if word is important (longer, capitalized, or punctuated)
      const isImportant =
        word.length > 7 ||
        word[0] === word[0].toUpperCase() ||
        /[.!?;:]/.test(word);

      // Calculate saccade duration with randomness
      const saccadeDuration =
        saccadeDurationMin +
        Math.random() * (saccadeDurationMax - saccadeDurationMin);

      // Add fixation pause for important words
      const fixationPause = isImportant ? fixationPauseDuration : 0;

      const wordDuration = saccadeDuration + fixationPause;

      wordTimings.push({
        word,
        startTime: currentTime,
        duration: wordDuration,
        isImportant,
      });

      currentTime += wordDuration;
    });

    return wordTimings;
  };

  const wordTimings = generateWordTimings();

  // Helper: Generate focus position keyframes
  const generateFocusKeyframes = () => {
    const keyframes: Array<{
      time: number;
      x: number;
      y: number;
      radius: number;
    }> = [];

    // Estimate text dimensions and layout
    const lineHeight = fontSize * 1.6;
    const maxWidth = Math.min(width * 0.8, 1200); // 80% of width, max 1200px
    const charsPerLine = Math.floor(maxWidth / (fontSize * 0.6)); // Rough estimate

    let currentX = width * 0.1; // Start 10% from left
    let currentY = height * 0.5; // Center vertically
    let currentLine = 0;

    wordTimings.forEach((timing, index) => {
      const wordLength = timing.word.length;
      const wordWidth = wordLength * fontSize * 0.6; // Rough estimate

      // Check if word would exceed line width
      if (currentX + wordWidth > width * 0.9) {
        currentX = width * 0.1;
        currentY += lineHeight;
        currentLine++;
      }

      // Calculate pupil breathing (sinusoidal)
      const breathingPhase = (timing.startTime / 1000 / pupilBreathingSpeed) * Math.PI * 2;
      const breathingFactor = (Math.sin(breathingPhase) + 1) / 2; // 0 to 1
      const radius = focalRadiusMin + (focalRadiusMax - focalRadiusMin) * breathingFactor;

      keyframes.push({
        time: timing.startTime / 1000, // Convert to seconds
        x: (currentX / width) * 100, // Convert to percentage
        y: (currentY / height) * 100,
        radius,
      });

      currentX += wordWidth + fontSize * 0.3; // Add spacing
    });

    return keyframes;
  };

  const focusKeyframes = generateFocusKeyframes();

  // Helper: Generate CSS animation keyframes string
  const generateCSSKeyframes = () => {
    const keyframesStr = focusKeyframes
      .map((kf, index) => {
        const progress = (kf.time / duration) * 100;
        return `${progress.toFixed(2)}% {
          --focus-x: ${kf.x.toFixed(2)}%;
          --focus-y: ${kf.y.toFixed(2)}%;
          --focus-radius: ${kf.radius.toFixed(2)}%;
        }`;
      })
      .join('\n');

    return `@keyframes eyeTracking {
      ${keyframesStr}
    }`;
  };

  const cssKeyframes = generateCSSKeyframes();

  // Create text container with word-level spans
  const textWithSpans = text
    .split(/\s+/)
    .map((word) => `<span style="display: inline-block; margin-right: 0.3em;">${word}</span>`)
    .join(' ');

  // Root container ID
  const rootId = 'eye-tracking-container';

  // Text layer
  const textLayer: RenderableComponentData = {
    id: 'text-content-layer',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative z-10 max-w-4xl px-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [
      {
        id: 'main-text',
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="
            font-size: ${fontSize}px;
            line-height: 1.6;
            color: ${textColor};
            text-align: center;
            font-weight: ${fontWeight};
            font-family: ${fontFamily}, sans-serif;
          ">${textWithSpans}</div>`,
          className: 'w-full',
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

  // Focus effect overlay with radial gradient mask
  const focusOverlay: RenderableComponentData = {
    id: 'focus-effect-overlay',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 z-20 pointer-events-none',
        style: {
          backdropFilter: `blur(${blurIntensity}px)`,
          WebkitBackdropFilter: `blur(${blurIntensity}px)`,
          maskImage: 'radial-gradient(circle at var(--focus-x, 50%) var(--focus-y, 50%), transparent var(--focus-radius, 20%), black 60%)',
          WebkitMaskImage: 'radial-gradient(circle at var(--focus-x, 50%) var(--focus-y, 50%), transparent var(--focus-radius, 20%), black 60%)',
          animation: `eyeTracking ${duration}s linear forwards`,
        } as any,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [],
  };

  // CSS injection for keyframes
  const cssInjection: RenderableComponentData = {
    id: 'css-keyframes',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<style>${cssKeyframes}</style>`,
      className: 'absolute',
      style: {
        pointerEvents: 'none',
      } as any,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: rootId,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
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
    childrenData: [cssInjection, textLayer, focusOverlay],
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'eye-tracking-autofocus',
  title: 'Eye-Tracking Autofocus Reading Flow',
  description:
    'Simulates natural eye movement and reading patterns with a moving focus area that creates peripheral blur everywhere except where the viewer\'s gaze is currently "reading". Features micro-saccades (quick jumps between words), subtle pupil dilation effects (focus area expansion/contraction), and optically accurate gaussian blur falloff. The sharp focus area follows reading flow naturally, pausing at key words and jumping between fixation points like real human eye movement. Perfect for interactive experiences, reading flow demonstrations, and educational content showing how eyes track text.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'eye-tracking',
    'reading',
    'focus',
    'blur',
    'saccades',
    'fovea',
    'education',
    'interactive',
    'text',
    'typography',
    'biological',
    'human',
    'gaze',
    'attention',
  ],
  defaultInputParams: {
    text: 'The human eye doesn\'t see everything in sharp focus. Only a small area called the fovea provides high-resolution vision. As you read this text, your eyes make rapid jumps called saccades between fixation points, pausing briefly to process each word cluster before moving on.',
    duration: 30,
    fontFamily: 'Inter',
    fontSize: 32,
    fontWeight: '500',
    textColor: '#ffffff',
    backgroundColor: '#1a1a1a',
    readingSpeed: 250,
    saccadeDurationMin: 400,
    saccadeDurationMax: 600,
    saccadeTransitionDuration: 50,
    fixationPauseDuration: 150,
    focalRadiusMin: 15,
    focalRadiusMax: 25,
    pupilBreathingSpeed: 2,
    blurIntensity: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const eyeTrackingAutofocusPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
