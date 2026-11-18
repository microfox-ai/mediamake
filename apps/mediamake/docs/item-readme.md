# An item's README: its store listing

Every skill, MCP and app has a README. It is the item's store listing: what its page
(`/skills/<name>`, `/mcps/<slug>`, `/apps/<slug>`) and its dialog show on the left, laid out as GitHub
lays out a repo, with its details in a narrow column on the right.

The README introduces the item. **How it works stays in `SKILL.md`**: a README never repeats the
steps Claude follows. On a skill's page, SKILL.md is the next tab, "How it works".

## The format

Every README has the same four parts, in this order:

1. **A video**: a YouTube link (or an https MP4 or WebM) alone on the first line.
2. **The title**: one `# Heading`.
3. **What it does**, in a line or two.
4. **`## How to use`**: the few steps a person takes. Not the steps Claude takes.

After those, anything that helps someone decide: pictures, more videos, examples, what it needs.

```markdown
---
description: Turn a logo into a full brand kit: colours, type, intros and end screens.
tags: branding, logo, youtube
headshot: headshot.jpg
---

https://youtu.be/XXXXXXXXXXX

# Pack brand kit

Give it a logo, or only a name. It builds the kit your channel needs to go live.

## How to use

1. Copy the install prompt and paste it into Claude.
2. Say to Claude: **make a brand kit for this logo**
3. Pick from the boards it shows you.

![The finished guide](shots/guide.png)
```

The page draws the header itself, the same for every item: the video, the title, then the badges
(Beta or Ready, the membership that opens it, its version, its size, how many items it works with).
Badges are never written in the README: they come from what MediaMake knows, so they stay true.

## The frontmatter

| Key | What | Without it |
| --- | --- | --- |
| `description` | What it is, for people, in a line or two (300 characters). Shown in About and on its cards. | The first sentence of the skill's description |
| `tags` | Words people look for it by, with commas between them (12 at most). | Only the skill's category |
| `headshot` | Its 16:9 picture, the one its cards show: a file in the item's folder, or an https link. | The thumbnail of the video the README opens with, else of its intro video, else its title on a colour |
| `video` | The video, when it isn't the README's first line. | The video on the first line |

## Pictures and videos

Like on GitHub: `![what it shows](shots/a.png)` for a picture (a file in the item's folder, or an
https link), and a YouTube, MP4 or WebM link alone on a line for a video that plays in place. Raw HTML
is dropped. Keep large media out of the folder: link it (the media library carries it).

## Where the README lives

| Item | Its README | Its headshot, description, tags | Its icon |
| --- | --- | --- | --- |
| A skill in this repo | `README.md` in its folder, beside `SKILL.md` | The README's frontmatter | None |
| A skill, MCP or app in a space (a member's own, a project's, a linked item) | `README.md` in its folder, sent with the space's report (below) | The README's frontmatter | None |
| A member's item released from a submission (a Plus, Pro or Cohort package) | The `README.md` of the version released, from its submission's files | The README's frontmatter | The release page |
| An MCP or an app made here | Its release page, Store listing › README (`catalog_set_listing`'s `readme`) | The same panel (`description`, `headshot`, `tags`) | The same panel (`icon`): a square picture |
| Any item, by an admin | What is set on the release page wins over the file | The same | |

**In a space, the README goes with the item.** Every report a computer sends (`mm space sync`, `mm space
report`) carries each item's README.md (at most 32 KB) and names the pictures it shows from its own
folder: its `headshot` and every `![…](relative/path.png)`, PNG, JPEG, GIF, WebP or AVIF, at most 2 MB a
picture, 16 pictures and 8 MB an item. MediaMake keeps the pictures privately, once per space by their
content's SHA-256: the answer to a report asks for the ones it doesn't have, and the computer sends those
straight to storage. The item's dialog (Mine, the space's page) shows the README to everyone who may see
the space, its pictures through `/api/space/readme-file/…`, which checks again; relative links to other
files are dropped, since the repo is private. Change the README, sync, and the dialog shows the new one.

**Released from a space.** When an admin approves a member's item as a store package, its page shows the
README.md that was submitted with that version, pictures included (`/api/catalog/readme-file/…`, for
whoever may open the item). Each approved version brings its own.

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
