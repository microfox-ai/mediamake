import { InputCompositionProps } from '@microfox/remotion';
import {
  RenderableComponentData,
  replaceMatchingComponent,
} from '@microfox/datamotion';
import {
  PresetOutput,
  PresetPassedProps,
  PresetMetadata,
  Preset,
  DatabasePreset,
} from '../types';
import { presetStdLib } from './preset-stdlib';
import { getPredefinedPresetById } from '../registry/registry/presets-registry';

const findMatchingComponents = (
  childrenData: RenderableComponentData[],
  targetIds: string[],
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

const findMatchingComponentsByQuery = (
  childrenData: RenderableComponentData[],
  query: {
    type?: string;
    componentId?: string;
  },
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

// Export the new function
export { findMatchingComponentsByQuery };

/**
 * Helper function to get a preset by metadata.id from either predefined or database sources
 * Works in both server-side and client-side contexts
 */
const getPresetById = async (
  presetId: string,
): Promise<Preset | DatabasePreset | null> => {
  // First, try predefined presets
  const predefinedPreset = getPredefinedPresetById(presetId);
  if (predefinedPreset) {
    return predefinedPreset;
  }

  // Debug logging to help diagnose missing preset issues
  if (process.env.NODE_ENV === 'development') {
    console.debug(
      `[getPresetById] Preset "${presetId}" not found in predefined presets. Searching database...`,
    );
  }

  // Try to fetch from database by metadata.id
  // First, try server-side database access (if available)
  try {
    const { getDatabase } = await import('@/lib/mongodb');
    const db = await getDatabase();
    const collection = db.collection<DatabasePreset>('presets');
    const preset = await collection.findOne({
      'metadata.id': presetId,
    });
    if (preset) {
      return preset;
    }
  } catch (error) {
    // If database import fails (client-side), try API fetch
    if (typeof window !== 'undefined' || typeof fetch !== 'undefined') {
      try {
        const response = await fetch(`/api/presets/by-metadata-id/${presetId}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.preset) {
            return data.preset as DatabasePreset;
          }
        }
      } catch (fetchError) {
        console.warn(
          `Failed to fetch database preset by metadata.id ${presetId}:`,
          fetchError,
        );
      }
    }
  }

  return null;
};

// Helper function to clean function string by removing imports and type annotations
export const cleanFunctionString = (func: Function): string => {
  const funcString = func.toString();

  // Extract just the function body if it's a function declaration
  const functionMatch = funcString.match(/function\s*\([^)]*\)\s*{([\s\S]*)}/);
  if (functionMatch) {
    const functionBody = functionMatch[1];
    // Create a clean function with just the body
    return `function(params) {${functionBody}}`;
  }

  // For arrow functions, try to extract the body
  const arrowMatch = funcString.match(/\([^)]*\)\s*=>\s*{([\s\S]*)}/);
  if (arrowMatch) {
    const functionBody = arrowMatch[1];
    return `function(params) {${functionBody}}`;
  }

  // Fallback: return the original function string
  return funcString;
};

export const runPreset = async <T>(
  presetInput: any,
  presetFunction: string,
  props: PresetPassedProps,
  metadata?: PresetMetadata,
): Promise<PresetOutput | null> => {
  // Create a copy of props to inject dependencies
  const injectedProps: PresetPassedProps = { ...props };

  // Inject dependencies if metadata is provided
  if (metadata?.dependencies) {
    // Inject helper functions from stdlib
    if (
      metadata.dependencies.helpers &&
      metadata.dependencies.helpers.length > 0
    ) {
      injectedProps.helpers = {};
      for (const helperName of metadata.dependencies.helpers) {
        if (helperName in presetStdLib) {
          injectedProps.helpers[helperName] =
            presetStdLib[helperName as keyof typeof presetStdLib];
        } else {
          console.warn(
            `Helper function "${helperName}" not found in presetStdLib`,
          );
        }
      }
    }

    // Inject other presets as callable functions
    if (
      metadata.dependencies.presets &&
      metadata.dependencies.presets.length > 0
    ) {
      injectedProps.presets = {};
      for (const presetId of metadata.dependencies.presets) {
        const dependencyPreset = await getPresetById(presetId);
        if (dependencyPreset) {
          // Create a wrapper function that can be called from within the preset
          injectedProps.presets[presetId] = async (
            params: any,
            childProps?: Partial<PresetPassedProps>,
          ) => {
            const result = await runPreset(
              params,
              dependencyPreset.presetFunction,
              { ...injectedProps, ...childProps },
              dependencyPreset.metadata,
            );
            if (!result) {
              throw new Error(
                `Preset dependency "${presetId}" returned null or failed to execute`,
              );
            }

            // Handle internal presets - extract specific output based on _internalPresetOutput
            if (
              dependencyPreset.metadata._internalPreset &&
              dependencyPreset.metadata._internalPresetOutput
            ) {
              const outputType =
                dependencyPreset.metadata._internalPresetOutput;

              if (outputType === 'effects') {
                // Extract effects from the first child
                const firstChild = result.output.childrenData?.[0];
                if (firstChild?.effects) {
                  return {
                    ...result,
                    output: {
                      ...result.output,
                      _extractedEffects: Array.isArray(firstChild.effects)
                        ? firstChild.effects
                        : [firstChild.effects],
                    },
                  };
                }
              }
              // Add more output types as needed (children, data, etc.)
            }

            return result;
          };
        } else {
          // Throw an error if a required dependency is not found
          // This provides immediate feedback instead of failing later when the preset tries to use it
          // Debug: Try to get list of available preset IDs for better error message
          let availablePresetIds = 'N/A';
          try {
            const { predefinedPresets } = await import(
              '../registry/registry/presets-registry'
            );
            availablePresetIds = predefinedPresets
              .map(p => p.metadata.id)
              .join(', ');
          } catch (e) {
            // Ignore import errors
          }

          throw new Error(
            `Preset dependency "${presetId}" not found. Check metadata.dependencies. ` +
              `Looking for preset ID: "${presetId}". ` +
              `Available predefined preset IDs: ${availablePresetIds}`,
          );
        }
      }
    }
  }

  // Execute the preset function with injected dependencies
  const presetJsFunction = new Function(
    'data',
    'props',
    `return (${presetFunction})(data, props);`,
  );
  const output = await presetJsFunction(presetInput, injectedProps);
  if (!output) {
    return null;
  }
  return output as PresetOutput;
};

/** Recursively tag all nodes in the tree with _presetItemId for editor "out of sync" tracking. */
function tagNodesWithPresetItemId(
  nodes: RenderableComponentData[],
  presetItemId: string
): void {
  for (const node of nodes) {
    (node as RenderableComponentData & { _presetItemId?: string })._presetItemId =
      presetItemId;
    if (node.childrenData && node.childrenData.length > 0) {
      tagNodesWithPresetItemId(node.childrenData, presetItemId);
    }
  }
}

function tagNodesWithDataItemIds(
  nodes: RenderableComponentData[],
  dataItemIds: string[],
): void {
  if (!dataItemIds.length) return;
  for (const node of nodes) {
    const typedNode = node as RenderableComponentData & { _dataItemIds?: string[] };
    if (!Array.isArray(typedNode._dataItemIds) || typedNode._dataItemIds.length === 0) {
      typedNode._dataItemIds = [...dataItemIds];
    }
    if (node.childrenData && node.childrenData.length > 0) {
      tagNodesWithDataItemIds(node.childrenData, typedNode._dataItemIds || dataItemIds);
    }
  }
}

export const insertPresetToComposition = (
  data: InputCompositionProps,
  options: {
    presetOutput: PresetOutput;
    presetType: 'children' | 'data' | 'context' | 'effects' | 'full';
    /** Timeline preset item id; used to tag output nodes for "not in sync" indicator. */
    presetItemId?: string;
    dataItemIds?: string[];
  },
) => {
  // Extract the output data from the new PresetOutput structure
  const outputData = options.presetOutput.output;
  const outputOptions = options.presetOutput.options;
  const presetItemId = options.presetItemId;
  const dataItemIds = outputOptions?.dataItemIds || options.dataItemIds || [];

  if (!data.childrenData || data.childrenData.length === 0) {
    if (options.presetType === 'full') {
      data.childrenData = outputData.childrenData || [];
      if (presetItemId && data.childrenData.length > 0) {
        tagNodesWithPresetItemId(data.childrenData, presetItemId);
      }
      if (dataItemIds.length > 0 && data.childrenData.length > 0) {
        tagNodesWithDataItemIds(data.childrenData, dataItemIds);
      }
      if (outputData.config) {
        data.config = outputData.config;
      }
      if (outputData.style) {
        data.style = outputData.style;
      }
      return data;
    } else {
      return data;
    }
  }
  if (options.presetType === 'full') {
    data.childrenData = outputData.childrenData || [];
    if (presetItemId && data.childrenData.length > 0) {
      tagNodesWithPresetItemId(data.childrenData, presetItemId);
    }
    if (dataItemIds.length > 0 && data.childrenData.length > 0) {
      tagNodesWithDataItemIds(data.childrenData, dataItemIds);
    }
    if (outputData.config) {
      data.config = {
        ...data.config,
        ...outputData.config,
      };
    }
    if (outputData.style) {
      data.style = {
        ...data.style,
        ...outputData.style,
      };
    }
    return data;
  }

  // For children type presets, we need to handle the new structure
  if (options.presetType === 'children') {
    if (!outputData.childrenData || outputData.childrenData.length === 0) {
      return data;
    }

    // Find the target component to attach to based on options.attachedToId
    const targetId = outputOptions?.attachedToId || 'BaseScene';
    let targetComponents = findMatchingComponents(data.childrenData, [
      targetId,
    ]);

    if (targetComponents.length === 0) {
      // If no matching component found, use the first component
      targetComponents = [data.childrenData[0]];
    }

    // Append the preset children to the target component
    const targetComponent = targetComponents[0];
    if (targetComponent) {
      const newChildren = [...outputData.childrenData];
      if (presetItemId) tagNodesWithPresetItemId(newChildren, presetItemId);
      if (dataItemIds.length > 0) tagNodesWithDataItemIds(newChildren, dataItemIds);
      targetComponent.childrenData = [
        ...(targetComponent.childrenData || []),
        ...newChildren,
      ];

      // Apply attached containers styling if provided
      if (outputOptions?.attachedContainers) {
        // This would need to be handled by the rendering system
        // For now, we just ensure the children are added
      }
    }

    return data;
  }

  // For other preset types, we need to find the first child and apply changes
  if (!outputData.childrenData || outputData.childrenData.length === 0) {
    return data;
  }

  const firstChild = outputData.childrenData[0];
  const firstChildId = firstChild.id;
  let componeents = findMatchingComponents(data.childrenData, [firstChildId]);
  if (componeents.length === 0) {
    // THERE ARE NO BASE DATA, JUST ASSUME THE PRESET OUTPUT IS FULL THEN
    if (data.childrenData.length === 0) {
      data.childrenData = outputData.childrenData;
      if (presetItemId && data.childrenData.length > 0) {
        tagNodesWithPresetItemId(data.childrenData, presetItemId);
      }
      if (dataItemIds.length > 0 && data.childrenData.length > 0) {
        tagNodesWithDataItemIds(data.childrenData, dataItemIds);
      }
      if (outputData.config) {
        data.config = outputData.config;
      }
      if (outputData.style) {
        data.style = outputData.style;
      }
      return data;
    }
    componeents = [data.childrenData[0]];
  }

  if (presetItemId && componeents[0]) {
    (componeents[0] as RenderableComponentData & { _presetItemId?: string })._presetItemId =
      presetItemId;
  }
  if (dataItemIds.length > 0 && componeents[0]) {
    (componeents[0] as RenderableComponentData & { _dataItemIds?: string[] })._dataItemIds =
      dataItemIds;
  }

  if (options.presetType === 'data') {
    // For data type, we need to merge the data from the first child
    if (firstChild.data) {
      Object.entries(firstChild.data).forEach(([key, value]) => {
        if (!componeents[0].data) {
          componeents[0].data = {};
        }
        if (key in componeents[0].data) {
          if (Array.isArray(value)) {
            componeents[0].data[key] = [
              ...(componeents[0].data[key] || []),
              ...value,
            ];
          } else if (typeof value === 'object' && value !== null) {
            componeents[0].data[key] = {
              ...componeents[0].data[key],
              ...value,
            };
          } else {
            componeents[0].data[key] = value;
          }
        } else {
          componeents[0].data[key] = value;
        }
      });
    }

    // Replace matching components with components[0] before returning
    if (componeents.length > 0) {
      data.childrenData = replaceMatchingComponent(
        data.childrenData || [],
        [firstChildId],
        componeents[0],
      );
    }

    return data;
  }
  if (options.presetType === 'context') {
    if (firstChild.context) {
      componeents[0].context = {
        ...componeents[0].context,
        ...firstChild.context,
      };
    }

    // Replace matching components with components[0] before returning
    if (componeents.length > 0) {
      data.childrenData = replaceMatchingComponent(
        data.childrenData || [],
        [firstChildId],
        componeents[0],
      );
    }

    return data;
  }
  if (options.presetType === 'effects') {
    if (firstChild.effects) {
      componeents[0].effects = Array.isArray(firstChild.effects)
        ? firstChild.effects
        : [firstChild.effects];
    }

    // Replace matching components with components[0] before returning
    if (componeents.length > 0) {
      data.childrenData = replaceMatchingComponent(
        data.childrenData || [],
        [firstChildId],
        componeents[0],
      );
    }

    return data;
  }
  return data;
};
