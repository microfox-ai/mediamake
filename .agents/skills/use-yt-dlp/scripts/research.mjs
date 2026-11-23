#!/usr/bin/env node
/**
 * research.mjs: what videos are and how they did, without downloading them. Each video's details
 * (title, channel, date, length, views, likes, comments, licence, tags, chapters, description), its
 * score (views ÷ the median of its channel's videos here), and when asked its transcript (its captions)
 * and its top comments, without their authors' names. Written as a research folder Claude and the
 * user can read: index.md (a table, best first), index.json, and videos/<date>-<id>.md.
 *
 *   node research.mjs <video | @handle[/shorts] | channel or playlist link | ytsearchN:words>… [options]
 *
 *   --max=N                 how many of a channel, playlist or search (default 30)
 *   --since=<date>          uploaded on or after: 20261101, or now-30days (a channel stops at the
 *                           first older video)
 *   --match="<filter>"      yt-dlp's match filter: "view_count>100000 & duration>60"
 *   --transcripts[=langs]   captions as timed text: the video's own, else YouTube's automatic ones
 *                           (default en.*,en; hi.*,hi for Hindi and so on)
 *   --comments[=N]          its top N comments (default 50), text and likes only
 *   --ids=<file>            video links or ids, one a line (a list someone made)
 *   --name=<slug>           the folder's name (default from the first target)
 *   --out=<folder>          where (default <workspace>/research/yt-dlp/<name>/)
 *   --cookies-from-browser=<browser>  sign in as the user (only on their word, for their own account)
 *   -- <yt-dlp options>     anything else yt-dlp takes
 *
 * Details only: nothing is downloaded but the captions. It runs the same in a cloud session (where
 * YouTube may refuse it).
 */
import fs from 'node:fs';
import path from 'node:path';
import { die, needYtdlp, parse, slug, targetUrl, toolOf, usage, workspace, ytdlp } from './lib.mjs';

const { targets: given, flag, value, extra } = parse();
if (flag('help') || (!given.length && !value('ids'))) {
  console.log(usage(import.meta.url));
  process.exit(flag('help') ? 0 : 2);
}
needYtdlp();

const ids = value('ids') ? fs.readFileSync(value('ids'), 'utf8').split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('#')) : [];
const targets = [...given, ...ids].map(targetUrl);
const name = value('name') ?? slug(given[0] ?? path.basename(value('ids') ?? 'list', path.extname(value('ids') ?? '')));
const out = path.resolve(value('out') ?? path.join(workspace, 'research', 'yt-dlp', name));
const raw = path.join(out, '.raw');
fs.mkdirSync(path.join(out, 'videos'), { recursive: true });
fs.rmSync(raw, { recursive: true, force: true });
fs.mkdirSync(raw, { recursive: true });

const max = Number(value('max') ?? 30);
/** --since as YYYYMMDD: 20261101 as it is, now-30days (day, week, month, year) counted back from today. */
const since = (s => {
  if (!s) return undefined;
  if (/^\d{8}$/.test(s)) return s;
  const m = /^now-(\d+)(day|week|month|year)s?$/.exec(s);
  if (!m) die(`--since=${s}: a date (20261101) or now-<N>days, weeks, months or years`);
  const d = new Date();
  const k = +m[1];
  if (m[2] === 'day') d.setDate(d.getDate() - k);
  if (m[2] === 'week') d.setDate(d.getDate() - 7 * k);
  if (m[2] === 'month') d.setMonth(d.getMonth() - k);
  if (m[2] === 'year') d.setFullYear(d.getFullYear() - k);
  return d.toISOString().slice(0, 10).replace(/-/g, '');
})(value('since'));
const subs = flag('transcripts');
const comments = flag('comments') ? Number(value('comments') ?? 50) : 0;

// ── 1. one yt-dlp run a target: every video's .info.json (and captions) into .raw/
for (const t of targets) {
  const isList = !/[?&]v=|youtu\.be\/|\/shorts\/[\w-]{11}$/.test(t) || /^\w*search/.test(t);
  const channel = isList && !/^\w*search/.test(t) && !/[?&]list=/.test(t);
  const a = [
    '--skip-download',
    '--write-info-json',
    '--no-write-playlist-metafiles',
    '--ignore-errors',
    '--no-warnings',
    '--sleep-requests', '1',
    '-o', path.join(raw, '%(id)s.%(ext)s'),
    ...(isList ? ['-I', `:${max}`] : ['--no-playlist']),
    ...(since ? ['--dateafter', since, ...(channel ? ['--break-match-filters', `upload_date>=${since}`] : [])] : []),
    ...(value('match') ? ['--match-filters', value('match')] : []),
    ...(subs ? ['--write-subs', '--write-auto-subs', '--sub-langs', typeof subs === 'string' ? subs : 'en.*,en', '--sub-format', 'json3/vtt/best', '--sleep-subtitles', '1'] : []),
    ...(comments ? ['--write-comments', '--extractor-args', `youtube:comment_sort=top;max_comments=${comments},${comments},0,0`] : []),
    ...extra,
    t,
  ];
  console.error(`▸ ${t}`);
  const r = ytdlp(flag, a, { stdio: ['ignore', 'ignore', 'pipe'] });
  const errs = (r.stderr ?? '').split(/\r?\n/).filter(l => /^ERROR/.test(l));
  for (const e of errs.slice(0, 5)) console.error(`  ${e}`);
}

// ── 2. each video's record
const files = fs.readdirSync(raw);
const infos = files
  .filter(f => f.endsWith('.info.json'))
  .map(f => JSON.parse(fs.readFileSync(path.join(raw, f), 'utf8')))
  .filter(i => i._type !== 'playlist' && i.id);
if (!infos.length) die(`nothing came back${since ? ` uploaded since ${since}` : ''}: check the link, or try fewer filters.`);

const clock = s => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}`;
};

/** Captions as [m:ss] paragraphs about 30 s long, from json3 (or a VTT, its repeated lines dropped). */
const transcriptOf = info => {
  const id = info.id;
  const subFiles = files.filter(f => f.startsWith(`${id}.`) && /\.(json3|vtt)$/.test(f));
  const pick = subFiles.find(f => /\.en\.(json3|vtt)$/.test(f)) ?? subFiles.find(f => /\.en-orig\./.test(f)) ?? subFiles[0];
  if (!pick) return null;
  const lang = pick.slice(id.length + 1).replace(/\.(json3|vtt)$/, '');
  const cues = [];
  const text = fs.readFileSync(path.join(raw, pick), 'utf8');
  if (pick.endsWith('.json3')) {
    for (const e of JSON.parse(text).events ?? []) {
      const t = (e.segs ?? []).map(s => s.utf8 ?? '').join('').replace(/\s+/g, ' ').trim();
      if (t) cues.push({ at: (e.tStartMs ?? 0) / 1000, t });
    }
  } else {
    let at = 0;
    let last = '';
    for (const line of text.split(/\r?\n/)) {
      const m = /^(\d+):(\d\d):(\d\d)\.\d+ -->|^(\d\d):(\d\d)\.\d+ -->/.exec(line);
      if (m) at = m[1] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[4] * 60 + +m[5];
      else if (line.trim() && !/^(WEBVTT|Kind:|Language:|\d+$)/.test(line)) {
        const t = line.replace(/<[^>]+>/g, '').trim();
        if (t && t !== last) cues.push({ at, t });
        last = t;
      }
    }
  }
  const paras = [];
  for (const c of cues) {
    const p = paras.at(-1);
    if (!p || c.at - p.at >= 30) paras.push({ at: c.at, words: [c.t] });
    else if (p.words.at(-1) !== c.t) p.words.push(c.t);
  }
  // the video's own captions when it has them in that language, else YouTube's automatic ones
  return { lang, automatic: !(info.subtitles ?? {})[lang], text: paras.map(p => `[${clock(p.at)}] ${p.words.join(' ')}`).join('\n\n') };
};

const records = infos.map(i => ({
  id: i.id,
  site: toolOf(i.extractor_key, i.webpage_url_domain),
  url: i.webpage_url,
  title: i.title,
  channel: i.channel ?? i.uploader,
  channelUrl: i.channel_url ?? i.uploader_url,
  followers: i.channel_follower_count ?? null,
  date: i.upload_date ? `${i.upload_date.slice(0, 4)}-${i.upload_date.slice(4, 6)}-${i.upload_date.slice(6, 8)}` : null,
  duration: i.duration ?? null,
  views: i.view_count ?? null,
  likes: i.like_count ?? null,
  comments: i.comment_count ?? null,
  live: i.live_status ?? null,
  license: i.license ?? null,
  language: i.language ?? null,
  tags: i.tags ?? [],
  categories: i.categories ?? [],
  chapters: (i.chapters ?? []).map(c => ({ at: c.start_time, title: c.title })),
  description: i.description ?? '',
  captions: { own: Object.keys(i.subtitles ?? {}).filter(l => l !== 'live_chat'), automatic: Object.keys(i.automatic_captions ?? {}).filter(l => /-orig$/.test(l) || l === i.language).slice(0, 5) },
  transcript: subs ? transcriptOf(i) : undefined,
  // the top comments, never who wrote them: text, likes, and whether the channel itself wrote, pinned or hearted it
  topComments: comments
    ? (i.comments ?? [])
        .filter(c => !c.parent || c.parent === 'root')
        .sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0))
        .slice(0, comments)
        .map(c => ({ text: String(c.text ?? '').slice(0, 600), likes: c.like_count ?? 0, byCreator: !!c.author_is_uploader, pinned: !!c.is_pinned, hearted: !!c.is_favorited }))
    : undefined,
}));

// the score: views ÷ the median views of the same channel's videos here (three or more)
const byChannel = new Map();
for (const r of records) if (r.views != null) byChannel.set(r.channel, [...(byChannel.get(r.channel) ?? []), r.views]);
const median = a => {
  const s = [...a].sort((x, y) => x - y);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};
for (const r of records) {
  const v = byChannel.get(r.channel) ?? [];
  r.score = r.views != null && v.length >= 3 && median(v) > 0 ? Math.round((r.views / median(v)) * 100) / 100 : null;
}
records.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || String(b.date).localeCompare(String(a.date)));

// ── 3. the folder
const n = x => (x == null ? '–' : x >= 1e6 ? `${(x / 1e6).toFixed(x >= 1e7 ? 0 : 1)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(x >= 1e4 ? 0 : 1)}K` : String(x));
const cell = s => String(s ?? '').replace(/\|/g, '\\|').replace(/\s+/g, ' ');
const fileOf = r => `${r.date ?? 'undated'}-${r.id}.md`;
for (const r of records) {
  const lines = [
    `# ${r.title}`,
    '',
    `- ${r.url}`,
    `- ${r.channel ?? '?'}${r.followers ? ` (${n(r.followers)} followers)` : ''} · ${r.date ?? 'no date'} · ${r.duration != null ? clock(r.duration) : '?'}`,
    `- ${n(r.views)} views · ${n(r.likes)} likes · ${n(r.comments)} comments${r.score != null ? ` · ×${r.score} its channel's median here` : ''}`,
    ...(r.license ? [`- Licence: ${r.license}`] : []),
    ...(r.tags.length ? [`- Tags: ${r.tags.join(', ')}`] : []),
    ...(r.chapters.length ? ['', '## Chapters', '', ...r.chapters.map(c => `- ${clock(c.at)} ${c.title}`)] : []),
    '',
    '## Description',
    '',
    r.description.trim() || '(none)',
  ];
  if (subs)
    lines.push('', '## Transcript', '', r.transcript ? `(${r.transcript.lang}, ${r.transcript.automatic ? "YouTube's automatic captions" : "the video's own captions"})\n\n${r.transcript.text}` : `(no captions in ${typeof subs === 'string' ? subs : 'en'}; it has ${[...r.captions.own, ...r.captions.automatic].join(', ') || 'none'}: --transcripts=<lang>, or its sound through mm transcribe)`);
  if (comments)
    lines.push('', `## Top comments (${r.topComments.length}, authors left out)`, '', ...(r.topComments.length ? r.topComments.map(c => `- ${c.likes} likes${c.byCreator ? ', by the channel' : ''}${c.pinned ? ', pinned' : ''}${c.hearted ? ', hearted' : ''}: ${c.text.replace(/\s+/g, ' ')}`) : ['(none came back: comments may be off)']));
  fs.writeFileSync(path.join(out, 'videos', fileOf(r)), `${lines.join('\n')}\n`);
}
const table = [
  `# Research: ${name}`,
  '',
  `${records.length} videos from ${targets.length} source${targets.length === 1 ? '' : 's'}, ${new Date().toISOString().slice(0, 10)}. Score: views ÷ the median of the same channel's videos here.`,
  '',
  '| # | Date | Title | Channel | Views | Likes | Comments | Length | Score |',
  '|---|---|---|---|---|---|---|---|---|',
  ...records.map((r, k) => `| ${k + 1} | ${r.date ?? ''} | [${cell(r.title)}](videos/${fileOf(r)}) | ${cell(r.channel)} | ${n(r.views)} | ${n(r.likes)} | ${n(r.comments)} | ${r.duration != null ? clock(r.duration) : ''} | ${r.score != null ? `×${r.score}` : ''} |`),
];
fs.writeFileSync(path.join(out, 'index.md'), `${table.join('\n')}\n`);
fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ name, made: new Date().toISOString(), targets, records }, null, 1));
fs.rmSync(raw, { recursive: true, force: true });
console.log(`✔ ${records.length} videos${subs ? `, ${records.filter(r => r.transcript).length} with transcripts` : ''}${comments ? `, ${records.reduce((s, r) => s + r.topComments.length, 0)} comments` : ''} → ${out}`);
console.log(`  ${path.join(out, 'index.md')}`);
