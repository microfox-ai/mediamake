#!/usr/bin/env node
/**
 * youtube-grab — pull the titles, descriptions and transcripts of a whole channel,
 * a playlist, a search or a list of videos into one folder, in one run.
 *
 *   npm run yt-grab -w lyrics_videos -- @get-into-zone --out ~/Downloads/research/get-into-zone
 *   npm run yt-grab -w lyrics_videos -- --search "NEFFEX official lyric video" --limit 40 --out …
 *   npm run yt-grab -w lyrics_videos -- PLxxxxxxxx --no-transcripts
 *   npm run yt-grab -w lyrics_videos -- https://youtu.be/ocigp15wbgM S-Da_E6Qy1A
 *
 * Writes <out>/index.json (every video's metadata, also the resume cache), <out>/index.md
 * (a table) and <out>/videos/NN-<slug>.md (title, facts, description, transcript).
 *
 * Backends
 *   yt-dlp (no key): listing, descriptions, dates, views, captions. `brew install yt-dlp`.
 *   YouTube Data API v3 (optional, faster listing + exact metadata, 50 videos a call):
 *     key from --api-key, env YOUTUBE_API_KEY, or ~/.mediamake/config.json → youtube.apiKey.
 *     Captions still come through yt-dlp: the API only serves a video's own captions to
 *     its owner over OAuth.
 */
import { parseArgs } from 'node:util';
import { spawn } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';

type Video = {
  id: string;
  title: string;
  url: string;
  channel?: string;
  channelHandle?: string;
  publishedAt?: string;
  duration?: number;
  views?: number;
  likes?: number;
  tags?: string[];
  description?: string;
  transcript?: string;
  transcriptKind?: 'manual' | 'auto' | 'none';
  transcriptLang?: string;
  words?: number;
  file?: string;
  fetchedAt?: string;
};
type Source =
  | { kind: 'channel'; handle?: string; id?: string; url: string }
  | { kind: 'playlist'; id: string; url: string }
  | { kind: 'search'; query: string }
  | { kind: 'video'; id: string };

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    out: { type: 'string', short: 'o' },
    search: { type: 'string', short: 's' },
    limit: { type: 'string', short: 'n' },
    lang: { type: 'string', default: 'en' },
    timestamps: { type: 'boolean', default: false },
    'no-transcripts': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
    concurrency: { type: 'string', default: '4' },
    'api-key': { type: 'string' },
    'no-api': { type: 'boolean', default: false },
    popular: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h' },
  },
});

if (opts.help || (positionals.length === 0 && !opts.search)) {
  console.log(`youtube-grab — titles, descriptions and transcripts of many videos at once

usage: npm run yt-grab -w lyrics_videos -- <source…> [options]

sources   @handle | channel/playlist/video URL | PL… playlist id | 11-char video id
          --search "<query>"   (YouTube search, --limit results; default 25)
options   --out <dir>          where to write (default out/youtube-grab/<source>)
          --limit <n>          at most n videos from a channel, playlist or search
          --popular            most-viewed first (so --limit keeps a channel's hits, not its latest)
          --lang <code>        caption language (default en; falls back to the first available)
          --timestamps         prefix every transcript line with [m:ss]
          --no-transcripts     metadata and descriptions only (much faster)
          --force              refetch videos already in index.json
          --concurrency <n>    parallel yt-dlp calls (default 4)
          --api-key <key>      YouTube Data API v3 key (or env YOUTUBE_API_KEY / ~/.mediamake/config.json youtube.apiKey)
          --no-api             ignore any key, use yt-dlp for everything`);
  process.exit(0);
}

const limit = opts.limit ? Math.max(1, parseInt(opts.limit, 10)) : undefined;
const concurrency = Math.max(1, parseInt(opts.concurrency ?? '4', 10));
const wantTranscripts = !opts['no-transcripts'];
const lang = opts.lang ?? 'en';

// ---------- helpers ----------

const expandHome = (p: string) => (p.startsWith('~') ? path.join(homedir(), p.slice(1)) : p);

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => (out += d));
    child.stderr.on('data', (d) => (err += d));
    child.on('error', (e) => reject(new Error(`${cmd}: ${e.message}`)));
    child.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} ${args.slice(0, 3).join(' ')}… exited ${code}: ${err.trim().split('\n').slice(-3).join(' | ')}`));
    });
  });
}

async function haveYtdlp(): Promise<boolean> {
  try {
    await run('yt-dlp', ['--version']);
    return true;
  } catch {
    return false;
  }
}

async function withRetry<T>(what: string, fn: () => Promise<T>, tries = 3): Promise<T> {
  let last: Error | undefined;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e as Error;
      if (i < tries - 1) {
        const wait = 3000 * (i + 1);
        console.error(`   … ${what}: ${last.message.slice(0, 140)} — retry in ${wait / 1000}s`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
  }
  throw last;
}

async function loadApiKey(): Promise<string | undefined> {
  if (opts['no-api']) return undefined;
  if (opts['api-key']) return opts['api-key'];
  if (process.env.YOUTUBE_API_KEY) return process.env.YOUTUBE_API_KEY;
  try {
    const cfg = JSON.parse(await readFile(path.join(homedir(), '.mediamake', 'config.json'), 'utf8'));
    return cfg?.youtube?.apiKey || undefined;
  } catch {
    return undefined;
  }
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'video';

const fmtDuration = (s?: number) => {
  if (s == null) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`;
};
const fmtInt = (n?: number) => (n == null ? '' : n.toLocaleString('en-US'));

function isoDurationToSeconds(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  return (parseInt(m[1] ?? '0', 10) * 3600) + (parseInt(m[2] ?? '0', 10) * 60) + parseInt(m[3] ?? '0', 10);
}

async function mapLimit<T, R>(items: T[], n: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

// ---------- sources ----------

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function parseSource(arg: string): Source {
  const a = arg.trim();
  if (a.startsWith('@')) return { kind: 'channel', handle: a.slice(1), url: `https://www.youtube.com/${a}/videos` };
  if (VIDEO_ID.test(a)) return { kind: 'video', id: a };
  if (/^(PL|UU|OL|RD|FL)[A-Za-z0-9_-]+$/.test(a)) return { kind: 'playlist', id: a, url: `https://www.youtube.com/playlist?list=${a}` };
  let u: URL;
  try {
    u = new URL(a.includes('://') ? a : `https://${a}`);
  } catch {
    throw new Error(`Not a handle, id or URL: ${arg}`);
  }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') return { kind: 'video', id: u.pathname.slice(1, 12) };
  if (!/youtube\.com$/.test(host)) throw new Error(`Not a YouTube URL: ${arg}`);
  const v = u.searchParams.get('v');
  if (v && VIDEO_ID.test(v)) return { kind: 'video', id: v };
  const list = u.searchParams.get('list');
  if (u.pathname.startsWith('/playlist') && list) return { kind: 'playlist', id: list, url: `https://www.youtube.com/playlist?list=${list}` };
  const shorts = /^\/shorts\/([A-Za-z0-9_-]{11})/.exec(u.pathname);
  if (shorts) return { kind: 'video', id: shorts[1] };
  const handle = /^\/(@[^/]+)/.exec(u.pathname);
  if (handle) return { kind: 'channel', handle: handle[1].slice(1), url: `https://www.youtube.com/${handle[1]}/videos` };
  const chan = /^\/channel\/(UC[A-Za-z0-9_-]+)/.exec(u.pathname);
  if (chan) return { kind: 'channel', id: chan[1], url: `https://www.youtube.com/channel/${chan[1]}/videos` };
  throw new Error(`Can't tell what this YouTube URL is: ${arg}`);
}

// ---------- yt-dlp backend ----------

async function ytdlpJson(target: string, extra: string[] = []): Promise<any> {
  const out = await run('yt-dlp', ['--no-warnings', '--ignore-config', '-J', '--skip-download', ...extra, target]);
  return JSON.parse(out);
}

async function listViaYtdlp(src: Source): Promise<Video[]> {
  if (src.kind === 'video') return [{ id: src.id, title: '', url: `https://youtu.be/${src.id}` }];
  const target = src.kind === 'search' ? `ytsearch${limit ?? 25}:${src.query}` : src.url;
  const extra = ['--flat-playlist'];
  if (limit && src.kind !== 'search' && !opts.popular) extra.push('--playlist-end', String(limit));
  const data = await ytdlpJson(target, extra);
  const entries: any[] = data?.entries ?? (data?.id ? [data] : []);
  return entries
    .filter((e) => e && e.id && VIDEO_ID.test(e.id))
    .map((e) => ({
      id: e.id,
      title: e.title ?? '',
      url: `https://youtu.be/${e.id}`,
      duration: e.duration ?? undefined,
      views: e.view_count ?? undefined,
      channel: e.channel ?? e.uploader ?? undefined,
      channelHandle: e.uploader_id?.startsWith('@') ? e.uploader_id.slice(1) : undefined,
    }));
}

function parseJson3(text: string, timestamps: boolean): string {
  const data = JSON.parse(text);
  const lines: string[] = [];
  for (const ev of data.events ?? []) {
    if (!ev.segs) continue;
    const t = (ev.segs as any[]).map((s) => s.utf8 ?? '').join('').replace(/\s+/g, ' ').trim();
    if (!t || /^\[[^\]]*\]$/.test(t)) continue; // skip [music], [applause]…
    lines.push(timestamps ? `[${fmtDuration(Math.floor((ev.tStartMs ?? 0) / 1000))}] ${t}` : t);
  }
  return lines.join('\n');
}

function parseVtt(text: string, timestamps: boolean): string {
  const lines: string[] = [];
  let stamp = '';
  let last = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    const m = /^(\d+):(\d+):(\d+)\.\d+\s+-->/.exec(line) ?? /^(\d+):(\d+)\.\d+\s+-->/.exec(line);
    if (m) {
      const secs = m.length === 4 ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : (+m[1]) * 60 + (+m[2]);
      stamp = `[${fmtDuration(secs)}] `;
      continue;
    }
    if (!line || line === 'WEBVTT' || /^(Kind|Language|NOTE|STYLE)\b/.test(line) || /^\d+$/.test(line)) continue;
    const clean = line.replace(/<[^>]+>/g, '').trim();
    if (!clean || clean === last || /^\[[^\]]*\]$/.test(clean)) continue;
    last = clean;
    lines.push(timestamps ? stamp + clean : clean);
  }
  return lines.join('\n');
}

/** Let yt-dlp fetch the captions itself (it handles YouTube's tokens); manual first, then auto. */
async function downloadTranscript(id: string, info: any): Promise<{ text: string; kind: 'manual' | 'auto'; lang: string } | undefined> {
  const pickLang = (langs: string[]) =>
    langs.find((l) => l === lang) ?? langs.find((l) => l === `${lang}-orig`) ?? langs.find((l) => l.startsWith(`${lang}-`)) ?? langs[0];
  const candidates: Array<{ kind: 'manual' | 'auto'; lang: string }> = [];
  const manual = pickLang(Object.keys(info.subtitles ?? {}));
  const auto = pickLang(Object.keys(info.automatic_captions ?? {}));
  if (manual) candidates.push({ kind: 'manual', lang: manual });
  if (auto) candidates.push({ kind: 'auto', lang: auto });
  for (const c of candidates) {
    const dir = path.join(tmpdir(), 'youtube-grab', `${id}-${c.kind}`);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    try {
      await run('yt-dlp', [
        '--no-warnings', '--ignore-config', '--skip-download',
        c.kind === 'manual' ? '--write-subs' : '--write-auto-subs',
        '--sub-langs', c.lang, '--sub-format', 'json3/vtt/best',
        '-o', path.join(dir, '%(id)s.%(ext)s'),
        `https://www.youtube.com/watch?v=${id}`,
      ]);
      const files = (await readdir(dir)).filter((f) => /\.(json3|vtt|srv3|ttml)$/.test(f));
      const file = files.find((f) => f.endsWith('.json3')) ?? files.find((f) => f.endsWith('.vtt')) ?? files[0];
      if (!file) continue;
      const raw = await readFile(path.join(dir, file), 'utf8');
      if (/window\.WIZ_global_data|<html/i.test(raw.slice(0, 2000))) continue; // an error page, not captions
      const text = file.endsWith('.json3') ? parseJson3(raw, opts.timestamps ?? false) : parseVtt(raw, opts.timestamps ?? false);
      if (text.trim()) return { text, kind: c.kind, lang: c.lang };
    } catch (e) {
      console.error(`   … ${id} ${c.kind} captions (${c.lang}): ${(e as Error).message.slice(0, 120)}`);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
  return undefined;
}

async function detailsViaYtdlp(v: Video, wantTranscript: boolean): Promise<Video> {
  const info = await ytdlpJson(`https://www.youtube.com/watch?v=${v.id}`);
  const out: Video = {
    ...v,
    title: info.title ?? v.title,
    channel: info.channel ?? info.uploader ?? v.channel,
    channelHandle: info.uploader_id?.startsWith('@') ? info.uploader_id.slice(1) : v.channelHandle,
    publishedAt: info.upload_date ? `${info.upload_date.slice(0, 4)}-${info.upload_date.slice(4, 6)}-${info.upload_date.slice(6, 8)}` : v.publishedAt,
    duration: info.duration ?? v.duration,
    views: info.view_count ?? v.views,
    likes: info.like_count ?? v.likes,
    tags: Array.isArray(info.tags) ? info.tags : v.tags,
    description: info.description ?? v.description ?? '',
  };
  if (wantTranscript) {
    const got = await downloadTranscript(v.id, info);
    if (got) {
      out.transcript = got.text;
      out.transcriptKind = got.kind;
      out.transcriptLang = got.lang;
    } else {
      out.transcriptKind = 'none';
      out.transcript = '';
    }
  }
  out.words = out.transcript ? out.transcript.split(/\s+/).filter(Boolean).length : 0;
  return out;
}

// ---------- Data API backend (listing + metadata) ----------

const API = 'https://www.googleapis.com/youtube/v3';

async function api(key: string, endpoint: string, params: Record<string, string>): Promise<any> {
  const u = new URL(`${API}/${endpoint}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  u.searchParams.set('key', key);
  const res = await fetch(u);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Data API ${endpoint}: ${body?.error?.message ?? res.status}`);
  return body;
}

async function listViaApi(src: Source, key: string): Promise<Video[]> {
  if (src.kind === 'video') return [{ id: src.id, title: '', url: `https://youtu.be/${src.id}` }];
  let ids: string[] = [];
  if (src.kind === 'search') {
    let pageToken: string | undefined;
    const want = limit ?? 25;
    while (ids.length < want) {
      const page = await api(key, 'search', { part: 'id', type: 'video', q: src.query, maxResults: String(Math.min(50, want - ids.length)), ...(pageToken ? { pageToken } : {}) });
      ids.push(...(page.items ?? []).map((i: any) => i.id?.videoId).filter(Boolean));
      pageToken = page.nextPageToken;
      if (!pageToken) break;
    }
  } else {
    let playlistId: string;
    if (src.kind === 'playlist') playlistId = src.id;
    else {
      const ch = await api(key, 'channels', { part: 'contentDetails', ...(src.handle ? { forHandle: src.handle } : { id: src.id! }) });
      playlistId = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (!playlistId) throw new Error(`Channel not found: ${src.handle ?? src.id}`);
    }
    let pageToken: string | undefined;
    while (!limit || opts.popular || ids.length < limit) {
      const page = await api(key, 'playlistItems', { part: 'contentDetails', playlistId, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
      ids.push(...(page.items ?? []).map((i: any) => i.contentDetails?.videoId).filter(Boolean));
      pageToken = page.nextPageToken;
      if (!pageToken) break;
    }
  }
  if (limit && !opts.popular) ids = ids.slice(0, limit);
  return ids.map((id) => ({ id, title: '', url: `https://youtu.be/${id}` }));
}

async function metadataViaApi(videos: Video[], key: string): Promise<Map<string, Video>> {
  const byId = new Map<string, Video>();
  for (let i = 0; i < videos.length; i += 50) {
    const chunk = videos.slice(i, i + 50);
    const page = await api(key, 'videos', { part: 'snippet,contentDetails,statistics', id: chunk.map((v) => v.id).join(','), maxResults: '50' });
    for (const item of page.items ?? []) {
      const s = item.snippet ?? {};
      byId.set(item.id, {
        id: item.id,
        url: `https://youtu.be/${item.id}`,
        title: s.title ?? '',
        channel: s.channelTitle,
        publishedAt: s.publishedAt?.slice(0, 10),
        duration: item.contentDetails?.duration ? isoDurationToSeconds(item.contentDetails.duration) : undefined,
        views: item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : undefined,
        likes: item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : undefined,
        tags: s.tags,
        description: s.description ?? '',
      });
    }
  }
  return byId;
}

// ---------- output ----------

function videoMarkdown(v: Video, n: number): string {
  const facts = [
    `- URL: ${v.url}`,
    v.channel ? `- Channel: ${v.channel}${v.channelHandle ? ` (@${v.channelHandle})` : ''}` : '',
    v.publishedAt ? `- Published: ${v.publishedAt}` : '',
    `- Length: ${fmtDuration(v.duration) || '?'}${v.views != null ? ` · Views: ${fmtInt(v.views)}` : ''}${v.likes != null ? ` · Likes: ${fmtInt(v.likes)}` : ''}`,
    v.tags?.length ? `- Tags: ${v.tags.join(', ')}` : '',
    wantTranscripts
      ? `- Transcript: ${v.transcriptKind === 'manual' ? `manual captions (${v.transcriptLang})` : v.transcriptKind === 'auto' ? `auto captions (${v.transcriptLang})` : 'none'}${v.words ? ` · ${fmtInt(v.words)} words` : ''}`
      : '',
  ].filter(Boolean);
  const parts = [`# ${n}. ${v.title}`, '', ...facts, '', '## Description', '', (v.description ?? '').trim() || '_(empty)_'];
  if (wantTranscripts) parts.push('', '## Transcript', '', v.transcript?.trim() || '_(no captions)_');
  return parts.join('\n') + '\n';
}

function indexMarkdown(label: string, videos: Video[]): string {
  const rows = videos.map((v, i) =>
    `| ${i + 1} | [${v.title.replace(/\|/g, '\\|')}](${v.file}) | ${v.publishedAt ?? ''} | ${fmtDuration(v.duration)} | ${fmtInt(v.views)} | ${wantTranscripts ? (v.transcriptKind === 'none' ? '—' : `${v.transcriptKind} · ${fmtInt(v.words)} w`) : ''} | ${v.url} |`,
  );
  return [
    `# ${label}`,
    '',
    `${videos.length} videos · grabbed ${new Date().toISOString().slice(0, 10)} · descriptions${wantTranscripts ? ' + transcripts' : ''} in videos/`,
    '',
    '| # | Title | Published | Length | Views | Transcript | URL |',
    '|---|---|---|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
}

// ---------- main ----------

async function main() {
  const sources: Source[] = positionals.map(parseSource);
  if (opts.search) sources.push({ kind: 'search', query: opts.search });

  if (!(await haveYtdlp())) {
    console.error('yt-dlp is not installed. Install it with:  brew install yt-dlp');
    process.exit(2);
  }
  const key = await loadApiKey();

  const first = sources[0];
  const label =
    first.kind === 'channel' ? `@${first.handle ?? first.id}` : first.kind === 'playlist' ? `playlist ${first.id}` : first.kind === 'search' ? `search: ${first.query}` : `${sources.length} video${sources.length === 1 ? '' : 's'}`;
  const outDir = path.resolve(expandHome(opts.out ?? path.join('out', 'youtube-grab', slugify(label))));
  const videosDir = path.join(outDir, 'videos');
  await mkdir(videosDir, { recursive: true });

  // cache
  const indexPath = path.join(outDir, 'index.json');
  const cache = new Map<string, Video>();
  if (!opts.force && existsSync(indexPath)) {
    try {
      for (const v of JSON.parse(await readFile(indexPath, 'utf8')) as Video[]) cache.set(v.id, v);
    } catch {
      /* ignore a broken cache */
    }
  }

  // 1. list
  console.error(`▸ ${label}${key ? '  (Data API for listing + metadata, yt-dlp for captions)' : '  (yt-dlp)'}`);
  const listed: Video[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    const vids = await withRetry(`listing ${src.kind}`, () => (key ? listViaApi(src, key) : listViaYtdlp(src)));
    for (const v of vids) if (!seen.has(v.id)) (seen.add(v.id), listed.push(v));
  }
  // 2. metadata via API (one call per 50) when a key is there
  if (key) {
    const meta = await metadataViaApi(listed, key);
    for (const v of listed) Object.assign(v, meta.get(v.id) ?? {});
  }
  if (opts.popular) listed.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
  const videos = limit ? listed.slice(0, limit) : listed;
  console.error(`▸ ${videos.length} videos${opts.popular ? ', most viewed first' : ''}`);

  // 3. details (+ captions) via yt-dlp, with resume
  let done = 0;
  const results = await mapLimit(videos, concurrency, async (v) => {
    const cached = cache.get(v.id);
    const cacheOk = cached && cached.description != null && (!wantTranscripts || cached.transcriptKind != null);
    let full: Video;
    if (cacheOk) {
      full = { ...cached, ...(key ? v : {}), transcript: cached.transcript, transcriptKind: cached.transcriptKind, transcriptLang: cached.transcriptLang, words: cached.words };
    } else if (key && !wantTranscripts) {
      full = { ...v, words: 0 };
    } else {
      try {
        full = await withRetry(v.id, () => detailsViaYtdlp(v, wantTranscripts));
        if (key) Object.assign(full, { title: v.title || full.title, publishedAt: v.publishedAt ?? full.publishedAt, description: v.description ?? full.description, tags: v.tags ?? full.tags });
      } catch (e) {
        console.error(`   ! ${v.id} ${(e as Error).message}`);
        full = { ...v, description: v.description ?? '', transcriptKind: wantTranscripts ? 'none' : undefined, words: 0 };
      }
    }
    full.fetchedAt = cacheOk ? cached!.fetchedAt : new Date().toISOString();
    done++;
    console.error(`  [${String(done).padStart(String(videos.length).length)}/${videos.length}] ${cacheOk ? '· ' : '✓ '}${full.title.slice(0, 70)}${wantTranscripts ? (full.transcriptKind === 'none' ? '  (no captions)' : `  (${fmtInt(full.words)} w)`) : ''}`);
    return full;
  });

  // 4. write
  results.forEach((v, i) => {
    v.file = `videos/${String(i + 1).padStart(2, '0')}-${slugify(v.title || v.id)}.md`;
  });
  await Promise.all(results.map((v, i) => writeFile(path.join(outDir, v.file!), videoMarkdown(v, i + 1))));
  await writeFile(indexPath, JSON.stringify(results, null, 2));
  await writeFile(path.join(outDir, 'index.md'), indexMarkdown(label, results));

  const withT = results.filter((v) => v.transcriptKind && v.transcriptKind !== 'none').length;
  console.error(`▸ wrote ${results.length} videos${wantTranscripts ? `, ${withT} with transcripts` : ''} → ${outDir}`);
  console.log(outDir);
}

main().catch((e) => {
  console.error(`youtube-grab: ${e.message}`);
  process.exit(1);
});
