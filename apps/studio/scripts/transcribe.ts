/**
 * transcribe: a song's timed words from ElevenLabs Scribe, the one way every skill transcribes.
 *
 * Usage: mm transcribe <slug | audio file> [--save=<words.json> | --yes] [--mix] [--lang=en] [--letters] [--out=…] [--fresh]
 *   <slug>     the project's vocal stem, analysis/stems/vocals.wav (make it first with
 *              mm analyze <slug> --only separate); the words go to input/lyrics.raw.json
 *   <file>     that file (a song, a stem, a video's sound); the words go to <file>.scribe.json beside it
 *
 * The first run spends nothing: it gives back the media library's cached words of this song when
 * there are some, else makes the MP3 to send (a WAV, FLAC or AIFF stem or a video becomes a 128 kb/s
 * mono MP3, a tenth of the upload or less; the encoder's padding is marked in the file, so no word
 * moves) and prints its price. Then, after the user said yes to the price:
 *   - first choice: --yes sends the MP3 to Scribe with the local ElevenLabs MCP's key (elevenlabs.ts), no widget;
 *   - only where no local MCP runs (the Claude web or phone app), the hosted ElevenLabs connector: its
 *     creative_transcribe_audio on that MP3 (picked in its file picker widget), then --save=<the words JSON
 *     it gave> keeps them here and in the cache.
 *   --mix      a project's whole song instead of its vocal stem
 *   --lang     the language's code (en, hi, te, ja…); Scribe detects it when left out
 *   --letters  every letter's time as well (timestamps_granularity=character)
 *   --out      where the words go instead (needed for a file inside the media library)
 *   --fresh    a new transcript even when the media library has one of this song
 *   --model    Scribe's model (default scribe_v1)
 *
 * The words are Scribe's answer as it is (`words`: text, start, end, type), for the project's recut
 * script. When the song is in the media library they are kept in its cache (kind transcript), so the
 * next production of that song gets them for free.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { creditsLeft, findElevenLabsKey, NO_KEY, scribe, type ScribeOptions, type ScribeResult, type ScribeWord } from './elevenlabs.ts';
import { ffmpegLog, probeMedia } from './ff.ts';
import { hasConfig, loadConfig } from './library/config.ts';
import { getItem, type Item } from './library/db.ts';
import { absOf, openLibrary, resolveItem, userPath } from './library/lib.ts';
import { sha256File } from './library/sys.ts';
import { cacheGet, cachePut } from './library/use.ts';
import { DIRS, shown } from './paths.ts';

const args = process.argv.slice(2);
const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => args.includes(`--${name}`);
const [target] = args.filter(a => !a.startsWith('--'));
if (!target) {
  console.error('Usage: mm transcribe <slug | audio file> [--save=<words.json> | --yes] [--mix] [--lang=en] [--letters] [--out=…] [--fresh]');
  process.exit(1);
}

/** Measured: 211 credits for 5:17 of audio (Honoured One, 2026-11-02). */
const CREDITS_PER_MINUTE = 40;
/** Sent as they are; anything else is made an MP3 first. */
const COMPRESSED = /\.(mp3|m4a|aac|ogg|opus)$/i;
const AUDIO_EXT = /\.(mp3|wav|m4a|aac|ogg|flac|webm|aiff?)$/i;

const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const mb = (file: string) => `${(fs.statSync(file).size / 1048576).toFixed(1)} MB`;
const fail = (message: string, code = 1): never => {
  console.error(message);
  process.exit(code);
};

/** What is sent, the MP3 it goes up as, what the cache is keyed by, and where the words go. */
function plan() {
  const project = path.join(DIRS.projects, target);
  const file = userPath(target);
  if (!fs.existsSync(file) && /^[\w.-]+$/.test(target) && fs.existsSync(project)) {
    const input = path.join(project, 'input');
    let song: string | undefined;
    try {
      song = JSON.parse(fs.readFileSync(path.join(input, 'project.json'), 'utf8')).audio;
    } catch {}
    song ??= fs.existsSync(input) ? fs.readdirSync(input).filter(f => AUDIO_EXT.test(f)).sort()[0] : undefined;
    const songPath = song ? path.join(input, song) : undefined;
    const stem = path.join(project, 'analysis', 'stems', 'vocals.wav');
    const mix = has('mix');
    return {
      sent: mix ? songPath : stem,
      sentIs: mix ? 'the whole song' : 'the vocal stem',
      song: songPath,
      out: path.join(input, 'lyrics.raw.json'),
      mp3: path.join(project, 'analysis', mix ? 'mix.mp3' : 'stems/vocals.mp3'),
      stemMissing: !mix && !fs.existsSync(stem),
    };
  }
  if (!fs.existsSync(file)) fail(`No project or file named ${target}`);
  const libRoot = hasConfig() ? loadConfig().root : undefined;
  if (!opt('out') && libRoot && path.resolve(file).startsWith(path.resolve(libRoot) + path.sep))
    fail('That file is in the media library, which takes no new files by hand: give --out=<where the words go>.');
  const out = opt('out') ? userPath(opt('out')!) : `${file}.scribe.json`;
  return { sent: file, sentIs: 'the file as it is', song: file, out, mp3: path.join(path.dirname(out), `${path.parse(file).name}.mp3`), stemMissing: false };
}

/** The song in the media library, for its cache: by its path, else by its content (a copy made before the library knew it). */
async function libraryItem(song: string | undefined) {
  if (!song || !hasConfig()) return undefined;
  try {
    const lib = openLibrary({ quiet: true });
    let item: Item | undefined;
    try {
      item = resolveItem(lib, song);
    } catch {
      item = getItem(lib.db, await sha256File(song));
    }
    return item && { lib, item };
  } catch {
    return undefined;
  }
}

/** Words from Scribe's answer, the connector's words download, or a bare list of words. */
function wordsFrom(raw: any): ScribeResult {
  const t = Array.isArray(raw) ? { words: raw } : Array.isArray(raw?.words) ? raw : (raw?.transcripts?.[0] ?? raw?.transcript);
  if (!Array.isArray(t?.words) || !t.words.length) throw new Error('No words in that file: give the JSON with the list of words (each with its start and end)');
  const words: ScribeWord[] = t.words.map((w: any) => ({ ...w, text: w.text ?? w.word, start: Number(w.start ?? w.start_time), end: Number(w.end ?? w.end_time), type: w.type ?? 'word' }));
  if (words.some(w => !Number.isFinite(w.start) || !Number.isFinite(w.end))) throw new Error('Some words in that file have no start or end time');
  return {
    language_code: t.language_code ?? raw.language_code ?? '',
    language_probability: t.language_probability ?? raw.language_probability ?? 0,
    text: t.text ?? words.filter(w => w.type === 'word').map(w => w.text).join(' '),
    words,
  };
}

const { sent, sentIs, song, out: plannedOut, mp3, stemMissing } = plan();
const out = opt('out') ? userPath(opt('out')!) : plannedOut;
const options: ScribeOptions = { model: opt('model'), language: opt('lang'), letters: has('letters') };
// The vocal stem with the defaults is the cache's default transcript, which `media use --with=transcript` brings along.
const params =
  [
    options.model && options.model !== 'scribe_v1' && `model=${options.model}`,
    options.letters && 'letters',
    options.language && `lang=${options.language}`,
    sentIs !== 'the vocal stem' && 'audio=as-is',
  ]
    .filter(Boolean)
    .join(' ') || undefined;
const lib = await libraryItem(song);

/** Writes the words, checks them against the audio, and keeps them in the cache. */
function keep(result: ScribeResult, how: string) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(result, null, 2));
  const words = result.words.filter(w => w.type === 'word');
  const lang = result.language_code ? `, language ${result.language_code}${result.language_probability ? ` (${Math.round(result.language_probability * 100)} %)` : ''}` : '';
  console.log(`${words.length} words${lang}${how} → ${shown(out)}`);
  const duration = sent && fs.existsSync(sent) ? probeMedia(sent).duration : 0;
  const last = words.at(-1)?.end ?? 0;
  if (duration && last > duration + 0.5) console.warn(`  the last word ends at ${last.toFixed(2)} s, after the audio (${duration.toFixed(2)} s): check it is the same mix`);
  if (lib) console.log(`  kept in the media library's cache: ${shown(cachePut(lib.lib, lib.item, 'transcript', out, { params, tool: 'transcribe', target: 'input' }))}`);
}

// Words the ElevenLabs connector gave: keep them like Scribe's own.
if (opt('save')) {
  const from = userPath(opt('save')!);
  try {
    keep(wordsFrom(JSON.parse(fs.readFileSync(from, 'utf8'))), `, from ${shown(from)}`);
  } catch (e) {
    fail((e as Error).message);
  }
  process.exit(0);
}

const cached = lib && !has('fresh') ? cacheGet(lib.lib, lib.item, 'transcript', params) : undefined;
const cachedFile = cached && fs.readdirSync(absOf(lib!.lib, cached.path)).find(f => f.endsWith('.json'));
if (cached && cachedFile) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(path.join(absOf(lib!.lib, cached.path), cachedFile), out);
  console.log(`From the media library's cache (no credits spent): ${shown(out)}`);
  console.log(`  transcribed ${cached.at.slice(0, 10)}; --fresh for a new one`);
  process.exit(0);
}

if (stemMissing) fail(`No vocal stem yet. Make it first (about a minute, free):\n  mm analyze ${target} --only separate\nor send the whole song with --mix.`);
if (!sent || !fs.existsSync(sent)) fail(`No song in ${shown(path.join(DIRS.projects, target, 'input'))}`);

// The upload: the file itself when it is compressed already, else its MP3 (made again only when the source is newer).
let upload = sent!;
if (!COMPRESSED.test(sent!)) {
  if (!fs.existsSync(mp3) || fs.statSync(mp3).mtimeMs < fs.statSync(sent!).mtimeMs) {
    fs.mkdirSync(path.dirname(mp3), { recursive: true });
    ffmpegLog(['-y', '-loglevel', 'error', '-i', sent!, '-vn', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', '128k', mp3]);
  }
  upload = mp3;
}

const duration = probeMedia(upload).duration;
const key = findElevenLabsKey();
console.log(`${shown(sent!)} (${sentIs}), ${clock(duration)}`);
if (upload !== sent) console.log(`  goes up as ${shown(upload)} (${mb(upload)}, from ${mb(sent!)})`);

if (!has('yes')) {
  const credits = key && (await creditsLeft(key.key));
  console.log(`  about ${Math.ceil((duration / 60) * CREDITS_PER_MINUTE)} credits (Scribe, ~${CREDITS_PER_MINUTE} a minute)${credits ? `; ${credits.left.toLocaleString('en')} of ${credits.limit.toLocaleString('en')} left this month` : ''}`);
  if (!lib) console.log('  not cached afterwards: the song is not in the media library');
  console.log('Nothing sent. Once the user says yes to the price:');
  console.log(`  - first choice: --yes sends it to Scribe with ${key ? `the ElevenLabs MCP's key (from ${key.from})` : 'the ElevenLabs MCP\'s key, which is not set up: run --yes to see how'}`);
  console.log(`  - only on the Claude web or phone app: the ElevenLabs connector's creative_transcribe_audio on ${shown(upload)}, then --save=<its words JSON>`);
  process.exit(0);
}

if (!key) fail(NO_KEY, 2);
try {
  const started = Date.now();
  keep(await scribe(key!.key, upload, options), `, in ${Math.round((Date.now() - started) / 1000)} s`);
} catch (e) {
  fail((e as Error).message);
}
