# An item's README: its store listing

Every skill, MCP and app has a README. It is the item's store listing: what its page
(`/skills/<name>`, `/mcps/<slug>`, `/apps/<slug>`) and its dialog show on the left, laid out as GitHub
lays out a repo, with its details in a narrow column on the right.

The README introduces the item. **How it works stays in `SKILL.md`**: a README never repeats the
steps Claude follows. On a skill's page, SKILL.md is the next tab, "How it works".

## The format

A README is written so someone gets what the skill is, and how to use it, in under a minute. Its
parts, in this order:

1. **A video**, only when there is one: a YouTube link (or an https MP4 or WebM) alone on the first
   line. An intro video is an optional decoration: no skill needs one.
2. **The title**: one `# Heading`.
3. **What it is**, in a line or two, and **a picture that explains it**: the `headshot` in the
   frontmatter, and an infographic right under the intro when one helps (how it works at a glance).
   A headshot and an infographic are the best way for a skill to explain itself.
4. **`## How to use`**: the few steps a person takes, and what to say to Claude. Not the steps Claude
   takes.
5. **`## What it uses`**, when it depends on anything: the skills it runs and the MCPs and apps it
   works with, one line each, saying the part each one plays and what happens without it.
6. **`## What the skill outputs`**, always the last section: what you end up with and where it lands,
   with examples (a picture, a video or a link). Nobody should have to guess what to expect.

Between "How to use" and the end, anything that helps someone decide: pictures, more videos, what it
needs.

```markdown
---
description: Turn a logo into a full brand kit: colours, type, intros and end screens.
tags: branding, logo, youtube
headshot: headshot.jpg
nature: shared-use
type: superset
---

# Pack brand kit

Give it a logo, or only a name. It builds the kit your channel needs to go live.

![From a logo to the whole kit](shots/how-it-works.png)

## How to use

1. Copy the install prompt and paste it into Claude.
2. Say to Claude: **make a brand kit for this logo**
3. Pick from the boards it shows you.

## What it uses

- [[create-thumbnail]]: makes the kit's thumbnail profile.
- [[mcp/browse-hack]] (required): pulls the inspiration boards from Pinterest. Without it, you bring
  the references.

## What the skill outputs

A folder, `brands/<name>/`: the logo in every size, the colours and fonts, three intros, two end
screens and a visual guide.

![The finished guide](shots/guide.png)
```

### Shared use and private use

A skill's **nature** says who it is for (`nature` in the frontmatter, or Edit details on its page):

| Nature | Who it is for | Its README | "Made with this" |
| --- | --- | --- | --- |
| `shared-use` | Other people: it can be listed in the store (Public, Plus, Pro). Every store skill is shared use. | Every part above, in that order (the video and the picture are never required). `node tools/skills.mjs check` notes a README that doesn't end with "What the skill outputs". | Asked for when it is published: the finished production that proves it. Anyone who can use it adds theirs on its page |
| `private-use` | You or your team. The default for a skill in a space. | Loose: write what helps you. The parts above are only suggestions. | Not needed, and its page shows none |

Its **type** says how it sits among other skills (`type` in the frontmatter, or Edit details):
`internal` (other skills run it, or it looks after the computer), `superset` (the main skill of a
family, much like a plugin), `subset` (one style or one part of a superset skill) and `mcp-use` (mostly drives one MCP or
app). More types are added in `lib/catalog/skill-profile.ts` (`SKILL_TYPES`).

Every subset names its superset (`superset: make-kinetictype` in the frontmatter, or Edit details):
`make-kinetictype-like-screamingtowin` is a subset of `make-kinetictype`. Its page says "Subset of"
with a link, and the superset's page lists its subset skills. A variant made with `skills.mjs fork`
is a subset of the skill it was forked from until someone says otherwise (`mm-fork-skill` asks).

Collect these when a skill is made or released (ask its maker, never guess): its nature, its type,
a subset's superset, its tags and description, and for a shared-use skill the production that proves
it. `mm space new skill` starts the README with them (`--nature`, `--type`, `--superset`): the
`mm-new-item` skill asks when a skill is made, `mm-upload-item` when it is sent.

Whoever may change the skill (an admin for a store skill; the owner or an editor of its space for a
private one) sees two buttons on its page: **Edit details** (tags, nature, type) and **README
guide**, which ticks the parts this README has and copies a template to start from. What is set on
the page wins over the frontmatter.

The page draws the header itself, the same for every item: the video when it has one (else its
headshot), the title, then the badges
(Beta or Ready, the membership that opens it, its version, its size, how many items it works with).
Badges are never written in the README: they come from what MediaMake knows, so they stay true.

## The frontmatter

| Key | What | Without it |
| --- | --- | --- |
| `description` | What it is, for people, in a line or two (300 characters). Shown in About and on its cards. | The first sentence of the skill's description |
| `tags` | Words people look for it by, with commas between them (12 at most). | Only the skill's category |
| `headshot` | Its 16:9 picture, the one its cards show: a file in the item's folder, or an https link. | The thumbnail of the video the README opens with, else of its intro video, else its title on a colour |
| `video` | The video, when it isn't the README's first line. | The video on the first line |
| `nature` | `shared-use` or `private-use` (above). | A store skill is shared use; a skill in a space is private use |
| `type` | `internal`, `superset`, `subset` or `mcp-use` (above). | What the registry suggests: internal for an internal skill, subset for a variant, superset for a skill with variants |
| `superset` | A subset's superset: that skill's name. | The skill a variant was forked from |

## Its files and what it depends on

Above the README, a skill's page lists its files as GitHub lists a folder: folders open in place, a
file opens on GitHub. A repo skill's are its folder (`paths` in `skills.json`), then the engine
folders its SKILL.md names (`uses`: `@mediamake/engine/<name>` or `src/<folder>`) and one `scripts`
folder, which opens onto the studio scripts the skill names (`scripts/<file>`). A skill in a space lists its folder from the space's file list, its own
`engine/` with it.

In the right column, **Depends on** lists the MCPs, apps and skills it needs: five, then "+N more".
A repo skill's come from its MCP table and `depends-on`; a space skill's from what its run sheet
needs (`mcp:<id>`, `app:<name>`); an MCP's or an app's from what its catalog entry works with
(`uses`). Under it, **Uses this** lists the other way round: the skills, MCPs and apps that depend
on this one (`itemUsers` in `lib/catalog/skill-profile.ts`). Every name in both lists opens that
item's page.

## Links to other items

Name another skill, MCP or app in a README and it becomes a link to that item's page:

| Write | It links to |
| --- | --- |
| `[[make-lyrics-video]]` | the skill `/skills/make-lyrics-video` |
| `[[mcp/browse-hack]]`, `[[app/studio]]` | the MCP, the app |
| `[[mcp/browse-hack\|Browse Hack]]` | the same, shown as "Browse Hack" |
| `[the remix skill](skill:make-video-music-remix)` | a Markdown link by name (`skill:`, `mcp:`, `app:`) |
| `` `mcp/elevenlabs` `` | a kind and a name in code links as it is |

Use them under "What it uses", so the list reads as links. Nothing inside a code block is linked.

## Pictures and videos

Like on GitHub: `![what it shows](shots/a.png)` for a picture (a file in the item's folder, or an
https link), and a YouTube, MP4 or WebM link alone on a line for a video that plays in place. Raw HTML
is dropped. Keep large media out of the folder: link it (the media library carries it).

**Pictures one after another show as a grid of example outputs**, each with its alt text as its
caption: put two or more `![…](…)` lines together, on following lines or with blank lines between
them. It is the way to show what the item makes, under "What the skill outputs" (or an MCP's own
outputs section):

```markdown
## What the skill outputs

![A 16:9 thumbnail](shots/thumbnail.png)
![The 9:16 Short](shots/short.png)
![The end screen](shots/end-screen.png)
```

## Where the README lives

| Item | Its README | Its headshot, description, tags | Its icon |
| --- | --- | --- | --- |
| A skill in this repo | `README.md` in its folder, beside `SKILL.md` | The README's frontmatter | None |
| A skill, MCP or app in a space (a member's own, a project's, a linked item) | `README.md` in its folder, sent with the space's report (below) | The README's frontmatter | None |
| An MCP or an app made here | Its release page's README tab, Write and Preview, saved with the save bar (`catalog_set_listing`'s `readme`) | Its release page, Listing › Card (`description`, `headshot`, `tags`) | Listing › Card (`icon`): a square picture |
| Any item, by an admin | What is set on the release page wins over the file | The same | |

A picture an admin sets (a headshot, an icon, a screenshot) is uploaded, never committed: the release page's Upload, or mm-release's `catalog_upload_picture` from Claude. It is live at once, with no pull request and no deploy, and a listing's headshot shows in place of a repo skill's own.

**In a space, the README goes with the item.** Every report a computer sends (`mm space sync`, `mm space
report`) carries each item's README.md (at most 32 KB) and names the pictures it shows from its own
folder: its `headshot` and every `![…](relative/path.png)`, PNG, JPEG, GIF, WebP or AVIF, at most 2 MB a
picture, 16 pictures and 8 MB an item. GitHub doesn't show a private repo's pictures on another site, so
each picture is copied once into MediaMake's storage, by its content's SHA-256: the answer to a report asks
for the ones it doesn't have, and the computer sends those. The item's dialog (Mine, the space's page)
shows the README, and only the people who can see the space open it; relative links to other files are
dropped. Change the README, sync, and the dialog shows the new one. A skill that goes public comes into
this repo, and its README.md shows from here like any repo skill's.

An item with no README gets the default one, written from what MediaMake knows: its intro video, its
title, its summary and how to use it. `tools/skills.mjs index` reads each skill's README into
`skills.json` (`readme`, `listing`, and the folder's `bytes` and `files` for the size badge).

## Ratings and feedback

Any member rates any skill, MCP or app from 1 to 5 stars, wherever it is shown: on its page, in its
dialog, or from Claude (mm-use's `rate_item`). One rating per account and item; rating again changes
it. Everyone sees the average and how many rated it, on the item's page, its dialog and its card;
nobody sees who gave what. Words sent with a rating are feedback (`docs/feedback.md`): only their
writer and the admins read them. Ratings are in MongoDB `ratings` (`lib/ratings`), behind
`/api/catalog/ratings`.
