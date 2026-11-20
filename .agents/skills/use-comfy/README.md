---
description: Make images, video, audio and 3D with ComfyUI from Claude, on your own GPU or on Comfy Cloud, from one picture to a whole storyboard with the same cast in every shot, with the workflow that made each result kept beside it.
tags: comfyui, comfy, image generation, video generation, workflows, storyboard, character consistency, lip-sync, upscale, background removal, 3d, open models
nature: shared-use
type: mcp-use
---

# Use Comfy

Ask Claude for a picture, a clip, a sound or a 3D model, or hand it a ComfyUI workflow, and it runs it in
ComfyUI: on this computer's GPU when the job fits, on Comfy Cloud when it doesn't. It finds a gallery
template or builds the graph, fetches the models a workflow needs (after you say yes), and keeps every
result with the workflow that made it, so it can be made again or changed. For bigger jobs (character
sheets, a storyboard, a film's clips) it keeps the same characters in every shot, tests one take before the
batch, and reshoots what doesn't hold up.

## How to use

1. Say what you want: "make a poster background with Comfy, misty pine forest at dawn, 16:9", "run this
   workflow on my ComfyUI", "upscale this picture 2x", "remove the background", "find a ComfyUI template
   for image to video", "make character sheets and storyboard frames for this script with Comfy".
2. Claude checks ComfyUI is running (and starts it), picks local or cloud, and tells you what a download
   or a cloud run will cost before it happens.
3. It shows you the takes. The ones you keep go into the media library, ready for any production.

## What it uses

- [[mcp/comfy-mcp]] (recommended): Comfy-Org's local server, which drives the ComfyUI on your computer and
  its GPU. Without it, everything runs on Comfy Cloud.
- [[mcp/comfy-cloud]] (optional): Comfy Cloud's hosted server, for partner models and jobs too heavy for
  your GPU. It needs a Comfy Cloud subscription. Without it, only what your GPU can run.
- The media library (`mm media`): where the keepers are filed and found again. Without it, they stay in
  the job folder.
- [[revise-image]]: a review set when there are several takes to choose from.

## What the skill outputs

A folder per job in your workspace, `out/comfy/<date>-<what>/`: the pictures, clips, sounds or 3D files,
`workflow.json` (the graph with its settings, to run again) and `job.json` (where it ran, the model, the
seed, the prompt and what it cost). A job of many shots also keeps its job lists, a log of every take and
a README of where each deliverable is and how to make it again. The ones you keep are also in the media
library.
