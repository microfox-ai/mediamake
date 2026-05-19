import { toast } from 'sonner';

export interface ReferenceItem {
  key: string;
  type:
    | 'media'
    | 'medias'
    | 'captions'
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'objects';
  dataType?: string;
  value: any;
}

export interface DefaultPresetData {
  references: ReferenceItem[];
}

export interface ResolvedPresetInputData {
  processedInputData: any;
  dataItemIds: string[];
  dataSourceKeys: string[];
  dataReferenceBindings: Record<string, string[]>;
  dataReferenceKeyByPath: Record<string, string>;
  dataMutationContext: DataMutationContext;
}

export interface DataMutationContext {
  dataItemIds: string[];
  dataSourceKeys: string[];
  dataReferenceBindings: Record<string, string[]>;
  dataReferenceKeyByPath: Record<string, string>;
}

export interface BuildDataItemIdsOptions {
  paramKeys?: string[];
  dataSourceKeys?: string[];
  arrayIndex?: number;
  nestedPath?: string;
  fallbackToAll?: boolean;
}

/**
 * Processes input data to replace data:[key] references with actual values from baseData
 * @param inputData - The input data to process
 * @param baseData - The base data containing references
 * @returns Processed input data with references resolved
 */
export function processDataReferences(
  inputData: any,
  baseData: Record<string, any>,
): any {
  if (!inputData || !baseData) {
    return inputData;
  }

  // Deep clone to avoid mutating original data
  const processedData = JSON.parse(JSON.stringify(inputData));

  return processDataReferencesRecursive(processedData, baseData);
}

/**
 * Recursively processes data references in nested objects and arrays
 */
function processDataReferencesRecursive(
  data: any,
  baseData: Record<string, any>,
): any {
  if (typeof data === 'string') {
    // Check if this is a data:[key] or data:[key][range] reference
    if (data.startsWith('data:[')) {
      const match = data.match(/^data:\[([^\]]+)\](?:\[([^\]]+)\])?$/);
      if (match) {
        const key = match[1].trim();
        const range = match[2];

        if (baseData[key] !== undefined) {
          const referenceValue = baseData[key];

          // If it's an array and has a range, process the range
          if (Array.isArray(referenceValue) && range) {
            return processArrayRange(referenceValue, range, 'array');
          }

          // If it's a transcription object with captions array and has a time range, process the time range
          if (
            referenceValue &&
            typeof referenceValue === 'object' &&
            referenceValue.captions &&
            Array.isArray(referenceValue.captions) &&
            range
          ) {
            return processArrayRange(
              referenceValue.captions,
              range,
              'captions',
            );
          }

          // If it's a transcription object with captions array (no range), return the captions
          if (
            referenceValue &&
            typeof referenceValue === 'object' &&
            referenceValue.captions &&
            Array.isArray(referenceValue.captions) &&
            !range
          ) {
            return referenceValue.captions;
          }

          return referenceValue;
        } else {
          toast.error(`Reference '${key}' not found in base data`);
          console.warn(
            `Data reference '${key}' not found in base data:`,
            baseData,
          );
          return data;
        }
      }
    }
    return processStringReference(data, baseData);
  }

  if (Array.isArray(data)) {
    return data.map(item => processDataReferencesRecursive(item, baseData));
  }

  if (data && typeof data === 'object') {
    const processed: any = {};
    for (const [key, value] of Object.entries(data)) {
      // Process all values recursively first
      processed[key] = processDataReferencesRecursive(value, baseData);
    }
    return processed;
  }

  return data;
}

/**
 * Processes a string value to replace data:[key] references with range support
 */
function processStringReference(
  value: string,
  baseData: Record<string, any>,
): any {
  if (typeof value !== 'string') {
    return value;
  }

  // Match data:[key] or data:[key][range] pattern
  const dataReferencePattern = /data:\[([^\]]+)\](?:\[([^\]]+)\])?/g;

  return value.replace(dataReferencePattern, (match, key, range) => {
    const trimmedKey = key.trim();

    if (baseData[trimmedKey] !== undefined) {
      const referenceValue = baseData[trimmedKey];

      // Handle media objects - extract src for string fields
      if (referenceValue && typeof referenceValue === 'object') {
        // Check for direct src property
        if (referenceValue.src) {
          return referenceValue.src;
        }
        // Check for nested metadata.src property
        if (referenceValue.metadata && referenceValue.metadata.src) {
          return referenceValue.metadata.src;
        }
        // Check for filePath property as fallback
        if (referenceValue.filePath) {
          return referenceValue.filePath;
        }
        // Check for caption title property
        if (referenceValue.title) {
          return referenceValue.title;
        }
        // Check for caption text property
        if (referenceValue.text) {
          return referenceValue.text;
        }
        // Check for captions array property
        if (referenceValue.captions && Array.isArray(referenceValue.captions)) {
          if (range) {
            return processArrayRange(
              referenceValue.captions,
              range,
              'captions',
            );
          } else {
            return referenceValue.captions;
          }
        }
      }

      // If referenceValue is already an array, apply range if specified
      if (Array.isArray(referenceValue)) {
        return processArrayRange(referenceValue, range, 'array');
      }

      return referenceValue;
    } else {
      // Show error toast for missing reference
      toast.error(`Reference '${trimmedKey}' not found in base data`);
      console.warn(
        `Data reference '${trimmedKey}' not found in base data:`,
        baseData,
      );
      return match; // Return original string if reference not found
    }
  });
}

/**
 * Processes array range selection
 * @param array - The array to process
 * @param range - The range specification (e.g., "2-33", "1:04-2:03")
 * @param type - The type of array ("array" for index ranges, "captions" for time ranges)
 */
function processArrayRange(
  array: any[],
  range: string | undefined,
  type: 'array' | 'captions',
): any[] {
  if (!range || !Array.isArray(array)) {
    return array;
  }

  // Auto-detect time range format (MM:SS-MM:SS / HH:MM:SS-HH:MM:SS / multi-segment)
  const isTimeRange =
    type === 'captions' &&
    range
      .split(',')
      .map(segment => segment.trim())
      .every(segment => isSupportedTimeRangeSegment(segment));
  const isIndexRange = /^\d+-\d+$/.test(range);

  if (isTimeRange) {
    return processTimeRange(array, range);
  } else if (isIndexRange) {
    return processIndexRange(array, range);
  } else {
    console.warn(`Unknown range format: ${range}`);
    return array;
  }
}

/**
 * Processes index-based range selection (e.g., "2-33")
 */
function processIndexRange(array: any[], range: string): any[] {
  const rangeMatch = range.match(/^(\d+)-(\d+)$/);
  if (!rangeMatch) {
    console.warn(`Invalid index range format: ${range}`);
    return array;
  }

  const startIndex = parseInt(rangeMatch[1], 10);
  const endIndex = parseInt(rangeMatch[2], 10);

  if (startIndex < 0 || endIndex >= array.length || startIndex > endIndex) {
    console.warn(
      `Invalid range ${startIndex}-${endIndex} for array of length ${array.length}`,
    );
    return array;
  }

  return array.slice(startIndex, endIndex + 1);
}

/**
 * Processes time-based range selection for captions (e.g., "1:04-2:03")
 */
function processTimeRange(captions: any[], range: string): any[] {
  const segments = range
    .split(',')
    .map(segment => segment.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return captions;
  }

  const parsedSegments = segments
    .map(parseTimeRangeSegmentToSeconds)
    .filter((segment): segment is { startTime: number; endTime: number } => {
      return Boolean(segment);
    });

  if (parsedSegments.length === 0) {
    console.warn(
      `Invalid time range format: ${range}. Expected format: HH:MM:SS-HH:MM:SS (supports decimals)`,
    );
    return captions;
  }

  return captions.filter((caption: any) => {
    const captionStart =
      typeof caption.absoluteStart === 'number'
        ? caption.absoluteStart
        : typeof caption.start === 'number'
          ? caption.start
          : undefined;
    const captionEnd =
      typeof caption.absoluteEnd === 'number'
        ? caption.absoluteEnd
        : typeof caption.end === 'number'
          ? caption.end
          : undefined;

    if (captionStart === undefined || captionEnd === undefined) {
      return false;
    }

    return parsedSegments.some(({ startTime, endTime }) => {
      return captionStart < endTime && captionEnd > startTime;
    });
  });
}

function isSupportedTimeRangeSegment(segment: string): boolean {
  const parts = segment.split('-').map(part => part.trim());
  if (parts.length !== 2) return false;
  return (
    parseTimeToSeconds(parts[0]) !== null &&
    parseTimeToSeconds(parts[1]) !== null
  );
}

function parseTimeRangeSegmentToSeconds(
  segment: string,
): { startTime: number; endTime: number } | null {
  const parts = segment.split('-').map(part => part.trim());
  if (parts.length !== 2) return null;
  const startTime = parseTimeToSeconds(parts[0]);
  const endTime = parseTimeToSeconds(parts[1]);
  if (startTime === null || endTime === null || startTime > endTime) {
    return null;
  }
  return { startTime, endTime };
}

/**
 * Supports:
 * - HH:MM:SS(.sss)
 * - MM:SS(.sss)
 * - SS(.sss)
 */
function parseTimeToSeconds(input: string): number | null {
  const parts = input.split(':').map(part => part.trim());
  if (parts.length === 0 || parts.length > 3) {
    return null;
  }

  const nums = parts.map(part => Number(part));
  if (nums.some(num => Number.isNaN(num) || num < 0)) {
    return null;
  }

  if (nums.length === 3) {
    const [hours, minutes, seconds] = nums;
    return hours * 3600 + minutes * 60 + seconds;
  }

  if (nums.length === 2) {
    const [minutes, seconds] = nums;
    return minutes * 60 + seconds;
  }

  return nums[0];
}

/**
 * Validates that all data references in input data exist in baseData
 * @param inputData - The input data to validate
 * @param baseData - The base data containing references
 * @returns Array of missing reference keys
 */
export function validateDataReferences(
  inputData: any,
  baseData: Record<string, any>,
): string[] {
  const missingReferences: string[] = [];

  if (!inputData || !baseData) {
    return missingReferences;
  }

  validateDataReferencesRecursive(inputData, baseData, missingReferences);
  return missingReferences;
}

/**
 * Recursively validates data references
 */
function validateDataReferencesRecursive(
  data: any,
  baseData: Record<string, any>,
  missingReferences: string[],
): void {
  if (typeof data === 'string') {
    const dataReferencePattern = /data:\[([^\]]+)\]/g;
    let match;

    while ((match = dataReferencePattern.exec(data)) !== null) {
      const key = match[1].trim();
      if (baseData[key] === undefined) {
        if (!missingReferences.includes(key)) {
          missingReferences.push(key);
        }
      }
    }
  } else if (Array.isArray(data)) {
    data.forEach(item =>
      validateDataReferencesRecursive(item, baseData, missingReferences),
    );
  } else if (data && typeof data === 'object') {
    Object.values(data).forEach(value =>
      validateDataReferencesRecursive(value, baseData, missingReferences),
    );
  }
}

/**
 * Creates a base data object from references array
 * @param references - Array of reference items
 * @returns Base data object
 */
export function createBaseDataFromReferences(
  references: ReferenceItem[],
): Record<string, any> {
  const baseData: Record<string, any> = {};

  references.forEach(ref => {
    baseData[ref.key] = ref.value;
  });

  return baseData;
}

/**
 * Processes preset input data with base data references
 * This is the main function to use for processing preset inputs
 * @param inputData - The preset input data
 * @param baseData - The base data containing references
 * @returns Processed input data with all references resolved
 */
export function processPresetInputData(
  inputData: any,
  baseData: Record<string, any>,
): any {
  if (!baseData || Object.keys(baseData).length === 0) {
    return inputData;
  }

  return processDataReferences(inputData, baseData);
}

export function resolvePresetInputData(
  inputData: any,
  baseData: Record<string, any>,
): ResolvedPresetInputData {
  const dataReferenceBindings: Record<string, string[]> = {};
  const dataReferenceKeyByPath: Record<string, string> = {};
  const dataSourceKeys = new Set<string>();
  const allDataItemIds = new Set<string>();

  const visit = (value: any, path: string[]) => {
    if (typeof value === 'string') {
      const references = extractDataReferencesFromString(value);
      if (references.length === 0) return;
      const pathKey = path.join('.');
      const pathIds = new Set<string>();
      references.forEach(({ key, range }) => {
        dataSourceKeys.add(key);
        if (!dataReferenceKeyByPath[pathKey]) {
          dataReferenceKeyByPath[pathKey] = key;
        }
        const ids = buildDataItemIdsFromReference(key, range, baseData[key]);
        ids.forEach(id => {
          pathIds.add(id);
          allDataItemIds.add(id);
        });
      });
      dataReferenceBindings[pathKey] = Array.from(pathIds);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, [...path, String(index)]));
      return;
    }

    if (value && typeof value === 'object') {
      Object.entries(value).forEach(([k, nested]) =>
        visit(nested, [...path, k]),
      );
    }
  };

  visit(inputData, []);

  const dataMutationContext: DataMutationContext = {
    dataItemIds: Array.from(allDataItemIds),
    dataSourceKeys: Array.from(dataSourceKeys),
    dataReferenceBindings,
    dataReferenceKeyByPath,
  };

  return {
    processedInputData: processPresetInputData(inputData, baseData),
    dataItemIds: dataMutationContext.dataItemIds,
    dataSourceKeys: dataMutationContext.dataSourceKeys,
    dataReferenceBindings,
    dataReferenceKeyByPath,
    dataMutationContext,
  };
}

/**
 * Resolves stable data-item id strings from the pre-mutation `data:[...]` scan.
 * Returns an empty array when nothing matched — callers must not use `||` with
 * array fallbacks (empty `[]` is truthy in JavaScript); check `.length` instead.
 */
export function buildDataItemIds(
  context: DataMutationContext | undefined,
  options: BuildDataItemIdsOptions = {},
): string[] {
  if (!context) return [];
  const {
    paramKeys = [],
    dataSourceKeys = [],
    arrayIndex,
    nestedPath,
    fallbackToAll = false,
  } = options;
  const out = new Set<string>();

  const addIds = (ids: string[] | undefined) => {
    if (!ids || ids.length === 0) return;
    const selected =
      typeof arrayIndex === 'number' && arrayIndex >= 0
        ? ids[arrayIndex]
          ? [ids[arrayIndex]]
          : []
        : ids;
    selected.forEach(id =>
      out.add(appendNestedPathToDataItemId(id, nestedPath)),
    );
  };

  paramKeys.forEach(paramKey => {
    addIds(context.dataReferenceBindings[paramKey]);
  });

  dataSourceKeys.forEach(sourceKey => {
    context.dataReferenceBindings &&
      Object.entries(context.dataReferenceBindings).forEach(([, ids]) => {
        addIds(
          ids?.filter(id => id === sourceKey || id.startsWith(`${sourceKey}.`)),
        );
      });
  });

  if (fallbackToAll && out.size === 0) {
    addIds(context.dataItemIds);
  }

  return Array.from(out);
}

function appendNestedPathToDataItemId(
  dataItemId: string,
  nestedPath?: string,
): string {
  if (!nestedPath) return dataItemId;
  return `${dataItemId}.${nestedPath}`;
}

function extractDataReferencesFromString(
  value: string,
): Array<{ key: string; range?: string }> {
  const matches: Array<{ key: string; range?: string }> = [];
  const pattern = /data:\[([^\]]+)\](?:\[([^\]]+)\])?/g;
  let match: RegExpExecArray | null = null;
  while ((match = pattern.exec(value)) !== null) {
    matches.push({
      key: match[1].trim(),
      range: match[2],
    });
  }
  return matches;
}

function buildDataItemIdsFromReference(
  key: string,
  range: string | undefined,
  referenceValue: any,
): string[] {
  if (!range) {
    if (
      referenceValue &&
      typeof referenceValue === 'object' &&
      Array.isArray(referenceValue.captions)
    ) {
      return referenceValue.captions.map(
        (_: unknown, index: number) => `${key}.[${index}]`,
      );
    }
    if (Array.isArray(referenceValue)) {
      return referenceValue.map(
        (_: unknown, index: number) => `${key}.[${index}]`,
      );
    }
    return [key];
  }

  if (/^\d+-\d+$/.test(range)) {
    const [startStr, endStr] = range.split('-');
    const start = Number.parseInt(startStr, 10);
    const end = Number.parseInt(endStr, 10);
    if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
      const ids: string[] = [];
      for (let i = start; i <= end; i += 1) {
        ids.push(`${key}.[${i}]`);
      }
      return ids;
    }
  }

  return [`${key}[${range}]`];
}

export function remapDataReferenceKeys(
  inputData: any,
  keyMapping: Record<string, string>,
): any {
  if (!inputData || Object.keys(keyMapping).length === 0) {
    return inputData;
  }
  return remapDataReferenceKeysRecursive(inputData, keyMapping);
}

function remapDataReferenceKeysRecursive(
  value: any,
  keyMapping: Record<string, string>,
): any {
  if (typeof value === 'string') {
    const match = value.match(/^data:\[([^\]]+)\](?:\[([^\]]+)\])?$/);
    if (!match) {
      return value;
    }
    const oldKey = match[1];
    const range = match[2];
    const mappedKey = keyMapping[oldKey];
    if (!mappedKey || mappedKey === oldKey) {
      return value;
    }
    return range ? `data:[${mappedKey}][${range}]` : `data:[${mappedKey}]`;
  }

  if (Array.isArray(value)) {
    return value.map(item => remapDataReferenceKeysRecursive(item, keyMapping));
  }

  if (value && typeof value === 'object') {
    const result: Record<string, any> = {};
    for (const [key, nested] of Object.entries(value)) {
      result[key] = remapDataReferenceKeysRecursive(nested, keyMapping);
    }
    return result;
  }

  return value;
}

/**
 * Processes object references with flexible merging
 * This allows partial object mapping where reference provides base data
 * and the input can override or add additional fields
 * @param inputData - The input data containing object references
 * @param baseData - The base data containing references
 * @returns Processed input data with flexible object merging
 */
export function processFlexibleObjectReferences(
  inputData: any,
  baseData: Record<string, any>,
): any {
  if (!inputData || !baseData) {
    return inputData;
  }

  const processed = JSON.parse(JSON.stringify(inputData));
  return processFlexibleObjectReferencesRecursive(processed, baseData);
}

/**
 * Recursively processes flexible object references
 */
function processFlexibleObjectReferencesRecursive(
  data: any,
  baseData: Record<string, any>,
): any {
  if (typeof data === 'string') {
    // Handle string references
    if (data.startsWith('data:[') && data.endsWith(']')) {
      const refKey = data.slice(6, -1).trim();
      if (baseData[refKey] !== undefined) {
        return baseData[refKey];
      }
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item =>
      processFlexibleObjectReferencesRecursive(item, baseData),
    );
  }

  if (data && typeof data === 'object') {
    const processed: any = {};

    for (const [key, value] of Object.entries(data)) {
      if (
        typeof value === 'string' &&
        value.startsWith('data:[') &&
        value.endsWith(']')
      ) {
        const refKey = value.slice(6, -1).trim();
        if (baseData[refKey] !== undefined) {
          const referenceValue = baseData[refKey];

          // If reference is an object, merge with any existing object data
          if (
            typeof referenceValue === 'object' &&
            !Array.isArray(referenceValue)
          ) {
            // Special handling for transcription objects with captions
            if (
              referenceValue.captions &&
              Array.isArray(referenceValue.captions)
            ) {
              // If the input data expects just captions, extract them
              if (
                typeof data[key] === 'string' &&
                data[key].includes('captions')
              ) {
                processed[key] = referenceValue.captions;
              } else {
                processed[key] = {
                  ...referenceValue,
                  ...(typeof data[key] === 'object' ? data[key] : {}),
                };
              }
            } else {
              processed[key] = {
                ...referenceValue,
                ...(typeof data[key] === 'object' ? data[key] : {}),
              };
            }
          } else {
            processed[key] = referenceValue;
          }
        } else {
          processed[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively process nested objects
        processed[key] = processFlexibleObjectReferencesRecursive(
          value,
          baseData,
        );
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  return data;
}
