# Command index: I want to … → the command

Every command here was run on figcraft-cli 0.18.1. The JSON shapes and caveats are in the reference
named in the last column (L layout · DS design-systems · G graphic · P prototyping-handoff · F files).
Anything not here: `figcraft-cli commands --filter <word>` (645 commands, each with its params).

## Documents, pages, frames
| I want to … | Command | Ref |
|---|---|---|
| start empty / from a template | (a fresh run is an empty doc) · `file.newFromTemplate {template}` (`template.list`: mobile-app, landing-page, dashboard, design-system, wireframe-kit, social-posts, slides, icon-set) | L |
| open a file in the run | `file.open {path}` (new active tab, original ids; what `--out` saves) · `--in file.figcraft` | F |
| bring another file's pages in | `file.import {path}` (new ids) | F |
| make a board (FigJam-like) | `file.newBoard {name}` | P |
| a canvas the size of the output | `frame.create {x, y, width, height, name, props}` · `frame.create {preset:"iPhone 16", x, y}` (`frame.presets`) | L |
| pages | `page.add {name}` · `page.rename` · `page.select {index}` · `page.list` · `object.moveToPage {ids, page}` | L |
| sections | `node.create {type:"section"}` · `object.wrapInSection {ids, name}` | L, P |
| several documents in one run | `doc.list` · `doc.switch {index}` | L |

## Layers
| I want to … | Command | Ref |
|---|---|---|
| make a shape / text / vector | `node.create {type, parent, x, y, width, height, text?, path?, name, props}` (types: frame rectangle ellipse polygon star line arrow text vector section component slice) | L, G |
| change anything | `node.set {ids, props}` (MCP: `set_properties`) — keys in `figcraft-cli commands --filter node.set` | all |
| read a layer | `node.get {id, fields?, outline?}` (MCP: `get_node`, `inspect_document`) | L |
| find layers | `node.find {root?, name, type?}` (substring, parents first) · `select.byName {query, page:"all"}` | DS |
| delete | `edit.delete {ids}` (there is no node.delete) | G |
| duplicate / copy-paste | `edit.duplicate {ids, dx, dy, map:true}` · `edit.copy` + `edit.paste {parent, x, y}` · `edit.copyProperties` / `edit.pasteProperties` | L |
| group / frame / mask | `object.group {ids, name}` · `object.frameSelection` · `object.convertToFrame` · `object.mask {ids:[mask, content]}` | L, G |
| order | `node.reorder {id, index}` · `arrange.front` / `arrange.back` | L |
| align / distribute / tidy | `align.left|hcenter|right|top|vcenter|bottom {ids}` · `distribute.horizontal {ids, spacing?}` · `arrange.tidy {ids, spacing}` | L |
| move / resize / rotate / flip | `transform.move` · `transform.resize {width, height, anchor}` · `transform.scale {ids, factor}` · `node.set {rotation}` after creation · `object.flipH` | L, G |
| rename many | `object.batchRename {ids, name:"Card/$n"}` · `edit.findReplace {find, replace, layerNames?}` | L |
| hide / lock | `node.set {visible:false}` / `{locked:true}` · `object.toggleVisible` · `object.toggleLock` | L |

## Layout
| I want to … | Command | Ref |
|---|---|---|
| auto layout | props `layout:"horizontal|vertical|grid"`, `gap`, `crossGap`, `padding`, `mainAlign`, `crossAlign`, `wrap`, `sizingH/V: hug|fill|fixed` · `layout.add {ids, direction}` · `layout.remove` | L |
| a grid | `layout:"grid"`, `gridColumns`, `gridRows`, `columnTracks`, `rowTracks`; children `gridColumn`, `gridRow`, `gridColumnSpan` · `layout.setTrack` | L |
| pin a bar / overlap | child `absolute:true` + `x`, `y`, `constraints` · `reverseZ:true` with a negative gap | L |
| respond to resizing | `constraints:{horizontal, vertical}`; check with `node.set {width, height}` on the root | L |
| layout grid overlay | `grid.add {ids, grid:{kind:"columns", count:12, gutter, offset}}` (not exported) | L |
| measure | `measure.padding {id}` · `measure.distances {ids}` · `devMode.addMeasurement` | L, P |

## Type, colour, pictures, effects
| I want to … | Command | Ref |
|---|---|---|
| use a font | `text.loadFont {path}` then `fontFamily` + `fontStyle` (`text.fonts {family}` lists faces, `axes:true`, `features:true`) · `text.missingFonts {}` | G, F |
| style part of a text | `text.style {id, start, end, fontFamily?, fontStyle?, fontSize?, textFills?, letterSpacing?, fontVariations?}` | G |
| fit text to a box | `text.fit {ids, minSize}` (read `fits`) · `maxLines` · `textAutoResize:"truncate"` | G |
| text on a path / outline text | `text.onPath {text, path, start, flip}` · `vector.flatten {ids:[text]}` | G |
| gradients, several fills | `fills:[…]` (index 0 = bottom) with `linearGradient|radialGradient|angularGradient|diamondGradient`, stops with `position` | G |
| a picture | `image.place {path, parent, x, y, width, height, mode}` · into a shape `{target, mode:"fill"}` · `image.replace` · `image.adjust {preset|filters}` · crop paint `crop:[sx,0,0,sy,tx,ty]` | G |
| a picture inside letters | image hash from `image.place` → `fill.set {ids:[text], paint:{type:"image", image, scale_mode:"fill"}}` | G |
| strokes | `strokes`, `strokeWeight`, `strokeAlign`, `strokeSides`, `dashes`, caps, joins · `stroke.widthProfile` · `stroke.brush` | G |
| shadows, blur, glass, grain | `effects:[dropShadow|innerShadow|layerBlur|backgroundBlur|glass|noise|texture]` | G |
| blend | `blend:"multiply"` (18 CSS names) on a layer or a paint | G |
| booleans / vector edits | `bool.union|subtract|intersect|exclude {ids}` · `bool.flatten` · `vector.outlineStroke` (returns ids) · `vector.offset` · `shapeBuilder.merge` · `vector.edit.*` | G |
| a pattern | `fill.pattern {source, ids, tile, spacing}` | G |
| recolour everything of one colour | `selection.colors {ids}` → `selection.setPaint {targets, paint}` | G, L |
| rasterize | `object.rasterize {ids, scale}` (returns ids) | G |

## Design systems
| I want to … | Command | Ref |
|---|---|---|
| styles | `style.create {type:"paint|text|effect|grid", name, value | from}` · `style.apply {ids, style, target?}` · props `fillStyle` / `textStyle`… · `style.update` (propagates) · `style.detach` · `style.list` | DS |
| tokens / themes | `variable.createCollection {name, modes}` · `variable.create {collection, name, type, values}` · `{"$var": …}` in fill/stroke · `variable.bind {ids, field, variable}` · `variable.setMode {ids, collection, mode}` · `variable.export {format:"css|tailwind|json|dart"}` · `variable.import` | DS |
| components | `component.create {ids}` · `component.addProperty {id, name, type:"text|boolean|instanceSwap", layer}` · `component.combineVariants {ids}` · `component.addVariant` · `component.bindProperty` · slots `component.makeSlot` | DS |
| instances | `instance.create {component, parent, x, y}` · `instance.setProperties {ids, properties}` · `instance.swap` · `component.resetInstance` · `component.detach` · `component.pushChanges` | DS |
| fill copies with data | `data.fill {id, rows:[{<layer name>: value}], gap, dir?, format?}` | DS |
| share between files | `library.publish` (save) → in the other file `library.add {path}` · `library.place` / `library.import` · `library.acceptUpdates` | DS |

## Prototype, handoff, boards
| I want to … | Command | Ref |
|---|---|---|
| link screens | `proto.interaction.add {id, trigger, action, transition, durationMs, easing}` · `proto.flow.add {start, name}` · `proto.settings {device}` | P |
| overlays, variables, conditions | actions `openOverlay` (`position`, `background`, `anchor`) · `setVariable` · `setVariableMode` · `conditional` | P |
| scroll, fixed, sticky | `node.set {overflow:"vertical"}` · `node.set {scrollPosition:"fixed|sticky"}` | P |
| show it clicking | export the screens, then `python3 scripts/proto_to_html.py file.figcraft screens/ out.html 2` (no headless player) | P |
| code for a layer | `inspect.code {id, language:"css|react|tailwind|swiftui|compose|flutter|…"}` · `inspect.properties` · `inspect.componentCode` | P |
| mark for developers | `node.set {devStatus:"readyForDev"}` · `annotation.add` · `devResource.add` · `codeConnect.set` | P |
| comments, versions, branches | `comment.add` / `.reply` / `.resolve` · `file.saveVersion` / `version.list` / `version.restore` · `branch.create` / `.review` / `.merge` | P |
| stickies, flowcharts | `board.sticky` · `board.shape` · `board.connector {from, to, style, label}` · `board.template {name}` · `board.mindMap` · `board.table` | P |

## Export
| I want to … | Command | Ref |
|---|---|---|
| PNG / JPG / WebP | `file.export {ids:[frame], format, scale | size:"512w", quality?, colorProfile?, path}` (one picture of the ids' combined area) | F |
| SVG | `format:"svg"` (text outlined; `svgOutlineText:false` keeps text; angular gradients become radial) | F, G |
| PDF / multi-page deck | `format:"pdf"` (`bleed`, `cropMarks`, `cmyk`) · `file.exportFramesPdf {path}` (every top-level frame a page) | F |
| assets in sizes | `export.add {ids, setting:{size:"2x", format:"png", suffix:"@2x"}}` → `file.exportLayers {ids, dir}` (makes folders) | F |
| other apps | `format:"fig"` (experimental) · `"penpot"` · `"xml"` (Android Vector Drawable) | F |
| the whole file | `--out file.figcraft` (CLI) · `save_file {path}` (MCP) | F |
