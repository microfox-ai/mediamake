# The edit as data, and the engine's devices

Read for step 6 of `make-kinetictype`, or when a style sends you here. Everything in this file is what
the engine draws today (`@mediamake/engine/kinetictype`); which devices a video uses, and when, is the
style's call, or the look's.

## The project

`mm kinetictype new <slug> …` (step 2) writes it. The whole video is three lines of TSX and one data file:

```tsx
// projects/<slug>/video/index.tsx
import edit from './edit.json';
import { defineKinetic, type KineticEdit } from '@mediamake/engine/kinetictype';

export default defineKinetic('<slug>', edit as KineticEdit);
```

```json
// projects/<slug>/video/edit.json
{
  "version": 1,
  "label": "SCREAMING / TO WIN",
  "flashes": [4.02, 9.5],
  "shots": [
    { "id": "b1", "type": "slam", "from": 1.0, "to": 1.5, "ground": "#e02b3e", "rows": ["EVERY"], "color": "#0a0a0a" }
  ]
}
```

- **`shots`**: each shot is one device with its own time span, `from` and `to` in the video's seconds.
  Each becomes its own layer, named `<id> <label>` in the Studio timeline.
- **`flashes`**: seconds where the whole frame flashes white for a moment (the music's section hits).
- **`label`**: a small corner label with a running timecode; `""` turns both off.
- **`width`, `height`, `fps`**: 1080 × 1920 at 30 by default. A 16:9 video sets them, and its type is
  re-fitted by eye (`width`, `max`, `y` on the shots).
- An overlay over the whole video adds film grain, the flashes and the label.
- The sound is the manifest's audio (step 8 points it at the mix).

## The devices

| `type` | What it draws | Key fields |
|---|---|---|
| `open` | out of white, a rush slowing on a plate (a loop's landing) | `plate`, `face`, `zoom`, `brightness` |
| `slam` | a giant word or stack on a ground, as a knockout or over a plate; a cut-out rising into it | `ground` / `knock` / `plate`, `rows`, `color`, `stroke`, `echoes`, `y`, `width`, `max`, `cut`, `lines`, `rot`, `glow`, `invertStart`, `amp` |
| `strobe` | a word strobing black and white, growing (the beat before a drop) | `word` |
| `letters` | a word one letter per hit, each with its own look, an ink bar spelling it | `word`, `hits`, `looks`, `spell` |
| `crack` | a cracked word on a ground, a cut-out punching up into it | `word`, `ground`, `color`, `y`, `width`, `cut`, `crackAt`, `echoes` |
| `burst` | the letters bursting out of a mouth past the camera, then the dive into the mouth | `word`, `cut` (its `f` is the mouth), `ground`, `diveAt`, `glow` |
| `faces` | faces slammed on grounds on the hits, the word running vertically behind | `word`, `faces[]` (`at`, `ground`, `cut`, `f`, `color`, `side`, `lines`) |
| `rise` | a cut-out climbing to an outline word, a small word above, a drum roll pulsing | `big`, `small`, `smallAt`, `cut`, `roll`, `blackAt` |
| `flash` | every plate flashing two frames each under a cracked word | `word`, `plates`, `y`, `white` |
| `poster` | an ending: phrases slammed above a plate, a lockup, a crack, a warp into white | `plate`, `cutout`, `plateW`, `plateTop`, `phrases`, `final`, `hits`, `warp` |

Every shot slams in (a scale, a rotation kick, a smear, a colour split) and the camera pushes and
shakes; an inverted impact frame opens a shot with `invertStart`. An impact frame on a light ground
with no picture inverts to a black frame: leave it off there.

The exact fields and their types are in the engine's `spec.ts` (`mm engine` lists where the engine's
names point).

## Pictures in a shot

A picture is a path under `projects/` (`<slug>/input/plates/riso.png`). Plates and close-ups are
squares. A cut-out is placed by a focus point:

```json
{ "src": "<slug>/input/cutouts/c5-fist.png", "f": [0.37, 0.16], "at": [540, 900], "w": 1800 }
```

puts the point `f` of the picture (fractions of its width and height) at the screen point `at`, `w`
pixels wide. Keep a cut-out's cut edges off-screen (`w` around 1700 to 1900 for a close-up). Type sits
behind a cut-out or in free space, never over a face.

## What the devices can't do

A custom scene in the project, beside the data:

```tsx
import { defineProject, layer } from '@mediamake/engine';
import { kineticLayers, type KineticEdit } from '@mediamake/engine/kinetictype';
// layers: [...kineticLayers(edit as KineticEdit), layer({ scene: MyScene, at: { from: 6, to: 8 } })]
```

Keep a project's own scenes in the project (`video/scenes.tsx`). A picture drawn in a custom scene sets
`maxWidth: 'none'`, or the page's stylesheet caps it at the frame's width.

## A section inside a longer video

In that project's `index.tsx`, add `...kineticLayers(edit)` to its layers with the shots' times in that
video's seconds. Or render the kinetic project on its own and splice the file in.
