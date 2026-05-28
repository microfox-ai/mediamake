import { aiMainRouter } from '@/app/ai';
import { getClientId } from '@/lib/auth-utils';
import { isAdmin } from '@/lib/admin-utils';
import { userQuotaDB } from '@/lib/quota-mongodb';
import { UIMessage } from 'ai';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const params: any = {};
  searchParams.entries().forEach(([key, value]) => {
    params[key] = value;
  });
  const response = await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      messages: [],
      params,
    },
  });

  return response;
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const clientId = getClientId(req);

  // ── AI quota & permission enforcement ────────────────────────────────────
  // 1. Agent call permission toggle.  2. Global AI token quota.  3. Per-provider token quota.
  // Admins bypass all checks.
  if (clientId && !isAdmin(clientId)) {
    // 1. Check worker/agent permissions
    const quota = await userQuotaDB.getByClientId(clientId);
    const permCheck = userQuotaDB.checkWorkerPermission(quota?.workerPermissions, 'agent');
    if (!permCheck.allowed) {
      return NextResponse.json(
        { type: 'error', message: permCheck.reason },
        { status: 403 },
      );
    }

    // 2. Global AI token quota
    const check = await userQuotaDB.checkPlatform(clientId, 'ai');
    if (!check.allowed) {
      return NextResponse.json(
        { type: 'error', message: check.reason, quotaError: check.detail },
        { status: check.status },
      );
    }

    // 3. Per-provider token quota (soft-cap: checks if any provider is already over its limit)
    const providerCheck = await userQuotaDB.checkAiProviders(clientId);
    if (!providerCheck.allowed) {
      return NextResponse.json(
        {
          type: 'error',
          message: providerCheck.reason,
          quotaError: {
            code: 'QUOTA_EXHAUSTED',
            platform: 'ai',
            usage: 0,
            max: 0,
            periodType: 'month',
            nextResetAt: null,
          },
        },
        { status: providerCheck.status },
      );
    }
  }
  // ──────────────────────────────────────────────────────────────────────

  const agentFullPath = req.nextUrl.href.split('/api/studio/chat/agent')[1];
  const agentPath = agentFullPath.includes('?')
    ? agentFullPath.split('?')[0]
    : agentFullPath;

  const searchParams = req.nextUrl.searchParams;
  const params: any = {};
  for (const [key, value] of searchParams.entries()) {
    params[key] = value;
  }

  const { messages, ...restOfBody } = body;

  return await aiMainRouter.toAwaitResponse(agentPath, {
    request: {
      ...body,
      clientId: clientId,
      messages: messages ?? [],
      params: {
        ...params,
        ...restOfBody,
      },
    },
  });
}
