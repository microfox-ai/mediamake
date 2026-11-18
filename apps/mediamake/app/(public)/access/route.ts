import { NextResponse, type NextRequest } from 'next/server';
import { oldAccessPath } from '@/lib/catalog/paths';

/**
 * /access is gone: an item has only its own page (/skills/<slug>, /mcps/<slug>, /apps/<slug>).
 * Old links still land somewhere: /access?item=<id> on that page, /access alone on Subscription.
 */
export function GET(request: NextRequest) {
  return NextResponse.redirect(new URL(oldAccessPath(request.nextUrl.searchParams.get('item')), request.url), 308);
}
