import { getDatabase } from './mongodb';
import { RenderRequest } from './render-history';
import { ObjectId } from 'mongodb';

// MongoDB document interface for render requests
export interface RenderRequestDocument extends Omit<RenderRequest, 'id'> {
  _id?: ObjectId;
  clientId?: string;
  renderId: string; // Make renderId required for MongoDB
  createdAt: string;
  updatedAt: string;
}

// MongoDB operations for render requests
export class RenderRequestMongoDB {
  private collectionName = 'render_requests';

  async create(
    renderRequest: Omit<
      RenderRequestDocument,
      '_id' | 'createdAt' | 'updatedAt'
    >,
  ): Promise<RenderRequestDocument> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const now = new Date();
    const document: Omit<RenderRequestDocument, '_id'> = {
      ...renderRequest,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    const result = await collection.insertOne(document);
    const created = await collection.findOne({ _id: result.insertedId });

    if (!created) {
      throw new Error('Failed to create render request');
    }

    return created;
  }

  async getById(
    id: string,
    clientId?: string,
  ): Promise<RenderRequestDocument | null> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const query: any = { renderId: id };
    if (clientId) {
      query.clientId = clientId;
    }

    return await collection.findOne(query);
  }

  async getByClientId(
    clientId: string,
    limit = 50,
  ): Promise<RenderRequestDocument[]> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    return await collection
      .find({ clientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async update(
    id: string,
    updates: Partial<RenderRequestDocument>,
    clientId?: string,
  ): Promise<RenderRequestDocument | null> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const query: any = { renderId: id };
    if (clientId) {
      query.clientId = clientId;
    }

    const updateData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    const result = await collection.updateOne(query, { $set: updateData });

    if (result.matchedCount === 0) {
      return null;
    }

    return await collection.findOne(query);
  }

  async delete(id: string, clientId?: string): Promise<boolean> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const query: any = { renderId: id };
    if (clientId) {
      query.clientId = clientId;
    }

    const result = await collection.deleteOne(query);
    return result.deletedCount > 0;
  }

  async getByStatus(
    status: RenderRequest['status'],
    clientId?: string,
  ): Promise<RenderRequestDocument[]> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const query: any = { status };
    if (clientId) {
      query.clientId = clientId;
    }

    return await collection.find(query).sort({ createdAt: -1 }).toArray();
  }

  /** Get render requests created in the last N days (for cron worker). */
  async getRecent(days = 2): Promise<RenderRequestDocument[]> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setUTCHours(0, 0, 0, 0);
    return collection
      .find({ createdAt: { $gte: start.toISOString() } })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Clean up old completed/failed renders (older than 30 days)
  async cleanupOldRenders(daysOld = 30): Promise<number> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await collection.deleteMany({
      status: { $in: ['completed', 'failed'] },
      createdAt: { $lt: cutoffDate.toISOString() },
    });

    return result.deletedCount;
  }
}

// Export singleton instance
export const renderRequestDB = new RenderRequestMongoDB();
