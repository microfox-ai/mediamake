/**
 * Split-Screen Panel Reveal Preset
 *
 * This preset creates a modern split-screen panel reveal animation inspired by split-screen
 * video editing techniques. The screen is divided into a 3x3 grid where each panel slides
 * in from different directions toward the center, creating a convergence effect.
 *
 * Features:
 * - 3x3 grid layout with 9 independent panels
 * - Directional slide animations: top panels slide down, bottom panels slide up, 
 *   left panels slide right, right panels slide left
 * - Overshoot animation with bounce-back effect (spring easing)
 * - Staggered timing: center panel first, then adjacent panels, then corners
 * - Synchronized scale animation (0.8 → 1.05 → 1.0) with position
 * - Border fade-in after panels settle (white/20% opacity)
 * - Each panel can contain different content (video, image, or colored backgrounds)
 * - Snappy, energetic timing like a sports broadcast intro
 *
 * Use cases:
 * - Sports broadcast intros and transitions
 * - Dynamic video montages and collages
 * - Multi-panel storytelling sequences
 * - Puzzle-reveal style animations
 * - High-energy presentation openers
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Define input parameters
const presetParams = z.object({
  panelContents: z
    .array(
      z.object({
        type: z
          .enum(['image', 'video', 'color'])
          .describe('Type of content for this panel'),
        src: z
          .string()
          .optional()
          .describe('Source URL for image or video (required if type is image/video)'),
        color: z
          .string()
          .optional()
          .describe('Background color (required if type is color)'),
        fit: z
          .enum(['cover', 'contain', 'fill', 'none', 'scale-down'])
          .optional()
          .default('cover')
          .describe('How content fits in panel'),
      }),
    )
    .length(9)
    .describe('Array of 9 panel contents (one for each grid cell, ordered left-to-right, top-to-bottom)'),
  totalDuration: z
    .number()
    .default(1.5)
    .describe('Total duration of the preset animation in seconds'),
  trackName: z
    .string()
    .default('split-screen-reveal')
    .describe('Name identifier for the track'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const { panelContents, totalDuration, trackName } = params;

  // Panel position configuration for 3x3 grid
  // Format: [row, col] where row/col are 0-indexed
  // Panels are numbered 0-8 left-to-right, top-to-bottom
  const panelPositions = [
    [0, 0], // Panel 0: top-left
    [0, 1], // Panel 1: top-center
    [0, 2], // Panel 2: top-right
    [1, 0], // Panel 3: middle-left
    [1, 1], // Panel 4: center
    [1, 2], // Panel 5: middle-right
    [2, 0], // Panel 6: bottom-left
    [2, 1], // Panel 7: bottom-center
    [2, 2], // Panel 8: bottom-right
  ];

  // Calculate initial translateX and translateY for each panel based on position
  const getInitialTransform = (row: number, col: number) => {
    // Corner panels: ±150% on both axes
    // Edge panels: ±100% on one axis, 0 on the other
    // Center panel: no initial translation (handled via scale/opacity only)
    
    let translateX = 0;
    let translateY = 0;
    
    if (row === 1 && col === 1) {
      // Center panel - no translation
      return { translateX: 0, translateY: 0, isCenter: true };
    }
    
    // Determine X translation
    if (col === 0) {
      translateX = row === 1 ? -100 : -150; // Left edge or corner
    } else if (col === 2) {
      translateX = row === 1 ? 100 : 150; // Right edge or corner
    }
    
    // Determine Y translation
    if (row === 0) {
      translateY = col === 1 ? -100 : -150; // Top edge or corner
    } else if (row === 2) {
      translateY = col === 1 ? 100 : 150; // Bottom edge or corner
    }
    
    return { translateX, translateY, isCenter: false };
  };

  // Calculate stagger timing based on position
  const getStaggerTiming = (row: number, col: number) => {
    if (row === 1 && col === 1) return 0; // Center: 0s
    
    // Adjacent panels (edge panels): 0.1s
    if ((row === 1 && (col === 0 || col === 2)) || 
        (col === 1 && (row === 0 || row === 2))) {
      return 0.1;
    }
    
    // Corner panels: 0.2s
    return 0.2;
  };

  // Calculate overshoot direction (opposite of initial direction, scaled to 10%)
  const getOvershootTransform = (translateX: number, translateY: number) => {
    const overshootX = translateX !== 0 ? (translateX > 0 ? -10 : 10) : 0;
    const overshootY = translateY !== 0 ? (translateY > 0 ? -10 : 10) : 0;
    return { overshootX, overshootY };
  };

  // Create panel components with effects
  const panelComponents = panelContents.map((content, index) => {
    const [row, col] = panelPositions[index];
    const { translateX, translateY, isCenter } = getInitialTransform(row, col);
    const staggerStart = getStaggerTiming(row, col);
    const { overshootX, overshootY } = getOvershootTransform(translateX, translateY);
    
    const panelId = `${trackName}-panel-${index}`;
    const contentId = `${trackName}-content-${index}`;
    
    // Determine content component
    let contentComponent: any = null;
    
    if (content.type === 'image') {
      contentComponent = {
        id: contentId,
        type: 'atom' as const,
        componentId: 'ImageAtom',
        data: {
          src: content.src!,
          className: 'object-cover w-full h-full',
        },
      };
    } else if (content.type === 'video') {
      contentComponent = {
        id: contentId,
        type: 'atom' as const,
        componentId: 'VideoAtom',
        data: {
          src: content.src!,
          className: 'object-cover w-full h-full',
          fit: content.fit || 'cover',
          muted: true,
          loop: true,
        },
      };
    } else {
      // Color background - use HTMLBlockAtom instead of deprecated ShapeAtom
      contentComponent = {
        id: contentId,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 100%; height: 100%; background-color: ${content.color || '#000000'};"></div>`,
          className: 'w-full h-full',
        },
      };
    }
    
    // Build slide animation ranges
    const slideRanges: any[] = [];
    
    if (isCenter) {
      // Center panel: only scale and opacity
      slideRanges.push(
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 0.3 },
      );
    } else {
      // Other panels: translate + scale
      if (translateX !== 0) {
        slideRanges.push(
          { key: 'translateX', val: translateX, prog: 0, unit: '%' },
          { key: 'translateX', val: overshootX, prog: 0.6, unit: '%' },
          { key: 'translateX', val: 0, prog: 1, unit: '%' },
        );
      }
      
      if (translateY !== 0) {
        slideRanges.push(
          { key: 'translateY', val: translateY, prog: 0, unit: '%' },
          { key: 'translateY', val: overshootY, prog: 0.6, unit: '%' },
          { key: 'translateY', val: 0, prog: 1, unit: '%' },
        );
      }
      
      slideRanges.push(
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.05, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
      );
    }
    
    // Slide-in effect
    const slideEffect = {
      id: `${panelId}-slide`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [panelId],
        type: 'spring',
        start: staggerStart,
        duration: 0.8,
        ranges: slideRanges,
      },
    };
    
    // Border fade-in effect (starts after panels settle at ~1.2s)
    const borderEffect = {
      id: `${panelId}-border`,
      componentId: 'generic',
      data: {
        mode: 'provider',
        targetIds: [panelId],
        type: 'ease-out',
        start: 1.2,
        duration: 0.3,
        ranges: [
          { key: 'borderColor', val: 'rgba(255, 255, 255, 0)', prog: 0 },
          { key: 'borderColor', val: 'rgba(255, 255, 255, 0.2)', prog: 1 },
        ],
      },
    };
    
    // Panel container
    return {
      id: panelId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative overflow-hidden border-2 border-transparent',
          style: {
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          },
        },
      },
      context: {
        timing: {
          start: 0,
          duration: totalDuration,
        },
      },
      effects: [slideEffect, borderEffect],
      childrenData: [contentComponent],
    } as RenderableComponentData;
  });

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'grid grid-cols-3 grid-rows-3 gap-1 w-full h-full absolute inset-0',
        style: {
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: panelComponents,
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
  id: 'split-screen-panel-reveal',
  title: 'Split-Screen Panel Reveal',
  description:
    'Modern split-screen panel reveal preset with grid-based convergence effect. Panels slide in from different directions toward the center with spring overshoot animation, creating a dynamic puzzle assembly effect.',
  type: 'predefined',
  presetType: 'children',
  tags: ['split-screen', 'grid', 'reveal', 'transition', 'sports', 'dynamic', 'energetic'],
  defaultInputParams: {
    panelContents: [
      { type: 'image', src: 'panel-content-0', fit: 'cover' },
      { type: 'image', src: 'panel-content-1', fit: 'cover' },
      { type: 'image', src: 'panel-content-2', fit: 'cover' },
      { type: 'image', src: 'panel-content-3', fit: 'cover' },
      { type: 'image', src: 'panel-content-4', fit: 'cover' },
      { type: 'image', src: 'panel-content-5', fit: 'cover' },
      { type: 'image', src: 'panel-content-6', fit: 'cover' },
      { type: 'image', src: 'panel-content-7', fit: 'cover' },
      { type: 'image', src: 'panel-content-8', fit: 'cover' },
    ],
    totalDuration: 1.5,
    trackName: 'split-screen-reveal',
  },
  dependencies: {},
};

export const splitScreenPanelRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};