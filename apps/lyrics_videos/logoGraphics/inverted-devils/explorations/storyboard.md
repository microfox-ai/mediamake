# INVERTED Devils · channel intros

Five 7-second intros (1920×1080, 60 fps) for the channel logo: **INVERTED** in Bebas Neue (white,
red halo) over **Devils** in Calligraffitti (logo red, bolded with a stroke like the logo).
No image is used: both words are drawn from the fonts' real glyph outlines (`glyphs.json`, made by
`tools/glyphs.py`), and the script's pen path comes from its skeleton, so "Devils" can be written
stroke by stroke.

Tone: void black, crimson, bone white. Sultry but polished: slow settles, soft blooms, no shocks.
Every intro holds the finished logo from ~3.5 s to ~6 s and ends on black at 7 s.

| # | id | idea | 0–2 s | 2–3.7 s | hold | exit (6–7 s) |
|---|----|------|-------|---------|------|--------------|
| 1 | `inverted-devils-1-trace` | Trace: glowing lines (signature) | spark, construction lines sweep out, INVERTED traced letter by letter and burns in white | lines retract into the centre; a hot pen writes "Devils", the i's dot pops | smoke, slow push-in, glow breathes | lockup folds into a line that retracts to the centre |
| 2 | `inverted-devils-2-mirror` | Mirror: the name taken literally | a horizon line on a black mirror; only the rippling reflection of INVERTED is there | letters flip up over the line in 3D, a 4-frame negative flash on landing; the mirror melts and "Devils" rises out of the ripples | | letters fall back under the line, script sinks |
| 3 | `inverted-devils-3-velvet` | Velvet: slow, sultry | wine smoke breathes up; INVERTED comes into focus from the centre out, letters drawing together | a soft light drifts behind; feathered lipstick wipe reveals "Devils", then a gloss sheen slides across | dust motes, breathing glow | smoke closes in, lockup melts out of focus |
| 4 | `inverted-devils-4-voice` | Voice: waveform to letters | a vocal waveform draws across and beats twice like a heart | waveform → equalizer bars → columns of INVERTED (centre out); "Devils" hangs as an unlit neon tube and buzzes on | neon hum | neon cuts out, letters fold to a flat line |
| 5 | `inverted-devils-5-gaze` | Gaze: an eye opening | a red slit opens like an eye, hesitates half-lidded while INVERTED's halves slide in from opposite sides | halves lock (seam flash), the eye opens fully; "Devils" lands like a kiss with rings of light | anamorphic streak through INVERTED | a blink: lids close to the slit and it goes out |

## Preview and render

```bash
npm run intros-studio -w lyrics_videos                     # Studio with all five
npm run intros -w lyrics_videos -- stills trace 1,2.5,4    # stills → out/intros/<id>/stills
npm run intros -w lyrics_videos -- render all              # MP4s → out/intros/<id>.mp4
```

They are silent. To sync a sound sting later, the main hits are: Trace 1.7 s (INVERTED burns in),
Mirror 2.47 s (flip lands), Voice 0.8 / 1.08 s (heartbeats) and 2.45 s (neon on), Gaze 2.05 s
(halves lock) and 2.85 s (Devils lands).
