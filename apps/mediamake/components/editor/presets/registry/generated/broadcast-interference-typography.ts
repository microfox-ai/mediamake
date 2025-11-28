/**
 * Broadcast Interference Typography Preset
 *
 * This preset simulates text being transmitted through multiple overlapping analog TV signals.
 * It creates an authentic retro broadcast effect with channel interference, horizontal hold
 * problems, color burst errors, ghost signals, and authentic NTSC/PAL artifacts.
 *
 * Features:
 * - **Multiple Channel Layers**: 3-4 overlapping text channels with different blend modes
 * - **Channel Phasing**: Different channels fade in/out as broadcasts compete
 * - **Horizontal Hold Problems**: Text scrolls sideways uncontrollably then springs back
 * - **Color Burst Errors**: Pink/cyan color separation with strobing effects
 * - **Ghost Signals**: Faint offset copies simulating multi-path reception
 * - **Dot Crawl**: Diagonal pattern mimicking NTSC chroma artifacts
 * - **Color Bleeding**: High-contrast edge artifacts via offset text shadows
 * - **Scanlines**: Horizontal CRT scanline overlay
 * - **Static Noise Audio**: Optional synchronized audio for authenticity
 *
 * Use cases:
 * - Retro TV broadcast aesthetics
 * - Glitch art and analog signal simulation
 * - Nostalgic 80s/90s video effects
 * - Music videos with analog interference themes
 * - Experimental typography with technical artifacts
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

const presetParams = z.object({
  text: z.string().describe('Text to display with broadcast interference effect'),
  duration: z.number().default(10).describe('Duration in seconds'),
  
  // Font configuration
  fontFamily: z.string().default('Courier New').describe('Font family (monospace fonts work best for TV aesthetics)'),
  fontSize: z.number().default(72).describe('Font size in pixels'),
  
  // Channel configuration
  channelCount: z.number().min(2).max(4).default(3).describe('Number of overlapping channel layers (2-4)'),
  channelPhaseSpeed: z.number().min(0.5).max(5).default(2).describe('Speed of channel fading/phasing cycles'),
  
  // Horizontal hold configuration
  horizontalHoldEnabled: z.boolean().default(true).describe('Enable horizontal hold displacement glitches'),
  horizontalHoldFrequency: z.number().min(1).max(10).default(3).describe('Number of horizontal hold glitches during duration'),
  horizontalHoldIntensity: z.number().min(50).max(500).default(200).describe('Maximum sideways displacement in pixels'),
  
  // Color burst configuration
  colorBurstEnabled: z.boolean().default(true).describe('Enable color burst strobing effects'),
  colorBurstSpeed: z.number().min(0.1).max(2).default(0.5).describe('Speed of color burst cycles'),
  
  // Ghost signal configuration
  ghostSignalCount: z.number().min(0).max(3).default(2).describe('Number of ghost signal copies (0-3)'),
  ghostSignalOpacity: z.number().min(0.1).max(0.5).default(0.2).describe('Opacity of ghost signals'),
  
  // Artifact configuration
  scanlineIntensity: z.number().min(0).max(1).default(0.3).describe('Intensity of scanline overlay (0-1)'),
  dotCrawlIntensity: z.number().min(0).max(1).default(0.15).describe('Intensity of dot crawl pattern (0-1)'),
  
  // Audio configuration
  staticNoiseEnabled: z.boolean().default(false).describe('Enable static noise audio (requires staticNoiseSrc)'),
  staticNoiseSrc: z.string().optional().describe('URL to static noise audio file (optional)'),
  staticNoiseVolume: z.number().min(0).max(1).default(0.15).describe('Volume of static noise (0-1)'),
});

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    text,
    duration,
    fontFamily,
    fontSize,
    channelCount,
    channelPhaseSpeed,
    horizontalHoldEnabled,
    horizontalHoldFrequency,
    horizontalHoldIntensity,
    colorBurstEnabled,
    colorBurstSpeed,
    ghostSignalCount,
    ghostSignalOpacity,
    scanlineIntensity,
    dotCrawlIntensity,
    staticNoiseEnabled,
    staticNoiseSrc,
    staticNoiseVolume,
  } = params;

  const containerId = 'broadcast-interference-root';
  const childrenData: any[] = [];

  // Helper: Create channel layer with specific styling
  const createChannelLayer = (index: number, totalChannels: number) => {
    const channelId = `channel-layer-${index}`;
    const textId = `channel-text-${index}`;
    
    // Different blend modes and colors for each channel
    const blendModes = ['screen', 'lighten', 'color-dodge', 'difference'];
    const colors = [
      'rgba(255,255,255,1)',
      'rgba(255,0,128,0.6)',
      'rgba(0,255,255,0.5)',
      'rgba(128,255,0,0.4)',
    ];
    const textShadows = [
      '2px 0 #ff0080, -2px 0 #00ffff',
      '3px 0 #00ffff, -3px 0 #ff0080',
      '4px 0 #ff0080, -4px 0 #00ffff',
      '2px 0 #80ff00, -2px 0 #ff0080',
    ];
    
    const blendMode = blendModes[index % blendModes.length];
    const color = colors[index % colors.length];
    const textShadow = textShadows[index % textShadows.length];
    const zIndex = 10 - index * 2;

    const channelEffects: any[] = [];

    // Channel phasing (opacity oscillation)
    const phaseOffset = (index / totalChannels) * duration;
    const phaseDuration = duration / channelPhaseSpeed;
    
    channelEffects.push({
      id: `channel-phase-${index}`,
      componentId: 'generic',
      data: {
        type: 'ease-in-out',
        start: 0,
        duration: duration,
        mode: 'provider',
        targetIds: [textId],
        ranges: [
          { key: 'opacity', val: 0.3, prog: 0 },
          { key: 'opacity', val: 1, prog: 0.2 + (index * 0.15) },
          { key: 'opacity', val: 0.4, prog: 0.5 },
          { key: 'opacity', val: 1, prog: 0.7 - (index * 0.1) },
          { key: 'opacity', val: 0.5, prog: 1 },
        ],
      },
    });

    // Horizontal hold glitches (if enabled)
    if (horizontalHoldEnabled && index === 0) {
      for (let i = 0; i < horizontalHoldFrequency; i++) {
        const glitchStart = (duration / (horizontalHoldFrequency + 1)) * (i + 1);
        const glitchDuration = 0.3;
        const displacement = Math.random() * horizontalHoldIntensity * (Math.random() > 0.5 ? 1 : -1);
        
        channelEffects.push({
          id: `horizontal-hold-${i}`,
          componentId: 'generic',
          data: {
            type: 'spring',
            start: glitchStart,
            duration: glitchDuration,
            mode: 'provider',
            targetIds: [textId],
            ranges: [
              { key: 'translateX', val: 0, prog: 0 },
              { key: 'translateX', val: displacement, prog: 0.2 },
              { key: 'translateX', val: displacement * 0.7, prog: 0.4 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        });
      }
    }

    // Color burst strobing (if enabled)
    if (colorBurstEnabled) {
      const burstCycles = Math.floor(duration / colorBurstSpeed);
      const burstRanges: any[] = [];
      
      for (let i = 0; i <= burstCycles; i++) {
        const prog = i / burstCycles;
        const hueValue = (i % 2 === 0) ? 0 : 180;
        burstRanges.push({ key: 'filter', val: `hue-rotate(${hueValue}deg)`, prog });
      }
      
      channelEffects.push({
        id: `color-burst-${index}`,
        componentId: 'generic',
        data: {
          type: 'linear',
          start: 0,
          duration: duration,
          mode: 'provider',
          targetIds: [textId],
          ranges: burstRanges,
        },
      });
    }

    return {
      id: channelId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            zIndex,
            mixBlendMode: blendMode as any,
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
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text,
            style: {
              fontSize: `${fontSize}px`,
              color,
              fontWeight: 'bold',
              textShadow,
              fontFamily,
            },
            font: {
              family: fontFamily,
              weights: ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          effects: channelEffects,
        },
      ],
    };
  };

  // Helper: Create ghost signal
  const createGhostSignal = (index: number) => {
    const ghostId = `ghost-signal-${index}`;
    const textId = `ghost-text-${index}`;
    
    const offsetX = (10 + index * 10) * (Math.random() > 0.5 ? 1 : -1);
    const offsetY = (8 + index * 8) * (Math.random() > 0.5 ? 1 : -1);
    
    return {
      id: ghostId,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 flex items-center justify-center',
          style: {
            zIndex: 2 - index,
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
          id: textId,
          type: 'atom' as const,
          componentId: 'TextAtom',
          data: {
            text,
            style: {
              fontSize: `${fontSize}px`,
              color: `rgba(255,255,255,${ghostSignalOpacity})`,
              fontWeight: 'bold',
              fontFamily,
              transform: `translate(${offsetX}px, ${offsetY}px)`,
            },
            font: {
              family: fontFamily,
              weights: ['700'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        },
      ],
    };
  };

  // Add static noise audio (if enabled)
  if (staticNoiseEnabled && staticNoiseSrc) {
    childrenData.push({
      id: 'static-noise-audio',
      type: 'atom' as const,
      componentId: 'AudioAtom',
      data: {
        src: staticNoiseSrc,
        volume: staticNoiseVolume,
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
    });
  }

  // Add scanline overlay
  const scanlineHTML = `
    <div style="
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 2px,
        rgba(0,0,0,${scanlineIntensity}) 2px,
        rgba(0,0,0,${scanlineIntensity}) 4px
      );
      pointer-events: none;
      z-index: 100;
    "></div>
  `;

  childrenData.push({
    id: 'scanline-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: scanlineHTML,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  });

  // Add channel layers
  for (let i = 0; i < channelCount; i++) {
    childrenData.push(createChannelLayer(i, channelCount));
  }

  // Add ghost signals
  for (let i = 0; i < ghostSignalCount; i++) {
    childrenData.push(createGhostSignal(i));
  }

  // Add dot crawl overlay
  const dotCrawlHTML = `
    <div style="
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 1px,
        rgba(255,255,255,${dotCrawlIntensity}) 1px,
        rgba(255,255,255,${dotCrawlIntensity}) 2px
      );
      pointer-events: none;
      mix-blend-mode: overlay;
      z-index: 99;
    "></div>
  `;

  childrenData.push({
    id: 'dot-crawl-overlay',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: dotCrawlHTML,
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  });

  // Root container
  const rootContainer = {
    id: containerId,
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative bg-black overflow-hidden',
        style: {
          width: '100%',
          height: '100%',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: childrenData as RenderableComponentData[],
  } as RenderableComponentData;

  return {
    output: {
      childrenData: [rootContainer],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

const presetMetadata: PresetMetadata = {
  id: 'broadcast-interference-typography',
  title: 'Broadcast Interference Typography',
  description:
    'Simulates text transmitted through multiple overlapping analog TV signals with channel interference, horizontal hold problems, color burst errors, ghost signals, and authentic NTSC/PAL artifacts like dot crawl and color bleeding.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'typography',
    'broadcast',
    'interference',
    'analog',
    'tv',
    'glitch',
    'retro',
    'ntsc',
    'pal',
    'crt',
    'scanlines',
    'color-burst',
    'ghost-signal',
    'horizontal-hold',
  ],
  dependencies: {},
  defaultInputParams: {
    text: 'BROADCAST',
    duration: 10,
    fontFamily: 'Courier New',
    fontSize: 72,
    channelCount: 3,
    channelPhaseSpeed: 2,
    horizontalHoldEnabled: true,
    horizontalHoldFrequency: 3,
    horizontalHoldIntensity: 200,
    colorBurstEnabled: true,
    colorBurstSpeed: 0.5,
    ghostSignalCount: 2,
    ghostSignalOpacity: 0.2,
    scanlineIntensity: 0.3,
    dotCrawlIntensity: 0.15,
    staticNoiseEnabled: false,
    staticNoiseVolume: 0.15,
  },
};

export const broadcastInterferenceTypographyPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
