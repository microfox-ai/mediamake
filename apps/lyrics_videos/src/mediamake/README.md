# src/mediamake

mediamake's editor presets and waveform atoms as lyrics_videos scenes. A lyric video made here uses
the same caption and waveform code as the mediamake editor, so a look set up in a mediamake
timeline can be reused as is.

| Scene / helper | What it does |
| --- | --- |
| `VerticalFloatLyrics` | Lyrics through the `sub-vertical-float` caption preset. `style` takes the preset's own inputs (colors, highlight/sub text styles, position, subtitleSync). Lines from a mediamake `lyrics.json` keep their `metadata.htmlText` (`<b>` highlights, `<br/>` breaks). |
| `WaveformLayer` | `spectrum-fill` (with the Wave Look action's looks: `single-wave` … `fearless-beats`, plus `impact`), `spectrum-line`, or `waveform-audio` (the waveform preset: `waves` = WaveformHistogram, `static` = WaveformHistogramRanged). |
| `CoverBackdrop` | Cover art behind everything: zoom or pan loop, beat kick, dim, bottom fade for a wave strip. |
| `TrackTitle` | Title plus a boxed artist line, the layout of the waveform scene preset. |
| `lyricVideo()` / `waveformVideo()` | Whole-project templates returning a normal `defineProject(...)`. |
| `LYRIC_STYLES` / `WAVE_STYLES` | Named looks. The non-default ones come from saved mediamake timelines. |
| `runPreset()` / `PresetTree` | Run any synced preset and render its component tree. |

```tsx
// projects/<slug>/video/index.tsx
import { lyricVideo } from '../../../src/mediamake';

export default lyricVideo({
  id: '<slug>',
  cover: 'cover.jpg',          // a file in input/
  lyrics: 'default',           // a LYRIC_STYLES name, or a VerticalFloatStyle object
  wave: { kind: 'spectrum-fill', look: 'fearless-beats', impact: 0.6 },
});
```

Layers come in order: cover, wave, title, lyrics, then `extra`. Lyrics and wave run at `'all'`, so
caption times stay the song's own.

## Keeping presets in sync

`presets.json` is generated from `apps/mediamake/components/editor/presets/registry`. After a preset
changes there, run:

```bash
npm run sync-presets -w lyrics_videos
```

The presets and `@microfox/remotion` atoms style themselves with Tailwind classes, so the app
enables Tailwind (`remotion.config.ts`, `scripts/stills.ts`, `src/index.css`).
