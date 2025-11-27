import { NextRequest, NextResponse } from 'next/server';
import {
  getWorkflow,
  saveWorkflow,
  deleteWorkflow,
  updateWorkflowMetadata,
} from '@/lib/workflows/storage';

// GET /api/workflows/[workflowId] - Get a specific workflow
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || undefined;

    const workflow = await getWorkflow(workflowId, userId);

    if (!workflow) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow not found',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: workflow,
    });
  } catch (error) {
    console.error('Error getting workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get workflow',
      },
      { status: 500 },
    );
  }
}

// PUT /api/workflows/[workflowId] - Update a workflow
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const body = await request.json();
    const { workflow, userId, metadataOnly } = body;

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required field: userId',
        },
        { status: 400 },
      );
    }

    // If only updating metadata
    if (metadataOnly) {
      const { name, description, tags, isPublic } = workflow;
      const updated = await updateWorkflowMetadata(workflowId, userId, {
        name,
        description,
        tags,
        isPublic,
      });

      if (!updated) {
        return NextResponse.json(
          {
            success: false,
            error: 'Workflow not found or not authorized',
          },
          { status: 404 },
        );
      }

      return NextResponse.json({
        success: true,
        data: { updated: true },
      });
    }

    // Full workflow update
    const updatedWorkflow = {
      ...workflow,
      id: workflowId,
      updatedAt: new Date(),
    };

    const savedWorkflow = await saveWorkflow(updatedWorkflow, userId);

    return NextResponse.json({
      success: true,
      data: savedWorkflow,
    });
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update workflow',
      },
      { status: 500 },
    );
  }
}

// DELETE /api/workflows/[workflowId] - Delete a workflow
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> },
) {
  try {
    const { workflowId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameter: userId',
        },
        { status: 400 },
      );
    }

    const deleted = await deleteWorkflow(workflowId, userId);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: 'Workflow not found or not authorized',
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true },
    });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete workflow',
      },
      { status: 500 },
    );
  }
}

