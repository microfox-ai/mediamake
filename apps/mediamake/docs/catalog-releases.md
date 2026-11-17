# Catalog releases and access

MediaMake ships skills, MCPs, apps, tutorials and courses as **catalog
items**. Every item names the lowest membership that opens it, on one strict
ladder: **Public, Plus, Pro, Cohort, Admin** (see [Tiers](#tiers)). An app,
MCP, tutorial or course starts with the cohort and moves down the ladder as
it is released. The repository is public, so it holds only the code for this;
gated content lives in private storage.

**A skill in the repo is public.** Its files are committed
(`.agents/skills/`, listed at `/skills`), so nothing about it is hidden: it
is always public and open to everyone, even while public releases are locked.
It sits in the Public column of the dashboard, and `tier`, `schedule` and
`vault` refuse it (`isAlwaysPublic` in `lib/catalog/types.ts`: an item with
`inRepo`, set from the skills registry, or `madeBy`). A skill released as a
package, with no files in the repo, is gated like an app or MCP and can sit at
any tier. Skills already public stay public: git history keeps them anyway.

**So are items made by others.** An open-source MCP or skill, or an MCP its
maker hosts, that an admin lists in the catalog (ElevenLabs, fal, Blender)
has nothing of ours in it to hold back: it is always public too, and it
installs from where it lives, not from a package of ours. See
[Items made by others](#items-made-by-others).

## Where things live

| What | Where | Public? |
| --- | --- | --- |
| Skills | `.agents/skills/` (committed; `.claude/skills/` links to them) | Yes, always |
| MCPs and skills made by others | `lib/catalog/third-party.json` (committed), or MongoDB `catalog_items` for ones added with `npm run catalog -- add` | Yes, always |
| Cards for our apps and our hosted MCPs | `lib/catalog/items.ts` (committed). A card can carry an `install` spec: mm-use installs its hosted connector (`/mcp/use`) for every member, mm-release (`/mcp/release`, it runs the catalog) and the old, deprecated MediaMake MCP (`/mcp`) theirs for admins only (their cards are in the vault); grants can name a card too | As each card says |
| Items members submitted and an admin accepted, other than Public skills | The private store repo `microfox-ai/mediamake-store` (`skills/`, `mcps/`, `apps/`), each released as a package ([submissions.md](submissions.md)) | No |
| Your unreleased MCPs and apps | `private/` at the repo root (gitignored, CI-guarded) or any local folder | No |
| Packaged releases (`.tar.gz`) | `catalog-private/<kind>/<slug>/<version>.tar.gz` in `CATALOG_BUCKET` (falls back to `SPACES_BUCKET`), stored without a public ACL | No |
| Card data (title, summary, stage, versions) | MongoDB `catalog_items` | Only what a viewer may see |
| Videos: a skill's intro, tutorials, courses' lessons | MongoDB `catalog_videos` (YouTube links only) | As shared as the item they belong to |
| Grants, groups, requests, download log | MongoDB `access_grants`, `access_groups`, `access_requests`, `catalog_downloads` | No |

Item ids look like `mcp/browse-hack` or `skill/lyric-video`.

## Items made by others

MediaMake also lists MCPs and skills we don't build, so our skills can point
people at them and one prompt installs them: open-source ones (a repo and a
licence) and hosted ones from their makers. Only admins list them, in one of
two ways:

- **In the repo**: add an entry to
  [`lib/catalog/third-party.json`](../lib/catalog/third-party.json) in a PR.
  It is live on the next deploy, and CI can see it (skills' MCP tables are
  checked against it).
- **Without a deploy**: `npm run catalog -- add elevenlabs.catalog.json`,
  with a file shaped like one of those entries. The stored item wins over
  the repo's.

An entry is a card plus `madeBy` and `install.source`:

```json
{
  "id": "mcp/elevenlabs",
  "title": "ElevenLabs",
  "summary": "Sound effects, speech, voices and transcription, as files on your computer.",
  "madeBy": { "name": "ElevenLabs", "repo": "elevenlabs/elevenlabs-mcp", "license": "MIT" },
  "install": {
    "source": {
      "type": "mcp-server",
      "name": "elevenlabs",
      "local": {
        "command": "uvx",
        "args": ["elevenlabs-mcp"],
        "env": [{ "name": "ELEVENLABS_API_KEY", "description": "Your ElevenLabs API key", "getAt": "https://elevenlabs.io/app/settings/api-keys", "secret": true, "required": true }]
      },
      "guide": "https://github.com/elevenlabs/elevenlabs-mcp#readme"
    },
    "notes": "Needs an ElevenLabs account and uv. Every generation spends credits."
  }
}
```

- `madeBy`: who makes it (`name`), and for open source its `repo` and
  `license`; a hosted one gives its `homepage`. Cards show "Open source · by
  ElevenLabs · MIT", or "By fal".
- `install.source` (`InstallSource` in `lib/catalog/types.ts`):
  - `{ "type": "mcp-server", "name", "local"?, "remote"?, "mcpb"?, "setup"?, "guide"? }`:
    `local` runs on the person's machine (`command`, `args`, `env`), `remote`
    is hosted (`url`, `headers`, a `connectorUrl` when the Claude apps
    sign in at another URL, and a `directoryUrl` when it is listed in
    Claude's connector directory, e.g. `https://claude.ai/directory/elevenlabs`:
    its release and item pages link it and install.md adds it from there;
    with none, no link is shown), `mcpb` is a bundle on a GitHub release. Give at
    least one; install.md picks what fits the person's Claude. Each `env` /
    `headers` entry says what the value is, where to get it (`getAt`), how
    it's written (`format`, e.g. `Bearer {value}`) and whether it's a
    `secret`. `setup` is what comes after adding the server, in order (an
    add-on to enable).
  - `{ "type": "github-skill", "repo", "path", "ref"? }`: a skill folder in a
    public repo.
- They have no versions: `release` refuses one (use `add`), and the gate
  commands refuse them, like skills. The dashboard shows them in Public.

The repo's own skills install the same way, from their folder here
(`github-skill` at `.agents/skills/<name>`), with the MediaMake repo first
(they work on its apps and scripts) and the skills they depend on. A skill
vendored from another repo (`skills-lock.json`, e.g. `remotion-dev/skills`)
is shown as made by its upstream and installs on its own.

## Seeing what is what: the release pages

Releases are mostly done by Claude, from a terminal; the dashboard is where
to look. **`/app/releases`** opens on **Items**: every item by kind, with
who can open it, where it comes from and what it connects to. Each item has
its own page, **`/app/releases/<kind>/<slug>`** (e.g.
`/app/releases/mcp/browse-hack`), that answers everything about it on one
screen:

- **What installing it does**: the plan install.md follows, step by step,
  and the choices it offers (a skill's MCPs).
- **Connections**: what it needs first, what it works with (and what is lost
  without each), and what needs or uses it.
- **Who can open it**: its tier, the gate, the groups and grants that reach
  it (**Manage access** opens the access sheet).
- **Where it lives**: who makes it, its code, its package (version, size,
  storage key), how it installs, and which file or store defines it.
- **History**: versions with their notes (`#v<version>` links straight to
  one) and every stage change.

The page reads `GET /api/admin/catalog/item?id=<id>`, which changes nothing
(the dashboard's own `GET /api/admin/catalog` also settles due gates).
`npm run catalog` prints the item's page after each step, and Claude gives
it to you after any release (the rule is in the repo's CLAUDE.md).

## Archiving

An item that is unused or no longer important can be **archived**: it leaves
the homepage (every tab; the Skills tab shows it only with its **Archived**
filter on), but nothing else changes. It keeps its tier and access, its page
and install prompt still work, and items that need or use it still install
it. Any item can be archived, a skill from the repo too, so the archive is
kept apart from the items, in MongoDB `catalog_archive` (`ArchiveMark`:
when, by whom, and an optional note shown on its release page). A skill's own
page (`/skills/<name>`) picks changes up within five minutes; the homepage and the release pages at
once.

- On the item's release page: **Archive** / **Unarchive**.
- From a terminal: `npm run catalog -- archive skill/a skill/b [--note "why"]`,
  and `--off` to bring them back.
- From Claude: mm-release's `catalog_archive` (below).
- Admin API: `{ type: 'set_archived', itemIds, archived, note? }`.

## Videos: intros, tutorials and courses

Every video is a YouTube video, embedded with YouTube's player: nothing else
is hosted or played. Each one has its own **title, description and
thumbnail**, edited on its item's release page. The thumbnail is one uploaded
there (`create_thumbnail_upload`, public once uploaded) or pasted as a link;
without one it is YouTube's, `https://img.youtube.com/vi/<id>/maxresdefault.jpg`
(swapped for `hqdefault.jpg` on videos too old to have a maxres one).

- **A skill's intro** (or an MCP's or app's): paste its YouTube link under
  **Intro video** on its release page, e.g. `/app/releases/skill/pack-brand-kit`.
  It plays on the item's page (`/skills/pack-brand-kit`), and its
  thumbnail tops the item's card on the homepage. Like the archive, videos are
  kept apart from the items (`catalog_videos`, keyed by item id), so a skill
  from the repo gets one without being stored as an item.
- **Tutorials** (`tutorial/<slug>`): one YouTube video each, added with **New
  tutorial** on `/app/releases`. A tutorial is its video: its card takes the
  video's title and the first paragraph of its description. It plays on
  `/access?item=tutorial/<slug>`.
- **Courses** (`course/<slug>`): tutorials played in order, added with **New
  course**, their lessons picked and ordered on the course's release page. The
  course page, `/courses/<slug>`, plays each lesson and moves to the next when
  it ends; `?lesson=<n>` opens on one. Its thumbnail defaults to its first
  lesson's.

Tutorials and courses go through the gated releases like apps and MCPs: they
start in development and move on the Board. A course shows each viewer only
the lessons they can open. On the homepage, both are on the Tutorials tab, and
every skill card has a picture on top: its intro's thumbnail, or its name on a
colour of its own (the same colour every time, `placeholderBackground` in
`lib/catalog/video.ts`).

Admin API (`POST /api/admin/catalog`):

- `{ type: 'set_video', itemId, video: { url, title, description?, thumbnail? } }`:
  any item's video; a course gives `lessons` (tutorial ids, in order) instead of
  a `url`. `video: null` removes it. Links that aren't one YouTube video are
  refused (`parseYouTubeId`).
- `{ type: 'create_video_item', kind: 'tutorial' | 'course', slug, video, visibility? }`:
  a new tutorial or course with its video.
- `{ type: 'create_thumbnail_upload', itemId, filename, contentType }`: a signed
  link to upload a thumbnail image to.

From Claude, mm-release's `catalog_set_video` and `catalog_add_video_item`
do the same (see below).

### Store listing: tags and screenshots

A skill, MCP or app has a store listing, kept in MongoDB `catalog_listing`
apart from the items (so a skill from the repo has one too, see
`lib/catalog/listing.ts`): the tags an admin adds beside the item's own (a
skill's category), and its screenshots, pictures and videos of the item added
by https link, like an app store listing's. A video is a YouTube link, or an
MP4 or WebM. The item's own page shows the tags, and the screenshots in a
gallery under "Made with this"; cards carry the tags too.

On the item's release page it is the Store listing panel: Add tags and Add
screenshot or video each open a dialog, and every change saves at once.

- `{ type: 'set_listing', itemId, tags?, media?: [{ kind: 'image' | 'video', url, title? }] }`:
  each one given replaces what was there (an empty list clears it); left out,
  it stays. At most 12 tags and 12 screenshots.

From Claude, mm-release's `catalog_set_listing` does the same.

### The release page

`/app/releases/<kind>/<slug>` has a wide column for what the item shows (its
intro video, its store listing, what installing it does, its history) and a
narrow one for what an admin does with it: the actions (install prompt, item
page, Made with this, code, Archive, health), who can open it with its Tier
(`set_item_tier`: a skill in the public repo, an item made by others and a
card in `lib/catalog/items.ts` can't be moved, and the select says why), its
connections and where it lives. Each panel's buttons sit under it. The intro
video is one row with two buttons, Copy launch video prompt and Add Launch
Video (its form is a dialog).

### Launch videos

A skill, MCP or app gets a launch video: a Cook with Claude episode made with
the `make-cwc-tutorial` skill by an admin on their own computer (it renders
there and is reviewed in rounds, so the site makes no video itself).

- The item's release page has **Copy launch video prompt** under its
  Intro video panel. The prompt carries what the catalog knows about the item:
  its id and version, what it is, who can open it, Beta or Ready, a skill's
  first prompt, the install prompt to show (for a computer without MediaMake),
  its code, what was made with it (the Ready mark's proof), what it works with
  and what uses it. It tells Claude to check each fact, to ask for what is
  missing, and to stop when no finished production was made with it.
  It also lists the item's open known issues (the public list an admin writes,
  never a member's feedback, which the prompt says to keep out of the video),
  gives `mm items install <id> --yes` as the way in for signed-in members, and
  has Claude set up a missing skill or MCP with `mm update` and
  `mm items install --yes`, never by asking for an install prompt or code.
- The panel says what the prompt still lacks (no production on record, still
  Beta, not public, nothing to install).
- The finished video comes back as the item's intro: the prompt ends with
  `catalog_set_video` for the item (title and description as uploaded), or the
  admin adds its YouTube link with **Add Launch Video**, beside the prompt button. An intro the item
  already has is replaced only after the admin says so.
- `GET /api/admin/catalog/item` answers with it as `launchVideoPrompt`, so
  mm-release's `catalog_item` gives it too. Built by `launchVideoPromptFor` in
  `lib/catalog/launch-video.ts` (pure; `npx tsx --test lib/catalog/launch-video.test.ts`).

## From Claude: mm-release's catalog tools

mm-release (the hosted connector at `/mcp/release`, or the local stdio server run as `release`; until the split of 2026-11 these tools were in the MediaMake MCP at `/mcp`)
manages the catalog for admins, so releases can be run by asking Claude.
They call the admin API with the person's own key, so they work only for
admins, and each answers with the release page of every item it touched.

| Tool | Does |
| --- | --- |
| `catalog_items` | Every item in a line (`GET /api/admin/catalog/items`): tier, readiness, health, where it comes from, archived, what it works with, what uses it, its page. Filters: kind, tier, readiness, health, archived, words. |
| `catalog_item` | One item's page as data: its tier, how many people hold each membership, grants, readiness and its proof, health, where it lives, the install steps and choices, what uses it, versions and notes. |
| `catalog_archive` | Archive items, or bring them back (`archived: false`), with a note. |
| `catalog_set_stage` | Set the lowest membership that opens one of our apps, MCPs, tutorials, courses or packaged skills (`set_item_tier`): public, plus, pro, cohort or vault, optionally with a gate. Repo skills and items made by others refuse: archive them instead. |
| `catalog_set_health` | Say whether items of any kind work (`set_health`): healthy, inactive, archived, or failed with its reason. |
| `catalog_set_readiness` | Mark items Ready with the finished productions that prove it, or back to Beta (`set_readiness`). |
| `catalog_set_listing` | Set an item's tags and screenshots (`set_listing`), shown on its own page. |
| `catalog_add_third_party` | List or update an MCP or skill made by others (`madeBy` + `install.source`), like `npm run catalog -- add`. |
| `catalog_set_video` | Set, change or remove an item's video (`set_video`): a skill's intro, a tutorial's video, a course's lessons. Fields left out keep what the item has; `remove: true` takes it off. On the local server `thumbnailFile` uploads a thumbnail (`create_thumbnail_upload`) after the rest is saved. |
| `catalog_add_video_item` | Add a tutorial or course (`create_video_item`), its slug made from the title unless given. It starts with the cohort. |
| `catalog_people` | Who holds each membership, how they got it and how long it lasts, plus everyone else with a key and pending requests. |
| `catalog_set_tier` | Give people a Plus, Pro or Cohort membership (or take it away), by client id or the name on their key, with its source, reference, length or permanence. |
| `catalog_membership` | Make one membership permanent, renew it for a new contribution, or end it. |
| `catalog_versions` | Live versions and release notes (anyone, for updates). |

## Tiers

There is one ladder, and it is data: `TIER_LADDER` in
`lib/memberships/tiers.ts`. It is strict: each tier opens everything the tiers
below it open, so access is one comparison (`tierOpens(held, needed)`). An
item names the lowest tier that opens it, and a person holds one tier. Adding
a tier is adding a row there. The admin dashboard at **`/app/releases`**
shows both and is where you move things along; the CLI below does the same
from a terminal.

| Tier | Who holds it | How they get it | An item at this tier |
| --- | --- | --- | --- |
| **Public** | Everyone | Signing up, or not signing in at all | Open to everyone, once public releases are open (see below) |
| **Plus** | Plus members and above | Contributing, or an admin grant | Listed for everyone; opens for Plus and above |
| **Pro** | Pro members and above | Contributing a Pro item, or an admin grant | Listed for everyone; opens for Pro and above |
| **Cohort** | The cohort and admins | An admin grant only | Invisible to everyone below: no card, no name, a 404 |
| **Admin** | Admins | `isAdmin` on their Redis profile | The vault: admins, and grants that name the item itself. Never published. |

An item stores `tier`; the older `visibility` and `neverPublish` fields are
kept in step with it (`visibilityOfTier`), and a record from before the ladder
is read through them (`itemTier`: in development is Cohort, community is Pro).
Cloud projects (the Spaces page, brand kits, channel sync, song takes) open
at Plus and Lambda renders stay with the cohort (`FEATURE_TIERS`); the
ProjectSync MCP and Browse Hack are Pro items.

A Public skill that works with a Pro MCP stays listed for everyone: its card
says what the MCP adds and which alternative works without it.

### Memberships

How each person got their tier is a record in the `memberships` collection
(`lib/memberships`), keyed on the account's client id:

| Field | Meaning |
| --- | --- |
| `tier` | plus, pro or cohort. Public is having no live record; Admin is the account's flag. |
| `source` | `admin` (an admin gave it), `contribution` (an accepted item or merged PR, named in `ref`), `invite` (old records only: invites are retired), `migration` (carried over from the earlier tiers), `paid` and `signup` (for later) |
| `expiresAt`, `permanent` | A contribution lasts **3 months** and renews by contributing again (a new record). An admin can make any membership permanent: it then lasts until an admin removes it. Other sources last until removed unless given a length. |
| `grantedBy`, `revokedAt`, `revokedBy`, `revokedNote` | Records are never deleted, so the collection is also the log of who changed whose tier, when and why. |

A person's tier is the highest of their live records (`memberTierFrom`).
Admins set it on **Manage Memberships** (`/app/memberships`), with
`npm run catalog -- member`, or with `catalog_set_tier`. Payments, later, only
add records with `source: 'paid'`: no access code changes.

There are no invite codes or invite links. A membership is applied for: a
person contributes a skill, MCP or app they made and used for real work (or
asks on their Subscription page), an admin reviews it, and accepting it gives
the membership. Old `access_invites` records stay in the database, unread.

#### Manage Memberships and Subscription

`/app/memberships` (admins; the People tab of Releases moved here) has four tabs:

| Tab | What it does |
| --- | --- |
| People | Everyone with an account, a key or a membership: their tier, how they got it, when it ends (amber when within 14 days). **Change** needs a reason, which is kept on the record and goes in the mail. **Make permanent** removes an expiry. **Link** links an old account (a key only) by a one-time link or an email, as on API Keys. |
| Requests | People who asked for the next membership on their Subscription page (a request for `tier/<tier>`), or for one locked item. Approving a membership gives it; approving an item grants that item. |
| Suggested | Merged pull requests on the public repositories by people with a linked GitHub account, which no membership counts yet. **Grant Plus** gives it for 3 months, or renews it; **Dismiss** stops suggesting it ([submissions.md](submissions.md)). |
| Audit log | Who changed whose membership, when and why. Nothing is stored for it: it is read from the membership and request records, which are never deleted (`lib/memberships/audit.ts`). |

The page reads and writes `/api/admin/memberships`. The changes themselves are
in `lib/memberships/admin.ts`, shared with `/api/admin/catalog`, so a change
made from mm-release or `npm run catalog` behaves the same and mails the
person too (pass `notify: false` to skip the mail).

`/app/subscription` (every member) shows the person's tier, how they got it
and how long it lasts, what each tier they hold opens, the next membership
and the two ways to it (contribute, or **Ask an admin**, which is
`POST /api/memberships/request`), and their history. There is no billing:
Account Billing stays hidden until payments exist.

#### Mail

Sent through Resend from `mediamake@reply-bots.com` (`lib/mail`), beside the
sign-in mails:

| Mail | When |
| --- | --- |
| Welcome | Once, when an account is made (by a confirmed email, Google or GitHub). |
| Membership changed | An admin gives, raises, lowers, ends or makes permanent a membership, or approves a request for one. Not sent to admins, or when the account has no email. |
| Submission decided | An admin accepts a store submission (with the membership it earned), asks for changes or declines it ([submissions.md](submissions.md)). |

Mail never fails a change: without `RESEND_API_KEY`, or when Resend refuses,
the change holds and the answer says why no mail went.

An API key only signs someone in; it opens nothing beyond public items by
itself. That includes the hosted MCPs: who may connect to each follows its
catalog item like any other release (`lib/mcp/connectors.ts`).

| Connector | Address | Item | Who |
| --- | --- | --- | --- |
| mm-use | `/mcp/use` | `mcp/mm-use` | Every signed-in account: explore, install, usage, feedback |
| mm-release | `/mcp/release` | `mcp/mm-release` | In the vault, because it runs the catalog: admins and people granted it by name |
| MediaMake MCP (deprecated) | `/mcp` | `mcp/mediamake` | In the vault, with Core: the old video tools |

Anyone else sees why on the consent screen and gets a 403 from the endpoint.
A sign-in is the account's, not one connector's, so each endpoint checks on
every request. What mm-use sends about usage is in [usage.md](usage.md).

`viewerTier(entitlements)` / `getViewerTier(viewer)` in `lib/access` return a
person's tier for features that depend on who someone is (render routing,
for example). Item access always goes through `accessLevel`; the pure rules
are in `lib/access/rules.ts`.

### Readiness and health

Every item of every kind, ours or made by others, has both, shown as badges:

- **Readiness** is Beta or Ready. Everything starts as **Beta**. **Ready**
  means battle tested, and an admin can mark it only with proof on record: at
  least one finished production made with it (`readyProof`: a title, and a
  link when it has one). An MCP also needs to be shown in use: a skill that
  uses it, or a video on it (`readyProblems`). Marks live in
  `catalog_readiness`. Today every skill is Beta except `pack-brand-kit`.
  This is how the rule, "We publish nothing we don't use." (`RULE` in
  `lib/catalog/types.ts`), is kept: every item's page (`/skills/<name>`,
  `/mcps/<slug>`, `/apps/<slug>`) has a "Made with this" panel
  (`components/catalog/made-with.tsx`), laid out like a store listing: a
  gallery whose big first tile is the item's trailer (its intro video), then
  the productions of a Ready item. Each production (`ReadyProof`) has a
  title and, optionally, a link (`url`: a YouTube link plays in place, any
  other opens from its tile), a picture (`image`) and a clip (`video`, MP4
  or WebM). An admin adds them on the item's release page (**Mark Ready** or
  **Made with this**: uploads go through `create_proof_upload`, public once
  uploaded), or as links with `catalog_set_readiness` and
  `npm run catalog -- ready … --url --image --video`. A Beta item shows its
  trailer and the note that no production is on record yet. A skill's
  production is asked for when it is published
  (`node tools/skills.mjs publish <name> --yes --made="…"`) and in every pull
  request (`.github/pull_request_template.md`).
- **Health** is healthy, inactive, archived or **failed**. Failed needs a
  reason, shown with the item; an admin marks it by hand. Marks live in
  `catalog_health`.

Where an item is shown follows from tier, readiness and health
(`shownOn` in `lib/catalog/shown.ts`):

| Surface | Ready and healthy | Beta | Failed |
| --- | --- | --- | --- |
| Public site | shown, if it is Public and not archived | hidden | hidden |
| Explore, in the app | shown | shown with a Beta badge | only behind a filter, with the reason |
| My Items (installed) | shown | shown | shown with a warning and the reason |
| Admin | shown | shown | shown |

In Explore an item a higher membership would open is shown locked, saying
which one; Cohort and vault items stay out of sight of everyone below them.

### Moving from the earlier tiers

Before the ladder, items were in development, community or public, and people
were private testers (the `private` group, or a `*` grant) or community (the
`network` group). Those still work, read as Cohort and Pro, until the
migration turns them into records:

```bash
npm run catalog -- migrate-tiers          # a dry run: prints every change
npm run catalog -- migrate-tiers --yes    # applies it
```

It gives every stored item its `tier` (Browse Hack and ProjectSync go to Pro,
keeping any gate), gives private testers a Cohort membership and community
members a Pro one (`source: 'migration'`), clears the two groups and the `*`
grants, and marks `pack-brand-kit` Ready. The decisions are in
`lib/catalog/migrate-tiers.ts`. Running it again changes nothing.

### Gated releases

A Plus, Pro or Cohort item can carry a gate: `publicAt`, a date when it turns
public by itself. **Start gate** on the dashboard (or `schedule`) keeps the
item at its tier and sets the gate, 30 days by default.
Access treats the item as public from that moment (`effectiveVisibility`); the
next time the dashboard loads, the change is recorded in `stageHistory` with
`by: 'gate'`. Moving an item to another tier by hand cancels its gate.

**Releases are locked for now.** Until `MEDIAMAKE_PUBLIC_RELEASES=open` is set,
a `public` item needs a membership or a grant too (Plus members and above see it),
and that includes items whose gate has ended. The dashboard says so at the top.
Items a viewer can't open are **hidden**: no card, and their pages and API
links answer 404 as if they didn't exist. Signed-out visitors see nothing.
Setting the variable later opens `public` items to everyone, with no other
change.

Public items install the same way as private ones: open the card, copy the
prompt. Installing always needs a MediaMake account, because the install plan
and packages are fetched under the person's sign-in (`mm login`, mm-use, or their API key).

## Who has access

Every way someone gets access is a record, never a code change:

| Record | Created by | Collection |
| --- | --- | --- |
| Grant to a person or group (with expiry and note) | `grant`, `approve` | `access_grants` |
| Membership (tier, source, expiry; see [Memberships](#memberships)) | `member`, Manage Memberships, an approved request | `memberships` |
| Readiness marks with their proof | `ready`, `beta` | `catalog_readiness` |
| Group membership (your own groups; the earlier `private` and `network` until migrated) | `group add` | `access_groups` |
| Requests from the "Request access" button | the person | `access_requests` |
| Each package download | `/api/catalog/download` | `catalog_downloads` |

`npm run catalog -- list` prints every item with its live grants (who, until
when) and every group with its members. `revoke` marks a
grant revoked rather than deleting it, so the history stays.

## Setup (once)

1. In `.env.local` for the CLI: `MEDIAMAKE_URL` (the deployed app) and
   `MEDIAMAKE_ADMIN_KEY` (an API key of a client with `isAdmin`, set with
   `HSET user:<clientId> isAdmin true`).
2. Optional but recommended: a separate private bucket for releases via
   `CATALOG_BUCKET` (and `CATALOG_SPACES_ENDPOINT`,
   `CATALOG_SPACES_ACCESS_KEY_ID`, `CATALOG_SPACES_SECRET_ACCESS_KEY` if it uses
   other credentials). Keep file listing turned off on it.
3. `npm run catalog -- init` creates the database indexes.

## Day to day

```bash
cd apps/mediamake

# Release (or re-release with a new version). Reads the bundle's manifest (or a
# SKILL.md's front matter) and an optional catalog.json next to it. Leaving
# --tier out keeps the current tier (a new item starts with the cohort). A repo
# skill is always public.
# Release notes are required (see below).
npm run catalog -- release ../../private/mcps/browse-hack.mcpb --tier cohort --version 1.0.0 --notes "What changed"

# Share with a few people
npm run catalog -- grant mcp/browse-hack --to <clientId> --days 30

# Memberships
npm run catalog -- member <clientId> cohort --note "editing the channel"      # an admin grant, until removed
npm run catalog -- member <clientId> plus --source contribution --ref <PR>    # earned: lasts 3 months
npm run catalog -- member add <clientId> plus --source contribution --ref <PR>  # contributed again: renews
npm run catalog -- member permanent <membershipId>                            # no expiry any more
npm run catalog -- member <clientId> public                                   # take it away
npm run catalog -- members                                                    # who holds what, and how

# Move an item along
npm run catalog -- tier mcp/browse-hack pro                      # the lowest membership that opens it
npm run catalog -- schedule mcp/browse-hack --days 30            # keeps its tier, public by itself in 30 days
npm run catalog -- unschedule mcp/browse-hack                    # no date
npm run catalog -- tier mcp/browse-hack public                   # release now
npm run catalog -- vault app/brand-internals                     # never publish (--off to take it out)

# Readiness and health
npm run catalog -- ready skill/pack-brand-kit --proof "The Microfox brand kit" --url https://youtu.be/...
npm run catalog -- beta skill/pack-brand-kit
npm run catalog -- health mcp/browse-hack failed --note "sign-in broke after the Chrome update"

# Requests from the "Request access" button
npm run catalog -- requests
npm run catalog -- approve <requestId> --days 30

# Take access back
npm run catalog -- revoke mcp/browse-hack --to <clientId>
npm run catalog -- list
```

`catalog.json` (all optional):

```json
{
  "kind": "skill",
  "slug": "lyric-video",
  "title": "Lyric Video",
  "summary": "Turns a song and its lyrics into a timed lyric video.",
  "version": "1.0.0",
  "visibility": "private",
  "status": "beta",
  "listed": true,
  "tags": ["video", "music"],
  "cover": "https://…/cover.png"
}
```

Versions are immutable: releasing the same version twice is refused, so bump it.

### Release notes

Every release carries notes saying what changed; `publish_version` refuses
one without them. `release` takes them from `--notes "…"`, `--notes-file
notes.md`, or the section for that version in a `CHANGELOG.md`: inside a
skill or app folder, or beside an `.mcpb` (`<name>.CHANGELOG.md` or
`CHANGELOG.md`). Headings like `## 1.2.0`, `## v1.2.0` and
`## [1.2.0] - 2026-11-02` all work.

The live version and the notes show on the item's card and its page
(`/skills/<slug>`, `/mcps/<slug>` or `/apps/<slug>`, newest first), in `GET /api/catalog/versions`, and in
what installed items report when they update (Browse Hack's `get_status`
and `update_browse_hack` tools).

Browse Hack's MCP (`mcp/browse-hack`, in microfox-ai/extensions) is released
by that repo's CI on every merge to main that changes `mcp/`, with the notes
from `mcp/CHANGELOG.md`; see its `.github/workflows/release-browse-hack-mcp.yml`.

## One-prompt installs

Every skill, MCP and app has its own page, the link to share and the one the
Releases admin page links as **Item page**: `/skills/<slug>`, `/mcps/<slug>`,
`/apps/<slug>` (`itemPagePath` in `lib/catalog/paths.ts`; e.g.
https://mediamake.microfox.app/skills/create-thumbnail). Tutorials play on
`/access?item=<id>` and courses on `/courses/<slug>` (`watchPath`). An old
`/access?item=<id>` link to a skill, MCP or app the viewer can open redirects
to its page; `/access` still serves locked items (asking for access) and
skills with no page of their own.

Who installs what follows the membership (Public, Plus, Pro, Cohort): there
are no per-release or per-install codes. Anyone with access on a computer
without MediaMake installs an item by pasting this into Claude. Its card on the
homepage has a **Copy install prompt** button and its page shows the prompt
too (`listCatalog` returns it as `installPrompt`):

> Set up mcp/browse-hack from MediaMake (https://mediamake.microfox.app) by following https://github.com/microfox-ai/mediamake/blob/main/install.md

On a computer that has the MediaMake repo and is signed in (`mm login`: the
site's OAuth sign-in in the browser, after which `mm` makes one API key for
that computer; `tools/login.mjs`), no
prompt is pasted at all: `mm items` asks the site who the account is
(`GET /api/me`: its tier), what it opens (`GET /api/catalog`) and what is live
(`GET /api/catalog/versions`), and `mm items install --yes` installs every MCP
and app the membership opens with the same API key (`tools/items.mjs`; the
plan, the SHA-256 check, `claude mcp add`, `installed.json` and the update
token are the same as below). The prompt is for everyone else: Claude
installs under their own sign-in (mm-use's `install_item`, or their API key).

[`install.md`](../../../install.md) walks Claude through GitHub (account,
`git`, `gh auth login`), the person's MediaMake API key, and then the plan
from `GET /api/catalog/install?item=<id>`: every dependency in order, each
once, with 30-minute package links. A dependency the person can't open stops
the plan with a 409 instead of half-installing.

### What an item works with: choices

Some things an item uses are worth having but not worth forcing: a brand kit
can't make sound without ElevenLabs, researches much faster with Browse Hack,
and only sometimes wants fal. Those go in `install.uses`, each with how much
the item needs it, what for, and what the person loses without it:

```json
{ "id": "mcp/elevenlabs-connector", "need": "required", "for": "Sound effects for intros and end screens", "without": "No sound at all" }
```

`need` is `required` (its main job needs it), `recommended` (it works
without, worse or slower) or `optional`. An archived MCP (`health: archived`, such as
`mcp/elevenlabs`) is never `required`: what replaced it is, and the archived one is listed as
`optional`, the fallback for when the replacement can't be connected. The plan returns them as `choices`
(strongest first, each with its `reasons`), and the steps they bring, their
own dependencies included, are marked `forChoices`. install.md asks the
person which to add, says what each one they skip costs, and installs only
the steps of the ones they take. A choice they can't get from MediaMake (not
shared with them, or not in the catalog) comes back `available: false`, in
the same words either way, instead of failing the plan. Only what is
installed outright brings choices: a choice's own `uses` are left out.

**Skills declare theirs in SKILL.md**, in the table the skill also reads when
it runs (by convention under `## First: check the MCPs`):

```markdown
| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs-connector` | required | Sound effects for intros and end screens (`creative_generate_in_flow`, `node_type: sfx`) | No sound at all |
| `mcp/elevenlabs` | optional | The fallback for when the hosted connector can't be connected or reached | Nothing, while the connector is connected |
| `mcp/browse-hack` | recommended | Pinterest research boards and Midjourney art | Research by hand in the browser |
```

`node tools/skills.mjs index` puts the table in `skills.json` as the skill's
`mcps` (the catalog's `uses`, also for a skill released as a package that
declares none of its own), and each skill's page (`/skills/<name>`) shows them; `check`
(CI) fails on a table it can't read. Each MCP is one of ours or an item made
by others; publishing a skill that names another one warns to list it in
`third-party.json`.

Declare what an item needs in `catalog.json` under `install`:

```json
{
  "install": {
    "method": "skill",
    "requires": [
      { "type": "repo", "repo": "microfox-ai/mediamake", "why": "The skill renders with the mediamake presets" },
      { "type": "item", "id": "skill/remotion-basics" },
      {
        "type": "github-release",
        "repo": "microfox-ai/extensions",
        "asset": "browse-hack-chrome.zip",
        "name": "Browse Hack Chrome extension",
        "kind": "chrome-extension",
        "guide": "https://github.com/microfox-ai/extensions#install-browse-hack"
      }
    ],
    "uses": [
      { "id": "mcp/elevenlabs", "need": "optional", "for": "Sound effects on the intro", "without": "A silent intro" }
    ],
    "notes": "Shown to the person before installing."
  }
}
```

- `method` defaults from the kind: skills unpack into `~/.claude/skills/<slug>`,
  MCPs open their `.mcpb` (`entry`), apps follow their INSTALL.md.
- Put an `INSTALL.md` in the package for the item's own setup (settings to
  fill in, a check that it works). It stays private with the package.
- MCPs: `npm run catalog -- release path/to/name.mcpb` releases the bundle
  as is. Name, version and description come from the bundle's
  `manifest.json`; put a `name.catalog.json` beside it (or pass
  `--manifest`) for the title, summary and `install` block, and a
  `name.INSTALL.md` for its setup steps.

## Updates

The end of an install (install.md step 5) leaves two files on the person's
machine: `~/.mediamake/installed.json` (what was installed, which version,
where) and, from `mm items install`, an **update token** in
`~/.mediamake/config.json` (`updateToken`, from
`POST /api/catalog/update-token` with the computer's API key). The token
stands for the person and the items installed with it plus their
dependencies, works only for `GET /api/catalog/versions` and
`GET /api/catalog/install` on those items, is stored hashed in Redis
(`lib/catalog/update-token.ts`), renews with use and lapses after a year
unused. Access is still checked on every call, so revoking a grant stops
updates as well. Installing another item with `mm items install` adds it to
the same token.

With it:

- "update <item>" in Claude follows install.md's **Update an installed
  item**: compare installed versions with `/api/catalog/versions`, show the
  release notes in between, reinstall what's behind. The
  `update-mediamake-items` skill (installed by step 5 for Claude Code) points
  Claude there.
- MCPs can update themselves. Browse Hack's server polls `versions` every
  few hours, installs a newer `.mcpb` into `~/.mediamake/mcp/browse-hack`
  (checked against the plan's sha256), and updates its Chrome extension from
  GitHub Releases. `"autoUpdate": false` in the config turns that off.

## For the app

```ts
import { getViewer, canAccess } from '@/lib/access';
import { listCatalog } from '@/lib/catalog';

const viewer = await getViewer(); // { clientId } from the session cookie
const skills = await listCatalog(viewer, 'skill');
// → CatalogEntry[]: CatalogItem & { access: 'open' | 'granted' | 'locked' };
//   only items the viewer can open; installable ones carry installPrompt
```

- `canAccess(viewer, { id, visibility })` answers one item.
- `getEntitlements(viewer)` + `accessLevel(entitlements, item)` answer many
  items with one database round trip.
- `lib/catalog/items.ts` holds cards defined in code (only names that are fine
  to be public), the registry's skills and `third-party.json`'s items; a
  database item with the same id wins. `getCatalogRecord(id)`
  (`lib/catalog/records.ts`) gives either, for install plans and pages.
- `lib/catalog/plan.ts` builds install plans (`planInstall`, tested in
  `plan.test.ts`); `lib/catalog/install.ts` hands it the database, storage
  and the viewer's access.
- `/skills/<slug>`, `/mcps/<slug>` and `/apps/<slug>` show an item you can
  open with its install prompt and a download; `/access?item=<id>` keeps
  tutorials, locked items and skills without a page; `/access` with no item
  (an old invite link) goes to `/app/subscription`.

HTTP endpoints (`/api/catalog/*` skip the API-key middleware and resolve the
session cookie or Bearer key themselves):

| Endpoint | Purpose |
| --- | --- |
| `GET /api/catalog?kind=skill` | Catalog as the caller sees it |
| `GET /api/catalog/download?item=<id>[&version=][&redirect=1]` | 5-minute signed link, logged; 404 when locked |
| `GET /api/catalog/install?item=<id>` (Bearer update token or API key, or the session) | Ordered install plan with dependencies; 404 when locked, 409 when a dependency is |
| `GET /api/catalog/versions?items=<id>,<id>[&notes=10]` (Bearer update token or API key, or the session) | Live version of each item and its releases with notes, newest first; no links, not logged |
| `POST /api/catalog/update-token { items, token? }` (Bearer API key) | An update token for the installed items (or adds them to `token`); `mm items install` asks for it |
| `GET/POST /api/catalog/access-requests` | List / create the caller's access requests (off while releases are locked) |
| `GET/POST /api/admin/catalog` | Admin: items, versions, grants, groups, requests, API key holders; `schedule_release`, `cancel_release`, `set_never_publish`, `set_archived`, `set_video`, `set_listing`, `create_video_item`, `create_thumbnail_upload` |
| `GET /api/admin/catalog/items[?kind=][&tier=][&archived=][&q=]` | Admin: every item in a line (`ItemSummary`), read-only |
| `GET /api/admin/catalog/item?id=<id>` | Admin: one item as its release page shows it, read-only |

`MEDIAMAKE_ACCESS_GRANTS=clientId:skill/lyric-video|mcp/*,clientId2:*` still works as a
fallback when no database is configured.
