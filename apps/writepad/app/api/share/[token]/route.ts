import { NextRequest, NextResponse } from 'next/server';
import { projectExportsCol } from '@/lib/db/collections';

/**
 * GET /api/share/[token]?dl=1
 *
 * Serves the exported file as a direct download (when ?dl=1) or returns
 * the export metadata as JSON for the viewer page.
 *
 * This route is public — no authentication required.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || !/^[0-9a-f-]{36}$/.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const col = await projectExportsCol();
  const doc = await col.findOne({ shareToken: token });

  if (!doc) {
    return NextResponse.json({ error: 'Not found or expired' }, { status: 404 });
  }

  if (doc.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Link expired' }, { status: 410 });
  }

  const dl = req.nextUrl.searchParams.get('dl') === '1';

  if (dl) {
    // ── Direct download ──────────────────────────────────────────────────────
    const contentDisposition = `attachment; filename="${encodeURIComponent(doc.fileName)}"`;

    if (doc.format === 'epub') {
      // content is base64-encoded bytes
      const bytes = Buffer.from(doc.content, 'base64');
      return new NextResponse(bytes, {
        headers: {
          'Content-Type': 'application/epub+zip',
          'Content-Disposition': contentDisposition,
          'Content-Length': String(bytes.length),
          'Cache-Control': 'private, no-store',
        },
      });
    }

    if (doc.format === 'docx') {
      const bytes = Buffer.from(doc.content, 'utf-8');
      return new NextResponse(bytes, {
        headers: {
          'Content-Type': 'application/vnd.ms-word;charset=utf-8',
          'Content-Disposition': contentDisposition,
          'Cache-Control': 'private, no-store',
        },
      });
    }

    // pdf — send HTML for browser printing
    return new NextResponse(doc.content, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.fileName)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  }

  // ── Viewer metadata ──────────────────────────────────────────────────────
  return NextResponse.json({
    format: doc.format,
    fileName: doc.fileName,
    projectName: doc.projectName,
    createdAt: doc.createdAt.toISOString(),
    expiresAt: doc.expiresAt.toISOString(),
    // Only return content for pdf (HTML viewer). EPUB/DOCX require download.
    content: doc.format === 'pdf' ? doc.content : null,
  });
}
