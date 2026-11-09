/**
 * ingest: file media into the library. Inbox files (what tools downloaded into _INBOX/<tool>/) are
 * moved; any other file (one the user dropped somewhere, a project's input) is cloned and stays
 * where it is. Each file is hashed first: bytes the library already holds are not filed twice (an
 * inbox repeat goes to _INBOX/_duplicates/), and a better copy of a known source takes its place.
 *
 * Suno takes (_INBOX/suno/<channel>/<set>/) and a teammate's files (_INBOX/mediamake-sync/<channel>/)
 * are filed under the channel their folder names. A song's lyrics go beside it as <file>.lyrics.txt,
 * and what a take was made from (a cover's original, a song's stems) is linked (relations.ts).
 */
import fs from 'node:fs';
import path from 'node:path';
import { classify, destOf, mediaTypeOf, type Classification, type Hint, type Source } from './classify.ts';
import { channelNamed, channelOfFolder } from './config.ts';
import { getItem, KINDS, reindex, tx, type Kind } from './db.ts';
import { addLocation, addSource, addTags, provenance, relOf, setLyrics, upsertItem, type Lib } from './lib.ts';
import { probe, thumbnail } from './probe.ts';
import { linkRelations, stemsRef } from './relations.ts';
import { lyricsFile, pinterestSession, putEntry, readLyrics, sourceOf } from './sidecar.ts';
import { clone, freePath, move, now, sha256File } from './sys.ts';

export type Filed = { file: string; action: 'filed' | 'duplicate' | 'skipped' | 'known'; dest?: string; reason?: string; id?: string; c?: Classification };

/** Being written (a download in progress) or written a moment ago: its sidecar may not be there yet. */
const PARTIAL = /\.(crdownload|part|download|tmp)$|^\.|\.source\.json$|\.lyrics\.txt$|^_session\.json$/i;
/** Tools whose inbox folder names the channel first: _INBOX/suno/<channel>/<set>/… */
const BY_CHANNEL = new Set(['suno', 'mediamake-sync']);
const SETTLE_MS = 8_000;

/** Every file under a folder, depth first (the inbox, or a folder given on the command line). */
const filesUnder = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const abs = path.join(dir, e.name);
    if (e.name.startsWith('.') || e.name === '_duplicates') return [];
    return e.isDirectory() ? filesUnder(abs) : e.isFile() ? [abs] : [];
  });

/** What the folders around a file say about it: the inbox's tool and set, a channel folder in Downloads. */
const placeOf = (lib: Lib, abs: string) => {
  const rel = (dir: string) => path.relative(dir, path.dirname(abs)).split(path.sep).filter(Boolean);
  if (abs.startsWith(lib.cfg.inbox + path.sep)) {
    const [tool, ...segs] = rel(lib.cfg.inbox);
    const channel = BY_CHANNEL.has(tool) ? channelNamed(lib.cfg, segs[0]) : undefined;
    const sets = channel ? segs.slice(1) : segs;
    return { inbox: true, tool, channel, set: sets.length ? sets.join(' ') : undefined, context: [tool, ...segs].join(' ') };
  }
  if (abs.startsWith(lib.cfg.deliverRoot + path.sep)) {
    const segs = rel(lib.cfg.deliverRoot);
    return { inbox: false, channel: segs[0] ? channelOfFolder(lib.cfg, segs[0]) : undefined, context: segs.join(' ') };
  }
  return { inbox: false, context: path.dirname(abs).split(path.sep).slice(-3).join(' ') };
};

/** Where a teammate keeps it (relative to the library root), when that place is free here. */
const theirPlace = (lib: Lib, rel: string | undefined) => {
  if (!rel || path.isAbsolute(rel)) return undefined;
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  if (parts.length < 2 || parts.some(p => p === '..' || p.startsWith('.')) || ![...KINDS, '_unsorted'].includes(parts[0] as Kind)) return undefined;
  const abs = path.join(lib.root, ...parts);
  return fs.existsSync(abs) ? undefined : abs;
};

export type IngestOptions = { hint?: Hint; dryRun?: boolean; now?: boolean };

export const ingestFile = async (lib: Lib, abs: string, opts: IngestOptions = {}, sessions = new Map<string, Map<string, Source>>()): Promise<Filed> => {
  const name = path.basename(abs);
  if (PARTIAL.test(name)) return { file: abs, action: 'skipped', reason: 'not a finished file' };
  const type = mediaTypeOf(name);
  if (!type) return { file: abs, action: 'skipped', reason: 'not media' };
  const st = fs.statSync(abs);
  if (!opts.now && Date.now() - st.mtimeMs < SETTLE_MS) return { file: abs, action: 'skipped', reason: 'still arriving' };

  const place = placeOf(lib, abs);
  const dir = path.dirname(abs);
  if (!sessions.has(dir)) sessions.set(dir, pinterestSession(dir));
  const source = sourceOf(abs) ?? sessions.get(dir)!.get(name) ?? null;
  const id = await sha256File(abs);
  const known = getItem(lib.db, id);
  // a teammate's item (media sync pull) whose file has come: filed as new, where they keep it
  const remote = known?.status === 'remote' ? known : undefined;
  const shared = source?.library;
  const sources = (shared?.sources?.length ? shared.sources : source ? [source] : []).map(s => provenance(stemsRef(s, name)));

  if (known && !remote) {
    if (opts.dryRun) return { file: abs, action: 'duplicate', dest: known.path, id };
    tx(lib.db, () => {
      for (const s of sources) addSource(lib, id, s);
      if (!place.inbox) addLocation(lib, id, abs);
      if (sources.length) linkRelations(lib, id, name, sources);
      reindex(lib.db, id);
    });
    if (place.inbox) {
      const dup = freePath(path.join(lib.cfg.inbox, '_duplicates', now().slice(0, 10), name));
      await move(abs, dup);
      fs.rmSync(`${abs}.source.json`, { force: true });
      fs.rmSync(lyricsFile(abs), { force: true });
      return { file: abs, action: 'duplicate', dest: known.path, reason: `already in the library; moved to ${path.relative(lib.cfg.inbox, dup)}`, id };
    }
    return { file: abs, action: 'known', dest: known.path, id };
  }

  const p = type === 'video' || type === 'audio' || type === 'image' ? probe(abs, type === 'image') : null;
  const theirs = remote ?? (shared ? { kind: shared.kind as Kind, subject: shared.subject ?? null } : undefined);
  const hint: Hint = {
    ...opts.hint,
    channel: opts.hint?.channel ?? place.channel ?? channelNamed(lib.cfg, source?.channel),
    ...(theirs && { kind: opts.hint?.kind ?? theirs.kind, subject: opts.hint?.subject ?? theirs.subject ?? undefined, tags: [...(opts.hint?.tags ?? []), ...(shared?.tags ?? [])] }),
  };
  const c = classify({ file: abs, probe: p, source: source ?? (place.tool ? { tool: place.tool } : null), set: place.set, hint, context: place.context });
  if (!c.kind) return { file: abs, action: 'skipped', reason: c.reason, c };
  const dest = (theirs && theirPlace(lib, shared?.path)) || freePath(path.join(lib.root, destOf(c, place.set)));
  if (opts.dryRun) return { file: abs, action: 'filed', dest: relOf(lib, dest), id, c };

  if (place.inbox) await move(abs, dest);
  else clone(abs, dest);
  if (type !== 'font' && type !== '3d' && type !== 'archive') thumbnail(dest, type, p?.duration, path.join(lib.thumbs, `${id}.jpg`));

  if (!sources.length && c.tool) sources.push({ tool: c.tool, ref: c.ref, prompt: c.prompt, title: c.title });
  const lyrics = source?.lyrics?.trim() || readLyrics(abs) || shared?.lyrics?.trim() || undefined;
  if (lyrics) fs.writeFileSync(lyricsFile(dest), `${lyrics}\n`);
  // an unsorted item still says what it most likely is, so `find --kind` sees it
  const tags = c.guess ? [...c.tags, `kind:${c.guess}`] : c.tags;
  const notes = remote ? (lib.db.prepare('SELECT at, text, production FROM notes WHERE item_id = ? ORDER BY at').all(id) as { at: string; text: string; production: string | null }[]) : [];
  putEntry(path.dirname(dest), path.basename(dest), {
    sha256: id,
    kind: c.kind,
    subject: c.subject,
    title: c.title,
    tags,
    sources,
    lyrics,
    rating: remote?.rating ?? shared?.rating ?? undefined,
    notes: notes.length ? notes.map(n => ({ at: n.at, text: n.text, production: n.production ?? undefined })) : undefined,
    original: name !== path.basename(dest) ? name : undefined,
    addedAt: now(),
    confidence: c.confidence,
  });
  tx(lib.db, () => {
    upsertItem(lib, {
      id,
      path: relOf(lib, dest),
      kind: c.kind!,
      subject: c.subject,
      title: c.title,
      ext: path.extname(dest).toLowerCase(),
      bytes: st.size,
      width: p?.width ?? null,
      height: p?.height ?? null,
      duration: p?.duration ?? null,
      fps: p?.fps ?? null,
      has_audio: p ? Number(p.hasAudio) : null,
      codec: p?.codec ?? null,
      rating: shared?.rating ?? null,
      role: 'library',
      confidence: c.confidence,
    });
    addLocation(lib, id, dest);
    if (!place.inbox) addLocation(lib, id, abs);
    for (const s of sources) addSource(lib, id, s);
    addTags(lib, id, tags);
    setLyrics(lib, id, lyrics);
    linkRelations(lib, id, name, sources);
    lib.db.prepare('DELETE FROM remote WHERE item_id = ?').run(id);
    reindex(lib.db, id);
  });
  if (place.inbox) {
    fs.rmSync(`${abs}.source.json`, { force: true });
    fs.rmSync(lyricsFile(abs), { force: true });
  }
  return { file: abs, action: 'filed', dest: relOf(lib, dest), id, c };
};

/** Empty folders left in the inbox once their files are filed (the tool folders stay). */
const tidyInbox = (lib: Lib) => {
  const walk = (dir: string, depth: number) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && e.name !== '_duplicates') walk(path.join(dir, e.name), depth + 1);
    const left = fs.readdirSync(dir).filter(f => f !== '.DS_Store' && f !== '_session.json');
    if (depth >= 2 && !left.length) fs.rmSync(dir, { recursive: true, force: true });
  };
  if (fs.existsSync(lib.cfg.inbox)) walk(lib.cfg.inbox, 0);
};

export const ingest = async (lib: Lib, targets: string[], opts: IngestOptions = {}) => {
  const files = targets.flatMap(t => (fs.statSync(t).isDirectory() ? filesUnder(t) : [t]));
  const sessions = new Map<string, Map<string, Source>>();
  const done: Filed[] = [];
  for (const f of files) {
    try {
      done.push(await ingestFile(lib, f, opts, sessions));
    } catch (err) {
      done.push({ file: f, action: 'skipped', reason: err instanceof Error ? err.message : String(err) });
    }
  }
  if (!opts.dryRun && targets.some(t => t === lib.cfg.inbox || t.startsWith(lib.cfg.inbox + path.sep))) tidyInbox(lib);
  return done;
};
