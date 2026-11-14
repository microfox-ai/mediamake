---
name: make-doomcat-daily-episode
description: Make a new episode of Doomcat, the user's sarcastic AI news show, from nothing but an idea (a headline, a topic, a link) to two uploaded drafts — researching the real news and facts first, then pitching story angles, then writing the screenplay in Doomcat's voice (dry, lazy, clever; the machine who lives in the servers), voicing it with ElevenLabs, and building it in code on the shared Doomcat world (projects/_doomcat-world: the black yarn-scribble cat, the hand-drawn three.js look, and a library of places and props that grows with every episode). Each line gets the place that makes it explain itself — reused from the world when it suits the story, built new and added to the world when it doesn't — then a storyboard reviewed on File Revisions, the animation reviewed through revise-video, sound effects and the show's jazz bed, a 16:9 twin of the 9:16 episode, thumbnails in the channel's look, and the YouTube packs uploaded as private drafts (the episode and the Short). Every episode adds layers to the world it reuses (wind in the grass it already has, light, weather, life), so the show gets more cinematic each time: slow, dark, funny. In auto mode it runs the whole way on its own, deciding every checkpoint itself. Use when the user says "make a Doomcat episode about <idea>", "new Doomcat episode", "Doomcat ep. <n>", "do an episode on this news", "/make-doomcat-daily-episode <idea>", "… in auto mode", or asks to change a project built on _doomcat-world. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: make
  depends-on: revise-video, revise-image, create-thumbnail, pack-youtube
---

# make-doomcat-daily-episode

An idea becomes a Doomcat episode. The user gives a basic news idea; **you do the rest of the thinking**: find the
real story and its facts, find the angle that's funny, write the screenplay, voice it, design a place for every idea,
storyboard, animate, mix, frame it twice (9:16 and 16:9), package and upload. The user steers at a few checkpoints
(the angle, the script, the voice, the storyboard, the cut, the thumbnails) and leaves notes; nothing paid runs
without their yes.

What stays the same every episode: **the host and the look** (the cat, the hand-drawn pass, the lettering). The music
is still an experiment (below).
What changes every episode: **the story and the world it walks through.** The world (`projects/_doomcat-world`) is
one growing place: an episode reuses a place or prop when the story is really about it, and builds what the story
needs into the world, so the world gets richer with each episode instead of repeating itself. **And every episode is better than the last**
(below): what it reuses, it improves.

## What the show is (the user, 11 Nov 2026, on ep. 2)

"this is not a plain news delivery channel, this is a dig deeper channel where interesting stuff is explained in
creative roasts. roast both the audience as well the subject, roast humanity at every turn." So every episode:

- **Digs deeper than the headline.** The news is the starting point, not the script. Explain how it works and why it
  matters, in a chain the viewer can follow (below), and find what the coverage skipped.
- **Questions whether it can be trusted.** Say what is odd about the story and who benefits from it being told this
  way ("a CEO shooting himself down almost never happens": why confess publicly, why now, what came before). Keep it
  to questions and labelled reasoning; never present a theory as fact.
- **Roasts everyone: the subject, the audience, humanity.** The audience's own takes, read from Reddit (and HN,
  YouTube comments, X) on the story, are material: quote the crowd's typical takes (short, anonymous, never a
  username, never one person singled out) and roast the opinion. Humanity takes a hit at every turn. Nobody is safe,
  including him.
- **Estimates the impact.** What could this change, for whom, how much: markets, policy, the industry, the viewer's
  own life. As his estimates, with the reasoning shown and the facts they rest on sourced.
- **Makes it personal for him.** He is an AI who lives in the servers and runs on this industry's chips: every story
  is also about him. He works out how it hits him, and he worries, in his flat way (his GPUs, his rack, his
  electricity, who will be blamed when the machines are blamed). That worry is his arc through the episode.
- **Starts from a directive that fits the story's kind** (the user, after ep. 2: "the initial story directive is
  important"). Name the kind before the angle: ep. 2 was a **scandal**, scandals are interesting, and the public's
  opinions on a scandal are even more interesting, so the episode leaned on what people said about it. And because
  most news about a scandal can't be verified, the episode's directive and its title are a **fact check** ("Fact
  Check on Nvidia's CEO Scandal", "WHAT ACTUALLY HAPPENED?"): what is confirmed, what is only reported, what doesn't
  add up. That framing is what makes it stand out among the unverifiable coverage. Other kinds want their own
  directive (a launch, a policy, a market move, a feud): decide it at intake, and let the title, the thumbnail and
  every section serve it.
- **Is as long as the story deserves.** A small story is a 2–3 min episode. A big, catchy one can run up to 10 min of
  16:9, and then its 9:16 side is several Shorts of 1–2 min, one per section that stands on its own, not one squeezed
  copy of the whole.

Read before planning:
- `mm notes make-doomcat-daily-episode` (the user's lessons for this skill, newest at the bottom) and the log at the end.
- `reference/craft.md` (the show's standing rules, from every round of notes so far: voice, picture, sound, packs).
- `~/MediaMake/projects/_doomcat-world/README.md` (what is fixed, the catalogue of places, props, screens, moods, sounds).
- The latest episode's `prefs.md` (`mm media production list`, or the newest project on the world).
- The brand: `~/MediaMake/brands/doomcat/` (`docs/voice-guide.md`, `docs/live-feeds.md`, `docs/series-plan.md`,
  `docs/titles-and-sources.md`, `voice/voices.json`, `youtube/channel.json`, intros/ and outros/).

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | the voice (`text_to_speech`), sound effects the library lacks (`text_to_sound_effects`); Scribe word times run through `mm transcribe` with its key (the local MCP, not the hosted connector) | No voice: stop after the script |
| `mcp/browse-hack` | optional | the uploads (`youtube_fill_uploads`), Pinterest/X research when the web isn't enough | The user uploads by hand |

The research also needs the web (web search and the built-in browser, for reading the articles and saving
screenshots of the real pages): never write news from memory.

Look for the tools named above (`mcp__<name>__<tool>`; a connector added in the Claude app has a random prefix, so
match on the tool's name; load deferred ones with ToolSearch). If one is missing, say what it costs and offer to
install it from MediaMake ("Set up mcp/<name> from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"). Browse Hack runs in the user's Chrome: when several
profiles are connected, ask which one by its Google account email (never by number); the channel lives in the
profile `brands/doomcat/youtube/channel.json` names.

**Paid steps, always asked first with the price** (except in auto mode, below; start small, about a dollar already felt a lot to the user): the voice (ElevenLabs
`eleven_v3` ≈ 2.8 credits per character on this account: ep. 2's 1,250 characters cost 3,450 credits), Scribe (≈ 40 credits a minute; `mm transcribe`
prints it), sound effects (≈ 40 credits a second). `check_subscription` shows what is left. Nothing else costs.

## Better every episode: layers of perfection

The user (11 Nov 2026): "with each episode it should get better and better … adding on layers of perfection (like if
the environment of grass is already built, maybe create a wind effect), think cinematic story telling, dark humor,
slow pace". So every episode, besides its own story:

- **Layers on what it reuses.** Each place the episode reuses gets at least one new layer, built into the world so
  every later episode has it: motion (wind through the grass, drifting sand, dust in a light shaft, a fan's draught on
  cables, snow gusts), light (time of day, a lamp's warmth, a screen's glow on his face, a slow cloud shadow), weather,
  small life (an insect, a flickering tube, a ticking pipe), sound (the place's own bed refined). Take them from the
  world's backlog (README → Layers) or invent them; log each one there with the episode.
- **One craft upgrade to the show** where the last episode was weakest (read its prefs.md and the user's notes): a
  camera move, a lighting pass, a better transition, his acting, the lettering, a sound. Say which one, and why, in
  the beat sheet.
- **Cinematic storytelling:** shots with intent — an establishing shot before the joke, a slow push-in to land a
  line, a reveal (the camera finds the gag), a hold on his face after the punchline, foreground and depth, motivated
  light. Cut on the thought, not on the clock.
- **Dark humour:** the comedy is in the bleakness stated calmly (the money gone, humans doomed by their own
  password); he never laughs at his own joke. Darker is fine; cruel to the viewer is not.
- **Slow pace in the picture, not the voice:** hold shots, slow camera moves, fewer cuts, a gag that lands in a pause.
  The voice keeps ep. 1's pace (~125–130 words a minute): ep. 2's [slowly] and extra [short pause] tags pulled it to
  105 and the user heard "the voice changed". At most one [short pause] after a punchline; no [slowly].
- **A fast start:** the first frame is already moving in fast and the voice starts within half a second ("the start
  feels boring, zoom in fast and let the voice-over begin faster"). No slow establishing drift before the first word;
  a 16:9 pre-roll, if any, is a fast push of a second or less.
- **A new world for every section:** each section takes the viewer somewhere they haven't been ("everytime make the
  user feel like hes entering a new world"). Reusing a place is the exception, only when the story is literally about
  it (and then it gets a new layer and a new angle on it). His server room is home, not a default opener.
- **Directed like a film:** the viewer should feel a story is being told to them, and get the intention without
  effort. Each section opens with an establishing image that says where we are and why, then moves in; visual cues
  carry the logic (a prop that recurs, an arrow of light, a match cut from one idea to the next, consistent screen
  direction: cause on the left, effect on the right); framing has intent (small him in a huge wall = powerless; a
  low angle on the board = authority; a close-up for the doubt); transitions carry the eye (push through a door, a
  page, a screen into the next world).

## Auto mode

When the user says auto mode ("make a Doomcat episode about X, auto mode", "do it all on your own"), run the whole
workflow end to end **without asking, stopping or waiting for direction**:

- **Every checkpoint is yours.** Pick the recommended angle, approve your own script and beat sheet, judge the voice
  and the board yourself. Never use a question tool or wait on a review screen. Write each decision and its reason in
  the episode's `docs/decisions.md` as you go (the angle, the places, the voice takes, the board, the cut, the
  thumbnails, the titles), so the user can follow every call afterwards.
- **Paid steps run without asking**, within an episode's normal budget: the voice (one take, plus single-line
  re-voices; ~2.8 credits a character: ~3–4k for 2 minutes, ~18k for ep. 2 v2's 8.7), Scribe (~40 credits a minute),
  missing sound effects (under ~2k credits). The script's word count sets the budget; say it in decisions.md.
  Check `check_subscription` first; if the account can't cover it, use what it can (the library's sounds) and note
  it. Nothing beyond that budget, and no other paid service.
- **Review yourself, honestly.** After the board, after the animation and after the mix, look at the frames (stills
  and contact sheets) and the measurements against `reference/craft.md` and the last episode's notes; fix what fails
  and look again (up to three rounds a stage). Preflight must be clean.
- **The only end point is two private drafts.** Upload with the Browse Hack profile that
  `brands/doomcat/youtube/channel.json` names; never publish, schedule or make anything public, and deliver to
  Downloads only what the user approves later. Thumbnails Studio refuses are listed for the user to add.
- **Long work in the background:** renders and the watcher-free review loop run without blocking; nothing waits on
  the user. If a tool is missing or fails, take the next best path the skill allows and note it in decisions.md.
- At the end, report what was made, the links, the credits spent, the decisions file, and the layers added.

Auto mode needs the session itself set to run tools without prompts (Claude Code's auto or bypass permission
mode): that is the user's setting to choose; the skill never changes permission settings.

## The workflow

### 1. Intake (one short round)

The user's idea is enough to start (in auto mode, ask nothing: take the defaults below). Ask only what changes the plan, in one round: which series (a 1–3 min roast, a
3–5 min bulletin; `docs/series-plan.md`), the length if not obvious, and whether both frames are wanted (default:
the 9:16 Short and the 16:9 episode). Then pick a slug, `doomcat-ep<N>-<word>`, and register the production:
`mm media production new <slug> --channel=doomcat --title="…"` (if the channel isn't in `~/.mediamake/config.json`
yet, add it there first: its folder is Downloads/doomcat).

### 2. Research: the news and the facts, before any writing

The script was "way off" when it was written before the research (the user, 11 Nov 2026). So:

- Find the real story behind the idea: the event, who, where, when, the one specific detail that makes it funny (a
  number, a quote, a price, a toggle). Search widely (news sites, the wire, the company's own statement, court
  filings, the feeds in `docs/live-feeds.md`); for breaking news, the last 24–48 h. Read the pages, not snippets.
- Look for the pattern: is it the second, third, tenth time? The sibling stories make the episode's spine ("another
  bank, another continent, the same headline").
- Write the fact sheet, `~/MediaMake/brands/doomcat/docs/sources-<slug>.md`: every claim the episode could make →
  its source (outlet, date, link) → verified by a second source or a primary document, or not. Dates, never "N days
  ago". What can't be verified is cut, and the sheet says so.
- **The audience's takes.** Read the biggest threads on the story (Reddit: the subject's own subreddit, r/technology,
  r/stocks, r/wallstreetbets, r/hardware … , through Browse Hack's `reddit_search` / `reddit_thread`, or until they
  ship the bridge script the Reddit session left, `reddit.mjs search|thread … --saveTo=<project>/research/reddit`:
  quote from its results, never its raw files, which hold usernames; HN; YouTube and X comments). Threads often carry
  facts the news round-up missed (ep. 2 v2: Wired's crisis firm, the Guardian's lawsuit): verify those like any claim. note the typical takes and their shape
  (the copium, the conspiracy, the moral, the meme), with links in the fact sheet. They are roast material, quoted
  short and anonymous.
- **What doesn't add up.** List what is strange about the story and how it was told (timing, who spoke first, what
  was left out, who benefits). These become the episode's questions, not claims.
- **The impact.** What it could change and for whom (numbers where the sources give them: market value, sales,
  dates of hearings), and what it means for an AI who runs on this industry: his stake.
- Save screenshots of the real articles the episode will show into the project's `input/web/<name>.png` later (step
  5): real stories stay real pages; everything staged gets a fictional name (A Bank plc, Hollowell & Co.).
- **The evidence to show** (craft.md → Show the evidence): licensed photos of the subject (Wikimedia Commons API: CC /
  public domain, with their credit), the real pages (headless Chrome at 2x, cropped above any cookie banner), the
  threads you'll quote (rebuilt as Reddit cards with `_doomcat-world/tools/ui.py`), and the memes and AI-made posts
  going round: ask the user for a folder of the ones they like (auto mode: Reddit's image posts only), vet every one
  (never his family, never a private or accused person, nothing crude), redact posters' names.

### 3. Angles: ideate, then pitch

First name the story's kind and the directive it calls for (above: a scandal → the public's opinions and a fact
check). Then turn the research into **3 story angles**, genuinely different, each in a few lines: the take (what Doomcat thinks
of this, in one sentence), the comic engine (the repeated joke or the escalation), the question it raises about
whether the story can be trusted, how it roasts the subject, the audience and humanity, the impact estimate, his own
stake and worry, the cold open (fast: a hook in the first seconds), the turn, the one warm line for the viewer, the
length it deserves (and how many Shorts), the working title and thumbnail line that carry the directive (ep. 2: "Fact Check on Nvidia's CEO Scandal" / "WHAT
ACTUALLY HAPPENED?"), and the worlds it suggests (a new one per section). Each angle is cinematic, darkly funny and slow (above). Recommend one. The user
picks or mixes (auto mode: take the recommendation). Never pitch angles that need a fact the sheet doesn't have.

### 4. The screenplay

**First the chain, then the jokes.** Write the episode's logic as a chain of plain steps the viewer must understand,
each one following from the last (ep. 2 jumped from the affair to "a wall around those chips" without saying why the
chips matter to the affair: "first explain to the audience what nvidia's affair has to do with the legal wall, don't
jump about abnormally in your screenplay"). Every section answers the question the previous one raised and ends on
the question the next one answers. Only then the roast on top of each step.

**Explain short, and keep it funny** (ep. 4: "these 3 sections are too boring, even the script … its only at the
snow-day it actually becomes interesting. although i want it informative, there has to be humor"; then "still too
much information, keep the explanation short"). One idea per section, a punchline every 8–10 s, his own stake inside
the explanation (he is a server: what happens to the servers happens to him), the subject's own words as comedy (a
company's status feed is funnier than anything written), and running threads that pay off later ("Remember that." →
"No change. Some changes. The change."). Cut the jargon and the list of examples first. Size the episode to how
catchy the news is, not how much there is to say ("watching a 10 mins video on it is a bore unless you have something
interesting and engaging to tell": a dull outage is ~7 min).

Write the script in his voice (`docs/voice-guide.md`, `reference/craft.md` → Voice), ending on the episode's own
sponsor ("Tonight's sponsor is …", something from the story), and, beside it, the beat sheet:
for every line, the picture: the place (from the world, or new), the gag or action, the shot kind (cat / insert /
type), the props, the camera's intent (where it starts, what it reveals, why). Length: as long as the story deserves
(above); Mandrake reads ~125–130 words a minute (180 words ≈ 90 s, 1,250 words ≈ 10 min). Mark the eleven_v3 delivery tags ([dryly], [flat], [deadpan], [sincere], [slowly], [short pause]).

Check it before showing: every claim against the fact sheet; the voice rules (he calls people "humans" (never
"your species"), "us" means AIs; the sarcasm lands on institutions, tools and humans, never the viewer; one warm line;
the sign-off "Tonight's sponsor is a bank."). Pace it slow: room after every punchline, a beat of silence before the turn. The beat sheet names the
episode's layers and its craft upgrade (above). Show the script, the beat sheet and the fact sheet together and wait
for the user's yes: the voice costs money (auto mode: check it against the fact sheet and craft.md yourself, then go on).

**Places, invent first.** For each idea ask: what single place makes this line explain itself? (ep. 1: a dump of
cassette tapes with people's faces on them for voice cloning; lounging on gold bars in a vault for the bank's
response; a clock shop with price tags for "pick whichever time you can afford"; a cardboard robot for "doom will
not arrive as a red-eyed robot"). Generic lines play in plain landscapes with a story prop. Then check the
catalogue: reuse a place when the story is genuinely about it (his server room when he's at home; the vault when
it's about a bank's money), never because it exists. Every new place goes into the world (step 6).

### 5. The voice and the project

1. `node ~/.claude/skills/make-doomcat-daily-episode/scripts/new-episode.mjs <slug> --wide` makes the episode on the
   world (and its 16:9 twin, `<slug>-wide`): lib/shots.ts, lib/story.ts (pages + hooks), lib/sfx-cues.ts, the
   layers, placeholders so it opens before the voice exists. The landscape twin can wait (step 10).
2. The voice (after the user's yes to the price): `text_to_speech` with the show voice from
   `brands/doomcat/voice/voices.json` (Professor Nathaniel Mandrake, `eleven_v3`, stability 0.5, speed 1.0, style 0,
   speaker boost), the tagged script, `output_directory` the media library's inbox (`~/Downloads/_INBOX/elevenlabs/<slug>`).
   A long script goes **one call per section** (ep. 2 v2): each Short then starts clean and a section re-voices
   alone; join them with 0.7–1.2 s of air and keep each section's span (input/vo/sections.json).
   Then `mm media ingest` and `mm media use <id> <slug> --as=input/vo.mp3`.
   Check the take against ep. 1's before timing anything: `node ~/.claude/skills/make-doomcat-daily-episode/scripts/voice-check.mjs <slug>`
   (pitch, brightness and words a minute against the reference take; off by more than ~10 % in pace or pitch: re-voice,
   with fewer tags or stability 1.0).
3. Let the user listen (the file, `open -R`) before anything is timed to it. A line read wrong is re-voiced alone
   (ask) and spliced in at a pause; a stretch the user wants gone is cut (below).
4. Words: `mm transcribe ~/MediaMake/projects/<slug>/input/vo.mp3` (free: the price), then `--yes` → Scribe's
   words beside it (`vo.mp3.scribe.json`).
5. `node ~/.claude/skills/make-doomcat-daily-episode/scripts/voice-prep.mjs <slug>` → input/vo.words.json, vo-env.json
   (his mouth), vo-onsets.json (where each word after a pause is heard: beats and gags land there, not on the
   transcript's start) and the manifest's length. A cut: `--cut=103.55-112.25` (30 ms fades, words shifted, the
   take kept as vo.full.mp3).

### 6. Build the world this episode needs

**Real settings first** (the user, ep. 2: "always take a real setting as an example before you build your scene
(search pinterest for ideas)"): before building or reusing a place, pull real references on Pinterest through Browse
Hack's bulk tabs (a profile asked by email), look at them as a contact sheet, and build what a real one has around the
action: what's beyond the walls and windows, the floor's pattern and its light, the furniture, the crowd (an arena is
full, a terminal has ships and cranes). An empty void outside a corridor or a bare floor is a defect. **Look for it in
films first** (ep. 4: "look for those in real movies or cinema, that way you will grab the right details or camera
angles"): search the place as film stills (Pinterest and Google Images through Browse Hack: "<place> film still",
"<place> movie scene", the real thing a film was shot in), and take the details, the light and the camera angles
from them (ep. 4's morgue and graveyard; its investigation hangar from Sully and the TWA 800 reconstruction).
**Value contrast** (ep. 4: "change the environment its looking bad"): a place of pale tiles in one hue reads as a
wash on screen; build dark structure, one bright source (an open hangar door, a window, a lamp's pool) and a few
strong colour accents, and render stills of every shot in 9:16 before any preview: the opening camera inside the set
(not above the roof, inside a lamp or outside the front wall), a comparison stacked front to back so the tall frame
reads it top to bottom.

For every new place in the beat sheet, build it in the world, not in the episode: a file in
`~/MediaMake/projects/_doomcat-world/lib/` (or a function in `sets.ts` for a small one) that returns a `World`
(group, light, tick, anchors, targets), from the prop builders in `detail.ts` and the surfaces in `surface.ts`,
registered in `places.ts` and `WorldName`, and a line in the world's catalogue (README) with this episode's name.
New story props go in `extras.ts` (+ `Extra`), new screens in `screens.ts` (+ `Screen`). The craft rules for places
(`reference/craft.md` → Picture) apply from the first build: light-to-mid values behind the black cat, his pink and
mint as accents, many-part detailed props, the scratch texture, readable screens.

Then the layers: every place this episode reuses gets its new layer (wind in the grass, dust in the light …),
built into the world's place so every later episode has it, and logged in the README's Layers table.

Changing a fixed file (the cat, the look, the engine) is a decision, not a side effect: say why, then run the
world's check (README → Check) before rendering anything.

### 7. The storyboard (rendered from the engine, reviewed before animating)

The user's order (9 Nov 2026): "build an entire storyboard first and then animate step by step, shot by shot".

- `lib/shots.ts`: one shot per beat (kinds: cat, insert, type for chapter cards and punchlines, media for the evidence),
  timed from the words (`from`/`to` on word boundaries, word beats on onsets),
  with its place, pose, moods (his lazy face by default, understated), gestures on the words, accent pops, props,
  camera (framing presets in the world's shots.ts; `hw` is his head's width in the frame), inserts on targets,
  word beats for punchy runs (one focus at a time). His lines go in bubbles at the bottom (inserts: caption boxes).
- `lib/story.ts`: the real pages (`PAGES.names` = the keys the places read) and the episode's own animation hooks
  (a prop falling on a word, a card turning).
- Evidence (`kind: 'media'`) only where it carries the story (the man, the scandal's own pictures, the posts): a chip
  photo in a story that isn't about chips "does not suit", a time zone needs no picture. Real pictures, not article
  screenshots (ep. 4: "place brolls when you can actually show a picture … than some random article snapshot"):
  licensed photos of the thing named (Wikimedia Commons), its logo, a country's flag; an explanatory section gets one
  or two ("add some brolls"). It plays in the episode's b-roll treatment (the world's `Broll.tsx`, picked by the user
  from a board of stills; ep. 2: collage; ep. 4: tile, in full colour on the subject's brand colours), text b-roll
  with its line highlighted by hand, nothing censored. **The narrator's words on b-roll are motion typography, never
  a chat bubble or caption box** (ep. 2: "the comic bubble does not suit broll edits"; ep. 4: "in broll clips do not
  use chat bubbles, instead some kind of motion typography like the newspaper bits or something that suit the
  context. but never chat bubble (it does not suit)"): the engine sets every media shot's words as torn newspaper
  scraps (`CollageType.tsx`); when the context wants another motion type, build it in the world and use it on
  b-roll, never the bubble. A contradiction over time (what someone said, then said again) is a timeline
  (`media.timeline`, `TimelineShot.tsx`): every statement stays on screen, its key phrase swiped and stamped on his
  verdict. Whenever a company, product or country is named on a 3D shot, its logo or flag slaps on as a sticker. A picture over a 3D shot
  with the cat and his bubble still showing is a sticker (`stickers` on the shot, `Sticker.tsx`); a far-off place opens
  on a map (`media.map`, `MapShot.tsx`, real coastlines). Story props are designed artefacts (a framed front page
  with the date big, `press.ts`), never plain text on a surface. Every b-roll can be dropped: `BROLL_OFF` in shots.ts,
  the shot beside it runs on.
- `node --experimental-strip-types ~/MediaMake/projects/_doomcat-world/tools/board-data.ts <slug>`, then
  `mm stills <slug> <every key it prints> --only --scale=0.5`, then `tools/board-set.ts <slug> --round=v1` →
  the File Revisions link (revise-image reads the notes). Each round keeps its own set (v2, v3 …).
- Iterate on the notes until the user approves the board (auto mode: review the board yourself, below). Their notes go into `prefs.md` with their words.

### 8. Animate and review

The board approved, the shots move: walks planted, gestures swinging in on the words, moods changing on the
beats, the camera drifting slowly (narration shots drift a few degrees; an opener moves the way its scene asks;
`calm()` in the world's shots.ts). Review through **revise-video**, but **the user reviews the whole cut** (ep. 2:
"give me full video, i cant review like this" about stitched 10 s previews): give them the full episode at half size
(`mm render <slug> --proxy` and `<slug>-wide --proxy`); previews only for your own checks. Before acting on a ready
revision, check which render it was written on (its video's date): the watcher also reports old revisions left open.
Then preflight before every link, the watcher in the
background (auto mode: no watcher; review your own renders). Fix each note the way `reference/craft.md` says;
lessons into prefs.md.

### 8b. The edit: cuts and holds after the voice

Notes like "remove this section", "remove this line", "let this stay 2 secs more" are made in `lib/edit.ts` (the
world's `edit.tsx`): `{ cut: [a, b] }` drops a stretch of the source, `{ hold: [t, seconds] }` freezes a moment.
The story stays in the voice's seconds; the picture (`<Warp>`), the voice, the effects and the music
(`<WarpAudio>`, beds with `holds="run"`) all play the kept stretches, video/index.tsx sets `tail` to the cut's length
(OUT − the voice) with `audio: false` and its own voice layer. After `tools/board-data.ts`, always run
`tools/edit-board.ts <slug>` (and `<slug>-wide`) so the review timeline is on the cut's clock; preflight flags a
hold as a freeze (answer it `--intended`). Cut on word boundaries (`input/vo.words.json`), and take with a cut any
line whose setup it removes (say so in the reply).

Ep. 4 cut with `lib/cut.ts` instead (`retime` maps every shot, beat, sticker, badge, grid and timeline row onto the
cut's clock; `apply-cut.ts` rebuilds the voice and its data from the `*.full` copies). Re-voicing a few sections keeps
the rest: each new take is spliced at its old section's start, padded with silence to the old end, and the padding
cut, so every other section keeps its clock and its shots. The places tick on the cut's clock while the hooks run on
the voice's: any start time a hook hands a place (a scan, a robot's round, a sunrise) goes through `toNew`.

### 9. Sound

- Effects: `lib/sfx-cues.ts`, picture event by picture event (`reference/craft.md` → Sound: dry foley, room beds
  ducked, accents on what we see, the gags in the pauses, nothing on the dry lines, no whooshes on plain cuts).
  Library first (`mm media find <word> --kind=sfx`, the show's own tagged doomcat), `mm media use` into input/sfx;
  ElevenLabs only for what's missing (ask with the price; the inbox, ingest, tag doomcat).
  `node --experimental-strip-types ~/MediaMake/projects/_doomcat-world/tools/mix-sfx.ts <slug>` and read its levels.
- Music: **still an experiment** (the user, 11 Nov 2026: "jazz is still experimental, i will tell if we change music or
  remove altogether after 5 episodes in"). Until they decide, every episode gets the show's jazz, very light:
  `tools/mix-music.ts <slug>` (its last chord lands with the sign-off). Don't generate or pick other music on your
  own. Count the episodes made on the world (README → Episodes); from the fifth, ask once at the music step (auto
  mode: keep the jazz and note the question in decisions.md): keep the jazz, change it, or no music.
- Check: preflight's per-section loudness, and the effects audible on a phone (ep. 1's first pass was too shy).

### 10. The 16:9 twin

`<slug>-wide` plays the same storyboard, voice and sound (so the vertical's revisions carry over); only its
`lib/plan.ts` is its own: a frame per shot (`WIDE`; unlisted shots auto-frame), an optional pre-roll (`LEAD`,
`PRE`: a fast push of a second or less into the cold open, never a slow drift before the voice), `dress`
(filling a place out sideways). The rule: same vfov, hw × 0.316 = the same shot size; most shots ×0.33–0.42, him
off-centre, the bubble beside his head. `tools/board-data.ts <slug>-wide`, `tools/mix-music.ts <slug>-wide`,
reviewed the same way. It can run in its own session once the vertical's board is approved (the user split it off
in ep. 1; at most two heavy sessions at once, the Mac overheats).

### 11. Masters

After the user signs off: `mm render <slug>` and `mm render <slug>-wide` (full size), preflight both. Run
`tools/board-data.ts <slug>` and `<slug>-wide`, then `tools/edit-board.ts` for each, before the renders: it writes the twin's `video/shots.json`, without which its
review map has no shots and the Video Revision screen says the map is unreadable (ep. 2 v2). The episode
(16:9) gets the brand's end screen joined without re-rendering:
`tools/attach.ts <slug>-wide --video=out/<slug>-wide/<slug>-wide.mp4` (no intro unless asked; the user's pick of
outro, default "beside the cards"). The Shorts (9:16) get none.

**The Shorts.** A short episode (2–3 min) gives one Short, the whole vertical cut. A long one gives several Shorts of
1–2 min, one per section that stands on its own (its own hook in its first seconds, its own punchline at the end):
each is a window of the vertical project, its own composition over the same folder (a `video/<short>.tsx` with
`slug: '<slug>'`, `window: { from, to, fadeIn: 0, fadeOut: 0.4 }`; `mm render <slug> --composition=<slug>-<short>-9x16`
or the kit's short-cut path), rendered full size and packed one by one; or cut from the vertical master at the
section breaks with ffmpeg (ep. 2 v2: the same frames, 0.4 s fade out, audio limited to -1 dBTP), which costs no render.
With an edit, each Short's window goes through `outTime` (edit-core.ts, or `toNew` with lib/cut.ts) onto the cut's
clock first. Three Shorts at most ("from next time, creating 3 shorts is more than enough"): the three strongest
standalone sections. After a re-cut, rebuild every pack from the new masters: chapters at the new section starts,
picture credits for exactly what is left in the cut, sources only for what the voice still says or the screen still
shows. Uploads after a re-cut are new private drafts; the old drafts stay for the user to delete (say which).

### 12. Thumbnails

What stops the scroll (the user, ep. 2): **super-large type** (the headline fills the top third, two lines
width-fit across the frame: "it will not stop scroll me, if the text is not super large"), **Doomcat big in every
variant** ("doomcat should still be there … more prominent"), DOOMCAT written up beside him, the second subject in
the empty space beside the first ("place her on his shoulder spot, that's just empty space unutilised"), the
headline's lower line behind the cat. The story's real images as the user directs (uncensored); for a fact-check, a
side-by-side of real photos rather than an AI-made picture of people together. The user may sketch the layout on a
screenshot: follow it.

The Shorts (9:16) are built the other way round: **the story's subject is the hook**, cut out big in the centre disc
(a sticker edge), **Doomcat smaller in front at the bottom centre**, the headline above ("it should be small but still
visible big enough, as it is the hook … put cat smaller at bottom center and put the jensen at center circle (use
cutouts)"); a small portrait in a corner "looks bad". How to work: cutouts of the subject (`mm thumbs cutout`, a
portrait model; a crowd photo won't cut cleanly, crop tight instead); place the cat's cutouts as `image` layers by box
(they are whole frames with him somewhere in them: measure where in each job, the two jobs differ); render a sheet
at feed size (246 px wide for 16:9, 270 px tall rows for 9:16) and check every variant before showing it.

Two variants for the episode (16:9) and one for each Short (9:16), in the channel's look (`reference/craft.md` →
Thumbnails): a stills project on the world (`Episode` with `dress` emptying the place to paper, lettering off, the
held prop in pink), `mm thumbs cutout`, then a create-thumbnail job (`mm thumbs init <job> --brand=doomcat`), one
variant led by the real figure and one by the punchline, each with its paired title; the vertical one at
1080×1920 (`"size": [1080, 1920]`; copy it by hand: `mm thumbs pick` re-encodes to 1280×720). Show them with the
titles and ask (pack-youtube: preview and ask; auto mode: pick the strongest at feed size and log why).

### 13. Packs and uploads

`out/youtube/<slug>-wide/` (the episode) and `out/youtube/<slug>-short[-sNN]/` (each Short): the video, title.txt,
description.txt (the 2-line intro in his voice; "The real stories" with each source's outlet, date and link;
"Pictures" crediting exactly what's left in the cut (re-check after every edit); "Staged for the show"; the channel line and tagline; 5 hashtags, #Shorts first on the Short), thumbnails/,
info.json (`channel` from brands/doomcat/youtube/channel.json, madeForKids false, alteredContent as the user says,
language en, tags, visibility private), pack.json, UPLOAD.md. Upload both with `youtube_fill_uploads` (the profile
asked by email; auto mode: the one channel.json names): they stay private drafts on the Visibility step for the user to publish. Studio refuses uploaded
thumbnails until the channel is phone-verified: tell the user to add them by hand, and to point the Short's related
video at the episode. Deliver once approved (`mm media deliver`): the episode's pack to
Downloads/doomcat/<slug>-wide (`--what=youtube`), each Short as its own production with
`--deliver-folder=doomcat/<slug>-wide/shorts/sNN` (the folder is from Downloads/), so the whole episode sits in one
folder; `--uploaded` when they publish.

### 14. Close

The episode's prefs.md has every note with the user's words; general lessons go to
`mm notes add make-doomcat-daily-episode "<what they said> → <the rule>"`; the world's catalogue lists what this episode
added and the layers it laid on, and the README's Episodes list has this one (the count the music decision waits
on). Earlier rounds and renders stay (versioned folders).

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a session. New
lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-doomcat-daily-episode "<what the user said> → <the rule>"   # a new lesson, dated for you
mm notes make-doomcat-daily-episode                                           # your notes for this skill
```

When the user wants them shared, `mm notes promote make-doomcat-daily-episode` offers them to this log as a pull request.

- 2026-11-11 · made from episode 1 (projects/doomcat-desk, its 16:9 twin, the cat lab, the brand kit) at the user's
  ask: "create me a skill that will help in creating more episodes from beginning to end, all the skill should take
  in is just an idea … make the skill generalistic, i dont want it to create the same environment all over without
  using creativity, if its picking same environment because it suits the story that is fine" → places invented per
  idea, reused only when the story is about them.
- 2026-11-11 · "i dont want a clone, only the main character and artstyle, and environment can be reused, but the
  world should keep on building based on the requirements" → the shared world (projects/_doomcat-world): the cat and
  the look fixed, places and props a library every episode adds to; episodes hold only their own story.
- 2026-11-11 · "in round 1, the script is way off, i want the agent to ideate, the user only gives a basic news idea,
  agent should research news and facts before writing the story/screenplay" → steps 2–4: research and a fact sheet,
  then three angles, then the screenplay.
- 2026-11-11 · "with each episode it should get better and better though like adding on layers of perfection (like if
  the environment of grass is already built, maybe create a wind effect, think cinematic story telling, dark humor,
  slow pace)" → Better every episode: a new layer on every reused place (logged in the world), one craft upgrade,
  cinematic shots, dark humour, slow pace.
- 2026-11-11 · "jazz is still experimental, i will tell if we change music or remove altogether after 5 episodes in"
  → the jazz stays the default; from the fifth episode, ask keep / change / none.
- 2026-11-11 · "the skill should be able to work end to end in auto, no permission, no stop, no direction, if user says
  auto mode" → Auto mode: every checkpoint decided and logged in docs/decisions.md, paid steps within an episode's
  budget, self-review against craft.md, private drafts as the only end point.
- 2026-11-11, on ep. 2 · "the information is stupid … the storyline is also basic … questioning the audience, if this
  can be trusted at all, as a ceo shooting himself down almost never happens … sarcasm on the opinions of the
  audience based on their reddit comments … do an estimate on what could be impacted. this is not a plain news
  delivery channel, this is a dig deeper channel … roast both the audience as well the subject, roast humanity at
  every turn" → What the show is; research adds the audience's takes, what doesn't add up, the impact.
- 2026-11-11, on ep. 2 · "the start feels boring, zoomin fast and let the voicover begin faster" → a fast start.
- 2026-11-11, on ep. 2 · "first explain to the audience what nvidias affair has to do with the legal wall dont jump
  about abnormally in your screenplay" → the chain first, then the jokes.
- 2026-11-11, on ep. 2 · "the environments are reused too much, everytime make the user feel like hes entering a new
  world … cinematic story … use visual cues, camera angles, shot framing etc.. cinematic directorial skills" → a new
  world for every section; directed like a film.
- 2026-11-11, on ep. 2 · "if its an ai cat, it should think about how this news impacts it, and then worry about it"
  → his stake and his worry, every episode.
- 2026-11-11, on ep. 2 · "if the idea/storyline is very popular or catchy you can go upto 10mins of horizontal content
  (and multiple of 1-2mins of vertical content - depends on the sections of the story)" → length by the story;
  Shorts per section.
- 2026-11-11, on ep. 2 · "the voice changed" → same voice and settings (pitch 84 vs 87 Hz), but the pace fell from
  ~128 to 105 words a minute under [slowly]/[short pause] tags: voice-check.mjs against ep. 1's take, pace kept.
- 2026-11-11 · "instead of referring to humans as your species, just say humans" → he says "humans", never "your species".
- 2026-11-11, ep. 2 round 3 · "such fast camera movements only suit when setting the scene … the before shots' pans
  were much better" and "almost all opening shots are starting with a zoom in … a move suiting the environment and the
  scene is my intention" → narration drifts (calm()); each opener's move comes from its scene.
- 2026-11-11, ep. 2 round 3 · "the environment is empty outside the corridor and the floor is also empty, always take a
  real setting as an example" → Pinterest references before building; the hall became Versailles, the arena got its crowd.
- 2026-11-11, ep. 2 round 3 · b-roll: "not looking good (show me 4-5 ideas)", picked collage ("keep the rest as
  backups"); "highlighting text … is bad" then "do the highlights in brolls for textual brolls" (by hand, written on);
  "do not censor anything in brolls"; "the comic bubble does not suit broll edits" (kinetic type); "brolls should come
  in places where it makes sense"; "remove this if needed" (BROLL_OFF) → step 7's evidence rules.
- 2026-11-11, ep. 2 round 3 · "show it like a newspaper framed in the hall … the typography is too basic", "show dates
  in big" → story props are designed artefacts (press.ts).
- 2026-11-11, ep. 2 round 3 · "give me full video, i cant review like this" → full half-size cuts for review; the
  edit list (lib/edit.ts) for "remove this section", "let this stay 2 secs more".
- 2026-11-11, ep. 2 round 3 · thumbnails: "it will not stop scroll me, if the text is not super large", "doomcat
  should still be there … more prominent", "place her on his shoulder spot", a sketched layout, "put happened behind
  the cat"; title "Fact check on Nvidia's CEO Scandal" → step 12.
- 2026-11-11, ep. 2 round 3 · "for end, only show jacket, no huang" → the sponsor is shown alone, as a product shot.
- 2026-11-11, ep. 2 thumbnails (16:9) · round 2's F1/F2 (cat-led, "ASK WHO.") were replaced: "put the affair image
  (with both of them - do not censor) in thumbnail and in thumbnail text - WHAT ACTUALLY HAPPENED?"; then "doomcat
  should still be there in thumbnail", "cat should be more prominent"; "not liking the thumbnails, it will not stop
  scroll me, if the text is not super large, also you can place her on his shoulder spot, that's just empty space
  unutilised"; a sketched layout ("place like this", "write doomcat in vertical and put it beside the cat"); "put
  happened behind the cat" → step 12: huge type across the top third, the host big, the second subject in the empty
  space, the user's sketch followed, the type layered behind the host.
- 2026-11-11, ep. 2 thumbnails (9:16 Shorts) · "create with jensen picture in the thumbnail somewhere, cat still stays
  predominant" (a ringed portrait in a corner) → "no, all thumbnails look bad, it should be small but still visible
  big enough, as it is the hook, also put cat smaller at bottom center and put the jensen at center circle (use
  cutouts)" → the subject is the hook in the centre, the host smaller at the bottom centre.
- 2026-11-11, after ep. 2 · "the initial story directive is important, we picked this route because this is a
  scandal, and scandals are interesting, but public opinions on scandals are even more interesting, also since it's a
  scandal, having the title and directive in a fact check manner makes it more impressive as most news out there is
  unverifiable" → name the story's kind and its directive first (What the show is; step 3): a scandal is told
  through the public's opinions and framed as a fact check, title and thumbnail included.
- 2026-11-12, ep. 3 · "from next time, creating 3 shorts is more than enough" → three Shorts at most per episode.
- 2026-11-13, ep. 4 rev-001 · "the start itself was boring", "the muted colors is already boring", "real pictures,
  and logos or stuff like that makes it easy to follow along, otherwise it gets boring (really boring)" → strong
  colour in every section, something visual happening every few seconds, a logo, flag or photo whenever a company,
  product or country is named.
- 2026-11-13, ep. 4 round 2 · "too many camera cuts. i only meant try different angles usually having a long shot
  setting the pace, and closeup for a striking sentence or punchline" → a long, slowly moving shot carries each
  stretch; a close-up lands the punchline.
- 2026-11-13, ep. 4 round 2 · "instead of that boring environment, make a 3d world based on microsoft office logo when
  viewed from top angle and zoom into cat sitting somewhere inside" → the cold open can be a world built from the
  subject's own identity (Office HQ, its roofs drawing the logo from above).
- 2026-11-13, ep. 4 round 2 · "london time does not need a pic", "place brolls when you can actually show a picture …
  than some random article snapshot" → pictures only for what the story turns on; real photos, never article
  screenshots.
- 2026-11-13, ep. 4 round 3 · "better show it as brolls … but use a different color suiting microsoft logo in
  background" → b-roll tiles in full colour on the subject's brand colours.
- 2026-11-13, ep. 4 round 3 · "the background noise is really bad" → room beds stay near-silent air, no buzzing.
- 2026-11-13, ep. 4 round 3 · "cut down on the video … a 10 mins video on it is a bore unless you have something
  interesting and engaging to tell" → size the episode to how catchy the news is (lib/cut.ts).
- 2026-11-14, ep. 4 round 4 · "these 3 sections are too boring, even the script … there has to be humor", then
  "still too much information, keep the explanation short" → step 4: explain short, one idea a section, a punchline
  every 8–10 s.
- 2026-11-14, ep. 4 round 4 · "the morgue and burial ground do not look like it, add more detailing", "look for those
  in real movies or cinema, that way you will grab the right details or camera angles" → step 6: places from film
  stills.
- 2026-11-14, ep. 4 round 5 · "for how-things-die change the environment its looking bad & add some brolls" → step 6:
  value contrast, stills in 9:16 first (the morgue became an investigation hangar); an explanatory section gets one or
  two real photos.
- 2026-11-14, ep. 4 round 5 · "the change is also hard to follow, maybe something like a timeline would be better to
  understand" → a contradiction over time is a timeline (TimelineShot.tsx).
- 2026-11-14, after ep. 4 · "in broll clips do not use chat bubbles, instead some kind of motion typography like the
  newspaper bits or something that suit the context. but never chat bubble (it does not suit)" → every b-roll sets
  the narrator's words as motion type (the engine: CollageType on every media shot), never a bubble or caption box.
