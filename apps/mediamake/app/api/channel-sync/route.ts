import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getDatabase } from '@/lib/mongodb';
import { getClientId } from '@/lib/auth-utils';
import { channelSyncAccess } from '@/lib/channel-sync/access';
import { MAX_LIMIT_BYTES, MB, SYNC_WHATS, limitOf, usedBytes, type ChannelSyncStatus } from '@/lib/channel-sync';
import { sharedFiles, syncItems } from '@/lib/channel-sync/store';

// GET /api/channel-sync?projectId=... - the channel's project, your role on it, its file limit and what it shares
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get('projectId');
  try {
    const db = await getDatabase();
    const access = await channelSyncAccess(db, projectId, getClientId(request), 'read');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    const project = await db.collection('projects').findOne({ _id: new ObjectId(projectId!) }, { projection: { displayName: 1, channelSync: 1 } });
    const items = syncItems(db);
    const [counts, files] = await Promise.all([Promise.all(SYNC_WHATS.map(what => items.countDocuments({ projectId: projectId!, what }))), sharedFiles(db, projectId!)]);
    const status: ChannelSyncStatus = {
      project: { id: projectId!, name: project?.displayName ?? projectId!, role: access.role },
      limitBytes: limitOf(project),
      usedBytes: usedBytes(files),
      counts: { production: counts[0], skill: counts[1], media: counts[2], files: files.filter(f => f.state === 'shared').length },
    };
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error reading channel sync:', error);
    return NextResponse.json({ error: 'Failed to read channel sync' }, { status: 500 });
  }
}

// PUT /api/channel-sync - { projectId, limitMb }: how much the team may share in files, in all (owner only)
export async function PUT(request: NextRequest) {
  try {
    const { projectId, limitMb } = (await request.json()) as { projectId?: string; limitMb?: number };
    const db = await getDatabase();
    const access = await channelSyncAccess(db, projectId ?? null, getClientId(request), 'owner');
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
    if (typeof limitMb !== 'number' || !Number.isFinite(limitMb) || limitMb < 0) return NextResponse.json({ error: 'limitMb must be a number of MB (0 or more)' }, { status: 400 });
    const limitBytes = Math.min(Math.round(limitMb * MB), MAX_LIMIT_BYTES);
    await db.collection('projects').updateOne({ _id: new ObjectId(projectId!) }, { $set: { 'channelSync.limitBytes': limitBytes, updatedAt: new Date() } });
    return NextResponse.json({ projectId, limitBytes });
  } catch (error) {
    console.error('Error saving the channel sync limit:', error);
    return NextResponse.json({ error: 'Failed to save the limit' }, { status: 500 });
  }
}
