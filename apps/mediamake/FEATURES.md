# Mediamake — Feature Ideas & Roadmap

> Personal-use internal tool. No production/legal constraints.  
> Anything goes — scraping, automation, browser extensions, experimental UI.

---

## Table of Contents

1. [3D Scene Builder (In-App Blender)](#3d-scene-builder-in-app-blender)
2. [AI Workflows & Pipelines](#ai-workflows--pipelines)
3. [Content Intelligence](#content-intelligence)
4. [Web Scraping & Automation](#web-scraping--automation)
5. [Browser Extension](#browser-extension)
6. [Media Library & Search](#media-library--search)
7. [UI / App Features](#ui--app-features)
8. [Infrastructure & DX](#infrastructure--dx)

---

## 3D Scene Builder (In-App Blender)

### Verdict: Doable. Low risk. Surprisingly minimal effort for basic use.

This is probably the most exciting idea in this doc. Here's an honest breakdown:

### What's actually feasible in a web app

You're not building Blender. But you don't need to. For **B-roll, background shots, product showcases, abstract animations, and logo reveals** — a minimal 3D scene builder using **Three.js + React Three Fiber** covers ~80% of real needs with ~20% of the complexity.

The web rendering stack is genuinely capable now:
- **Three.js / React Three Fiber** — full WebGL scene graph, PBR materials, shadows, post-processing
- **@react-three/drei** — prebuilt helpers: orbit controls, environment maps, text3D, gltf loaders, sky, sparkles, float, etc.
- **Leva** — instant GUI panel for all parameters (exactly like Blender's properties panel)
- **Spline** — if you want a design-first tool embedded via iframe/SDK

### What you can build, step by step

#### Phase 1 — Simple Scene Composer (1–2 days)
- Primitive shapes: box, sphere, cylinder, torus, plane
- Transform handles (position, rotation, scale) via drei's `<TransformControls>`
- Material editor: color, roughness, metalness, opacity
- Lighting: directional, point, ambient, HDRI environment via `<Environment>`
- Camera orbit controls
- Export frame as PNG via `gl.domElement.toDataURL()`
- Upload PNG directly to S3 as a MediaFile

**Libraries needed:** `three`, `@react-three/fiber`, `@react-three/drei`, `leva`  
**Risk:** Very low. All of these are stable, widely used.

#### Phase 2 — Animation & Video Export (2–3 days)
- Timeline with keyframes for position/rotation/scale per object
- Loop animation toggle
- Record canvas as video using the browser's `MediaRecorder` API (captures WebGL canvas → webm/mp4)
- Upload recorded video to S3

**Key API:** `new MediaRecorder(canvas.captureStream(30))` — native browser, no extra deps  
**Risk:** Low. MediaRecorder is well-supported. WebM output works natively; MP4 needs a muxer (mp4-muxer npm package, small).

#### Phase 3 — Asset Library & Templates (1–2 days)
- Import GLTF/GLB files (product models, characters) via `useGLTF` from drei
- Pre-built scene templates: floating product, spinning logo, particle background, neon room
- Save/load scene as JSON (Three.js built-in scene serializer)

#### Phase 4 — Advanced (optional, later)
- Shader editor (GLSL with visual nodes — use `leva` + uniforms)
- Physics (rapier.js via `@react-three/rapier`)
- Text3D with custom fonts
- Post-processing: bloom, depth of field, chromatic aberration via `@react-three/postprocessing`

### Sample use cases this unlocks
- Rotating product shot (no AI needed, just your 3D model or a primitive + texture)
- Abstract particle/crystal background for YouTube intros
- Neon logo reveal animation
- Floating UI mockup in 3D space
- Simple architectural/interior background shot
- "Tech aesthetic" grid/wireframe backgrounds

### Implementation location
Add a new page/route: `app/(mediamake)/3d-studio/page.tsx`  
The entire editor is client-side — no server needed for the builder itself.  
Only the export (PNG/video → S3) touches your API.

### Complexity summary

| Task | Complexity | Time estimate |
|------|-----------|---------------|
| Basic scene + shapes + export PNG | Low | 4–6 hours |
| Animation + video record + S3 upload | Low-Medium | 1–2 days |
| GLTF import + scene save/load | Low | 4–6 hours |
| Pre-built templates | Low | 2–3 hours each |
| Full Blender-style editor | Very High | Months — don't do this |

**Recommendation:** Build Phase 1 + 2 first. You'll have a usable tool in a weekend that covers 80% of your 3D B-roll needs.

---

## AI Workflows & Pipelines

### 1. Visual Workflow Builder (Node Graph UI)
A drag-and-drop node editor where each node is a worker. Connect outputs to inputs visually.

- **UI:** ReactFlow for the graph editor
- **Execution:** Server-side, each node triggers a worker call, passes output to connected nodes
- **Storage:** Save workflow graphs as JSON in MongoDB
- **Examples:**
  - `[Script Writer] → [ElevenLabs TTS] → [D-ID Avatar] → [Lipsync] → [Subtitle Burner]`
  - `[Pexels Stock] → [FFmpeg Compose] → [Kling AI] → [Magnific Upscale]`

This is the single highest-leverage feature. Everything else gets more powerful once workflows exist.

### 2. Scheduled Workflows (Cron Jobs)
- Run any workflow on a schedule: daily, weekly, on new trending topics
- Example: every Monday 8am → scrape Google Trends → generate 5 shorts for the week
- Implementation: use `mcp__scheduled-tasks` or a simple cron in your Next.js app

### 3. AI Script Writer
Dedicated UI page + worker:
- Input: topic, platform (TikTok/YouTube Shorts/Instagram Reels/LinkedIn), tone, target duration
- Output: full script with scene breakdown, voiceover text per scene, suggested B-roll search terms, hook options (3 variants), CTA suggestions
- Model: Gemini 2.0 Flash (fast + cheap) or GPT-4o

### 4. One-Click "Make Video" Button
The magic button: type a concept → AI figures out the full pipeline → runs it → gives you a video.
- AI decides: which video model to use, generate script, pick B-roll queries, generate audio
- Shows a live progress log as each step completes
- Think: "AI video from text" but using YOUR worker library under the hood

### 5. Workflow Templates (Pre-built pipelines)
Save and share common workflows as JSON:
- `talking-head-from-text` — script → TTS → D-ID → lipsync → subtitles
- `product-showcase` — scrape URL → extract images → 3D scene or Kling → music → subtitles
- `blog-to-short` — URL → Whisper/scrape → script → avatar → captions
- `trend-content` — Google Trends → script → generate → post-ready

---

## Content Intelligence

### 6. Auto-Subtitle / Transcriber
- Input: any video URL or S3 path
- Process: extract audio → OpenAI Whisper (`/v1/audio/transcriptions`, response_format: `srt`)
- Output: SRT file saved to S3 + optionally burned into video
- Also output: full transcript, word-level timestamps

### 7. Video Repurposer
- Input: long video (YouTube, podcast, webinar)
- Steps: transcribe → AI finds best 60-second clips → extract clips with FFmpeg → add captions → output 3-5 ready shorts
- Great for turning 1 long video into a week of content

### 8. Image-to-Prompt Reverse Engineer
- Input: any image URL
- Output: prompt optimized for Flux / Ideogram / Nanobanana (model-specific prompt style)
- Uses GPT-4o Vision or Gemini Vision
- Perfect for: "I like this image, recreate it in a different context"

### 9. Competitor / Inspiration Scraper
- Input: any public page URL, Instagram handle, TikTok profile, YouTube channel
- Output: list of media URLs, thumbnails, titles, engagement data
- Uses Puppeteer for JS-rendered pages
- Saves everything to your media library as inspiration tags

### 10. Trend Radar
- Scrape Google Trends, TikTok Creative Center, Reddit rising, Twitter trending
- Returns: top trends by category + suggested video/image angles for each
- Schedule to run daily → appears on your dashboard as a "Today's Trends" panel

### 11. A/B Variant Generator
- Input: one concept or existing piece of content
- Output: N variations (different hook, different visual style, different voiceover energy)
- All auto-generated, saved with same projectId for easy comparison
- Track which performs better (manual note or future analytics)

---

## Web Scraping & Automation

### 12. Puppeteer Web Scraper Worker
Already have `@microfox/puppeteer-sls` in externalDeps — just need a dedicated worker.

```
Input: {
  url: string,
  waitFor?: string,             // CSS selector to wait for
  extractSelectors?: Record<string, string>,  // named → CSS selector
  screenshot?: boolean,
  fullPage?: boolean,
  script?: string               // JS to run in page context
}
Output: { text, html, extractedData, screenshotUrl }
```

Use cases:
- Extract product info from any e-commerce page
- Screenshot any URL (social proof, receipts, dashboards)
- Pull article content for script generation
- Monitor pages for changes

### 13. Social Media Downloader Worker
Downloads video/audio from any social platform using yt-dlp as a subprocess.

```
Input: { url, quality: '1080p'|'720p'|'audio_only', extractSubtitles?: boolean }
Output: { videoUrl, audioUrl, thumbnailUrl, title, duration, subtitlesUrl? }
```

Works for: YouTube, TikTok, Instagram, Twitter/X, Facebook, Reddit, Vimeo, and 1000+ more.  
Implementation: spawn `yt-dlp` process, save to `/tmp`, upload to S3.

### 14. Meta Ads Library Scraper
Puppeteer script that navigates Meta's Ads Library with your search query:
- Downloads all ad videos/images for a search
- Extracts ad copy text
- Saves to media library tagged `inspiration/competitor`
- Run on demand or weekly

### 15. TikTok Creative Center Scraper
Similar to above — scrape trending TikTok ads and viral sounds:
- Top ads by industry
- Trending hashtags + engagement
- Popular sound URLs

### 16. Screenshot-to-Video (Puppeteer Screen Recorder)
Record a web page interaction as a video:

```
Input: {
  url: string,
  actions: Array<{ type: 'scroll'|'click'|'type'|'wait', selector?, value?, duration? }>,
  viewport: { width, height },
  fps?: number
}
Output: { videoUrl }
```

Use for: product demos, tutorial recordings, UI walkthroughs, social proof captures.

### 17. Google Search Scraper
Search Google and get structured results:
- Top organic results (title, URL, snippet)
- Related searches
- "People also ask" questions
- Useful for: content research, SEO angle discovery, trend analysis

---

## Browser Extension

### 18. "Mediamake Capture" Chrome Extension
A sidebar extension that connects to your running mediamake instance.

**Core features:**
- **Save to Library:** Right-click any image/video on any page → save directly to S3 + MongoDB with tags
- **Generate Variations:** Select an image → "Make 4 variations" → opens generation modal with Flux/Nanobanana
- **Capture Selection:** Select any text → "Generate voiceover" → calls ElevenLabs → plays back + saves
- **Screenshot:** Full page or element screenshot → saved to library
- **Scrape Page:** One click → extract all images/videos/text from current page → save batch

**Implementation:**
- Chrome Extension Manifest V3
- Side panel API (modern Chrome)
- Calls your mediamake `/agent` endpoint directly via fetch
- Auth: simple API key stored in extension storage

### 19. Ads Harvester Extension
One-click mode: browsing Facebook/TikTok/Instagram → extension auto-detects video ads in view → saves them to library in background.

- Intercepts network requests for video URLs (using chrome.devtools.network)
- Or: injects content script to find `<video>` elements
- Background downloads via service worker

### 20. Prompt Injection Enhancer
When you're on ChatGPT, Claude, Midjourney, or any AI tool — adds a sidebar with your saved prompt templates, styles, and assets.  
One click → inserts your saved style prompt into the text field.

---

## Media Library & Search

### 21. Semantic Search
Vector search over your entire `mediaFiles` collection using embeddings.

- Generate embeddings for every asset (image embedding via CLIP, text embedding for metadata)
- Store in MongoDB Atlas Vector Search (already using MongoDB)
- Search: "sunset beach drone shot" → returns your closest matching videos
- Never re-buy or re-generate an asset you already have

### 22. Smart Tagging / Auto-Label
When any file is saved to the library, auto-run classification:
- Images: GPT-4o Vision → describe → extract tags, dominant colors, objects, style
- Videos: extract keyframe → same as image
- Audio: Whisper → transcribe if speech, else classify as music/sfx/ambience
- All tags stored in MongoDB for filtering

### 23. Duplicate Detection
Before uploading any file:
- Compute perceptual hash (pHash for images, audio fingerprint for audio)
- Check MongoDB for existing match
- If found: return existing URL, skip re-upload
- Saves storage + API calls on repeated generations

### 24. Media Collections / Boards
Pinterest-style boards for organizing assets:
- Create a "Project: TikTok Campaign Q3" collection
- Drag assets into collections
- Export entire collection as a ZIP
- Share collection URL (read-only)

### 25. Version History for Generated Assets
When you regenerate something:
- Don't overwrite — save as new version linked to same "asset group"
- View version timeline: see all variations
- Restore any previous version

---

## UI / App Features

### 26. Generation Queue + Live Progress
Visual queue panel showing:
- All running/pending worker jobs
- Live status (polling count, current step)
- Cancel button
- Auto-refresh result when done (WebSocket or SSE)

### 27. Asset Preview Player
Inline media player in the library:
- Video: play/pause, scrub, frame-by-frame
- Audio: waveform visualization + playback
- Image: zoom, compare before/after (for upscaled images)

### 28. Quick Actions Bar
When selecting any asset in the library, show action buttons:
- Video: "Add Subtitles", "Upscale", "Lipsync", "Trim", "Extract Audio"
- Image: "Upscale", "Generate Variations", "Edit with Flux Kontext", "Animate (Kling/Runway)"
- Audio: "Transcribe", "Use as Lipsync Source"

### 29. Project Management
Group all assets, scripts, and generations under a project:
- Project has: name, description, platform target, brand colors, default voice
- All workers auto-inherit projectId
- Project dashboard: all generated assets, cost so far, workflow runs

### 30. Brand Kit
Save once, use everywhere:
- Logo (uploaded or S3 URL)
- Brand colors (hex values)
- Default voice (ElevenLabs voice_id)
- Default music style (for Udio)
- Default intro/outro clips
- Workers automatically pull from brand kit when not overridden

### 31. Script Editor
A simple editor for writing/editing video scripts before sending to TTS:
- Side-by-side: script text + estimated duration
- Click any line → preview voiceover via ElevenLabs
- Export as .srt for direct use in subtitle-burner
- AI rewrite button: "Make this more engaging / shorter / funnier"

### 32. Clipboard Watcher
A small background utility: monitors system clipboard.  
When you copy an image URL or file: auto-pops a mini panel asking "Save to library? Generate variations?"  
Implemented as a small Electron wrapper or as a browser extension background service.

---

## Infrastructure & DX

### 33. Worker Cost Tracker
Log every worker call to MongoDB with estimated cost:
- Per-worker cost rates hardcoded (e.g. Kling = $0.08/sec, ElevenLabs = $0.30/1k chars)
- Dashboard: daily/weekly spend breakdown by worker
- Budget alerts: warn when approaching a threshold

### 34. API Health Monitor
`health-check.worker.ts` — run nightly:
- Makes minimal test call to each external API
- Reports: up/down, latency, any changed response formats
- Saves report to MongoDB
- Shows status indicators on worker selection UI ("Kling: operational | Veo: slow")

### 35. Batch Processor
Generic wrapper worker:
```
Input: { workerId, inputs: any[], concurrency: 1–5, delayBetweenMs?: number }
Output: { results[], failed[], durationMs }
```
Run 50 image variations overnight without writing any loop code.

### 36. Worker Playground / Test Panel
A developer panel (accessible at `/dev/workers`):
- Select any worker from a dropdown
- See its input schema rendered as a form
- Submit and see raw output + timing
- Useful for testing new workers without building a full UI

### 37. Environment Variable Manager
A simple UI at `/dev/env` listing all required env vars for all workers:
- Shows which are set (green checkmark) vs. missing (red)
- Click to update value (writes to your local .env or deployment config)
- No more hunting through worker files to find what's needed

### 38. Worker Chaining Helper (Code Gen)
A utility that, given a goal in plain English, suggests which workers to chain and in what order, and generates the TypeScript code for the workflow.  
Basically: "I want to turn a blog post into a TikTok video" → generates the full pipeline code.

---

## Priority Order Recommendation

| # | Feature | Impact | Effort | Do first? |
|---|---------|--------|--------|-----------|
| 1 | 3D Scene Builder (Phase 1+2) | High | Low | ✅ Yes |
| 2 | Visual Workflow Builder | Very High | Medium | ✅ Yes |
| 3 | AI Script Writer | High | Low | ✅ Yes |
| 4 | Auto-Subtitle (Whisper) | High | Low | ✅ Yes |
| 5 | Social Media Downloader (yt-dlp) | High | Low | ✅ Yes |
| 6 | Puppeteer Scraper Worker | High | Low | ✅ Yes |
| 7 | Semantic Search | High | Medium | Soon |
| 8 | Chrome Extension (Capture) | High | Medium | Soon |
| 9 | Smart Auto-Tagging | Medium | Low | Soon |
| 10 | Live Generation Queue UI | Medium | Low | Soon |
| 11 | Brand Kit | Medium | Low | Soon |
| 12 | Video Repurposer | High | Medium | Later |
| 13 | Trend Radar | Medium | Medium | Later |
| 14 | Cost Tracker | Low | Low | Later |
| 15 | Ads Library Scraper | Medium | Medium | Later |
