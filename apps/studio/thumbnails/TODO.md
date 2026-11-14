# stills engine · to-do

- [ ] **Matching set from one cover** (asked 2026-10-24, "add that to do's"). From a release's
  chosen cover (or its source picture), make the rest of the release's stills in one go, in the
  same look and treatment: a YouTube thumbnail (16:9, `create-thumbnail`), a 9:16 story / Shorts
  poster (1080×1920) and an Instagram post (1080×1080 or 1080×1350). Likely new kinds next to
  `thumbnail` and `poster` in `spec.ts` (`KINDS`), square/vertical presets that reuse the cover's
  layout params, and one `init --set` that writes all of them from the cover job.

- [ ] **4K finals** (2026-11-14). YouTube now recommends 3840×2160 thumbnails (up to 50 MB from a
  computer; phones still cap at 2 MB) and a growing share of viewing is on TVs. `pick` should also
  render the picked IDs at 3× into `final/4k/` (the job's `scale` already drives `renderStill`), and
  keep the 1280×720 copies under 2 MB.
- [ ] **Feed benchmark** (2026-11-14). `thumbs feed <job> [--with=inspire-<kind>]`: our variants
  mixed among a kind's real hits in a mock home feed (titles under each, dark and light, phone and
  TV size), so the per-round benchmark is one command instead of hand-made `xstack` calls.
