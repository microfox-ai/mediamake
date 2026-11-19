import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { resolveViewer } from '@/lib/access';
import { itemDetailsBare } from '@/lib/app-shell/details-data';
import { itemPagePath } from '@/lib/catalog/paths';
import { getCatalogRecord } from '@/lib/catalog/records';
import { inStore, parseProfileChange } from '@/lib/catalog/skill-profile';
import { catalogListingDB, skillProfilesDB } from '@/lib/catalog/store';

/**
 * A skill's details (lib/catalog/skill-profile): its tags, its nature (private use or shared use) and
 * its type, changed on its page by whoever may change the skill.
 *
 * GET  ?key=<details key>          { canEdit }: whether the caller may change them. A store skill's page
 *                                  is the same for everyone, so its Edit button asks here.
 * POST { key, tags?, nature?, type?, superset? }
 *                                  each one given replaces what was there; `type: null` clears it. An
 *                                  admin for a store skill (`catalog:skill/<name>`: its tags go on its
 *                                  listing, and it is always shared use); the owner or an editor of its
 *                                  space for a private one (`space:…`, `linked:…`).
 *
 * Who may is worked out as the item's page works it out (lib/app-shell/details `canEdit`), so a skill
 * the caller can't see answers like one that doesn't exist.
 */

const noStore = { headers: { 'Cache-Control': 'private, no-store' } };

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key') ?? '';
  const { clientId } = await resolveViewer(req);
  if (!clientId || !key) return NextResponse.json({ canEdit: false }, noStore);
  const details = await itemDetailsBare({ clientId }, key).catch(() => null);
  return NextResponse.json({ canEdit: details?.kind === 'skill' && !!details.canEdit }, noStore);
}

export async function POST(req: NextRequest) {
  const { clientId } = await resolveViewer(req);
  if (!clientId) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const change = parseProfileChange(await req.json().catch(() => null));
  if ('error' in change) return NextResponse.json({ error: change.error }, { status: 400 });
  try {
    const details = await itemDetailsBare({ clientId }, change.key);
    if (!details || details.kind !== 'skill') return NextResponse.json({ error: "That isn't a skill you can open" }, { status: 404 });
    if (!details.canEdit) return NextResponse.json({ error: 'Only an admin can change a store skill, and only its owner or an editor a private one' }, { status: 403 });

    const { tags, ...rest } = change;
    if (inStore(change.key)) {
      const id = change.key.slice('catalog:'.length);
      if (tags) {
        // a store skill's tags are its listing's; the ones that come with it are not stored again
        const [item, current] = await Promise.all([getCatalogRecord(id), catalogListingDB.get(id)]);
        await catalogListingDB.set(
          id,
          { tags: tags.filter(tag => !item?.tags?.includes(tag)), media: current?.media ?? [], description: current?.description, headshot: current?.headshot, icon: current?.icon, readme: current?.readme },
          clientId,
        );
      }
      if (rest.type !== undefined || rest.superset !== undefined) await skillProfilesDB.set({ key: change.key, type: rest.type, superset: rest.superset }, clientId);
      revalidatePath(itemPagePath(id));
      revalidatePath('/');
    } else {
      await skillProfilesDB.set(change, clientId);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[profile] Could not save a skill\'s details:', error);
    return NextResponse.json({ error: 'Could not save the details' }, { status: 503 });
  }
}
