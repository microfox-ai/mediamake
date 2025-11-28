/**
 * Analog-Digital Glitch Transition Preset
 *
 * Creates a hybrid analog-digital glitch transition reminiscent of broadcast signal disruption.
 * Features vertical rolling scan lines, horizontal image tears, rainbow static noise, phosphor trails,
 * and CRT barrel distortion. Simulates the aesthetic of a TV signal fighting between analog and digital transmission.
 *
 * Effects:
 * - Vertical rolling scan lines using repeating-linear-gradient background animation
 * - Horizontal image tears at random positions with instant jumps (steps easing)
 * - Rainbow static noise overlay that intensifies during tears
 * - Phosphor trail ghosting effects where bright areas leave afterimages
 * - CRT curve distortion using perspective and rotateY transforms
 * - Barrel distortion that warps during glitch peak
 *
 * Timing:
 * - Scan lines: 0.5s continuous loop
 * - Image tears: Occur at 0.3s, 0.7s, 1.2s with 0.05s duration each
 * - Total transition duration: 1.5s
 * - All effects use CSS transforms for optimal performance
 *
 * Use cases:
 * - Retro/vintage video transitions
 * - Tech glitch aesthetics for music videos
 * - Broadcast-style scene transitions
 * - Digital corruption effects
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  imageSrc: z.string().describe('Source URL or path of the image to transition'),
  transitionDuration: z
    .number()
    .default(1.5)
    .describe('Total duration of the glitch transition in seconds'),
  scanLineSpeed: z
    .number()
    .default(0.5)
    .describe('Duration of one scan line roll cycle in seconds'),
  tearIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.8)
    .describe('Intensity of horizontal tears (0-1, affects displacement distance)'),
  crtDistortionAmount: z
    .number()
    .min(0)
    .max(1)
    .default(0.6)
    .describe('Amount of CRT barrel distortion (0-1)'),
  staticIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.7)
    .describe('Intensity of rainbow static noise (0-1)'),
  phosphorTrailOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Maximum opacity of phosphor trail layers (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    imageSrc,
    transitionDuration,
    scanLineSpeed,
    tearIntensity,
    crtDistortionAmount,
    staticIntensity,
    phosphorTrailOpacity,
  } = params;

  // Calculate tear positions (random Y positions for horizontal tear lines)
  const tearPositions = [33, 55, 78]; // Percentage positions
  
  // Calculate tear displacement based on intensity
  const maxTearDisplacement = 50 * tearIntensity; // pixels
  
  // Calculate CRT distortion values
  const crtPerspective = 1000 - (crtDistortionAmount * 500); // 1000-500px
  const crtRotateY = crtDistortionAmount * 5; // 0-5 degrees

  // Phosphor trail layers (3 layers with decreasing opacity)
  const phosphorTrails: RenderableComponentData[] = [
    {
      id: 'phosphor-trail-3',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          opacity: phosphorTrailOpacity * 0.33, // Lowest opacity
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'phosphor-trail-3-delay',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['phosphor-trail-3'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${maxTearDisplacement * 0.3}px`, prog: 0.3 },
              { key: 'translateX', val: 0, prog: 0.35 },
              { key: 'translateX', val: `${-maxTearDisplacement * 0.3}px`, prog: 0.7 },
              { key: 'translateX', val: 0, prog: 0.75 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'phosphor-trail-2',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          opacity: phosphorTrailOpacity * 0.66, // Medium opacity
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'phosphor-trail-2-delay',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['phosphor-trail-2'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${maxTearDisplacement * 0.5}px`, prog: 0.3 },
              { key: 'translateX', val: 0, prog: 0.35 },
              { key: 'translateX', val: `${-maxTearDisplacement * 0.5}px`, prog: 0.7 },
              { key: 'translateX', val: 0, prog: 0.75 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
    {
      id: 'phosphor-trail-1',
      type: 'atom',
      componentId: 'ImageAtom',
      data: {
        src: imageSrc,
        className: 'absolute inset-0 w-full h-full object-cover',
        style: {
          mixBlendMode: 'screen',
          opacity: phosphorTrailOpacity, // Highest opacity
        },
      },
      context: {
        timing: {
          start: 0,
          duration: transitionDuration,
        },
      },
      effects: [
        {
          id: 'phosphor-trail-1-delay',
          componentId: 'generic',
          data: {
            type: 'linear',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: ['phosphor-trail-1'],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: `${maxTearDisplacement * 0.7}px`, prog: 0.3 },
              { key: 'translateX', val: 0, prog: 0.35 },
              { key: 'translateX', val: `${-maxTearDisplacement * 0.7}px`, prog: 0.7 },
              { key: 'translateX', val: 0, prog: 0.75 },
            ],
          },
        },
      ],
    } as RenderableComponentData,
  ];

  // Main image with tears and CRT distortion
  const mainImage: RenderableComponentData = {
    id: 'main-image',
    type: 'atom',
    componentId: 'ImageAtom',
    data: {
      src: imageSrc,
      className: 'absolute inset-0 w-full h-full object-cover',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      // Horizontal tears at 0.3s, 0.7s, 1.2s
      {
        id: 'tear-effect',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['main-image'],
          ranges: [
            // Tear 1 at 0.3s (20% progress)
            { key: 'translateX', val: 0, prog: 0 },
            { key: 'translateX', val: 0, prog: 0.19 },
            { key: 'translateX', val: `${maxTearDisplacement}px`, prog: 0.20 },
            { key: 'translateX', val: `${maxTearDisplacement}px`, prog: 0.233 },
            { key: 'translateX', val: 0, prog: 0.234 },
            
            // Tear 2 at 0.7s (46.7% progress)
            { key: 'translateX', val: 0, prog: 0.46 },
            { key: 'translateX', val: `${-maxTearDisplacement}px`, prog: 0.467 },
            { key: 'translateX', val: `${-maxTearDisplacement}px`, prog: 0.50 },
            { key: 'translateX', val: 0, prog: 0.501 },
            
            // Tear 3 at 1.2s (80% progress)
            { key: 'translateX', val: 0, prog: 0.79 },
            { key: 'translateX', val: `${maxTearDisplacement * 0.8}px`, prog: 0.80 },
            { key: 'translateX', val: `${maxTearDisplacement * 0.8}px`, prog: 0.833 },
            { key: 'translateX', val: 0, prog: 0.834 },
            { key: 'translateX', val: 0, prog: 1 },
          ],
        },
      },
      // CRT barrel distortion
      {
        id: 'crt-distortion',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['main-image'],
          ranges: [
            { key: 'perspective', val: `${crtPerspective}px`, prog: 0 },
            { key: 'perspective', val: `${crtPerspective - 200}px`, prog: 0.5 },
            { key: 'perspective', val: `${crtPerspective}px`, prog: 1 },
            { key: 'rotateY', val: 0, prog: 0 },
            { key: 'rotateY', val: crtRotateY, prog: 0.3 },
            { key: 'rotateY', val: -crtRotateY, prog: 0.7 },
            { key: 'rotateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Tear line overlays (white horizontal lines at tear positions)
  const tearLines: RenderableComponentData[] = tearPositions.map((pos, idx) => ({
    id: `tear-line-${idx + 1}`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 1px; background: rgba(255, 255, 255, 0.5);"></div>`,
      className: 'absolute w-full pointer-events-none',
      style: {
        top: `${pos}%`,
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: `tear-line-flash-${idx + 1}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [`tear-line-${idx + 1}`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0, prog: 0.19 + (idx * 0.267) },
            { key: 'opacity', val: 1, prog: 0.20 + (idx * 0.267) },
            { key: 'opacity', val: 1, prog: 0.233 + (idx * 0.267) },
            { key: 'opacity', val: 0, prog: 0.234 + (idx * 0.267) },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData));

  // Scan line overlay (repeating horizontal lines that roll vertically)
  const scanLineOverlay: RenderableComponentData = {
    id: 'scan-line-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.15) 0px, transparent 1px, transparent 2px, rgba(0, 0, 0, 0.15) 3px); pointer-events: none;"></div>`,
      className: 'absolute inset-0 w-full h-full pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'scan-line-roll',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['scan-line-overlay'],
          ranges: [
            { key: 'translateY', val: '0px', prog: 0 },
            { key: 'translateY', val: '100px', prog: scanLineSpeed / transitionDuration },
            { key: 'translateY', val: '0px', prog: (scanLineSpeed * 2) / transitionDuration },
            { key: 'translateY', val: '100px', prog: (scanLineSpeed * 3) / transitionDuration },
            { key: 'translateY', val: '0px', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Rainbow static noise overlay
  const rainbowStaticOverlay: RenderableComponentData = {
    id: 'rainbow-static-overlay',
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="width: 100%; height: 100%; background: radial-gradient(circle at 50% 50%, rgba(255, 0, 0, ${staticIntensity * 0.1}), rgba(0, 255, 0, ${staticIntensity * 0.1}), rgba(0, 0, 255, ${staticIntensity * 0.1})); mix-blend-mode: overlay; pointer-events: none;"></div>`,
      className: 'absolute inset-0 w-full h-full pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    effects: [
      {
        id: 'rainbow-static-intensity',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['rainbow-static-overlay'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: staticIntensity, prog: 0.2 },
            { key: 'opacity', val: 0.3, prog: 0.35 },
            { key: 'opacity', val: staticIntensity, prog: 0.467 },
            { key: 'opacity', val: 0.3, prog: 0.6 },
            { key: 'opacity', val: staticIntensity * 0.8, prog: 0.8 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      },
      {
        id: 'rainbow-hue-rotate',
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: ['rainbow-static-overlay'],
          ranges: [
            { key: 'filter', val: 'hue-rotate(0deg)', prog: 0 },
            { key: 'filter', val: 'hue-rotate(360deg)', prog: 1 },
          ],
        },
      },
    ],
  } as RenderableComponentData;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'analog-digital-glitch-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-black overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: transitionDuration,
      },
    },
    childrenData: [
      ...phosphorTrails,
      mainImage,
      ...tearLines,
      scanLineOverlay,
      rainbowStaticOverlay,
    ],
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
  id: 'analog-digital-glitch-transition',
  title: 'Analog-Digital Glitch Transition',
  description:
    'A hybrid analog-digital glitch transition featuring vertical rolling scan lines, horizontal image tears with rainbow static noise, CRT barrel distortion, and phosphor trail ghosting effects. Creates the aesthetic of a broadcast signal fighting between analog and digital transmission modes.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'transition',
    'glitch',
    'analog',
    'digital',
    'crt',
    'scanline',
    'phosphor',
    'retro',
    'tv',
    'broadcast',
  ],
  defaultInputParams: {
    imageSrc: 'https://images.unsplash.com/photo-1557683316-973673baf926',
    transitionDuration: 1.5,
    scanLineSpeed: 0.5,
    tearIntensity: 0.8,
    crtDistortionAmount: 0.6,
    staticIntensity: 0.7,
    phosphorTrailOpacity: 0.3,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

// Export preset
export const analogDigitalGlitchTransitionPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
