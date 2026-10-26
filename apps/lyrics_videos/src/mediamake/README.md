# src/mediamake

mediamake's editor presets and waveform atoms as lyrics_videos scenes. A lyric video made here uses
the same caption and waveform code as the mediamake editor, so a look set up in a mediamake
timeline can be reused as is.

| Scene / helper | What it does |
| --- | --- |
| `CaptionLayer` | Lyrics through any synced caption preset (`sub-vertical-float`, `sub-fast-rap-static`, `sub-kinetic-motion`, `sub-kinetic-gradient-flow`, `sub-scrolling-vertical`) with its own inputs. Lines from a mediamake `lyrics.json` keep their `metadata.htmlText` (`<b>` highlights, `<br/>` breaks). |
| `VerticalFloatLyrics` | The same for `sub-vertical-float` only; `style` takes the preset's inputs. |
| `WaveformLayer` | `spectrum-fill` (with the Wave Look action's looks: `single-wave` … `fearless-beats`, plus `impact`), `spectrum-line`, or `waveform-audio` (the waveform preset: `waves` = WaveformHistogram, `static` = WaveformHistogramRanged). `mirrorX` flips it onto the other edge. |
| `CoverBackdrop` | The picture behind everything (default: the first image in `input/`): zoom or pan loop (from `origin`), beat kick, dim, bottom fade for a wave strip, energy shake, and a `look`. `coverMotion` / `coverPoint` say where a point of the picture is on screen at any time. |
| `PictureLook` | The cover's `look`: the poster treatments made alive — grade, posterize, duotone, curves, chromatic split (on kicks), bloom (pulsing on the beat), animated grain, vignette, light leak, god rays from a picture point, embers, halftone, paper, dust, flicker, scanlines, letterbox. |
| `Visualizers` | WaveformLayer kinds beyond bars and lines: `halo`, `yantra`, `sparks`, `rings`, `bolt`, `flames`, from the same FFT and the song's onsets; `at` points follow the cover's motion. |
| `TrackTitle` | Title plus a boxed artist line, the layout of the waveform scene preset. |
| `OverlayText` | A text-overlay line with blur in/out: channel tags, titles, credits. |
| `OverlayVideo` | A looping overlay clip in `screen` blend (particles, dust, light leaks). |
| `look.ts` | A waveform lyric video as data: `Look` = picture + **wave** + **font set** + **caption setup** (+ title, texts, overlays). `Storyboard` = a project's candidates for each step and its picks; catalog ids or designs written out; `tintWave()` recolours a wave. Pure: Node scripts import it. |
| `lookVideo()` / `storyboardVideo()` | A Look, or a storyboard's picks, as a project (`defineProject`). |
| `WaveLab` | The `wave-lab` composition: any Look on any project's song, with an ID badge. `npm run wave-lab` shoots it. |
| `lyricVideo()` / `waveformVideo()` | The older whole-project templates, with `LYRIC_STYLES` / `WAVE_STYLES`. |
| `runPreset()` / `PresetTree` | Run any synced preset and render its component tree. |

The waves, font sets and caption setups to start from are in **`apps/lyrics_videos/catalog/`**;
`npm run wave-lab -w lyrics_videos -- catalog` shoots each into `out/waveform-catalog/`.

```tsx
// projects/<slug>/video/storyboard.ts — the three steps, then the picks
import { tintWave, type Storyboard } from '../../../src/mediamake/look.ts';

export default {
  base: { cover: { image: 'cover.jpg', beatKick: 0.5 } },
  waves: { W1: 'side-bars-white', W2: tintWave('fill-fearless-white', '#e11d48', '#fecdd3') },
  fonts: { F1: 'calligraffitti-bebas', F2: 'cormorant-montserrat' },
  captions: { C1: 'sentence-float-2', C2: 'blur-float-4' },
  pick: { wave: 'W2', fonts: 'F1', captions: 'C2' },
} satisfies Storyboard;

// projects/<slug>/video/index.tsx
import { storyboardVideo } from '../../../src/mediamake';
import storyboard from './storyboard';
export default storyboardVideo('<slug>', storyboard);
```

```bash
npm run wave-lab -w lyrics_videos -- <slug> looks      # L1, L2 … the picture's style (storyboard `looks`)
npm run wave-lab -w lyrics_videos -- <slug> waves      # W1, W2 … → out/<slug>/<slug>-storyboard/waves/
npm run wave-lab -w lyrics_videos -- <slug> waves --clip=6   # + a 6 s clip of each, and a reel
npm run wave-lab -w lyrics_videos -- <slug> final      # the picked look, four moments
```

Layers come in order: picture, overlays, waves, title, lyrics, texts. Lyrics and waves run at
`'all'`, so caption times stay the song's own.

## Projects made from a mediamake timeline

Put the timeline's song and picture URLs in `input/sources.json`
(`{ "song.mp3": "<url>", "cover.jpg": "<url>" }`) and its captions in `input/lyrics.json`
(`{ "captions": [...] }`, metadata kept), then:

```bash
npm run fetch-inputs -w lyrics_videos -- <slug>
npm run prepare-project -w lyrics_videos -- <slug>
```

## Keeping presets in sync

`presets.json` is generated from `apps/mediamake/components/editor/presets/registry`, and
`html-text.ts` from `apps/mediamake/lib/captions/html-text.ts` (the htmlText helpers the editor
injects on `props.helpers`; `runPreset` injects them too, so `<b>` and `<br/>` work as in the
editor). After a preset or those helpers change there, run:

```bash
npm run sync-presets -w lyrics_videos
```

The presets and `@microfox/remotion` atoms style themselves with Tailwind classes, so the app
enables Tailwind (`remotion.config.ts`, `scripts/stills.ts`, `src/index.css`).
