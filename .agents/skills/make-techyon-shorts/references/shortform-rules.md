> Research from 8 Nov 2026, before direction v2. Where this file and `direction.md` differ (true peak −2 dBTP, no
> words below y 1496, the small TECHYON tag in the last second), **`direction.md` wins**.

## 1. Rules to implement (checklist)


All positions are for 1080×1920 at 30 fps. "Voice" means the narration's own loudness.

**Hook (0–3 s)**
- Frame 0 is fully drawn: no fade from black, no logo, no intro sting. The hook visual and its on-screen headline are already up. [data: TikTok, Galloway, Hoyos]
- Give the main claim or number in the first spoken sentence, finished by about 2.0 s. TikTok's research found that 50% of an ad's impact lands in the first 2 s, and that 63% of its top-CTR videos state the key message within 3 s. [data]
- The first spoken word is the subject ("OpenSSH…", "Sam Altman…", "This AI…"), never "So" or "Hey guys". [house]
- On-screen hook headline: 2–5 words, cap height ≥ 140 px, inside y 640–1280 so it also works as the cover. [house + crop maths]
- Hook types to rotate, all tested on news by big channels: a consequence to the viewer, a shock number, a big-name quote with the person's picture, a twist ("the bug isn't in OpenSSH"), and a question with a promised answer. [data: channel sample]

**Layout (organic)**
- Words never go above y 236, below y 1480, left of x 70 or right of x 910. Graphics may run under the UI. [data: platform templates + kit measurement]
- The text column is x 80–900, so its centre is x 490, not 540. TikTok's button rail covers about x ≥ 900 from y ≈ 840 down. [platform]
- The hero graphic sits in y 300–1150 (centre ≈ 720). Viewers' gaze stays on the centre and on 1–2 dominant areas. [data: RealEye 2025, Škripcová 2026]
- Caption block: centre y 1300–1340, block within y 1200–1450, on its own band below the hero, never over the hero's key detail. [data: BBC R&D subtitle-position work + kit measurement]
- If a Short is ever run as an ad, use the ad templates instead: nothing important below y 1248 or right of x 888. On TikTok, also nothing right of x 780 below y 840. [platform]

**Picture pace and density**
- Change something visible every 1.5–2.5 s, about 25–40 changes a minute. The measured big explainers sit at 1.5–2.6 s; the slowest channel sits at 7–53 s and gets the fewest views. [data]
- Make a full new composition (a cut or scene) every 2.5–5 s, and never hold a static frame longer than 3 s. [data]
- Show one focal element plus captions, with at most 2 supporting labels. Other on-screen words: 7 or fewer per beat. Doc screenshots get cropped and zoomed to the one highlighted line, with text ≥ 48 px. Engagement rises with shot count and visual complexity only up to a point (an inverted U). [data: Xiao et al. 2024]
- Keep the background moving *continuously*: a slow drift of 10–30 px/s, a 100→104 % scale over a beat, a gradient or grain shimmer. Keep it low-contrast and never start or stop it. Ongoing motion doesn't pull the eye; a motion *onset* does. Save onsets for the focal element. [data: Abrams & Christ 2003]
- Zoom punches: +6–12 % scale over 3–5 frames, ease-out, on a stressed word or number. At most 1 every 4 s. [house]

**Captions**
- 1–3 words a screen (≤ 15 characters). At 160 wpm that's 0.4–1.2 s a screen, inside the BBC/Ofcom 160–180 wpm comfort range. [data]
- Font 90–120 px (minimum 76), weight 800–900. The spoken word is lit in the accent colour, and the words to come sit at 40–60 % opacity. Add a shadow or stroke, or a 25–40 % dark scrim band behind y 1150–1500, so the contrast is ≥ 4.5:1. [house]
- A number or name gets its own screen. Never leave a caption up through a pause longer than 0.6 s. [house]

**Sound** (master −14 LUFS integrated, true peak ≤ −1.5 dBTP; the kit's −2 dBTP is fine)
- Music under speech sits 15–20 dB below the voice (default 18). Even when the music is lifted, it stays ≥ 12 dB under any spoken word. The accessibility ideal (WCAG AAA) is 20 dB. [data]
- "Loud start and end, ducked middle": lift the music only where nobody is speaking. Lift it +4–6 dB in voice gaps ≥ 0.4 s, with a 100–200 ms attack and a 300–500 ms release. The voice starts on frame 0, so there is no music-only intro. In a loop, the bed level in the last 0.5 s must equal the first 0.5 s within ±1 dB. [house + loop logic]
- Transition SFX only at section changes and reveals: 4–8 per 45 s Short, never one per cut. Peaks sit 6–10 dB under the voice's peaks. Each lasts 200–600 ms, peaking on the cut frame (a riser *ends* on it). [data on restraint; levels house]
- SFX timbre: soft swish or air whoosh by default. Glitch sounds only for hack or breach beats. High-pass at 150–200 Hz, because phones barely reproduce below about 250 Hz. Keep the harsh 2.5–5 kHz region down: brighter sound correlated with fewer likes and comments. [data]
- Never put an SFX peak on a stressed word. [house]

**Loop and ending**
- The last line is the first half of a sentence that the first line completes. The last frame equals frame 0, or a move that lands on frame 0. Music, room tone and the progress bar all cross the seam continuously. No end card, no outro logo. A loop raises views and APV but not engaged views. [data + platform]
- End within 2 s of the payoff. No spoken "follow". At most a silent "Follow" chip of ≤ 1.2 s at a mid-video pause, never in the last 2 s. [house]

**Length**
- Aim for 30–45 s for a single news item, and never more than 55 s. Never go over 60 s with any third-party music: YouTube blocks Shorts over 1 minute with a Content ID claim worldwide. [platform + data, mixed]

**Covers**
- YouTube: until the channel is in the YouTube Partner Program (YPP), there is no custom upload, so design a cover frame and pick it in the mobile app. Later, upload a 1080×1920 cover on desktop. Instagram: upload a custom cover. TikTok: pick that frame (custom upload is unreliable). [platform]
- Cover layout: 2–4 words, cap height ≥ 150 px, inside x 90–990 and y 640–1280. That survives the 3:4 grid crop (y 240–1680) and the reported ~3:2 YouTube render (y 600–1320). One subject, high contrast, the same template every time. [platform + crop maths]

**Measure** (against our own baseline, not a universal number)
- YouTube "viewed vs swiped away" (now "stayed to watch") ≥ 70 %. Below 60 % means fix the hook. Instagram skip rate trending down. APV ≥ 70 %. [data: Galloway 2023, vidIQ 2026]

---

