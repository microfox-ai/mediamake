# Episode template (Cook with Claude ep. 1, final cut)

`video/` is the code of `projects/cookwithclaude-pack-brand-kit/video` as
signed off on 2 Nov 2026. Copy it to `projects/<slug>/video/` for a new episode: it imports the engine
by name (`@mediamake/engine`), and its relative imports (`../../../../brands/cookwithclaude/graphics/…`,
`../input/…`) resolve from there.

| file | keep or change |
|---|---|
| `theme.ts` | keep the palette, fonts and easings; change `SLUG`, `INSTALL_PROMPT`, `ASK_PROMPT`, `INSTALL_STEPS`, `NOTES` (the user's real notes) |
| `timeline.ts` | the episode's clock: read starts, the `W` onset tables from `tools/voice_onsets.py`, every beat, the theme passes, the shelf order (public outputs only) |
| `parts.tsx`, `fx.tsx`, `three.tsx`, `css3d.tsx` | the shared kit: keep (add to it) |
| `index.tsx`, `scenes/Sound.tsx`, `scenes/Opener.tsx`, `scenes/End.tsx` | keep; End's `QUESTION` stays "what do you wish to make next?" |
| `scenes/Cold.tsx`, `Skills.tsx`, `Ritual.tsx` | keep the structure; swap the item's card, prompt and outputs |
| `scenes/Look.tsx`, `Draw.tsx`, `There.tsx`, `Alive.tsx`, `Pantry.tsx`, `JustStart.tsx` | the item's own story: keep the devices (fly-through, deck with brush strikes, 3D reveal and match cut, counters, shelf ring, the call), rewrite what they show |
| `shots.json` | one shot per beat, stable ids |

What the scenes read from `projects/<slug>/input/`: `vo4/vo.json` and the voice cuts, `sfx2/` (theme,
sting, effects), `kit2/` (opener, end prompt, banner, profile, guide pages), `atlas/` (per-station and
panel videos + posters), `tex/` (reference and round atlases, labels, `logo-hq/<id>.png`), `stock/cut/`
(Pexels loops), `stations.json`, `fx/grain-*.png`. `../tools/prep_ep01.py` shows how ep. 1 made them.
