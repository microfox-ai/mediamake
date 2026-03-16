import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import {
  getMidjourneyQueueCollection,
  MidjourneyQueueItem,
  MidjourneyQueueStatus,
} from './model';

type SortOrder = 'asc' | 'desc';

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

    const statusParam = searchParams.get('status');
    const projectIdParam = searchParams.get('projectId');
    const minPriorityParam = searchParams.get('minPriority');
    const maxPriorityParam = searchParams.get('maxPriority');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const sortBy = searchParams.get('sortBy') || 'priority';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as SortOrder;

    const skip = (page - 1) * limit;

    const collection = await getMidjourneyQueueCollection();

    const query: any = { clientId };

    if (statusParam) {
      const statuses = statusParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean) as MidjourneyQueueStatus[];
      if (statuses.length > 0) {
        query.status = { $in: statuses };
      }
    }

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

    const priorityFilter: any = {};
    if (minPriorityParam !== null) {
      const minPriority = Number(minPriorityParam);
      if (!Number.isNaN(minPriority)) {
        priorityFilter.$gte = minPriority;
      }
    }
    if (maxPriorityParam !== null) {
      const maxPriority = Number(maxPriorityParam);
      if (!Number.isNaN(maxPriority)) {
        priorityFilter.$lte = maxPriority;
      }
    }
    if (Object.keys(priorityFilter).length > 0) {
      query.priority = priorityFilter;
    }

    if (search) {
      query.prompt = { $regex: search, $options: 'i' };
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    // Tie-breaker for stable ordering
    if (sortBy !== 'createdAt') {
      sort.createdAt = 1;
    }

    const [items, total] = await Promise.all([
      collection.find(query).sort(sort).skip(skip).limit(limit).toArray(),
      collection.countDocuments(query),
    ]);

    const mapped = items.map((item) => ({
      id: item._id?.toString() ?? '',
      clientId: item.clientId,
      projectId: item.projectId ?? null,
      prompt: item.prompt,
      priority: item.priority,
      tags: item.tags ?? [],
      status: item.status,
      jobId: item.jobId ?? null,
      errorMessage: item.errorMessage ?? null,
      triggeredAt: item.triggeredAt ?? null,
      completedAt: item.completedAt ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({
      items: mapped,
      total,
      page,
      pageSize: limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Error fetching midjourney queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch midjourney queue' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 401 },
      );
    }

    const body = await req.json();
    const { prompt, priority, projectId, tags, folder } = body ?? {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 },
      );
    }

    const numericPriority =
      typeof priority === 'number' && !Number.isNaN(priority)
        ? priority
        : 1;

    let normalizedProjectId: string | null | undefined = undefined;
    if (typeof projectId === 'string' && projectId.trim() !== '') {
      if (projectId === 'default') {
        normalizedProjectId = null;
      } else {
        normalizedProjectId = projectId.trim();
      }
    }

    const now = new Date().toISOString();

    const document: MidjourneyQueueItem = {
      clientId,
      projectId: normalizedProjectId ?? null,
      prompt: prompt.trim(),
      priority: numericPriority,
      tags: Array.isArray(tags)
        ? tags.filter((t: any) => typeof t === 'string' && t.trim() !== '')
        : [],
      folder:
        typeof folder === 'string' && folder.trim() !== ''
          ? folder.trim()
          : null,
      status: 'pending',
      jobId: null,
      errorMessage: null,
      triggeredAt: null,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const collection = await getMidjourneyQueueCollection();
    const result = await collection.insertOne(document);

    return NextResponse.json({
      id: result.insertedId.toString(),
      clientId: document.clientId,
      projectId: document.projectId,
      prompt: document.prompt,
      priority: document.priority,
      tags: document.tags,
      status: document.status,
      jobId: document.jobId,
      errorMessage: document.errorMessage,
      triggeredAt: document.triggeredAt,
      completedAt: document.completedAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    });
  } catch (error) {
    console.error('Error creating midjourney queue item:', error);
    return NextResponse.json(
      { error: 'Failed to create midjourney queue item' },
      { status: 500 },
    );
  }
}

