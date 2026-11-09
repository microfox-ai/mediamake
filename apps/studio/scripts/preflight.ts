/**
 * preflight: machine checks on a render before the user watches it, so the user is never the one
 * who finds a black frame (revise-video › Preflight before the link). Run it after every render the user will
 * review, fix or answer what it finds, then give the review link it prints.
 *
 * Usage: mm preflight <slug> [--video=out/<slug>/<slug>.mp4] [--source=<picture or clip>]
 *          [--freeze=1] [--strict] [--json]
 *        mm preflight <slug> [--video=…] --intended=c02[,c05] --why="opens on black by design"
 *
 *   --video     another render (relative to apps/studio, or absolute): a short, a clip, a kept v<N>/ cut
 *   --source    the user's picture or footage the video is built on: flags a render darker or duller than it
 *   --freeze    seconds of still picture before it counts as frozen (default 1)
 *   --strict    exit 1 while machine notes are open (for scripts)
 *   --json      print the result as JSON instead
 *
 * Checks (one ffmpeg pass over the picture, one over the sound, one short pass per map section):
 *   black       black frames of any length (98% of the picture within 3% of video black, so a dark navy or
 *               charcoal design is not black): a whip or a cut that drops a frame shows here
 *   freeze      the picture standing still (a clip that stopped playing)
 *   no-audio    no sound track; audio-short / audio-long: sound that ends before, or runs past, the picture
 *   silence     the sound dropping out for 1 s or more (2 s at the very start or end)
 *   clipping    a true peak above +1 dBTP in a section (a mastered song sits just under 0)
 *   quiet       a master below -20 LUFS (YouTube plays at -14 and does not turn quiet videos up)
 *   darker      with --source: the render 15% or more darker than the source; duller: 15% less saturated
 * A fade from or to black of up to 1 s at either end, and a still end card of up to 2 s, are printed but not
 * noted. Loudness per section is printed for reference only: songs change level on purpose.
 *
 * Findings become machine notes ("Preflight · black: …") that open the video's next revision
 * (<video>.revisions/rev-NNN.json and .md, the Revisions screen's own files), so the user sees what
 * was caught and writes their own notes in the same revision. A rerun updates that revision while
 * it holds only machine notes: what is gone is closed, what is still there stays (or is reopened),
 * what is new is added, and the revision is pinned to the new render. A note the user ticked off in
 * the screen stays closed. A clean render writes nothing.
 *
 * An intended effect (a black beat, an impact freeze): --intended=<comment id> --why="…" closes the
 * note with that reply and lists the effect in <video>.revisions/preflight.json, so later runs on
 * this video skip it. A bare c02 is the latest revision's; rev-002/c02 names the revision.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ffmpegLog, probeMedia } from './ff.ts';
import { lastRender } from './render-log.ts';
import {
  REVISION_SCHEMA,
  baseName,
  commentLine,
  formatTime,
  isMachineNote,
  nextCommentId,
  nextRevisionId,
  readRevisions,
  reviewLink,
  revisionNumber,
  revisionsDirFor,
  videoInfo,
  writeRevision,
  type RangeComment,
  type Revision,
  type RevisionComment,
} from './revision-files.ts';

import { DIRS, fromStudio, shown } from './paths.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type Check = 'black' | 'freeze' | 'no-audio' | 'audio-short' | 'audio-long' | 'silence' | 'clipping' | 'quiet' | 'darker' | 'duller';
type Finding = {
  check: Check;
  from: number;
  to: number;
  /** about the whole video, not a stretch of it */
  whole?: boolean;
  text: string;
  /** false: printed for reference, not written as a machine note */
  note: boolean;
};
type Intended = { check: string; from: number; to: number; why: string; comment?: string; at: string };
type Section = { id: string; label: string; from: number; to: number };
type Shot = { id: string; from: number; to: number };

const BLACK_EDGE_OK = 1;
const STILL_END_OK = 2;
const MAX_NOTES_PER_CHECK = 8;

const args = process.argv.slice(2);
const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => args.includes(`--${name}`) || opt(name) !== undefined;
const [slug] = args.filter(a => !a.startsWith('--'));
const round3 = (n: number) => Math.round(n * 1000) / 1000;
const secs = (n: number) => `${n < 10 ? n.toFixed(2) : n.toFixed(1)} s`;
const db = (n: number | null) => (n === null ? '–' : `${n > 0 ? '+' : ''}${n.toFixed(1)}`);
const overlaps = (a: { from: number; to: number }, b: { from: number; to: number }) => Math.min(a.to, b.to) - Math.max(a.from, b.from) > -0.05;

if (!slug && !opt('video')) {
  console.error('Usage: mm preflight <slug> [--video=path.mp4] [--source=picture] [--intended=c02 --why="…"]');
  process.exit(1);
}
// out/… means the workspace's out folder (as render prints it), wherever that is
const video = opt('video') ? fromStudio(opt('video')!) : path.join(DIRS.out, slug!, `${slug}.mp4`);
if (!fs.existsSync(video)) {
  console.error(`No video at ${shown(video)}. Render first, or pass --video=<path>.`);
  process.exit(1);
}
const revDir = revisionsDirFor(video);
const intendedFile = path.join(revDir, 'preflight.json');
const readIntended = (): Intended[] => {
  try {
    const raw = JSON.parse(fs.readFileSync(intendedFile, 'utf8')) as { intended?: Intended[] };
    return Array.isArray(raw.intended) ? raw.intended : [];
  } catch {
    return [];
  }
};
const now = new Date().toISOString();

// ------------------------------------------------------------------ --intended: answer machine notes

if (has('intended')) {
  const ids = (opt('intended') ?? '').split(',').map(s => s.trim()).filter(Boolean);
  const why = opt('why')?.trim();
  if (!ids.length || !why) {
    console.error('Name the notes and say why: --intended=c02,c05 --why="the hook opens on a black beat by design"');
    process.exit(1);
  }
  const revisions = readRevisions(revDir);
  const intended = readIntended();
  const changed = new Set<Revision>();
  for (const ref of ids) {
    // c02 is the latest revision's c02 that is a machine note; rev-002/c02 names the revision
    const [revId, id] = ref.includes('/') ? ref.split('/') : [undefined, ref];
    const revision = [...revisions].reverse().find(r => (!revId || r.id === revId) && r.comments.some(c => c.id === id && isMachineNote(c)));
    const comment = revision?.comments.find(c => c.id === id && isMachineNote(c));
    if (!revision || !comment || comment.kind !== 'range') {
      console.error(`No machine note ${ref} in ${shown(revDir)}/.`);
      process.exitCode = 1;
      continue;
    }
    comment.status = 'done';
    comment.reply = `Intended: ${why}`;
    comment.updatedAt = now;
    revision.updatedAt = now;
    changed.add(revision);
    intended.push({ check: comment.check ?? 'unknown', from: comment.from, to: comment.to, why, comment: `${revision.id}/${comment.id}`, at: now });
    console.log(`✔ ${revision.id}/${comment.id} closed as intended; later runs on this video skip it.`);
  }
  for (const revision of changed) writeRevision(revDir, revision);
  if (changed.size) {
    fs.mkdirSync(revDir, { recursive: true });
    fs.writeFileSync(intendedFile, `${JSON.stringify({ schema: 'lyrics_videos.preflight/v1', intended }, null, 2)}\n`);
  }
  process.exit();
}

// ------------------------------------------------------------------ the checks

const info = probeMedia(video);
if (!info.video) {
  console.error(`${shown(video)} has no picture.`);
  process.exit(1);
}
const { fps, width, height } = info.video;
const duration = info.video.duration || info.duration;
const frame = 1 / fps;

function readMap(): { file: string | null; sections: Section[]; shots: Shot[] } {
  const name = path.basename(video);
  for (const candidate of [`${baseName(name)}.map.json`, `${name}.map.json`, 'map.json']) {
    const file = path.join(path.dirname(video), candidate);
    if (!fs.existsSync(file)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
      const valid = <T extends { from: number; to: number }>(items: unknown): T[] =>
        Array.isArray(items) ? (items as T[]).filter(it => it && typeof it.from === 'number' && typeof it.to === 'number' && it.to > it.from) : [];
      return {
        file: candidate,
        sections: Array.isArray(raw) ? [] : valid<Section>(raw.sections).map(s => ({ ...s, label: s.label ?? s.id })),
        shots: valid<Shot>(Array.isArray(raw) ? raw : raw.shots),
      };
    } catch {
      // a broken map: check without it
    }
  }
  return { file: null, sections: [], shots: [] };
}
const map = readMap();

function pictureChecks(): Finding[] {
  const freezeMin = Number(opt('freeze') ?? 1);
  // black means black: a pixel counts below 3% above video black, so a dark design (navy, charcoal) is not flagged
  const log = ffmpegLog(['-i', video, '-map', '0:v:0', '-vf', `blackdetect=d=0:pix_th=0.03,freezedetect=n=-60dB:d=${freezeMin}`, '-f', 'null', '-']);
  const blacks = [...log.matchAll(/black_start:\s*([\d.]+)\s+black_end:\s*([\d.]+)/g)].map(m => ({ from: Number(m[1]), to: Number(m[2]) }));
  // freezedetect logs a start, then a duration and an end; a freeze that runs to the last frame has no end
  const freezes: { from: number; to: number }[] = [];
  let start: number | null = null;
  for (const m of log.matchAll(/freezedetect\.freeze_(start|end):\s*([\d.]+)/g)) {
    if (m[1] === 'start') start = Number(m[2]);
    else if (start !== null) {
      freezes.push({ from: start, to: Number(m[2]) });
      start = null;
    }
  }
  if (start !== null) freezes.push({ from: start, to: duration });

  const findings: Finding[] = [];
  for (const b of blacks) {
    const len = b.to - b.from;
    const frames = Math.max(1, Math.round(len * fps));
    const atStart = b.from < frame / 2;
    // at the end of the file blackdetect closes on the last frame's start, a frame before the end
    const atEnd = b.to >= duration - frame * 1.5;
    if (atStart && atEnd) findings.push({ check: 'black', from: 0, to: duration, whole: true, note: true, text: 'the whole video is black.' });
    else if (atStart) findings.push({ check: 'black', ...b, note: len > BLACK_EDGE_OK, text: `opens on black for ${secs(len)}.` });
    else if (atEnd) findings.push({ check: 'black', ...b, note: len > BLACK_EDGE_OK, text: `ends on black for ${secs(len)}.` });
    else if (frames <= 3)
      findings.push({ check: 'black', ...b, note: true, text: `${frames} black frame${frames === 1 ? '' : 's'} at ${formatTime(b.from)}: a dropped frame at a cut?` });
    else findings.push({ check: 'black', ...b, note: true, text: `black for ${secs(len)} from ${formatTime(b.from)}.` });
  }
  for (const f of freezes) {
    const len = f.to - f.from;
    // a black stretch is a still one too: say it once, as black
    const black = blacks.reduce((sum, b) => sum + Math.max(0, Math.min(f.to, b.to) - Math.max(f.from, b.from)), 0);
    if (black >= 0.8 * len) continue;
    if (f.to >= duration - frame) findings.push({ check: 'freeze', ...f, note: len > STILL_END_OK, text: `the picture stands still for the last ${secs(len)}.` });
    else findings.push({ check: 'freeze', ...f, note: true, text: `the picture is frozen for ${secs(len)} from ${formatTime(f.from)}: a clip that stopped, or a hold?` });
  }
  return findings;
}

type Loudness = { integrated: number | null; range: number | null; peak: number | null };
function parseLoudness(log: string): Loudness {
  const summary = log.slice(log.lastIndexOf('Summary:'));
  const value = (re: RegExp) => {
    const m = re.exec(summary);
    const n = m ? Number(m[1]) : NaN;
    return Number.isFinite(n) ? n : null;
  };
  return {
    integrated: value(/I:\s+(-?[\d.]+|-inf)\s+LUFS/),
    range: value(/LRA:\s+(-?[\d.]+|-inf)\s+LU/),
    peak: value(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/),
  };
}

type SectionLoudness = Section & Loudness;
function soundChecks(): { findings: Finding[]; loudness: Loudness | null; sections: SectionLoudness[] } {
  const findings: Finding[] = [];
  if (!info.audio) {
    findings.push({ check: 'no-audio', from: 0, to: duration, whole: true, note: true, text: 'no sound track.' });
    return { findings, loudness: null, sections: [] };
  }
  const audioEnd = info.audio.duration;
  const gap = audioEnd - duration;
  if (gap < -0.25)
    findings.push({ check: 'audio-short', from: audioEnd, to: duration, note: true, text: `the sound ends ${secs(-gap)} before the picture.` });
  if (gap > 0.25) findings.push({ check: 'audio-long', from: 0, to: duration, whole: true, note: true, text: `the sound runs ${secs(gap)} past the picture.` });

  const log = ffmpegLog(['-i', video, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet,silencedetect=n=-50dB:d=1', '-f', 'null', '-']);
  const loudness = parseLoudness(log);
  const silences: { from: number; to: number }[] = [];
  let start: number | null = null;
  for (const m of log.matchAll(/silence_(start|end):\s*(-?[\d.]+)/g)) {
    if (m[1] === 'start') start = Math.max(0, Number(m[2]));
    else if (start !== null) {
      silences.push({ from: start, to: Number(m[2]) });
      start = null;
    }
  }
  if (start !== null) silences.push({ from: start, to: audioEnd });
  for (const s of silences) {
    const len = s.to - s.from;
    const atStart = s.from < 0.05;
    const atEnd = s.to >= audioEnd - 0.05;
    if (len >= 0.9 * audioEnd) findings.push({ check: 'silence', from: 0, to: duration, whole: true, note: true, text: 'the sound track is silent.' });
    else if ((atStart || atEnd) && len < 2) continue;
    else if (atStart) findings.push({ check: 'silence', ...s, note: true, text: `silent for the first ${secs(len)}.` });
    else if (atEnd) findings.push({ check: 'silence', ...s, note: true, text: `silent for the last ${secs(len)}.` });
    else findings.push({ check: 'silence', ...s, note: true, text: `the sound drops out for ${secs(len)} from ${formatTime(s.from)}.` });
  }
  const silent = findings.some(f => f.check === 'silence' && f.whole);
  if (!silent && loudness.integrated !== null && loudness.integrated < -20)
    findings.push({
      check: 'quiet',
      from: 0,
      to: duration,
      whole: true,
      note: true,
      text: `a quiet master: ${loudness.integrated.toFixed(1)} LUFS (YouTube plays at -14 and does not turn quiet videos up).`,
    });

  // per section: the loudness table, and where a peak may distort
  const sections: SectionLoudness[] = [];
  for (const s of map.sections) {
    if (s.to - s.from < 1 || s.from >= audioEnd) continue;
    const part = parseLoudness(
      ffmpegLog(['-ss', s.from.toFixed(3), '-t', (Math.min(s.to, audioEnd) - s.from).toFixed(3), '-i', video, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']),
    );
    sections.push({ ...s, ...part });
    if (part.peak !== null && part.peak > 1)
      findings.push({ check: 'clipping', from: s.from, to: s.to, note: true, text: `true peak ${db(part.peak)} dBTP in ${s.label}: it may distort (a mastered song stays under 0).` });
  }
  if (!map.sections.length && loudness.peak !== null && loudness.peak > 1)
    findings.push({ check: 'clipping', from: 0, to: duration, whole: true, note: true, text: `true peak ${db(loudness.peak)} dBTP: it may distort (a mastered song stays under 0).` });
  return { findings, loudness, sections };
}

/** mean luma (0 black … 1 white) and saturation, from one frame per second at 480 px, limited range */
function pictureStats(file: string): { luma: number; saturation: number } {
  const still = /\.(jpe?g|png|webp|avif|bmp|tiff?)$/i.test(file);
  const vf = `${still ? '' : 'fps=1,'}scale=480:-2:out_range=tv,format=yuv420p,signalstats,metadata=print`;
  const log = ffmpegLog(['-i', file, '-map', '0:v:0', '-vf', vf, '-f', 'null', '-']);
  const mean = (re: RegExp) => {
    const values = [...log.matchAll(re)].map(m => Number(m[1])).filter(Number.isFinite);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : NaN;
  };
  return { luma: (mean(/signalstats\.YAVG=([\d.]+)/g) - 16) / 219, saturation: mean(/signalstats\.SATAVG=([\d.]+)/g) };
}

function sourceChecks(source: string): { findings: Finding[]; render: ReturnType<typeof pictureStats>; source: ReturnType<typeof pictureStats> } {
  const s = pictureStats(source);
  const r = pictureStats(video);
  const findings: Finding[] = [];
  const name = shown(source);
  const darker = 1 - r.luma / s.luma;
  const duller = 1 - r.saturation / s.saturation;
  if (Number.isFinite(darker) && darker >= 0.15)
    findings.push({
      check: 'darker',
      from: 0,
      to: duration,
      whole: true,
      note: true,
      text: `the render is ${Math.round(darker * 100)}% darker than ${name} on average (luma ${r.luma.toFixed(2)} vs ${s.luma.toFixed(2)}).`,
    });
  if (Number.isFinite(duller) && duller >= 0.15)
    findings.push({
      check: 'duller',
      from: 0,
      to: duration,
      whole: true,
      note: true,
      text: `the render is ${Math.round(duller * 100)}% less saturated than ${name} on average.`,
    });
  return { findings, render: r, source: s };
}

const picture = pictureChecks();
const sound = soundChecks();
const sourceArg = opt('source');
const sourceFile = sourceArg ? path.resolve(ROOT, sourceArg) : null;
if (sourceFile && !fs.existsSync(sourceFile)) {
  console.error(`No source at ${shown(sourceFile)}.`);
  process.exit(1);
}
const compared = sourceFile ? sourceChecks(sourceFile) : null;
const all = [...picture, ...sound.findings, ...(compared?.findings ?? [])].sort((a, b) => a.from - b.from);

// ------------------------------------------------------------------ machine notes

const intended = readIntended();
const intendedFor = (f: Finding) => intended.find(i => i.check === f.check && (f.whole || overlaps(i, f)));
const live = all.filter(f => f.note && !intendedFor(f));
// many of one kind (a dark design reads as black everywhere): note the first few and one line for the rest
const capped: Finding[] = [];
for (const check of new Set(live.map(f => f.check))) {
  const of = live.filter(f => f.check === check);
  capped.push(...of.slice(0, MAX_NOTES_PER_CHECK));
  if (of.length > MAX_NOTES_PER_CHECK) {
    const rest = of.slice(MAX_NOTES_PER_CHECK);
    const total = rest.reduce((sum, f) => sum + (f.to - f.from), 0);
    capped.push({
      check,
      from: rest[0].from,
      to: rest[rest.length - 1].to,
      note: true,
      text: `${rest.length} more like this from ${formatTime(rest[0].from)} (${secs(total)} in all); preflight lists them all in the terminal.`,
    });
  }
}
capped.sort((a, b) => a.from - b.from);

const stamp = (() => {
  const d = new Date(fs.statSync(video).mtimeMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
})();

function toComment(f: Finding, id: string): RangeComment {
  const from = f.whole ? 0 : f.from;
  const to = f.whole ? duration : Math.max(f.to, f.from + frame);
  const fromFrame = Math.max(0, Math.floor(from * fps + 1e-6));
  return {
    id,
    kind: 'range',
    text: `Preflight · ${f.check}: ${f.text}`,
    createdAt: now,
    status: 'open',
    from: round3(from),
    to: round3(to),
    fromFrame,
    toFrame: Math.max(fromFrame, Math.ceil(to * fps - 1e-6) - 1),
    // shots it really touches (not one that starts on its last frame boundary)
    shots: f.whole ? [] : map.shots.filter(s => s.to > from + frame / 2 && s.from < to - frame / 2).map(s => s.id),
    source: 'preflight',
    check: f.check,
  };
}

const revisions = readRevisions(revDir);
const latest = revisions.at(-1);
// the next revision while it holds only machine notes (the user has not written in it yet)
const reusable = latest && latest.status === 'draft' && latest.comments.every(isMachineNote) ? latest : undefined;
const closedByUser = new Set<Finding>();
let written: Revision | null = null;
if (capped.length || reusable?.comments.length) {
  const comments: RevisionComment[] = reusable ? reusable.comments.map(c => ({ ...c })) : [];
  const matched = new Set<Finding>();
  for (const c of comments) {
    if (!isMachineNote(c) || c.kind !== 'range') continue;
    const f = capped.find(f => !matched.has(f) && f.check === c.check && (f.whole || overlaps(c, f)));
    if (f) {
      matched.add(f);
      const fresh = toComment(f, c.id);
      Object.assign(c, { text: fresh.text, from: fresh.from, to: fresh.to, fromFrame: fresh.fromFrame, toFrame: fresh.toFrame, shots: fresh.shots, updatedAt: now });
      // closed with a reply (by preflight or Claude) but still there: reopen it. Closed without one, the
      // user ticked it off in the screen: their call, it stays closed.
      if (c.status === 'done' && c.reply) {
        c.status = 'open';
        c.reply = `${c.reply} ${c.reply.includes('Gone in the render') ? 'Back' : 'Still there'} in the render of ${stamp}.`;
      } else if (c.status === 'done') closedByUser.add(f);
    } else if (c.status === 'open') {
      c.status = 'done';
      c.reply = `${c.reply ? `${c.reply} ` : ''}Gone in the render of ${stamp}.`;
      c.updatedAt = now;
    }
  }
  for (const f of capped) if (!matched.has(f)) comments.push(toComment(f, nextCommentId(comments)));
  const pinned = videoInfo(video, { duration: round3(duration), fps, width, height });
  const id = reusable?.id ?? nextRevisionId(revisions.map(r => r.id));
  written = reusable
    ? { ...reusable, video: pinned, map: map.file, updatedAt: now, comments }
    : {
        schema: REVISION_SCHEMA,
        id,
        title: `Revision ${revisionNumber(id) || 1}`,
        status: 'draft',
        video: pinned,
        map: map.file,
        createdAt: now,
        updatedAt: now,
        comments,
      };
  writeRevision(revDir, written);
}
const open = written ? written.comments.filter(c => isMachineNote(c) && c.status === 'open') : [];

// ------------------------------------------------------------------ report

if (has('json')) {
  console.log(
    JSON.stringify(
      {
        video: shown(video),
        width,
        height,
        fps,
        duration: round3(duration),
        scale: lastRender(video)?.scale ?? null,
        findings: all.map(f => ({ ...f, intended: intendedFor(f)?.why ?? null, closedByUser: closedByUser.has(f) })),
        loudness: sound.loudness,
        sections: sound.sections,
        picture: compared ? { render: compared.render, source: compared.source } : null,
        revision: written ? shown(path.join(revDir, `${written.id}.json`)) : null,
        open: open.map(c => c.id),
        link: reviewLink(video),
      },
      null,
      2,
    ),
  );
} else {
  const scale = lastRender(video)?.scale;
  const kind = scale === undefined ? '' : scale < 1 ? ` · ${Math.round(scale * 100)}% review render` : ' · master';
  console.log(`Preflight · ${shown(video)} · ${width}×${height}${kind} · ${fps} fps · ${formatTime(duration)}`);
  for (const f of all) {
    const when = f.whole ? 'whole video' : `${formatTime(f.from)}–${formatTime(f.to)}`;
    const why = intendedFor(f)?.why;
    const tag = why ? `intended: ${why}` : closedByUser.has(f) ? 'closed by the user in the screen' : f.note ? '' : 'fine at the edge, not noted';
    console.log(`  ${f.check.padEnd(11)} ${when.padEnd(18)} ${f.text}${tag ? `  (${tag})` : ''}`);
  }
  if (sound.loudness) {
    const l = sound.loudness;
    console.log(`Sound: ${db(l.integrated)} LUFS integrated · true peak ${db(l.peak)} dBTP · range ${l.range?.toFixed(1) ?? '–'} LU`);
    if (sound.sections.length)
      console.log(`  by section (LUFS / peak): ${sound.sections.map(s => `${s.id} ${db(s.integrated)}/${db(s.peak)}`).join(' · ')}`);
  }
  if (compared)
    console.log(
      `Picture vs ${shown(sourceFile!)}: luma ${compared.render.luma.toFixed(2)} vs ${compared.source.luma.toFixed(2)} · saturation ${compared.render.saturation.toFixed(1)} vs ${compared.source.saturation.toFixed(1)}`,
    );
  if (written && open.length) {
    console.log(`\n${open.length} open machine note${open.length === 1 ? '' : 's'} in ${shown(path.join(revDir, `${written.id}.json`))}:`);
    for (const c of open) console.log(`  ${commentLine(c)}`);
    console.log(
      `Fix each and run preflight again (it closes what is gone), or answer an intended one: --intended=${open[0].id} --why="…".` +
        `\nGive the review link once none is open: ${reviewLink(video)}`,
    );
  } else {
    if (written) console.log(`\nEvery machine note in ${shown(path.join(revDir, `${written.id}.json`))} is closed.`);
    else console.log('\nPreflight clean.');
    console.log(`Review link: ${reviewLink(video)}`);
  }
}
if (has('strict') && open.length) process.exitCode = 1;
