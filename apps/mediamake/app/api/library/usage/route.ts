import { NextRequest, NextResponse } from 'next/server';
import { caller, failed, isAdmin, mayUseLibrary, refuse } from '@/lib/cloud-library/http';
import { libraryDB } from '@/lib/cloud-library/store';

/**
 * Who used the Library, and what it costs (docs/library.md › Usage). One line is kept per upload,
 * download, read, search, save and AI fill: names and sizes only.
 *
 * GET  [?days=30]          the caller's own usage and its estimated cost.
 *      ?all=1 [&days=30]   admins: everyone's, by person, device, space and collection, what each space
 *                          stores, and the prices the estimate uses.
 * PUT  { storagePerGbMonth?, downloadPerGb?, searchPer1000?, fillPerMillionTokensIn?, fillPerMillionTokensOut? }
 *                          admins: the prices, in US dollars. They start as rough figures and are
 *                          corrected to what is really paid.
 */
const sinceOf = (req: NextRequest) => {
  const days = Math.min(366, Math.max(1, Number(req.nextUrl.searchParams.get('days')) || 30));
  return new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10);
};

export async function GET(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  try {
    if (req.nextUrl.searchParams.get('all') === '1') {
      if (!(await isAdmin(clientId))) return refuse('Only admins see everyone\'s usage', 403);
      return NextResponse.json(await libraryDB.usageAll(sinceOf(req)));
    }
    const locked = await mayUseLibrary(clientId);
    return locked ?? NextResponse.json(await libraryDB.usageOf(clientId, sinceOf(req)));
  } catch (error) {
    return failed('read the usage', error);
  }
}

export async function PUT(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  try {
    if (!(await isAdmin(clientId))) return refuse('Only admins set the prices', 403);
    return NextResponse.json({ prices: await libraryDB.setPrices(await req.json().catch(() => null), clientId) });
  } catch (error) {
    return failed('save the prices', error);
  }
}
