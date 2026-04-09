import { MongoClient } from 'mongodb';
import { resolveWritepadMongoDbName } from './mongoDbName';

const uri =
  process.env.MONGODB_URI ??
  process.env.DATABASE_MONGODB_URI ??
  '';

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

const DB_NAME = resolveWritepadMongoDbName(uri);

let clientPromise: Promise<MongoClient>;

if (process.env.NODE_ENV === 'development') {
  // Reuse the MongoClient across HMR reloads in dev to avoid exhausting connections.
  const g = global as typeof globalThis & {
    _mongoWritepadClientPromise?: Promise<MongoClient>;
  };
  if (!g._mongoWritepadClientPromise) {
    g._mongoWritepadClientPromise = new MongoClient(uri).connect();
  }
  clientPromise = g._mongoWritepadClientPromise;
} else {
  clientPromise = new MongoClient(uri).connect();
}

export async function getDb() {
  const client = await clientPromise;
  return client.db(DB_NAME);
}

export { clientPromise };
