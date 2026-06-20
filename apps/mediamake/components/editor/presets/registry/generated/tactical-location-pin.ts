/**
 * Tactical Location Pin Preset
 *
 * A military-style location acquisition preset featuring:
 * - Hard-impact pin drop with ease-out (no bounce)
 * - Aggressive expanding octagonal rings with sharp edges
 * - Grid overlay with scanning line effects
 * - Rapidly cycling coordinates in targeting computer aesthetic with brackets
 * - Multiple data readouts: altitude, accuracy, timestamp
 * - Harsh typewriter effect for location name with character flash
 * - Neon green on dark background (HUD theme)
 *
 * Perfect for military drone footage, tactical overlays, or location-based content
 * requiring a heads-up display aesthetic.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// --- Parameter Schema ---
const presetParams = z.object({
  latitude: z.number().describe('Latitude coordinate (e.g., 47.6062)'),
  longitude: z.number().describe('Longitude coordinate (e.g., -122.3321)'),
  locationName: z
    .string()
    .default('TARGET ACQUIRED')
    .describe('Location name to display with typewriter effect'),
  altitude: z
    .number()
    .optional()
    .describe('Altitude in meters (optional, displays as ALT: ####M)'),
  accuracy: z
    .string()
    .default('HIGH')
    .describe('GPS accuracy level (e.g., HIGH, MEDIUM, LOW)'),
  timestamp: z
    .string()
    .optional()
    .describe('Timestamp string (e.g., "14:32:45", optional)'),
  duration: z
    .number()
    .default(5)
    .describe('Total duration of the preset in seconds'),
  trackName: z
    .string()
    .default('tactical-location')
    .describe('Unique track name for ID generation'),
});

// --- Preset Execution ---
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    latitude,
    longitude,
    locationName,
    altitude,
    accuracy,
    timestamp,
    duration,
    trackName,
  } = params;

  // Helper: Format coordinate with brackets
  const formatCoordinate = (value: number, isLat: boolean): string => {
    const abs = Math.abs(value);
    const direction = isLat ? (value >= 0 ? 'N' : 'S') : value >= 0 ? 'E' : 'W';
    return `[${abs.toFixed(4)}°${direction}]`;
  };

  // Helper: Get current timestamp or use provided
  const getTimestamp = (): string => {
    if (timestamp) return timestamp;
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  };

  const latText = formatCoordinate(latitude, true);
  const lngText = formatCoordinate(longitude, false);
  const altText = altitude ? `ALT: ${Math.round(altitude)}M` : 'ALT: ----M';
  const accText = `ACC: ${accuracy.toUpperCase()}`;
  const timeText = `TIME: ${getTimestamp()}`;

  // Root container
  const rootContainer: RenderableComponentData = {
    id: `${trackName}-root`,
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
        duration,
      },
    },
    childrenData: [],
  };

  // Scanline overlay (always visible)
  const scanlineOverlay: RenderableComponentData = {
    id: `${trackName}-scanline`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: `<div style="position: absolute; inset: 0; background: repeating-linear-gradient(0deg, rgba(34, 197, 94, 0.03) 0px, transparent 2px, transparent 4px); pointer-events: none; animation: scanline-scroll 8s linear infinite;"></div><style>@keyframes scanline-scroll { 0% { transform: translateY(0); } 100% { transform: translateY(4px); } }</style>`,
      className: 'absolute inset-0 pointer-events-none',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Grid overlay (fades in 0.5-1.5s)
  const gridLayer: RenderableComponentData = {
    id: `${trackName}-grid`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0 pointer-events-none',
        style: {
          backgroundImage:
            'linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackName}-grid-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0.5,
          duration: 1,
          mode: 'provider',
          targetIds: [`${trackName}-grid`],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  // HUD frame corners
  const cornerTL: RenderableComponentData = {
    id: `${trackName}-corner-tl`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 40px; height: 40px; border-left: 2px solid #22c55e; border-top: 2px solid #22c55e;"></div>',
      className: 'absolute top-4 left-4',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const cornerTR: RenderableComponentData = {
    id: `${trackName}-corner-tr`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 40px; height: 40px; border-right: 2px solid #22c55e; border-top: 2px solid #22c55e;"></div>',
      className: 'absolute top-4 right-4',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const cornerBL: RenderableComponentData = {
    id: `${trackName}-corner-bl`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 40px; height: 40px; border-left: 2px solid #22c55e; border-bottom: 2px solid #22c55e;"></div>',
      className: 'absolute bottom-4 left-4',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  const cornerBR: RenderableComponentData = {
    id: `${trackName}-corner-br`,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 40px; height: 40px; border-right: 2px solid #22c55e; border-bottom: 2px solid #22c55e;"></div>',
      className: 'absolute bottom-4 right-4',
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
  };

  // Pin (drops 0-0.3s with ease-out)
  const pinId = `${trackName}-pin`;
  const pin: RenderableComponentData = {
    id: pinId,
    type: 'atom',
    componentId: 'HTMLBlockAtom',
    data: {
      html: '<div style="width: 16px; height: 16px; background-color: #22c55e; clip-path: polygon(50% 0%, 0% 100%, 100% 100%);"></div>',
      className: 'absolute pointer-events-none',
      style: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 30,
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackName}-pin-drop`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0,
          duration: 0.3,
          mode: 'provider',
          targetIds: [pinId],
          ranges: [
            { key: 'translateY', val: -50, prog: 0 },
            { key: 'translateY', val: 0, prog: 1 },
          ],
        },
      },
    ],
  };

  // Rings (4 octagonal rings, 0.3-2s with 50ms stagger)
  const rings: RenderableComponentData[] = [];
  for (let i = 0; i < 4; i++) {
    const ringId = `${trackName}-ring-${i + 1}`;
    const ringStart = 0.3 + i * 0.05;
    const ringDuration = 1.7;

    rings.push({
      id: ringId,
      type: 'atom',
      componentId: 'HTMLBlockAtom',
      data: {
        html: '<div style="width: 80px; height: 80px; border: 2px solid #22c55e; clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);"></div>',
        className: 'absolute',
        style: {
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 20,
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      effects: [
        {
          id: `${trackName}-ring-${i + 1}-expand`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: ringStart,
            duration: ringDuration,
            mode: 'provider',
            targetIds: [ringId],
            ranges: [
              { key: 'scale', val: 1, prog: 0 },
              { key: 'scale', val: 3, prog: 1 },
              { key: 'opacity', val: 1, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.8 },
              { key: 'opacity', val: 0, prog: 0.81 },
            ],
          },
        },
      ],
    });
  }

  // Coordinates (top-left, fade in 0.8-1.5s)
  const coordLatId = `${trackName}-coord-lat`;
  const coordLat: RenderableComponentData = {
    id: coordLatId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: latText,
      className: 'font-mono text-green-400 text-sm tracking-wider',
      font: {
        family: 'Roboto Mono',
        weights: ['400'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackName}-coord-lat-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0.8,
          duration: 0.7,
          mode: 'provider',
          targetIds: [coordLatId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const coordLngId = `${trackName}-coord-lng`;
  const coordLng: RenderableComponentData = {
    id: coordLngId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: lngText,
      className: 'font-mono text-green-400 text-sm tracking-wider mt-1',
      font: {
        family: 'Roboto Mono',
        weights: ['400'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackName}-coord-lng-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 0.85,
          duration: 0.7,
          mode: 'provider',
          targetIds: [coordLngId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const coordContainer: RenderableComponentData = {
    id: `${trackName}-coord-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-20 left-20 flex flex-col gap-1',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [coordLat, coordLng],
  };

  // Data readouts (top-right, fade in 1-1.5s)
  const dataAltId = `${trackName}-data-alt`;
  const dataAlt: RenderableComponentData = {
    id: dataAltId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: altText,
      className: 'font-mono text-green-400 text-xs tracking-wider',
      font: {
        family: 'Roboto Mono',
        weights: ['400'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackName}-data-alt-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 1,
          duration: 0.5,
          mode: 'provider',
          targetIds: [dataAltId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const dataAccId = `${trackName}-data-acc`;
  const dataAcc: RenderableComponentData = {
    id: dataAccId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: accText,
      className: 'font-mono text-green-400 text-xs tracking-wider',
      font: {
        family: 'Roboto Mono',
        weights: ['400'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackName}-data-acc-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 1.05,
          duration: 0.5,
          mode: 'provider',
          targetIds: [dataAccId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const dataTimeId = `${trackName}-data-time`;
  const dataTime: RenderableComponentData = {
    id: dataTimeId,
    type: 'atom',
    componentId: 'TextAtom',
    data: {
      text: timeText,
      className: 'font-mono text-green-400 text-xs tracking-wider',
      font: {
        family: 'Roboto Mono',
        weights: ['400'],
        display: 'swap',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    effects: [
      {
        id: `${trackName}-data-time-fade`,
        componentId: 'generic',
        data: {
          type: 'ease-out',
          start: 1.1,
          duration: 0.5,
          mode: 'provider',
          targetIds: [dataTimeId],
          ranges: [
            { key: 'opacity', val: 0, prog: 0 },
            { key: 'opacity', val: 1, prog: 1 },
          ],
        },
      },
    ],
  };

  const dataContainer: RenderableComponentData = {
    id: `${trackName}-data-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute top-20 right-20 flex flex-col items-end gap-1',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: [dataAlt, dataAcc, dataTime],
  };

  // Location name (bottom-center, typewriter effect 1.5-3s)
  // Create character-level atoms for flash effect
  const locationChars = locationName.split('');
  const charDuration = 1.5 / locationChars.length; // Spread over 1.5s
  const locationCharAtoms: RenderableComponentData[] = locationChars.map(
    (char, index) => {
      const charId = `${trackName}-location-char-${index}`;
      const charStart = 1.5 + index * charDuration;

      return {
        id: charId,
        type: 'atom',
        componentId: 'TextAtom',
        data: {
          text: char,
          className: 'font-mono text-green-400 text-2xl font-bold tracking-widest uppercase',
          font: {
            family: 'Roboto Mono',
            weights: ['700'],
            display: 'swap',
          },
        },
        context: {
          timing: {
            start: 0,
            duration,
          },
        },
        effects: [
          {
            id: `${trackName}-location-char-${index}-fade`,
            componentId: 'generic',
            data: {
              type: 'ease-out',
              start: charStart,
              duration: charDuration,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                { key: 'opacity', val: 0, prog: 0 },
                { key: 'opacity', val: 1, prog: 1 },
              ],
            },
          },
          {
            id: `${trackName}-location-char-${index}-flash`,
            componentId: 'generic',
            data: {
              type: 'linear',
              start: charStart,
              duration: 0.05,
              mode: 'provider',
              targetIds: [charId],
              ranges: [
                { key: 'filter', val: 'brightness(1)', prog: 0 },
                { key: 'filter', val: 'brightness(2)', prog: 0.5 },
                { key: 'filter', val: 'brightness(1)', prog: 1 },
              ],
            },
          },
        ],
      };
    },
  );

  const locationContainer: RenderableComponentData = {
    id: `${trackName}-location-container`,
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className:
          'absolute bottom-32 left-1/2 transform -translate-x-1/2 flex flex-row',
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData: locationCharAtoms,
  };

  // Assemble root container
  rootContainer.childrenData = [
    scanlineOverlay,
    gridLayer,
    cornerTL,
    cornerTR,
    cornerBL,
    cornerBR,
    pin,
    ...rings,
    coordContainer,
    dataContainer,
    locationContainer,
  ] as RenderableComponentData[];

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---
const presetMetadata: PresetMetadata = {
  id: 'tactical-location-pin',
  title: 'Tactical Location Pin',
  description:
    'Military-style location acquisition preset featuring hard-impact pin drop, octagonal expanding rings, grid overlay with scanning effects, rapid coordinate cycling in targeting computer aesthetic, multiple data readouts (altitude, accuracy, timestamp), and harsh typewriter-style location name with flash effects. Neon green HUD theme on dark background, styled like military drone targeting system.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'location',
    'tactical',
    'military',
    'hud',
    'coordinates',
    'targeting',
    'drone',
    'overlay',
  ],
  dependencies: {},
  defaultInputParams: {
    latitude: 47.6062,
    longitude: -122.3321,
    locationName: 'TARGET ACQUIRED',
    altitude: 152,
    accuracy: 'HIGH',
    duration: 5,
    trackName: 'tactical-location',
  },
};

// --- Export ---
export const tacticalLocationPinPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};
