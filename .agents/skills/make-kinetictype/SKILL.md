---
name: make-kinetictype
description: The kinetic type superset — type that moves with music in Remotion, as a Short or as a section inside a longer video, built as data on a shared engine (@mediamake/engine/kinetictype, video/edit.json, mm kinetictype). It is the family's front door and holds the steps every style shares. Each style is its own skill (make-kinetictype-STYLE, and make-kinetictype-like-EXAMPLE for one pinned to a single example video); this skill finds the ones on this computer at run time, hands a named style to its skill, and with none named lists them with a line each and suggests one. The shared steps are intake, the music (the best stretch of a long instrumental and a map of its hits), the words (a quote, or timed words from the audio), the inspiration research that is never skipped (Pinterest, or a reference video downloaded and built to side by side), the optional restyled pictures (crops, Midjourney restyles, cut-outs), the edit as data, checks, sound effects, review through revise-video, the master, delivery and the YouTube upload. With no style that fits, it builds the look from the research or the reference. Use when the user says "kinetic typography", "a kinetic type edit / video / short", "type that moves with the music", "an inspirational / motivational edit of this quote", "which kinetic type styles are there", "/make-kinetictype", or asks to change a project whose video/edit.json is a kinetic edit and names no style. A named style or example goes to its own skill (one giant word per hit with a build into a drop is make-kinetictype-buildup-punch). Not for lyric videos of a sung song (make-lyrics-video, make-waveform-lyric-video) or footage edits (make-video-music-remix, make-anime-music-video). New user feedback goes in your notes (mm notes add make-kinetictype), never in this file.
metadata:
  category: make
  version: 0.1.0
  depends-on: revise-video, revise-image, use-yt-dlp
---

# make-kinetictype

The main skill of MediaMake's kinetic type family: words that move with music. It does two jobs. It is
the front door, which finds the family's styles and hands the work to the one that fits. And it holds
the steps every style shares, so a style says only what is its own and cites the rest here.

The edit is data. `projects/<slug>/video/edit.json` lists the shots, each one device with its own time
span; `@mediamake/engine/kinetictype` draws them, one Remotion layer per shot; `mm kinetictype <command>`
does everything around it.

## The family

Three kinds of skill, each fixing a little more than the one before:

| Skill | Named | Fixes | Leaves open |
|---|---|---|---|
| The superset (this one) | `make-kinetictype` | Nothing about the look: the shared steps only | Everything |
| A style | `make-kinetictype-<style>` | The motion grammar: how words arrive, what a hit does, the shape of the video | Fonts, colours, art and storyboard, chosen for each job |
| A like skill | `make-kinetictype-like-<example>` | Also the surface of one example video: its fonts, palette, texture and sounds | Only what the new words, pictures and track force |

- A like skill suggests its example's style. It never copies the example's setup: the length, the
  sections and which device comes when are designed from the new inputs every time.
- A member says `superset: make-kinetictype` in its README's frontmatter. A like skill also names its
  style in its SKILL.md's `depends-on`.
- Until 2026-11-25 this name was one style, the one that is now `make-kinetictype-buildup-punch`. A
  production recorded with `--skill=make-kinetictype` before that day is that style's.

## The front door

1. **Find the family as it is now**, never from memory:

   ```bash
   node <this skill>/scripts/family.mjs      # each style, then the like skills pinned to it, with a line each
   mm space                                  # the user's spaces: styles made there (mm space sync brings new ones)
   ```

   In the MediaMake checkout the script asks the registry (`node tools/skills.mjs list --json`: the
   repo's skills and the user's own); anywhere else it reads the skills this computer loads. A new style
   shows up by itself: nothing here lists them.
2. **A style or an example is named** ("the buildup punch style", "like Screaming to Win", a style's
   slash command): hand over. Read that skill and run it from its own first step; it sends you back
   here for the shared steps.
3. **None is named**: show the styles with one line each (their README's description, the like skills
   under their style) and suggest one, saying why in a sentence. Suggest from what the job has: what the
   words are (a short quote, a long line, a spoken take), what the track does (a build into a drop, a
   steady pulse, no beat), whether there are pictures, and the reference when there is one. The user
   picks.
4. **A change to a project that exists**: its style is the skill its production was registered with
   (`projects/<slug>/mediamake.json` names it, and the project's `prefs.md` says what was chosen). Hand
   over to that skill, and note the session on the production: `mm media production touch <slug>
   --skill=<that skill>`.
5. **No style fits**, or the user wants a look of their own: "A look no style covers yet", below.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | required | The inspiration research on Pinterest (`pinterest_bulk_start`), a reference video's download (`youtube_download`, `instagram_download`), Midjourney restyles and upscales when the look uses pictures (`midjourney_generate` with `editImage`, `midjourney_upscale`), the YouTube upload (`youtube_fill_uploads`), a new instrumental from Suno when there is none (`suno_create`) | The user brings the references and the pictures as files, and uploads by hand |
| `mcp/elevenlabs` | optional | Sound effects the media library doesn't have (`text_to_sound_effects`, paid: ask with the price), and a voice take only if the user asks for one (`text_to_speech`) | The library's sounds only; no voice |
| `mcp/fal` | optional | A new picture or an upscale when Midjourney isn't available (Ideogram and FLUX.2 klein first; paid: ask with the price) | Pictures come from Midjourney or the user |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the Claude
app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch). If one is
missing, say at intake what it costs and offer to install it from MediaMake ("Set up mcp/<name> from
MediaMake by following https://github.com/microfox-ai/mediamake/blob/main/install.md"), or go ahead
without it. Browse Hack runs in the user's Chrome: when several profiles are connected, ask which one by
its Google account email (never by number). The profile signed in to Midjourney and the one that holds
the YouTube channel may differ (`list_profiles`, `youtube_list_channels`).

## Before anything

Read the user's notes: `mm notes make-kinetictype`, and the style's own (`mm notes <the style's
skill>`). A rule there wins over a default here.

## The shared steps

A style runs these and adds its own to each, in the order its own SKILL.md gives. With no style, they
are the whole job, in this order.

### 1. Ask first

In one round, as choices, skipping what the user already said:

- **The words**: a quote, a line, a script. Which words carry the weight is the style's question.
- **The music**: a track and the stretch to use, or a long one to pick from.
- **The pictures**, when the look uses any: a page, a poster, an artwork. Text printed on it is cropped off.
- **The target**: a style, a reference video, or the channel's last approved look. It is the standard to
  build to, side by side.
- **The shape**: a 9:16 Short by default; a 16:9 video or a section inside a longer one works the same.
  The length follows the music.
- **The channel** (for the delivery folder and the upload) and the Chrome profile, by email.
- **What may be spent**: the Midjourney round's size, ElevenLabs credits, fal, Suno. Give the estimate
  and start small.

Then register the production: `mm media production new <slug> --title="…" --channel=<channel>
--skill=<the style's skill, or make-kinetictype>` (`--deliver-folder=<channel folder>/<slug>` for a
channel the library doesn't know). As a run, in that channel's project (`mm space` lists them):
`mm run start <project> <slug> --skill=<the same skill>`, then `mm run step` and `mm run save` at each
step of that skill's run sheet.

### 2. The music

```bash
mm kinetictype pick "<song>" --length=24 --top=3      # a long track: 3 stretches, mp3 previews and a plot
mm kinetictype new <slug> --music="<song>" --from=<s> --to=<s> --image="<picture>" --quote="…"
mm kinetictype hits <slug>                            # again, after the stretch changes
```

- The media library first for a track (`mm media find … --kind=music`), then the user's channel folders.
  The user's own songs stay where they are: read them there.
- `pick` scores stretches with a quiet build into a drop a few seconds in, strong hits after it and a
  dip at the end. Offer all three by ear (an `open -R` line for the previews); the user's pick wins over
  the tool's order. A stretch chosen by hand is `--from` and `--to`.
- `new` makes the project: `input/music.wav` (the stretch, gained to a −1.8 dBFS peak, with 20 ms fades
  so it can loop), the picture cloned in, `input/quote.txt`, the manifest, `video/index.tsx`, a
  placeholder `video/edit.json` and `prefs.md`. Then it runs `hits`.
- `hits` maps the music: `analysis/hits.json` and `hits.png`, with the beats, the onsets, the bass hits,
  the riser, the drop, the section hits after it and the dips. Look at `hits.png` before laying anything
  out: the edit hangs on these marks. Where the tool's guess is wrong, set the marks in `hits.json` by
  hand and keep its own as `hits.auto.json`.
- A short excerpt's tempo is unreliable. Count from the hits, not from the BPM.

### 3. The words

- **A quote**: `input/quote.txt` (`new --quote`). On screen it is upper-case words grouped onto hits; how
  they are grouped and which word is the hero is the style's.
- **Words that are heard** (a voice take, a spoken or sung line in the track): their times come from the
  audio. `mm transcribe <slug>` with no flags first (it is free, and may find them already made), then
  the price shown to the user before `--yes`; a voice take's own file is `mm transcribe <file>`. It
  writes every word's start and end, and the shots' `from` and `to` are set on them.
- A whole lyric video of a sung song is `make-lyrics-video` or `make-waveform-lyric-video`, not this
  family.

### 4. The inspiration research

Never skipped, and always before any shot is laid out. One of two ways:

- **Pinterest, through Browse Hack**: one search per tab, `pinterest_bulk_start` (`perPageLimit` 15,
  `includeVideos` false), `pinterest_bulk_stop`, then contact sheets (`mm kinetictype sheet <folder>`).
  Search from the inputs (the source's own edits and posters, its palette, the devices its pictures
  suggest, the shape of the words) and search wide: inspiration can come from anywhere, not only the
  source's world. Earlier productions' boards in the media library come first (`mm media find`); don't
  search again for what is there. Close the research tabs when done.
- **A reference video**: download it first (`use-yt-dlp`, or Browse Hack's `youtube_download`) and cut
  frames from the file, never screenshots of a player. It is the target: name the devices that make it
  work, build to that standard, and put our frames beside its frames before the user sees anything. A
  reference is studied, never put in the video.

Either way, write what was taken into the project's `prefs.md`: each device, and the pins or the
moments of the reference it came from.

### 5. The pictures (when the look uses them)

Crops of the picture, Midjourney restyles that keep its pose and framing, cut-outs of its characters and
`input/assets.json`: `reference/pictures.md` has every step. Ask the round's size before any Midjourney
batch. Which crops and which art styles is the style's call, or the research's.

### 6. The edit

`video/edit.json`, shot by shot on the music's marks: `reference/devices.md` has the file's shape, every
device the engine draws, how a picture is placed, and where a custom scene goes for what the devices
can't do. A style brings its own storyboard shape, and its planner when it has one. The previous edit is
kept beside the new one, never written over.

### 7. Check

```bash
mm stills <slug> <seconds,seconds,…> --only      # one frame at each of the edit's own moments
```

Look at every still before the user does: each word readable, type clear of every face, a cut-out's cut
edges off-screen, enough contrast on every ground. With a target, our stills go beside its stills of the
same device (not the same second), and what is weaker in craft is fixed first.

### 8. Sound

```bash
mm kinetictype kit <slug>      # the sound kit from the media library into input/sfx/
mm kinetictype sfx <slug>      # video/sfx.json from the edit (the first time), mixed → input/mix-sfx.wav
```

- `sfx` writes the cues once from the shots, mixes them over the music through a limiter, and points
  the manifest's audio at `input/mix-sfx.wav`: the review and the master sound the same.
- Edit `video/sfx.json` (a cue's gain, pan, `at` or `end`) and run it again; `--auto` rebuilds the cues
  from the edit.
- Aim for about −13 LUFS with the true peak under −1 dB. Stacked low sounds at one big hit are what
  push the mix into the limiter: lower those first.
- A sound `kit` can't find: another from the library (`mm media find … --kind=sfx`), or ElevenLabs
  (`text_to_sound_effects`, paid: ask with the price).
- Which sounds go on which hits, and whether there is a voice, is the style's.

### 9. Review

```bash
mm render <slug> --preview && mm preflight <slug> --video=out/<slug>/preview/<slug>.mp4
```

The machine checks first, then the loop is `revise-video`'s: its link, its background watcher, the
revision files, a 10-second preview around what changed. A beat that is dark on purpose is answered with
`mm preflight <slug> --intended=<its comment> --why="…"`. An edit that loops: look at its first and last
frames together. A sound-only change is muxed onto the last render, not rendered again. Every round is a
new version beside the last.

### 10. Master, delivery, upload

- The master once, after the user signs off: `mm render <slug>`, then `mm preflight <slug>`.
- `mm media deliver <slug> --what=video` (a dry run), then `--yes` once the user approves it.
- The upload pack: a `youtube/` folder beside the delivery with the video (a clone), `title.txt`,
  `description.txt` (the words, a line about the edit, the source's credit, the music's credit, at most
  5 hashtags) and `info.json` (`channel` as the @handle, `madeForKids: false`, `alteredContent: false`,
  category, language, tags).
- Show the title and the description and ask first. Then `youtube_fill_uploads` with the folder: the tab
  waits on the Visibility step for the user to Publish or Schedule. When they say it is out:
  `mm media deliver <slug> --uploaded`.

## A look no style covers yet

When no style fits, or the user wants a look of their own, this skill makes the video itself:

- Step 4 decides the look: the research's devices, or the reference as the target. Nothing is designed
  before it.
- Build it with the shared steps and the engine's devices, with a custom scene in the project for
  anything they can't do (`reference/devices.md`).
- Every choice goes in the project's `prefs.md`: the type, the colours, the devices and where each came
  from, the sections on the music's marks. It is what a later change to this project reads first.
- Register it with `--skill=make-kinetictype`.

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Ask first, find the style | nothing | no | yes | - |
| 1b. Register the production | `media:library` | no | yes | skipped in a cloud session: the production is registered on a computer when its files are delivered |
| 2. The music | `media:library` | no | yes | the track from the session's own files, or the Cloud Library (`mm library use`) |
| 3. The words | nothing | no | yes | - |
| 4. The inspiration research | `mcp:browse-hack` | no | yes | a to-do: the Pinterest research, or the reference's download, on a computer with Browse Hack |
| 5. The pictures | `mcp:browse-hack`, `browser:midjourney` | yes | no | a to-do: the Midjourney round on a computer signed in to Midjourney |
| 6. The edit | `render` | no | yes | - |
| 7. Check | `render` | no | yes | - |
| 8. Sound | `media:library` | no | yes | a to-do: the sound kit and the mix on a computer with the media library |
| 9. Review | `render` | yes | yes | - |
| 10. The master | `render` | yes | yes | - |
| 11. Deliver | `media:library` | yes | yes | `mm cloud deliver <slug>` hands the user the files |
| 12. Upload to YouTube | `mcp:browse-hack`, `browser:youtube` | yes | no | a to-do: upload the pack from a computer signed in to the channel |

A hand-over to a style ends this sheet at step 1: the run is that style's, on its own sheet (it
registers the production). Step 4
needs nothing when the user gave the reference as a file. Step 5 runs only when the look uses pictures;
its cut-outs need no browser. The steps that can cost money are a transcription (step 3, `mm transcribe`,
`key:elevenlabs`), a Midjourney round (step 5) and a sound effect made with ElevenLabs (step 8): each
shows the price and waits for the user's yes. Step 12 fills the upload form; the user publishes.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-kinetictype "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-kinetictype                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-kinetictype` offers them to this log as a pull request.

A lesson about one style goes in that style's notes (`mm notes add <the style's skill> "…"`); only what
is true for every style belongs here.

- 2026-11-08 · "no need to stick to bluelock poster for inspiration, inspiration can come from anywhere" → research wide (step 4).
- 2026-11-09, Someone Took v2 · "does this skill not do inspiration research?" (the layout had gone straight from the pictures to the shots) → step 4 is never skipped: run the Pinterest research before the storyboard and name each device taken with its pins in prefs.md. Search from the inputs (the franchise's own edits, its palette, the devices its pictures suggest, the quote's shape), and reuse earlier productions' boards in the library instead of searching again. Before Browse Hack 0.18.0 a stopped Pinterest session stayed in Chrome's storage until its tab closed, and starts failed with "Session storage quota bytes exceeded"; 0.18.0 frees it on stop (if it happens on an older build, ask the user to close the old research tabs).
- 2026-11-09, Someone Took v2 · "Fresh v2 from inputs" → when a production's inputs come back, a new take is designed from its own track arc, quote and pictures (v2: cyan from the art instead of the reference's red, its own devices in the project's scenes.tsx, the user's quote card as the ending), and the earlier take is kept.
- 2026-11-25 · Made the superset of the kinetic type family: the front door and the steps every style shares. The style this skill held until then is `make-kinetictype-buildup-punch`, with the rules and the log it had.
