import { getDatabase } from './mongodb';
import { RenderRequest } from './render-history';
import { type Filter, ObjectId } from 'mongodb';

// MongoDB document interface for render requests
export interface RenderRequestDocument extends Omit<RenderRequest, 'id'> {
  _id?: ObjectId;
  clientId?: string;
  renderId: string; // Make renderId required for MongoDB
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
}

/** Filter to exclude archived documents from active list. */
const notArchivedFilter = { isArchived: { $ne: true } } as const;

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
    options?: { includeArchived?: boolean },
  ): Promise<RenderRequestDocument | null> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const query: Filter<RenderRequestDocument> = {
      renderId: id,
      ...(clientId ? { clientId } : {}),
      ...(options?.includeArchived ? {} : notArchivedFilter),
    };

    return await collection.findOne(query);
  }

  /** Get only inputProps for a render (for on-demand load). Uses projection to avoid loading full document. */
  async getInputPropsById(
    id: string,
    clientId: string,
    options?: { includeArchived?: boolean },
  ): Promise<RenderRequest['inputProps'] | null> {
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const query: Filter<RenderRequestDocument> = {
      renderId: id,
      clientId,
      ...(options?.includeArchived ? {} : notArchivedFilter),
    };

    const doc = await collection.findOne(query, {
      projection: { inputProps: 1 },
    });
    return doc?.inputProps ?? null;
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
      .find({ clientId, ...notArchivedFilter })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  // /**
  //  * Ensure pagination index exists. Idempotent; safe to call on every request.
  //  * Without this index, list queries can take 20+ seconds on large collections.
  //  */
  // private async ensurePaginationIndex(): Promise<void> {
  //   const db = await getDatabase();
  //   const collection = db.collection<RenderRequestDocument>(this.collectionName);
  //   await collection.createIndex(
  //     { clientId: 1, isArchived: 1, createdAt: -1, _id: -1 },
  //     { background: true },
  //   );
  // }

  /**
   * Get render requests by clientId with cursor-based pagination.
   * Cursor is opaque string encoding last item's createdAt and _id.
   * Use archivedOnly: true to list only archived renders.
   * Excludes inputProps from the read to keep list fast (it can be MBs).
   */
  async getByClientIdPaginated(
    clientId: string,
    limit: number,
    cursor?: string | null,
    options?: {
      archivedOnly?: boolean;
      renderType?: RenderRequest['renderType'] | 'any';
      projectId?: string | 'any';
      tags?: string[]; // match any tag
    },
  ): Promise<{
    items: RenderRequestDocument[];
    nextCursor: string | null;
    hasMore: boolean;
  }> {
    // await this.ensurePaginationIndex();
    const db = await getDatabase();
    const collection = db.collection<RenderRequestDocument>(
      this.collectionName,
    );

    const sort = { createdAt: -1 as const, _id: -1 as const };
    const query: Filter<RenderRequestDocument> = {
      clientId,
      ...(options?.archivedOnly ? { isArchived: true } : notArchivedFilter),
    };

    if (options?.renderType && options.renderType !== 'any') {
      query.renderType = options.renderType as any;
    }
    if (options?.projectId && options.projectId !== 'any') {
      query.projectId = options.projectId as any;
    }
    if (options?.tags && options.tags.length > 0) {
      // Any-tag match (simple filtering, not full-text)
      query.tags = { $in: options.tags } as any;
    }

    if (cursor) {
      const [createdAt, idStr] = cursor.split('_');
      if (createdAt && idStr) {
        try {
          const cursorId = new ObjectId(idStr);
          query.$or = [
            { createdAt: { $lt: createdAt } },
            { createdAt, _id: { $lt: cursorId } },
          ];
        } catch {
          // invalid cursor, ignore and return first page
        }
      }
    }

    // Exclude inputProps so MongoDB doesn't read/transfer it (list doesn't need it; can be MBs)
    const projection = { inputProps: 0 } as const;

    const items = await collection
      .find(query, { projection })
      .sort(sort)
      .limit(limit + 1)
      .toArray();

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const last = resultItems[resultItems.length - 1];
    const nextCursor =
      hasMore && last?._id
        ? `${last.createdAt}_${last._id.toString()}`
        : null;

    return { items: resultItems, nextCursor, hasMore };
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

    const query: Filter<RenderRequestDocument> = { status, ...notArchivedFilter };
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
      .find({ createdAt: { $gte: start.toISOString() }, ...notArchivedFilter })
      .sort({ createdAt: -1 })
      .toArray();
  }

  // Clean up old completed/failed renders (older than 30 days). Does not remove soft-deleted.
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
      ...notArchivedFilter,
    });

    return result.deletedCount;
  }

  /** Archive: set isArchived true so render is hidden from active list but cost/details remain. */
  async archive(id: string, clientId?: string): Promise<boolean> {
    const updated = await this.update(id, { isArchived: true }, clientId);
    return updated != null;
  }
}

// Export singleton instance
export const renderRequestDB = new RenderRequestMongoDB();
