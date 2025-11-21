import { NextRequest, NextResponse } from 'next/server';
import { aiRouterRegistry } from '@/app/ai';

/**
 * GET /api/agents/[agentId] - Get detailed information about a specific agent
 * 
 * Path Parameters:
 * - agentId: The agent identifier
 * 
 * Response:
 * {
 *   success: true,
 *   agent: {
 *     id: string,
 *     name: string,
 *     path: string,
 *     description: string,
 *     inputSchema: object,
 *     outputSchema: object,
 *     metadata: object
 *   }
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    
    // Get all registered agents from the AI router
    const registry = aiRouterRegistry;
    const tools = registry.tools || {};
    
    // Find the specific agent
    const tool = tools[agentId as keyof typeof tools];
    
    if (!tool) {
      return NextResponse.json(
        {
          success: false,
          error: `Agent '${agentId}' not found`,
        },
        { status: 404 }
      );
    }
    
    const metadata = (tool as any).metadata || {};
    
    const agent = {
      id: agentId,
      name: (tool as any).description || agentId,
      path: metadata.agentPath || agentId,
      description: (tool as any).description || 'No description available',
      inputSchema: (tool as any).parameters || null,
      outputSchema: metadata.outputSchema || null,
      metadata: {
        tags: metadata.tags || [],
        category: metadata.category || 'general',
        icon: metadata.icon || '🤖',
        hideUI: metadata.hideUI || false,
        title: metadata.title || (tool as any).description || agentId,
        ...metadata,
      },
    };
    
    return NextResponse.json({
      success: true,
      agent,
    });
  } catch (error) {
    console.error('Error getting agent:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get agent',
      },
      { status: 500 }
    );
  }
}

