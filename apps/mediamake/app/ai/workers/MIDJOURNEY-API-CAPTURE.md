# How to capture Midjourney’s API (for the midjourney-submit worker)

The `midjourney-submit` worker calls Midjourney’s **backend APIs** with your session cookie. Those APIs are not public, so we discover them from the web app. This doc is your guide and the place to paste what you find so we can wire the worker correctly.

---

## Step 1: Capture the “submit prompt” request

1. **Log in** at [midjourney.com](https://www.midjourney.com) in Chrome.
2. Open **DevTools** (F12 or right‑click → Inspect).
3. Go to the **Network** tab.
4. In the filter bar, type `fetch` or `XHR` (or leave as “All”) so you see API calls.
5. **Clear** the list (click the “clear” icon).
6. On the Midjourney imagine page, type a prompt and **submit** (Enter or the submit button).
7. In the Network list, find the request that was sent **when you submitted**:
   - Look at **Request URL** (might be something like `…/api/…` or `…/graphql` or `…/app/…`).
   - Note the **Method** (usually `POST` for submit).
8. Click that request. In the right panel you’ll see:
   - **Headers** (Request URL, Request Method, Request Headers, etc.)
   - **Payload** (request body)
   - **Response** (response body)

Capture and paste the following into the template below (or into this file).

---

## What to copy and where to put it

### A. Submit prompt (imagine) – required

Fill this so we know exactly which endpoint and body to use.

| Field | What to copy |
|--------|----------------|
| **Request URL** | Full URL (e.g. `https://www.midjourney.com/api/jobs/imagine`) |
| **Method** | Usually `POST` |
| **Request headers** | At least: `Content-Type`, and whether `Cookie` is sent (we already send cookie from the extension). Any custom headers (e.g. `X-...`, `Authorization`) |
| **Request payload** | Exact JSON or form body (e.g. `{"prompt":"...", "folder":"..."}`) |
| **Response (success)** | A sample JSON response when it succeeds (so we can map `jobId` / queue info) |

Paste your captured values below (replace the placeholders).

---

## Captured: Submit prompt (imagine) ✅ Implemented

**Request URL:**  
```
https://www.midjourney.com/api/submit-jobs
```

**Method:**  
```
POST
```

**Request headers (required):**  
```
Content-Type: application/json
Cookie: (session cookies from extension; must include __Host-Midjourney.AuthUserTokenV3_i for channelId derivation)
Referer: https://www.midjourney.com/imagine
x-csrf-protection: 1
```

**Request payload (body):**  
```json
{
  "f": { "mode": "fast", "private": false },
  "channelId": "singleplayer_<midjourney_id>",
  "roomId": null,
  "metadata": {
    "isMobile": null,
    "imagePrompts": 0,
    "imageReferences": 0,
    "characterReferences": 0,
    "depthReferences": 0,
    "lightboxOpen": null
  },
  "t": "imagine",
  "prompt": "your prompt text here"
}
```
`channelId` is `singleplayer_` + the user's Midjourney UUID. The worker derives it from the JWT in cookie `__Host-Midjourney.AuthUserTokenV3_i` (field `midjourney_id`), or you can pass `channelId` in the worker input.

**Response (success) – sample:**  
```json
{
  "success": [{
    "job_id": "15f2676f-ee30-4b36-8b28-1204dda05ab8",
    "prompt": "...",
    "is_queued": false,
    "softban": false,
    "event_type": "diffusion",
    "flags": { "mode": "fast", "visibility": "public" },
    "meta": { "height": 1024, "width": 1024, "batch_size": 4, "parent_id": null, "parent_grid": null },
    "optimisticJobIndex": 0,
    "personalization_codes": null
  }],
  "failure": []
}
```

**Note:** The request to `https://proxima.midjourney.com/` is analytics (Amplitude); it is not required for submitting jobs.

---

## How image delivery works (only 2 HTTP calls in the cycle)

When you submit from the Midjourney website, **only two API calls** happen in the generation cycle:

1. **POST https://www.midjourney.com/api/submit-jobs** – submits the prompt and returns `job_id`.
2. **POST https://proxima.midjourney.com/** – analytics only (Amplitude), not for images.

There is **no REST endpoint** like `GET /api/jobs/{job_id}` that returns the generated image URL. The live image updates in the UI are almost certainly delivered via:

- **WebSocket**, or  
- **Server-Sent Events (SSE)**, or  
- Some other real-time channel (e.g. long polling or a different API we haven’t seen).

So the worker only does **submit** and returns `job_id`. To auto-save generated images we would need to replicate how the app receives the final image URL(s).

### How to capture the “get image” part (WebSocket or events)

1. **Open DevTools** on [midjourney.com/imagine](https://www.midjourney.com/imagine) while logged in.
2. Go to the **Network** tab.
3. Enable **WS** (WebSocket) filter, or leave **All** and look for type “websocket” or “eventsource”.
4. **Clear** the list, then **submit a prompt**.
5. Watch for:
   - A **WebSocket** connection (e.g. `wss://…`) that opens and receives messages as the image appears.
   - Or an **EventSource** / fetch that streams or polls.
6. Click the WebSocket (or relevant request) and open the **Messages** (or **Response**) sub-tab.
7. When the grid image appears, note the **message(s)** that contain a URL (e.g. `cdn.midjourney.com/...`) or a “completed” payload with image data.
8. Paste here (or in chat):
   - **WebSocket URL** (or SSE URL).
   - **Sample message(s)** that contain the image URL or completion payload (you can redact long tokens).

Once we have that format, we can add a step in the worker (or a separate process) to subscribe to the same channel with the session cookie and capture the image URL, then save it to the media DB.

---

## How to get the generated image after submit (page-refresh flow)

When the user (or app) **refreshes the job page** after triggering submit, the generated image is available in two ways. Both assume you already have `job_id` from the submit response.

### Option 1: Poll job-status, then use CDN URL

1. **Poll until completed**  
   `POST https://www.midjourney.com/api/job-status`  
   - Headers: `Content-Type: application/json`, `Cookie`, `Referer: https://www.midjourney.com/jobs/<job_id>?index=0`, `x-csrf-protection: 1`  
   - Body: `{"jobIds":["<job_id>"],"_frontend_source":"useJobSubmitter_fetchJobStatus"}`  
   - Response: JSON array of job objects; each has `current_status`: `"running"` → poll until `"completed"`.

2. **All 4 image URLs (construct from job_id)**  
   Each job has `batch_size: 4`. Once completed, all images are at (no auth):
   - `https://cdn.midjourney.com/<job_id>/0_0.png`
   - `https://cdn.midjourney.com/<job_id>/0_1.png`
   - `https://cdn.midjourney.com/<job_id>/0_2.png`
   - `https://cdn.midjourney.com/<job_id>/0_3.png`  
   Pattern: `https://cdn.midjourney.com/<job_id>/0_<index>.png` for index `0` … `batch_size - 1`.

### Option 2: Fetch job page HTML and parse og:image

1. **GET the job page** (with same cookies):  
   `GET https://www.midjourney.com/jobs/<job_id>?index=0`

2. **Parse HTML** for `og:image` / `twitter:image` if you need one preview URL. For all four images, use the pattern above: `0_0.png` … `0_3.png`.

### WebSocket (live progress; optional)

- **URL:** `wss://ws.midjourney.com/ws?token=<websocketToken>&v=4`  
- **Token:** From the job page HTML: `<script id="initialProps">` → `initialAuthUser.websocketToken` (JWT). Same session cookies are used to load that page first.
- **Messages:** JSON lines with `current_status` and `percentage_complete`. When done: `"current_status":"completed","percentage_complete":100`. Progress events can include `imgs[].data` (base64 JPEG) for in-progress frames; the **final** image URL is not in the WS payload—use job-status + CDN URL or job page og:image.

### Summary for "get image after refresh"

| Step | Action |
|------|--------|
| 1 | Submit → get `job_id`. |
| 2 | Poll `POST /api/job-status` until `current_status` is `"completed"`. |
| 3 | Use image URLs: `https://cdn.midjourney.com/<job_id>/0_0.png` … `0_3.png` (4 images; get `batch_size` from job-status if needed). |

---

## B. Optional: "Use last image" (image reference)

If your flow uses “Use” on an image before submitting, there may be a separate API call when you click “Use”. If you want the worker to support that:

1. Clear Network again.
2. Click **Use** on an image (the one that becomes the “last image”).
3. Find the new request that was sent and paste:

**Request URL:**  
**Method:**  
**Request payload:**  
**Response sample:**  

(If there is no separate call and “use last image” is just a flag in the imagine request, say so here.)

---

## C. Optional: Other calls (folders, queue, etc.)

If you see other relevant calls (e.g. list folders, queue size), you can add them in the same format (URL, method, payload, response). One section per endpoint is enough.

---

## After you’ve filled this

- **Option 1:** Save this file and tell me “I filled MIDJOURNEY-API-CAPTURE.md”. I’ll read it and update the worker (URL, path, body shape, response parsing) to match.
- **Option 2:** Paste the same details in chat (URL, method, request body, response sample). I’ll update the worker and optionally update this file so the repo has a record.

Once we have the real endpoint and body shape, we’ll set `MIDJOURNEY_API_BASE` and `MIDJOURNEY_IMAGINE_PATH` (and any required headers) and align the worker’s request/response with what you captured.
