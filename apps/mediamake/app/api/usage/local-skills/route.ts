import { NextRequest, NextResponse } from 'next/server';
import { usageDB } from '@/lib/usage/store';
import { parseLocalSkills } from '@/lib/usage/usage';

/**
 * The skills on an account's computers, for "skills on your computer" under
 * Mine. Behind the middleware, so x-client-id is the signed-in account.
 *
 * PUT  { device, skills: [{ name, version }] }   what one computer has now: names and versions
 *                                                 only. It replaces that device's last list.
 *                                                 What `mm usage skills`, the repo's hook (once
 *                                                 a day) and mm-use's report_local_skills send.
 * GET                                             each device's last list, newest first.
 */
export async function PUT(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const parsed = parseLocalSkills(await req.json().catch(() => null));
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  try {
    const doc = await usageDB.setLocalSkills(clientId, parsed.device, parsed.skills);
    return NextResponse.json({ device: doc.device, saved: doc.skills.length, reportedAt: doc.reportedAt });
  } catch (error) {
    console.error('[usage] Could not save local skills:', error);
    return NextResponse.json({ error: 'Could not save the skills' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const clientId = req.headers.get('x-client-id');
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  try {
    return NextResponse.json({ devices: await usageDB.localSkillsOf(clientId) });
  } catch (error) {
    console.error('[usage] Could not read local skills:', error);
    return NextResponse.json({ error: 'Could not read the skills' }, { status: 503 });
  }
}
