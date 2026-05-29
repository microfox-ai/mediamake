# Mediamake Workers — Complete Reference Guide

> Last updated: May 2026  
> All ratings are relative within their category. ⭐ = quality, ⚡ = speed, 💰 = cost efficiency (higher = cheaper), 🔧 = unique feature value

---

## Table of Contents

1. [AI Video Workers](#ai-video-workers)
2. [AI Image Workers](#ai-image-workers)
3. [Audio Workers](#audio-workers)
4. [FFmpeg Workers](#ffmpeg-workers)
5. [Helper Workers](#helper-workers)
6. [Head-to-Head Comparisons](#head-to-head-comparisons)
7. [Suggested New Features](#suggested-new-features)

---

## AI Video Workers

### 1. `google-veo` — Google Veo 3.1

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡ (slow, 3–8 min) |
| Cost | 💰💰 (expensive) |
| Features | 🔧🔧🔧🔧🔧 |

**Models:** `veo-3.1-generate-001` (default), `veo-3.1-fast-001`, `veo-3.1-lite-001`  
**Duration:** 1–60 seconds  
**Required env:** `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_APPLICATION_CREDENTIALS`

**Pros:**
- Best-in-class video quality as of mid-2026
- Native audio generation (ambient sounds, dialogue, music) built-in
- Supports image-to-video (imageUrl input)
- Up to 60 seconds — longest duration of any consumer video model
- Cinematographic controls: camera motion, aspect ratio, person generation
- Handles complex motion, physics, and consistency very well

**Cons:**
- Very slow (Vertex AI long-running ops, can take 5–10 min)
- Expensive (Vertex AI pricing, not a flat API)
- Requires Google Cloud project setup — more DevOps than others
- Output goes through GCS before download

**When to use:**
- Final-quality hero videos for social media
- When you need native audio in the video
- Long-form clips (>10 seconds)
- When image-to-video quality is critical
- Cinematic/documentary style content

**Avoid when:**
- You need results in < 2 minutes
- Quick iteration/testing
- Budget is tight

---

### 2. `kling-ai` — Kling O3 / v2.6

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ (2–4 min) |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Models:** `kling-o3` (default), `kling-v2.6-pro`, `kling-v2.6-std`  
**Duration:** 5, 10, or 15 seconds  
**Required env:** `KLING_API_KEY`, `KLING_API_SECRET`

**Pros:**
- Exceptional human/character consistency and realism
- Best-in-class for talking head and portrait videos
- Camera controls (zoom, pan, push, orbit)
- Motion brush for targeted area animation
- Loop mode for seamless looping content
- Strong at realistic physics and motion

**Cons:**
- JWT auth setup is complex (HMAC-HS256)
- Limited to 15 seconds max
- API costs per generation
- Requires both API key AND API secret

**When to use:**
- Realistic human/character video generation
- Social media reels and short-form content
- When motion control matters
- Looping background videos
- Product showcase animations

**Avoid when:**
- You need > 15 second clips
- Abstract/non-realistic content (Luma or Runway handles it better)

---

### 3. `runway` — Runway Gen-4.5 Turbo

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡ (1–3 min) |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧 |

**Models:** `gen4_5_turbo` (default), `gen4_turbo`, `gen3a_turbo`  
**Duration:** 5 or 10 seconds  
**Required env:** `RUNWAY_API_KEY`

**Pros:**
- Fastest professional-quality video model
- Excellent at artistic/cinematic styles
- Strong consistency with reference images
- Gen-4.5 Turbo is significantly faster than Gen-4
- Great at abstract, stylized, and dreamlike content
- Character reference feature for consistent characters

**Cons:**
- 10 second max duration
- Not as photorealistic as Kling or Veo for humans
- Requires X-Runway-Version header (2024-11-06)
- Credit-based pricing can add up quickly

**When to use:**
- Artistic and stylized video content
- Music videos and abstract visuals
- Quick iterations (fastest among high-quality models)
- Concept visualization
- Dream/surreal aesthetic content

**Avoid when:**
- Photorealistic human faces (Kling is better)
- Long clips needed

---

### 4. `luma-dream-machine` — Luma Ray 3.14

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ |
| Cost | 💰💰💰💰 (best value) |
| Features | 🔧🔧🔧🔧 |

**Models:** `ray-3.14` (default), `ray-3`, `ray-2`, `ray-flash-2`  
**Required env:** `LUMA_API_KEY`

**Pros:**
- Best cost-to-quality ratio for video generation
- Camera motion presets built-in (orbit, push in, pull out, etc.)
- Keyframe control (start + end frame for img2vid)
- Strong at fluid motion and natural movement
- Ray Flash 2 is extremely fast for quick drafts
- Good at diverse content types

**Cons:**
- Not as detailed as Veo or Kling at max quality
- Character consistency can vary

**When to use:**
- High-volume video generation (cost-efficient)
- When you need camera movement control
- Defining start/end frames for smooth transitions
- Quick drafts with ray-flash-2
- Product and lifestyle content

---

### 5. `pika-labs` — Pika (via fal.ai)

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡ |
| Cost | 💰💰💰💰 |
| Features | 🔧🔧🔧 |

**Models:** fal.ai hosted Pika models  
**Required env:** `FAL_API_KEY`

**Pros:**
- Fast generation via fal.ai infrastructure
- Good for quick social media clips
- Affordable
- Fun Pikaffects/motion styles

**Cons:**
- Pika's quality lags behind Kling, Runway, and Veo
- Less control than other models
- Now routes through fal.ai (indirect relationship)

**When to use:**
- Rapid prototyping
- High-volume low-cost generation
- Simple motion additions to images

---

### 6. `minimax-video` — Hailuo 2.3

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧 |

**Models:** `hailuo-2.3` (default), `hailuo-2.3-fast`, `video-01-director`  
**Required env:** `MINIMAX_API_KEY`, `MINIMAX_GROUP_ID`

**Pros:**
- Director mode for precise camera control
- Good quality at competitive price
- Live2D mode for animated character content
- Strong Chinese-market alternative with global access

**Cons:**
- Less community support/documentation in English
- Consistency can be hit-or-miss

**When to use:**
- When Runway/Kling are over budget
- Director/camera control workflows
- Animated character content (Live2D mode)

---

### 7. `wan-video` — Alibaba Wanx 2.1

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ |
| Cost | 💰💰💰💰💰 (cheapest) |
| Features | 🔧🔧🔧 |

**Required env:** `DASHSCOPE_API_KEY`

**Pros:**
- Cheapest professional video model
- VACE model for video editing (not just generation)
- Both t2v and i2v in one API
- Good quality relative to price

**Cons:**
- Chinese API, latency can vary
- Less sophisticated than Kling/Veo

**When to use:**
- Budget batch generation
- Video editing workflows (VACE)
- Experimenting with lots of variations cheaply

---

### 8. `heygen-avatar` — HeyGen v3

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ |
| Cost | 💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Required env:** `HEYGEN_API_KEY`

**Pros:**
- Best-in-class AI avatar/spokesperson videos
- Custom avatar creation from photos/videos
- Multi-language voice sync
- Professional talking-head quality
- v3 API with video agents
- Ideal for marketing and explainer videos

**Cons:**
- Expensive for high volume
- Limited to avatar-style content
- Not general-purpose video generation

**When to use:**
- Product explainer videos
- Marketing spokesperson content
- Training/tutorial videos
- Multilingual content (dubbing avatars)

**Avoid when:**
- General video generation
- Non-talking-head content

---

### 9. `d-id` — D-ID Talking Portraits

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡ |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧 |

**Required env:** `DID_API_KEY`

**Pros:**
- Animates any still photo into a talking head
- TTS built-in (no need for separate audio)
- Fast turnaround
- Great for turning existing photos into video
- Basic auth (simple setup)

**Cons:**
- Quality below HeyGen for premium use
- Less customization than HeyGen

**When to use:**
- Animating existing photos/portraits
- Quick talking head from any image
- When you don't want to create a custom avatar
- Lower-cost alternative to HeyGen

---

### 10. `lipsync` — Sync.so Lipsync

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧 |

**Models:** `lipsync-2-pro` (default), `lipsync-2`, `lipsync-1.9.0-beta`  
**Required env:** `SYNC_SO_API_KEY`

**Pros:**
- Best standalone lipsync model available
- Works with ANY video + ANY audio (not tied to avatars)
- Built-in TTS option (ElevenLabs, Microsoft, Amazon)
- Face crop mode for precise sync area
- Supports webhook for async notification

**Cons:**
- Only syncs lips — doesn't generate video
- Needs a talking-head video as input

**When to use:**
- Dubbing existing videos into other languages
- Adding different voice to existing talking head
- Combining with HeyGen/D-ID output for better sync
- Podcast/interview content repurposing

**Power combo:** `d-id` (generate talking head) → `lipsync` (perfect the sync)

---

## AI Image Workers

### 1. `google-nanobanana` — Gemini Image (Nanobanana)

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡⚡ (fastest) |
| Cost | 💰💰💰💰💰 (cheapest) |
| Features | 🔧🔧🔧🔧🔧 |

**Models:** `gemini-3.1-flash-image-generation` (Nanobanana 2, default), `gemini-3.0-flash-image-generation`  
**Required env:** `GEMINI_API_KEY`

**Pros:**
- Fastest and cheapest high-quality image generation
- Excellent prompt understanding (Gemini's multimodal reasoning)
- Edit mode with mask support
- Returns base64 inline — no polling needed
- Text rendering in images is excellent
- Can generate + explain in same response

**Cons:**
- Can apply safety filters more aggressively than competitors
- Less photorealistic than Flux Ultra for portraits

**When to use:**
- High-volume image generation (cheapest)
- When you need text in images (logos, signs, captions)
- Rapid prototyping and iteration
- Image editing with natural language prompts
- When Gemini's prompt understanding helps complex requests

**Best for:** Marketing graphics, text-heavy images, quick concept art, thumbnails

---

### 2. `flux` — FLUX (Black Forest Labs)

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Models:** `flux-kontext-max` (best editing), `flux-pro-1.1-ultra` (best quality), `flux-pro-1.1` (default)  
**Required env:** `BFL_API_KEY`

**Pros:**
- Best photorealism of any image model
- Kontext models: state-of-the-art image editing with reference
- Ultra mode: highest resolution and detail
- Consistent character generation with reference images
- Excellent at following complex prompts

**Cons:**
- BFL polling pattern adds some latency
- More expensive than Nanobanana
- Kontext requires image input (not pure t2i)

**When to use:**
- Highest quality photorealistic images
- Image editing (swap backgrounds, change outfits, etc.) — use Kontext
- Character consistency across multiple images
- Professional photography-style outputs

**Best for:** Product photography, portrait retouching, high-end marketing

**Model guide:**
- `flux-kontext-max` — best image editing, reference-guided generation
- `flux-pro-1.1-ultra` — maximum quality, no reference needed
- `flux-pro-1.1` — good balance of quality + speed + cost

---

### 3. `ideogram` — Ideogram 3.0

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡⚡ (synchronous) |
| Cost | 💰💰💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Models:** `V_3` (default), `V_2`, `V_2_TURBO`  
**Required env:** `IDEOGRAM_API_KEY`

**Pros:**
- **Best text rendering** of any image model
- Character reference for face consistency across images
- Style reference for aesthetic consistency
- Magic prompt enhancement option
- Synchronous API (fastest response time)
- Excellent for graphic design and typography

**Cons:**
- Less photorealistic than Flux for non-design content

**When to use:**
- ANY image requiring readable text (signs, banners, logos, quotes)
- Brand assets with consistent style
- Thumbnail templates with text overlay
- When you need face consistency across a series

**Best for:** Social media graphics, branded content, any design with text

---

### 4. `stability-image` — Stability AI (SDXL / SD3.5)

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡⚡ (synchronous) |
| Cost | 💰💰💰💰💰 |
| Features | 🔧🔧🔧🔧 |

**Models:** `ultra` (default), `core`, `sd3.5-large`, `sd3.5-large-turbo`  
**Required env:** `STABILITY_API_KEY`

**Pros:**
- Returns image bytes directly — no URL/download step
- Cheapest per-image among quality models
- img2img for style transfer and variations
- `finish_reason` and seed in headers for reproducibility
- Ultra model competes with Flux

**Cons:**
- Safety filters can be restrictive

**When to use:**
- High-volume batch image generation
- Style transfer from existing images
- When you need exact reproducibility (seed-based)
- Budget-conscious workflows

---

### 5. `magnific-upscaler` — Magnific (Freepik)

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ (best upscaler) |
| Speed | ⚡⚡⚡ (async) |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Required env:** `FREEPIK_API_KEY`

**Pros:**
- Best AI upscaling available (up to 16×)
- Creative enhancement — not just pixel doubling
- Detail generation (adds realistic texture)
- HDR, sharpness, fractality controls
- Optional prompt to guide what details to add
- Style-aware processing

**Cons:**
- Only an upscaler, not a generator
- Creative enhancement can deviate from source at high settings

**When to use:**
- After any image generation to boost resolution
- Upscaling stock photos for large-format use
- Adding fine detail to renders
- Preparing images for print

**Power combo:** Generate with Nanobanana (fast/cheap) → upscale with Magnific

---

## Audio Workers

### 1. `elevenlabs-tts` — ElevenLabs TTS

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡⚡ |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Models:** `eleven_v3` (default, best), `eleven_flash_v2_5` (fastest), `eleven_multilingual_v2`  
**Required env:** `ELEVENLABS_API_KEY`

**Pros:**
- Best voice quality of any TTS provider
- Massive voice library (thousands of voices)
- Emotion control (stability, style, speaker boost)
- 70+ languages with multilingual model
- Fastest TTS at high quality
- Synchronous — instant response

**Cons:**
- Most expensive TTS option per character
- Voice cloning requires the clone worker

**When to use:**
- Any high-quality voiceover needed
- Marketing videos, explainers, ads
- When voice quality is paramount
- Multilingual content

---

### 2. `elevenlabs-sound-fx` — ElevenLabs SFX

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡⚡ |
| Cost | 💰💰💰💰 |
| Features | 🔧🔧🔧🔧 |

**Required env:** `ELEVENLABS_API_KEY`

**Pros:**
- Generate any sound effect from text description
- Excellent for foley, ambience, UI sounds
- Duration control (0.5–22 seconds)
- Prompt influence to balance description vs. creativity

**When to use:**
- Custom sound effects for videos
- Ambient audio for scenes
- UI/notification sounds
- Any audio that's hard to find stock

---

### 3. `elevenlabs-voice-clone` — Instant Voice Clone

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡⚡ |
| Cost | 💰💰💰💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Required env:** `ELEVENLABS_API_KEY`

**Pros:**
- Clone any voice from 1–25 audio samples
- Returns voice_id for use with TTS worker
- Works with low-quality samples
- Fast (synchronous)
- Once cloned, very cheap to use repeatedly

**Cons:**
- Instant clone is less perfect than professional clone
- Sample quality affects output

**When to use:**
- Creating a consistent brand voice
- Personalizing content with a specific person's voice
- Building reusable voice assets

**Power combo:** `elevenlabs-voice-clone` → store voice_id → `elevenlabs-tts` for all future content

---

### 4. `udio` — Udio v4 Music Generation

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ (1–3 min) |
| Cost | 💰💰💰 |
| Features | 🔧🔧🔧🔧🔧 |

**Required env:** `UDIO_API_KEY`

**Pros:**
- Best AI music generation quality (2026)
- Stem separation (vocals, instrumentals, drums, bass)
- Full control: genre, mood, BPM, instruments
- Multiple variations per generation
- Official API with UMG licensing

**Cons:**
- Slower than SFX/TTS
- Can't generate specific licensed songs (obviously)

**When to use:**
- Background music for any video
- Jingles and branded audio
- Mood music for specific scene types
- When you need stems for mixing

---

### 5. `stability-audio` — Stable Audio 2.5

| Metric | Rating |
|--------|--------|
| Quality | ⭐⭐⭐⭐ |
| Speed | ⚡⚡⚡ |
| Cost | 💰💰💰💰💰 (cheapest music gen) |
| Features | 🔧🔧🔧 |

**Required env:** `STABILITY_API_KEY`

**Pros:**
- Cheapest music/audio generation
- Up to 180 seconds (longest of any audio model)
- Good for ambient and atmospheric audio
- Shares API key with stability-image

**Cons:**
- Lower quality than Udio for music
- Less style/genre control

**When to use:**
- Long ambient/background audio
- Budget audio generation
- When you need > 60 second audio tracks

---

## FFmpeg Workers

### 1. `ffmpeg-compose` — Video Composition

**Pros:** Full FFmpeg power, concatenate clips, add overlays, mix audio, transitions  
**Cons:** Complex filter graphs, high memory  
**When to use:** Multi-clip assembly, B-roll editing, final video composition

### 2. `subtitle-burner` — Burn Subtitles

**Pros:** Permanent subtitles, full style control (font, color, position, outline), SRT input  
**Cons:** Requires FFmpeg layer, non-reversible bake-in  
**When to use:** Social media captions, accessibility, viral-style caption videos

### 3. FFmpeg Notes

- Both workers need the Lambda FFmpeg layer configured
- `ffmpeg` group has `includeNodeModules: true` — biggest bundle, longest cold start
- Best combined with AI video output as post-processing step

---

## Helper Workers

### 1. `pexels-stock` — Pexels Stock Media

**Pros:** Free commercial-use license, videos + photos, auto-downloads to S3, B-roll sourcing  
**Cons:** Limited to Pexels library, 200 req/hour limit  
**When to use:** Sourcing B-roll for any video project, background images, reference material

### 2. `creatomate` — Template-Based Video Rendering

**Pros:** Pixel-perfect template rendering, batch production, supports video/image/audio output formats, zero processing time on your end  
**Cons:** Need to design templates in Creatomate UI first, template-bound  
**When to use:** Branded content at scale (social media posts, ads, slideshows), when design consistency matters more than AI creativity

---

## Head-to-Head Comparisons

### Video Generation: Which to Use When

| Scenario | Best Choice | Runner-up |
|----------|------------|-----------|
| Highest quality, no budget limit | Veo 3.1 | Kling O3 |
| Realistic humans/faces | Kling v2.6-pro | D-ID |
| Artistic/stylized content | Runway Gen-4.5 | Luma Ray 3.14 |
| Camera motion control | Luma Ray 3.14 | Kling |
| Budget batch generation | Wan Wanx 2.1 | Luma Ray Flash |
| Talking head from still photo | D-ID | HeyGen |
| Professional avatar spokesperson | HeyGen | D-ID |
| Adding audio to existing video | Sync.so Lipsync | — |
| Quick proof of concept | Runway Turbo | Pika |

### Image Generation: Which to Use When

| Scenario | Best Choice | Runner-up |
|----------|------------|-----------|
| Photorealistic portrait | Flux Ultra | Stability Ultra |
| Image with text/typography | Ideogram 3.0 | Nanobanana |
| High-volume cheap generation | Nanobanana | Stability Core |
| Image editing/manipulation | Flux Kontext Max | Nanobanana Edit |
| Consistent character series | Flux Kontext | Ideogram (char ref) |
| Upscaling existing image | Magnific | — |
| Style transfer | Stability img2img | Flux Kontext |

### Audio: Which to Use When

| Scenario | Best Choice | Runner-up |
|----------|------------|-----------|
| Voiceover quality | ElevenLabs v3 | — |
| Fastest voiceover | ElevenLabs Flash | — |
| Background music | Udio v4 | Stability Audio |
| Long ambient audio (>60s) | Stability Audio | Udio |
| Custom sound effects | ElevenLabs SFX | — |
| Clone someone's voice | ElevenLabs Clone | — |

---

## Quick Reference Card

### "I need a video of..." → Use
- A concept described in text → `kling-ai` or `google-veo`
- A person speaking → `heygen-avatar` or `d-id`
- An existing video dubbed → `lipsync`
- B-roll footage → `pexels-stock` or `wan-video`
- Branded template → `creatomate`

### "I need an image of..." → Use
- Text/typography → `ideogram`
- Photorealistic → `flux` (ultra)
- Quick & cheap → `google-nanobanana`
- Edit existing image → `flux` (kontext)
- Upscale existing image → `magnific-upscaler`

### "I need audio..." → Use
- Voiceover → `elevenlabs-tts`
- Music → `udio`
- Sound effect → `elevenlabs-sound-fx`
- Clone a voice → `elevenlabs-voice-clone`
- Long ambient → `stability-audio`

### Cost Ranking (cheapest → most expensive per unit)
**Video:** Wan → Luma Ray Flash → Pika → Luma → Minimax → Runway → Kling → HeyGen → Veo  
**Image:** Nanobanana → Stability → Ideogram → Flux Pro → Flux Ultra → Magnific  
**Audio:** Stability Audio → ElevenLabs SFX → ElevenLabs TTS → Udio

### Speed Ranking (fastest → slowest)
**Video:** Pika → Runway → Kling → Luma → Minimax/Wan → D-ID → HeyGen → Veo  
**Image:** Nanobanana → Ideogram → Stability → Flux → Magnific  
**Audio:** ElevenLabs TTS → ElevenLabs SFX → Stability Audio → Udio
