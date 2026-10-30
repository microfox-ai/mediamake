# Skills

Claude Code skills in this repo. **Every skill is public**: its files are committed in
`.agents/skills/<name>/` and `.claude/skills/<name>` links to them, so they load for anyone who
opens the repo in Claude Code. Apps and MCPs are the ones that go through gated releases
(see [catalog-releases.md](apps/mediamake/docs/catalog-releases.md)). The `publish-skill` skill
adds a new skill and checks it for keys and private paths; `fork-skill` makes a variant.

Regenerate this file with `node tools/skills.mjs index` (add and fork do it themselves);
`node tools/skills.mjs check` fails when it is out of date or a skill holds a key or a path on
this machine, in CI too. The mediamake app shows it at
[`/skills`](https://mediamake.microfox.app/skills), rebuilt on every deploy.

## Naming

A skill is named `<verb>-<thing>`; the verb is its category:

- `make-*`: Media making: videos (the only skills that start with make-)
- `create-*`: Images and artwork
- `pack-*`: Kits and packs that bundle several outputs
- `revise-*`: Review loops with the user
- `analyze-*`: Breaking media down for later edits
- `write-*`: Text: titles, descriptions, metadata
- `cleanup-*`: Housekeeping: disk space, archives and backups
- `*-skill`: Managing skills themselves
- `remotion-*`: Remotion reference (installed from remotion-dev/skills)

A **variant** keeps its base skill's name and adds what it is modelled on: `<base>-like-<ref>`
(e.g. `make-video-music-remix-like-f1xhitit`, the style of one finished edit), or `<base>-v<N>` for
an older version kept as it was. Its frontmatter says `metadata: variant-of: <base>`.

## make

Media making: videos (the only skills that start with make-)

| Skill | Visibility | What it does |
|---|---|---|
| [`make-lyrics-shorts-summerstyle-boldwords`](.agents/skills/make-lyrics-shorts-summerstyle-boldwords/SKILL.md) | public | Make vertical lyric shorts (9:16 YouTube Shorts / Reels / TikTok) of the user's song in Remotion, in the stacked-type style of the "summer leaves quietly" reel — a sho… |
| [`make-lyrics-video`](.agents/skills/make-lyrics-video/SKILL.md) | public | Make a lyric video in Remotion from a song plus its timed transcription (lyrics.json), in apps/lyrics_videos — start with a short intake of the song's theme and the us… |
| [`make-lyrics-video-like-nakama`](.agents/skills/make-lyrics-video-like-nakama/SKILL.md) (variant of `make-lyrics-video`) | public | Variant of make-lyrics-video in the style of the Nakama! lyric video (projects/nakama, Anime Music Zone, finished 2026-10-27): the song as a captain's logbook lying on… |
| [`make-video-music-remix`](.agents/skills/make-video-music-remix/SKILL.md) | public | Re-edit existing footage to a song in Remotion — any footage (films, sports, racing, anime, games, vlogs, concerts) to any song (rap, pop, EDM, rock, ballads, instrume… |
| [`make-video-music-remix-like-f1xhitit`](.agents/skills/make-video-music-remix-like-f1xhitit/SKILL.md) (variant of `make-video-music-remix`) | public | Variant of make-video-music-remix in the style of the F1 × Hit It edit (projects/hitixf1, signed off 2026-10-25) — a high-aura racing / sports song edit for a rap or h… |
| [`make-video-music-remix-like-quicksilverxkingpin`](.agents/skills/make-video-music-remix-like-quicksilverxkingpin/SKILL.md) (variant of `make-video-music-remix`) | public | Variant of make-video-music-remix in the style of the Quicksilver × Kingpin edit (projects/quicksilverxkingpin, ATOMIC RAP, revised to v14 on 2026-10-26): a superhero… |
| [`make-video-music-remix-shorts`](.agents/skills/make-video-music-remix-shorts/SKILL.md) | public | Make vertical shorts (9:16 YouTube Shorts / Reels / TikTok, 3:4 Instagram grid, 4:5 Instagram feed) of a song edit in Remotion, in make-video-music-remix's edit style… |
| [`make-waveform-lyric-video`](.agents/skills/make-waveform-lyric-video/SKILL.md) | public | Make a one-picture lyric video in Remotion from a song (an audio file) and a poster or artwork — the picture alive on the beat (its subject cut out over a clean plate,… |

## create

Images and artwork

| Skill | Visibility | What it does |
|---|---|---|
| [`create-music-poster`](.agents/skills/create-music-poster/SKILL.md) | public | Make a music poster / album artwork (single, EP or album cover) for DistroKid and the streaming services from the user's picture(s), in Remotion with the thumbnail eng… |
| [`create-thumbnail`](.agents/skills/create-thumbnail/SKILL.md) | public | Make YouTube thumbnails (1280×720) in Remotion from the user's picture or a concept, plus the video's details (title, topic, optionally its transcript), built to be cl… |

## pack

Kits and packs that bundle several outputs

| Skill | Visibility | What it does |
|---|---|---|
| [`pack-brand-kit`](.agents/skills/pack-brand-kit/SKILL.md) | public | Build a brand kit in apps/lyrics_videos/brands/<name>/ sized to the brand — Starter (logo, favicons, fonts, tagline, colours), Standard (a channel going live — logo an… |
| [`pack-youtube`](.agents/skills/pack-youtube/SKILL.md) | public | Make a song's YouTube upload pack from its title, its lyrics.json and its audio file, in parallel threads — thumbnails (through create-thumbnail) beside the descriptio… |

## revise

Review loops with the user

| Skill | Visibility | What it does |
|---|---|---|
| [`revise-image`](.agents/skills/revise-image/SKILL.md) | public | Review and revise a set of images with the user through mediamake's Image Revisions screen (/image-revision) — make the set reviewable (index.json), give them the revi… |
| [`revise-video`](.agents/skills/revise-video/SKILL.md) | public | Review and revise a rendered video with the user through mediamake's Remotion Revisions screen (/remotion-revision) — give them the review link for a render, read thei… |

## analyze

Breaking media down for later edits

| Skill | Visibility | What it does |
|---|---|---|
| [`analyze-video`](.agents/skills/analyze-video/SKILL.md) | public | Break an edited film or video into its shots (every cut, dissolve and fade, with exact times and frames), group the shots into scenes, find environments/locations that… |

## write

Text: titles, descriptions, metadata

| Skill | Visibility | What it does |
|---|---|---|
| [`write-youtube-metadata`](.agents/skills/write-youtube-metadata/SKILL.md) | public | Write the YouTube title and description for a song on one of the user's music channels (a brand under apps/lyrics_videos/brands/, e.g. INVERTED Devils, Subhodayam) fro… |

## cleanup

Housekeeping: disk space, archives and backups

| Skill | Visibility | What it does |
|---|---|---|
| [`cleanup-out`](.agents/skills/cleanup-out/SKILL.md) | public | Free disk space on this Mac without losing work — delete what rebuilds itself (Remotion's leftover temp bundles, bundle copies in out/, the Next.js cache), move the ol… |

## skill

Managing skills themselves

| Skill | Visibility | What it does |
|---|---|---|
| [`fork-skill`](.agents/skills/fork-skill/SKILL.md) | public | Make a variant of one of this repo's skills as it improves or changes — a copy named <base>-like-<ref> that captures one finished project's style (e.g. make-video-musi… |
| [`publish-skill`](.agents/skills/publish-skill/SKILL.md) | public | Add new Claude Code skills to this repo, where every skill is public — find skills made as folders in .claude/skills that aren't in .agents/skills yet, check each for… |

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
