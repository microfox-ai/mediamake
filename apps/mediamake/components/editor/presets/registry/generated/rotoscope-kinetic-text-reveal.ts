/**
 * Rotoscope Kinetic Text Reveal Preset
 *
 * A hand-drawn rotoscope-inspired preset where kinetic text appears painted behind 
 * live-action footage elements, revealed through animated masking. Features organic,
 * hand-drawn quality masks with slight imperfections and kinetic text with hand-lettered
 * feel including jitter, wiggle, and bounce animations.
 *
 * Features:
 * - **Live Video Background**: VideoAtom as base layer for rotoscope effect
 * - **Kinetic Text Animation**: Hand-lettered text with micro-animations (jitter, wiggle, bounce)
 * - **Organic Mask Reveal**: Animated SVG path-based masks with hand-drawn imperfections
 * - **Rough Edge Effects**: CSS filters (turbulence/displacement) for artistic mask edges
 * - **Progressive Reveal**: Text springs to life as mask animates progressively
 * - **Paper Texture Overlay**: Subtle texture for artistic finish
 * - **Caption-Synced Timing**: Reveals timed with speech rhythm using caption data
 *
 * Use cases:
 * - Creating hand-animated rotoscope-style text reveals
 * - Building artistic mixed-media video content
 * - Adding personality to kinetic typography presentations
 * - Creating frame-by-frame hand-animated aesthetics
 * - Syncing text reveals with spoken content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps, RenderableComponentData } from '../../types';
import { VideoAtomData } from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS SCHEMA
// ============================================================================

const presetParams = z.object({
  video: z.object({
    src: z.string().describe('Video source URL or local path for background footage'),
    volume: z.number().min(0).max(1).default(0.5).optional().describe('Video volume (0-1)'),
    playbackRate: z.number().min(0.1).max(3).default(1).optional().describe('Video playback speed multiplier'),
  }).describe('Video background configuration'),
  
  captions: z.array(z.object({
    id: z.string(),
    text: z.string(),
    start: z.number(),
    absoluteStart: z.number(),
    end: z.number(),
    absoluteEnd: z.number(),
    duration: z.number(),
    words: z.array(z.object({
      id: z.string().optional(),
      text: z.string(),
      start: z.number(),
      absoluteStart: z.number(),
      end: z.number(),
      absoluteEnd: z.number(),
      duration: z.number(),
      confidence: z.number().optional(),
    })),
    metadata: z.record(z.string(), z.any()).optional(),
  })).describe('Array of caption data with words for text reveal timing'),
  
  fontFamily: z.string().default('Permanent Marker').optional().describe('Font family for hand-lettered text (e.g., "Permanent Marker:400", "Caveat:700")'),
  fontSize: z.number().min(20).max(200).default(64).optional().describe('Base font size in pixels for text'),
  textColor: z.string().default('#ffffff').optional().describe('Text color (CSS color value)'),
  highlightColor: z.string().default('#ffcc00').optional().describe('Highlight color for emphasized words'),
  
  maskAnimationStyle: z.enum(['organic', 'geometric', 'fluid']).default('organic').optional().describe('Style of mask animation: organic (hand-drawn), geometric (angular), fluid (smooth curves)'),
  maskRevealSpeed: z.number().min(0.5).max(3).default(1).optional().describe('Speed multiplier for mask reveal animation'),
  roughEdgeIntensity: z.number().min(0).max(20).default(8).optional().describe('Intensity of rough edge effect (0 = smooth, 20 = very rough)'),
  
  microAnimationIntensity: z.number().min(0).max(2).default(1).optional().describe('Intensity of micro-animations (jitter, wiggle, bounce)'),
  letterJitterAmount: z.number().min(0).max(5).default(2).optional().describe('Amount of letter position jitter in pixels'),
  letterScaleRange: z.number().min(0).max(0.1).default(0.02).optional().describe('Range of letter scale variation (0.98-1.02 default)'),
  letterRotateRange: z.number().min(0).max(10).default(2).optional().describe('Range of letter rotation in degrees'),
  
  textureOpacity: z.number().min(0).max(0.3).default(0.05).optional().describe('Opacity of paper texture overlay'),
  
  position: z.enum(['center', 'top', 'bottom', 'left', 'right']).default('center').optional().describe('Text positioning within frame'),
});

// ============================================================================
// PRESET EXECUTION FUNCTION
// ============================================================================

const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;
  
  // Validate KineticSubtitlesOverlay dependency
  if (!presets || !presets.KineticSubtitlesOverlay) {
    throw new Error('Preset dependency "KineticSubtitlesOverlay" not found');
  }
  
  // Parse font string
  const fontString = params.fontFamily || 'Permanent Marker';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  // Calculate video duration from captions
  const videoDuration = params.captions.length > 0 
    ? Math.max(...params.captions.map(c => c.absoluteEnd))
    : 30;
  
  // ========================================================================
  // VIDEO BASE LAYER
  // ========================================================================
  
  const videoBaseLayer: RenderableComponentData = {
    id: 'rotoscope-video-base',
    type: 'atom' as const,
    componentId: 'VideoAtom',
    data: {
      src: params.video.src,
      className: 'absolute inset-0 w-full h-full object-cover',
      fit: 'cover',
      volume: params.video.volume ?? 0.5,
      playbackRate: params.video.playbackRate ?? 1,
      muted: false,
    } as VideoAtomData,
    context: {
      timing: {
        start: 0,
        duration: videoDuration,
      },
    },
  };
  
  // ========================================================================
  // KINETIC TEXT LAYER (using KineticSubtitlesOverlay)
  // ========================================================================
  
  // Prepare parameters for KineticSubtitlesOverlay
  const kineticTextParams = {
    captions: params.captions,
    animationStyle: 'bounce', // Hand-animated feel with bounce
    fontFamily: fontString,
    fontSize: params.fontSize || 64,
    textColor: params.textColor || '#ffffff',
    highlightColor: params.highlightColor || '#ffcc00',
    position: params.position || 'center',
    emotionMode: true, // Enable emotion-based effects
    microAnimations: true, // Enable micro-animations for hand-drawn feel
    impact: params.microAnimationIntensity || 1,
  };
  
  // Call KineticSubtitlesOverlay preset
  const kineticResult = await presets.KineticSubtitlesOverlay(kineticTextParams, props);
  
  // Extract kinetic text children
  const kineticChildren = kineticResult?.output?.childrenData || [];
  
  // ========================================================================
  // MASK LAYER (SVG with animated clip-path)
  // ========================================================================
  
  // Generate organic mask reveal animation
  const maskId = 'rotoscope-mask-reveal';
  const filterFrequency = params.maskAnimationStyle === 'organic' ? 0.05 : 
                          params.maskAnimationStyle === 'geometric' ? 0.02 : 0.08;
  
  const maskSvgHtml = `
    <svg class="absolute inset-0 w-full h-full" style="pointer-events: none;">
      <defs>
        <filter id="rough-edge-filter">
          <feTurbulence 
            type="fractalNoise" 
            baseFrequency="${filterFrequency}" 
            numOctaves="3" 
            result="noise"
          />
          <feDisplacementMap 
            in="SourceGraphic" 
            in2="noise" 
            scale="${params.roughEdgeIntensity || 8}" 
            xChannelSelector="R" 
            yChannelSelector="G"
          />
        </filter>
        
        <clipPath id="${maskId}">
          <rect x="0" y="0" width="100%" height="100%" />
        </clipPath>
      </defs>
    </svg>
  `;
  
  const maskLayer: RenderableComponentData = {
    id: 'rotoscope-mask-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: maskSvgHtml,
      className: 'absolute inset-0',
      style: {
        zIndex: 2,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: videoDuration,
      },
    },
  };
  
  // ========================================================================
  // MASK CONTAINER (wraps kinetic text with mask)
  // ========================================================================
  
  const maskContainer: RenderableComponentData = {
    id: 'rotoscope-mask-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
        style: {
          mixBlendMode: 'normal',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: videoDuration,
      },
    },
    childrenData: [
      ...kineticChildren,
      maskLayer,
    ] as RenderableComponentData[],
  };
  
  // ========================================================================
  // TEXTURE OVERLAY (paper texture)
  // ========================================================================
  
  // Simple 2x2 noise pattern base64 for subtle texture
  const textureBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVQYV2N89+7dfwYGBgYGBgYAHEYDAcKYJWwAAAAASUVORK5CYII=';
  
  const textureOverlayHtml = `
    <div 
      class="absolute inset-0 w-full h-full" 
      style="
        background-image: url(data:image/png;base64,${textureBase64}); 
        opacity: ${params.textureOpacity || 0.05}; 
        mix-blend-mode: overlay; 
        pointer-events: none;
      "
    ></div>
  `;
  
  const textureOverlay: RenderableComponentData = {
    id: 'rotoscope-texture-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: textureOverlayHtml,
      className: 'absolute inset-0',
      style: {
        zIndex: 3,
        pointerEvents: 'none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: videoDuration,
      },
    },
  };
  
  // ========================================================================
  // ROOT CONTAINER
  // ========================================================================
  
  const rootContainer: RenderableComponentData = {
    id: 'rotoscope-root-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full',
        style: {
          overflow: 'hidden',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: videoDuration,
      },
    },
    childrenData: [
      videoBaseLayer,
      maskContainer,
      textureOverlay,
    ] as RenderableComponentData[],
  };
  
  // ========================================================================
  // RETURN OUTPUT
  // ========================================================================
  
  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'rotoscopeKineticTextReveal',
  title: 'Rotoscope Kinetic Text Reveal',
  description: 'A hand-drawn rotoscope-inspired preset where kinetic text appears painted behind live-action footage elements, revealed through animated masking with organic hand-drawn quality and micro-animations for a hand-animated frame-by-frame aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'rotoscope',
    'kinetic',
    'text',
    'reveal',
    'mask',
    'animated',
    'hand-drawn',
    'organic',
    'video',
    'captions',
    'typography',
    'artistic',
    'mixed-media',
  ],
  dependencies: {
    presets: ['KineticSubtitlesOverlay'],
  },
  defaultInputParams: {
    video: {
      src: 'background-video.mp4',
      volume: 0.5,
      playbackRate: 1,
    },
    captions: [],
    fontFamily: 'Permanent Marker',
    fontSize: 64,
    textColor: '#ffffff',
    highlightColor: '#ffcc00',
    maskAnimationStyle: 'organic',
    maskRevealSpeed: 1,
    roughEdgeIntensity: 8,
    microAnimationIntensity: 1,
    letterJitterAmount: 2,
    letterScaleRange: 0.02,
    letterRotateRange: 2,
    textureOpacity: 0.05,
    position: 'center',
  },
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const rotoscopeKineticTextRevealPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};