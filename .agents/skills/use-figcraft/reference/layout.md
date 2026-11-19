# Layout, auto layout and UI screens

Proved on figcraft-cli 0.18.1: every row was run, read back with `node.get` and looked at in a PNG.
Read `node.get` fields and full trees with `scripts/layout_tree.py` (after `figcraft-cli convert x.figcraft x.json`).

## Lessons
1. Every new frame (frame.create or node.create, nested too) defaults to a WHITE fill and `clip: true`.
   Wrapper frames need `fill: "none", clip: false`, or white boxes appear and children's shadows are cut.
2. A `fill` child added to a hug parent turns the parent fixed at its current width (child can end up
   0 wide): set the parent's width first. `strokesIncluded` defaults to true (Figma: false).
3. Pinned bars: `absolute: true` with `x`, `y` and `constraints` in the same props. Resizing a 393×852
   screen to 440×956 reflowed the content and kept the tab bar at the bottom.
4. Rebrand a template: `style.update {style, value:"#hex"}` recolours every linked layer. A TEXT style's
   `value` replaces the whole style: fields left out fall back to Inter Regular 12, auto line height.
5. One-side border: `strokeSides [t,r,b,l]` (`strokeTopWeight` leaves the others at 1). `edit.undo` inside
   a run reverts the whole script.

## Feature table (✓ = node.get + PNG checked)
| Feature | Command / props | |
|---|---|---|
| Presets | `frame.presets {}`; `frame.create {preset:"iPhone 16", x:0, y:0, name:"Home"}` (always pass x, y) | ✓ |
| Frame | `frame.create {name, x, y, width, height, parent?, props:{fill, cornerRadius, layout…}}` | ✓ |
| Sizing | `sizingH` / `sizingV`: `"hug"` `"fill"` `"fixed"` (text and shapes too) | ✓ |
| Auto layout | `{"layout":"horizontal","gap":12,"padding":[16,20,16,20],"mainAlign":"min","crossAlign":"center"}` | ✓ |
| Distribute | `mainAlign: "spaceBetween"|"spaceAround"|"spaceEvenly"` | ✓ |
| Baseline | `crossAlign: "baseline"` (horizontal) | ✓ |
| Wrap | `{"layout":"horizontal","wrap":true,"gap":8,"crossGap":8,"sizingV":"hug"}` | ✓ |
| Grid | `{"layout":"grid","gridColumns":3,"gridRows":2,"columnTracks":[120,"1fr","2fr"],"rowTracks":[60,"1fr"],"gap":10,"crossGap":10}`; children `gridColumnSpan`, `gridColumn`/`gridRow` (0-based), `gridAlignH`/`gridAlignV`; `layout.setTrack {ids, axis:"columns", index:0, sizing:"fixed", value:40}` | ✓ |
| Absolute child | `{"absolute":true,"x":180,"y":8,"constraints":{…}}` | ✓ |
| Min / max | `minWidth:160` on a hug button ✓; `maxWidth` caps a frame but hugging text overflows instead of wrapping | partly |
| Overlap stack | `reverseZ:true` + `gap:-8` | ✓ |
| Wrapping text | `{"sizingH":"fill","textAutoResize":"height"}` | ✓ |
| Truncate / clamp | `textAutoResize:"truncate"`; `maxLines:2` | ✓ |
| Add / suggest / remove | `layout.add {ids, direction}` (infers gap, hug/hug); `layout.suggest {ids}`; `layout.remove`, `layout.removeAll` | ✓ |
| Reorder | `node.reorder {id, index}` (0 = bottom = first in flow); `transform.nudge {dx:1}` moves one place | ✓ |
| Measure | `measure.padding {id}`, `measure.distances {ids}` | ✓ |
| Constraints | `constraints:{horizontal: left|right|center|leftRight|scale, vertical: top|bottom|center|topBottom|scale}`; children follow `node.set {width,height}` or `transform.resize {width,height,anchor:"c"}` | ✓ |
| Layout grids | `grid.add {ids, grid:{kind:"columns", count:12, gutter:24, offset:80, align:"stretch", color:"#FF00001A"}}`; `node.set grids:[…]`; `grid.remove {ids,index}` (not drawn in exports) | ✓ |
| Sections | `node.create {type:"section"}`; `object.wrapInSection {ids,name}`; `object.convertToSection`; `section.toggleContents` | ✓ |
| Pages | `page.add {name}` (becomes current), `page.rename`, `page.select {index}`, `page.list`, `page.move`, `page.duplicate`, `page.delete`, `page.setBackground {color}`, `object.moveToPage {ids,page}`; a page named "-" is a divider | ✓ |
| Align / distribute | `align.top|vcenter|…{ids}` (one layer aligns to its parent); `distribute.horizontal {ids,spacing?}`; `arrange.tidy {ids,spacing}`, `arrange.packH`, `arrange.roundToPixels`, `arrange.front|back` | ✓ |
| Guides | `guide.add {vertical:true, offset:80, frame}`, `guide.move` (not readable) | partly |
| Groups vs frames | `object.group {ids,name}` (children x/y stay relative to the group's parent); `object.convertToFrame` (no fill, no clip); `object.frameSelection {ids,name}` (white) | ✓ |
| Corners | `cornerRadius: n | [tl,tr,br,bl]`, `cornerSmoothing: 0–1`, `clip` | ✓ |
| Duplicate | `edit.duplicate {ids, dx, dy, map:true}` → `{ids, map}`; `{"$ref":"d","field":"ids/0"}` | ✓ |
| Copy / paste | `edit.copy`, `edit.paste {parent,x,y}` (across documents too); `edit.copyProperties {id}` / `edit.pasteProperties {ids}` | ✓ |
| Rename | `object.rename`; `object.batchRename {ids, name:"Card/$n"}`; `edit.findReplace {find, replace, layerNames?}` | ✓ |
| Move / parent | `transform.move`; `node.reparent` (keeps page position); `object.resizeToFit`; `frame.swapOrientation`; `transform.rotate {ids,degrees}`; `object.flipH` | ✓ |
| Visibility / lock | `object.toggleVisible {ids,visible}`, `object.toggleLock` | ✓ |
| Select | `select.byName {query, page:"all"}`, `select.layersAt {x,y}` | ✓ |
| Mask | `object.mask {ids}` (mask at the back) → "Mask group" | ✓ |
| Templates | `template.list`; `file.newFromTemplate {template, name?}` — all 8 (mobile-app, landing-page, dashboard, design-system, wireframe-kit, social-posts, slides, icon-set) | ✓ |
| Recolour | `selection.colors {ids}`; `selection.setPaint {targets:[{id, fills:true, index:0, range:null}], paint:"#FF5A36"}`; `style.update {style:"Brand/Primary", value:"#FF5A36"}` | ✓ |
| Image fill | `image.place {path, target:frameId, mode:"fill"}` (cover, over the frame's fills); `image.place {path,parent,width,height}` makes a RECTANGLE | ✓ |
| Icons from SVG paths | `node.create {type:"vector", parent:<24×24 frame>, x:0, y:0, path:"<lucide d>", props:{fill:"none", stroke, strokeWeight:2, strokeCap:"round", strokeJoin:"round"}}`, then `transform.scale {ids:[frame], factor:size/24}` | ✓ |
| Donut | ellipse `arcStart` (deg, 0 = 3 o'clock, clockwise; -90 = top), `arcSweep`, `arcInner:0.74` | ✓ |
| Gridlines | `shape.line {x,y,width,props:{stroke, dashes:[4,4]}}` | ✓ |
| Background blur | `effects:[{type:"backgroundBlur", radius:24}]` | ✓ |
| Default props | `setDefaultProperties` only affects tool-drawn shapes | partly |
| Undo in a run | `edit.undo` reverts the whole script so far | ✗ |

## Gotchas
- Frames default to white + clip, nested too. A preset frame without x/y lands at odd coordinates.
- Default text is Inter Regular 12, black. Single line: `textAutoResize:"widthAndHeight"`. Wrapping:
  `sizingH:"fill"` + `"height"`, or a `width` + `"height"`.
- Truncated text's box is one line tall (sits low in a centred row: use baseline).
- `node.set width` on a hug frame makes it fixed.
- `node.get` field names: `sizing` (not `sizingH`), `layout` (gap, padding and alignment are inside it: there is no `padding` field), `grids`, `absolute`, `arc`, `styles`;
  `outline:true` summarises children (bottom first). Full tree: `figcraft-cli convert x.figcraft x.json`.
- `file.export` with several ids writes ONE PNG of their combined area.
- `file.newFromTemplate` opens a second document; `doc.switch {index}` goes back; `--out` saves the active one.
- Free icon set: open the icon-set template, `node.find {name:"Bell", type:"COMPONENT"}`, `edit.copy`,
  `doc.switch`, `edit.paste` → 24 icons arrive as components.
- Template ids are stable in 0.18.1 (landing-page: Desktop frame 2, Phone 101, hero picture 32); set copy
  with `node.set {characters}`; template text styles name faces "Semi Bold" (with a space).
- Images are embedded at full resolution (a 3840 px JPG → 6 MB file): downscale first.
- Built-in Inter has only Regular, Italic, SemiBold, Bold. Loaded Google fonts register under their real
  family names ("Plus Jakarta Sans"/"ExtraBold"). SF Pro, Avenir Next, Roboto… exist on this Mac only.
- Responsive check: `node.set width/height` on a root screen reflows fill children and keeps constrained bars.

## How the ridgeline examples are built
- Mobile: root = plain clipped frame; "Status bar" horizontal spaceBetween; "Content" vertical gap 20
  padding [10,20,0,20]; "Tab bar" spaceAround with `leftRight`/`bottom` constraints, 86% white + background
  blur 24, over the content.
- Naming: slash names (`Section/`, `Nav/`, `KPI/`, `Tab/`, `Icon/`, `Row/`); every row an auto-layout frame,
  text hugs; icons are 20–24 px `Icon/x` frames holding one stroked vector, colours bound to Light/Dark variables.
- Dashboard: sidebar vertical with a "Grow" frame `sizingV:"fill"` as a spacer pushing the footer down; main
  vertical gap 24; KPI cards fill; charts = a plain "Plot" frame with absolute lines (`leftRight`); table rows
  horizontal auto layout with fixed-width text cells.
- Web: each section full width (padding [88,40]) holding a "Container" `maxWidth:1120`, fill, centred.

## Recipes (in recipes/, each ends with its own file.export)
- `recipes/ui-mobile-screen.json`: "Explore" travel app 393×852 (status bar, header + bell, search + filter, chips
  overflowing, featured photo card with scrim/blurred tag/price chip, 3 trip cards, blurred pinned tab bar).
- `recipes/ui-landing-hero.json`: 1440 hero (nav, eyebrow pill, two-line display headline, 2 CTAs, avatar stack +
  stars, photo with 3 floating cards one blurred, logo strip in 6 fonts).
- `recipes/ui-dashboard.json`: 1440×960 finance dashboard (dark sidebar with spacer + upgrade card, top bar,
  4 KPI cards with sparklines, 12-month bar chart with gridlines + tooltip, donut from arcs + legend,
  transactions table with status pills).
- `recipes/ui-from-template.json`: the landing-page template rebranded (styles updated, copy replaced, photo in,
  floating chip, phone frame deleted).

## Missing vs Figma
strokesIncluded defaults true; undo in a run reverts all; text style `value` overwrites every field;
guides unreadable; setDefaultProperties ignores command-made shapes; maxWidth frames don't wrap hugging
text; images not downsampled; truncated text box one line tall. Untested: network commands,
convertToGroup/ungroup, guide.clear/select, select.area, hideOthers, pasteDesignLayers.
