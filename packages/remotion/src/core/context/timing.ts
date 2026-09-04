import { ALL_FORMATS, FilePathSource, Input, UrlSource } from 'mediabunny';
import { RenderableComponentData } from '../types';
import { InputCompositionProps } from '../../components/Composition';
import { parseMedia } from '@remotion/media-parser';

export class MediaLoadError extends Error {
  readonly src: string;
  readonly componentId: string;
  readonly mediaType: 'audio' | 'video';

  constructor(componentId: string, src: string) {
    const mediaType = componentId === 'VideoAtom' ? 'video' : 'audio';
    const label = mediaType === 'video' ? 'Video' : 'Audio';
    const truncatedSrc = src.length > 80 ? `${src.slice(0, 77)}...` : src;
    super(
      `${label} could not be loaded. The URL may be incorrect or unplayable: ${truncatedSrc}`
    );
    this.name = 'MediaLoadError';
    this.src = src;
    this.componentId = componentId;
    this.mediaType = mediaType;
  }
}

export function getMediaLoadErrorMessage(error: unknown): string {
  if (error instanceof MediaLoadError) {
    return error.message;
  }
  if (error instanceof Error && /failed to fetch/i.test(error.message)) {
    return 'Media could not be loaded. The URL may be incorrect or unplayable.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Media could not be loaded. The URL may be incorrect or unplayable.';
}

// Cache for media duration calculations to avoid redundant API calls
// Key: cache key based on src + startFrom + endAt + playbackRate
// Value: Promise<number | undefined> to handle concurrent requests
const durationCache = new Map<string, Promise<number | undefined>>();

/**
 * Generate a cache key for duration calculation
 * Same src with same trim/playback settings should use the same cache entry
 * Uses explicit 'undefined' string to distinguish between 0 and undefined values
 */
const getDurationCacheKey = (
  src: string,
  startFrom?: number,
  endAt?: number,
  playbackRate?: number
): string => {
  // Use explicit string representations to avoid collisions:
  // - undefined becomes 'undefined'
  // - 0 becomes '0'
  // - null becomes 'null' (if ever used)
  const startFromStr = startFrom === undefined ? 'undefined' : String(startFrom);
  const endAtStr = endAt === undefined ? 'undefined' : String(endAt);
  const playbackRateStr = playbackRate === undefined ? '1' : String(playbackRate);
  return `${src}|${startFromStr}|${endAtStr}|${playbackRateStr}`;
};

/** Find a single node by id in the tree (searches recursively). */
export const findNodeById = (
  childrenData: RenderableComponentData[],
  targetId: string
): RenderableComponentData | null => {
  for (const node of childrenData) {
    if (node.id === targetId) return node;
    if (node.childrenData?.length) {
      const found = findNodeById(node.childrenData, targetId);
      if (found) return found;
    }
  }
  return null;
};

export const findMatchingComponents = (
  childrenData: RenderableComponentData[],
  targetIds: string[]
): RenderableComponentData[] => {
  const matches: RenderableComponentData[] = [];

  const searchRecursively = (components: RenderableComponentData[]) => {
    for (const component of components) {
      // Check if this component's ID matches any target ID
      if (targetIds.includes(component.id)) {
        matches.push(component);
      }

      // Recursively search in childrenData if it exists
      if (component.childrenData && component.childrenData.length > 0) {
        searchRecursively(component.childrenData);
      }
    }
  };

  searchRecursively(childrenData);
  return matches;
};

export const findMatchingComponentsByQuery = (
  childrenData: RenderableComponentData[],
  query: {
    type?: string;
    componentId?: string;
  }
): RenderableComponentData[] => {
  const matches: RenderableComponentData[] = [];

  const searchRecursively = (components: RenderableComponentData[]) => {
    for (const component of components) {
      // Check if this component matches the query criteria
      let matchesQuery = false;

      if (query.type && component.type === query.type) {
        matchesQuery = true;
      }

      if (query.componentId && component.componentId === query.componentId) {
        matchesQuery = true;
      }

      // If both type and componentId are provided, both must match
      if (query.type && query.componentId) {
        matchesQuery =
          component.type === query.type &&
          component.componentId === query.componentId;
      }

      if (matchesQuery) {
        matches.push(component);
      }

      // Recursively search in childrenData if it exists
      if (component.childrenData && component.childrenData.length > 0) {
        searchRecursively(component.childrenData);
      }
    }
  };

  searchRecursively(childrenData);
  return matches;
};

export const calculateComponentDuration = async (
  component: Pick<RenderableComponentData, 'data' | 'componentId'>
): Promise<number | undefined> => {
  const src = component.data.src;
  if (src?.startsWith('http')) {
    const startFrom = component.data.startFrom;
    const endAt = component.data.endAt;
    const playbackRate = component.data.playbackRate || 1;
    const cacheKey = getDurationCacheKey(src, startFrom, endAt, playbackRate);

    // Check cache first
    if (durationCache.has(cacheKey)) {
      return durationCache.get(cacheKey);
    }

    // Create the calculation promise and cache it immediately (to handle concurrent requests)
    const calculationPromise = (async () => {
      try {
        const audioInput = new Input({
          formats: ALL_FORMATS,
          source: new UrlSource(src),
        });
        const audioDuration = await audioInput.computeDuration();

        // Calculate trimmed duration if startFrom or endAt is specified
        let trimmedDuration = audioDuration;
        if (startFrom || endAt) {
          trimmedDuration =
            audioDuration -
            (startFrom || 0) -
            (endAt
              ? audioDuration - (endAt || 0)
              : 0);
        }

        // Factor in playback rate - if playback rate is > 1, duration is shorter
        // if playback rate is < 1, duration is longer
        const effectiveDuration = trimmedDuration / playbackRate;

        return effectiveDuration;
      } catch {
        durationCache.delete(cacheKey);
        throw new MediaLoadError(component.componentId ?? 'AudioAtom', src);
      }
    })();

    // Cache the promise (not the result) so concurrent requests share the same calculation
    durationCache.set(cacheKey, calculationPromise);

    return calculationPromise;
  } else {
    // NOT SUPPORTED
    // if (matchingComponents[0].componentId === "VideoAtom") {
    //     const { slowDurationInSeconds, dimensions } = await parseMedia({
    //         src: src,
    //         fields: {
    //             slowDurationInSeconds: true,
    //             dimensions: true,
    //         },
    //     });
    // }
    // try {
    //   console.log(process.cwd() + '../../public/' + src);
    //   cobst file = fs.readFileSync(process.cwd() + '../../public/' + src);
    //   const source = new FilePathSource(process.cwd() + '../../public/' + src);
    //   console.log(source);
    //   const audioInput = new Input({
    //     formats: ALL_FORMATS,
    //     source: source,
    //   });
    //   const calculatedDuration = await audioInput.computeDuration();
    //   return calculatedDuration;
    // } catch (error) {
    //   console.error('Error calculating duration', error);
    //   return undefined;
    // }
  }
};
export const calculateDuration = async (
  childrenData: RenderableComponentData[],
  config: {
    fitDurationTo: string[] | string;
  }
): Promise<number | undefined> => {
  // Helper function to recursively find all matching component IDs

  let calculatedDuration: number | undefined = undefined;
  // Convert fitDurationTo to array if it's a string
  const targetIds = Array.isArray(config.fitDurationTo)
    ? config.fitDurationTo
    : [config.fitDurationTo];

  // Find all matching components
  const matchingComponents = findMatchingComponents(
    childrenData || [],
    targetIds
  );

  // Now you can use matchingComponents to calculate the duration
  // For example, you might want to find the maximum duration among matching components
  // or sum their durations, etc.

  if (matchingComponents.length === 1) {
    if (
      matchingComponents[0].type === 'atom' &&
      (matchingComponents[0].componentId === 'AudioAtom' ||
        matchingComponents[0].componentId === 'VideoAtom')
    ) {
      // Check if duration already exists in context before calculating
      if (matchingComponents[0].context?.timing?.duration) {
        calculatedDuration = matchingComponents[0].context.timing.duration;
      } else {
        calculatedDuration = await calculateComponentDuration(
          matchingComponents[0]
        );
      }
    }
    if (
      (matchingComponents[0].type === 'scene' ||
        matchingComponents[0].type === 'layout') &&
      matchingComponents[0].context?.timing?.duration
    ) {
      calculatedDuration = matchingComponents[0].context.timing.duration;
    }
  }
  return calculatedDuration;
};

export const setDurationsInContext = async (root: InputCompositionProps) => {
  // Clear cache at the start of each rendering cycle to ensure fresh calculations
  durationCache.clear();
  const iterateRecursively = async (
    components: RenderableComponentData[],
    onlyScene: boolean = false,
    /** When set (e.g. result of first pass), fitDurationTo is resolved by looking up target in this tree (siblings/parent tree). */
    fullTreeForLookup: RenderableComponentData[] | null = null
  ): Promise<RenderableComponentData[]> => {
    const updatedComponents: RenderableComponentData[] = [];

    for (const component of components) {
      let updatedComponent = { ...component };

      // Recursively process childrenData if it exists
      if (component.childrenData && component.childrenData.length > 0) {
        updatedComponent.childrenData = await iterateRecursively(
          component.childrenData,
          onlyScene,
          fullTreeForLookup
        );
      }

      // Check if this component's ID matches any target ID ( if fitDurationTo exists )
      if (
        updatedComponent.context?.timing?.fitDurationTo?.length > 0 &&
        !onlyScene &&
        updatedComponent.context?.timing?.fitDurationTo !=
          updatedComponent.id &&
        updatedComponent.context?.timing?.fitDurationTo != 'this' &&
        updatedComponent.context?.timing?.fitDurationTo != 'fill'
      ) {
        // Only calculate duration if it's not already set (from client-side calculation)
        let duration = updatedComponent.context?.timing?.duration;
        if (!duration && fullTreeForLookup) {
          const targetNode = findNodeById(
            fullTreeForLookup,
            updatedComponent.context!.timing!.fitDurationTo as string
          );
          if (targetNode?.context?.timing?.duration != null) {
            duration = targetNode.context.timing.duration;
          }
        }
        if (!duration) {
          duration = await calculateDuration(
            updatedComponent.childrenData,
            {
              fitDurationTo: updatedComponent.context?.timing?.fitDurationTo,
            }
          );
        }

        // Create a new context object with updated timing
        updatedComponent = {
          ...updatedComponent,
          context: {
            ...updatedComponent.context,
            timing: {
              ...updatedComponent.context.timing,
              duration: duration,
            },
          },
        };
      }

      if (
        (updatedComponent.type === 'scene' ||
          updatedComponent.type === 'layout') &&
        onlyScene
      ) {
        let duration: number | undefined;

        // If fitDurationTo is set and points to another component, resolve from full tree first (sibling), else from children
        if (
          updatedComponent.context?.timing?.fitDurationTo &&
          updatedComponent.context.timing.fitDurationTo !==
            updatedComponent.id &&
          updatedComponent.context.timing.fitDurationTo !== 'this'
        ) {
          if (fullTreeForLookup) {
            const targetNode = findNodeById(
              fullTreeForLookup,
              updatedComponent.context.timing.fitDurationTo as string
            );
            if (targetNode?.context?.timing?.duration != null) {
              duration = targetNode.context.timing.duration;
            }
          }
          if (duration === undefined) {
            duration = await calculateDuration(updatedComponent.childrenData, {
              fitDurationTo: updatedComponent.context.timing.fitDurationTo,
            });
          }
        }
        // If fitDurationTo is 'this' or same as component id, or no fitDurationTo, sum children durations
        // Only calculate if duration is not already set (from client-side calculation)
        else if (!updatedComponent.context?.timing?.duration) {
          duration =
            updatedComponent.childrenData.reduce(
              (acc, child) => acc + (child.context?.timing?.duration ?? 0),
              0
            ) ?? 10;
        } else {
          // Use existing duration if already set
          duration = updatedComponent.context.timing.duration;
        }

        if (duration !== undefined) {
          updatedComponent.context = {
            ...(updatedComponent.context || {}),
            timing: {
              ...(updatedComponent.context?.timing || {}),
              duration: duration,
            },
          };
        }
      }

      if (updatedComponent.type === 'atom' && !onlyScene) {
        if (
          updatedComponent.componentId === 'VideoAtom' ||
          updatedComponent.componentId === 'AudioAtom'
        ) {
          // Only calculate duration if:
          // 1. We don't have a duration in context yet, OR
          // 2. We need srcDuration for looping (even if duration exists)
          const needsDurationCalculation =
            !updatedComponent.context?.timing?.duration ||
            (updatedComponent.data?.loop && !updatedComponent.data?.srcDuration);

          let mediaDuration: number | undefined;

          if (needsDurationCalculation) {
            mediaDuration = await calculateComponentDuration(updatedComponent);
          } else {
            mediaDuration = updatedComponent.context?.timing?.duration;
          }

          if (!updatedComponent.context?.timing?.fitDurationTo) {
            updatedComponent.context = {
              ...(updatedComponent.context || {}),
              timing: {
                ...(updatedComponent.context?.timing || {}),
                duration:
                  updatedComponent?.context?.timing?.duration || mediaDuration,
              },
            };
            updatedComponent.data = {
              ...updatedComponent.data,
              ...(updatedComponent.data.loop && mediaDuration
                ? { srcDuration: mediaDuration }
                : {}),
            };
          } else if (updatedComponent.context?.timing?.fitDurationTo && mediaDuration) {
            updatedComponent.data = {
              ...updatedComponent.data,
              srcDuration: mediaDuration,
            };
          }
        }
      }

      // Second pass: set duration for atoms that have fitDurationTo (target may be sibling/parent, so use full tree)
      if (
        updatedComponent.type === 'atom' &&
        onlyScene &&
        fullTreeForLookup &&
        updatedComponent.context?.timing?.fitDurationTo &&
        updatedComponent.context.timing.fitDurationTo !== updatedComponent.id &&
        updatedComponent.context.timing.fitDurationTo !== 'this' &&
        updatedComponent.context.timing.fitDurationTo !== 'fill'
      ) {
        const targetNode = findNodeById(
          fullTreeForLookup,
          updatedComponent.context.timing.fitDurationTo as string
        );
        if (targetNode?.context?.timing?.duration != null) {
          updatedComponent = {
            ...updatedComponent,
            context: {
              ...updatedComponent.context,
              timing: {
                ...updatedComponent.context.timing,
                duration: targetNode.context.timing.duration,
              },
            },
          };
        }
      }

      updatedComponents.push(updatedComponent);
    }

    return updatedComponents;
  };

  let updatedChildrenData = await iterateRecursively(root.childrenData ?? [], false, null);
  updatedChildrenData = await iterateRecursively(updatedChildrenData, true, updatedChildrenData);

  const fps = root.config?.fps ?? 30;
  updatedChildrenData = propagateTimingToChildren(updatedChildrenData, fps);

  return {
    ...root,
    childrenData: updatedChildrenData,
  };
};

/**
 * Propagate relative start/duration to children so every node has context.timing.
 * Children's start is relative to parent; layout children default start=0, scene children default start=sum(previous siblings' durations).
 * Only fills in missing start/duration; does not overwrite existing.
 */
function propagateTimingToChildren(
  components: RenderableComponentData[],
  fps: number,
  parentTiming?: { start: number; duration: number },
  parentType?: 'layout' | 'scene'
): RenderableComponentData[] {
  let runningSum = 0;
  const result: RenderableComponentData[] = [];

  for (const component of components) {
    let updatedComponent = { ...component };

    if (parentTiming != null) {
      const existingStart = updatedComponent.context?.timing?.start;
      const existingDuration = updatedComponent.context?.timing?.duration;
      const relativeStart = existingStart ?? (parentType === 'scene' ? runningSum : 0);
      const relativeDuration = existingDuration ?? parentTiming.duration;
      const startInFrames = Math.round(relativeStart * fps);
      const durationInFrames = Math.round(relativeDuration * fps);

      updatedComponent = {
        ...updatedComponent,
        context: {
          ...updatedComponent.context,
          timing: {
            ...updatedComponent.context?.timing,
            start: relativeStart,
            duration: relativeDuration,
            startInFrames,
            durationInFrames,
          },
        },
      };

      if (parentType === 'scene') {
        runningSum += relativeDuration;
      }
    }

    if (updatedComponent.childrenData && updatedComponent.childrenData.length > 0) {
      const childParentStart = updatedComponent.context?.timing?.start ?? 0;
      const childParentDuration = updatedComponent.context?.timing?.duration ?? 0;
      updatedComponent.childrenData = propagateTimingToChildren(
        updatedComponent.childrenData,
        fps,
        { start: childParentStart, duration: childParentDuration },
        updatedComponent.type === 'scene' ? 'scene' : 'layout'
      );
    }

    result.push(updatedComponent);
  }

  return result;
}
