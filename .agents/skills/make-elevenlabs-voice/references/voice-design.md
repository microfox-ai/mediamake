# Designing, cloning and remixing voices

## Design from a prompt (`text_to_voice`)

Each call makes **3 previews** of one description. Write 2–3 *different* descriptions, so the user compares real
choices rather than three near-copies. Then `create_voice_from_preview` saves the pick into the account.

**The recipe, in this order:**
1. **Language and region / accent:** "American English", "British English, London", "Indian English, Bangalore". For an accent, "thick" works better than "strong".
2. **Age and gender:** "a man in his early twenties", "a woman in her mid-thirties".
3. **Audio quality:** "studio-quality recording, close mic, clean". Avoid "phone", "tape", "reverb" and "radio": the voice takes them on.
4. **Persona and 2–3 emotion words:** "a tech YouTuber, conversational, a little dry and sarcastic", "a calm science host, warm, curious".
5. **Timbre and pace:** "medium-low pitch, slightly raspy, quick but clear", "soft, unhurried, even".

**Preview text:** 100–1,000 characters, and it should *sound like the description*. A sarcastic persona's
preview should have something dry in it. Best of all, use the real script's opening, so every candidate reads the
same words.

**Examples that worked or fit the recipe:**
- Techyon Narrator (E), picked 2026-11-09: "American English. A young man in his early twenties, studio-quality recording. A natural, conversational tech-YouTuber delivery: quick, a little dry and sarcastic, confident. Medium pitch, clear, relaxed."
- A dialogue pair, where the two voices must differ at once:
  - Host: "American English, a woman in her late twenties, studio quality, curious and upbeat, quick reactions, bright medium-high pitch."
  - Expert: "British English, a man in his forties, studio quality, calm, dry humour, deliberate pace, warm low pitch."

Make speakers in a dialogue differ in **at least two** of: gender, age, accent, pitch, pace. Two similar voices make a
conversation hard to follow, and the avatars won't save it.

**Cost:** each `text_to_voice` call is about 100–300 credits (it reads the preview text three times). Say so first.

## Clone from a sample (`voice_clone`)

- **Permission first:** clone the user's own voice, or one whose speaker agreed. Never clone a public figure or someone who hasn't agreed.
- **Audio:** 1–2 minutes of clean, single-speaker audio (10 s is the minimum), no music, little room echo. Leave background removal off unless the recording is noisy.
- Read the clone with the same script tags as any voice. v4 supports instant and professional clones; a professional clone also has `clone_strength`.

## Remix a voice (ElevenLabs app → Voices → Remix)

Remix changes a saved voice's gender, accent, style, pace or audio quality, and can be repeated.
- **Prompt strength** runs Low, Medium, High, Max. Start at Low, and change one thing at a time.
- It works on the user's own clones, designed voices and some Library voices.
- Save the result as a new voice and record it in `voices.json`. Keep the original.

## Keep the registry

Every voice picked for real work gets an entry in `voices.json`:
- name and `voice_id`;
- how it was made (designed, cloned or remixed, with the prompt);
- the model and settings it was picked on;
- what it's for, the date, and the user's words when they picked it.

The next run starts from there.
