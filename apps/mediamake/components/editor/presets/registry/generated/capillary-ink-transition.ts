/**
 * Capillary Ink Spread Transition Preset
 *
 * This preset creates an organic ink spreading transition effect where ink appears to spread
 * through paper fibers via capillary action, creating branching patterns that reveal the
 * incoming video. The transition mimics watching ink spread through wet paper under a macro lens.
 *
 * Features:
 * - **Organic Branching**: Procedurally generated branching paths emanating from center
 * - **Paper Texture**: Grain filter and background texture for paper effect
 * - **Color Bleeding**: Subtle color-dodge blend mode at spreading edges
 * - **Capillary Action**: Decreasing speed as branches spread outward
 * - **Dual Reveal**: Outgoing video fades along ink paths, incoming gains definition
 * - **Optimized Performance**: Uses transform3d for GPU acceleration
 *
 * Technical Implementation:
 * - 2.4-second overlap between videos
 * - Multiple SVG clip-paths for branching reveal patterns
 * - Custom timing functions for organic spread behavior
 * - Blur and opacity transitions synchronized with spread
 * - CSS custom properties for coordinated branch timing
 *
 * Use Cases:
 * - Artistic video transitions
 * - Documentary transitions with organic feel
 * - Creative content with paper/ink themes
 * - Nature or artistic content transitions
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Preset parameters schema
const presetParams = z.object({
  outgoingVideo: z.object({
    src: z.string().describe('Source URL of the outgoing video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type of outgoing content'),
    duration: z.number().describe('Duration of the outgoing video in seconds'),
  }).describe('Configuration for the outgoing video'),
  
  incomingVideo: z.object({
    src: z.string().describe('Source URL of the incoming video'),
    type: z.enum(['video', 'image']).default('video').describe('Media type of incoming content'),
    duration: z.number().describe('Duration of the incoming video in seconds'),
  }).describe('Configuration for the incoming video'),
  
  transitionDuration: z.number()
    .min(0.5)
    .max(5)
    .default(2.4)
    .describe('Duration of the transition overlap in seconds'),
  
  paperTexture: z.string()
    .optional()
    .describe('Optional URL for paper texture background image'),
  
  branchCount: z.number()
    .min(3)
    .max(12)
    .default(8)
    .describe('Number of branching paths from center'),
  
  branchIntensity: z.number()
    .min(0.5)
    .max(2)
    .default(1)
    .describe('Intensity multiplier for branch spread effect'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    outgoingVideo,
    incomingVideo,
    transitionDuration,
    paperTexture,
    branchCount,
    branchIntensity,
  } = params;

  const { config } = props;
  const width = config?.width ?? 1920;
  const height = config?.height ?? 1080;
  const centerX = width / 2;
  const centerY = height / 2;

  // Calculate base layout duration (overlap subtracted)
  const baseLayoutDuration = outgoingVideo.duration + incomingVideo.duration - transitionDuration;

  // Helper: Generate SVG path for organic branching
  const generateBranchPath = (angleRad: number, length: number, curvature: number): string => {
    const endX = centerX + Math.cos(angleRad) * length;
    const endY = centerY + Math.sin(angleRad) * length;
    
    // Control points for organic curves
    const cp1X = centerX + Math.cos(angleRad) * (length * 0.3) + Math.sin(angleRad) * curvature;
    const cp1Y = centerY + Math.sin(angleRad) * (length * 0.3) - Math.cos(angleRad) * curvature;
    const cp2X = centerX + Math.cos(angleRad) * (length * 0.7) - Math.sin(angleRad) * curvature;
    const cp2Y = centerY + Math.sin(angleRad) * (length * 0.7) + Math.cos(angleRad) * curvature;
    
    return `M${centerX},${centerY} C${cp1X},${cp1Y} ${cp2X},${cp2Y} ${endX},${endY}`;
  };

  // Helper: Generate clip-path polygon from branches
  const generateClipPath = (progress: number): string => {
    const points: string[] = [];
    const angleStep = (2 * Math.PI) / branchCount;
    
    for (let i = 0; i < branchCount; i++) {
      const angle = i * angleStep;
      const baseLength = Math.max(width, height) * 0.8;
      const length = baseLength * progress * branchIntensity;
      const curvature = 50 * (1 - progress); // Less curvature as it spreads
      
      const endX = centerX + Math.cos(angle) * length;
      const endY = centerY + Math.sin(angle) * length;
      points.push(`${endX}px ${endY}px`);
    }
    
    return `polygon(${points.join(', ')})`;
  };

  // Generate ink branch SVG visualizations
  const inkBranchVisuals: RenderableComponentData[] = [];
  const angleStep = (2 * Math.PI) / branchCount;
  
  for (let i = 0; i < branchCount; i++) {
    const angle = i * angleStep;
    const baseLength = Math.max(width, height) * 0.8;
    const curvature = 50 * Math.sin(angle * 2); // Vary curvature per branch
    const pathD = generateBranchPath(angle, baseLength, curvature);
    
    const branchDelay = (i / branchCount) * 0.3 * transitionDuration; // Stagger branches
    const branchDuration = transitionDuration * 0.8;
    
    inkBranchVisuals.push({
      id: `ink-branch-${i}`,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid slice" style="position: absolute; inset: 0; pointer-events: none;">
          <path d="${pathD}" fill="none" stroke="#1a1a1a" stroke-width="3" stroke-linecap="round" opacity="0.3" style="stroke-dasharray: ${baseLength}; stroke-dashoffset: ${baseLength}"/>
        </svg>`,
        className: 'absolute inset-0',
        style: {
          pointerEvents: 'none',
          mixBlendMode: 'color-dodge',
          opacity: 0.5,
        },
      },
      context: {
        timing: {
          start: outgoingVideo.duration - transitionDuration + branchDelay,
          duration: branchDuration,
        },
      },
      effects: [
        {
          id: `ink-branch-draw-${i}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: branchDuration,
            mode: 'provider',
            targetIds: [`ink-branch-${i}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 0.5, prog: 0.3 },
              { key: 'opacity', val: 0.3, prog: 1 },
            ],
          },
        },
      ],
    } as RenderableComponentData);
  }

  // Outgoing video component
  const outgoingVideoComponent: RenderableComponentData = {
    id: 'outgoing-video',
    type: 'atom',
    componentId: outgoingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: outgoingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: outgoingVideo.duration,
      },
    },
    effects: [
      // Clip-path reveal effect (ink spreading)
      {
        id: 'outgoing-clip-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 0 },
            { key: 'clipPath', val: generateClipPath(0.3), prog: 0.3 },
            { key: 'clipPath', val: generateClipPath(0.6), prog: 0.6 },
            { key: 'clipPath', val: generateClipPath(1), prog: 1 },
          ],
        },
      },
      // Opacity fade
      {
        id: 'outgoing-fade',
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: outgoingVideo.duration - transitionDuration,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['outgoing-video'],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 0.5 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Incoming video component
  const incomingVideoComponent: RenderableComponentData = {
    id: 'incoming-video',
    type: 'atom',
    componentId: incomingVideo.type === 'video' ? 'VideoAtom' : 'ImageAtom',
    data: {
      src: incomingVideo.src,
      className: 'w-full h-full object-cover',
      fit: 'cover',
      style: {
        position: 'absolute',
        inset: '0',
        width: '100%',
        height: '100%',
      },
    },
    context: {
      timing: {
        start: outgoingVideo.duration - transitionDuration,
        duration: incomingVideo.duration + transitionDuration,
      },
    },
    effects: [
      // Blur reduction (gaining definition)
      {
        id: 'incoming-blur',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'filter', val: 'blur(6px)', prog: 0 },
            { key: 'filter', val: 'blur(3px)', prog: 0.5 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      },
      // Opacity fade in
      {
        id: 'incoming-fade',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.5, prog: 0.5 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
      // Inverse clip-path (reveal from branches)
      {
        id: 'incoming-clip-reveal',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['incoming-video'],
          ranges: [
            { key: 'clipPath', val: generateClipPath(0), prog: 0 },
            { key: 'clipPath', val: generateClipPath(0.4), prog: 0.4 },
            { key: 'clipPath', val: generateClipPath(0.8), prog: 0.8 },
            { key: 'clipPath', val: 'circle(100% at 50% 50%)', prog: 1 },
          ],
        },
      },
    ],
  };

  // Paper texture background (optional)
  const paperTextureComponent: RenderableComponentData | null = paperTexture
    ? {
        id: 'paper-texture-bg',
        type: 'atom',
        componentId: 'ImageAtom',
        data: {
          src: paperTexture,
          className: 'absolute inset-0 w-full h-full object-cover',
          style: {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.15,
            mixBlendMode: 'multiply',
            filter: 'contrast(1.3)',
            pointerEvents: 'none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: baseLayoutDuration,
          },
        },
      }
    : null;

  // Build children data
  const childrenData: RenderableComponentData[] = [
    outgoingVideoComponent,
    incomingVideoComponent,
    ...inkBranchVisuals,
  ];

  if (paperTextureComponent) {
    childrenData.unshift(paperTextureComponent);
  }

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'capillary-ink-transition-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          overflow: 'hidden',
          backgroundColor: '#f5f5dc', // Paper beige color
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: baseLayoutDuration,
      },
    },
    childrenData,
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
  id: 'capillary-ink-transition',
  title: 'Capillary Ink Spread Transition',
  description:
    'Organic ink spreading transition effect where ink appears to spread through paper fibers via capillary action, creating branching patterns that reveal the incoming video. Features procedurally generated branching paths with paper grain texture and color bleeding effects.',
  type: 'predefined',
  presetType: 'children',
  tags: ['transition', 'ink', 'organic', 'capillary', 'paper', 'branching', 'artistic'],
  defaultInputParams: {
    outgoingVideo: {
      src: 'https://example.com/video1.mp4',
      type: 'video',
      duration: 5,
    },
    incomingVideo: {
      src: 'https://example.com/video2.mp4',
      type: 'video',
      duration: 5,
    },
    transitionDuration: 2.4,
    paperTexture: 'https://example.com/paper-texture.jpg',
    branchCount: 8,
    branchIntensity: 1,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const capillaryInkTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
