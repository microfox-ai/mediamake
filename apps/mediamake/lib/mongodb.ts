import { MongoClient, Db } from 'mongodb';

if (!process.env.MONGODB_URI) {
  //throw new Error('Please add your MongoDB URI to .env.local');
}

const uri = process.env.MONGODB_URI;
// A pooled connection left idle for minutes (a server waiting on a long Lambda deploy) is dropped by
// the far end and answers its next write with EPIPE (2026-11-04: a render ran with no record). Let the
// pool close idle connections itself first, and retry writes (the driver's default, said out loud).
const options = { maxIdleTimeMS: 60_000, retryWrites: true };

let client: MongoClient;
let clientPromise: Promise<MongoClient> = Promise.resolve(null as any);

if (typeof window === 'undefined') {
  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    let globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri ?? '', options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri ?? '', options);
    clientPromise = client.connect();
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDatabase(): Promise<Db> {
  const client = await clientPromise;
  return client.db(process.env.MONGODB_DATABASE || 'mediamake');
}
