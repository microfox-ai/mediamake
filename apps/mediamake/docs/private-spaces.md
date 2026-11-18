# MediaMake Spaces

A space keeps everything for one body of work in one place, the same on every
computer. Spaces and ProjectSync used to be two features; they are one now.
There are two kinds, both private:

- **Personal.** Only you. It is made by itself the first time it is needed.
- **A project's.** Everyone on that MediaMake project: a channel, a film, a
  series, a brand.

Every space holds two things:

| What | Where it is kept | What moves it |
| --- | --- | --- |
| Skills, MCPs and apps someone made | A private GitHub repo (yours: `<you>/mediamake-space`; a project's: `<maker>/mediamake-<project>`) | `mm space` (git) |
| Files: brand kit, productions, releases, media, shared assets | MediaMake's storage (S3), counted against the owner's storage ([project-storage.md](project-storage.md)) | The MediaMake Spaces MCP (`mcp/projectsync`, which was ProjectSync) and `mm media sync` |

`mm space` clones the repos into the workspace, links their skills into Claude
and keeps every computer the same with one command, `mm space sync`, which
then shows each space's files waiting to come down or go up. In the app,
Spaces (`/app/spaces`; `/app/projects` redirects there) shows the personal
space first and then each project space; a space's page shows its files, its
skills and who can open it, with the one line that sets it up on a computer.
(UI refactor plan, steps 2a and 2b.)

One more shape sits beside the two spaces: a **linked item**, a skill, MCP
or app that stays its owner's and is used by the people of every project it
is linked to, and by the members its owner names ([Linked
items](#linked-items-one-copy-several-spaces)).

Who gets what: skills, MCPs and apps in a personal space are for every member.
Files in a space, project spaces and the MediaMake Spaces MCP (a catalog
item, whose stage an admin sets in Releases) open at Plus.

## The personal space's files

A project space's files belong to its project. A personal space's belong to a
project of its own, marked `personal` (`lib/projects/personal.ts`), made the
first time a Plus member opens Spaces (`GET /api/project/overview`). It works
with every project route and tool by its id, shows as `personal` in the MCP's
`list_projects`, counts against the member's storage like any project they
own, and can be neither shared, renamed nor deleted. It is not a project
space: `mm space share --project=` never lists it.

## The repo

```
skills/<name>/SKILL.md      a skill, with anything it needs beside it (code, small assets)
mcps/<name>/                an MCP: its code, a README that says how to run it, an item.json
apps/<name>/                an app, the same way
<kind>/<name>/item.json     optional: { "title", "summary", "version", "needs": ["key:<name>"], "media": ["<library id>"] }
CLAUDE.md, prefs.md, engine/ …   the space's central files: what guides and runs every production
README.md                   what the space is, and "What's here": a list `mm space push` keeps up to date
```

**On the space's page** the tabs are Code, Skills (the skills, MCPs and apps, a card each), Brand
(the brand kit: colours, fonts and a card per file; owners and editors change it in a dialog),
Productions, Releases, Media, People, Where it runs (a project's space only) and Set up. **Code** is the repo as GitHub shows it: the branch and
the latest commit over the file list (folders open in place, a file opens on GitHub), the README under
it, and on the right About, Commits (who changed it last and when), Contributors (the project's people)
and Devices (each computer that has the space, and how many updates it is behind the newest one or has
not sent). It comes from the computer furthest along: a computer reports the repo's file paths, its
README and its last commits, never another file's contents. **Set up** has the line that sets the space
up on a computer and, for a Claude cloud session or a routine, what to add to the cloud environment: the
repositories (MediaMake, the space's, each linked item's) and the keys its skills need, by the name of
their environment variable, read from the skills' run sheets (`docs/cloud-device-runs.md`). Only names: a
key's value is set in Claude and never comes to MediaMake. **Where it runs** is the project's register:
what its skills need, and a card for each cloud environment and each computer open to the project, with
what it can do (`mm access`, `docs/cloud-device-runs.md` › The register). A computer is closed to a
project until its owner opens it.

**Central files** are whatever sits at the top of the repo beside `skills/`, `mcps/` and `apps/`: the
guidance, prefs and shared code that every production of the space follows. Static files (pictures,
clips, fonts) are not code: they go in Media.

**The README says what is in the code.** Its opening paragraph (the About box) says what the space is
for, in the space's own words. Under it, between `<!-- mm:contents -->` markers, "What's here" lists each
file and folder at the top with what it is (a Markdown file's first sentence, a folder's own
README.md, a package.json's description), then each skill, MCP and app with its summary. `mm space push`
rewrites that list after it has brought in GitHub's changes, so two computers never conflict over it;
everything outside the markers is written by people (and Claude), never rewritten. A folder of shared
code gets a README.md whose first sentence says what it is.

**Two people on the same space.** `mm space sync --yes` first keeps this computer's edits as a commit
here, brings in GitHub's, and puts this computer's on top (a rebase). Changes to different files, or to
different parts of one file, combine by themselves. When two computers changed the same lines, sync
stops, changes nothing, names the files and asks Claude to merge them; nothing is lost, since this
computer's edits are committed on it. Devices shows who has edits not sent yet.

An item's version is `version` in its `item.json`, else the SKILL.md's
(`version` or `metadata.version`) or the `package.json`'s, else a short hash
that the app doesn't show.

A skill is its whole folder: its SKILL.md and everything it needs to run, its code
(`skills/<name>/engine/…`, which a project imports as `@mediamake/skills/<name>/…`), scripts and small
assets. `mm space add` and `mm space sync` name any code a skill uses that only this computer has, so it
moves into the skill before it goes up. A cloud session gets a space by having its repo added to the
environment (`mm cloud`, `apps/studio/README.md` › Cloud sessions).

## On a computer

| | |
| --- | --- |
| `mm space` | Every space on this computer: what changed here and on GitHub, every item |
| `mm space sync` | Bring everything down and show what would go up (`--yes` sends it too), then show each space's files waiting to come down or go up (`mm media sync status`; nothing is moved, `--no-files` skips it) |
| `mm space new <skill\|mcp\|app> <name>` | Start an item in your space (`--project=<project>` starts it in a project's) |
| `mm space add <skill>` | Move one of your workspace skills (a variant) into your space (dry run, `--yes`) |
| `mm space share <item> --project=<project>` | Move an item into a project's space, so everyone on it gets it (dry run, `--yes`; `--copy` keeps yours too) |
| `mm space link <item> --project=<project> [--project=…] [--to=<email>] [--editor=<email>]` | Keep an item yours and give it to more people: everyone on each linked project, and the members you name (dry run, `--yes`). With only the item, it says where it is linked |
| `mm space unlink <item> --project=<project>` or `--from=<email>` | Take a linked item away from that project's people, or from one person (dry run, `--yes`) |
| `mm space join <project>` | Set one project up on this computer: sign in when needed, accept the GitHub invitation, clone its space, link its skills, show its shared media. The project's page has the line to copy |
| `mm space invite <project>` | Invite everyone on a project to its repo on GitHub, and make the repo when there is none. The app shows this line to the owner right after they add someone |
| `mm space ensure` | Make and connect your own space when this computer has none |
| `mm space connect <owner/repo>` | Use a repo you already have as your own space. A public repo is refused |
| `mm space pull`, `mm space push` | The two halves of `sync` (`push` is a dry run until `--yes`; `-m "<what>"` names the commit) |
| `mm space report [--dry]` | Tell MediaMake what this computer has; `--dry` shows it without sending |
| `mm space disconnect [--project=<project>]` | Unlink a space from this computer (dry run, `--yes`); the folder stays |
| `mm space forget` | Delete what MediaMake holds of your spaces; the repos are untouched |

`<project>` is a project's name or id; `mm space` lists the ones you are on.

### Repos are made for you

Nobody creates a repo by hand. With the GitHub CLI signed in (`gh auth login`,
once per computer):

- `new`, `add` and `ensure` make `<you>/mediamake-space`, private, when you
  have no space yet, or connect it when it exists already (your second
  computer).
- The first `share` or `new --project` into a project makes
  `<you>/mediamake-<project>`, private, tells MediaMake that this repo is the
  project's space, and invites the project's members on GitHub by the GitHub
  account each linked in MediaMake: editors and the owner may push, viewers
  only pull. It says who could not be invited (no GitHub account linked yet);
  the next share or sync by someone who may change the project invites them.
- A member's next `mm space sync` accepts the invitation and clones the
  project's space. A new member copies one line from the project's page,
  `mm space join <project id>`, which also signs the computer in when it
  isn't. If the repo hasn't invited them yet, it says who invites and what to
  check, and the same line works once they are invited.

Only the owner and editors of a project can make its space or share into it.

### How it stays the same

- Your clone is `<workspace>/space`, a project's `<workspace>/spaces/<project>`
  (`mm workspace`; usually under `~/MediaMake`).
- A skill is linked the way a variant is: `<workspace>/skills/<name>` links to
  the space's folder, and `~/.claude/skills/<name>` links to that, so every
  session loads it. A folder of your own with the same name is never replaced:
  the command says so.
- Git moves the files, with the sign-in the computer already has. MediaMake
  never sees a file, and holds a GitHub token only for an owner who connected
  GitHub (below).
- `sync`, `pull` and `push` first keep what changed here as a commit on this
  computer, so nothing is lost. When two computers changed the same file,
  nothing is changed and the command names the files; they are merged with
  plain git in the folder, then synced.
- Everything a computer has that GitHub doesn't goes up as one commit, and only
  with `--yes`: show the dry run to the user first.

## Linked items: one copy, several spaces

`mm space share` moves an item into a project's space: it becomes the
project's, and the project's owner and editors change it. Some items are
made by one person and make sense for several projects, or for a few people
on no project together. Those are **linked**. A linked item:

- **stays its owner's, one copy with one history.** The first
  `mm space link` gives it a small private repo of its own under the owner's
  GitHub account, `<owner>/mediamake-<kind>-<name>`, laid out like a space
  with that one item in it, and moves it there from the owner's space
  (cloned to `<workspace>/linked/<name>`). Its history from then on is that
  repo's.
- **is linked to any number of project spaces.** Everyone on a linked
  project can use it. Their next `mm space sync`, or `mm space join
  <project>`, accepts the invitation, clones it to `linked/<name>` and links
  it into Claude, like any skill of a space.
- **can be shared with named members** who are on none of those projects
  (`--to=<email>`). An email with no account waits as an invite, taken up the
  first time that address looks at its spaces.
- **is changed only by its owner and the editors the owner names**
  (`--editor=<email>`). They may push to its repo; everyone else pulls.
  Being an editor of a linked project does not make someone an editor of
  the item. When someone who can only use it edits their copy,
  `mm space sync` leaves the edit on their computer and says so.
- **is unlinked from one place at a time.** `mm space unlink <item>
  --project=<project>` takes it away from the people who have it only
  through that project: at the owner's next sync (or at once, with GitHub
  connected) they are taken off its repo, and at their own next sync the
  clone and its link into Claude are removed (the folder stays when they
  changed something in it). The other linked projects and the named members
  keep it. The project's owner can unlink someone else's item from their
  project too.

Who is on the item's repo follows who has it: everyone on a linked project
and every named member may pull, editors push. The owner's `mm space sync`
makes the repo match (inviting, changing who may push, removing), and
changes made in the app do it right away when the owner connected GitHub
(below), also when someone is added to or removed from a linked project.
Someone with no GitHub account linked to MediaMake can't get it yet; the
command and the page name them. Because that list is kept exact, a
collaborator added to the repo by hand on GitHub is removed at the next sync.

In the app, a linked item is a card in **Mine** (yours under the Yours tab,
others' under Projects on each linked project, or under Shared with you) and
in the **Skills** tab of each linked space's page. Its owner has **Share**
on its card: a dialog to tick the projects it is linked to, add a member by
email, choose who can edit it, remove someone. Linking an item for the
first time needs a computer, because the files move: `mm space link`, or
asking Claude to "link <skill> to the <project> project".

Only the owner of an item links it, and only to a project they own or edit
(project spaces open at Plus). Sharing with named members is open to every
member.

| Route | |
| --- | --- |
| `GET /api/space` | `linked`: every linked item you own or may use, with what you may do (`owner`, `editor`, `user`), its repo and where it stands on each computer. Its owner also gets who it is shared with and who should be on its repo |
| `POST /api/space/links` `{ kind, name, repo }` | Your item now lives in that repo (`mm space link` made it). Answers its id |
| `PATCH /api/space/links` `{ item, action: 'link' \| 'unlink', project }` | Links it to a project (its owner, who owns or edits the project) or unlinks it (its owner, or the project's owner) |
| `PATCH /api/space/links` `{ item, action: 'add', email \| clientId, editor? }` | The owner names a member, or changes whether a named member is an editor. The member is told by mail |
| `PATCH /api/space/links` `{ item, action: 'remove', email \| clientId }` | The owner takes a named member off; a named member can leave |
| `PUT /api/space` with `item: <id>` | What one computer's clone of a linked item holds, from anyone who has it |

## Inviting from the site: Connect GitHub

Adding someone to a project in the app can send the GitHub invitation by
itself. The project's owner clicks **Connect GitHub** once in the project's
access panel: they authorize MediaMake's GitHub App and install it on their
GitHub account. From then on:

- Adding a member invites their linked GitHub account to the project's repo
  (editors push, viewers pull). When the project has no repo yet, it is made,
  private, under the owner's GitHub account.
- Changing a member's role changes what they may do on the repo; removing them
  (or their leaving) takes them off it and withdraws a pending invitation.
- The panel says how it went, and gives the line to send the new member
  (`mm space join <project id>`). When it could not invite (the member has no
  GitHub account linked, the repo is under someone else's account, or the App
  can't reach the repo), it says why and gives `mm space invite <project id>`
  for the owner's computer.
- **Disconnect** in the same panel revokes the authorization at GitHub and
  deletes it here. The App stays installed until the owner removes it on
  GitHub (Settings, Applications).

A site without the App (the three variables below unset) shows only the line
for the owner's computer.

### The GitHub App (set up once, by whoever runs the site)

It is a separate App from the one people sign in with, so sign-in keeps asking
for the profile and email only.

1. On GitHub: Settings, Developer settings, GitHub Apps, **New GitHub App**
   (under the organisation or account that owns the site).
2. Name it (for example "MediaMake Spaces") and give the site as its homepage.
3. **Callback URL**: `https://<site>/api/space/github/callback`. Leave
   "Expire user authorization tokens" on, and leave "Request user
   authorization (OAuth) during installation" off.
4. **Setup URL**: the same address, `https://<site>/api/space/github/callback`,
   and tick "Redirect on update".
5. **Webhook**: tick "Active". Webhook URL: `https://<site>/api/space/github/webhook`.
   Secret: a long random value (`openssl rand -hex 32`), the same one that goes
   in `GITHUB_APP_WEBHOOK_SECRET` below. Turn it on only once the site has
   that variable, or GitHub's deliveries fail until it does.
6. **Repository permissions**: Administration, read and write. Metadata, read
   only (GitHub adds it). Nothing else: no Contents, so the App cannot read or
   change a file in any repo.
   Then, under **Subscribe to events**, tick **Repository** (Metadata allows it; it
   asks for no new permission, so nobody who connected has to approve again).
7. "Where can this GitHub App be installed?": **Any account**, so members can
   install it on theirs.
8. Create it, then **Generate a new client secret**.
9. In the site's environment (Vercel), set and redeploy:

   ```
   GITHUB_APP_SLUG=<the name in the App's URL, github.com/apps/<slug>>
   GITHUB_APP_CLIENT_ID=<its Client ID>
   GITHUB_APP_CLIENT_SECRET=<the client secret>
   GITHUB_APP_WEBHOOK_SECRET=<the webhook secret of step 5>
   ```

   For a preview deployment to work too, add its address as a second callback
   URL on the App.

### What GitHub tells the site (the webhook)

GitHub signs every delivery with the webhook secret, and the site takes one
only when the signature is right (`lib/space/github-webhook.ts`). It reads
ids and names from it, never a token or a file.

| On GitHub | Here |
| --- | --- |
| An owner revokes the App's authorization (Settings, Applications) | Their connection is forgotten: the panel offers Connect GitHub again |
| An owner removes the App from their account | The same, and the authorization is taken back at GitHub |
| A space's repo, or a linked item's, is renamed or moved to another account | The space or the item follows it. Computers still on the old name keep working (GitHub redirects them) and keep reporting |
| A space's repo is deleted | The space is forgotten here, so the next share makes a new repo |
| A linked item's repo is deleted | The item is no longer linked anywhere; at their next sync it leaves the computers of the people it was shared with |

The first two are sent to every GitHub App by themselves; the last two come
from the Repository event. The App's page on GitHub (Advanced, Recent
deliveries) shows each delivery and its answer, and can send one again.
Without `GITHUB_APP_WEBHOOK_SECRET` the address answers 503 and nothing else
changes: connecting and inviting work as before.

An owner who connects picks **All repositories** when installing, so the App
can reach the repos it makes and any project repo made earlier from a
computer. With "Only select repositories" they add each project's repo to it.

### What it gives MediaMake

Administration on the repos the owner installed it on: make a repo, add,
change or remove a collaborator, list collaborators, list and withdraw
invitations (the listing keeps a linked item's repo to exactly the people
who have the item). MediaMake
makes exactly those calls (`lib/space/github.ts`) and no others. It has no
permission for contents, issues, pull requests or secrets.

The owner's token is stored sealed (AES-256-GCM, with a key derived from
`GITHUB_APP_CLIENT_SECRET`, or `MEDIAMAKE_SECRETS_KEY` when set; collection
`github_grants`), never logged and never sent to a browser. It lasts 8 hours
and is refreshed when used; after 6 months without use the owner connects
again. It is kept only when it belongs to the GitHub account linked to that
MediaMake account. Rotating the client secret means owners connect again.

Someone invited by email who has no account yet is not invited on GitHub when
they sign up: the owner runs `mm space invite` then.

| Route | |
| --- | --- |
| `GET /api/space/github/start?redirectTo=` | Off to GitHub to authorize the App (a browser session only) |
| `GET /api/space/github/callback` | Back from authorizing: kept, or on to install the App. Back from installing: starts again |
| `GET /api/space/github` | Whether you connected it, and as whom |
| `DELETE /api/space/github` | Disconnect: revoked at GitHub, deleted here |

## Large media

Large media does not go in git. `push` refuses any file over 10 MB, media included
(a skill's central files, such as a show's music bed, travel with it up to that). Put a bigger one in the media library
(`mm media ingest`), name it under `media` in the item's `item.json`, and it
travels with the library (`mm media share`, `mm media sync`). `mm space` and
Mine show what each item needs. `push` also stops on an env file or anything
that looks like a key or a token (`--force` sends it anyway).

Productions never go in a space either: they live in the workspace's `projects/` and `out/`, beside
the space's folder, and a new space's `.gitignore` names both (`/projects/`, `/out/`), so a project
or a render made inside a space by mistake stays out of git too.

## What MediaMake is told

After every command that changes a space, when the computer is signed in and
usage reports are on (`mm usage`):

```
PUT /api/space
{ device, repo, project?, branch, commit, commitAt, pushed, ahead,
  history: [{ sha, at, author, subject }],          the last 30 commits
  items: [{ kind, name, version, title, summary, changed, media,
            needs: ["key:elevenlabs", "browser:youtube"] }],     what it needs to run; left out when it doesn't say
  code: { files: ["<path in the repo>"], truncated?, readme } }   a space's, not a linked item's
```

`device` is the computer's random label (`mac-3f9a`), `repo` its name
(`owner/name`), `project` the project's id for a project's space, `summary`
one line of at most 200 characters, `media` a count, `ahead` the commits not on
GitHub yet. `code` is what the Code tab shows: the repo's file paths (at most
2,000) and its README.md (at most 32 KB). Never another file, a path on the
computer or a token; the server drops anything else (`lib/space/space.ts`). `mm usage off`
stops it, `mm space report --dry` shows it exactly, `mm space forget` deletes
it.

Two calls are part of how sharing works, so they don't depend on that switch:
reading your spaces and projects (so a computer can find a project's repo),
and naming a project's repo when you make its space.

| Route | |
| --- | --- |
| `GET /api/space` | Your space and one per project you are on, as Mine shows them. People who may change a project also get its members' names and GitHub logins, to invite them |
| `PUT /api/space` | What one computer's clone holds now; replaces what that computer said before. For a project: members only, and only for the repo that is its space |
| `POST /api/space` `{ project, repo }` | Names the repo of a project's space (owner and editors) |
| `DELETE /api/space?device=<label>[&project=<id>]` | That computer disconnected |
| `DELETE /api/space` | Forget your space and take your computers off every project's |

## The records

- `spaces`, one per space: `{ id, repo, connectedAt, updatedAt, devices:
  [{ key, clientId, label, branch, commit, commitAt, pushed, reportedAt }] }`.
  `id` is `user:<clientId>` or `project:<projectId>`.
- `space_items`, one per item: `{ space, kind, name, title, summary, version,
  media, devices: [{ device, version, changed }], createdAt, updatedAt }`.

- `space_links`, one per linked item: `{ id, owner, kind, name, repo,
  projects: [{ id, by, at }], people: [{ clientId, editor, by, at }],
  invites: [{ email, editor, by, at }], createdAt, updatedAt }`. What its
  computers report is kept like a space's, under the id `item:<id>`.

An item lives in one place: a space, or a repo of its own when it is linked.
Who gets it is who the space belongs to (you, or the people on the project),
or, for a linked item, the people of its linked projects and the members its
owner named. An item no computer has any more is removed. In the
app each item has one state: the same on every computer, not sent yet (a
computer changed it and hasn't synced), or an update waiting (a computer has
an older copy or none).

## Not in this step

Submitting to the store (2c), moving a linked item back into a space,
handing a linked item to another owner, and registering a space's MCPs in
Claude: an MCP's folder is cloned and listed, and its README says how to run
it.
