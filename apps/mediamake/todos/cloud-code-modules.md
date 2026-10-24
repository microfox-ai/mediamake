# LATER: CODE MODULES IN THE CLOUD

Shelved on 2026-10-24. Let Claude-written Remotion code render on Lambda and open in the editor without redeploying the Remotion site.

## Why it is shelved

Lyric projects are asset heavy. `apps/lyrics_videos/projects` is 2.1 GB today, and `amz-inexorablemaster2` alone has 504 MB of input, 783 MB of derived media and 461 MB of analysis. Every cloud render would first have to upload what the video uses, and every Lambda chunk would download it again. Until that cost is worth paying, these videos render locally.

## The problem it solves

The Lambda site (`mediamake`) holds all the code, and `inputProps` hold only data. A preset is a stringified function that runs at compile time and emits atom JSON, so any new look needs a site deploy. Claude writes good Remotion code locally, but getting it into the cloud means a git push and a redeploy.

## The plan

1. **Pin runtimes.** The render route uses the site name `mediamake` as `serveUrl`, and `deploy.mjs` redeploys under that same name. An old timeline re-rendered after a deploy runs new atom code. Deploy each runtime under its own name (`mediamake-r12`, `-r13`…), store the runtime version on each timeline, and render with it.
2. **Make lyric anchors data.** Cues use `T = (m: Manifest) => number` closures (`word()`, `bar()`, `beats()`). Return objects instead (`{ word, nth, wi, dt }`, `{ bar }`, `{ section, at }`) and resolve them in the kit, so cues can be JSON.
3. **Code modules.** Bundle a project's scenes with esbuild when publishing, upload to S3 as `modules/<hash>.js` with its props schema and assets, and register it in Mongo. The site keeps a loader plus the shared libraries (react, react-dom, remotion, `@remotion/*`, three, `@react-three/*`, `@microfox/remotion`); modules must not bundle their own copies. A `CodeModule` atom (or a `mod:` registry prefix) runs `delayRender`, fetch, eval with a `require` shim, `registerComponent`, `continueRender`. Use `/* webpackIgnore: true */` or fetch + eval, since webpack rewrites a plain `import(url)`. The same loader runs in the editor's Player and on Lambda.
4. **mediamake MCP server** for desktop Claude: `list_components`, `get_timeline`, `get_references`, `pull_project`, `publish_module`, `update_timeline` (with the timeline `version` for conflicts), `render_stills` via `renderStillOnLambda`, `render`, `render_status`, `get_revisions`.
5. **Cloud agent.** Claude Agent SDK in a container with node, Chrome, ffmpeg and the lyric kit, one sandbox per session, publishing through the same API. Heavy analysis (stems, alignment) stays a mediamake worker the agent calls.

## Things to settle first

- **Assets.** Name uploads by hash so repeats are stored once, serve through CloudFront, and upload only what a video references (never stems).
- **No GPU on Lambda.** WebGL falls back to software rendering, so three.js scenes (`Stage3D`) will be slow. Heavy 3D may need a GPU render box behind the existing render-provider switch.
- **Security.** Modules run in viewers' browsers and in Lambda's Chrome. Render only signed hashes, run the Player in a sandboxed iframe on another origin with a CSP, and keep secrets out of `inputProps`.
- **Forking.** Editing a module from inside a project forks it (new hash) for that project. Promoting it to the shared library is a separate, deliberate step.

## Related

- `/remotion-editor` already compiles a lyric project in the browser from the local folder (sucrase plus a `require` shim). Steps 3 and 5 can reuse that loader.
- `render-duration-without-browser.md` covers resolving durations without a browser, which agents need too.
