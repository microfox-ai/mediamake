import { readFile, rename, rm, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MediamakeApiError, type MediamakeClient } from '../../../mediamake-mcp/src/client.js';
import { json, safe } from '../../../mediamake-mcp/src/util.js';
import { downloadFile, mapLimit, putFile, sha256File, within } from '../files.js';
import { READ, WRITE } from './annotations.js';

/**
 * The Cloud Library (apps/mediamake/lib/cloud-library, docs/library.md): what a space reuses, kept as
 * collections of entries (a channel's songs with their masters, words, release details and links).
 * The routes are /api/library, /api/library/entries and /api/library/files; `mm library` does the
 * same on a computer with the MediaMake repo, and also shares, trashes and starts collections.
 */
const ROUTE = '/api/library';
const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
const REF = /^[a-z0-9][a-z0-9-]{0,79}\/[a-z0-9][a-z0-9-]{0,79}$/;
/** Text files are looked through for private details before they go up, up to this size. */
const TEXT_EXT = new Set(['json', 'txt', 'md', 'srt', 'vtt', 'lrc', 'csv']);
const SCAN_BYTES = 5_000_000;

const projectId = z.string().describe('The space whose Library it is (list_projects, or list_library). Your personal space has one too.');
const slug = (what: string) => z.string().regex(SLUG, `${what}: lowercase letters, digits and dashes`);
const ref = z
  .string()
  .regex(REF, 'an entry: <collection>/<entry>, e.g. songs/nakama')
  .describe('The entry, as its card names it after "id": <collection>/<entry>, e.g. songs/nakama. A collection another space shares goes by its id here (songs, or songs-<who shares it>)');

/** The route with its query. A list is sent once per value (where, has, lacks). */
function at(route: string, params: Record<string, unknown> = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) for (const v of [value].flat()) if (v !== undefined && v !== null && v !== '' && v !== false) query.append(key, String(v));
  const text = query.toString();
  return `${ROUTE}${route}${text ? `?${text}` : ''}`;
}

/** The Library's own words for a refusal, without the request line in front. */
async function ask<T = any>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    const said = error instanceof MediamakeApiError ? (error.body as { error?: string } | undefined)?.error : undefined;
    if (said) throw new Error(said);
    throw error;
  }
}

/**
 * Private details a text or JSON file should not carry into a shared place: what was found, never
 * the value. The same check as `mm library save` (tools/library.mjs).
 */
export function privateDetails(content: string): string[] {
  const found: string[] = [];
  const count = (pattern: RegExp) => (content.match(pattern) ?? []).length;
  const say = (n: number, one: string, many: string) => void (n && found.push(`${n} ${n === 1 ? one : many}`));
  say(count(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi), 'email address', 'email addresses');
  say(count(/\b(sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16}|xox[baprs]-[A-Za-z0-9-]{10,})\b/g) + count(/-----BEGIN [A-Z ]*PRIVATE KEY-----/g), 'thing that looks like a key or a token', 'things that look like keys or tokens');
  say(count(/"(password|passwd|secret|api[_-]?key|access[_-]?token)"\s*:\s*"[^"]{4,}"/gi), 'password or key field', 'password or key fields');
  say(count(/(\/Users\/|\/home\/|[A-Z]:\\Users\\)[^\s"']+/g), 'path on a computer', 'paths on a computer');
  say(count(/(?<![\d.])\+\d[\d\s().-]{8,16}\d(?![\d.])/g), 'phone number', 'phone numbers');
  return found;
}

interface StoredFile {
  slot: string;
  name: string;
  size: number;
  sha256: string;
  url: string;
}

/** A file's SHA-256, or null when nothing is there. */
const shaAt = async (abs: string) => ((await stat(abs).catch(() => null))?.isFile() ? sha256File(abs) : null);

export function registerLibraryTools(server: McpServer, client: MediamakeClient) {
  server.registerTool(
    'list_library',
    {
      title: 'List the Library',
      description:
        "The Cloud Library: what a space reuses, kept as collections of entries (a channel's songs with their masters, lyrics, transcripts, release details and links). Without projectId: every space whose Library you can open, with its collections and how many entries each holds. With projectId: that space's collections in full, and with `collection` only that one: its fields (which are never guessed), its file slots, the spellings its lists already use, its guide and the owner's preferences. Read a collection this way before saving to it. A collection marked `shared` is another space's live collection, not a copy.",
      inputSchema: { projectId: projectId.optional(), collection: slug("A collection's id").optional().describe('Only this collection, in full (needs projectId)') },
      annotations: READ,
    },
    safe(async ({ projectId, collection }) => {
      if (!projectId) {
        if (collection) throw new Error('Which space is that collection in? Give projectId too.');
        return json(await ask(() => client.get(at(''))));
      }
      const view = await ask(() => client.get(at('', { space: projectId })));
      if (!collection) return json(view);
      const found = (view.collections as { slug: string }[]).find(c => c.slug === collection);
      if (!found) throw new Error(`No collection ${collection} in the ${view.space?.name ?? ''} space. It has: ${(view.collections as { slug: string }[]).map(c => c.slug).join(', ') || 'none yet'}.`);
      return json({ space: view.space, collection: found });
    }),
  );

  server.registerTool(
    'search_library',
    {
      title: 'Search the Library',
      description:
        'Search the Library by words and by what an entry has. Answers with cards (a few lines each: title, id, the short fields, which files it holds): nothing is downloaded. Without projectId it looks through every space you can open. Then get_library_entry for one entry, read_library_entry for a text, and fetch_library_files only for the files the work really needs. Every search is counted.',
      inputSchema: {
        query: z.string().max(200).optional().describe('Words from the title, the fields or the lyrics'),
        projectId: projectId.optional(),
        collection: slug("A collection's id").optional(),
        where: z.record(z.string(), z.string()).optional().describe('Fields that must be exactly this: { "use": "released", "language": "english" }'),
        has: z.array(slug('A file slot')).optional().describe('File slots that must hold a file: ["transcript"]'),
        lacks: z.array(slug('A file slot')).optional().describe('File slots that must be empty: ["stems"]'),
        limit: z.number().int().min(1).max(200).optional(),
        place: z.string().max(60).optional().describe('This computer, by the name its owner gave it (for the usage lines)'),
      },
      annotations: READ,
    },
    safe(async ({ query, projectId, collection, where, has, lacks, limit, place }) =>
      json(await ask(() => client.get(at('/entries', { q: query ?? '', space: projectId, collection, where: Object.entries(where ?? {}).map(([key, value]) => `${key}=${value}`), has, lacks, limit, device: place })))),
    ),
  );

  server.registerTool(
    'get_library_entry',
    {
      title: 'Get a Library entry',
      description: "One entry in full: every field, its files by slot (name, size, SHA-256, what each was made from), its history and its latest numbers. No file is downloaded and no link is made.",
      inputSchema: { projectId, ref },
      annotations: READ,
    },
    safe(async ({ projectId, ref }) => json(await ask(() => client.get(at('/entries', { space: projectId, ref }))))),
  );

  server.registerTool(
    'read_library_entry',
    {
      title: 'Read a text of a Library entry',
      description:
        "Read a field's text (lyrics) or a text or JSON file in a slot (transcript), whole or a part of it: lines, or the seconds of a timed transcript. Nothing is downloaded to this computer. Use this instead of fetching a file only to read it.",
      inputSchema: {
        projectId,
        ref,
        what: slug('A field or a file slot').describe('The field (lyrics) or the file slot (transcript) to read'),
        lines: z.string().regex(/^\d+-\d+$/, 'lines as first-last: 1-40').optional().describe('Only these lines: "1-40"'),
        fromSeconds: z.number().min(0).optional().describe('Of a timed transcript: from this second'),
        toSeconds: z.number().min(0).optional().describe('Of a timed transcript: to this second'),
        place: z.string().max(60).optional(),
      },
      annotations: READ,
    },
    safe(async ({ projectId, ref, what, lines, fromSeconds, toSeconds, place }) => json(await ask(() => client.get(at('/files', { space: projectId, ref, read: what, lines, from: fromSeconds, to: toSeconds, device: place }))))),
  );

  server.registerTool(
    'fetch_library_files',
    {
      title: 'Fetch Library files',
      description:
        "Download an entry's files into a folder on this computer, each checked against its SHA-256. Name the slots the work needs (master, artwork); without `slots` every file of the entry comes. A file already there with the same content is left, and one that differs is never replaced unless `replace` is true. Every fetch is counted, so search and read first. Before paying for a result again (a transcript, stems), ask library_made_from.",
      inputSchema: {
        projectId,
        ref,
        saveTo: z.string().describe('A folder on this computer to download into'),
        slots: z.array(slug('A file slot')).optional().describe('Only the files in these slots'),
        replace: z.boolean().optional().describe('Replace a file there that differs. Only when the user says so'),
        place: z.string().max(60).optional(),
      },
      annotations: WRITE,
    },
    safe(async ({ projectId, ref, saveTo, slots, replace, place }) => {
      const got = await ask(() => client.get<{ title: string; files: StoredFile[] }>(at('/files', { space: projectId, ref, slots: slots?.join(','), device: place })));
      const saved: Record<string, unknown>[] = [];
      const failed: { name: string; reason: string }[] = [];
      await mapLimit(got.files, 3, async file => {
        const dest = within(saveTo, basename(file.name));
        try {
          const there = await shaAt(dest);
          if (there === file.sha256) return void saved.push({ slot: file.slot, name: file.name, path: dest, alreadyThere: true });
          if (there && !replace) return void failed.push({ name: file.name, reason: `${dest} is there and differs from the Library's file. Nothing was replaced: move it, or ask the user and pass replace.` });
          const part = `${dest}.fetching`;
          await downloadFile(file.url, part);
          if ((await sha256File(part)) !== file.sha256) {
            await rm(part, { force: true });
            return void failed.push({ name: file.name, reason: 'It arrived damaged (its SHA-256 differs): try again.' });
          }
          await rename(part, dest);
          saved.push({ slot: file.slot, name: file.name, path: dest, size: file.size, sha256: file.sha256 });
        } catch (error) {
          failed.push({ name: file.name, reason: (error as Error).message });
        }
      });
      return json({ ref, title: got.title, saveTo: resolve(saveTo), saved, failed });
    }),
  );

  server.registerTool(
    'library_made_from',
    {
      title: 'What was made from a file',
      description:
        "Ask the Library what was already made from an exact file, before paying to make it again: the transcript of this master, the stems of this mix. Give the file on this computer (or its SHA-256); the answer lists the entries that hold such a result, with the tool and settings it was made with. Without `settings` only results made with the tool's default settings fit. Cards only: fetch_library_files brings one down.",
      inputSchema: {
        filePath: z.string().optional().describe('The source file on this computer'),
        sha256: z.string().regex(/^[0-9a-f]{64}$/i).optional().describe("The source file's SHA-256, instead of filePath"),
        slot: slug('A file slot').optional().describe('Only results in this slot: "transcript"'),
        tool: z.string().max(80).optional().describe('Only results made with this tool'),
        settings: z.string().max(200).optional().describe('The settings the result must have been made with'),
        projectId: projectId.optional().describe('Only this space. Left out: every space you can open'),
        place: z.string().max(60).optional(),
      },
      annotations: READ,
    },
    safe(async ({ filePath, sha256, slot, tool, settings, projectId, place }) => {
      if (!filePath === !sha256) throw new Error('Made from which file? Give filePath or sha256, one of the two.');
      const source = sha256?.toLowerCase() ?? (await shaAt(resolve(filePath!)));
      if (!source) throw new Error(`Not a file: ${filePath}`);
      return json({ sha256: source, ...(await ask(() => client.get(at('/files', { madeFrom: source, space: projectId, slot, tool, params: settings, device: place })))) });
    }),
  );

  server.registerTool(
    'save_library_entry',
    {
      title: 'Save a Library entry',
      description:
        "Add an entry to a collection, or change one (give `entry`). NEVER save without the person's yes: call it first without `yes`. Nothing is saved then: the answer has the one sentence to ask (\"Add the new song … to the Songs collection of the … space (cloud)?\"), what would change, the warnings, and any private details found in the files. Show the person those, and call again with `yes: true` only after they agree. Read the collection first (list_library with its id) for where each field comes from. Never guess an ISRC, a release date, a link or a credit: leave a field out. Nothing is required. A song has one master, one lyrics and one transcript: replacing one is the owner's decision. Never a key or a password in a field or a file. Owners and editors only; a shared collection only when its owner named this space an editor.",
      inputSchema: {
        projectId,
        collection: slug("A collection's id"),
        entry: slug("An entry's id").optional().describe('The entry to change. Left out: a new entry, named by its title'),
        fields: z.record(z.string(), z.unknown()).optional().describe('The fields to set, by key. null empties one. Only what you were given'),
        files: z
          .array(
            z.object({
              slot: slug('A file slot'),
              path: z.string().describe('The file on this computer'),
              madeFrom: z
                .object({ slot: slug('A file slot').describe('The slot of the file it was made from (master)'), tool: z.string().max(80).optional(), settings: z.string().max(200).optional() })
                .optional()
                .describe('What this file was made from, so nobody pays for it again: a transcript made from the master'),
            }),
          )
          .max(40)
          .optional(),
        rev: z.number().int().optional().describe("The entry's revision you read, so a change made meanwhile is not overwritten"),
        yes: z.boolean().optional().describe('True only after the person agreed to the sentence a call without it gave'),
        privateOk: z.boolean().optional().describe('True only when the person said the private details found may go up'),
        place: z.string().max(60).optional(),
      },
      annotations: WRITE,
    },
    safe(async ({ projectId, collection, entry, fields, files, rev, yes, privateOk, place }) => {
      const findings: string[] = [];
      const local = await mapLimit(files ?? [], 3, async file => {
        const abs = resolve(file.path);
        const info = await stat(abs).catch(() => null);
        if (!info?.isFile()) throw new Error(`Not a file: ${file.path}`);
        const name = basename(abs);
        if (TEXT_EXT.has(name.toLowerCase().split('.').pop() ?? '') && info.size <= SCAN_BYTES) {
          const found = privateDetails(await readFile(abs, 'utf8'));
          if (found.length) findings.push(`${name}: ${found.join(', ')}`);
        }
        return { slot: file.slot, abs, name, size: info.size, sha256: await sha256File(abs), madeFrom: file.madeFrom };
      });
      const body = { space: projectId, collection, ...(entry && { slug: entry }), fields: fields ?? {}, ...(rev !== undefined && { rev }), agent: true, ...(place && { device: place }) };
      const named = local.map(f => ({ slot: f.slot, sha256: f.sha256, name: f.name, size: f.size }));

      const dry = await ask(() => client.post(`${ROUTE}/entries`, { ...body, files: named, dry: true }));
      const blocked = findings.length > 0 && !privateOk;
      if (!yes || blocked) {
        return json({
          saved: false,
          ask: dry.ask,
          created: dry.created,
          ref: dry.ref,
          changes: dry.changes,
          warnings: dry.warnings,
          ...(findings.length && { privateDetails: findings }),
          next: blocked
            ? 'Private details were found in the files above. Everyone on the space can read them: tell the person what was found. Take them out, or pass privateOk only when the person says they may go up.'
            : 'Nothing was saved. Show the person the sentence and what would change, and call again with yes: true only after they agree.',
        });
      }

      if (local.length) {
        const started = await ask(() => client.post<{ uploads: { sha256: string; uploadUrl: string; headers: Record<string, string> }[] }>(`${ROUTE}/files`, { action: 'start', space: projectId, collection, files: local.map(f => ({ sha256: f.sha256, size: f.size, name: f.name })) }));
        await mapLimit(started.uploads, 3, async upload => {
          const file = local.find(f => f.sha256 === upload.sha256);
          if (!file) return;
          await putFile(upload.uploadUrl, file.abs, file.size, upload.headers).catch(error => {
            throw new Error(`Storage refused ${file.name} (${(error as Error).message}). Nothing was saved to the entry: call again, files that arrived are not sent twice.`);
          });
        });
        await ask(() => client.post(`${ROUTE}/files`, { action: 'finish', space: projectId, collection, sha256s: local.map(f => f.sha256), ...(place && { device: place }) }));
      }

      // a file made from one that is not in this save names the one the entry already holds
      const inSave = (slot: string) => local.find(f => f.slot === slot)?.sha256;
      let held: { slots?: Record<string, { sha256: string }[]> } | null = null;
      if (entry && local.some(f => f.madeFrom && !inSave(f.madeFrom.slot))) held = (await ask(() => client.get(at('/entries', { space: projectId, ref: `${collection}/${entry}` })))).entry;
      const withSources = local.map(f => {
        const source = f.madeFrom && (inSave(f.madeFrom.slot) ?? held?.slots?.[f.madeFrom.slot]?.[0]?.sha256);
        if (f.madeFrom && !source) throw new Error(`madeFrom: there is no file in ${f.madeFrom.slot} to say ${f.name} was made from.`);
        return { slot: f.slot, sha256: f.sha256, name: f.name, ...(source && { madeFrom: { sha256: source, ...(f.madeFrom!.tool && { tool: f.madeFrom!.tool }), ...(f.madeFrom!.settings && { params: f.madeFrom!.settings }) } }) };
      });
      const saved = await ask(() => client.post(`${ROUTE}/entries`, { ...body, files: withSources }));
      return json({ saved: true, ref: saved.ref, created: saved.created, changed: saved.changed, warnings: saved.warnings, entry: saved.entry });
    }),
  );
}
