import { NextRequest, NextResponse } from 'next/server';
import { LocalRenderStore } from '@/lib/local-render-store';

export const GET = async (
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

    return NextResponse.json({
      success: true,
      render,
    });
  } catch (error) {
    console.error('Failed to get render progress:', error);
    return NextResponse.json(
      { error: 'Failed to get render progress' },
      { status: 500 },
    );
  }
};


