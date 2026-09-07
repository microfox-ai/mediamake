import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { renderRequestDB } from '@/lib/render-mongodb';
import { userQuotaDB } from '@/lib/quota-mongodb';
import { isAdmin } from '@/lib/admin-utils';
import { getClientId } from '@/lib/auth-utils';
import { createPresignedUpload, getPublicUrl } from '@/lib/spaces-upload';

/**
 * Browser (client-side) rendering via @remotion/web-renderer.
 *
 * POST  — register a browser render: creates a `render_requests` document
 *         (status "rendering", renderSource "browser", no bucketName so the
 *         Lambda progress poller never touches it) and returns a presigned
 *         PUT URL the client uploads the finished file to.
 * PATCH — finalize: mark completed (downloadUrl derived server-side from the
 *         stored outputKey) or failed.
 */

const CONTENT_TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  png: 'image/png',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export const POST = async (req: NextRequest) => {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      fileName,
      renderType,
      container, // 'mp4' | 'webm' | 'mkv' for video, 'png' | 'jpeg' | 'webp' for stills
      codec,
      audioCodec,
      composition,
      inputProps,
      projectId,
      tags,
    } = await req.json();

    if (renderType !== 'video' && renderType !== 'still') {
      return NextResponse.json(
        { type: 'error', message: 'renderType must be "video" or "still"' },
        { status: 400 },
      );
    }

    const contentType = CONTENT_TYPES[container as string];
    if (!contentType) {
      return NextResponse.json(
        { type: 'error', message: `Unsupported container: ${container}` },
        { status: 400 },
      );
    }

    // Same trigger-count quota as Lambda renders (storage is still ours even
    // though compute is the client's). Admins bypass.
    if (!(await isAdmin(clientId))) {
      const check = await userQuotaDB.checkPlatform(clientId, 'render');
      if (!check.allowed) {
        return NextResponse.json(
          { type: 'error', message: check.reason, quotaError: check.detail },
          { status: check.status },
        );
      }
    }

    const renderId = `web-${randomUUID()}`;
    const safeFileName =
      typeof fileName === 'string' && fileName.trim()
        ? fileName.trim()
        : `${renderType === 'still' ? 'image' : 'video'}-${Date.now()}.${container}`;

    const { uploadUrl, publicUrl, key } = await createPresignedUpload({
      clientId,
      filename: safeFileName,
      contentType,
      subPath: 'renders',
    });

    const safeTags = Array.isArray(tags)
      ? tags.filter((t: unknown) => typeof t === 'string' && t.trim() !== '')
      : undefined;
    const safeProjectId =
      typeof projectId === 'string' && projectId.trim()
        ? projectId.trim()
        : undefined;

    await renderRequestDB.create({
      clientId,
      renderId,
      fileName: safeFileName,
      codec: codec || (renderType === 'still' ? container : 'h264'),
      audioCodec: renderType === 'still' ? undefined : (audioCodec || 'aac'),
      composition: composition || 'DataMotion',
      status: 'rendering',
      inputProps,
      renderType,
      renderSource: 'browser',
      outputKey: key,
      projectId: safeProjectId,
      tags: safeTags,
      isDownloadable: false,
    });

    if (!(await isAdmin(clientId))) {
      await userQuotaDB.incrementUsage(clientId, 'render');
    }

    return NextResponse.json({ renderId, uploadUrl, publicUrl });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { type: 'error', message: (err as Error).message },
      { status: 500 },
    );
  }
};

export const PATCH = async (req: NextRequest) => {
  try {
    const clientId = getClientId(req);
    if (!clientId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { renderId, status, fileSize, error } = await req.json();

    if (typeof renderId !== 'string' || !renderId) {
      return NextResponse.json(
        { type: 'error', message: 'renderId is required' },
        { status: 400 },
      );
    }
    if (status !== 'completed' && status !== 'failed') {
      return NextResponse.json(
        { type: 'error', message: 'status must be "completed" or "failed"' },
        { status: 400 },
      );
    }

    const existing = await renderRequestDB.getById(renderId, clientId);
    if (!existing) {
      return NextResponse.json(
        { type: 'error', message: 'Render not found' },
        { status: 404 },
      );
    }
    if (existing.renderSource !== 'browser') {
      return NextResponse.json(
        { type: 'error', message: 'Not a browser render' },
        { status: 400 },
      );
    }

    const updated = await renderRequestDB.update(
      renderId,
      status === 'completed'
        ? {
            status: 'completed',
            // Derived server-side from the key issued at creation — the
            // client never dictates where the record points.
            downloadUrl: existing.outputKey
              ? getPublicUrl(existing.outputKey)
              : undefined,
            fileSize: typeof fileSize === 'number' ? fileSize : undefined,
            progress: 1,
          }
        : {
            status: 'failed',
            error:
              typeof error === 'string' && error
                ? error
                : 'Browser render failed',
          },
      clientId,
    );

    return NextResponse.json({ type: 'success', request: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { type: 'error', message: (err as Error).message },
      { status: 500 },
    );
  }
};
