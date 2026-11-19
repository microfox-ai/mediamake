# Files: export, import, fonts

Proved on figcraft-cli 0.18.1, headless: every row was run and read back with `node.get`, or its export opened.

## Exports
- PNG `file.export {ids,format:"png",scale:2,path}`; `size:"512w"`; `size:{"by":"height","value":100}`.
- JPG `quality:60..100`; WebP `colorProfile:"displayP3"`.
- SVG: text outlined by default; `svgOutlineText:false` keeps `<text>`; `svgIdAttribute:true`; `includeBoundingBox:true`; `file.exportSvg` same.
- PDF: selectable text, subset fonts; `bleed:"3mm",cropMarks:true,bleedMarks:true`; `cmyk:true`.
- Multi-page PDF: `file.exportFramesPdf {path,bleed?,cropMarks?,cmyk?}` (every top-level frame a page, reading order) = `file.export {ids:[frames],format:"pdf"}`.
- Android `format:"xml"`; whole file `format:"fig"` / `"penpot"` (some prototype details lost).
- Export settings: `export.add {ids,setting:{size:"2x",format:"png",suffix:"@2x"}}`; `export.update {ids,index,…}`; `export.remove`; `file.exportLayers {ids,dir}` → `<name><suffix>.<ext>`, or `{zip:true}`.
- `file.saveAs {data:true}` → base64. CLI: `export f -o dir/ --scale 0.5`, `-o x.pdf`, `--node`, `convert in out`, `render f -o x.webp --scale 0.25`, `info`.

- **Effects widen the export**: a frame with a drop shadow exports with the shadow's area around it
  (a 393×852 screen at 2× came out 1122×2040). `includeBoundingBox: true` exports exactly the frame
  (200×120 instead of 272×192).
- **Checking a PDF**: export the same frames as PNG in the same run and look at those (same renderer);
  on a Mac `sips -s format png deck.pdf --out page-1.png` shows the first page.

## Imports
- `file.import {path:"x.svg",x,y}` → editable frame (gradients, drop shadow, `<text>` survive).
- `file.import` a JPG/PNG → image layer; `file.placeImage {path,parent,x,y,width,height,mode:"fill"}`.
- `file.import` a `.figcraft` appends pages with NEW ids (interactions remapped); `file.open {path}` opens a new active tab with original ids, and that is what `--out` saves.
- REST JSON works with `file.open` / `file.import`; `figcraft-cli convert x.svg|photo.jpg y.figcraft`.


## Fonts (proved in every area)
- A run knows only the computer's installed fonts, Figcraft's built-in **Inter** (Regular, Italic, SemiBold,
  Bold only) and the files it loads with `text.loadFont {path}` (each static file registers its real family,
  one face: "Plus Jakarta Sans" / "ExtraBold"). Loaded fonts last for that run only.
- **Export in the same run that loaded the fonts.** Reopened with `--in`, or exported with the CLI's
  `export` / `render`, a file whose fonts aren't installed draws them in Inter; `info` and
  `text.missingFonts {}` list them (`{family, layers, source:"Google Fonts"}`).
- A wrong family or face name never fails: it silently falls back. End a build with
  `text.missingFonts {}` → `{families:[]}` and look at the export.
- Which font files this computer has: `node scripts/recipe.mjs --fonts` lists them (the folders it
  searches); for UI text the built-in Inter (Regular, SemiBold, Bold) needs no file. Most MediaMake
  thumbnail fonts are single display weights: check that a body weight exists before choosing a family.
- Before handing a file to someone for the app, install its fonts (`~/Library/Fonts` on a Mac,
  `~/.local/share/fonts` on Linux).

## Pictures
- `image.place` embeds a picture at full resolution (a 3840 px JPG made a 6 MB file): downscale first
  (2× the size it shows at is plenty).
- Local files only, no URLs. `image.replace {ids, path}` swaps a picture and keeps fit, crop and filters.
