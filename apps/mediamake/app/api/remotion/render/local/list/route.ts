import { NextRequest, NextResponse } from 'next/server';
import { LocalRenderStore } from '@/lib/local-render-store';

/**
 * GET /api/remotion/render/local/list
 * Returns all local renders or just active ones
 */
export const GET = async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('active') === 'true';

    const renders = activeOnly
      ? LocalRenderStore.getActive()
      : LocalRenderStore.getAll();

    return NextResponse.json({
      success: true,
      renders,
      count: renders.length,
    });
  } catch (error) {
    console.error('Failed to list renders:', error);
    return NextResponse.json(
      { error: 'Failed to list renders' },
      { status: 500 },
    );
  }
};


