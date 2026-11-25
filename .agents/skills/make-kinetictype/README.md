---
description: Words that move with music. Give Claude a quote and a track and it makes a kinetic type Short, in the style that fits or in a new look built from a reference. The main skill of MediaMake's kinetic type family.
tags: kinetic typography, kinetic type, shorts, youtube shorts, motion graphics, typography, quotes, remotion, midjourney
nature: shared-use
type: superset
---

# Make kinetictype

Type that lands on the beat: each word arrives on a hit of the music, as a Short or as a section inside a
longer video. This is the front door to MediaMake's kinetic type skills. Say what you have and Claude
suggests the style that fits; name a style and it hands the work to that skill. When no style fits, it
researches a look first and builds that one.

## How to use

1. Copy the install prompt and paste it into Claude. Install Browse Hack with it: it does the research,
   the Midjourney pictures and the upload.
2. Give Claude the words and a track, and say what you want: **make a kinetic type short of this
   quote**, **which kinetic type styles are there?**, **make it move like this video** (with a link or
   a file).
3. Answer its one round of questions: the style or the reference, 9:16 or 16:9, the channel, and how
   much it may spend on pictures and sounds.
4. Pick the stretch of the track by ear from the three previews it cuts.
5. Open the review link, watch, and leave notes on the video. Claude fixes each one and shows you
   10-second previews of what changed.
6. Say when it is right. Claude renders the master, puts it in your channel's folder and fills the
   YouTube upload form. You press Publish.

## The family

| You want | Done by |
| --- | --- |
| One giant word per hit, a build into a drop, the picture's characters in front of the type | [[make-kinetictype-buildup-punch]] |
| That style with the look of Screaming to Win, from a picture, a quote or a song alone | [[make-kinetictype-like-screamingtowin]] |
| A look none of them covers, built from research or a reference video | this skill |

Claude looks up the styles on your computer every time, so a style you make or install is offered too.

A style decides how the words move and leaves the fonts, colours and art to each video. A "like" skill
is a style pinned to one example video: it also keeps that example's fonts, palette and sounds.

## What it uses

- [[revise-video]]: the review loop. You leave notes on the video, Claude fixes them.
- [[revise-image]]: where you pick the restyled pictures, when the look uses any.
- [[use-yt-dlp]]: downloads a reference video, so Claude studies its real frames.
- [[mcp/browse-hack]] (required): the inspiration research on Pinterest, the Midjourney restyles and the
  YouTube upload. Without it, you bring the references and the pictures, and upload by hand.
- [[mcp/elevenlabs]] (optional): sound effects the media library doesn't have. It shows the price first.
- [[mcp/fal]] (optional): a picture when Midjourney isn't available. It shows the price first.

## What the skill outputs

A finished video in your workspace's `out/<slug>/`: 1080 × 1920 for a Short (16:9 when you ask), with
its music and sound effects mixed in. Beside it, the project that made it: the whole edit as one data
file you can change (`video/edit.json`) and a `prefs.md` with every choice of the look and where it came
from. Once you approve it, the master goes to your channel's folder with a `youtube/` pack (title,
description, upload details).

Made with this family so far:

- **Screaming to Win**, a 24-second Blue Lock Short, published on 2026-11-08: the first one, and the
  example the buildup-punch style comes from.
- **Someone Took**, a Solo Leveling Short made with the Screaming to Win like skill.
- **The AFLT quote Shorts**, a batch of quote Shorts, each with a look from its own research.
