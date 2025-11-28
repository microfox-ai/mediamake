import { NextRequest, NextResponse } from 'next/server';
import { LocalRenderStore } from '@/lib/local-render-store';

/**
 * POST /api/remotion/render/local/cancel/[id]
 * Cancel a running render
 */
export const POST = async (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Render ID is required' },
        { status: 400 },
      );
    }

    const render = LocalRenderStore.get(id);

    if (!render) {
      return NextResponse.json(
        { error: 'Render not found' },
        { status: 404 },
      );
    }

    if (render.status !== 'pending' && render.status !== 'rendering') {
      return NextResponse.json(
        { error: 'Render is not active and cannot be cancelled' },
        { status: 400 },
      );
    }

    // Mark as cancelled
    LocalRenderStore.cancel(id);

    // Note: Actual process termination would require storing process IDs
    // and using process.kill(). This is a simplified implementation.
    console.log(`🛑 Render ${id} marked as cancelled`);

    return NextResponse.json({
      success: true,
      message: 'Render cancelled',
      renderId: id,
    });
  } catch (error) {
    console.error('Failed to cancel render:', error);
    return NextResponse.json(
      { error: 'Failed to cancel render' },
      { status: 500 },
    );
  }
};


