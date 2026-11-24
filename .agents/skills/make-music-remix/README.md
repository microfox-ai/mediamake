---
description: Give Claude a finished song and say what to change. It layers parts from another version, rebalances the stems, makes a genre remix or cuts it to a length, and the song stays itself. You get two or three strengths, level-matched, and pick one by ear. The main skill of MediaMake's music family.
tags: music, remix, stems, suno, soundcraft, layering, phonk, genre remix, shorten song, loop, audio, stem player
headshot: headshot.jpg
nature: shared-use
type: superset
---

# Make music remix

A new version of a song you already like, without losing what you liked. Claude maps the song bar by bar,
adds or changes one thing on top of its own mix, and builds two or three strengths of that change for you
to hear side by side. It is also the front door to MediaMake's music skills: ask for "louder" and it hands
the song to the remaster.

## How to use

1. Copy the install prompt and paste it into Claude. Install the Soundcraft MCP with it.
2. Give Claude the song's folder (a Suno download with its stems is best) and say what you want:
   **layer the keyboard and percussion from the other version into the final**, **bring the vocals
   up in the hooks**, **make a phonk remix of this**, **cut it to 60 seconds for a Short, keep the hook**,
   **loop the intro for the video**.
3. Answer its few questions: what must not change, what it is for, a reference track if you have one.
4. Open the Stem Player link it gives you. The original and versions A, B and C play from one playhead
   at the same loudness. Pick one, or leave notes ("C, but without the percussion") for the next round.
5. For a release, say **make it louder**: the pick goes to the remaster.

## The family

| You want | Done by |
| --- | --- |
| The same mix, louder for YouTube and streaming | [[make-music-remaster-loudness]] |
| Parts layered in from another version, or the stems rebalanced | this skill |
| A genre remix: new drums, samples and vocal chops around the song's vocal | this skill |
| A shorter version, a cut for a Short, a loop for a video | this skill |

More skills join the family as they are made. Each one takes over one of these jobs.

## What it uses

- [[use-soundcraft]]: how Claude works SoundCraft, and the rules that keep its bounces exact.
- [[mcp/soundcraft]] (required): builds, checks and bounces every version, with nothing open, even in a
  cloud session. REAPER can stand in when you name it and have it open.
- [[app/remaster-revision|Stem Player]]: where you listen, compare at matched levels and pick.
- [[make-music-remaster-loudness]]: makes the picked remix loud for a release.
- ElevenLabs Scribe (`mm transcribe`), only when the song has no timed words yet: it shows where the
  words are, so nothing is cut or added over a sung line. It shows the price first.

## What the skill outputs

A round of versions in your workspace's `out/<song>-<what>/v1/`: the original and two or three versions
as 24-bit WAV, all at the original's loudness with true peaks under −1 dBTP, each named for what it
changes (an edit gives two or three cuts instead, at the source's own level), for example:

```
My Song - 0 original.wav
My Song - A keys +6 perc +2.wav
My Song - B keys +9 perc +4.wav
My Song - C keys +12 no perc.wav
```

Each round comes with the SoundCraft session and the step list that built it, a bar-by-bar map of the
song, and a Stem Player link. Your pick is kept as `<title> - final remix.wav`, and goes to your channel's
folder only once you approve it.
