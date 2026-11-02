# LATER: AI FILMS IN VIDEO REVISION

Parked on 2026-11-02, at the user's request ("put AI films in a pending todo, don't build yet"). Review AI-generated films in the same suite as rendered videos: a film is a list of shots, each with several generated takes, and the user picks takes, trims and orders them before anything expensive is generated.

The plan this belongs to is the video-revision plan (Claude Doc "Video Revision: plan to evolve remotion-revision", 2026-11-02). Its Phase 0 shipped skill and script changes only; this part starts when the user says so.

## Why it is parked

The review loop for rendered videos comes first (live review, self-serve edits, sets, cheaper renders). An AI film reuses most of it: sets of takes, Final / Keep / Drop / Combine, notes anchored to shots, the live player. Building it before those exist would mean building them twice.

## The pipeline: approve everything cheap before paying for motion

1. **Script and shot list**, each character and location named once.
2. **Keyframes**: several stills per shot, reviewed as an image set. This works today in `/file-revision`.
3. **Animatic**: the approved keyframes timed to the voice-over and the music, reviewed live. It settles pacing for free.
4. **Draft motion**: the cheapest model that shows the movement, short clips from each approved keyframe.
5. **Pick takes per shot.** The cut plays at once in the player because it is only clips. Trimming, retiming and reordering are free browser edits.
6. **Master motion** only for the chosen takes, with the premium model and the same keyframe and prompt.
7. **Assembly and master render**: titles, captions and music through the lyric kit or MediaMake presets.

## Rules

- No video generation before its keyframe is approved.
- Every generation shows its estimate and waits for the user's OK (their rule after the fal upscales: "1$ is too much, next time ask for permission").
- A budget meter runs per film.
- Continuity comes from fal entities: a character or a location is saved once and used as a reference in every shot.
- Each take keeps its lineage (prompt, model, seed, keyframe, cost) from fal's asset lineage, so a good draft can be mastered exactly.

## What already exists

- MediaMake workers for video: Veo, Kling (image to video, 5 to 15 s), Runway, Luma, MiniMax, Pika and Wan; for images: Flux, Nano Banana, Ideogram, Stability and Magnific upscaling; and a cost-usage worker.
- `/file-revision` (formerly `/image-revision`) for keyframe sets, and since it plays videos in its zoom view, for picking among draft takes too (`mediamake.image-set/v1`, `mediamake.image-revision/v1`).
- `/video-revision` for the cut, with shot maps (`mediamake.video-map/v1`) and revisions (`mediamake.revision/v1`).

The new part is the shot-and-take review on top: a set revision that maps each shot to its chosen take (`takes`), using the same set file as the other kinds of multiple outputs (alternatives, deliverables, takes).

## Open questions for when it starts

- Which video models to draft and master with, and the budget per finished minute.
- Where takes live on disk (beside the project, like renders, or in the media library).
- Whether the animatic plays in `/video-revision` (after the rename) or in the Remotion editor.
