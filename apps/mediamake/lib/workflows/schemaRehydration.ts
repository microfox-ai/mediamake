import { aiRouterRegistry } from '@/app/ai';
import type { WorkflowNode, AgentNodeData } from './types';

/**
 * Rehydrate agent node schemas from the aiRouterRegistry
 * Call this after loading workflows from storage (IndexedDB/MongoDB)
 * to reconstruct the Zod schemas that can't be serialized
 */
export function rehydrateAgentSchemas(nodes: WorkflowNode[]): WorkflowNode[] {
  console.log(`🔄 Rehydrating ${nodes.length} nodes...`);
  
  return nodes.map(node => {
    if (node.type === 'agent' && node.data) {
      const agentData = node.data as AgentNodeData;
      
      console.log(`  📦 Rehydrating agent: ${agentData.agentPath}`);
      
      // Find the agent in the registry using the path
      const agentEntry = aiRouterRegistry.map[agentData.agentPath];
      
      if (agentEntry && agentEntry.agents[0]?.actAsTool) {
        const tool = agentEntry.agents[0].actAsTool;
        
        console.log(`    ✅ Found in registry: ${tool.name}`);
        
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
      
      console.warn(`    ⚠️  Could not rehydrate schemas for agent: ${agentData.agentPath}`);
      console.warn(`    Available agents:`, Object.keys(aiRouterRegistry.map));
    } else {
      console.log(`  ℹ️  Non-agent node: ${node.type} (${node.id})`);
    }
    
    return node;
  });
}

