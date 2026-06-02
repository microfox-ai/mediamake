import { getDatabase } from './mongodb';
import { ObjectId, type Filter } from 'mongodb';

// ── Platform & period types ──────────────────────────────────────────────────

export type Platform = 'render' | 'ai';

export const ALL_PLATFORMS: Platform[] = ['render', 'ai'];

export const PLATFORM_LABELS: Record<Platform, string> = {
  render: 'Render',
  ai: 'AI Text',
};

/**
 * The unit the quota counts in.
 *  - render: trigger COUNT (each /api/remotion/render call counts as 1, regardless of Lambda cost).
 *  - ai:     TOKENS (sum of totalTokens across all completions; can't be known up-front, so soft-cap).
 */
export const PLATFORM_UNIT: Record<Platform, string> = {
  render: 'renders',
  ai: 'tokens',
};

/** How much each successful call costs against the quota for "trigger count" platforms. */
export const PLATFORM_DEFAULT_INCREMENT: Record<Platform, number> = {
  render: 1,
  ai: 0, // AI is incremented by actual tokens, not a fixed amount
};

/** Period type. 'lifetime' = absolute (never resets). */
export type PeriodType = 'day' | 'month' | 'lifetime';

export type QuotaRequestStatus = 'pending' | 'approved' | 'rejected';

// ── Limit per platform ───────────────────────────────────────────────────────

export interface PlatformLimit {
  /** If true, no cap applied (unlimited). */
  isUnlimited: boolean;
  /** Max triggers per period. Ignored when isUnlimited = true. */
  maxPerPeriod?: number;
  /** Period type — 'lifetime' means absolute / no reset. */
  periodType: PeriodType;
  /** ISO string — start of the current tracking period. */
  currentPeriodStart: string;
  /** Triggers in the current period. */
  usage: number;
  /** false = platform suspended for this user. */
  isActive: boolean;
}

// ── Render Lambda configuration limits ───────────────────────────────────────

/**
 * Advanced per-user limits on Remotion Lambda render configurations.
 * Admin sets these; enforced in /api/remotion/render.
 * Defaults allow up to 4 GB memory, 15-minute timeout, any preset.
 */
export interface RenderConfigLimits {
  /** Max Lambda memory in MB. Default: 4096. */
  maxMemoryMb: number;
  /** Max Lambda timeout in seconds. Default: 900. */
  maxTimeoutSeconds: number;
  /** Max concurrency. Default: 200. */
  maxConcurrency: number;
  /** Max disk size in MB. Default: 10240. */
  maxDiskMb: number;
  /**
   * Allowed preset keys. undefined/empty array = all presets allowed.
   * Example: ['classic', 'complex-fast']
   */
  allowedPresets?: string[];
}

export const DEFAULT_RENDER_CONFIG_LIMITS: RenderConfigLimits = {
  maxMemoryMb: 4096,
  maxTimeoutSeconds: 900,
  maxConcurrency: 200,
  maxDiskMb: 10240,
  allowedPresets: undefined,
};

// ── AI provider-level limits ──────────────────────────────────────────────────

/**
 * Per-provider token quota with its own period and usage tracker.
 * Provider key is the model-ID prefix, e.g. "anthropic", "google".
 */
export interface AiProviderLimit {
  /** Max tokens allowed in this period. */
  maxTokens: number;
  /** Tokens consumed so far in the current period. */
  usage: number;
  periodType: PeriodType;
  /** ISO string: start of the current tracking period. */
  currentPeriodStart: string;
}

// ── Worker / Agent call permissions ──────────────────────────────────────────

export interface WorkerPermissions {
  /** Whether this user can trigger workflow workers. */
  canCallWorkers: boolean;
  /** Whether this user can call AI agents (/api/studio/chat/agent/*). */
  canCallAgents: boolean;
}

// ── User Quota ───────────────────────────────────────────────────────────────

export interface UserQuota {
  _id?: ObjectId;
  clientId: string;
  /** Limits keyed by platform. Missing platform = no access on that platform. */
  platforms: Partial<Record<Platform, PlatformLimit>>;
  /** Admin who last modified this quota. */
  grantedBy?: string;
  note?: string;
  /** Advanced render Lambda config limits. If absent, defaults apply. */
  renderConfig?: RenderConfigLimits;
  /**
   * Per-provider AI token limits.
   * Key = provider prefix extracted from model ID (e.g. "anthropic", "google").
   */
  aiProviders?: Record<string, AiProviderLimit>;
  /** Worker / agent call permission flags. If absent, defaults to allowed. */
  workerPermissions?: WorkerPermissions;
  createdAt: string;
  updatedAt: string;
}

// ── Quota Request ────────────────────────────────────────────────────────────

export interface QuotaRequest {
  _id?: ObjectId;
  requesterId: string;
  /** Which platform they're asking for. */
  platform: Platform;
  /** access = first-time / suspended → enable. increase = bump existing limit. */
  type: 'access' | 'increase';
  status: QuotaRequestStatus;
  message?: string;
  requestedLimit?: number;
  requestedPeriod?: PeriodType;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Period helpers ───────────────────────────────────────────────────────────

export function periodStartISO(type: PeriodType): string {
  const now = new Date();
  if (type === 'day') {
    return new Date(now.toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString();
  }
  if (type === 'month') {
    return new Date(now.toISOString().slice(0, 7) + '-01T00:00:00.000Z').toISOString();
  }
  return now.toISOString();
}

function isPeriodExpired(limit: PlatformLimit): boolean {
  if (limit.periodType === 'lifetime') return false;
  const start = new Date(limit.currentPeriodStart);
  const now = new Date();
  if (limit.periodType === 'day') {
    return start.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
  }
  if (limit.periodType === 'month') {
    return start.toISOString().slice(0, 7) !== now.toISOString().slice(0, 7);
  }
  return false;
}

export function nextResetISO(limit: PlatformLimit): string | null {
  if (limit.periodType === 'lifetime') return null;
  const start = new Date(limit.currentPeriodStart);
  const next = new Date(start);
  if (limit.periodType === 'day') next.setUTCDate(next.getUTCDate() + 1);
  else if (limit.periodType === 'month') next.setUTCMonth(next.getUTCMonth() + 1);
  return next.toISOString();
}

// ── UserQuotaDB ──────────────────────────────────────────────────────────────

export class UserQuotaDB {
  private col = 'user_quotas';

  async getByClientId(clientId: string): Promise<UserQuota | null> {
    const db = await getDatabase();
    return db.collection<UserQuota>(this.col).findOne({ clientId });
  }

  async listAll(): Promise<UserQuota[]> {
    const db = await getDatabase();
    return db.collection<UserQuota>(this.col).find().sort({ updatedAt: -1 }).toArray();
  }

  /** Set or replace the limit for ONE platform on a user. Other platforms remain untouched. */
  async setPlatformLimit(
    clientId: string,
    platform: Platform,
    limit: Omit<PlatformLimit, 'currentPeriodStart' | 'usage'> & { resetUsage?: boolean },
    actor: { adminId?: string; note?: string },
  ): Promise<UserQuota> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await this.getByClientId(clientId);
    const prev = existing?.platforms?.[platform];

    const periodChanged = prev?.periodType !== limit.periodType;
    const shouldResetUsage = limit.resetUsage ?? periodChanged;

    const newLimit: PlatformLimit = {
      isUnlimited: limit.isUnlimited,
      maxPerPeriod: limit.isUnlimited ? undefined : limit.maxPerPeriod,
      periodType: limit.periodType,
      isActive: limit.isActive,
      currentPeriodStart: shouldResetUsage ? periodStartISO(limit.periodType) : (prev?.currentPeriodStart ?? periodStartISO(limit.periodType)),
      usage: shouldResetUsage ? 0 : (prev?.usage ?? 0),
    };

    if (existing) {
      await db.collection<UserQuota>(this.col).updateOne(
        { clientId },
        {
          $set: {
            [`platforms.${platform}`]: newLimit,
            updatedAt: now,
            grantedBy: actor.adminId ?? existing.grantedBy,
            ...(actor.note !== undefined ? { note: actor.note } : {}),
          },
        },
      );
    } else {
      await db.collection<UserQuota>(this.col).insertOne({
        clientId,
        platforms: { [platform]: newLimit },
        grantedBy: actor.adminId,
        note: actor.note,
        createdAt: now,
        updatedAt: now,
      });
    }

    return (await this.getByClientId(clientId))!;
  }

  /** Remove a platform's limit (user loses access on that platform). */
  async removePlatform(clientId: string, platform: Platform): Promise<void> {
    const db = await getDatabase();
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      { $unset: { [`platforms.${platform}`]: '' }, $set: { updatedAt: new Date().toISOString() } },
    );
  }

  /** Remove the entire quota document for a user. */
  async deleteQuota(clientId: string): Promise<boolean> {
    const db = await getDatabase();
    const result = await db.collection<UserQuota>(this.col).deleteOne({ clientId });
    return result.deletedCount > 0;
  }

  /**
   * Core quota check for one platform.
   * SOFT CAP: checks BEFORE dispatch; the trigger that tips the counter
   * to exactly `max` is allowed; the *next* is blocked.
   *
   * On denial, returns a structured `detail` that the UI uses to render a
   * quota-exhausted modal (reset countdown, current usage, etc.).
   */
  async checkPlatform(
    clientId: string,
    platform: Platform,
  ): Promise<
    | { allowed: true }
    | {
        allowed: false;
        reason: string;
        status: 403 | 429;
        detail: {
          code: 'NO_ACCESS' | 'SUSPENDED' | 'QUOTA_EXHAUSTED';
          platform: Platform;
          usage: number;
          max: number | null;
          periodType: PeriodType;
          nextResetAt: string | null;
        };
      }
  > {
    const quota = await this.getByClientId(clientId);
    const limit = quota?.platforms?.[platform];

    if (!quota || !limit) {
      return {
        allowed: false,
        reason: `You don't have ${PLATFORM_LABELS[platform]} access. Request access from an admin on the Quota page.`,
        status: 403,
        detail: {
          code: 'NO_ACCESS',
          platform,
          usage: 0,
          max: null,
          periodType: 'lifetime',
          nextResetAt: null,
        },
      };
    }
    if (!limit.isActive) {
      return {
        allowed: false,
        reason: `${PLATFORM_LABELS[platform]} access is suspended on your account.`,
        status: 403,
        detail: {
          code: 'SUSPENDED',
          platform,
          usage: limit.usage,
          max: limit.maxPerPeriod ?? null,
          periodType: limit.periodType,
          nextResetAt: nextResetISO(limit),
        },
      };
    }
    if (limit.isUnlimited) return { allowed: true };

    // Auto-reset if period rolled over
    if (isPeriodExpired(limit)) {
      await this.resetPlatformPeriod(clientId, platform);
      return { allowed: true };
    }

    const max = limit.maxPerPeriod ?? Infinity;
    if (limit.usage >= max) {
      return {
        allowed: false,
        reason: `${PLATFORM_LABELS[platform]} quota reached (${limit.usage.toLocaleString()}/${(limit.maxPerPeriod ?? 0).toLocaleString()} ${PLATFORM_UNIT[platform]} this ${limit.periodType}). Request an increase from an admin.`,
        status: 429,
        detail: {
          code: 'QUOTA_EXHAUSTED',
          platform,
          usage: limit.usage,
          max: limit.maxPerPeriod ?? null,
          periodType: limit.periodType,
          nextResetAt: nextResetISO(limit),
        },
      };
    }
    return { allowed: true };
  }

  /** Increment a platform's usage by 1 (used for render trigger count). */
  async incrementUsage(clientId: string, platform: Platform): Promise<void> {
    return this.incrementUsageBy(clientId, platform, 1);
  }

  /**
   * Increment a platform's usage by an arbitrary amount.
   * Use this for AI tokens (where amount = totalTokens from the model response).
   */
  async incrementUsageBy(clientId: string, platform: Platform, amount: number): Promise<void> {
    if (!amount || amount <= 0) return;
    const db = await getDatabase();
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      {
        $inc: { [`platforms.${platform}.usage`]: amount },
        $set: { updatedAt: new Date().toISOString() },
      },
    );
  }

  // ── Advanced render config ────────────────────────────────────────────────

  async setRenderConfig(
    clientId: string,
    config: RenderConfigLimits,
    actor: { adminId?: string },
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      {
        $set: { renderConfig: config, updatedAt: now, ...(actor.adminId ? { grantedBy: actor.adminId } : {}) },
        $setOnInsert: { platforms: {}, createdAt: now },
      },
      { upsert: true },
    );
  }

  async removeRenderConfig(clientId: string): Promise<void> {
    const db = await getDatabase();
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      { $unset: { renderConfig: '' }, $set: { updatedAt: new Date().toISOString() } },
    );
  }

  /**
   * Validate a requested render config against the user's stored limits.
   * Returns { allowed: true } when within limits or when no limits are set.
   */
  checkRenderConfig(
    limits: RenderConfigLimits | undefined,
    requested: { memory: number; timeout: number; concurrency?: number; disk: number; preset?: string },
  ): { allowed: true } | { allowed: false; reason: string } {
    if (!limits) return { allowed: true };

    const maxMem = limits.maxMemoryMb ?? DEFAULT_RENDER_CONFIG_LIMITS.maxMemoryMb;
    const maxTimeout = limits.maxTimeoutSeconds ?? DEFAULT_RENDER_CONFIG_LIMITS.maxTimeoutSeconds;
    const maxConcurrency = limits.maxConcurrency ?? DEFAULT_RENDER_CONFIG_LIMITS.maxConcurrency;
    const maxDisk = limits.maxDiskMb ?? DEFAULT_RENDER_CONFIG_LIMITS.maxDiskMb;

    if (requested.memory > maxMem) {
      return { allowed: false, reason: `Memory ${requested.memory} MB exceeds your limit of ${maxMem} MB. Contact admin.` };
    }
    if (requested.timeout > maxTimeout) {
      return { allowed: false, reason: `Timeout ${requested.timeout}s exceeds your limit of ${maxTimeout}s. Contact admin.` };
    }
    if (requested.concurrency !== undefined && requested.concurrency > maxConcurrency) {
      return { allowed: false, reason: `Concurrency ${requested.concurrency} exceeds your limit of ${maxConcurrency}. Contact admin.` };
    }
    if (requested.disk > maxDisk) {
      return { allowed: false, reason: `Disk size ${requested.disk} MB exceeds your limit of ${maxDisk} MB. Contact admin.` };
    }
    if (limits.allowedPresets?.length && requested.preset && !limits.allowedPresets.includes(requested.preset)) {
      return { allowed: false, reason: `Preset "${requested.preset}" is not allowed. Allowed: ${limits.allowedPresets.join(', ')}. Contact admin.` };
    }
    return { allowed: true };
  }

  // ── AI provider limits ────────────────────────────────────────────────────

  async setAiProviderLimit(
    clientId: string,
    provider: string,
    limit: { maxTokens: number; periodType: PeriodType; resetUsage?: boolean },
    actor: { adminId?: string },
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const existing = await this.getByClientId(clientId);
    const prev = existing?.aiProviders?.[provider];
    const periodChanged = prev?.periodType !== limit.periodType;
    const shouldReset = limit.resetUsage ?? periodChanged;

    const providerLimit: AiProviderLimit = {
      maxTokens: limit.maxTokens,
      periodType: limit.periodType,
      currentPeriodStart: shouldReset ? periodStartISO(limit.periodType) : (prev?.currentPeriodStart ?? periodStartISO(limit.periodType)),
      usage: shouldReset ? 0 : (prev?.usage ?? 0),
    };

    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      {
        $set: {
          [`aiProviders.${provider}`]: providerLimit,
          updatedAt: now,
          ...(actor.adminId ? { grantedBy: actor.adminId } : {}),
        },
        $setOnInsert: { platforms: {}, createdAt: now },
      },
      { upsert: true },
    );
  }

  async removeAiProviderLimit(clientId: string, provider: string): Promise<void> {
    const db = await getDatabase();
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      { $unset: { [`aiProviders.${provider}`]: '' }, $set: { updatedAt: new Date().toISOString() } },
    );
  }

  /**
   * Check whether all per-provider AI limits are within bounds.
   * A provider is "blocked" if usage >= maxTokens.
   * Returns { allowed: false } if ANY configured provider is over its limit.
   */
  async checkAiProviders(clientId: string): Promise<
    | { allowed: true }
    | { allowed: false; reason: string; blockedProvider: string; status: 429 }
  > {
    const quota = await this.getByClientId(clientId);
    if (!quota?.aiProviders) return { allowed: true };

    for (const [provider, providerLimit] of Object.entries(quota.aiProviders)) {
      // Auto-reset check
      const periodExpired = providerLimit.periodType !== 'lifetime' && (() => {
        const start = new Date(providerLimit.currentPeriodStart);
        const now = new Date();
        if (providerLimit.periodType === 'day') return start.toISOString().slice(0, 10) !== now.toISOString().slice(0, 10);
        if (providerLimit.periodType === 'month') return start.toISOString().slice(0, 7) !== now.toISOString().slice(0, 7);
        return false;
      })();

      if (periodExpired) {
        await this.resetAiProviderPeriod(clientId, provider);
        continue; // Reset — no longer blocked
      }

      if (providerLimit.usage >= providerLimit.maxTokens) {
        const next = nextResetISO({ periodType: providerLimit.periodType, currentPeriodStart: providerLimit.currentPeriodStart } as any);
        const resetMsg = next ? ` Resets ${new Date(next).toLocaleString()}.` : ' Absolute limit — request an increase.';
        return {
          allowed: false,
          reason: `${provider.charAt(0).toUpperCase() + provider.slice(1)} AI token quota exhausted (${providerLimit.usage.toLocaleString()}/${providerLimit.maxTokens.toLocaleString()} tokens).${resetMsg} Contact admin.`,
          blockedProvider: provider,
          status: 429,
        };
      }
    }
    return { allowed: true };
  }

  async incrementAiProviderUsage(clientId: string, provider: string, tokens: number): Promise<void> {
    if (!tokens || tokens <= 0) return;
    const db = await getDatabase();
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId, [`aiProviders.${provider}`]: { $exists: true } },
      {
        $inc: { [`aiProviders.${provider}.usage`]: tokens },
        $set: { updatedAt: new Date().toISOString() },
      },
    );
  }

  private async resetAiProviderPeriod(clientId: string, provider: string): Promise<void> {
    const db = await getDatabase();
    const quota = await this.getByClientId(clientId);
    const providerLimit = quota?.aiProviders?.[provider];
    if (!providerLimit) return;
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      {
        $set: {
          [`aiProviders.${provider}.usage`]: 0,
          [`aiProviders.${provider}.currentPeriodStart`]: periodStartISO(providerLimit.periodType),
          updatedAt: new Date().toISOString(),
        },
      },
    );
  }

  // ── Worker / Agent permissions ────────────────────────────────────────────

  async setWorkerPermissions(
    clientId: string,
    permissions: WorkerPermissions,
    actor: { adminId?: string },
  ): Promise<void> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      {
        $set: { workerPermissions: permissions, updatedAt: now, ...(actor.adminId ? { grantedBy: actor.adminId } : {}) },
        $setOnInsert: { platforms: {}, createdAt: now },
      },
      { upsert: true },
    );
  }

  checkWorkerPermission(
    permissions: WorkerPermissions | undefined,
    type: 'worker' | 'agent',
  ): { allowed: true } | { allowed: false; reason: string } {
    if (!permissions) return { allowed: true }; // default: allowed
    if (type === 'worker' && !permissions.canCallWorkers) {
      return { allowed: false, reason: 'You do not have permission to call workers. Contact admin.' };
    }
    if (type === 'agent' && !permissions.canCallAgents) {
      return { allowed: false, reason: 'You do not have permission to call AI agents. Contact admin.' };
    }
    return { allowed: true };
  }

  private async resetPlatformPeriod(clientId: string, platform: Platform): Promise<void> {
    const db = await getDatabase();
    const quota = await this.getByClientId(clientId);
    const limit = quota?.platforms?.[platform];
    if (!limit) return;
    await db.collection<UserQuota>(this.col).updateOne(
      { clientId },
      {
        $set: {
          [`platforms.${platform}.usage`]: 0,
          [`platforms.${platform}.currentPeriodStart`]: periodStartISO(limit.periodType),
          updatedAt: new Date().toISOString(),
        },
      },
    );
  }
}

// ── QuotaRequestDB ────────────────────────────────────────────────────────────

export class QuotaRequestDB {
  private col = 'quota_requests';

  async create(
    data: Omit<QuotaRequest, '_id' | 'status' | 'createdAt' | 'updatedAt'>,
  ): Promise<QuotaRequest> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const doc: Omit<QuotaRequest, '_id'> = { ...data, status: 'pending', createdAt: now, updatedAt: now };
    const result = await db.collection<QuotaRequest>(this.col).insertOne(doc);
    return { ...doc, _id: result.insertedId };
  }

  async getById(id: string): Promise<QuotaRequest | null> {
    const db = await getDatabase();
    try {
      return await db.collection<QuotaRequest>(this.col).findOne({ _id: new ObjectId(id) });
    } catch {
      return null;
    }
  }

  async listByRequester(requesterId: string): Promise<QuotaRequest[]> {
    const db = await getDatabase();
    return db.collection<QuotaRequest>(this.col).find({ requesterId }).sort({ createdAt: -1 }).toArray();
  }

  async listAll(status?: QuotaRequestStatus): Promise<QuotaRequest[]> {
    const db = await getDatabase();
    const filter: Filter<QuotaRequest> = status ? { status } : {};
    return db.collection<QuotaRequest>(this.col).find(filter).sort({ createdAt: -1 }).toArray();
  }

  async hasPendingForPlatform(requesterId: string, platform: Platform): Promise<boolean> {
    const db = await getDatabase();
    const count = await db.collection<QuotaRequest>(this.col).countDocuments({
      requesterId,
      platform,
      status: 'pending',
    });
    return count > 0;
  }

  async review(
    id: string,
    reviewedBy: string,
    status: 'approved' | 'rejected',
    reviewNote?: string,
  ): Promise<QuotaRequest | null> {
    const db = await getDatabase();
    const result = await db.collection<QuotaRequest>(this.col).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, reviewedBy, reviewNote, updatedAt: new Date().toISOString() } },
      { returnDocument: 'after' },
    );
    return result ?? null;
  }
}

export const userQuotaDB = new UserQuotaDB();
export const quotaRequestDB = new QuotaRequestDB();
