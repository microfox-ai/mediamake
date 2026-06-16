/**
 * 3D Sphere Morph Video Transition Preset
 *
 * Creates a sophisticated 3D sphere morphing transition between two videos.
 * The sphere transforms through multiple geometric shapes (sphere → ellipsoid → disc → sphere)
 * while revealing different video content. Features environmental reflections, gravitational
 * lensing effects, and smooth 3D rotations.
 *
 * Features:
 * - **Spherical Video Mapping**: Videos mapped onto 3D sphere surfaces with proper masking
 * - **Geometric Morphing**: Smooth transitions between sphere, ellipsoid, and disc shapes
 * - **3D Rotation**: Continuous rotation animations during shape transitions
 * - **Environmental Effects**: Reflections and refractions that react to shape changes
 * - **Gravitational Lensing**: Video content bends around sphere curvature
 * - **Physics-Based Easing**: Natural motion using ease-in-out timing functions
 *
 * Use cases:
 * - Creative video transitions with 3D depth
 * - Spherical video reveals and transformations
 * - Futuristic content transitions
 * - Artistic video presentations with geometric morphing
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

const presetParams = z.object({
  video1: z.string().describe('Source URL of the first video (outgoing)'),
  video2: z.string().describe('Source URL of the second video (incoming)'),
  transitionDuration: z
    .number()
    .default(2)
    .describe('Total duration of the morphing transition in seconds'),
  sphereSize: z
    .number()
    .default(500)
    .describe('Size of the sphere in pixels (width and height)'),
  rotationIntensity: z
    .number()
    .default(180)
    .describe('Maximum rotation angle in degrees during transition'),
  lensDistortion: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe('Intensity of gravitational lensing effect (0-1)'),
  reflectionIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of environmental reflection (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    video1,
    video2,
    transitionDuration,
    sphereSize,
    rotationIntensity,
    lensDistortion,
    reflectionIntensity,
  } = params;

  // Calculate timing phases
  // Phase 1: Initial sphere with video1 (0-15%)
  // Phase 2: Morph to ellipsoid + rotate (15-40%)
  // Phase 3: Compress to disc (40-60%)
  // Phase 4: Reform as sphere with video2 (60-100%)

  const phase1End = transitionDuration * 0.15;
  const phase2End = transitionDuration * 0.4;
  const phase3End = transitionDuration * 0.6;
  const crossfadeStart = transitionDuration * 0.45;
  const crossfadeEnd = transitionDuration * 0.65;

  // Video 1 (outgoing) effects
  const video1Effects: GenericEffectData[] = [
    // Border radius morphing: sphere → ellipsoid → disc
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-1'],
      ranges: [
        { key: 'borderRadius', val: '50%', prog: 0 },
        { key: 'borderRadius', val: '50% 30%', prog: 0.4 },
        { key: 'borderRadius', val: '50% 10%', prog: 0.6 },
      ],
    } as GenericEffectData,
    // 3D rotation
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-1'],
      ranges: [
        { key: 'rotateY', val: 0, prog: 0 },
        { key: 'rotateY', val: rotationIntensity * 0.5, prog: 0.4 },
        { key: 'rotateY', val: rotationIntensity, prog: 0.6 },
      ],
    } as GenericEffectData,
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-1'],
      ranges: [
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: 15, prog: 0.3 },
        { key: 'rotateX', val: 0, prog: 0.6 },
      ],
    } as GenericEffectData,
    // Scale for compression effect
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-1'],
      ranges: [
        { key: 'scale', val: 1, prog: 0 },
        { key: 'scale', val: 1.1, prog: 0.4 },
        { key: 'scale', val: 0.8, prog: 0.6 },
      ],
    } as GenericEffectData,
    // Opacity crossfade
    {
      type: 'ease-in-out',
      start: crossfadeStart,
      duration: crossfadeEnd - crossfadeStart,
      mode: 'provider',
      targetIds: ['video-sphere-container-1'],
      ranges: [
        { key: 'opacity', val: 1, prog: 0 },
        { key: 'opacity', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
    // Blur for refraction simulation
    {
      type: 'ease-in-out',
      start: phase2End,
      duration: transitionDuration - phase2End,
      mode: 'provider',
      targetIds: ['video-sphere-container-1'],
      ranges: [
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 0 },
        {
          key: 'filter',
          val: `blur(${Math.round(lensDistortion * 10)}px) brightness(${1 + lensDistortion * 0.3})`,
          prog: 0.5,
        },
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
      ],
    } as GenericEffectData,
    // Box shadow for depth
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-1'],
      ranges: [
        {
          key: 'boxShadow',
          val: '0 20px 60px rgba(0,0,0,0.5)',
          prog: 0,
        },
        {
          key: 'boxShadow',
          val: '0 40px 100px rgba(0,0,0,0.8)',
          prog: 0.5,
        },
        {
          key: 'boxShadow',
          val: '0 10px 30px rgba(0,0,0,0.3)',
          prog: 1,
        },
      ],
    } as GenericEffectData,
  ];

  // Video 2 (incoming) effects
  const video2Effects: GenericEffectData[] = [
    // Border radius morphing: disc → ellipsoid → sphere
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-2'],
      ranges: [
        { key: 'borderRadius', val: '50% 10%', prog: 0 },
        { key: 'borderRadius', val: '50% 30%', prog: 0.4 },
        { key: 'borderRadius', val: '50%', prog: 1 },
      ],
    } as GenericEffectData,
    // 3D rotation (reverse direction)
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-2'],
      ranges: [
        { key: 'rotateY', val: rotationIntensity, prog: 0 },
        { key: 'rotateY', val: rotationIntensity * 0.5, prog: 0.5 },
        { key: 'rotateY', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-2'],
      ranges: [
        { key: 'rotateX', val: 0, prog: 0 },
        { key: 'rotateX', val: -15, prog: 0.5 },
        { key: 'rotateX', val: 0, prog: 1 },
      ],
    } as GenericEffectData,
    // Scale for expansion effect
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-2'],
      ranges: [
        { key: 'scale', val: 0.8, prog: 0 },
        { key: 'scale', val: 1.1, prog: 0.6 },
        { key: 'scale', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
    // Opacity crossfade
    {
      type: 'ease-in-out',
      start: crossfadeStart,
      duration: crossfadeEnd - crossfadeStart,
      mode: 'provider',
      targetIds: ['video-sphere-container-2'],
      ranges: [
        { key: 'opacity', val: 0, prog: 0 },
        { key: 'opacity', val: 1, prog: 1 },
      ],
    } as GenericEffectData,
    // Blur for refraction simulation
    {
      type: 'ease-in-out',
      start: 0,
      duration: phase3End,
      mode: 'provider',
      targetIds: ['video-sphere-container-2'],
      ranges: [
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 0 },
        {
          key: 'filter',
          val: `blur(${Math.round(lensDistortion * 10)}px) brightness(${1 + lensDistortion * 0.3})`,
          prog: 0.5,
        },
        { key: 'filter', val: 'blur(0px) brightness(1)', prog: 1 },
      ],
    } as GenericEffectData,
    // Box shadow for depth
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['video-sphere-container-2'],
      ranges: [
        {
          key: 'boxShadow',
          val: '0 10px 30px rgba(0,0,0,0.3)',
          prog: 0,
        },
        {
          key: 'boxShadow',
          val: '0 40px 100px rgba(0,0,0,0.8)',
          prog: 0.5,
        },
        {
          key: 'boxShadow',
          val: '0 20px 60px rgba(0,0,0,0.5)',
          prog: 1,
        },
      ],
    } as GenericEffectData,
  ];

  // Reflection layer effects
  const reflectionEffects: GenericEffectData[] = [
    // Sync border radius with sphere morphing
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['reflection-layer'],
      ranges: [
        { key: 'borderRadius', val: '50%', prog: 0 },
        { key: 'borderRadius', val: '50% 30%', prog: 0.4 },
        { key: 'borderRadius', val: '50% 10%', prog: 0.6 },
        { key: 'borderRadius', val: '50% 30%', prog: 0.8 },
        { key: 'borderRadius', val: '50%', prog: 1 },
      ],
    } as GenericEffectData,
    // Adjust opacity based on reflection intensity
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['reflection-layer'],
      ranges: [
        { key: 'opacity', val: reflectionIntensity, prog: 0 },
        { key: 'opacity', val: reflectionIntensity * 1.5, prog: 0.5 },
        { key: 'opacity', val: reflectionIntensity, prog: 1 },
      ],
    } as GenericEffectData,
  ];

  // Lensing overlay effects
  const lensingEffects: GenericEffectData[] = [
    {
      type: 'ease-in-out',
      start: 0,
      duration: transitionDuration,
      mode: 'provider',
      targetIds: ['lensing-overlay'],
      ranges: [
        { key: 'opacity', val: lensDistortion * 0.6, prog: 0 },
        { key: 'opacity', val: lensDistortion, prog: 0.5 },
        { key: 'opacity', val: lensDistortion * 0.6, prog: 1 },
      ],
    } as GenericEffectData,
  ];

  // Create component tree
  const videoSphere1Container: RenderableComponentData = {
    id: 'video-sphere-container-1',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: `${sphereSize}px`,
          height: `${sphereSize}px`,
          transformStyle: 'preserve-3d',
          willChange: 'transform, border-radius, filter, opacity',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: video1Effects.map((data, index) => ({
      id: `video1-effect-${index}`,
      componentId: 'generic',
      data,
    })),
    childrenData: [
      {
        id: 'video-sphere-1',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video1,
          fit: 'cover',
          loop: true,
          muted: false,
          className: 'absolute inset-0',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
            backfaceVisibility: 'hidden',
            WebkitMaskImage:
              'radial-gradient(circle, black 70%, transparent 100%)',
            maskImage: 'radial-gradient(circle, black 70%, transparent 100%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const videoSphere2Container: RenderableComponentData = {
    id: 'video-sphere-container-2',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          width: `${sphereSize}px`,
          height: `${sphereSize}px`,
          transformStyle: 'preserve-3d',
          willChange: 'transform, border-radius, filter, opacity',
          opacity: 0,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: video2Effects.map((data, index) => ({
      id: `video2-effect-${index}`,
      componentId: 'generic',
      data,
    })),
    childrenData: [
      {
        id: 'video-sphere-2',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: video2,
          fit: 'cover',
          loop: true,
          muted: false,
          className: 'absolute inset-0',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '50%',
            backfaceVisibility: 'hidden',
            WebkitMaskImage:
              'radial-gradient(circle, black 70%, transparent 100%)',
            maskImage: 'radial-gradient(circle, black 70%, transparent 100%)',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: transitionDuration,
          },
        },
      } as RenderableComponentData,
    ],
  };

  const reflectionLayer: RenderableComponentData = {
    id: 'reflection-layer',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="reflection-sphere"></div>',
      className: 'absolute pointer-events-none',
      style: {
        width: `${sphereSize}px`,
        height: `${sphereSize}px`,
        borderRadius: '50%',
        background:
          'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 30%, transparent 70%)',
        mixBlendMode: 'overlay',
        willChange: 'transform, border-radius, opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: reflectionEffects.map((data, index) => ({
      id: `reflection-effect-${index}`,
      componentId: 'generic',
      data,
    })),
  };

  const lensingOverlay: RenderableComponentData = {
    id: 'lensing-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div class="lensing-effect"></div>',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        background:
          'radial-gradient(circle at center, transparent 35%, rgba(0,0,0,0.1) 45%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.6) 80%)',
        mixBlendMode: 'multiply',
        willChange: 'opacity',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: lensingEffects.map((data, index) => ({
      id: `lensing-effect-${index}`,
      componentId: 'generic',
      data,
    })),
  };

  const sphereTransformStage: RenderableComponentData = {
    id: 'sphere-transform-stage',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center',
        style: {
          transformStyle: 'preserve-3d',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      videoSphere1Container,
      videoSphere2Container,
      reflectionLayer,
      lensingOverlay,
    ],
  };

  const rootContainer: RenderableComponentData = {
    id: 'sphere-morph-root-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
        style: {
          perspective: '900px',
          perspectiveOrigin: 'center center',
          backgroundColor: '#000000',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [sphereTransformStage],
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
  id: 'sphere-morph-transition',
  title: '3D Sphere Morph Video Transition',
  description:
    'Advanced video transition where content morphs between spherical and geometric shapes with 3D transforms, environmental reflections, and gravitational lensing effects',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'video',
    '3d',
    'sphere',
    'morph',
    'effects',
    'advanced',
  ],
  defaultInputParams: {
    video1: 'https://example.com/video1.mp4',
    video2: 'https://example.com/video2.mp4',
    transitionDuration: 2,
    sphereSize: 500,
    rotationIntensity: 180,
    lensDistortion: 0.5,
    reflectionIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const sphereMorphTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
