# Graphic design: typography, paints, pictures, strokes, effects, masks, vectors

Proved on figcraft-cli 0.18.1, headless: everything below was run and its PNG looked at. ✓ works as written, partly = works with a caveat, ✗ fails (error quoted).

## 1. Typography

Load static fonts once per run: `{"command":"text.loadFont","params":{"path":".../Family-900.ttf"}}` →
`{families:[…]}`. Then name the family + face: `"fontFamily":"Playfair Display","fontStyle":"Black"`
(`text.fonts {family}` lists faces; `{family, style, features:true}` lists OpenType tags;
`{family, axes:true}` lists variable axes + named instances). Built-in family: `Inter`
(Regular, Italic, SemiBold, Bold; rich features cv01–cv14, ss01–ss08, tnum, zero, frac…).
macOS system families work by name (Helvetica Neue, Avenir Next, Futura, Didot, Bodoni 72, Skia,
Playfair Display/Montserrat if installed). The variable SF Pro is the family `"System Font"`.

| Feature | Copy-paste (node.create `props` or node.set keys) | |
|---|---|---|
| Single-line text | `{"type":"text","text":"Hi","x":0,"y":0,"parent":ID,"props":{"fontFamily":"Inter","fontSize":24,"textAutoResize":"widthAndHeight"}}` | ✓ |
| Wrapping paragraph | top-level `"width":400` + `"textAutoResize":"height"` | ✓ |
| Fixed box (for vertical align) | `"width":300` top-level, **height inside props**: `"props":{"textAutoResize":"none","height":200}` | ✓ (top-level `height` is ignored for text → box stays 1 line tall) |
| Line height | `"lineHeight":18` (px) · `"lineHeight":"170%"` · `"lineHeight":"auto"` | ✓ |
| Letter spacing | `"letterSpacing":12` (px) · `"letterSpacing":"-4%"` (of font size) | ✓ |
| Paragraph spacing / first-line indent | `"paragraphSpacing":24,"paragraphIndent":32` (paragraphs = `\n`) | ✓ |
| Horizontal align | `"textAlign":"left|center|right|justified"` | ✓ |
| Vertical align | `"textAlignVertical":"top|middle|bottom"` (NOT `center`: error `textAlignVertical: top|middle|bottom`) | ✓ |
| Case | `"textCase":"upper|lower|title|smallCaps|original"` (true small caps on Inter) | ✓ |
| Decoration | `"textDecoration":"underline","textDecorationStyle":"wavy","textDecorationColor":"#FF5A5F","textDecorationThickness":2,"textDecorationOffset":4` ; `"textDecorationStyle":"dotted","textDecorationThickness":"10%","textDecorationSkipInk":true` ; `"textDecoration":"strikethrough","textDecorationColor":"#E03131"` | ✓ |
| OpenType features | `"features":{"tnum":true,"zero":true,"frac":true}` (1/2 → ½, slashed zero) | ✓ |
| Variable axes | `"fontFamily":"System Font","fontVariations":{"wdth":30,"wght":900}` (SF Pro: wdth 30–150, wght 1–1000, opsz 17–96); named instance as style: `"fontFamily":"Skia","fontStyle":"Black Extended"` | ✓ |
| Max lines (ellipsis) | `"width":380,"props":{"maxLines":2,"textAutoResize":"height"}` → 2 lines + "…" | ✓ |
| Truncate | `"textAutoResize":"truncate"` (box keeps text to its lines with "…") | ✓ |
| Leading trim | `"leadingTrim":"capHeight"` (64 px Inter box 77 → 46.6 px tall: box = cap height to baseline) | ✓ |
| Wrap style | `"wrapStyle":"balance"` (also `pretty`, `auto`) | ✓ |
| Hanging punctuation | `"hangingPunctuation":true` (opening “ hangs in the margin) | ✓ |
| Lists | `"listStyle":"bulleted"` / `"numbered"`, `"listSpacing":8`; nest: `node.set {id, start, end, "indentation":1}` (numbered nest shows a., b.) | ✓ |
| Mixed styles per range | `{"command":"text.style","params":{"id":ID,"start":0,"end":13,"fontFamily":"Playfair Display","fontStyle":"Black","fontSize":64,"textFills":["#E8590C"],"letterSpacing":"-3%"}}` ; same keys on `node.set` with `start`/`end` (e.g. `"textDecoration":"underline"`) | ✓ (readback: `node.get {fields:["styledRuns"]}`) |
| Gradient text | `"fills":[{"type":"linearGradient","stops":["#F76707","#D6336C","#7048E8"],"from":[0,0.5],"to":[1,0.5]}]` on the text layer | ✓ |
| Stroke on text | `"fills":[],"strokes":["#111111"],"strokeWeight":3,"strokeAlign":"outside"` (outline type); sticker: fill + `"strokeWeight":10,"strokeAlign":"outside","strokeJoin":"round"` | partly: a sticker stroke left a 1-px white speck between two letters (E/R in Anton) |
| Text style | `{"command":"style.create","params":{"type":"text","name":"Display/H1","value":{"fontFamily":"Fraunces","fontStyle":"Black","fontSize":56,"lineHeight":"110%","letterSpacing":"-2%"}}}` → `{id:"S:1"}`; `{"command":"style.apply","params":{"ids":[ID],"style":"Display/H1"}}` | ✓ |
| text.fit | `{"command":"text.fit","params":{"ids":[ID],"minSize":40}}` on a fixed-width text; → `{fitted:[{fontSize,lines,fits,orphan}]}` | partly: default `minSize` is 60 % of the current size; it stopped there with `fits:false` and overflowing text — always pass `minSize` and check `fits` |
| Link | `{"command":"text.link","params":{"ids":[ID],"url":"https://…"}}` (underlined) | ✓ |
| Text on a path | `{"command":"text.onPath","params":{"text":TEXT_ID,"path":SHAPE_OR_VECTOR_ID,"start":0.55,"flip":false}}` → `{id}` (the path layer is deleted; the text keeps its id; readback `textPath.d`) | ✓ |
| Outline text → vector | `{"command":"vector.flatten","params":{"ids":[TEXT_ID]}}` → `{id}` of a VECTOR (glyph outlines, same fills) | ✓ |
| Missing font | `"fontFamily":"Nonexistent Grotesk"` → draws in the fallback (Inter), no error; `text.missingFonts {}` → `{families:[{family,layers:1,source:null}]}` | ✓ (silent fallback!) |

Text-on-path geometry (proved on ellipses): an ellipse's path starts at 3 o'clock and runs clockwise
(y down). Text on the TOP reading left→right: `start ≈ 0.75 − L/2` (L = text length as a share of the
circumference), no flip. Text on the BOTTOM reading upright: `flip:true` puts it inside the circle and runs
counter-clockwise; `start` is then measured counter-clockwise from 3 o'clock, so `start ≈ 0.75 − L/2`
centres it at 6 o'clock. **The text takes the path layer's fill when the path has one**: a `vector`
created by node.create gets a default `#D9D9D9` fill, so give the path `"fills":[]` or the text turns grey.

## 2. Paints (fills on shapes, frames, text; strokes take the same paint JSON)

`fills`/`strokes` is a list, **index 0 = bottom**, last = top. A bare hex string is a solid paint.
Colours `#RRGGBB` or `#RRGGBBAA`. Read-back (`node.get {fields:["fills"]}`) gives the engine's native form:
gradients as `{"type":"gradient","kind":"linear|radial|angular|diamond","from","to","width","stops":[{"color":{r,g,b,a},"position"}]}`;
that native form is also accepted as input.

| Feature | Copy-paste | |
|---|---|---|
| Solid with paint opacity | `"fills":[{"type":"solid","color":"#E2557A","opacity":0.5}]` (= `"fills":["#E2557A80"]`) | ✓ |
| Linear, stops with positions | `{"type":"linearGradient","stops":[{"color":"#FF7A45","position":0},{"color":"#FFD36B","position":0.2},{"color":"#7B5CFA","position":1}],"from":[0,0.5],"to":[1,0.5]}` (from/to in the layer's unit box; plain `"stops":["#a","#b"]` spaces them evenly) | ✓ |
| Stop transparency | stop colour with alpha: `{"color":"#00000000","position":0},{"color":"#000000CC","position":1}` (a scrim over a photo) | ✓ |
| Radial | `{"type":"radialGradient","stops":["#FFF4C9","#FF8A3D","#7B1E5A"],"from":[0.3,0.3],"to":[0.3,1.0]}` (from = centre, to = radius end; `width:[x,y]` = the other radius handle) | ✓ |
| Angular (conic) | `{"type":"angularGradient","stops":["#14A085","#4F7CF7","#7B5CFA","#E2557A","#FF7A45","#14A085"]}` — default starts at 6 o'clock (`to` = [0.5,1]) and runs counter-clockwise on screen; repeat the first stop last for a seamless wheel | ✓ |
| Diamond | `{"type":"diamondGradient","stops":["#FFFFFF","#4F7CF7","#0B1026"]}` | ✓ |
| Native radial glow (soft blob) | `{"type":"gradient","kind":"radial","from":[0.5,0.5],"to":[0.5,1.0],"width":[1.0,0.5],"stops":[{"color":"#FFD43B","position":0},{"color":"#FFD43B00","position":1}]}` | ✓ |
| Stacked fills, per-paint blend + opacity | `"fills":[{"type":"linearGradient",…},{"type":"radialGradient","stops":["#FFFFFF","#FFFFFF00"],"blend":"overlay","opacity":0.8},{"type":"solid","color":"#00E5FF","blend":"multiply","opacity":0.6}]` | ✓ |
| Image layer | `{"command":"image.place","params":{"path":"/abs/x.jpg","x":40,"y":40,"width":280,"height":200,"parent":ID,"name":"Photo","mode":"fill"}}` → `{id,image (hash),width,height,imageProfile}`; `mode` fill / fit / crop / tile | ✓ |
| Image into an existing shape | `{"command":"image.place","params":{"path":"…","target":SHAPE_ID,"mode":"fill"}}` → added ON TOP of the shape's fills (the default #D9D9D9 stays underneath; set `"fills":[]` first if the image has transparency) | ✓ |
| Image paint JSON (fill.set / props) | `{"type":"image","image":"<hash from image.place>","scale_mode":"fill|fit|crop|tile","scale":1,"rotation":0,"opacity":1,"blend":"normal","filters":{…}}` (snake_case `scale_mode`) | ✓ |
| Tile size | `{"command":"fill.set","params":{"ids":[ID],"index":0,"paint":{"type":"image","image":HASH,"scale_mode":"tile","scale":0.08}}}` (`scale` = image px × scale per tile; default 1 = full-size tile) | ✓ |
| Crop transform | `"paint":{"type":"image","image":HASH,"scale_mode":"crop","crop":[sx,0,0,sy,tx,ty]}` — a flat 6-number affine: the layer shows image region x∈[tx,tx+sx], y∈[ty,ty+sy] (unit image coords). `[0.5,0,0,0.5,0.25,0.25]` = centre quarter. Crop STRETCHES to the box: keep `sx·imgW / (sy·imgH) = boxW/boxH` or the photo distorts. Nested `[[a,b,c],[d,e,f]]`, `{x,y,w,h}`, `{left…}` → `invalid paint` | ✓ (format undocumented) |
| `image.crop` | `{"command":"image.crop","params":{"ids":[ID]}}` → switches the fill to Crop keeping the picture; headless it changes nothing visible (crop stays null) | partly |
| Adjust preset | `{"command":"image.adjust","params":{"ids":[ID],"preset":"vivid"}}` (vivid, muted, warm, cool, blackAndWhite, fade, reset) | ✓ |
| Adjust preset + filters | `{"command":"image.adjust","params":{"ids":[ID],"preset":"blackAndWhite","filters":{"contrast":0.4}}}`; filters only: `{"filters":{"temperature":0.6,"exposure":0.2,"shadows":0.5,"highlights":-0.4}}` (each −1..1: exposure, contrast, saturation, temperature, tint, highlights, shadows) | ✓ |
| Own preset | `{"command":"image.savePreset","params":{"name":"Moody","filters":{"contrast":0.3,"saturation":-0.4,"temperature":-0.3}}}` then `image.adjust {preset:"Moody"}`; `image.presets {}` lists both kinds | ✓ |
| Replace picture | `{"command":"image.replace","params":{"ids":[ID],"path":"/abs/other.jpg"}}` (keeps mode, crop, filters) | ✓ |

## 3. Strokes

| Feature | Copy-paste (props / node.set) | |
|---|---|---|
| Align + weight | `"strokes":["#1C7ED6"],"strokeWeight":12,"strokeAlign":"inside|center|outside"` | ✓ |
| Per side | `"strokeAlign":"inside","strokeTopWeight":0,"strokeRightWeight":0,"strokeBottomWeight":4,"strokeLeftWeight":10` (read back as `strokeSides:[t,r,b,l]`) | ✓ |
| Dashes | `"dashes":[16,8],"dashCap":"round"` (round caps eat into the gaps: use bigger gaps) | ✓ |
| Several strokes | `"strokes":["#FAB005",{"type":"solid","color":"#E03131","opacity":0.6}]` | ✓ |
| Gradient stroke | `"strokes":[{"type":"angularGradient","stops":[…]}],"strokeWeight":14` | ✓ |
| Caps | `"strokeCap":"round|square|none"`; per end on lines/open paths: `"startCap":"circleFilled","endCap":"triangleArrow"` (also `lineArrow`, `diamondFilled`, `reversedTriangle`) | ✓ |
| Line / arrow layers | `{"type":"line","x":40,"y":230,"width":260,"props":{"strokes":["#212529"],"strokeWeight":16}}`; `"type":"arrow"` = line with a lineArrow end | ✓ |
| Joins | `"strokeJoin":"miter|bevel|round"` (+ `"miterAngle":deg` or `miterLimit`) | ✓ |
| Width profile | `"widthProfile":"wedge|taper|eye|rounded|pinch|uniform"` or points `[[t,scale],…]` e.g. `[[0,0.1],[0.3,1],[0.6,0.2],[1,1]]`; also `{"command":"stroke.widthProfile","params":{"ids":[ID],"preset":"eye"}}` | ✓ |
| Brush | `{"command":"stroke.brush","params":{"ids":[ID],"preset":"ink"}}` (taper, ink, ribbon, bristle stretch along; dots, stars, confetti, leaves scatter); tuned: `node.set {"brush":{"preset":"dots","spacing":2,"sizeJitter":0.6,"scatter":1.5,"seed":7}}` | ✓ |
| Stroke on text | see §1 | ✓ |

## 4. Effects (`"effects":[…]` in props / node.set; or `effect.add {ids, type}` for defaults, `effect.set {ids, index, effect}`)

Colours may be hex (`#RRGGBBAA` sets the shadow's alpha). Order: drop shadows → fills → inner shadows →
children → strokes; layer blur / noise / texture apply over the result.

| Feature | Copy-paste | |
|---|---|---|
| Drop shadow + spread | `{"type":"dropShadow","color":"#1B1F3B33","offset":[0,12],"radius":24,"spread":-4}` | ✓ |
| Layered (elevation) shadows | three dropShadows: `#00000014 [0,1] r2`, `#0000001F [0,8] r16 s-2`, `#00000029 [0,24] r48 s-8` | ✓ |
| Show behind translucent fill | `{"type":"dropShadow","color":"#E8590C99","offset":[12,12],"radius":0,"showBehind":true}` (hard offset "brutalist" shadow under a 25 % fill; without it the shadow is cut out under the fill) | ✓ |
| Glow | dropShadow `"offset":[0,0],"radius":40,"spread":6,"color":"#FFD43BCC"` | ✓ |
| Inner shadow | `{"type":"innerShadow","color":"#1C7ED680","offset":[0,6],"radius":12,"spread":2}` | ✓ |
| Layer blur | `{"type":"layerBlur","radius":30}` | ✓ |
| Progressive blur | `{"type":"layerBlur","blurType":"progressive","startRadius":0,"radius":40,"start":[0.5,0],"end":[0.5,1]}` — keys are `start`/`end` (docs say `startOffset`/`endOffset` → error `unknown properties: endOffset, startOffset (a layerBlur takes blurType, end, radius, start, startRadius, type, visible)`) | ✓ |
| Background blur (frosted) | `{"type":"backgroundBlur","radius":20}` on a layer with a translucent fill, e.g. `"fills":["#FFFFFF33"]` + 1 px `#FFFFFF80` stroke | ✓ |
| Glass | `{"type":"glass","depth":24,"dispersion":0.35,"frost":12,"lightAngle":-45,"lightIntensity":0.7,"refraction":0.6,"splay":0.2}` on a `#FFFFFF14` fill (defaults: depth 20, dispersion 0.5, frost 4, lightAngle −45, lightIntensity 0.8, refraction 0.8, splay 0) | ✓ |
| Noise / grain | `{"type":"noise","mode":"mono","color":"#00000040","density":0.5,"size":0.5}` = fine subtle grain. **Strength comes from the colour's alpha; `opacity` has no visible effect in mono** (`"color":"#000000","opacity":0.12` is a heavy black speckle). `size` 0.5 ≈ 1-px grain, 1 ≈ 2 px, 2 ≈ 5-px blocks. Modes: `mono`, `duo` (`color` + `secondary`), `multi` (coloured, subtle at defaults) | ✓ |
| Texture | `{"type":"texture","radius":6,"size":0.6,"clipToShape":true}` roughens/grains the layer's edges (a stamped, risograph edge); `clipToShape:false` lets the rough edge spill out | ✓ |

## 5. Masks, opacity, blend modes

| Feature | Copy-paste | |
|---|---|---|
| Mask group | create the mask shape FIRST (bottom), then the content, then `{"command":"object.mask","params":{"ids":[MASK_ID, CONTENT_ID]}}` → `{id}` of a GROUP "Mask group"; the bottom layer becomes `isMask:true` | ✓ |
| Alpha mask (default) | mask paint's alpha shapes it: a star, text (image inside letters), or a gradient `["#000000FF","#00000000"]` to fade a photo out | ✓ |
| Luminance mask | after object.mask: `{"command":"node.set","params":{"id":MASK_ID,"maskType":"luminance"}}` (white shows, black hides); also `maskType:"vector"` (shape only) | ✓ |
| Clip content | frames: `"clip":true` (children cut to the frame box & radius) | ✓ |
| Release | `{"command":"object.releaseMask","params":{"ids":[GROUP_ID]}}` | (listed, not needed) |
| Layer opacity | `"opacity":0.5` or `"opacity":"50%"` | ✓ |
| Layer blend | `"blend":"multiply"` — all 18 CSS names render correctly: normal, multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity, plus-darker, plus-lighter (read back camelCase, e.g. `plusDarker`); frames/groups default to pass-through | ✓ |
| Paint blend | `{"type":"solid","color":"#00E5FF","blend":"multiply","opacity":0.6}` inside `fills` | ✓ |

## 6. Vectors, shapes, booleans

| Feature | Copy-paste | |
|---|---|---|
| SVG path | `{"command":"node.create","params":{"type":"vector","parent":ID,"x":40,"y":40,"path":"M60 0 L120 104 L0 104 Z","props":{"fills":["#364FC7"]}}}` (path coords = px; `"width":160,"height":120` top-level scales it) | ✓ |
| Points | `"type":"vector","points":[[0,0],[120,30],[60,120]],"closed":true` ; open polyline `"closed":false` + `"fills":[]` + stroke | ✓ |
| Curves | `"path":"M0 80 C 40 0 120 0 160 80 Q 200 160 240 80"` (C, Q, S, H, V, Z all fine) | ✓ |
| **Open subpaths aren't filled** | a filled `path` subpath without `Z` draws nothing (no error): close every filled subpath (`… Z`), or use `points` with `"closed":true` | gotcha |
| **Default fill on vectors** | node.create vector gets `#D9D9D9` fill unless you pass `"fills":[]` — always set it for line art | gotcha |
| Polygon | `{"type":"polygon","width":120,"height":120,"props":{"pointCount":6,"cornerRadius":12}}` | ✓ |
| Star | `{"type":"star","props":{"pointCount":5,"innerRadius":0.45}}`; badge `pointCount:12, innerRadius:0.8, cornerRadius:4`; sparkle `pointCount:4, innerRadius:0.2` | ✓ |
| Arc / pie | ellipse `"arcStart":-90,"arcSweep":120` (degrees, 0 = 3 o'clock, clockwise) | ✓ |
| Ring / donut | ellipse `"arcInner":0.7` (inner radius ratio) | ✓ |
| Gauge | ellipse `"arcStart":135,"arcSweep":270,"arcInner":0.82` (read back as `arc:{start,sweep,inner}`) | ✓ |
| Boolean | `{"command":"bool.union|bool.subtract|bool.intersect|bool.exclude","params":{"ids":[BOTTOM,TOP]}}` → `{id}` of a BOOLEAN_OPERATION group; subtract keeps the bottom minus the ones above. Result fill: union showed the TOP operand's colour, subtract the bottom's — set the group's `fills` yourself afterwards (node.set on the group works, effects too) | ✓ |
| Flatten boolean | `{"command":"bool.flatten","params":{"ids":[G]}}` → `{id}` VECTOR | ✓ |
| Flatten anything / text → outlines | `{"command":"vector.flatten","params":{"ids":[ID]}}` → `{id}` | ✓ |
| Outline stroke | `{"command":"vector.outlineStroke","as":"os","params":{"ids":[ID]}}` → **`{ids:[…]}`** (not `id`): reference it as `{"$ref":"os","field":"ids/0"}` | ✓ |
| Offset path | `{"command":"vector.offset","params":{"ids":[ID],"offset":12}}` (grows with rounded corners, in place) | ✓ |
| Simplify | `{"command":"vector.simplify","params":{"ids":[ID],"tolerance":1}}` | ✓ |
| Fill rule | `{"command":"vector.fillRule","params":{"ids":[ID],"rule":"evenOdd"}}` (a square with a same-direction inner square becomes a frame) | ✓ |
| Shape builder | `shapeBuilder.regions {ids}` → regions with `path`, `point`, `sources`; `{"command":"shapeBuilder.merge","params":{"ids":[A,B,C],"points":[[150,80],[150,150]]}}` (page coords) → `{id}` new VECTOR; `shapeBuilder.remove {ids, points}` cuts those regions out | ✓ |
| Vector network edit | `vector.edit.begin {id}` (converts shapes) → `vector.edit.addVertex {segment:0,t:0.5}` → `{vertex:4}` → `vector.edit.moveVertices {vertices:[4],dx:0,dy:-70}` → `vector.edit.end {}`; `vector.edit.state {}` gives vertices/segments; `vector.edit.cornerRadius {radius:24,vertices:[1,2]}` rounds single corners; `vector.edit.bend {segment,t,x,y}` (page point) | ✓ |
| Pattern fill | `{"command":"fill.pattern","params":{"source":DOT_ID,"ids":[ID],"tile":"horizontalHex","spacing":[14,14],"scale":1}}` — **replaces the top fill**: add a background fill first (or put the pattern on a separate layer); the source layer stays visible where it is (park it outside the frame) | ✓ |
| SVG import | `{"command":"file.import","as":"imp","params":{"path":"/abs/icon.svg","x":20,"y":20}}` → `{id}` of a FRAME on the page (named after the file) holding a Group; move it in: `node.reparent {ids:[{"$ref":"imp"}],parent:FRAME}` | ✓ |
| Recolour an import | `{"command":"selection.colors","as":"cols","params":{"ids":[IMPORT]}}` → `{colors:[{paint,targets}]}`; `{"command":"selection.setPaint","params":{"targets":{"$ref":"cols","field":"colors/0/targets"},"paint":"#7048E8"}}` (strokes and fills alike; `field` paths go deep) | ✓ |
| Scale an import | `{"command":"transform.scale","params":{"ids":[IMPORT],"factor":2}}` (scales strokes too). `transform.resize` only resizes the frame box, the icon stays small | ✓ / gotcha |

## 7. SVG export notes (proved on recipes/gfx-logo-icons)

- `{"command":"file.export","params":{"ids":[ID],"format":"svg","path":"/abs/x.svg"}}` writes text as outlined paths by default (0 `<text>` elements), booleans as one evenodd path, shadows as SVG filters.
- **Angular gradients become `radialGradient` in SVG** (the conic sweep is lost). For a logo that must
  survive SVG, use linear/radial gradients only.
- figcraft's own SVG importer (`figcraft-cli convert x.svg y.png`) drops shadow blur (hard offset), so
  don't judge an SVG by re-importing it into figcraft.

## 8. More techniques (verified)

| Feature | Copy-paste | |
|---|---|---|
| Photo inside type (no mask) | `image.place` the photo anywhere → take its hash with `{"$ref":"img","field":"image"}` → `{"command":"fill.set","params":{"ids":[TEXT],"index":0,"paint":{"type":"image","image":{"$ref":"img","field":"image"},"scale_mode":"fill"}}}`; then `{"command":"edit.delete","params":{"ids":[{"$ref":"img"}]}}` (the image stays in the file) | ✓ |
| Letterpress type | text `"fills":["#DEE2E6"],"effects":[{"type":"innerShadow","color":"#00000059","offset":[0,4],"radius":4},{"type":"dropShadow","color":"#FFFFFFFF","offset":[0,2],"radius":0}]` | ✓ |
| Variable axes per range | `text.style {id, start:0, end:4, "fontVariations":{"wght":100}}`; merge one axis into the layer: `{"command":"text.setVariations","params":{"id":ID,"variations":{"opsz":96}}}` | ✓ |
| Gradient on a text range | `text.style {id, start:6, end:14, "textFills":[{"type":"linearGradient",…}]}` | ✓ |
| Rotate an image inside its layer | image paint `"rotation":90` | ✓ |
| Rasterize | `{"command":"object.rasterize","params":{"ids":[ID],"scale":2}}` → `{ids:[…]}` | ✓ |
| Delete a layer | `{"command":"edit.delete","params":{"ids":[ID]}}` (there is no `node.delete`: `unknown command`) | ✓ |
| Hide a layer (e.g. guides after a check export) | `node.set {id, "visible": false}` — hidden layers don't export | ✓ |

## 9. Gotchas and rules proved here

1. **Text box height**: `node.create` ignores a top-level `height` for text (box stays one line, 15 px); put it in props: `"props":{"textAutoResize":"none","height":200}`. `width` works top-level.
2. **`textAlignVertical` is `top|middle|bottom`** (`center` fails).
3. **Not readable**: `node.get` cannot report textAlignVertical, textCase, paragraphSpacing, paragraphIndent or features (asking for the field errors; the full read leaves them out) — check those by exporting a PNG. Per-range case/decoration/fills show in `styledRuns`.
4. **paragraphSpacing / paragraphIndent are layer-wide**: `node.set` with `start/end` + `paragraphIndent` returns ok but changes nothing.
5. **text.fit** stops at 60 % of the size unless `minSize` is given; read `fits` in the result.
6. **Missing fonts never fail**: they draw in Inter. Loaded fonts live only for that run: reopening a saved file with `--in` reports them missing (`{"family":"Fraunces","layers":1,"source":"Google Fonts"}`) until you `text.loadFont` again (its `refitted` lists only auto-sizing text whose size changed, so it is often `[]`: check with `text.missingFonts {}`). So load every static font in the same run as the export and end with `text.missingFonts {}` → `{families:[]}`.
7. **Vectors start with a #D9D9D9 fill** → `"fills":[]` for line art, and before `text.onPath` (the text takes the path's fill).
8. **Text on a path deletes the path layer**; ellipse paths start at 3 o'clock clockwise; `flip:true` = inside, counter-clockwise.
9. **Image crop** = `"crop":[sx,0,0,sy,tx,ty]` on the image paint (unit image coords), it stretches: match aspect yourself. `image.place {mode:"tile"}` tiles at the image's own pixel size until you set `scale`.
10. **Noise strength = the noise colour's alpha** (`#00000040` subtle, `#000000` harsh); `opacity` does nothing visible in mono.
11. **Progressive blur keys are `start`/`end`** (not the documented `startOffset`/`endOffset`).
12. **Paint lists are bottom-first** (fills[0] at the bottom).
13. **Masks**: the mask layer must be the first id (bottom); `object.mask` returns the group id; luminance via `maskType` afterwards.
14. **Commands returning `ids` not `id`**: vector.outlineStroke, object.rasterize → use `{"$ref":"x","field":"ids/0"}`. `field` paths go deep (`colors/0/targets`, `image`).
15. **Boolean result colour** follows an operand (union → top's, subtract → bottom's): always `node.set` the group's fills/strokes after `bool.*`.
16. **fill.pattern replaces the top fill**, and its source layer stays visible: create the source outside the frame (parent `null`/page, off-canvas).
17. **SVG import** lands on the page as a frame: `node.reparent` it; scale with `transform.scale` (resize leaves the icon small).
18. **SVG export turns angular gradients into radial**: keep SVG deliverables to linear/radial gradients.
19. **A cut-out's hard image edge** (hair touching the PNG border) shows; fade it with an alpha mask: rectangle with `linearGradient ["#00000000"→"#000000" at 0.2]` as the mask under the cut-out.
20. **Measure, then place**: create text with `widthAndHeight`, `node.get {fields:["width","height"]}`, then centre with arithmetic (or use a full-width box with `textAlign:"center"`).
21. Speed: every recipe (30–66 steps, photos, blurs, glass) runs in about 1 s; no command crashed or hung.

## 10. Recipes (in recipes/; run with scripts/recipe.mjs)

- **gfx-event-poster.json** (1080×1350 → recipe-poster.png): "NOCTURNE" event poster — Anton title with a 3-stop gradient BEHIND a cut-out portrait (`{{image:subject.png}}` must be a transparent cut-out), an outline copy of the title in FRONT (layered type), boolean-subtract crescent moon with two glow shadows, radial-gradient sky, gradient alpha mask softening the cut-out's edge, embers, bottom scrim, Cormorant italic tagline, 3-column info row, lineup, film grain.
- **gfx-logo-icons.json** (1440×860 → recipe-logo-icons.png + .svg, recipe-logo-lockup.svg): "lumen" mark = ring EXCLUDE 4-point star with a linear gradient; wordmark outlined to vectors (vector.flatten); dark app icon with corner smoothing + inner highlight; 6 duotone icons (union, subtract, a heart from 2 circles + triangle) on a 96 px grid with 6 px round strokes.
- **gfx-youtube-banner.json** (2560×1440 → recipe-banner.png + recipe-banner-preview.png at half size): blurred colour blobs, grain, desktop-only ornaments outside the safe area (dashed ring, outline sparkle, pattern-fill dot grids), a background-blur glass panel exactly on the centre 1546×423 safe area holding the pill, logo lockup and tagline; a guides export (t/banner-guides.png) before the guides are hidden.
- **gfx-glass-card.json** (1200×960 → recipe-glass.png): glassmorphism "now playing" card — glass effect frame with a gradient hairline over sharp gradient shapes and blurred blobs, album art cropped with a crop transform and adjusted, boolean heart with glow, gradient progress bar with tnum times, vector controls, a background-blur chip.
- **gfx-carousel-slide.json** (1080×1350 → recipe-carousel.png): editorial Instagram slide — Instrument Serif headline with an italic accent range and `wrapStyle:"pretty"`, giant Fraunces "02" tint numeral, B&W adjusted photo with hairline frame and caption, justified body, pull quote with accent rule, running head / folio with tnum, page dots and a lineArrow "swipe", paper grain.

## 11. Missing or broken compared with Figma

- Image crop transform is undocumented (`crop:[sx,0,0,sy,tx,ty]` found by trial); `image.crop` does nothing visible headless.
- Paragraph spacing/indent can't differ per paragraph (Figma: same) and can't be read back; textAlignVertical, textCase, features not readable via node.get.
- Noise effect `opacity` is ignored in mono mode; docs name progressive-blur keys wrongly.
- SVG export: angular gradient → radial; figcraft's SVG re-import drops shadow blur.
- No text wrap around shapes / drop caps (Figma has none either).
- Boolean groups take an operand's fill instead of keeping one predictable style.
- Missing fonts fall back silently (no error) — Figma at least flags them in the UI.
- Sticker-style outside stroke on text left a 1-px speck between two Anton letters.
