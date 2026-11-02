import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { accessGrantsDB, accessGroupsDB, accessInvitesDB } from '@/lib/catalog/store';
import { NETWORK_GROUP, PRIVATE_GROUP } from '@/lib/catalog/types';

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
  // A person is in one tier: a private-tester invite moves them up out of the
  // community, and a community invite leaves a private tester where they are.
  if (invite.groupId === PRIVATE_GROUP) {
    await accessGroupsDB.addMembers(PRIVATE_GROUP, [viewer.clientId], 'Private testers');
    await accessGroupsDB.removeMembers(NETWORK_GROUP, [viewer.clientId]);
  } else if (invite.groupId === NETWORK_GROUP) {
    const groups = await accessGroupsDB.groupsOf(viewer.clientId);
    if (!groups.includes(PRIVATE_GROUP)) await accessGroupsDB.addMembers(NETWORK_GROUP, [viewer.clientId], 'Community');
  } else if (invite.groupId) {
    await accessGroupsDB.addMembers(invite.groupId, [viewer.clientId]);
  }

  return NextResponse.json({ success: true, itemIds: invite.itemIds, groupId: invite.groupId, expiresAt });
}
