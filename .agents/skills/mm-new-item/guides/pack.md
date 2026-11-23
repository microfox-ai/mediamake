# The guide for pack- skills: kits and packs

MediaMake's standard for a skill that bundles several outputs into one kit: an upload pack, a brand
kit, a release folder. Read `general.md` first; this adds what is true for this kind.

**Kept by MediaMake's admins.** It changes only in a pull request, never in a session. A starter: it
holds what MediaMake's rules and its own pack- skills already share, and admins add to it.

## A pack runs other skills

- Each part is made by the skill whose job it is (a thumbnail by `create-thumbnail`, the words by
  `write-youtube-metadata`). The pack gathers the inputs, hands them over and assembles the result.
- Name those skills in `depends-on`, and say the order they run in when one's output shapes the
  next.
- Parts that don't depend on each other can run side by side.

## Ask first

- Size the pack to the job before making anything: what it is for decides how much it holds.
- Ask what already exists, so nothing approved is made again.

## One folder, ready to use

- Everything lands in one folder, laid out so the next step can use it as it is, whether that is a
  person pasting into a form or a tool filling it.
- When a tool fills a form from the pack, the pack carries the file that tool reads.

## Show it, then finish it

- Show the user the whole pack before anything leaves the computer.
- An upload, a form filled on a site, or anything sent out waits for the user's yes, and the run
  sheet says so.
- A step that needs a browser sign-in runs only on a device: say "a to-do …" for a cloud session.

## Saving it

- A finished release kit is saved to its project as a release, so it is the same on every computer.
- The pack goes to the user's folders only once they approve it (`mm media deliver`).
