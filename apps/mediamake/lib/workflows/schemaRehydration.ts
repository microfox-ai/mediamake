import { aiRouterRegistry } from '@/app/ai';
import type { WorkflowNode, AgentNodeData } from './types';

/**
 * Rehydrate agent node schemas from the aiRouterRegistry
 * Call this after loading workflows from storage (IndexedDB/MongoDB)
 * to reconstruct the Zod schemas that can't be serialized
 */
export function rehydrateAgentSchemas(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map(node => {
    if (node.type === 'agent' && node.data) {
      const agentData = node.data as AgentNodeData;
      
      // Find the agent in the registry using the path
      const agentEntry = aiRouterRegistry.map[agentData.agentPath];
      
      if (agentEntry && agentEntry.agents[0]?.actAsTool) {
        const tool = agentEntry.agents[0].actAsTool;
        
        // Reconstruct the full agent data with schemas
        return {
          ...node,
          data: {
            ...agentData,
            inputSchema: tool.inputSchema,
            outputSchema: tool.outputSchema,
            icon: agentData.icon || (tool.metadata?.icon as string),
            description: agentData.description || tool.description,
          },
        };
      }
      
      console.warn(`Could not rehydrate schemas for agent: ${agentData.agentPath}`);
    }
    
    return node;
  });
}

