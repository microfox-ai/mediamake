# stills engine · to-do

- [ ] **Matching set from one cover** (asked 2026-10-24, "add that to do's"). From a release's
  chosen cover (or its source picture), make the rest of the release's stills in one go, in the
  same look and treatment: a YouTube thumbnail (16:9, `make-thumbnail`), a 9:16 story / Shorts
  poster (1080×1920) and an Instagram post (1080×1080 or 1080×1350). Likely new kinds next to
  `thumbnail` and `poster` in `spec.ts` (`KINDS`), square/vertical presets that reuse the cover's
  layout params, and one `init --set` that writes all of them from the cover job.
