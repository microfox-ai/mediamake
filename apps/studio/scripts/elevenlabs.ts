/**
 * elevenlabs: the ElevenLabs API key and the two calls the scripts make with it (Scribe, the
 * credits left). The key is the one the ElevenLabs MCP already has, so the person pastes it once,
 * while setting up that MCP, and never into a script or a .env.
 *
 * Looked up in order: the ELEVENLABS_API_KEY environment variable; Claude Code's ~/.claude.json
 * (the server added for all projects, then one added for this folder or a folder above it); Claude
 * Desktop's claude_desktop_config.json. A server counts when it is named elevenlabs or runs
 * elevenlabs-mcp. The key is never printed, only where it came from.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const API = 'https://api.elevenlabs.io/v1';
export const KEYS_PAGE = 'https://elevenlabs.io/app/settings/api-keys';

type Server = { command?: string; args?: string[]; env?: Record<string, string> };
type Servers = Record<string, Server> | undefined;
export type KeySource = { key: string; from: string };
/** The environment variables read here: process.env, or a test's own (which needn't have NODE_ENV, required by Next's ProcessEnv). */
type Env = Readonly<Record<string, string | undefined>>;

const readJson = (file: string) => {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return undefined;
  }
};

/** The key of an ElevenLabs server in an mcpServers map, the one named elevenlabs first. */
const keyIn = (servers: Servers) => {
  const entries = Object.entries(servers ?? {}).sort(([a], [b]) => Number(b === 'elevenlabs') - Number(a === 'elevenlabs'));
  for (const [name, s] of entries) {
    const runsIt = name === 'elevenlabs' || [s.command, ...(s.args ?? [])].some(a => /elevenlabs-mcp/.test(a ?? ''));
    const key = s.env?.ELEVENLABS_API_KEY?.trim();
    if (runsIt && key) return { key, server: name };
  }
};

export const desktopConfigFile = (home: string, platform: NodeJS.Platform, env: Env) =>
  platform === 'darwin'
    ? path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    : platform === 'win32'
      ? path.join(env.APPDATA ?? path.join(home, 'AppData', 'Roaming'), 'Claude', 'claude_desktop_config.json')
      : path.join(home, '.config', 'Claude', 'claude_desktop_config.json');

export function findElevenLabsKey(o: { env?: Env; home?: string; platform?: NodeJS.Platform; cwd?: string } = {}): KeySource | undefined {
  const env = o.env ?? process.env;
  const home = o.home ?? os.homedir();
  const shown = (file: string) => (file.startsWith(home + path.sep) ? `~${file.slice(home.length)}` : file);

  const fromEnv = env.ELEVENLABS_API_KEY?.trim();
  if (fromEnv) return { key: fromEnv, from: 'the ELEVENLABS_API_KEY environment variable' };

  const codeFile = env.CLAUDE_CONFIG_DIR ? path.join(env.CLAUDE_CONFIG_DIR, '.claude.json') : path.join(home, '.claude.json');
  const code = readJson(codeFile);
  const user = keyIn(code?.mcpServers);
  if (user) return { key: user.key, from: `${shown(codeFile)} (the ${user.server} MCP, all projects)` };
  for (let dir = path.resolve(o.cwd ?? env.INIT_CWD ?? process.cwd()); ; dir = path.dirname(dir)) {
    const local = keyIn(code?.projects?.[dir]?.mcpServers);
    if (local) return { key: local.key, from: `${shown(codeFile)} (the ${local.server} MCP, added for ${shown(dir)})` };
    if (path.dirname(dir) === dir) break;
  }

  const desktopFile = desktopConfigFile(home, o.platform ?? process.platform, env);
  const desktop = keyIn(readJson(desktopFile)?.mcpServers);
  if (desktop) return { key: desktop.key, from: `${shown(desktopFile)} (the ${desktop.server} MCP)` };
}

/** What to tell the person when there is no key: where to make it and where to paste it. */
export const NO_KEY = [
  'No ElevenLabs API key found. The first choice needs none: the ElevenLabs connector (creative_transcribe_audio,',
  'then --save). For --yes, the scripts use the ElevenLabs MCP\'s key, pasted in one place:',
  `  1. Make one at ${KEYS_PAGE} (Developers > API Keys). "Restrict Key" is on by default: turn it off,`,
  '     or allow Speech to Text (and User read, for the credits left). Copy it: ElevenLabs shows it only once.',
  '  2. Paste it where the ElevenLabs MCP reads it:',
  '     - Claude Code: ask Claude to set up the ElevenLabs MCP and paste the key when it asks, or run',
  '       claude mcp add --scope user elevenlabs -e ELEVENLABS_API_KEY=<your key> -- uvx elevenlabs-mcp',
  '       (it is kept in ~/.claude.json, under mcpServers > elevenlabs > env)',
  '     - Claude Desktop: claude_desktop_config.json, under mcpServers > elevenlabs > env > ELEVENLABS_API_KEY',
  '  Or, for this terminal only: export ELEVENLABS_API_KEY=<your key>',
].join('\n');

const failure = async (res: Response) => {
  const text = await res.text();
  let detail: unknown = text;
  try {
    detail = JSON.parse(text).detail ?? text;
  } catch {}
  const message =
    typeof detail === 'string' ? detail : (detail as { message?: string })?.message ?? (Array.isArray(detail) ? detail.map(d => d?.msg).join('; ') : JSON.stringify(detail));
  return `ElevenLabs answered ${res.status}: ${message}`;
};

/** Credits left this month, or undefined when the key may not read the subscription. */
export async function creditsLeft(key: string): Promise<{ left: number; limit: number } | undefined> {
  try {
    const res = await fetch(`${API}/user/subscription`, { headers: { 'xi-api-key': key } });
    if (!res.ok) return undefined;
    const s = (await res.json()) as { character_count: number; character_limit: number };
    return { left: s.character_limit - s.character_count, limit: s.character_limit };
  } catch {
    return undefined;
  }
}

export type ScribeWord = { text: string; start: number; end: number; type: 'word' | 'spacing' | 'audio_event'; speaker_id?: string; logprob?: number };
export type ScribeResult = { language_code: string; language_probability: number; text: string; words: ScribeWord[] };

export type ScribeOptions = { model?: string; language?: string; letters?: boolean };

/** Scribe on one audio file: every word with its start and end seconds (and every letter's with letters). */
export async function scribe(key: string, file: string, o: ScribeOptions = {}): Promise<ScribeResult> {
  const form = new FormData();
  form.append('model_id', o.model ?? 'scribe_v1');
  form.append('timestamps_granularity', o.letters ? 'character' : 'word');
  form.append('tag_audio_events', 'false');
  if (o.language) form.append('language_code', o.language);
  form.append('file', await fs.openAsBlob(file), path.basename(file));
  const res = await fetch(`${API}/speech-to-text`, { method: 'POST', headers: { 'xi-api-key': key }, body: form });
  if (!res.ok) {
    const why = await failure(res);
    throw new Error(
      res.status === 401
        ? `${why}\nThe key was refused: check it at ${KEYS_PAGE} (a restricted key needs Speech to Text allowed).`
        : why,
    );
  }
  return (await res.json()) as ScribeResult;
}
