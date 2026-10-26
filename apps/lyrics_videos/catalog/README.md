# catalog

The starting points for a waveform lyric video (the `make-waveform-lyric-video` skill), one file
per storyboard step, and a screenshot of every entry shot on this machine:

| Step | Entries | Shots (`apps/lyrics_videos/out/`, not committed) |
| --- | --- | --- |
| 1 · Waves | `waves.ts` (`WAVES`) | `waveform-catalog/waves/` |
| 2 · Font sets | `fonts.ts` (`FONTS`) | `waveform-catalog/fonts/` |
| 3 · Caption setups | `captions.ts` (`CAPTIONS`) | `waveform-catalog/captions/` |

`out/waveform-catalog/README.md` is a gallery of them all, the folder is an image set for
mediamake's `/image-revision` (its `index.json`), and each step folder has a `sheet.jpg`. When the
folder is missing (a fresh checkout), shoot the catalog first.

The entries were learned from the user's mediamake timelines (a read-only export of 2026-10-24:
185 waveform tracks, 184 caption tracks), keeping the parameters the videos used, plus new
designs. They no longer depend on the timelines. Types are in `src/mediamake/look.ts`:

- a **wave** is `WaveformLayerProps` (or several drawn together): mediamake's `waveform-audio`
  preset (frequency bars, time-domain waves), or the `WaveformSpectrumFill` / `WaveformSpectrumLine`
  atoms;
- a **font set** is a highlight style, a sub style and colours, used by any caption preset;
- a **caption setup** is one of the synced caption presets (`sub-vertical-float`,
  `sub-fast-rap-static`, `sub-kinetic-motion`, `sub-kinetic-gradient-flow`,
  `sub-scrolling-vertical`) with its animation, layout, size and place, without fonts.

Each entry has a `name`, `about` (what it looks like, when it fits), `tags` and `source` (the
timelines it came from, or `new <date>`). Values are px for a 1920×1080 frame.

## Shots

```bash
npm run wave-lab -w lyrics_videos -- catalog                     # everything (~10 min)
npm run wave-lab -w lyrics_videos -- catalog waves --only=jaws   # one entry
npm run wave-lab -w lyrics_videos -- catalog --gallery           # only rewrite the gallery
```

Every shot uses the demo in `demo/`: 33 s of a chorus and a night-sky picture, both on the
mediamake CDN, cut into `projects/_wave-catalog/` (gitignored) on the first run. Waves are one
still at the loudest second, font sets one still as a line finishes, caption setups four moments
of one line in a 2×2 grid. The same script shoots a project's own candidates on its own song and
picture: `npm run wave-lab -w lyrics_videos -- <slug> <waves|fonts|captions|final>`.

## Adding an entry

When the user picks a design made for one song, add it to the step's file under a new id (with
`source: 'new <date>: <project>'`), shoot it with `--only=<id>`, and check the shot.
