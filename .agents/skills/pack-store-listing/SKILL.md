---
name: pack-store-listing
description: Make and check everything an app needs to publish on the App Store and Google Play. It audits what the app already has against both stores' rules (screenshots at every iPhone size, the 1024 and 512 icons, Play's feature graphic, phone screenshots), records the app itself for the App Store preview video (886×1920, 15–30 s) and the Google Play promo video (1920×1080 for YouTube), shoots its screens for screenshots, adds the pages the stores ask for (support, privacy, account deletion), and writes the listing guide with an answer for every field, then fills Google Play Console, YouTube (the promo, Unlisted) and App Store Connect from it with Claude in Chrome. The footage is real: the app's web build on an iPhone-sized screen, signed in to a sample company with made-up people, served by a local mock API so nothing touches real data, edited in Remotion with an iOS status bar, push and sheet animations and the screenshots' headlines. Use when the user says "store listing", "App Store / Play Store assets", "publish the app on both stores", "app preview video", "promo video for Play", "feature graphic", "store screenshots", "make the brand materials for the stores", "fill App Store Connect / Play Console", "fill the store pages", "/pack-store-listing", points to a STORE_LISTING.md, or asks to remake the store videos after the app changed. New user feedback goes in your notes (mm notes add), never in this file.
metadata:
  category: pack
  depends-on: revise-video
---

# pack-store-listing

Everything an app needs on both stores, made from the app itself. **Read `specs.md` first**: it has
every size, limit and rule, and `scripts/check-assets.py` checks files against it.

| Part | What | Where it goes |
| --- | --- | --- |
| Audit | Every store asset checked, pass or fail, and what's missing | A table in chat |
| Screenshots | iPhone 6.3" (App Store Connect's iPhone slot; 6.9"/6.5" optional), Android phone 1080×1920, iPad/tablets for tablet apps | `<app repo>/<web public>/store-listing/ios|android/…` |
| Icons | `ios/app-icon-1024.png` (copy of the build's), `android/play-icon-512.png` | same |
| Feature graphic | 1024×500 for Play | same |
| App Store header and search results | 5244×2950 header (no text), 3840×2560 search asset (the headline), from real screens | `ios/creative/` (`template/creative/render.mjs`) |
| App Store preview | 886×1920, 15–30 s, silent stereo AAC | MediaMake project `<app>-store-preview` → `ios/app-preview.mp4` |
| Play promo video | 1920×1080, ~30 s, for YouTube | MediaMake project `<app>-store-promo` → `android/promo-video.mp4` |
| Pages | Support (Apple requires it), privacy, account deletion (Play requires it) | The app's website |
| Guide | `STORE_LISTING.md`: each store's assets, text with limits, URLs, forms, reviewer sign-in, an answer for every console field | Beside the app (e.g. `mobile/`) |
| Consoles | Play Console, YouTube (the promo, Unlisted) and App Store Connect filled from the guide | The stores (`consoles.md`) |

Portal (TheMoonDevs' work app) is the worked example: `projects/portal-store-preview` (the preview,
its `lib/` cut and its `capture/` setup) and `projects/portal-store-promo`, and the guide at
`moon-portal-app/mobile/STORE_LISTING.md`.

## Rules (from the first run, 2026-11-12)

1. **Audit before making.** Run `uv run scripts/check-assets.py <store-listing folder>` and read the
   guide if there is one. When every required asset already passes, don't remake it: show the audit
   and ask what to add (videos, support page, tablet sets, a new look). The user's question when this
   was skipped: "you already have screenshots in the portal app, why do you need to mock run again?"
   Answer up front: the App Store preview must be **video captured from the app** (guideline 2.3.4),
   and framed marketing stills are cut off and have headlines baked in.
2. **Never record against production.** Build the app pointed at a local mock API and block every
   other host in the browser (`drive.mjs` does it). Then check the bundle: an `.env.local` can beat
   the variable you set, and on the first run one sign-in attempt reached the live portal that way.
   `grep` the built JS for the production address; the build fails if it's there.
3. **Made-up people and companies**, the same cast in screenshots and videos, clearly sample
   (`@demo.example.com` emails). Never a real customer's data, never the user's own account.
4. **A fixed clock**: 9:41 on a weekday, the phone's timezone, so the status bar, "It's 09:41 now" and
   the times of new items agree (the mock's `CLOCK` and the app config's `clock`).
5. **Warm every screen a take pushes to** before recording (open it once and go back), or the push
   shows a blank loading frame while the route's code loads.
6. **The edit draws the phone.** Takes are recorded without the status bar's text and the home
   indicator; `Phone.tsx` draws them, so a push slides the screen under a still status bar as on iOS.
   Tabs switch at once; sheets rise and drop; new scenes crossfade.
7. **The headlines are the screenshots' headlines**, in the same order, so the listing reads as one.
8. **Silent stereo AAC** on both videos: Apple wants an audio track and previews play muted. Music is
   the user's call: ask (with the cost) before generating any.

## 1. Intake

- The app: name, bundle ids, iPhone only or iPad too (`supportsTablet`), icons, theme colours, the
  routes and screens, the API client (every path it calls) and its response types.
- What exists: the guide (`STORE_LISTING.md` or similar), the store-listing folder, the brand kit
  (ProjectSync `get_brand_kit`, or `brands/<name>/`), the privacy / terms / deletion / support pages.
- A sign-in path the capture can use without a real account: a reviewer test sign-in (Portal's code
  `TEST12` + email and password), or a token the app reads from storage.
- Register the productions: `mm media production new <app>-store-preview --channel=<channel>` and the
  same for `-store-promo`.

## 2. Audit

`uv run scripts/check-assets.py <folder> [--tablet]` → one line per file. Report it as a table
(required / optional, pass / fail / missing), plus the pages (open each URL) and the guide's gaps.
Ask what to make when nothing required is missing (rule 1).

## 3. Capture setup (once per app, in `projects/<app>-store-preview/capture/`)

Install the kit's one dependency once, outside the skill: `npm install --prefix
~/.cache/pack-store-listing --no-package-lock puppeteer-core` (it drives the installed Chrome;
`CHROME_PATH` points elsewhere, `CAPTURE_DEPS` moves the install).

| File | What | Portal's |
| --- | --- | --- |
| `build-web.sh` | Builds the app for the browser at the mock's address, then patches the build for capture only (never the app's code) | `expo export -p web` + 3 patches, below |
| `data.mjs` | The sample company: people, projects, tasks, chats, all relative to the fixed day | Meera Nair at TheMoonDevs and Studio Nine |
| `routes.mjs` | `handle(method, path, query, body, now)` answering every path the screens call, in the API's own envelope, keeping changes in memory; `demo` actions for things that arrive mid-take | `{ status, data }`, a teammate's chat reply |
| `app.mjs` | `base`, `clock`, `timezone`, `tabs` (name, route, icon), `signIn`, `takes`, `shots` | 4 takes, 8 shots |

Find the API paths with a grep over the client (`grep -rhoE "api(<[^>]*>)?\(\s*['\`][^'\`]+" src`), take
the shapes from the app's types, then run the mock and fix what the log calls `unhandled` and what
looks empty on screen.

Expo / React Native Web builds needed these (check each still applies; `build-web.sh` warns):
- The API address baked from `app.config` `extra`: rewrite it in `_expo/static/js/web/*.js`.
- `expo-notifications`' `getLastNotificationResponse` throws on the web and blanks the app after
  sign-in: make it return null.
- `expo-symbols` draws nothing on the web for `{ ios, android }` names: make it use the Android
  (Material Symbols) name; the font ships with the build.
- `NativeTabs` render as a top bar on the web: `phoneChrome({ tabs })` hides it and draws the iOS
  bottom bar that taps it (pointer events, not click alone).

No web build (a native-only app)? Record the iOS Simulator (`xcrun simctl io booted recordVideo
--codec=h264 take.mov`, then crop the status bar out or keep it and skip Phone.tsx's) or an Android
emulator (`adb shell screenrecord`), signed in to a demo account with sample data, and write each
take's `events` by hand from the video.

## 4. Record

```bash
CLOCK=<clock + 30 s> node <skill>/scripts/capture/mock-server.mjs <web build> 4545 capture/routes.mjs [<public dir>] &
node <skill>/scripts/capture/record.mjs capture/app.mjs input/takes [take…|shots]
```

Restart the mock before each run: it keeps the takes' changes (a task set Done stays Done). Each take
gives `<take>.mp4` (886×1920, 30 fps) and `<take>.json` (its events). **Look at every take** before
editing: `ffmpeg -i take.mp4 -vf "fps=3,scale=120:-1,tile=36x1" -frames:v 1 strip.png`, and single
frames around each event. Check: no blank frames on pushes, no browser focus rings, no web-only
quirks, the reaction or reply actually happened, times match the clock.

Takes that work (Portal's): Home with a scroll down and back, then a tab; a task changed in one tap,
then a typed note in a sheet; a list, then a detail page with a scroll; a chat with a reaction, a sent
message and a reply arriving. One idea per take, each 8–15 s raw.

## 5. Screenshots (when they're missing or the screens changed)

`record.mjs … shots` saves each screen of `app.shots` at 886×1920 with the status bar. Frame them in
the brand's look (headline above, device below running off the bottom edge, as the videos), one still
per screen, at 1320×2868 for iPhone 6.9" and 1080×1920 for Android phones (redraw rather than stretch:
the shapes differ), then 6.5" and 6.3" only if asked. The template's `Brand.tsx` (mark, fonts,
captions) and `Phone.tsx` frame are the pieces; a still is one frame of a composition whose frame N is
screen N (`mm stills <slug> 0,0.0334,…`). Portal's current set was framed in an earlier session and
its stills composition isn't in the template yet: build it when first needed and add it here.

## 5b. Header and search results (App Store, iOS 27)

`template/creative/render.mjs` draws both in HTML from the shots (`record.mjs … shots`) and renders
them at full size with headless Chrome. It has Portal's look: the dark ground and ring from the
feature graphic, three phones, the mark and the screenshots' headline. Copy it into the project's
`creative/` with the screens in `creative/screens/`, change the brand bits, run
`node creative/render.mjs <out>`, and copy the PNGs into the store-listing folder's `ios/creative/`.
The header has no text and keeps its focal point in the middle (Apple crops it per device). After
uploading, check both in App Store Connect's Device Preview (consoles.md).

## 6. The videos

1. `cp -r <skill>/template/lib projects/<app>-store-preview/lib`, copy the takes into
   `input/takes/`, then edit:
   - `plan.ts`: `TAKES_DIR`, `CAPTIONS` (the screenshots' headlines), the event times `T` from the
     takes' json, and `CLIPS` (which part of which take, speed for scrolls and typing, how it enters:
     `push`, `sheetUp`, `sheetDown`, `fade`, `cut`). Cut dead time where the screen is still (waiting
     for a reply). Keep the preview at 15–30 s: `node --experimental-strip-types -e
     "import('./lib/plan.ts').then(m => console.log(m.totalSeconds()))"`.
   - `Brand.tsx`: the brand's fonts, ink and ground colours, the mark's SVG.
   - `Preview.tsx` (portrait, the screenshots' look) and `Promo.tsx` (landscape, the feature
     graphic's look; `atPace()` plays it closer to real time and its end card names the store).
2. `input/project.json` `{ "audio": "silence.wav" }`, `input/lyrics.json` `[]`, and the silence at the
   exact length: `ffmpeg -f lavfi -i anullsrc=r=48000:cl=stereo -t <totalSeconds> -c:a pcm_s16le
   input/silence.wav`. `video/index.tsx` is one layer: `defineProject({ id, fps: 30, width: 886,
   height: 1920, layers: [layer({ scene: Preview, at: 'all' })] })`. The promo project has its own
   `input/` and imports `../../<app>-store-preview/lib/Promo`.
3. `mm prepare <slug>`, then `mm stills <slug> <a second in each clip, mid-transition, the end card>`
   and look at them as a contact sheet. Review with the user through revise-video when they want to
   see motion before the master.
4. `mm render <slug>` for each, then make the store files and check them:
   ```bash
   ffmpeg -i out/<preview>.mp4 -c:v libx264 -profile:v high -pix_fmt yuv420p -r 30 -b:v 10M -maxrate 12M -bufsize 20M \
     -c:a aac -b:a 256k -ar 48000 -ac 2 -movflags +faststart <store-listing>/ios/app-preview.mp4
   ffmpeg -i out/<promo>.mp4 -c:v libx264 -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -ar 48000 -ac 2 \
     -movflags +faststart <store-listing>/android/promo-video.mp4
   uv run <skill>/scripts/check-assets.py <store-listing>
   ```

## 7. Pages and the guide

- **Support** (Apple requires a Support URL): a public page with the contact email and the answers
  people need (signing in, notifications, offline, lost phone, data). Check each claim against the
  app (section names, error messages); promise no reply times the user didn't give.
- **Privacy** and **account deletion** (Play requires a deletion URL when there are accounts).
- Public routes: add new pages to the site's public lists (middleware, sign-in gates).
- `STORE_LISTING.md`: at a glance (store, asset, size, file, needed?), each store's images, text with
  limits and suggested copy, URLs, forms, reviewer sign-in, the description, the screenshots table
  and the videos table (time, headline, what it shows) and how to remake them (this skill).
- **An answer for every console field**, so step 8 is copying: the app name for each store (with a
  fallback when the plain name is taken in App Store Connect), subtitle, short description,
  promotional text, keywords, categories, copyright, URLs, the age rating questionnaire answer by
  answer and any override, App Privacy data types with purposes / linked / tracking, Play's app
  content forms, the reviewer notes, the YouTube title and description, and what's left to the user.
  `consoles.md` lists every field.

Changes to the app's repo go on a branch with a PR (a worktree when other sessions share the
checkout), never on main. Large videos: ask before committing them; they can live in the MediaMake
out folder or ProjectSync (a release) instead.

## 8. Fill the consoles

With Claude in Chrome, in the user's profile signed in to the stores: **read `consoles.md`**. It has
every page, field, limit and the way each takes input (some only take typing, Play's asset panel
needs real clicks and an ordering pass, uploads stop at 10 MB). Fill from the guide, then:

- Upload the promo to the YouTube channel the user names, as **Unlisted**, and put its link in Play.
- Upload `iphone-6.3/` to App Store Connect's iPhone slot (it takes 6.1"/6.3" sizes only) and the
  preview (under 10 MB for the upload).
- Ask before each Save; leave passwords, declarations, Publish, Send for review and Add for Review to
  the user, and say exactly which are left.
- Afterwards, write what the consoles actually hold back into the guide (names, links, ratings), so
  the next run starts from it.

## Checklist before handing over

- [ ] `check-assets.py` passes; every optional item is either made or listed as skipped.
- [ ] The preview is 15–30 s, 886×1920, ≤30 fps, H.264, stereo AAC; the promo plays in a browser.
- [ ] No real person, email or company in any frame; the clock says 9:41 everywhere.
- [ ] Headlines match the screenshots; the end card has the store's name only where true.
- [ ] Support, privacy and deletion URLs open without signing in.
- [ ] The guide names every file and field, and how to remake the videos.
- [ ] The consoles hold what the guide says, and the user knows which saves, declarations and
      submissions are theirs.
