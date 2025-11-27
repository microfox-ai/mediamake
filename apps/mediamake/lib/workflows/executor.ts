import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  ExecutionState,
  NodeExecutionResult,
  ExecutionProgressCallback,
  AgentNodeData,
  InputNodeData,
  TransformNodeData,
} from './types';
import { topologicalSort } from './validator';
import { callAgent } from '@/components/agents/agent-helper';
import { VariableManager } from './variables';

/**
 * Smart type conversion helper
 * Handles array ↔ single item conversions
 */
function convertValue(value: any, targetExpectsArray: boolean): any {
  const isArray = Array.isArray(value);

  // If target expects array but value is not
  if (targetExpectsArray && !isArray) {
    return [value]; // Wrap single item in array
  }

  // If target expects single item but value is array
  if (!targetExpectsArray && isArray) {
    return value.length > 0 ? value[0] : undefined; // Extract first item
  }

  // No conversion needed
  return value;
}

/**
 * Workflow Executor
 * Executes a workflow by running nodes in topological order
 */
export class WorkflowExecutor {
  private workflowId: string;
  private workflow: WorkflowDefinition;
  private executionState: Map<string, any>;
  private variableManager: VariableManager;
  private onProgress?: ExecutionProgressCallback;

  constructor(workflow: WorkflowDefinition, onProgress?: ExecutionProgressCallback) {
    this.workflowId = workflow.id;
    this.workflow = workflow;
    this.executionState = new Map();
    this.variableManager = new VariableManager(workflow.variables || []);
    this.onProgress = onProgress;
  }

  /**
   * Execute the entire workflow
   * @param skipExecuted - If true, skip nodes that have already been executed successfully
   */
  async execute(skipExecuted: boolean = false): Promise<Map<string, any>> {
    try {
      // Pre-populate execution state with cached results if continuing
      if (skipExecuted) {
        this.workflow.nodes.forEach(node => {
          if (node.data.status === 'success' && node.data.result !== undefined) {
            this.executionState.set(node.id, node.data.result);
            console.log(`📦 Using cached result for node: ${node.id}`);
          }
        });
      }

      // Get execution order
      const executionOrder = topologicalSort(this.workflow);

      console.log('🚀 Starting workflow execution:', {
        workflowId: this.workflowId,
        workflowName: this.workflow.name,
        nodeCount: this.workflow.nodes.length,
        executionOrder,
        skipExecuted,
        cachedNodes: skipExecuted ? Array.from(this.executionState.keys()) : [],
      });

      // Execute nodes in order
      for (const nodeId of executionOrder) {
        // Skip if already executed and we're continuing
        if (skipExecuted && this.executionState.has(nodeId)) {
          console.log(`⏭️  Skipping already executed node: ${nodeId}`);
          continue;
        }
        
        await this.executeNode(nodeId);
      }

      console.log('✨ Workflow execution completed successfully');

      return this.executionState;
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      throw error;
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(nodeId: string): Promise<void> {
    const node = this.workflow.nodes.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    // Notify progress - running
    this.onProgress?.({
      nodeId,
      status: 'running',
    });

    const startTime = new Date();

    try {
      // Collect inputs from connected nodes
      const inputs = this.collectInputs(node);

      // Execute based on node type
      let result: any;
      switch (node.type) {
        case 'agent':
          result = await this.executeAgent(node, inputs);
          break;
        case 'input':
          result = await this.executeInput(node, inputs);
          break;
        case 'output':
          result = await this.executeOutput(node, inputs);
          break;
        case 'transform':
          result = await this.executeTransform(node, inputs);
          break;
        default:
          result = inputs;
      }

      // Store result
      this.executionState.set(nodeId, result);

      // Notify progress - success
      this.onProgress?.({
        nodeId,
        status: 'success',
        result,
      });
    } catch (error) {
      // Notify progress - error
      this.onProgress?.({
        nodeId,
        status: 'error',
        error: error as Error,
      });
      throw error;
    }
  }

  /**
   * Collect inputs from connected nodes
   */
  private collectInputs(node: WorkflowNode): Record<string, any> {
    const inputs: Record<string, any> = {};

    // Find all edges that target this node
    const incomingEdges = this.workflow.edges.filter(
      edge => edge.target === node.id,
    );

    incomingEdges.forEach(edge => {
      const sourceResult = this.executionState.get(edge.source);
      if (sourceResult !== undefined) {
        // If there's a specific handle, use that field
        if (edge.sourceHandle && typeof sourceResult === 'object') {
          inputs[edge.targetHandle || 'input'] = sourceResult[edge.sourceHandle];
        } else {
          // Otherwise, use the entire result
          inputs[edge.targetHandle || 'input'] = sourceResult;
        }
      }
    });

    // Merge with node configuration
    if (node.type === 'agent') {
      const agentData = node.data as AgentNodeData;
      const config = { ...inputs, ...agentData.config };
      
      // Apply variable substitution
      return this.variableManager.substituteInObject(config, {
        variables: {},
        nodeResults: Object.fromEntries(this.executionState),
        currentNode: node.id,
      });
    }

    // Apply variable substitution to inputs
    return this.variableManager.substituteInObject(inputs, {
      variables: {},
      nodeResults: Object.fromEntries(this.executionState),
      currentNode: node.id,
    });
  }

  /**
   * Execute an agent node
   */
  private async executeAgent(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<any> {
    const data = node.data as AgentNodeData;

    if (!data.agentPath) {
      throw new Error('Agent node is missing agent path');
    }

    console.log('🤖 Agent node executing:', {
      nodeId: node.id,
      agentPath: data.agentPath,
      agentName: data.agentName,
      inputs,
    });

    // Call the agent using the existing helper
    const result = await callAgent(data.agentPath, inputs);

    console.log('✅ Agent node completed:', {
      nodeId: node.id,
      agentName: data.agentName,
      result,
    });

    return result;
  }

  /**
   * Execute an input node
   */
  private async executeInput(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<any> {
    const data = node.data as InputNodeData;

    // Return the field values with variable substitution
    const result: Record<string, any> = {};
    data.fields?.forEach(field => {
      const value = this.variableManager.substitute(String(field.value || ''), {
        variables: {},
        nodeResults: Object.fromEntries(this.executionState),
        currentNode: node.id,
      });
      result[field.name] = value;
    });

    console.log('🎯 Input node executed:', {
      nodeId: node.id,
      fields: data.fields,
      result,
    });

    return result;
  }

  /**
   * Execute an output node
   */
  private async executeOutput(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<any> {
    // Output nodes just pass through their inputs
    return inputs;
  }

  /**
   * Execute a transform node
   */
  private async executeTransform(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<any> {
    const data = node.data as TransformNodeData;

    if (!data.expression) {
      return inputs;
    }

    try {
      // Create a function from the expression
      // eslint-disable-next-line no-new-func
      const transformFn = new Function('input', `return (${data.expression})(input)`);

      // Get the input value
      const inputValue = inputs.input || inputs;

      // Apply transformation
      const result = transformFn(inputValue);

      return result;
    } catch (error) {
      console.error('Transform error:', error);
      throw new Error(`Transform failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get the current execution state
   */
  getState(): Map<string, any> {
    return this.executionState;
  }

  /**
   * Get result for a specific node
   */
  getNodeResult(nodeId: string): any {
    return this.executionState.get(nodeId);
  }
}

/**
 * Helper function to execute a workflow
 */
export async function executeWorkflow(
  workflow: WorkflowDefinition,
  onProgress?: ExecutionProgressCallback,
  skipExecuted: boolean = false,
): Promise<Map<string, any>> {
  const executor = new WorkflowExecutor(workflow, onProgress);
  return await executor.execute(skipExecuted);
}

