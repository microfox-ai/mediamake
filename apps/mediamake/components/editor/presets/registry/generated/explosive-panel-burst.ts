/**
 * Explosive Panel Burst Transition Preset
 * 
 * Creates a high-energy reverse explosion effect where scattered panels with random rotation,
 * scale, and position converge to form a complete 4x4 grid image. Panels start at the edges
 * with random transformations and smoothly converge to form the final image.
 * 
 * Features:
 * - 4x4 grid of panels (16 total) that assemble from scattered positions
 * - Three-phase animation: convergence (0-60%), overshoot (60-80%), settle (80-100%)
 * - Random initial rotation (-45 to 45 degrees), scale (0.5 to 1.5), and position (±200%)
 * - Motion blur effect during fast movement phases (8px → 0px)
 * - Shake effect at impact moment (75% progress) when panels lock into place
 * - Random stagger (0-0.3s) for organic feel
 * - Box shadow that fades in as panels settle
 * 
 * Use cases:
 * - High-energy action content transitions
 * - Dynamic video intros/outros
 * - Product reveal animations
 * - Sports/gaming content transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  image: z.object({
    src: z.string().describe('Image source URL to be exploded into panels'),
  }).describe('Image configuration'),
  duration: z.number().default(2).describe('Total duration of the transition in seconds'),
  transitionDuration: z.number().default(2).describe('Duration of the panel burst animation'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const { image, duration, transitionDuration } = params;

  // Helper function: Generate random value in range
  const randomInRange = (min: number, max: number): number => {
    return Math.random() * (max - min) + min;
  };

  // Helper function: Generate random initial transformations for a panel
  const generateRandomTransform = () => {
    return {
      translateX: randomInRange(-200, 200), // ±200% of panel width
      translateY: randomInRange(-200, 200), // ±200% of panel height
      rotate: randomInRange(-45, 45), // -45 to 45 degrees
      scale: randomInRange(0.5, 1.5), // 0.5 to 1.5
      opacity: 0, // Start invisible
    };
  };

  // Create 4x4 grid of panels
  const gridSize = 4;
  const panelCount = gridSize * gridSize; // 16 panels
  const panelWidth = 100 / gridSize; // 25%
  const panelHeight = 100 / gridSize; // 25%

  const panels: RenderableComponentData[] = [];

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const index = row * gridSize + col;
      const panelId = `panel-${index}`;
      
      // Calculate panel position in grid
      const left = col * panelWidth; // 0%, 25%, 50%, 75%
      const top = row * panelHeight; // 0%, 25%, 50%, 75%

      // Generate random initial transformations
      const initialTransform = generateRandomTransform();

      // Random stagger between 0-0.3s
      const staggerDelay = randomInRange(0, 0.3);

      // Calculate animation phase timings (relative to effect start after stagger)
      const phase1End = 0.6; // 60% of animation
      const phase2End = 0.8; // 80% of animation
      const phase3End = 1.0; // 100% of animation

      // Overshoot values (slightly past target)
      const overshootTranslateX = randomInRange(-2, 2);
      const overshootTranslateY = randomInRange(-2, 2);
      const overshootRotate = randomInRange(-2, 2);
      const overshootScale = randomInRange(1.02, 1.05);

      // Panel convergence animation (three phases)
      const convergenceEffect = {
        id: `convergence-${panelId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: staggerDelay,
          duration: transitionDuration - staggerDelay,
          mode: 'provider' as const,
          targetIds: [panelId],
          ranges: [
            // Phase 1: Move toward target position with ease-out (0-60%)
            { key: 'translateX', val: initialTransform.translateX, prog: 0 },
            { key: 'translateX', val: overshootTranslateX, prog: phase1End },
            { key: 'translateY', val: initialTransform.translateY, prog: 0 },
            { key: 'translateY', val: overshootTranslateY, prog: phase1End },
            { key: 'rotate', val: initialTransform.rotate, prog: 0 },
            { key: 'rotate', val: overshootRotate, prog: phase1End },
            { key: 'scale', val: initialTransform.scale, prog: 0 },
            { key: 'scale', val: overshootScale, prog: phase1End },
            { key: 'opacity', val: initialTransform.opacity, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.3 },

            // Phase 2: Overshoot slightly past target (60-80%)
            { key: 'translateX', val: overshootTranslateX, prog: phase1End },
            { key: 'translateX', val: overshootTranslateX * 0.5, prog: phase2End },
            { key: 'translateY', val: overshootTranslateY, prog: phase1End },
            { key: 'translateY', val: overshootTranslateY * 0.5, prog: phase2End },
            { key: 'rotate', val: overshootRotate, prog: phase1End },
            { key: 'rotate', val: 0, prog: phase2End },
            { key: 'scale', val: overshootScale, prog: phase1End },
            { key: 'scale', val: 1, prog: phase2End },

            // Phase 3: Settle into final position with spring easing (80-100%)
            { key: 'translateX', val: overshootTranslateX * 0.5, prog: phase2End },
            { key: 'translateX', val: 0, prog: phase3End },
            { key: 'translateY', val: overshootTranslateY * 0.5, prog: phase2End },
            { key: 'translateY', val: 0, prog: phase3End },
            { key: 'rotate', val: 0, prog: phase2End },
            { key: 'rotate', val: 0, prog: phase3End },
            { key: 'scale', val: 1, prog: phase2End },
            { key: 'scale', val: 1, prog: phase3End },
          ],
        },
      };

      // Blur effect (motion blur during movement)
      const blurEffect = {
        id: `blur-${panelId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: staggerDelay,
          duration: transitionDuration - staggerDelay,
          mode: 'provider' as const,
          targetIds: [panelId],
          ranges: [
            { key: 'filter', val: 'blur(8px)', prog: 0 },
            { key: 'filter', val: 'blur(4px)', prog: 0.3 },
            { key: 'filter', val: 'blur(2px)', prog: 0.6 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      };

      // Box shadow fade-in
      const shadowEffect = {
        id: `shadow-${panelId}`,
        componentId: 'generic',
        data: {
          type: 'ease-in' as const,
          start: staggerDelay + transitionDuration * 0.6,
          duration: transitionDuration * 0.4,
          mode: 'provider' as const,
          targetIds: [panelId],
          ranges: [
            { key: 'boxShadow', val: '0 0 0px rgba(0,0,0,0)', prog: 0 },
            { key: 'boxShadow', val: '0 10px 30px rgba(0,0,0,0.3)', prog: 1 },
          ],
        },
      };

      // Create panel (ImageAtom showing specific grid slice)
      const panel: RenderableComponentData = {
        id: panelId,
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: image.src,
          className: 'w-full h-full',
          style: {
            objectFit: 'cover',
            objectPosition: `${left}% ${top}%`,
            transformOrigin: 'center',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: duration,
          },
        },
        effects: [convergenceEffect, blurEffect, shadowEffect],
      };

      panels.push(panel);
    }
  }

  // Shake effect at impact moment (75% progress = 1.5s)
  const shakeEffect = {
    id: 'shake-effect',
    componentId: 'generic',
    data: {
      type: 'linear' as const,
      start: transitionDuration * 0.75, // 75% = 1.5s
      duration: 0.1, // 0.1s shake
      mode: 'provider' as const,
      targetIds: ['root-container'],
      ranges: [
        { key: 'translateX', val: 5, prog: 0 },
        { key: 'translateX', val: -5, prog: 0.25 },
        { key: 'translateX', val: 5, prog: 0.5 },
        { key: 'translateX', val: -5, prog: 0.75 },
        { key: 'translateX', val: 0, prog: 1 },
        { key: 'translateY', val: -5, prog: 0.125 },
        { key: 'translateY', val: 5, prog: 0.375 },
        { key: 'translateY', val: -5, prog: 0.625 },
        { key: 'translateY', val: 5, prog: 0.875 },
        { key: 'translateY', val: 0, prog: 1 },
      ],
    },
  };

  // Panel group container (holds all panels in grid layout)
  const panelGroup: RenderableComponentData = {
    id: 'panel-group',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full grid grid-cols-4 grid-rows-4',
      },
      childrenProps: panels.map((_, index) => {
        const row = Math.floor(index / gridSize);
        const col = index % gridSize;
        return {
          className: 'absolute overflow-hidden',
          style: {
            left: `${col * panelWidth}%`,
            top: `${row * panelHeight}%`,
            width: `${panelWidth}%`,
            height: `${panelHeight}%`,
          },
        };
      }),
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: panels,
  };

  // Root container with shake effect
  const rootContainer: RenderableComponentData = {
    id: 'root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [shakeEffect],
    childrenData: [panelGroup],
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
  id: 'explosive-panel-burst',
  title: 'Explosive Panel Burst Transition',
  description: 'High-energy reverse explosion transition where scattered panels with random rotation, scale, and position converge to form a complete 4x4 grid image. Features three-phase animation (convergence, overshoot, settle), motion blur during movement, and shake effect at impact moment. Perfect for action content transitions.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'explosion', 'panels', 'grid', 'action', 'high-energy', 'burst'],
  defaultInputParams: {
    image: {
      src: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&h=1080&fit=crop',
    },
    duration: 2,
    transitionDuration: 2,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const explosivePanelBurstPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
