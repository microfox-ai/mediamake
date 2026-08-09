# Mediamake — Feature & Tool Ideas

> Running list of potential additions. Mark status as you go.
> Status: 💡 idea · 🔨 in progress · ✅ done · ❌ dropped

---

## 3D Studio

### Scene & Objects
- 💡 **Text3D** — add 3D text objects using `@react-three/drei` `<Text3D>` with font picker
- 💡 **Particle system** — simple point-cloud / spark emitter as a scene object
- 💡 **Sky / Skybox** — HDRI sphere or procedural sky (Three.js `Sky` shader) as a background option
- 💡 **Spline / path object** — draw a bezier path in 3D, use it as a motion path for other objects
- 💡 **Light objects** — add point lights, spot lights, and area lights as positionable scene objects (with gizmos)
- 💡 **Object grouping** — select multiple objects, group them so they transform together
- 💡 **Mirror / symmetry** — checkbox to mirror an object across X/Y/Z axis
- 💡 **Boolean operations** — CSG subtract/union/intersect between primitives (via `three-bvh-csg`)
- 💡 **Procedural textures** — noise, gradient, checker patterns applied as material maps
- 💡 **Texture painting** — basic UV unwrap + paint directly on the surface

### Animation
- 💡 **Animation curves editor** — graph editor panel (value vs time) for fine-tuning keyframe easing per property channel
- 💡 **Path animation** — attach an object to a spline path, animate progress along it
- 💡 **Rigged model animation** — play back embedded skeletal animations from GLTF (`.animations[]`)
- 💡 **Morph target animation** — blend shape / shape key support for GLTF morph targets
- 💡 **Camera shake / rig presets** — handheld shake, dolly zoom, orbit presets that auto-generate camera keyframes
- 💡 **Easing presets panel** — visual easing curve library (bounce, elastic, spring) that can be applied to any track
- 💡 **Timeline markers** — named markers on the ruler (e.g. "intro", "logo in") for navigation
- 💡 **Auto-keyframe mode** — when enabled, any transform change automatically inserts a keyframe at the current time

### Export
- 💡 **Export as GLTF/GLB** — serialize the current scene back to a .glb file
- 💡 **Export as OBJ** — basic geometry export
- 💡 **Render queue** — queue multiple PNG frames or video clips and download as a zip
- 💡 **Frame range export** — export a specific time range instead of the whole clip
- 💡 **GIF export** — export short animations as GIF via canvas frame capture
- 💡 **Transparent PNG sequence** — frame-by-frame export with alpha for compositing

### UX
- 💡 **Scene hierarchy panel** — tree view showing parent/child nesting, drag to reparent
- 💡 **Multi-select** — hold Shift/Ctrl to select multiple objects; transform applies to all
- 💡 **Undo / redo** — Ctrl+Z / Ctrl+Y history for all scene mutations (Zustand middleware)
- 💡 **Snap to grid** — toggle to snap translate/rotate/scale to configurable increments
- 💡 **Object locking** — lock an object so it can't be accidentally moved
- 💡 **Focus selected** — press F to frame the camera on the selected object
- 💡 **Scene presets / save slots** — save the full scene state to named slots, reload anytime
- 💡 **Collaborative editing** — multi-user cursor via WebSockets / Liveblocks
- 💡 **Scene import from JSON** — paste or upload a scene JSON to restore a full scene
- 💡 **Annotation pins** — place floating text labels in 3D space for presentations

---

## New AI Workers

### Background Remover
- 💡 **`background-remover.worker`** — remove the background from any image
  - API: [Clipdrop Remove Background](https://clipdrop.co/apis/docs/remove-background) or [Replicate RMBG-2.0](https://replicate.com/briaai/rmbg-2.0)
  - Input: image URL or upload, optional feather/padding
  - Output: PNG with transparent background → upload to S3 → save MediaFile
  - Use case: prep product photos, isolate subjects for compositing, clean up 3D texture maps

### Image to 3D
- 💡 **`image-to-3d.worker`** — generate a 3D mesh from a single photo
  - **Recommendation: AI, definitely.** Algorithmic single-image-to-3D (depth map reconstruction) produces flat, low-quality meshes. Modern AI models (TripoSR, Tripo3D, Meshy) produce textured, watertight meshes from one photo in under 60 seconds.
  - API options (best to worst quality): [Tripo3D](https://platform.tripo3d.ai/docs) · [Meshy](https://docs.meshy.ai) · [CSM.ai](https://csm.ai)
  - Input: image URL, output format (`glb` / `obj` / `fbx`), quality preset
  - Output: download the 3D file → upload to S3 → save MediaFile → importable directly into the 3D Studio
  - Pipeline: `image → AI generates mesh + texture → .glb downloaded → S3 → MediaFile`

### Text to Texture
- 💡 **`text-to-texture.worker`** — generate a PBR texture set from a text prompt
  - API: [Stability AI Stable Texture](https://platform.stability.ai) or [Meshy Text-to-Texture](https://docs.meshy.ai/api-text-to-texture)
  - Input: prompt (e.g. "rusty iron, scratched surface"), optional seed, resolution (512/1024/2048)
  - Output: diffuse map + normal map + roughness map + metalness map → zipped or individual PNGs → S3
  - Use case: apply to any 3D object in the studio without needing a texture artist
  - Bonus: **3D-model + prompt mode** — send a `.glb` + prompt to Meshy, get back the same model with AI textures baked in

### Noise Reduction
- 💡 **`noise-reduction.worker`** — denoise and clean up audio from video or standalone audio files
  - Library: FFmpeg `anlmdn` / `afftdn` filters (already have FFmpeg workers — no extra API cost)
  - Input: audio/video URL, denoise strength (`light` / `medium` / `aggressive`), optional high-pass filter (removes rumble)
  - Output: cleaned audio or video → S3 → MediaFile
  - Use case: clean up interview recordings, remove mic hiss, improve AI voice clone input quality
  - Bonus: **`audio-normalize.worker`** — LUFS loudness normalization (-14 LUFS for streaming, -23 for broadcast) can be bundled here or as a second worker

---

## New Ideas (Fresh)

### Physics & Simulation
- 💡 **Physics engine in 3D Studio** — integrate `@react-three/rapier` (Rapier.js WASM) for real-time rigid body simulation
  - Per-object: enable gravity, set mass, restitution (bounciness), friction
  - Colliders auto-generated from geometry bounding box or convex hull
  - Record a physics sim as keyframes → bake to animation clip
- 💡 **Cloth simulation** — simple flag/curtain cloth via `cannon-es` or Rapier soft bodies
- 💡 **Fluid / smoke VFX** — volumetric fog, smoke, fire using Three.js shader-based particles

### Shader & Materials
- 💡 **Node-based material editor** — visual shader graph (like Blender's shader nodes) using `three-shader-graph` or a custom React Flow canvas
- 💡 **Post-processing stack** — per-scene effects via `@react-three/postprocessing`: bloom, depth-of-field, chromatic aberration, vignette, film grain, motion blur
- 💡 **Custom GLSL editor** — write raw vertex/fragment shaders in a Monaco editor panel, live-preview on selected object
- 💡 **PBR material presets library** — one-click apply named materials (brushed metal, worn leather, glass, holographic foil, etc.)

### AI-Assisted 3D
- 💡 **AI scene builder** — type a prompt ("cozy office at night with a desk and plant"), Claude breaks it into objects + positions + lighting and populates the 3D scene automatically
- 💡 **AI model fixer** — send a broken/dirty mesh (holes, inverted normals, non-manifold edges) to a Replicate model that repairs and re-exports it clean
- 💡 **AI texture enhancer** — upscale low-res textures already applied to an imported model using Real-ESRGAN / Magnific
- 💡 **Photogrammetry from video** — extract frames from a video, send to AI photogrammetry (Tripo3D video mode) to reconstruct a 3D scan of a real object

### Rendering
- 💡 **Render passes** — separate ambient occlusion, shadow, depth, normals into individual PNG layers for compositing
- 💡 **Offline ray-trace render** — send scene JSON to a server-side Three.js / path-tracer worker for a high-quality still (no real-time FPS limit)
- 💡 **360° equirectangular render** — render the scene as a full 360° image or video for VR / panorama viewers
- 💡 **Depth map export** — export a greyscale depth map of the current view (useful for compositing in After Effects / DaVinci)

### WebXR & Immersive
- 💡 **WebXR VR preview** — one button to enter the current scene in a VR headset via WebXR (works in Meta Quest browser)
- 💡 **AR marker mode** — generate an image-target marker so the scene appears as AR when viewed with a phone camera
- 💡 **Export to USDZ** — Apple's AR Quick Look format so the model can be viewed in AR on iPhone without an app

### Asset Discovery
- 💡 **Built-in 3D asset browser** — search and import from free libraries (Poly Pizza, Sketchfab free, Google Scanned Objects) without leaving the studio
- 💡 **Stock HDRI browser** — browse and apply free HDRIs from Polyhaven directly (currently only `@react-three/drei` presets are available)
- 💡 **AI-generated 3D asset suggestions** — based on objects in the scene, suggest complementary assets ("you have a desk, add: chair, monitor, lamp")

### Workflow
- 💡 **Scene versioning** — git-like named snapshots of the scene ("v1 — logo reveal", "v2 — dark theme") with diff and restore
- 💡 **Scene-to-video pipeline** — one click: record animation → auto-add background music (Udio worker) → download final MP4
- 💡 **Prompt-to-scene-to-video** — full pipeline: text prompt → AI builds scene → renders video → delivered to media library
- 💡 **Motion capture import** — import `.bvh` (BioVision Hierarchy) files from Rokoko, Mixamo, or a phone-based mocap app to drive character skeletons
