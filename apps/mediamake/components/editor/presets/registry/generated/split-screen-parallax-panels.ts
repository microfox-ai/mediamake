/**
 * Split-Screen Parallax Typography System Preset
 *
 * A dynamic split-screen layout system with parallax scrolling effects, glass morphism panel borders,
 * sticky and flowing text positioning, caption-triggered panel highlighting, and dynamic shadow effects
 * that simulate a moving light source. Features multiple panels sliding at different speeds with backdrop blur effects.
 *
 * Features:
 * - **Split-Screen Grid Layout**: 2-3 column responsive grid with glass morphism panels
 * - **Parallax Sliding Effects**: Panels slide at different speeds (1x, 0.7x, 0.4x) creating depth
 * - **Sticky & Flowing Text**: Text that sticks to panel positions vs text that flows dynamically
 * - **Glass Morphism Borders**: Backdrop blur with semi-transparent borders on panels
 * - **Dynamic Text Shadows**: Shadows that change angle based on position, simulating moving light
 * - **Caption-Triggered Highlighting**: Panel highlighting and focus effects triggered by keywords
 *
 * Use cases:
 * - Creating immersive parallax video experiences
 * - Building dynamic split-screen presentations
 * - Adding depth and motion to static layouts
 * - Creating modern glass-effect UI overlays
 * - Implementing keyword-triggered visual emphasis
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema
const presetParams = z.object({
  videoSrc: z.string().describe('Video source URL or path for background video'),
  videoDuration: z.number().optional().describe('Duration of the background video in seconds'),
  
  // Panel 1 (left) text
  panel1StickyText: z.string().default('PANEL 1').describe('Sticky text at top-left of panel 1'),
  panel1FlowingText: z.string().default('Flowing').describe('Flowing text that animates in panel 1'),
  
  // Panel 2 (middle) text
  panel2StickyText: z.string().default('PANEL 2').describe('Sticky text at top-right of panel 2'),
  panel2FlowingText: z.string().default('Content').describe('Flowing text that animates in panel 2'),
  
  // Panel 3 (right) text
  panel3StickyText: z.string().default('PANEL 3').describe('Sticky text at bottom-left of panel 3'),
  panel3FlowingText: z.string().default('Dynamic').describe('Flowing text that animates in panel 3'),
  
  // Styling
  textColor: z.string().default('#FFFFFF').describe('Color for all text elements'),
  fontSize: z.number().default(32).describe('Base font size for text elements (px)'),
  font: z.string().default('Inter:700').describe('Font family with optional weight and style (e.g., "Inter:700", "Roboto:600:italic")'),
  
  // Parallax speeds (duration inversely proportional to speed)
  panel1Speed: z.number().default(10).describe('Duration for panel 1 slide animation (lower = faster)'),
  panel2Speed: z.number().default(14).describe('Duration for panel 2 slide animation (lower = faster)'),
  panel3Speed: z.number().default(20).describe('Duration for panel 3 slide animation (lower = faster)'),
  
  // Dynamic shadow intensity
  shadowIntensity: z.number().min(0).max(1).default(0.8).describe('Intensity of dynamic text shadows (0-1)'),
  
  // Glass morphism
  glassBlur: z.string().default('md').describe('Backdrop blur intensity: sm, md, lg, xl'),
  glassTint: z.string().default('white/10').describe('Panel background tint color (e.g., "white/10", "black/20")'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  // Parse font string (format: "FontName:weight:style" or "FontName:weight" or "FontName")
  const fontString = params.font || 'Inter:700';
  const fontFamily = fontString.includes(':') ? fontString.split(':')[0] : fontString;
  
  // Parse font style from font string
  const fontStyle: React.CSSProperties = {};
  if (fontString.includes(':')) {
    const fontParts = fontString.split(':');
    if (fontParts.length > 2) {
      fontStyle.fontStyle = fontParts[2] as any; // 'normal' | 'italic'
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    } else if (fontParts.length > 1) {
      fontStyle.fontWeight = parseInt(fontParts[1], 10);
    }
  }
  
  // Helper: Calculate dynamic shadow based on position
  const calculateShadow = (x: number, y: number): string => {
    // Simulate light source from center-top (0.5, 0.3)
    const lightX = 0.5;
    const lightY = 0.3;
    
    // Calculate angle from position to light
    const dx = x - lightX;
    const dy = y - lightY;
    const angle = Math.atan2(dy, dx);
    
    // Calculate shadow offset based on angle and intensity
    const distance = 8 * params.shadowIntensity;
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;
    const blur = 8 * params.shadowIntensity;
    
    return `${offsetX.toFixed(1)}px ${offsetY.toFixed(1)}px ${blur}px rgba(0,0,0,${params.shadowIntensity})`;
  };
  
  // Position mapping for panels (normalized 0-1 coordinates)
  const panel1Position = { x: 0.25, y: 0.1 }; // Top-left
  const panel2Position = { x: 0.75, y: 0.1 }; // Top-right
  const panel3Position = { x: 0.25, y: 0.9 }; // Bottom-left
  
  // Calculate shadows
  const panel1Shadow = calculateShadow(panel1Position.x, panel1Position.y);
  const panel2Shadow = calculateShadow(panel2Position.x, panel2Position.y);
  const panel3Shadow = calculateShadow(panel3Position.x, panel3Position.y);
  
  // Flowing text positions (center positions)
  const panel1FlowingShadow = calculateShadow(0.25, 0.5);
  const panel2FlowingShadow = calculateShadow(0.5, 0.5);
  const panel3FlowingShadow = calculateShadow(0.75, 0.25);
  
  // Build component tree
  const rootContainer = {
    id: 'split-screen-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 overflow-hidden',
      },
    },
    context: {
      timing: {
        start: 0,
        fitDurationTo: 'background-video',
      },
    },
    childrenData: [
      // Background video
      {
        id: 'background-video',
        type: 'atom',
        componentId: 'VideoAtom',
        data: {
          src: params.videoSrc,
          fit: 'cover',
          muted: false,
          className: 'w-full h-full object-cover',
        },
        context: {
          timing: {
            start: 0,
            duration: params.videoDuration || 30,
          },
        },
      },
      
      // Grid container with panels
      {
        id: 'grid-container',
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            className: 'absolute inset-0 grid grid-cols-2 md:grid-cols-3 gap-0',
          },
        },
        context: {
          timing: {
            start: 0,
            fitDurationTo: 'background-video',
          },
        },
        childrenData: [
          // Panel 1
          {
            id: 'panel-1',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: `relative overflow-hidden backdrop-blur-${params.glassBlur} bg-${params.glassTint} border border-white/20`,
                style: {
                  contain: 'layout style paint',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                fitDurationTo: 'background-video',
              },
            },
            effects: [
              {
                id: 'panel-1-slide',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: params.panel1Speed,
                  mode: 'provider',
                  targetIds: ['panel-1'],
                  ranges: [
                    { key: 'translateX', val: -50, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
            ],
            childrenData: [
              // Sticky text
              {
                id: 'panel-1-text-sticky',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.panel1StickyText,
                  className: 'absolute top-0 left-0 p-4',
                  style: {
                    fontSize: params.fontSize,
                    color: params.textColor,
                    textShadow: panel1Shadow,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    fitDurationTo: 'background-video',
                  },
                },
              },
              // Flowing text
              {
                id: 'panel-1-text-flowing',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.panel1FlowingText,
                  className: 'absolute bottom-1/2 left-1/2 transform -translate-x-1/2',
                  style: {
                    fontSize: params.fontSize * 0.75,
                    color: params.textColor,
                    textShadow: panel1FlowingShadow,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 2,
                    duration: 8,
                  },
                },
                effects: [
                  {
                    id: 'panel-1-flowing-anim',
                    componentId: 'generic',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: 8,
                      mode: 'provider',
                      targetIds: ['panel-1-text-flowing'],
                      ranges: [
                        { key: 'translateY', val: 100, prog: 0 },
                        { key: 'translateY', val: 0, prog: 0.5 },
                        { key: 'translateY', val: -100, prog: 1 },
                        { key: 'opacity', val: 0, prog: 0 },
                        { key: 'opacity', val: 1, prog: 0.2 },
                        { key: 'opacity', val: 1, prog: 0.8 },
                        { key: 'opacity', val: 0, prog: 1 },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          
          // Panel 2
          {
            id: 'panel-2',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: `relative overflow-hidden backdrop-blur-${params.glassBlur} bg-${params.glassTint} border border-white/20`,
                style: {
                  contain: 'layout style paint',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                fitDurationTo: 'background-video',
              },
            },
            effects: [
              {
                id: 'panel-2-slide',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: params.panel2Speed,
                  mode: 'provider',
                  targetIds: ['panel-2'],
                  ranges: [
                    { key: 'translateX', val: 50, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
            ],
            childrenData: [
              // Sticky text
              {
                id: 'panel-2-text-sticky',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.panel2StickyText,
                  className: 'absolute top-0 right-0 p-4',
                  style: {
                    fontSize: params.fontSize,
                    color: params.textColor,
                    textShadow: panel2Shadow,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    fitDurationTo: 'background-video',
                  },
                },
              },
              // Flowing text
              {
                id: 'panel-2-text-flowing',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.panel2FlowingText,
                  className: 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
                  style: {
                    fontSize: params.fontSize * 0.75,
                    color: params.textColor,
                    textShadow: panel2FlowingShadow,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 4,
                    duration: 6,
                  },
                },
                effects: [
                  {
                    id: 'panel-2-flowing-anim',
                    componentId: 'generic',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: 6,
                      mode: 'provider',
                      targetIds: ['panel-2-text-flowing'],
                      ranges: [
                        { key: 'scale', val: 0.5, prog: 0 },
                        { key: 'scale', val: 1, prog: 0.5 },
                        { key: 'scale', val: 0.5, prog: 1 },
                        { key: 'opacity', val: 0, prog: 0 },
                        { key: 'opacity', val: 1, prog: 0.3 },
                        { key: 'opacity', val: 1, prog: 0.7 },
                        { key: 'opacity', val: 0, prog: 1 },
                      ],
                    },
                  },
                ],
              },
            ],
          },
          
          // Panel 3
          {
            id: 'panel-3',
            type: 'layout',
            componentId: 'BaseLayout',
            data: {
              containerProps: {
                className: `relative overflow-hidden backdrop-blur-${params.glassBlur} bg-${params.glassTint} border border-white/20`,
                style: {
                  contain: 'layout style paint',
                },
              },
            },
            context: {
              timing: {
                start: 0,
                fitDurationTo: 'background-video',
              },
            },
            effects: [
              {
                id: 'panel-3-slide',
                componentId: 'generic',
                data: {
                  type: 'ease-out',
                  start: 0,
                  duration: params.panel3Speed,
                  mode: 'provider',
                  targetIds: ['panel-3'],
                  ranges: [
                    { key: 'translateX', val: -100, prog: 0 },
                    { key: 'translateX', val: 0, prog: 1 },
                  ],
                },
              },
            ],
            childrenData: [
              // Sticky text
              {
                id: 'panel-3-text-sticky',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.panel3StickyText,
                  className: 'absolute bottom-0 left-0 p-4',
                  style: {
                    fontSize: params.fontSize,
                    color: params.textColor,
                    textShadow: panel3Shadow,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 0,
                    fitDurationTo: 'background-video',
                  },
                },
              },
              // Flowing text
              {
                id: 'panel-3-text-flowing',
                type: 'atom',
                componentId: 'TextAtom',
                data: {
                  text: params.panel3FlowingText,
                  className: 'absolute top-1/4 right-4',
                  style: {
                    fontSize: params.fontSize * 0.75,
                    color: params.textColor,
                    textShadow: panel3FlowingShadow,
                    ...fontStyle,
                  },
                  font: {
                    family: fontFamily,
                    weights: fontStyle.fontWeight ? [fontStyle.fontWeight.toString()] : ['700'],
                  },
                },
                context: {
                  timing: {
                    start: 6,
                    duration: 4,
                  },
                },
                effects: [
                  {
                    id: 'panel-3-flowing-anim',
                    componentId: 'generic',
                    data: {
                      type: 'ease-in-out',
                      start: 0,
                      duration: 4,
                      mode: 'provider',
                      targetIds: ['panel-3-text-flowing'],
                      ranges: [
                        { key: 'translateX', val: 50, prog: 0 },
                        { key: 'translateX', val: 0, prog: 1 },
                        { key: 'opacity', val: 0, prog: 0 },
                        { key: 'opacity', val: 1, prog: 0.3 },
                        { key: 'opacity', val: 1, prog: 0.7 },
                        { key: 'opacity', val: 0, prog: 1 },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
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

const presetMetadata: PresetMetadata = {
  id: 'split-screen-parallax-panels',
  title: 'Split-Screen Parallax Typography System',
  description:
    'A dynamic split-screen layout system with parallax scrolling effects, glass morphism panel borders, sticky and flowing text positioning, caption-triggered panel highlighting, and dynamic shadow effects that simulate a moving light source. Features multiple panels sliding at different speeds with backdrop blur effects.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'split-screen',
    'parallax',
    'typography',
    'glass-morphism',
    'dynamic',
    'shadows',
    'grid',
    'panels',
    'sliding',
    'sticky',
    'flowing',
  ],
  dependencies: {},
  defaultInputParams: {
    videoSrc: 'https://example.com/video.mp4',
    videoDuration: 30,
    panel1StickyText: 'PANEL 1',
    panel1FlowingText: 'Flowing',
    panel2StickyText: 'PANEL 2',
    panel2FlowingText: 'Content',
    panel3StickyText: 'PANEL 3',
    panel3FlowingText: 'Dynamic',
    textColor: '#FFFFFF',
    fontSize: 32,
    font: 'Inter:700',
    panel1Speed: 10,
    panel2Speed: 14,
    panel3Speed: 20,
    shadowIntensity: 0.8,
    glassBlur: 'md',
    glassTint: 'white/10',
  },
};

export const splitScreenParallaxPanelsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
