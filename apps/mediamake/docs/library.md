# The Cloud Library

One structured, searchable home for the files a space reuses: a channel's songs with their masters,
words, release details and links, kept once and the same on every computer and in a cloud session.
The whole plan (shared collections, device libraries, the page, search by meaning) is in the Claude
Doc "MediaMake Library: architecture plan"; this page says what is built.

It is open to Cohort members for now (`cloudLibrary` in `lib/memberships/tiers.ts`): storing and
serving files costs money, so every action is counted (Usage, below).

## The three things a person meets

| Thing | What it is | Example |
| --- | --- | --- |
| Collection | A kind of thing, made from a template that names its fields and its file slots | Songs |
| Entry | One thing in a collection: fields, files in slots, and a card | The song "Nakama!", `songs/nakama` |
| File | Bytes stored once under their SHA-256 | The master, the stems, the timed transcript |

A Library belongs to a space: a project, or the personal space (a project marked `personal`). With no
project named, a command means the personal Library.

**The card** is a few lines of plain text built from the template with no AI call: what the entry
is, what it has and what it lacks. A search answers with cards, so an AI finds the right entry
without opening a file.

## Templates: guided, never strict

A collection starts from a template (`lib/cloud-library/templates.ts`). Nothing in a template is
required. A value that doesn't fit its field is kept as written with a warning, a key the template
doesn't know is kept under `extra`, and a file that fits no slot is kept under the slot it was given.

**Songs** is the first template: song title (and the title in Latin letters, for a title in another
script), artist, record label, use (internal only, unreleased, released), ISRC, release date, genres,
DistroKid details (a free group, key by key), store links (one a platform), playlists (many a
platform), lyrics, a part-by-part description, and the slots master, transcript, stems, release
artwork and DistroKid pack. A song has one master, one lyrics and one transcript: a new one replaces
the old, which the entry's history names.

**Lists that learn.** Platform, genre, label and artist are learning lists. A value used once in a
collection is offered next time, most used first, and a new spelling of a known value is saved as the
known one (`youtube music` becomes the collection's `YouTube Music`). Store links and playlists share
the platform list.

**The guide.** Each template carries a guide: Markdown that tells an AI where each field comes from,
what it must never guess (an ISRC, a link, a release date), and the sentence to ask before saving.
Under it sit the owner's preferences, their corrections for whoever fills the collection
(`mm library prefs`). `mm library guide <collection>` prints both with the fields, the slots and what
the lists have learned. Read it before the first save of a session.

A new template is one more entry in `TEMPLATES`.

## Read first, fetch last

| Step | Command | What comes back |
| --- | --- | --- |
| The map | `mm library` | The space's collections, their fields and slots, the learned lists |
| Find | `mm library search "<words>" --where=use=released --has=transcript --lacks=stems` | Cards |
| Read | `mm library get songs/nakama`, `mm library read songs/nakama lyrics`, `… read songs/nakama transcript --from=60 --to=90` | Fields, text, or a part of a text or a timed transcript. Nothing is downloaded |
| Look | `mm library preview songs/nakama` | What each file is. Thumbnails, waveforms and clips are not made yet |
| Take | `mm library fetch songs/nakama master --to=<folder>` | The file, checked against its SHA-256. A file fetched before comes from this computer's cache (`~/.mediamake/library-cache`) |
| Save | `mm library save songs --set title="…" --file master=<path>` | Without `--yes`: the sentence to ask the person, and nothing is saved |

Search is by plain words and exact filters. Search by meaning comes with the vector index, later.

## Before anything is saved

`mm library save` without `--yes` changes nothing. It prints one sentence in a fixed form, with the
real names, then what would change and any warnings:

```
Add the new song "<song title>" to the Songs collection of the <space name> space (cloud)?
Uploads: master (64 MB), artwork (2 MB). Fields: artist, genres, lyrics.
```

Show it to the person and add `--yes` only after they agree. A routine saves without asking only
when its own instructions name the collection it may write to.

A text or JSON file is looked through for private details before it goes up (email addresses,
things that look like keys, password fields, paths on a computer, phone numbers). When any are found
the save stops, even with `--yes`, and says how many of what, never the value. `--private-ok` sends
it once the person says it may go up.

An entry saved by an AI session is marked as such (`--agent`, or Claude Code's own environment).

## What is stored where

| What | Where |
| --- | --- |
| Collections, with template, preferences and learned lists | MongoDB `library_collections` |
| Entries, saved over the revision they were read at | MongoDB `library_entries` |
| One record per content a space stores | MongoDB `library_files` |
| A song's numbers per platform and day, apart from the entry | MongoDB `library_stats` |
| One line per change, for what is rebuilt later | MongoDB `library_events` |
| One line per action, for the cost page | MongoDB `library_usage`, prices in `library_prices` |
| The bytes | The private bucket productions use, `library-private/<space>/<sha256>` |

Files are stored by content: the same file in ten entries is one object, a new master leaves the old
one where it was, and a content the space already stores is not sent again. Bytes never pass through
the app's server: they go to and from storage on signed links that last an hour. A Library's files
count against its space owner's storage cap (`docs/project-storage.md`).

Everyone on a space reads its Library; its owner and editors add and change. A personal Library is
its owner's alone.

## Routes

All behind the middleware (`x-client-id` is the signed-in account), so a computer's sign-in or an API
key works the same.

| Route | |
| --- | --- |
| `GET /api/library` | The spaces whose Library the account can open, and the templates |
| `GET /api/library?space=` | One space's collections in full, with guide and preferences |
| `POST /api/library` | `new-collection` from a template, the owner's `prefs`, or `headshot` (a stored picture's `sha256`, an https `url`, neither to remove it) |
| `POST /api/library/fill` | Claude's suggestion for an entry's fields from the files dropped on its form. Saves nothing |
| `GET /api/library/entries?space=&ref=` | One entry in full |
| `GET /api/library/entries?q=…` | A search, with a space or over every space the account can open. Each hit carries its card, its short fields (`facts`) and its filled slots (`has`). `limit` (10, at most 200) and `offset` page it |
| `POST /api/library/entries` | Save an entry. `dry: true` answers with the sentence and the changes |
| `DELETE /api/library/entries?space=&ref=` | To the trash |
| `POST /api/library/files` | `start` (signed upload links for what isn't stored yet), then `finish` |
| `GET /api/library/files?space=&ref=[&slots=]` | Signed links to an entry's files |
| `GET /api/library/files?space=&ref=&read=` | A field's text or a text file's content, whole or a part |
| `POST /api/library/stats` | A platform's numbers for a day |
| `GET /api/library/usage` | The caller's usage. `?all=1` for admins: everyone's |
| `PUT /api/library/usage` | Admins: the prices behind the estimate |

## The page

`/app/library`, below Spaces in the sidebar (`components/cloud-library`). Its address holds the place
(`?space=&c=<collection>&e=<entry>`), so a link opens the same view.

- The space is picked at the top right, in a dropdown that searches. Personal is first, and it is
  the one shown when no project was chosen. The last pick is remembered in the browser.
- No collection open: the space's collections as cards, each with its picture, its name and how many
  entries it holds as a big number, and New collection (a template, then a name). Whoever can change
  the space sets the picture from the card (an image from the computer, or an https link);
  `mm library headshot <collection> <picture file or https link>` does the same from a script
  (a dry run, then `--yes`; `--clear` removes it).
- A collection open: a breadcrumb under the search, with the filters at its right end (each choice
  field, and each slot as "has it" or "no … yet"), Guide (the template's guide and the owner's
  notes, which the owner edits there) and Add.
- A collection's entries show four ways, picked beside the filters and remembered in the browser
  (`components/cloud-library/entry-views.tsx`). Grid: a card per entry with the short fields, the
  tags, and a chip per slot, dashed when it is empty. List: one line per entry, for reading down a
  long collection. Sheet: a table with a column per short field and per slot, sorted by the column
  that is clicked. Folders: the entries grouped by one field (a choice or a learned list, picked in
  "Folders by"), each folder with its count, opening to its entries (`&by=<field>&f=<folder>` in the
  address). A search of the whole space is always cards.
- An entry: a tab per heading of the template, then Files, Numbers (when a platform sent some) and
  History. Change opens the same dialog as Add.
- Add and Change: dropped files go to the slot their type and name say (`placeFiles` in
  `lib/cloud-library/view.ts`) and each can be moved. A file is hashed in the browser, sent straight
  to storage on a signed link, then the entry is saved with only the fields that changed. A file
  over 2 GB goes up with `mm library save` instead.
- Add has "Copy prompt to add" at its bottom left: a prompt for Claude that names the space and the
  collection, the guide to read, the slots, the `mm library save` line and the ask before `--yes`
  (`addPrompt` in `lib/cloud-library/view.ts`), so files are added from a session instead of the page.
- Whoever can only read a space sees no Add, Change or trash.

### Filling with Claude

When files are dropped on Add or Change, Claude reads them and fills the fields that are still empty
(`lib/cloud-library/fill.ts`, `POST /api/library/fill`). Nothing is saved by it: the form says what was
filled, marks each field "Filled by Claude", and Undo puts back what was there.

- What Claude gets: the collection's fields, its guide, the owner's preferences, the spellings its
  lists have learned, the names of the fields the form already holds, each file's name, and the text
  of the small text files (a transcript, lyrics, a release pack; read in the browser, up to 1 MB a
  file, 200,000 characters a file and 400,000 a call on the server). A longer file goes by name only
  and the form says so: it is never cut. Audio, video and pictures go by name only.
- What comes back is checked before the form sees it (`checkFill`): nothing for a field the form
  holds, a choice only from its options, a date only as a date, and a never-guess field (ISRC,
  release date, store links, playlists) only when its exact value is written in a file that was read.
- What it costs: one usage line a call with its tokens (never a file's name or words). Each person
  has a monthly ceiling, 2 US dollars unless `LIBRARY_FILL_MONTHLY_USD` says otherwise, counted at
  the prices on the usage page. Past it, and without a key, the form stays quiet and works as before.

| Variable | For |
| --- | --- |
| `ANTHROPIC_API_KEY` | The call. Without it nothing is filled |
| `LIBRARY_FILL_MODEL` | The model. Default `claude-opus-5-5` |
| `LIBRARY_FILL_MONTHLY_USD` | One person's ceiling a month, in US dollars. Default 2 |

`/app/library-usage` (admins) shows the sums below as tabs: People, Computers, Spaces, Collections,
Stored, and Prices, where the prices behind the estimate are set.

## Usage: who used what, and what it costs

One line is kept per upload, download, read, search, save and AI fill: who, from which place (the
computer's random label or the cloud environment's name), which space and collection, and how many
bytes. Never a file's content and never a search's words.

`GET /api/library/usage?all=1` gives admins the sums by person, device, space and collection, what
each space stores, and an estimated cost for each. The estimate uses prices an admin sets
(`PUT /api/library/usage`). They start as rough figures, not read from any bill: correct them to what
is really paid before trusting the numbers. `mm library usage` shows a member their own.

## Device libraries: what each computer holds

A computer's media library (`mm media`) stays on that computer. The Library's page has a switch
beside the space, Cloud or Computers, and Computers shows each computer as a card and its files as a
list. Each file is marked "On this computer only" or "Also in the cloud", with a link to the entry
that holds it. A file on a computer and a file in the Cloud Library are the same file when their
SHA-256 is the same: nothing else links them, and nothing is written to the computer's catalog.

- **Off until the owner says so.** `mm library report` only shows what a report would send.
  `mm library report on` is the owner's word: it turns reporting on and sends the cards.
  `mm library report --yes` sends them again after the media library changed, `off` stops, and
  `forget` takes the cards out of MediaMake. Never turn it on for them.
- **A card, never the file.** A card is a file's name, title, kind, subject, tags, size, length and
  SHA-256. Never its bytes and never its folder (`cardOfItem` in `tools/library.mjs`, checked again
  by `cleanCard` in `lib/cloud-library/devices.ts`).
- **Who sees them.** The owner, in every space. On a project, also its people, for a computer its
  owner opened to that project (`mm access open`). Someone who leaves the project takes their
  computers with them.
- **Looking from anywhere.** `mm library devices` lists the computers of a space, and
  `mm library devices "<words>"` their files that fit, so a cloud session can find that the stems
  are on the studio Mac.
- **Uploading links, it does not move.** `mm library save <collection> --item <slot>=<id>` takes a
  file from this computer's media library by its id (or the id's start). The file stays where it
  is, and from then on the page shows it as also in the cloud. A file that is only on someone
  else's computer is asked for with a to-do for that computer (`mm todo`, needs `media:library`).
  The page copies the words to ask Claude with for both.

`GET /api/library/devices?space=` lists the computers, `&of=<owner>/<label>` one computer's files
(`q`, `kind`, `where=device|both`), `POST` takes a report's part and `DELETE ?label=` forgets one.
Cards live in `library_device_files`, a computer's sums in `library_devices`.

## Not built yet

A device library's own collections, "Fetch to this device" from the page, the older Library page
(`/library`, the Mac's media library) folded into Computers, reuse of paid
results by `mm transcribe` and `mm analyze`, shared collections, the tools in the Spaces MCP, search
by meaning, previews, and uploads that resume
part by part (a file goes up in one request today, 5 GB at most).

Tests: `npx tsx --test lib/cloud-library/*.test.ts` (in `apps/mediamake`) and
`node --test tools/library.test.mjs`. Neither needs MongoDB or storage: the store and the routes
have not been run against the live database yet, the page has only been opened with sample data, filling with Claude has never called the API, and no real computer has reported its cards yet.
