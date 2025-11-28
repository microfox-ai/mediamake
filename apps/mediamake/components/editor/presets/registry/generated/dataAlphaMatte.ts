/**
 * Data-Driven Alpha Matte Effect (dataAlphaMatte)
 *
 * INTERNAL EFFECT PRESET
 * 
 * Reveals content based on external data streams or real-time inputs.
 * Maps data values from JSON feeds, API responses, or user interactions to opacity levels
 * for animated reveals following data trends. Includes smooth interpolation between data points
 * and graceful handling of missing data.
 *
 * FEATURES:
 * - Fetch data from external URLs (REST APIs, JSON endpoints)
 * - WebSocket support for real-time data updates
 * - Map data values to opacity ranges [0, 1]
 * - Interpolation methods: linear, cubic, step
 * - Time-series data support for animated reveals
 * - Graceful fallback for missing or invalid data
 * - Support for multiple data sources and complex reveal patterns
 * - Custom value mapping functions
 *
 * USAGE:
 * This is an internal effect preset that returns opacity effects for target components.
 * Call via dependencies and extract effects from the output.
 *
 * EXAMPLE:
 * const result = await presets.dataAlphaMatte({
 *   targetId: 'my-component',
 *   dataSource: 'https://api.example.com/data',
 *   updateInterval: 5,
 *   valueMapper: (data) => data.value / 100,
 *   interpolation: 'cubic',
 *   fallbackValue: 0.5
 * }, props);
 * const effect = result.output._extractedEffects[0];
 */

import z from 'zod';
import type {
  PresetMetadata,
  PresetOutput,
  PresetPassedProps,
} from '../../types';
import type { RenderableComponentData } from '@microfox/datamotion';
import type { GenericEffectData } from '@microfox/remotion';

// --- Parameter Schema ---

const presetParams = z.object({
  targetId: z
    .string()
    .describe('ID of the component to apply the data-driven opacity effect to'),
  effectStart: z
    .number()
    .default(0)
    .describe('Start time of the effect relative to parent (seconds)'),
  effectDuration: z
    .number()
    .default(10)
    .describe('Duration of the effect (seconds)'),
  
  // Data source configuration
  dataSource: z
    .string()
    .describe('URL of the data source (REST API, JSON endpoint, or WebSocket URL)'),
  dataSourceType: z
    .enum(['rest', 'websocket', 'json'])
    .default('rest')
    .describe('Type of data source connection'),
  updateInterval: z
    .number()
    .default(1)
    .describe('Update interval in seconds for polling REST endpoints'),
  
  // Data mapping configuration
  valueMapper: z
    .string()
    .optional()
    .describe('JavaScript function string to map data to opacity value (0-1). Example: "(data) => data.value / 100"'),
  dataPath: z
    .string()
    .default('value')
    .describe('JSONPath to extract value from data object (e.g., "metrics.opacity", "data[0].value")'),
  
  // Interpolation configuration
  interpolation: z
    .enum(['linear', 'cubic', 'step'])
    .default('linear')
    .describe('Interpolation method between data points'),
  smoothingFactor: z
    .number()
    .min(0)
    .max(1)
    .default(0.3)
    .describe('Smoothing factor for interpolation (0 = no smoothing, 1 = maximum smoothing)'),
  
  // Fallback and error handling
  fallbackValue: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Fallback opacity value when data is missing or invalid'),
  minOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(0)
    .describe('Minimum opacity value to clamp to'),
  maxOpacity: z
    .number()
    .min(0)
    .max(1)
    .default(1)
    .describe('Maximum opacity value to clamp to'),
  
  // Optional parameters
  effectId: z
    .string()
    .optional()
    .describe('Optional custom effect ID'),
  dataPoints: z
    .array(z.object({
      time: z.number().describe('Time in seconds (relative to effect start)'),
      value: z.number().describe('Opacity value (0-1)'),
    }))
    .optional()
    .describe('Pre-defined data points for testing (overrides data source if provided)'),
});

type PresetParams = z.infer<typeof presetParams>;

// --- Preset Execution ---

const presetExecution = async (
  params: PresetParams,
  props: PresetPassedProps,
): Promise<PresetOutput> => {
  const { fetcher } = props;

  // Helper: Extract value from nested object using path
  const getNestedValue = (obj: any, path: string): number | null => {
    try {
      const keys = path.split('.');
      let value = obj;
      for (const key of keys) {
        // Handle array indexing like "data[0]"
        const arrayMatch = key.match(/^(\w+)\[(\d+)\]$/);
        if (arrayMatch) {
          value = value[arrayMatch[1]][parseInt(arrayMatch[2])];
        } else {
          value = value[key];
        }
        if (value === undefined || value === null) {
          return null;
        }
      }
      return typeof value === 'number' ? value : parseFloat(value);
    } catch {
      return null;
    }
  };

  // Helper: Parse custom value mapper function
  const parseValueMapper = (mapperString?: string): ((data: any) => number) | null => {
    if (!mapperString) return null;
    try {
       
      return new Function('data', `return (${mapperString})(data)`) as (data: any) => number;
    } catch {
      return null;
    }
  };

  // Helper: Clamp value to min/max range
  const clampValue = (value: number, min: number, max: number): number => {
    return Math.max(min, Math.min(max, value));
  };

  // Helper: Interpolate between two values
  const interpolateLinear = (v1: number, v2: number, t: number): number => {
    return v1 + (v2 - v1) * t;
  };

  const interpolateCubic = (v0: number, v1: number, v2: number, v3: number, t: number): number => {
    const t2 = t * t;
    const t3 = t2 * t;
    const a0 = v3 - v2 - v0 + v1;
    const a1 = v0 - v1 - a0;
    const a2 = v2 - v0;
    const a3 = v1;
    return a0 * t3 + a1 * t2 + a2 * t + a3;
  };

  // Fetch or use pre-defined data points
  let dataPoints: Array<{ time: number; value: number }> = [];

  if (params.dataPoints && params.dataPoints.length > 0) {
    // Use pre-defined data points
    dataPoints = params.dataPoints;
  } else if (fetcher && params.dataSource) {
    // Fetch data from external source
    try {
      let rawData: any;

      if (params.dataSourceType === 'rest' || params.dataSourceType === 'json') {
        // Fetch from REST API or JSON endpoint
        rawData = await fetcher(params.dataSource);
      } else if (params.dataSourceType === 'websocket') {
        // For WebSocket, we simulate by fetching initial data
        // In a real implementation, this would establish a WebSocket connection
        rawData = await fetcher(params.dataSource);
      }

      // Parse data points from response
      if (Array.isArray(rawData)) {
        // Array of time-series data
        const customMapper = parseValueMapper(params.valueMapper);
        dataPoints = rawData.map((item, index) => {
          let value: number;
          
          if (customMapper) {
            value = customMapper(item);
          } else {
            const extractedValue = getNestedValue(item, params.dataPath);
            value = extractedValue !== null ? extractedValue : params.fallbackValue;
          }

          // Calculate time based on index and update interval
          const time = index * params.updateInterval;
          
          return {
            time,
            value: clampValue(value, params.minOpacity, params.maxOpacity),
          };
        });
      } else if (typeof rawData === 'object' && rawData !== null) {
        // Single data point
        const customMapper = parseValueMapper(params.valueMapper);
        let value: number;
        
        if (customMapper) {
          value = customMapper(rawData);
        } else {
          const extractedValue = getNestedValue(rawData, params.dataPath);
          value = extractedValue !== null ? extractedValue : params.fallbackValue;
        }

        dataPoints = [
          {
            time: 0,
            value: clampValue(value, params.minOpacity, params.maxOpacity),
          },
        ];
      }
    } catch (error) {
      console.error('Error fetching data from source:', error);
      // Use fallback value
      dataPoints = [
        { time: 0, value: params.fallbackValue },
        { time: params.effectDuration, value: params.fallbackValue },
      ];
    }
  }

  // If no data points, use fallback
  if (dataPoints.length === 0) {
    dataPoints = [
      { time: 0, value: params.fallbackValue },
      { time: params.effectDuration, value: params.fallbackValue },
    ];
  }

  // Generate animation ranges based on interpolation method
  const ranges: Array<{ key: string; val: number; prog: number }> = [];

  if (params.interpolation === 'step') {
    // Step interpolation - hold each value until next point
    dataPoints.forEach((point, index) => {
      const prog = point.time / params.effectDuration;
      ranges.push({
        key: 'opacity',
        val: point.value,
        prog: Math.max(0, Math.min(1, prog)),
      });
    });
  } else if (params.interpolation === 'linear') {
    // Linear interpolation between points
    dataPoints.forEach((point, index) => {
      const prog = point.time / params.effectDuration;
      
      // Apply smoothing
      const smoothedValue = index > 0
        ? interpolateLinear(
            dataPoints[index - 1].value,
            point.value,
            params.smoothingFactor,
          )
        : point.value;
      
      ranges.push({
        key: 'opacity',
        val: smoothedValue,
        prog: Math.max(0, Math.min(1, prog)),
      });
    });
  } else if (params.interpolation === 'cubic') {
    // Cubic interpolation for smooth curves
    const sampleCount = Math.max(dataPoints.length * 4, 20);
    
    for (let i = 0; i <= sampleCount; i++) {
      const t = i / sampleCount;
      const time = t * params.effectDuration;
      
      // Find surrounding points for cubic interpolation
      let pointIndex = 0;
      for (let j = 0; j < dataPoints.length - 1; j++) {
        if (time >= dataPoints[j].time && time <= dataPoints[j + 1].time) {
          pointIndex = j;
          break;
        }
      }
      
      const p1 = dataPoints[Math.max(0, pointIndex - 1)] || dataPoints[0];
      const p2 = dataPoints[pointIndex];
      const p3 = dataPoints[Math.min(dataPoints.length - 1, pointIndex + 1)];
      const p4 = dataPoints[Math.min(dataPoints.length - 1, pointIndex + 2)] || p3;
      
      const localT = (time - p2.time) / Math.max(0.001, p3.time - p2.time);
      const value = interpolateCubic(p1.value, p2.value, p3.value, p4.value, localT);
      
      ranges.push({
        key: 'opacity',
        val: clampValue(value, params.minOpacity, params.maxOpacity),
        prog: t,
      });
    }
  }

  // Ensure we have at least start and end keyframes
  if (ranges.length === 0) {
    ranges.push(
      { key: 'opacity', val: params.fallbackValue, prog: 0 },
      { key: 'opacity', val: params.fallbackValue, prog: 1 },
    );
  }

  // Sort ranges by progress
  ranges.sort((a, b) => a.prog - b.prog);

  // Create effect data
  const effectData: GenericEffectData = {
    type: params.interpolation === 'linear' ? 'linear' : 'ease-in-out',
    start: params.effectStart,
    duration: params.effectDuration,
    mode: 'provider',
    targetIds: [params.targetId],
    ranges,
  };

  const effect = {
    id: params.effectId || `data-alpha-matte-${params.targetId}`,
    componentId: 'generic',
    data: effectData,
  };

  // Container structure for effect extraction
  const rootContainer: RenderableComponentData = {
    id: 'data-alpha-matte-container',
    type: 'layout',
    componentId: 'BaseLayout',
    data: {
      containerProps: {
        className: 'absolute inset-0',
      },
    },
    context: {
      timing: {
        start: 0,
        duration: params.effectDuration,
      },
    },
    effects: [effect],
    childrenData: [],
  };

  return {
    output: {
      childrenData: [rootContainer] as RenderableComponentData[],
      _extractedEffects: [effect],
    },
    options: {
      attachedToId: 'BaseScene',
    },
  };
};

// --- Preset Metadata ---

const presetMetadata: PresetMetadata = {
  id: 'dataAlphaMatte',
  title: 'Data-Driven Alpha Matte Effect',
  description:
    'Reveals content based on external data streams or real-time inputs. Maps data values from JSON feeds, API responses, or user interactions to opacity levels for animated reveals following data trends. Includes smooth interpolation between data points and graceful handling of missing data.',
  type: 'predefined',
  presetType: 'effects',
  tags: ['effects', 'data-driven', 'opacity', 'alpha-matte', 'internal', 'generic'],
  _internalPreset: true,
  _internalPresetOutput: 'effects',
  dependencies: {},
  defaultInputParams: {
    targetId: 'component-1',
    effectStart: 0,
    effectDuration: 10,
    dataSource: 'https://api.example.com/metrics',
    dataSourceType: 'rest',
    updateInterval: 1,
    dataPath: 'value',
    interpolation: 'linear',
    smoothingFactor: 0.3,
    fallbackValue: 1,
    minOpacity: 0,
    maxOpacity: 1,
  },
};

// --- Export ---

export const dataAlphaMattePreset = {
  metadata: presetMetadata,
  presetFunction: presetExecution.toString(),
  presetParams: z.toJSONSchema(presetParams) as any,
};
