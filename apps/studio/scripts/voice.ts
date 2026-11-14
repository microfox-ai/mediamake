/**
 * voice: narration and multi-speaker dialogue from ElevenLabs, with every word timed and every line's
 * speaker known (the make-elevenlabs-voice skill).
 *
 * Usage: mm voice <dialogue | tts | check | finish> <script.json | take folder> [--yes] [--out=<dir>]
 *        [--takes=1] [--model=eleven_v4] [--format=mp3_44100_192] [--seed=<n>]
 *
 *   dialogue <script.json>  every line in its speaker's voice, in one natural conversation
 *                           (POST /v1/text-to-dialogue/with-timestamps, about 2,000 characters a request; a
 *                           longer script is split between lines, preferably at a scene change, and each
 *                           request is told the text either side of it so the joins stay natural)
 *   tts <script.json>       one voice (the script's only speaker), split into stitched requests on eleven_v4
 *                           (previous_request_ids), so a long read keeps one tone and one pace
 *   check <take folder>     free checks: dead air between lines, lines missing, loudness; with --yes also
 *                           Scribe on the take and a word-by-word diff against the script (~40 credits a minute;
 *                           kept as vo.scribe.json, so later checks reuse it free, --fresh to run it again)
 *   finish <take folder>    the "recorded in a room" finish (free, on this Mac): low cut, faint early reflections,
 *                           gentle compression and a whisper of room tone, so it stops sounding studio-perfect.
 *                           Writes vo-room.wav beside vo.wav (same timing, so words.json still fits); --level=-20 LUFS.
 *                           The user's pick on 2026-11-11 ("4: our voices + room") made it the default last step.
 *
 * The first run spends nothing: it shows the requests, the characters and the price (about 0.45 credits
 * a character on eleven_v4, 1 on v3 and v2, tags included), and the credits left. --yes makes the take(s).
 *
 * script.json:
 *   {
 *     "model": "eleven_v4", "language": "en", "stability": 0.5, "speed": 1.0, "format": "mp3_44100_192",
 *     "voices": { "maya": "<voice_id>", "dev": "<voice_id>" },
 *     "lines": [
 *       { "speaker": "maya", "scene": 1, "text": "[curious] So what actually broke?", "say": "So what actually broke?" },
 *       { "speaker": "dev",  "scene": 1, "text": "[sighs] Honestly? Everything... at once." }
 *     ]
 *   }
 *   text = what is sent (audio tags, ellipses, CAPS for stress); say = the plain words for captions
 *   (tags stripped from text when left out). speed is used by tts only; stability 0.5 is "Natural"
 *   (lower is more expressive and less predictable, higher is steadier and follows tags less).
 *
 * Each take goes to <out>/take<N>/: vo.wav (44.1 kHz), parts/part-NN.mp3 (one per request),
 * segments.json (line, speaker, voice, start, end, say), words.json (text, start, end, speaker, line)
 * and meta.json (model, seed, requests, characters, request ids). The key is the ElevenLabs MCP's,
 * found by elevenlabs.ts and never printed.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  creditsLeft,
  findElevenLabsKey,
  NO_KEY,
  scribe,
  textToDialogue,
  textToSpeech,
  type Alignment,
  type SpeechResult,
} from './elevenlabs.ts';
import { FFMPEG, probeMedia } from './ff.ts';
import { DIRS, ROOT, shown } from './paths.ts';

type Line = { speaker: string; text: string; say?: string; scene?: string | number };
type Script = {
  model?: string;
  language?: string;
  stability?: number;
  speed?: number;
  format?: string;
  voices: Record<string, string>;
  lines: Line[];
};
type Request = { lines: number[]; chars: number };
type Word = { text: string; start: number; end: number; speaker: string; line: number };
type Segment = { line: number; speaker: string; voice_id: string; start: number; end: number; say: string };

const args = process.argv.slice(2);
const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => args.includes(`--${name}`);
const [command, target] = args.filter(a => !a.startsWith('--'));
const USAGE =
  'Usage: mm voice <dialogue | tts | check | finish> <script.json | take folder> [--yes] [--out=<dir>] [--takes=1] [--model=eleven_v4] [--format=mp3_44100_192] [--seed=<n>]';

const fail = (message: string, code = 1): never => {
  console.error(message);
  process.exit(code);
};
/** A path as typed: from where mm runs, else from the workspace ("projects/<slug>/…" works from any folder). */
const resolveTarget = (p: string) => {
  const here = path.resolve(p);
  if (fs.existsSync(here) || path.isAbsolute(p)) return here;
  const inWorkspace = path.resolve(path.dirname(DIRS.projects), p);
  return fs.existsSync(inWorkspace) ? inWorkspace : here;
};

/** Dialogue requests stay under this many characters (the API's guidance is 2,000). */
const DIALOGUE_LIMIT = 1900;
/** A single-voice request: long enough to keep its tone, short enough to retry cheaply. */
const TTS_LIMIT = 1500;
/** Context characters either side of a request (the API takes up to 100). */
const CONTEXT = 100;
/** Silence between two lines longer than this is dead air worth a look. */
const DEAD_AIR = 0.4;

/** The words without audio tags ([sighs], [whispers]…) or IPA slashes, for captions and diffs. */
export const plain = (text: string) =>
  text
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

/** Split lines into requests under `limit` characters, preferring a scene change once a request is half full. */
export function splitRequests(lines: Line[], limit: number): Request[] {
  const out: Request[] = [];
  let cur: Request = { lines: [], chars: 0 };
  lines.forEach((line, i) => {
    const len = line.text.length;
    if (len > limit) fail(`Line ${i + 1} is ${len} characters, over the ${limit} a request can take: split it.`);
    const sceneBreak = cur.lines.length > 0 && line.scene !== undefined && line.scene !== lines[cur.lines.at(-1)!].scene && cur.chars > limit / 2;
    if (cur.lines.length && (cur.chars + len > limit || sceneBreak)) {
      out.push(cur);
      cur = { lines: [], chars: 0 };
    }
    cur.lines.push(i);
    cur.chars += len;
  });
  if (cur.lines.length) out.push(cur);
  return out;
}

/** Group an alignment's characters into words, skipping audio tags; times are offset by `offset`. */
export function alignmentWords(a: Alignment | undefined, offset: number): { text: string; start: number; end: number }[] {
  if (!a) return [];
  const words: { text: string; start: number; end: number }[] = [];
  let inTag = false;
  let cur: { text: string; start: number; end: number } | undefined;
  const flush = () => {
    if (cur && /[\p{L}\p{N}]/u.test(cur.text)) words.push(cur);
    cur = undefined;
  };
  a.characters.forEach((ch, i) => {
    if (ch === '[') {
      inTag = true;
      flush();
      return;
    }
    if (inTag) {
      if (ch === ']') inTag = false;
      return;
    }
    if (/\s/.test(ch)) return flush();
    const start = a.character_start_times_seconds[i] + offset;
    const end = a.character_end_times_seconds[i] + offset;
    if (!cur) cur = { text: ch, start, end };
    else {
      cur.text += ch;
      cur.end = end;
    }
  });
  flush();
  return words;
}

const readScript = (file: string): Script => {
  let s: Script;
  try {
    s = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return fail(`Can't read ${file}: ${(e as Error).message}`);
  }
  if (!s.voices || !Array.isArray(s.lines) || !s.lines.length) fail(`${file} needs "voices" (speaker → voice_id) and "lines".`);
  const missing = [...new Set(s.lines.map(l => l.speaker).filter(sp => !s.voices[sp]))];
  if (missing.length) fail(`No voice_id for ${missing.join(', ')} in "voices".`);
  if (Object.keys(s.voices).length > 10) fail('A dialogue takes at most 10 voices.');
  return s;
};

const concat = (parts: string[], out: string) => {
  const inputs = parts.flatMap(p => ['-i', p]);
  const filter = `${parts.map((_, i) => `[${i}:a]`).join('')}concat=n=${parts.length}:v=0:a=1[a]`;
  execFileSync(FFMPEG, ['-y', '-v', 'error', ...inputs, '-filter_complex', filter, '-map', '[a]', '-ar', '44100', out]);
};

const loudness = (file: string) =>
  spawnSync(FFMPEG, ['-hide_banner', '-nostats', '-i', file, '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr ?? '';

async function make(kind: 'dialogue' | 'tts') {
  if (!target) fail(USAGE);
  const file = resolveTarget(target);
  const s = readScript(file);
  const model = opt('model') ?? s.model ?? 'eleven_v4';
  const format = opt('format') ?? s.format ?? 'mp3_44100_192';
  const takes = Math.max(1, Number(opt('takes') ?? 1));
  const speakers = [...new Set(s.lines.map(l => l.speaker))];
  if (kind === 'tts' && speakers.length > 1) fail(`tts reads one voice; this script has ${speakers.join(', ')}: use dialogue.`);
  if (kind === 'tts' && model === 'eleven_v3') console.log('Note: request stitching does not work on eleven_v3; long reads may drift between requests. eleven_v4 stitches.');
  const requests = splitRequests(s.lines, kind === 'dialogue' ? DIALOGUE_LIMIT : TTS_LIMIT);
  const chars = s.lines.reduce((n, l) => n + l.text.length, 0);
  const out = path.resolve(opt('out') ?? path.join(path.dirname(file), `${path.basename(file, '.json')}-voice`));

  const key = findElevenLabsKey();
  const credits = key && (await creditsLeft(key.key));
  console.log(`${kind} · ${model} · ${speakers.length} voice${speakers.length > 1 ? 's' : ''} (${speakers.join(', ')}) · ${s.lines.length} lines`);
  console.log(`  ${requests.length} request${requests.length > 1 ? 's' : ''} (${requests.map(r => r.chars).join(' + ')} characters) × ${takes} take${takes > 1 ? 's' : ''}`);
  // Measured on the Creator plan, Nov 2026: eleven_v4 about 0.44 a character (dialogue, 4 takes), v3 and v2 about 1.
  const rate = model.startsWith('eleven_v4') ? 0.45 : 1;
  console.log(
    `  about ${Math.ceil(chars * takes * rate).toLocaleString('en')} credits (${rate} a character on ${model}, tags included)${credits ? `; ${credits.left.toLocaleString('en')} of ${credits.limit.toLocaleString('en')} left this month` : ''}`,
  );
  console.log(`  into ${shown(out)}/take<N>/`);
  if (!has('yes')) {
    console.log('Nothing sent. Once the user says yes to the price, run it again with --yes.');
    return;
  }
  if (!key) fail(NO_KEY);

  for (let t = 1; t <= takes; t++) {
    const dir = path.join(out, `take${t}`);
    const partsDir = path.join(dir, 'parts');
    fs.mkdirSync(partsDir, { recursive: true });
    const seed = opt('seed') !== undefined ? Number(opt('seed')) + t - 1 : Math.floor(Math.random() * 4_000_000_000);
    const ids: string[] = [];
    const parts: string[] = [];
    const words: Word[] = [];
    const segments: Segment[] = [];
    let offset = 0;
    for (const [r, req] of requests.entries()) {
      const before = r > 0 ? requests[r - 1].lines.map(i => plain(s.lines[i].text)).join(' ').slice(-CONTEXT) : undefined;
      const after = r < requests.length - 1 ? requests[r + 1].lines.map(i => plain(s.lines[i].text)).join(' ').slice(0, CONTEXT) : undefined;
      const prevIds = ids.slice(-3);
      let res: SpeechResult;
      process.stdout.write(`  take ${t}, request ${r + 1}/${requests.length}… `);
      if (kind === 'dialogue') {
        res = await textToDialogue(
          key.key,
          {
            inputs: req.lines.map(i => ({ text: s.lines[i].text, voice_id: s.voices[s.lines[i].speaker] })),
            model_id: model,
            language_code: s.language ?? 'en',
            settings: { stability: s.stability ?? 0.5 },
            seed,
            ...(prevIds.length ? { previous_request_ids: prevIds } : before ? { previous_text: before } : {}),
            ...(after ? { future_text: after } : {}),
          },
          format,
        );
      } else {
        res = await textToSpeech(
          key.key,
          s.voices[speakers[0]],
          {
            text: req.lines.map(i => s.lines[i].text).join(' '),
            model_id: model,
            language_code: s.language ?? 'en',
            voice_settings: { stability: s.stability ?? 0.5, speed: s.speed ?? 1.0 },
            seed,
            ...(prevIds.length && model !== 'eleven_v3' ? { previous_request_ids: prevIds } : before ? { previous_text: before } : {}),
            ...(after ? { next_text: after } : {}),
          },
          format,
        );
      }
      if (res.requestId) ids.push(res.requestId);
      const part = path.join(partsDir, `part-${String(r + 1).padStart(2, '0')}.mp3`);
      fs.writeFileSync(part, res.audio);
      parts.push(part);
      const duration = probeMedia(part).duration;
      console.log(`${duration.toFixed(2)} s`);

      // Who speaks when: the dialogue's own voice segments, else the request is one line run.
      const reqSegments: Segment[] =
        kind === 'dialogue' && res.segments?.length
          ? res.segments.map(g => {
              const line = req.lines[g.dialogue_input_index];
              return {
                line,
                speaker: s.lines[line].speaker,
                voice_id: g.voice_id,
                start: g.start_time_seconds + offset,
                end: g.end_time_seconds + offset,
                say: s.lines[line].say ?? plain(s.lines[line].text),
              };
            })
          : [];
      const reqWords = alignmentWords(res.alignment, offset);
      for (const w of reqWords) {
        const mid = (w.start + w.end) / 2;
        const seg = reqSegments.find(g => mid >= g.start && mid <= g.end) ?? reqSegments.findLast(g => g.start <= mid);
        const line = seg?.line ?? req.lines[0];
        words.push({ ...w, speaker: seg?.speaker ?? s.lines[line].speaker, line });
      }
      if (kind === 'tts') {
        // one voice: a line's span runs from its first word to its last, matched in order
        let wi = words.length - reqWords.length;
        for (const i of req.lines) {
          const n = plain(s.lines[i].text).split(' ').filter(x => /[\p{L}\p{N}]/u.test(x)).length;
          const span = words.slice(wi, wi + n);
          span.forEach(w => (w.line = i));
          if (span.length)
            segments.push({ line: i, speaker: s.lines[i].speaker, voice_id: s.voices[s.lines[i].speaker], start: span[0].start, end: span.at(-1)!.end, say: s.lines[i].say ?? plain(s.lines[i].text) });
          wi += n;
        }
      } else segments.push(...reqSegments);
      offset += duration;
    }
    concat(parts, path.join(dir, 'vo.wav'));
    fs.writeFileSync(path.join(dir, 'segments.json'), JSON.stringify(segments, null, 1));
    fs.writeFileSync(path.join(dir, 'words.json'), JSON.stringify(words, null, 1));
    fs.writeFileSync(
      path.join(dir, 'meta.json'),
      JSON.stringify(
        { kind, script: file, model, format, seed, stability: s.stability ?? 0.5, requests: requests.map(r => r.lines), characters: chars, requestIds: ids, duration: offset },
        null,
        1,
      ),
    );
    console.log(`  take ${t}: ${offset.toFixed(2)} s, ${segments.length} segments, ${words.length} words → ${shown(dir)}`);
  }
  console.log(`Next: mm voice check ${shown(path.join(out, 'take1'))}  (free; --yes adds a Scribe diff)`);
}

/** Longest common subsequence of two word lists: what the take dropped and what it added. */
export function wordDiff(want: string[], got: string[]) {
  const n = want.length;
  const m = got.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = want[i] === got[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const missing: string[] = [];
  const extra: string[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (want[i] === got[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) missing.push(want[i++]);
    else extra.push(got[j++]);
  }
  missing.push(...want.slice(i));
  extra.push(...got.slice(j));
  return { missing, extra, matched: dp[0][0] };
}

const UNITS = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen'.split(' ');
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALE: Record<string, number> = { thousand: 1e3, million: 1e6, billion: 1e9 };
const FILLERS = new Set(['uh', 'um', 'er', 'erm', 'hmm', 'mm']);

/** Spoken numbers as digits ("twenty thousand" → 20000, "two point four" → 2.4), so a script and Scribe compare. */
export function spokenNumbers(words: string[]): string[] {
  const out: string[] = [];
  const val = (w: string) => (UNITS.includes(w) ? UNITS.indexOf(w) : TENS[w] ?? (w.includes('-') ? w.split('-').reduce((n, p) => n + (TENS[p] ?? UNITS.indexOf(p)), 0) : NaN));
  for (let i = 0; i < words.length; ) {
    if (Number.isNaN(val(words[i]))) {
      out.push(words[i++]);
      continue;
    }
    let total = 0;
    let cur = 0;
    let dec = '';
    while (i < words.length) {
      const w = words[i];
      if (!Number.isNaN(val(w))) cur += val(w);
      else if (w === 'hundred' && cur) cur *= 100;
      else if (SCALE[w] && (cur || total)) {
        total += (cur || 1) * SCALE[w];
        cur = 0;
      } else if (w === 'point' && i + 1 < words.length && UNITS.includes(words[i + 1])) {
        dec = String(UNITS.indexOf(words[i + 1]));
        i += 2;
        break;
      } else break;
      i++;
    }
    out.push(dec ? `${total + cur}.${dec}` : String(total + cur));
  }
  return out;
}

const norm = (t: string) =>
  spokenNumbers(
    t
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/(\d),(\d{3})/g, '$1$2')
      .replace(/(\d)\.(\d)/g, '$1_$2')
      .split(/[^\p{L}\p{N}_-]+/u)
      .filter(Boolean),
  )
    .map(w => w.replace('_', '.'))
    .filter(w => !FILLERS.has(w));

async function check() {
  if (!target) fail(USAGE);
  const dir = resolveTarget(target);
  const read = (f: string) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!fs.existsSync(path.join(dir, 'vo.wav'))) fail(`No vo.wav in ${shown(dir)}: give a take folder (…-voice/take1).`);
  const meta = read('meta.json');
  const segments: Segment[] = read('segments.json');
  const scriptFile = path.resolve(ROOT, meta.script);
  const s = fs.existsSync(scriptFile) ? readScript(scriptFile) : undefined;
  let problems = 0;

  console.log(`check ${shown(dir)} (${meta.kind}, ${meta.model}, ${Number(meta.duration).toFixed(2)} s)`);
  if (s) {
    const said = new Set(segments.map(g => g.line));
    const lost = s.lines.map((_, i) => i).filter(i => !said.has(i));
    if (lost.length) {
      problems++;
      console.log(`  ✗ lines with no audio: ${lost.map(i => i + 1).join(', ')}`);
    } else console.log(`  ✓ every line (${s.lines.length}) has audio`);
  }
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  // A narrator's pause between sentences is natural (up to about a second); in a dialogue, a turn should follow quickly.
  const limit = meta.kind === 'tts' ? 1.0 : DEAD_AIR;
  const gaps = sorted.slice(1).map((g, k) => ({ after: sorted[k].line + 1, gap: g.start - sorted[k].end })).filter(g => g.gap > limit);
  if (gaps.length) {
    problems++;
    console.log(`  ✗ dead air over ${limit} s: ${gaps.map(g => `after line ${g.after} (${g.gap.toFixed(2)} s)`).join(', ')}`);
  } else console.log(`  ✓ no gap over ${limit} s between lines${meta.kind === 'tts' ? ' (a narrator\'s sentence pauses)' : ''}`);
  const lufs = loudness(path.join(dir, 'vo.wav'));
  const I = [...lufs.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1];
  const peak = [...lufs.matchAll(/Peak:\s+(-?[\d.]+) dBFS/g)].at(-1)?.[1];
  console.log(`  · loudness ${I ? `${I} LUFS` : '?'}${peak ? `, true peak ${peak} dBFS` : ''} (the mix sets the final level)`);

  const cached = path.join(dir, 'vo.scribe.json');
  const fresh = fs.existsSync(cached) && fs.statSync(cached).mtimeMs >= fs.statSync(path.join(dir, 'vo.wav')).mtimeMs && !has('fresh');
  if (has('yes') || fresh) {
    if (!s) fail(`The script ${meta.script} isn't there any more, so there's nothing to diff against.`);
    let got: Awaited<ReturnType<typeof scribe>>;
    if (fresh) got = JSON.parse(fs.readFileSync(cached, 'utf8'));
    else {
      const key = findElevenLabsKey() ?? fail(NO_KEY);
      got = await scribe(key.key, path.join(dir, 'vo.wav'), { language: s.language ?? 'en' });
      fs.writeFileSync(cached, JSON.stringify(got, null, 1));
    }
    const want = norm(s.lines.map(l => l.say ?? plain(l.text)).join(' '));
    const heard = norm(got.words.filter(w => w.type === 'word').map(w => w.text).join(' '));
    const d = wordDiff(want, heard);
    const score = want.length ? d.matched / want.length : 1;
    if (d.missing.length || d.extra.length) {
      problems++;
      console.log(`  ✗ words: ${(score * 100).toFixed(1)} % match. Not heard: ${d.missing.slice(0, 20).join(' ') || '–'}. Heard extra: ${d.extra.slice(0, 20).join(' ') || '–'}`);
    } else console.log('  ✓ every word heard as written (Scribe)');
  } else console.log('  · words not checked: --yes runs Scribe on the take (~40 credits a minute) and diffs it with the script');
  console.log(problems ? `${problems} thing${problems > 1 ? 's' : ''} to look at, then listen.` : 'Clean. Now listen to it.');
}

/** The "recorded in a room" finish: what made the user's pick (2026-11-11) sound less like a studio AI read. */
export const ROOM_FILTER =
  '[0:a]highpass=f=70,aecho=0.8:0.55:13|27|41:0.09|0.06|0.04,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=150[v];' +
  'anoisesrc=color=pink:amplitude=0.0016:sample_rate=44100[n];[v][n]amix=inputs=2:duration=first:normalize=0';

function finish() {
  if (!target) fail(USAGE);
  const dir = resolveTarget(target);
  const input = path.join(dir, 'vo.wav');
  if (!fs.existsSync(input)) fail(`No vo.wav in ${shown(dir)}: give a take folder (…-voice/take1).`);
  const out = path.resolve(opt('out') ?? path.join(dir, 'vo-room.wav'));
  const level = Number(opt('level') ?? -20);
  execFileSync(FFMPEG, ['-y', '-v', 'error', '-i', input, '-filter_complex', `${ROOM_FILTER},loudnorm=I=${level}:TP=-1.5`, '-ar', '44100', out]);
  const a = probeMedia(input).duration;
  const b = probeMedia(out).duration;
  console.log(`finish: ${shown(out)} (${b.toFixed(2)} s, ${level} LUFS; the take is ${a.toFixed(2)} s, so words.json still fits)`);
}

// Run as a command; imported (by tests), only the helpers above are used.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (command === 'dialogue' || command === 'tts') await make(command);
  else if (command === 'check') await check();
  else if (command === 'finish') finish();
  else fail(USAGE);
}
