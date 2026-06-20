/**
 * Multi-Panel Video Collage with Focus-Shift Transitions
 *
 * This preset creates a dynamic 2x2 grid video collage where each panel smoothly
 * transitions focus using scale and blur effects. The active panel scales up to 110%
 * with crisp clarity, while non-active panels are scaled down to 100% with blur and
 * subtle vignette effects. Transitions occur with 0.5-second overlaps where the outgoing
 * panel scales down from 110% to 100% with increasing blur (0px to 8px), and the incoming
 * panel scales up from 100% to 110% with decreasing blur (8px to 0px).
 *
 * Features:
 * - 2x2 grid layout with 4 video panels
 * - Focus-shift transitions with scale (100% ↔ 110%) and blur (0px ↔ 8px) effects
 * - 0.5-second overlap periods between panel transitions
 * - Subtle vignette effects on non-focused panels
 * - Dark background with grain texture overlay
 * - Each video plays for 3 seconds with transitions every 2.5 seconds
 * - Total duration: 10.5 seconds (4 videos × 3s - 3 transitions × 0.5s)
 *
 * Use cases:
 * - Creating engaging multi-panel video presentations
 * - Building dynamic video collages with smooth focus transitions
 * - Showcasing multiple video sources with elegant panel switching
 * - Creating cinematic multi-view video experiences
 */

import z from 'zod';
import type { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  videos: z
    .array(
      z.object({
        src: z.string().describe('Video source URL'),
        duration: z.number().default(3).describe('Duration of video in seconds'),
      })
    )
    .length(4)
    .describe('Array of exactly 4 video sources for the 2x2 grid'),
  transitionDuration: z
    .number()
    .min(0.1)
    .max(2)
    .default(0.5)
    .describe('Duration of overlap transition in seconds'),
  focusScale: z
    .number()
    .min(1)
    .max(1.5)
    .default(1.1)
    .describe('Scale of focused panel (default: 1.1 = 110%)'),
  blurAmount: z
    .number()
    .min(0)
    .max(20)
    .default(8)
    .describe('Blur amount for non-focused panels in pixels'),
  videoDuration: z
    .number()
    .min(1)
    .max(10)
    .default(3)
    .describe('Duration each video panel plays in seconds'),
  vignetteIntensity: z
    .number()
    .min(0)
    .max(1)
    .default(0.4)
    .describe('Intensity of vignette effect on non-focused panels (0-1)'),
});

type PresetParams = z.infer<typeof presetParams>;

const presetExecution = (
  params: PresetParams,
  props: PresetPassedProps
): PresetOutput => {
  const {
    videos,
    transitionDuration,
    focusScale,
    blurAmount,
    videoDuration,
    vignetteIntensity,
  } = params;

  // Calculate total duration: (4 videos × videoDuration) - (3 transitions × transitionDuration)
  const totalDuration = videos.length * videoDuration - (videos.length - 1) * transitionDuration;

  // Panel positions in 2x2 grid
  const panelPositions = [
    { top: '0', left: '0' }, // Top-left
    { top: '0', right: '0' }, // Top-right
    { bottom: '0', left: '0' }, // Bottom-left
    { bottom: '0', right: '0' }, // Bottom-right
  ];

  // Create video panels with focus-shift effects
  const videoPanels = videos.map((video, index) => {
    const videoId = `multi-panel-video-${index + 1}`;
    const vignetteId = `vignette-overlay-${index + 1}`;
    
    // Calculate timing: each panel starts at index * (videoDuration - transitionDuration)
    // First panel starts at 0, subsequent panels overlap by transitionDuration
    const panelStart = index * (videoDuration - transitionDuration);
    const panelDuration = videoDuration;
    
    // Focus period: panel is focused from transitionDuration to (videoDuration - transitionDuration)
    const focusStart = index === 0 ? 0 : transitionDuration;
    const focusEnd = videoDuration - (index === videos.length - 1 ? 0 : transitionDuration);
    const focusDuration = focusEnd - focusStart;

    const effects: any[] = [];

    // Scale effect: 100% → 110% (focus-in), stay at 110%, then 110% → 100% (focus-out)
    if (index === 0) {
      // First panel: starts focused, then scales down
      effects.push({
        id: `scale-out-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: focusEnd,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'scale', val: focusScale, prog: 0 },
            { key: 'scale', val: 1.0, prog: 1 },
          ],
        },
      });
    } else if (index === videos.length - 1) {
      // Last panel: scales in and stays focused
      effects.push({
        id: `scale-in-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'scale', val: 1.0, prog: 0 },
            { key: 'scale', val: focusScale, prog: 1 },
          ],
        },
      });
    } else {
      // Middle panels: scale in, stay focused, then scale out
      effects.push(
        {
          id: `scale-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'scale', val: 1.0, prog: 0 },
              { key: 'scale', val: focusScale, prog: 1 },
            ],
          },
        },
        {
          id: `scale-out-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: focusEnd,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'scale', val: focusScale, prog: 0 },
              { key: 'scale', val: 1.0, prog: 1 },
            ],
          },
        }
      );
    }

    // Blur effect: 8px → 0px (focus-in), stay at 0px, then 0px → 8px (focus-out)
    if (index === 0) {
      // First panel: starts clear, then blurs
      effects.push({
        id: `blur-out-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: focusEnd,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'filter', val: 'blur(0px)', prog: 0 },
            { key: 'filter', val: `blur(${blurAmount}px)`, prog: 1 },
          ],
        },
      });
    } else if (index === videos.length - 1) {
      // Last panel: unblurs and stays clear
      effects.push({
        id: `blur-in-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'filter', val: `blur(${blurAmount}px)`, prog: 0 },
            { key: 'filter', val: 'blur(0px)', prog: 1 },
          ],
        },
      });
    } else {
      // Middle panels: unblur, stay clear, then blur
      effects.push(
        {
          id: `blur-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'filter', val: `blur(${blurAmount}px)`, prog: 0 },
              { key: 'filter', val: 'blur(0px)', prog: 1 },
            ],
          },
        },
        {
          id: `blur-out-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: focusEnd,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'filter', val: 'blur(0px)', prog: 0 },
              { key: 'filter', val: `blur(${blurAmount}px)`, prog: 1 },
            ],
          },
        }
      );
    }

    // Opacity effect: 0.7 → 1.0 (focus-in), stay at 1.0, then 1.0 → 0.7 (focus-out)
    if (index === 0) {
      // First panel: starts at full opacity, then dims
      effects.push({
        id: `opacity-out-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: focusEnd,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'opacity', val: 1.0, prog: 0 },
            { key: 'opacity', val: 0.7, prog: 1 },
          ],
        },
      });
    } else if (index === videos.length - 1) {
      // Last panel: brightens and stays bright
      effects.push({
        id: `opacity-in-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [videoId],
          ranges: [
            { key: 'opacity', val: 0.7, prog: 0 },
            { key: 'opacity', val: 1.0, prog: 1 },
          ],
        },
      });
    } else {
      // Middle panels: brighten, stay bright, then dim
      effects.push(
        {
          id: `opacity-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'opacity', val: 0.7, prog: 0 },
              { key: 'opacity', val: 1.0, prog: 1 },
            ],
          },
        },
        {
          id: `opacity-out-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: focusEnd,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [videoId],
            ranges: [
              { key: 'opacity', val: 1.0, prog: 0 },
              { key: 'opacity', val: 0.7, prog: 1 },
            ],
          },
        }
      );
    }

    return {
      id: videoId,
      type: 'atom' as const,
      componentId: 'VideoAtom',
      data: {
        src: video.src,
        className: 'absolute w-1/2 h-1/2 transform-gpu',
        style: {
          ...panelPositions[index],
          objectFit: 'cover',
        },
        fit: 'cover',
      },
      context: {
        timing: {
          start: panelStart,
          duration: panelDuration,
        },
      },
      effects,
    } as RenderableComponentData;
  });

  // Create vignette overlays for each panel
  const vignetteOverlays = videos.map((video, index) => {
    const vignetteId = `vignette-overlay-${index + 1}`;
    const videoId = `multi-panel-video-${index + 1}`;
    
    const panelStart = index * (videoDuration - transitionDuration);
    const panelDuration = videoDuration;
    
    const focusStart = index === 0 ? 0 : transitionDuration;
    const focusEnd = videoDuration - (index === videos.length - 1 ? 0 : transitionDuration);

    const vignetteEffects: any[] = [];

    // Vignette opacity: should be visible when NOT focused
    if (index === 0) {
      // First panel: starts invisible (focused), then appears
      vignetteEffects.push({
        id: `vignette-in-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-in',
          start: focusEnd,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [vignetteId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      });
    } else if (index === videos.length - 1) {
      // Last panel: starts visible, then disappears
      vignetteEffects.push({
        id: `vignette-out-${index}`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: transitionDuration,
          mode: 'provider',
          targetIds: [vignetteId],
          ranges: [
            { key: 'opacity', val: 1, prog: 0 },
            { key: 'opacity', val: 0, prog: 1 },
          ],
        },
      });
    } else {
      // Middle panels: disappear, stay invisible, then appear
      vignetteEffects.push(
        {
          id: `vignette-out-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: 0,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [vignetteId],
            ranges: [
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          },
        },
        {
          id: `vignette-in-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-in',
            start: focusEnd,
            duration: transitionDuration,
            mode: 'provider',
            targetIds: [vignetteId],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
            ],
          },
        }
      );
    }

    return {
      id: vignetteId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div></div>',
        className: 'absolute w-1/2 h-1/2 pointer-events-none',
        style: {
          ...panelPositions[index],
          background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${vignetteIntensity}) 100%)`,
        },
      },
      context: {
        timing: {
          start: panelStart,
          duration: panelDuration,
        },
      },
      effects: vignetteEffects,
    } as RenderableComponentData;
  });

  // Grain overlay (static, covers entire composition)
  const grainOverlay: RenderableComponentData = {
    id: 'grain-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div></div>',
      className: 'absolute inset-0 pointer-events-none z-50',
      style: {
        opacity: 0.08,
        backgroundImage:
          'url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMDAiIGhlaWdodD0iMzAwIj48ZmlsdGVyIGlkPSJhIiB4PSIwIiB5PSIwIj48ZmVUdXJidWxlbmNlIGJhc2VGcmVxdWVuY3k9Ii43NSIgc3RpdGNoVGlsZXM9InN0aXRjaCIgdHlwZT0iZnJhY3RhbE5vaXNlIi8+PGZlQ29sb3JNYXRyaXggdHlwZT0ic2F0dXJhdGUiIHZhbHVlcz0iMCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNhKSIvPjwvc3ZnPg==)',
        mixBlendMode: 'overlay',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
  };

  // Root container
  const rootContainer: RenderableComponentData = {
    id: 'multi-panel-collage-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full bg-gray-900 overflow-hidden',
        style: {
          background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: totalDuration,
      },
    },
    childrenData: [
      ...videoPanels,
      ...vignetteOverlays,
      grainOverlay,
    ] as RenderableComponentData[],
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
  id: 'multi-panel-focus-collage',
  title: 'Multi-Panel Video Collage with Focus-Shift Transitions',
  description:
    'A 2x2 video grid collage preset featuring smooth focus-shift transitions between panels. The active panel scales up to 110% with crisp clarity while non-active panels blur and dim with vignette effects. Transitions occur every 2.5 seconds with 0.5-second overlaps where outgoing panels scale down with increasing blur and incoming panels scale up with decreasing blur. Features dark background with subtle grain texture overlay for cinematic aesthetic.',
  type: 'predefined',
  presetType: 'children',
  tags: ['video', 'collage', 'multi-panel', 'focus-shift', 'transitions', 'grid', '2x2'],
  defaultInputParams: {
    videos: [
      { src: 'https://example.com/video1.mp4', duration: 3 },
      { src: 'https://example.com/video2.mp4', duration: 3 },
      { src: 'https://example.com/video3.mp4', duration: 3 },
      { src: 'https://example.com/video4.mp4', duration: 3 },
    ],
    transitionDuration: 0.5,
    focusScale: 1.1,
    blurAmount: 8,
    videoDuration: 3,
    vignetteIntensity: 0.4,
  },
  dependencies: {
    presets: [],
    helpers: [],
  },
};

export const multiPanelFocusCollagePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
