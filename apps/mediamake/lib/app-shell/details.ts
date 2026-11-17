import { slugOf } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';
import { linkedSummary, type LinkedItemView } from '@/lib/space/links';
import {
  deviceName,
  type SpaceItemView,
  type SpaceView,
} from '@/lib/space/space';
import type { MySpaces } from '@/lib/space/store';
import type { LocalOnly, MemberKind, Mine, MineItem, Used } from './member';

/**
 * What Mine's details dialog says about one skill, MCP or app: what it is,
 * when it was last used, what it belongs to, where it is stored, where it
 * stands and how it gets published. Everything but its SKILL.md, which
 * MediaMake never holds. Pure, so it can be tested: plain text and links,
 * made on the server and handed to the dialog by key.
 */

export interface DetailsStatus {
  label: string;
  tone: 'good' | 'warn' | 'bad' | 'plain';
  /** What it means for this item, in one line. */
  note?: string;
}

export interface ItemDetails {
  kind: MemberKind;
  /** Its folder name, e.g. `make-my-intro`. */
  name: string;
  title: string;
  summary?: string;
  version?: string;
  status: DetailsStatus[];
  used: string;
  belongs: string;
  stored: string[];
  publish: { text: string; command?: string };
  links: { label: string; href: string; external?: boolean }[];
}

/** The key each place an item is listed opens its details by. */
export const detailsKey = {
  catalog: (id: string) => `catalog:${id}`,
  space: (spaceId: string, itemKey: string) => `space:${spaceId}:${itemKey}`,
  linked: (id: string) => `linked:${id}`,
  local: (name: string) => `local:${name}`,
};

const DAY_MS = 24 * 60 * 60 * 1000;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });

/** `today`, `yesterday`, `5 days ago`, then the date. */
export function ago(iso: string, now: number): string {
  const days = Math.floor((now - Date.parse(iso)) / DAY_MS);
  if (!(days > 0)) return 'today';
  if (days === 1) return 'yesterday';
  return days < 30 ? `${days} days ago` : `on ${day(iso)}`;
}

/** `Used 3 days ago · 12 runs`: the line under an installed item. */
export function usedLine(used: Used | undefined, now: number): string {
  if (!used) return 'Not used lately';
  const unit = used.type === 'opens' ? 'open' : 'run';
  return `Used ${ago(used.at, now)} · ${used.count} ${unit}${used.count === 1 ? '' : 's'}`;
}

function usedText(
  used: Used | undefined,
  kind: MemberKind,
  now: number,
  days: number,
): string {
  if (!used) return `Not used in the last ${days} days.`;
  const count = `${used.count} ${used.type === 'opens' ? 'open' : 'run'}${used.count === 1 ? '' : 's'} in the last ${days} days`;
  return `Last used ${ago(used.at, now)}, ${count}${kind === 'mcp' ? ' of the skills that work with it' : ''}.`;
}

const computers = (on: { device: string; version?: string }[]) =>
  on
    .map(
      entry =>
        `${deviceName(entry.device)}${entry.version && !entry.version.startsWith('sha:') ? ` (v${entry.version.replace(/^v/, '')})` : ''}`,
    )
    .join(', ');

const names = (devices: { name: string }[]) =>
  devices.map(device => device.name).join(', ');

function syncStatus(item: SpaceItemView, space: SpaceView): DetailsStatus {
  if (item.sync === 'unsent')
    return {
      label: 'Not sent yet',
      tone: 'warn',
      note: `Changed on ${names(item.unsentOn)} and not sent to the space yet.`,
    };
  if (item.sync === 'behind')
    return {
      label: 'Update waiting',
      tone: 'warn',
      note: `${names(item.behindOn)} ${item.behindOn.length === 1 ? 'has' : 'have'} an older copy or none.`,
    };
  return {
    label: 'Up to date',
    tone: 'good',
    note:
      space.devices.length > 1
        ? `The same on all ${space.devices.length} computers.`
        : undefined,
  };
}

const submit = (name: string): ItemDetails['publish'] => ({
  text: `Ask Claude to "make ${name} public". It needs one finished production made with it, and an admin reviews it before it is in the store.`,
  command: `mm submit ${name}`,
});

function storedInSpace(space: SpaceView): string[] {
  return [
    `In the private GitHub repo ${space.repo}.`,
    ...(space.devices.length ? [`On ${names(space.devices)}.`] : []),
  ];
}

function ofCatalog(entry: MineItem, now: number, days: number): ItemDetails {
  const { item } = entry;
  const tier = tierLabel(item.tier);
  const status: DetailsStatus[] = [];
  if (item.failed)
    status.push({
      label: 'Failed',
      tone: 'bad',
      note: `It is broken right now. ${item.healthNote ?? 'No reason was given.'}`,
    });
  status.push(
    item.beta
      ? {
          label: 'Beta',
          tone: 'warn',
          note: 'Published, not yet proven by a finished production.',
        }
      : {
          label: 'Ready',
          tone: 'good',
          note: 'Proven by a finished production made with it.',
        },
  );
  if (entry.updateAvailable)
    status.push({
      label: 'Update out',
      tone: 'warn',
      note: `Version ${item.version} is out. Yours is older.`,
    });
  if (item.locked)
    status.push({
      label: `Needs ${item.opensWith}`,
      tone: 'plain',
      note: 'Your membership no longer opens it. What you installed keeps working, without updates.',
    });

  const stored: string[] = [];
  if (entry.on.length) stored.push(`On ${computers(entry.on)}.`);
  if (entry.installedAt)
    stored.push(
      `Installed ${day(entry.installedAt)}${entry.installedVersion ? `, version ${entry.installedVersion}` : ''}.`,
    );
  if (!stored.length)
    stored.push(
      item.kind === 'app'
        ? 'It runs in MediaMake. Nothing is installed.'
        : 'No computer has reported it yet.',
    );

  return {
    kind: item.kind,
    name: slugOf(item.id),
    title: item.title,
    ...(item.summary && { summary: item.summary }),
    ...(item.version && { version: item.version }),
    status,
    used: usedText(entry.used, item.kind, now, days),
    belongs: `The MediaMake store${item.madeBy?.name ? `, made by ${item.madeBy.name}` : ''}. ${item.tier === 'public' ? 'Open to everyone.' : `Opens with ${tier} and above.`}`,
    stored,
    publish: {
      text: 'It is published already. Its page is the link to share.',
    },
    links: [{ label: 'Open its page', href: item.page }],
  };
}

function ofSpaceItem(
  item: SpaceItemView,
  space: SpaceView,
  owner: { belongs: string; href?: string },
  used: Used | undefined,
  now: number,
  days: number,
): ItemDetails {
  return {
    kind: item.kind,
    name: item.name,
    title: item.title,
    ...(item.summary && { summary: item.summary }),
    ...(item.version && { version: item.version }),
    status: [
      syncStatus(item, space),
      { label: 'Private', tone: 'plain', note: 'Not in the store.' },
    ],
    used: usedText(used, item.kind, now, days),
    belongs: owner.belongs,
    stored: storedInSpace(space),
    publish: submit(item.name),
    links: [
      ...(owner.href ? [{ label: 'Open space', href: owner.href }] : []),
      ...(space.repoUrl
        ? [{ label: 'Open on GitHub', href: space.repoUrl, external: true }]
        : []),
    ],
  };
}

function ofLinked(
  item: LinkedItemView,
  used: Used | undefined,
  now: number,
  days: number,
): ItemDetails {
  const mine = item.role === 'owner';
  const own = item.space?.items.find(
    entry => entry.kind === item.kind && entry.name === item.name,
  );
  const through = item.direct
    ? 'Shared with you by name.'
    : `You have it through ${item.projects.map(project => project.name).join(', ') || 'a project'}.`;
  return {
    kind: item.kind,
    name: item.name,
    title: item.title,
    ...(item.summary && { summary: item.summary }),
    ...(item.version && { version: item.version }),
    status: [
      ...(own && item.space ? [syncStatus(own, item.space)] : []),
      {
        label: mine
          ? 'Yours'
          : item.role === 'editor'
            ? 'You can edit it'
            : 'You can use it',
        tone: 'plain',
        note: 'Private. Not in the store.',
      },
    ],
    used: usedText(used, item.kind, now, days),
    belongs: mine
      ? `You. Shared with ${linkedSummary(item)}.`
      : `${item.owner}. ${through}`,
    stored: [
      `In its own private GitHub repo, ${item.repo}.`,
      ...(item.space?.devices.length
        ? [`On ${names(item.space.devices)}.`]
        : []),
    ],
    publish: mine
      ? submit(item.name)
      : { text: `Only its owner, ${item.owner}, can publish it.` },
    links: item.repoUrl
      ? [{ label: 'Open on GitHub', href: item.repoUrl, external: true }]
      : [],
  };
}

function ofLocal(
  row: LocalOnly,
  used: Used | undefined,
  now: number,
  days: number,
): ItemDetails {
  return {
    kind: 'skill',
    name: row.name,
    title: row.name,
    status: [
      {
        label: 'Only on your computer',
        tone: 'warn',
        note: 'It is in no space, so other computers do not get it.',
      },
    ],
    used: usedText(used, 'skill', now, days),
    belongs: row.variantOf
      ? `You. It is your variant of ${row.variantOf}.`
      : 'You. It is in no space and not in the store.',
    stored: [
      row.on.length
        ? `On ${computers(row.on)}.`
        : 'No computer has reported it yet.',
    ],
    publish: submit(row.name),
    links: row.variantOf
      ? [{ label: `Open ${row.variantOf}`, href: `/skills/${row.variantOf}` }]
      : [],
  };
}

/**
 * The details of everything Mine lists, by detailsKey. `used` is
 * lib/app-shell/member › lastUsed; `days` is how far back it looks.
 */
export function mineDetails(
  mine: Mine,
  spaces: MySpaces | null,
  used: Map<string, Used>,
  now: number,
  days = 90,
): Record<string, ItemDetails> {
  const details: Record<string, ItemDetails> = {};
  const usedBy = (kind: string, name: string) => used.get(`${kind}/${name}`);

  for (const entry of mine.installed)
    details[detailsKey.catalog(entry.item.id)] = ofCatalog(entry, now, days);
  for (const row of [...mine.variants, ...mine.local])
    details[detailsKey.local(row.name)] = ofLocal(
      row,
      usedBy('skill', row.name),
      now,
      days,
    );

  const personal = spaces?.mine;
  if (personal) {
    const owner = {
      belongs: 'Your personal space. Only you have it.',
      ...(spaces?.personalProjectId && {
        href: `/app/spaces/${spaces.personalProjectId}`,
      }),
    };
    for (const item of personal.items)
      details[detailsKey.space(personal.id, item.key)] = ofSpaceItem(
        item,
        personal,
        owner,
        usedBy(item.kind, item.name),
        now,
        days,
      );
  }
  for (const project of spaces?.projects ?? []) {
    if (!project.space) continue;
    const owner = {
      belongs: `The ${project.name} project. Everyone on it has it.`,
      href: `/app/spaces/${project.projectId}`,
    };
    for (const item of project.space.items)
      details[detailsKey.space(project.space.id, item.key)] = ofSpaceItem(
        item,
        project.space,
        owner,
        usedBy(item.kind, item.name),
        now,
        days,
      );
  }
  for (const item of spaces?.linked ?? [])
    details[detailsKey.linked(item.id)] = ofLinked(
      item,
      usedBy(item.kind, item.name),
      now,
      days,
    );
  return details;
}
