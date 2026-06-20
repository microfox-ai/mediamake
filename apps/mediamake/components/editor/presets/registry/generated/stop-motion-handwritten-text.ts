/**
 * Stop-Motion Handwritten Text Animation Preset
 *
 * This preset creates a stop-motion style animation that mimics handwritten text being drawn
 * frame-by-frame with intentional imperfections. Features charming inconsistencies like
 * shifting letters, varying line weights, registration errors, paper texture variations,
 * and organic pencil-on-paper roughness.
 *
 * Features:
 * - Stop-motion simulation with 12fps feel (83ms per frame)
 * - Frame-by-frame text reveal with stepped animations
 * - Position jitter every 120ms for hand-drawn inconsistencies
 * - Random registration errors (translateX/Y ±5px jumps)
 * - Paper texture overlays with opacity variations
 * - Random smudge elements that appear and disappear
 * - Line weight variation simulation
 * - Opacity flicker for film grain effect
 * - Sketchy handwritten font styles (Architects Daughter, Coming Soon)
 *
 * Use cases:
 * - Creating authentic stop-motion text animations
 * - Building flipbook-style text reveals
 * - Adding organic, handmade aesthetic to titles
 * - Simulating pencil-on-paper text animations
 * - Creating imperfect, charming text overlays
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  text: z
    .string()
    .default('Your handwritten text here')
    .describe('Text content to display with stop-motion effect'),
  font: z
    .enum(['Architects Daughter', 'Coming Soon'])
    .default('Architects Daughter')
    .describe('Handwritten font choice for sketchy appearance'),
  fontSize: z
    .number()
    .min(24)
    .max(120)
    .default(48)
    .describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#2c2c2c')
    .describe('Text color (dark for pencil effect)'),
  duration: z
    .number()
    .min(2)
    .max(10)
    .default(4)
    .describe('Total animation duration in seconds'),
  revealFrames: z
    .number()
    .min(4)
    .max(12)
    .default(8)
    .describe('Number of discrete reveal steps (flipbook frames)'),
  jitterIntensity: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for position jitter'),
  registrationErrorCount: z
    .number()
    .min(0)
    .max(5)
    .default(2)
    .describe('Number of registration error jumps during animation'),
  paperTextureIntensity: z
    .number()
    .min(0.2)
    .max(0.6)
    .default(0.35)
    .describe('Paper texture overlay opacity intensity'),
  showSmudges: z
    .boolean()
    .default(true)
    .describe('Whether to show random smudge elements'),
  smudgeCount: z
    .number()
    .min(0)
    .max(5)
    .default(3)
    .describe('Number of random smudge elements'),
  backgroundColor: z
    .string()
    .default('#fef6e4')
    .describe('Background color (paper-like tone)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    font,
    fontSize,
    textColor,
    duration,
    revealFrames,
    jitterIntensity,
    registrationErrorCount,
    paperTextureIntensity,
    showSmudges,
    smudgeCount,
    backgroundColor,
  } = params;

  // Helper: Generate random jitter positions
  const generateJitterPositions = (frameCount: number, intensity: number) => {
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < frameCount; i++) {
      positions.push({
        x: (Math.random() - 0.5) * 4 * intensity,
        y: (Math.random() - 0.5) * 4 * intensity,
      });
    }
    return positions;
  };

  // Helper: Generate registration error frames
  const generateRegistrationErrors = (count: number, totalDuration: number) => {
    const errors: Array<{ time: number; x: number; y: number }> = [];
    for (let i = 0; i < count; i++) {
      errors.push({
        time: Math.random() * totalDuration,
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
      });
    }
    return errors.sort((a, b) => a.time - b.time);
  };

  // Generate jitter frames (every 120ms = ~8fps for jitter)
  const jitterFrameCount = Math.ceil((duration * 1000) / 120);
  const jitterPositions = generateJitterPositions(
    jitterFrameCount,
    jitterIntensity,
  );

  // Generate registration errors
  const registrationErrors = generateRegistrationErrors(
    registrationErrorCount,
    duration,
  );

  // Build jitter + registration error animation ranges
  const jitterRanges: Array<{
    key: string;
    val: number;
    prog: number;
  }> = [];
  for (let i = 0; i < jitterFrameCount; i++) {
    const prog = i / (jitterFrameCount - 1);
    jitterRanges.push(
      { key: 'translateX', val: jitterPositions[i].x, prog },
      { key: 'translateY', val: jitterPositions[i].y, prog },
    );
  }

  // Add registration errors as instant jumps
  registrationErrors.forEach((error) => {
    const prog = error.time / duration;
    jitterRanges.push(
      { key: 'translateX', val: error.x, prog },
      { key: 'translateY', val: error.y, prog },
    );
  });

  // Sort ranges by progress
  jitterRanges.sort((a, b) => a.prog - b.prog);

  // Build opacity flicker ranges (film grain effect)
  const flickerFrames = 12;
  const flickerRanges: Array<{
    key: string;
    val: number;
    prog: number;
  }> = [];
  for (let i = 0; i < flickerFrames; i++) {
    const prog = i / (flickerFrames - 1);
    const opacity = 0.85 + Math.random() * 0.15; // 0.85 to 1.0
    flickerRanges.push({ key: 'opacity', val: opacity, prog });
  }

  // Build stepped reveal animation (clip-path)
  const revealRanges: Array<{
    key: string;
    val: string;
    prog: number;
  }> = [];
  for (let i = 0; i <= revealFrames; i++) {
    const prog = i / revealFrames;
    const clipPercent = 100 - (i / revealFrames) * 100;
    revealRanges.push({
      key: 'clipPath',
      val: `inset(0 ${clipPercent}% 0 0)`,
      prog,
    });
  }

  // Paper texture flicker ranges
  const textureFlickerFrames = 8;
  const textureRanges: Array<{
    key: string;
    val: number;
    prog: number;
  }> = [];
  for (let i = 0; i < textureFlickerFrames; i++) {
    const prog = i / (textureFlickerFrames - 1);
    const opacity =
      paperTextureIntensity + (Math.random() - 0.5) * 0.1;
    textureRanges.push({ key: 'opacity', val: opacity, prog });
  }

  // Generate smudge elements
  const smudges: RenderableComponentData[] = [];
  if (showSmudges) {
    for (let i = 0; i < smudgeCount; i++) {
      const smudgeStart = Math.random() * (duration * 0.7);
      const smudgeDuration = 0.8 + Math.random() * 1.2;
      const smudgeSize = 28 + Math.random() * 20;
      const smudgeTop = 30 + Math.random() * 40;
      const smudgeLeft = 20 + Math.random() * 60;

      smudges.push({
        id: `smudge-${i}`,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${smudgeSize}px; height: ${smudgeSize * 0.7}px; background: rgba(50, 50, 50, ${0.1 + Math.random() * 0.08}); border-radius: ${40 + Math.random() * 20}% ${50 + Math.random() * 20}% ${40 + Math.random() * 20}% ${50 + Math.random() * 20}%; filter: blur(${3 + Math.random() * 2}px);"></div>`,
          className: 'absolute pointer-events-none',
        },
        context: {
          timing: {
            start: smudgeStart,
            duration: smudgeDuration,
          },
        },
        effects: [
          {
            id: `smudge-fade-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: 0,
              duration: smudgeDuration,
              mode: 'provider',
              targetIds: [`smudge-${i}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                {
                  key: 'opacity',
                  val: 0.4 + Math.random() * 0.3,
                  prog: 0.3,
                },
                {
                  key: 'opacity',
                  val: 0.3 + Math.random() * 0.2,
                  prog: 0.7,
                },
                { key: 'opacity', val: 0, prog: 1 },
                { key: 'top', val: `${smudgeTop}%`, prog: 0 },
                { key: 'left', val: `${smudgeLeft}%`, prog: 0 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  }

  // Paper texture SVG (noise pattern)
  const paperTextureSVG = `data:image/svg+xml;base64,${btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <filter id="noise">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" />
        <feColorMatrix type="saturate" values="0"/>
      </filter>
      <rect width="200" height="200" filter="url(#noise)" opacity="0.5"/>
    </svg>
  `)}`;

  // Text atom with stop-motion effects
  const textAtomId = 'handwritten-text';
  const textAtom: RenderableComponentData = {
    id: textAtomId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text,
      font: {
        family: font,
        weights: ['400'],
        display: 'swap',
        preload: true,
      },
      style: {
        fontSize: `${fontSize}px`,
        fontWeight: '400',
        color: textColor,
        textAlign: 'center',
        lineHeight: '1.4',
        letterSpacing: '0.02em',
      },
      className: 'select-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      // Stop-motion reveal (stepped clip-path)
      {
        id: 'stop-motion-reveal',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: revealRanges,
        },
      },
      // Position jitter + registration errors
      {
        id: 'position-jitter',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: jitterRanges,
        },
      },
      // Opacity flicker (film grain)
      {
        id: 'opacity-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: [textAtomId],
          ranges: flickerRanges,
        },
      },
    ],
  };

  // Paper texture overlay
  const paperTextureOverlay: RenderableComponentData = {
    id: 'paper-texture-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div class="absolute inset-0 pointer-events-none" style="background-image: url('${paperTextureSVG}'); background-repeat: repeat; mix-blend-mode: multiply;"></div>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: 'texture-flicker',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration,
          mode: 'provider',
          targetIds: ['paper-texture-overlay'],
          ranges: textureRanges,
        },
      },
    ],
  };

  // Text container layout
  const textContainer: RenderableComponentData = {
    id: 'text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative p-6 flex items-center justify-center',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [textAtom],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'stop-motion-root',
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
      paperTextureOverlay,
      textContainer,
      ...smudges,
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
  id: 'stop-motion-handwritten-text',
  title: 'Stop-Motion Handwritten Text Animation',
  description:
    'A stop-motion style animation that mimics handwritten text being drawn frame-by-frame with intentional imperfections. Features charming inconsistencies like shifting letters, varying line weights, registration errors, paper texture variations, and organic pencil-on-paper roughness. Embraces the handmade aesthetic while maintaining readability.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'text',
    'stop-motion',
    'handwritten',
    'animation',
    'flipbook',
    'organic',
    'sketchy',
    'jitter',
    'imperfect',
    'paper-texture',
    'smudges',
    'registration-errors',
  ],
  defaultInputParams: {
    text: 'Your handwritten text here',
    font: 'Architects Daughter',
    fontSize: 48,
    textColor: '#2c2c2c',
    duration: 4,
    revealFrames: 8,
    jitterIntensity: 1,
    registrationErrorCount: 2,
    paperTextureIntensity: 0.35,
    showSmudges: true,
    smudgeCount: 3,
    backgroundColor: '#fef6e4',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const stopMotionHandwrittenTextPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
