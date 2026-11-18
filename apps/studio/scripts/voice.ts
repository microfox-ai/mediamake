/**
 * voice: one take of a script in an ElevenLabs voice, for a place that has the key and no ElevenLabs
 * MCP (a Claude cloud session). On a computer with the MCP, its text_to_speech stays the first choice:
 * this makes the same call with the same key (elevenlabs.ts finds it, never printed).
 *
 * Usage: mm voice <slug | out.mp3> --text=<file> --voice=<voices.json | voice id> [--yes]
 *                 [--model=eleven_v3] [--stability=0.5] [--speed=1] [--style=0] [--no-boost] [--out=<file>]
 *   <slug>     the take goes to the project's input/vo/take-NN.mp3 (a take is paid for: never replaced)
 *   <out.mp3>  the take goes to that file (refused when it exists)
 *   --text     the script as it is spoken, tags and all, in a text file
 *   --voice    a voice id, or a JSON file that names one: { "show_voice": { "elevenlabs_voice_id", "model",
 *              "stability", "speed", "style", "speaker_boost" } } (a brand's voices.json) or the same keys at
 *              its top. A flag wins over the file.
 *
 * The first run spends nothing: it prints the characters, the voice and the credits left. --yes, after
 * the user's yes to the price (in auto mode the budget is the yes), sends it and says what it cost.
 * A long script goes one call a section, so a section is voiced again alone.
 */
import fs from 'node:fs';
import path from 'node:path';
import { creditsLeft, findElevenLabsKey, KEYS_PAGE, speak, type SpeakOptions } from './elevenlabs.ts';
import { DIRS, shown } from './paths.ts';

const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? Number(value) : undefined);

/** The voice and its settings: a voice id, or a JSON file that names one. Flags win over the file. */
export function voiceFrom(value: string, flags: { model?: string; stability?: string; speed?: string; style?: string; noBoost?: boolean }): SpeakOptions & { name?: string } {
  let file: Record<string, unknown> = {};
  let voice = value;
  if (/\.json$/i.test(value)) {
    let read: Record<string, unknown>;
    try {
      read = JSON.parse(fs.readFileSync(path.resolve(value), 'utf8'));
    } catch (e) {
      throw new Error(`${value} can't be read as a voice: ${(e as Error).message}`);
    }
    file = (read.show_voice && typeof read.show_voice === 'object' ? read.show_voice : read) as Record<string, unknown>;
    voice = String(file.elevenlabs_voice_id ?? file.voice_id ?? '');
    if (!voice) throw new Error(`${value} names no voice: it needs "elevenlabs_voice_id" (at its top, or under "show_voice")`);
  }
  if (!/^[A-Za-z0-9]{8,64}$/.test(voice)) throw new Error(`"${voice}" isn't an ElevenLabs voice id (letters and digits). Give the id, or a voices.json that names it.`);
  const boost = flags.noBoost ? false : typeof file.speaker_boost === 'boolean' ? file.speaker_boost : undefined;
  return {
    voice,
    ...(typeof file.name === 'string' && { name: file.name }),
    model: flags.model ?? (typeof file.model === 'string' ? file.model : undefined) ?? 'eleven_v3',
    ...(num(flags.stability ?? file.stability) !== undefined && { stability: num(flags.stability ?? file.stability) }),
    ...(num(flags.speed ?? file.speed) !== undefined && { speed: num(flags.speed ?? file.speed) }),
    ...(num(flags.style ?? file.style) !== undefined && { style: num(flags.style ?? file.style) }),
    ...(boost !== undefined && { boost }),
  };
}

/** Where the take goes: a named file, or the project's next input/vo/take-NN.mp3. Never over a take. */
export function takeFile(target: string, out: string | undefined, projects: string): string {
  if (out || /\.(mp3|wav|opus|pcm)$/i.test(target)) {
    const file = path.resolve(out ?? target);
    if (fs.existsSync(file)) throw new Error(`${file} is there already: a take is never replaced. Name another file.`);
    return file;
  }
  const project = path.join(projects, target);
  if (!fs.existsSync(project)) throw new Error(`No project ${target} in ${projects}. Make it first, or name the file the take goes to.`);
  const dir = path.join(project, 'input', 'vo');
  const taken = fs.existsSync(dir) ? fs.readdirSync(dir).flatMap(f => (/^take-(\d+)\./.exec(f) ? [Number(/^take-(\d+)\./.exec(f)![1])] : [])) : [];
  return path.join(dir, `take-${String(Math.max(0, ...taken) + 1).padStart(2, '0')}.mp3`);
}

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string) => args.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3);
  const has = (name: string) => args.includes(`--${name}`);
  const [target] = args.filter(a => !a.startsWith('--'));
  const fail = (message: string, code = 1): never => {
    console.error(message);
    process.exit(code);
  };
  if (!target || !opt('text') || !opt('voice')) fail('Usage: mm voice <slug | out.mp3> --text=<file> --voice=<voices.json | voice id> [--yes] [--model=…] [--stability=…] [--speed=…] [--style=…] [--no-boost] [--out=<file>]');
  const textFile = path.resolve(opt('text')!);
  if (!fs.existsSync(textFile)) fail(`No script at ${textFile}`);
  const text = fs.readFileSync(textFile, 'utf8').trim();
  if (!text) fail(`${textFile} is empty`);
  let voice: ReturnType<typeof voiceFrom>;
  let file: string;
  try {
    voice = voiceFrom(opt('voice')!, { model: opt('model'), stability: opt('stability'), speed: opt('speed'), style: opt('style'), noBoost: has('no-boost') });
    file = takeFile(target, opt('out'), DIRS.projects);
  } catch (e) {
    return fail((e as Error).message);
  }
  const key = findElevenLabsKey();
  const settings = [voice.model, voice.stability !== undefined && `stability ${voice.stability}`, voice.speed !== undefined && `speed ${voice.speed}`, voice.style !== undefined && `style ${voice.style}`, voice.boost !== undefined && `speaker boost ${voice.boost ? 'on' : 'off'}`].filter(Boolean).join(', ');
  console.log(`${shown(textFile)}: ${text.length.toLocaleString('en')} characters, in ${voice.name ?? voice.voice} (${settings})`);
  console.log(`  the take goes to ${shown(file)}`);
  const before = key && (await creditsLeft(key.key));

  if (!has('yes')) {
    console.log(`  ElevenLabs bills a take by its characters (${text.length.toLocaleString('en')} here; the rate depends on the model and the plan)${before ? `; ${before.left.toLocaleString('en')} of ${before.limit.toLocaleString('en')} credits left` : ''}`);
    console.log('Nothing sent. Once the user says yes to the price (in auto mode, within the budget):');
    console.log(`  --yes sends it with ${key ? `the ElevenLabs key (from ${key.from})` : 'the ElevenLabs key, which is not set up: run --yes to see how'}`);
    return;
  }
  if (!key)
    return fail(
      [
        'No ElevenLabs API key found. mm voice uses the one the ElevenLabs MCP has on a computer, and in a cloud session',
        "the environment's ELEVENLABS_API_KEY variable (the person sets it in the environment, never in a file or a chat).",
        `Make one at ${KEYS_PAGE}; a restricted key needs Text to Speech allowed (and User read, for the credits left).`,
      ].join('\n'),
      2,
    );
  try {
    const started = Date.now();
    const audio = await speak(key.key, text, voice);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, audio);
    const after = await creditsLeft(key.key);
    const spent = before && after ? before.left - after.left : undefined;
    console.log(`✔ ${shown(file)} (${(audio.length / 1048576).toFixed(1)} MB, in ${Math.round((Date.now() - started) / 1000)} s)${spent !== undefined && spent >= 0 ? `: ${spent.toLocaleString('en')} credits, ${after!.left.toLocaleString('en')} left` : ''}`);
  } catch (e) {
    fail((e as Error).message);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await main();
