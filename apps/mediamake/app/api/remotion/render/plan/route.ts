import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import { getLambdaAccess } from '@/lib/render-routing/lambda-access';
import { analyzeRenderLoad, planRender, type RenderType } from '@/lib/render-routing/plan';
import { probeMediaSizes } from '@/lib/render-routing/sizes';

/**
 * Where should this render run? See lib/render-routing/plan.ts.
 *
 * GET  — { lambda: { allowed, reason? } } for the caller. The editor uses
 *        this and plans on the client, so it never uploads the props twice.
 * POST — { inputProps, renderType?, sizes? } → the full plan: the suggested
 *        target ('lambda' or 'local'), why, and the media it measured.
 *        File sizes the caller doesn't pass (src → bytes) are looked up
 *        with HEAD requests.
 */

export const GET = async (req: NextRequest) => {
  const lambda = await getLambdaAccess(getClientId(req));
  return NextResponse.json({ lambda });
};

export const POST = async (req: NextRequest) => {
  try {
    const { inputProps, renderType, sizes: given } = await req.json();
    const type: RenderType =
      renderType === 'still' || renderType === 'audio' ? renderType : 'video';
    const sizes: Record<string, number> = given && typeof given === 'object' ? given : {};
    const [lambda, probed] = await Promise.all([
      getLambdaAccess(getClientId(req)),
      probeMediaSizes(
        analyzeRenderLoad(inputProps, type, sizes).media,
      ),
    ]);
    return NextResponse.json(
      planRender({ inputProps, renderType: type, lambda, sizes: { ...probed, ...sizes } }),
    );
  } catch (err) {
    return NextResponse.json(
      { type: 'error', message: (err as Error).message },
      { status: 400 },
    );
  }
};
