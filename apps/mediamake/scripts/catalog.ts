#!/usr/bin/env node

/**
 * Release and access CLI for the MediaMake catalog (skills, MCPs, apps,
 * tutorials). Packages are uploaded to private storage through the admin
 * API, so nothing you release here is ever committed to the repository.
 *
 * Needs, in .env.local or the environment:
 *   MEDIAMAKE_URL        e.g. https://mediamake.example.com (default http://localhost:3000)
 *   MEDIAMAKE_ADMIN_KEY  an API key whose client has isAdmin=true
 *
 * Usage: npm run catalog -- <command> [...]
 *   release <dir|file.mcpb> [--manifest catalog.json] [--stage private|network|public] [--version 1.0.0] [--kind skill] [--slug name] [--status live|beta|coming-soon] [--notes "..."]
 *   promote <itemId> <private|network|public>
 *   grant   <itemId|*> (--to <clientId> | --group <groupId>) [--days 30] [--note "..."]
 *   revoke  <itemId|*> (--to <clientId> | --group <groupId>)   |   revoke --grant <grantId>
 *   group   add|remove <groupId> <clientId> [<clientId>...]
 *   invite  [<itemId>...] [--group network] [--uses 5] [--days 30] [--expires 14] [--note "..."]
 *   requests
 *   approve <requestId> [--days 30]
 *   reject  <requestId>
 *   list
 *   init
 */

import { config } from 'dotenv';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, extname, isAbsolute, join, resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

const BASE_URL = (process.env.MEDIAMAKE_URL || 'http://localhost:3000').replace(/\/$/, '');
const ADMIN_KEY = process.env.MEDIAMAKE_ADMIN_KEY || process.env.DEV_API_KEY || '';

const USAGE = `Usage: npm run catalog -- <command> [...]
  release <dir|file.mcpb> [--manifest catalog.json] [--stage private|network|public] [--version 1.0.0] [--kind skill] [--slug name] [--status live|beta|coming-soon] [--notes "..."]
  promote <itemId> <private|network|public>
  grant   <itemId|*> (--to <clientId> | --group <groupId>) [--days 30] [--note "..."]
  revoke  <itemId|*> (--to <clientId> | --group <groupId>)  |  revoke --grant <grantId>
  group   add|remove <groupId> <clientId> [<clientId>...]
  invite  [<itemId>...] [--group network] [--uses 5] [--days 30] [--expires 14] [--note "..."]
  requests | approve <requestId> [--days 30] | reject <requestId>
  list | init`;

type Flags = Record<string, string | true>;

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  const flags: Flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        flags[name] = next;
        i++;
      } else flags[name] = true;
    } else positional.push(arg);
  }
  return { positional, flags };
}

function flag(flags: Flags, name: string): string | undefined {
  const value = flags[name];
  return typeof value === 'string' ? value : undefined;
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

async function admin<T = any>(body: Record<string, unknown>): Promise<T> {
  if (!ADMIN_KEY) fail('Set MEDIAMAKE_ADMIN_KEY to an admin API key.');
  const res = await fetch(`${BASE_URL}/api/admin/catalog`, {
    method: body.type ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${ADMIN_KEY}`, 'Content-Type': 'application/json' },
    body: body.type ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) fail(`${body.type ?? 'list'}: ${json.error ?? res.statusText}`);
  return json as T;
}

/** Paths are relative to where you ran npm, not to apps/mediamake. */
function userPath(path: string) {
  return isAbsolute(path) ? path : resolve(process.env.INIT_CWD || process.cwd(), path);
}

/** Reads `name`, `description` and `version` from SKILL.md front matter. */
function readFrontMatter(file: string): Record<string, string> {
  const text = readFileSync(file, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const out: Record<string, string> = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_-]+)\s*:\s*(.*)$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}

function titleCase(slug: string) {
  return slug.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Reads manifest.json out of an .mcpb bundle (a zip), if `unzip` is available. */
function readMcpbManifest(file: string): Record<string, any> {
  try {
    return JSON.parse(execFileSync('unzip', ['-p', file, 'manifest.json'], { encoding: 'utf8' }));
  } catch {
    return {};
  }
}

async function release(pathArg: string | undefined, flags: Flags) {
  if (!pathArg) fail('release needs a folder or an .mcpb file, e.g. release private/skills/lyric-video');
  const source = userPath(pathArg);
  if (!existsSync(source)) fail(`${source} does not exist`);

  // A bare .mcpb file is released as a package holding just that file, plus
  // <name>.catalog.json and <name>.INSTALL.md from beside it when present.
  const isBundle = statSync(source).isFile();
  if (isBundle && extname(source) !== '.mcpb') fail(`${source} is a file; pass a folder or an .mcpb bundle`);
  const work = mkdtempSync(join(tmpdir(), 'mediamake-release-'));
  const dir = isBundle ? join(work, 'package') : source;
  if (isBundle) {
    mkdirSync(dir);
    copyFileSync(source, join(dir, basename(source)));
  }

  const manifestPath =
    flag(flags, 'manifest') !== undefined
      ? userPath(flag(flags, 'manifest')!)
      : isBundle
        ? source.replace(/\.mcpb$/, '.catalog.json')
        : join(dir, 'catalog.json');
  if (isBundle && existsSync(manifestPath)) copyFileSync(manifestPath, join(dir, 'catalog.json'));
  const installGuide = source.replace(/\.mcpb$/, '.INSTALL.md');
  if (isBundle && existsSync(installGuide)) copyFileSync(installGuide, join(dir, 'INSTALL.md'));
  // catalog.json overrides anything read from SKILL.md or the .mcpb manifest.
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
  const skillMd = join(dir, 'SKILL.md');
  const bundle = readdirSync(dir).find(f => f.endsWith('.mcpb'));
  const front = existsSync(skillMd)
    ? readFrontMatter(skillMd)
    : bundle
      ? (({ name, version, description, display_name }) => ({ name, version, description, title: display_name }))(
          readMcpbManifest(join(dir, bundle)),
        )
      : {};

  const kind =
    flag(flags, 'kind') ?? manifest.kind ?? (existsSync(skillMd) ? 'skill' : bundle ? 'mcp' : undefined);
  if (!kind) fail('Could not tell the kind; add --kind skill|mcp|app|tutorial or a catalog.json');
  const slug = flag(flags, 'slug') ?? manifest.slug ?? front.name ?? basename(source, '.mcpb');
  const version = flag(flags, 'version') ?? manifest.version ?? front.version;
  if (!version) fail('No version; pass --version 1.0.0 or set "version" in catalog.json, SKILL.md or the .mcpb');
  const visibility = flag(flags, 'stage') ?? manifest.visibility;
  const itemId = `${kind}/${slug}`;
  const install = bundle && !manifest.install?.entry
    ? { method: 'mcpb', ...manifest.install, entry: bundle }
    : manifest.install;

  console.log(`📦 Releasing ${itemId}@${version}${visibility ? ` as ${visibility}` : ''}`);

  await admin({
    type: 'upsert_item',
    item: {
      kind,
      slug,
      title: manifest.title ?? front.title ?? titleCase(slug),
      summary: manifest.summary ?? front.description ?? '',
      visibility,
      status: flag(flags, 'status') ?? manifest.status,
      listed: manifest.listed,
      href: manifest.href,
      cover: manifest.cover,
      tags: manifest.tags,
      install,
    },
  });

  const { uploadUrl, storageKey } = await admin<{ uploadUrl: string; storageKey: string }>({
    type: 'create_upload',
    itemId,
    version,
  });

  const archive = join(work, `${slug}-${version}.tar.gz`);
  try {
    execFileSync('tar', [
      '--exclude=.git',
      '--exclude=node_modules',
      '--exclude=.DS_Store',
      '--exclude=.env*',
      '-czf',
      archive,
      '-C',
      dir,
      '.',
    ]);
    const bytes = readFileSync(archive);
    const sha256 = createHash('sha256').update(bytes).digest('hex');

    const put = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/gzip', 'x-amz-acl': 'private' },
      body: bytes,
    });
    if (!put.ok) fail(`Upload failed: ${put.status} ${await put.text()}`);

    await admin({ type: 'publish_version', itemId, version, storageKey, sha256, bytes: bytes.length, notes: flag(flags, 'notes') });
    console.log(`✅ ${itemId}@${version} published (${(bytes.length / 1024).toFixed(1)} KB, sha256 ${sha256.slice(0, 12)}…)`);
    console.log(`   Share access: npm run catalog -- invite ${itemId} --uses 5`);
  } finally {
    rmSync(work, { recursive: true, force: true });
  }
}

function subject(flags: Flags) {
  const clientId = flag(flags, 'to');
  const groupId = flag(flags, 'group');
  if (!clientId && !groupId) fail('Pass --to <clientId> or --group <groupId>');
  return { clientId, groupId };
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);
  const days = flag(flags, 'days') ? Number(flag(flags, 'days')) : undefined;

  switch (command) {
    case 'release':
      return release(positional[0], flags);

    case 'promote': {
      const [itemId, visibility] = positional;
      if (!itemId || !visibility) fail('promote <itemId> <private|network|public>');
      await admin({ type: 'set_visibility', itemId, visibility });
      return console.log(`✅ ${itemId} is now ${visibility}`);
    }

    case 'grant': {
      const itemId = positional[0];
      if (!itemId) fail("grant <itemId|'*'> --to <clientId>");
      const { grant } = await admin({ type: 'grant', itemId, ...subject(flags), days, note: flag(flags, 'note') });
      return console.log(`✅ Granted ${itemId} to ${grant.subject.kind} ${grant.subject.id}${grant.expiresAt ? ` until ${grant.expiresAt}` : ''} (${grant.grantId})`);
    }

    case 'revoke': {
      const grantId = flag(flags, 'grant');
      const result = grantId
        ? await admin({ type: 'revoke', grantId })
        : await admin({ type: 'revoke', itemId: positional[0] ?? fail('revoke <itemId> --to <clientId>'), ...subject(flags) });
      return console.log(`✅ Revoked ${result.revoked} grant(s)`);
    }

    case 'group': {
      const [action, groupId, ...clientIds] = positional;
      if (!['add', 'remove'].includes(action) || !groupId || !clientIds.length) fail('group add|remove <groupId> <clientId>...');
      await admin({ type: action === 'add' ? 'group_add' : 'group_remove', groupId, clientIds });
      return console.log(`✅ ${action === 'add' ? 'Added' : 'Removed'} ${clientIds.join(', ')} ${action === 'add' ? 'to' : 'from'} ${groupId}`);
    }

    case 'invite': {
      const { invite } = await admin({
        type: 'create_invite',
        itemIds: positional,
        groupId: flag(flags, 'group'),
        maxUses: flag(flags, 'uses') ? Number(flag(flags, 'uses')) : 1,
        grantDays: days,
        expiresInDays: flag(flags, 'expires') ? Number(flag(flags, 'expires')) : undefined,
        note: flag(flags, 'note'),
      });
      console.log(`✅ Invite ${invite.code} (${invite.maxUses} use${invite.maxUses === 1 ? '' : 's'})`);
      return console.log(`   ${BASE_URL}/access?code=${invite.code}`);
    }

    case 'requests': {
      const { requests } = await admin({});
      if (!requests.length) return console.log('No pending requests.');
      for (const r of requests) console.log(`${r.requestId}  ${r.clientId} → ${r.itemId}  ${r.message ?? ''}`);
      return;
    }

    case 'approve':
    case 'reject': {
      const requestId = positional[0] ?? fail(`${command} <requestId>`);
      await admin({ type: 'resolve_request', requestId, approve: command === 'approve', days });
      return console.log(`✅ ${command === 'approve' ? 'Approved' : 'Rejected'} ${requestId}`);
    }

    case 'list': {
      const { items, grants, groups } = await admin({});
      // Who has access, and how: every live grant is a record in access_grants.
      const describe = (g: any) =>
        `    ${g.subject.kind} ${g.subject.id}  ${g.expiresAt ? `until ${g.expiresAt.slice(0, 10)}` : 'no expiry'}` +
        `${g.inviteCode ? `  via invite ${g.inviteCode}` : ''}${g.note ? `  "${g.note}"` : ''}  (grant ${g.grantId})`;
      for (const item of items) {
        const itemGrants = grants.filter((g: any) => g.itemId === item.id);
        console.log(`${item.visibility.padEnd(8)} ${item.id}@${item.version ?? '-'}  ${itemGrants.length} grant(s)${item.listed === false ? '  [unlisted]' : ''}`);
        for (const g of itemGrants) console.log(describe(g));
      }
      const everything = grants.filter((g: any) => g.itemId === '*');
      if (everything.length) console.log('every item:');
      for (const g of everything) console.log(describe(g));
      for (const group of groups) console.log(`group ${group.groupId}: ${group.members.join(', ') || '(empty)'}`);
      return;
    }

    case 'init':
      await admin({ type: 'init_indexes' });
      return console.log('✅ Catalog indexes created');

    default:
      console.log(USAGE);
      if (command) process.exit(1);
  }
}

main().catch(error => fail(error instanceof Error ? error.message : String(error)));
