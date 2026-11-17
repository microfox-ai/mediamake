# Usage: what MediaMake knows about the skills you run

MediaMake keeps three things about how an account uses it, so the app can
show "what you use most" on Home and "skills on your computer" under Mine.
Nothing else about your work is sent or stored.

| What | Exactly | Stored as |
| --- | --- | --- |
| A skill run | The skill's name and the time it ran | `skill_runs`: `{ clientId, skill, at }` |
| The skills on a computer | Each skill's name and version | `local_skills`: `{ clientId, device, skills: [{ name, version }], reportedAt }` |
| An app opened from the app | The app's catalog id (`app/skill-library`) and the time | `app_opens`: `{ clientId, app, at }` |

Never sent: a skill's arguments, the folder or project it ran in, the
session, file names or contents, what it made, or your computer's name. The
server enforces it too: a report that carries more has the rest dropped before
anything is saved (`lib/usage/usage.ts`), and a name that looks like a path is
refused. `device` is a random label made once on the computer (`mac-3f9a`). A
version is the SKILL.md's `version`, else a short hash of the SKILL.md.

## Where reports come from

- **The hook**, on a computer with the MediaMake repo: `tools/skill-runs.mjs`
  runs after every `Skill` tool call (`.claude/settings.json`). It writes the
  full line (with arguments and folder) to the media library on that computer
  only, then hands the name and the time to `tools/usage.mjs`, which posts
  them from a detached process so the skill never waits. Once a day the same
  process sends the skill list. Only when the computer is signed in
  (`MEDIAMAKE_API_KEY`, or the key `mm login` keeps in the macOS
  Keychain); signed out, nothing leaves.
- **mm-use**, the members' MCP (`/mcp/use`), where no hook runs (the Claude
  apps on the web or a phone): `report_skill_run` and `report_local_skills`.

- **The app itself**, for apps: an app is a page of this site, so no hook or
  MCP can report it. Pressing Open on an app in Home, Explore or Mine (signed
  in) saves its id and the time, nothing about what is done in it.

## What the app shows from it

- **Home** (`/app`): three columns. Skills by their runs in the last 90 days;
  MCPs by the runs of the skills that work with them (an MCP reports nothing
  itself: a run of a skill counts once for each MCP in its
  `## First: check the MCPs` table); apps by how often they were opened from
  the app. Then what was installed lately, from the catalog's install records.
- **Mine** (`/app/mine`): what the account installed, and from the skill lists
  its computers reported: MediaMake's skills there, its own variants
  (`<skill>-like-<ref>`, `<skill>-v<N>`), and its other skills.

The lists are worked out in `lib/app-shell/member.ts`.

## Turning it off

| | |
| --- | --- |
| `mm usage` | What is sent, to which site, and whether it is on |
| `mm usage off` | Stop sending from this computer (`"usage": "off"` in `~/.mediamake/config.json`) |
| `MEDIAMAKE_USAGE=off` | The same for one shell or session; it wins over the config |
| `mm usage on` | Send again |
| `mm usage skills --dry` | Show the skill list that would be sent, without sending |
| `mm usage forget` | Delete every run, skill list and app open MediaMake holds of the account |

Off is local to the computer and stops the hook's reports and
`mm usage skills`. Claude is told never to call `report_skill_run` for a user
who turned reports off.

## The API

All behind the middleware (session, API key or a connector's token); an
account reads and deletes only its own.

| Route | |
| --- | --- |
| `POST /api/usage/skill-runs` `{ runs: [{ skill, at }] }` | Report up to 200 runs. A run reported twice counts once. Answers `{ saved, known, dropped }` |
| `GET /api/usage/skill-runs?days=90` | The account's skills by how often they ran, most used first: `{ skills: [{ skill, runs, lastAt }] }` |
| `DELETE /api/usage/skill-runs` | Forget the account's runs, skill lists and app opens |
| `PUT /api/usage/local-skills` `{ device, skills: [{ name, version }] }` | What one computer has now; replaces that device's last list |
| `GET /api/usage/local-skills` | Each device's last list |
| `POST /api/usage/app-opens` `{ app }` | One app opened from the app: its catalog id. The time is the server's |
| `GET /api/usage/app-opens?days=90` | The account's apps by how often it opened them |

## Spaces

A member with a space (`mm space`, `docs/private-spaces.md`) also reports what
each space holds on each computer: the repo's name, the computer's label, the
commit, each item's kind, name, version, title, one-line summary and what it
needs to run (the words of its run sheet: key names, MCPs, apps and sign-ins by
site and account name, never a key or a password; `docs/cloud-device-runs.md`), and for
the space's Code tab the paths of the repo's files, its README.md and its last
30 commits (short id, time, the git author's name, subject), plus the project's
id for a project's space (`PUT /api/space`, stored in `spaces` and
`space_items`). Never another file's contents, a path on the computer or a token. The same switch stops it
(`mm usage off`), `mm space report --dry` shows it, and `mm space forget`
deletes it. Which repo is a project's space is told when someone makes it,
whatever the switch says: the project's members need it to find the space.

## Feedback

`POST /api/feedback` `{ text, itemId?, version? }` takes a member's feedback
about one item or about MediaMake as a whole (mm-use's `send_feedback`; every
member may send, 30 a day at most). It is stored in `feedback` with the
writer's membership at the time and read by admins and the writer only
(`GET /api/feedback`, admins with `?all=true`). What happens next (Claude's
triage, automatic draft pull requests, the admin Feedback page, known issues
and the mail when a fix ships) is in [feedback.md](feedback.md).
