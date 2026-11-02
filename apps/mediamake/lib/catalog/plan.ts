import {
  USE_NEEDS,
  slugOf,
  type CatalogItemRecord,
  type CatalogVersion,
  type InstallMethod,
  type InstallRequirement,
  type InstallSource,
  type ItemUse,
  type MadeBy,
  type UseNeed,
} from './types';

/**
 * The install planner, without the database, storage or session around it
 * (lib/catalog/install wires those in), so it can be tested on its own.
 */

/** How long the package links in a plan stay valid. */
export const PLAN_LINK_SECONDS = 30 * 60;

interface StepBase {
  /** The items that need this step (for a choice's own step: the items that use it). */
  requiredBy: string[];
  /**
   * Set when the step is only there for choices the person may turn down:
   * install it when they said yes to at least one of these (InstallChoice ids).
   */
  forChoices?: string[];
}

/** One thing to install, in the order the installer should do them. */
export type InstallStep = StepBase &
  (
    | {
        type: 'repo';
        repo: string;
        cloneUrl: string;
        why?: string;
      }
    | {
        type: 'github-release';
        repo: string;
        name: string;
        asset: string;
        kind: 'chrome-extension' | 'binary' | 'other';
        downloadUrl: string;
        guide?: string;
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
      }
    | {
        /** An item with no package of ours, installed from where it lives (see InstallSource). */
        type: 'source';
        id: string;
        kind: CatalogItemRecord['kind'];
        slug: string;
        title: string;
        version?: string;
        madeBy?: MadeBy;
        source: InstallSource;
        notes?: string;
      }
  );

/** Why an item in the plan wants a choice. */
export interface ChoiceReason {
  /** The item being installed that uses it. */
  by: string;
  need: UseNeed;
  for: string;
  without: string;
}

/**
 * Something the items being installed work with (their `uses`), which the
 * person decides on: its steps carry `forChoices` with its id.
 */
export interface InstallChoice {
  id: string;
  title: string;
  /** The strongest need among its reasons. */
  need: UseNeed;
  reasons: ChoiceReason[];
  /** False when MediaMake can't install it for this person; `unavailable` says why, and none of its steps are in the plan. */
  available: boolean;
  unavailable?: string;
  madeBy?: MadeBy;
}

export type InstallPlan =
  | { ok: true; itemId: string; steps: InstallStep[]; choices: InstallChoice[]; linksExpireAt: string }
  | { ok: false; status: 404 | 409; error: string };

export interface PlanSources {
  /** An item's record (the catalog database's, else the repo's), or null. */
  getRecord(id: string): Promise<CatalogItemRecord | null>;
  /** Whether the person installing may open the item. */
  canOpen(record: CatalogItemRecord): boolean;
  /** A signed link to a stored package that lasts `seconds`. */
  downloadUrl(storageKey: string, filename: string, seconds: number): Promise<string>;
}

/** Said for a choice that isn't in the catalog or isn't shared with the person: the same words for both, so neither leaks. */
export const UNAVAILABLE =
  "MediaMake can't install it for you yet: it isn't shared with you, or isn't in the catalog. Ask whoever gave you MediaMake access (an invite link opens /access?code=…).";

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

/** The stronger of two needs (required > recommended > optional). */
function stronger(a: UseNeed, b: UseNeed): UseNeed {
  return USE_NEEDS.indexOf(a) <= USE_NEEDS.indexOf(b) ? a : b;
}

/**
 * Resolves `itemId` and everything it requires into an ordered plan:
 * dependencies before the items that need them, each one once.
 *
 * Every catalog item it requires must be one the person can open: a
 * dependency they cannot open fails the whole plan with a message naming
 * what to ask for (by id only if it is one they could see anyway).
 *
 * What those items use (`install.uses`, e.g. a skill's MCPs) comes back as
 * `choices`, each with what it is for and what the person loses without it,
 * and its steps (with their own dependencies) are in the plan marked
 * `forChoices`. A choice the person can't get from MediaMake is listed as
 * unavailable instead of failing the plan. Items installed only for a
 * choice don't bring choices of their own.
 */
export async function planInstall(itemId: string, sources: PlanSources): Promise<InstallPlan> {
  const records = new Map<string, Promise<CatalogItemRecord | null>>();
  const getRecord = (id: string) => {
    if (!records.has(id)) records.set(id, sources.getRecord(id));
    return records.get(id)!;
  };

  const steps: InstallStep[] = [];
  const done = new Map<string, InstallStep>();
  /** An item's step key → the keys of the steps it requires. */
  const deps = new Map<string, string[]>();
  const uses: { by: string; use: ItemUse }[] = [];

  /** Another choice needs a step that is only there for choices: so do the steps it requires. */
  const mark = (key: string, choice: string) => {
    const step = done.get(key);
    if (!step?.forChoices || step.forChoices.includes(choice)) return;
    step.forChoices.push(choice);
    for (const dep of deps.get(key) ?? []) mark(dep, choice);
  };

  /** Adds a step, or notes who else needs one already there; `choice` is set while resolving a choice. */
  const add = (key: string, step: InstallStep, by: string | null, choice: string | null) => {
    const existing = done.get(key);
    if (existing) {
      if (by && !existing.requiredBy.includes(by)) existing.requiredBy.push(by);
      if (choice) mark(key, choice);
      return;
    }
    if (by) step.requiredBy.push(by);
    if (choice) step.forChoices = [choice];
    done.set(key, step);
    steps.push(step);
  };

  // A choice that fails halfway leaves nothing behind.
  const snapshot = () => ({
    length: steps.length,
    state: new Map([...done].map(([key, step]) => [key, { requiredBy: [...step.requiredBy], forChoices: step.forChoices && [...step.forChoices] }])),
  });
  const restore = ({ length, state }: ReturnType<typeof snapshot>) => {
    steps.splice(length);
    for (const [key, step] of done) {
      const before = state.get(key);
      if (!before) {
        done.delete(key);
        continue;
      }
      step.requiredBy = before.requiredBy;
      if (before.forChoices) step.forChoices = before.forChoices;
      else delete step.forChoices;
    }
  };

  async function visit(id: string, by: string | null, choice: string | null, path: string[]): Promise<string | null> {
    const key = `item:${id}`;
    const known = done.get(key);
    if (known) {
      add(key, known, by, choice);
      return null;
    }
    if (path.includes(id)) return `${id} depends on itself through ${[...path, id].join(' → ')}`;

    const record = await getRecord(id);
    if (!record || !sources.canOpen(record)) {
      return by
        ? `${by} needs another item that isn't shared with you yet. Ask whoever shared ${by} to give you access to everything it needs.`
        : 'not-found';
    }
    const version: CatalogVersion | undefined = record.versions[record.versions.length - 1];
    const source = record.install?.source;
    if (!version && !source) return `${id} has no published version yet.`;

    const needs: string[] = [];
    for (const req of record.install?.requires ?? []) {
      if (req.type === 'item') {
        const error = await visit(req.id, id, choice, [...path, id]);
        if (error) return error;
        needs.push(`item:${req.id}`);
      } else if (req.type === 'repo') {
        needs.push(`repo:${req.repo}`);
        add(
          `repo:${req.repo}`,
          { type: 'repo', repo: req.repo, cloneUrl: `https://github.com/${req.repo}.git`, why: req.why, requiredBy: [] },
          id,
          choice,
        );
      } else {
        needs.push(`release:${req.repo}:${req.asset}`);
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
          choice,
        );
      }
    }
    deps.set(key, needs);
    if (!choice) for (const use of record.install?.uses ?? []) uses.push({ by: id, use });

    // A package of ours wins over a source when an item has both.
    const step: InstallStep = version
      ? {
          type: 'item',
          id,
          kind: record.kind,
          slug: record.slug,
          title: record.title,
          version: version.version,
          method: defaultMethod(record),
          entry: record.install?.entry,
          notes: record.install?.notes,
          downloadUrl: await sources.downloadUrl(version.storageKey, `${record.slug}-${version.version}.tar.gz`, PLAN_LINK_SECONDS),
          sha256: version.sha256,
          requiredBy: [],
        }
      : {
          type: 'source',
          id,
          kind: record.kind,
          slug: record.slug,
          title: record.title,
          ...(record.version && { version: record.version }),
          ...(record.madeBy && { madeBy: record.madeBy }),
          source: source!,
          ...(record.install?.notes && { notes: record.install.notes }),
          requiredBy: [],
        };
    add(key, step, by, choice);
    return null;
  }

  const error = await visit(itemId, null, null, []);
  if (error === 'not-found') return { ok: false, status: 404, error: 'Not found' };
  if (error) return { ok: false, status: 409, error };

  // What the items installed outright use, once each, strongest need first.
  const choices = new Map<string, InstallChoice>();
  for (const { by, use } of uses) {
    if (done.has(`item:${use.id}`)) continue; // installed outright anyway
    const reason: ChoiceReason = { by, need: use.need, for: use.for, without: use.without };
    const known = choices.get(use.id);
    if (known) {
      known.reasons.push(reason);
      known.need = stronger(known.need, use.need);
    } else {
      choices.set(use.id, { id: use.id, title: slugOf(use.id), need: use.need, reasons: [reason], available: false });
    }
  }
  // resolved strongest first, so a required MCP's steps come before an optional one's
  const ordered = [...choices.values()].sort((a, b) => USE_NEEDS.indexOf(a.need) - USE_NEEDS.indexOf(b.need));
  for (const choice of ordered) {
    const record = await getRecord(choice.id);
    if (!record || !sources.canOpen(record)) {
      choice.unavailable = UNAVAILABLE;
      continue;
    }
    choice.title = record.title;
    if (record.madeBy) choice.madeBy = record.madeBy;
    const before = snapshot();
    const failed = await visit(choice.id, null, choice.id, []);
    if (failed) {
      restore(before);
      choice.unavailable = failed === 'not-found' ? UNAVAILABLE : failed;
      continue;
    }
    choice.available = true;
    const own = done.get(`item:${choice.id}`)!;
    for (const reason of choice.reasons) if (!own.requiredBy.includes(reason.by)) own.requiredBy.push(reason.by);
  }

  return {
    ok: true,
    itemId,
    steps,
    choices: ordered,
    linksExpireAt: new Date(Date.now() + PLAN_LINK_SECONDS * 1000).toISOString(),
  };
}
