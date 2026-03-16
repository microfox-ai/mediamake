import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

export type MidjourneyQueueStatus =
  | 'pending'
  | 'triggered'
  | 'saved'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface MidjourneyQueueItem {
  _id?: ObjectId;
  clientId: string;
  projectId?: string | null;
  prompt: string;
  priority: number;
  tags?: string[];
  folder?: string | null;
  status: MidjourneyQueueStatus;
  jobId?: string | null;
  errorMessage?: string | null;
  triggeredAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function getMidjourneyQueueCollection() {
  const db = await getDatabase();
  const collection = db.collection<MidjourneyQueueItem>('midjourneyQueue');

  // Ensure indexes exist (no-op if already created)
  await collection.createIndexes([
    {
      key: {
        clientId: 1,
        projectId: 1,
        status: 1,
        priority: -1,
        createdAt: 1,
      },
      name: 'midjourney_queue_by_client_project_status_priority_createdAt',
    },
  ]);

  return collection;
}

export function toObjectId(id: string): ObjectId | null {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

