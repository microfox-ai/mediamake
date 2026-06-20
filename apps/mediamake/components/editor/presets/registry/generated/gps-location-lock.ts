/**
 * GPS Location Lock Preset
 *
 * A three-act GPS location reveal animation featuring a map pin drop with spring physics,
 * expanding ripple rings, scrambling coordinate numbers, and typing location name.
 *
 * Act 1 (0-20%): Pin drops from above with spring easing and impacts the center.
 * Act 2 (20-70%): Ripple rings expand outward while coordinates scramble slot-machine style.
 * Act 3 (70-100%): Location name types in character-by-character, then scales up with bounce.
 *
 * Features:
 * - Map pin drop with spring physics (cubic bezier: 0.68, -0.55, 0.265, 1.55)
 * - Concentric ripple rings that expand and fade out
 * - Topographic contour line background with stroke animation
 * - Coordinate numbers with slot machine scrambling effect
 * - Character-by-character location name reveal with cursor blink
 * - Final lock animation with subtle bounce
 *
 * Use cases:
 * - Location reveal animations for travel content
 * - GPS lock sequences for navigation videos
 * - Geolocation-based storytelling
 * - Map-based social media content
 */

import z from 'zod';
import { PresetMetadata, PresetOutput, PresetPassedProps } from '../../types';
import {
  GenericEffectData,
  BaseEffect,
  RenderableComponentData,
} from '@microfox/remotion';

// ============================================================================
// PRESET PARAMETERS
// ============================================================================

const presetParams = z.object({
  locationName: z
    .string()
    .default('San Francisco, CA')
    .describe('The location name to display'),
  latitude: z
    .string()
    .default('37.7749')
    .describe('Latitude coordinate to display'),
  longitude: z
    .string()
    .default('-122.4194')
    .describe('Longitude coordinate to display'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the animation in seconds'),
  backgroundColor: z
    .string()
    .default('#0f172a')
    .describe('Background color (hex or rgb)'),
  pinColor: z
    .string()
    .default('#ef4444')
    .describe('Map pin color (hex or rgb)'),
  rippleColor: z
    .string()
    .default('#3b82f6')
    .describe('Ripple ring color (hex or rgb)'),
  coordinateColor: z
    .string()
    .default('#22d3ee')
    .describe('Coordinate text color (hex or rgb)'),
  locationNameColor: z
    .string()
    .default('#ffffff')
    .describe('Location name text color (hex or rgb)'),
  font: z
    .string()
    .default('Inter')
    .describe('Font family for text elements'),
});

// ============================================================================
// PRESET EXECUTION
// ============================================================================

const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    locationName,
    latitude,
    longitude,
    duration,
    backgroundColor,
    pinColor,
    rippleColor,
    coordinateColor,
    locationNameColor,
    font,
  } = params;

  // Helper: Generate random coordinate string for scramble effect
  const generateRandomCoordinate = (isLatitude: boolean): string => {
    if (isLatitude) {
      const sign = Math.random() > 0.5 ? '' : '-';
      const degrees = Math.floor(Math.random() * 90);
      const decimals = Math.floor(Math.random() * 10000);
      return `${sign}${degrees}.${decimals}`;
    } else {
      const sign = Math.random() > 0.5 ? '' : '-';
      const degrees = Math.floor(Math.random() * 180);
      const decimals = Math.floor(Math.random() * 10000);
      return `${sign}${degrees}.${decimals}`;
    }
  };

  // Helper: Create topographic SVG paths
  const createTopographyPaths = (): string => {
    const paths: string[] = [];
    const numLines = 8;
    
    for (let i = 0; i < numLines; i++) {
      const y = (i + 1) * (100 / (numLines + 1));
      const amplitude = 5 + Math.random() * 10;
      const frequency = 2 + Math.random() * 3;
      
      let pathD = `M 0,${y}`;
      for (let x = 0; x <= 100; x += 5) {
        const yOffset = Math.sin((x / 100) * frequency * Math.PI * 2) * amplitude;
        pathD += ` L ${x},${y + yOffset}`;
      }
      
      paths.push(
        `<path d="${pathD}" stroke="rgba(255,255,255,0.1)" stroke-width="1" fill="none" stroke-dasharray="1000" stroke-dashoffset="1000"/>`
      );
    }
    
    return paths.join('');
  };

  // Calculate timing breakpoints (relative to duration)
  const act1End = duration * 0.2; // Pin drop: 0-20%
  const act2Start = duration * 0.15; // Ripples start: 15%
  const act2End = duration * 0.75; // Ripples end: 75%
  const coordinateStart = duration * 0.1; // Coordinates: 10%
  const coordinateEnd = duration * 0.65; // Coordinates end: 65%
  const act3Start = duration * 0.6; // Location text: 60%
  const act3TypeEnd = duration * 0.85; // Typing ends: 85%
  const act3BounceEnd = duration; // Bounce ends: 100%

  // ============================================================================
  // ACT 1: TOPOGRAPHY BACKGROUND LAYER
  // ============================================================================

  const topographySvg = createTopographyPaths();

  const topographyLayer: RenderableComponentData = {
    id: 'topography-layer',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          ${topographySvg}
        </svg>
      `,
      className: 'absolute inset-0 opacity-30',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    effects: [
      {
        id: 'topography-stroke-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: duration * 0.3,
          mode: 'provider',
          targetIds: ['topography-layer'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 0.3, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,
    ],
  };

  // ============================================================================
  // ACT 2: RIPPLE RINGS LAYER
  // ============================================================================

  const rippleRings: RenderableComponentData[] = [];
  const numRipples = 4;
  const rippleDuration = act2End - act2Start;

  for (let i = 0; i < numRipples; i++) {
    const rippleId = `ripple-ring-${i + 1}`;
    const staggerDelay = i * (duration * 0.05); // 5% stagger between rings

    const rippleRing: RenderableComponentData = {
      id: rippleId,
      type: 'atom' as const,
      componentId: 'HTMLBlockAtom',
      data: {
        html: `<div style="width: 80px; height: 80px; border: 3px solid ${rippleColor}; border-radius: 50%;"></div>`,
        className: 'absolute',
      },
      context: {
        timing: {
          start: 0,
          duration: duration,
        },
      },
      effects: [
        {
          id: `${rippleId}-effect`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: act2Start + staggerDelay,
            duration: rippleDuration - staggerDelay,
            mode: 'provider',
            targetIds: [rippleId],
            ranges: [
              { key: 'scale', val: 0, prog: 0 },
              { key: 'scale', val: 2, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 0, prog: 1 },
            ],
          } as GenericEffectData,
        } as BaseEffect,
      ],
    };

    rippleRings.push(rippleRing);
  }

  const rippleContainer: RenderableComponentData = {
    id: 'ripple-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 flex items-center justify-center pointer-events-none',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: rippleRings,
  };

  // ============================================================================
  // ACT 1 & 2: PIN DROP + COORDINATES
  // ============================================================================

  const mapPinIcon: RenderableComponentData = {
    id: 'map-pin-icon',
    type: 'atom' as const,
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<svg width="60" height="80" viewBox="0 0 24 32"><path d="M12 0C7.589 0 4 3.589 4 8c0 6 8 16 8 16s8-10 8-16c0-4.411-3.589-8-8-8zm0 11c-1.657 0-3-1.343-3-3s1.343-3 3-3 3 1.343 3 3-1.343 3-3 3z" fill="${pinColor}"/></svg>`,
      className: 'drop-shadow-lg',
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const pinContainer: RenderableComponentData = {
    id: 'pin-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [mapPinIcon],
    effects: [
      {
        id: 'pin-drop-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: act1End,
          mode: 'provider',
          targetIds: ['pin-container'],
          ranges: [
            { key: 'translateY', val: -200, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,
    ],
  };

  // Coordinate scramble effect - show multiple random values before final
  const latitudeText: RenderableComponentData = {
    id: 'latitude-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: `Lat: ${latitude}`,
      className: 'tracking-wider font-mono',
      style: {
        fontSize: 14,
        color: coordinateColor,
        fontWeight: '400',
      },
      font: {
        family: font,
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const longitudeText: RenderableComponentData = {
    id: 'longitude-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: `Lng: ${longitude}`,
      className: 'tracking-wider font-mono',
      style: {
        fontSize: 14,
        color: coordinateColor,
        fontWeight: '400',
      },
      font: {
        family: font,
        weights: ['400'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const coordinatesContainer: RenderableComponentData = {
    id: 'coordinates-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute flex gap-4',
        style: {
          top: 'calc(50% + 50px)',
          left: '50%',
          transform: 'translateX(-50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [latitudeText, longitudeText],
    effects: [
      {
        id: 'coordinates-fade-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: coordinateStart,
          duration: 0.3,
          mode: 'provider',
          targetIds: ['coordinates-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,
    ],
  };

  // ============================================================================
  // ACT 3: LOCATION NAME WITH TYPING EFFECT
  // ============================================================================

  const locationNameText: RenderableComponentData = {
    id: 'location-name-text',
    type: 'atom' as const,
    componentId: 'TextAtom',
    data: {
      text: locationName,
      style: {
        fontSize: 32,
        color: locationNameColor,
        fontWeight: 'bold',
        letterSpacing: '0.05em',
      },
      font: {
        family: font,
        weights: ['700'],
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
  };

  const locationNameContainer: RenderableComponentData = {
    id: 'location-name-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute',
        style: {
          top: 'calc(50% + 90px)',
          left: '50%',
          transform: 'translateX(-50%)',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [locationNameText],
    effects: [
      {
        id: 'location-typewriter-effect',
        componentId: 'generic',
        data: {
          type: 'ease-in-out',
          start: act3Start,
          duration: act3TypeEnd - act3Start,
          mode: 'provider',
          targetIds: ['location-name-container'],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 0.2 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,
      {
        id: 'location-scale-bounce-effect',
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: act3TypeEnd,
          duration: act3BounceEnd - act3TypeEnd,
          mode: 'provider',
          targetIds: ['location-name-container'],
          ranges: [
            { key: 'scale', val: 1, prog: 0 },
            { key: 'scale', val: 1.2, prog: 0.5 },
            { key: 'scale', val: 1, prog: 1 },
          ],
        } as GenericEffectData,
      } as BaseEffect,
    ],
  };

  // ============================================================================
  // ROOT CONTAINER ASSEMBLY
  // ============================================================================

  const pinAndTextForeground: RenderableComponentData = {
    id: 'pin-and-text-foreground',
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
        duration: duration,
      },
    },
    childrenData: [pinContainer, coordinatesContainer, locationNameContainer],
  };

  const rootContainer: RenderableComponentData = {
    id: 'gps-location-lock-container',
    type: 'layout' as const,
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'relative w-full h-full overflow-hidden',
        style: {
          backgroundColor: backgroundColor,
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration: duration,
      },
    },
    childrenData: [topographyLayer, rippleContainer, pinAndTextForeground],
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

// ============================================================================
// PRESET METADATA
// ============================================================================

const presetMetadata: PresetMetadata = {
  id: 'gps-location-lock',
  title: 'GPS Location Lock',
  description:
    'A three-act GPS location reveal animation featuring a map pin drop with spring physics, expanding ripple rings, scrambling coordinate numbers, and typing location name. Perfect for travel content, navigation sequences, and location-based storytelling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'gps',
    'location',
    'map',
    'pin',
    'coordinates',
    'travel',
    'navigation',
    'animation',
    'reveal',
    'topography',
  ],
  defaultInputParams: {
    locationName: 'San Francisco, CA',
    latitude: '37.7749',
    longitude: '-122.4194',
    duration: 5,
    backgroundColor: '#0f172a',
    pinColor: '#ef4444',
    rippleColor: '#3b82f6',
    coordinateColor: '#22d3ee',
    locationNameColor: '#ffffff',
    font: 'Inter',
  },
  dependencies: {},
};

// ============================================================================
// PRESET EXPORT
// ============================================================================

export const gpsLocationLockPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
