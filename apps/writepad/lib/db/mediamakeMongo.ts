import { MongoClient, type Db } from 'mongodb';

const uri = process.env.MEDIAMAKE_DB_URL?.trim() ?? '';

/** Database name for Mediamake `mediaFiles` (matches apps/mediamake default). */
export const MEDIAMAKE_DEFAULT_DB_NAME = 'mediamake';

export function resolveMediamakeDbName(): string {
  return process.env.MEDIAMAKE_DB_NAME?.trim() || MEDIAMAKE_DEFAULT_DB_NAME;
}

export function isMediamakeConfigured(): boolean {
  return uri.length > 0;
}

let clientPromise: Promise<MongoClient> | undefined;

function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error('MEDIAMAKE_DB_URL is not set');
  }
  if (process.env.NODE_ENV === 'development') {
    const g = global as typeof globalThis & {
      _mongoMediamakeClientPromise?: Promise<MongoClient>;
    };
    if (!g._mongoMediamakeClientPromise) {
      g._mongoMediamakeClientPromise = new MongoClient(uri).connect();
    }
    return g._mongoMediamakeClientPromise;
  }
  if (!clientPromise) {
    clientPromise = new MongoClient(uri).connect();
  }
  return clientPromise;
}

export async function getMediamakeDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db(resolveMediamakeDbName());
}
