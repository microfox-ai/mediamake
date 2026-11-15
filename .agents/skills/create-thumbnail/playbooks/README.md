# Thumbnail playbooks: one per kind of channel

A thumbnail answers three things: **what this video is** (its subject and stake), **what kind of
video it is** (a review, a tutorial, an essay, a podcast, an edit) and **whose channel it is on**.
The second and third decide the conventions a viewer expects before reading a word, so the skill
works from the playbook of the video's kind and not from one house style.

| kind | playbook | the hero is usually | words on hits (median) |
|---|---|---|---|
| Tech review, gadgets | [tech-review.md](tech-review.md) | the product | 0 |
| Software, coding and AI tutorials | [software-tutorial.md](software-tutorial.md) | the tool's name + a face | 2 |
| Science and explainers | [science-explainer.md](science-explainer.md) | one curious object or diagram | 2 |
| Documentary, video essay | [documentary-essay.md](documentary-essay.md) | a map, evidence or one object | 3–4 |
| Finance, business | [finance-business.md](finance-business.md) | a face + a figure in the news, or a brand's logo | 2 |
| Gaming | [gaming.md](gaming.md) | the game's character or art | 0 |
| Cooking, food | [cooking.md](cooking.md) | the food | 2 |
| Travel, vlog | [travel-vlog.md](travel-vlog.md) | the place and its witness | 1 |
| Podcast, interview | [podcast-interview.md](podcast-interview.md) | the guest's face + a claim | 5 |
| Fitness, self-improvement | [fitness-selfimprovement.md](fitness-selfimprovement.md) | the body, annotated | 2 |
| News, commentary | [news-commentary.md](news-commentary.md) | the person or thing in the news | 2–4 |
| Music, lyric videos, edits | [music-edit.md](music-edit.md) | a big lit subject + one giant word | 1–3 |

A video between two kinds (a finance documentary, a gaming podcast) reads both and takes its hero
from the video's subject and its frame from the channel.

## How they were made (2026-11-14)

For each kind, five leading channels; for each channel its ~100 most recent long videos (the newest
eight left out) scored by **views ÷ the channel's own median**; the eight best (hits) and three worst
(misses) kept: 40 hits and 15 misses a kind, 550 thumbnails over ten kinds, each tagged by eye
(hero, faces, words, type, ground, devices, how the words relate to the title). News was read from
its sheet only. Counts in a playbook are of that kind's 40 hits unless it says otherwise.

What held across all ten kinds (400 hits, 150 misses):

- **A face does not separate hits from misses**: 67 % of hits show one, 71 % of misses. The face is
  the *hero* in only 30 % of hits; the rest lead with an object, words, a character, a diagram, a
  place or food.
- **Nor does having words**: 37 % of hits have none, 39 % of misses. Of the hits with words, most
  have 1–3; six or more is rare outside finance explainers and podcasts.
- **Nor does a dark ground**: 27 % of hits. Tech, tutorials, cooking and travel are mostly bright.
- **What does differ is how fast the idea reads small**: taggers scored hits 4.4 of 5 and misses 3.7
  at feed size, in every one of the ten kinds (they knew which was which, so read it as a lead, not
  a proof). A hit shows one concrete thing; a miss is busier, vaguer, or about the channel itself.
- **Inside one channel the layout is often identical** on hits and misses (Fireship, Lex Fridman,
  Graham Stephan, Game Theory): the topic, the guest or the game decides. The thumbnail's job there
  is to show that subject at once in the channel's frame, and a channel's Q&A, update and
  announcement videos lose whatever the design.

## Getting the references, and new ones

The pictures are other channels' work: they are reference only, kept in the media library and never
committed or published. Each playbook names its channels, so the set can be rebuilt:

```bash
mm thumbs inspire <kind> @channel @channel …    # hits and misses → the library + a sheet + a review set
mm media find "youtube-thumbnail <kind>" --kind=references --sheet
```

`inspire` writes `out/thumbnail-inspiration/inspire-<kind>/` (`sheet.jpg`, `index.json` for
`/file-revision?job=inspire-<kind>`, `research/picks.json`). Use it too when a video's kind has no
playbook, when the user names channels they admire, or when a board did not land (SKILL.md,
"Inspiration on demand"). A new kind that comes back gets a playbook here, in a pull request.
