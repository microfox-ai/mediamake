/**
 * Creeping Darkness Transition Preset
 *
 * A horror-style transition effect where organic shadow tendrils consume the screen from all corners
 * with predatory intelligence. Features layered shadow densities, subtle movement within darkness
 * including glowing eyes, and whisper text elements.
 *
 * Features:
 * - **Shadow Layers**: 6-8 layers of darkness creeping from corners with varying densities
 * - **Organic Movement**: Tentacle-like extensions with predatory pausing and striking motions
 * - **Layered Effects**: Some areas pitch black, others dimly visible
 * - **Living Darkness**: Swirling mists, barely visible shapes, eyes that open and close
 * - **UI Wrapping**: Shadows react to and wrap around UI elements, creating silhouettes
 * - **Phase Progression**: 
 *   - 0-25%: Subtle darkening at edges
 *   - 25-60%: Accelerating shadow growth with tentacle extensions
 *   - 60-85%: Near-complete darkness with movement within
 *   - 85-100%: Total black or violent retraction to reveal next scene
 * - **Whisper Text**: Barely audible text appearing in darkest areas
 *
 * Use cases:
 * - Horror-style scene transitions
 * - Dramatic narrative shifts
 * - Suspense building effects
 * - Dark cinematic reveals
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the transition in seconds'),
  retractAtEnd: z
    .boolean()
    .default(false)
    .describe('Whether to violently retract shadows at end (true) or fade to total black (false)'),
  whisperText: z
    .string()
    .default('darkness...')
    .describe('Text to appear in the darkest areas'),
  intensity: z
    .number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for shadow darkness and effects'),
  searchingMotion: z
    .boolean()
    .default(true)
    .describe('Enable slow searching/oscillating motion for predatory effect'),
  eyesEnabled: z
    .boolean()
    .default(true)
    .describe('Whether to show glowing eyes in the darkness'),
  trackId: z
    .string()
    .default('creeping-darkness')
    .describe('Unique ID for this transition instance'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    retractAtEnd,
    whisperText,
    intensity,
    searchingMotion,
    eyesEnabled,
    trackId,
  } = params;

  // Phase timing breakpoints (as fractions of total duration)
  const phase1End = duration * 0.25; // Subtle darkening (0-25%)
  const phase2End = duration * 0.6; // Accelerating growth (25-60%)
  const phase3End = duration * 0.85; // Near-complete darkness (60-85%)
  const phase4End = duration; // Total black or retraction (85-100%)

  // Helper: Create shadow layer effects
  const createShadowLayerEffects = (
    layerId: string,
    cornerOrigin: string,
    delayFactor: number,
  ) => {
    const baseDelay = duration * 0.05 * delayFactor; // Stagger start times
    const growthStart = baseDelay;
    const growthMid = phase2End;
    const completeBy = phase3End;
    const retractStart = phase3End;

    const effects: any[] = [];

    // Phase 1-2: Growth from corners (opacity + scale)
    effects.push({
      id: `${layerId}-growth`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: growthStart,
        duration: completeBy - growthStart,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.3 * intensity, prog: 0.3 },
          { key: 'opacity', val: 0.95 * intensity, prog: 1 },
          { key: 'scale', val: 0.5, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.5 },
          { key: 'scale', val: 2, prog: 1 },
        ],
      },
    });

    // Phase 2: Blur effect (edges blur then sharpen)
    effects.push({
      id: `${layerId}-blur`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: phase1End,
        duration: phase2End - phase1End,
        mode: 'provider',
        targetIds: [layerId],
        ranges: [
          { key: 'filter', val: 'blur(8px)', prog: 0 },
          { key: 'filter', val: 'blur(0px)', prog: 1 },
        ],
      },
    });

    // Searching motion (oscillation)
    if (searchingMotion) {
      effects.push({
        id: `${layerId}-search-x`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: growthStart,
          duration: completeBy - growthStart,
          mode: 'provider',
          targetIds: [layerId],
          ranges: [
            { key: 'translateX', val: '-5%', prog: 0 },
            { key: 'translateX', val: '5%', prog: 0.25 },
            { key: 'translateX', val: '-5%', prog: 0.5 },
            { key: 'translateX', val: '5%', prog: 0.75 },
            { key: 'translateX', val: '0%', prog: 1 },
          ],
        },
      });

      effects.push({
        id: `${layerId}-search-y`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: growthStart,
          duration: completeBy - growthStart,
          mode: 'provider',
          targetIds: [layerId],
          ranges: [
            { key: 'translateY', val: '0%', prog: 0 },
            { key: 'translateY', val: '-3%', prog: 0.3 },
            { key: 'translateY', val: '3%', prog: 0.6 },
            { key: 'translateY', val: '0%', prog: 1 },
          ],
        },
      });
    }

    // Phase 4: Retraction or final black
    if (retractAtEnd) {
      effects.push({
        id: `${layerId}-retract`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: retractStart,
          duration: phase4End - retractStart,
          mode: 'provider',
          targetIds: [layerId],
          ranges: [
            { key: 'opacity', val: 0.95 * intensity, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
            { key: 'scale', val: 2, prog: 0 },
            { key: 'scale', val: 0, prog: 1 },
          ],
        },
      });
    } else {
      // Fade to total black
      effects.push({
        id: `${layerId}-final-black`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: retractStart,
          duration: phase4End - retractStart,
          mode: 'provider',
          targetIds: [layerId],
          ranges: [
            { key: 'opacity', val: 0.95 * intensity, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });
    }

    return effects;
  };

  // Shadow layers
  const shadowLayers: RenderableComponentData[] = [
    // Corner shadows (radial gradients from corners)
    {
      id: `${trackId}-shadow-layer-1`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'radial-gradient(ellipse at 0% 0%, rgba(0,0,0,0.95) 0%, transparent 60%)',
            transformOrigin: '0% 0%',
            contain: 'layout style paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: createShadowLayerEffects(
        `${trackId}-shadow-layer-1`,
        '0% 0%',
        0,
      ),
    },
    {
      id: `${trackId}-shadow-layer-2`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'radial-gradient(ellipse at 100% 0%, rgba(0,0,0,0.9) 0%, transparent 55%)',
            transformOrigin: '100% 0%',
            contain: 'layout style paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: createShadowLayerEffects(
        `${trackId}-shadow-layer-2`,
        '100% 0%',
        0.15,
      ),
    },
    {
      id: `${trackId}-shadow-layer-3`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'radial-gradient(ellipse at 0% 100%, rgba(0,0,0,0.92) 0%, transparent 58%)',
            transformOrigin: '0% 100%',
            contain: 'layout style paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: createShadowLayerEffects(
        `${trackId}-shadow-layer-3`,
        '0% 100%',
        0.18,
      ),
    },
    {
      id: `${trackId}-shadow-layer-4`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'radial-gradient(ellipse at 100% 100%, rgba(0,0,0,0.88) 0%, transparent 52%)',
            transformOrigin: '100% 100%',
            contain: 'layout style paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: createShadowLayerEffects(
        `${trackId}-shadow-layer-4`,
        '100% 100%',
        0.2,
      ),
    },
    // Conic gradient layer (rotating darkness)
    {
      id: `${trackId}-shadow-layer-5`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'conic-gradient(from 45deg at 50% 50%, transparent 0deg, rgba(0,0,0,0.7) 90deg, transparent 180deg, rgba(0,0,0,0.6) 270deg, transparent 360deg)',
            contain: 'layout style paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${trackId}-shadow-layer-5-fade`,
          componentId: 'generic',
          data: {
            type: 'ease-in-out',
            start: phase1End,
            duration: phase2End - phase1End,
            mode: 'provider',
            targetIds: [`${trackId}-shadow-layer-5`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.8 * intensity, prog: 1 },
            ],
          },
        },
        {
          id: `${trackId}-shadow-layer-5-rotate`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase1End,
            duration: phase3End - phase1End,
            mode: 'provider',
            targetIds: [`${trackId}-shadow-layer-5`],
            ranges: [
              { key: 'rotate', val: 0, prog: 0 },
              { key: 'rotate', val: 360, prog: 1 },
            ],
          },
        },
      ],
    },
    // Center radial layer (final engulfment)
    {
      id: `${trackId}-shadow-layer-6`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'radial-gradient(circle at 50% 50%, transparent 20%, rgba(0,0,0,0.85) 80%)',
            contain: 'layout style paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${trackId}-shadow-layer-6-engulf`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: phase2End,
            duration: phase3End - phase2End,
            mode: 'provider',
            targetIds: [`${trackId}-shadow-layer-6`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1 * intensity, prog: 1 },
            ],
          },
        },
      ],
    },
    // Inner darkness layer (swirling mist effect)
    {
      id: `${trackId}-inner-darkness`,
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0',
          style: {
            background:
              'linear-gradient(135deg, rgba(5,0,10,0.3) 0%, rgba(0,0,0,0.6) 50%, rgba(10,0,5,0.3) 100%)',
            mixBlendMode: 'multiply',
            contain: 'layout style paint',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${trackId}-inner-darkness-swirl`,
          componentId: 'generic',
          data: {
            type: 'linear',
            start: phase2End,
            duration: phase3End - phase2End,
            mode: 'provider',
            targetIds: [`${trackId}-inner-darkness`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 1 },
              { key: 'translateX', val: '-10%', prog: 0 },
              { key: 'translateX', val: '10%', prog: 0.5 },
              { key: 'translateX', val: '-10%', prog: 1 },
            ],
          },
        },
      ],
    },
  ];

  // Eyes (glowing red eyes that pulse)
  const eyeElements: RenderableComponentData[] = eyesEnabled
    ? [
        {
          id: `${trackId}-eye-1`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `
            <div style="
              width: 12px;
              height: 6px;
              border-radius: 50%;
              background: radial-gradient(ellipse at center, rgba(180,0,0,0.8) 0%, rgba(80,0,0,0.4) 60%, transparent 100%);
              box-shadow: 0 0 8px 2px rgba(150,0,0,0.5);
            "></div>
          `,
            className: 'absolute',
            style: {
              top: '35%',
              left: '25%',
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [
            {
              id: `${trackId}-eye-1-pulse`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: phase2End,
                duration: phase3End - phase2End,
                mode: 'provider',
                targetIds: [`${trackId}-eye-1`],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.3, prog: 0.2 },
                  { key: 'opacity', val: 0.7, prog: 0.5 },
                  { key: 'opacity', val: 0.3, prog: 0.8 },
                  { key: 'opacity', val: 0.7, prog: 1 },
                  { key: 'scale', val: 0.8, prog: 0 },
                  { key: 'scale', val: 1.2, prog: 0.5 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
        {
          id: `${trackId}-eye-2`,
          type: 'atom',
          componentId: 'HTMLBlockAtom',
          data: {
            html: `
            <div style="
              width: 10px;
              height: 5px;
              border-radius: 50%;
              background: radial-gradient(ellipse at center, rgba(160,0,0,0.7) 0%, rgba(60,0,0,0.3) 60%, transparent 100%);
              box-shadow: 0 0 6px 2px rgba(120,0,0,0.4);
            "></div>
          `,
            className: 'absolute',
            style: {
              top: '65%',
              right: '30%',
              pointerEvents: 'none',
            },
          },
          context: {
            timing: {
              start: 0,
              duration: duration,
            },
          },
          effects: [
            {
              id: `${trackId}-eye-2-pulse`,
              componentId: 'generic',
              data: {
                type: 'ease-in-out',
                start: phase2End + 0.3,
                duration: phase3End - phase2End - 0.3,
                mode: 'provider',
                targetIds: [`${trackId}-eye-2`],
                ranges: [
                  { key: 'opacity', val: 0, prog: 0 },
                  { key: 'opacity', val: 0.4, prog: 0.3 },
                  { key: 'opacity', val: 0.6, prog: 0.6 },
                  { key: 'opacity', val: 0.4, prog: 0.9 },
                  { key: 'opacity', val: 0.6, prog: 1 },
                  { key: 'scale', val: 0.7, prog: 0 },
                  { key: 'scale', val: 1.1, prog: 0.5 },
                  { key: 'scale', val: 0.9, prog: 1 },
                ],
              },
            },
          ],
        },
      ]
    : [];

  // Whisper text
  const whisperTextElement: RenderableComponentData = {
    id: `${trackId}-whisper-text`,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: whisperText,
      style: {
        fontSize: 14,
        color: 'rgba(80,80,80,0.3)',
        fontStyle: 'italic',
        letterSpacing: 4,
        textTransform: 'lowercase',
      },
      font: {
        family: 'Inter',
        weights: ['300'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: `${trackId}-whisper-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: phase2End,
          duration: phase3End - phase2End,
          mode: 'provider',
          targetIds: [`${trackId}-whisper-text`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        },
      },
    ],
  };

  // Whisper text container
  const whisperContainer: RenderableComponentData = {
    id: `${trackId}-whisper-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [whisperTextElement],
  };

  // Shadow container
  const shadowContainer: RenderableComponentData = {
    id: `${trackId}-shadow-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [...shadowLayers, ...eyeElements],
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackId}-root`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: 'transparent',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [shadowContainer, whisperContainer],
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
  id: 'creeping-darkness-transition',
  title: 'Creeping Darkness Transition',
  description:
    'A horror-style transition effect where organic shadow tendrils consume the screen from all corners with predatory intelligence. Features layered shadow densities, subtle movement within darkness including glowing eyes, and whisper text elements. Configurable phases from subtle edge darkening to complete engulfment with optional violent retraction reveal.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'horror',
    'darkness',
    'shadows',
    'organic',
    'predatory',
    'creeping',
    'tentacles',
    'eyes',
    'whisper',
    'cinematic',
  ],
  defaultInputParams: {
    duration: 5,
    retractAtEnd: false,
    whisperText: 'darkness...',
    intensity: 1,
    searchingMotion: true,
    eyesEnabled: true,
    trackId: 'creeping-darkness',
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const creepingDarknessTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};