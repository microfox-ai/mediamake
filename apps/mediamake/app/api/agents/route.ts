import { NextRequest, NextResponse } from 'next/server';
import { aiRouterRegistry } from '@/app/ai';

/**
 * GET /api/agents - List all available AI agents with their metadata
 * 
 * This endpoint provides discovery of all AI agents in the system,
 * including their paths, descriptions, and input/output schemas.
 * 
 * Query Parameters:
 * - tag: Filter agents by tag (optional)
 * - category: Filter agents by category (optional)
 * 
 * Response:
 * {
 *   success: true,
 *   agents: [
 *     {
 *       id: string,
 *       name: string,
 *       path: string,
 *       description: string,
 *       inputSchema: object,
 *       outputSchema: object,
 *       metadata: {
 *         tags: string[],
 *         category: string,
 *         icon: string,
 *         ...
 *       }
 *     }
 *   ],
 *   count: number
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filterTag = searchParams.get('tag');
    const filterCategory = searchParams.get('category');

    // Get all registered agents from the AI router
    const registry = aiRouterRegistry;
    const tools = registry.tools || {};

    // Transform tools into agent information
    const agents = Object.entries(tools).map(([toolId, tool]) => {
      const metadata = (tool as any).metadata || {};
      
      return {
        id: toolId,
        name: (tool as any).description || toolId,
        path: metadata.agentPath || toolId,
        description: (tool as any).description || 'No description available',
        inputSchema: (tool as any).parameters || null,
        outputSchema: metadata.outputSchema || null,
        metadata: {
          tags: metadata.tags || [],
          category: metadata.category || 'general',
          icon: metadata.icon || '🤖',
          hideUI: metadata.hideUI || false,
          title: metadata.title || (tool as any).description || toolId,
          ...metadata,
        },
      };
    });

    // Filter agents based on query parameters
    let filteredAgents = agents;
    
    if (filterTag) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.metadata.tags?.includes(filterTag)
      );
    }

    if (filterCategory) {
      filteredAgents = filteredAgents.filter(agent => 
        agent.metadata.category === filterCategory
      );
    }

    // Sort by name
    filteredAgents.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      success: true,
      agents: filteredAgents,
      count: filteredAgents.length,
      filters: {
        tag: filterTag || null,
        category: filterCategory || null,
      },
    });
  } catch (error) {
    console.error('Error listing agents:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list agents',
      },
      { status: 500 }
    );
  }
}

