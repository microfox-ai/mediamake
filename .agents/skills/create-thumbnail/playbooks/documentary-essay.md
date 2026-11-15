# Documentary, video essay, explanatory journalism

Channels read: @johnnyharris, @Vox, @LEMMiNO, @Wendoverproductions, @RealLifeLore
(`mm thumbs inspire documentary-essay @johnnyharris @Vox @LEMMiNO @Wendoverproductions @RealLifeLore`).

## What the hits share

- **Evidence is the hero**: a map or diagram (9 of 40), an object (9), a face (9, the host as the
  investigator or the person the story is about), a figure in a scene (5).
- **Labels on plates**: 23 of 40 set their words on a black or coloured box; 6 colour one word.
  Words: median 3–4, large more often than giant (18 large, 6 giant). 6 have none.
- **A composite, calmly graded** (23), or a dark ground with one accent (8), or one flat colour (4).
- **The channel's mark** on 16 of 40, always in the same corner.

## The kit (gather before the board)

- a clean map drawn for the story, regions as separate layers
- the evidence: documents, photographs, objects, cut out
- portraits of the people in it (press or archive), circle-cropped; flags and logos from Commons

## Archetypes for the board

1. **Host and the subject** (Johnny Harris): the host's serious face on one side, the person or the
   evidence on the other, a 2–5 word question with one red word ("WHO IS HE REALLY?").
2. **The map is the picture** (RealLifeLore, Wendover): a relief or flat map fills the frame, one
   region in a contrasting colour, a white-on-black label, one yellow word ("WHY NO BOATS?").
3. **Colour-field collage** (Vox): halftone cutouts and circle portraits on a flat yellow, red or
   green field, a sentence-case label on a plate, the logo.
4. **One symbol, almost no words** (LEMMiNO): a flat vector object alone on a dark gradient (a
   plane, a cicada, a dish). The quietest board option, and it reads.
5. **Object + plate** (Wendover): a flag, a sign, a truck, with the title on stacked plates bottom
   left and the channel's stripe in a corner.
6. **Split in time or price**: two or three panels with a year or a figure on a plate each
   (1970 / 2025; $25K / $100K / $25M).
7. **Evidence board**: a document, a redacted photo, a red circle, a typewriter question (COVER-UP?).
8. **Picture-filled lettering**: a place name whose letters hold photographs (a postcard word).

## Approved in the rounds

Iteration 4, "Point Nemo: Where Spacecraft Go to Die" (2026-11-15): the user approved the whole
board of seven straight away ("all look good"). What held:

- **The place as a real globe** (`thumbs globe`), the point ringed in red: `NOWHERE.` in yellow
  across the top; the point on the arc of a globe rising from the bottom under the ISS, `Next.`
- **Real objects on plates**: Mir over the Earth's curve with `THE SPACECRAFT / GRAVEYARD` on a
  black and a yellow plate; three panels with a year plate each and `NEXT?` on a red plate.
- **A famous host with a true relation**: Jules Verne (the point is named after his Nemo; ESA's
  cargo ship "Jules Verne" burned up there), words → globe or ship → Verne cropped at the edge.
- **A case-file card**: the coordinates typed, a giant typewriter `NEMO.`, a red stamp.
- The channel's small mark in the same corner on every one.

## Type

Heavy sans caps on plates is the default. The voices that set this kind apart: **mono or
typewriter** for a case-file label, a **serif** for a title that should feel like a film, thin
wide-tracked caps across a wide shot. Fonts: SKILL.md, "editorial, documentary".

## Colour and ground

Muted picture, one loud accent: red on dark (Johnny Harris, LEMMiNO), yellow on a mid ground
(RealLifeLore, Vox). Regions and sides are colour-coded (red against green or blue). Cutouts get a
white outline or a circle crop.

## Title + thumbnail

The thumbnail states the hook in 1–5 words and the title carries the detail (22 complement):
EMPTY for "Why Kazakhstan is Insanely Empty". 12 repeat the title's key words, which a search-led
explainer can afford.

## Hits vs misses

The biggest gap of any kind in how fast it reads (4.3 against 3.1). Misses: ten or more words,
untitled host photos, compilations, the channel's own announcements.

## Build notes

- Maps: draw or generate a clean one for the thumbnail and colour the region as a separate layer;
  never a screenshot of a mapping app.
- A place on Earth: `mm thumbs globe <job> <lat> <lon> --name=…` renders NASA's Blue Marble as a
  globe with the place at the centre (fetch the texture once with `thumbs pic <job> "Land shallow
  topo 2048" --name=earth-texture`); a red dot and ring on the centre, a label plate beside it.
  Centre it south of the place to have the place sit on the top arc of a globe rising from the
  bottom edge.
- A plate is the `text` layer's `plate` (`color`, `padX`, `padY`); stack one text layer a line so
  every plate fits its own words.
- A series frame (logo corner, stripe, plate style) goes in the brand's `thumbnail.json`.
