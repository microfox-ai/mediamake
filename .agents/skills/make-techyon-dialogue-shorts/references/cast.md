# Setting up the Techyon cast (once)

Do this the first time a dialogue Short is made, or when the user wants to change a character. The user picks every
voice by ear and every face by eye. Show the choices and don't decide for them.

## 1. Names and personas

Offer 3 pairs of short first names that:
- are easy to read on a chip;
- aren't a real public figure or a brand;
- clearly differ (different first letters and syllable counts).

Give each pair a one-line persona per role. For example: "Maya: quick, curious, a little suspicious of hype" and
"Dev: dry, knows the receipts, mildly tired of everyone".

## 2. The asker's voice (the explainer is Techyon Narrator E)

**The asker must contrast with E** (a young American man, dry). Change at least two of: gender, pitch, accent, pace.

Make 3 candidates with `make-elevenlabs-voice`'s voice design. `text_to_voice` returns previews; the user's pick is
saved with `create_voice_from_preview`. Write each prompt in its recipe: language and region, age and gender,
delivery, 2–3 emotion words, timbre and pace. For example:
- "young American woman, mid twenties, quick and curious, warm but sceptical, casual tech-podcast delivery, bright mid pitch";
- "young British woman, late twenties, wry and fast, conversational, slightly husky";
- one stock library voice (`search_voice_library`, conversational, with a contrasting accent).

**Let the user hear each candidate in a conversation with E,** because a voice can sound fine alone and wrong in a
pair. Use the same 4-line exchange for each, through `mm voice dialogue` at eleven_v4 and stability 0.35,
then the room finish. That's about 100 credits a candidate. Then ask which one sounds like a real second person.

Two `text_to_voice` calls cost about 418 credits, and each 5-line test exchange about 157.

Save the pick in `make-elevenlabs-voice/references/voices.json` (the prompt, the settings, "picked" with the date
and the user's words) and in `cast.json`.

## 3. The look: Tripo 3D models first

Judge looks in a **talking preview**, not stills: stills can't show lip sync or gestures. The Signal Short's cast took
three rounds of looks before the user was happy (`projects/techyon-cast-preview` is the preview project).

**First choice, Tripo3D text-to-3D** (tripo3d.ai, through Browse Hack's Tripo tools once released, else in the
user's browser):
- Model H3.1, about 55 credits a model. It gave film-quality characters in one try, where Blender primitives read as toys ("doesnt look good, give me more options").
- **Turn on T-pose** (the toggle in text mode). A waist-up model has no hands, so no gestures; T-pose also gives a clean skeleton.
- Prompt both characters in one style, then expect different proportions anyway (`tripo_drive.py --zoom` evens them later).
- **Export rights:** Tripo exports H3.x models only on a paid plan; the free plan exports H2.5 only, under a non-commercial licence. A monetised channel needs a paid plan's export. On 11 Nov 2026 the user said Tripo support approved saving the viewer's GLB of their own models while their subscription was processed: that is the user's own arrangement, for their own models only. Record the licence and how the file was got in its `.source.json`.
- Ingest each GLB with `media ingest <file> --kind=model --subject=techyon-<id>` (add `--channel=techyon` once the media config has the channel). The Signal Short's are in the library's `model/techyon-zoe/` and `model/techyon-kai/`.

**Rig it** (no Tripo tools needed, under a minute a character):
```bash
python3 brands/techyon/cast/build/tripo_cast.py <id> <model.glb> --out=brands/techyon/cast/tripo/<id>
```
It renders the body, finds the pose, face and hands with MediaPipe, and builds `<id>-rig.blend`: the mouth cut open,
a skeleton with fingers, weights, and face shapes for blinks, brows, smiles, visemes and the jaw. Check its face sheet
and gesture sheet: the hair edge whole, the teeth white (not cream), the skin never tearing on a gesture.

**Fallbacks:**
- **No Tripo plan:** a layered 2D rig built in Blender from primitives (`build/cast_blender_v3.py`): a head per emotion and mouth shape over a body per pose. Simple portraits failed twice ("the lip syncs are same for anything they say and the hand gestures doesnt look good"); the layered rig passed. It lives in `rig/v3/` and is cloned into projects (`media ingest` flattens a rig folder, so only its composed portraits go in the library).
- **Midjourney** (when the user has a plan): head-and-shoulders portraits at `--ar 4:5`, mouth closed, plain grey background, then a cut-out with `mm thumbs cutout … --model=birefnet-portrait`. These only suit the 2D `Avatar` (a still with a pulse), the weakest option.

## 4. cast.json

`brands/techyon/cast/cast.json` holds one entry per character: `id`, `name`, `role` (`asks` or
`explains`), `persona`, `look` (the words used in the model prompt), `voice` and `voiceName`, `color`, `side`,
`avatar` (`{ library, file }`: the 2D portrait) and `expressions`. Add a new character the same way, and keep its 3D
rig in `tripo/<id>/`.

Colours are the anchor names (`C.cyan`, `C.yellow`, `C.amber`).

**In a Short:**
1. Build the toolbox `CastMember[]` from `cast.json`.
2. Render each character's frames from `tripo/<id>/<id>-rig.blend` into the project's `input/cast3d/<id>/` (SKILL.md step 4). For the 2D fallback, clone the portraits in: `mm media use <id> <slug> --as=input/avatars/<file>`. Never a symlink.

**Share it with the team:** the cast is part of the brand. `media share` the models and portraits to the Techyon
project once the user says so.
