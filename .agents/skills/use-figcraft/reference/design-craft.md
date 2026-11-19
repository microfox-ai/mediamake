# Design craft: sizes, systems and checks that make the work look professional

The other references say how Figcraft does a thing; this one says what good looks like. The recipes
in `recipes/` follow it: open their previews before designing something of the same kind.

## Canvas sizes

| Output | Size (px) | Notes |
|---|---|---|
| YouTube thumbnail | 1280×720 | nothing that matters bottom-right (the video length); JPEG under 2 MB |
| YouTube channel banner | 2560×1440 | everything that matters in the centre 1546×423 (shown on every device); the rest is TV/desktop only |
| YouTube end screen / video frame | 1920×1080 | |
| Instagram post / carousel | 1080×1350 (4:5) · 1080×1080 | carousel slides share a grid, a running head and page dots |
| Story · Reel · Short cover | 1080×1920 | keep text out of roughly the top 250 and bottom 340 (the app's own buttons) |
| X / Twitter header · post | 1500×500 · 1600×900 | |
| LinkedIn banner · post | 1584×396 · 1200×1200 | |
| Facebook cover | 1640×624 | phones crop the sides: keep the message in the middle |
| Open Graph / link card | 1200×630 | |
| Pitch deck / slides | 1920×1080 | one top-level frame per slide → one PDF (`file.exportFramesPdf`) |
| Poster | A3 3508×4961 at 300 dpi, or 1080×1350 for screens | print: `bleed:"3mm"`, `cropMarks:true` |
| Album cover | 3000×3000 | |
| App icon | 1024×1024 master (iOS corner smoothing ~60 %) | export 1x/2x/3x with export settings |
| Phone screen | iPhone 16 393×852 · Android 412×915 (`frame.presets`) | status bar 54, home indicator 34 |
| Tablet · desktop web | iPad 820×1180 · 1440×900 (container 1120–1200) | |

## Grids and spacing
- One spacing scale for the whole design: **4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48 / 64 / 80 / 96**. Every gap,
  padding and margin comes from it; nothing at 13 or 27.
- Phone: 16–20 side padding, 20–24 between blocks. Web: a 12-column grid, 24 gutters, container
  `maxWidth` 1120–1200 centred, sections padded 80–120 top/bottom. Dashboard: 240–264 sidebar, 24 gap,
  cards on an 8 grid.
- Build rows as auto-layout frames, never by hand-placed x/y: they stay aligned when text changes and they
  resize (`sizingH:"fill"`, constraints) when the canvas does.
- Social and posters: margins of 6–8 % of the short side; keep everything important away from the edges.

## Type
- Two families at most (a display face + a text face), plus a mono for numbers or code if needed.
- A type scale with a fixed ratio, e.g. 12 / 14 / 16 / 20 / 24 / 32 / 40 / 56 / 72 (UI) or a 1.333 ratio
  for editorial. Body 16 on web, 15–17 on phones; never below 12 for anything people must read.
- Line height: body 140–160 %, headings 100–120 %, display 90–105 %. Tighten big type: letter spacing
  −1 to −3 % above 40 px; open up small caps labels +6 to +12 %.
- Line length 45–75 characters. `wrapStyle:"balance"` for headings, `"pretty"` for paragraphs.
- Numbers in tables and prices: `features:{"tnum":true}`.
- Hierarchy by size and weight first, colour last. One element is the hero; everything else steps down.

## Colour
- One brand colour, one accent at most, and neutrals (a 50–900 ramp). Name them as tokens
  (variables): primitives (`indigo/600`) and semantic aliases (`action/primary`, `bg/surface`,
  `text/secondary`) that layers bind to, so a theme or a rebrand is one change.
- Contrast: body text 4.5:1 against its background, large text (24 px+, or 19 px bold) and icons 3:1.
- Dark mode is not inverted light mode: raise surfaces with lighter greys instead of shadows, lower
  saturation of brand colours, keep text at ~87 % white.
- A photo under text gets a scrim (a gradient from transparent to 60–80 % black), never a flat dim of the
  whole picture.

## UI patterns (what the recipes do)
- **Buttons**: heights 32 / 40 / 48, padding x 12–20, radius consistent with cards; states default,
  hover, pressed, disabled, focus; one primary per view. Build them as a variant set with properties.
- **Touch targets**: 44×44 (iOS) / 48×48 (Android) minimum, even when the icon is 24.
- **Cards**: one radius (12–20), one padding (16–24), one shadow level; image on top, then title, meta,
  action.
- **Navigation**: a phone tab bar of 3–5 items pinned to the bottom (absolute + constraints, blurred);
  web nav 64–80 tall with the primary action at the right.
- **Forms**: label above the field, 40–48 tall fields, helper and error text under them, one column.
- **Tables**: left-align text, right-align numbers (tnum), 48–56 row height, status as pills.
- **Empty, loading and error states** exist for every list screen.
- **Icons**: one set, one stroke width (1.5–2 at 24 px), round caps; 24 px frames named `Icon/name`.

## Graphic design
- One focal point, read in a glance at the size it is seen (a thumbnail at 168 px, a post in a feed).
- Contrast of scale: one giant element against small ones beats many medium ones.
- Layer for depth: type behind a cut-out subject, a shadowed card over a blurred ground; but keep faces
  and the key words clear.
- Texture sparingly: grain at 4–8 % (`noise` colour alpha), a vignette only when the edges distract.
- Text over pictures: scrim, a plate, or a calm area of the picture; never busy texture behind words.

## Decks
- One idea per slide, a title that states the point ("Revenue tripled in 2026", not "Revenue").
- The same grid, title position and footer (company · deck · page number) on every slide.
- Numbers big, labels small; charts built from shapes with direct labels instead of legends.
- Figures that aren't real are labelled as illustrative.

## Before you show anything
1. Export in the run that loaded the fonts, and `text.missingFonts {}` is empty.
2. Look at the export at full size AND at the size it will be seen (a feed tile, a phone).
3. Nothing touches an edge it shouldn't; every gap comes from the scale; text doesn't overflow or
   wrap one word alone (`text.fit`, `maxLines`, balance).
4. Layers are named for what they are, rows are auto layout, the ground is locked: the person who opens
   the file can find and change things.
5. For UI: resize the root frame (`node.set {width, height}`) and check that it reflows.
