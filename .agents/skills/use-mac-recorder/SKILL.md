---
name: use-mac-recorder
description: Record the Mac's screen, one window or a region with the mac-recorder MCP, for product demos, tutorials, app walkthroughs and bug repros. Each video comes with a log of the cursor, every click and named steps. The skill plans the takes, records while the user performs or while Claude drives (a clean Chrome window by code, with every step marked), checks the take, then trims it, speeds up the idle stretches and makes an auto-zoom edit in Remotion (zoom and pan on the clicks, a smooth drawn cursor, step captions, the way Screen Studio does). Other skills use it for their screen footage too (make-cwc-tutorial, walkthroughs, repros). Use when the user says "record my screen", "record this window / app / browser", "screen recording of …", "make a demo / walkthrough / tutorial video of &lt;app or site&gt;", "record a bug repro", "zoom in on the clicks", "/use-mac-recorder", or a skill needs footage of something happening on the Mac. Not for footage from the internet (youtube-grab) or a render of a Remotion project. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  version: 0.1.0
---

# use-mac-recorder

mac-recorder is a local MCP (ScreenCaptureKit with a small Swift helper) that records the Mac's screen,
**one window** or a region. It writes H.264 at the display's Retina resolution, and beside each video an
**events log**: the cursor path, every click, scroll bursts and the step markers, in the video's pixels
and seconds. The log is what makes the edit good. The zoom follows the clicks, the idle stretches speed
up, and a drawn cursor glides to each click. Everything stays on the Mac.

Files: `<workspace>/out/recordings/<name>/<name>.mov`, `<name>.events.json` and `<name>.poster.jpg`
(`mm workspace` prints the workspace). The kit is in this skill's `kit/` folder: `plan-edit.mjs` (events →
edit plan, unit-tested: `node --test kit/`), `ScreenZoom.tsx` (the Remotion player), `check-frames.mjs`
(the check sheet), and `chrome.mjs` with `run-steps.mjs` (a demo driven by code). The first demo, a tour
of MediaMake's store, is the project `mac-recorder-demo` (its `steps.mjs` is a worked example).

## 1. First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/mac-recorder` | required | Recording, step markers, stills, frames to check | macOS's own `screencapture -v` records the screen by hand, with no events log and so no auto-zoom |

- The tools are `list_displays`, `list_windows`, `start_recording`, `mark`, `recording_status`,
  `stop_recording`, `screenshot` and `video_frame` (a connector shows them under another prefix: match the
  names, and load deferred ones with ToolSearch).
- Missing: install it once with `mm items install mcp/mac-recorder --yes` (on a computer signed in to
  MediaMake; in Claude Desktop, its `.mcpb`). The tools come in the next session.
- `list_displays` → `permissions`: `screenRecording` must be true. When it is false, tell the user to
  turn on System Settings › Privacy & Security › Screen & System Audio Recording for the app Claude runs
  in (the Claude app, or the terminal), then quit and reopen it. `microphone` matters only for voice.
- The cursor and the clicks need no other permission (no Accessibility, no Input Monitoring).
  Keystrokes are never logged.

## 2. Plan the take, before anything records

Write it down in a few lines and agree it with the user when they will perform it:

- **What it shows and for whom**: the one thing a viewer should be able to do after watching.
- **The steps**, a few words each. Each one becomes a marker (`mark`) and a caption, and the edit
  zooms on its click. Three to eight steps make a good minute.
- **The target.** One window beats the full screen: only that window is recorded (no notifications, no
  other apps, no Dock), even when something covers it, and the recording follows it when it moves.
  Use a region only for part of a window; use a display only when the demo moves between apps. Size the
  window to the final frame before recording: 1440×810 points for 16:9 (it records at 2880×1620), or
  1080×1350 for 4:5. A full-screen demo: Do Not Disturb on (Control Centre › Focus), and
  `exclude_apps: ["Claude"]` keeps Claude's own window out.
- **Clean it**: the user's private tabs, other people's names, keys and tokens, notifications. Never
  record a password being typed; the user types those off camera. A demo in a browser by code uses a
  clean Chrome profile (`kit/chrome.mjs`), so none of the user's tabs or sign-ins show.
- **Who performs**: the user (their real mouse, and the clicks are logged) or Claude (below).
- **Sound**: `none` unless asked; `mic` for a voice recorded live (the user picks the mic from
  `list_displays`); `system` for the app's own sounds. A voice-over is better made afterwards, over the
  edit (ElevenLabs).
- **Length**: the take may run long, because the edit speeds up the waits. `max_seconds` defaults to
  600. Say so before a take longer than a few minutes.

## 3. Record

1. `list_windows {app}` finds the window (front to back; `pid` tells two Chrome instances apart).
2. `start_recording {target: {app, title} | {window_id} | {region} | {display}, name, cursor, audio, max_seconds}`.
   `name` becomes the folder (`out/recordings/<name>/`), and a taken name gets `-2`, so an earlier take is
   never overwritten. It returns once the first frame is in (about a second).
3. Perform the steps, with a `mark {name}` for each one (see who performs, below).
4. `stop_recording` finishes the file and shows the poster frame. One recording runs at a time. It stops
   by itself at `max_seconds`, when the window closes, or when the session ends (the file is finished
   either way, and `stop_recording` in the next session still returns it). `recording_status` shows a
   recording from any session.

**The user performs.** Tell them the steps, then start and say "recording: go ahead, tell me when you're
done". Wait for their word: don't poll, and don't mark for them. Their clicks drive the zooms. Name the
steps afterwards from the frames at the click times, by adding `markers` to the events JSON
(`{"t", "name"}`) before planning the edit.

**Claude drives.** Two ways, by what has to be shown:

- *A website or web app*: by code, with `kit/chrome.mjs` and `kit/run-steps.mjs`. Write the take's
  steps as one function in a `steps.mjs` beside the project (`chrome.mark(name)`,
  `click('text=Skills' | selector, {name})`, `type(selector, text, {name})`, `scroll(dy, {name})`,
  `goto(url)`), then:
  1. `node kit/run-steps.mjs steps.mjs --setup --url <url> --bounds 40,60,1440,810` opens a separate Chrome
     with a temporary profile of its own (none of the user's tabs or sign-ins) and prints its `pid`.
  2. `node kit/run-steps.mjs steps.mjs --run` is the **rehearsal**. Nothing records, so nothing is marked;
     fix any step that fails (a card that is too tall to be "in view", a button with other words).
     Then `--setup` again to go back to the start.
  3. `list_windows {app: "Chrome"}` → the window with that `pid`, then
     `start_recording {target: {window_id}, name, cursor: false}` (code moves no real cursor, so the
     edit draws one).
  4. `--run` again: each action is marked through the recorder's inbox the moment it happens, with the
     point in screen points. It prints `{ok, seconds}`.
  5. `stop_recording`, also when a step failed (`ok: false`): fix the step and take it again under a new
     name. `--close` closes the window when the takes are done.
  The demo window keeps drawing when other windows cover it (Chrome's background throttling is off), so
  the user can go on working; a window recording doesn't need the window in front. A click the user
  makes elsewhere meanwhile is logged with `inside: false` and ignored by the edit.
- *A native app, or the user's own browser*: computer use moves the real cursor, so record with
  `cursor: true` and the clicks are logged like a person's. `mark` each step just before doing it.
- Driving a browser through a tool (Claude in Chrome, the built-in browser) moves no real cursor, and a
  `mark` sent between tool calls lands seconds from the click. When the timing matters, prefer the script.

A script marks without the MCP by writing a `.json` file into the inbox, `~/.mediamake/mac-recorder/inbox/`
(`{"name", "kind": "click"|"focus"|"step"|"cut", "point"?, "rect"?, "note"?, "at": <ms since 1970>}`).
`chrome.mjs` exports this as `mark()`. A `cut` marker drops everything back to the previous marker (a
fluffed step, redone).

## 4. Check the take before showing it

- The stop result: `duration`, `fps` (about the asked fps while the screen moves), `droppedFrames`
  (should be none), `clicks` and `markers` as performed, `problem` (should be absent).
- Look at the poster, then `node kit/check-frames.mjs <events.json>`. It makes a contact sheet with a
  frame at each click and step, a red ring where the log puts the click, and the time. The ring has to
  sit on what was clicked; when it is off by a constant amount, the window was moved or resized during
  the take, so record again without moving it. Read the sheet with the Read tool.
- `video_frame {at}` for any moment in doubt (the start, the end, a step).
- Something private showed: record again rather than blur, unless the user says otherwise.

## 5. Hand it over

Give the paths and a one-click reveal (a `bash` block: `open -R "<video>"`). The take stays in
`out/recordings/<name>/`. Copy it into a project's `input/` for an edit (`cp -c`, a clone), and deliver
it to a channel folder only when the user approves it (`mm media deliver`, CLAUDE.md › Media files). Keep
every take. A new take is a new name.

## 6. The edit: trims, idle speed-ups, auto-zoom

```bash
node kit/plan-edit.mjs <name>.events.json --captions        # → <name>.edit.json
```

`plan-edit.mjs` reads the log (and the video, through ffmpeg's freezedetect) and writes the plan, all
in the recording's seconds and pixels:

- **segments**: the head and tail trimmed to the action (0.6 s before the first, 1.5 s after the last),
  stretches with no input *and* nothing moving on screen sped up 4× (`--idle-speed 8`, or `cut`), and
  `cut` markers dropped. A page that is loading keeps its speed unless `--idle-mode input`.
- **zoom**: keys `{t, scale, x, y}`. The zoom comes in 0.8 s before a click (1.8×, `--zoom`), pans between
  clicks less than 2.6 s apart, holds 1.6 s after the last one and goes out. A `focus` marker's rect zooms
  to fit (a field being typed in).
- **cursor**: the path to draw when the video has none. It is the recorded path smoothed, or a hand-like
  path to each marked click when the take was driven by code (`--cursor auto|recorded|synthetic|none`).
- **clicks, markers** for ripples and captions, each with its time in the edit (`out`).

`ScreenZoom.tsx` plays a plan in a studio project. Copy it into `projects/<slug>/video/`:

```tsx
import plan from '../input/edit.json';
import { ScreenZoom, type EditPlan } from './ScreenZoom';
const Screen: React.FC<SceneProps> = () => <ScreenZoom src={staticFile(`${SLUG}/input/recording.mov`)} plan={plan as EditPlan} />;
// defineProject({ id: SLUG, fps: 30, width: 1920, height: 1080, audio: false, layers: [layer({ scene: Screen, at: 'all' })] })
```

The project needs `input/project.json` (`{"title", "artist", "audio": "bed.wav", "sections": [{"label": "demo", "from": 0, "to": <plan.duration>}]}`),
a silent `input/bed.wav` of the edit's length
(`ffmpeg -f lavfi -i anullsrc=r=48000:cl=stereo -t <duration> input/bed.wav`), `input/lyrics.json` as `[]`,
the take as `input/recording.mov` (`cp -c`) and the plan as `input/edit.json`. Then run `mm prepare <slug>`.
Re-plan after a change (`plan-edit.mjs … --out <project>/input/edit.json`) and the preview picks it up.
Review with a 10-second preview (`mm render <slug> --preview=0-10`) and the revise-video loop. The master
is rendered once, after the user signs off. Props: `background`, `padding` (0.05: the recording framed on
the background with round corners and a shadow; 0 for full bleed), `radius`, `cursorSize`, `ripples`,
`captions`, `volume`. For a voice-over, place the captions on its words instead of the markers.

Without Remotion, a plain cut or speed change is ffmpeg on the take: `-ss 3.2 -to 18 -c copy` trims it,
and `setpts=PTS/4` speeds up a stretch.

## 7. For other skills

A recording is a contract: `<name>.mov` (H.264, variable frame rate, at most the asked fps, Retina
pixels) and `<name>.events.json` (`schema: mac-recorder.events/v1`). The JSON holds `size`, `duration`,
`target`, `cursor [[t,x,y]]`, `clicks [{t, up, x, y, button, count, inside}]`, `scrolls`,
`markers [{t, name, kind, x?, y?, rect?}]` and, for a window, `windowFrames`. Its times are seconds from
the first frame and its positions are the video's pixels. A skill that needs screen footage:

1. plans its steps with this skill's §2, records with §3 and checks with §4;
2. takes the edit from `plan-edit.mjs` and `ScreenZoom.tsx`, or reads the events itself (the clicks are
   where to point an arrow or a caption);
3. names, in its own run sheet, the step that records as `mcp:mac-recorder` (a Mac, a person's yes).

## Where it runs

What each step needs, so it runs in the cloud or on a device (the words: render, key:<name>, mcp:<id>,
app:<name>, browser:<site>[/<account>], media:library; `nothing` for none). The space's page reads the
keys from here. A cell holds only those words, or yes or no: notes go under the table. "Without it" is
what a place that lacks the need does instead, or "a to-do …" when the step has to wait for one that has it.

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Plan the take | nothing | no | yes | - |
| 2. Set up the target | mcp:mac-recorder | no | yes | a to-do for the Mac that records |
| 3. Record | mcp:mac-recorder | yes | yes | a to-do for the Mac that records |
| 4. Check the take | render | no | yes | - |
| 5. Hand it over | nothing | no | yes | - |
| 6. Plan the edit | nothing | no | yes | - |
| 7. Preview the auto-zoom edit | render | no | yes | - |

Recording happens only on a Mac with the screen in question: a cloud session has no screen, so steps 2
and 3 wait for one. Recording needs the user's yes, because it captures whatever is on the screen. A
re-take is a new name and never overwrites a take, so it is safe to repeat. Steps 4 to 7 run wherever
the files are, with Node and ffmpeg.
