import { accessLevel, type Entitlements } from '@/lib/access';
import { catalogItemsDB } from './store';
import { createDownloadUrl } from './storage';
import type { CatalogItemRecord, InstallMethod, InstallRequirement } from './types';

/** How long the package links in a plan stay valid. */
const PLAN_LINK_SECONDS = 30 * 60;

/** One thing to install, in the order the installer should do them. */
export type InstallStep =
  | {
      type: 'repo';
      repo: string;
      cloneUrl: string;
      why?: string;
      requiredBy: string[];
    }
  | {
      type: 'github-release';
      repo: string;
      name: string;
      asset: string;
      kind: 'chrome-extension' | 'binary' | 'other';
      downloadUrl: string;
      guide?: string;
      requiredBy: string[];
    }
  | {
      type: 'item';
      id: string;
      kind: CatalogItemRecord['kind'];
      slug: string;
      title: string;
      version: string;
      method: InstallMethod;
      entry?: string;
      notes?: string;
      downloadUrl: string;
      sha256: string;
      requiredBy: string[];
    };

export type InstallPlan =
  | { ok: true; itemId: string; steps: InstallStep[]; linksExpireAt: string }
  | { ok: false; status: 404 | 409; error: string };

function defaultMethod(record: CatalogItemRecord): InstallMethod {
  if (record.install?.method) return record.install.method;
  if (record.kind === 'skill') return 'skill';
  if (record.kind === 'mcp') return 'mcpb';
  if (record.kind === 'app') return 'app';
  return 'manual';
}

function releaseUrl(req: Extract<InstallRequirement, { type: 'github-release' }>) {
  const base = `https://github.com/${req.repo}/releases`;
  return !req.tag || req.tag === 'latest'
    ? `${base}/latest/download/${req.asset}`
    : `${base}/download/${req.tag}/${req.asset}`;
}

/**
 * Resolves `itemId` and everything it requires into an ordered plan:
 * dependencies before the items that need them, each one once.
 *
 * Every catalog item in the chain must be one the viewer can open. A
 * dependency they cannot open fails the whole plan with a message naming
 * what to ask for (by id only if it is one they could see anyway).
 */
export async function buildInstallPlan(itemId: string, entitlements: Entitlements): Promise<InstallPlan> {
  const steps: InstallStep[] = [];
  const done = new Map<string, InstallStep>();
  const visiting = new Set<string>();

  const add = (key: string, step: InstallStep, by: string | null) => {
    const existing = done.get(key);
    if (existing) {
      if (by && !existing.requiredBy.includes(by)) existing.requiredBy.push(by);
      return;
    }
    if (by) step.requiredBy.push(by);
    done.set(key, step);
    steps.push(step);
  };

  async function visit(id: string, by: string | null): Promise<string | null> {
    if (done.has(`item:${id}`)) {
      add(`item:${id}`, done.get(`item:${id}`)!, by);
      return null;
    }
    if (visiting.has(id)) return `${id} depends on itself through ${[...visiting].join(' → ')}`;

    const record = await catalogItemsDB.get(id);
    if (!record || accessLevel(entitlements, record) === 'locked') {
      return by
        ? `${by} needs another item that isn't shared with you yet. Ask whoever shared ${by} to give you access to everything it needs.`
        : 'not-found';
    }
    const version = record.versions[record.versions.length - 1];
    if (!version) return `${id} has no published version yet.`;

    visiting.add(id);
    for (const req of record.install?.requires ?? []) {
      if (req.type === 'item') {
        const error = await visit(req.id, id);
        if (error) return error;
      } else if (req.type === 'repo') {
        add(
          `repo:${req.repo}`,
          { type: 'repo', repo: req.repo, cloneUrl: `https://github.com/${req.repo}.git`, why: req.why, requiredBy: [] },
          id,
        );
      } else {
        add(
          `release:${req.repo}:${req.asset}`,
          {
            type: 'github-release',
            repo: req.repo,
            name: req.name,
            asset: req.asset,
            kind: req.kind ?? 'other',
            downloadUrl: releaseUrl(req),
            guide: req.guide,
            requiredBy: [],
          },
          id,
        );
      }
    }
    visiting.delete(id);

    add(
      `item:${id}`,
      {
        type: 'item',
        id,
        kind: record.kind,
        slug: record.slug,
        title: record.title,
        version: version.version,
        method: defaultMethod(record),
        entry: record.install?.entry,
        notes: record.install?.notes,
        downloadUrl: await createDownloadUrl(
          version.storageKey,
          `${record.slug}-${version.version}.tar.gz`,
          PLAN_LINK_SECONDS,
        ),
        sha256: version.sha256,
        requiredBy: [],
      },
      by,
    );
    return null;
  }

  const error = await visit(itemId, null);
  if (error === 'not-found') return { ok: false, status: 404, error: 'Not found' };
  if (error) return { ok: false, status: 409, error };
  return {
    ok: true,
    itemId,
    steps,
    linksExpireAt: new Date(Date.now() + PLAN_LINK_SECONDS * 1000).toISOString(),
  };
}
