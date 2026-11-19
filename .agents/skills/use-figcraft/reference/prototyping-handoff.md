# Prototyping, developer handoff and boards

Proved on figcraft-cli 0.18.1, headless: every row was run and read back with `node.get`, or its export opened.

## Lessons
1. Export in the same run that loaded the fonts; once saved, `info` says "missing font" and the CLI
   `export`/`render` fall back.
2. Every prototype feature is stored and reads back with `node.get` (10 triggers, 11 actions, 8
   transitions, 13 easings, overlays, variables, conditionals, flows). Nothing presents or exports a
   prototype headless (`proto.present` is ok but a no-op; no HTML/player export). Workaround:
   `scripts/proto_to_html.py` builds a clickable HTML page from exported PNGs + the file's interactions.
3. Fixed/sticky: `node.set {props:{scrollPosition:"fixed"|"sticky"|"scrolls"}}` (undocumented); like
   `overflow`, not readable with `node.get` (check the saved file).
4. Boards: make sections FIRST and give their contents `parent`; a later section draws on top. `file.export`
   with no `ids` exports the selection: `select.none` first.
5. A stroked vector icon exports with a 12 px margin unless wrapped in a fixed-size frame. `export.update`
   with a bad index returns ok and does nothing.

## Prototyping
| Feature | Command | |
|---|---|---|
| Click → navigate, smart animate | `{"command":"proto.interaction.add","params":{"id":5,"trigger":{"type":"onClick"},"action":{"type":"navigate","dest":3},"transition":{"type":"smartAnimate"},"durationMs":450,"easing":"easeInOut"}}` → `{index}` | ✓ |
| Shorthand | `{"id":3,"dest":2}` = click-navigate, instant, 300 ms, easeOut (the defaults) | ✓ |
| Triggers | `onClick onHover onPress onDrag mouseEnter mouseLeave mouseDown mouseUp` (+ `"delayMs":150`), `{"type":"afterDelay","ms":2000}`, `{"type":"keyPress","key":"ArrowRight"}`, `"Shift+K"`, `"Gamepad A"` | ✓ |
| Actions | `navigate` (`"preserveScroll":true`), `back`, `changeTo`, `{"type":"scrollTo","dest":5,"offset":[0,80]}`, `{"type":"openUrl","url":"…","openInNewTab":false}`, `openOverlay`, `swapOverlay`, `closeOverlay`, `setVariable`, `setVariableMode`, `conditional` | ✓ |
| Transitions | `instant dissolve smartAnimate`; `moveIn moveOut push slideIn slideOut` + `"direction":"left|right|top|bottom"` | ✓ |
| Easing | `linear easeIn easeOut easeInOut easeInBack easeOutBack easeInOutBack gentle quick bouncy slow`, `{"customBezier":{"x1":0.2,"y1":0.8,"x2":0.2,"y2":1}}`, `{"customSpring":{"mass":1,"stiffness":300,"damping":20}}` | ✓ |
| Modal overlay | `"action":{"type":"openOverlay","dest":4,"position":"center","background":"#00000080","close_on_outside":true}` (also `bottomCenter`, `bottomLeft` …) | ✓ |
| Dropdown under its button | `{"type":"openOverlay","dest":4,"position":"bottomLeft","anchor":"triggerOutside"}` | ✓ |
| Manual overlay | `{"type":"openOverlay","dest":4,"position":"manual","offset":[0,48]}` | ✓ |
| Several actions + conditional | `"actions":[{"type":"setVariable","variable":"count","expression":"count + 1"},{"type":"conditional","blocks":[{"expression":"count >= 3","actions":[{"type":"navigate","dest":4}]},{"actions":[{"type":"setVariable","variable":"done","value":true}]}]}]` | ✓ |
| Variable mode | `{"type":"setVariableMode","collection":"Proto","mode":"Dark"}` | ✓ |
| Edit actions | `proto.action.add {id,index,action}` → `{path:[2]}`; in a block `path:[1,1,0]`; `proto.action.move {id,index,path:[2],to:0}`; `proto.action.set {id,index,path:[0],action}` (replaces the whole action) | ✓ |
| Else-if | `proto.conditional.addBlock {id,index:0,path:[1],expression:"count == 2"}` | ✓ |
| Evaluate | `proto.evaluate {expression:"count + 1"}`, `"mode(Proto) == 'Dark'"` | ✓ |
| Patch / remove / clear | `proto.interaction.set {id,index:1,trigger:{type:"onPress"},durationMs:120}`, `proto.interaction.remove {id,index}`, `proto.interaction.clear {ids:[2]}` | ✓ |
| Replace all | `node.set {props:{interactions:[{trigger:{type:"onClick"},actions:[{type:"navigate",dest:4}],transition:{type:"smartAnimate"},duration_ms:500,easing:"gentle"}]}}` (stored format, snake_case) | ✓ |
| Flow | `proto.flow.add {start:2,name:"Onboarding"}`; description via `proto.flow.rename {start:2,name,description}`; `proto.flow.remove {start}` | ✓ |
| Device | `proto.settings {device:"iPhone 16",background:"#111114",rotation:"portrait",color:"Black"}`; `{width:393,height:852,responsive:true}` = Custom size; `{}` reads | ✓ |
| Scrolling | `node.set {props:{overflow:"vertical"}}` (`none|horizontal|vertical|both`) on a frame taller than the device | ✓ (not readable) |
| Fixed / sticky | `node.set {props:{scrollPosition:"fixed"}}` (`scrolls|fixed|sticky`) | ✓ (undocumented) |
| Present / preview | `proto.present`, `proto.preview`, `proto.presentOptions`… | partly: no-op headless |
| Prototype export | none | ✗ → `python3 `scripts/proto_to_html.py` file.figcraft screens/ out.html 2` |

## Handoff
| Feature | Command | |
|---|---|---|
| Code | `inspect.code {id, language}`: css html react vue tailwind swiftui compose flutter arkui leptos; `unit:"rem",rootFontSize:16`; bound variables → `var(--color-brand, #0E7C66)` | ✓ |
| Properties | `inspect.properties {id,colorFormat:"hex"}` | ✓ |
| Component code | `inspect.componentCode {id,language:"react"}` | ✓ |
| Assets | `inspect.assets {ids}`; `file.exportLayers {ids,assets:true,dir}` (icons SVG, images PNG; `/` in names → folders) | ✓ |
| Status | `node.set {props:{devStatus:"readyForDev"|"completed"}}`; `inspect.readyForDev {status}`; `dev.resolveChange {ids,reason}`; `dev.compare {id[,version:"<id>"]}`; `dev.focus` / `dev.unfocus` | ✓ |
| Annotations | `annotation.addCategory {name,color}` → `custom-1`; `annotation.add {id,text,properties:["height","cornerRadius","fill","fontSize"],category}`; `annotation.list {page:"all"}`; `.edit .remove .removeCategory` | ✓ |
| Dev resources | `devResource.add {id,url,name}`, `.list .edit .remove` | ✓ |
| Measurements | `devMode.addMeasurement {from,to}` or `{from,side:"left"}`; `devMode.measurements`; `.removeMeasurement` | ✓ |
| Code Connect | `codeConnect.set {id,language:"react",importPath,name,template:"<Button variant={style}>…</Button>"}`; `codeConnect.export {path}` / `.import {path}` / `.remove` | ✓ (local) |
| Comments | `comment.add {x,y,text,anchor,author}`, `.reply .edit .react .resolve .move .markRead .next .people .list {page:"all"} .delete {id,author}`; `@Name` parsed | ✓ |
| Versions | `file.saveVersion {name,description}` → `{id}`; `version.list .rename .restore {index} .preview .exitPreview .autosave .duplicate` | ✓ |
| Branches | `branch.create {name}` → edits → `branch.review` → `branch.merge` | ✓ |
| Diff | `collab.diff {against:"saved"}` (local) | ✓ |

## Boards
| Feature | Command | |
|---|---|---|
| New board | `file.newBoard {name}` (design commands refuse in boards and vice versa) | ✓ |
| Sticky | `board.sticky {x,y,text,color:"yellow",author:"Research"|false,parent}` (200×200) | ✓ |
| Shape + text | `board.shape {shape:"diamond",x,y,width,height,text,color,parent}` (24 shapes) | ✓ |
| Connector | `board.connector {from,to,style:"straight"|"elbow"|"curved",fromSide,toSide,label:"Yes",endCap:"triangleArrow"}`; `board.label`, `board.reattach`, `board.setStyle` | ✓ |
| Quick build | `board.nextSticky {id,side}`, `board.addConnected`, `board.mindMap {x,y,text,children}`, `board.table {x,y,cells}`, `board.tableEdit`, `board.template {name:"flowChart"|"retrospective"|"brainstorm"|"weeklyPlanner"|"kanban",x,y}` | ✓ |
| Extras | `board.stamp {x,y,stamp}`, `board.ink {points,color}`, `board.setColor`, `board.timer`, `board.vote`, `board.voteResults`, `board.grid` | ✓ |
| Sections | `node.create {type:"section",x,y,width,height,name}` or `object.wrapInSection {ids,name}` | partly: make first; titles don't render in exports |

## Gotchas
- `file.export {path}` doesn't create folders; `file.exportLayers {dir}` does.
- `proto.flow.add` refuses `description` (use `proto.flow.rename`).
- `proto.settings` with an unknown device lists the 21 valid ones.
- `node.get {fields}` takes only its own key list; `overflow`/`scrollPosition` aren't readable.
- `dev.compare {version}` needs the version id, not an index.
- Annotations/measurements mark a ready-for-dev frame "changed".
- Code Connect: `variant={style}`, not `"{style}"`.
- Vector paths sit at their own coordinates (`M25 15` lands at 25,15).
- A wrong font face falls back silently: look at the export.
- Z-order = creation order: make backgrounds first, footers last.
- Export an area with layers that aren't its children: a backdrop frame at `index:0`, `contentsOnly:false`.
- `render` crops tight to content.

## Recipes (in recipes/)
- `recipes/proto-onboarding.json` (119 steps): Calmly app, 3 screens 393×852 + bottom-sheet overlay; Next/Back smart animate 550 ms (shared layer names tween), Skip dissolves, arrow keys, Start opens the sheet; flow + iPhone 16. Outputs `out/recipe-onboarding/` (screens @2x, PDF, .figcraft, .fig, clickable HTML).
- `recipes/ux-user-flow-board.json` (39 steps): checkout user-flow board (3 sections, shapes, stickies, 10 labelled connectors, stamps).
- `recipes/deck-pitch.json` (109 steps; needs the onboarding recipe's screen PNG): 5-slide 1920×1080 seed deck (Instrument Serif + Jost) → one 5-page PDF + PNGs.
- `recipes/export-icon-set.json` (19 steps): 24 px line bell + 64 px gradient app icon with export settings → SVG, PNG @1x/@2x/@3x, Vector Drawable via one `file.exportLayers`.

## Missing vs Figma / FigJam
No headless prototype playback or HTML/video/share export; fixed/sticky and overflow not readable;
section titles don't render; `export.update` bad index silent; `.fig`/Penpot export loses some prototype
details; boards have no sticky auto layout, connectors draw over stickies; no widgets without a plugin;
no media triggers; `proto.present` and `view.*` are no-ops headless.

## The ridgeline examples
- onboarding: 1 page, 4 frames, flow "Onboarding", iPhone 16, 6 interactions (push left 400 ms easeOut, back instant, dissolve, moveIn from top).
- app: a "Components" section (component sets Landscape, Chip, Button with `Style=Primary` variants; Trail card, Trail row), Home Light/Dark + Trail frames, 17 Light/Dark variables, one annotation, one readyForDev frame.
- design-system: one 1440×3007 frame, 29 styles, 45 components. dashboard: 1440×960 with layout grids, 15 styles. glass-and-vectors: 2 frames with booleans. All Inter; icons named `Icon/search`.
