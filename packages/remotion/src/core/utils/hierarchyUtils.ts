import { VideoConfig } from 'remotion';
import {
  RenderableComponentData,
  Hierarchy,
  CalculatedTiming,
  RenderableContext,
} from '../types';
import { calculateTiming } from './timing';

/**
 * Lookup index for one composition tree, cached per root array.
 *
 * These lookups only depend on the tree, but ComponentRenderer called them for
 * every node on every render, making each render pass O(N^2). Duplicate ids
 * resolve to the first match in pre-order, as the previous searches did.
 */
interface TreeIndex {
  nodeById: Map<string, RenderableComponentData>;
  parentById: Map<string, RenderableComponentData | null>;
  hierarchyById: Map<string, Hierarchy>;
}

const treeIndexCache = new WeakMap<RenderableComponentData[], TreeIndex>();

const buildTreeIndex = (root: RenderableComponentData[]): TreeIndex => {
  const index: TreeIndex = {
    nodeById: new Map(),
    parentById: new Map(),
    hierarchyById: new Map(),
  };

  const ancestors: string[] = [];

  const walk = (
    components: RenderableComponentData[],
    parent: RenderableComponentData | null
  ): void => {
    // Whole sibling list first: findParentComponent checked all of a node's
    // direct children before descending, so a node reachable both as a direct
    // child and deeper in an earlier sibling resolves to the shallower parent.
    // Root-level nodes get no entry, matching the old search.
    if (parent) {
      for (const component of components) {
        if (!index.parentById.has(component.id)) {
          index.parentById.set(component.id, parent);
        }
      }
    }

    for (const component of components) {
      const id = component.id;
      if (!index.nodeById.has(id)) index.nodeById.set(id, component);
      if (!index.hierarchyById.has(id)) {
        index.hierarchyById.set(id, {
          depth: ancestors.length,
          parentIds: [...ancestors],
        });
      }

      if (component.childrenData && component.childrenData.length > 0) {
        ancestors.push(id);
        walk(component.childrenData, component);
        ancestors.pop();
      }
    }
  };

  walk(root, null);
  return index;
};

const getTreeIndex = (
  root: RenderableComponentData[] | undefined
): TreeIndex | null => {
  if (!root) return null;
  let index = treeIndexCache.get(root);
  if (!index) {
    index = buildTreeIndex(root);
    treeIndexCache.set(root, index);
  }
  return index;
};

/**
 * Finds a component in the root data by its ID
 */
export const findComponentById = (
  root: RenderableComponentData[] | undefined,
  targetId: string
): RenderableComponentData | null => {
  const index = getTreeIndex(root);
  if (!index) return null;
  return index.nodeById.get(targetId) ?? null;
};

/**
 * Finds the parent component of a given component
 */
export const findParentComponent = (
  root: RenderableComponentData[] | undefined,
  targetId: string
): RenderableComponentData | null => {
  const index = getTreeIndex(root);
  if (!index) return null;
  return index.parentById.get(targetId) ?? null;
};

/**
 * Calculates the hierarchy for a component based on its position in the root data
 */
export const calculateHierarchy = (
  root: RenderableComponentData[] | undefined,
  componentId: string,
  currentContext?: RenderableContext
): Hierarchy => {
  if (!root) {
    return {
      depth: (currentContext?.hierarchy?.depth || 0) + 1,
      parentIds: [...(currentContext?.hierarchy?.parentIds || []), componentId],
    };
  }

  const hierarchy = getTreeIndex(root)?.hierarchyById.get(componentId);

  // Not found: the previous traversal left depth at 0 and unwound parentIds.
  if (!hierarchy) {
    return { depth: 0, parentIds: [] };
  }

  return {
    depth: hierarchy.depth,
    parentIds: [...hierarchy.parentIds],
  };
};

/**
 * Calculates timing for a component, inheriting from parent if duration is not provided
 */
export const calculateTimingWithInheritance = (
  component: RenderableComponentData,
  root: RenderableComponentData[] | undefined,
  videoConfig: VideoConfig
): CalculatedTiming => {
  const currentContext = component.context || {};
  // First, calculate basic timing
  const baseTiming = calculateTiming(
    component.type,
    currentContext,
    videoConfig
  );

  // If duration is not provided, try to inherit from parent recursively
  if (!baseTiming.durationInFrames || baseTiming.durationInFrames <= 0) {
    const findParentWithTiming = (
      targetId: string
    ): CalculatedTiming | null => {
      const parent = findParentComponent(root, targetId);
      if (!parent) return null;

      const parentContext = parent.context || {};
      const parentTiming = calculateTiming(
        parent.type,
        parentContext,
        videoConfig
      );

      if (parentTiming.durationInFrames && parentTiming.durationInFrames > 0) {
        return parentTiming;
      }

      // Recursively search for parent's parent with timing
      return findParentWithTiming(parent.id);
    };

    const inheritedTiming = findParentWithTiming(component.id);
    if (inheritedTiming) {
      return {
        ...baseTiming,
        durationInFrames: inheritedTiming.durationInFrames
          ? inheritedTiming.durationInFrames
          : inheritedTiming.duration
            ? inheritedTiming.duration * videoConfig.fps
            : 0,
        duration: inheritedTiming.duration,
      };
    }
  }

  return baseTiming;
};
