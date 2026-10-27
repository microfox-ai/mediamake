# One Piece props (Blender)

A reusable library of One Piece props, modelled from scratch in Blender with Python after real replicas
and cosplay pieces (reference photos gathered on Pinterest, 2026-10-27). First made for the Nakama
lyric video's desk (`projects/nakama/tools/blender_outro.py`), kept for later videos.

- `props.py` — one builder per prop; each builds into its own collection `OP <name>`, real-world size in
  metres, standing on z = 0, centred on the origin, longest side along x; procedural materials. The list
  of props and their sizes is in its docstring (straw hat, meat on the bone, Zoro's three katanas, Log
  Pose, Clima-Tact, tangerines, sea charts, Kabuto, Chopper's hat, medicine and Rumble Balls, Franky
  Cola, Brook's tea, Sanji's cigarette, Robin's books, Jinbe's sake set, Den Den Mushi, globe, spyglass,
  ink and quill, chart roll, candle, magnifier, dividers, pencils, wanted posters).
- `textures.py` — the printed textures (wanted posters, the Franky Cola label) into `textures/`.
- `build_library.py` — builds every prop into `onepiece_props.blend` (each collection marked as an
  asset, tagged "one piece") and renders a 3/4 preview of each into `previews/`.

```
uv run --with pillow python assets3d/onepiece/textures.py
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P assets3d/onepiece/build_library.py -- --samples 48
```

Use a prop in Blender: File → Link/Append → `onepiece_props.blend` → Collection → `OP <name>`, or add
`assets3d/onepiece` as an asset library and drag it from the Asset Browser. From a script:
`sys.path.insert(0, 'assets3d/onepiece'); import props; coll = props.PROPS['straw_hat']()`, then
instance the collection (an empty with `instance_type = 'COLLECTION'`).

The built `.blend`, `previews/` and `textures/` are generated (gitignored); the scripts are the source.
