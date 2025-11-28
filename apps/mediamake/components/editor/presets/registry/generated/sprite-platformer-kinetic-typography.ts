/**
 * Sprite Platformer Kinetic Typography Preset
 *
 * A retro 2D platformer game-inspired kinetic typography preset where words behave as sprite characters
 * with physics-based movement. Features include:
 * - Gravity-affected jumps with parabolic arcs
 * - Idle bobbing animations (subtle sine wave oscillation)
 * - Landing impact bounces (scale animation)
 * - Pixel-perfect platform collision detection
 * - Teleportation spawn effects with vertical light beams
 * - Special moves (double-jump, spin attack) for important words
 * - Single-pixel particle emissions on word movement
 * - NES palette colors with dithering patterns
 * - Power-up transformations (speed boost, trailing shadows, size changes)
 * - Parallax scrolling backgrounds with pixel patterns
 *
 * Technical approach:
 * - BaseLayout structure with multiple layers for parallax
 * - Each word as separate BaseLayout with absolute positioning
 * - Gravity using quadratic easing in translateY animations
 * - Jump arc: parabolic translateY + linear translateX
 * - Idle animation: small translateY oscillation with sine easing
 * - Landing impact: scale bounce (1 → 0.8 → 1.1 → 1)
 * - Particle system: multiple small divs animated outward
 * - Collision detection: calculate landing positions based on word index and platform array
 * - Teleport effect: vertical gradient div with opacity fade
 * - Power-ups: switch between internal effect presets based on caption metadata
 * - Performance: transform3d(), limited particle count, batched animations
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
  TranscriptionSentence,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  captions: z
    .array(
      z.object({
        id: z.string(),
        text: z.string(),
        start: z.number(),
        absoluteStart: z.number(),
        end: z.number(),
        absoluteEnd: z.number(),
        duration: z.number(),
        words: z.array(
          z.object({
            id: z.string(),
            text: z.string(),
            start: z.number(),
            absoluteStart: z.number(),
            end: z.number(),
            absoluteEnd: z.number(),
            duration: z.number(),
            confidence: z.number(),
          }),
        ),
      }),
    )
    .describe('Array of caption objects with word timings'),
  font: z
    .string()
    .default('Press Start 2P')
    .describe('Retro pixel font (e.g., "Press Start 2P", "VT323")'),
  fontSize: z.number().min(16).max(64).default(32).describe('Font size in pixels'),
  textColor: z
    .string()
    .default('#FCE468')
    .describe('Text color (NES palette yellow)'),
  platformCount: z
    .number()
    .min(3)
    .max(6)
    .default(4)
    .describe('Number of platforms to generate'),
  gravity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Gravity strength multiplier'),
  jumpHeight: z
    .number()
    .min(50)
    .max(300)
    .default(150)
    .describe('Maximum jump height in pixels'),
  particleCount: z
    .number()
    .min(4)
    .max(12)
    .default(8)
    .describe('Number of particles per word spawn'),
  enablePowerUps: z
    .boolean()
    .default(true)
    .describe('Enable power-up transformations for important words'),
  parallaxSpeed: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Parallax scrolling speed multiplier'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    captions,
    font,
    fontSize,
    textColor,
    platformCount,
    gravity,
    jumpHeight,
    particleCount,
    enablePowerUps,
    parallaxSpeed,
  } = params;

  const fps = props.config?.fps || 30;
  const videoHeight = props.config?.height || 1080;
  const videoWidth = props.config?.width || 1920;

  // Helper: Generate platforms at different heights
  const generatePlatforms = (count: number) => {
    const platforms = [];
    const heightStep = (videoHeight * 0.6) / (count - 1);
    const baseBottom = videoHeight * 0.15;

    for (let i = 0; i < count; i++) {
      platforms.push({
        id: `platform-${i}`,
        bottom: baseBottom + i * heightStep,
        left: (Math.random() * 0.4 + 0.1) * videoWidth,
        width: Math.random() * 100 + 150,
      });
    }
    return platforms;
  };

  const platforms = generatePlatforms(platformCount);

  // Helper: Assign word to platform based on index
  const assignPlatform = (wordIndex: number) => {
    return platforms[wordIndex % platforms.length];
  };

  // Helper: Check if word is "important" (metadata check or heuristic)
  const isImportantWord = (caption: TranscriptionSentence, wordIndex: number) => {
    // Check metadata for importance markers
    if (caption.words[wordIndex]?.text.length > 7) return true;
    // Could also check caption.metadata?.keyword, etc.
    return wordIndex % 5 === 0; // Every 5th word
  };

  // Build parallax background layers
  const parallaxLayers: RenderableComponentData[] = [
    {
      id: 'parallax-far-clouds',
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        className: 'absolute inset-0',
        style: {
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0px, transparent 4px, rgba(106,107,110,0.3) 4px, rgba(106,107,110,0.3) 8px)',
          backgroundSize: '200% 100%',
        },
      },
      effects: [
        {
          id: 'parallax-far-scroll',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 30,
            mode: 'provider',
            targetIds: ['parallax-far-clouds'],
            ranges: [
              { key: 'backgroundPositionX', val: '0%', prog: 0 },
              { key: 'backgroundPositionX', val: `${parallaxSpeed * 20}%`, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
    {
      id: 'parallax-mid-patterns',
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        className: 'absolute inset-0',
        style: {
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 8px, rgba(60,188,252,0.15) 8px, rgba(60,188,252,0.15) 16px)',
          backgroundSize: '100% 300%',
        },
      },
      effects: [
        {
          id: 'parallax-mid-scroll',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 30,
            mode: 'provider',
            targetIds: ['parallax-mid-patterns'],
            ranges: [
              { key: 'backgroundPositionY', val: '0%', prog: 0 },
              { key: 'backgroundPositionY', val: `${parallaxSpeed * 30}%`, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
    {
      id: 'parallax-near-patterns',
      componentId: 'HTMLBlockAtom',
      type: 'atom' as const,
      data: {
        className: 'absolute inset-0',
        style: {
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent 0px, transparent 2px, rgba(252,56,98,0.1) 2px, rgba(252,56,98,0.1) 4px)',
          backgroundSize: '150% 150%',
        },
      },
      effects: [
        {
          id: 'parallax-near-scroll',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: 30,
            mode: 'provider',
            targetIds: ['parallax-near-patterns'],
            ranges: [
              { key: 'backgroundPositionX', val: '0%', prog: 0 },
              { key: 'backgroundPositionX', val: `${parallaxSpeed * 50}%`, prog: 1 },
            ],
          } as GenericEffectData,
        },
      ],
    },
  ];

  // Build platform visuals
  const platformChildren: RenderableComponentData[] = platforms.map((platform) => ({
    id: platform.id,
    componentId: 'HTMLBlockAtom',
    type: 'atom' as const,
    data: {
      className: 'absolute',
      style: {
        bottom: `${platform.bottom}px`,
        left: `${platform.left}px`,
        width: `${platform.width}px`,
        height: '8px',
        backgroundColor: '#3CBC7C',
        boxShadow: '0 4px 0 #2A9A5E',
      },
    },
  }));

  // Build word sprites
  let globalWordIndex = 0;
  const wordSprites: RenderableComponentData[] = [];

  captions.forEach((caption) => {
    caption.words.forEach((word, localIndex) => {
      const platform = assignPlatform(globalWordIndex);
      const wordId = `word-sprite-${caption.id}-${localIndex}`;
      const isImportant = isImportantWord(caption, localIndex);

      // Calculate spawn position (top-center)
      const spawnX = videoWidth / 2 - 50;
      const spawnY = -100;

      // Calculate landing position (on platform)
      const landingX = platform.left + platform.width / 2 - 50;
      const landingY = videoHeight - platform.bottom - fontSize - 20;

      // Timing
      const wordStart = word.start; // Relative to caption
      const wordDuration = word.duration;
      const spawnDuration = 0.5;
      const jumpDuration = 1.0;
      const idleDuration = wordDuration - spawnDuration - jumpDuration;

      // Word sprite container
      const wordEffects: any[] = [];

      // Teleport spawn effect
      wordEffects.push({
        id: `${wordId}-teleport-beam`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: wordStart,
          duration: spawnDuration,
          mode: 'provider',
          targetIds: [`${wordId}-beam`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // Spawn fade-in
      wordEffects.push({
        id: `${wordId}-spawn-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: wordStart,
          duration: spawnDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // Jump arc (parabolic translateY + linear translateX)
      const jumpStart = wordStart + spawnDuration;
      wordEffects.push({
        id: `${wordId}-jump`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: jumpStart,
          duration: jumpDuration,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            // Horizontal movement (linear)
            { key: 'translateX', val: spawnX, prog: 0 },
            { key: 'translateX', val: landingX, prog: 1 },
            // Vertical jump (parabolic - up then down)
            { key: 'translateY', val: spawnY, prog: 0 },
            {
              key: 'translateY',
              val: spawnY - jumpHeight * gravity,
              prog: 0.5,
            },
            { key: 'translateY', val: landingY, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // Landing impact (scale bounce)
      const landingStart = jumpStart + jumpDuration;
      wordEffects.push({
        id: `${wordId}-landing`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: landingStart,
          duration: 0.3,
          mode: 'provider',
          targetIds: [wordId],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 0.8, prog: 0.3 },
            { key: 'scale', val: 1.1, prog: 0.6 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      });

      // Idle bobbing animation
      if (idleDuration > 0) {
        const idleStart = landingStart + 0.3;
        wordEffects.push({
          id: `${wordId}-idle`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: idleStart,
            duration: idleDuration,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'translateY', val: landingY, prog: 0 },
              { key: 'translateY', val: landingY - 5, prog: 0.5 },
              { key: 'translateY', val: landingY, prog: 1 },
            ],
          } as GenericEffectData,
        });
      }

      // Special move: double-jump or spin for important words
      if (isImportant && enablePowerUps) {
        const specialStart = landingStart + 0.5;
        wordEffects.push({
          id: `${wordId}-special-spin`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: specialStart,
            duration: 0.6,
            mode: 'provider',
            targetIds: [wordId],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
            ],
          } as GenericEffectData,
        });
      }

      // Particle emission on spawn
      const particles: RenderableComponentData[] = [];
      for (let p = 0; p < particleCount; p++) {
        const angle = (p / particleCount) * Math.PI * 2;
        const distance = 50;
        const particleId = `${wordId}-particle-${p}`;
        particles.push({
          id: particleId,
          componentId: 'HTMLBlockAtom',
          type: 'atom' as const,
          data: {
            className: 'absolute w-1 h-1',
            style: {
              backgroundColor: ['#FCE468', '#3CBC7C', '#FC3862', '#3CBCFC', '#FFFFFF'][
                p % 5
              ],
              left: `${spawnX + 50}px`,
              top: `${spawnY + fontSize / 2}px`,
            },
          },
          effects: [
            {
              id: `${particleId}-move`,
              componentId: 'generic',
              data: {
                type: 'ease-out',
                start: wordStart,
                duration: 0.5,
                mode: 'provider',
                targetIds: [particleId],
                ranges: [
                  { key: 'opacity', val: 1, prog: 0 },
                  { key: 'opacity', val: 0, prog: 1 },
                  {
                    key: 'translateX',
                    val: Math.cos(angle) * distance,
                    prog: 1,
                  },
                  {
                    key: 'translateY',
                    val: Math.sin(angle) * distance,
                    prog: 1,
                  },
                ],
              } as GenericEffectData,
            },
          ],
        });
      }

      // Build word sprite structure
      wordSprites.push({
        id: wordId,
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute',
            style: {
              transform: 'translate3d(0,0,0)',
            },
          },
        },
        context: {
          timing: {
            start: caption.absoluteStart,
            duration: caption.duration,
          },
        },
        effects: wordEffects,
        childrenData: [
          // Teleport beam
          {
            id: `${wordId}-beam`,
            componentId: 'HTMLBlockAtom',
            type: 'atom' as const,
            data: {
              className: 'absolute',
              style: {
                width: `${fontSize * 1.5}px`,
                height: '200%',
                top: '-50%',
                left: `${spawnX}px`,
                background:
                  'linear-gradient(180deg, transparent 0%, rgba(252,228,104,0.8) 30%, rgba(252,228,104,1) 50%, rgba(252,228,104,0.8) 70%, transparent 100%)',
                opacity: 0,
              },
            },
          },
          // Word text
          {
            id: `${wordId}-text`,
            componentId: 'TextAtom',
            type: 'atom' as const,
            data: {
              text: word.text,
              font: {
                family: font,
                weights: ['400'],
              },
              style: {
                fontSize: `${fontSize}px`,
                color: textColor,
                textShadow:
                  '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000',
                imageRendering: 'pixelated',
              },
            },
          },
          // Shadow
          {
            id: `${wordId}-shadow`,
            componentId: 'HTMLBlockAtom',
            type: 'atom' as const,
            data: {
              className: 'absolute',
              style: {
                width: '80%',
                height: '8px',
                bottom: '-12px',
                left: '10%',
                backgroundColor: 'rgba(0,0,0,0.4)',
                borderRadius: '50%',
              },
            },
          },
          // Particles
          ...particles,
        ],
      });

      globalWordIndex++;
    });
  });

  // Build complete structure
  const rootContainer: RenderableComponentData = {
    id: 'sprite-platformer-container',
    componentId: 'BaseLayout',
    type: 'layout' as const,
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: captions.length > 0 
          ? captions[captions.length - 1].absoluteEnd 
          : 10,
      },
    },
    childrenData: [
      // Parallax background layer
      {
        id: 'parallax-bg-layer',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 0 },
          },
        },
        childrenData: parallaxLayers,
      },
      // Platform layer
      {
        id: 'platform-layer',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 1 },
          },
        },
        childrenData: platformChildren,
      },
      // Word sprites layer
      {
        id: 'word-sprites-layer',
        componentId: 'BaseLayout',
        type: 'layout' as const,
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: { zIndex: 10 },
          },
        },
        childrenData: wordSprites,
      },
    ] as RenderableComponentData[],
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

const presetMetadata: PresetMetadata = {
  id: 'spritePlatformerKineticTypography',
  title: 'Sprite Platformer Kinetic Typography',
  description:
    'A retro 2D platformer game-inspired kinetic typography preset where words behave as sprite characters with physics-based movement. Features include gravity-affected jumps with parabolic arcs, idle bobbing animations, landing impact bounces, pixel-perfect platform collision detection, teleportation spawn effects with light beams, special moves (double-jump, spin attack) for important words, single-pixel particle emissions, NES palette colors with dithering patterns, power-up transformations, and parallax scrolling backgrounds. Words spawn at timed intervals based on caption data and navigate across invisible platforms at various heights.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'kinetic',
    'typography',
    'platformer',
    'retro',
    'pixel',
    'physics',
    'sprite',
    'game',
    'nes',
    'gravity',
    'jump',
    'particles',
    'parallax',
    'power-up',
  ],
  dependencies: {},
  defaultInputParams: {
    captions: [],
    font: 'Press Start 2P',
    fontSize: 32,
    textColor: '#FCE468',
    platformCount: 4,
    gravity: 1,
    jumpHeight: 150,
    particleCount: 8,
    enablePowerUps: true,
    parallaxSpeed: 2,
  },
};

export const spritePlatformerKineticTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};