---
name: make-video-music-remix
description: Re-edit existing footage to a song in Remotion — any footage (films, sports, racing, anime, games, vlogs, concerts) to any song (rap, pop, EDM, rock, ballads, instrumentals): a song edit, remix edit, AMV, fan edit or velocity/CapCut-style edit. Cuts land on the beat, paced by the song's feel (long takes and slow motion for a slow, stylish track; a fast pulse for a hard one); the hero is always the subject and the cut takes his tone (comedy for a funny character); the footage's scenes run in order through every section and the lyrics only punctuate them; warp zooms, match cuts, cutouts, a speaker pump, impact frames, captions and big words, a title card, graphics and sound effects; reviewed through Revisions (revise-video). Reuses make-lyrics-video's analysis and render. Use when the user says "make a song edit / remix / AMV of <video> to <song>", "edit this footage to this song", "cut these clips to the beat", "take this edit as inspo", "/make-video-music-remix", or asks to change a project under apps/studio/projects that has a video/edl.ts. Not for lyric videos from artwork (make-lyrics-video) or logos. New user feedback goes in your notes (mm notes add), never in this file.
---

# make-video-music-remix

Existing footage, re-cut to a song. Four things decide every cut:

- **The song decides *when*:** its beat grid, its sections (by energy, not lyric gaps), its hits.
- **The hero decides *who*:** the song is his voice. Every shot is about the main character, in his
  own tone (a funny character is cut for comedy).
- **The footage's scenes decide *the order***: each section is one right scene, played in its own order;
  the lyric only punctuates where a moment of it fits.
- **The song's feel decides *the pace*:** a slow, stylish track gets long takes and slow motion at
  times; a hard, fast one a steady beat pulse.
- **The inspiration and the user's taste decide *how*:** transitions, type, sound.

Everything lives in `apps/studio`, next to the lyric videos: this skill shares their project
folder, audio analysis, stills, render and shot map, so read `make-lyrics-video` steps 2, 3, 7–9
once and use them as written; reviews go through the `revise-video` skill. This file covers what is
different.

Worked example: `projects/hitixf1` — "Hit It" (a rap song) cut to two F1-movie edits, eight
revisions to a final the user signed off (2026-10-25). Its `prefs.md` is the full feedback history;
the F1 examples below come from it, the rules are meant for any footage and any song.

**Taste comes from the user.** Keep `projects/<slug>/prefs.md`: intake answers, the style rules for
this look, and a dated log of every piece of feedback, numbered as the user wrote it. Read the
lessons log at the bottom and your notes (`mm notes make-video-music-remix`) before planning. Keep what the user praised; recast around it.

## The user's standing rules (read first)

Said again and again across hitixf1, breakingbadxdangerous, quicksilverxkingpin and kingpinxdeadpool;
every one of them got an edit rejected when it was broken. Check the cut list against each before any
render.

1. **No people-talking shots.** A mouth moving to words the song doesn't sing fights the vocal and
   reads as someone else's line: interviews, people at a desk, a character mid-sentence, the two
   headset talking heads (hitixf1), Paradox at his desk, Wade at the car lot (kingpinxdeadpool v4:
   "do not use people talking shots, does not work well with this kind of edit"). The one exception is
   an edit that uses the film's dialogue on purpose — then transcribe the line, place it in the mix and
   cut the shot to it — and that is a last resort when the footage runs short. A masked hero (no mouth
   to see) is safe.
2. **The hero is the subject; the lyrics are his voice.** Every line is about the main character, so
   it is cast on him: never word-match a line onto another character who happens to fit the word
   ("silver hair hot" on Colossus's chrome, "the throne" on Cassandra, "watching" on Negasonic: "going
   by the flow of the lyrics it is related to the main character, how can you show other characters").
   Others appear only briefly and out of focus (quicksilverxkingpin: "don't highlight other characters";
   breakingbadxdangerous: ~80 % the hero). The climax and the drop favour him most.
3. **The pace follows the song's feel, not its BPM.** A slow, stylish track (Kingpin: a serene boast on
   a half-time beat) wants long takes, holds and, at times, slow motion on the hero's moves (the film's own
   slow-motion takes: rule 8); a fast
   montage does not suit it ("this is slow stylistic music, fast shots does not suit, go with long slow
   motion shots at times"). A hard, fast rap wants a steady one-beat pulse at real speed (hitixf1).
   Decide this at intake from the song and the inspo, and ask when unsure.
4. **The hero's character sets the tone.** A character with a sense of humour (Deadpool) is cut for
   comedy: his poses, dance moves, deadpan beats, the fourth-wall stare, the gags of the scene — the
   song's boasts land on his jokes. A cold one (Walter White) for menace, a speedster (Quicksilver) for
   playful ease.
5. **Story, not word-matching.** Each section is one right scene in its own order; a line only gets a
   literal shot when the scene has that moment (quicksilverxkingpin v1: "the casting chased the
   words"). You don't have to show everything: fewer, longer shots that tell the story read better
   than every beat filled (kingpinxdeadpool rev-001: "no storytelling, moving the shots too fast … you
   don't have to show everything").
6. **Every section suits the hero** — the bridge too: his moment, not a side story about others
   (kingpinxdeadpool rev-001: "the bridge … does not suit the character").
7. **Every take once.** Never show a take twice — not a second moment of it, not the same shot from
   another fan edit (they share footage: compare frames), not a replay (a rewind runs fresh takes
   backwards). `mm remix` lists repeats; the list must be empty before a render ("don't re-use a
   shot that's already been used").
8. **Slow motion only where it is needed.** Prefer a take long enough for its cut, or one the film shot in
   slow motion; slow a take only when it is shorter than the cut the music asks for, and only by as much as
   it needs (rate = take left ÷ cut length, never below ~0.5). Slowing takes that were long enough read as
   "unnecessary slo mo" (kingpinxdeadpool v5); dropping slow motion altogether forced one-beat cuts on a slow
   song and wrecked the pacing and the story (v6/v7: "too fast … not in sync with the musical style … the
   previous storytelling was much better"). Never trade the pace or the story to obey a rule about one device.
9. **Match cuts are the signature.** A cut from one subject to another at the same place and size
   (`match`, `flow` on movement) was "excellent, do more of that": plan one into most sections — pick the
   pairs from the anchors (subject boxes) while casting, not after.
10. **Words that hit: lockups in one heavy face.** Many faces (v9/v10) and single highlights beside the hero (v11) read
    "generic in style and not impactful". The lockup (`lock`) is what lands: the phrase being sung, its highlight ('*')
    huge in a heavy condensed face (Anton), the words around it small in a lighter companion (Oswald, `fonts.small`) —
    the bold-word shorts' lockup the user loves — the highlight slamming in on its own word (from larger, blurred,
    white-hot, a shudder), punching on the kicks, red / acid / cyan for the punch words, a soft shade behind it on a bright
    picture. A knockout (`ko`, the picture inside the letters, diving through one) opens each section. A word appears
    only where its shot or its line says it ("no need to print words when the shot does not match").
11. **Words most of the time, at near-symmetric times, on the voice.** A lockup about every 2 beats, each on its own
    sung word and held until the next ("it should show words at a lot more of time … make words appear at symmetric
    times, at least close to symmetric"): kingpinxdeadpool v12 had words over ~170 of 237 s (v11: ~65). The lyric lines
    stay as captions in the bottom bar. Never start a word late to dodge a transition, and never fade it out while the
    camera moves (v11's `start`s and fades read as "word timings seem incorrect"): lockups sit in front, in screen space,
    still through zooms and cuts, placed where they cover least of the hero's head over every cut they span
    (`placeLocks`) and moving round the frame. Check timing against the vocal onsets (manifest.onsets.vocal), not by eye.
12. **The highlight acts out its meaning, on the beat.** One entrance for every word reads as routine ("play out
    different animation on the basis of lyrical meaning"): FAST / LIGHT SPEED streak in, DROP falls, CHOP is sliced,
    ENOUGH / NOT TODAY stamp, GOLD / SILVER shine, MILKY WAY twinkles, TEMPER shakes, FEAR shivers, DRIFTING floats,
    HIGHER / STAFF UP rise, VISION CLEAR pulls focus, ELEGANT is written on, STORY is typed, AGAIN rewinds under VHS
    jitter, NEVER PAST glitches, BLANK PAGE is wiped, TOP fills like a gauge, SNACK gets a bite, ORNAMENT swings, GLASS
    shatters on the next beat, PAWN topples, KNOCKED thumps twice, YEARS flips like a split-flap board, RAGE burns,
    DIVINE / HEAVENS get a halo, RHYTHM bounces like an equalizer (`act` on the lockup; ~50 of them). No act twice in a
    section; acts that repeat a motion run on the song's beat grid, not a clock.
13. **No buggy cuts.** Fan edits hide cuts and flashes inside their shots, and segregation boundaries can be a frame
    off. Before handing over a render, scan it: frames that change sharply inside a cut (a hidden cut, a flicker
    effect) and a stray first or last frame of another shot (compare each cut's edge frames). Retime a hidden cut onto
    the beat (choose the offset so it falls on one), end the cut before it, or replace the take. A freeze on a tiny
    take that then jumps reads as a glitch: let the take play and `hold` its last frame instead. A cut that plays its
    take to the very last frame can flash the next shot's first frame (segregation boundaries are a frame off): `npm
    run remix` warns "ends on the last frame of …" — add `hold` (it stops two frames short and holds, unseen).
14. **Smooth: the classic techniques.** Cut on action (`flow`: the move carries across the cut), match cuts (`match`),
    speed ramps into the hits (`ramp`: a take accelerates into the drop, the hook, the break — it needs ~1.4× the cut's
    length of take), whips along the motion, zooms on the bars, a white flash only into a new section.
15. **Action scenes run in the film's order.** Inside a scene every shot follows the one before it in story time; a
    shot from later, from another angle of a moment already past, or from another scene confuses ("some shots in
    scenes are not ordered properly, causes users to confuse as action scenes have to follow order"). A film's own
    clip is in order by its shot index; a fan edit is not — it intercuts scenes, so group its shots by scene from the
    frames and keep each scene's shots in their order. Cast the lyric inside that order: a highlight word goes where
    its moment happens to fall, never a shot moved to meet a word. Static inserts of one moment (a look at us, a
    close-up of the drawing) can sit anywhere in it.
16. **The top bar's meter speaks the hero's language.** The bass meter in the bar is part of the look: theme it to
    the hero (`gfx.meter`: 'deadpool' his mask with its eyes narrowing on the kicks between rows of bullets; 'bolt' a
    speedster; 'ecg' a heart monitor), never the default rev lights on a character edit ("update the waveform at
    center top to match deadpool aesthetics").
17. **A symmetric timeline.** Every cut starts on the section's beat grid — 2 beats on a half-time track (the kick on 1,
    the snare on 3): a slot holds one 2-beat cut, a pair of 1-beat cuts, or a long take over 2–3 slots; a breathing
    bridge in 4s ("you are not making the edit symmetric in the timeline"). Odd lengths (1, 3, 5) scattered through a
    verse read as a ragged timeline even when each cut is on a beat. The lines may start off the grid (rap pickups):
    the words land on the voice, the cuts on the grid.
18. **Inside a section, follow the music's own turns.** Where the beat is fast the cuts are fast; where it drops out the
    picture slows (kingpinxdeadpool v12, intro b: "the beat starts fast at beginning, so fast cuts at first, and then
    slow motion shots with ripple zoom in zoom outs like liquid morph" — a cut a beat, halves at the peak, then 4-beat
    slow-motion shots joined by `ripple`: a zoom into the subject as rings run out of it and the picture melts into the
    next shot, which lands zoomed and eases back out). Print the stems per beat (drums, bass, kick) to find the turns.
19. **The scene's big event lands on the section's big hit.** Find each section's loudest beat (drums and bass together,
    from the stems per beat) and put the scene's biggest moment on it — the crash, the explosion, the blow (kingpinxdeadpool
    rev-003, on intro b's peak at beat 52, where v12 had a dark back-seat filler: "at this beat the car crash should come
    in"). Then arrange the rest of the scene around it so its order still reads: the build-up before the hit, only the
    aftermath after it (shots from before the event move ahead of it or drop out). Look for the event in every source,
    including takes not used yet (the crash there was an unused take in a second fan edit).
20. **The best hero shot waits for the drop's bass.** Find where the bass actually drops (it can come after the drop's
    first beats: kingpinxdeadpool's flashes ride the kicks for 4 beats, then the 808 swells on 436–439) and land the
    strongest hero shot there, still, with a punch-in on the bass's peak (`steps`). When the user praises a shot, move it
    to the biggest moment rather than leaving it in a quiet one ("this shot is really good, put it at the d2 shot with
    the bass drop sync"), and refill its old slot by stretching a neighbour on the grid, never with a copy.

## Principles

These held across every review and apply to any re-edit (the standing rules above come first).

0. **The song tells one story, and its hero is on screen.** Before casting a single line, write the
   arc: one chapter per section (who the hero is, the turn, the rise, the triumph, the cost, the fall,
   the return, the end), each with its own emotion, building into the drops and crescendos and breathing
   in the breaks. Lines are cast *inside* their section's chapter, never by jumping across the source
   for a literal match. Keep the protagonist the subject: on breakingbadxdangerous the user asked for
   ~80 % Walter, 15 % the sidekick, 5 % everyone else — count screen time per character before rendering.
   v1 there, cast line by line from two fan edits, read as "randomly stitched clips".
1. **The intro is the hook.** No intro, no verse 1; no verse 1, nobody reaches the chorus. A strong
   open: one held, striking shot (black and white works), the title card within the first bars,
   then a small setup story told with *few long takes* (3–4.5 beats each, joined by warp zooms, on the
   beat) — not every moment of it, not a fast montage. Slow motion in the intro follows the song's feel
   (standing rule 3): hitixf1's hard rap rejected it, a slow stylish track takes it. The bar before the first
   verse is the launch: a rapid run of close-ups (½ then ¼ beat, the shake rising, a riser peaking
   on the downbeat), the bars closing in, and the first verse bursting in (colour after a
   black-and-white intro). A take can run across the boundary as one action: the intro shows the
   start of it, the verse picks the same take up seconds later.
2. **Pulse before sync.** A steady pulse, every cut on a beat, through a whole verse: one cut a beat on
   a hard, fast song; two to four beats a cut, with holds, on a slow stylish one (standing rule 3). When the
   vocal starts lines off the beat, start the line's shot on the beat before it (half a beat early
   reads fine). Never chase each line with half-beat offsets: the length then changes every other
   cut and the edit stumbles (hitixf1's verse 1: 23 half cuts, "very bad", next to a steady verse 2,
   "very good"). Half beats only as pairs inside one beat, on punchlines; quarter beats only in
   builds. `mm remix` prints each block's rhythm: watch the one-beat count and the length
   changes.
3. **Continuity where the song soars.** Verses may jump shot to shot as the words ask. Hooks, drops
   and bridges follow *one scene in its own order* — the start, the battle, the crash, the pit stop;
   the rain, the fire, the hospital — so the viewer can follow it. A hook can run straight into its
   drop as one story. Scenes come from the segregation (`scene` column, scene sheets).
   **When the footage is one or two continuous set pieces** (a film's scene, not a montage edit),
   continuity rules *every* section: give each section its own stretch of the story, in order, and
   let the lyric only punctuate where a moment of that stretch happens to fit (quicksilverxkingpin
   v1 cast verses line by line across both scenes: "bullshit"; its hook, one scene in order, was
   "excellent").
4. **Meaning, through the hero.** Inside the section's scene, a line gets the moment of *the hero* that
   says it (never another character's: standing rule 2): "axis spin" → a spinning
   wheel, "friction" → a glowing brake disc, "the static" → a picture breaking up, "every digit" →
   the timing tower, "switch lanes" → whips, "flame" → fire, "race against the minutes" → a pit stop
   under a countdown; in other footage "heartbreak" → the turned back, "rise" → the jump, "clash" →
   the blades meeting. A shot whose main action is something else (a wink in front of the map)
   doesn't say the line. If no shot says it, find more footage before settling (a second source paid
   off most). No lyrics: cast by the music's mood and energy, the same way.
5. **Speed by the song's feel.** The footage plays at its own speed. On a hard, fast song slow motion
   softens it and reads as filler (hitixf1), and speed ramps *up* into hits are the juice. On a slow,
   stylish track slow motion is part of the look — from the takes the film itself shot in slow motion,
   placed on the intro, the hooks' hero moments, the bridge and the break, with long takes held across
   several beats. Adding slow motion (`slow`, interpolated) was rejected even there ("don't unnecessarily
   slo mo, some shots are already slow motion"): keep `slow` for a quiet bridge the user asks for.
6. **One use per shot.** A shot seen twice reads as filler. Repeat only long takes, at other moments
   of the take. `mm remix` lists every repeat and flags the ones that show the same frames.
7. **Motion, not colour.** No graded slices, negatives, psychedelic backgrounds, mirrors or RGB
   glitches: they read as cheap. The picture stays natural with a light film finish; black and white
   only for whole passages (an intro, a bridge). The style lives in the moves — the user loved
   these by name: the **smooth warp zoom** (a deep push into the subject with zoom blur and a lens
   bulge, landing decelerated on the next subject) and the **speaker pump** (the picture box punching
   out on every kick between transitions). Make them the edit's signature in every section with a
   beat. Cutouts serve transitions and words behind the subject.
8. **Words that land.** Normal lines are captions in the bar (wide-tracked, revealed as sung); only
   punches go big over the picture (5–7 a verse, every hook word). Every word shows 0.15 s before its
   aligned start — aligned starts trail the consonants, and text that lands *with* the sound reads as
   late. Each big word belongs to one shot: hold it back to the shot it's sung over, clear it before
   a face, a new section or the next big moment. Nothing over close-up faces that hides them; timers
   and graphics only where the picture leaves room. Sign-offs small: tiny, wide-spaced capitals.
9. **Save the payoffs.** A signature motif (the start lights, a logo sting) once, at the last chorus;
   repeated, it bores. Celebrations, finishes and reveals only at the end. Drops hit hardest.
10. **Sound sits on its picture.** A whoosh on a pass-by shot, a crash on the crash, an impact on the
    hit — never an effect over a still graphic or on the sung word while the picture shows something
    else. Effects in a quiet spoken passage feel sudden; keep them under the music.
11. **Never lose a cut.** Every render is a backup until the user asks for a cleanup (see Render).

## Adapting to the song

| song | pacing | words | sound and juice |
|---|---|---|---|
| rap, hip-hop | verses one cut a beat (lines often start off the beat: pulse first); chants one cut per word | captions on nearly every line; big words on punchlines | pump through verses and drops; impacts on bars' punchlines |
| pop, R&B | verses 1–2 beats a cut, hooks 1 beat | captions on hook lines, few big words | match cuts and warp zooms over hard cuts; pump in the hook only |
| EDM, trap, phonk, instrumental drops | build: 2 → 1 → ½ → ¼ into the drop; drop ½ beat with ¼ runs | none, or one word per drop | riser peaking on the drop, impact, heaviest pump and shake |
| rock, metal | cuts on the snare; whips on fills | captions in verses | shake on snares, impact frames on hits |
| slow, stylish hip-hop (a half-time boast: Kingpin) | 2–4 beats a cut, long takes, slow motion at times on the hero's moves; a faster run only into a hit | a word acting out each punchline, captions | warp zooms and match cuts, aura on hero shots, a light pump |
| ballad, cinematic | 2–4 beats a cut, long takes, held moments | a few lines, small | swooshes and soft impacts; pump off; slow motion only if the user asks |
| no lyrics at all | by energy: sections from the stems | none, or the title only | as the genre above; cast by mood |

Sections, whatever the genre:

| section | treatment |
|---|---|
| intro | principle 1: held opener, title, a small setup story in few long takes, the launch bar |
| verse | the hero's scene in order on a steady pulse (its speed by the song's feel); captions; light pump |
| pre-chorus, build | drums often drop: hold shots, black and white, bars closing in (`tension`), riser |
| hook, chorus | one scene in order; big words; pump |
| chant ("don't blink ×7") | one cut or one punch-in per word (`steps` on one held stare works) |
| drop | the scene's climax in order; ½-beat cuts, shake on every cut, impact frames, heaviest pump |
| break, bridge | let it breathe: the hero's moment in order (never a side story), slow motion, black and white if it suits |
| outro | the walk-off; the payoff; the channel's sign-off small and wide-spaced |

## Adapting to the footage

- **Films, trailers, series:** story beats make the scenes; cast characters by what they do, not
  who they are. Burned-in titles, position towers and logo cards stay out unless they say the line.
- **Sports, racing:** families (faces/helmets, side-on action, POV/onboard, crowd, team, aerials,
  crashes, celebrations); the race itself is the drop's scene.
- **Anime, animation:** often 12 fps on 24 — never interpolate slow motion (it smears line art);
  match cuts on poses and silhouettes are strongest.
- **Game footage:** crop the HUD out with the plate's `crop`; replays and cinematics make the scenes.
- **Vlogs, travel, weddings:** long natural takes; slower pacing (the ballad row); faces and places.
- **Concerts, music videos:** cut the performer to *this* song's beats; never use their audio.
- **Several sources:** each its own segregation and prefix; a second source pays off most for
  literal casting. Match grades across sources only lightly.
- **Watch for:** "60 fps" uploads of 24 fps material (frames repeated 3-2: real slow motion needs
  interpolation); one-frame flashes of another shot hidden at cuts (an impact frame must not hold
  one); pillarboxed 4:3 archive inside a widescreen file (crop or avoid); letterboxing (`cropdetect`).

## What it needs

1. **The song** (wav/flac preferred) and, if words will be shown, **its timed transcription**
   (`input/lyrics.json`). No transcription and the user wants text: offer to transcribe it as CLAUDE.md ›
   Transcription says (`mm transcribe … --yes` with the ElevenLabs MCP's key; the hosted connector only on the web; paid: ask first).
   No words at all: skip the text layer (an instrumental edit is untested end to end here — check
   that `prepare-project` accepts the project before relying on it).
2. **Footage**: one or more videos (each its own source), ideally edits or highlight reels.
3. **An inspiration edit** (optional): a short reel whose style the user wants.

Tools: ffmpeg, uv. Engine (committed): `src/remix/` (cut-list language `edl.ts`, `resolve.ts`,
renderer `Remix.tsx`, `gfx/`), `scripts/remix.ts` (`mm remix`), `scripts/matte.py` (BiRefNet
cutouts + subject anchors), `scripts/render.ts` (`mm render`).

MCPs (check at intake which this session has):

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | recommended | Downloading footage from YouTube into the library inbox and checking a clip's real size and HDR first (`youtube_download`, `youtube_get_video`) | The user downloads every clip and drops it in themselves |
| `mcp/elevenlabs` | optional | Its API key for timed lyrics when the user wants text and has no `lyrics.json` (`mm transcribe --yes`, Scribe on the vocal stem's MP3), and sound effects as files only when the user asks for them (`text_to_sound_effects`) | The hosted ElevenLabs connector instead where no local MCP runs; else the user brings a timed `lyrics.json`, and no sound effects: the edit runs on the song alone |
| `mcp/elevenlabs-connector` | optional | The alternative where no local MCP runs (the Claude web or phone app): `creative_transcribe_audio` on the vocal stem's MP3 through its file picker widget, then `--save`; sound effects as flow runs to download (`creative_generate_in_flow`, `node_type: sfx`) | Nothing, while the ElevenLabs MCP's key is set up |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the
Claude app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch).
If one is missing, say what it costs before starting and offer to install it from MediaMake ("Set
up mcp/<name> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"; its tools show up in the next
session), or go ahead without it.

## Workflow

### 0. Intake (short)

Ask with `AskUserQuestion` only what the request leaves open, and say what you assumed: delivery
(16:9 / letterboxed / 9:16; fps; full song or a cut-down; vertical shorts of a stretch are
`make-video-music-remix-shorts`), the channel or brand it's for (its name
may sign off the outro), how much text, footage that is off-limits (spoilers, burned-in graphics,
people), anything they hate, and — unless the song makes it obvious — the pace (long takes and slow
motion, or a fast pulse) and the tone (the hero's humour, menace, cool). Write `brief.md` and seed
`prefs.md`. Register the production:
`mm media production new <slug> --channel=<brand id> --skill=make-video-music-remix`.

Ask too whether to pitch 3–4 looks of the first hook first, as 8 s clips side by side in one grid,
or to build the whole edit (`revise-video` › Previews or the whole video): the whole edit by default
under a minute or when they gave an edit to follow, previews when the style is open.

### 1. Project folder

`projects/<slug>/input/`: the song, `lyrics.json`, `project.json` (`title`, `artist`, `audio`,
`sections`), the footage, `inspiration/<name>.mp4`, `sfx/` (generated sound effects). **The media
library first** (`apps/studio/scripts/library/README.md`):
- `media find "<character or film> <type>" --kind=footage --sheet` before any download. The same
  packs come back across edits (Zoro, the Kingpin song, One Piece raw clips).
- Missing footage is downloaded into `_INBOX` (Browse Hack does it and says when the library
  already has the video), then `media ingest`.
- Every file in `input/` is a clone from the library (`media use <id> <slug> --as=input/<name>`),
  never a symlink. Footage the user handed over elsewhere: `media ingest <path> --channel=<id>`
  first (it stays where it was).
- Never edit the user's files in `input/`.

### 2. Study the inspiration — `inspo.md`

Segregate it (`.claude/skills/analyze-video/scripts/segregate.py <inspo> --min-shot 0.05`) and
make **dense frame sheets** (every 3–4 frames, frame number burned in, `tile=12x5`): edits that live
on transitions and masks have few hard cuts, so shot detection alone undersells them. Note the
pacing (cuts per beat), the transitions, the type, the colour, and what suits this footage.

### 3. Map the footage

`segregate.py "projects/<slug>/input/<footage>" --out projects/<slug>/footage` (the copy in `input/`:
`segregation.json` keeps that path; each further source into its own folder,
e.g. `footage-lm/`). Before segregating, `media cache get projects/<slug>/input/<footage> segregation
--into=projects/<slug>/footage` (another edit may have done this file already); after a fresh run,
`media cache put projects/<slug>/input/<footage> segregation projects/<slug>/footage --tool=analyze-video`.
Read every `sheets/shots_*.jpg` and `scene_*.jpg`; write down:

- **families** of shots (the per-genre lists above) and each shot's **length** (a cut can't be
  longer than its take);
- **scenes** worth a hook, a drop or a bridge, with their shots in order (the crash: onboard into
  the gravel → wide spin → onboard spin → the flip → the helmet);
- the **unusable** shots (burned-in titles, scoreboards, logo cards, black, pillarboxed archive);
- the picture area (`cropdetect`), and whether a "high fps" source is really 24 fps with repeats
  (frame differences of zero in a 3-2 pattern).

A shot sheet of candidates (3 frames each, 15/50/85 %) settles doubts before casting.

### 4. Map the song

`mm analyze <slug> --plots`, then `prepare-project` (make-lyrics-video 2–3).

- **Sections from energy, not lyric gaps:** print each stem's mean envelope per bar and cut where
  drums or bass drop out or return. Write them to `input/project.json`, re-run prepare.
- **Find the hits per beat around every section join:** drums, bass, kick and snare onsets. A drop
  can land beats before the lyric that names it (hitixf1's drop 2 hit three beats before "lose
  control") — the picture's drop goes on the music's hit.
- **Every lyric line and word as a fractional beat index:** the cut list is written in beats; note
  which lines start off the beat (principle 2).
- Ad-libs the transcription doesn't list pull the first word early; a fast chant's last word can
  land after the next line starts — pin such lines to the transcription (`"<n>": "input"` in
  `analysis/fixes.json`).

### 5. Plan — `storyboard.md`

One row per section: beats, picture (the scene for hooks/drops/bridges, the casting idea for
verses), juice, words, sound. Settle the intro first (principle 1).

### 6. Cast and cut — `video/edl.ts`

Print every lyric line with its beat, keep the shot sheets of every source open, and write each cut
with the shot *and why* as a comment (`c(1, 'lm0052', 'impact', S), // FRICTION: the brake disc
glowing`). Every section by scene, in the scene's order, the hero in every shot; a line gets a literal
moment only where his scene has one. Before running anything, read the cut list against the standing
rules: no talking shots, no line cast on another character, the pace the song asks for.
Then run `mm remix <slug>` and fix, in this order:

1. **block lengths** (each block must end where the next starts; the resolver stops otherwise);
2. **`runs … past the end` warnings** — a shorter cut or a longer take, never a rate change;
3. **rhythm** (the per-block table: mostly one-beat cuts in verses, few length changes);
4. **repeats** (the ⚠ ones first; `--unused` lists free takes with their lengths).

Cut lengths at ~100 BPM: a beat is 0.6 s, so a one-beat cut needs a take of ≥ 0.62 s, half a beat
≥ 0.32 s. Before rewriting a cut list, copy it to `video/archive/edl.v<N>.ts.txt` and the storyboard
to `video/archive/storyboard.v<N>.md` (`.txt` keeps the type-check clean).

### 7. Media

```bash
mm remix <slug>            # footage table, plates, anchors, slow-motion clips, resolve + checks, shots.json, jobs
mm remix <slug> --matte    # + cutouts for the shots that have none yet (background)
mm remix <slug> --unused   # + the shots not used yet, with their lengths
mm remix <slug> --animatic # + out/<slug>/animatic/<section>.jpg: every cut's middle frame
```

`video/remix.json`: `sources` (each `{ id, prefix, source, segregation, crop, matteFps }`: the first
source keeps `sh####` ids, others get their prefix, e.g. `lm####`), `window` (the picture's size in
the frame, 1920×804 for 2.39:1 at 1080p), `logo`. Outputs: one plate per source (`derived/plate*.mp4`,
cropped, at most 30 fps), `derived/shotmattes/<shot>.webm` (VP9 alpha, one per footage shot, reused
by every cut from that take) with `<shot>.stats.json` (subject centre/area/box per frame) gathered
into `video/anchors.json` for anchored zooms, match cuts and words beside the subject, and
`derived/slow/<shot>.mp4` for every shot a `slow()` cut plays: its real frames (`mpdecimate` drops
repeats) motion-interpolated to 60 fps (`minterpolate`, ~15 s a shot).

Matting: BiRefNet-lite, half precision, Apple GPU, 1–2 frames at a time: ~0.3 s a frame with free
memory, 1–4 s when swapping (`sysctl vm.swapusage`); the full model can stall a 16–18 GB Mac. Start
it early, for all usable shots, while you cast. Check cutouts on green before relying on them.
Graphics shots (timing towers, maps, flashes) need no matte.

### 8. Words, graphics, sound

See the reference below. Sound once the cut is settled:

- **What:** a riser that peaks on each drop, a sub impact on the biggest hits, fly-bys / pass-bys on
  the fast shots, the scene's own sounds (wheel guns, engine revs, clunks, a crowd at the finish,
  camera shutters on the press), heartbeats under punch-ins, a soft swoosh on the zooms that open a
  section. A first pass of ~5; the first project ended at ~40 placements from 13 files when the
  user asked for more.
- **Make:** ElevenLabs `text_to_sound_effects` (only when the user asked for sound effects — it is
  paid) into `input/sfx/`, renamed by purpose; convert to `derived/sfx/<name>.wav`, leading silence
  trimmed and peak-normalised to −1 dB
  (`silenceremove=start_periods=1:start_threshold=-50dB,volume=<gain>dB`).
- **Place:** measure each file's envelope (`astats` RMS every 0.1 s) and set `lead` to its peak, so
  a riser or a fly-by peaks *on* the cut. Gains 0.3–0.5 under the music.
- **Check:** render the audio alone (`npx remotion render src/index.ts <slug> out/<slug>/clips/audio.wav
  --codec=wav`, a minute) and find the half-seconds over −0.8 dB (`astats` peaks); ease impacts and
  risers where they pile onto a drop.

### 9. Check

`video/index.tsx` is one layer: `Remix` at `'all'` with `{ slug, blocks, words, sfx, gfx, footage,
anchors, window, theme }`; `theme.ts` loads the fonts and palette and sets the HUD.

In this order: the animatic (`mm remix <slug> --animatic`: the middle frame of
every cut, a sheet per section in `out/<slug>/animatic/`) — read it as the audience will: does each
section tell its chapter, does the hero stay on screen, does it build; then `npm run type-check`; the title/graphic cuts frame by frame across their animation;
stills at every changed moment (`mm stills <slug> t1,t2,… --only`, a contact sheet);
one late cut per source against `ffmpeg -ss <t> -i <source>` (catches timing bugs); half-scale
`--frames` clips of the densest and the slowed passages as frame sheets (`select='between(n\,a\,b)'`,
`tile=8x6`) — a zoom reads as a blur ramp into the cut and a decelerating landing out of it; slow
motion has no repeated frames (`signalstats` YDIF near 0 = a repeat); the audio-only peak check.
Look for: subjects in front of punch words, words on time and on their shot, nothing over faces,
no stutter, no burned-in graphics, every sound on its picture.

### 10. Render and review

```bash
mm render <slug> --crf=18 --preview   # review: 10 s stretches around what changed, half size → out/<slug>/preview/ (background)
mm render <slug> --crf=18           # the master once the user signs off (~10 min for 3.5 min at 1080p30)
mm render <slug> --frames=900-960 --proxy   # a clip → out/<slug>/clips/
mm preflight <slug>                         # before every link: black or frozen frames, sound
```

Every review round is a preview (10 s stretches at half size around what changed, never the whole
video); the full-size master renders once, after sign-off
(`revise-video` step 1). Run preflight after every render the user will watch and fix or answer what
it finds before the link (step 2): a cut that drops a frame shows as black, a source that stopped
playing as a freeze.

Before a full render replaces the main file, the script copies the previous video, its map and its
`.revisions/` into `out/<slug>/v<N>/` (skipped when an identical copy is kept); clips never touch
the main file. Copy the archived cut list in beside it. An audio-only fix doesn't need a new
picture: render the audio and mux it onto the video (`-c:v copy`).

Review with the **`revise-video`** skill (preflight, the `/video-revision` link, the background
watcher, reading and closing the user's comments). The cut list's shot IDs are what the comments point at: keep them stable. Log
every comment in `prefs.md` and the general rule in your notes (`mm notes add make-video-music-remix "…"`). When the user approves the
final, deliver it to the channel's folder: `media deliver <slug> --what=video` (a dry run), then
`--yes`. It goes to `Downloads/<CHANNEL>/<slug>/` and an older delivery moves to `previous/`; give
the `open -R` line it prints. Footage the user rejected: `media rate <id> bad --note="…" --production=<slug>`.
After the master render,
offer thumbnails (`create-thumbnail`), the YouTube pack (`pack-youtube`) and vertical shorts of the
song's best stretches (`make-video-music-remix-shorts`, which starts from this edit's casting).

## The cut list — reference

```ts
export const blocks: Block[] = [
  { id: 'v1', at: 48, cuts: [                  // starts on beat 48; cuts run back to back
    c(1, ['lm0002', 2.8], 'flash', freeze(), shake(0.8)), // a take 2.8 s in; white flash; impact frame
    c(1, 'lm0004', 'zoom'),                    // warp zoom from the previous shot's subject
    c(0.5, 'sh0002'), c(0.5, 'sh0004'),        // a pair of halves inside one beat
    c(1, 'sh0141'),
    c(1, 'lm0052', 'impact', S),               // S = shake(): kick/snare camera shake
    c(2, 'lm0102', ramp(2.4)),                 // speeds up into the next cut
    c(3, 'sh0098', mono, slow(0.75)),          // black and white, slow motion (bridges only)
    c(4, 'sh0179', steps([300.45, 301.45], 0.13)), // punch-ins on the subject on those beats
    splitAt(2.5, ['lm0061', 'lm0122'], [237.5, 238.7]), // two panels, each landing on its word
    c(1.5, '@lights', 'impact'),               // a graphic cut
  ] },
];
export const words: TextCue[] = [
  L("Injectin' octane"),                                         // a caption: the line it matches
  { ...B('FRICTION', 'listen to the friction', 5, 'red'), end: 61.5 }, // big word on sung word 5, cleared by beat 61.5
  { ...F('PURE ENERGY', 'pure energy', 3, 'acid'), start: 127.5 }, // in front, held back to the next shot
  { text: 'ATOMIC RAP', beat: 337, style: 'flank', hold: 12 },   // the sign-off either side of the subject
];
export const sfx: Sfx[] = [
  { file: 'riser', beat: 147, lead: 1.85, gain: 0.26 },          // peaks on the drop
  { file: 'flyby', beat: 308, lead: 0.8, gain: 0.4 },            // the pass peaks on the cut
  { file: 'crash', line: ["It isn't if I crash"], w: 4 },        // or on a sung word
];
export const gfx: Gfx = {
  title: { logo: 'derived/logo.png', text: 'HIT IT', sub: 'GET INTO ZONE', hit: 8 },
  lights: [{ on: [304, 304.3, 304.6, 304.9, 305.2], out: 308 }],
  tension: [[44, 48], [106, 112]],             // bars close in, frame darkens; released on the hit
  pump: [[48, 104, 0.055], [147, 175, 0.08]],  // the speaker pump: beat range, amount
  // optional, themed: tensionStyle 'smoke' (green chemical smoke + element symbols creep in instead
  // of the bars); meter { kind: 'ecg', flatline: beat } (the top bar as a heart monitor, not rev lights)
};
```

`L`, `B` and `F` are small helpers defined at the top of the words section of the project's edl.ts
(a caption, a big word behind the subject, a big word in front); copy them from the worked example.

**Transitions** (how a cut enters; the previous cut plays the matching exit): `cut` · `zoom` (the
warp zoom: the out-shot pushes 2.5× into its subject with a six-layer zoom blur and a lens bulge,
the in-shot lands from the same zoom on its own subject and decelerates — the signature) · `whip` /
`whipr` / `whipv` (pans with directional blur; on snares) · `spin` (rotate-zoom) · `match` (the
in-shot's subject starts where and as big as the out-shot's ended, then settles: subject to subject,
eyes → eyes; needs a beat or more and similar-size subjects — on half-beat cuts it shrinks the
picture into a corner) · `carry` (the out-shot's cutout stays over the new shot, then flies past the
camera; section changes) · `pass` (it flies past at once — read as bad once; prefer `zoom`) ·
`flash` (white) · `impact` (shake burst + punch-in; the strongest words) · `liquid` (a melt: one
soft wave field swells over the out-shot's last frames and settles over the in-shot's first, while the
old picture dissolves into the new one inside it; a run that should feel like a high, a dream or a
drug trip — a few cuts in a row, never the explosions or the default; rejected twice by this user
as "squiggly", so only when asked for) · `flow` (match on movement: the
out-shot keeps moving the way its subject moved, smeared along that direction, and the in-shot lands
its subject where the last one was and carries the move on; needs cutouts on both shots for their
anchors; the hooks of kingpinxdeadpool v2). Rapid builds: hard cuts.

**Fx:** `shake(amp)` (`S` on every drop cut; rising amps through a build) · `push(s)` (slow push-in;
long takes) · `echo()` (trailing copies of the subject, natural colour) · `streaks` (speed lines) ·
`pop` (the picture shrinks to a card and the subject spills over: only subjects smaller than the
frame) · `ramp(peak)` (accelerates into the next cut) · `freeze(n)` (impact frame: holds n frames,
two frames into the take, subject outlined in light; the biggest hits, or a long hold like
`freeze(16)` for "fracture") · `aura` (a glow round the subject pulsing on the kick: hero shots) ·
`steps([beats], s, to?)` (punch-ins on the subject: chants; `to: [x, y]` in window fractions aims
them at a point instead, e.g. the eyes, for a highlight shot) · `slow(r)` (0.55–0.85, quiet bridges, plays
the interpolated clip) · `rev(r)` (the take runs backwards from its offset at r×: a lyric that says
"rewind"; quicksilverxkingpin rewinds the bridge to the very first shot) · `flat` (no subject
cutout on this cut: a sign-off or word over a subject that fills the frame, which leaves `flank` no
room) · `hold` (when the take runs out its last frame holds to the end of the cut: an ending on a
face, with `slow()` to let it breathe) · `mono`. Always on: an exposure lift on snares and a beat bounce on kicks,
scaled by loudness; inside a `gfx.pump` range the bounce becomes the **speaker pump** — the whole
picture box punches out on each kick with a zoom blur and a little lens bulge, then settles (verses
~0.055, hooks ~0.065, drops ~0.08); it sits out while a transition plays (that is the beat's move).

**Words:** `line` (caption in the bottom bar, wide-tracked, revealed as sung) · `big` (a punch word
behind the subject, drawn again as an outline over it so it reads even behind a close-up) · `front`
(big, over everything: split screens, close-ups that would hide a `big`) · `sub` (typed subtitles,
spoken parts) · `timer` (a stopwatch counting down `until` a line; only where the picture leaves
room) · `map` (a circuit drawing itself) · `label` (small text in the top bar) · `flank` (two words
either side of the subject, behind it, tiny line-font capitals, very wide spacing) · `bar` (a punch
word in the letterbox bar above the picture, in the meter's place, streaking in with afterimages: bold
words that never cover the characters) · `comic` / `decal` (see `edl.ts`: a comic caption box in a top
corner; words printed on the subject, e.g. a sign-off on a jacket, placed with `at` and `size`) · `plane` (a punch
word set into its shot in 3D perspective on a surface the shot has — a wall, the floor, a board — or
hanging in its depth: `at`, `size`, `tilt: [rx, ry, rz]`; it lives on the cut it is sung on, so pick
words sung right on a cut, and look at that cut's frame to set the plane; vary the sizes: big where the
surface is big, small where it is tight). `flank` takes `size` and `track` (letter spacing). Cue options:
`line: [query, nth]` + `w` (the sung word to start on), `perWord`, `hold` (beats after the last word),
`until`, `start` / `end` (beats: hold back to a shot / clear before the next), `color` (`bone`,
`red`, `cyan`, `acid`), `el: [at, len, n]` (big words: those letters in a periodic-table element box
with atomic number n, Breaking Bad's credits — `NAMELESS` with `[0, 2, 11]` is [Na]MELESS). Every
sung word shows `TEXT_LEAD` (0.15 s, resolve.ts) early.

**Graphics:** `@title` (`gfx/TitleCard.tsx`): a collab lockup, LOGO × TITLE — the logo revealed
alone by a light sweep with a running shine, then it glides left as an × slashes in and the title
slams in letter by letter on speed trails on beat `hit`, a red underline under the lockup and the
small line; it zooms out into the next cut (give that cut `'zoom'`). The logo is `remix.json` `logo`
→ `derived/logo.png` (white on transparent: its own alpha, else its dark marks). `@lights`
(`gfx/StartLights.tsx`, three.js): five pods lighting one red pair per `on` beat, all out at `out`.
`@split` via `split` / `splitAt`. New graphics go in `src/remix/gfx/` and are dispatched in
`Remix.tsx` (`cut.src === '@name'`). `gfx.reverb: [{ from, to, at? }]` (beats; `at` in window
fractions): the picture takes on a vocal effect (a reverb, a remix) by itself, nothing drawn over it —
on every vocal onset it swells (the warp zoom's lens bulge) and echoes of the frame as it was when the
sound left spread out from `at`, softening and fading like the tail; all gone by `to`. (It replaced
`gfx.ripple`, rings of light drawn over the picture: "looks like some animation on top of the video".)
TitleCard takes `logoW` and `size` when a wide wordmark sits next to a short title.
A `flank` cue's `box: [x0, x1, y?]` sets the subject's edges (and the words' height) by hand when the
cutout is a crowd: the words then sit just outside x0 / x1, e.g. on the hands.

**Theme** (`video/theme.ts`): fonts `punch` (big words), `line` (captions), `data` (HUD),
`title`, `sign` (the channel's `flank` sign-off, falls back to `line`: ATOMIC RAP is Michroma); colours `ground`, `bone`, `red` (the accent slot: the title card's logo, streaks and underline, element boxes and rev lights take it, so it can be any hue), `cyan`, `acid`; `hud` (top-left text) and `corners: false`
to clear the four corner readouts (the first user found them clutter). The top bar's rev lights are
slanted blocks, bone then red.

## Gotchas

- **Remotion `<Freeze>`:** freezing a video on frame n inside a Sequence sets the timeline to n + the
  Sequence's start, and a render clamps that to the composition's length — late source times show
  the wrong frames. The engine freezes on frame 0 and passes the time as `startFrom` (fractional
  for slow motion). Check a late cut per source against the source.
- **Overwritten renders:** before `render-project` kept versions, a test clip replaced the full cut
  and two revisions were lost. Don't write into `out/<slug>/` by hand either.
- **Behind-words on full-frame close-ups** disappear (the outline keeps them readable); on split
  screens there is no single subject — use `front`.
- **`pop` on a full-frame subject** shows a stray outline box; subject devices on POV shots grab the
  cockpit, not a subject.
- **The lens-bulge map is 8-bit:** stronger pulls than ~360 px show steps (`WARP_PX` in Remix.tsx).
- **A big word's hold** bleeds onto the next shot or a graphic cut: `end` it at the cut.

## Timing budget (this machine)

Segregation ~1–2 min per 4-min video; matting ~0.3–1 s a frame (5k frames ≈ 30 min); slow-motion
clips ~15 s a shot; a still batch ~1 min; a full 3.5-min render at 1080p30 ≈ 10 min; an audio-only
render ~1 min. Start the slow steps first and run renders in the background.

## Lessons log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-video-music-remix "<what the user asked to change> → <the general rule behind it>"   # a new lesson, dated for you
mm notes make-video-music-remix                                                                        # your notes for this skill
```

When the user wants them shared, `mm notes promote make-video-music-remix` offers them to this log as a pull request.

- 2026-10-24 — First project (hitixf1, a rap song × F1 footage). Edits that live on masks change the
  picture without cuts: study the inspo with dense frame sheets. Derived lyric sections fail on rap:
  set sections from per-bar stem energy.
- 2026-10-24 — v1 "very bad": slowed footage and colour devices (graded slices, negatives, mirror,
  RGB glitch) read as cheap. Rebuilt the engine around transitions (warp zooms anchored on the
  subject, match cuts, whips, cutouts carried over the next shot), real motion blur and camera shake.
- 2026-10-24 — v2: no slowed footage anywhere; a musical intro wants life, not action, and a title
  card with a striking type effect; literal lyric casting matters most; normal lines as captions,
  only punches big; editor juice that rides the music.
- 2026-10-24 — v3: a second footage source paid off most for literal casting.
- 2026-10-24 — rev-001: two renders lost to overwriting (render-project now keeps versions); "no
  continuity" — cast hooks, drops and bridges by scene, in order; more blur and warp on the zoom and
  the speaker pump between transitions; a motif shown five times bores; celebrations only at the
  end; impact frames must skip one-frame flashes; drops land on the music's hit, not the lyric's.
- 2026-10-24 — rev-002: the user **loved the smooth warp zooms and the pump** (now principle 7);
  a story-telling intro is unwanted; words felt late everywhere (text now leads by 0.15 s); a
  three-way split read badly; timers over close-ups look bad; effects on their picture; the outro
  signs off with the channel name, not the song and artist.
- 2026-10-24 — v5: verse 2 "very good", verse 1 "very bad" — rhythm, not casting (principle 2).
  Slow motion in the intro rejected outright: long real-speed takes instead. A "60 fps" source was
  24 fps with repeats; slow motion needs interpolated frames.
- 2026-10-25 — rev-003: the bar before the first verse is the launch (rapid close-ups); `match`
  fails on half-beat cuts; a whoosh on a still graphic reads wrong; every big word belongs to one
  shot (`start` / `end`); one panel per word in a split.
- 2026-10-25 — rev-004: long takes through the whole intro, not a long opener then a montage; a take
  can run across the intro/verse boundary; when the drop's engine sound starts, the picture is
  already racing; more sound effects (risers, impacts, fly-bys, scene sounds); corner readouts are
  clutter. Final: v8. The repeat check, run afterwards, still found two takes showing the same
  frames for a fraction of a second — run it before every render.
- 2026-10-25 — Second project (breakingbadxdangerous: NEFFEX "Dangerous", 80 BPM, two EDM drops, × two
  Breaking Bad fan edits). Budget the footage before casting: sum the beats each take can give (a take
  of length L gives L / beat-length beats) against the song's beats. Fan edits cut fast (most takes
  under a beat at 80 BPM), and two of them ran out by verse 2. Stretch with impact frames (`freeze(n)`
  holds n frames, so a 0.46 s take carries a full beat on a punch word), later moments of long takes, one
  deliberate callback, and in the last drop a flashback of the whole story from the unused ends of
  earlier takes (¼ beat each, so no frame repeats); better, ask for a third source as soon as the
  budget falls short. The ElevenLabs MCP's speech_to_text returns text only: for word timings
  `mm transcribe … --yes` calls the API itself (`/v1/speech-to-text`, `timestamps_granularity=word`).
- 2026-10-25 — hitixf1 after sign-off: "rerender video, by adding the atomic rap outro at the end … no
  need to add intro … reduce the volume of outro by a bit, as it sound too strong" → a finished edit
  gets the channel's end screen (brands/<brand>/outros/, the user picks which) appended after the last
  shot, no brand intro, with the end screen's audio 4 dB under the kit (−24 → −28 LUFS). Done with
  ffmpeg (concat filter, 60 → 30 fps, CRF 15) rather than a Remotion re-render; the old render is kept
  in v<N>/ first and the map gets an end-screen section.
- 2026-10-25 — Third project (quicksilverxkingpin: "Kingpin" × Quicksilver's kitchen scene and
  mansion rescue). v1: hook 1 "excellent, keep everything" — the kitchen in its own order, mostly
  2-beat cuts walking through long takes with warp zooms; everything else "bullshit": verses cast line
  by line across both films (words over story), other characters in focus, and a 41 s musical intro
  that spent the set pieces. Rules: with set-piece footage every section is a small story in order
  (principle 3); the hero stays the subject, others brief and in the background; a long intro tells a
  setup story with the least material and saves the big moments; budget the scenes across the song
  before casting (each section gets its own stretch). Also: the title lockup's logo can be too small
  next to a short title (TitleCard `logoW` / `size`).
- 2026-10-25 — breakingbadxdangerous v1: "build a proper storyline … consider everything at a section
  level, build-ups and crescendos", and "80 % Walter White, 15 % Jesse, 5 % others" (principle 0). Literal
  line-by-line casting across a whole show reads as random. Plan the arc in storyboard.md first; tag every
  shot by character (a CLIP zero-shot pre-sort over the segregation keyframes, verified on sheets) and
  count screen time.
- 2026-10-25 — breakingbadxdangerous rev-001 (26 comments on v2). Generic graphics read as kit: the
  bars sliding in for tension "look bad" and the rev-light meter didn't belong → theme the graphics on
  the footage's world (Breaking Bad: chemical smoke with element symbols, a heart monitor that flatlines
  when the song stops; `tensionStyle`, `meter`). A love line ("baby girl, your body") can be sung to
  the hero's obsession (the product, the gun, the money), not to a person. A highlight line wants the
  camera to attack it (`steps` into the eyes) and the drop after a "high" wants `liquid` cuts. Good shots
  in the wrong lines read as random: each threat line lands on the man it names. A quarter-beat run
  flows only when the subject stays at one place and size (faces through time), not when every flash
  is a new framing. Big words: about one per verse line, each on its own shot; shift a cut half a beat
  (blocks may start on fractional beats) rather than squeezing a word under 0.5 s. When a range note
  says "change the shots", every shot it covers changes, even ones a later "keep" note overlaps by a
  frame.
- 2026-10-25 — kingpinxdeadpool v1 (Deadpool × "Kingpin", 8 sources, built story-first with 2–4-beat
  takes after the Quicksilver lesson): "too many long shot scenes … the entire verses should go at
  extreme fast cuts, hooks should go stylish and emotive match movement, plain music should either be
  dance moves or comedic with whole lot of effects and transitions to give the beat rhythm". With
  plenty of footage and a high-energy rap, taste can flip to velocity style: verses on a steady ½-beat
  pulse (¼ bursts on punchlines, 1 beat only under a big word); hooks slower but cut on movement
  (match cuts, whips along the move) through the emotional beats; every vocal-free stretch (intro
  beatbox, break, drop) as dance or comedy with a device on every beat. Ask about pacing at intake
  when footage is plentiful; principle 1's long intro takes are not universal.
- 2026-10-25 — quicksilverxkingpin rev-001 (17 comments on v2, the storyline cut): hook 2, the outro
  and v2's shots were "excellent"; the rest asked for more energy. Verses: a shot a beat (cross-cut the
  takes of one moment, each running on from where it left off) and a bold word on nearly every line,
  faster toward the hook. Long takes belong in the slow parts (intro, bridge), not in fast verses. A
  line that says exactly what the picture shows earns full aura, colour and the words highlighted
  together. Glitches the user saw: a warp zoom or whip joining two pieces of the same take (merge
  them; a whip also dropped a black frame), the aura glow on a dark/wide cutout drawing a grey box,
  big words broken up behind a crowd's cutout (put them in front). New devices asked for: a ripple
  halo on a vocal reverb (`gfx.ripple`), slow motion in a break after the big blast, a drop of ½/¼-beat
  motion flashes, an ending that holds on the face (`hold`) with the sign-off on the hands (`box`).
  An elegant track wants an elegant title sound (a shimmer into a chime), not a whoosh.
- 2026-10-25 — breakingbadxdangerous rev-002: "the liquid transitions feel odd". They switched hard
  between two pictures at the peak of the warp, marbled the frame (350 px pulls), pulled black in at
  the edges and ran on 17 cuts in a row. Rebuilt: a transition that distorts must also blend — the two
  pictures melt into each other inside one moving field, at a strength that ripples (≈160 px, vertical
  pulls weaker), with an overscan so the edges never show, shortened on half-beat cuts, and used only on
  the stretch that is the "high". Check transitions frame by frame on a short clip (`--frames=a-b`),
  not on stills. Also: when two faces share a frame, a centred big word covers one of them; big words
  now honour `pos` (top/bottom band, left/right half).
- 2026-10-25 — breakingbadxdangerous after v4: even the rebuilt melt "still looks bad, remove it
  altogether, just do it like normal" → displacement transitions (liquid, squiggly warps) aren't this
  user's taste, however smooth; fast runs stay on hard cuts with shake, impacts and the warp zoom. Use
  `liquid` only when the user asks for it by name.
- 2026-10-25 — quicksilverxkingpin after v3 (in chat): the bold words v3 added over the picture were
  "closing up the screen, I can't see the characters" → punch words can live off the picture: `bar`
  sets them in the letterbox bar above it (bold, streaking in), hook words behind the subject stay
  where the user already approved them. The ripple rings "look bad … not some animation on top of
  video" → an effect must be made of the picture itself (`gfx.reverb`: swell + frame echoes). Asked
  to swap two verses' footage: when footage moves, re-fit each punch to the matching moment of the new
  lines (the wall blows on CROSS ME, the vault on GOLDEN GAUGE), keeping the cross-cut rhythm.
- 2026-10-25 — quicksilverxkingpin after v4 (in chat): verse words "in 3D perspective based on the shot,
  not too big, only some words" → `plane`, ~6 per verse on words sung right on a cut; then "some are too
  small, some look good like that" → size each by its surface (KNOCKED across a chalkboard, MOVE on a floor
  seen from above; small where the space is tight). A stutter in the song: cut on its chops, accelerating
  (every other chop, then every chop: 8 → 1–2 frames), and drop added sound effects there (the rewind
  whooshes were "bad"). The climax of a drop favours the main character; the claws (another character's
  signature) are out. Swapping footage between sections: keep the cross-cut beat pattern exactly ("the
  beat cut is awesome"), only the shots change.
- 2026-10-26 — quicksilverxkingpin rev-002 (on v5): words in the letterbox bar were also unwanted
  ("remove the words at the top") and the generic rev meter should "suit the character" → `gfx.meter
  {kind: 'bolt'}` (a speedster's lightning bolt with speed lines that charge with the bass and crackle on
  kicks); make the HUD about the hero. "The outline and segmented mix we use" = `big` (solid behind the
  subject, outline over it). Word styling can carry the word: an elegant word in script (`font:
  'script'`, theme `fonts.script`), CROSS ME as X ME with the X drawn (`drawX`), KNOCK KNOCK knocking
  (`knock` on a plane word). Verse shots should illustrate each line's key word from the same scene; the
  bars closing in before drops did not suit this edit (off unless asked). A drop's cuts follow its kick
  pattern: one-beat punches on kicks, a longer move over held bass.
- 2026-10-26 — quicksilverxkingpin rev-003 (on v6): a verse the user disliked was rebuilt on contrast —
  "a pattern of hot and then cold and then hot and then cold": the two sources' colour temperatures in
  alternating blocks (whip into the cold, whipr back into the heat), shorter toward the end. "That CROSS
  ME was excellent, think of ideas like that" → words that act out their meaning are a hit: `act` on big
  and plane words ('streak', 'bite', 'slice', 'dodge', 'hop', 'drop', 'stamp', 'shake', 'erase', 'gauge',
  'explode', 'dissolve', 'twinkle') and drawn glyphs X / ✓ / ▶ (`drawX`). Check acts on stills at two
  moments (landing and mid-act); an act that is too subtle (a small bite, a hairline split) reads as
  nothing. A segmented big word on a shot whose cutout covers most of the frame shows only its outline:
  set it in front ('front', `pos`) there.
- 2026-10-26 — quicksilverxkingpin rev-004 (on v7): "the shots are all nice, but clip cutting and transitions
  are not timed correctly — analyse" → a hook had its cuts on the vocal pickups (beats 2 and 4 of the bar)
  and zooms cutting takes into themselves. Check the cut grid against `beats.downbeats` and the snares: cuts
  on bars or snares, transitions on bars, the pickup sung over the shot before, same-take pieces merged.
  More acts: 'push' (EARS, then a Y shoves in on "years": YEARS, `pushAt`), 'glitch', 'shiver', 'drift';
  `follow` keeps a big word on a dancing subject; script words need a little faux-bold and a glow to read.
  A long big word that spans cuts must set `hold` (end only caps it). Repeated shots get noticed: list the
  unused spans of every shot before re-casting. A reversed shot can bridge two sections when it ends where
  the next begins (the kiss backwards in the rewind's stutter → hook 2 on the same balcony).
- 2026-10-26 — quicksilverxkingpin rev-005 (on v8): after the hook was re-timed to the bars with its takes
  merged, "more edits, the frequency higher — the first version was very good" → bar-timing must not cost cut
  count: keep cuts on the beat (zooms and whips on bars and snares) but cut a beat or two at a time,
  cross-cutting takes that each pick up where they left off (a wide of the room, a reaction), so a hook
  has more cuts than before, not fewer. A big word can part around its subject (`split`: the Y left of
  him, EARS right, sized to his silhouette, following his box); `act: 'slide'` is the quiet entrance
  ("just a little left slide is enough"). Read placements literally against the frame: "the bottom grid of
  the window" was the window panes in the shot (a `plane` word set in them). Colour words by the scene's
  temperature (fire: white / red / yellow; cold: white / blue) — `color: 'fire'` is a true red when the
  theme's 'red' slot is an accent — and prefer white where the flames match the word's colour. A reversed
  slow-motion shot reads as "the world moving back" (`rev(r)` with `slow(r)` for r < 1 plays the
  interpolated clip backwards); an explosion drawing back works best. A shot whose subject barely moves
  (an extreme slow-motion close-up) reads as a freeze frame on a punch.
- 2026-10-26 — quicksilverxkingpin v9 render: the full render died twice at different frames ("Timeout …
  Fetching …/proxy?src=…plate…", then "Could not extract frame from compositor: Request closed") with the
  machine nearly out of free memory. A stall at a different frame each time is resource pressure, not a bad
  frame (that stretch rendered alone in seconds). Render in chunks instead: `--frames=a-b --muted
  --concurrency=4 --offthreadvideo-cache-size-in-bytes=800000000`, each chunk retried; the audio once
  (`out.aac --codec=aac`); then `ffmpeg -f concat -safe 0 -i list.txt -i audio.aac -map 0:v -map 1:a -c copy`.
  Check the seams (frames either side of each boundary) and the audio level against the previous cut.
- 2026-10-26 — quicksilverxkingpin chat notes on v9: segmented big words on a fast-cut hook "flicker" — each
  cut swaps the cutout under a word that is held across it. Keep a segmented word on one steady cut (`end` at
  the cut), and on fast cutting use `glass` (frosted letters in front: the picture behind them blurred and
  lit through a clipped backdrop filter; nothing above them may set opacity or a filter, or they show
  nothing). Check repetition over the whole edit, not per section (list each section's shots against the
  others' and the drop's recap): a section's full-frame shots should appear nowhere else; when the footage
  runs out, a repeat may only come under its word or inside a `ko` knockout (black but for the word's
  letters, a dive through a letter's stem into the next cut — start that cut as the dive starts). Free shots
  for a section by swapping them out of recap montages. `stack` sets impact lines as a width-fitted column
  slamming in word by word (`ws`, `area`); `blend: 'multiply'` prints it into a sky so curtains and frames
  pass in front. A drop can open on `flashes(b, [[beat, strength]…])`: no picture, the frame lit on the
  kicks, streaks on the off-beats and hats (take the beats from `onsets.kick` / `onsets.hat`).
- 2026-10-26 — quicksilverxkingpin rev-006 (on v10): the glass replacement for flickering segmented words was
  rejected ("use the segmentation cut") — fix the cut itself: (1) each segmented word lives on the one take it
  is sung over (`start` / `end` at its cuts; across cuts of the same take is fine, it zooms and spins with the
  camera because words sit inside the camera transform); (2) mattes at the picture's own frame rate — a 30 fps
  plate matted at 24 fps (`matteFps`) lags on fast motion and the edges shimmer; set `matteFps` in remix.json
  to the plate's fps and re-matte (`scripts/matte.py <jobs> --force --only=…`; the record key ignores fps,
  so `--force` is needed), then re-run remix for the anchors. Chronology counts across sections: a verse after
  the action must not show the scene before it, and a slow-motion source of the same moment counts as used.
  When the unused footage of the hero runs out, give the section a dark stage (`'@void'`: specks hanging in
  the air) with `flow` (the line small at the centre, word by word, gliding left; the bottom caption steps
  aside) and big punch words, instead of reusing shots. New acts: 'twist' (letters spin in, for a spin cut),
  'liquid' (melting, wavering: "getting high"); `split` + 'push' shoves the right part along; `ko` with
  `koOut: 'fall'` drops its letters instead of diving.
- 2026-10-26 — quicksilverxkingpin chat notes on v11: "remove these shots" meant *replace* them — a section
  turned into a dark typography stage was rejected ("why did you remove all the clips?"). When the footage runs
  out, ask whether to fetch more clips (Browse Hack `youtube_get_video` → check the real height and HDR, take
  the SDR video-only stream; `youtube_download`), then add each as a source in remix.json (`segregation` from
  analyze-video's segregate.py, `crop` from `cropdetect`, `matteFps` = its plate's fps) and recast. Reject
  uploads labelled "4K" that are 1080p, HDR-only streams, watermarks and burned-in subtitles (or crop the
  watermark corners), and clips whose scene comes before the section's place in the story.
- 2026-10-30 — A lyric-shorts project's footage was a symlink into ~/Downloads; the download was deleted
  and every Remotion bundle crashed. The user: "I cannot move files once a project is done?", and agreed
  that was a bad setup → a project owns its sources: footage goes into `input/` as a copy (`cp -c`), never
  a link, and is segregated from that copy. `prepare-project` and `cleanup-out scan` list any link under
  `projects/` whose file is gone; never remove one yourself (ask: put the file back, or remove the link).
- 2026-11-02 — kingpinxdeadpool v4 ("the entire edit is bad"): the full edit rebuilt shot-a-beat from the
  approved shorts plus new sections was rejected with four rules the user had already given on earlier
  edits — no people-talking shots (unless the film's dialogue is used on purpose, transcribed: a last
  resort); a slow, stylistic song wants long takes and slow motion at times, not fast shots; comedy for a
  character with a sense of humour; no word-matching onto other characters ("silver hair" on Colossus):
  the lyrics are the main character's voice. rev-001: the intro "no storytelling, moving the shots too
  fast, does not match the beat, you don't have to show everything"; the bridge "does not suit the
  character". → "The user's standing rules" at the top of this file; principles 1, 2, 4 and 5 rewritten
  to match (pace and speed by the song's feel; meaning only through the hero).
- 2026-11-02 — kingpinxdeadpool v5 ("its good … the overall story telling is better now"): the standing rules
  worked. Still: added slow motion was unwanted (use the takes the film shot in slow motion), a take shown
  twice is noticed (every take once, the rewind included), the match cut is the thing to do more of, the words
  should be the character's own style (Deadpool: comic book), not the Quicksilver cut's, and only where the shot
  matches; hook 2 needed its own scene. → standing rules 7–10.
- 2026-11-02 — kingpinxdeadpool v6 build: "never a shot twice" also means never the same footage from another source —
  fan edits reuse a film's shots (the Deadpool mask stare was in three of them, the overpass drop in three). Build
  `video/dupes.json` before casting (normalised keyframe thumbnails compared across sources; any pair under a mean
  difference of ~0.16 is a copy) — `mm remix` then lists "the same footage from two sources" next to the repeats,
  and both lists must be empty. At real speed, sub-beat fan-edit takes on one-beat cuts run into the next shot (a
  flash of another clip): check the "runs past the end" warnings, not only the summary, and cover them with a short
  `freeze`. A `match` / `flow` from a far-off subject into a close one used to shrink the picture to a card on black;
  the engine now only zooms in and covers its own slide (`cover` in Remix.tsx). New word style `pow`: comic
  sound-effect lettering on a starburst beside the subject (Deadpool's own look); `comic` caption boxes carry spoken lines.
- 2026-11-02 — kingpinxdeadpool after v6: "use BIG WORDS and not lines, lines are bad for a smooth edit, adding a small
  line above or below BIG words is fine" → standing rule 11; `pow` cues take `small: 'above' | 'below'` (the lyric line,
  small, appearing with the line and lighting up word by word, the big word popping in on its own word); a second big
  word on the same line comes in with `start` and cuts the first off.
- 2026-11-02 — kingpinxdeadpool v7: "the intro-a is too fast, each shot is cutting not in sync with the musical style;
  the rest of the cut and storytelling is also pretty bad, the previous storytelling was much better". v6 had applied
  "don't unnecessarily slo mo" as "no slow motion", so every short take became a one-beat cut and the story was
  recast around what fit. v8 went back to the liked v5 cut list and changed only what the notes named: slow motion
  kept exactly where a take is shorter than its cut (at the rate it needs), repeats swapped for like shots, the new
  hook scene, the words. The intro cuts on the beatbox's own bars (print the stems' energy per beat first: the
  beatbox in on 4, the bass under the title from 12, busy from 40). Lesson: apply a note to the thing it names,
  keep everything the user praised, and diff against the liked version before rendering (rule 8 rewritten).
- 2026-11-02 — kingpinxdeadpool v8: "the shots are better, but some cuts are buggy; the titles … play out different
  animation on the basis of lyrical meaning, and make sure you don't block the underlying video display; make the
  edit more smooth (use famous editing techniques)". The scan found hidden cuts inside fan-edit takes (dx0012, kk0067,
  kk0032, nm0082, rp0035, rp0049), a stray frame of another clip at a take's start (ab0062), a flickering take (dx0099)
  and freeze-then-jump glitches on tiny takes. → standing rules 12–14; `pow` now acts out its word with no burst behind;
  `scripts/remix-dupes.py` builds video/dupes.json (copies across sources).
- 2026-11-02 — kingpinxdeadpool v9: "i still dislike the words by a lot. try out different typographies … make user
  feel the word … sentence is not even necessary (keeping captions at bottom is more than enough); update the waveform
  at center top to match deadpool aesthetics; some shots in scenes are not ordered properly; match cuts are great".
  The v9 words were all one comic face with the line small beside them, so the sentence showed and its big word only
  landed at its end; the fan edits' shots had been cast by lyric across their order (the DMX edit intercuts the
  freeway and the junkyard; the kk mashup slips other scenes into the duel). → standing rules 10–12 rewritten, 15
  (film order) and 16 (a themed meter) added; v10 = captions back, ~38 highlight words in 12 faces with new acts
  (focus, write, rise, type, swing, rewind, shine), `font` takes any theme face and big words a `size` cap, the
  'deadpool' meter, every scene re-sorted (the film clips by index, the fan edits by scene from their frames). A take
  can also hide another shot's first second (nm0088): check the frames of any new take before using its start.
- 2026-11-02 — kingpinxdeadpool v10 scan: re-sorting into film order changed many slow factors, and takes slowed to
  exactly their length flashed the next shot's first frame (dx0028 → the biker, dx0136, kk0051, kk0068). The resolver
  now warns on a cut that ends within a frame of its take; 44 cuts got `hold`. Also: highlight words placed beside the
  subject (`beside`), clamped inside the frame and fixed on the cut they land on, since push-ins and zoom transitions
  otherwise carry a word off the edge.
- 2026-11-02 — kingpinxdeadpool v10: "highlight one word from each line, and each highlight should be special, prominent
  and beat to the music, with different animation playing out based on the word meaning". v10 had ~38 highlights for 58
  lines, several sharing an act. → rule 11 (one highlight a line) and 12 rewritten; v11 = 57 highlights + the LIGHT
  knockout, 24 new acts (beat-grid aware via `beatOf`), `pulse` (kick punch), and the engine fades words through moving
  transitions (a word inside the picture was flung off the frame by match/zoom cuts). A shot whose matte covers the
  frame (a pure blur) hides a word behind it: give that cut `flat`.
- 2026-11-02 — kingpinxdeadpool v11: "you are not making the edit symmetric in the timeline (as well as the text lines
  make words appear at symmetric times) — it should show words at a lot more of time in lot more of places, and word
  timings seem to be incorrect; much of the words are generic in style and not impactful; in intro b the beat starts
  fast, so fast cuts at first, then slow motion shots with ripple zoom in zoom outs like liquid morph". The alignment was
  right; v11's words were late because starts had been pushed past transitions and words faded while the camera moved,
  and they were up only ~65 s of the song. → rules 10–12 rewritten, 17 (a symmetric timeline) and 18 (follow the
  music's turns inside a section) added; engine: `lock` (lockups, placed off the head by `placeLocks`, in front in screen
  space) and the `ripple` transition; v12 = every cut on the 2-beat grid, a lockup about every 2 beats (~170 s of words),
  a knockout opening each section, intro b fast then slow motion with ripple zooms.
- 2026-11-02 — kingpinxdeadpool v12: "it looks decent now" (the 2-beat grid, the lockups every ~2 beats, the section
  knockouts, the fast-then-ripple intro b: rules 10, 11, 17 and 18 hold). rev-003: "at this beat the car crash should
  come in" (intro b's peak, beat 52) and "this shot is really good, put it at the d2 shot with the bass drop sync" (his
  copper-elevator pose from the break onto the drop's 808 at beat 436). → rules 19 (the scene's big event on the
  section's big hit, the scene rearranged around it: build-up before, aftermath after) and 20 (the best hero shot on the
  drop's bass, punching in on its peak). v13: an unused crash take (rp0069) on beat 52, the slow-motion aftermath after
  it; the pose on 436 with a punch-in on 437; the break's opening dance stretched to 4 beats to fill the slot.
- 2026-11-03 — "lets make a script and put it in default skill setting across all skills, that better convert
  wav to mp3 before running elevenlabs scribe", then "connected hosted elevenlabs mcp (creative_transcription is the
  first choice, if it is not there, then it should do)" → CLAUDE.md › Transcription for every skill:
  `mm transcribe` first (cached words, or the stem's mono MP3 and the price), the ElevenLabs connector on that
  MP3 then `--save`, else `--yes` with the ElevenLabs MCP's key; the connector is the first MCP to install.
- 2026-11-04 — "having the old elevenlabs archived mcp is better than the new one, as it keeps opening a stupid
  widget for transcription. old elevenlabs mcp with api key setup is much cleaner" → flipped back: the ElevenLabs
  MCP's key (`mm transcribe --yes`, no widget) is the first choice and the first MCP to install; the hosted
  connector is only the alternative where no local MCP runs (the Claude web or phone app). Its transcription
  tool is built around a file-picker widget and a flow canvas, and every result is a run to download from.
