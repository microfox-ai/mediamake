---
name: make-cwc-tutorial
description: Make a "Cook with Claude" tutorial — a ~2-minute 16:9 episode about one of MediaMake's skills (later MCPs and apps) in Remotion, in apps/lyrics_videos, built on episode 1 (/pack-brand-kit, final 2 Nov 2026). The story runs blank page → world: a cold open on the finished work, the series opener, "one of the many open-source skills", the literal copy → paste → name-it of the install prompt, the skill's research as a 3D fly-through, its rounds as a deck with the user's real notes, the reveal in 3D matched to the real result, what it delivers, a 3D shelf of everything made with it, a call to action ("now it can be your idea… just start"), and the series end card asking "What do you wish to make next?". Continuous voice-over in the brand voice (ElevenLabs), the picture timed to its words; kinetic captions, sparkle traces, brush strikes, three.js and CSS 3D, Pexels stock as texture; every claim verified. Reviewed through Video Revision (revise-video), then published: its 9:16 Short, the YouTube pack (thumbnails from its frames, a title, a description with chapters and the install link) and the uploads with Browse Hack. Use when the user says "make a Cook with Claude tutorial / episode for <skill>", "tutorial video like the pack-brand-kit one", "/make-cwc-tutorial <skill>", or asks to change, pack or upload a project named cookwithclaude-* under apps/lyrics_videos/projects. Append new user feedback to the log at the bottom.
metadata:
  depends-on: revise-video, create-thumbnail, pack-youtube
  reference: apps/lyrics_videos/projects/cookwithclaude-pack-brand-kit (ep. 1, final render 2026-11-02)
---

# make-cwc-tutorial

**Cook with Claude** is MediaMake's tutorial series on its YouTube channel: one episode per item
(skill first; MCPs and apps later), each about two minutes, with a 9:16 Short of it. Episode 1, `/pack-brand-kit`, took two rewrites
of its story and three rounds of review notes, was signed off on 2 Nov 2026 ("yup this is final") and
went up on YouTube on 3 Nov. This skill is its formula; `reference/ep01.md` tells the episode from
brief to upload. `template/` holds its code, `tools/` the voice and checking scripts, and the finished
project is `apps/lyrics_videos/projects/cookwithclaude-pack-brand-kit` on the user's machine (projects
are gitignored; the template is the committed copy).

## The rules (the user's own notes, turned into practice)

1. **Inspiration and motion, never marketing.** No stats read out for their own sake, no "why we do
   this", no subscribe pitch, no feature lists ("this looks like a marketing video transcript").
   One story: a blank page becomes a world.
2. **How simple it is comes first, shown for real.** Right after the opener: copy the real install
   prompt from MediaMake, paste it into Claude (terminal and desktop app side by side), name it with
   the skill's own first prompt. "That's the whole setup."
3. **A continuous voice, with the picture timed to it.** How-to stretches and showcases are carried
   by flowing reads (one take each, natural pauses); single words land only on montage beats ("Draw.
   Again. Again. Again."). The narration sets the clock: measure the words, then time the picture.
4. **Only what can be proven.** Every claim gets a fact-sheet row (claim → evidence → test). The
   user's own numbers go in only with a source; otherwise say the checked figure and keep their line
   as an alternate take. Counts stay true about the whole ("more than a dozen brands": 14 kits, 12
   shown).
5. **Private work stays out.** Some of the user's channels are private; ask which outputs are
   public before building a shelf, and leave the private ones out of every beat.
6. **Real outputs and real words.** The user's finished files, their actual review notes as chat
   bubbles, the live catalog's skill names, the real install prompt. Never a mock-up of an output.
7. **Craft rules from the review rounds:** full-resolution logos (never pixel tokens); nothing
   revolving for the sake of it; strikes painted on the thing struck; no dip to black between light
   scenes; a held beat keeps a little motion; every spoken line gets a kinetic caption.
8. **Paid calls are asked first** with the credit cost (ElevenLabs voice and sound effects), and the
   script is approved before anything is recorded.
9. **Review renders at half size; the master once,** after sign-off, then delivered.

## First: check the MCPs

Before doing anything else, check which of these MCPs this session has, and tell the user right
away about any that is missing and what it costs. A **required** one has no substitute:

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | The voice-over in the brand voice (`text_to_speech`) and new sound effects (`text_to_sound_effects`) | No episode: the series voice can't be replaced with another voice |

Everything else (Remotion, three.js, ffmpeg, whisper in `apps/lyrics_videos/analysis/.venv`, the
media library, the built-in browser for Pexels) runs locally. To check, look for the tools named
above: `mcp__<name>__<tool>` in Claude Code; a connector added in the Claude app has a random prefix,
so match on the tool's name. If they are only deferred, load them with ToolSearch.

## Intake (one round)

- **The item** and its catalog id (`skill/<name>`), and its install prompt as the live site builds it
  (`installPromptFor` in `apps/mediamake/lib/catalog/install-prompt.ts`; the copied one may carry an
  install code: never show a real code). Check the URL it names is the public one
  (`mediamake.microfox.app`, not a vercel preview).
- **Its first prompt** (`/<name> …`) and what it asks back.
- **Its real outputs** for the shelf, and **which are public**.
- **Its process, for the middle of the story:** what it researches (ep. 1: Pinterest and Dribbble
  boards), the rounds the user went through and their actual notes (from that work's session or
  storyboard), and the moment it came together.
- **The brand** `brands/cookwithclaude`: opener (`intro-4-opener`, approved), end screen, theme I3
  and sting F, the voice (id in its `brandguide.md`), logo components. Watermark: none.

## The episode, beat by beat (ep. 1's final cut, 130.7 s)

| t (s) | beat | voice | picture | for another skill |
|---|---|---|---|---|
| 0–3.6 | cold open | "This… was a blank page." | the finished world bursting out in 3D (the series' own intros and end screens on CSS-3D panels), the theme at its peak | that skill's best outputs at once |
| 3.6–7.2 | blank page | (a held pause) "…before we figured it out, that is." | ivory page, one caret, the twist line typed in the brush hand, a sparkle under it | same |
| 7.2–21.2 | opener | the opener's own read | `kit2/opener.mp4` | same |
| 21.2–26.3 | skills | "This is one of the many open-source skills. Free, and easy to use." | the live catalog's skill cards spiralling in 3D; ours comes forward in a sparkle ring and lands exactly where the copy card sits | same, its own card |
| 26.3–36.9 | the ritual | "Copy the prompt. Paste it into Claude. Then name it: tell it what you want to make. That's the whole setup." | ⌘C on the MediaMake card, the prompt peels off as a paper strip, drops into Claude Code + the desktop app, install lines tick, the ask types itself, sent | its own first prompt |
| 36.9–46.0 | look | "First, it goes looking, on Pinterest and Dribbble, and sorts what it finds into directions. You pick what you love." | a 3D fly-through of the 40 real references; they swarm into the four direction columns on "directions"; loops on the picks | what that skill researches or reads first |
| 46.0–60.1 | rounds | "Draw. Again. Again. Again." … "Until you find it." | the logo rounds as a 3D deck; the user's real notes typed as chat bubbles; a brush X painted on each rejected card before it flips | its rounds and the user's notes |
| 60.1–66.5 | the reveal | "…there it is." | a 3D object built from the brand's own parts (the wok, the extruded spark), a bubbling pot behind, match cut to the real logo animation | the moment it came together |
| 66.5–79.8 | what you get | "Motion. Sound. Voice." "A complete brand setup, with everything you need." | `[01] /03` counters with intros orbiting, the theme as bars, the voice's own waveform, a whip strip of the kit's pages | its deliverables, each as a device |
| 79.8–101.9 | the shelf | "Then we kept cooking. A skill, tested and iterated across more than a dozen brands, and over a hundred lessons. Different channels. Different stories. One skill. Every logo. Every intro. Every end screen." | a camera gliding along a 3D ring of every public kit (its intro and end screen playing, banner, guide pages, label card, full-resolution logo above), a beat per kit (1.44 s = 2 beats of the theme), regrouping into a grid on "Every end screen" | everything made with it |
| 101.9–110.7 | the call | "Every one of these… started with a name. Now, it can be your idea, your name. Just start." | an empty page over hands typing (Pexels): "your idea" retyped to "your name" with question marks popping round it, deleted while each question mark turns into a logo, "just start." springs in; sparks on the theme's final hit | same |
| 110.7–130.7 | end card | "What do you wish to make next?" | the logo plays in on slate, the prompt box types the question, "tell us below ↓"; held 20 s for YouTube's end-screen elements | same |

Facts behind ep. 1's lines (keep this kind of row for every episode): 40 references kept (35
Pinterest, 5 Dribbble, `brands/cookwithclaude/graphics/explorations/logo-1/references.md`); five
logo rounds with the user's notes; 14 kits, all in pack-brand-kit's own lesson log, 12 public; 111
lessons in its feedback log; the live catalog lists the skill and its install prompt.

## Voice-over

- **Voice:** "Cook with Claude Voice" (ElevenLabs Voice Design, id in the brand guide),
  `eleven_multilingual_v2`, stability 0.5, similarity 0.8, style 0, speed 0.92; a second take at
  0.45 / 0.9. (`eleven_v3` sounded like someone else.) `mp3_44100_128`.
- **Reads:** one take per stretch, sentences separated with `<break time="0.5–1.0s" />`, written to
  land roughly on the picture's beats. A single added word is recorded in context ("Look. <break/>
  Pick.") and cut out, so its tone matches its neighbours.
- **Recording:** the MCP can't write to `~/Downloads`, so record into
  `projects/<slug>/input/vo-rN/raw/<line>-<take>/` (one folder per take: same-second takes overwrite
  each other), then move every take to `~/Downloads/_INBOX/elevenlabs/<set>/` with a
  `<file>.source.json` (text, voice, model, settings, characters). The library's watcher may file
  them on its own into `sfx/misc` or `_unsorted`: move them with `media mv <path> --kind=sfx
  --subject=voice/<episode>` and tag them by path (`media tag <path> +voice-over …`), then
  `media use <path> <slug> --as=input/vo-rN/<line>.mp3` for the picks.
- **Checking without listening:** `tools/vo_check.py` (whisper transcript vs script, speaker
  similarity against the episode's existing voice, pace, pauses, loudness; run with
  `uv run --project apps/lyrics_videos/analysis --with speechbrain python -I tools/vo_check.py …`).
  Pick by word accuracy first, then similarity.
- **Cutting and timing:** `tools/cut_reads.py` (the light chain, −16 LUFS) writes the chunks and the
  voice list; `tools/voice_onsets.py` gives each sentence's true onset (silences; whisper places words
  early after a pause) for the `W` tables in `video/timeline.ts`, and every beat is then `read start
  + onset`.
- **Cost:** ep. 1's voice, every round included, was under 6,000 characters (about 6 % of the
  Starter plan's 90,000 a month).

## Music and sound

- The brand theme in passes, each placed on a measured hit (`brands/cookwithclaude/graphics/sound`:
  theme peak 18.077 s, final hit 25.84 s, sting lid ring 1.405 s): its peak on the cold open's first
  frame, its peak on the reveal's match cut, its final hit on the call's "just start." (+1 s). Ducked
  to 45 % under every voice chunk (`scenes/Sound.tsx`).
- Effects: the soft set made for ep. 1 (`cwc-whoosh-a`, `cwc-whoosh-b`, `cwc-swish`, `cwc-bubble`,
  `cwc-sparkle`; `media find cwc-` in the library) replaced the brand's first whooshes, which the user
  disliked across the whole video. No hiss or sizzle: the pot bubbles. Keys, pops and marker
  scribbles from the brand kit for typing, pops and strikes.

## Look

- **Grounds and type** (`template/video/theme.ts`): ivory #F0EEE6 / slate #141413 / oat #E3DACC,
  clay #D97757 the only accent; Plus Jakarta Sans 800 for words, JetBrains Mono for tags and prompts,
  Caveat Brush for the handwritten line, Lilita One in the end card's prompt box. Film grain over
  everything.
- **Motion language** from the user's inspo (`~/Downloads/MediaMake/inspo/goingthroughchange.mp4`):
  a word at a time under a clay `[01] /05` counter, a selection box with a mono tag, typed words with
  a caret, marker loops, whip strips.
- **Finishing kit** (`template/video/fx.tsx`): `KWord` (letters spring in, can fly out at the
  camera, can carry a caret), `KCount` (counter + word), `SparkTrace` (a line that draws itself with
  a bright head and sheds stars: loops round what matters, swooshes under a word; a loop needs radii
  ≈ 1.45× the box's half-size or it cuts the corners), `Sprinkle`, `SceneIn`. `Scratch` (a 2D
  zigzag) exists but looked bad over 3D cards: paint strikes on the card instead (`brushStroke` in
  `scenes/Draw.tsx`).
- **3D in this engine** (`three.tsx`, `css3d.tsx`):
  - Videos in 3D are DOM `<OffthreadVideo>`s placed with CSS transforms from the same three.js
    camera (`Css3D`, `Css3DObject`): `<ThreeCanvas>` draws once per frame, before a video texture
    arrives.
  - Don't put many `OffthreadVideo`s on one source: split an atlas into separate clips, or the
    compositor fails ("Request closed"). Render at `--concurrency=3`.
  - Preload WebGL textures before the canvas mounts (`usePreloaded`, held until `onCreated`).
  - Scenes in px units set the camera's `near`/`far` (5 / 30000).
  - 2D captions on 3D points use the same camera as maths (`makeCam`, `toFrame`); `makeCam` and
    `CameraRig` take a roll.
  - The fly-through (`scenes/Look.tsx`): cards in a tunnel round the camera's path, a drift then a
    dive on the word (bezier 0.5, 0, 0.2, 1) with weave and roll, fog in the ground colour, speed
    lines from the camera's speed, cards swarming on outward arcs to their board, pictures on both
    faces, shadows only near the board.
  - The brand's logo components import straight in. The 3D object match-cuts onto the logo's own
    shape: start the 2D logo at the 3D object's screen size, then pull back.
- **Stock footage** (Pexels): search through the built-in browser (curl gets 403 and the API needs a
  key), download `videos.pexels.com/video-files/<id>/…hd….mp4` into the library inbox with its source
  note, ingest, cut short loops. Texture only: dimmed, graded, screen-blended sparks.

## Steps

1. **Intake** (above); register the production (`media production new cookwithclaude-<item>
   --channel=mediamake --skill=make-cwc-tutorial`); log the work to the portal.
2. **Fact sheet**: every claim the episode will make, with its evidence and the test you ran.
3. **Script** `projects/<slug>/screenplay-v<N>.md`: per beat the voice, the captions, the picture and
   the sound, in the episode's pattern. Get it approved before recording.
4. **Record** (ask with the credit cost first), check, file, cut, measure onsets (Voice-over above).
5. **Assets** into `projects/<slug>/input/` (the public dir is `projects/`, so
   `staticFile('<slug>/input/…')` reaches them): search the library first (`media find`), clone with
   `media use`. `tools/prep_ep01.py` is how ep. 1 built its atlases, posters, label cards and
   textures; adapt it.
6. **Build from the template**: copy `template/video/` to `projects/<slug>/video/`, set
   `theme.ts` (slug, prompts, the user's notes), `timeline.ts` (read starts, `W` onset tables, beats,
   shelf order) and rewrite the scenes' content for the item. `input/bed.wav` is silence of the
   video's length (`audio: false`), `input/project.json` has one section per beat, `video/shots.json`
   one shot per beat with ids that stay stable across renders; `npm run prepare-project -w
   lyrics_videos -- <slug>`.
7. **Stills** at every beat's busiest moment and on every new word (`npm run stills -w lyrics_videos
   -- <slug> <t,…> --only`), tiled into sheets: words on their beats, text clear of objects and
   faces, nothing private, loops clear of their boxes.
8. **Review render** at half size (`npm run render-project -w lyrics_videos -- <slug> --proxy
   --concurrency=3`), `npm run preflight -w lyrics_videos -- <slug>` (answer the meant holds
   `--intended`: the blank-page pause, the typed ask, the breath after "Voice.", the 20 s end card),
   `tools/place_check.py` for the voice, then the link
   `https://mediamake.microfox.app/video-revision?folder=<slug>&video=<slug>.mp4` and the background
   watcher (`npm run wait-revision -w lyrics_videos -- <slug>`). Work every revision with
   `revise-video`.
9. **Master** once the user signs off (`render-project` without `--proxy`), preflight it, then
   `media deliver <slug> --what=video --yes` (set a clean `--title` on the production first: the
   file name comes from it).
10. **The Short** when the user wants one (A Short of an episode, below).
11. **Publish**: the YouTube packs and uploads for the episode and its Short (Publishing on YouTube,
    below), then, once the episode is live, its link as the item's intro video on the release
    dashboard.
12. **Log** each note's lesson below.

## A Short of an episode (9:16)

Ep. 1's Short (`projects/cookwithclaude-pack-brand-kit-short`, approved 3 Nov 2026, notes in its
`short.md`) is the pattern: the whole episode, recast for 1080 × 1920, not a 60 s cut.

- **Propose first, with an audio cut.** Lay the existing voice cuts out with ffmpeg (`adelay`, the theme
  passes) into an mp3 so the user hears the pacing before anything is built; no new recording unless
  a line is missing (then ask with the credit cost). The user chose every beat over a 60 s cut.
- **Its own project:** `cp -cR` the episode's `input/` (APFS clones), copy `video/`, register it
  (`media production new <slug>-short`); never touch the approved episode's files.
- **Retime only where asked.** To speed up a stretch, cut its continuous read at its pauses
  (`silencedetect`, cuts inside the silences, 10–20 ms fades) into pieces in `input/vo-short/` and
  shorten the gaps (ep. 1's ritual: 1.07–1.30 s → 0.55–0.65 s); the words keep their own pace. Every
  beat after it is the episode's time minus the gain (`ep1()` in the Short's `timeline.ts`).
- **The frame:** set `W`/`H` in `theme.ts` and the project's width/height; `makeCam`, `toFrame` and
  `Css3D` follow. Then re-place every scene: 3D cameras stand further back or widen (a narrow frame
  shows ~56 % of the width), tunnels and orbits turn tall, boards become portrait (the shelf: intro
  over end screen, label, guide pages, banner; the regroup 4 × 3), side-by-side windows stack, long
  lines break onto two, and a loop round a wide box becomes a swoosh under it. Captions and key
  content stay clear of the Shorts overlays (the bottom ~420 px, the right-hand buttons).
- **The opener:** the kit's own vertical version (`brands/cookwithclaude/intros/vertical/
  cook-with-claude-intro-opener-9x16.mp4`, scene `intro-4-opener-vertical`), played as it is. A boxed
  16:9 opener was only a stopgap.
- **The end card:** 7 s, not 20 (Shorts have no end-screen elements); "tell us in the comments".
- **Re-check what the episode shows against the live site**: the install prompt's address had
  changed since ep. 1 (now `https://mediamake.microfox.app`).
- **Checks:** stills at every beat's busiest moment (tile them at a readable size: thin thumbnails
  misled), preflight with the episode's meant holds answered `--intended`, `tools/place_check.py
  --vo=input/vo-short/vo.json` for the moved voice pieces.

## Publishing on YouTube

Run `pack-youtube` and adapt it: a tutorial has no lyrics, so the transcript is the narration, and the
description carries chapters and links instead. Ep. 1's packs are
`out/youtube/cookwithclaude-pack-brand-kit/` and `…-short/`.

- **Channel:** Cook With Claude, `@cook-with-claude`, in the Chrome profile `channel.json` names.
  `brands/cookwithclaude/youtube/channel.json` holds the standing answers: not made for kids, AI
  box unticked (the user's call for a designed narrator voice over motion graphics), language `en`.
- **Thumbnails** (`create-thumbnail`, in their own session while the words are written here): the
  brand's profile (`graphics/brand/thumbnail.json`: Lilita One hero words, the JetBrains Mono tag
  `EP 01 · /pack-brand-kit`, the lockup), pictures from **frames of the episode**, **hook words, not
  the title**. Hand the session the master's path, the strong moments with their times, and the
  narration as `input/transcript.txt`. Ep. 1: seven concepts, B1 picked ("A BRAND FROM / SCRATCH.",
  the 3D spark rising out of the wok). No "one prompt" claims.
- **Title:** offer three that pair with the thumbnail's words; the user may write their own (ep. 1:
  "Make a complete brand kit with Claude"). The Short: the same title + ` #Shorts`.
- **Description** (`ytmeta.py check <pack> --free`): two intro lines (what it makes, copy → paste →
  name it), `Get the skill: https://mediamake.microfox.app` and the skill's source folder on GitHub,
  then **chapters**, the series line ("one open-source skill, app or MCP an episode. Copy. Paste.
  Cook."), at most five hashtags. Ask first whether to add chapters; ep. 1's user wanted them.
  - Chapters start at 0:00, need at least three, and each must last 10 s or more. Put them on scene
    starts from `timeline.ts`, and merge beats shorter than 10 s with a neighbour (ep. 1: 0:00 cold
    open + opener, 0:21, 0:36, 0:46, 1:00 reveal + deliverables, 1:20 shelf, 1:42 call + end).
  - The Short's description is shorter, with no chapters. Don't link the full episode while it is
    still private or scheduled ("Video unavailable"); add the link, or set it as the related video,
    once the episode is live.
- **End screen:** the episode's own 20 s end card is the end screen. Draw the brand kit's card slots
  (`outros/cook-with-claude-end-prompt-card-guide.jpg`: a video card bottom left, subscribe beside
  it) onto a frame of it as `end-screen-card-guide.jpg`, after checking the slots fall on empty
  slate.
- **The Short's thumbnail:** the episode's picked design recast for 1080×1920 ("keep it simple, same
  as the video one"), in its own thumbnail job with `"size": [1080, 1920]` in `thumbs.json` and the
  same layers stacked: the kicker small above the hero word, as in the 16:9 original. Copy the
  render straight into the pack: `thumbs pick` re-encodes to 1280×720. Desktop Studio usually has no
  thumbnail field for Shorts, so the user sets it from the YouTube app.
- **Uploading** (`youtube_fill_uploads`, only when the user asks): it switches to the channel, fills
  the form and stops on the Visibility step. On ep. 1 it could not set:
  - the thumbnail;
  - a playlist that didn't exist yet ("Open Source Skills");
  - the scheduled date and time.

  Report every warning and leave those three to the user in the tab. Filling creates a private draft
  at once, so never fill the same pack twice. A file that arrives after the fill (the Short's
  thumbnail) goes in the pack, and the user adds it by hand.
- **Deliver** each pack beside its video: `media deliver <slug> --what=youtube --from=out/youtube/<slug>`
  (dry run, then `--yes`).

## Feedback log

Append dated entries: what the user said → the rule. The entries before 2026-11-02 22:30 were logged
in this skill's draft, `make-skill-intro-video`, over episode 1's build and four review rounds.

- 2026-11-02 · ep. 1 · "take the video motion graphics as default inspiration … use 'Cook with Claude' as the series title … guide user from copying the prompt and what it can deliver … you can use any and all assets we made with brand kit to demo" → the episode structure, the look, real outputs only.
- 2026-11-02 · ep. 1 · "this is an intro/demo video but it still has to show the basic copy/paste of prompt to get started in the starting as that will tell users how simple it actually is" → the copy → paste → ask opening is mandatory, literal and short.
- 2026-11-02 · ep. 1 v2 · "add voice over using elevenlabs (brand default voice), and make sure there are motion graphics captions for the voice over" → voiced in "Cook with Claude Voice"; every line gets a kinetic caption timed to the recorded words.
- 2026-11-02 · ep. 1 v2 · "make sure the setup instructions also available in the claude desktop" → the paste step shows Claude Code and the Claude desktop app side by side.
- 2026-11-02 · ep. 1 v2 · "explain why … not just empty promises … use the reference boards … take through the entire process … give me the entire voiceover and screenplay before we finalise" → the process story (boards, rounds with the real notes, the kit coming alive); a screenplay approved before recording or building.
- 2026-11-02 · ep. 1 v3 · "there is no hook or storyline in the script — create a hook" → open cold on the finished world, cut to the blank page; every loop the opening opens is paid off.
- 2026-11-02 · ep. 1 v3 · "make double point that all data is thoroughly tested, and we do not make videos of things that cannot be ascertained" → a fact sheet per episode (claim → evidence → test); unprovable claims cut; dates, not "N days ago".
- 2026-11-02 · ep. 1 v3 · "show all the brands built so far (not just logo, but the intros, outros etc.. details matter)" → the shelf: one station per kit with its intro and end screen playing, banner, guide pages, label card.
- 2026-11-02 · ep. 1 v3 · "remove the mediamake watermark not needed" · "end the video with 'what do you wish to learn next?'" → no watermark; the end card's prompt box asks the question (later "make next").
- 2026-11-02 · ep. 1 v3 · "use threejs and some 3d as well, not just 2d" → three.js and CSS 3D where things fly, turn and burn.
- 2026-11-02 · ep. 1 v3 → v4 · "stop. this looks like a marketing video transcript … focus on inspiration and things moving … keep it simple, keep it engaging" → rule 1; one story, a blank page becoming a world.
- 2026-11-02 · ep. 1 rev-001 · "before we figured it out that is... put the voice after a pause" → the cold open holds a silent beat on the blank page before its twist line.
- 2026-11-02 · ep. 1 rev-001 · "this is one of the many open source skills, free and easy to use … copy should come after the voice over (and … play a neat graphics)" → the skills beat before the copy step; the hero card lands exactly where the copy card sits.
- 2026-11-02 · ep. 1 rev-001 · "this animation is very weak, make it dynamic visual, enter 3d space and sound fx of swoosh in the entire video is also very bad" → the 3D fly-through; the soft whoosh set everywhere.
- 2026-11-02 · ep. 1 rev-001 · "remove the hiss sound, and give a bubbling sound" → no sizzle or whoomp; a bubbling pot.
- 2026-11-02 · ep. 1 rev-001 · "a skill that is tested and iterated over 20 youtube channels and 419 different ideations" → rule 4: only checked numbers in the voice; the user's line kept as an alternate take.
- 2026-11-02 · ep. 1 rev-001 · "just start replaces these line with sprinkle. and don't like 3d revolve, and also use good quality logos" → "Just start." with sparks; nothing revolving; full-resolution logos.
- 2026-11-02 · ep. 1 rev-001 · "come up with more effects like in the intro video (use pexels for stock footage search, use more dynamic text and scratch and sparkles path trace animations, giving it a smooth feel)" → the finishing kit on every beat; Pexels clips as texture.
- 2026-11-02 · ep. 1 rev-002 · "Pick - voiceover" · "Until you find it. - voice over" → added words recorded in context and cut out.
- 2026-11-02 · ep. 1 rev-002 · "the strike out animations are looking bad" → strikes painted on the card in 3D, flipping away with it.
- 2026-11-02 · ep. 1 rev-002 · "add some voice over before and after the text, that makes sense and flows well with the script" → a caption is announced by the voice, never left alone on screen.
- 2026-11-02 · ep. 1 rev-002 · "your name should come first in text, with ???? popping in the background, and then should disappear into the just start" → the call: a placeholder on the page, question marks that become the logos, then "just start.".
- 2026-11-02 · ep. 1 rev-002 (preflight) · two dips to black between light scenes, a frozen waveform, two silences → no scene ends through black; held beats keep motion; gaps filled with a whoosh or the bubbling.
- 2026-11-02 · ep. 1 rev-004 · "this part feels plain, as there is no continuous voice … put continuous voice over" · "make the audio feel smooth continuous voiceover" → rule 3: continuous reads, the picture timed to their measured words.
- 2026-11-02 · ep. 1 rev-004 · "remove the 2 … brand setups as they are private - this will shorten the video, which is good" → rule 5; shorter is better.
- 2026-11-02 · ep. 1 rev-004 · "a complete brand setup with everything you need" · "what do you wish to make next?" · "every one of these started with a name, now it can be your idea, your name, just start it" → the deliverables line, the end question about making, the call that hands the story to the viewer.
- 2026-11-02 · ep. 1 final · "yup this is final, draft a skill, call it make-cwc-tutorial (this should be able to create tutorial similar to this video)" → this skill, with ep. 1's code as `template/` and its tools.
- 2026-11-03 · ep. 1 Short · asked for a 45–60 s cut, answered "full video ( jsut speed uo the copy paste name a bit )" → a Short keeps every beat and voice line, recast for 9:16; a stretch is sped up by shortening the pauses between its sentences, never the words.
- 2026-11-03 · ep. 1 Short · "for the opener, create a vertical version and save it to brand kit" → Shorts open with the kit's own 9:16 opener (`intros/vertical/`), made in the brand kit and reused, not a boxed 16:9 one.
- 2026-11-03 · ep. 1 Short v2 · "all good" → approved: the whole episode at 114.7 s, the vertical opener, a 7 s end card.
- 2026-11-03 · ep. 1 YouTube · "pack youtube and upload to youtube" → Publishing on YouTube: pack-youtube adapted for a tutorial, thumbnails in their own session from frames of the episode with hook words, uploads filled with Browse Hack and left for the user to schedule or publish.
- 2026-11-03 · ep. 1 YouTube · picked "Install link only", then "sry, also put chapters in description" → tutorial descriptions carry chapters (on scene starts, each ≥ 10 s) as well as the install link.
- 2026-11-03 · ep. 1 YouTube · "Title : Make a complete brand kit with claude" → offer titles, but the user may write their own; the Short reuses it with #Shorts.
- 2026-11-03 · ep. 1 Short · "also upload the short" (visibility "immediately") → the Short gets its own pack and upload; no link to the full episode until that one is live.
- 2026-11-03 · ep. 1 Short · "also create a vertical thumbnail for the short" + "keep it simple same as the video one" → the Short's thumbnail is the episode's picked design recast for 9:16, not a new concept.
- 2026-11-03 · ep. 1 · "summarise everything we did in the video, and update the linked skill" → `reference/ep01.md` (the episode from brief to upload) and the publishing stage in this skill.
