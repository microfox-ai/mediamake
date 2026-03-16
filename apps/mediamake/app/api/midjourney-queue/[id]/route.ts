import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import {
  getMidjourneyQueueCollection,
  MidjourneyQueueStatus,
  toObjectId,
} from '../model';

function isTransitionAllowed(
  from: MidjourneyQueueStatus,
  to: MidjourneyQueueStatus,
): boolean {
  if (from === to) return true;

  switch (from) {
    case 'pending':
      return (
        to === 'triggered' ||
        to === 'saved' ||
        to === 'completed' ||
        to === 'failed' ||
        to === 'cancelled'
      );
    case 'triggered':
      return to === 'saved' || to === 'completed' || to === 'failed' || to === 'cancelled';
    case 'saved':
      return false;
    case 'completed':
    case 'failed':
    case 'cancelled':
      return false;
    default:
      return false;
  }
}

export async function DELETE(req: NextRequest, { params }: any) {
  try {
    const clientId = getClientId(req);
    const id = params.id;
    const objectId = toObjectId(id);

    if (!objectId) {
      return NextResponse.json(
        { error: 'Invalid ID' },
        { status: 400 },
      );
    }

    const collection = await getMidjourneyQueueCollection();

    const filter: any = { _id: objectId };
    if (clientId) {
      filter.clientId = clientId;
    }

    const existing = await collection.findOne(filter);
    if (!existing) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 },
      );
    }

    const result = await collection.deleteOne(filter);
    if (result.deletedCount !== 1) {
      return NextResponse.json(
        { error: 'Failed to delete queue item' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting midjourney queue item:', error);
    return NextResponse.json(
      { error: 'Failed to delete midjourney queue item' },
      { status: 500 },
    );
  }
}


export async function GET(req: NextRequest, { params }: any) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 401 },
      );
    }

    const id = params?.id as string;
    const objectId = toObjectId(id);
    if (!objectId) {
      return NextResponse.json(
        { error: 'Invalid queue item ID' },
        { status: 400 },
      );
    }

    const collection = await getMidjourneyQueueCollection();
    const item = await collection.findOne({ _id: objectId, clientId });

    if (!item) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: item._id?.toString() ?? '',
      clientId: item.clientId,
      projectId: item.projectId ?? null,
      prompt: item.prompt,
      priority: item.priority,
      tags: item.tags ?? [],
      status: item.status,
      jobId: item.jobId ?? null,
      folder: item.folder ?? null,
      errorMessage: item.errorMessage ?? null,
      triggeredAt: item.triggeredAt ?? null,
      completedAt: item.completedAt ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching midjourney queue item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch midjourney queue item' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, { params }: any) {
  try {
    const clientId = getClientId(req);

    const id = params?.id as string;
    const objectId = toObjectId(id);
    if (!objectId) {
      return NextResponse.json(
        { error: 'Invalid queue item ID' },
        { status: 400 },
      );
    }

    const body = await req.json();
    const {
      status,
      jobId,
      triggeredAt,
      completedAt,
      errorMessage,
    }: {
      status?: MidjourneyQueueStatus;
      jobId?: string | null;
      triggeredAt?: string | null;
      completedAt?: string | null;
      errorMessage?: string | null;
    } = body ?? {};

    const collection = await getMidjourneyQueueCollection();

    // For authenticated dashboard/API calls, clientId will be present and we
    // scope updates to that client. For internal/system calls (like the
    // browser extension) clientId may be missing; in that case, we fall back
    // to matching by _id only.
    const baseFilter: any = { _id: objectId };
    if (clientId) {
      baseFilter.clientId = clientId;
    }
    const existing = await collection.findOne(baseFilter);

    if (!existing) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 },
      );
    }

    const update: any = {};
    const now = new Date().toISOString();

    if (status) {
      if (!isTransitionAllowed(existing.status, status)) {
        return NextResponse.json(
          {
            error: `Invalid status transition from '${existing.status}' to '${status}'`,
          },
          { status: 400 },
        );
      }
      update.status = status;
    }

    if (jobId !== undefined) {
      update.jobId = jobId;
    }

    if (errorMessage !== undefined) {
      update.errorMessage =
        typeof errorMessage === 'string' && errorMessage.trim() !== ''
          ? errorMessage.trim()
          : null;
    }

    if (triggeredAt !== undefined) {
      update.triggeredAt = triggeredAt;
    } else if (status === 'triggered' && !existing.triggeredAt) {
      update.triggeredAt = now;
    }

    if (completedAt !== undefined) {
      update.completedAt = completedAt;
    } else if (
      (status === 'completed' || status === 'failed' || status === 'cancelled') &&
      !existing.completedAt
    ) {
      update.completedAt = now;
    }

    update.updatedAt = now;

    await collection.updateOne(baseFilter, { $set: update });

    const updated = await collection.findOne(baseFilter);

    if (!updated) {
      return NextResponse.json(
        { error: 'Queue item not found after update' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: updated._id?.toString() ?? '',
      clientId: updated.clientId,
      projectId: updated.projectId ?? null,
      prompt: updated.prompt,
      priority: updated.priority,
      tags: updated.tags ?? [],
      status: updated.status,
      jobId: updated.jobId ?? null,
      folder: updated.folder ?? null,
      errorMessage: updated.errorMessage ?? null,
      triggeredAt: updated.triggeredAt ?? null,
      completedAt: updated.completedAt ?? null,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (error) {
    console.error('Error updating midjourney queue item:', error);
    return NextResponse.json(
      { error: 'Failed to update midjourney queue item' },
      { status: 500 },
    );
  }
}

