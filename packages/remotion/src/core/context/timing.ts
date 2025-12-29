import { ALL_FORMATS, FilePathSource, Input, UrlSource } from 'mediabunny';
import { RenderableComponentData } from '../types';
import { InputCompositionProps } from '../../components/Composition';
import { parseMedia } from '@remotion/media-parser';

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
    const audioInput = new Input({
      formats: ALL_FORMATS,
      source: new UrlSource(src),
    });
    const audioDuration = await audioInput.computeDuration();

    // Calculate trimmed duration if startFrom or endAt is specified
    let trimmedDuration = audioDuration;
    if (component.data.startFrom || component.data.endAt) {
      trimmedDuration =
        audioDuration -
        (component.data.startFrom || 0) -
        (component.data.endAt
          ? audioDuration - (component.data.endAt || 0)
          : 0);
    }

    // Factor in playback rate - if playback rate is > 1, duration is shorter
    // if playback rate is < 1, duration is longer
    const playbackRate = component.data.playbackRate || 1;
    const effectiveDuration = trimmedDuration / playbackRate;

    return effectiveDuration;
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
      calculatedDuration = await calculateComponentDuration(
        matchingComponents[0]
      );
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
  const iterateRecursively = async (
    components: RenderableComponentData[],
    onlyScene: boolean = false
  ): Promise<RenderableComponentData[]> => {
    const updatedComponents: RenderableComponentData[] = [];

    for (const component of components) {
      let updatedComponent = { ...component };

      // Recursively process childrenData if it exists
      if (component.childrenData && component.childrenData.length > 0) {
        updatedComponent.childrenData = await iterateRecursively(
          component.childrenData,
          onlyScene
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
        const duration = await calculateDuration(
          updatedComponent.childrenData,
          {
            fitDurationTo: updatedComponent.context?.timing?.fitDurationTo,
          }
        );

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

        // If fitDurationTo is set and points to another component, calculate duration from that component
        if (
          updatedComponent.context?.timing?.fitDurationTo &&
          updatedComponent.context.timing.fitDurationTo !==
            updatedComponent.id &&
          updatedComponent.context.timing.fitDurationTo !== 'this'
        ) {
          duration = await calculateDuration(updatedComponent.childrenData, {
            fitDurationTo: updatedComponent.context.timing.fitDurationTo,
          });
        }
        // If fitDurationTo is 'this' or same as component id, or no fitDurationTo, sum children durations
        else if (!updatedComponent.context?.timing?.duration) {
          duration =
            updatedComponent.childrenData.reduce(
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

      if (updatedComponent.type === 'atom' && !onlyScene) {
        if (
          updatedComponent.componentId === 'VideoAtom' ||
          updatedComponent.componentId === 'AudioAtom'
        ) {
          const mediaDuration =
            await calculateComponentDuration(updatedComponent);
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
              ...(updatedComponent.data.loop
                ? { srcDuration: mediaDuration }
                : {}),
            };
          } else if (updatedComponent.context?.timing?.fitDurationTo) {
            updatedComponent.data = {
              ...updatedComponent.data,
              srcDuration: mediaDuration,
            };
          }
        }
      }

      updatedComponents.push(updatedComponent);
    }

    return updatedComponents;
  };

  let updatedChildrenData = await iterateRecursively(root.childrenData, false);
  updatedChildrenData = await iterateRecursively(updatedChildrenData, true);

  return {
    ...root,
    childrenData: updatedChildrenData,
  };
};
