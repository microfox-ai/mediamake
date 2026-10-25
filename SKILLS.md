# Skills

Claude Code skills in this repo. **Public** skills are committed: their files are in
`.agents/skills/<name>/` and `.claude/skills/<name>` links to them, so they load for anyone who
opens the repo in Claude Code. **Private** skills are real folders in `.claude/skills/`, which is
gitignored: only their name and summary are listed here, the files stay on the owner's machine.
The `publish-skill` skill makes one public; `fork-skill` makes a variant.

Regenerate this file with `node tools/skills.mjs index` (publish and fork do it themselves);
`node tools/skills.mjs check` warns when it is out of date. The mediamake app shows it at
[`/skills`](https://mediamake.microfox.app/skills), rebuilt on every deploy.

## Naming

A skill is named `<verb>-<thing>`; the verb is its category:

- `make-*`: Media making: videos (the only skills that start with make-)
- `create-*`: Images and artwork
- `pack-*`: Kits and packs that bundle several outputs
- `revise-*`: Review loops with the user
- `analyze-*`: Breaking media down for later edits
- `write-*`: Text: titles, descriptions, metadata
- `*-skill`: Managing skills themselves
- `remotion-*`: Remotion reference (installed from remotion-dev/skills)

A **variant** keeps its base skill's name and adds what it is modelled on: `<base>-like-<ref>`
(e.g. `make-video-music-remix-like-f1xhitit`, the style of one finished edit), or `<base>-v<N>` for
an older version kept as it was. Its frontmatter says `metadata: variant-of: <base>`.

## make

Media making: videos (the only skills that start with make-)

| Skill | Visibility | What it does |
|---|---|---|
| `make-lyrics-video` | private | Make a lyric video in Remotion from a song plus its timed transcription (lyrics.json), in apps/lyrics_videos — start with a short intake of the song's theme and the us… |
| `make-video-music-remix` | private | Re-edit existing footage to a song in Remotion — any footage (films, sports, racing, anime, games, vlogs, concerts) to any song (rap, pop, EDM, rock, ballads, instrume… |
| `make-video-music-remix-like-f1xhitit` (variant of `make-video-music-remix`) | private | Variant of make-video-music-remix in the style of the F1 × Hit It edit (projects/hitixf1, signed off 2026-10-25) — a high-aura racing / sports song edit for a rap or h… |
| `make-waveform-lyric-video` | private | Make a waveform lyric video in Remotion, the channel format the user builds in mediamake's timeline editor — one picture (cover or key art) that loops and kicks on the… |

## create

Images and artwork

| Skill | Visibility | What it does |
|---|---|---|
| `create-music-poster` | private | Make a music poster / album artwork (single, EP or album cover) for DistroKid and the streaming services from the user's picture(s), in Remotion with the thumbnail eng… |
| `create-thumbnail` | private | Make YouTube thumbnails (1280×720) in Remotion from the user's picture or a concept, plus the video's details (title, topic, optionally its transcript), with a big imp… |

## pack

Kits and packs that bundle several outputs

| Skill | Visibility | What it does |
|---|---|---|
| `pack-brand-kit` | private | Build a complete brand kit from a logo the user gives (an image of a wordmark, plus the font names): the animated logo as a transparent reusable Remotion component, sh… |
| `pack-youtube` | private | Make a song's YouTube upload pack from its title, its lyrics.json and its audio file — thumbnails (through create-thumbnail) and then the title and description (throug… |

## revise

Review loops with the user

| Skill | Visibility | What it does |
|---|---|---|
| `revise-image` | private | Review and revise a set of images with the user through mediamake's Image Revisions screen (/image-revision) — make the set reviewable (index.json), give them the revi… |
| `revise-video` | private | Review and revise a rendered video with the user through mediamake's Remotion Revisions screen (/remotion-revision) — give them the review link for a render, read thei… |

## analyze

Breaking media down for later edits

| Skill | Visibility | What it does |
|---|---|---|
| `analyze-video` | private | Break an edited film or video into its shots (every cut, dissolve and fade, with exact times and frames), group the shots into scenes, find environments/locations that… |

## write

Text: titles, descriptions, metadata

| Skill | Visibility | What it does |
|---|---|---|
| `write-youtube-metadata` | private | Write the YouTube title and description for a song on one of the user's music channels (a brand under apps/lyrics_videos/brands/, e.g. INVERTED Devils, Subhodayam) fro… |

## skill

Managing skills themselves

| Skill | Visibility | What it does |
|---|---|---|
| `fork-skill` | private | Make a variant of one of this repo's skills as it improves or changes — a copy named <base>-like-<ref> that captures one finished project's style (e.g. make-video-musi… |
| `publish-skill` | private | Publish one or more of this repo's private Claude Code skills — list the private skills still available in a category (make, create, pack, revise, analyze, write, skil… |

## remotion

Remotion reference (installed from remotion-dev/skills)

| Skill | Visibility | What it does |
|---|---|---|
| [`remotion-best-practices`](.agents/skills/remotion-best-practices/SKILL.md) | public | Router for all Remotion skills |
| [`remotion-captions`](.agents/skills/remotion-captions/SKILL.md) | public | Transcribing, displaying and animating captions |
| [`remotion-create`](.agents/skills/remotion-create/SKILL.md) | public | Create a new Remotion video |
| [`remotion-docs`](.agents/skills/remotion-docs/SKILL.md) | public | Search Remotion documentation |
| [`remotion-interactivity`](.agents/skills/remotion-interactivity/SKILL.md) | public | Structure Remotion markup for interactivity |
| [`remotion-maps`](.agents/skills/remotion-maps/SKILL.md) | public | Remotion Map animation knowledge |
| [`remotion-markup`](.agents/skills/remotion-markup/SKILL.md) | public | Content, animation and effects best practices |
| [`remotion-multimedia`](.agents/skills/remotion-multimedia/SKILL.md) | public | Interacting with Mediabunny |
| [`remotion-render`](.agents/skills/remotion-render/SKILL.md) | public | Export a Remotion video |
| [`remotion-saas`](.agents/skills/remotion-saas/SKILL.md) | public | Build an app with Remotion |
| [`remotion-studio`](.agents/skills/remotion-studio/SKILL.md) | public | Preview a Remotion video |
| [`remotion-upgrade`](.agents/skills/remotion-upgrade/SKILL.md) | public | Upgrade Remotion, and related packages |
