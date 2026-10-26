# Skill Library

A browser for **Claude Code skills on this computer**, at `/skill-library`: every skill with a
thumbnail, its **variants** beside it, and the **projects** that used it. It is the sibling of
`/remotion-revision` and `/image-revision`: a public page (`app/(public)/`), no sign-in, no API
calls. Folders are read with the File System Access API (Chromium only) and nothing is uploaded.
Release tiers and who may install what live in the catalog (`/core/releases`), not here.

```
┌ header: Skills · Variants · Projects │ search (/) │ stack variants · sort · S M L │ rescan ┐
│ filters        │ cards (thumbnail, title, name, chips)        │ detail: hero thumbnail     │
│  pinned        │  Skills: by category, variants stacked       │  use it · make a variant   │
│  type / kind   │  Variants: one row per base skill            │  variant of · variants     │
│  category      │    base → variants → projects                │  used in · made with it    │
│  owner         │  Projects: what each used, variants born     │  files                     │
│  folders       │                                              │                            │
└────────────────┴──────────────────────────────────────────────┴────────────────────────────┘
```

## Three things

- **Skill**: a folder with a `SKILL.md`. Its category is the verb its name starts with (`make-`,
  `create-`, `pack-`, `revise-`, `analyze-`, `write-`, `*-skill`, `remotion-`), or
  `metadata.category`.
- **Variant**: a skill that is a copy of another one, steered somewhere. It is the property of
  whoever made it (`owner`). Three kinds:
  - **project**: modelled on one finished project (`make-video-music-remix-like-f1xhitit`)
  - **style**: a look that isn't one project (`make-waveform-lyric-video-like-devotional-band`)
  - **version**: the base frozen before a big change (`create-thumbnail-v1`)
- **Project**: a folder of work, e.g. `apps/lyrics_videos/projects/<slug>`. Projects are how
  people keep their own work apart: the same skill used heavily in one project is where a
  variant is born.

## What it reads (all optional except SKILL.md)

Nothing needs to be added for the library to work: it reads what is already there.

| File | Read for |
| --- | --- |
| `SKILL.md` frontmatter | `name`, `description`, `version`, `metadata.variant-of`, `metadata.forked`, `metadata.category`, `metadata.owner`, `metadata.tags` (comma separated) |
| `thumbnail.{jpg,png,webp,gif,avif}` in the skill folder | the card image |
| `skill.json` in the skill folder | everything below, when the frontmatter isn't enough |
| `mediamake.json` in a project folder | the project's title, image and the skills it used |
| `input/project.json` (lyrics_videos projects) | a project without a `mediamake.json`: title, artist |
| `index.json` image sets (`mediamake.image-set/v1`) | pictures for skills (`workflow`) and projects (`job`) |

A variant is found by, in order: `skill.json` `variant.of`, frontmatter `metadata.variant-of`
(what `/fork-skill` writes), or a name `<base>-like-<ref>` / `<base>-v<N>` whose base exists.
Its kind is `version` for `-v<N>`, `project` when its ref or description names a known project
(`projects/<slug>`), otherwise `style`. A skill is **used in** a project when either manifest
says so, when its SKILL.md mentions `projects/<slug>`, or when an image set it made (`workflow`)
belongs to that project.

### `skill.json` · `mediamake.skill/v1`

Next to `SKILL.md`. Paths are relative to the skill folder. Written by the page's **Edit**
button; any key it doesn't know is kept.

```jsonc
{
  "schema": "mediamake.skill/v1",
  "title": "F1 × Hit It edit", // default: the name in words
  "summary": "One line for the card", // default: the description's first sentence
  "thumbnail": "media/card.jpg", // default: thumbnail.* in the folder
  "preview": "media/loop.mp4", // optional: a muted loop played on hover
  "gallery": ["media/a.jpg", "media/b.jpg"], // more examples on the skill's page
  "tags": ["racing", "rap"],
  "owner": "karcreativeworks", // whose skill or variant this is
  "category": "make", // overrides the name's verb
  "variant": {
    "of": "make-video-music-remix", // the base skill
    "kind": "project", // project | style | version
    "ref": "f1xhitit", // the project, style or version it's modelled on
    "label": "F1 × Hit It", // shown on the card
    "project": "hitixf1", // the project slug it was made from
  },
  "projects": ["hitixf1", "quicksilverxkingpin"], // projects made with it
}
```

### `mediamake.json` · `mediamake.project/v1`

At the root of a project folder. Written by the page's **Link skills** button.

```jsonc
{
  "schema": "mediamake.project/v1",
  "slug": "hitixf1", // default: the folder's name
  "title": "Hit It",
  "artist": "Get into Zone",
  "summary": "Rap song × F1 footage",
  "thumbnail": "thumbnail.jpg", // default: thumbnail.*, cover.* or poster.* here or in input/, then its thumbnails set
  "owner": "karcreativeworks",
  "tags": ["racing"],
  "skills": ["make-video-music-remix-like-f1xhitit", "create-thumbnail"],
}
```

### Thumbnails

A card's picture, best first:

- **Skill**: `skill.json` `thumbnail` → `thumbnail.*` in its folder → an image from a set it made →
  (variant) its origin project's picture → a project it was used in → (base) a variant's picture
  → a tile drawn from its name.
- **Project**: `mediamake.json` `thumbnail` → `thumbnail.*` / `cover.*` / `poster.*` in the folder
  or `input/` → its image sets (thumbnail sets first, picked images first) → a drawn tile.

**Set thumbnail** on the detail panel writes `thumbnail.<ext>` into the folder (removing any other
`thumbnail.*`); hovering an image under **Made with it** uses that one instead.

## Folders

**Add a folder** once; it is listed on every visit (IndexedDB, one "Reconnect" click per visit
unless Chrome's "Allow on every visit" was chosen) and read again when the window regains focus.

- **A repo**: finds `.claude/skills` (local only), `.agents/skills` (committed), every projects
  folder and the image sets in `out/`. A skill in both is shown once, as committed.
- **`~/.claude/skills`**: personal skills.
- **A projects folder**, or a single skill.

The walk goes 5 folders deep, skips dependencies, builds, app code folders (`src`, `app`,
`components`, `lib`, `packages`…), heavy project folders (`footage`, `derived`, `clips`…) and hidden
folders other than `.claude` and `.agents`, and stops after 4000 folders.

## Choosing when there are many

- Search matches names, descriptions, tags, variant labels and project titles (`/` or `⌘K`).
- **Stack variants** shows each base once with its variants stacked behind it; the **Variants**
  view lays every family out as base → variants → projects.
- Filters: pinned, base or variant (and kind), category, owner. Sort A–Z or by last change; S/M/L
  card sizes. Pins and view settings stay in this browser.
- **Use it** copies `Use the <skill> skill`; **Make a variant** copies `/fork-skill <skill> <ref>`
  for a project of yours or a style name.

Keys: `1` `2` `3` views, `/` search, `Esc` close / clear, `P` pin, `E` edit.

Deep links: `/skill-library?skill=<name>`, `?project=<slug>`, `?view=families|projects`.

## Code

- `lib/skill-library/types.ts`: the two manifests and the library's shapes.
- `lib/skill-library/scan.ts`: walks a folder for skills, projects and image sets.
- `lib/skill-library/model.ts`: merges scans, finds variants, links projects, picks thumbnails (pure).
- `lib/skill-library/filter.ts`: search and filters (pure).
- `lib/skill-library/write.ts`: `skill.json`, `mediamake.json`, `thumbnail.*`.
- `lib/skill-library/history.ts`: folders and prefs in IndexedDB.
- `components/skill-library/`: the zustand store and the UI. Folder helpers come from
  `lib/revisions/fs.ts`, image sets from `lib/image-revisions/sets.ts`.
