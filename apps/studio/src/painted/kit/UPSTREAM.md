# The painted-cartoon kit

These files are John Heibel's Claude Animation Base, MIT (see `LICENSE` beside them):
https://github.com/JohnHeibel/ClaudeAnimationBase at `0ac8bf2b31942376cb6b8c4074715595d512acd2`.

| File here | Upstream | Changed |
|---|---|---|
| `core.js` | `src/core.js` | no |
| `clawd.js` | `src/clawd.js` | no |
| `timeline.js` | `src/timeline.js` | no |
| `sheets.js` | `src/sheets.js` | no |
| `demo.js` | `src/scenes/demo.js` | no (the example scene, "The fallen star") |

They are kept byte for byte, so a newer upstream copy drops in. What MediaMake adds lives beside them
in `src/painted/`: the page that runs them (`page.ts`, in place of upstream's `studio.html` and
`src/config.js`), the Remotion scene that renders a project through them (`PaintedCartoon.tsx`), and
`mm painted` (`scripts/painted.ts`, in place of upstream's `render.mjs`). p5 and p5.brush are the
studio's packages, at the versions upstream pins (p5 2.3.3, p5.brush 2.2.3).

To update: copy the four engine files (and `demo.js`) from a newer commit, change the commit above,
and check the model sheets still render (`mm painted <slug> --loop=emotions --sheet=1 --cols=1 --w=1920`).
