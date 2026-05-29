import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';

export interface PinterestAnalysis {
  _id?: ObjectId;
  clientId: string;
  projectId?: string | null;
  imageUrl: string;
  pageUrl: string;
  imageAlt?: string;
  description: string;
  keywords: string[];
  artStyle: string[];
  audienceKeywords: string[];
  createdAt: string;
  updatedAt: string;
}

export async function getPinterestAnalysesCollection() {
  const db = await getDatabase();
  const collection = db.collection<PinterestAnalysis>('pinterestAnalyses');

  await collection.createIndexes([
    {
      key: { clientId: 1, createdAt: -1 },
      name: 'pinterest_analyses_by_client_createdAt',
    },
    {
      key: { clientId: 1, pageUrl: 1 },
      name: 'pinterest_analyses_by_client_pageUrl',
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
