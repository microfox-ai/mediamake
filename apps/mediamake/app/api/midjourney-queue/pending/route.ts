import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import { getMidjourneyQueueCollection } from '../model';

export async function GET(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const projectIdParam = searchParams.get('projectId');
    const limitParam = searchParams.get('limit');
    const minPriorityParam = searchParams.get('minPriority');

    const limit = Math.min(
      parseInt(limitParam || '100', 10) || 100,
      500,
    );

    const query: any = {
      clientId,
      status: 'pending',
    };

    if (projectIdParam) {
      if (projectIdParam === 'default') {
        query.$or = [
          { projectId: { $exists: false } },
          { projectId: null },
        ];
      } else {
        query.projectId = projectIdParam;
      }
    }

    if (minPriorityParam !== null) {
      const minPriority = Number(minPriorityParam);
      if (!Number.isNaN(minPriority)) {
        query.priority = { $gte: minPriority };
      }
    }

    const collection = await getMidjourneyQueueCollection();

    const items = await collection
      .find(query)
      .sort({ priority: -1, createdAt: 1 })
      .limit(limit)
      .toArray();

    const mapped = items.map((item) => ({
      id: item._id?.toString() ?? '',
      clientId: item.clientId,
      projectId: item.projectId ?? null,
      prompt: item.prompt,
      priority: item.priority,
      tags: item.tags ?? [],
      folder: item.folder ?? null,
      status: item.status,
      jobId: item.jobId ?? null,
      errorMessage: item.errorMessage ?? null,
      triggeredAt: item.triggeredAt ?? null,
      completedAt: item.completedAt ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    console.error('Error fetching pending midjourney queue items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending midjourney queue items' },
      { status: 500 },
    );
  }
}

