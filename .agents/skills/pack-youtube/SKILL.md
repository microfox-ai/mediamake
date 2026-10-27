---
name: pack-youtube
description: Make a song's YouTube upload pack from its title, its lyrics.json and its audio file, in parallel threads — thumbnails (through create-thumbnail) beside the description, then the title (through write-youtube-metadata: a 2-line intro, the plain lyrics, a 1-line channel outro, at most 5 hashtags) — collected in one folder, apps/lyrics_videos/out/youtube/<slug>/, ready to paste into YouTube Studio. Use when the user says "make a YouTube pack", "YouTube upload pack for <song>", "/pack-youtube", "thumbnail + title + description for this song", or gives a song title, lyrics.json and audio and wants it ready for YouTube. Append new user feedback to the log at the bottom.
---

# pack-youtube

One folder with everything a song's YouTube upload needs, made by running two skills in order:
**`create-thumbnail`** first, then **`write-youtube-metadata`** (the title is written to work
with the thumbnail's words, so the thumbnail comes first). This skill only gathers the inputs,
hands them over, and assembles the pack; the work is done by those skills, following their steps.

**Pack folder:** `apps/lyrics_videos/out/youtube/<slug>/` (gitignored), `<slug>` from the song
title (`you-can-have-the-kingdom`). The thumbnail job uses the same slug.

```
out/youtube/<slug>/
  <Title>.mp4   the video to upload, when there is one (an APFS clone, `cp -c`, of the final render)
  end-screen-card-guide.jpg   the channel end screen's card slots, when the video ends on one
  UPLOAD.md     what goes where in YouTube Studio, one table
  title.txt  description.txt  lyrics.txt  metadata.json   (from write-youtube-metadata)
  thumbnails/   the picked finals only (1, or 3 for YouTube's A/B test)
  input/        lyrics.json, the audio file (copies; the originals stay where they are)
  history/      earlier thumbnail rounds and earlier titles / descriptions (kept, never deleted)
  pack.json     what is in the pack and where it came from
```

**The finished pack is one folder with everything the upload needs:** the video, the title, the
description, the thumbnails, the end-screen guide and UPLOAD.md. Nothing the user uploads lives
anywhere else. When it is done, give the user a one-click way to open it: a `bash` block with
`open -R "<absolute path to the video>"` (the app adds a Run button; Finder opens with it
selected). Never open Finder yourself.

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

1. **The channel:** one of the brands under `apps/lyrics_videos/brands/` (or another channel).
2. **The picture** for the thumbnail: their image, frames from the lyric video if one exists
   (`apps/lyrics_videos/out/` or the project's render), a concept to generate, or type only.
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
(`apps/lyrics_videos/projects/<slug>/input/project.json`). It writes `lyrics.txt`, `title.txt`,
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
  `npm run thumbs -w lyrics_videos -- pick <slug> <IDs>`, copy `out/thumbnails/<slug>/final/*.jpg`
  into the pack's `thumbnails/` (replace what was there; re-copy after every re-pick).
- **Three thumbnails picked → three titles:** have `write-youtube-metadata` write one title per
  thumbnail (`titles.txt`), show them with the thumbnails, and list the pairs in UPLOAD.md.
- **Title / description changes:** edit the pack's files and run its `check` again.
- If the picked thumbnail's words changed a lot from what the title was written against, re-read
  the title: it should still add something the thumbnail doesn't say.

**End screen (outro) on a finished video.** When the pack is for a finished video, check that it
ends on the channel's end screen (YouTube's end-screen cards need its last 5–20 s), and offer to add
one if it doesn't.
- **Several outros in the brand kit** (`apps/lyrics_videos/brands/<brand>/outros/*.mp4`): don't list
  them in chat. Let the user pick in a review screen. Make the outros a reviewable image set: one
  still of each outro at ~8 s, with its MP4 path in the item's note
  (`npm run image-index -w lyrics_videos -- <folder> --workflow=pack-youtube`). Send the review link
  (`https://mediamake.microfox.app/image-revision?job=<set>`) plus the MP4s to watch, and read the
  pick with `revise-image`.
- **Attach it without re-rendering the video.** Never render the whole video again just to add the
  outro. Match only the outro to the video (size, fps, pixel format, audio rate and channels), then
  join the two with ffmpeg's concat demuxer as a stream copy:

```bash
ffmpeg -i outro.mp4 -vf "scale=1920:1080,fps=30,format=yuv420p" -c:v libx264 -crf 18 -preset slow -c:a aac -ar 48000 -ac 2 outro-matched.mp4
```

```bash
printf "file '%s'\nfile '%s'\n" "$PWD/video.mp4" "$PWD/outro-matched.mp4" > join.txt && ffmpeg -f concat -safe 0 -i join.txt -c copy final.mp4
```

  Take the size, fps and audio settings from `ffprobe` of the video. If the stream copy refuses
  because the codec settings differ, re-encode only the outro again with the video's profile, and
  still never the video. Check the join point plays cleanly (a still on either side, and the audio
  level). The result goes in the pack as the video.

When both are settled, assemble the folder (the video clone, the end-screen guide, UPLOAD.md;
earlier rounds moved into `history/`), update `pack.json` (`thumbnails` with the picked IDs and
files, `title`, `video`, `status: "ready"`) and tell the user where everything goes in YouTube Studio → Details: Title,
Description, Thumbnail (one file, or Test & Compare with the three; YouTube picks the winner by
watch time). The audio and lyrics in `input/` are for reference; this skill uploads nothing.

## Feedback log

Add entries at the bottom: date · song / channel · what they said → the rule.

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
