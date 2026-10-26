import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import { getLambdaAccess } from '@/lib/render-routing/lambda-access';
import { planRender, type RenderType } from '@/lib/render-routing/plan';

/**
 * Where should this render run? See lib/render-routing/plan.ts.
 *
 * GET  — { lambda: { allowed, reason? } } for the caller. The editor uses
 *        this and plans on the client, so it never uploads the props twice.
 * POST — { inputProps, renderType? } → the full plan: target ('lambda' or
 *        'local'), reason, and the media counts it was based on.
 */

export const GET = async (req: NextRequest) => {
  const lambda = await getLambdaAccess(getClientId(req));
  return NextResponse.json({ lambda });
};

export const POST = async (req: NextRequest) => {
  try {
    const { inputProps, renderType } = await req.json();
    const type: RenderType =
      renderType === 'still' || renderType === 'audio' ? renderType : 'video';
    const lambda = await getLambdaAccess(getClientId(req));
    return NextResponse.json(planRender({ inputProps, renderType: type, lambda }));
  } catch (err) {
    return NextResponse.json(
      { type: 'error', message: (err as Error).message },
      { status: 400 },
    );
  }
};
