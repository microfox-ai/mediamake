---
name: use-comfy
description: Make images, video, audio and 3D with ComfyUI through Comfy's two MCP servers — comfy-mcp, which drives the ComfyUI on this computer (open models on its own GPU, gallery templates, the user's own workflows, custom nodes, model downloads), and Comfy Cloud (comfy-cloud — hosted GPUs and partner models, OAuth sign-in, a subscription). Text to image, image edits and inpainting, image and text to video, music, speech and sound effects, lip-sync, voice cloning, 3D models, background removal, upscaling, a cast kept the same across many shots, batches of dozens of shots (storyboards, character sheets, a film's clips), and searching models, nodes and workflow templates. It picks local or cloud from the machine and the job, says what a run or a download will cost before it happens, tests one take before a batch, keeps every result with the workflow that made it, and files the keepers in the media library. Use when the user says "make / generate an image (video, song, sound, voice, 3D model) with Comfy or ComfyUI", "run this ComfyUI workflow", "on my local ComfyUI", "on Comfy Cloud", "find a ComfyUI template / model / node for …", "remove the background / upscale it with Comfy", "keep this character consistent", "character sheets / storyboard frames / the shots of this script with Comfy", "lip-sync this line", "install the nodes / download the models for this workflow", "/use-comfy", or when another skill needs a picture or clip made by an open model. Not for Midjourney (Browse Hack), fal or ElevenLabs, which have their own MCPs.
metadata:
  version: 0.2.0
---

# use-comfy

ComfyUI is the node-graph app for open image, video, audio and 3D models. Comfy-Org makes two MCP servers
for it, and this skill drives both. MediaMake lists them as `mcp/comfy-mcp` (local) and `mcp/comfy-cloud`
(hosted).

| | `comfy-mcp` (local) | `comfy-cloud` (hosted) |
|---|---|---|
| Runs on | this computer's ComfyUI and GPU (comfy-cli's workspace, `~/comfy/ComfyUI` by default; http://127.0.0.1:8188) | Comfy Cloud's GPUs |
| Costs | nothing, except partner nodes (Comfy credits, needs `COMFY_API_KEY`) | any run needs a Comfy Cloud subscription; partner models spend credits |
| Models | what is on disk (`~/comfy/ComfyUI/models/`, or the `extra_model_paths.yaml` default: section 7) | Comfy Cloud's catalogue |
| Sign-in | none | OAuth, once (the connector asks; `/mcp` › comfy-cloud › Authenticate in a terminal) |
| Results | files in `~/comfy/ComfyUI/output/`; `fetch_outputs` copies them | signed URLs; `get_output` gives a download command |
| Code | github.com/Comfy-Org/comfy-mcp (AGPL-3.0; we only run it) | https://cloud.comfy.org/mcp |

Sections 3 to 5 condense Comfy-Org's own steering (github.com/Comfy-Org/comfy-skills, MIT): its twelve cloud
skills are one loop and one table here, and the same rules hold on the local server. Section 3's tool names
and actions were read from comfy-mcp 0.11.0 itself; the cloud tool names are from Comfy's docs and skills,
not yet run here. Section 6 is what a production of many shots on a local GPU taught.

## 1. First: check the MCPs

| MCP | Need | Used for | Without it |
|---|---|---|---|
| `mcp/comfy-mcp` | recommended | generating on this computer's GPU: templates, the user's workflows, nodes, model downloads (`server_info`, `run_workflow`, `job`, `fetch_outputs`) | everything runs on Comfy Cloud, which needs a subscription; with neither server, nothing can be made |
| `mcp/comfy-cloud` | optional | hosted GPUs, partner models, video too heavy for this GPU, a cloud session (`run_template`, `partner_generate`, `wait_for_job`, `get_output`) | only what this computer's GPU can run |

- Local tools: `mcp__comfy-mcp__server_info`, `run_template`, `run_workflow`, `job`, `fetch_outputs`,
  `download_model` … (41). Cloud tools: `mcp__comfy-cloud__search_templates`, `run_template`,
  `partner_generate`, `wait_for_job`, `get_output` … Load deferred ones with ToolSearch (`+comfy`); a
  connector added in the Claude app has another prefix: match the names.
- Without the MCP, the local engine is the `comfy` command it wraps (comfy-cli; `COMFY_BIN` in the server's
  entry when it isn't on the PATH), with `--json --where local`: every local tool is one `comfy` command
  (`comfy run-template`, `comfy jobs wait`, `comfy download`).
- Before starting, say what a missing one costs (the "Without it" column), and offer to set it up: "Set up
  mcp/comfy-mcp from MediaMake by following https://github.com/microfox-ai/mediamake/blob/main/install.md"
  (or `mm items install mcp/comfy-mcp --yes` on a computer signed in to MediaMake). ComfyUI itself is a few
  GB; the tools come in the next session.

## 2. Before anything runs

1. Read the notes: `mm notes use-comfy`, and the production's `prefs.md` when it is for one.
2. Look in the library first: `mm media find "<subject>"`. A picture already made is not made twice.
3. Pick the place. `server_info`'s `hardware` (also the "Machine snapshot" at the end of the local
   server's instructions) says what the computer has:
   - an NVIDIA GPU of 24 GB or more: local for anything;
   - 8 to 24 GB: local for images, edits, cutouts, upscales and audio;
     video with the quantized (int8, fp8, nvfp4) and turbo models a template search returns, one job at a
     time, and it is slow;
   - under 8 GB, no GPU, a Mac under 32 GB, or a cloud session: Comfy Cloud or partner models;
   - the user named the cloud, or a model too big for the card: Comfy Cloud.
4. A named commercial model (the ones `search_templates` tags `API`, `list_partner_models` lists, or a
   cloud `search_nodes` hit in a partner category) runs at its provider from either server and spends Comfy
   credits. When the same family also has an open template, say both exist and ask which. On the local
   server, `auth_status` first: `signed_in: false` with no API key means partner nodes cannot run there, so
   plan with open models.
5. Say what will be spent before it is: a download (file, source, size), credits (a partner model, any
   cloud run). Go on only on the user's yes; `confirm_spend=True` only after it.
6. Settle the size: the user's ceiling when they gave one (ask on a big job), and never above the
   resolution the model was trained at (its template's default, or its model card): a model trained to
   720p gains nothing at 1080p but time and artefacts. Render at its size and upscale after, if anything.
7. Make the job folder: `<workspace>/out/comfy/<YYYY-MM-DD>-<what>/` (section 7). Before any tool writes
   into it: `fetch_template` into a folder that is not there fails with no message.

## 3. The local loop (comfy-mcp)

1. `server_info`: is ComfyUI up, which workspace, how fresh, the hardware. Down: `launch_comfyui` (returns
   once it is up). Never with `--listen` or CORS flags: ComfyUI has no password, so those only on the
   user's word. Won't start: `get_logs`. Pictures come out black or noise on a speed-up flag (an attention
   kernel in the launch extras): take that flag out first.
2. The workflow:
   - The user's own file (a UI export or an API-format JSON): copy it into the job folder, then
     `validate_workflow` against the live install.
   - Else a template: `search_templates(query, type="image|video|audio|3d", exclude_api=True)` (about 560;
     `API` in tags means a paid partner model), then `get_template(name)`: its `local_check` names the
     models and nodes this install lacks. `list_workflow_notes` on a fetched one shows the author's notes
     (download links, trigger words).
   - Nothing fits: build an API-format graph from `nodes(action="search"|"get"|"path")` and `search_models`,
     only from names they returned. Every node gets a `_meta.title` in plain words ("Load source picture",
     "Save image"), and the graph ends in a save node. `nodes(action="get")` gives a node's exact inputs,
     outputs and limits (how many reference images an edit encoder takes, a size's step): read it rather
     than guess from the template.
3. Missing pieces:
   - `local_check` errors like "'x.safetensors' is unavailable: the server reports 0 installed options for
     unet_name" mean that model file is not on disk, though its summary suggests updating ComfyUI: fetch
     the models, don't update.
   - A loader that names the model in a precision this install lacks (fp8 where the same model is on disk
     as int8 or nvfp4, or the reverse): `search_models` for the file that is there and set the loader to it
     (`set_workflow_slot`), instead of downloading a second copy. Same for a VAE or text encoder.
   - Models: a fetched template lists each one it needs, in its nodes' `properties.models`: `name`,
     `directory` (the models subfolder) and `url`. Get each file's size (`curl -sIL <url>`, the last
     content-length) and tell the user the files, the source and the total. On their yes,
     `download_model(url, relative_path="models/<directory>", wait=False)` for each (the path is from the
     ComfyUI folder; the transfers carry on after the call), then `download(action="wait", download_id)`.
     Its transfers don't resume: a dropped connection starts the file again from zero (watch for its
     percent falling). For a file over a few GB on a slow line, `download(action="cancel")` it and fetch it
     with `curl -L -C - --retry 5 --retry-all-errors -o <file>.part <url>` in a resume loop into
     `models/<directory>/`, renaming the `.part` once its size matches.
   - Nodes: `workflow_deps(workflow_path)` names the pack; `node_dependencies` checks its Python needs.
     Custom nodes are code from strangers: `install_node(names, confirm_install=True)` only on the user's
     word, then `restart_comfyui`.
4. Set it up before running:
   - **Turbo first.** Video and many image templates default to the full-step path, and their turbo or
     Lightning switch (a distilled LoRA, a few steps) is often an input of the template's subgraph, a
     boolean `list_workflow_slots` shows. Tests and drafts on turbo; full steps only for a keeper, after
     the user has looked.
   - **Sizes in the model's multiple.** Width and height go in steps of the model's multiple (a size node's
     step, a resolution selector's `multiple`: often 16 or 32). Crop the source picture to exactly that size
     first: a model handed another shape squeezes it.
   - **Image to video takes its size from the frame.** Some templates set the video's size from a
     resolution preset node (often 1:1 by default) and stretch every other shape into it. Set width and
     height on the image-to-video node to the first frame's own size, and check the first clip against
     its frame (same size, figures not stretched) before any other clip.
5. Run:
   - A template with a few changes: `run_template(name, params={"<node>.<input>": value})`. The slot
     addresses come from `list_workflow_slots` on the fetched file. It fills a temporary copy and deletes
     it, so for a job you keep, set the same slots on `<job>/workflow.json` (`set_workflow_slot`) after.
   - A file: `fetch_template(name, out_path=<job>/workflow.json)`, `set_workflow_slot(path, overrides,
     stdout=False)`, then `run_workflow(workflow_path, wait=True, timeout_seconds=…)`. Keep that file: it
     is how the result is made again.
   - Variants (seeds, prompts): `vary_workflow(path, slots, out_dir=<job>/variants)`, one
     `run_workflow(…, wait=False)` each, then `job(action="wait", prompt_id)` for each.
   - Dozens of runs, each with its own references: section 6.
   - The quickest text to image: `generate_image(prompt)` (the `image_z_image_turbo` template; its models
     must be on disk).
6. A long run: `wait=False`, then `job(action="wait"|"watch", prompt_id, timeout_seconds)` (up to 3600 s);
   never a polling loop. Failed: `job(action="error")` names the node and the cause (an out-of-memory kill
   shows as `server_died`: `get_logs`, then a smaller model, a turbo path, a shorter clip or the cloud).
   `job(action="cancel"|"queue")`.
7. `fetch_outputs(prompt_id, out_dir=<job folder>)`. Look at every file before showing it: Read an image;
   `preview_media` draws a video's contact sheet or an audio waveform. A part of the picture that came out
   as a smear is usually a part the prompt never described: describe it before blaming the setup.
8. ComfyUI keeps the models in VRAM after a run: `free_memory` before another GPU-heavy job (a render, a
   local LLM). `stop_comfyui` when done for the day.

## 4. The cloud loop (comfy-cloud)

1. A source file (picture, clip, voice) goes in with `upload_file` first; the name it returns goes in the
   route below. Never bytes or base64 inside a graph. An output used as the next job's input is uploaded
   again: the save and load stores are not the same.
2. A named model: `search_nodes` for its partner node and `search_templates` for an open template of the
   same family. Both: say so and ask (the open one has no partner fee but still spends Comfy Cloud compute).
   Partner: `partner_generate` with a best-guess slug. A wrong slug bounces before it is queued, naming
   close ones ("Did you mean"): call again once, only with a suggestion that keeps the provider prefix you
   guessed (a tier goes in `params.model`), and say which slug you switched to. A second bounce, or no
   suggestion with that prefix: stop and ask. Its success is the output: never also run a template or a
   graph (a second charge).
3. Otherwise a template: `search_templates`, then `get_template_schema`, then `run_template` with
   `input_overrides`. A hand-built graph (`submit_workflow`) only when none fits: names from `search_nodes`,
   slot names from `get_node`, a `_meta.title` on every node, and a save node (partner nodes often have
   none: a job with no save node succeeds and returns nothing).
4. `wait_for_job`, then `get_output`. Run the download command it gives exactly as it is (into the job
   folder), and leave a signed URL's query string as it came.
5. Changing a result (seed, wording, steps, duration, another reference): `submit_workflow` with
   `from_prompt_id` and `input_overrides` of only what changed (`{nodeId: {input: value}}`); never rebuild
   it. Node ids: `get_job_status(include_workflow=true)`. A partner result has no workflow: call
   `partner_generate` again. Editing that exact output instead: `use_previous_output`.
6. A workflow they want to open: `save_workflow` (`overwrite: false`), then `get_workflow_canvas_url` with
   its `workflow_id` (never the file name, which publishes a public snapshot). Say the layout is drawn by
   the server; a subgraph template shows as one node (double-click it, or right-click › unpack).
7. Several at once: `submit_batch`, `wait_for_batch`, `get_batch_output`; resend only an item that bounced.
8. Refused or "what will it cost": `get_billing_status`, and say what it says. Searching is free.

## 5. By task

| Task | How | Watch for |
|---|---|---|
| Image from text | an image template; local `generate_image` for a quick one | prompting advice: cloud `get_prompting_guide`; describe every part of the frame |
| Edit, inpaint, restyle | upload the source; an image-edit template (or a partner edit model) | keep this exact picture: `use_previous_output` (cloud) |
| Video | `search_templates(type="video")`: text-to-video, image-to-video | the heaviest job: turbo, the size from the frame (section 3); `wait=False` |
| Music, speech, sound effects | `type="audio"` templates, or a partner audio model | take the save node from search: audio node names change. A short test the user listens to before full-length takes; a cover or reference-audio mode keeps the source's sound (an instrumental in gives an instrumental out) |
| Lip-sync a line | a sound-to-video template, from the shot's frame and the recorded line | the voice first; the speaker's face large; it runs in chunks (section 6) |
| A voice clone | a voice-clone or reference-speech template | consent first (below); a clean 10–90 s clip, one speaker, no music |
| 3D model | image-to-3D templates | say which files came back (mesh, texture, preview) |
| Remove or replace a background | a removal template, else a remover node and a PNG save that keeps alpha | composite the new plate in the same graph |
| Upscale | an upscale template, else an upscale model from `search_models` | an optional second pass with low denoise, only when they want detail |
| One character across shots | local: a multi-reference edit with the place's plate and each character's reference (section 6); cloud: `get_creative_technique` for the consistent-characters technique | one reference set per character, used on every shot; never a previous shot as the identity |
| Many shots (sheets, a storyboard, a film's clips) | section 6 | test one take first; a runner for dozens |
| What models, nodes, templates exist | `search_models`, `nodes` / `search_nodes`, `search_templates` | show only rows the tools returned; empty: loosen once |

Voice cloning copies a real person's voice: only the user's own, one they have permission for, or a made-up
voice. Never to pass as someone or to put words in a real person's mouth; when unsure, ask whose it is and
what it is for before any credits. (A voice for a MediaMake video is the ElevenLabs MCP's job first.)

## 6. Many shots: one cast, a storyboard, a batch

For character sheets, a storyboard's frames, a film's clips or any job of more than a handful of runs.

1. **A bible first.** One file every prompt is built from: the look in a line (medium, era, light), each
   character in a short visual phrase (and each attire), each place with the lightings and angles the story
   needs. Models don't know names: a prompt says "the tall woman in the green wool cloak", the name only in
   brackets after it.
2. **References before shots.** A few takes per character and per place, one picked by eye as the
   reference (the plate for a place), then the variants made from it: turnaround, expressions, attires,
   lightings, angles. A multi-reference edit (an edit encoder with several image inputs; `nodes(action=
   "get")` says how many) takes the place's plate and every character in the shot in one edit: that is
   what keeps a cast the same from shot to shot. Pick plates for what the story uses in them, not only the
   look.
3. **One graph, a job list, a runner.** Build the API graph once from the template's exact node classes
   (`fetch_template`, `nodes(action="get")`), a `_meta.title` on every node, and `validate_workflow` it.
   A few runs go through `vary_workflow` and `run_workflow` (section 3). For dozens, write a job list (id,
   output path, prompt, references, size, seed) and a small runner against the local server's own HTTP API
   (`/upload/image`, `/prompt`, `/history`, `/view`), run in the background, that:
   - uploads inputs under content-hash names and never overwrites a file in ComfyUI's input folder (a
     queued job reading a file that is being rewritten breaks);
   - skips outputs that exist, so a batch cut off half-way starts again where it stopped, and takes
     `--only=<ids>` to redo some;
   - writes one log line per take (id, prompt, references, seed, `prompt_id`, seconds);
   - refuses a job whose sizes don't match (a frame against its video size).
4. **Test one, then the batch.** Every new graph, model or setting gets one take, looked at (size, shape,
   faces, sound), before the rest are queued.
5. **Review every take, and reshoot.** A contact sheet per batch (the takes in a grid with their ids)
   shows it at a glance; open the doubtful ones full size. Keep every take, and keep a revisions log in the
   job folder (what changed, and why). What to look for:
   - a place's plate copying its composition into every shot: say the camera (close, low, over the
     shoulder), or use another angle's plate;
   - people in front of a set piece the story puts them in: say where they are in it;
   - a face hidden or small in a shot that will be lip-synced: make it a close shot on the speaker;
   - a word in a brief taken literally (an age, a mood, a comparison): say plainly what is meant;
   - an effect meant for one thing spreading to everything like it, or into eyes: name what stays as it
     was, and how;
   - a look that drifts out of the world (modern clothes in a period piece): fix the bible, not only the
     shot.
6. **Video from the approved stills.** Image to video from the frame, with section 3's sizes. The prompt
   says what moves and how the camera moves; for a model that makes its own sound, the sound in a separate
   sentence. A near-black or empty frame makes a video model invent a new scene: use a slow push-in on the
   still instead. Trim a clip that shows what the next shot is meant to reveal.
7. **Sound from a video model.** Models that make their own sound add voices nobody asked for (grunts,
   murmurs, laughs). When only effects are wanted, split the stems (Demucs: keep everything but the vocals)
   and check the cleaned sound with speech-to-text: it should hear no words.
8. **Dialogue.** The voice first: made, trimmed and levelled, and checked (a very short line can drift off
   the voice: lengthen it). Then lip-sync from the shot's frame and the line with a sound-to-video
   template. It runs in fixed chunks (the template's frame count at its fps, extended once per extra chunk),
   so the line's length sets the number of chunks.
9. **One GPU job at a time.** A video batch fills the card (`system_stats` shows free VRAM): do the CPU work
   beside it (speech on the CPU, stem cleaning, contact sheets, the edit), and `free_memory` before the next
   GPU job. A ComfyUI the session started can stop when the session ends: after a break, `server_info`,
   then the runner again, which skips what is done.

## 7. Where the files go

- **The job folder**, `<workspace>/out/comfy/<YYYY-MM-DD>-<what>/`: every take, the workflow that made it
  (`workflow.json`, the API graph with its slots set) and `job.json`
  (`{ "place": "local|cloud", "prompt_id", "template", "model", "seed", "prompt", "cost" }`). A batch
  keeps its job lists, its runner, its log (one line per take) and a README of where each deliverable
  is and how to make it again. Show the takes from there; with several, `revise-image` makes them a review
  set.
- **The keepers go to the library**: copy each into `_INBOX/comfy/` with `<file>.source.json` beside it
  (`{ "schema": "mediamake.source/v1", "tool": "comfy", "ref": "<prompt_id>", "title", "prompt", "model",
  "price" }`), then `mm media ingest`. A production gets a clone: `mm media use <id> <slug> --as=…`.
- ComfyUI's own `output/` keeps a copy and is not the library. Models are tools, not media: never in the
  library or a space. They live in `~/comfy/ComfyUI/models/`, unless `~/comfy/ComfyUI/extra_model_paths.yaml`
  has a section with `is_default: true`: then that section's `base_path` + `models/<folder>` is where new
  models go. ComfyUI reads the yaml only at start (`restart_comfyui` after changing it), and
  `download_model` writes under the ComfyUI folder whatever the yaml says, so download into the yaml's
  folder with curl (section 3) or move the file after. Check that folder before downloading anything.

## 8. Rules

- Never name a model, node, template or slug the tools did not just return: the catalogues move.
- Spend only on a yes: partner models, any cloud run, a model download (say the size).
- Install custom nodes only on the user's word; never open ComfyUI to the network without it.
- Wait with `job(action="wait")` or `wait_for_job`, never a loop of status calls; never resubmit to check.
  (A batch runner script waits on `/history` itself.)
- One take of a new graph, model or setting is looked at before a batch is queued.
- A run that failed is read (`job(action="error")`, `get_logs`) before it is changed and run again.

## Where it runs

| Step | Needs | A person's yes | Safe to repeat | Without it |
|---|---|---|---|---|
| 1. Check the MCPs | nothing | no | yes | - |
| 2. Before anything runs | media:library | no | yes | skip the library search |
| 3. Local run | mcp:comfy-mcp, app:comfyui | no | yes | use the cloud loop |
| 3. Model or node download | mcp:comfy-mcp, app:comfyui | yes | yes | a to-do for a place with ComfyUI |
| 3. Partner model, local | mcp:comfy-mcp, key:comfy | yes | no | use the cloud loop |
| 4. Cloud run | mcp:comfy-cloud | yes | no | a to-do for a place with Comfy Cloud |
| 6. Many shots | app:comfyui | no | yes | use the cloud loop's batches |
| 7. File the keepers | media:library | no | yes | keep them in the job folder |

`app:comfyui` is ComfyUI installed with `mcp/comfy-mcp`'s steps (comfy-cli's `comfy install`, on a GPU
computer). `key:comfy` is `COMFY_API_KEY`, from
https://platform.comfy.org/profile/api-keys; in a cloud session it also signs comfy-cloud in without OAuth
(`claude mcp add --transport http comfy-cloud https://cloud.comfy.org/mcp -H "X-API-Key: $COMFY_API_KEY"`).
A cloud run and a partner model spend credits each time, so they are not repeated without a new yes. A
batch of many shots is safe to repeat because its runner skips what exists.

## Lessons

New lessons from the user go in your notes: `mm notes add use-comfy "<what they said> → <the rule>"` (read
them with `mm notes use-comfy` before planning).

- comfy-mcp's README can name tools its release lacks (0.11.0 has no `check_template` and no
  `search_templates(runnable_only)`): use only the tools the server lists, and `get_template`'s
  `local_check` to see what an install is missing.
- An image-to-video template stretched every frame that wasn't square: its size came from a resolution
  preset, not the frame (section 3, step 4). Test one clip against its frame before a batch.
- Re-uploading a reference under the same name while queued jobs read it broke a batch: content-hash names
  (section 6).
- An audio cover of an instrumental came back instrumental and off the melody: cover mode keeps the
  source's sound, and audio-to-audio keeps the melody only at low strength. A short listening test first.
