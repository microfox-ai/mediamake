import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  ConnectionValidationResult,
  WorkflowValidationResult,
  WorkflowDataType,
} from './types';
import { zodTypeToWorkflowType } from './schemaParser';

/**
 * Check if two data types are compatible for connection
 */
export function areTypesCompatible(
  sourceType: WorkflowDataType,
  targetType: WorkflowDataType,
): boolean {
  // 'any' type accepts anything
  if (sourceType === 'any' || targetType === 'any') {
    return true;
  }

  // Exact match
  if (sourceType === targetType) {
    return true;
  }

  // String/text can be converted to most types
  if (targetType === 'text') {
    return true;
  }

  // Arrays can accept single items (will be wrapped)
  // Example: text → array<text>
  if (targetType === 'array') {
    return true;
  }

  // Single items can be extracted from arrays
  // Example: array<text> → text (extracts first item or processes each)
  // This enables map/transform patterns: array of items → process → array of results
  if (sourceType === 'array') {
    // Arrays can connect to any single type (except array, which is handled above)
    // At this point, we know targetType is not 'array' (would have matched exact match above)
    // Runtime behavior:
    // - For single node: extracts first item
    // - For loop node: iterates over each item
    // - For transform: maps over array
    return true;
  }

  // Note: Media ↔ text conversions are handled by the general "targetType === 'text'" check above
  // Media URLs are strings, so they naturally convert to/from text

  return false;
}

/**
 * Validate a connection between two nodes
 */
export function validateConnection(
  sourceNode: WorkflowNode,
  sourceHandle: string | null,
  targetNode: WorkflowNode,
  targetHandle: string | null,
): ConnectionValidationResult {
  // Get handle types
  const sourceType = sourceHandle ? getHandleType(sourceNode, sourceHandle) : 'any';
  const targetType = targetHandle ? getHandleType(targetNode, targetHandle) : 'any';

  // Check type compatibility
  const isValid = areTypesCompatible(sourceType, targetType);

  return {
    valid: isValid,
    error: isValid
      ? undefined
      : `Cannot connect ${sourceType} to ${targetType}. Types are incompatible.`,
  };
}

/**
 * Get the type of a specific handle on a node
 */
function getHandleType(
  node: WorkflowNode,
  handleId: string,
): WorkflowDataType {
  switch (node.type) {
    case 'agent': {
      const data = node.data as any;
      // Try to get from schema
      if (data.inputSchema || data.outputSchema) {
        // This would require parsing the schema for the specific field
        // For now, return 'any'
        return 'any';
      }
      return 'any';
    }
    case 'input': {
      const data = node.data as any;
      const field = data.fields?.find((f: any) => f.name === handleId);
      return field?.type || 'any';
    }
    case 'output': {
      const data = node.data as any;
      const field = data.fields?.find((f: any) => f.name === handleId);
      return field?.type || 'any';
    }
    case 'transform': {
      return 'any'; // Transforms can handle any type
    }
    default:
      return 'any';
  }
}

/**
 * Validate if a connection between two nodes is valid
 */
export function canConnect(
  sourceNode: WorkflowNode,
  sourceHandle: string,
  targetNode: WorkflowNode,
  targetHandle: string,
  edges: WorkflowEdge[],
): ConnectionValidationResult {
  // Check for self-connection
  if (sourceNode.id === targetNode.id) {
    return {
      valid: false,
      error: 'Cannot connect a node to itself',
    };
  }

  // Check for duplicate connections
  const duplicate = edges.find(
    edge =>
      edge.source === sourceNode.id &&
      edge.target === targetNode.id &&
      edge.sourceHandle === sourceHandle &&
      edge.targetHandle === targetHandle,
  );
  if (duplicate) {
    return {
      valid: false,
      error: 'Connection already exists',
    };
  }

  // Check type compatibility
  const sourceType = getHandleType(sourceNode, sourceHandle);
  const targetType = getHandleType(targetNode, targetHandle);

  if (!areTypesCompatible(sourceType, targetType)) {
    return {
      valid: false,
      error: `Type mismatch: ${sourceType} cannot connect to ${targetType}`,
    };
  }

  // Check for circular dependencies
  const wouldCreateCycle = detectCycle(
    sourceNode.id,
    targetNode.id,
    edges,
  );
  if (wouldCreateCycle) {
    return {
      valid: false,
      error: 'Connection would create a circular dependency',
    };
  }

  return { valid: true };
}

/**
 * Detect if adding an edge would create a cycle
 */
function detectCycle(
  sourceId: string,
  targetId: string,
  edges: WorkflowEdge[],
): boolean {
  // Build adjacency list
  const graph = new Map<string, Set<string>>();

  // Add existing edges
  edges.forEach(edge => {
    if (!graph.has(edge.source)) {
      graph.set(edge.source, new Set());
    }
    graph.get(edge.source)!.add(edge.target);
  });

  // Add the new edge
  if (!graph.has(sourceId)) {
    graph.set(sourceId, new Set());
  }
  graph.get(sourceId)!.add(targetId);

  // DFS to detect cycle
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(node: string): boolean {
    if (recStack.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }
    }

    recStack.delete(node);
    return false;
  }

  // Check from the source node
  return hasCycle(sourceId);
}

/**
 * Validate an entire workflow
 */
export function validateWorkflow(
  workflow: WorkflowDefinition,
): WorkflowValidationResult {
  const errors: WorkflowValidationResult['errors'] = [];

  // Check if workflow has at least one input node
  const hasInput = workflow.nodes.some(node => node.type === 'input');
  if (!hasInput) {
    errors.push({
      message: 'Workflow must have at least one input node',
      type: 'warning',
    });
  }

  // Check if workflow has at least one output node
  const hasOutput = workflow.nodes.some(node => node.type === 'output');
  if (!hasOutput) {
    errors.push({
      message: 'Workflow must have at least one output node',
      type: 'warning',
    });
  }

  // Check for disconnected nodes
  const connectedNodes = new Set<string>();
  workflow.edges.forEach(edge => {
    connectedNodes.add(edge.source);
    connectedNodes.add(edge.target);
  });

  workflow.nodes.forEach(node => {
    if (!connectedNodes.has(node.id) && workflow.nodes.length > 1) {
      errors.push({
        nodeId: node.id,
        message: `Node "${node.data.label || node.id}" is not connected`,
        type: 'warning',
      });
    }
  });

  // Validate each edge
  workflow.edges.forEach(edge => {
    const sourceNode = workflow.nodes.find(n => n.id === edge.source);
    const targetNode = workflow.nodes.find(n => n.id === edge.target);

    if (!sourceNode || !targetNode) {
      errors.push({
        edgeId: edge.id,
        message: 'Edge connects to non-existent node',
        type: 'error',
      });
      return;
    }

    const validation = canConnect(
      sourceNode,
      edge.sourceHandle || '',
      targetNode,
      edge.targetHandle || '',
      workflow.edges.filter(e => e.id !== edge.id),
    );

    if (!validation.valid) {
      errors.push({
        edgeId: edge.id,
        message: validation.error || 'Invalid connection',
        type: 'error',
      });
    }
  });

  // Check for agent nodes without configuration
  workflow.nodes.forEach(node => {
    if (node.type === 'agent') {
      const data = node.data as any;
      if (!data.agentPath) {
        errors.push({
          nodeId: node.id,
          message: 'Agent node is missing agent configuration',
          type: 'error',
        });
      }
    }
  });

  return {
    valid: errors.every(e => e.type === 'warning'),
    errors,
  };
}

/**
 * Get nodes in topological order (for execution)
 */
export function topologicalSort(workflow: WorkflowDefinition): string[] {
  const graph = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  // Initialize
  workflow.nodes.forEach(node => {
    graph.set(node.id, new Set());
    inDegree.set(node.id, 0);
  });

  // Deduplicate edges (safety check)
  const uniqueEdges = new Map<string, WorkflowEdge>();
  workflow.edges.forEach(edge => {
    const key = `${edge.source}:${edge.sourceHandle || ''}:${edge.target}:${edge.targetHandle || ''}`;
    if (!uniqueEdges.has(key)) {
      uniqueEdges.set(key, edge);
    }
  });

  // Build graph with deduplicated edges
  uniqueEdges.forEach(edge => {
    graph.get(edge.source)!.add(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  });

  // Kahn's algorithm
  const queue: string[] = [];
  const result: string[] = [];

  // Add nodes with no incoming edges
  inDegree.forEach((degree, node) => {
    if (degree === 0) {
      queue.push(node);
    }
  });

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    graph.get(node)!.forEach(neighbor => {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    });
  }

  // If result doesn't contain all nodes, there's a cycle
  if (result.length !== workflow.nodes.length) {
    console.error('Topological sort failed:', {
      totalNodes: workflow.nodes.length,
      processedNodes: result.length,
      nodes: workflow.nodes.map(n => ({ id: n.id, type: n.type })),
      edges: workflow.edges.map(e => ({ from: e.source, to: e.target })),
      result,
      missingNodes: workflow.nodes.filter(n => !result.includes(n.id)).map(n => n.id),
    });
    throw new Error(`Workflow contains a cycle or disconnected nodes. Processed ${result.length}/${workflow.nodes.length} nodes.`);
  }

  return result;
}

