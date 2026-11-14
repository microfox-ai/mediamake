---
name: make-techyon-shorts
description: Make Techyon Shorts end to end. Techyon (Techyon Dev, @TechyonDev) is the user's Shorts-first dev and tech news channel covering AI launches, CVEs and security incidents, and takes from big names. Each Short is a 30–55 s 9:16 loop narrated by Techyon's designed AI voice over dense, bespoke motion graphics in the style of the October 2026 CVEs Short, with dry humour and receipts on screen. The skill runs topic scouting, verified research, scripts, one build session per Short in parallel, review in Video Revision, masters, cloud productions and the YouTube uploads (two a day, 07:30 and 20:30 IST). Use when the user says "make a Techyon Short about <topic>", "next batch of Techyon Shorts", "find new topics for Techyon", "upload / schedule the Techyon Shorts", "/make-techyon-shorts", or asks to change, master, pack or upload a project named techyon-*-short under projects. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  depends-on: revise-video, pack-youtube
  reference: projects/cve-october-2026 (the benchmark for density, motion and sound), projects/techyon-nvidia-huang-probe-short (the current voice, humour and a sensitive story done right), projects/techyon-shared/README.md (the toolbox and every build command)
---

# make-techyon-shorts

**Techyon** (tech + tachyon: the news before everyone else) is the user's Shorts-first channel for developers and
the tech-curious. It is also posted to Reels and TikTok by hand. Its three pillars are AI launches, CVEs and
security incidents, and takes from big names that people are arguing about.

You are usually the **orchestrator**:
- you pick and verify the topics;
- you start one build session per Short;
- you keep the channel's rules in one place;
- you schedule the uploads.

The build itself (the 12 commands, the mix, the toolbox) is in `projects/techyon-shared/README.md`.

**Three more formats** build on this skill and list only their differences:
- `make-techyon-question-shorts`: pick a side, with a pinned comment;
- `make-techyon-dialogue-shorts`: the recurring cast talking, with avatars;
- `make-techyon-data-shorts`: no voice, charts on music, two masters.

Scouting covers all of tech and AI, not mainly security (the user, 11 Nov 2026). When a topic suits one of those
formats better, say so in the pick.

**The rules that matter most:**
1. **Be creative, not kit-bound.**
   - Only the anchors in `references/direction.md` are fixed: palette, type, captions, safe layout, the end tag, sound targets, the voice and tone, the truth rules and the format.
   - Everything else is designed fresh for each Short: the scenes, the motif, the music, the effects and the pacing.
   - The benchmark is the October 2026 CVEs Short. If a cut looks emptier than its stills (`out/cve-october-2026/stills/`), it isn't done.
2. **`references/direction.md` is the one source of the channel's rules.**
   - Other files point to it. When the user changes something for every Short, change it there first (see "Channel-wide changes").
3. **Truth before speed.** Every fact on screen traces to `sources.md`, and an allegation is never shown as a fact.

Why the rules are what they are, and every revision so far: `references/history.md`.

## First: check the MCPs and the account

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/elevenlabs` | required | The voice (`text_to_speech`), voice design (`text_to_voice`), word times (`mm transcribe` uses its key), effects (`text_to_sound_effects`) and music (`compose_music`) | No Short at all: the narration is the spine of every beat |
| `mcp/projectsync` | recommended | The Techyon cloud project: each Short as a production (`create_production` / `update_production`), the brand kit (`get_brand_kit`) | The work stays only on this Mac; teammates can't pull it |
| `mcp/browse-hack` | recommended | The uploads: `use_profile`, `youtube_bulk_upload_shorts` (a pack, each Short with its own `scheduleAt`), `youtube_fill_uploads` (one Short), `youtube_get_video` | Upload each Short by hand in YouTube Studio from the pack |
| `mcp/blender` | optional | A 3D shot when a story earns one | Motion graphics only, which is what every Short so far has used |

- **Load and report.** Load deferred tools with ToolSearch. Say what a missing one costs, and offer its install prompt ("Set up mcp/<name> from MediaMake by following https://github.com/microfox-ai/mediamake/blob/main/install.md").
- **ElevenLabs** must be on a paid plan (Creator or higher), because the free plan gives no commercial licence. Check the credits with `check_subscription` before a batch: a Short costs about 2–3k credits.
- **Research** uses web search and fetch, and research subagents. A deep-research MCP, when connected, is fine for one cross-check per topic.

## Where things live

| what | where |
|---|---|
| **the anchors: the channel's rules** (canonical) | `references/direction.md` |
| why each rule exists, every revision | `references/history.md` |
| short-form rules with numbers (hooks, safe zones, pace, loops, sound, covers) | `references/shortform-rules.md` (evidence: `projects/techyon-shared/research/shortform-best-practices.md`) |
| the toolbox: build commands, `mix.py`, `remux.sh`, `vo-splice.py`, `make-pack.py`, `fx` primitives | `projects/techyon-shared/` (its README) |
| the brand kit: palette, logo, fonts, YouTube art | `brands/techyon/` |
| the channel's upload answers | `brands/techyon/youtube/channel.json`: handle, Chrome profile, `shortsTimes`, AI disclosure, category, language |
| when to post, with evidence | `projects/techyon-shared/research/upload-times.md` |
| one Short | `projects/techyon-<topic>-short/`, with finals in `out/techyon-<topic>-short/` |
| a batch's shared brief | `projects/techyon-batch-<date>.md` |
| what has gone out, and what waits | `projects/techyon-published.md` |
| upload packs | `out/youtube/techyon-shorts-<date>/`, and `techyon-shorts-pending/` for what waits |

`projects/`, `brands/` and `out/` are gitignored. The productions and the brand kit are also in the Techyon
MediaMake cloud project (`list_projects` → "Techyon").

## The run

### 1. Topics

- **The user gives a topic:** verify it first (step 2) before building anything. Some "news" is rumour.
- **Otherwise, scout the last 7–14 days** with a research subagent:
  - cover all three pillars;
  - skip anything in `techyon-published.md`;
  - prefer what is primary-sourced and still moving;
  - note how fast each one goes stale.
- **Show the picks:** 5–8 picks plus 2–3 alternates in `AskUserQuestion` (4 options per question, so split them), one line each on why. Then go on with the answer.

### 2. Research (a subagent per topic, or the build session itself)

`research/sources.md` in the Short's project:
- **Primary sources first:** vendor posts, advisories, NVD/CISA KEV, model cards, papers, the podcast itself.
- **Quotes** are checked against the source, with the timestamp linked. Quote one short line, paraphrase the rest, and never polish a quote.
- **Confidence:** confirmed, vendor-claimed, single-source or disputed, marked on every claim.
- **Security stories are defensive:** who is exposed, the fixed versions and what to do. No trigger conditions or exploit details.
- **Allegations and markets** follow the sensitive-story rules in `direction.md`:
  - confirmed versus alleged;
  - no naming of uncharged private people;
  - never implying wrongdoing that isn't established;
  - numbers with their time;
  - forecasts attributed and labelled ANALYSIS;
  - "Not financial advice".
- **For breaking news,** write a facts brief yourself before the build starts (confirmed / alleged / markets / what's next / sources), so the build session starts from checked facts.
- **Pages that won't load:** some come back empty to WebFetch because they're built by JavaScript (Ballotpedia) but read fine with a plain `curl`. A page behind a bot check (a county site, say) is never bypassed: cite a secondary source that quotes it, and say so in `sources.md`.

Recheck the facts a Short leans on hardest just before the voice is recorded, and again before its slot if the hook
depends on something that can change ("still unpatched", "about to drop").

### 3. Script

Write `script.json` in the toolbox's format; `short-docs.ts` writes `vo.txt` and `script.md` from it.

- **Length:** 30–45 s for one news item, 55 s at most.
- **Structure:**
  - the hook is said and shown in the first 1–1.5 s;
  - then fact, twist, payoff;
  - the last line leads into the first as one thought, for the loop ("…which is how X got this headline:" → the cover → the hook);
  - a question that only comes before the hook doesn't loop.
- **Tone:**
  - no greeting and no channel intro;
  - 2–3 dry, deadpan asides per Short, aimed at the situation, the market or the timing, never at a person or an allegation, and shown as a sticky note or stamp;
  - opinions are labelled OPINION, analysis ANALYSIS, and vendor numbers say so on screen.
- **Spoken spelling:** write how numbers are spoken in `"spoken"`. CVE ids, version numbers and decimals need spelling out.

### 4. Build: one session per Short, in parallel

- **One shared brief per batch.**
  - Write `projects/techyon-batch-<date>.md` with the run, the machine rules, the slot plan and each Short's slug and topic.
  - Each session's prompt is then short: the topic, the scout's leads, the slug, the target slot and "read the batch file first".
  - Cross-session messages are capped at about 10 per user message, so long updates go in the file.
- **Start the sessions** with `start_session`, "fresh", `use_worktree: false`. `projects/` is gitignored, so a worktree wouldn't hold it.
  - Start them on the user's own message. A turn opened by a background agent can't start sessions: ask the user for one go-ahead.
- **Register each production at intake.** You (the orchestrator) do this for every slug before starting its session:

  ```bash
  mm media production new <slug> --channel=techyon --skill=make-techyon-shorts
  ```

  If it answers `Unknown channel "techyon"`, this Mac's `~/.mediamake/config.json` has no `techyon` channel yet (it maps a channel to its folder in Downloads). Register without `--channel`, and tell the user once: adding the channel is their call.

- **The toolbox (`techyon-shared/`) has one owner session at a time.** The others write what they need into `techyon-shared/REQUESTS.md` and never edit or fork the toolbox.
- **The machine is shared.**
  - Breaking news has render priority: the others render only stills and short ranges until its master exists.
  - One review render at a time.
  - The `gov` governor queues heavy commands. Exit 75 means busy: wait, never bypass.
- **You learn progress from the sessions' turn-end notes and from disk.** Check every claim there before telling the user a Short is done:
  - the master is 1080×1920, 30 fps, and its frame count equals its duration × 30;
  - the audio is as long as the video;
  - the finals listed in step 8 exist;
  - `report.md` has the user's sign-off words, and a preflight with about −14 LUFS and a true peak at or under −2 dBTP.

### 5. Voice, sound and picture

Follow the toolbox README, with these settings:

- **Voice:** use the `make-elevenlabs-voice` skill with the settings in `direction.md` § 7: Techyon Narrator E (`r3CSRNuTBNTuPufjI9Vj`), `eleven_v4`, stability 0.35, a natural script, two takes, then `mm voice … finish`.
  - The finished take (`vo-room.wav`) becomes `input/vo/vo.wav`. `words.json` comes from the voice tool, so `mm transcribe` isn't needed. If you still want Scribe's word times, run `mm voice … check --yes`.
  - Then `vo-splice.py --tighten=0.32 --fit-grid=<bar>`, so the loop ends on a bar.
  - Liam (`TX3LPaxmHKxFdv7VOQHJ`, multilingual v2) voiced the first 14 Shorts, and E on v3 voiced the Nvidia Short. Don't mix voices within one narrated Short.
- **Sound:** this Short's own music and effects.
  - Where to find them, in order:
    1. the media library (`media find`);
    2. Pixabay tracks not registered with Content ID (ask before downloading);
    3. ElevenLabs `compose_music` and `text_to_sound_effects` (say the cost). Ask for effects of at least 2 s ("loud, close-up, foreground") and trim them: at 1.2–1.5 s, 2 of 3 came back near-silent or a lone click.
  - **File what you generate:** put it in the library inbox (`mm media help` shows where), then `media ingest --channel=techyon`, so later Shorts can reuse it.
  - "Tech Circuit Data Stream" and the CVE whoosh, stamp and glitch are the fallback.
  - Mix with `mix.py`: voice-led, with the music sidechain-ducked so it pumps between phrases, −14 LUFS and true peak ≤ −2 dBTP.
  - **Run `remux.sh` after every render.** Remotion's MP4 starts the audio 42.7 ms late, which leaves a gap at the loop seam.
- **Picture:**
  - Bespoke devices on the spoken words, about one change a second.
  - One hero device at a time in y 300–1150.
  - Every number moves, and every claim shows its receipt.
  - A motif of its own.
  - The first frame is the cover (2–5 huge words in y 640–1280), and the last frame folds back into it.

### 6. Review (`revise-video`)

1. Make a half-size review render, run `remux.sh`, then preflight. Make a side-by-side sheet against the CVE Short's stills.
2. Send the Video Revision link (`https://mediamake.microfox.app/video-revision?folder=<slug>&video=<slug>.mp4`) and start the watcher in the background.
3. Act on the notes, reply and resolve. A sound-only change is re-mixed and muxed onto the existing picture.

Sign-off in chat counts ("Looks good, master it"): record the user's words in `report.md`. When the user signs off,
ask in the same message for the cloud upload too, so the session doesn't stop again for a second yes.

### 7. Channel-wide changes (do this the same hour)

When a note changes something for every Short (the voice, the tone, the loop, the sound, the layout):
1. Update `references/direction.md`, and add a line to the feedback log below. Change the number the note is about and keep the other targets: "louder music" moves the music-under-voice level (never less than 12 dB under the words) and the lift between phrases, not the −14 LUFS master.
2. Tell every running build session in one short message: "direction.md changed: <what>. Apply it before your voice / master."
3. Ask the user whether Shorts already signed off but not yet on YouTube should be redone. Don't redo them unasked; they stay as they are until the user answers.
4. A toolbox fix goes in through the toolbox owner. Roll it out to each Short, then check each one on disk.

Build sessions reread `direction.md` before recording the voice and before mastering.

### 8. After sign-off: masters, finals, cloud

- **The master:** full size (1080×1920, 30 fps), then `remux.sh`, then check the frame count, the seam and preflight.
- **Finals in `out/<slug>/`:**
  - the master and its `.srt`;
  - `<slug>-cover.jpg` (frame 0);
  - `post.md`: the YouTube title (≤ 100 characters), the description with sources and hashtags, tags (≤ 500 characters), the Instagram and TikTok captions, and a suggested pinned comment;
  - `report.md`: the sign-off, the credits and the checks;
  - `sources.md`.
- **Cloud:** ProjectSync `create_production`, or `update_production` for a new version, in the Techyon project. Code and finals only, no review renders, dry run first.

### 9. Upload and schedule

**Slots:** two a day, **07:30 and 20:30 IST** (`channel.json` `shortsTimes`).
- 07:30 is the US evening, for news from the US day; 20:30 is the US morning and India's evening, for the day's main story.
- **Assigning slots:**
  - A Short takes the earliest free slot that is at least 2 h away when the pack goes up (upload and processing take time); a slot that is closer or already past is skipped.
  - Fastest-staling first, so a Short with a time-sensitive hook takes the earliest slot.
- **Breaking news** goes up as soon as it's signed off:
  - Upload it alone with `youtube_fill_uploads` (an `info.json` folder with `visibility: public`); the user clicks **Publish** in its tab.
  - It counts toward the upload cap like any other Short.
  - If it makes three Shorts still to come that day, move the day's least time-sensitive one to the next free slot. If that one is already scheduled in Studio, tell the user which Short to move and to which slot.

**The pack:** build it with `make-pack.py` (from the workspace: `mm workspace` says where):

```bash
python3 projects/techyon-shared/make-pack.py out/youtube/techyon-shorts-<date> <slug>@YYYY-MM-DDTHH:MM …
```

It clones the masters and covers, writes `descriptions/<slug>.txt` from each `post.md`, and gives every Short its own
`scheduleAt` (Browse Hack's `schedule.time` alone puts one Short a day). A single Short can use an `info.json` folder
with `youtube_fill_uploads` instead.

**Before uploading:**
- **Count the uploads of the last 24 h** (the upload notes in `techyon-published.md` and each pack's `UPLOAD.md`). The unverified channel took about 10 in 24 h, then Studio stopped it ("Upload more videos daily after a one-time verification or wait 24 hours").
  - Keep the total at **8 or fewer** in any 24 h, as a margin.
  - Whatever doesn't fit goes to `out/youtube/techyon-shorts-pending/` and the "Waiting to upload" list in `techyon-published.md`.
  - Phone-verifying the channel (youtube.com/verify) lifts the cap. Only the user can do it.
- **Recheck every time-sensitive hook** against its slot.

**Upload:** call `use_profile` with the profile in `channel.json`, then `youtube_bulk_upload_shorts`.
- Use `clickSchedule: true` when the user asked for the Shorts to be scheduled. Nothing is ever published for them.

**Known issues** (Browse Hack, Nov 2026):
- **Studio's Schedule button stays off while a file uploads,** so every Short so far came back `scheduled: false`. Give the user the list of tabs: each needs **Schedule** once its upload finishes.
- **Never run a pack twice:** it uploads everything again.
  - A Short that didn't upload at all gets its own `info.json` folder and `youtube_fill_uploads`.
  - A blocked or abandoned try leaves a draft, which the user deletes in Studio → Content → Drafts.
- **Category and language don't always stick.** Name the tabs that need them set by hand.
- **On a brand-new channel,** the empty Shorts tab doesn't load. Upload the first Short alone with `youtube_fill_uploads`.

**Thumbnails and other platforms:**
- Custom Shorts thumbnails need the Partner Program. Until then the user picks the first frame in the YouTube app.
- Instagram and TikTok are posted by hand from `post.md`, with the cover as the Instagram cover. TikTok is banned in India, so post it for the US evening.

### 10. Afterwards

- **Record every upload** in `techyon-published.md`: the slot, slug, title, status and link. Update the status when the user says they clicked Schedule or Publish.
- **Log to the PORTAL connector** per the user's global rule (2–3 tasks a session; `get_context` first, then reuse a matching task):
  - a single Short is one task ("Techyon <topic> Short");
  - a batch is one task ("Techyon Shorts batch"), with a note per milestone;
  - a breaking-news Short gets its own task only while that keeps the session at 3 or fewer. Otherwise log it under the batch.
  - Build sessions don't log; the orchestrator does.
- **Check retention after two weeks in YouTube Studio:**
  - "stayed to watch": ≥ 70 % is a good hook; under 60 %, rework the hooks;
  - views by slot and by geography;
  - the "When your viewers are on YouTube" card. Then adjust the slots.

## Costs seen (ElevenLabs Creator, Nov 2026)

| item | credits |
|---|---|
| a 45 s voice take | about 800–1,000 (1 per character) |
| word times (Scribe, via `mm transcribe`) | about 30–40 a minute of audio |
| effects | about 40 a second of effect; 8–10 takes about 370–460 |
| a composed 60 s track | about 600–950 |
| one Short | about 1.8–2.5k; with voice samples or a voice design, up to about 4k |

## Common mistakes

| mistake | do instead |
|---|---|
| Building from a kit template | Design each Short from its story; the toolbox is optional |
| A channel-wide change left in one session | Change `direction.md`, then tell every running session (step 7) |
| Mastering before the user signs off | Review first; chat sign-off is fine, recorded in `report.md` |
| Naming a private person in an allegation, or a stock number with no time | The sensitive-story rules in `direction.md` |
| Rendering without `remux.sh` | A gap at the loop seam; run it after every render |
| Running a pack again after `scheduled: false` | The user clicks Schedule in the open tabs |
| Uploading past the daily cap | Count the last 24 h; the rest goes in the pending pack |
| A hook that went stale before its slot | Recheck time-sensitive hooks up to the slot |

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add make-techyon-shorts "<Short> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes make-techyon-shorts                                                  # your notes for this skill
```

When the user wants them shared, `mm notes promote make-techyon-shorts` offers them to this log as a pull request.

- 2026-11-08 · channel · Picked the name Techyon over Kaon, Daemon and Nightly; @techyon was taken, and the channel is "Techyon Dev" (@TechyonDev).
- 2026-11-08 · channel · "make this a short form content channel instead of long form, create cachy shorts optimised to social media for retaining audience views and good premium thumbnails too" → Shorts-first. Five long-form scripts were cut down to Shorts; the long-form scripts stay in `projects/techyon-<topic>/`.
- 2026-11-08 · voice · Picked Liam out of four samples (Liam, River, Matilda, Roger) of the same opening → Liam at speed 1.1 for every Short (replaced on 2026-11-09, below).
- 2026-11-08 · all Shorts · "the transition sound effect is not good… it should be cachy, attract audience attention but still be smooth… the contents are not at the correct position… use good motion graphics in background, dont make the short seem too empty and too bloated… looping where the end connects with the start… increase [the music's] volume… keep the starting and ending volume even higher" → research-backed layout (`references/shortform-rules.md`), a moving ground, true seamless loops, louder music that pumps between phrases and stays ≥ 12 dB under words.
- 2026-11-08 · all Shorts · "the old cve short seemed really good to me in content density, bg score, motion graphics" and "use the same transition sound and background sound as the old cve one" → the October CVEs Short is the benchmark. The tonal-swell transitions and the kit's own bed were dropped.
- 2026-11-08 · all Shorts · "i dont like the shorts in our brand as much as the old cve one… our brandkit is making it very restrictive and not creative enough, let the agent be creative… just use the brand colors and layout… take the old cve one as reference and use its colors too… let the claude find [music, effects, graphics] whenever it works on it instead of just picking from the brand kit" → direction v2 (`references/direction.md`):
  - the CVE palette with signal yellow as the accent, and Figtree;
  - the kit became an optional toolbox;
  - each Short designs its own scenes and finds its own music and effects;
  - no design questions to the user.
  All six Shorts were rebuilt that way and approved.
- 2026-11-08 · licensing · The October CVE Short's voice and effects were made on the ElevenLabs free plan (no commercial licence) → re-voiced and re-generated on the Creator plan before reuse; never ship free-plan files.
- 2026-11-08 · uploads · "Yes, disclose it" → AI use (altered or synthetic content) = yes on every upload (`channel.json`).
- 2026-11-08 · uploads · "make it 20:30 IST but today upload now" → `shortsTime` 20:30 (IST); the first Short went up the same evening and the rest one a day.
- 2026-11-08 · location · Asked to move the Techyon work out of `apps/lyrics_videos` or rename it, then "this seems complicated so just leave it" → it stays in `apps/lyrics_videos`. (Since then the repo moved everyone's projects into the workspace: `mm migrate`.)
- 2026-11-09 · slots · Asked for 2–3 Shorts a day; picked "07:30 + 13:30 + 20:30 IST" from the research → `shortsTimes` in `channel.json`, each Short with its own `scheduleAt` (cut to two a day on 2026-11-11, below).
- 2026-11-09 · Nvidia CEO probe · "nvedia one as soon as its ready and rest schedule for when the next empty slot is of our timing" → breaking news goes up when ready; everything else fills the next free slot.
- 2026-11-09 · topics · Picked all eight scouted topics (four main, four alternates) → a batch of eight build sessions with one shared brief file (`projects/techyon-batch-<date>.md`) instead of eight long briefs.
- 2026-11-09 · Nvidia/Huang probe · "the end doesnt seem connected to the start when looped" → the loop line must lead *into* the first line as one thought (e.g. "…which is how the world's second most valuable company got this headline:" → the cover/headline → the hook), and the picture builds the cover on those words; a question that merely precedes the hook ("does Huang stay, now that") didn't land.
- 2026-11-09 · Nvidia/Huang probe · "add some subtle humour, sarcasm but stay neutral? like how fireship does it" → a few dry, deadpan asides per Short (short lines like "Not your typical company memo.", "Wall Street stayed calm-ish", "Timing: not ideal."), aimed at the situation, the market or the timing, never at a person or an allegation; shown as a sticky note or stamp in signal yellow; the truth rules are unchanged.
- 2026-11-09 · Nvidia/Huang probe · Liam, Chris, Eric, Daniel and Callum on multilingual v2: "these all seem ai… something which sound human, like younger american voice… add some expressions and emotion" → picked **E**, a voice designed with `text_to_voice` ("young American man, early twenties, natural conversational tech-YouTuber delivery, a little dry and sarcastic") and saved as "Techyon Narrator (young American, E)" (`r3CSRNuTBNTuPufjI9Vj`), read on **eleven_v3** with emotion tags ([serious] on facts, [deadpan]/[sarcastic]/[dryly] on asides), speed 1.1, `mp3_44100_192`. Keep the tagged text in `input/vo/vo-tagged.txt`; `say` in script.json stays untagged.
- 2026-11-09 · uploads · "open ai and github one are left to be uploaded because of [the daily limit] so pause them but keep track of what are left so we can upload later" → a pending pack (`out/youtube/techyon-shorts-pending/`) and a "Waiting to upload" list in `techyon-published.md`; upload them once the limit clears.
- 2026-11-11 · schedule · "change of plans, publish the rest on the next empty days, only upload 2 per day" → two a day, 07:30 and 20:30 IST (`channel.json` `shortsTimes`); a new Short takes the next day with fewer than two.
- 2026-11-11 · skill · "create a good skill for techyon channel and how the pipeline can be improved" → the skill was rewritten around the lessons in `references/history.md`. The voice E and the dry asides became the defaults (the user had rejected Liam with the other stock voices). `direction.md` became the one source of the channel's rules, with a same-hour channel-wide change step. Productions are registered with `--channel=techyon`, a 24-hour upload count runs before each pack, and time-sensitive hooks are rechecked up to their slot.
- 2026-11-11 · topics · "the techyon channel content till now seems mostly focused towards cybersecrity and cves which is not all it covers, it should be about everything significant in tech world, including ai stuff" → scouting covers all of tech and AI, with security only one pillar among them; the three new formats (question, dialogue, data) each have a skill.
- 2026-11-11 · voice · The voice test: "very easy to identify it as ai voice" → of six versions the user picked "4: our voices + room" → Techyon voices now follow the `make-elevenlabs-voice` recipe (eleven_v4, stability 0.35, a natural script with sparing fillers, two takes, the room finish). `direction.md` § 7 changed. Shorts already uploaded keep their voice.
