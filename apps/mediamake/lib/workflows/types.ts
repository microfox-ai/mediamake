import type { Node as ReactFlowNode, Edge as ReactFlowEdge } from '@xyflow/react';
import type { z } from 'zod';

// Base workflow data types
export type WorkflowDataType = 'text' | 'number' | 'boolean' | 'array' | 'object' | 'media' | 'any';

// Workflow variable definition
export interface WorkflowVariable {
  id: string;
  name: string;
  type: WorkflowDataType;
  value: any;
  description?: string;
}

// Node types
export type WorkflowNodeType = 'agent' | 'input' | 'output' | 'transform' | 'conditional' | 'loop' | 'merge' | 'delay';

// Agent node specific data
export interface AgentNodeData {
  agentPath: string;
  agentName: string;
  icon?: string;
  inputSchema?: z.ZodType<any>;
  outputSchema?: z.ZodType<any>;
  config?: Record<string, any>;
  description?: string;
}

// Input node specific data
export interface InputNodeData {
  fields: Array<{
    name: string;
    type: WorkflowDataType;
    value: any;
    required?: boolean;
  }>;
}

// Output node specific data
export interface OutputNodeData {
  fields: Array<{
    name: string;
    type: WorkflowDataType;
    source?: string; // Connected node output
  }>;
}

// Transform node specific data
export interface TransformNodeData {
  operation: 'map' | 'filter' | 'reduce' | 'merge' | 'custom';
  expression?: string; // JavaScript expression
  code?: string; // Custom code
}

// Conditional node specific data
export interface ConditionalNodeData {
  condition: string; // JavaScript expression
  trueLabel?: string;
  falseLabel?: string;
}

// Loop node specific data
export interface LoopNodeData {
  iterateOver: string; // Variable or field name
  maxIterations?: number;
}

// Merge node specific data
export interface MergeNodeData {
  strategy: 'concat' | 'merge' | 'pick' | 'custom';
  config?: Record<string, any>;
}

// Delay node specific data
export interface DelayNodeData {
  duration: number; // in milliseconds
  unit: 'ms' | 's' | 'm';
}

// Union of all node data types
export type NodeData =
  | AgentNodeData
  | InputNodeData
  | OutputNodeData
  | TransformNodeData
  | ConditionalNodeData
  | LoopNodeData
  | MergeNodeData
  | DelayNodeData;

// Workflow node definition
export interface WorkflowNode extends Omit<ReactFlowNode, 'data'> {
  id: string;
  type: WorkflowNodeType;
  position: { x: number; y: number };
  data: Partial<NodeData> & {
    label?: string;
    status?: ExecutionStatus;
    error?: string;
    result?: any;
  };
}

// Workflow edge definition
export interface WorkflowEdge extends ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  data?: {
    sourceType?: WorkflowDataType;
    targetType?: WorkflowDataType;
    transform?: string;
    label?: string;
  };
}

// Complete workflow definition
export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  userId?: string;
  tags?: string[];
  isPublic?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Execution status
export type ExecutionStatus = 'idle' | 'running' | 'success' | 'error' | 'warning';

// Node execution result
export interface NodeExecutionResult {
  nodeId: string;
  status: ExecutionStatus;
  result?: any;
  error?: Error | string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
}

// Execution state for the entire workflow
export interface ExecutionState {
  workflowId: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  nodeResults: Map<string, NodeExecutionResult>;
  currentNodeId?: string;
  error?: Error | string;
}

// Execution history entry (for MongoDB storage)
export interface WorkflowExecution {
  id: string;
  workflowId: string;
  userId?: string;
  status: ExecutionStatus;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  results: Record<string, any>;
  error?: string;
  nodeExecutions: NodeExecutionResult[];
}

// Handle definition for connections
export interface HandleDefinition {
  id: string;
  name: string;
  type: WorkflowDataType;
  position: 'left' | 'right' | 'top' | 'bottom';
  required?: boolean;
  description?: string;
}

// Schema field extracted from Zod
export interface SchemaField {
  name: string;
  type: WorkflowDataType;
  required: boolean;
  description?: string;
  default?: any;
}

// Connection validation result
export interface ConnectionValidationResult {
  valid: boolean;
  error?: string;
  warning?: string;
}

// Workflow validation result
export interface WorkflowValidationResult {
  valid: boolean;
  errors: Array<{
    nodeId?: string;
    edgeId?: string;
    message: string;
    type: 'error' | 'warning';
  }>;
}

// Draft workflow (for IndexedDB)
export interface WorkflowDraft extends Omit<WorkflowDefinition, 'createdAt' | 'updatedAt'> {
  lastSaved: Date;
  isDraft: boolean;
  syncedToMongo?: boolean;
}

// Agent metadata from registry
export interface AgentMetadata {
  path: string;
  name: string;
  description?: string;
  icon?: string;
  inputSchema?: any;
  outputSchema?: any;
  tags?: string[];
  category?: string;
}

// Node library item (for UI)
export interface NodeLibraryItem {
  id: string;
  type: WorkflowNodeType;
  label: string;
  icon?: string;
  description?: string;
  category: string;
  metadata?: AgentMetadata;
}

// Execution progress callback
export type ExecutionProgressCallback = (progress: {
  nodeId: string;
  status: ExecutionStatus;
  result?: any;
  error?: Error | string;
  progress?: number;
}) => void;

// Transform function type
export type TransformFunction = (input: any) => any;

// Variable substitution context
export interface SubstitutionContext {
  variables: Record<string, any>;
  nodeResults: Record<string, any>;
  currentNode?: string;
}

