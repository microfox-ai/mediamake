/**
 * Elegant Cursive Ink Flow Animation Preset
 *
 * A luxury brand reveal animation that mimics fountain pen ink spreading across premium paper.
 * Features include:
 * - Smooth mask reveals following cursive writing stroke paths
 * - Ink-spreading effects with capillary action simulation
 * - Shimmer effect traveling along text path (wet ink catching light)
 * - Micro-animations with ink droplets dripping from descenders
 * - Deliberately slow, luxurious timing for craftsmanship appreciation
 *
 * Use cases:
 * - Luxury brand reveals and product launches
 * - High-end title sequences
 * - Premium content intros
 * - Elegant text overlays for sophisticated videos
 * - Wedding and event titles
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';
import { TextAtomData, GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  userText: z.string().default('Elegance').describe('Text to display with elegant cursive animation'),
  fontSize: z.number().default(96).describe('Font size in pixels'),
  duration: z.number().default(4).describe('Total animation duration in seconds'),
  textColor: z.string().default('#1A1A1A').describe('Main text color (dark ink color)'),
  shadowColor: z.string().default('#2C2C2C').describe('Ink shadow color (lighter ink diffusion)'),
  backgroundColor: z.string().default('#FAF7F0').describe('Background color (cream paper)'),
  font: z.string().default('Great Vibes:400:normal').describe('Font family with weight and style (e.g., "Great Vibes:400:normal" or "Allura:400:normal")'),
  showDroplets: z.boolean().default(true).describe('Whether to show ink droplet micro-animations'),
  dropletPositions: z.array(z.object({
    left: z.string().describe('Horizontal position (e.g., "20%")'),
    top: z.string().describe('Vertical position (e.g., "80%")'),
  })).default([
    { left: '20%', top: '80%' },
    { left: '50%', top: '85%' },
    { left: '75%', top: '82%' },
  ]).describe('Positions for ink droplets'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Great Vibes:400:normal';
  const fontParts = fontString.split(':');
  const fontFamily = fontParts[0];
  const fontWeight = fontParts.length > 1 ? fontParts[1] : '400';
  const fontStyle = fontParts.length > 2 ? fontParts[2] : 'normal';

  // Calculate timing phases
  const revealDuration = params.duration * 0.625; // 2.5s of 4s total
  const shimmerDelay = params.duration * 0.525; // Start at 70% of reveal (2.1s)
  const shimmerDuration = params.duration * 0.475; // 1.9s shimmer
  const dropletStartDelay = params.duration * 0.375; // 1.5s
  const dropletDuration = params.duration * 0.5; // 2s

  // Component IDs
  const inkShadowId = 'ink-shadow-layer';
  const mainTextId = 'main-text-layer';
  const shimmerOverlayId = 'shimmer-overlay-inner';

  // ========== INK SHADOW LAYER (opacity 0.3, blur fade-in) ==========
  const inkShadowEffect: GenericEffectData = {
    type: 'ease-out',
    start: 0,
    duration: revealDuration * 0.6, // 1.5s blur fade-in
    mode: 'provider',
    targetIds: [inkShadowId],
    ranges: [
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 0.3, prog: 1 },
      { key: 'filter', val: 'blur(4px) brightness(1.2)', prog: 0 },
      { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
    ],
  };

  const inkShadowLayer: RenderableComponentData = {
    id: inkShadowId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.userText,
      style: {
        fontSize: params.fontSize,
        color: params.shadowColor,
        textAlign: 'center',
        position: 'absolute',
        top: '0',
        left: '0',
        width: '100%',
        fontWeight: fontWeight,
        fontStyle: fontStyle as any,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'ink-shadow-blur-fade',
        componentId: 'generic',
        data: inkShadowEffect,
      },
    ],
  };

  // ========== MAIN TEXT LAYER (mask reveal with clip-path simulation) ==========
  const mainTextEffect: GenericEffectData = {
    type: 'ease-in-out',
    start: 0,
    duration: revealDuration, // 2.5s
    mode: 'provider',
    targetIds: [mainTextId],
    ranges: [
      // Fade in
      { key: 'opacity', val: 0, prog: 0 },
      { key: 'opacity', val: 1, prog: 0.4 },
      { key: 'opacity', val: 1, prog: 1 },
      // Blur (ink spreading)
      { key: 'filter', val: 'blur(4px) brightness(1.2)', prog: 0 },
      { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
      // Scale (subtle capillary expansion)
      { key: 'scale', val: 0.98, prog: 0 },
      { key: 'scale', val: 1, prog: 0.6 },
      { key: 'scale', val: 1, prog: 1 },
    ],
  };

  const mainTextLayer: RenderableComponentData = {
    id: mainTextId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: params.userText,
      style: {
        fontSize: params.fontSize,
        color: params.textColor,
        textAlign: 'center',
        position: 'relative',
        zIndex: '10',
        fontWeight: fontWeight,
        fontStyle: fontStyle as any,
      },
      font: {
        family: fontFamily,
        weights: [fontWeight],
        subsets: ['latin'],
        display: 'swap',
      },
    } as TextAtomData,
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    effects: [
      {
        id: 'main-text-reveal',
        componentId: 'generic',
        data: mainTextEffect,
      },
    ],
  };

  // ========== SHIMMER OVERLAY (wet ink catching light) ==========
  const shimmerEffect: GenericEffectData = {
    type: 'linear',
    start: shimmerDelay,
    duration: shimmerDuration,
    mode: 'provider',
    targetIds: [shimmerOverlayId],
    ranges: [
      { key: 'translateX', val: '-100%', prog: 0 },
      { key: 'translateX', val: '200%', prog: 1 },
    ],
  };

  const shimmerOverlay: RenderableComponentData = {
    id: 'shimmer-overlay-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none overflow-hidden',
        style: {
          zIndex: 20,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      {
        id: shimmerOverlayId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 30%; height: 100%; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%); transform: translateX(-100%);"></div>`,
          className: 'absolute inset-0',
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: 'shimmer-slide',
            componentId: 'generic',
            data: shimmerEffect,
          },
        ],
      } as RenderableComponentData,
    ],
  };

  // ========== INK DROPLETS (micro-animations) ==========
  const droplets: RenderableComponentData[] = [];

  if (params.showDroplets) {
    params.dropletPositions.forEach((position, index) => {
      const dropletId = `droplet-${index}`;
      const dropletSize = index === 0 ? 4 : index === 1 ? 3 : 5;
      const dropletHeight = index === 0 ? 8 : index === 1 ? 6 : 9;
      const staggerDelay = index * 0.3; // Stagger droplets

      const dropletEffect: GenericEffectData = {
        type: 'ease-in',
        start: dropletStartDelay + staggerDelay,
        duration: dropletDuration,
        mode: 'provider',
        targetIds: [dropletId],
        ranges: [
          // Fade in and fall
          { key: 'opacity', val: 0, prog: 0 },
          { key: 'opacity', val: 0.8, prog: 0.1 },
          { key: 'opacity', val: 0.6, prog: 0.5 },
          { key: 'opacity', val: 0, prog: 1 },
          // Fall down
          { key: 'translateY', val: '0px', prog: 0 },
          { key: 'translateY', val: '30px', prog: 1 },
          // Scale (drop grows as it falls)
          { key: 'scale', val: 0.8, prog: 0 },
          { key: 'scale', val: 1.2, prog: 0.5 },
          { key: 'scale', val: 0.9, prog: 1 },
        ],
      };

      droplets.push({
        id: dropletId,
        type: 'atom',
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: ${dropletSize}px; height: ${dropletHeight}px; background: radial-gradient(circle, ${params.textColor} 0%, ${params.shadowColor} 100%); border-radius: 50% 50% 50% 50% / 60% 60% 40% 40%; opacity: 0;"></div>`,
          style: {
            position: 'absolute',
            left: position.left,
            top: position.top,
          },
        },
        context: {
          timing: {
            start: 0,
            duration: params.duration,
          },
        },
        effects: [
          {
            id: `droplet-fall-${index}`,
            componentId: 'generic',
            data: dropletEffect,
          },
        ],
      } as RenderableComponentData);
    });
  }

  // ========== TEXT CONTAINER ==========
  const textContainer: RenderableComponentData = {
    id: 'elegant-cursive-text-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative px-12 py-8',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [
      inkShadowLayer,
      mainTextLayer,
      shimmerOverlay,
      ...droplets,
    ] as RenderableComponentData[],
  };

  // ========== ROOT CONTAINER ==========
  const rootContainer: RenderableComponentData = {
    id: 'elegant-cursive-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full flex items-center justify-center',
        style: {
          backgroundColor: params.backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.duration,
      },
    },
    childrenData: [textContainer] as RenderableComponentData[],
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
  id: 'elegant-cursive-ink-flow',
  title: 'Elegant Cursive Ink Flow Animation',
  description: 'Luxury cursive text animation that mimics fountain pen ink spreading across premium paper with liquid smoothness, mask reveals, shimmer effects, and ink droplet micro-animations for a sophisticated brand reveal experience',
  type: 'predefined',
  presetType: 'children',
  tags: ['text', 'cursive', 'elegant', 'luxury', 'ink', 'flow', 'animation', 'brand', 'reveal', 'shimmer', 'droplets', 'premium', 'sophisticated'],
  dependencies: {},
  defaultInputParams: {
    userText: 'Elegance',
    fontSize: 96,
    duration: 4,
    textColor: '#1A1A1A',
    shadowColor: '#2C2C2C',
    backgroundColor: '#FAF7F0',
    font: 'Great Vibes:400:normal',
    showDroplets: true,
    dropletPositions: [
      { left: '20%', top: '80%' },
      { left: '50%', top: '85%' },
      { left: '75%', top: '82%' },
    ],
  },
};

export const elegantCursiveInkFlowPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};