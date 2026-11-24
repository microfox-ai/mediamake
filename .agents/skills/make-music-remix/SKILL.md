---
name: make-music-remix
description: The music and audio superset — change a finished song (a Suno track with its stems, or any mix) while it stays that song. It is the family's front door and does the remix work itself when no subset does — layering or rebalancing stems (another version's keyboard or percussion into the final, a part brought up or down), a genre remix (new drums, samples and vocal chops around the song's own vocal, a phonk, drill or ambient take) and edits to a length (a shorter song, a 30 s cut for a Short, a loop for a video) — and hands "make it louder" to its subset make-music-remaster-loudness. It maps the song bar by bar first (which stems play where, on the song's own grid), keeps the song's own mix as its main identity, has added parts follow the song's arrangement, keeps the words in front, builds two or three strengths in SoundCraft (REAPER when named), level-matched to the original, checks each by measuring, and lets the user pick by ear in the Stem Player. Use when the user says "remix <song>", "make a remix / a phonk / drill / ambient version", "layer the keyboard / percussion from the other version", "bring the vocals up", "rebalance the stems", "make it hit harder", "cut it to 60 seconds / 30 seconds", "shorten this song", "loop this part for the video", "/make-music-remix", or gives a song folder and asks for a new version of it. "Remaster", "master it" or "make it louder" alone is make-music-remaster-loudness. Not for making a song from a prompt (Suno), separating stems from a mix (mm analyze), transcribing (mm transcribe) or cutting footage to a song (make-video-music-remix). New user feedback goes in your notes (mm notes add make-music-remix), never in this file.
metadata:
  category: make
  version: 0.1.0
  depends-on: use-soundcraft
---

# make-music-remix

The main skill of MediaMake's music and audio family. Every member changes a song that is already
finished, and every member keeps it that song: what the user liked when they kept it is the thing not
to lose. Three songs in, the versions the user kept were the ones that changed least ("the rest have
lost the original touch"), and in the remixes the parts they flagged were the ones that broke the
song's own shape (percussion running on into a silence, drums over the words). So this skill changes
one thing at a time, on top of the song's own mix, and shows two or three strengths to choose from.

## The family

| Job | Who does it | Use it when |
|---|---|---|
| Louder only: the mix as it is, made louder for YouTube and streaming | `make-music-remaster-loudness` (subset; `make-loudness-remaster` until 2026-11-24, the name a computer that hasn't updated still has) | "remaster", "master it", "make it louder", "loudness options". Hand over: run that skill from its own first step, not these steps |
| Layer or rebalance stems | This skill, step 5a | "layer the keyboard from the other version", "bring the bass up in the hooks", "use the other take's percussion" |
| Genre remix | This skill, step 5b, until a subset does it | "a phonk remix", "a drill / lofi / ambient version", "make it hit harder with new drums" |
| Edit to a length | This skill, step 5c, until a subset does it | "cut it to 60 seconds", "a 30 s version for the Short", "shorten it", "loop the hook for the video" |

- **One request, two jobs** ("remix it and make it loud for the release"): this skill's job first, then
  the remix the user picked goes to `make-music-remaster-loudness` as the mix. Loudness always comes last.
- **The family's members now**: every skill whose README says `superset: make-music-remix`
  (`node tools/skills.mjs list --json` in the repo, `mm space` for the user's spaces). A member for a job
  above takes it over from this skill, and gets its row here.
- **Adding a member**: a narrower take on one of these jobs (one genre, one channel's remix style) is a
  subset that overlays these steps and says only what changes, made with `mm-new-item` (type `subset`,
  superset `make-music-remix`) or, for a style of this skill, `mm-fork-skill`. A job with a pipeline of
  its own (as the loudness remaster has) runs its own steps. Either way it gets a row in this table, and
  a README and a headshot of its own (`apps/mediamake/docs/item-readme.md`) before it is published: a
  new design, not this skill's picture with another name on it.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/soundcraft` | required | Building, checking and bouncing every version (`execute`, `batch`, `inspect_session`, `bounce_mix`, `save_session`), or the same with step lists through `soundcraft-cli` | No version can be built: install it as `use-soundcraft` says (it needs nothing open and runs in a cloud session) |

- Look for the `mcp__soundcraft__*` tools (load deferred ones with ToolSearch), else `soundcraft-cli
  --version`. One of them is enough: step lists run with the command line alone.
- REAPER is the other engine, only when the user names it: it must be open on the computer
  (`app:reaper`), driven through its MCP's tools (`mcp__reaper__*`) as `make-music-remaster-loudness`
  drives it. Never switch engines on your own.
- The scripts need `uv` and `ffmpeg` (`mm doctor` checks both).

## Before anything

1. Read the user's notes: `mm notes make-music-remix` and `mm notes use-soundcraft`. A rule there wins
   over a default here.
2. Read `use-soundcraft`'s SKILL.md once a session: how to drive SoundCraft, and the rules that cost the
   most time (bounce with both ends, the Maximizer limits sample peaks, saving copies the audio, tempo
   does not move audio). This skill builds on it and never repeats it.

## 1. Ask first

Ask in one go, as choices, and skip what the user already said:

- **The song**: its folder, with the mix, its stems (Suno's stems zip, unzipped beside it), its MIDI,
  and any other version whose parts may come in. The user's songs stay where they are, in their
  channel folder: read them there, never move or rename them.
- **The job**: the family table. "Louder" alone is the subset's: hand over and stop here.
- **What must not change**: by default the song's own mix plays untouched and stays its main identity.
  Ask what may change, and which version is "the song" when there are several.
- **The target**: a reference (a track whose sound they want, the channel's last approved remix) is the
  standard to build to, side by side. Without one, the song itself is the standard.
- **What it is for**: a release, a video, a Short. It sets the length, the format and whether loudness
  follows. A length is asked as "at most" or "exactly" (a video's runtime to the frame).

Say how you read loose words ("hit harder" as louder drums in the hooks, "the keyboard" as the other
version's keyboard stem), so a wrong reading costs a sentence, not a round.

## 2. Set up

- A slug, `<song>-<what>` (`<song>-phonk-remix`, `<song>-60s`), registered at intake:
  `mm media production new <slug> --channel=<channel> --skill=make-music-remix`. The channel is the one
  whose folder the song is in (`library.channels` in `~/.mediamake/config.json` maps each channel to its
  folder); ask when the song isn't in one. As a run, in that channel's project (`mm space` lists them):
  `mm run start <project> <slug> --skill=make-music-remix`, then `mm run step` / `mm run save` at each step.
- The work folder is the workspace's `out/<slug>/` (`mm workspace` says where; make it): the song map,
  sessions and step lists in it, each round's versions in `v<N>/`.
- **The file to work from**: for layering and a genre remix, the song's own mix from before its loudness
  master when there is one (a loud master already has its limiter in it, and loudness comes after the
  remix); for an edit, the file the user will use (the master, for a release or a video).
- **The words**: the song's timed words, from a `*.transcript.json` beside it or the Cloud Library. With
  none, `mm transcribe <slug>`: its first run is free and may find them already made; anything else shows
  the price before `--yes`. Where the words are comes from them, never from the vocal stem's level (a
  vocal stem carries bleed and is seldom silent).
- **Stems**: the song's own (Suno's are the cleanest). With none, put the song in a project's `input/`
  and `mm analyze <slug> --only separate` (four stems: vocals, drums, bass, other; free). Say that
  separated stems are coarser than the song's own and can leave traces of the other parts.
- **Sounds a genre remix adds** (drums, one-shots, samples): the media library first (`mm media find`),
  then the user's own kits. Anything downloaded goes to the library's inbox, and only royalty-free
  sounds the user agreed to.

## 3. Map the song

```bash
uv run <this skill>/scripts/song_map.py "<stems folder>" --words="<transcript.json>" \
  [--compare="<other version's stems folder, or the file to work from>"] --json=<out>/<slug>/song-map.json
```

It puts every stem on the song's own bar grid and prints, bar by bar, which ones play and how much is
sung, the bar ranges each one plays in, then every sung line with its time and bars and the pauses
between lines. Everything after this is planned in those bars and pauses.

- **The grid** comes from the song's MIDI tempo map (Suno's stems bring one; the script takes it from the
  folder), or from the tempo the user gives (`--bpm`, `--offset`). Never from beat detection alone: it
  guessed a wrong tempo on a real song.
- **Read the shape**: where the words are (the Words column and the lines), where the drums drop out
  (the build-ups, the bridges, the full stops), where each section starts. Name the sections by what
  plays and what is sung there (a line that comes back is the hook) or by the user's own words for them.
- **Another version, or the file to work from** (`--compare`): a lag near 0 ms with a likeness over 0.5
  means it sits on the same grid and drops in as it is. A steady lag is a shift by that much. A
  different tempo or a different length of a section is a stretch or a re-cut: say what it costs and ask.

## 4. Plan in plain words

Write the plan as a short table, section by section in bars: what is added, raised, lowered or cut.
Then the versions it will build: for layering and a genre remix, strengths (A, B, C: the same plan two
or three levels apart); for an edit, two or three different cuts. Show it and build unless the user
stops you; when the brief left a real choice open (which version's part, which sections), ask it here,
once.

The rules every plan keeps (the user's ears decided each one):

- **The song stays the song.** Its own mix plays untouched, as the main identity. Changes go on top of
  it, or replace one part section by section, never a remix of everything at once. No EQ, compression,
  clipping or noise cleanup on the song's mix unless the user asks for that one thing.
- **Added parts follow the song's arrangement.** An added part plays only where its kind plays in the
  song: added percussion where the song's drums play, stopping with the song's last hit before each drop
  or break. Nothing is added to the intro, a full stop or a silence unless the user asks: a gap in the
  song is part of its shape.
- **The words lead.** Wherever words are sung, the vocal sits at or above everything added; new drums
  and basses lead only where there are no words (intros, breaks, drops, outros).
- **Strengths, not one guess.** Two or three versions of the same plan, and a version for any question
  the user wants to hear ("C, but without the percussion").
- **Level-matched to the original** (layering, genre remix). Every version is turned down on its master
  to the original's own loudness, so the ear judges the change, not the volume, with true peaks at
  -1 dBTP or under (or no higher than the original's own, when it already sits above). Making it loud is
  the remaster's job, afterwards. An edit changes no level: a cut keeps its source's sound and peaks as
  they are, and its loudness differs from the whole song's by nature.

## 5. Build

In SoundCraft, as `use-soundcraft` says: a step list beside each session (`<out>/<slug>/remix-<n>.steps.txt`),
so a build can be run again and changed. A revision is a new build (`remix-<n+1>`), never over the last.

### 5a. Layer or rebalance

- One track plays the song's own mix, untouched. Each added part is its own track, cut to the bars the
  plan gives it, with short fades at every cut (a few milliseconds in, longer out) so nothing clicks.
- Levels by section with automation, a little under in the verses and full in the hooks, unless the plan
  says otherwise. A master trim brings each version to the original's loudness.
- **Rebalancing the song's own parts** (its vocal up, its bass down): the song's stems replace its mix as
  the base. First check that they add up to the mix (a null test against it, below): Suno's stems do
  within a little; separated stems don't, and the user should hear that difference before any other.

### 5b. Genre remix

- **Kept**: the vocal, the hook's melody and the song's key. The tempo stays, or changes by a step the
  user agreed (time-stretching a vocal changes its sound: say so first).
- **New**: the genre's drums and bass from the library or the user's kit (SoundCraft's drum machine and
  sampler, `use-soundcraft`'s `reference/midi.md`), vocal chops cut on the grid, the song's other parts
  kept where they suit the genre.
- **To the genre's sound**: beside a reference in that genre (the user's own finals in it first), compare
  by measuring, band by band and section by section (`use-soundcraft`'s `scripts/measure.py stats`).
- The words still lead: the genre's drums go under the vocal wherever it sings.

### 5c. Edit to a length

- **The words win.** An edit goes in a pause between sung lines (the map lists them), never inside a
  line, even when a line crosses a bar line. Within the pause, put it on the downbeat nearest the next
  section, so the cut lands where the song would go anyway. A loop is whole bars, its end flowing into
  its start, and starts and ends in pauses.
- A crossfade at every edit, and the end after a line's last word with a fade (`use-soundcraft`'s
  recipes have a teaser and a shortened song).
- **The length**: "at most" is met by choosing which sections stay; "exactly" is then reached by moving
  the edits within their pauses and timing the last fade, never by cutting into a line.
- Two or three cuts that keep different sections (the hook early in one, the song's own ending in
  another), each at the target length.

## 6. Check by measuring

Claude can't listen, so every version is measured before the user hears of it:

- **The meters** of each bounce: `peak_db` under 0 (above it the file is clipped); for layering and a
  genre remix, a loudness within 0.5 LU of the original's and a true peak as step 4 says.
- **The song untouched** (5a, 5b): bounce the added parts alone and null-test the version against the
  original plus that bounce (`measure.py null`): what is left should be silence.
- **Silence where promised**: run `song_map.py` on the added parts' bounce: they play only in the bars the
  plan gave them.
- **Edits** (5c): `measure.py join` at every edit (no click), no edit inside a sung line (against the
  map's lines), and the length. A null test of each kept piece against its place in the source
  (`measure.py null` with `--a-start` / `--b-start`) proves nothing else changed.

Fix and bounce again until all of it holds. Then say what was measured; never how it sounds.

## 7. The user picks by ear

1. Put the round in `<out>/<slug>/v<N>/`: the original as `<title> - 0 original.wav` (a copy; on a Mac
   `cp -c` costs no disk space), and each version as `<title> - A <what changed>.wav`, `B …`, `C …`.
2. `uv run <this skill>/scripts/review.py <out>/<slug>/v<N>` writes the folder's sidecar for the Stem
   Player (`remaster.json`, with each version's loudness and true peak) and prints the review link,
   `https://mediamake.microfox.app/stem-player?job=…`. Give it with one line per version: what it changes
   and its numbers.
3. The user's pick and notes come back in `v<N>/v<N>.revisions/rev-NNN.json` (and `.md`): the final,
   the drops, notes on a version at a moment. Act on them in a new round (`v<N+1>`), then set that
   revision `resolved` with a reply on each note.

From a cloud session the review screen can't reach the files: `mm cloud deliver <slug>` first.

## 8. Finish

- The pick is copied, byte for byte, as `<out>/<slug>/<title> - final remix.wav`, beside its session
  and step list.
- For a release, the pick goes to `make-music-remaster-loudness` as the mix.
- Into the channel's folder only once the user approves it: `mm media deliver <slug> --what=master
  --from=<the final>` (a dry run, then `--yes`).
- Save the run's step with what it made: `mm run save <slug> <n> --production --output="<the final>"`.
- A remix style worth keeping (one channel's genre take, one kind of edit) becomes a subset of this skill
  (`mm-fork-skill`), not more rules here.

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Ask first | nothing | no | yes | - |
| 2. Set up | `media:library` | no | yes | the song from the session's own files, or the Cloud Library (`mm library use`) |
| 3. Map the song | nothing | no | yes | - |
| 4. Plan | nothing | no | yes | - |
| 5. Build | `mcp:soundcraft` | no | yes | a to-do for a place with Soundcraft |
| 6. Check by measuring | `mcp:soundcraft` | no | yes | a to-do for a place with Soundcraft |
| 7. The user picks by ear | nothing | yes | yes | - |
| 8. Finish | `media:library` | yes | yes | a to-do: deliver the final on the user's computer |

`mcp:soundcraft` is `soundcraft-cli`, with or without its MCP added; REAPER (`app:reaper`) replaces it
only when the user names it, on a computer where it is open. Every step needs uv and ffmpeg. The one
step that can cost money is transcribing a song that has no timed words yet (step 2, `mm transcribe`,
`key:elevenlabs`): it shows the price and waits for the user's yes. Separating stems (step 2) runs on the
computer. A round is never built over: a new one is the next `v<N>`.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-music-remix "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-music-remix                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-music-remix` offers them to this log as a pull request.

- 2026-10-30 · On a remaster that rebuilt the song from its stems with EQ, compression and a clipper, the
  user kept the original mix made louder: "the rest have lost the original touch" → the song's own mix
  stays the base and the main identity; every extra stage is the user's to ask for.
- 2026-11-13 · On a phonk remix: "in [the parts with lyrics] vocals should be clear and crisp (& most
  important), the phonk can be background and smaller. For the rest of the parts phonk can be main" →
  the words lead wherever they are sung; added drums lead only where there are none.
- 2026-11-24 · On a remix layering another version's stems: "keep the final as the main identity…
  percussion extends into the silent parts, make sure that not happens" → added parts follow the song's
  arrangement and stop where its own parts stop.
- 2026-11-24 · Made as the superset of the music family, with `make-music-remaster-loudness` as its first
  subset: "Both" (the front door, and the remix work itself when no subset fits).
