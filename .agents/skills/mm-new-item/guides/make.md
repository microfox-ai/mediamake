# The guide for make- skills: videos and audio

MediaMake's standard for a skill that makes media: a video, a Short, a song's master. Read
`general.md` first; this adds what is true for this kind.

**Kept by MediaMake's admins.** It changes only in a pull request, never in a session. A starter: it
holds what MediaMake's rules and its own make- skills already share, and admins add to it.

## Where the work happens

- Every video is made in the studio, through `mm` (`mm help` lists the commands). A skill names the
  command, never a script's path.
- A production is a project in the workspace (`mm workspace` says where). Its code imports the engine
  by name: `@mediamake/engine`, `@mediamake/engine/<name>/…`.
- Register the production when the work starts (`mm media production new <slug> --channel=…`).

## Ask first

- Start with the questions that cost a round when they are skipped: the target (a reference, or the
  channel's last approved look), the aspect, what is fixed and what is open.
- A reference is the standard to build to, side by side. Start from it, not from a blank page.

## Rendering

- A review render is a 10-second preview, around what changed (`mm render <slug> --preview`).
- The whole video is rendered only when the user asks to review all of it.
- The master is rendered once, after the user signs off.
- Every render runs on this computer, or inside a cloud session's own machine. Never Lambda: a skill
  never suggests it or offers it as an option.

## Review

- The review loop is `revise-video`: name it in `depends-on` and hand over to it. A skill does not
  write a review loop of its own.
- Run the machine checks before the user sees anything: the things a computer can tell (timing,
  brightness, a loop that jumps, an import the editor can't load).

## Words and voice

- A song's timed words come from `mm transcribe <slug>`: no flags first (it is free, and may find
  them already made), then the price, shown to the user, before `--yes`.
- A voice take on a computer is the ElevenLabs MCP's `text_to_speech`; in a cloud session it is
  `mm voice`. Either spends credits, so the general guide's rule on spending applies.

## Its run sheet

- A render step needs `render`.
- A step that needs a browser sign-in, an app or the media library runs only on a device: say what a
  cloud session does instead, or "a to-do …" when the step has to wait for one.

## Delivering

- The final goes to the user's channel folder only once they approve it (`mm media deliver`).
- A style worth keeping after a production becomes a variant (`mm-fork-skill`), not more rules in
  the base skill.
