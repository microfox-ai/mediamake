---
name: pack-youtube
description: Make a song's YouTube upload pack from its title, its lyrics.json and its audio file, in parallel threads — thumbnails (through create-thumbnail) beside the description, then the title (through write-youtube-metadata: a 2-line intro, the plain lyrics, a 1-line channel outro, at most 5 hashtags) — collected in one folder, apps/studio/out/youtube/<slug>/, ready to paste into YouTube Studio, with an info.json that Browse Hack's youtube_fill_uploads uses to switch to the channel and fill Studio's upload form. Use when the user says "make a YouTube pack", "YouTube upload pack for <song>", "/pack-youtube", "thumbnail + title + description for this song", "upload it to YouTube", or gives a song title, lyrics.json and audio and wants it ready for YouTube. New user feedback goes in your notes (mm notes add), never in this file.
---

# pack-youtube

One folder with everything a song's YouTube upload needs, made by running two skills in order:
**`create-thumbnail`** first, then **`write-youtube-metadata`** (the title is written to work
with the thumbnail's words, so the thumbnail comes first). This skill only gathers the inputs,
hands them over, and assembles the pack; the work is done by those skills, following their steps.

**Pack folder:** `apps/studio/out/youtube/<slug>/` (gitignored), `<slug>` from the song
title (`you-can-have-the-kingdom`). The thumbnail job uses the same slug.

```
out/youtube/<slug>/
  <Title>.mp4   the video to upload, when there is one (an APFS clone, `cp -c`, of the final render)
  end-screen-card-guide.jpg   the channel end screen's card slots, when the video ends on one
  UPLOAD.md     what goes where in YouTube Studio, one table
  info.json     the upload form for Browse Hack's youtube_fill_uploads: channel, files, settings (step 5)
  title.txt  description.txt  lyrics.txt  metadata.json   (from write-youtube-metadata)
  thumbnails/   the picked finals only (1, or 3 for YouTube's A/B test)
  input/        lyrics.json, the audio file (copies; the originals stay where they are)
  history/      earlier thumbnail rounds and earlier titles / descriptions (kept, never deleted)
  pack.json     what is in the pack and where it came from
```

**The finished pack is one folder with everything the upload needs:** the video, the title, the
description, the thumbnails, the end-screen guide, UPLOAD.md and info.json. Nothing the user uploads lives
anywhere else. When it is done, give the user a one-click way to open it: a `bash` block with
`open -R "<absolute path to the video>"` (the app adds a Run button; Finder opens with it
selected). Never open Finder yourself.

## First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/browse-hack` | recommended | Filling YouTube Studio's upload form from info.json on the brand's channel (`youtube_fill_uploads`, `youtube_list_channels`), and a shorts pack's shorts (`youtube_bulk_upload_shorts`, MCP 0.13.0) | The pack is still made in full; the user uploads by hand in YouTube Studio, following UPLOAD.md |

Look for the tools named above (`mcp__<name>__<tool>` in Claude Code; a connector added in the
Claude app has a random prefix, so match on the tool's name; load deferred ones with ToolSearch).
If one is missing, say at intake what it costs and offer to install it from MediaMake ("Set up
mcp/browse-hack from MediaMake by following
https://github.com/microfox-ai/mediamake/blob/main/install.md"; its tools show up in the next
session), or go ahead without it.

## Parallel threads (the user's standing request)

"When creating brands or creating youtube pack, run parallel threads for faster execution"
(2026-10-27). After the intake (step 1), run the pieces that don't wait on each other at once:

| piece | runs as | waits for |
|-------|---------|-----------|
| thumbnails (step 2, `create-thumbnail`) | a session: it has its own picking rounds | the intake |
| `lyrics.txt`, the description's intro and outro, hashtags (step 3, `write-youtube-metadata`) | this session | the intake |
| the title (one, or three for an A/B test) | this session | the thumbnail's hero words; three titles after the pick |
| the outro: the brand's outros as a review set, then the picked one joined with ffmpeg | a subagent | the user's outro pick (the join only) |
| the video check (it ends on the end screen, loudness, length) | a subagent | the final video |

The thumbnail session owns `thumbnails/jobs/<slug>/` and `out/thumbnails/<slug>/`; this session
owns the pack folder and assembles it. The pack is never `ready` until the user picks: the
thumbnails, the title and the outro are theirs. Say in one line what runs where, and report each
thread as it comes back. A pack with a single thumbnail style and no video is too small to split.

## 1. Inputs and intake

Needed: **the song title**, **the lyrics.json** (or another lyrics file) and **the audio file**.
Check the files exist, then:

```bash
M=.claude/skills/write-youtube-metadata/scripts/ytmeta.py
ffprobe -v error -show_entries format=duration -of csv=p=0 "<audio>"   # the song's length
python3 $M lyrics "<lyrics.json>" >/dev/null                           # prints "last sung …s"
```

The last sung second must fall inside the audio's length (and near its end, minus any outro):
if it doesn't, the lyrics probably belong to another take or song. Say so and ask before going on.

Ask in **one** `AskUserQuestion` call (recommended option first; skip what the request or the
files already answer, and say what you assumed):

1. **The channel:** one of the brands under `apps/studio/brands/` (or another channel).
2. **The picture** for the thumbnail: their image, frames from the lyric video if one exists
   (`apps/studio/out/` or the project's render), a concept to generate, or type only.
3. **The title on the thumbnail:** must be on it · optional · never (create-thumbnail's question 4).
4. **Fonts** for the thumbnail: the brand's, a family they name, or a mood (question 5).
5. **The lyrics in the description:** keep the full lyrics, or leave them out. Always ask; never
   decide it yourself.

Make the pack folder, copy the lyrics and audio into `input/`, and write `pack.json` with what you
know so far (`song`, `slug`, `channel`, `audio` with its duration, `lyrics`, `status: "thumbnails"`).

## 2. Thumbnails: run `create-thumbnail`

Invoke the `create-thumbnail` skill (Skill tool) and follow it, handing over what is already known so
its intake only asks what is still open: the job `<slug>`, the brand (`init <slug> --brand=<brand>
--title="<song title>"`), the picture, the title and font answers, and **the lyrics as the
transcript** (`python3 $M lyrics … --out=thumbnails/jobs/<slug>/input/transcript.txt`, which create-thumbnail
reads for hook words). Render, check and show the sheet exactly as that skill says, with its review
link.

Don't stop for the pick: once the sheet is shown, go straight on to step 3 in the same turn, and
write down the hero words of each style (the metadata step needs them).

## 3. Title and description: run `write-youtube-metadata`

Invoke the `write-youtube-metadata` skill and follow it with: the song title, the lyrics
file, the channel, the pack folder as the output folder, the thumbnail's words, and the project's
`project.json` for stanza breaks when the song has a lyric video project
(`apps/studio/projects/<slug>/input/project.json`). It writes `lyrics.txt`, `title.txt`,
`description.txt` and `metadata.json` into the pack and checks them.

## 4. Show the pack, then finish it

Show the user, in one message: the thumbnail sheet (already sent) with its IDs and review link,
the title and its two alternatives, and the description in a code block, plus the pack path. Ask
for the thumbnail pick (one final, or three for an A/B test) and any changes to the words.

**Always preview and ask for suggestions** on the title and the thumbnails: the pack is never
`ready` on your own picks. Each round of thumbnails and every title gets shown with a question
for the user's suggestions, and only their pick and their go-ahead finish it.

Then, as the answers come:

- **Thumbnail feedback / pick:** handled by `create-thumbnail` (its iterate and review steps). After
  `mm thumbs pick <slug> <IDs>`, copy `out/thumbnails/<slug>/final/*.jpg`
  into the pack's `thumbnails/` (replace what was there; re-copy after every re-pick).
- **Three thumbnails picked → three titles:** have `write-youtube-metadata` write one title per
  thumbnail (`titles.txt`), show them with the thumbnails, and list the pairs in UPLOAD.md.
- **Title / description changes:** edit the pack's files and run its `check` again.
- If the picked thumbnail's words changed a lot from what the title was written against, re-read
  the title: it should still add something the thumbnail doesn't say.

**End screen (outro) on a finished video.** When the pack is for a finished video, check that it
ends on the channel's end screen (YouTube's end-screen cards need its last 5–20 s), and offer to add
one if it doesn't.
- **Several outros in the brand kit** (`apps/studio/brands/<brand>/outros/*.mp4`): don't list
  them in chat. Let the user pick in a review screen. Make the outros a reviewable set: a clone
  of each outro MP4 (`cp -c`) with a still of it at ~8 s of the same name (`outro-a.mp4` +
  `outro-a.jpg`), so each plays in the zoom view
  (`mm image-index <folder> --workflow=pack-youtube`). Send the review link
  (`https://mediamake.microfox.app/file-revision?job=<set>`) and read the pick with `revise-image`.
- **Attach it without re-rendering the video.** Never render the whole video again just to add the
  outro. Encode only the outro to match the video, the encoder settings as well as the format, then
  join the two with ffmpeg's concat demuxer as a stream copy:

```bash
head -c 3000000 video.mp4 | strings | grep -m1 'x264 - core'    # the video's x264 settings (ref=, subme=, crf=…)
```

```bash
ffmpeg -i outro.mp4 -vf "fps=30,scale=1920:1080,format=yuvj420p" -c:v libx264 -preset medium -crf 16 -profile:v high -x264-params chromaloc=1 -color_range pc -colorspace bt470bg -video_track_timescale 90000 -c:a aac -ar 48000 -ac 2 outro-matched.mp4
```

```bash
printf "file '%s'\nfile '%s'\n" "$PWD/video.mp4" "$PWD/outro-matched.mp4" > join.txt && ffmpeg -f concat -safe 0 -i join.txt -c copy final.mp4
```

  - **The encoder settings must be the video's.** An MP4 keeps one set of H.264 headers (SPS and PPS) for the
    whole track, the first file's. QuickTime and Finder decode the outro with them, so an outro made with other x264
    settings plays in ffmpeg and on YouTube but not in QuickTime ("Cannot Decode": the end screen never shows).
    A Remotion render is x264 `preset medium` with `chromaloc=1`, full-range `yuvj420p` and `bt470bg`; take the
    CRF and anything else from the line `strings` prints. Compare the two files' SPS and PPS bytes before the join
    (`-c copy -bsf:v h264_mp4toannexb -f h264`, NAL types 7 and 8): they must be identical.
  - **The time base:** Remotion renders use 1/90000 and ffmpeg's x264 defaults to 1/15360. With different time
    bases the stream copy squeezes the outro's frames into the video's last instant (the file's video stream then
    ends where the video did). `-video_track_timescale` sets it. After the join, check that the video stream's
    duration is the video's plus the outro's.
  - **A silent outro** ("without sound"): map `-f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000` as its
    audio with `-shortest`.
  - **Check it the way the user will watch it:** pull a frame of the outro through AVFoundation, QuickTime's
    decoder (`swift scripts/avf-frames.swift final.mp4 <prefix> 3 8`: seconds counted back from the end), as well as
    a still on either side of the join and the audio level. The result goes in the pack as the video.

When both are settled, assemble the folder (the video clone, the end-screen guide, UPLOAD.md;
earlier rounds moved into `history/`), update `pack.json` (`thumbnails` with the picked IDs and
files, `title`, `video`, `status: "ready"`) and tell the user where everything goes in YouTube Studio → Details: Title,
Description, Thumbnail (one file, or Test & Compare with the three; YouTube picks the winner by
watch time). The audio and lyrics in `input/` are for reference. Write `info.json` (step 5) in the
same pass.

Once the user approves the pack, deliver it to the channel's folder (the user copied packs there by
hand before): `mm media deliver <slug> --what=youtube,video` (a dry run),
then `--yes`. When the video in the pack is not `out/<slug>/<slug>.mp4` (an end screen joined after the render), deliver
`--what=youtube --from=out/youtube/<slug>` alone: with two kinds `--from` is ignored, and `video` would replace the
delivered final with the render that has no end screen (read every `replace` line of the dry run). It lands in `Downloads/<CHANNEL>/<slug>/youtube/` and the video beside it as clones,
and an older delivery moves to `previous/v<N>/`. Give the `open -R` line. When the user says it's
published: `media deliver <slug> --uploaded`.

## 5. info.json and the upload (Browse Hack)

Every finished pack carries `info.json`: YouTube Studio's upload form as data. Browse Hack's
`youtube_fill_uploads` (its MCP) reads it, switches the Chrome profile's YouTube to the channel,
picks the video and fills every step of the form: Details, then on a channel in the Partner
Programme Monetisation and Ad suitability, then the end screen and cards under Video elements. It
stops on the Visibility step with the schedule set, for the user to click Save, Publish or Schedule.
Every field and its default:
https://github.com/microfox-ai/extensions/blob/main/mcp/README.md#infojson-for-youtube-uploads.

**The channel's handle.** info.json names the channel by its `@handle`, kept in the brand kit at
`brands/<brand>/youtube/channel.json`:

```json
{ "handle": "@anime-music-zone", "chromeProfile": "<the Google account email>",
  "upload": { "playlists": ["OST Tracks"], "alteredContent": true, "category": "Music", "language": "en",
    "monetization": true, "adSuitability": "none",
    "cards": [{ "channel": "@get-into-zone", "message": "Music on Get into Zone", "teaser": "Music on Get into Zone" }] } }
```

When the brand has no `channel.json`, call `youtube_list_channels` (Browse Hack asks which Chrome
profile first; name profiles by email), ask the user which channel is the brand's, and save
`channel.json` so the next pack doesn't ask. `upload` holds the answers below that stay the same for
the channel; `chromeProfile` is the profile to suggest first when Browse Hack asks.

**Ask once the pack is assembled**, in one `AskUserQuestion` (recommended option first; skip what
`channel.json`'s `upload` already answers and say what you took from it):

1. **When it goes out:** private draft (recommended until the user says otherwise) · unlisted ·
   public now · scheduled (date and time in Studio's time zone; the schedule in
   `channel-description.md` suggests the day).
2. **Playlists:** the channel's usual ones, others they name, or none.
3. **AI use** (Studio's "altered or synthetic content", which covers AI-made music that's the focus
   of the video): yes for Suno or other AI songs, no for the user's own recordings. Ask the first
   time for each channel and save the answer in `channel.json`; never decide it yourself.
4. **Made for Kids:** no, unless the user says the channel is for kids.
5. **Monetisation and ad suitability**, for a channel in the Partner Programme (Studio adds a
   Monetisation step after Details, and Ad suitability once it's on): monetisation On (recommended)
   or Off; Ad suitability None of the above (recommended when the video has none of Studio's
   listed content: violence, adult themes, shocking or drug content…) or "I'll answer it in
   Studio" (`skip`). Ask the first time for each channel and save both in `channel.json`.
6. **End screen:** import it from the channel's latest video that has its end screen (usually the
   previous pack's title), and for a series playlist, point its playlist element at this video's
   (the anime's playlist on Anime Music Zone). Recommend that pairing; the user can name another
   video or leave the end screen to do by hand.
7. **Cards:** the channel's standing cards (Anime Music Zone: a channel card to Get into Zone,
   "Music on Get into Zone"). Ask the first time for each channel and save them in `channel.json`.

Then write `<pack>/info.json`:

```json
{
  "channel": "@anime-music-zone",
  "video": "Goten Theme.mp4",
  "titleFile": "title.txt",
  "descriptionFile": "description.txt",
  "thumbnail": "thumbnails/goten-theme-A.jpg",
  "playlists": ["OST Tracks"],
  "madeForKids": false,
  "alteredContent": true,
  "category": "Music",
  "language": "en",
  "tags": ["goten theme", "dragon ball", "gregorian chant", "anime ost"],
  "visibility": "scheduled",
  "scheduleAt": "2026-11-09T18:30",
  "monetization": true,
  "adSuitability": "none",
  "endScreen": { "importFrom": "Full Metal Heart - Edward Elric 「 AMZ 」( Lyric Video )", "playlist": "OST Tracks" },
  "cards": [{ "channel": "@get-into-zone", "message": "Music on Get into Zone", "teaser": "Music on Get into Zone" }]
}
```

- Every path is relative to the pack, so the delivered copy (`Downloads/<CHANNEL>/<slug>/youtube/`,
  which holds the video clone too) uploads the same way.
- `titleFile` and `descriptionFile` point at the pack's own files, so a later edit to them is what
  goes up.
- **Three thumbnails (A/B test):** write `abTest` from `titles.txt`, one variant per line in its
  order, each the thumbnail and the title paired with it; Browse Hack sets Studio's A/B testing to
  Title and thumbnail and clicks Set test. Name the first variant's thumbnail in `thumbnail` too.
  Thumbnails only (no titles.txt): variants with just `thumbnail`. 2 or 3 variants, every one with
  the same kinds.

```json
"abTest": [
  { "thumbnail": "thumbnails/wakeup-waveform-D1.jpg", "title": "WAKE UP - by Get into Zone ( Official Lyric Video )" },
  { "thumbnail": "thumbnails/wakeup-waveform-E1.jpg", "title": "WAKE UP - by Get into Zone | Stop Running From the Mirror ( Official Lyric Video )" },
  { "thumbnail": "thumbnails/wakeup-waveform-G2.jpg", "title": "WAKE UP - by Get into Zone | We All Live Inside a Dream ( Official Lyric Video )" }
]
```
- `tags`: the hashtags' words without `#`, plus the song, artist and film or anime names, 500
  characters at most in all. `language`: the lyrics' language code (`te` for a Telugu song, `ja`
  for Japanese).
- `monetization` and `adSuitability` only matter on a channel in the Partner Programme; Browse Hack
  turns monetisation On and answers None of the above when they're left out there, and warns.
- `endScreen.importFrom` is the exact title of a video already on the channel (Studio lists the
  latest; Browse Hack searches for older ones), and its `playlist` must exist on the channel. Leave
  `endScreen` out when the video doesn't end on the channel's end screen.
- `cards`: channel cards only, each `message` and `teaser` 30 characters at most (the teaser
  defaults to the message).
- Leave out what the user didn't choose: YouTube's defaults stay. No video yet (a pack made before
  the render): leave `video` out and add it when the video lands in the pack.

Check that it parses and that every file it names is in the pack
(`python3 -c 'import json,sys; json.load(open(sys.argv[1]))' <pack>/info.json`), list it in
`pack.json`, and add one line to UPLOAD.md: "Upload with Browse Hack: youtube_fill_uploads on this
folder".

**Upload only when the user asks** ("upload it", "fill the YouTube upload"). Call
`youtube_fill_uploads` with the pack folder (or the delivered `youtube/` folder). Picking the video
starts the upload, so a private draft exists on the channel from then on. Report what it `filled`
and every line of `warnings` (a thumbnail Studio refused and why, a playlist that doesn't exist, an
end screen video or card channel it couldn't find, a step Studio wouldn't leave, a schedule it
couldn't set), then tell the user to review the tab and click Save, Publish or Schedule themselves;
never press it for them. Monetisation, Ad suitability, the end screen and cards need Browse Hack
0.13.0 (MCP 0.11.0): an older one stops on Details with "Your video needs a monetisation setting",
so offer `update_browse_hack`. `abTest`, thumbnails that go up and a submitted Ad suitability need
0.14.0 (MCP 0.12.0). After they publish: `media deliver <slug> --uploaded`.

## 6. Shorts pack (more than one short)

When the production has more than one short (the shorts skills make three a run:
`out/<slug>/shorts/<id>/<slug>-<id>-9x16.mp4`), pack them together for Browse Hack's **Bulk Upload
Shorts** (the popup's YouTube Studio tab, Browse Hack 0.15.0), which uploads them one after another and
puts each on the next day that has no short on the channel:

```
out/youtube/<slug>-shorts/
  shorts-pack.json   the channel, the schedule, the fields every short shares, one entry per short
  shorts/            the 9:16 renders, APFS clones (`cp -c`), named <slug>-<id>.mp4
  description.txt    the shorts' shared description (write-youtube-metadata, short form, with #shorts)
  UPLOAD.md          each short with its title, and how the days are picked
```

```json
{
  "channel": "@atomic-rap",
  "schedule": { "time": "18:30" },
  "defaults": {
    "descriptionFile": "description.txt",
    "tags": ["deadpool", "aura edit", "get into zone"],
    "madeForKids": false,
    "alteredContent": false,
    "category": "Entertainment",
    "language": "en",
    "monetization": true,
    "adSuitability": "none"
  },
  "shorts": [
    { "video": "shorts/deadpool-s01.mp4", "title": "Deadpool Aura Edit #deadpool" },
    { "video": "shorts/deadpool-s02.mp4", "title": "Deadpool Aura Edit #deadpool" },
    { "video": "shorts/deadpool-s03.mp4", "title": "Deadpool Aura Edit #deadpool" }
  ]
}
```

- `defaults` takes any info.json field (step 5): the channel's standing answers from `channel.json`'s
  `upload`, the shared description and tags. A short's own fields win over them.
- **Titles:** the channel's shorts title style. Atomic Rap repeats one title per film ("Deadpool Aura Edit
  #deadpool"); otherwise one title a short from `write-youtube-metadata`, with `#shorts` or the film's tag.
- **Days:** ask the time once per channel (save it in `channel.json` as `shortsTime`) and leave
  `scheduleAt` out, so each short gets the next empty day; `schedule.from` (YYYY-MM-DD) starts later than
  tomorrow. A short that must go out on a set day carries its own `scheduleAt`.
- Check it parses and every video it names is in `shorts/`. The user can upload it from the popup's
  YouTube Studio tab → Bulk Upload Shorts (with "Click Schedule for me" on, it schedules each; off, each
  waits in its own tab).
- **Upload only when the user asks** ("upload the shorts"): call Browse Hack's `youtube_bulk_upload_shorts`
  with the pack folder (MCP 0.13.0 and Browse Hack 0.16.0; call `use_profile` first). It does what the
  popup does: it checks every short, reads the channel's Shorts tab for the empty days, and uploads each
  short in its own Studio tab, stopping on Visibility with its day and time filled in. Pass
  `clickSchedule: true` only when the user asked for them to be scheduled. Report each short's day,
  `filled` and every warning, and tell the user to click Schedule in each tab when it didn't. Running it
  again uploads the shorts again.

Shorts the user drags into Studio themselves stay drafts: the same tab's **Autofill Shorts** fills each
draft from the channel's most similar filled-in short (its title too) and schedules it on the next empty
day. A shorts pack isn't needed for that.

## Feedback log

This log is shared: everyone who pulls gets it, and it changes only in a pull request, never in a
session. New lessons go in your notes, outside the repo. Read them with this log before planning:

```bash
mm notes add pack-youtube "<song / channel> · <what they said> → <the rule>"   # a new lesson, dated for you
mm notes pack-youtube                                                          # your notes for this skill
```

When the user wants them shared, `mm notes promote pack-youtube` offers them to this log as a pull request.

- 2026-10-24 · skill · Asked for the skill: inputs are the song title, lyrics.json and the audio file; it runs the thumbnail skill, then a new write-youtube-metadata skill for the title and description → this skill and write-youtube-metadata.
- 2026-10-25 · Just Hit It (hitixf1, ATOMIC RAP) · The pack is for a song edit (video), so the user also asked for the channel's end screen on the video before uploading → when the pack is for a finished video, check it ends with the channel's end screen (YouTube's end-screen cards need the last 5–20 s) and offer to add one.
- 2026-10-25 · Just Hit It (hitixf1, ATOMIC RAP) · "for youtube title and thumbnail always preview and ask for user suggestions. ask if the lyrics have to be kept in description or if not needed." → intake question 5 (lyrics in or out, always asked) and the preview-and-ask rule in step 4; `ytmeta.py check --no-lyrics` checks a description without lyrics.
- 2026-10-25 · F1 × Hit It (hitixf1, ATOMIC RAP) · "when done, you should pack it all in a single folder, or you not doing that ?" (the video and the end-screen guide were left outside the pack) → the finished pack holds the video (APFS clone), the end-screen card guide and UPLOAD.md beside the title, description and final thumbnails; earlier rounds go to history/.
- 2026-10-25 · F1 × Hit It (hitixf1) · "can you not point a link that directly opens the finder window" → when the pack is done, reveal it in Finder with the app's reveal_path tool.
- 2026-10-25 · Breaking Bad × Dangerous (ATOMIC RAP) · "dont open the finder window by yourself, show a link which can help me open finder window on clicking" → replaces the reveal_path rule above: end with an `open -R` bash block the user runs, never open Finder unasked.
- 2026-10-27 · Nakama! (Anime Music Zone) · `open -R "…Nakama!.mp4"` failed in zsh (`event not found`: `!` is history expansion even in double quotes) → name the pack's video without shell-special characters (`!`, quotes, `$`), keep them only in title.txt, and single-quote paths in `open -R` blocks.
- 2026-10-27 · Get into Zone (brand kit with eight outros) · "when a brandkit has multiple outros, it is best if claude shows the outros using a revisor to pick from for user choice … when creating the final video attaching outro, no need to render the whole video again, just attaching it at end via ffmpeg or something is fine" → the end-screen step: several outros are picked in the Image Revisions screen (one still each, MP4 path in the note), and the picked outro is joined to the video with ffmpeg (outro matched, concat stream copy), never a full re-render.
- 2026-10-27 · Nakama! (Anime Music Zone) · "if doing 3 thumbnail variations, then give three YouTube titles as well" → a three-thumbnail pack carries three titles (titles.txt), paired in UPLOAD.md.
- 2026-10-27 · skill · "when creating brands or creating youtube pack, run parallel threads for faster execution" → the Parallel threads section: thumbnails in their own session, the description here at the same time, the title after the thumbnail's words, the outro review and ffmpeg join and the video check in subagents; this session owns and assembles the pack.
- 2026-11-02 · skill · "create a tool in the extension that will enable to switch accounts ( channels ) auto fill the entire vidoe upload deatils from an info.json, and also update the pack-yotube-kit sill in medimake repo to create this info.json" → step 5: every pack carries info.json for Browse Hack's youtube_fill_uploads (it switches the channel, fills Studio's form and stops before Save); the channel's handle and standing upload answers live in brands/<brand>/youtube/channel.json.
- 2026-11-02 · kingpinxdeadpool (ATOMIC RAP) · "add endscreen without sound though" + "also need high quality render" → the
  master rendered at CRF 10 (x264 slow), the end-marquee outro matched silent; the first join kept 7,703 frames but
  ended the video stream at the edit's own length, because the outro's time base (1/15360) differed from Remotion's
  (1/90000) → the end-screen step now sets `-video_track_timescale` and checks the joined duration.
- 2026-11-02 · Deadpool x Kingpin (ATOMIC RAP) · `youtube_list_channels` and `youtube_fill_uploads` failed with "Couldn't find Switch account in YouTube Studio's account menu": the extension worked in a background Studio tab, where Chrome doesn't draw the account menu (the profile has 32 channels). The user: "it has to switch as there is no guarantee always" → never skip the switch; the extension now brings the Studio tab forward before reading or using the menu (extensions repo, branch fix/youtube-switch-in-front). The handle and the standing answers live in the brand's `channel.json` (ATOMIC RAP: @atomic-rap, profile subhakartikkireddy@gmail.com, not AI-made). The filler couldn't set the schedule's date and time or the thumbnail on that run: tell the user to set them in the tab. Three thumbnails picked → `titles.txt` and a title-per-thumbnail table in UPLOAD.md; info.json names the first (C1) and UPLOAD.md says to add the other two under A/B testing.
- 2026-11-02 · Deadpool x Kingpin (ATOMIC RAP) · "Yes, deliver" → the dry run of `--what=youtube,video` would have replaced the
  delivered final (with its silent end screen) by out/kingpinxdeadpool/kingpinxdeadpool.mp4, the master without it, because
  `--from` only applies to a single kind → deliver `--what=youtube --from=<pack>` when the pack's video is a joined final,
  and read every `replace` line of a dry run before `--yes`.
- 2026-11-04 · The Honoured One (Anime Music Zone) · "there is an issue with youtube upload setup (some missing info and some missing clicks)": `youtube_fill_uploads` stopped on Details ("Your video needs a monetisation setting") and the thumbnail failed, so the user finished the upload by hand while Browse Hack recorded it: Monetisation On, Ad suitability None of the above + Submit rating, end screen imported from Full Metal Heart with its playlist element pointed at the Jujutsu Kaisen playlist, a channel card to Get into Zone ("Music on Get into Zone"), then the schedule → info.json carries `monetization`, `adSuitability`, `endScreen` and `cards` (step 5, questions 5–7), and Browse Hack 0.13.0 fills them (extensions PR #29).
- 2026-11-04 · WAKE UP (Get into Zone) · "it stuck at monetisation again, and its not upload A/b thumbnail pack": Browse Hack 0.13.0 set monetisation and ticked None of the above, but pressed Submit rating before Studio had rated the answers, so Studio stayed on Ad suitability; the thumbnail it handed over from its isolated world previewed and then failed to upload; and info.json named only D1 of the three → info.json carries `abTest` from `titles.txt` (thumbnail + title per variant), and Browse Hack 0.14.0 sets the A/B test, uploads thumbnails from Studio's own page and checks the rating went in.
- 2026-11-04 · skill · "in extension popup add youtube studio tab … Autofill Shorts … Bulk Upload Shorts - autofill details from … a shorts-pack.json … generated as part of youtube-pack for multivariant shorts" → step 6: a production with more than one short gets `out/youtube/<slug>-shorts/` with shorts-pack.json (shared defaults, one entry per short, each on the next empty day) for the popup's Bulk Upload Shorts (Browse Hack 0.15.0); drafts uploaded by hand go through Autofill Shorts, which copies the most similar short's title and details.
- 2026-11-04 · Quicksilver x Kingpin shorts (ATOMIC RAP) · "is this action not triggerable via tool in mcp bridge ? if not, add the tool." (Bulk Upload Shorts only ran from the popup) → Browse Hack's MCP got `youtube_bulk_upload_shorts` (extensions PR #32): step 6 calls it with the pack folder when the user asks to upload the shorts.
- 2026-11-04 · Full Metal Heart (Anime Music Zone) · `youtube_fill_uploads` forgot the session's profile after `use_profile` + `youtube_list_channels` (asked again for the profile): call `use_profile` again right before it. On @anime-music-zone the filler couldn't set the thumbnail ("Upload file") and Studio stayed on Details because the channel is monetised ("Your video needs a monetisation setting"): tell the user to set the thumbnail (and A/B ones), the monetisation setting and the visibility in the tab.
- 2026-11-04 · The Honoured One (Anime Music Zone) · "there is no amz end screen in the final video": the AMZ end screen was encoded with `-preset slow` (ref=5, no chroma location) while the Remotion master is `preset medium` with `chromaloc=1`; the MP4 kept the master's SPS, so QuickTime couldn't decode the outro ("Cannot Decode"), although ffmpeg, the frame count and the durations all passed → the end-screen step encodes the outro with the video's own x264 settings, compares the SPS and PPS bytes before the join, and checks a frame of the outro through AVFoundation (`scripts/avf-frames.swift`).
- 2026-11-04 · The Honoured One (Anime Music Zone) · `youtube_fill_uploads` filled the video, title, description, both playlists, AI use, tags, language and category, but warned "Thumbnail …: Upload file" (not set) and "Stayed on Details: Studio wouldn't go on to Visibility (Your video needs a monetisation setting)" → AMZ is monetised: Studio's Monetisation step needs the user's on/off before Visibility, which the filler doesn't set, so the schedule is left to the user too; report both and tell the user to upload the thumbnail, pick monetisation and set the schedule in the tab.
- 2026-11-04 · Full Metal Heart v2 (Anime Music Zone) · Browse Hack 0.14.0's filler now sets Studio's monetisation step on a monetised channel: info.json `monetization` (true/false) and `adSuitability` ("none" = None of the above, "skip" to leave it) — without them it turns monetisation on and answers none, and reaches Visibility (private) and returns `videoUrl`. The thumbnail still fails on @anime-music-zone ("Upload file" by hand). Re-uploading a changed video = a new video (the published one stays): the user unlists or deletes the old one.
- 2026-11-04 · दीप जले, माँ लक्ष्मी आएँ (Omkara Swar) · The board was answered mid-turn by ID ("g but shift title to a bit down"), then G3 picked, lyrics kept, public now, AI-made → Omkara Swar's `channel.json` written (@omkara-swar, profile subhakartikkireddy@gmail.com, alteredContent true, language hi). `youtube_fill_uploads` filled everything and reached Visibility (public) but Studio refused the thumbnail with no reason (the channel has no subscribers; probably not phone-verified): tell the user to add it under Thumbnail → Upload file before Publish.
