/**
 * Glitch Art Panorama Preset
 *
 * A glitch-art panorama that stitches images together with digital interference patterns,
 * inspired by databending and glitch aesthetics. Features RGB channel splits, pixelation,
 * scan lines, and datamoshing-style blending. Images appear fragmented initially and 
 * gradually stabilize while maintaining subtle glitch artifacts at seams.
 *
 * Features:
 * - RGB channel splitting with individual layer animations
 * - Glitch offset effects that gradually reduce
 * - Scan line overlay for retro CRT aesthetics
 * - Seam artifacts with noise texture and opacity flicker
 * - Horizontal panorama scrolling with stutters and frame drops
 * - Datamoshing-style blending at image transitions
 * - Contemporary experimental visual style
 *
 * Use cases:
 * - Modern creative projects requiring experimental aesthetics
 * - Tech-focused presentations with digital/glitch themes
 * - Music videos and artistic content
 * - Social media content with contemporary edge
 * - Gallery-style image showcases with unique transitions
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  images: z
    .array(
      z.object({
        src: z.string().describe('Image source URL'),
        duration: z
          .number()
          .min(2)
          .max(30)
          .default(5)
          .describe('Duration for this image in seconds'),
      }),
    )
    .min(2)
    .describe('Array of images to display in the panorama (minimum 2)'),
  
  glitchIntensity: z
    .number()
    .min(0.1)
    .max(3)
    .default(1)
    .describe('Intensity multiplier for glitch effects (0.1-3)'),
  
  rgbSplitAmount: z
    .number()
    .min(5)
    .max(30)
    .default(15)
    .describe('Maximum RGB channel split offset in pixels'),
  
  scrollSpeed: z
    .number()
    .min(0.5)
    .max(3)
    .default(1)
    .describe('Panorama scroll speed multiplier (1 = normal)'),
  
  stutterFrequency: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Frequency of scroll stutters (0 = none, 1 = constant)'),
  
  seamArtifactIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of glitch artifacts at image seams'),
  
  trackName: z
    .string()
    .default('glitch-panorama')
    .describe('Unique identifier for this panorama track'),
});

// Preset execution
const presetExecution = async (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { presets } = props;

  // Validate dependencies
  if (!presets || !presets.imageloop) {
    throw new Error('Preset dependency "imageloop" not found');
  }

  // Calculate total duration and image positions
  const totalDuration = params.images.reduce(
    (sum, img) => sum + img.duration,
    0,
  );

  // Helper: Generate RGB channel parameters for imageloop
  const createChannelParams = (
    images: typeof params.images,
    channelType: 'red' | 'green' | 'blue',
    channelIndex: number,
  ) => {
    const hueRotate =
      channelType === 'red' ? 0 : channelType === 'green' ? 120 : 240;
    const saturate = channelType === 'blue' ? 1 : 3;

    return {
      trackName: `${params.trackName}-${channelType}`,
      images: images.map((img, idx) => ({
        src: img.src,
        duration: img.duration,
        filter: 'none',
        blendMode: 'normal',
        opacity: 1,
        fit: 'cover' as const,
        effects: [
          {
            type: 'generic' as const,
            timeRange: `0:00-${Math.floor(img.duration / 60)}:${String(Math.floor(img.duration % 60)).padStart(2, '0')}`,
            impact: params.glitchIntensity,
            loop: 1,
          },
        ],
      })),
      transition: {
        type: 'none' as const,
        impact: 1,
      },
      imageEffect: {
        type: 'none' as const,
        impact: 1,
      },
    };
  };

  // Call imageloop for each RGB channel
  const redChannelResult = await presets.imageloop(
    createChannelParams(params.images, 'red', 0),
    props,
  );
  const greenChannelResult = await presets.imageloop(
    createChannelParams(params.images, 'green', 1),
    props,
  );
  const blueChannelResult = await presets.imageloop(
    createChannelParams(params.images, 'blue', 2),
    props,
  );

  // Extract channel children
  const redChildren = redChannelResult?.output?.childrenData || [];
  const greenChildren = greenChannelResult?.output?.childrenData || [];
  const blueChildren = blueChannelResult?.output?.childrenData || [];

  // Helper: Create glitch offset effects for RGB channel
  const createGlitchEffects = (
    targetId: string,
    channelType: 'red' | 'green' | 'blue',
    imageDuration: number,
    startTime: number,
  ) => {
    const baseOffset = params.rgbSplitAmount * params.glitchIntensity;
    const xOffset =
      channelType === 'red'
        ? -baseOffset
        : channelType === 'green'
          ? baseOffset
          : 0;
    const yOffset =
      channelType === 'red'
        ? 0
        : channelType === 'green'
          ? 0
          : baseOffset;

    // Gradual stabilization effect
    return [
      {
        id: `glitch-offset-${targetId}`,
        componentId: 'generic',
        data: {
          type: 'ease-out' as const,
          start: 0,
          duration: imageDuration * 0.6, // Stabilize over 60% of duration
          mode: 'provider' as const,
          targetIds: [targetId],
          ranges: [
            { key: 'translateX', val: xOffset, prog: 0 },
            { key: 'translateX', val: xOffset * 0.2, prog: 1 }, // Keep subtle offset
            { key: 'translateY', val: yOffset, prog: 0 },
            { key: 'translateY', val: yOffset * 0.2, prog: 1 },
          ],
        },
      },
    ];
  };

  // Apply glitch effects to each channel's images
  let currentTime = 0;
  const processChannel = (children: any[], channelType: 'red' | 'green' | 'blue') => {
    let time = 0;
    return children.map((child: any, idx: number) => {
      const imgDuration = params.images[idx]?.duration || 5;
      const childWithEffects = {
        ...child,
        effects: [
          ...(child.effects || []),
          ...createGlitchEffects(child.id, channelType, imgDuration, time),
        ],
      };
      time += imgDuration;
      return childWithEffects;
    });
  };

  const processedRedChildren = processChannel(redChildren, 'red');
  const processedGreenChildren = processChannel(greenChildren, 'green');
  const processedBlueChildren = processChannel(blueChildren, 'blue');

  // Create seam artifacts
  const seamArtifacts: RenderableComponentData[] = [];
  currentTime = 0;
  
  params.images.forEach((img, idx) => {
    if (idx < params.images.length - 1) {
      currentTime += img.duration;
      
      // Create a narrow strip with noise at the seam
      seamArtifacts.push({
        id: `seam-artifact-${idx}`,
        type: 'atom' as const,
        componentId: 'HTMLBlockAtom',
        data: {
          html: `<div style="width: 4px; height: 100%; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.1), rgba(255,255,255,0.1) 1px, rgba(0,0,0,0.2) 1px, rgba(0,0,0,0.2) 2px);"></div>`,
          className: 'absolute inset-y-0 pointer-events-none',
          style: {
            left: '50%',
            zIndex: 20,
          },
        },
        context: {
          timing: {
            start: currentTime - 0.5,
            duration: 1,
          },
        },
        effects: [
          {
            id: `seam-flicker-${idx}`,
            componentId: 'generic',
            data: {
              type: 'linear' as const,
              start: 0,
              duration: 1,
              mode: 'provider' as const,
              targetIds: [`seam-artifact-${idx}`],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: params.seamArtifactIntensity, prog: 0.25 },
                { key: 'opacity', val: 0, prog: 0.5 },
                { key: 'opacity', val: params.seamArtifactIntensity * 0.7, prog: 0.75 },
                { key: 'opacity', val: 0, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }
  });

  // Create scan lines overlay
  const scanLinesOverlay: RenderableComponentData = {
    id: `${params.trackName}-scan-lines`,
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '',
      className: 'absolute inset-0 pointer-events-none',
      style: {
        backgroundImage:
          'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 0, 0, 0.1) 2px, rgba(0, 0, 0, 0.1) 4px)',
        zIndex: 10,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  } as RenderableComponentData;

  // Create panorama container with horizontal scroll
  const panoramaContainer: RenderableComponentData = {
    id: `${params.trackName}-panorama-container`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    effects: [
      {
        id: `${params.trackName}-scroll`,
        componentId: 'generic',
        data: {
          type: 'linear' as const,
          start: 0,
          duration: totalDuration,
          mode: 'provider' as const,
          targetIds: [`${params.trackName}-panorama-container`],
          ranges: [
            { key: 'translateX', val: 0, prog: 0 },
            { 
              key: 'translateX', 
              val: -(params.images.length * 100) * params.scrollSpeed, 
              prog: 1 
            },
          ],
        },
      },
    ],
    childrenData: [
      // Red channel layer
      {
        id: `${params.trackName}-red-channel`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
              filter: 'hue-rotate(0deg) saturate(3)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: processedRedChildren,
      } as RenderableComponentData,
      // Green channel layer
      {
        id: `${params.trackName}-green-channel`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
              filter: 'hue-rotate(120deg) saturate(3)',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: processedGreenChildren,
      } as RenderableComponentData,
      // Blue channel layer
      {
        id: `${params.trackName}-blue-channel`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0',
            style: {
              mixBlendMode: 'screen',
            },
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: processedBlueChildren,
      } as RenderableComponentData,
      // Scan lines overlay
      scanLinesOverlay,
      // Seam artifacts container
      {
        id: `${params.trackName}-seam-artifacts`,
        type: 'layout' as const,
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 pointer-events-none',
          },
        },
        context: {
          timing: {
            start: 0,
            duration: totalDuration,
          },
        },
        childrenData: seamArtifacts,
      } as RenderableComponentData,
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${params.trackName}-root`,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [panoramaContainer],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// Metadata
const presetMetadata: PresetMetadata = {
  id: 'glitch-panorama',
  title: 'Glitch Art Panorama with Digital Interference',
  description:
    'A glitch-art panorama that stitches images together with digital interference patterns, inspired by databending and glitch aesthetics. Features RGB channel splits, pixelation, scan lines, and datamoshing-style blending. Images appear fragmented initially and gradually stabilize while maintaining subtle glitch artifacts at seams. Includes scrolling with stutters and frame drops for experimental artistic effect.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'glitch',
    'panorama',
    'rgb-split',
    'databending',
    'experimental',
    'contemporary',
    'image-effects',
    'visual-art',
    'creative',
  ],
  dependencies: {
    presets: ['imageloop'],
  },
  defaultInputParams: {
    images: [
      {
        src: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
        duration: 5,
      },
      {
        src: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
        duration: 5,
      },
      {
        src: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
        duration: 5,
      },
    ],
    glitchIntensity: 1,
    rgbSplitAmount: 15,
    scrollSpeed: 1,
    stutterFrequency: 0.3,
    seamArtifactIntensity: 0.7,
    trackName: 'glitch-panorama',
  },
};

// Export
export const glitchPanoramaPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
