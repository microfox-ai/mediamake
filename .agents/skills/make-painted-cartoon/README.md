---
description: Tell Claude a tiny story and get a hand-painted cartoon of it: Clawd, or any character, painted stroke by stroke with boiling ink lines, watercolour skies and paper grain, acting through 31 emotions. Storyboarded first, checked frame by frame, rendered in MediaMake's studio.
tags: animation, cartoon, 2d animation, hand-painted, watercolour, p5.js, p5.brush, clawd, claude code, character animation, short video
headshot: headshot.jpg
nature: shared-use
---

# Make painted cartoon

A short cartoon that looks painted by hand, from a sentence. Say what happens ("Clawd tries to catch a
butterfly") and Claude storyboards it, paints it shot by shot, looks at its own frames to fix the
timing and the acting, and shows you a preview. The look and the craft come from John Heibel's
[Claude Animation Base](https://github.com/JohnHeibel/ClaudeAnimationBase).

## How to use

1. Copy the install prompt and paste it into Claude.
2. Say what happens, as broadly or as exactly as you like: **make a 15-second cartoon of Clawd trying to
   catch a butterfly**, **build two new characters and make them fight commando style**, **animate Clawd
   baking a cake that keeps exploding, to this song**, **a painted cartoon of a little fox finding its way
   home, 20 seconds**.
3. Answer a few questions: how long, silent or to a song, who stars in it.
4. Read the storyboard it writes (every shot, and what you should understand when) and say what to change.
5. Watch the 10-second previews on the review screen and leave notes on any frame. The full video renders
   once you're happy.

## What it uses

- MediaMake's studio (`mm`): the kit runs inside it, so `mm painted` draws contact sheets, frame strips
  and close-up crops for Claude to check, and `mm render` makes the previews and the video.
- [[revise-video]]: the review screen where you watch each preview and leave notes, and where Claude
  checks every render for black or frozen frames before you see it.
- A song from your media library, when you want one: its beat drives every bounce, dance and hit.
- Chrome with a GPU paints fastest. Without one it still works, slowly.

## What the skill outputs

A project in your workspace, `projects/<name>/`: the storyboard, the shots as code you or Claude can keep
changing, and its renders in `out/<name>/`. You get 10-second previews to review, then the finished
video, 1920×1080 at 24 fps, silent or with your song.

Two cartoons made with it while it was being tested, both silent, at 1920×1080 (the clips here are
smaller copies).

**Clawd and the butterfly** (16 s). Clawd tries to catch a butterfly, every grab misses and knocks a
flower onto Clawd's head, and once Clawd gives up and sits down, the butterfly lands on that flower by
itself.

https://raw.githubusercontent.com/microfox-ai/mediamake/main/.agents/skills/make-painted-cartoon/shots/clawd-and-the-butterfly.mp4

![The pounce that misses](shots/clawd-pounce.jpg)
![The ending: the butterfly on the flower on Clawd's head](shots/clawd-and-the-butterfly.jpg)

**Capture the Flag** (22 s). Two caricature commandos, new characters built for this video with the
kit's own brushes, fight over a flag on a jungle hill: rolls, flying kicks, a smoke bomb, a sneak attack
and a brawl that ends in dizzy stars. Meanwhile a little bush with Clawd under it walks off with the
flag.

https://raw.githubusercontent.com/microfox-ai/mediamake/main/.agents/skills/make-painted-cartoon/shots/capture-the-flag.mp4

![The face-off](shots/capture-the-flag-face-off.jpg)
![The sneak attack](shots/capture-the-flag-sneak.jpg)
![The steal: Clawd's bush takes the flag](shots/capture-the-flag-the-steal.jpg)
