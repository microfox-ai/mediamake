import { NextRequest, NextResponse } from 'next/server';
import { listWorkflows, saveWorkflow } from '@/lib/workflows/storage';
import type { WorkflowDefinition } from '@/lib/workflows/types';

// GET /api/workflows - List all workflows
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Extract query parameters
    const userId = searchParams.get('userId') || undefined;
    const tags = searchParams.get('tags')?.split(',') || undefined;
    const isPublic = searchParams.get('isPublic')
      ? searchParams.get('isPublic') === 'true'
      : undefined;
    const search = searchParams.get('search') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortBy = (searchParams.get('sortBy') as any) || 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') as any) || 'desc';

    const result = await listWorkflows({
      userId,
      tags,
      isPublic,
      search,
      limit,
      offset,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error listing workflows:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list workflows',
      },
      { status: 500 },
    );
  }
}

// POST /api/workflows - Create a new workflow
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workflow, userId } = body;

    if (!workflow || !userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: workflow and userId',
        },
        { status: 400 },
      );
    }

    // Ensure workflow has required fields
    const workflowToSave: WorkflowDefinition = {
      id: workflow.id || `workflow-${Date.now()}`,
      name: workflow.name || 'Untitled Workflow',
      description: workflow.description || '',
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      variables: workflow.variables || [],
      tags: workflow.tags || [],
      isPublic: workflow.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...workflow,
    };

    const savedWorkflow = await saveWorkflow(workflowToSave, userId);

    return NextResponse.json({
      success: true,
      data: savedWorkflow,
    });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create workflow',
      },
      { status: 500 },
    );
  }
}

