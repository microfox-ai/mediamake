/**
 * Preset Standard Library
 * 
 * A collection of reusable helper functions that can be injected into presets
 * via the dependency injection system. These functions are available to all
 * presets that declare them in their metadata.dependencies.helpers array.
 */

import { ALL_FORMATS, Input, UrlSource } from 'mediabunny';
import { RenderableComponentData } from '@microfox/datamotion';
import { GenericEffectData } from '@microfox/remotion';

/**
 * Gets media duration from URL using mediabunny (client-safe).
 * Returns undefined on failure; backend can handle fallback.
 */
export const getMediaDuration = async (
  src: string,
): Promise<number | undefined> => {
  if (!src?.startsWith('http')) return undefined;
  try {
    const audioInput = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src),
    });
    return await audioInput.computeDuration();
  } catch {
    return undefined;
  }
};

/**
 * Recursively searches for components matching the given IDs
 */
export const findMatchingComponents = (
  childrenData: RenderableComponentData[],
  targetIds: string[],
): RenderableComponentData[] => {
  const matches: RenderableComponentData[] = [];

  const searchRecursively = (components: RenderableComponentData[]) => {
    for (const component of components) {
      if (targetIds.includes(component.id)) {
        matches.push(component);
      }

      if (component.childrenData && component.childrenData.length > 0) {
        searchRecursively(component.childrenData);
      }
    }
  };

  searchRecursively(childrenData);
  return matches;
};

/**
 * Searches for components matching a query (type and/or componentId)
 */
export const findMatchingComponentsByQuery = (
  childrenData: RenderableComponentData[],
  query: {
    type?: string;
    componentId?: string;
  },
): RenderableComponentData[] => {
  const matches: RenderableComponentData[] = [];

  const searchRecursively = (components: RenderableComponentData[]) => {
    for (const component of components) {
      let matchesQuery = false;

      if (query.type && component.type === query.type) {
        matchesQuery = true;
      }

      if (query.componentId && component.componentId === query.componentId) {
        matchesQuery = true;
      }

      if (query.type && query.componentId) {
        matchesQuery =
          component.type === query.type &&
          component.componentId === query.componentId;
      }

      if (matchesQuery) {
        matches.push(component);
      }

      if (component.childrenData && component.childrenData.length > 0) {
        searchRecursively(component.childrenData);
      }
    }
  };

  searchRecursively(childrenData);
  return matches;
};

/**
 * Converts hex color to RGB object
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  // Ensure hex is a string
  if (typeof hex !== 'string') {
    console.warn('hexToRgb received non-string value:', hex);
    return { r: 255, g: 255, b: 255 }; // Default to white
  }
  
  // Remove # if present
  const cleanHex = hex.startsWith('#') ? hex : `#${hex}`;
  
  return {
    r: parseInt(cleanHex.slice(1, 3), 16),
    g: parseInt(cleanHex.slice(3, 5), 16),
    b: parseInt(cleanHex.slice(5, 7), 16),
  };
};

/**
 * Pre-processes captions to split combined words
 */
export const preprocessCaptions = (captions: any[]): any[] => {
  if (!captions || !Array.isArray(captions)) {
    throw new Error('preprocessCaptions expects an array');
  }

  return captions.map((caption) => {
    const processedWords: any[] = [];
    let originalWordIndex = 0;

    for (const word of caption.words) {
      if (word.text.includes(' ')) {
        const subWords = word.text.split(' ');
        const wordDuration = word.duration;
        const wordStart = word.start;
        const wordAbsoluteStart = word.absoluteStart;

        const subWordDuration = wordDuration / subWords.length;

        subWords.forEach((subWord: string, index: number) => {
          const subWordStart = wordStart + index * subWordDuration;
          const subWordAbsoluteStart =
            wordAbsoluteStart + index * subWordDuration;
          const subWordAbsoluteEnd = subWordAbsoluteStart + subWordDuration;

          processedWords.push({
            ...word,
            text: subWord.trim(),
            start: subWordStart,
            duration: subWordDuration,
            absoluteStart: subWordAbsoluteStart,
            absoluteEnd: subWordAbsoluteEnd,
            originalWordIndex: originalWordIndex,
            isSubWord: true,
          });
        });
      } else {
        processedWords.push({
          ...word,
          originalWordIndex: originalWordIndex,
          isSubWord: false,
        });
      }
      originalWordIndex++;
    }

    return {
      ...caption,
      words: processedWords,
    };
  });
};

/**
 * Splits sentence into parts based on character count or provided split points
 */
export const splitSentenceIntoParts = (
  words: any[],
  maxLines?: number,
  splitParts?: string[],
): any[][] => {
  if (splitParts && splitParts.length > 0) {
    const parts: any[][] = [];
    let currentWordIndex = 0;

    for (const splitPart of splitParts) {
      const partWords: any[] = [];
      const targetText = splitPart.trim().toLowerCase();

      while (currentWordIndex < words.length) {
        const word = words[currentWordIndex];
        const wordText = word.text.toLowerCase();

        if (
          targetText.includes(wordText) ||
          wordText.includes(targetText.split(' ')[0])
        ) {
          partWords.push(word);
          currentWordIndex++;

          if (partWords.length >= splitPart.split(' ').length) {
            break;
          }
        } else {
          break;
        }
      }

      if (partWords.length > 0) {
        parts.push(partWords);
      }
    }

    if (currentWordIndex < words.length) {
      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        lastPart.push(...words.slice(currentWordIndex));
      } else {
        parts.push(words.slice(currentWordIndex));
      }
    }

    return parts.length > 0 ? parts : [words];
  }

  // Fallback to character-based splitting
  if (words.length <= 1) {
    return [words];
  }

  const targetLines = maxLines || 5;
  const totalCharacters = words.reduce(
    (sum, word) => sum + word.text.length,
    0,
  );
  const targetCharsPerLine = Math.ceil(totalCharacters / targetLines);

  const parts: any[][] = [];
  let currentPart: any[] = [];
  let currentCharCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const wordLength = word.text.length;

    currentPart.push(word);
    currentCharCount += wordLength;

    if (currentCharCount >= targetCharsPerLine || i === words.length - 1) {
      parts.push([...currentPart]);
      currentPart = [];
      currentCharCount = 0;
    }
  }

  if (parts.length > targetLines) {
    const lastPart = parts.pop();
    const secondLastPart = parts.pop();
    if (secondLastPart && lastPart) {
      parts.push([...secondLastPart, ...lastPart]);
    }
  }

  return parts;
};

/**
 * Creates an opacity fade-in effect
 */
export const createOpacityEffect = (
  wordId: string,
  word: any,
  caption?: any,
): GenericEffectData => ({
  type: 'ease-out',
  start: word.start,
  duration: 0.6,
  mode: 'provider',
  targetIds: [wordId],
  ranges: [
    { key: 'opacity', val: 0, prog: 0 },
    { key: 'opacity', val: 1, prog: 1 },
  ],
});

/**
 * Creates a scale effect for word entrance
 */
export const createScaleEffect = (
  wordId: string,
  word: any,
  impact: number,
): GenericEffectData => ({
  type: 'spring',
  start: word.start,
  duration: 0.4,
  mode: 'provider',
  targetIds: [wordId],
  ranges: [
    { key: 'scale', val: 0.8, prog: 0 },
    { key: 'scale', val: 1.05 * impact, prog: 0.7 },
    { key: 'scale', val: 1, prog: 1 },
  ],
});

/**
 * Creates a glow effect for gradient text
 * Can be called with either:
 * - Individual params: (wordId, word, accentColor, impact)
 * - Options object: (wordId, word, { color, intensity })
 */
export const createGradientGlowEffect = (
  wordId: string,
  word: any,
  accentColorOrOptions: string | { color?: string; intensity?: number },
  impact?: number,
): GenericEffectData => {
  // Handle both calling conventions
  let accentColor: string;
  let effectImpact: number;
  
  if (typeof accentColorOrOptions === 'object' && accentColorOrOptions !== null) {
    // Called with options object
    accentColor = accentColorOrOptions.color || '#ff6b6b';
    effectImpact = accentColorOrOptions.intensity || 1;
  } else {
    // Called with individual parameters (legacy)
    accentColor = accentColorOrOptions as string;
    effectImpact = impact || 1;
  }

  const accentRgb = hexToRgb(accentColor);

  return {
    type: 'ease-in-out',
    start: word.start,
    duration: Math.max(1.5, word.duration * 0.8),
    mode: 'provider',
    targetIds: [wordId],
    ranges: [
      {
        key: 'filter',
        val: `drop-shadow(0 0 0px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0))` as any,
        prog: 0,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${12 * effectImpact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.8)) drop-shadow(0 0 ${24 * effectImpact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.4))` as any,
        prog: 0.5,
      },
      {
        key: 'filter',
        val: `drop-shadow(0 0 ${8 * effectImpact}px rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},0.6))` as any,
        prog: 1,
      },
    ],
  };
};

/**
 * Creates a wave floating effect
 */
export const createWaveFloatEffect = (
  wordId: string,
  word: any,
  impact: number,
): GenericEffectData => {
  const duration = Math.max(2.5, word.duration * 1.5);
  const waveCount = Math.floor(duration / 1.0);
  const ranges = [];

  for (let i = 0; i <= waveCount; i++) {
    const prog = i / waveCount;
    const waveValue = Math.sin(prog * Math.PI * 2) * 5 * impact;
    ranges.push({ key: 'translateY', val: waveValue, prog });
  }

  ranges.push({ key: 'translateY', val: 0, prog: 1 });

  return {
    type: 'ease-in-out',
    start: word.start,
    duration: duration,
    mode: 'provider',
    targetIds: [wordId],
    ranges,
  };
};

/**
 * Creates a pulse effect
 * Can be called with either:
 * - Individual params: (wordId, word, impact)
 * - Options object: (wordId, word, { intensity })
 */
export const createPulseEffect = (
  wordId: string,
  word: any,
  impactOrOptions: number | { intensity?: number },
): GenericEffectData => {
  // Handle both calling conventions
  let impact: number;
  
  if (typeof impactOrOptions === 'object' && impactOrOptions !== null) {
    // Called with options object
    impact = impactOrOptions.intensity || 1;
  } else {
    // Called with individual parameter (legacy)
    impact = impactOrOptions as number;
  }

  const duration = Math.max(1.2, word.duration * 0.8);
  const pulseCount = Math.floor(duration / 0.6);
  const ranges = [];

  for (let i = 0; i <= pulseCount; i++) {
    const prog = i / pulseCount;
    const scaleValue = 1 + Math.sin(prog * Math.PI * 2) * 0.08 * impact;
    ranges.push({ key: 'scale', val: scaleValue, prog });
  }

  ranges.push({ key: 'scale', val: 1, prog: 1 });

  return {
    type: 'ease-in-out',
    start: word.start,
    duration: duration,
    mode: 'provider',
    targetIds: [wordId],
    ranges,
  };
};

/**
 * Applies noGaps extension to reduce gaps between captions
 */
export const applyNoGapsExtension = (
  captions: any[],
  noGapsConfig: { enabled?: boolean; maxLength?: number },
): any[] => {
  if (!captions || !Array.isArray(captions)) {
    return captions;
  }

  if (!noGapsConfig?.enabled) {
    return captions;
  }

  const maxExtension = noGapsConfig.maxLength || 3;
  const extendedCaptions = [...captions];

  for (let i = 0; i < extendedCaptions.length - 1; i++) {
    const currentCaption = extendedCaptions[i];
    const nextCaption = extendedCaptions[i + 1];

    const currentEnd = currentCaption.absoluteEnd;
    const nextStart = nextCaption.absoluteStart;
    const gap = nextStart - currentEnd;

    if (gap > 0) {
      const extensionAmount = Math.min(gap, maxExtension);
      const newDuration = currentCaption.duration + extensionAmount;
      const newAbsoluteEnd = currentCaption.absoluteStart + newDuration;

      extendedCaptions[i] = {
        ...currentCaption,
        duration: newDuration,
        absoluteEnd: newAbsoluteEnd,
        words: currentCaption.words.map((word: any, j: number) => {
          if (j === currentCaption.words.length - 1) {
            return {
              ...word,
              duration: word.duration + extensionAmount,
              absoluteEnd: word.absoluteEnd + extensionAmount,
            };
          }
          return word;
        }),
      };
    }
  }

  return extendedCaptions;
};

export const applyDataItemIdsToNodeTree = (
  node: RenderableComponentData,
  dataItemIds: string[],
): void => {
  (node as RenderableComponentData & { _dataItemIds?: string[] })._dataItemIds =
    dataItemIds;
  node.childrenData?.forEach((child) => {
    applyDataItemIdsToNodeTree(child, dataItemIds);
  });
};

/**
 * Standard library object containing all helper functions
 */
export const presetStdLib = {
  findMatchingComponents,
  findMatchingComponentsByQuery,
  getMediaDuration,
  hexToRgb,
  preprocessCaptions,
  splitSentenceIntoParts,
  createOpacityEffect,
  createScaleEffect,
  createGradientGlowEffect,
  createWaveFloatEffect,
  createPulseEffect,
  applyNoGapsExtension,
  applyDataItemIdsToNodeTree,
};

export type PresetStdLib = typeof presetStdLib;


