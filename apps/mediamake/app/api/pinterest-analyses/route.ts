import { NextRequest, NextResponse } from 'next/server';
import { getClientId } from '@/lib/auth-utils';
import { getPinterestAnalysesCollection } from './model';

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
    const limitParam = searchParams.get('limit');
    const offsetParam = searchParams.get('offset');

    const limit = Math.min(parseInt(limitParam || '50', 10) || 50, 200);
    const offset = Math.max(parseInt(offsetParam || '0', 10) || 0, 0);

    const collection = await getPinterestAnalysesCollection();

    const [items, total] = await Promise.all([
      collection
        .find({ clientId })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .toArray(),
      collection.countDocuments({ clientId }),
    ]);

    const mapped = items.map((item) => ({
      id: item._id?.toString() ?? '',
      clientId: item.clientId,
      projectId: item.projectId ?? null,
      imageUrl: item.imageUrl,
      pageUrl: item.pageUrl,
      imageAlt: item.imageAlt ?? '',
      description: item.description,
      keywords: item.keywords ?? [],
      artStyle: item.artStyle ?? [],
      audienceKeywords: item.audienceKeywords ?? [],
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({ items: mapped, total, limit, offset });
  } catch (error) {
    console.error('Error fetching pinterest analyses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pinterest analyses' },
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
    const {
      imageUrl,
      pageUrl,
      imageAlt,
      projectId,
      description,
      keywords,
      artStyle,
      audienceKeywords,
    } = body ?? {};

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 },
      );
    }
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'description is required' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();

    const collection = await getPinterestAnalysesCollection();

    const result = await collection.insertOne({
      clientId,
      projectId: typeof projectId === 'string' && projectId.trim() ? projectId.trim() : null,
      imageUrl: imageUrl.trim(),
      pageUrl: typeof pageUrl === 'string' ? pageUrl.trim() : '',
      imageAlt: typeof imageAlt === 'string' ? imageAlt.trim() : '',
      description: description.trim(),
      keywords: Array.isArray(keywords) ? keywords.filter((k: any) => typeof k === 'string') : [],
      artStyle: Array.isArray(artStyle) ? artStyle.filter((k: any) => typeof k === 'string') : [],
      audienceKeywords: Array.isArray(audienceKeywords)
        ? audienceKeywords.filter((k: any) => typeof k === 'string')
        : [],
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      id: result.insertedId.toString(),
      success: true,
    });
  } catch (error) {
    console.error('Error saving pinterest analysis:', error);
    return NextResponse.json(
      { error: 'Failed to save pinterest analysis' },
      { status: 500 },
    );
  }
}
