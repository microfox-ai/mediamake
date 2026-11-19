---
name: use-figcraft
description: Do any graphic or UI/UX design in Figcraft, the open-source Figma-like editor, through its MCP server or its command line (figcraft-cli) — graphic work (posters, YouTube thumbnails and channel banners, Instagram posts and carousels, logos, icon sets, app icons, pitch decks and slides as PDF) and product design (phone and web screens, landing pages, dashboards, wireframes, design systems with styles, variables, Light/Dark themes, components and variants, clickable prototypes, user-flow boards, developer handoff with code and annotations), exported as PNG, JPG, WebP, SVG, PDF, Android XML or .fig, and handed to the user in the FigCraft app to change by hand, then brought back. Nineteen proven recipes to start from, and references for every feature. Also how other skills rebuild a finished design there (create-thumbnail's final edit is `mm thumbs figcraft`). Use when the user says "design a poster / banner / post / logo / icon set / deck / slide", "make an app screen / landing page / dashboard / wireframe", "build a design system / components / tokens / dark mode", "prototype this flow", "make a user flow / journey map", "export it as SVG / PDF", "open it in Figcraft", "let me edit it myself", "edit this design", "/use-figcraft", or when a skill needs an editable layout instead of a flat render. Not for video, or for pictures made by a model (Midjourney, fal): place those in a design instead.
metadata:
  version: 0.2.0
---

# use-figcraft

Figcraft (github.com/storytold/figcraft, MIT or Apache-2.0, early alpha) is a Figma-like design editor
in Rust: frames, auto layout, styles, variables, components and variants, vectors and booleans,
prototypes, boards, developer handoff. Its files are `.figcraft`; its command line, `figcraft-cli`,
builds and exports them with no window and serves them over MCP (645 commands); the FigCraft app opens
them for editing by hand. Everything is local: no account, no key, nothing leaves the computer unless
the user shares a file from the app.

Everything this skill and its folder say was run on figcraft-cli 0.18.1 and looked at. The folder:

| | What | Read it when |
|---|---|---|
| `reference/design-craft.md` | canvas sizes, spacing and type scales, colour, UI patterns, deck rules, the checks before showing | before designing anything |
| `reference/command-index.md` | "I want to …" → the command, for every task | finding a command |
| `reference/layout.md` | frames, presets, auto layout (incl. grid), constraints, sections, pages, templates, how pro files are built | screens, pages, anything with rows |
| `reference/design-systems.md` | styles, variables and modes, components, variants, properties, instances, libraries, data fill | tokens, themes, components |
| `reference/graphic.md` | typography, gradients, pictures (fit, crop, adjust), strokes, effects (glass, noise, blur), masks, blend, vectors, booleans | posters, logos, icons, anything visual |
| `reference/prototyping-handoff.md` | interactions, overlays, variables in prototypes, flows, code output, annotations, comments, versions, boards | prototypes, handoff, user flows |
| `reference/files.md` | every export and import, fonts, pictures | getting things in and out |
| `recipes/` + `README.md` | 19 complete designs with previews | starting a design of that kind |
| `scripts/recipe.mjs` | runs a recipe on any computer (fonts and pictures filled in) | using a recipe |
| `scripts/proto_to_html.py` | a clickable HTML page from a prototype's screens | showing a prototype |
| `scripts/layout_tree.py` | prints a file's auto-layout tree | learning how a file is built |

## 1. First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/figcraft` | required | Building, checking and exporting the design (`figcraft-cli` alone does the same with scripts) | Nothing to build with: install it first |

- The MCP's tools: `mcp__figcraft__batch`, `run_command`, `create_node`, `set_properties`, `get_node`,
  `inspect_document`, `screenshot`, `export`, `open_file`, `save_file`, `list_commands` … (a connector
  added in the Claude app has another prefix: match the names; load deferred ones with ToolSearch).
- Or the command line: `figcraft-cli --version` (on the PATH, or `~/.local/bin/figcraft-cli`).
- The app, for hand edits: `/Applications/FigCraft.app` on a Mac.

Missing: it is `mcp/figcraft` in MediaMake (`mm items` installs what the account opens). By hand, with
the user's yes for the download: the latest release's `figcraft-cli-<version>-macos-universal.zip`
(signed and notarized; on Linux the AppImage runs it as `FigCraft.AppImage cli`) unzipped into
`~/.local/bin`, then `claude mcp add --scope user figcraft -- ~/.local/bin/figcraft-cli mcp` (a full
path: the Claude app may not have `~/.local/bin` on its PATH; the tools come in the next session). The
command line alone does everything here with scripts, so a session without the MCP still works.

## 2. Three ways to drive it

| | How | Best for |
|---|---|---|
| MCP (headless) | `batch` (many steps, one undo), `run_command`, `create_node`, `set_properties`; `screenshot {ids}` returns the picture to look at; `save_file {path}`. The server keeps its documents between calls (`doc.list`, `file.new`) | building and changing a design step by step while looking at it |
| Script | a JSON list of steps, `figcraft-cli run <steps>.json --out <file>.figcraft` (`--in <file>` to start from one; without `--out` the file is left as it is) | big designs, repeatable builds, recipes; keep the script beside the file |
| Live app | FigCraft started as `open -a FigCraft --args --control 7979 <file>`, and `figcraft-cli mcp --attach 7979` (add it as a second server, `figcraft-app`) | changing the window the user is looking at |

A script (and an MCP `batch`) is all or nothing: one failing step rolls everything back and names it.
A step named with `"as"` is `{"$ref": "<name>"}` in later params; `"field": "ids/0"` (or `"image"`,
`"colors/0/targets"`) picks another part of its result. A parameter the command doesn't take fails the
step: look commands up first with `figcraft-cli commands --filter <word>` (MCP: `list_commands`).
Long designs (100–500 steps) are written by a small generator (helpers that append steps, then one
JSON dump), not by hand.

## 3. The loop: brief → start → build → check → show → hand over

1. **Brief**: what it is, for whom, where it will be seen and at what size (`reference/design-craft.md`
   has the sizes), the brand (fonts, colours, logo), the real content. Real words and real pictures:
   never lorem ipsum; figures that are made up are labelled as illustrative.
2. **Start**: the nearest recipe (`recipes/README.md`: copy it and change words, colours, fonts and
   pictures, keep its structure), a template (`file.newFromTemplate`: mobile-app, landing-page,
   dashboard, design-system, wireframe-kit, social-posts, slides, icon-set), or a blank frame.
3. **Build**, in this order:
   1. A frame the size of the output (`frame.create {x, y, width, height, name, props}`; a deck is one
      top-level frame per slide, a set of sizes is one frame each).
   2. `text.loadFont {path}` for every font file, in the same run or MCP session as the export.
   3. For UI: tokens first (variables with Light/Dark modes, text and effect styles), then components
      for anything that repeats (buttons, cards, rows), then the screens from instances.
   4. Rows and stacks as auto-layout frames (`layout`, `gap`, `padding`, `sizingH/V`), pinned bars as
      absolute children with constraints, not hand-placed x/y.
   5. Pictures (`image.place`, downscaled first), then type, then effects and texture.
   6. Names for what things are (`Nav/Tabs`, `Card/Trip`, `Icon/search`), and the background layer (the
      full-size fill or picture at the bottom) locked, so a click or a drag doesn't grab it.
4. **Check**: export and look at it — at full size and at the size it is seen (a feed tile, a phone).
   `text.missingFonts {}` must be `{families:[]}`. For UI, resize the root frame (`node.set {width,
   height}`) and check that it reflows. Run "Before you show anything" in `reference/design-craft.md`.
   Fix and look again before the user sees it.
5. **Show**: send the PNG / PDF in the chat and say what each part is; for a prototype, the screens and a
   clickable page (`scripts/proto_to_html.py`).
6. **Hand over and bring back** (section 6) when the user wants to change it by hand.

## 4. The rules that cost the most time (all proved)

- **Frames are white and clip by default**, nested ones too: wrapper frames need `fill: "none", clip: false`
  or white boxes appear and children's shadows are cut.
- **Text**: one line needs `textAutoResize: "widthAndHeight"` (a fixed box wraps); a paragraph needs
  `width` + `"height"` (or `sizingH: "fill"` in auto layout); a fixed box takes its `height` inside
  `props` (a top-level height is ignored); `textAlignVertical` is `top|middle|bottom`.
- **Fonts**: a run knows the installed fonts, built-in Inter (Regular, Italic, SemiBold, Bold only) and
  what it loaded. A wrong family or face draws in Inter with no error. Export in the run that loaded them.
- **Layout**: a `fill` child in a hug parent freezes the parent at its width (set the width first);
  `fill`-height children in a hug row collapse to nothing; `strokesIncluded` defaults to true; one-side
  borders are `strokeSides [t,r,b,l]`.
- **Turning**: degrees are minus CSS, applied with `node.set {rotation}` after the layer exists (turns
  about its centre); `node.create` takes no top-level rotation.
- **Paints**: lists are bottom first; a filled path subpath without `Z` draws nothing; a new vector has a `#D9D9D9` fill (`fills: []` for line art and before
  `text.onPath`); noise strength is its colour's alpha; progressive blur keys are `start` / `end`;
  image crop is `crop:[sx,0,0,sy,tx,ty]` on the paint and stretches (keep the aspect).
- **Results**: commands that return `ids` (`edit.duplicate`, `node.find`, `vector.outlineStroke`,
  `object.rasterize`) need `"field": "ids/0"`; `node.find` matches name substrings, parents first (add `type`).
- **Components**: property defaults are copied into instances when they are made (settle them first, or
  `instance.setProperties`); `combineVariants` names the set "Component 1", keeps no layout (make it a
  hug grid) and draws a dashed purple outline that exports.
- **Variables**: `variable.bind` accepts any field name and binds nothing on a typo (read it back);
  `variable.set` / `.bind` take an id or a bare name, `Collection/name` only works inside `{"$var": …}`.
- **Exports**: several ids export as ONE picture of their area; no ids exports the selection
  (`select.none` first); `file.export` doesn't create folders (`file.exportLayers` does); a stroked
  vector icon wants a fixed-size frame around it; a shadow widens the picture (`includeBoundingBox: true`
  keeps it to the frame); SVG turns angular gradients radial. Check a PDF through PNGs of the same frames.
- **Z-order is creation order** (backgrounds first, footers last); on boards make sections first and
  give their contents `parent`.
- `edit.undo` inside a run reverts the whole script. Pictures are embedded at full resolution.
- Prototypes are stored fully but don't play headless (`proto.present` does nothing).

## 5. Look at how the pros build files

The five example files in Figcraft's repository (`examples/*.figcraft`: ridgeline-app, -onboarding,
-studio-dashboard, -design-system, glass-and-vectors) are worth opening: slash-named layers, every row an
auto-layout frame, icons as `Icon/x` frames bound to Light/Dark variables, a sidebar spacer that fills.
`reference/layout.md` › "How the ridgeline examples are built" sums them up; `scripts/layout_tree.py`
prints any file's tree (after `figcraft-cli convert x.figcraft x.json`).

## 6. Hand it to the user, and bring the edit back

1. Fonts: the app shows only installed fonts, so copy the design's font files that
   `figcraft-cli info <file> --json` lists as missing into `~/Library/Fonts` (Linux:
   `~/.local/share/fonts`), and say which.
2. Open it: `open -a FigCraft <file>` (with `--args --control 7979` before the file when the app isn't
   running, so a live session can attach). Tell the user to change anything they like and save with ⌘S.
3. Back: export the frame from the saved file in a run that loads the fonts (`figcraft-cli run
   <export>.json --in <file>`: `text.loadFont` steps, then `file.export`); a YouTube thumbnail as a JPEG
   under 2 MB. Show it in the chat.
4. Never build over a file the user may have edited: a new build is a new file (`<name>-2.figcraft`),
   and every export a new version (`-edit-v2.jpg`); the earlier ones stay.

For MediaMake thumbnails and posters this is one command: `mm thumbs figcraft <job> <ID> --open`
rebuilds a finished variant as layers (pictures, devices and textures as images, every headline line
as live text in the job's fonts, plates as rectangles), checks it against a fresh render (it prints
the match and writes `compare.jpg`), installs the fonts, opens FigCraft; `--export` brings the edit
back as `<ID>-edit.jpg` (create-thumbnail, "The final edit").

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Check it is there | nothing | no | yes | - |
| 2. Brief and start | nothing | no | yes | - |
| 3. Build | `mcp:figcraft` | no | yes | a to-do for a place with Figcraft |
| 4. Check | `mcp:figcraft` | no | yes | a to-do for a place with Figcraft |
| 5. Show | nothing | no | yes | - |
| 6. Hand it to the user | `mcp:figcraft`, `app:figcraft` | no | yes | a to-do: open the file in FigCraft on the user's computer |
| 7. Bring the edit back | `mcp:figcraft` | no | yes | a to-do for a place with Figcraft |

`mcp:figcraft` is the MCP or `figcraft-cli` alone (scripts do the same). Installing it downloads a
release: ask first. A recipe may fetch a missing Google font into `~/.cache/use-figcraft/fonts`
(`--no-fetch` stops it).

## Lessons

New lessons from the user go in your notes: `mm notes add use-figcraft "<what they said> → <the rule>"`
(read them with `mm notes use-figcraft` before planning).

- 2026-11-18 · first tried (test rebuilds, not productions) on finished thumbnails: Scouter Can't Read
  Me's A21 came back at 99.3 % of its render; Hollow Soul's turned ULQUIORRA taught the turning rule.
- 2026-11-18 · experiments, not productions: four areas (layout, design systems, graphic, prototyping and
  files) run across the command set; 17 designs built, rerun and looked at became `recipes/`, their
  findings `reference/`. No command crashed or hung.
- 2026-11-18 · a fresh session following only this skill built a sign-in screen in Light and Dark, a
  3-slide deck PDF and an Instagram story to brief (two became recipes); what it had to guess is now
  written in: open subpaths, shadows widening exports, padding inside `layout`, checking a PDF, which
  fonts exist (`scripts/recipe.mjs --fonts`).
