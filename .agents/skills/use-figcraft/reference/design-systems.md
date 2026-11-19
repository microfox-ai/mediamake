# Design systems: styles, variables, components, instances, libraries

Proved on figcraft-cli 0.18.1, headless: every row was run and read back (node.get / style.list / variable.list) or looked at in a PNG.

## 1. Styles

| Feature | Working JSON | Status |
|---|---|---|
| Paint style (solid) | `{"command":"style.create","params":{"type":"paint","name":"Brand/Primary","value":"#4F46E5"}}` → `{id:"S:1"}`. `value` may also be a paint list `[{"type":"solid","color":"#4F46E5"}]` | ✓ |
| Paint style (gradient) | `"value":[{"type":"linearGradient","stops":["#4F46E5","#EC4899"],"from":[0,0],"to":[1,1]}]` | ✓ |
| Text style | `{"type":"text","name":"Heading/H1","value":{"fontFamily":"Inter","fontStyle":"Bold","fontSize":40,"lineHeight":"120%","letterSpacing":"-2%"}}` (node.set spellings) | ✓ |
| Effect style | `{"type":"effect","name":"Elevation/2","value":[{"type":"dropShadow","color":"#0F172A33","offset":[0,8],"radius":24}]}` | ✓ |
| Grid style | `{"type":"grid","name":"Grid/12 col","value":[{"kind":"columns","count":12,"gutter":24,"offset":32,"align":"stretch","color":"#FF000019"}]}` — the key is `kind` (columns/rows/grid) and `align`; `pattern`/`alignment` are silently ignored (you get a 10 px square grid) | ✓ |
| Text style + variable fill | a layer can take a `textStyle` and a `{"$var": …}` fill together: the style sets the type, the variable the colour, and the fill re-themes with the mode | ✓ |
| Apply at create time | node props `"fillStyle":"Brand/Primary"`, `"strokeStyle":"…"`, `"effectStyle":"…"`, `"textStyle":"…"` (name or `S:n` id) inside `node.create`/`node.set` props | ✓ |
| Apply later | `{"command":"style.apply","params":{"ids":[5],"style":"Brand/Primary","target":"stroke"}}` (target fill default); effect/grid/text styles need no target | ✓ |
| Text style on a char range | `{"command":"style.apply","params":{"ids":[7],"style":"Heading/H1","start":15,"end":19}}` — end is exclusive; `node.get` → `textStyleRanges: [[0,15,"S:4"],[15,19,"S:3"],…]` | ✓ |
| Read a layer's links | `node.get {id, fields:["styles"]}` → `styles:{fill,stroke,effect,grid,text}` (ids or null; the key is left out when all are null) | ✓ |
| Update + propagate | `{"command":"style.update","params":{"style":"Brand/Primary","value":"#059669","description":"…"}}` — every linked layer (fill, stroke, effect, grid, text, char ranges) changed at once; auto-size text re-measured | ✓ |
| Detach | `{"command":"style.detach","params":{"ids":[3],"which":"fill"}}` (fill/stroke/effect/grid/text; text takes start/end) — values stay, link goes | ✓ |
| Implicit detach | any `node.set` of a styled property (e.g. `stroke`) unlinks that style | ✓ |
| List | `{"command":"style.list","params":{"type":"paint"}}` (type optional) — colours come back as 0–1 floats, not hex | ✓ |
| Duplicate / move to folder / rename folder | `style.duplicate {style}` → `{id}` "<name> copy"; `style.move {styles:["S:7"], folder:"Archive"}`; `style.renameFolder {folder:"Brand", name:"Color/Brand"}` renames every style in it | ✓ |
| Delete | `style.delete {style}` — layers keep the look, link removed | ✓ |

Not in exports: layout grids (they are editor overlays — a grid style shows up in `node.get grids` but never in a PNG).

## 2. Variables

| Feature | Working JSON | Status |
|---|---|---|
| Collection with modes | `{"command":"variable.createCollection","params":{"name":"Theme","modes":["Light","Dark"]}}` → `{id:"VariableCollectionId:1"}`; mode ids are `<collection id>/mode1…` | ✓ |
| Colour variable per mode | `{"command":"variable.create","params":{"collection":"Theme","name":"bg","type":"color","values":{"Light":"#FFFFFF","Dark":"#0B1220"}}}` → `{id:"VariableID:1"}` | ✓ |
| Same value in every mode | `"value":"#6366F1"` (fills all modes) | ✓ |
| Number / string / boolean | `"type":"number","values":{"Comfortable":24,"Compact":12}` · `"type":"string","values":{"Light":"Good morning","Dark":"Good evening"}` · `"type":"boolean","values":{"Light":false,"Dark":true}` | ✓ |
| Alias | `"values":{"Light":{"alias":"brand/500"},"Dark":"#A5B4FC"}` (per mode; or `variable.set {variable, mode, value:{"alias":"brand/500"}}`) | ✓ |
| Colour with alpha of another | `"value":{"alpha":{"variable":"accent","opacity":0.15}}` → follows accent in every mode (#6366F126 / #A5B4FC26) | ✓ |
| Colour mix | `"value":{"mix":{"from":{"variable":"bg"},"to":{"literal":"#000000"},"t":0.25}}` | ✓ |
| Bind fill/stroke at create | node props `"fill":{"$var":"Theme/bg"}`, `"stroke":{"$var":"accent"}` (id, unique name, or `Collection/name`) | ✓ |
| Bind any other field | `{"command":"variable.bind","params":{"ids":[2],"field":"gap","variable":"space/gap"}}`. Proved: `gap`, `crossGap`, `padding` (all 4), `paddingHorizontal`, `paddingVertical`, `paddingTop/Bottom`, `cornerRadius`, `width`, `height`, `minWidth`, `opacity` (percent: a value of 30 gives 0.3), `strokeWeight`, `visible` (boolean), `characters` (string), `fontSize`, `fontFamily` (string), `fontStyle` (string), `fontWeight` (number → face, 40 gave "Thin"), `letterSpacing`, `lineHeight`, `paragraphSpacing`, `fills/0/color`, `effects/0/color`, `effects/0/radius`, `effects/0/offsetY`, `x`, `rotation` | ✓ |
| Unbind | `variable.bind {ids, field:"gap", variable:null}` (gap left `boundVariables`, value kept) | ✓ |
| Read bindings | `node.get {id, fields:["boundVariables"]}` → `{"gap":"VariableID:9",…}`; `inspect.properties {id}` shows each value with its `token` name | ✓ |
| Set a frame's mode (children re-theme) | `{"command":"variable.setMode","params":{"ids":[7],"collection":"Theme","mode":"Dark"}}` — fills, strokes, text, sizes, padding, visibility of every descendant re-resolve; verified in PNG (Light card + Dark/Compact duplicate) | ✓ |
| Back to Auto | `variable.setMode {ids, collection, mode:null}` (inherits parent/page → default mode) | ✓ |
| Change a value, layers follow | `{"command":"variable.set","params":{"variable":"bg","mode":"Light","value":"#FEF3C7"}}` | ✓ |
| Modes | `variable.addMode {collection, name, from}` → `{id}`; `variable.renameMode {collection, mode, name}`; `variable.moveMode {collection, mode, to}` (0 = default); `variable.removeMode {collection, mode}` | ✓ |
| Metadata | `variable.update {variable:"bg", description, scopes:["FRAME_FILL"], codeSyntax:{"WEB":"--color-bg"}}`; `variable.duplicate` → "<name> copy"; `variable.renameCollection` | ✓ |
| Export | `variable.export {format:"json"|"css"|"tailwind"|"dart", collections?:["Spacing"], path?}` — css: default mode on `:root`, others on `[data-theme="Dark"]`, aliases as `var(--brand-500)`, codeSyntax WEB used as the name; tailwind: `@theme static` with `--color-*`, `--spacing-*`, `--radius-*`, `--text-*`; dart: one class per mode | ✓ |
| Import | `{"command":"variable.import","params":{"variables":"/abs/path/vars.json"}}` → `{collections, variables, updated, warnings}`; importing again merges by name (`updated: 14`) | ✓ |
| Import hand-written tokens | Figma REST shape: `{"variableCollections":{"c1":{"id":"c1","name":"Brand","modes":[{"modeId":"m1","name":"Light"},{"modeId":"m2","name":"Dark"}],"defaultModeId":"m1"}},"variables":{"v1":{"id":"v1","name":"surface","variableCollectionId":"c1","resolvedType":"COLOR","valuesByMode":{"m1":{"r":1,"g":1,"b":1,"a":1},"m2":{…}}}}}` (object inline or a path). Colours must be 0–1 rgba objects: hex strings are skipped with a warning. `FLOAT`, `STRING`, `BOOLEAN`; alias `{"type":"VARIABLE_ALIAS","id":"v1"}` | ✓ |
| Extended collection | `variable.extendCollection {collection:"Theme", name:"Theme (Brand B)"}` makes copies of every variable (new ids, `extends`); `variable.set {variable:"VariableID:15", mode:"Light", value}` overrides, `variable.resetOverride` restores. Only layers bound to the **extension's** variable ids see the override; setting the extension's mode on a frame does not re-theme layers bound to the base collection | partly |
| Delete | `variable.delete {variable}` — aliases to it take its values, bound layers keep their colour; `variable.removeMode {collection, mode}`; `variable.deleteCollection {collection}` → `{deletedVariables:5}`, layers keep values (padding 32 stayed) but lose the bindings | ✓ |
| Token edits reach the page | in recipe-foundations: `variable.set {variable:"space/8", value:200}` → bar width 200; `radius/md` 30 → corner 30; `indigo/600` → `#7C3AED` reached a chip bound to `action/primary` (an alias of indigo/600) | ✓ |
| Variables inside styles | `{"command":"style.bind","params":{"style":"Surface","field":"fill","variable":"surface"}}` (also `effects/0/color`, text `fontSize`…); a frame set to Dark shows the style's fill/shadow/size in Dark; `style.list` shows `bound` | ✓ |
| Style from a layer | `style.create {type:"paint"|"effect", name, from: <node id>}` copies its fills (a gradient came through with its stops) / effects (an inner shadow) | ✓ |

Gotchas: `variable.set` and `variable.bind` take a variable **id or bare name** (`"space/pad"`); `"Collection/name"` works only inside `{"$var": …}` — in both `variable.set` and `variable.bind` it fails with "no such variable". Once two collections have the same variable name (e.g. after extendCollection), a bare name is an error ("ambiguous variable `bg`: Theme (Brand B)/bg, Theme/bg") — use `Collection/name` in `$var` or the `VariableID:n`. **`variable.bind` accepts any field string**: a typo like `"bogusField"` returns ok and binds nothing visible — always read the value back. `node.get` doesn't report which mode a frame is set to (no `explicitVariableModes` field); read the resolved values instead.

## 3. Components and instances

| Feature | Working JSON | Status |
|---|---|---|
| Component from a frame | `{"command":"component.create","params":{"ids":[2]}}` → `{id:2}` (same id; the frame becomes COMPONENT in place, children keep ids) | ✓ |
| Component directly | `node.create {type:"component", x, y, width, height, name, props}` | ✓ |
| Several at once | `component.createMultiple {ids:[a,b]}` → `{ids}` (each one its own component) | ✓ |
| Text property | `{"command":"component.addProperty","params":{"id":2,"name":"Label","type":"text","layer":4}}` | ✓ (see gotcha) |
| Boolean property | `{"id":2,"name":"Show icon","type":"boolean","layer":3,"default":true}` (drives the layer's visibility) | ✓ |
| Instance-swap property | `{"id":4,"name":"Icon","type":"instanceSwap","layer":<nested instance id>,"preferred":[2,3]}`; switch with `instance.setProperties {ids:[10], properties:{"Icon":3}}` (component id) | ✓ |
| Read properties | `component.properties {id}` → `[{name,type,default,options?,preferred?,value?}]` (`value` when id is an instance) | ✓ |
| Rename property | `component.editProperty {id, name:"Show icon", newName:"Has icon"}` (instances keep values) | ✓ |
| Instance | `{"command":"instance.create","params":{"component":2,"x":0,"y":100,"parent":<frame>}}` → `{id}`; children get fresh sequential ids (instance id+1, +2…) | ✓ |
| Set properties | `{"command":"instance.setProperties","params":{"ids":[8],"properties":{"Label":"Buy now","Show icon":false}}}` | ✓ |
| Override fills / child props | `node.set` on the instance or on its child ids (`node.find {root:<instance>, name:"Label"}` to get them); `node.get {fields:["overrides"]}` → `["fills"]` | ✓ |
| Main → instances | fill, radius, font size, layout edits on the main reach every instance; an instance's overridden field (red fill, yellow label) is kept while others update; nested main edits (icon colour) reach instances of instances | ✓ |
| Reset | `component.resetOverride {id, group:"fills"}` → `{changed:true}` (`group` is one of the docs' list — fills, strokes, effects, characters, props, visible, size, component…; only `fills` and `component` tested; the docs say omitting it resets all); `component.resetInstance {ids}` resets all (also property values) | ✓ |
| Detach | `component.detach {ids:[5]}` → instance becomes a FRAME, look kept | ✓ |
| Push instance edits to main | `component.pushChanges {id:<instance>}` → `{layers:n}` | ✓ |
| Go to main | `component.goToMain {id}` → `{id:<main>}` | ✓ |
| List | `component.list {}` → `[{id,name,type,page,instances,folder,label}]` | ✓ |
| Variants | name each component `"Style=Primary, Size=md"`, then `{"command":"component.combineVariants","params":{"ids":[2,4]}}` → `{id:<set>}`. Properties come from the names: `component.properties {id:<set>}` → `Style [Primary, Secondary]`, `Size [md]` | ✓ |
| Add a variant | `component.addVariant {id:<variant>, property:"Size", value:"sm"}` → `{id}` (a copy named "Style=Primary, Size=sm") | ✓ |
| Instance of a set / switch variant | `instance.create {component:<set id>}` gives the default (first) variant; `instance.setProperties {ids, properties:{"Style":"Secondary"}}` swaps to that variant (`mainComponentName` changes); or `instance.create {component:<variant id>}` | ✓ |
| Swap | `{"command":"instance.swap","params":{"ids":[13],"component":3}}` — top-level or nested instance (`mainComponentName` changes). On a nested instance bound to an instance-swap property the swap shows, but the outer instance's `componentProperties` keeps the old component id — prefer `instance.setProperties {"Icon":3}` there | ✓ |
| Drive properties by variables | `variable.bind {ids:[instance], field:"componentProperties/Title", variable:"fav"}` (string → text prop, boolean → boolean prop); frame mode DE turned "Favourite" into "Favorit" | ✓ |
| Nested instance properties | `component.exposeInstance {id:<nested instance inside the main>}`; `instance.exposed {id:<outer instance>}` → `[{id:19,name:"Badge"}]`; set with `instance.setProperties {ids:[19], properties:{"Count":"9+"}}` (the nested copy's id) | ✓ |
| Slots | `component.makeSlot {id:<frame inside main>, name:"Content", preferred:[13]}`; `instance.slotInsert {id:<instance>, slot:"Content", component:13}` → `{id, slot}` (repeat to stack; `replace:true` clears first); `instance.resetSlot` | ✓ |
| Reset / remove slot | `instance.resetSlot {id:<instance>, slot:"Content"}` → `{changed:true}`; `component.removeSlot {id:<slot frame>}` (property gone) | ✓ |
| Delete property | `component.deleteProperty {id, name}` | ✓ |
| Hide from library | `component.hideWhenPublishing {ids, on:true}` → renames to ".Badge" | ✓ |
| Drop at a point | `instance.place {component, x, y}` (centred on the point, into the frame under it); `instance.swapAt {component, x, y}` swaps the instance under that point — fails with "there is no instance at that point to swap" if the point misses it | ✓ |
| Deleted main | `edit.delete` a main: its instances keep their look (`mainComponentName: null`); `component.restoreMain {id:<instance>}` makes that instance the main again | partly — on an instance nested inside another main it put a main inside that main and turned the copies inside its instances into separate "Icon/Star" components (3 in `component.list`); restore from a top-level instance |

Component gotchas proved:
- **Property defaults are copied into each instance when it is created.** Changing a text property's default (`component.editProperty {default}`), a boolean default, or the main's bound text layer does not reach existing instances (they keep the old value); new instances get the new default. The main's own text doesn't follow a new default either. Settle defaults before making instances, or set each instance with `instance.setProperties`. Text and visibility NOT bound to a property propagate from the main as expected.
- `node.set {characters}` on an instance child overrides the text but leaves the instance's `componentProperties` value stale; set text through `instance.setProperties` when there is a property.
- `combineVariants` names the set "Component 1" (rename with `node.set {name}`), gives it the purple dashed outline (`strokes #9747FF`, `dashes [10,5]`) which is exported in PNGs, and keeps the variants where they were (no auto layout): lay the set out yourself.
- Frames clip their children by default (`clip:true`), so a badge hanging off an avatar is cut off: set `clip:false`.

## 4. Libraries between local files (no server)

| Feature | Working JSON | Status |
|---|---|---|
| Publish | in file A: `{"command":"library.publish","params":{"description":"v1"}}` → `{id:"7f05ec834d34ec0b", version:1, components, styles, collections, variables}`; then save (`--out lib-A.figcraft`). Library name = the document name ("Untitled" until the file is saved under a name) | ✓ |
| What would publish | `library.list {assets:true}` → `publishable` + `published` | ✓ |
| Enable in file B | `{"command":"library.add","params":{"path":"/abs/lib-A.figcraft"}}` → its components, styles, collections, variables | ✓ |
| Place an instance | `library.place {library, component:"Pill", x, y}` → `{id, component, parent}` (dropped into the frame under the point) | ✓ |
| Import main, then instances | `library.import {library, component:"Pill"}` → `{component:4}` (read-only local copy); then `instance.create {component:{"$ref":"imp","field":"component"}}` | ✓ |
| Apply library style | `library.applyStyle {library, style:"Shadow/md", ids}` | ✓ |
| Bind library variable / set its mode | `library.bindVariable {library, variable:"surface", field:"fill", ids}`; `library.setVariableMode {library, collection:"Theme", mode:"Dark", ids}` → fill resolved #111827 | ✓ |
| Library variables | `library.importVariable {library, variable}` → `{variable:"<libid>:VariableID:2"}`; `library.aliasVariable {library, alias:"ink", variable:"text/primary"}`; `library.extendCollection {library, collection:"Theme", name}` | ✓ |
| Updates | edit A, `library.publish` again (version 2), save; in B `library.updates {}` lists changed component + style; `library.acceptUpdates {}` → instances in B turned pink with the new radius | ✓ |
| Remove | `library.remove {id}` | ✓ |
| Server commands | `library.publishToServer`, `library.check`, `library.usage`, `collab.*` | untested (network) |

Gotcha: refer to an enabled library by its **id** (or path). The name is the one it had when added ("Untitled" if published before saving), so `"library":"lib-A"` failed with "no enabled library `lib-A`" even though `library.updates` reported the new name.

## 5. Data, code, playground

| Feature | Working JSON | Status |
|---|---|---|
| Fill copies with data | `{"command":"data.fill","params":{"id":<frame or instance>,"rows":[{"title":"Starter","price":"$9 / mo","bar":{"fill":"#34D399"},"name":"plan-starter"},{"price":{"text":"$29 / mo","fill":"#DB2777"}},{"bar":{"visible":false}}],"gap":24,"dir":"/abs/out","format":"png"}}` → `{ids, missing, files}` — keys are layer names; copies of an instance stay instances (overrides), placed in a row to the right of the template (which stays); a long title wrapped and the auto-layout card grew | ✓ |
| Component playground | `component.playground {id:<set/instance>, properties:{"Style":"Secondary"}, language:"react", path:"/abs/pg.png", scale:2}` → React + CSS with variant props (`data-style`), PNG of that variant; document unchanged | ✓ |
| Code of a layer | `inspect.code {id, language:"css"}` (css, html, react, vue, tailwind, swiftui, compose, flutter…); `inspect.componentCode {id}` | ✓ |

## 6. More rules proved while building the recipes

- **Shared properties across a whole variant set**: `component.addProperty {id:<a layer inside one variant>, name:"Label", type:"text"}` creates it on the set and binds that layer; bind the same layer in every other variant with `component.bindProperty {layer:<id>, property:"Label", field:"characters"}` (`field:"visible"` for booleans). Then `instance.setProperties {"Variant":"Ghost","Size":"sm","Label":"Share","Show icon":false}` mixes variant and other properties in one call.
- **A component set can be an auto-layout grid**: `node.set {ids:[set], props:{layout:"grid", gridColumns:6, gridRows:3, columnTracks:[164,164,…], rowTracks:[76,76,76], gap:0, padding:20, sizingH:"hug", sizingV:"hug"}}` plus `gridAlignH/gridAlignV:"center"` on each variant. Variants fill the cells in creation order (row by row), so create them in the order you want them read. Without hug sizing the set keeps its old size and clips the last rows.
- Fixed tracks let you put row/column labels **outside** the set (in the parent frame) at computed x/y — the set itself may only hold variants.
- `component.editProperty {name:"Size", default:"md"}` on a variant property worked in a free-form set (default moved to Secondary) but did nothing in the grid set (default stayed `sm`): the default variant is the first child. Put the default variant first, or always pass every variant property on `instance.setProperties`.
- **Image "property"**: Figma has none, and neither does Figcraft. Put an image layer in the main (`image.place {path, parent, width, height, name:"Image", mode:"fill"}`), then per instance `node.find {root:<instance>, name:"Image"}` → `image.replace {ids:[<that id>], path}`; it shows as an override (`overrides:["fills"]`) and survives later main edits (radius change).
- `node.find` names are case-insensitive **substrings** and return parents before children: `name:"Tag"` finds "Tag chip" first, `name:"Author"` finds the "Author" row frame before the "Author" text. Add `type:"TEXT"` (or use unique names) before `field:"ids/0"`.
- `sizingV:"fill"` children inside a **hug** horizontal auto layout collapse to nothing (the cards vanished from the PNG, no error). Give the row a fixed height (`sizingV:"fixed"`) when children should stretch to equal heights.
- Ellipse arcs make progress rings: `{"arcInner":0.84}` track + `{"arcInner":0.84,"arcStart":-90,"arcSweep":240}` (degrees, clockwise from the top at -90).
- Inter (built in) has only Regular, Italic, SemiBold, Bold (`text.fonts {family:"Inter"}`); `fontStyle:"Medium"` is accepted without an error even though that face isn't there — check faces with `text.fonts` first. Loaded static files give one face each, named by weight ("ExtraBold", "Black"…).

## 7. Script-writing rules (apply to every recipe)

- A run is all-or-nothing: the first failing step rolls everything back and prints `{"ok":false,"error":…}` — fix and rerun the whole script. Unknown params fail (`node.get` takes only `id, fields, outline`; there is no `depth`).
- Name steps with `"as"` and use `{"$ref":"name"}`; `{"$ref":"dup","field":"ids/0"}` for commands that return `{ids:[…]}` (`edit.duplicate`, `node.find`, `component.createMultiple`), `{"$ref":"imp","field":"component"}` for `library.import`.
- Long recipes are easiest to write from a small generator (helpers for frame / text / vector / set / bind / export, then dump the list as JSON). Recipes of 146–537 steps run in about a second, pictures included.
- Use absolute paths for `text.loadFont` and `file.export` so a recipe runs from any folder (`file.export` paths are relative to the shell's cwd otherwise).
- Recolouring an instance's nested layer: `node.find {root:<instance>, name, type}` → `node.set {ids:[{"$ref":"x","field":"ids/0"}], props:{fill}}`.
- `edit.duplicate {ids:[frame]}` of a frame inside an auto layout puts the copy right after it in the same layout; that plus `variable.setMode` on the copy is the cleanest Light/Dark pair.

## 8. Recipes (in recipes/; each ends with its own `file.export`)

| Recipe | What it builds | Proves |
|---|---|---|
| `recipes/ds-button-set.json` → `recipe-buttons.png` (1440×1429) | "Lumen UI" Button sheet: 14 paint, 2 text, 2 effect styles; an 18-variant set (Primary/Secondary/Ghost × Default/Hover/Disabled × sm/md) laid out as a 6×3 auto-layout grid with row/column headers outside it; Properties / Sizes / Tokens cards; 8 instances in a dialog (red fill override), a ghost toolbar (sm, one Disabled) and a dark hero (nested label override) | styles on components, variant naming, shared text+boolean props across variants, grid sets, overrides |
| `recipes/ds-card-component.json` → `recipe-cards.png` (1440×1949) | "Field Notes" Story card: main (image, tag chip, title, excerpt, byline) with 8 text props + "Show excerpt"; property sheet; 6 instances in a 3-column grid, each with its own picture (`image.replace`), copy, chip colours, one with the excerpt hidden, one fully dark via nested fill overrides | text/boolean properties, image override, nested overrides, no detaching |
| `recipes/ds-light-dark-themes.json` → `recipe-themes.png` (1440×1228) | "Pulse" habit-app screen (status bar, greeting, progress ring, week strip, habit list, tab bar) on a stage; the stage is duplicated and set to Dark | 19 colour + 2 string variables in Light/Dark; one `variable.setMode` re-themes every fill, stroke, the greeting text and the caption |
| `recipes/ds-foundations.json` → `recipe-foundations.png` (1440×3390) | "Lumen UI" Foundations: 4 ramps × 10 swatches with step + hex, 8 semantic aliases (→ primitive + hex), 9-row type scale, spacing bars, 7 radii, 3 elevations | 41 colour variables + aliases, 16 number variables bound to `width` / `cornerRadius`, 9 text styles, 3 effect styles — the page follows token edits |


## 9. Missing or broken compared with Figma

1. **Property defaults don't propagate** (biggest gap): editing a text or boolean property's default, or the main's bound text, leaves existing instances on the old value. Figma updates every instance that hasn't overridden it.
2. **`variable.bind` accepts any field name** (`"bogusField"` → ok, nothing bound visibly). Figma's API rejects unknown fields.
3. **No read-back of a frame's mode**: `node.get` has no `explicitVariableModes`/modes field; you can only infer it from resolved values (`inspect.properties` shows values + token names).
4. **Extended collections**: overrides only reach layers bound to the extension's own variable copies; setting the extension's mode on a frame didn't re-theme layers bound to the base collection, so it works as "a linked copy of the collection" rather than a drop-in brand theme.
5. `component.editProperty {default}` on a variant property did nothing in an auto-layout (grid) set; default = first child.
6. `instance.swap` on a nested instance that an instance-swap property controls leaves the outer `componentProperties` stale.
7. `component.restoreMain` on an instance nested inside another main creates duplicate mains inside that main's instances.
8. No image component property (same as Figma) — use `image.replace` overrides.
9. `variable.import` needs Figma-REST rgba (0–1) colours; hex strings are skipped with a warning.
10. Names: `combineVariants` always names the set "Component 1"; a library added before its file was saved keeps the name "Untitled" in the consuming file (use its id).
11. Not tested (network/server): `library.publishToServer`, `library.check`, `library.usage`, `collab.*`. Layout grids and the component-set outline: grids never export (like Figma), the set's dashed purple outline does export.

No command crashed or hung during these tests; every failure was a clean, rolled-back error message.
