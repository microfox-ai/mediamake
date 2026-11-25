# Pictures: crops, Midjourney restyles and cut-outs

An optional part (step 5 of `make-kinetictype`). A style or a look that puts pictures behind, inside or
in front of the type uses it; one that is type alone skips it. Which pictures, which crops and which art
styles are the style's call: this file is how each is made.

The art is one picture restyled, never new compositions: every restyle keeps the pose and the framing,
so the plates register over each other and one cut-out lines up with all of them.

## 1. Crops

```bash
mm kinetictype grid <slug>                     # analysis/grid.jpg: the picture with a coordinate grid
mm kinetictype crops <slug> --boxes='{"c0-art":[x0,y0,x1,y1],"c1-face":[x0,y0,x1,y1]}'
```

- Read the boxes off the grid. `c0-art` is the whole art without any text printed on it; the others are
  the close-ups the devices need, each square-ish (a face with the head in the upper third and the
  shoulders in).
- Each crop lands in `input/crops/` with a `-1024` copy, upscaled for Midjourney's edit, and a sheet to
  check them on.
- More pictures from the user go to `input/extras/` as they are. Every picture the user puts in the
  folder is in the mix.

## 2. Midjourney restyles

Through Browse Hack, as the `midjourney-restyle` skill says when it is installed. Ask the round's size
first, in relax mode, and start small.

- **The prompt**: what is in the picture + "exactly the same pose and framing" + the style's words.
- A close-up that isn't clean line art is redrawn clean first, then restyled from that pick
  (`editImage: mj:<jobId>#<i>`). A page that is already clean ink needs no redraw.
- `midjourney_generate` with `editImage` and `wait: false`, six to eight jobs at a time;
  `midjourney_job_status`; `midjourney_download_images` with a set name (parallel downloads are fine).
  They land in the media library's inbox.
- Contact sheets (`mm kinetictype sheet <folder>`) and a review set for the user:
  `mm image-index out/<slug>-mj --groups=subfolders`, then the link
  `https://mediamake.microfox.app/file-revision?job=<slug>-mj` (the loop is `revise-image`'s).
- **Picking**: the cleanest of each four, with the faces intact, no extra limbs and the composition kept.
- Subtle-upscale the picks to 2048 (`midjourney_upscale`) before they are shown big. Copy the panel's
  styles to `input/plates/` and the close-ups to `input/chars/`.
- A second round only where a device still lacks a look.

## 3. Cut-outs

```bash
mm kinetictype cutout <slug> input/plates/<style>.png … --all     # a group: every character kept
mm kinetictype cutout <slug> input/chars/<close-up>.png …
```

- Look at `input/cutouts/_checks.jpg`. A blob (a close-up of tangled limbs) is dropped.
- An upscale that loses a part its 1024 pick kept: cut the 1024 pick and put its alpha on the upscale.
- A restyle on a black ground (a neon negative, firelight) doesn't cut. Use it uncut on an ink ground,
  or give it the alpha of another style's cut-out of the same crop (same framing, so it fits).

## 4. The assets file

`input/assets.json` names the plates and the cut-outs once, so the edit and the planner refer to them by
role. Paths are inside `input/`; the points are fractions of each square, read off the cut-out.

```json
{
  "plates": { "riso": "plates/red-riso.png", "lino": "plates/linocut.png", "neon": "plates/neon-negative.png",
              "fire": "plates/firelight.png", "oil": "plates/oil-crimson.png", "colour": "plates/anime-colour.png" },
  "teams": { "riso": "cutouts/red-riso.png", "lino": "cutouts/linocut.png", "colour": "cutouts/anime-colour.png" },
  "faces": [ { "src": "cutouts/c3-left.png", "f": [0.33, 0.28] },
             { "src": "cutouts/c1-riso.png", "f": [0.27, 0.27], "mouth": [0.2, 0.43] } ],
  "fist": { "src": "cutouts/c5-fist.png", "f": [0.37, 0.16] },
  "fistFire": { "src": "cutouts/c5-fire.png", "f": [0.35, 0.2] },
  "open": { "plate": "lino", "face": [0.36, 0.17] },
  "warp": { "face": [0.4, 0.15] }
}
```

- `plates`: the full-frame styles, by a short name. `teams`: the cut-out of a plate, by the same name.
- `faces`: the close-up cut-outs, strongest first; `f` is the face, `mouth` the mouth when a device
  needs one.
- `fist`, `fistFire`, `open` and `warp` are read by `mm kinetictype storyboard`, the planner a style may
  use. A look that writes its `edit.json` by hand names its pictures in the shots and needs only what it
  uses here.
