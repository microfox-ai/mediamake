import { NextRequest, NextResponse } from 'next/server';
import { applySave, askSentence, parseRef, parseSearch, type SaveAsk } from '@/lib/cloud-library';
import { librarySpaces } from '@/lib/cloud-library/access';
import { answer, caller, failed, keptBack, mayUseLibrary, placeOf, refuse, seen, spaceOf, through } from '@/lib/cloud-library/http';
import { shareDB } from '@/lib/cloud-library/share-store';
import { libraryDB, logUsage } from '@/lib/cloud-library/store';
import { getDatabase } from '@/lib/mongodb';

/**
 * A Library's entries.
 *
 * GET    ?space=<id>&ref=<collection>/<entry>   one entry in full: fields, files by slot, history, latest numbers.
 *        ?q=<words> [&space=<id>] [&collection=songs] [&where=use=released]… [&has=transcript] [&lacks=stems] [&limit=10]
 *                                               a search, answered with cards. Without a space it runs over every
 *                                               space the account can open.
 * POST   { space, collection, slug?, fields?, files?: [{ slot, sha256, name?, madeFrom? }], removeFiles?, rev?, agent?, dry? }
 *                                               saves an entry. No slug: a new one, named by its title. `dry: true`
 *                                               changes nothing and answers with what would change and the sentence
 *                                               to ask the person. Files are uploaded first (/api/library/files).
 * DELETE ?space=<id>&ref=<collection>/<entry>   to the trash.
 */
export async function GET(req: NextRequest) {
  const { clientId, usage } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const params = req.nextUrl.searchParams;
  try {
    if (params.has('ref')) {
      const ref = parseRef(params.get('ref'));
      if (!ref) return refuse('ref is <collection>/<entry>, e.g. songs/nakama');
      const at = await placeOf(clientId, params.get('space'), ref.collection, 'read');
      if ('response' in at) return at.response;
      return (await keptBack(at, ref.entry)) ?? answer(seen(at, await libraryDB.get(at.space, at.collection, ref.entry)));
    }
    const ask = parseSearch(params);
    if (params.has('space')) {
      const at = await spaceOf(clientId, params.get('space'), 'read');
      if ('response' in at) return at.response;
      await logUsage({ ...usage, space: at.space.id, collection: ask.collection, action: 'search' });
      return NextResponse.json(await libraryDB.search([at.space], ask, await shareDB.into([at.space])));
    }
    const locked = await mayUseLibrary(clientId);
    if (locked) return locked;
    const spaces = await librarySpaces(await getDatabase(), clientId);
    if (spaces[0]) await logUsage({ ...usage, space: spaces[0].id, collection: ask.collection, action: 'search' });
    return NextResponse.json(await libraryDB.search(spaces, ask, await shareDB.into(spaces)));
  } catch (error) {
    return failed('read the Library', error);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { clientId, usage } = caller(req, body);
  if (!clientId) return refuse('Sign in first', 401);
  try {
    const at = await placeOf(clientId, body?.space, body?.collection, 'write');
    if ('response' in at) return at.response;
    const collectionSlug = at.collection;
    const here = at.shared?.to.name ?? at.space.name;
    const ask = { slug: typeof body?.slug === 'string' ? body.slug.toLowerCase() : undefined, fields: body?.fields, files: Array.isArray(body?.files) ? body.files : [], removeFiles: Array.isArray(body?.removeFiles) ? body.removeFiles : [], rev: Number.isInteger(body?.rev) ? body.rev : undefined, agent: body?.agent === true };
    if (body?.dry === true) {
      const collection = await libraryDB.collection(at.space.id, collectionSlug);
      if (!collection) return refuse(`No collection ${collectionSlug} in the ${here} space`, 404);
      const current = ask.slug ? await libraryDB.entry(at.space.id, collectionSlug, ask.slug) : null;
      // a dry run names the files by what the caller says of them: nothing is uploaded yet
      const files: NonNullable<SaveAsk['files']> = ask.files.map((f: { slot?: string; sha256?: string; name?: string; size?: number }) => ({ slot: String(f.slot ?? 'other'), file: { sha256: String(f.sha256 ?? ''), name: String(f.name ?? 'file'), size: Number(f.size) || 0, type: 'other', contentType: '', addedAt: '', by: clientId } }));
      const result = applySave(collection, current, { ...ask, files }, clientId);
      if ('error' in result) return refuse(result.error, result.status);
      const fields = result.changes.filter(change => !change.what.startsWith('file:'));
      return NextResponse.json({
        dry: true,
        created: result.created,
        ref: `${at.shared?.as ?? collectionSlug}/${result.entry.slug}`,
        changes: result.changes,
        warnings: result.warnings,
        ask: askSentence({ noun: collection.template.noun, title: result.entry.title, collection: collection.name, space: at.shared ? `${at.space.name} (shared with ${here})` : here, created: result.created, uploads: files.map(f => ({ slot: f.slot, size: f.file.size })), fields: fields.map(change => (result.created ? change.what : `${change.what}: ${change.from ?? 'empty'} → ${change.to ?? 'empty'}`)) }),
      });
    }
    const saved = await libraryDB.save(at.space, collectionSlug, ask, clientId);
    if ('error' in saved) return answer(saved);
    if (saved.changed) await logUsage({ ...through(usage, at), space: at.space.id, collection: collectionSlug, action: 'save' });
    return NextResponse.json(seen(at, { ref: `${collectionSlug}/${saved.entry.slug}`, created: saved.created, changed: saved.changed, warnings: saved.warnings, entry: saved.entry }));
  } catch (error) {
    return failed('save to the Library', error);
  }
}

export async function DELETE(req: NextRequest) {
  const { clientId } = caller(req);
  if (!clientId) return refuse('Sign in first', 401);
  const ref = parseRef(req.nextUrl.searchParams.get('ref'));
  if (!ref) return refuse('ref is <collection>/<entry>');
  try {
    const at = await placeOf(clientId, req.nextUrl.searchParams.get('space'), ref.collection, 'write');
    return 'response' in at ? at.response : answer(await libraryDB.trash(at.space, at.collection, ref.entry, clientId));
  } catch (error) {
    return failed('move it to the trash', error);
  }
}
