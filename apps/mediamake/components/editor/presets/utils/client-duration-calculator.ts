import { InputCompositionProps, RenderableComponentData } from "@microfox/remotion";
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

// Cache for media duration calculations to avoid redundant work
// Key: src|startFrom|endAt|playbackRate
// Value: Promise<number | undefined>
const durationCache = new Map<string, Promise<number | undefined>>();

const getDurationCacheKey = (
  src: string,
  startFrom?: number,
  endAt?: number,
  playbackRate?: number
): string => {
  const startFromStr = startFrom === undefined ? "undefined" : String(startFrom);
  const endAtStr = endAt === undefined ? "undefined" : String(endAt);
  const playbackRateStr = playbackRate === undefined ? "1" : String(playbackRate);
  return `${src}|${startFromStr}|${endAtStr}|${playbackRateStr}`;
};

/**
 * Calculate duration for a single media component using mediabunny (client-side).
 * If calculation fails for any reason (CORS, unsupported format, etc.), returns undefined
 * and leaves props unchanged so backend can handle it.
 */
async function calculateComponentDurationClient(
  component: Pick<RenderableComponentData, "data" | "componentId">
): Promise<number | undefined> {
  const src = component.data?.src;
  if (!src || !src.startsWith("http")) {
    return undefined;
  }

  const startFrom = component.data?.startFrom;
  const endAt = component.data?.endAt;
  const playbackRate = component.data?.playbackRate || 1;
  const cacheKey = getDurationCacheKey(src, startFrom, endAt, playbackRate);

  if (durationCache.has(cacheKey)) {
    return durationCache.get(cacheKey);
  }

  const calculationPromise = (async (): Promise<number | undefined> => {
    try {
      const audioInput = new Input({
        formats: ALL_FORMATS,
        source: new UrlSource(src),
      });
      const audioDuration = await audioInput.computeDuration();

      let trimmedDuration = audioDuration;
      if (startFrom || endAt) {
        trimmedDuration =
          audioDuration -
          (startFrom || 0) -
          (endAt ? audioDuration - (endAt || 0) : 0);
      }

      const effectiveDuration = trimmedDuration / playbackRate;
      return effectiveDuration;
    } catch {
      // Don't log to avoid noise; backend will handle
      return undefined;
    }
  })();

  durationCache.set(cacheKey, calculationPromise);
  return calculationPromise;
}

function findNodeById(
  childrenData: RenderableComponentData[],
  targetId: string
): RenderableComponentData | null {
  for (const node of childrenData) {
    if (node.id === targetId) return node;
    if (node.childrenData?.length) {
      const found = findNodeById(node.childrenData, targetId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Find matching components by IDs
 */
function findMatchingComponents(
  childrenData: RenderableComponentData[],
  targetIds: string[]
): RenderableComponentData[] {
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
}

/**
 * Calculate duration based on fitDurationTo configuration
 */
async function calculateDurationClient(
  childrenData: RenderableComponentData[],
  config: {
    fitDurationTo: string[] | string;
  }
): Promise<number | undefined> {
  const targetIds = Array.isArray(config.fitDurationTo)
    ? config.fitDurationTo
    : [config.fitDurationTo];

  const matchingComponents = findMatchingComponents(
    childrenData || [],
    targetIds
  );

  if (matchingComponents.length === 1) {
    if (
      matchingComponents[0].type === 'atom' &&
      (matchingComponents[0].componentId === 'AudioAtom' ||
        matchingComponents[0].componentId === 'VideoAtom')
    ) {
      // Check if duration already exists in context before calculating
      if (matchingComponents[0].context?.timing?.duration) {
        return matchingComponents[0].context.timing.duration;
      } else {
        return await calculateComponentDurationClient(matchingComponents[0]);
      }
    }
    if (
      (matchingComponents[0].type === 'scene' ||
        matchingComponents[0].type === 'layout') &&
      matchingComponents[0].context?.timing?.duration
    ) {
      return matchingComponents[0].context.timing.duration;
    }
  }
  return undefined;
}

/**
 * Set durations in context for all components (client-side version).
 * Uses mediabunny for duration; if calculation fails, leaves props unchanged for backend.
 */
export async function setDurationsInContextClient(
  root: InputCompositionProps
): Promise<InputCompositionProps> {
  durationCache.clear();

  const iterateRecursively = async (
    components: RenderableComponentData[],
    onlyScene: boolean = false,
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

      // First pass: components with fitDurationTo — resolve from full tree if available, else from children
      const fitDurationTo = updatedComponent.context?.timing?.fitDurationTo;
      if (
        fitDurationTo &&
        (typeof fitDurationTo === "string" ? fitDurationTo.length > 0 : fitDurationTo.length > 0) &&
        !onlyScene &&
        fitDurationTo != updatedComponent.id &&
        fitDurationTo != "this" &&
        fitDurationTo != "fill"
      ) {
        let duration: number | undefined;
        if (fullTreeForLookup) {
          const targetNode = findNodeById(fullTreeForLookup, fitDurationTo as string);
          if (targetNode?.context?.timing?.duration != null) {
            duration = targetNode.context.timing.duration;
          }
        }
        if (duration === undefined) {
          duration = await calculateDurationClient(
            updatedComponent.childrenData || [],
            { fitDurationTo }
          );
        }
        if (duration !== undefined) {
          updatedComponent = {
            ...updatedComponent,
            context: {
              ...(updatedComponent.context || {}),
              timing: {
                ...(updatedComponent.context?.timing || {}),
                duration,
              },
            },
          };
        }
      }

      if (
        (updatedComponent.type === 'scene' ||
          updatedComponent.type === 'layout') &&
        onlyScene
      ) {
        let duration: number | undefined;

        const sceneFitDurationTo = updatedComponent.context?.timing?.fitDurationTo;
        const sceneChildrenData = updatedComponent.childrenData || [];
        if (
          sceneFitDurationTo &&
          sceneFitDurationTo !== updatedComponent.id &&
          sceneFitDurationTo !== 'this'
        ) {
          if (fullTreeForLookup) {
            const targetNode = findNodeById(fullTreeForLookup, sceneFitDurationTo as string);
            if (targetNode?.context?.timing?.duration != null) {
              duration = targetNode.context.timing.duration;
            }
          }
          if (duration === undefined) {
            duration = await calculateDurationClient(sceneChildrenData, {
              fitDurationTo: sceneFitDurationTo,
            });
          }
        } else if (!updatedComponent.context?.timing?.duration) {
          duration =
            sceneChildrenData.reduce(
              (acc, child) => acc + (child.context?.timing?.duration ?? 0),
              0
            ) ?? 10;
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

      if (updatedComponent.type === "atom" && !onlyScene) {
        if (
          updatedComponent.componentId === "VideoAtom" ||
          updatedComponent.componentId === "AudioAtom"
        ) {
          const needsDurationCalculation =
            !updatedComponent.context?.timing?.duration ||
            (updatedComponent.data?.loop && !updatedComponent.data?.srcDuration);

          let mediaDuration: number | undefined;
          if (needsDurationCalculation) {
            mediaDuration = await calculateComponentDurationClient(updatedComponent);
          } else {
            mediaDuration = updatedComponent.context?.timing?.duration;
          }

          if (mediaDuration === undefined) {
            // Skip - backend will handle
          } else if (!updatedComponent.context?.timing?.fitDurationTo) {
            updatedComponent.context = {
              ...(updatedComponent.context || {}),
              timing: {
                ...(updatedComponent.context?.timing || {}),
                duration: updatedComponent.context?.timing?.duration ?? mediaDuration,
              },
            };
            const componentData = updatedComponent.data || {};
            if (componentData.loop) {
              updatedComponent.data = { ...componentData, srcDuration: mediaDuration };
            }
          } else if (updatedComponent.context?.timing?.fitDurationTo) {
            updatedComponent.data = {
              ...(updatedComponent.data || {}),
              srcDuration: mediaDuration,
            };
          }
        }
      }

      // Second pass: set duration for atoms with fitDurationTo from full tree
      if (
        updatedComponent.type === "atom" &&
        onlyScene &&
        fullTreeForLookup &&
        updatedComponent.context?.timing?.fitDurationTo &&
        updatedComponent.context.timing.fitDurationTo !== updatedComponent.id &&
        updatedComponent.context.timing.fitDurationTo !== "this" &&
        updatedComponent.context.timing.fitDurationTo !== "fill"
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

  const rootChildrenData = root.childrenData || [];
  let updatedChildrenData = await iterateRecursively(rootChildrenData, false, null);
  updatedChildrenData = await iterateRecursively(updatedChildrenData, true, updatedChildrenData);

  return {
    ...root,
    childrenData: updatedChildrenData,
  };
}
