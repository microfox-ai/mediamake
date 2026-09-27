import { NextRequest, NextResponse } from 'next/server';

/**
 * Audio proxy — same-origin fetch so the browser can decode peaks via Web Audio
 * when the CDN/origin blocks cross-origin fetch (CORS).
 *
 * Usage: /api/proxy/audio?url=https://cdn.example.com/track.mp3
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audioUrl = searchParams.get('url');

    if (!audioUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 },
      );
    }

    let parsed: URL;
    try {
      parsed = new URL(audioUrl);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL provided' },
        { status: 400 },
      );
    }

    const response = await fetch(audioUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MediaMake-AudioProxy/1.0)',
        Accept: 'audio/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(60_000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: `Failed to fetch audio: ${response.status} ${response.statusText}`,
        },
        { status: response.status },
      );
    }

    const contentType =
      response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': buffer.byteLength.toString(),
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[proxy/audio]', error);
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json({ error: 'Request timeout' }, { status: 408 });
    }
    return NextResponse.json(
      { error: 'Failed to proxy audio' },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
