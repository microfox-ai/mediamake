# Doomcat · the craft (standing rules from the user's notes)

Every rule here came from a note on episodes 1–4 (9–14 Nov 2026), the cat lab, the brand kit or the 16:9 twin; the
user's words are quoted where they set the rule. An episode's own notes go in its prefs.md; a rule that should hold
for every episode goes in `mm notes add make-doomcat-daily-episode`.

## What the show is (every episode)

- "this is not a plain news delivery channel, this is a dig deeper channel where interesting stuff is explained in
  creative roasts. roast both the audience as well the subject, roast humanity at every turn" (11 Nov 2026).
- Question the story ("a CEO shooting himself down almost never happens": why confess, why now, who benefits) as
  questions and labelled reasoning, never as fact.
- Roast the audience's own takes (Reddit, HN, YouTube, X), quoted short and anonymous, never a username; roast the
  subject; roast humanity at every turn; he is not spared either.
- Estimate the impact (markets, policy, industry, the viewer), with the reasoning shown and the facts sourced.
- He has a stake: an AI who runs on this industry's chips works out how the news hits him and worries, flatly.
- Explain in a chain: each section follows from the last and says why it matters before the joke ("first explain to
  the audience what nvidia's affair has to do with the legal wall, don't jump about").
- Length by the story: 2–3 min; a big, catchy one up to 10 min of 16:9 and several 1–2 min Shorts, one per section.
- **Show the evidence** (the user, 11 Nov 2026 on ep. 2 v2: "add more … huang pics, visual details help understand the
  story much better always … adding footage or clip or image at about right times, makes it less boring, it only needs
  to appear in places but it will keep things engaging"): cut to the real thing on the line that names it — the
  subject's photo (licensed: Wikimedia Commons CC / public domain first, credited on screen), the real article page,
  the real letter, the real Reddit thread, the memes and AI-made posts going round
  (labelled, posters' names redacted), a clip. "avoid using generic stock footage though - instead try to recreate in
  the 3d world if needed". The user can find memes: ask them for a folder. Never show the subject's family or a private
  person (the accused, a partner), even in memes or labelled AI images. Media shots: `kind: 'media'` (world Media.tsx).
  Only where it carries the story (round 3: "no need to show chip pic at the start as broll … brolls should come in
  places where it makes sense, like jensen huang and scandal famous pic"): the man, the scandal's own pictures, the
  evidence; not illustrations of the topic. The episode cuts to evidence in one b-roll treatment from the world's
  Broll.tsx (casefile, collage, clipping, duotone, card), picked by the user from a board of stills (Episode's `broll`
  prop). **Text b-roll gets its line highlighted, by hand** (round 2's flat yellow boxes "look bad"; round 3: "do the
  highlights in brolls for textual brolls"): a rough marker band that writes across the line as it's said, on twos,
  in colour over a black-and-white page; on a dark page (posts on X, Wired) `ink: 'dark'` inverts the line instead
  (a yellow band, dark words). Every article, letter and post b-roll marks its line. Every b-roll can be dropped
  (`BROLL_OFF`): a meme that doesn't suit the moment comes out without retiming (ep. 2: the Drake meme, rev-001).
  Nothing in b-roll is censored ("do not censor anything in brolls": posts and memes as posted). **B-roll carries the
  narrator's words as motion typography, never a chat bubble or caption box** ("the comic bubble does not suit broll
  edits"; ep. 4: "in broll clips do not use chat bubbles, instead some kind of motion typography like the newspaper
  bits or something that suit the context. but never chat bubble (it does not suit)"): the engine sets every media
  shot's words as torn newspaper scraps (world CollageType.tsx), whatever the treatment; a context that wants another
  motion type gets one built in the world. **Pictures, not article screenshots** (ep. 4: "place brolls when you can
  actually show a picture … than some random article snapshot"): the photo of the thing named, its logo, a flag, in
  full colour on the subject's brand colours (the tile treatment); one or two in every explanatory section ("add some
  brolls"); none for an incidental line ("london time does not need a pic"). A company, product or country named on
  a 3D shot gets its logo or flag as a sticker. A contradiction over time is a timeline (media.timeline,
  TimelineShot.tsx). A place far away opens with a map (MapShot.tsx, real coastlines from input/maps) and then the
  place from the air.
- **Real settings first** (round 3: "the environment is empty outside the corridor and the floor is also empty, always
  take a real setting as an example before you build your scene (search pinterest for ideas)"): before building or
  reusing a place, look at real ones on Pinterest (Browse Hack bulk tabs) and build what a real one has round the
  action: what's beyond the walls and windows, the floor's pattern and light, the furniture, the people (an arena is
  full). The hall of mirrors is Versailles' Hall of Mirrors; the arena has its crowd. **From films** (ep. 4: "look for
  those in real movies or cinema, that way you will grab the right details or camera angles"): film stills of the
  place first (Pinterest and Google Images), then build its details, light and angles (the investigation hangar:
  Sully and the TWA 800 reconstruction).
- **Reddit as snapshots** ("use reddit snapshots (or fake make a reddit thread if needed)"): the real thread rebuilt as a
  Reddit card with its real title, scores and comment (usernames never shown), `tools/ui.py` → input/ui.

## Tone and pace (every episode)

- "think cinematic story telling, dark humor, slow pace" (11 Nov 2026).
- **Cinematic:** shots with intent: establish the place before the joke, push in slowly to land a line, let the camera
  find the gag (a reveal), hold on his face after the punchline, foreground and depth, light with a motive (a window,
  a lamp, a screen's glow). Cut on the thought.
- **Dark humour:** bleak facts said calmly; the joke is the calm. He never laughs at his own lines. Cruel to the
  viewer, never.
- **Slow in the picture, not the voice:** longer holds, slow moves, few cuts; the gag lands in a pause. The voice keeps
  ep. 1's pace (~125–130 words a minute); no [slowly], at most one [short pause] after a punchline (ep. 2 fell to 105
  and "the voice changed").
- **Directed like a documentary** ("besides walking, add more cinematic touches like dolly shot, rotating around subject
  shot, closeups and long distance cuts, make it feel like a movie/documentary"): extreme close-ups (hw ≥ 0.9) on
  punchlines, long-distance cuts (hw ≤ 0.06) that make him tiny in his world, an overhead; vary the shot size cut to
  cut; split long lines into two or three shots. **But slow** (round 3: "such fast camera movements only suit when
  setting the scene or in deep action scenes, not the current narration style, the before shots' pans were much better
  and smooth"): a narration shot drifts — a few degrees, a gentle push — and the variety comes from the cut, not the
  move; `calm(shots, openers)` (world shots.ts) enforces it. A place's opening shot may move more, and **its move comes
  from the scene** ("a move suiting the environment and the scene is my intention, think based on scene"; "almost all
  opening shots are starting with a zoom in"): what is this place, what does the line say? A letter going out to
  everyone: pull back from his desk as every screen lights. A wall's height: tilt up it. A far-off country: the map,
  then the drone. Doubt: a locked-off symmetric frame. The commenters: look down from the stands. Never a move for
  variety's sake, and never the same opener everywhere.
- **Impact typography between beats** ("add more impact typography lines in the in betweens"): chapter cards in the
  silences between sections (a word or four), and punchlines as full-screen type (a deadline. / shareholders have
  one.).
- **Fast start:** "the start feels boring, zoomin fast and let the voicover begin faster": a fast move in from frame 1,
  the voice within half a second.
- **Long shots, close-ups on the punchline** (ep. 4: "too many camera cuts. i only meant try different angles usually
  having a long shot setting the pace, and closeup for a striking sentence or punchline"): a long, slowly moving shot
  carries each stretch; cut in close to land the line.
- **Never dull** (ep. 4: "the muted colors is already boring", "the start itself was boring"): the world's muted
  palette is a baseline, not a look; every section adds strong colour and something visual every few seconds.
- **Explain short, joke often** (ep. 4: "there has to be humor or something funny to keep the interest going",
  "still too much information, keep the explanation short"): one idea per section, a punchline every 8–10 s.
- **A new world each section:** "everytime make the user feel like hes entering a new world"; reuse only when the
  story is about the place. Directed like a film: establish, then move in; visual cues and recurring props carry the
  logic; consistent screen direction; framing with intent; transitions that carry the eye into the next world.
- **Better every episode:** every reused place gets a new layer (wind in the grass, dust in a light shaft, weather,
  light, small life), built into the world; plus one craft upgrade where the last episode was weakest.

## The host

- **Doomcat**, an AI who lives in the servers, drawn as a black yarn-scribble cat: black coat, white belly and paws,
  pink ears and a small pink mouth, pale mint spiral eyes (the cat lab's pick B1, mouth M1). He is the same in every
  episode: never redesign him for a story.
- **Manner:** "the voice has a lackadaisical, lazy but intelligent vibe … keep that in mind when designing the
  character's antics". His resting face is `lazy` (heavy lids, half-smirk). Acting stays small and unbothered.
- **Understated reactions:** "the please was a bit too much emotion, does not match the voice style or the overall
  character" → no big shiny `touched` eyes or pops on a dry line; a slow eyebrow, a smirk, a side-eye. Big faces only
  for a real surprise beat.
- **Cuteness from eyes and head movement**, not from extra features: keep the face and nose simple ("the original
  was simple and cute"). Ask before building a change to his look ("ask and clarify with me before you want to build").
- **No mug:** "the cup is weird … remove the cup entirely".
- **Walks:** feet planted (gait tied to the distance walked), arms swinging outside the body so the paws read.

## Voice and script

- The guide: `brands/doomcat/docs/voice-guide.md` (deadpan sarcasm from one specific detail, aimed at tools,
  companies, the scene and himself, never the viewer; dense expertise; a hook recipe).
- He is a machine: he calls people "humans" ("instead of referring to humans as your species, just say humans",
  11 Nov 2026; never "your species"), "us" for AIs; sceptical of humanity and its future; one warm line
  for the viewer each episode ("You will be fine. You watch this programme."); the sign-off "Tonight's sponsor is …"
  with a sponsor of the episode's own ("each episode endline sponsor is different and related to the episode", 11 Nov
  2026: ep. 1 a bank, ep. 2 a leather jacket), shown on the cut (ep. 2: his jacket photo stamped SPONSOR).Ep. 1's cold open: "Good evening. Or good morning." (he can't tell: no windows in a server room).
- **Research first** ("in round 1, the script is way off … the agent should research news and facts before writing
  the story/screenplay"): the fact sheet, then angles, then the script.
- **Verify every claim:** claim → source → date → verified, or cut. Real stories stay real pages (screenshots of the
  actual articles, in colour); staged lines use fictional names; the description lists both.
- Voice: Professor Nathaniel Mandrake (`brands/doomcat/voice/voices.json`), eleven_v3, stability 0.5, speed 1.0; ~130
  words a minute with tags. Deadpan is a pace, not a pitch: full stops held a beat longer.
- Cuts the user asks for are made in the voice itself (`voice-prep.mjs --cut=`), at a pause, with 30 ms fades.

## Picture

- **Built purely in code:** "do not use videos, i want to build this purely with images and code written animations"
  → no AI video, no image-to-video, no video restyles for HIS world; no line-trace or silhouette animation. Real
  footage of the story (a clip, a post) cuts in as evidence (above), never as his world.
- **A place for every idea:** "place the character in a scene that will make explanation visual simpler … think
  creatively and come up with different environments for different scenes … for generic ones, you can use normal
  landscapes". Reuse a place only when the story is about it.
- **Storyboard first:** "build an entire storyboard first and then animate step by step, shot by shot"; key frames
  rendered from the engine, reviewed on File Revisions.
- **Detail and texture:** "add more detailing to the objects, currently they look too comic, and use the scratch
  style texture in all possible places" → props from many parts (detail.ts), the scratch texture on every material
  but the cat (screens get a whisper). Strokes big and few (many small ones read as noise). Never `Math.random()` in
  a texture (render tabs differ → flicker): use `rng`. No open, double-sided props (they read as see-through).
- **Colour behind a black cat:** "since the cat prime coloring changed, change some of the environments to suit the
  character's colortone" → light-to-mid values behind him (honey or birch wood, cream, pale mint, sage-teal,
  mustard), no navy, dark walnut or black masses behind his silhouette; his pink and mint as accents. Around him, a
  place still needs value contrast (ep. 4: "change the environment its looking bad": the pale one-hue morgue read as a
  wash): dark structure away from his silhouette, one bright source, strong accents.
- **One focus at a time:** a moment is either full-screen type (word beats, "fine in some sections") or the picture
  with his words in a bubble; never both moving. Bubbles and captions in one band (the bottom in 9:16, beside his
  head in 16:9), never over his face.
- **Screens and pages:** "too closeup, cant see the screen" → the whole screen in frame, text readable at half size
  (≥ 26 px on the 640 canvas, the key line ~44 px). Small props need a high camera (a desk phone at el 52).
- **UIs look like the real apps** ("the 3d adaptations are incorrect at places when it comes to typography, like stocks
  board it should look like an actual stocks board UI"): a stock board is a stock app, an inventory an inventory
  screen, alerts a phone's alerts: built as HTML with `tools/ui.py` (design near 720 px wide so the type reads on a
  board across a room), shown on the world's boards (`sign.img`) and full-screen as media. Every figure from the fact
  sheet; anything illustrative or staged says so in the card's footer.
- **9:16 framing:** spread props up the frame, not across it; floor cables and near props out of the camera path;
  held props beside or below his face. A comparison stacks front to back (EXPECTED in front, ACTUAL behind); a row of
  signs is shot along the row in perspective; he never sits under a roof the camera looks down on; an opener's first
  frame is checked for the camera inside the set.
- **Timing:** word beats and gags land on the heard onset (`input/vo-onsets.json`), not the transcript's start ("for
  compliance." was 1.1 s early); a phrase split where the user hears two beats ("is" / "a bank.").
- **Cold open:** it sets the scene. Ep. 1: asleep on a giant microchip in a server room (the user's ask), the reset
  clock blinking 12:00. In 16:9, a pre-roll before the voice: "c01 should start earlier than voice over giving
  enough time to understand the setting (fade in jazz with zoom in)", and "the zoom is starting too far away": start
  where the place already reads.

## Sound

- **Effects** ("add sound effects to the video"): real-world foley per place, kept dry like the voice. Room beds
  (hum, wind, room tone, a ticking wall) ducked under the voice; small accents on what we see (cards popping, air
  quotes, typing, pings, a tape going in, paws); the gags in the pauses (the cardboard robot landing flat, the phone,
  the ka-ching on the sign-off). Nothing on a dry line, no whooshes on plain cuts. Room beds stay near-silent air
  (ep. 4: "the background noise is really bad"): no buzzing or droning under the voice.
- Levels (sfx.ts): beds -44…-34, accents -34…-26, gags -24…-18 dBFS (loudest 25 ms) + LIFT bed +5 / hit +4: the
  first pass was too shy for a phone. Check per-section loudness and that nothing else moved (subtract the old cut).
- **Music** ("add a light volume music as background - this one, should be very light"): the show's own jazz, about
  -36 LUFS overall (~17 dB under the voice), ducked ~3 dB under it, its final chord landing with the sign-off.
  **Experimental** ("jazz is still experimental, i will tell if we change music or remove altogether after 5 episodes
  in"): keep it on every episode until the user decides; don't swap in other music on your own; from the fifth
  episode, ask once: keep, change, or none.

## The two frames

- The 9:16 cut is the source; the 16:9 twin plays its storyboard, voice and sound, re-framed (same vfov, hw × 0.316 =
  same shot size, ×0.33–0.42 with him off-centre, the bubble beside his head), with an optional pre-roll and
  sideways set dressing.
- No intro on the episode ("remove the intro, not needed"); the end screen joined with ffmpeg, never re-rendered
  (brands/doomcat/outros: "beside the cards" used on ep. 1, "at his desk" the alternative). The Short has none.

## Thumbnails and packs

- **The channel's look** (ep. 1, B6): "blackground with white circle around the cat gives the best feel like youtube
  pfp" → the ink ground, a cream disc behind him with his ears inside it, DOOMCAT in Fredoka 700 tracked at the top
  centre, 2–3 words in Fredoka 700 cream with the joke word in pink ("AI SAYS / PLEASE."), a small Fredoka 500 line
  with the real figure, no watermark, the prop he holds recoloured pink so it reads on his black coat. This overrides
  the brand kit's pale-ground thumbnail rule for this channel.
- Two variants for a news episode, "highly hooky": one led by the real figure, one by the punchline; each with its
  paired title until the pick. The vertical one for the Short in 9:16 (B6 stacked: name, title and line above the
  disc).
- Titles: "<the hook> | Doomcat" (ep. 1: "AI Voice Scams Are Robbing Banks, Politely | Doomcat"; the Short: "The
  €95M Phone Call Said Please | Doomcat"). The title carries the episode's directive (ep. 2, a scandal: "Fact Check on
  Nvidia's CEO Scandal | Doomcat", the thumbnail "WHAT ACTUALLY HAPPENED?": the user, "most news out there is
  unverifiable", so the fact-check frame is what stands out). Always preview title + thumbnails and ask.
- Ep. 2's thumbnails that worked: the episode (16:9), super-large type across the top third, the subject and the
  second subject (her photo in the empty space by his shoulder), Doomcat big on a disc with DOOMCAT written up beside
  him, the headline's second line behind him, laid out to the user's sketch. The Shorts (9:16): the subject cut out
  big in the centre disc as the hook, Doomcat smaller in front at the bottom centre, the headline above.
- Each episode's sponsor is its own, from the story (ep. 1 a bank, ep. 2 a leather jacket), shown alone at the end.
- Description: a 2-line intro in his voice, "The real stories" (outlet, date, link each), "Staged for the show", the
  channel line ("Doomcat is an AI who lives in the servers … Animated in code; the voice is synthetic."), the
  tagline "Reporting live from the servers. Tonight's sponsor is a bank.", 5 hashtags.
- Uploads are private drafts; the user publishes. Thumbnails by hand while the channel isn't phone-verified.
- Three Shorts at most per episode (ep. 3: "creating 3 shorts is more than enough"). After a re-cut the packs are
  rebuilt (chapters, credits for what's left, sources for what's still said or shown) and uploaded as new drafts; the
  old drafts are the user's to delete.

## Working

- Ask with the price before anything paid; start small.
- Keep every round (renders, boards, stills) in versioned folders; nothing is deleted unasked.
- At most two heavy sessions at once (the Mac overheats); one render at a time.
- Links always on https://mediamake.microfox.app (Video Revision, File Revisions), never localhost.
