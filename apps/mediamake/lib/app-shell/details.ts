import { galleryTiles, proofTile, type GalleryTile } from '@/lib/catalog/gallery';
import { INSTALL_GUIDE_URL, SETUP_PROMPT } from '@/lib/catalog/install-prompt';
import { headshotOf, listingBadges, type ListingBadge } from '@/lib/catalog/listing';
import type { ItemReadme } from '@/lib/catalog/readme';
import { needDependencies, type ReadmeCheck, type SkillDependency, type SkillDetailsView, type SkillFiles } from '@/lib/catalog/skill-profile';
import type { RatingSummary } from '@/lib/ratings/ratings';
import { itemPath } from '@/lib/catalog/summary';
import { slugOf } from '@/lib/catalog/types';
import { tierLabel } from '@/lib/memberships/tiers';
import { linkedSummary, type LinkedItemView } from '@/lib/space/links';
import { deviceOnly } from '@/lib/space/places';
import { placeHas, type PlaceRecord } from '@/lib/space/register';
import type { RunRecord } from '@/lib/space/runs';
import {
  deviceName,
  type SpaceItemView,
  type SpaceView,
} from '@/lib/space/space';
import type { MySpaces } from '@/lib/space/store';
import { needWords } from '@/lib/space/todos';
import type {
  AppItem,
  LocalOnly,
  MemberKind,
  Mine,
  MineItem,
  Used,
} from './member';
import { detailsKey } from './details-key';

/**
 * What the item page says about one skill, MCP or app, the same wherever
 * it is listed (components/app-shell/item-details): what it is and where it
 * stands, its place in the store, what it belongs to, who can use it and
 * which computers have it, the command that puts it on a computer, and what
 * was made with it. Everything but its SKILL.md, which MediaMake never
 * holds. Pure, so it can be tested: plain text and links, made on the
 * server (./details-data) and shown on its page (/app/item) by key.
 */

export interface DetailsStatus {
  label: string;
  tone: 'good' | 'warn' | 'bad' | 'plain';
  /** What it means for this item, in one line. */
  note?: string;
}

/** Something an item belongs to: a project or a space (a link to it), or a name. */
export interface DetailsLink {
  label: string;
  href?: string;
}

/** One computer or cloud environment, and where the item stands on it. */
export interface DetailsDevice {
  key: string;
  name: string;
  cloud?: boolean;
  /** `has`: the newest copy. `older`: an older one. `unsent`: changes not sent yet. `missing`: not on it. */
  state: 'has' | 'older' | 'unsent' | 'missing';
  /** "Has it (v1.2.0)", and what a step would miss there when the register knows. */
  note: string;
  /** The command that brings the item there, or up to date. None for a place that isn't the viewer's. */
  command?: string;
}

export interface ItemDetails {
  kind: MemberKind;
  /** Its folder name, e.g. `make-my-intro`. */
  name: string;
  title: string;
  summary?: string;
  version?: string;
  status: DetailsStatus[];
  /** None for a signed-out visitor. */
  used?: string;
  /** Its page in the store, the link to share. No `href`: it is private. */
  store: { href?: string; note: string };
  /** Where it is edited or released, for whoever may: a page to open, or a line to copy. */
  manage?: { label: string; href?: string; copy?: string; note?: string };
  belongs: DetailsLink[];
  /** Who can use it, in a few words. */
  people: string;
  devices: DetailsDevice[];
  /** How it gets onto a computer. `locked` says which membership opens it instead. */
  install?: {
    /** On a computer that has MediaMake and isn't listed under `devices`. */
    command: string;
    /** For a computer without MediaMake: the steps that set it up, then the command. */
    setup: string;
  };
  locked?: string;
  /** An app that runs in MediaMake: where it opens. */
  open?: string;
  /** What was made with it: productions, pictures and links. Never its trailer, which is `video`. */
  outputs: GalleryTile[];
  /** Its id in the store, when it is a store item the viewer can open: it can be rated and given feedback there. */
  itemId?: string;
  /** A store item's listing: what its cards and its About column show. A private item has none. */
  listing?: {
    /** Its headshot, a 16:9 picture: shown above the README when it opens with no video. */
    headshot?: string;
    /** An MCP's or an app's icon. */
    icon?: string;
    tags: string[];
    /** The membership that opens it, the version, its size and what it works with, after `status`. */
    badges: ListingBadge[];
    size?: { bytes: number; files?: number };
    deps?: number;
    rating?: RatingSummary;
  };
  /** Its intro video, played above the README when the README opens with none. */
  video?: { youtubeId: string; title?: string };
  /** Its README, the left side of its page (lib/catalog/readme). Added where the details are loaded (./details-data). */
  readme?: ItemReadme;
  /** The viewer may change a skill's details (its tags, nature and type): an admin for a store skill, its owner or an editor for a private one. */
  canEdit?: boolean;
  /** What it depends on: MCPs, apps and other skills. */
  depends?: SkillDependency[];
  /** A skill's details, its files and how its README stands against the guide. Added where the details are loaded (./details-data). */
  skill?: SkillDetailsView;
  files?: SkillFiles;
  readmeChecks?: ReadmeCheck[];
}

export { detailsKey } from './details-key';

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

const names = (devices: { name: string }[]) =>
  devices.map(device => device.name).join(', ');

const list = (words: string[]) =>
  words.length < 2
    ? words.join('')
    : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;

/** A version a person stated, as the dialog writes it. */
const v = (version?: string) =>
  version && !/^(sha|tree):/.test(version) && version !== 'new'
    ? ` (v${version.replace(/^v/, '')})`
    : '';

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

/* ---------- What goes in ---------- */

export interface DetailsInput {
  /** Every catalog item the viewer may see (./member › appItems). */
  items: AppItem[];
  /** What the viewer installed and what their computers reported. None signed out. */
  mine?: Mine | null;
  spaces?: MySpaces | null;
  /** ./member › lastUsed. */
  used?: Map<string, Used>;
  /** The viewer's own computers and cloud environments, from the access register (lib/space/register). */
  places?: PlaceRecord[];
  /** The runs of the viewer's projects (lib/space/runs), newest first. */
  runs?: RunRecord[];
  /** What an item needs to run, by item id (`skill/<name>`): its run sheet's words. */
  needs?: Map<string, string[]>;
  /** Where the viewer's store submissions stand, by item id. */
  submissions?: Map<string, string>;
  viewer?: { signedIn: boolean; isAdmin: boolean };
  now: number;
  /** How far back `used` looks. */
  days?: number;
}

/** One of the viewer's own computers, with what it can do when the register knows. */
interface Computer {
  label: string;
  name: string;
  can?: string[];
}

const labelOf = (deviceKey: string) =>
  deviceKey.slice(deviceKey.indexOf('/') + 1);

function computersOf(input: DetailsInput): Computer[] {
  const byLabel = new Map<string, Computer>();
  for (const place of input.places ?? [])
    if (place.kind === 'device')
      byLabel.set(place.label, {
        label: place.label,
        name: place.name ?? deviceName(place.label),
        can: place.can,
      });
  const add = (label: string, name = deviceName(label)) => {
    if (!byLabel.has(label)) byLabel.set(label, { label, name });
  };
  for (const device of input.mine?.devices ?? []) add(device.device);
  const spaces = [
    input.spaces?.mine,
    ...(input.spaces?.projects ?? []).map(project => project.space),
    ...(input.spaces?.linked ?? []).map(item => item.space),
  ];
  for (const space of spaces)
    for (const device of space?.devices ?? [])
      if (device.mine) add(labelOf(device.key), device.name);
  return [...byLabel.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** What a step would miss on a place, in words: "It has no ElevenLabs key." None when it has everything, or nobody knows. */
function missing(
  can: string[] | undefined,
  needs: string[],
  cloud = false,
): string {
  if (!can || !needs.length) return '';
  const lacks = needs.filter(need => !placeHas(can, need));
  if (!lacks.length) return '';
  if (cloud && lacks.every(deviceOnly))
    return ' Some steps need a computer.';
  return ` Some steps need ${list(lacks.map(needWords))}.`;
}

/** The one prompt that sets MediaMake up on a new computer and then gets the item. */
const setup = (command: string, first = '') =>
  `${first}${SETUP_PROMPT}. Then sign in with \`mm login\` (I will click Allow in the browser) and run \`${command}\`.`;

/* ---------- What was made with it ---------- */

const HTTPS = /^https:\/\/\S+$/;
const CLIP = /\.(mp4|webm)([?#]|$)/i;
const PICTURE = /\.(png|jpe?g|webp|gif|avif)([?#]|$)/i;

/**
 * What the viewer's projects made with a skill, from their runs: every
 * link a step saved (a YouTube link plays, a clip or a picture shows), and
 * a run with none as a tile that opens its project. The newest first.
 */
export function runTiles(
  runs: RunRecord[],
  skill: string,
  projects: Map<string, string> = new Map(),
  limit = 12,
): GalleryTile[] {
  const tiles: GalleryTile[] = [];
  const seen = new Set<string>();
  for (const run of runs) {
    if (run.skill !== skill || run.state === 'cancelled') continue;
    const title = run.title ?? run.slug;
    const links = run.steps
      .map(step => step.output?.trim() ?? '')
      .filter(output => HTTPS.test(output) && !seen.has(output));
    for (const url of links) {
      seen.add(url);
      tiles.push(
        proofTile(
          {
            title,
            url,
            ...(CLIP.test(url) && { video: url }),
            ...(PICTURE.test(url) && { image: url }),
          },
          `run-${run.project}-${run.slug}-${tiles.length}`,
        ),
      );
    }
    if (!links.length && run.saved) {
      const project = projects.get(run.project);
      tiles.push({
        key: `run-${run.project}-${run.slug}`,
        kind: 'link',
        title,
        description: `Saved in ${project ?? 'its project'}`,
        href: `/app/spaces/${run.project}`,
      });
    }
    if (tiles.length >= limit) break;
  }
  return tiles.slice(0, limit);
}

/* ---------- One item ---------- */

interface Context {
  input: DetailsInput;
  computers: Computer[];
  projects: Map<string, string>;
  now: number;
  days: number;
}

const usedOf = (ctx: Context, kind: MemberKind, name: string) =>
  ctx.input.viewer?.signedIn === false
    ? {}
    : {
        used: usedText(
          ctx.input.used?.get(`${kind}/${name}`),
          kind,
          ctx.now,
          ctx.days,
        ),
      };

const made = (ctx: Context, kind: MemberKind, name: string) =>
  kind === 'skill' ? runTiles(ctx.input.runs ?? [], name, ctx.projects) : [];

/** Releasing a private item: its submission when one was sent, else the line that sends it. */
function release(
  ctx: Context,
  kind: MemberKind,
  name: string,
): ItemDetails['manage'] {
  const sent = ctx.input.submissions?.get(`${kind}/${name}`);
  if (sent)
    return { label: 'See its submission', href: '/app/subscription', note: sent };
  return {
    label: 'Release to the store',
    copy: `mm submit ${name}`,
    note: 'Paste it into Claude or a terminal. It needs one finished production made with it, then an admin reviews it.',
  };
}

function ofCatalog(
  ctx: Context,
  item: AppItem,
  entry: MineItem | undefined,
): ItemDetails {
  const slug = slugOf(item.id);
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
  if (entry?.updateAvailable)
    status.push({
      label: 'Update out',
      tone: 'warn',
      note: `Version ${item.version} is out. Yours is older.`,
    });
  if (item.locked)
    status.push({
      label: `Needs ${item.opensWith}`,
      tone: 'plain',
      note: entry
        ? 'Your membership no longer opens it. What you installed keeps working, without updates.'
        : `It opens with a ${item.opensWith} membership.`,
    });

  // an app that opens in MediaMake is on no computer
  const web = item.kind === 'app' && item.open !== item.page;
  const command =
    item.kind === 'skill' && item.inRepo
      ? 'mm update'
      : `mm items install ${item.id} --yes`;
  const needs = ctx.input.needs?.get(item.id) ?? [];
  const devices: DetailsDevice[] = [];
  if (!web && !item.locked)
    for (const computer of ctx.computers) {
      const lacks = missing(computer.can, needs);
      if (item.kind === 'skill') {
        const on = entry?.on.find(found => found.device === computer.label);
        const older =
          !!on?.version &&
          !!item.version &&
          /^v?\d+(\.\d+)+/.test(on.version) &&
          on.version.replace(/^v/, '') !== item.version.replace(/^v/, '');
        devices.push({
          key: computer.label,
          name: computer.name,
          state: !on ? 'missing' : older ? 'older' : 'has',
          note: `${!on ? 'Not on it.' : older ? `Has an older copy${v(on.version)}.` : `Has it${v(on.version)}.`}${lacks}`,
          command,
        });
      } else if (computer.can) {
        // an MCP or an app is on a computer when its register says so
        const has = placeHas(computer.can, `${item.kind}:${slug}`);
        devices.push({
          key: computer.label,
          name: computer.name,
          state: has ? 'has' : 'missing',
          note: has ? 'Has it.' : 'Not on it.',
          command,
        });
      }
    }

  return {
    kind: item.kind,
    name: slug,
    title: item.title,
    ...(item.summary && { summary: item.summary }),
    ...(item.version && { version: item.version }),
    status,
    ...usedOf(ctx, item.kind, slug),
    store: {
      href: item.page,
      note:
        item.tier === 'public'
          ? 'Open to everyone.'
          : `Opens with ${tier} and above.`,
    },
    ...(ctx.input.viewer?.isAdmin && {
      manage: { label: 'Edit store listing', href: itemPath(item.id) },
    }),
    belongs: [
      { label: item.madeBy?.name ? `Made by ${item.madeBy.name}` : 'MediaMake' },
    ],
    people:
      item.tier === 'public' ? 'Everyone' : `${tier} members and above`,
    devices,
    ...(item.locked
      ? { locked: item.opensWith ?? tier }
      : web
        ? { open: item.open }
        : {
            install: {
              command,
              setup:
                item.installPrompt ??
                `Set up ${item.id} from MediaMake by following ${INSTALL_GUIDE_URL}`,
            },
          }),
    outputs: [
      // the trailer is not something made with it: it plays above the README (`video`)
      ...galleryTiles(item.readyProof ?? []),
      ...made(ctx, item.kind, slug),
    ],
    ...(!item.locked && { itemId: item.id }),
    listing: {
      ...(headshotOf(item) && { headshot: headshotOf(item) }),
      ...(item.icon && { icon: item.icon }),
      tags: item.tags ?? [],
      // Failed, Beta and Ready are in `status` already; a locked item says which membership opens it there
      badges: listingBadges({ beta: item.beta, tier: item.tier, version: item.version, size: item.size, deps: item.deps }).filter(
        (badge, i) => i > 0 && !(item.locked && i === 1),
      ),
      ...(item.size && { size: item.size }),
      ...(item.deps && { deps: item.deps }),
      ...(item.rating && { rating: item.rating }),
    },
    ...(item.video?.youtubeId && { video: { youtubeId: item.video.youtubeId, title: item.video.title } }),
    ...(item.kind === 'skill' && ctx.input.viewer?.isAdmin && { canEdit: true }),
  };
}

/** Where a space's item stands on every computer that has the space, then on the viewer's other computers. */
function spaceDevices(
  ctx: Context,
  item: SpaceItemView | undefined,
  space: SpaceView | null,
  join: string,
  needs: string[],
  projectId?: string,
): DetailsDevice[] {
  const can = new Map(ctx.computers.map(c => [c.label, c.can]));
  const unsent = new Set(item?.unsentOn.map(device => device.key));
  const behind = new Set(item?.behindOn.map(device => device.key));
  const seen = new Set<string>();
  const devices: DetailsDevice[] = [];
  for (const device of space?.devices ?? []) {
    const label = labelOf(device.key);
    if (device.mine) seen.add(label);
    const state = unsent.has(device.key)
      ? 'unsent'
      : behind.has(device.key)
        ? 'older'
        : 'has';
    devices.push({
      key: device.key,
      name: device.name,
      state,
      note: `${state === 'unsent' ? 'Has changes not sent yet.' : state === 'older' ? 'Has an older copy or none.' : 'Has it.'}${device.mine ? missing(can.get(label), needs) : ''}`,
      ...(device.mine && {
        command: state === 'unsent' ? 'mm space sync --yes' : 'mm space sync',
      }),
    });
  }
  for (const computer of ctx.computers)
    if (!seen.has(computer.label))
      devices.push({
        key: computer.label,
        name: computer.name,
        state: 'missing',
        note: `Not on it.${missing(computer.can, needs)}`,
        command: join,
      });
  if (projectId)
    for (const place of ctx.input.places ?? [])
      if (place.kind === 'cloud' && place.projects.includes(projectId))
        devices.push({
          key: place.id,
          name:
            place.name ??
            (place.label === 'cloud' ? 'Cloud environment' : place.label),
          cloud: true,
          state: 'has',
          note: `Holds this space.${missing(place.can, needs, true)}`,
        });
  return devices;
}

function ofSpaceItem(
  ctx: Context,
  item: SpaceItemView,
  space: SpaceView,
  owner: {
    belongs: DetailsLink;
    people: string;
    projectId?: string;
    mayRelease: boolean;
  },
): ItemDetails {
  const join = owner.projectId
    ? `mm space join ${owner.projectId}`
    : 'mm space sync';
  return {
    kind: item.kind,
    name: item.name,
    title: item.title,
    ...(item.summary && { summary: item.summary }),
    ...(item.version && { version: item.version }),
    status: [syncStatus(item, space)],
    ...usedOf(ctx, item.kind, item.name),
    store: { note: 'Not in the store. It is private.' },
    ...(owner.mayRelease && { manage: release(ctx, item.kind, item.name) }),
    belongs: [owner.belongs],
    people: owner.people,
    devices: spaceDevices(
      ctx,
      item,
      space,
      join,
      item.needs ?? [],
      owner.projectId,
    ),
    install: { command: join, setup: setup(join) },
    outputs: made(ctx, item.kind, item.name),
    ...(item.kind === 'skill' && owner.mayRelease && { canEdit: true }),
    depends: needDependencies(item.needs),
  };
}

function ofLinked(ctx: Context, item: LinkedItemView): ItemDetails {
  const mine = item.role === 'owner';
  const own = item.space?.items.find(
    entry => entry.kind === item.kind && entry.name === item.name,
  );
  const others =
    (item.people?.length ?? 0) + (item.invites?.length ?? 0) ||
    item.projects.length;
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
      },
    ],
    ...usedOf(ctx, item.kind, item.name),
    store: { note: 'Not in the store. It is private.' },
    ...(mine && { manage: release(ctx, item.kind, item.name) }),
    belongs: [
      { label: mine ? 'You' : item.owner },
      ...item.projects.map(project => ({
        label: project.name,
        href: `/app/spaces/${project.id}`,
      })),
    ],
    people: mine
      ? others
        ? `You, and ${linkedSummary(item)}`
        : 'Only you so far'
      : item.direct
        ? `${item.owner} shared it with you by name`
        : `${item.owner}, and everyone on ${list(item.projects.map(project => project.name)) || 'a linked project'}`,
    devices: spaceDevices(ctx, own, item.space, 'mm space sync', own?.needs ?? []),
    install: { command: 'mm space sync', setup: setup('mm space sync') },
    outputs: made(ctx, item.kind, item.name),
    ...(item.kind === 'skill' && (mine || item.role === 'editor') && { canEdit: true }),
    depends: needDependencies(own?.needs),
  };
}

function ofLocal(ctx: Context, row: LocalOnly): ItemDetails {
  const add = `mm space add ${row.name}`;
  const has = new Map(row.on.map(on => [on.device, on.version]));
  const where = list(row.on.map(on => deviceName(on.device))) || 'the computer that has it';
  // it reaches another computer through the viewer's space: added where it is, then synced
  const elsewhere = `${add}   # on ${where}, once\nmm space sync   # on this computer`;
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
    ...usedOf(ctx, 'skill', row.name),
    store: { note: 'Not in the store. It is private.' },
    manage: release(ctx, 'skill', row.name),
    belongs: [
      { label: 'You' },
      ...(row.variantOf
        ? [
            {
              label: `Variant of ${row.variantOf}`,
              href: `/skills/${row.variantOf}`,
            },
          ]
        : []),
    ],
    people: 'Only you',
    devices: ctx.computers.map(computer => ({
      key: computer.label,
      name: computer.name,
      state: has.has(computer.label) ? ('has' as const) : ('missing' as const),
      note: has.has(computer.label)
        ? `Has it${v(has.get(computer.label))}.`
        : 'Not on it.',
      command: has.has(computer.label) ? add : elsewhere,
    })),
    install: {
      command: elsewhere,
      setup: setup('mm space sync', `First, on ${where}, run \`${add}\`. Then on the new computer: `),
    },
    outputs: made(ctx, 'skill', row.name),
  };
}

/**
 * The details of everything the viewer can be shown, by detailsKey: every
 * catalog item, and for a member the items of their spaces, the items
 * linked to them and the other skills on their computers.
 */
export function viewerDetails(input: DetailsInput): Record<string, ItemDetails> {
  const { spaces, mine } = input;
  const ctx: Context = {
    input,
    computers: computersOf(input),
    projects: new Map([
      ...(spaces?.projects ?? []).map(
        project => [project.projectId, project.name] as const,
      ),
      ...(spaces?.personalProjectId
        ? [[spaces.personalProjectId, 'your personal space'] as const]
        : []),
    ]),
    now: input.now,
    days: input.days ?? 90,
  };
  const details: Record<string, ItemDetails> = {};

  const installed = new Map(
    (mine?.installed ?? []).map(entry => [entry.item.id, entry]),
  );
  for (const item of input.items)
    details[detailsKey.catalog(item.id)] = ofCatalog(
      ctx,
      item,
      installed.get(item.id),
    );
  // what the viewer installed stays listed when the catalog no longer shows it to them
  for (const entry of mine?.installed ?? [])
    details[detailsKey.catalog(entry.item.id)] ??= ofCatalog(
      ctx,
      entry.item,
      entry,
    );
  for (const row of [...(mine?.variants ?? []), ...(mine?.local ?? [])])
    details[detailsKey.local(row.name)] = ofLocal(ctx, row);

  const personal = spaces?.mine;
  if (personal) {
    const owner = {
      belongs: {
        label: 'Your personal space',
        ...(spaces?.personalProjectId && {
          href: `/app/spaces/${spaces.personalProjectId}`,
        }),
      },
      people: 'Only you',
      mayRelease: true,
    };
    for (const item of personal.items)
      details[detailsKey.space(personal.id, item.key)] = ofSpaceItem(
        ctx,
        item,
        personal,
        owner,
      );
  }
  for (const project of spaces?.projects ?? []) {
    if (!project.space) continue;
    const members = (project.members ?? []).map(member =>
      member.you ? 'you' : member.name,
    );
    const owner = {
      belongs: {
        label: project.name,
        href: `/app/spaces/${project.projectId}`,
      },
      people: members.length
        ? (members.length > 5
            ? `${members.slice(0, 5).join(', ')} and ${members.length - 5} more`
            : list(members)
          ).replace(/^you\b/, 'You')
        : project.people > 1
          ? `Everyone on ${project.name} (${project.people} people)`
          : 'Only you so far',
      projectId: project.projectId,
      mayRelease: project.role !== 'viewer',
    };
    for (const item of project.space.items)
      details[detailsKey.space(project.space.id, item.key)] = ofSpaceItem(
        ctx,
        item,
        project.space,
        owner,
      );
  }
  for (const item of spaces?.linked ?? [])
    details[detailsKey.linked(item.id)] = ofLinked(ctx, item);
  return details;
}
