/**
 * Sports Broadcast Stat Graphics Preset
 *
 * ESPN/Sky Sports-style typokinetic preset featuring screen-locked statistics overlays
 * that remain stable regardless of camera movement. Implements a modular system with:
 * - Animated stat bars with percentage fills
 * - Circular percentage indicators with progress animations
 * - Data tables with color-coded performance metrics
 * - Player name cards with number/position display
 * - Subtle particle effects for emphasis
 * - Slide-in entrances with spring easing
 * - High-energy but professionally stable graphics
 *
 * All graphics are fixed to the viewing frame using position: fixed and locked positioning.
 * Features competitive energy with sharp, bold typography and dynamic number counting.
 * Designed for live sports broadcasts with real-time stat overlays.
 */

import z from 'zod';
import {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import { RenderableComponentData } from '@microfox/datamotion';

// Parameter schema with descriptions
const presetParams = z.object({
  duration: z
    .number()
    .default(10)
    .describe('Duration of the entire stat overlay display in seconds'),
  
  // Stat bar configuration
  statBar: z.object({
    label: z.string().default('POSSESSION').describe('Label for the stat bar'),
    value: z.number().default(65).describe('Current stat value (0-100)'),
    maxValue: z.number().default(100).describe('Maximum value for the stat'),
    color: z.string().default('#facc15').describe('Fill color for the stat bar'),
    position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
      .default('top-left')
      .describe('Screen position for the stat bar module'),
  }).optional().describe('Configuration for the stat bar module'),

  // Percentage circle configuration
  percentageCircle: z.object({
    label: z.string().default('ACCURACY').describe('Label for the percentage circle'),
    percentage: z.number().default(87).describe('Percentage value (0-100)'),
    color: z.string().default('#3b82f6').describe('Color for the progress circle'),
    position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
      .default('top-right')
      .describe('Screen position for the percentage circle'),
  }).optional().describe('Configuration for the percentage circle module'),

  // Data table configuration
  dataTable: z.object({
    title: z.string().default('TOP SCORERS').describe('Table header title'),
    rows: z.array(z.object({
      playerName: z.string().describe('Player name'),
      statValue: z.string().describe('Stat value (e.g., "23 PTS")'),
      indicator: z.enum(['green', 'yellow', 'red']).default('green')
        .describe('Performance indicator color'),
    })).default([
      { playerName: 'JAMES #23', statValue: '28', indicator: 'green' },
      { playerName: 'CURRY #30', statValue: '24', indicator: 'green' },
      { playerName: 'DURANT #7', statValue: '19', indicator: 'yellow' },
    ]).describe('Table row data'),
    position: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
      .default('bottom-left')
      .describe('Screen position for the data table'),
  }).optional().describe('Configuration for the data table module'),

  // Player name card configuration
  playerCard: z.object({
    number: z.string().default('23').describe('Player jersey number'),
    name: z.string().default('JAMES').describe('Player last name'),
    position: z.string().default('FORWARD').describe('Player position'),
    position_screen: z.enum(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
      .default('bottom-right')
      .describe('Screen position for the player card'),
  }).optional().describe('Configuration for the player name card'),

  // Particle effects
  enableParticles: z.boolean().default(true)
    .describe('Enable subtle particle effects behind key statistics'),
  
  // Animation timing
  slideInDuration: z.number().default(0.8)
    .describe('Duration of slide-in entrance animations in seconds'),
  slideInDelay: z.number().default(0.2)
    .describe('Stagger delay between module entrances in seconds'),
});

// Preset execution function
const presetExecution = (
  params: z.infer<typeof presetParams>,
  props: PresetPassedProps,
): PresetOutput => {
  const {
    duration,
    statBar,
    percentageCircle,
    dataTable,
    playerCard,
    enableParticles,
    slideInDuration,
    slideInDelay,
  } = params;

  // Helper function to get position styles
  const getPositionStyles = (position: string) => {
    switch (position) {
      case 'top-left':
        return { top: '32px', left: '32px' };
      case 'top-right':
        return { top: '32px', right: '32px' };
      case 'bottom-left':
        return { bottom: '32px', left: '32px' };
      case 'bottom-right':
        return { bottom: '32px', right: '32px' };
      default:
        return { top: '32px', left: '32px' };
    }
  };

  // Helper function to get indicator color
  const getIndicatorColor = (indicator: string) => {
    switch (indicator) {
      case 'green':
        return '#22c55e';
      case 'yellow':
        return '#facc15';
      case 'red':
        return '#ef4444';
      default:
        return '#22c55e';
    }
  };

  const childrenData: RenderableComponentData[] = [];

  // Create stat bar module if enabled
  if (statBar) {
    const statBarPosition = getPositionStyles(statBar.position);
    const fillPercentage = (statBar.value / statBar.maxValue) * 100;

    childrenData.push({
      id: 'stat-bar-module',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bg-gradient-to-r from-red-600/90 to-red-800/90 backdrop-blur-sm rounded-lg p-4',
          style: {
            ...statBarPosition,
            width: '320px',
            contain: 'layout style paint',
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
          id: 'stat-bar-slide-in',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: 0,
            duration: slideInDuration,
            mode: 'provider',
            targetIds: ['stat-bar-module'],
            ranges: [
              { key: 'translateX', val: statBar.position.includes('left') ? -100 : 100, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'stat-bar-label',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: statBar.label,
            style: {
              fontWeight: 'bold',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '14px',
              marginBottom: '8px',
            },
            font: {
              family: 'Inter',
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
        {
          id: 'stat-bar-value',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: `${statBar.value}%`,
            style: {
              fontWeight: '800',
              color: '#ffffff',
              fontSize: '32px',
              marginBottom: '12px',
            },
            font: {
              family: 'Inter',
              weights: ['800'],
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
              id: 'stat-value-pop',
              componentId: 'generic',
              data: {
                type: 'spring',
                start: slideInDuration,
                duration: 0.4,
                mode: 'provider',
                targetIds: ['stat-bar-value'],
                ranges: [
                  { key: 'scale', val: 0.8, prog: 0 },
                  { key: 'scale', val: 1.1, prog: 0.5 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
        {
          id: 'stat-bar-track-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'relative',
              style: {
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                overflow: 'hidden',
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
              id: 'stat-bar-fill',
              type: 'layout',
              componentId: 'BaseLayout',
              data: {
                containerProps: {
                  style: {
                    height: '100%',
                    width: `${fillPercentage}%`,
                    backgroundColor: statBar.color,
                    borderRadius: '4px',
                    transformOrigin: 'left center',
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
                  id: 'stat-bar-fill-animation',
                  componentId: 'generic',
                  data: {
                    type: 'ease-out',
                    start: slideInDuration + 0.2,
                    duration: 1.2,
                    mode: 'provider',
                    targetIds: ['stat-bar-fill'],
                    ranges: [
                      { key: 'scaleX', val: 0, prog: 0 },
                      { key: 'scaleX', val: 1, prog: 1 },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    } as RenderableComponentData);
  }

  // Create percentage circle module if enabled
  if (percentageCircle) {
    const circlePosition = getPositionStyles(percentageCircle.position);

    childrenData.push({
      id: 'percentage-circle-module',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bg-gradient-to-r from-blue-600/90 to-blue-800/90 backdrop-blur-sm rounded-lg p-6 flex flex-col items-center justify-center',
          style: {
            ...circlePosition,
            width: '180px',
            height: '180px',
            contain: 'layout style paint',
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
          id: 'circle-slide-in',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: slideInDelay,
            duration: slideInDuration,
            mode: 'provider',
            targetIds: ['percentage-circle-module'],
            ranges: [
              { key: 'translateY', val: percentageCircle.position.includes('top') ? -100 : 100, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'percentage-value',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: `${percentageCircle.percentage}%`,
            style: {
              fontWeight: '800',
              color: '#ffffff',
              fontSize: '28px',
            },
            font: {
              family: 'Inter',
              weights: ['800'],
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
              id: 'percentage-pop',
              componentId: 'generic',
              data: {
                type: 'spring',
                start: slideInDelay + slideInDuration,
                duration: 0.5,
                mode: 'provider',
                targetIds: ['percentage-value'],
                ranges: [
                  { key: 'scale', val: 0.5, prog: 0 },
                  { key: 'scale', val: 1.2, prog: 0.6 },
                  { key: 'scale', val: 1, prog: 1 },
                ],
              },
            },
          ],
        },
        {
          id: 'percentage-label',
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: percentageCircle.label,
            style: {
              fontWeight: 'bold',
              color: '#ffffff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '12px',
              marginTop: '8px',
            },
            font: {
              family: 'Inter',
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
    } as RenderableComponentData);
  }

  // Create data table module if enabled
  if (dataTable) {
    const tablePosition = getPositionStyles(dataTable.position);

    const tableRows = dataTable.rows.map((row, index) => ({
      id: `table-row-${index}`,
      type: 'layout' as const,
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'flex flex-row items-center px-4 py-3 border-b border-white/10',
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
          id: `row-fade-${index}`,
          componentId: 'generic',
          data: {
            type: 'ease-out',
            start: slideInDelay * 2 + slideInDuration + (index * 0.1),
            duration: 0.4,
            mode: 'provider',
            targetIds: [`table-row-${index}`],
            ranges: [
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 1 },
              { key: 'translateX', val: -20, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: `row-indicator-${index}`,
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              style: {
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getIndicatorColor(row.indicator),
                marginRight: '12px',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        },
        {
          id: `row-name-${index}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: row.playerName,
            style: {
              fontWeight: '600',
              color: '#ffffff',
              fontSize: '14px',
              flex: '1',
            },
            font: {
              family: 'Inter',
              weights: ['600'],
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        },
        {
          id: `row-stat-${index}`,
          type: 'atom',
          componentId: 'TextAtom',
          data: {
            text: row.statValue,
            style: {
              fontWeight: '800',
              color: '#facc15',
              fontSize: '18px',
            },
            font: {
              family: 'Inter',
              weights: ['800'],
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
    }));

    childrenData.push({
      id: 'data-table-module',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-sm rounded-lg overflow-hidden',
          style: {
            ...tablePosition,
            width: '400px',
            contain: 'layout style paint',
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
          id: 'table-slide-in',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: slideInDelay * 2,
            duration: slideInDuration,
            mode: 'provider',
            targetIds: ['data-table-module'],
            ranges: [
              { key: 'translateX', val: dataTable.position.includes('left') ? -100 : 100, prog: 0 },
              { key: 'translateX', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'table-header',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-row bg-red-600 px-4 py-3',
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
              id: 'table-header-text',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: dataTable.title,
                style: {
                  fontWeight: 'bold',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontSize: '14px',
                },
                font: {
                  family: 'Inter',
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
        },
        {
          id: 'table-rows-container',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-col',
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
          childrenData: tableRows,
        },
      ],
    } as RenderableComponentData);
  }

  // Create player card module if enabled
  if (playerCard) {
    const cardPosition = getPositionStyles(playerCard.position_screen);

    childrenData.push({
      id: 'player-card-module',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute bg-gradient-to-r from-red-600/90 to-red-800/90 backdrop-blur-sm rounded-lg overflow-hidden',
          style: {
            ...cardPosition,
            minWidth: '280px',
            contain: 'layout style paint',
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
          id: 'player-card-slide-in',
          componentId: 'generic',
          data: {
            type: 'spring',
            start: slideInDelay * 3,
            duration: slideInDuration,
            mode: 'provider',
            targetIds: ['player-card-module'],
            ranges: [
              { key: 'translateY', val: playerCard.position_screen.includes('top') ? -100 : 100, prog: 0 },
              { key: 'translateY', val: 0, prog: 1 },
              { key: 'opacity', val: 0, prog: 0 },
              { key: 'opacity', val: 1, prog: 0.3 },
            ],
          },
        },
      ],
      childrenData: [
        {
          id: 'player-accent',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              style: {
                width: '6px',
                height: '100%',
                position: 'absolute',
                left: '0',
                top: '0',
                backgroundColor: '#facc15',
              },
            },
          },
          context: {
            timing: {
              start: 0,
              duration,
            },
          },
        },
        {
          id: 'player-content',
          type: 'layout',
          componentId: 'BaseLayout',
          data: {
            containerProps: {
              className: 'flex flex-col pl-6 pr-4 py-4',
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
              id: 'player-number',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: `#${playerCard.number}`,
                style: {
                  fontWeight: '800',
                  color: '#facc15',
                  fontSize: '24px',
                },
                font: {
                  family: 'Inter',
                  weights: ['800'],
                },
              },
              context: {
                timing: {
                  start: 0,
                  duration,
                },
              },
            },
            {
              id: 'player-name',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: playerCard.name,
                style: {
                  fontWeight: 'bold',
                  color: '#ffffff',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontSize: '20px',
                },
                font: {
                  family: 'Inter',
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
            {
              id: 'player-position',
              type: 'atom',
              componentId: 'TextAtom',
              data: {
                text: playerCard.position,
                style: {
                  fontWeight: '500',
                  color: 'rgba(255,255,255,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  fontSize: '12px',
                  marginTop: '4px',
                },
                font: {
                  family: 'Inter',
                  weights: ['500'],
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
        },
      ],
    } as RenderableComponentData);
  }

  // Create particle effects if enabled
  if (enableParticles) {
    const particles: RenderableComponentData[] = [];
    const particleCount = 5;

    for (let i = 0; i < particleCount; i++) {
      const particleSize = Math.random() * 4 + 4; // 4-8px
      const xPos = Math.random() * 100;
      const yPos = Math.random() * 100;
      const duration_particle = Math.random() * 2 + 2; // 2-4s
      const delay = Math.random() * 0.5;

      particles.push({
        id: `particle-${i}`,
        type: 'layout',
        componentId: 'BaseLayout',
        data: {
          containerProps: {
            style: {
              width: `${particleSize}px`,
              height: `${particleSize}px`,
              borderRadius: '50%',
              backgroundColor: i % 2 === 0 ? '#facc15' : '#fde047',
              position: 'absolute',
              left: `${xPos}%`,
              top: `${yPos}%`,
              opacity: Math.random() * 0.5 + 0.3,
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
            id: `particle-float-${i}`,
            componentId: 'generic',
            data: {
              type: 'ease-in-out',
              start: delay,
              duration: duration_particle,
              mode: 'provider',
              targetIds: [`particle-${i}`],
              ranges: [
                { key: 'translateY', val: 0, prog: 0 },
                { key: 'translateY', val: -30, prog: 0.5 },
                { key: 'translateY', val: 0, prog: 1 },
                { key: 'opacity', val: 0.3, prog: 0 },
                { key: 'opacity', val: 0.8, prog: 0.5 },
                { key: 'opacity', val: 0.3, prog: 1 },
              ],
            },
          },
        ],
      } as RenderableComponentData);
    }

    childrenData.push({
      id: 'particle-container',
      type: 'layout',
      componentId: 'BaseLayout',
      data: {
        containerProps: {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
        },
      },
      context: {
        timing: {
          start: 0,
          duration,
        },
      },
      childrenData: particles,
    } as RenderableComponentData);
  }

  // Root container with fixed positioning
  const rootContainer = {
    id: 'sports-broadcast-root',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'fixed inset-0 pointer-events-none',
        style: {
          contain: 'layout style paint',
        },
      },
    },
    context: {
      timing: {
        start: 0,
        duration,
      },
    },
    childrenData,
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

// Preset metadata
const presetMetadata: PresetMetadata = {
  id: 'sports-broadcast-stat-graphics',
  title: 'Sports Broadcast Stat Graphics',
  description: 'ESPN/Sky Sports-style typokinetic stat overlay system with locked-on-screen graphics featuring animated stat bars with progress fills, percentage circles, data tables, and player name cards. Includes slide-in entrances, number counting animations, color-coded performance indicators, and subtle particle emphasis effects. Professional broadcast quality with high-energy competitive styling.',
  type: 'predefined',
  presetType: 'children',
  tags: [
    'sports',
    'broadcast',
    'statistics',
    'overlay',
    'typokinetic',
    'espn',
    'sky-sports',
    'locked-graphics',
    'stat-bars',
    'percentage-circles',
    'data-tables',
    'player-cards',
    'particles',
    'professional',
    'high-energy',
  ],
  dependencies: {},
  defaultInputParams: {
    duration: 10,
    statBar: {
      label: 'POSSESSION',
      value: 65,
      maxValue: 100,
      color: '#facc15',
      position: 'top-left',
    },
    percentageCircle: {
      label: 'ACCURACY',
      percentage: 87,
      color: '#3b82f6',
      position: 'top-right',
    },
    dataTable: {
      title: 'TOP SCORERS',
      rows: [
        { playerName: 'JAMES #23', statValue: '28', indicator: 'green' },
        { playerName: 'CURRY #30', statValue: '24', indicator: 'green' },
        { playerName: 'DURANT #7', statValue: '19', indicator: 'yellow' },
      ],
      position: 'bottom-left',
    },
    playerCard: {
      number: '23',
      name: 'JAMES',
      position: 'FORWARD',
      position_screen: 'bottom-right',
    },
    enableParticles: true,
    slideInDuration: 0.8,
    slideInDelay: 0.2,
  },
};

// Export preset
export const sportsBroadcastStatGraphicsPreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams),
};