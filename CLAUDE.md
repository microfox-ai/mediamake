# MediaMake

## The rule: we publish nothing we don't use

Every skill, MCP and app here is published only after its maker used it for real work. Hold to it in
every session:

- Before publishing a skill (`publish-skill`), releasing an item or marking one Ready, ask the user
  which finished production was made with it (its title, and its link when it has one). Never make one
  up, and never count a test render or a demo as one.
- With none, don't publish: the skill stays the user's own (in their workspace) and an item stays Beta,
  until something real is made with it.
- The production is the item's proof: `node tools/skills.mjs publish <name> --yes --made="…"` puts it in
  the pull request, and Ready (`catalog_set_readiness`, `npm run catalog -- ready`) records it, shown on
  the item's page as "Made with this".
- Production is an admin's call: for any skill, MCP or app the production is asked for, not a hard
  gate, and an admin may mark one Production without it (never do it unasked; its page then says none
  is on record). Anyone who can use an item adds what they made with it on its page (Add yours).
- A pull request that adds or changes a skill, MCP or app names the production in its "Made with this"
  section (`.github/pull_request_template.md`).

## Videos: apps/studio and `mm`

Every video is made in `apps/studio` (it was `apps/lyrics_videos` until 2026-11). Its scripts run from
any folder as `mm <command>` (`mm help` lists them; `mm render` and `mm prepare` are the `render-project`
and `prepare-project` scripts). If the shell has no `mm`, run `npm run mm -- link` once from the repo
root (or use `npm run mm -- <command>` there). If `mm` or the session-start check says the user's work
is still in `apps/lyrics_videos` or inside the checkout (`apps/studio`), show the user `mm migrate` (it
only lists what would move into their workspace, `~/MediaMake`) and run `mm migrate --yes` once they agree.

Projects, renders (`out/`), brand kits, thumbnail jobs and overlays are the user's workspace, not the
framework: `mm workspace` says where each is on this machine (apps/studio until `mm migrate` moves them
and sets `workspace` in `~/.mediamake/config.json`, usually `~/MediaMake`). In skills and docs,
`projects/…`, `out/…`, `brands/…`, `thumbnails/jobs/…` and `overlays/…` mean those folders of the
workspace: take the full path from `mm workspace`. Code takes these folders from `DIRS` in
`apps/studio/scripts/paths.ts` (resolver: `scripts/workspace.ts`), never `apps/studio/projects` by hand.
`mm type-check` checks the studio and the workspace's projects. Code in the workspace imports the engine
by name, never by path: `@mediamake/engine` (the kit) and `@mediamake/engine/<name>/…` (`mm engine` lists
the names, from `apps/studio/engine.json`); `mm engine codemod` converts older code. Each project records
the engine it was made with in `input/project.json` (`engine`); one made with another major version
renders with that engine, from a kept checkout (`--engine=current` to try it on this one, then
`mm engine pin <slug>`).

Review renders are 10-second previews (`mm render <slug> --preview`, around what changed; revise-video
has the rest). The whole video is rendered only when the user asks to review all of it, and the master
once, after they sign off.

**No Lambda.** The user doesn't want Remotion Lambda renders (2026-11-17: "pretty bad, I don't ever want
to use it"). Every render runs on this computer, or inside a cloud session's own machine (`mm cloud`,
below). Never suggest `--lambda`, `mm lambda` or the render-cloud skill, never offer Lambda as an option,
and never pick it to save time; the code stays only for a user who names Lambda themselves.

## Cloud sessions: build and render without the Mac

A project that needs nothing from the user's computer (pure code, or files it fetches itself) is built and
rendered in a Claude Code cloud session from start to end. Run `mm cloud` first (`npm run mm -- cloud`
before `mm` is linked): it checks the setup, sets the workspace, connects the user's space repos that the
environment cloned and links their skills, and points renders at the machine's browser. It says what is
missing (a space repo not added to the environment, a key one of its skills needs). The space's page in
the app (Set up › Run it in the cloud) lists what to add to a cloud environment before that: the
repositories, and the keys by their variable's name; give the user that page when they set up a cloud
session or a routine. Renders run in the session's machine
(`mm render <slug> --preview`, then the master). A cloud session has no ElevenLabs MCP: a voice take there
is `mm voice <slug> --text=<the script> --voice=<the brand's voices.json>` (the characters and the credits
left first, `--yes` after the user's yes or within a routine's budget), with the environment's key, as
`mm transcribe` does; on a computer the MCP's `text_to_speech` stays the first choice. The files land in the workspace's `out/<slug>/`; give
them to the user with `mm cloud deliver <slug>` (into the project's shared files when there are some). A
project that needs Browse Hack, Midjourney or media only on the Mac is not for a cloud session yet.
`apps/studio/README.md` › Cloud sessions has the details.

## Run sheets: what each step needs

Every skill says, a row a step, what the step needs to run: a `## Where it runs` table in its SKILL.md
(`| Step | Needs | A person's yes | Safe to repeat | Without it |`), in the words of `tools/places.mjs`
(`render`, `key:<name>`, `mcp:<id>`, `app:<name>`, `browser:<site>[/<account>]`, `media:library`;
`nothing` for none). A browser sign-in, an app, the media library and Browse Hack exist only on a device,
so those steps never run in a cloud session. `apps/mediamake/docs/cloud-device-runs.md` has the format.

- Write the sheet when the skill is made (`mm space new skill` starts one) and keep it true when a step
  changes. `skills.mjs add`, `publish` and `mm submit` stop on a skill without one.
- A need names a thing, never a secret: `key:elevenlabs`, never the key; `browser:youtube/<channel>`,
  never a password. Keys are set in the cloud environment or on the device, by the person.
- "Without it" says what a place that lacks the need does: "a to-do …" means the step waits for a
  place that has it; anything else is what to do instead, there. A cell holds only its column's words
  (a reason or a condition goes under the table): `mm space status` says which rows can't be read.
- In a cloud session, do the steps that can run there, a step with another way that way, and stop at
  one that waits: say which step, what it needs and what the sheet's "Without it" says, and post it
  as a to-do (below). Don't work around it.

## The register: where a step can run

Each computer and cloud environment says what it can do, in the run sheets' words, and a project's page
(Where it runs) shows which place has what its skills need. `mm access` shows this computer and tells
MediaMake; `mm cloud` does it for a cloud environment (named by `MEDIAMAKE_PLACE`), which belongs to the
projects whose space repos it holds. `apps/mediamake/docs/cloud-device-runs.md` › The register has the rest.

- A computer is its owner's and closed to every project. Open it to a project (`mm access open <project>`)
  only when its owner says so, in this session; never to make a step runnable. `mm access close`, `busy`
  and `free` are the owner's too.
- What can't be detected is said by the owner: `mm access add browser:youtube/<channel>` (or `app:`,
  `key:`). Add one only when it is true on that computer; never a secret.
- A spend limit is the owner's words beside a key (`mm access limit <key> "<text>"`, or
  `<KEY VARIABLE>_LIMIT` in a cloud environment). Never write one for them.

## To-dos: a step waits for a place that can do it

A step one place can't do goes in the project's to-do queue for a place that can (`mm todo`, the
space's page › To do, the Spaces MCP's `post_todo` / `claim_todo` / `finish_todo`).
`apps/mediamake/docs/cloud-device-runs.md` › The to-do queue has the rules.

- A step of a run is posted by the run (`mm run wait`, below), not by hand. Posting any other: first
  save the work to the project (the release or production, `mm space sync --yes` for
  code), then `mm todo post <project> "<what to do>" --needs=<the step's needs> --skill=<skill>
  --step="<step>" --release=<slug> --version=<v>`, with `--yes` when the run sheet or the routine says
  the step waits for a person's yes. Then end: a session never waits for a to-do. Tell the user its id
  and which place can do it.
- "Pick up to-do td-… in <project>" is `mm todo pick <id>`: do what it prints, with that skill, that
  step only. Finish with `mm todo done <id> --result="<the link>"`; when it can't be done,
  `mm todo fail <id> --reason="…"` (or `release` when nothing was tried). Never leave one claimed.
- The session-start line says when this computer can do something that waits. Tell the user; pick one
  up only when they say so.
- A step that must not happen twice: check it didn't already, as the pick-up says, before doing it.
- `mm todo yes <id>` and a choice's answer are the user's: only on their word, in this session.
- Everyone on the project reads a to-do. Never a key, a password or anything private in its words.
- With the Portal MCP connected, a to-do you post is also a task there for the people who can do it,
  and the work of one you finish is logged there.

## Runs: every step ends by saving

A production made with a skill that has a run sheet is a run (`mm run`, the space's page › Runs):
its record says which steps are saved, where, and which is next, so it can stop in one place and go on
in another. `apps/mediamake/docs/cloud-device-runs.md` › The run record has the rules.

- Start it where the work begins: `mm run start <project> <slug> --skill=<skill>`. A production runs
  once at a time: when it says who has it and where, stop and tell the user; never work around it.
- Each step: `mm run step <slug> <n>` when it starts, and when its work is done
  `mm run save <slug> <n> --production` (its code and renders go to the project's Productions),
  `--release` for a release kit, `--output="<the link>"` for what it made. A step isn't done until it
  is saved, and a saved step is never done again.
- A step this place lacks something for: when the run sheet says what to do without it, do that here
  (`mm run step <slug> <n> --without`), so the run stays in one place. When it says "a to-do …",
  `mm run wait <slug> <n>` posts it as a to-do and lets go of the run. Then end; don't post the to-do
  by hand as well.
- "Continue <slug> in <project>" is `mm run resume <slug> --project=<project>`: do what it prints, from
  the step it names. When it lists files here that differ from the saved ones, show the user and run
  `--take-saved` only when they say so.
- A step that was started and never saved, and must not happen twice: check it didn't already before
  doing it, as the resume says.
- The session-start line says when a run is ready to continue here. Tell the user; continue one only
  when they say so (a routine's own instructions are that word).
- `mm run cancel` is the user's: only on their word, in this session. Never a key or a password in an
  output.

## Git: main stays a clean copy of GitHub

What git ignores is the user's work (`apps/studio/projects/`, `out/`, `brands/`, `thumbnails/jobs/`,
`overlays/` until `mm migrate` moves them out of the checkout, and `.claude/settings.local.json`); every
file git tracks is the framework, shared by everyone who pulls. The guard rails in `.claude/settings.json` hold to this, with their paths and hints in one list,
`tools/guard-rails.json` (change it there when a folder moves).

- On main, never edit a framework file or commit: the change goes on a branch (`git switch -c <type>/<what>`,
  or a worktree when other sessions share the checkout) and a PR. The pre-edit guard (`tools/guard-rails.mjs`)
  stops edits and commits on main and says where each change belongs; a production's own feedback goes in
  its `projects/<slug>/prefs.md`, and a lesson for a skill in the user's notes (`mm notes add <skill> "…"`,
  below).
- Every session starts with `tools/git-health.mjs` (`npm run git-health`): a half-done merge or rebase, edits
  or local commits on main, a checkout behind GitHub, stashes and branches not on GitHub. Tell the user what
  it found before starting, and fix it only with their OK.
- Never drop work without asking: no `reset --hard`, `checkout --` or `restore` on changed files, `stash drop`
  or `branch -D`, and never `git clean -x` or `-X`, which deletes the user's projects and renders (the guard
  stops it).
- Update with `mm update`: on a clean main it pulls (`--ff-only`), runs `npm ci` when the dependencies
  changed, then `mm migrate` (a dry run), `mm space pull` when the computer has spaces, and `mm doctor`. Edits or commits on main it lists and leaves;
  `mm update --yes`, with the user's OK, keeps them on a `local/<date>` branch and then updates main.
  `mm doctor` checks the machine (Node 22.6+, uv, ffmpeg, dependencies, builds, the render browser,
  git, workspace, keys); `--fix` repairs what it can. On main, install only with `npm ci`:
  `npm install`, `update` and the like rewrite `package-lock.json`, which changes only in a PR that
  changes dependencies (`deps/<what>`; the guard stops them on main).
- Generated files are built, never committed: `skills.json` (the skills registry, built by the app's
  `build` and `dev`) and the studio's mediamake presets (`mm` builds them when their sources change).
- Starting Claude with `MEDIAMAKE_GUARD=off` turns the guard off for one session; only the user decides that.

## Skill lessons: your notes, never the SKILL.md

What a session learns from the user goes in the user's notes for that skill, outside the repo, so no
session edits a committed file: `mm notes add <skill> "<what the user said> → <the rule>"` (dated for
you, in `~/MediaMake/notes/<skill>.md`, or the `workspace` that `~/.mediamake/config.json` names).
Before planning, read them with `mm notes <skill>` beside the skill's own Feedback or Lessons log. That
log is shared and changes only in a pull request: when the user wants their notes shared,
`mm notes promote <skill>` (a dry run, then `--yes`) puts them on a new branch and opens the PR, without
touching this checkout. A skill in one of the user's spaces gets them in that space's repo instead: one
commit pushed straight to the space's branch, as `mm space sync` sends a space (no PR), its folder
untouched until the next sync. Taste for one production still goes in its `projects/<slug>/prefs.md`.

A skill only ever gains general rules: true for the next job, on another computer. A lesson, and every
line written into a skill when it is made or changed, never carries one run's details (the prompt that
worked once, the fix for one picture, timings, seeds, file names, this computer's GPU, drives or paths).
Turn a correction into the rule it teaches, or leave it out; the run's details stay in its job folder or
`prefs.md`.

## MediaMake Spaces: the user's personal space and their projects'

A space keeps everything for one body of work, the same on every computer: a personal one (`space/` in
the workspace, only theirs) and one per project they are on (`spaces/<project>/`, everyone on that
project). What was made for it (`skills/`, `mcps/`, `apps/`) lives in a private GitHub repo, moved by
`mm space`; its files (brand kit, productions, releases, media) live in MediaMake's storage, moved by
the MediaMake Spaces MCP (`mcp/projectsync`, which was ProjectSync) and `mm media sync`. In the app it is
Spaces, `/app/spaces` (`mm space help`, `apps/mediamake/docs/private-spaces.md`). The
`use-mediamake-spaces` skill says what to run for each thing a user asks.

- Repos are made without asking: a new skill of the user's own goes in their space
  (`mm space new skill <name>`, or `mm space add <name>` for a variant in the workspace), never in this
  repo, and the space is created by itself when there is none. Only a missing GitHub sign-in
  (`gh auth login`) is the user's step.
- "Share it with the <project> project" is `mm space share <item> --project=<project>` (a dry run, then
  `--yes` once they agree): it makes the project's space when there is none and invites the project's
  members. Tell the user who could not be invited (no GitHub account linked in MediaMake).
- An item that should stay its owner's is linked, not moved: `mm space link <item> --project=<project>`
  (several `--project=`, `--to=<email>` for a member outside those projects, `--editor=<email>` for one
  who may change it; a dry run, then `--yes`). It gets a small private repo of its own, one copy with
  one history, cloned to `linked/<name>` in the workspace. Everyone on a linked project and every named
  member gets it with `mm space sync` or `mm space join`; only its owner and the named editors can
  change it. `mm space unlink <item> --project=<project>` (or `--from=<email>`) takes it from that
  project's people, or that person, only. In the app, Share on the item's card in Mine does the same.
- Adding someone to a project in the app invites them to the project's repo on GitHub when the owner
  connected GitHub there (once, in the access panel; MediaMake's GitHub App, set up as
  `apps/mediamake/docs/private-spaces.md` says). Otherwise `mm space invite <project id>` on the
  owner's computer sends it (the app shows the line with a copy button). That connection's token is
  sealed in `github_grants`: never print, log or copy it, and use it only through `lib/space/github.ts`.
- A member new to a project runs the line on the project's page, `mm space join <project id>`: it signs
  in when needed, accepts the GitHub invitation, clones the project's space and links its skills. When
  it says they aren't invited yet, tell them who invites (it names them); don't work around it.
- `mm space sync` at the start of a session that uses their skills brings in what other computers and
  teammates sent. What would go out is a dry run: show it and run `--yes` once they agree. It ends with
  each space's files waiting to come down or go up; those move with `mm media sync` (below), never by
  themselves.
- Large media never goes in a space: the media library carries it, and the item names it under
  `media` in its `item.json`.
- A space is private. Publishing an item from it follows the rule at the top like any other.

## Media files: the shared library

Footage, pins, generated art, songs, stems, sound effects, overlays and fonts are kept once in the
media library and reused by every production. Where it is on this machine is in
`~/.mediamake/config.json` (`library`); the rules and commands are in
`apps/studio/scripts/library/README.md` (`mm media help`).

- Search the library before downloading or generating anything (`media find`).
- Downloads go to the inbox, then `media ingest`.
- Projects get clones via `media use`, never symlinks.
- Before a heavy or paid analysis, check the cache (`media cache get`), and store results after (`media cache put`).
- Register a production at intake (`media production new <slug> --channel=…`).
- Deliver to the channel folders in Downloads only what the user approved (`media deliver`).
- Never move or rename library files by hand (`media mv`).
- The user's own songs (finals, remasters, stems) stay in their channel folder in Downloads, indexed
  where they are; never move them into the library.
- A channel's team shares its brand kit, skill variants, productions and media through `media sync` (a dry run, then `--yes`); files go up only after the user says so (`media share`).
- Any project can hold shared assets (overlays and other files every team uses): `media share <id…> --project=<projectId> --yes`, and `media sync pull --project=<id> --what=media` brings a project's assets here. Teammates with only the MediaMake Spaces MCP (it was ProjectSync) use its `list_shared_assets`, `download_shared_assets` and `share_assets`.

## The Cloud Library: read first, ask before saving

The Cloud Library keeps what a space reuses (a channel's songs with their masters, words, release
details and links) as collections of entries, the same on every computer and in a cloud session
(`mm library help`, `apps/mediamake/docs/library.md`). It is open to Cohort members for now, and every
upload, download and search is counted. The media library above stays the computer's own store.

- Before filling a collection, read its guide: `mm library guide <collection>` (where each field comes
  from, what is never guessed, the owner's preferences, the spellings its lists already use).
- Read before fetching: `mm library search` answers with cards, `get` and `read` give fields and text
  with no download, and only `fetch` moves a file.
- Never save without the person's yes. `mm library save …` without `--yes` saves nothing and prints the
  one sentence to ask ("Add the new song "…" to the Songs collection of the … space (cloud)?"): show it
  with what would change, and add `--yes` only after they agree. The same for `new`, `trash` and `prefs`.
- Never guess an ISRC, a release date or a link, and never a credit you were not given. Nothing in a
  template is required: leave a field empty.
- When a save stops on private details in a file, tell the user what was found. `--private-ok` only on
  their word. Never a key or a password in a field or a file.
- A song has one master, one lyrics and one transcript. Replacing one is the owner's decision.
- Before paying for a result again, ask what was made from the file: `mm library made-from <file>
  [--slot=transcript]`. Saving a result, say what it was made from (`--made-from=transcript=master:<tool>`).
  `mm library use <collection>/<entry> --into=<project>` puts an entry's files in a production's input.
- A collection is shared by the owner of its space only, and only on their word, in this session:
  `mm library share <collection> --with=<project> | --to=<email>` prints the sentence to ask, `--yes`
  after they agree; the same for `unshare`, `accept`, `leave` and `notes`. The others use the owner's
  live collection, never a copy, under its id in their Library (`songs`, or `songs-<who shares it>`).
  Never share one to make a step work, and never pass on a collection another space shared.
- A computer tells the Library what its media library holds only after its owner turns that on:
  `mm library report` shows what would go (a card a file: name, kind, size, SHA-256; never the file or
  its folder), `mm library report on` is the owner's word, in this session. Never turn it on for them.
  `mm library devices "<words>"` finds a file on a computer from anywhere; one that is only there is
  added on that computer (`mm library save <collection> --item <slot>=<id>`), or asked for with a to-do.

## Transcription: the ElevenLabs MCP first

Every skill gets a song's timed words the same way: ElevenLabs Scribe on the vocal stem, around
`mm transcribe <slug>` (`apps/studio/scripts/transcribe.ts`).

1. Run it with no flags first (free; the stem comes from `mm analyze <slug> --only separate`).
   It gives back the song's words from the media library's cache when they are there (done), else from the
   Cloud Library when a space the account can open holds the words of this exact song (done, nothing spent),
   else makes the stem's mono MP3 (`analysis/stems/vocals.mp3`, a tenth of the WAV) and prints the price. Show it and ask.
2. First choice, the local ElevenLabs MCP's key (`mcp/elevenlabs`, the official open-source server with an API
   key): `--yes` sends the MP3 to Scribe with that key, which the script finds in Claude Code's or Claude
   Desktop's config, and writes `input/lyrics.raw.json` (every word's start and end) and the cache. No widget.
3. Only where no local MCP can run (the Claude web or phone app), the hosted ElevenLabs connector
   (`mcp/elevenlabs-connector`, tools `creative_*`): `creative_transcribe_audio` on that MP3 (the user picks it
   in its file picker widget: give them an `open -R` line for it), download its `words_download_url`, then
   `--save=<that file>` keeps the words the same way.

`--lang=<code>`, `--letters` for letter times, `--mix` for the whole song, or a file path instead of a slug.
Never a curl with a key, a key in a .env, the local MCP's own `speech_to_text` (text only, no times) or the
MediaMake MCP's transcriptions. When installing, the local MCP comes first (an API key, files straight on the
computer, no widget); the connector is the alternative for the web, where every result is a flow run to
download from.

## Releases: always give the item's link

Every catalog item (skill, MCP, app, tutorial) has a page for admins,
`https://mediamake.microfox.app/app/releases/<kind>/<slug>` (e.g. `/app/releases/mcp/browse-hack`):
what it is, who can open it, where it lives, what installing it does, and what needs or uses it.
`/app/releases` lists every item. The item's public page, the link to share, is
`https://mediamake.microfox.app/skills/<slug>` (`/mcps/<slug>`, `/apps/<slug>`).

- After any release step, give the user the link of each item it touched: `npm run catalog --
  release | add | promote | schedule | vault | grant | archive` and mm-release's `catalog_*`
  tools (they print or return it), a workflow that publishes a release, a new or changed skill, or an
  edit to `apps/mediamake/lib/catalog/third-party.json`. For a new version, link
  `…/app/releases/<kind>/<slug>#v<version>`.
- With mm-release connected (the admins' MCP, `/mcp/release`; the old MediaMake MCP at `/mcp` no longer has
  them), manage releases through its tools: `catalog_items` to see what is
  what, `catalog_item` for one item, `catalog_archive` to take unused items off the homepage (they
  stay public and installable), `catalog_set_stage` (the lowest membership that opens an item: public,
  plus, pro, cohort or vault), `catalog_set_health` (any kind; failed needs its reason),
  `catalog_set_readiness` (Beta, or Ready with the production that proves it), `catalog_add_third_party`, `catalog_set_listing` (an item's store listing: its tags, screenshots, description, headshot, icon and README), `catalog_set_video` (a skill's
  intro, a tutorial's video, a course's lessons; YouTube only) and `catalog_add_video_item` (a new
  tutorial or course), and for people `catalog_people`,
  `catalog_set_tier` and `catalog_membership` (the ladder is strict: Public, Plus, Pro, Cohort, Admin,
  each opening everything below it; a membership earned by contributing lasts 3 months unless an admin
  makes it permanent). There are no invite codes: a membership is applied for (a contribution,
  reviewed by an admin, or a request on the Subscription page) or given by an admin.
- How releases work: `apps/mediamake/docs/catalog-releases.md`.

## Items: installed with the sign-in

A computer signed in to MediaMake (`mm login`, once: it opens the browser, the user clicks Allow, and
the key it makes for this computer stays in the Keychain; no key is pasted) installs what
the account's membership opens by itself. `mm items` shows the account, its tier and each MCP and
app it opens (installed, behind or not installed), and MediaMake's hosted connectors it opens (mm-use
for every member, mm-release for admins); `mm items install --yes` installs and updates them all and
adds the connectors to Claude Code, `mm items install <id> --yes` one (`tools/items.mjs`). Signing in
to a connector is the user's step: `/mcp`, pick it, Allow in the browser.

- Never ask the user for the site address or an install prompt when `mm items` says they are
  signed in. Access follows the membership: there are no release or install codes. The site is
  `MEDIAMAKE_API_URL`, else `url` in `~/.mediamake/config.json`, else `https://mediamake.microfox.app`.
- Having access is the yes: install what their membership opens without asking, then do what the
  command lists as left (a new Chrome extension needs their one click on "Load unpacked").
- Not signed in: run `mm login` yourself (give it up to 5 minutes) and ask the user to click Allow in
  the tab it opens. Never ask them to make, copy or paste an API key; `mm login --key` (a key on
  stdin) is only for a computer with no browser. `mm login status` says who is signed in,
  `mm logout` signs out (`tools/login.mjs`).
- The install prompt (`install.md`, no code in it) is for computers without the repo or a sign-in.
- Every MCP is added on its computer, for every project, with its command as that computer finds it
  (`mm items install <id> --yes`, or install.md), so the same item works on a Mac and on Windows. The
  repo has no `.mcp.json` and git ignores one: a command in a shared file is one computer's. Never
  add a server to one.

## READMEs: every item's store listing

Every skill, MCP and app has a README, its store listing: its page and its dialog show it on the left,
GitHub-style, with the details in a narrow column on the right. `apps/mediamake/docs/item-readme.md` has
the format.

- A README introduces the item, in this order: a video link alone on the first line when it has one
  (an intro video is an optional decoration; a headshot and an explaining infographic come first),
  `# Title`, what it does in a line or two, `## How to use`, `## What it uses` (the skills, MCPs and apps it depends on and
  the part each plays) and, always last, `## What the skill outputs` with examples. Never how it works:
  that stays in SKILL.md.
- That order is strict for a shared-use skill (one that can be listed in the store). A private-use
  skill's README can be loose, and it needs no "Made with this". A skill's nature (`private-use`,
  `shared-use`) and type (`internal`, `superset`, `subset`, `mcp-use`) are set on its page (Edit details)
  or in its README's frontmatter. Every subset names its `superset` (the skill it is a style or a part
  of). Ask the user for these when a skill is made or released; never guess them.
- Another item is named as a link: `[[skill-name]]`, `[[mcp/name]]`, `[[app/name]]` (or
  `[words](skill:name)`), each opening that item's page. Its page's right column lists what it depends
  on and what uses it, linked the same way.
- A skill's is `README.md` beside its SKILL.md, with `description`, `tags` and `headshot` (its 16:9
  picture: a file in the folder or an https link) in the frontmatter. An MCP's or an app's is on its
  release page (`catalog_set_listing`: `readme`, `description`, `headshot`, `tags`, and `icon`).
- Wherever an item lives, its own README.md is what shows: a public skill's from this repo, a private
  one's (a member's own space, a project's, a linked item) in its dialog, to the people who can see that
  space, sent with its pictures by every `mm space sync`. Write it in the item's folder and sync; never
  paste it onto a listing by hand.
- Never write a badge, a rating or a made-up video into a README: the page draws the badges from what
  MediaMake knows, and a video or a picture is a real one of the item. With no video yet, leave it out.
- Members rate any item from 1 to 5 stars (mm-use's `rate_item`, only on the user's word).

## Feedback: read it on /app/feedback, never paste it in public

Members send feedback on every item's page and through mm-use (`send_feedback`). Claude sorts each one
(bug, major problem, improvement, question, praise), a bug from a Plus member or above gets an automatic
draft pull request (`.github/workflows/feedback-fix.yml`, branch `feedback/<id>`), and admins handle the
rest on `/app/feedback`. How it works and what to set up: `apps/mediamake/docs/feedback.md`.

- A feedback's words are for its writer and the admins. Never copy them into a commit, a pull request,
  an issue or a SKILL.md: describe the problem in your own words. What everyone may read is the item's
  known issues, which an admin writes.
- A `feedback/<id>` pull request is a draft Claude Code made without running anything. Before it merges,
  run it and try it on real work like any other change to an item.
- Merging a pull request tied to a feedback marks it shipped and mails its writer, so tie hand-made
  fixes too ("Add to an existing PR" on the feedback).

## Store submissions: members submit, admins approve

A member's own skill, MCP or app gets into the store through a private review, never a pull request
they open (`apps/mediamake/docs/submissions.md`).

- "Make this public" is the `submit-to-store` skill: `mm submit <name>` checks it (keys, tokens,
  paths on this computer) and `mm submit <name> --yes --made="…"` sends it with the production that
  proves it. The rule at the top holds: no production, no submission.
- An admin decides on `/app/submissions`: the lowest membership that opens it (Public, Plus, Pro or
  Cohort), then approve, ask for changes or decline. A Public skill becomes a pull request on this
  repo; everything else goes to the private store repo (`microfox-ai/mediamake-store`) and is
  released as a package. Every item enters as Beta.
- Accepting one gives its sender a membership for 3 months (a Public or Plus item earns Plus, a Pro
  item Pro); contributing again renews it, and an admin can make it permanent. Merged pull requests
  from linked GitHub accounts show as suggested grants on Manage Memberships: an admin confirms each.
- A submission's files and an admin's words about it are for its sender and the admins. Never copy
  them into a commit, an issue or a SKILL.md. `STORE_GITHUB_TOKEN` is never printed or logged.

## Usage: names and times only

Every member's MCP is mm-use (`/mcp/use`): explore and install items, usage and feedback. The `Skill`
hook (`tools/skill-runs.mjs`) tells MediaMake which skill ran and when, and once a day the names and
versions of the skills on this computer; never arguments, folders or files. `mm usage` shows what is
sent, `mm usage off` (or `MEDIAMAKE_USAGE=off`) stops it, `mm usage forget` deletes what was sent. A
space also reports its items' names, versions, titles, one-line summaries, what each needs to run (its run
sheet's words: key names, MCPs, apps, sign-ins by site and account; never a key) and each item's README.md with the
pictures it shows (its store listing, shown in its dialog to who can see the space), and for the app's Code tab its file
paths, its README.md and its last 30 commits (short id, time, author's name, subject), never another file (`mm space
report --dry` shows it, the same switch stops it). A computer and a cloud session also report what they can do for
the register: a random label, the name its owner gave, the run sheets' words, the limit written beside a key, and a
cloud environment's space repos (`mm access --dry` shows it, `mm access forget` removes it). A computer
whose owner turned it on also reports a card for each file of its media library: name, title, kind, subject,
tags, size, length and SHA-256, never the file or its folder (`mm library report` shows it,
`mm library report forget` removes it). When
a user asks what MediaMake knows about them, show `mm usage` and `apps/mediamake/docs/usage.md`; never
send more than this from a skill or a script.
