# Shake Effect Range (Browser) — phrase segmentation

Notes for `shake-effect-range-browser.ts`. The server shake action does not use this.

## What a phrase is

A phrase is one stretch of the song where the groove stays the same. On a funk track that is the open intro, the first locked pocket, the build, the chorus, the breakdown, the return, the long main section, and the dark landing.

It is not a bar count and it is not a single drum hit. A new phrase starts only when the bass, the brightness, and the busyness of the rhythm shift and stay shifted for several seconds. Loudness alone does not make a cut. A breakdown can stay empty even while it is still fairly loud, because the attacks dropped out and the tone went dark.

## What the analysis returns

The browser action does not receive the waveform or a list of beats. It receives a document whose `analysis` array is a series of short windows.

The browser path decodes the file at 16 kHz and steps through it in windows of 1024 samples, so each frame is about 64 ms. Near-silence (intensity under 0.02) is dropped. The segmenter treats those gaps as a rest.

Each frame:

| Field | Meaning |
|---|---|
| `timestamp` | Where the window starts, in seconds |
| `intensity` | Loudness scaled from 0 to 1 across the whole file |
| `rms` | Raw loudness of that window, before that scaling |
| `frequency` | Strongest frequency in the window, in Hz |
| `beatType` | `"low"`, `"mid"`, or `"high"`, from that strongest frequency |
| `bassRatio` | Share of the window's power under about 180 Hz |
| `spectralFlux` | How hard the spectrum jumped from the previous window. Busy attacks score higher |
| `zeroCrossingRate` | How often the wave crosses zero. Higher means brighter or noisier |
| `spectralCentroid` | Where the energy sits in the spectrum. Higher means brighter |

The document also carries `durationInSeconds`, `sampleRate` (16000 on the browser path), `source` (`"browser"` or `"worker"`), and a `summary`. The summary's `totalBeats` is the frame count, not a musical beat count.

Those frames are averaged into half-second bins. Cuts are the places where bass, brightness, and flux change and hold.

## How shake uses a phrase

Remotion shake (`packages/remotion` `ShakeEffect`):

- `amplitude` is travel in pixels. This action stays in about 1–4.
- `frequency` multiplies the frame clock. At 30 fps, `0.05` is about a 4 second sway, `0.1` is about 2 seconds, and `3` is a fast vibrate.
- `decay` is false and `axis` is `"both"`, so the move holds for the whole range.

## The splits

**short-phrase** (default). One shake per arrangement role. The intro sways (`frequency` 0.1, `amplitude` 2). The first locked pocket is small and quicker (1 / 1.5). The build is 2 / 2.5. The chorus is 4 / 3. A breakdown and the fade are left still. The return is 2 / 2.5, the long main section is 2.5 / 3, and the dark landing eases off to 2 / 1.5.

**short-pulse.** The shake speed follows how busy the attacks are (`spectralFlux`), and the travel stays small (about 1–2.5). A lift inside a long groove stays its own range. A breakdown is still empty.

**short-drift.** Neighboring phrases join into long slow moves. Frequency stays at 0.1 except the loudest section, which opens up to a wide sway (`amplitude` 4, `frequency` 0.5). The breakdown stays empty.

**long-impact.** Detector in `shake-impacts.ts`. A hit starts when loudness and attacks rise above the previous stretch and stay there, so a later chorus can land even when an earlier one was quieter. It ends when the level or the attacks fall back. Strength follows that hit, from about 2 / 2 up to 4 / 3. The verse between hits is left still.

**intelligent.** Detector in `shake-intelligent.ts`. No song structure. A range can sit at the start, the middle, or the end, wherever the beat changes and holds. Amplitude is how hard the beats in that range hit. Frequency is how fast they come: a hanging melody with almost no pulse uses about `0.05`–`0.1` (a multi-second sway), and a busy beat climbs toward `3`. Near-silence is the only stretch left still.
