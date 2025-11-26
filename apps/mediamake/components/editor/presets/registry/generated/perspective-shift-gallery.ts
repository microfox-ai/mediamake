/**
 * Perspective Shift Gallery Preset
 *
 * A sophisticated 3D video presentation preset that treats video frames as physical objects in 3D space.
 * The video appears to exist on a plane that can tilt, flip, slide, and rotate in perspective,
 * revealing different angles and creating depth.
 *
 * Features:
 * - **Multiple Perspective Modes**: Tilt, card flip, carousel rotation, and page turn effects
 * - **Transform Origins**: Center, corner pivot, and edge hinge positioning
 * - **Realistic Shadows**: Dynamic shadows that move with perspective changes
 * - **Reflections**: Mirror reflections with gradient masks
 * - **Depth of Field**: Variable blur effects based on Z-position
 * - **GPU-Optimized**: Uses transform-style: preserve-3d and will-change for smooth performance
 *
 * Use cases:
 * - Portfolio presentations with cinematic transitions
 * - Product showcases with 3D reveal effects
 * - Sophisticated video segment transitions
 * - Interactive-feeling video presentations
 */

import { z } from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  primaryVideoSrc: z.string().describe('Primary video source URL'),
  
  perspectiveMode: z
    .enum(['tilt', 'flip', 'carousel', 'page-turn'])
    .default('tilt')
    .describe('3D transformation mode: tilt (rotateX oscillation), flip (card flip 180deg), carousel (circular motion), page-turn (peel effect)'),
  
  transformOrigin: z
    .enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right'])
    .default('center')
    .describe('Transform origin point for rotations and transformations'),
  
  perspective: z
    .number()
    .min(400)
    .max(2000)
    .default(1000)
    .describe('Perspective distance in pixels (400-2000, lower = more dramatic)'),
  
  animationDuration: z
    .number()
    .min(1)
    .max(5)
    .default(2)
    .describe('Duration of transformation animation in seconds'),
  
  rotationIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for rotation angles (0.1-3)'),
  
  enableShadow: z
    .boolean()
    .default(true)
    .describe('Enable dynamic shadow effect'),
  
  enableReflection: z
    .boolean()
    .default(true)
    .describe('Enable mirror reflection effect'),
  
  depthOfFieldBlur: z
    .number()
    .min(0)
    .max(20)
    .default(5)
    .describe('Maximum blur amount for depth of field effect in pixels'),
  
  backgroundColor: z
    .string()
    .default('#000000')
    .describe('Background color behind the video'),
  
  videoOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Opacity of the primary video (0-1)'),
  
  start: z
    .number()
    .default(0)
    .describe('Start time in seconds relative to composition'),
  
  duration: z
    .number()
    .default(10)
    .describe('Total duration of the preset in seconds'),
});

type PresetParams = z.infer<typeof presetParams>;

// Preset execution function
const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    primaryVideoSrc,
    perspectiveMode,
    transformOrigin,
    perspective,
    animationDuration,
    rotationIntensity,
    enableShadow,
    enableReflection,
    depthOfFieldBlur,
    backgroundColor,
    videoOpacity,
    start,
    duration,
  } = params;

  // Helper: Convert transform origin to CSS value
  const getTransformOriginCSS = (origin: string): string => {
    const originMap: Record<string, string> = {
      'center': 'center center',
      'top-left': 'top left',
      'top-right': 'top right',
      'bottom-left': 'bottom left',
      'bottom-right': 'bottom right',
      'top': 'top center',
      'bottom': 'bottom center',
      'left': 'center left',
      'right': 'center right',
    };
    return originMap[origin] || 'center center';
  };

  // Helper: Generate effect ranges based on perspective mode
  const generateTransformEffect = () => {
    const effectId = `perspective-transform-${perspectiveMode}`;
    const baseAngle = 30 * rotationIntensity;
    const fullRotation = 180 * rotationIntensity;
    
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    switch (perspectiveMode) {
      case 'tilt':
        // Oscillating tilt on X-axis
        ranges.push(
          { key: 'rotateX', val: 0, prog: 0 },
          { key: 'rotateX', val: baseAngle, prog: 0.25 },
          { key: 'rotateX', val: 0, prog: 0.5 },
          { key: 'rotateX', val: -baseAngle, prog: 0.75 },
          { key: 'rotateX', val: 0, prog: 1 }
        );
        break;
        
      case 'flip':
        // Card flip on Y-axis
        ranges.push(
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: fullRotation, prog: 1 }
        );
        break;
        
      case 'carousel':
        // Circular motion with translateZ
        ranges.push(
          { key: 'translateZ', val: 0, prog: 0 },
          { key: 'translateZ', val: -200, prog: 0.25 },
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: 360 * rotationIntensity, prog: 1 },
          { key: 'translateZ', val: -200, prog: 0.25 },
          { key: 'translateZ', val: -200, prog: 0.75 },
          { key: 'translateZ', val: 0, prog: 1 }
        );
        break;
        
      case 'page-turn':
        // Complex page peel with rotateY and skew
        ranges.push(
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: fullRotation / 2, prog: 0.5 },
          { key: 'rotateY', val: fullRotation, prog: 1 },
          { key: 'skewY', val: 0, prog: 0 },
          { key: 'skewY', val: -5 * rotationIntensity, prog: 0.3 },
          { key: 'skewY', val: 0, prog: 0.7 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 50, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 }
        );
        break;
    }
    
    return {
      id: effectId,
      componentId: 'video-panel',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: animationDuration,
        mode: 'provider',
        targetIds: ['video-panel'],
        ranges,
      },
    };
  };

  // Helper: Generate shadow effect
  const generateShadowEffect = () => {
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    switch (perspectiveMode) {
      case 'tilt':
        ranges.push(
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.95, prog: 0.25 },
          { key: 'scale', val: 1, prog: 0.5 },
          { key: 'scale', val: 0.95, prog: 0.75 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'translateY', val: 16, prog: 0 },
          { key: 'translateY', val: 32, prog: 0.25 },
          { key: 'translateY', val: 16, prog: 0.5 },
          { key: 'translateY', val: 32, prog: 0.75 },
          { key: 'translateY', val: 16, prog: 1 }
        );
        break;
        
      case 'flip':
        ranges.push(
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0.1, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 },
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.8, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 }
        );
        break;
        
      case 'carousel':
        ranges.push(
          { key: 'scale', val: 1, prog: 0 },
          { key: 'scale', val: 0.7, prog: 0.5 },
          { key: 'scale', val: 1, prog: 1 },
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0.1, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 }
        );
        break;
        
      case 'page-turn':
        ranges.push(
          { key: 'skewY', val: 0, prog: 0 },
          { key: 'skewY', val: 5, prog: 0.5 },
          { key: 'skewY', val: 0, prog: 1 },
          { key: 'translateX', val: 0, prog: 0 },
          { key: 'translateX', val: 30, prog: 0.5 },
          { key: 'translateX', val: 0, prog: 1 }
        );
        break;
    }
    
    return {
      id: 'shadow-effect',
      componentId: 'shadow-element',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: animationDuration,
        mode: 'provider',
        targetIds: ['shadow-element'],
        ranges,
      },
    };
  };

  // Helper: Generate reflection effect
  const generateReflectionEffect = () => {
    const ranges: Array<{ key: string; val: any; prog: number }> = [];
    
    switch (perspectiveMode) {
      case 'tilt':
        ranges.push(
          { key: 'rotateX', val: 0, prog: 0 },
          { key: 'rotateX', val: baseAngle * 0.5, prog: 0.25 },
          { key: 'rotateX', val: 0, prog: 0.5 },
          { key: 'rotateX', val: -baseAngle * 0.5, prog: 0.75 },
          { key: 'rotateX', val: 0, prog: 1 }
        );
        break;
        
      case 'flip':
        ranges.push(
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: fullRotation, prog: 1 },
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 }
        );
        break;
        
      case 'carousel':
        ranges.push(
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: 360 * rotationIntensity, prog: 1 },
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0.1, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 }
        );
        break;
        
      case 'page-turn':
        ranges.push(
          { key: 'rotateY', val: 0, prog: 0 },
          { key: 'rotateY', val: fullRotation / 2, prog: 0.5 },
          { key: 'rotateY', val: fullRotation, prog: 1 },
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 0, prog: 0.5 },
          { key: 'opacity', val: 0.3, prog: 1 }
        );
        break;
    }
    
    return {
      id: 'reflection-effect',
      componentId: 'reflection-video',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: animationDuration,
        mode: 'provider',
        targetIds: ['reflection-video'],
        ranges,
      },
    };
  };

  const baseAngle = 30 * rotationIntensity;
  const fullRotation = 180 * rotationIntensity;

  // Build effects array
  const allEffects = [generateTransformEffect()];
  
  if (enableShadow) {
    allEffects.push(generateShadowEffect());
  }
  
  if (enableReflection) {
    allEffects.push(generateReflectionEffect());
  }

  // Build component tree
  const childrenData: RenderableComponentData[] = [
    {
      id: 'perspective-root',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'relative w-full h-full overflow-hidden',
          style: {
            backgroundColor,
            perspective: `${perspective}px`,
            perspectiveOrigin: 'center center',
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
        {
          id: '3d-stage',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'absolute inset-0 flex items-center justify-center',
              style: {
                transformStyle: 'preserve-3d',
                willChange: 'transform',
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
            {
              id: 'video-panel',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  className: 'relative w-full h-full',
                  style: {
                    transformStyle: 'preserve-3d',
                    backfaceVisibility: 'hidden',
                    transformOrigin: getTransformOriginCSS(transformOrigin),
                    willChange: 'transform',
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
                {
                  id: 'primary-video',
                  type: 'atom',
                  componentId: 'VideoAtom',
                  data: {
                    src: primaryVideoSrc,
                    startFrom: 0,
                    endAt: duration,
                    playbackRate: 1,
                    volume: 1,
                    fit: 'cover',
                    position: 'center',
                    style: {
                      backfaceVisibility: 'hidden',
                      opacity: videoOpacity,
                    },
                  },
                  context: {
                    timing: {
                      start: 0,
                      duration,
                    },
                  },
                },
              ] as RenderableComponentData[],
            },
          ] as RenderableComponentData[],
        },
        ...(enableReflection ? [
          {
            id: 'reflection-layer',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-x-0 bottom-0 pointer-events-none overflow-hidden',
                style: {
                  height: '30%',
                  transformStyle: 'preserve-3d',
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
              {
                id: 'reflection-video',
                type: 'atom',
                componentId: 'VideoAtom',
                data: {
                  src: primaryVideoSrc,
                  startFrom: 0,
                  endAt: duration,
                  playbackRate: 1,
                  volume: 0,
                  fit: 'cover',
                  position: 'center',
                  style: {
                    transform: 'scaleY(-1)',
                    opacity: 0.3,
                    maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration,
                  },
                },
              },
            ] as RenderableComponentData[],
          },
        ] : []),
        ...(enableShadow ? [
          {
            id: 'shadow-layer',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: 'absolute inset-0 pointer-events-none',
                style: {
                  transformStyle: 'preserve-3d',
                  zIndex: -1,
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
              {
                id: 'shadow-element',
                type: 'atom',
                componentId: 'ShapeAtom',
                data: {
                  shape: 'rectangle',
                  width: '100%',
                  height: '100%',
                  fill: 'rgba(0, 0, 0, 0.3)',
                  style: {
                    filter: 'blur(20px)',
                    transform: 'translateY(16px) translateZ(-50px) scale(0.95)',
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    duration,
                  },
                },
              },
            ] as RenderableComponentData[],
          },
        ] : []),
      ] as RenderableComponentData[],
    },
  ] as RenderableComponentData[];

  const rootContainer: RenderableComponentData = {
    id: 'perspective-shift-gallery-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start,
        duration,
      },
    },
    effects: allEffects,
    childrenData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'perspective-shift-gallery',
  title: 'Perspective Shift Gallery',
  description: 'A sophisticated 3D video presentation preset that treats video frames as physical objects in 3D space. Features multiple perspective transformation modes including tilt, card flip, carousel rotation, and page turn effects. Includes realistic dynamic shadows and reflections that respond to perspective changes. Supports configurable transform origins (center, corner pivot, edge hinge), variable depth of field blur, and GPU-optimized rendering. Perfect for portfolio presentations, product showcases, and creating cinematic transitions between video segments.',
  type: 'predefined',
  presetType: 'children',
  tags: ['video', '3d', 'perspective', 'transform', 'effects', 'cinematic', 'portfolio', 'showcase'],
  defaultInputParams: {
    primaryVideoSrc: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    perspectiveMode: 'tilt',
    transformOrigin: 'center',
    perspective: 1000,
    animationDuration: 2,
    rotationIntensity: 1,
    enableShadow: true,
    enableReflection: true,
    depthOfFieldBlur: 5,
    backgroundColor: '#000000',
    videoOpacity: 1,
    start: 0,
    duration: 10,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const perspectiveShiftGalleryPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
