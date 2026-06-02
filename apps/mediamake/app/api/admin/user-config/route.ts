import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-utils';
import {
  userQuotaDB,
  DEFAULT_RENDER_CONFIG_LIMITS,
  type RenderConfigLimits,
  type WorkerPermissions,
  type PeriodType,
} from '@/lib/quota-mongodb';

/**
 * POST /api/admin/user-config
 * Manage advanced per-user config: render Lambda limits, AI provider limits, worker permissions.
 *
 * Body variants:
 *  { type: 'render_config',     clientId, config: RenderConfigLimits | null }
 *  { type: 'ai_provider',       clientId, provider, maxTokens, periodType, resetUsage? }
 *  { type: 'remove_ai_provider',clientId, provider }
 *  { type: 'worker_permissions', clientId, canCallWorkers, canCallAgents }
 */
export async function POST(req: NextRequest) {
  let adminId: string;
  try {
    adminId = await requireAdmin(req);
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await req.json();
  const { type, clientId } = body as { type: string; clientId: string };

  if (!clientId?.trim()) {
    return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
  }

  const actor = { adminId };

  switch (type) {
    case 'render_config': {
      const raw = body.config as Partial<RenderConfigLimits> | null;
      if (raw === null) {
        await userQuotaDB.removeRenderConfig(clientId.trim());
      } else {
        const config: RenderConfigLimits = {
          maxMemoryMb: raw?.maxMemoryMb ?? DEFAULT_RENDER_CONFIG_LIMITS.maxMemoryMb,
          maxTimeoutSeconds: raw?.maxTimeoutSeconds ?? DEFAULT_RENDER_CONFIG_LIMITS.maxTimeoutSeconds,
          maxConcurrency: raw?.maxConcurrency ?? DEFAULT_RENDER_CONFIG_LIMITS.maxConcurrency,
          maxDiskMb: raw?.maxDiskMb ?? DEFAULT_RENDER_CONFIG_LIMITS.maxDiskMb,
          allowedPresets: raw?.allowedPresets ?? undefined,
        };
        await userQuotaDB.setRenderConfig(clientId.trim(), config, actor);
      }
      return NextResponse.json({ success: true });
    }

    case 'ai_provider': {
      const { provider, maxTokens, periodType, resetUsage } = body as {
        provider: string;
        maxTokens: number;
        periodType: PeriodType;
        resetUsage?: boolean;
      };
      if (!provider?.trim()) return NextResponse.json({ error: 'provider is required' }, { status: 400 });
      if (!maxTokens || maxTokens < 1) return NextResponse.json({ error: 'maxTokens must be >= 1' }, { status: 400 });
      if (!['day', 'month', 'lifetime'].includes(periodType)) {
        return NextResponse.json({ error: "periodType must be 'day', 'month', or 'lifetime'" }, { status: 400 });
      }
      await userQuotaDB.setAiProviderLimit(clientId.trim(), provider.trim(), { maxTokens, periodType, resetUsage }, actor);
      return NextResponse.json({ success: true });
    }

    case 'remove_ai_provider': {
      const { provider } = body as { provider: string };
      if (!provider?.trim()) return NextResponse.json({ error: 'provider is required' }, { status: 400 });
      await userQuotaDB.removeAiProviderLimit(clientId.trim(), provider.trim());
      return NextResponse.json({ success: true });
    }

    case 'worker_permissions': {
      const { canCallWorkers, canCallAgents } = body as { canCallWorkers: boolean; canCallAgents: boolean };
      const permissions: WorkerPermissions = {
        canCallWorkers: !!canCallWorkers,
        canCallAgents: !!canCallAgents,
      };
      await userQuotaDB.setWorkerPermissions(clientId.trim(), permissions, actor);
      return NextResponse.json({ success: true });
    }

    default:
      return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 });
  }
}
