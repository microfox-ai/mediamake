/**
 * export: what MediaMake's Library page reads, <root>/.catalog/export/*.json
 * (mediamake.library-export/v1), rewritten after every change: a few small files instead of a walk
 * over the disk. Pictures are in <root>/.catalog/thumbs/ (paths in the export are relative to .catalog/):
 * <sha>.jpg per item, prod-<slug>.jpg per production, channel-<id>.png per channel.
 *
 *   meta.json         { schema, generatedAt, counts }
 *   channels.json     [{ id, name, folder, projectId?, logo?, productions }]
 *   productions.json  [{ slug, title, artist?, channel?, song?, status, skills, deliverFolder?, thumbnail?, updatedAt, uses, deliveries }]
 *   skills.json       [{ ...the repo's skills.json entry, runs, lastRun?, productions, bestOutput? }]
 *   media-<kind>.json [{ id, path, kind, subject?, title, tags, bytes, width?, height?, duration?, fps?, hasAudio?,
 *                        rating?, notes?, source?, lyrics?, preview?, related?, uses, thumb?, status, remote?, shared?, dupes? }]
 *   runs.json         [{ skill, session, at, production?, verdict? }]
 *
 * A song's preview is the song itself in thumbs/ (an APFS clone, no extra space; else a small m4a),
 * so the page can play it. A teammate's item (status remote) says whose channel it came from and
 * whether its file can be pulled; `shared` lists the channels whose team gets an item's file.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { REPO } from '../paths.ts';
import { KINDS, extraOf, type Item } from './db.ts';
import { absOf, type Lib } from './lib.ts';
import { importRuns, listProductions } from './production.ts';
import { cloneOnly, now, readJson, writeJson } from './sys.ts';

const COVER = /^(thumbnail|cover|poster)\.(jpe?g|png|webp)$/i;

/** A small copy of a picture in the thumbs folder (made again only when the source is newer). */
const thumbFrom = (src: string | undefined, dest: string) => {
  if (!src || !fs.existsSync(src)) return undefined;
  if (fs.existsSync(dest) && fs.statSync(dest).mtimeMs >= fs.statSync(src).mtimeMs) return dest;
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-frames:v', '1', '-vf', "scale='min(480,iw)':-2", '-q:v', '4', dest], { stdio: 'pipe', timeout: 60_000 });
    return dest;
  } catch {
    return undefined;
  }
};

/** A production's picture, best first: its delivered thumbnail or poster, then a cover in its folder. */
const productionPicture = (lib: Lib, slug: string, deliverFolder?: string) => {
  const delivered = deliverFolder ? path.join(lib.cfg.deliverRoot, deliverFolder) : undefined;
  const candidates = [
    delivered && path.join(delivered, 'youtube', 'thumbnails'),
    delivered && path.join(delivered, 'poster'),
    path.join(lib.out, 'youtube', slug, 'thumbnails'),
    path.join(lib.out, 'youtube', slug),
    path.join(lib.projects, slug),
    path.join(lib.projects, slug, 'input'),
  ].filter((d): d is string => !!d && fs.existsSync(d));
  for (const dir of candidates) {
    const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f) && !f.startsWith('.'));
    const pick = files.find(f => COVER.test(f)) ?? (dir.endsWith('thumbnails') || dir.endsWith('poster') ? files.sort()[0] : undefined);
    if (pick) return path.join(dir, pick);
  }
  return undefined;
};

/**
 * A song the page can play, in thumbs/ (made once). An mp3, m4a or ogg is cloned (no extra space);
 * anything else (a WAV master) becomes a 96 kbps m4a, a few a run so an export never stalls, and so a
 * clone never keeps a big master's space after cleanup moves it to a disk.
 */
const audioPreview = (lib: Lib, it: Item, budget: { encodes: number }) => {
  if (it.kind !== 'music' || it.status !== 'online' || it.ext === '.zip') return undefined;
  const src = absOf(lib, it.path);
  const small = /^\.(mp3|m4a|ogg)$/.test(it.ext);
  const dest = path.join(lib.thumbs, `${it.id}${small ? it.ext : '.m4a'}`);
  if (fs.existsSync(dest)) return dest;
  if (!fs.existsSync(src)) return undefined;
  if (small && cloneOnly(src, dest)) return dest;
  if (budget.encodes-- <= 0) return undefined;
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-vn', '-c:a', 'aac', '-b:a', '96k', dest], { stdio: 'pipe', timeout: 120_000 });
    return dest;
  } catch {
    fs.rmSync(dest, { force: true });
    return undefined;
  }
};

const channelLogo = (lib: Lib, id: string) => {
  const dir = path.join(lib.brands, id, 'logo');
  if (!fs.existsSync(dir)) return undefined;
  const png = fs.readdirSync(dir).filter(f => f.endsWith('.png'));
  return path.join(dir, png.find(f => /solid|mark/.test(f)) ?? png.sort()[0] ?? '');
};

type SkillEntry = { name: string; [k: string]: unknown };
type Drift = { skill: string; from: string; guessed?: boolean; own: unknown; upstream: unknown };

/** What each variant changed since its fork and what its base changed (skills.mjs diff), made again at most every 10 minutes. */
const driftOf = (dir: string) => {
  const cache = path.join(dir, '.drift.json');
  const kept = readJson<{ at: number; drift: Drift[] }>(cache);
  if (kept && Date.now() - kept.at < 10 * 60_000) return kept.drift;
  try {
    const out = execFileSync('node', [path.join(REPO, 'tools', 'skills.mjs'), 'diff', '--all', '--json'], { cwd: REPO, timeout: 20_000, stdio: ['ignore', 'pipe', 'ignore'] });
    const drift = JSON.parse(out.toString()) as Drift[];
    writeJson(cache, { at: Date.now(), drift });
    return drift;
  } catch {
    return kept?.drift ?? [];
  }
};

export const exportLibrary = (lib: Lib) => {
  const dir = path.join(lib.catalog, 'export');
  fs.mkdirSync(lib.thumbs, { recursive: true });
  const rel = (abs?: string) => (abs ? path.relative(lib.catalog, abs) : undefined);
  importRuns(lib);

  const uses = new Map<string, string[]>();
  for (const u of lib.db.prepare('SELECT item_id, production FROM uses').all() as { item_id: string; production: string }[])
    uses.set(u.item_id, [...new Set([...(uses.get(u.item_id) ?? []), u.production])]);
  const runs = lib.db.prepare('SELECT skill, session, at, production, verdict FROM runs ORDER BY at DESC LIMIT 2000').all() as {
    skill: string;
    session: string | null;
    at: string;
    production: string | null;
    verdict: string | null;
  }[];

  // ---- productions
  const deliveries = lib.db.prepare('SELECT production, what, path, at, status FROM deliveries ORDER BY at').all() as { production: string; what: string; path: string; at: string; status: string }[];
  const productions = listProductions(lib).map(p => {
    // a picture picked on the Library page wins; then its delivered thumbnail, poster or cover
    const picked = p.thumbnailItem ? path.join(lib.thumbs, `${p.thumbnailItem}.jpg`) : undefined;
    const source = picked && fs.existsSync(picked) ? picked : productionPicture(lib, p.slug, p.deliverFolder ?? (p.channel ? path.join(lib.cfg.channels[p.channel] ?? p.channel, p.slug) : undefined));
    const thumb = thumbFrom(source, path.join(lib.thumbs, `prod-${p.slug}.jpg`));
    const usesCount = Number(lib.db.prepare('SELECT COUNT(*) AS n FROM uses WHERE production = ?').get(p.slug)?.n ?? 0);
    const ran = [...new Set(runs.filter(r => r.production === p.slug).map(r => r.skill))];
    const st = fs.statSync(path.join(lib.projects, p.slug));
    return {
      slug: p.slug,
      title: p.title ?? p.slug,
      artist: p.artist,
      channel: p.channel,
      song: p.song,
      status: p.status ?? 'active',
      registered: p.registered,
      skills: [...new Set([...(p.skills ?? []), ...ran])],
      deliverFolder: p.deliverFolder,
      thumbnail: rel(thumb),
      updatedAt: new Date(st.mtimeMs).toISOString(),
      uses: usesCount,
      deliveries: deliveries.filter(d => d.production === p.slug).map(({ what, path: to, at, status }) => ({ what, path: to, at, status })),
    };
  });

  // ---- channels
  const channels = Object.entries(lib.cfg.channels).map(([id, folder]) => {
    const brand = readJson<{ name?: string }>(path.join(lib.brands, id, 'brand', 'brand.json')) ?? readJson<{ name?: string }>(path.join(lib.brands, id, 'brand.json'));
    const logo = channelLogo(lib, id);
    const thumb = logo && fs.existsSync(logo) ? thumbFrom(logo, path.join(lib.thumbs, `channel-${id}.png`)) : undefined;
    return { id, name: brand?.name ?? id, folder, projectId: lib.cfg.links[id], logo: rel(thumb), productions: productions.filter(p => p.channel === id).map(p => p.slug) };
  });

  // ---- skills: the repo's registry (tools/skills.mjs index) plus what the runs say
  const registry = readJson<{ skills?: SkillEntry[] }>(path.join(REPO, 'skills.json'))?.skills ?? [];
  const drift = new Map(driftOf(dir).map(d => [d.skill, d]));
  const skills = registry.map(s => {
    const mine = runs.filter(r => r.skill === s.name);
    const made = [...new Set([...mine.map(r => r.production).filter((x): x is string => !!x), ...productions.filter(p => p.skills.includes(s.name)).map(p => p.slug)])];
    // the best example: a delivered production it worked on, else any with a picture
    const best = productions.find(p => made.includes(p.slug) && p.deliveries.length && p.thumbnail) ?? productions.find(p => made.includes(p.slug) && p.thumbnail);
    const last = best?.deliveries[best.deliveries.length - 1];
    const d = drift.get(s.name);
    return {
      ...s,
      runs: mine.length,
      lastRun: mine[0]?.at,
      productions: made,
      bestOutput: best?.thumbnail ? { thumb: best.thumbnail, production: best.slug, what: last?.what, path: last?.path, at: last?.at } : undefined,
      drift: d ? { from: d.from, guessed: d.guessed, own: d.own, upstream: d.upstream } : undefined,
    };
  });

  // ---- media, one file per kind
  const counts: Record<string, number> = {};
  const budget = { encodes: 10 };
  for (const kind of [...KINDS, '_unsorted'] as const) {
    const items = lib.db.prepare('SELECT * FROM items WHERE kind = ? ORDER BY subject, path').all(kind) as Item[];
    counts[kind] = items.length;
    const rows = items.map(it => {
      const tags = (lib.db.prepare('SELECT tag FROM tags WHERE item_id = ?').all(it.id) as { tag: string }[]).map(r => r.tag);
      const row = lib.db.prepare('SELECT tool, ref, url, page_url AS pageUrl, title, author, query, prompt, model, extra FROM sources WHERE item_id = ? LIMIT 1').get(it.id) as
        | Record<string, string | null>
        | undefined;
      // a Suno take's styles are its prompt; what it leaves out and how it came about are in extra
      const extra = extraOf(row?.extra);
      const src = row && { ...row, extra: null, excludeStyles: extra.excludeStyles ?? null, instrumental: extra.instrumental ?? null, relation: extra.relation ?? null };
      const remote = it.status === 'remote' ? (lib.db.prepare('SELECT channel, url FROM remote WHERE item_id = ?').get(it.id) as { channel: string; url: string | null } | undefined) : undefined;
      const shared = (lib.db.prepare('SELECT channel, uploaded_at FROM shares WHERE item_id = ?').all(it.id) as { channel: string; uploaded_at: string | null }[]).map(r => ({ channel: r.channel, uploaded: !!r.uploaded_at }));
      const related = (lib.db.prepare('SELECT relation, parent_id AS id FROM relations WHERE item_id = ? AND parent_id IS NOT NULL').all(it.id) as { relation: string; id: string }[]).map(r => ({ ...r }));
      const preview = audioPreview(lib, it, budget);
      const guess = it.kind === '_unsorted' ? tags.find(t => t.startsWith('kind:'))?.slice(5) : undefined;
      const notes = (lib.db.prepare('SELECT text FROM notes WHERE item_id = ? ORDER BY at').all(it.id) as { text: string }[]).map(r => r.text);
      const dupes = (lib.db.prepare('SELECT path FROM locations WHERE item_id = ? AND path != ?').all(it.id, it.path) as { path: string }[]).map(r => absOf(lib, r.path));
      const thumb = path.join(lib.thumbs, `${it.id}.jpg`);
      return {
        id: it.id,
        path: it.path,
        kind: it.kind,
        subject: it.subject ?? undefined,
        title: it.title ?? path.basename(it.path),
        tags,
        bytes: it.bytes,
        width: it.width ?? undefined,
        height: it.height ?? undefined,
        duration: it.duration ?? undefined,
        fps: it.fps ?? undefined,
        hasAudio: it.has_audio === null ? undefined : !!it.has_audio,
        rating: it.rating ?? undefined,
        notes: notes.length ? notes : undefined,
        source: src ? Object.fromEntries(Object.entries(src).filter(([, v]) => v !== null)) : undefined,
        lyrics: it.lyrics ?? undefined,
        preview: preview ? rel(preview) : undefined,
        related: related.length ? related : undefined,
        uses: uses.get(it.id) ?? [],
        thumb: fs.existsSync(thumb) ? rel(thumb) : undefined,
        guess,
        status: it.status,
        role: it.role,
        remote: remote ? { channel: remote.channel, file: !!remote.url } : undefined,
        shared: shared.length ? shared : undefined,
        dupes: dupes.length ? dupes : undefined,
      };
    });
    writeJson(path.join(dir, `media-${kind === '_unsorted' ? 'unsorted' : kind}.json`), rows);
  }

  writeJson(path.join(dir, 'productions.json'), productions);
  writeJson(path.join(dir, 'channels.json'), channels);
  writeJson(path.join(dir, 'skills.json'), skills);
  writeJson(path.join(dir, 'runs.json'), runs.slice(0, 500));
  const items = Object.values(counts).reduce((a, b) => a + b, 0);
  writeJson(path.join(dir, 'meta.json'), {
    schema: 'mediamake.library-export/v1',
    generatedAt: now(),
    root: lib.root,
    counts: { items, byKind: counts, productions: productions.length, channels: channels.length, skills: skills.length },
  });
  return { dir, items, productions: productions.length };
};
