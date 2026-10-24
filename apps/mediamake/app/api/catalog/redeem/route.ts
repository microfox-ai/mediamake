import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { accessGrantsDB, accessGroupsDB, accessInvitesDB } from '@/lib/catalog/store';

/**
 * POST /api/catalog/redeem  { code }
 * Redeems an invite for the signed-in caller: grants its items and/or adds
 * the caller to its group.
 */
export async function POST(req: NextRequest) {
  const viewer = await resolveViewer(req);
  if (!viewer.clientId) return NextResponse.json({ error: 'Sign in to redeem an invite' }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  if (!code?.trim()) return NextResponse.json({ error: 'code is required' }, { status: 400 });

  const result = await accessInvitesDB.claim(code.trim(), viewer.clientId);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 });

  const { invite } = result;
  const expiresAt = invite.grantDays
    ? new Date(Date.now() + invite.grantDays * 86_400_000).toISOString()
    : undefined;
  for (const itemId of invite.itemIds) {
    await accessGrantsDB.create({
      itemId,
      subject: { kind: 'client', id: viewer.clientId },
      grantedBy: invite.createdBy,
      expiresAt,
      inviteCode: invite.code,
      note: invite.note,
    });
  }
  if (invite.groupId) await accessGroupsDB.addMembers(invite.groupId, [viewer.clientId]);

  return NextResponse.json({ success: true, itemIds: invite.itemIds, groupId: invite.groupId, expiresAt });
}
