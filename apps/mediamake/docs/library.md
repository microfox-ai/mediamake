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
script, or the title in its own script, for a title released in Latin letters), its length (m:ss,
measured from the master), artist, record label, use (internal only, unreleased, released), ISRC,
release date, genres, DistroKid details (a group, key by key: the release's own keys below, its
language, songwriters and AI disclosure, then whatever the pack holds), store links (one a platform),
playlists (many a platform), lyrics, what the song is about (in English: who, the story, who it is for
and when they would listen), a part-by-part description, and the slots master, transcript, stems,
release artwork and DistroKid pack. A song has one master, one lyrics and one transcript: a new one
replaces the old, which the entry's history names.

**Versions.** A collection keeps the template it was made from. When that template gets a new version
(Songs is at 3: the title in its own script, the length and what the song is about; the DistroKid
group's language, songwriters and AI disclosure), the collection reads as the new one (`upgradeTemplate`):
its fields, slots and guide are the new version's, and a field only the collection has is kept after
them. Nothing is written back and no entry changes; a template only guides.

**Lists that learn.** Platform, genre, label and artist are learning lists. A value used once in a
collection is offered next time, most used first, and a new spelling of a known value is saved as the
known one (`youtube music` becomes the collection's `YouTube Music`). Store links and playlists share
the platform list.

**The guide.** Each template carries a guide: Markdown that tells an AI where each field comes from,
what it must never guess (an ISRC, a link, a release date), and the sentence to ask before saving.
Under it sit the owner's preferences, their corrections for whoever fills the collection
(`mm library prefs`). `mm library guide <collection>` prints both with the fields, the slots and what
the lists have learned. Read it before the first save of a session.

**The others.** Anime art (`anime-art`: a picture with its series, characters, kind, style, mood, what
is in it, its artist, source and prompt; slots picture, cut-out, variants, analysis), Anime shots
(`anime-shots`: a clip with its series, episode, timecode, characters, what happens, shot, mood,
energy, length and where it was used; slots clip, still, contact sheet, analysis) and Background music
(`background-music`: a track with its kind, mood, genres, instruments, BPM, key, length, parts,
licence, credit line and source; slots track, stems, licence document, analysis). Each has a Use field
(Internal only, Our channels, Anywhere) and its own guide. An episode, a timecode, a BPM, a key, a
licence, a credit and a source are never guessed. None of the three has been filled with real entries
yet.

A new template is one more entry in `TEMPLATES`.

## The DistroKid link

A song is linked to its release on DistroKid by `distrokid.link` in its DistroKid details: the release
page, `https://distrokid.com/dashboard/album/?albumuuid=<album UUID>` (`lib/cloud-library/distrokid.ts`).
Beside it in the group, as DistroKid shows them: `albumUuid`, `upc`, `uploadDate`, `releaseDate` and
`recordLabel`. The template names these keys (a group field's `keys`), so the page shows them by their
labels with the link clickable, and `mm library guide songs` lists them. There is no top-level `link`
field: one home for one fact.

- **From the pack.** `pack-distrokid` (and `distrokid-release-info`) end with Browse Hack's
  `distrokid_record_packs` once the release is submitted: it writes those keys into the release
  folder's info.json under `"distrokid"`, with each track's ISRC (`isrc` for a single). Putting that
  info.json in a song's DistroKid pack slot copies them into the group (the pack's values win), with the
  ISRC of a single and the release date only when the song has none. The page does it when the file is
  dropped (an info.json is known by what it holds and goes in that slot when it is free), before Claude
  reads anything, and says so with Undo; every other save (`mm library save`,
  an MCP) does it on the server when the pack is stored. A dry run reads a pack the space already
  stores, else says what will be copied. A pack before `distrokid_record_packs` brings nothing.
- **Store links later.** The stores go live days after the upload. Browse Hack's Sync links button on
  the release page (or `distrokid_sync_links`) finds the songs linked to the release with
  `GET /api/library/entries?collection=songs&where=distrokid=<album UUID>` over every space the account
  can open, and saves to each: `storeLinks` (one a platform), the group merged with DistroKid's keys, the
  ISRC and release date where the song has none, `agent: true`.
- **Searching.** `where=` matches a group as its JSON, without case (`distrokid=<album UUID>`), one key
  of it as `field.key` (`distrokid.link=…`, `distrokid.upc=…`), and a key the template doesn't know in
  the entry's `extra` (so a `link` saved before the template named one is still found by `where=link=`).
- **Who may.** The extension calls with its OAuth access token; the middleware turns it into the
  account (`x-client-id`) like an API key. The Library's Cohort gate then holds: below Cohort, the search
  over every space and the save are refused (403, "The Library is open to Cohort members for now").
  The save also needs the song's space to be the caller's own or one they edit (a collection shared to
  them, only as an editor); a project's viewer can find a song but not change it.

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
| A collection's listing in Explore (what it is, the owner's rights) | On its collection, `library_collections.listing` |
| A request for access to a listed collection | MongoDB `library_requests`, one per collection and space that asks |
| One line per action, for the cost page | MongoDB `library_usage`, prices in `library_prices` |
| The bytes | The private bucket productions use, `library-private/<space>/<sha256>` |
| The search index: each entry's card, its long texts and its timed transcript in pieces | Upstash Vector, one namespace a collection. Rebuilt from the records, never the truth |

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
| `GET /api/library/entries?q=…` | A search, with a space or over every space the account can open. Each hit carries its card, its short fields (`facts`) and its filled slots (`has`). `limit` (10, at most 200) and `offset` page it. `where=` takes a field, a group's key (`distrokid.link=`) or an extra value |
| `GET /api/library/entries?q=…&meaning=1` | The same search by what an entry is about, best first. Each hit also carries `score` and `found` (the piece that fits, with its seconds in a transcript). 503 when the index is not set up |
| `POST /api/library/reindex` | `{ space, collection, from? }`: rebuilds a collection's part of the search index, a page of entries a call (`next` goes back as `from`). Owners and editors |
| `POST /api/library/entries` | Save an entry. `dry: true` answers with the sentence and the changes |
| `DELETE /api/library/entries?space=&ref=` | To the trash |
| `POST /api/library/files` | `start` (signed upload links for what isn't stored yet), then `finish` |
| `GET /api/library/files?space=&ref=[&slots=]` | Signed links to an entry's files |
| `GET /api/library/files?space=&ref=&read=` | A field's text or a text file's content, whole or a part |
| `GET /api/library/listed` | Every collection listed in Explore, with what the caller has to do with each. `?space=&collection=`: the requests waiting on one, for its owner |
| `POST /api/library/listed` | `list` (with `about` and `rights`), `unlist`, `accept`, `decline`: the owner of the space. `request` (with `to` and `note`), `withdraw`: a member who uses the Library |
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
  History. Change opens the same dialog as Add. A song with a DistroKid link shows "On DistroKid" under
  its title, with a button per store link beside it; a group shows its known keys first, by their labels.
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

## Reuse: found before it is paid for again

- **A result names what it was made from.** `mm library save … --file transcript=<words.json>
  --made-from=transcript=master:transcribe` records that the transcript was made from that exact
  master (its SHA-256), with that tool. Settings other than the tool's defaults go after it:
  `…:transcribe:lang=en letters`.
- **Asking by the file.** `mm library made-from <file or SHA-256> [--slot=transcript]
  [--params="…"]` lists what every space you can open holds that was made from this file with these
  settings (none means the defaults: other settings are another result). `--to=<file>` takes the
  newest. `GET /api/library/files?madeFrom=<sha256>` is the route.
- **`mm transcribe` asks first.** After the media library's own cache and before it prints a price,
  it asks the Cloud Library for the words of this exact song. A hit is kept like Scribe's own
  answer and nothing is spent. When the Library can't be asked (not signed in, offline, not a
  member) nothing changes. `--fresh` skips it, and `MEDIAMAKE_LIBRARY_REUSE=off` turns it off.
- **An entry into a production in one call.** `mm library use <collection>/<entry> [<slot>…]
  --into=<project>` puts the entry's files in the project's `input/` folder (from this computer's
  cache when it has them) and notes each file's SHA-256 in `input/library.json`, so a later render
  can say exactly which file it was made with.

## Shared collections

A collection belongs to the space it was made in and never moves. Its owner can open it to a
project (everyone on it) or to one person. They use the collection itself, never a copy, so every
change the owner makes reaches them at once.

- **Only the owner shares.** The owner of the collection's space, from the collection's Share
  button or with `mm library share <collection> --with=<project> | --to=<email> [--editor]
  [--internal]`. A project is one the owner is on; a person is found by the email address they sign
  in with, and gets it in their personal Library. A space that received a collection cannot pass it on.
- **An invitation, then a yes.** Nothing shows on the other side until someone there accepts
  (a project's owner or an editor, or the person). The invitation says what accepting means: "This
  is the owner's live collection. It changes when they change it." `mm library accept <collection>`
  and `leave` do the same from a session, each after the person's yes.
- **Its id on the other side.** In the receiving Library the collection keeps its id (`songs`)
  when that is free, else it gets the sharer's name (`songs-anime-music-zone`). Every route and
  every `mm library` command takes that id with the receiving space, so a shared collection is
  searched, read, fetched and used like any other. Search, `made-from` and `mm transcribe`'s
  look-up cover it.
- **What the others can do.** Search, read, preview and fetch. With an editor share, the receiving
  space's owner and editors also add, change and delete; its viewers still only read. The owner's
  guide and preferences come with the collection, and only the owner changes them.
- **Internal only stays home.** Entries whose Use is "Internal only" are left out for the others
  unless the owner ticks "Also show the ones marked Internal only" (`--internal`).
- **Whose storage, whose downloads.** The files stay in the owner's space and count against its
  storage, also what an editor adds. Every fetch and read is counted for whoever asked, with the
  space it was reached through (`via` on the usage line). The Share dialog and `mm library shares
  <collection>` show what each share fetched in 30 days and by how many people.
- **A space's own notes.** On a shared entry a receiving space keeps its own rating, tags and
  "used in" (the entry's "This space's notes" tab, `mm library notes <collection>/<entry>`). They
  stay in that space, the owner does not see them, and they never touch the entry.
- **Ending it.** The owner stops sharing, or the other side leaves: the collection is gone from
  that Library at once, with the notes kept on it. So is it for someone who leaves the project it
  was opened to. Files already inside their productions stay where they are.

`library_shares` holds one document per collection and space it is opened to, `library_notes` a
receiving space's notes. `GET /api/library/shares?space=&collection=` lists a collection's shares
for its owner, and `POST` takes `share`, `unshare`, `accept`, `leave` and `notes`. A space's
overview (`GET /api/library?space=`) lists the shared collections beside its own, each with
`shared: { by, role }`, and its open `invitations`.

## Search by meaning

Search has two halves. MongoDB answers the exact questions: every unreleased song, every song with
no transcript, the words typed. An Upstash Vector hybrid index answers by meaning ("the sad song
about the sea"), and only ranks: every entry it names is read again from MongoDB, so the filters,
the trash and what a share keeps back hold exactly as in the plain search
(`lib/cloud-library/meaning.ts`, `meaning-store.ts`).

- **What goes in.** For each entry: its card, each long text field (lyrics) in pieces of about 700
  characters cut at line ends, and each text or JSON file of 2 MB or less in a slot. A transcript
  with timed words goes in as pieces of about 30 seconds, each with its start and end, so a hit says
  where in the song it is. At most 120 records an entry. Audio, video and pictures are not read.
- **One namespace a collection** (`<space id>-<collection>`). A shared collection is searched in its
  owner's namespace, and a share that ends takes nothing out of the index.
- **Kept in step.** A save puts the entry's records in again in place of its old ones, and the trash
  takes them out. The index never fails a save: when Upstash is down the entry is saved and the
  index is behind until the next save or a rebuild.
- **Rebuilt at any time.** `mm library reindex [<collection>]` empties a collection's namespace and
  fills it from the records. Use it for a collection filled before the index was set up.
- **Where.** `mm library search "<words>" --meaning`, the MCPs' `search_library` with `byMeaning`,
  and the page's "By meaning" button beside the search (shown only when the index is set up). A hit
  shows the piece that fits, with its time in the song.
- **Counted** as a search, like the plain one.

| Variable | |
| --- | --- |
| `LIBRARY_VECTOR_REST_URL`, `LIBRARY_VECTOR_REST_TOKEN` | The Library's own Upstash Vector index: a **hybrid** index made with Upstash's dense and sparse embedding models, so text is embedded there and no embedding key is needed. Not the presets' index. Without them the Library works as before and a search by meaning answers 503 |

An entry's words are sent to Upstash to be embedded and are kept there. A collection whose words
must not leave MediaMake's own stores is not for a server with the index set up.

## Listed in Explore

The owner of a space can list one of its collections in Explore (Share on the collection › In
Explore): what it is, and what someone with access may do with it. The rights are required and are
the owner's own words, shown as written under "Rights, as its owner wrote them". Nobody else writes
them, and nothing lists a collection but its owner on the page.

Explore then has a Collections tab (only while something is listed) for members who use the Library.
A card shows the collection's name and picture, whose it is, how many entries it holds, a few titles,
what each entry can hold and the rights. It never shows a file, a field's value or a link, and an
entry marked Internal only is neither counted nor named.

**Request access** asks the owner, for the asker's personal Library or a space they own or edit, with
a note. The owner sees the count on Share and answers under In Explore:

- **Accept** opens the collection to that space to read and fetch, as an invitation. The asker still
  accepts it in their own Library, as with any share, and gets the owner's live collection, not a copy.
- **Decline** is kept, so the same request is not sent again.

A request not answered yet can be taken back. Taking a collection off Explore drops its waiting
requests and leaves the shares already made (`lib/cloud-library/listing.ts`, `listing-store.ts`).

No mail goes to the owner when someone asks, or to the asker when it is answered: both see it in the
app. Listing is on the page only: `mm library` and the MCPs have no command for it.

## In the Spaces MCP

Someone with only the MediaMake Spaces MCP (`mcp/projectsync`, no repo on the computer) reads and
fills the Library with its tools (`packages/projectsync-mcp/src/tools/library.ts`), which call the
same routes as `mm library`:

| Tool | Does |
| --- | --- |
| `list_library` | The spaces whose Library the account can open and their collections. With a space and a collection: its fields, file slots, guide, learned spellings and the owner's preferences |
| `search_library` | Cards, by words, `where`, `has` and `lacks`, or `byMeaning`. No download |
| `get_library_entry` | One entry in full |
| `read_library_entry` | A field's text or a text file, whole or a part (lines, seconds) |
| `fetch_library_files` | An entry's files into a folder, each checked against its SHA-256. A file there that differs is not replaced unless asked |
| `library_made_from` | What was already made from an exact file, before paying again |
| `save_library_entry` | Without `yes`: saves nothing and answers with the sentence to ask, what would change and the private details found. With `yes: true`, after the person agreed: uploads the files and saves |

The hosted mm-use connector (`/mcp/use`) has the five that only read: `list_library`, `search_library`,
`get_library_entry`, `read_library_entry` and `library_made_from` (by SHA-256, since it cannot read a
file). They are one module, `packages/mediamake-mcp/src/tools/library.ts`.

Sharing a collection, starting one from a template, the trash, preferences and a computer's report
stay on the page and in `mm library`: they are the owner's decisions, and the MCP has no tool for
them. The MCP keeps no cache of fetched files, so a file fetched twice into two folders is
downloaded twice (`mm library fetch` clones it from the computer's cache).

## Not built yet

`mm analyze` and `media cache get` asking the Library, a skill naming the slots it reads
(`mm library use --for=<skill>`), a device library's own collections, "Fetch to this device" from the page, the older Library page
(`/library`, the Mac's media library) folded into Computers, for shared collections a monthly limit per project
or person, a mail when one is shared, asked for or answered, workers that bring in a song's statistics and store
links from the platforms (`POST /api/library/stats` takes them, nothing calls it on a schedule), the Spaces Media
tab's shared assets moved into the Library, billing,
and keeping a removed file's bytes for 30 days (nothing deletes stored bytes yet), previews, and uploads that resume
part by part (a file goes up in one request today, 5 GB at most).

Tests: `npx tsx --test lib/cloud-library/*.test.ts` (in `apps/mediamake`) and
`node --test tools/library.test.mjs`. Neither needs MongoDB or storage: the store and the routes
have not been run against the live database yet (sharing too: no collection has been shared for real; nor has a DistroKid pack been copied into a stored song, or Sync links saved to one), the page has only been opened with sample data, filling with Claude has never called the API, and no real computer has reported its cards yet. Search by meaning has never run against a real Upstash Vector index, the MCPs' Library tools only against a stand-in server, and listing and requests only with sample data.
