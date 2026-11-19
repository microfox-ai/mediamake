# Recipes

Nineteen complete designs, each a `figcraft-cli run` script that was built, rerun and looked at on
figcraft-cli 0.18.1 (previews in `previews/`). They are starting points and worked examples: copy the
one closest to the job, change its words, colours, fonts and pictures, and keep its structure.

Run one (fonts and pictures are tokens the helper fills in):

```bash
node scripts/recipe.mjs recipes/ui-mobile-screen.json --out=<folder> [--images=<folder of pictures>] [--fonts=<folder>]
node scripts/recipe.mjs recipes/ui-mobile-screen.json --tokens      # what it needs
```

- `{{font:<File>.ttf}}`: found in `--fonts`, the computer's font folders, MediaMake's thumbnail jobs, or
  fetched from Google Fonts (`fonts.json` maps each file to its family and weight).
- `{{image:<name>}}`: `--images/<name>`, else a gradient placeholder (swap the real one in with
  `image.replace`). A cut-out (the poster's `subject.png`) must be a transparent PNG to look right.
- `{{out}}`: the output folder; the recipe's exports land there, with `<recipe>.figcraft` and the
  resolved `<recipe>.run.json`.

| Recipe | Makes | Size | Pictures | Shows how to |
|---|---|---|---|---|
| `ui-mobile-screen` | travel app "Explore" screen | 393×852 | 3 photos | nested auto layout, chips that overflow, a photo card with scrim, a blurred tab bar pinned with constraints |
| `ui-landing-hero` | SaaS landing hero + logo strip | 1440×908 | 1 photo | web container, display type, CTAs, avatar stack, floating cards, a logo strip in 6 fonts |
| `ui-dashboard` | finance dashboard | 1440×960 | — | sidebar with a spacer, KPI cards with sparklines, a bar chart with gridlines and tooltip, a donut from arcs, a table with status pills |
| `ui-signin-light-dark` | phone sign-in screen in Light and Dark | 393×852 ×2 | — | form fields as a component, a 3-variant button set, Light/Dark variables, text styles with variable fills, a reflow check at 440×956 |
| `ui-from-template` | the landing-page template rebranded | 1440 wide | 1 photo | `file.newFromTemplate`, `style.update` rebrand, copy and picture swaps |
| `ds-button-set` | button component documentation sheet | 1440×1429 | — | an 18-variant set as a grid, shared text and boolean properties, styles, instances with overrides |
| `ds-card-component` | story card component + 6 instances | 1440×1949 | 7 photos | text/boolean properties, per-instance pictures (`image.replace`), nested overrides |
| `ds-light-dark-themes` | one app screen in Light and Dark | 1440×1228 | — | 19 colour + 2 string variables, `variable.setMode` on a duplicate |
| `ds-foundations` | design-system foundations page | 1440×3390 | — | colour ramps, semantic aliases, type scale, spacing and radius tokens bound to number variables, elevations |
| `gfx-event-poster` | music event poster | 1080×1350 | 1 cut-out | layered type behind/in front of a subject, gradient sky, boolean moon, glow, mask-softened edge, grain |
| `gfx-logo-icons` | logo, app icon, 6-icon set (+ SVG) | 1440×860 | — | booleans, outlined wordmark, corner smoothing, a stroked icon grid, SVG export |
| `gfx-youtube-banner` | YouTube channel banner (+ half-size preview) | 2560×1440 | — | the 1546×423 safe area, blurred blobs, pattern fills, a glass panel |
| `gfx-glass-card` | glassmorphism "now playing" card | 1200×960 | 1 photo | the glass effect, crop transform, image adjust, gradient hairline strokes |
| `gfx-carousel-slide` | editorial Instagram carousel slide | 1080×1350 | 1 photo | editorial type ranges, a tint numeral, B&W photo, pull quote, page dots |
| `gfx-story-announcement` | Instagram story: a café opening | 1080×1920 | — | display serif type at scale, a glowing badge, story safe areas (text between y 250 and 1560, checked with a guide export), JPEG for upload |
| `proto-onboarding` | 3-screen onboarding + bottom sheet, clickable | 393×852 ×4 | — | interactions, smart animate, overlays, keys, a flow, device settings; screens PNG + PDF |
| `ux-user-flow-board` | checkout user-flow board | board | — | sections, stickies, shapes, labelled elbow connectors, stamps; PNG + PDF |
| `deck-pitch` | 5-slide seed deck as one PDF + PNGs | 1920×1080 ×5 | 1 screen | slide grid and footer, stat cards, a bar chart from shapes, a phone mock; `file.exportFramesPdf` |
| `export-icon-set` | a line icon and an app icon in every size | 24 / 64 | — | export settings and one `file.exportLayers` → SVG, PNG @1x/@2x/@3x, Android XML |

`deck-pitch` puts a screen from `proto-onboarding` in its phone mock: run `proto-onboarding` first into
the same `--out`, then `deck-pitch` with `--images=<out>/screens`. After `proto-onboarding`, a clickable
HTML stand-in for Present: `python3 scripts/proto_to_html.py <out>/proto-onboarding.figcraft <out>/screens <out>/prototype.html 2`.

Recipes this long (19–537 steps; the last two were made by a fresh session following this skill alone) are written by a small generator, not by hand: helpers for frame,
text, vector, set, bind and export that append steps, then one `json.dump`. Write a new recipe the same
way, and add it here only after it has been built and looked at.
