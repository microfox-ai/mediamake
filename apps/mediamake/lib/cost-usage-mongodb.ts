import { getDatabase } from './mongodb';
import { ObjectId } from 'mongodb';
import type {
  PlatformCostUsageDocument,
  PlatformCostUsageInsert,
  CostAmount,
  PlatformKind,
  PlatformCostUsageAggregateDocument,
  PlatformCostUsageAggregateUpsert,
  PeriodType,
} from './cost-usage-types';

const RAW_COLLECTION = 'platform_cost_usage';
const AGG_COLLECTION = 'platform_cost_usage_aggregates';

function now(): string {
  return new Date().toISOString();
}

// --- platform_cost_usage (per-request) ---

export class PlatformCostUsageMongoDB {
  async insert(
    doc: PlatformCostUsageInsert
  ): Promise<PlatformCostUsageDocument & { _id: ObjectId }> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageDocument>(RAW_COLLECTION);
    const nowStr = now();
    const document = {
      ...doc,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    const result = await coll.insertOne(
      document as Omit<PlatformCostUsageDocument, '_id'> & { _id?: ObjectId }
    );
    const created = await coll.findOne({ _id: result.insertedId });
    if (!created) throw new Error('Failed to create platform_cost_usage document');
    return created as PlatformCostUsageDocument & { _id: ObjectId };
  }

  async findUncalculated(
    platform: PlatformKind,
    limit = 500
  ): Promise<(PlatformCostUsageDocument & { _id: ObjectId })[]> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageDocument>(RAW_COLLECTION);
    return coll
      .find({ platform, isCalculated: false })
      .limit(limit)
      .toArray() as Promise<(PlatformCostUsageDocument & { _id: ObjectId })[]>;
  }

  async markCalculated(
    _id: ObjectId,
    cost: CostAmount
  ): Promise<PlatformCostUsageDocument | null> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageDocument>(RAW_COLLECTION);
    const result = await coll.updateOne(
      { _id },
      { $set: { cost, isCalculated: true, updatedAt: now() } }
    );
    if (result.matchedCount === 0) return null;
    return coll.findOne({ _id }) as Promise<PlatformCostUsageDocument | null>;
  }

  async findByRenderId(
    renderId: string,
    clientId?: string
  ): Promise<(PlatformCostUsageDocument & { _id: ObjectId }) | null> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageDocument>(RAW_COLLECTION);
    const query: Record<string, unknown> = {
      platform: 'aws_render',
      'metadata.renderId': renderId,
    };
    if (clientId != null) query.clientId = clientId;
    return coll.findOne(query) as Promise<(PlatformCostUsageDocument & {
      _id: ObjectId;
    }) | null>;
  }

  async updateCostByRenderId(
    renderId: string,
    cost: CostAmount,
    clientId?: string
  ): Promise<boolean> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageDocument>(RAW_COLLECTION);
    const query: Record<string, unknown> = {
      platform: 'aws_render',
      'metadata.renderId': renderId,
    };
    if (clientId != null) query.clientId = clientId;
    const result = await coll.updateOne(query, {
      $set: { cost, isCalculated: true, updatedAt: now() },
    });
    return result.matchedCount > 0;
  }

  /** Create indexes for platform_cost_usage. Call once at startup or from a script. */
  async ensureIndexes(): Promise<void> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageDocument>(RAW_COLLECTION);
    await coll.createIndex({ clientId: 1, createdAt: -1 });
    await coll.createIndex({ platform: 1, isCalculated: 1 });
    await coll.createIndex({ clientId: 1, createdAt: 1 });
    await coll.createIndex({ 'metadata.renderId': 1, platform: 1 });
  }

  /** For rollup worker: find documents with cost calculated, optionally in date range */
  async findWithCost(
    options: {
      updatedAtSince?: string; // ISO date
      limit?: number;
    } = {}
  ): Promise<(PlatformCostUsageDocument & { _id: ObjectId })[]> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageDocument>(RAW_COLLECTION);
    const query: Record<string, unknown> = {
      isCalculated: true,
      'cost.amount': { $exists: true },
    };
    if (options.updatedAtSince) {
      query.updatedAt = { $gte: options.updatedAtSince };
    }
    return coll
      .find(query)
      .limit(options.limit ?? 10000)
      .toArray() as Promise<(PlatformCostUsageDocument & { _id: ObjectId })[]>;
  }
}

// --- platform_cost_usage_aggregates ---

export class PlatformCostUsageAggregatesMongoDB {
  async upsertAggregate(
    clientId: string | undefined,
    platform: string,
    periodType: PeriodType,
    periodValue: string,
    totalCostUSD: number,
    requestCount?: number,
    breakdown?: Record<string, { totalCostUSD: number; requestCount?: number }>
  ): Promise<PlatformCostUsageAggregateDocument> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageAggregateDocument>(AGG_COLLECTION);
    const nowStr = now();
    const isGlobal = clientId === undefined || clientId === '';
    const filter: Record<string, unknown> = {
      platform,
      periodType,
      periodValue,
    };
    if (isGlobal) {
      filter.$or = [{ clientId: null }, { clientId: { $exists: false } }];
    } else {
      filter.clientId = clientId;
    }
    const update: Partial<PlatformCostUsageAggregateDocument> = {
      totalCostUSD,
      currency: 'USD',
      updatedAt: nowStr,
    };
    if (requestCount != null) update.requestCount = requestCount;
    if (breakdown != null) update.breakdown = breakdown;

    const doc = await coll.findOne(filter);
    if (doc) {
      await coll.updateOne(filter, { $set: update });
      const updated = await coll.findOne(filter);
      return updated!;
    }
    const insert: PlatformCostUsageAggregateDocument = {
      clientId,
      platform,
      periodType,
      periodValue,
      totalCostUSD,
      currency: 'USD',
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    if (requestCount != null) insert.requestCount = requestCount;
    if (breakdown != null) insert.breakdown = breakdown;
    const result = await coll.insertOne(
      insert as Omit<PlatformCostUsageAggregateDocument, '_id'> & { _id?: ObjectId }
    );
    const created = await coll.findOne({ _id: result.insertedId });
    if (!created) throw new Error('Failed to create aggregate document');
    return created;
  }

  async getAggregates(
    clientId: string | undefined,
    periodType: PeriodType,
    periodValue?: string
  ): Promise<PlatformCostUsageAggregateDocument[]> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageAggregateDocument>(AGG_COLLECTION);
    const query: Record<string, unknown> = {
      periodType,
    };
    if (periodValue != null) query.periodValue = periodValue;
    if (clientId !== undefined && clientId !== '') {
      query.clientId = clientId;
    } else {
      // Global aggregates: clientId is null or missing
      query.$or = [{ clientId: null }, { clientId: { $exists: false } }];
    }
    return coll.find(query).sort({ periodValue: -1 }).toArray();
  }

  /** Returns all aggregates (per-client and global) for billing dashboard. periodValue optional = all periods. */
  async getAllAggregates(
    periodType: PeriodType,
    periodValue?: string,
    options?: { limit?: number }
  ): Promise<PlatformCostUsageAggregateDocument[]> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageAggregateDocument>(AGG_COLLECTION);
    const query: Record<string, unknown> = { periodType };
    if (periodValue != null) query.periodValue = periodValue;
    let cursor = coll.find(query).sort({ periodValue: -1, clientId: 1, platform: 1 });
    if (options?.limit) cursor = cursor.limit(options.limit);
    return cursor.toArray();
  }

  /** Create indexes for platform_cost_usage_aggregates. Call once at startup or from a script. */
  async ensureIndexes(): Promise<void> {
    const db = await getDatabase();
    const coll = db.collection<PlatformCostUsageAggregateDocument>(AGG_COLLECTION);
    await coll.createIndex({ clientId: 1, periodType: 1, periodValue: 1 });
    await coll.createIndex(
      { clientId: 1, platform: 1, periodType: 1, periodValue: 1 },
      { unique: true }
    );
    await coll.createIndex({ periodType: 1, periodValue: 1 });
  }
}

export const platformCostUsageDB = new PlatformCostUsageMongoDB();
export const platformCostUsageAggregatesDB = new PlatformCostUsageAggregatesMongoDB();
