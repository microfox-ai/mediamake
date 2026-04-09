import { getDb } from './mongodb';
import type { Collection } from 'mongodb';
import type { PlatformCostUsageDocument, PlatformCostUsageInsert } from '../cost-usage-types';

export async function platformCostUsageCol(): Promise<Collection<PlatformCostUsageDocument>> {
  return (await getDb()).collection<PlatformCostUsageDocument>('platform_cost_usage');
}

export async function insertCostUsage(doc: PlatformCostUsageInsert): Promise<void> {
  const col = await platformCostUsageCol();
  const now = new Date();
  await col.insertOne({ ...doc, createdAt: now, updatedAt: now } as PlatformCostUsageDocument);
}
