/**
 * The templates a collection starts from (docs/library.md). A template guides: it names the fields
 * and the file slots and tells an AI how to fill them. Nothing in it is required, and a collection
 * made from one is free to change afterwards.
 *
 * A new template is one more entry in TEMPLATES. Pure: no database.
 */
import { DISTROKID_DETAIL_KEYS, DISTROKID_KEYS } from './distrokid';
import type { Template, TemplateField } from './index';

const SONGS_GUIDE = `# Filling the Songs collection

One entry is one song. Nothing is required: a song used only inside the channel can be a title and a master.

## Before you save

Say what you are about to do in this one form, with the real names, and wait for a yes:

    Add the new song "<song title>" to the Songs collection of the <space name> space (cloud)?
    Uploads: master (64 MB), release artwork (2 MB). Fields: artist, genres, lyrics, 3 store links.

One question covers one song. For a change to a song that is there, list each field as its old value, then its new value. \`mm library save\` prints this sentence for you: show it, and add \`--yes\` only after the person agrees.

## Where each field comes from

| Field | Take it from | Never |
| --- | --- | --- |
| Song title, artist | The DistroKid pack, the audio file's tags, the folder name, the person | |
| Title in its own script | The song's own lyrics, its audio file's tags, its artwork or thumbnail | Transliterate by guess |
| Description | Public: what the song is, in a line or two, as the song's own YouTube description introduces it (its intro lines, before the lyrics), else the DistroKid details. With neither, written from the lyrics in English: who it is about, the story it tells, who it is for and when they would listen | Invent a source, a festival or a fact the words don't support. Name a character or a show the song's public words don't name |
| Internal description | Private, for the owner and the team: what the song is based on, in one or two lines. For a song written about an anime: the series, the character and the scene or arc it draws on, from the song folder (titles, lyrics, notes), its video's title and description, and what the person says. "Not anime-based" when it isn't. Say "unsure" beside anything the evidence only suggests | Copy it into a description, a store, a release or anything public. Guess a scene the evidence doesn't point to |
| Length | Measured from the master, as m:ss | Copy it from a store page |
| Use | The person. Internal only when the song was never meant for release | Assume released |
| ISRC, release date | The DistroKid pack or the person | Guess, or build one from a pattern |
| Record label | The DistroKid pack, else what the collection's earlier songs use | |
| DistroKid details | Browse Hack's \`distrokid_song_details\` (one JSON a song, the release as DistroKid shows it), then the pack, key by key (genres, language, explicit, songwriters, credits, AI disclosure), and the release's own keys below. Where the song details and the pack's info.json both have a value, the song details win | Fill a credit you were not given |
| DistroKid link, album UUID, UPC, upload and release dates on DistroKid | The \`distrokid\` block of the pack's info.json (Browse Hack's \`distrokid_record_packs\` writes it once the release is submitted), or DistroKid's release page | Build a link or a UPC, or copy one from another song |
| Store links, playlists | The person, a page you opened and saw, or DistroKid's release page (Browse Hack's Sync links) | Build a link from a title |
| Lyrics | DistroKid's published text first (the song details' \`plainLyrics\`), else the lyrics file or the person's text, whole | Rewrite or correct the wording |
| Transcript | \`mm transcribe\` on this master, saved with what it was made from. Check its words came back in the lyrics' script: Scribe can answer in another one even with the language set | A transcript of another version, or one in the wrong script (keep it out of the slot) |
| Part by part | Time each stanza by matching its letters to the transcript (Indic scripts share one letter layout, so this works across scripts), then describe the music only from measurements of the master: loud or quiet for this song, rising or falling, busier or sparser. Say it is a draft | Name instruments, or claim a sound no tool measured |
| Statistics | A platform's own page or a worker | Estimate |

## Names

- Platforms, genres, labels and artists are lists that learn. Use the spelling the collection already has (the overview lists them), and add a new one only when none fits.
- One store link a platform. A playlist is a platform, a link, the playlist's name and the day the song was added.
- A part is a name (intro, verse 1, hook, bridge, outro), its start and end in seconds, what happens in the words and the music, and its energy (low, building, high).

## The DistroKid link

\`distrokid.link\` is the song's release page on DistroKid, \`https://distrokid.com/dashboard/album/?albumuuid=<album UUID>\`. It is what links the song to its release: a song whose DistroKid details hold that link is the release's record.

- Beside it in the same group: \`albumUuid\` (the UUID in the link), \`upc\`, \`uploadDate\`, \`releaseDate\` and \`recordLabel\`, as DistroKid shows them.
- Putting a DistroKid pack (its info.json) in the song copies these from the pack's \`distrokid\` block, with the ISRC of a single and the release date when the song has none. Nothing else is changed.
- Store links arrive days later, when the stores go live. Browse Hack's Sync links button on the release page (or its \`distrokid_sync_links\` tool) saves them to every song linked to the release.
- To find the song of a release: \`where=distrokid=<album UUID>\` (or \`distrokid.link=<link>\`).

## One of each

A song has one master, one lyrics and one transcript. Putting a new one in replaces the old one, which stays in the entry's history. Only do that on the owner's word. When the master changes, check that the transcript's times still fit, and say so when they may not.

## Checks before you say it is done

- A link opens.
- A DistroKid link holds the album UUID beside it.
- An ISRC is two letters, three letters or digits, then seven digits.
- The transcript's last word ends before the master does.
- The transcript is in the lyrics' script.
- The parts run from 0:00 to the master's end with no gap.
- A song marked internal only, or unreleased, goes in nothing public.
- The internal description is in nothing public: not the description, a store, a release or a video's words.
`;

export const SONGS: Template = {
  id: 'songs',
  version: 4,
  name: 'Songs',
  noun: 'song',
  about: 'A channel’s songs: the master, the words, the release details, the links and the numbers, kept once and reused.',
  titleField: 'title',
  fields: [
    { key: 'title', label: 'Song title', kind: 'text', group: 'Identity' },
    { key: 'titleOriginal', label: 'Title in its own script', kind: 'text', group: 'Identity', hint: 'The title in the song’s own script (Telugu, Hindi…) when it is released in Latin letters: from its lyrics, tags or artwork, never transliterated by guess' },
    { key: 'duration', label: 'Length', kind: 'text', group: 'Identity', hint: 'm:ss, measured from the master' },
    { key: 'artist', label: 'Artist', kind: 'text', group: 'Identity', learns: 'artist' },
    { key: 'label', label: 'Record label', kind: 'text', group: 'Identity', learns: 'label' },
    { key: 'use', label: 'Use', kind: 'choice', group: 'Identity', options: ['Internal only', 'Unreleased', 'Released'], hint: 'Internal only and Unreleased songs go in nothing public' },
    { key: 'isrc', label: 'ISRC', kind: 'text', group: 'Release', neverGuess: true, hint: 'Only when released' },
    { key: 'releaseDate', label: 'Release date', kind: 'date', group: 'Release', neverGuess: true },
    { key: 'genres', label: 'Genres', kind: 'tags', group: 'Release', learns: 'genre' },
    { key: 'distrokid', label: 'DistroKid details', kind: 'group', group: 'Release', neverGuess: true, keys: [...DISTROKID_KEYS, ...DISTROKID_DETAIL_KEYS], hint: 'The release on DistroKid (its link, album UUID, UPC, dates) and everything the pack holds, key by key: language, explicit, songwriters, credits, AI disclosure' },
    { key: 'storeLinks', label: 'Store links', kind: 'links', group: 'Release', learns: 'platform', neverGuess: true, hint: 'One link a platform. DistroKid’s Sync links fills them once the stores are live' },
    { key: 'playlists', label: 'Playlists', kind: 'playlists', group: 'Release', learns: 'platform', neverGuess: true, hint: 'The playlists the song is on, by platform' },
    { key: 'lyrics', label: 'Lyrics', kind: 'longtext', group: 'Words', hint: 'As written. Exactly one: the owner corrects it in place' },
    { key: 'description', label: 'Description', kind: 'longtext', group: 'Words', hint: 'Public: what the song is, from its YouTube description or DistroKid details, else written from the lyrics. Never a fact the words don’t support' },
    { key: 'internalDescription', label: 'Internal description', kind: 'longtext', group: 'Words', hint: 'Private, for the owner and the team: what the song is based on (for an anime song, the series, the character and the scene). Never copied into anything public' },
    { key: 'parts', label: 'Part by part', kind: 'parts', group: 'Words', hint: 'Each part: name, start and end in seconds, what happens, energy' },
  ],
  slots: [
    { key: 'master', label: 'Master', accepts: ['audio'], many: false, hint: 'The released or final one' },
    { key: 'transcript', label: 'Transcript', accepts: ['json'], many: false, hint: 'Timed words, made from this master' },
    { key: 'stems', label: 'Stems', accepts: ['audio'], many: true, hint: 'When they exist' },
    { key: 'artwork', label: 'Release artwork', accepts: ['image'], many: false },
    { key: 'distrokid-pack', label: 'DistroKid pack', accepts: ['json'], many: false, hint: 'The release folder’s info.json. Its DistroKid link, UPC and dates are copied into the song' },
  ],
  guide: SONGS_GUIDE,
  // version 3: the title in its own script replaced the title in Latin letters (the title itself is the released one)
  // version 4: Description (public, was About the song) and Internal description (private: what the song is based on)
  retired: ['titleLatin'],
};

/** The parts every guide shares: the question before a save, and how names are kept. */
const guideOf = (t: { name: string; noun: string; one: string; uploads: string; table: string; names: string[]; checks: string[] }) => `# Filling the ${t.name} collection

${t.one} Nothing is required.

## Before you save

Say what you are about to do in this one form, with the real names, and wait for a yes:

    Add the new ${t.noun} "<title>" to the ${t.name} collection of the <space name> space (cloud)?
    Uploads: ${t.uploads}

One question covers one ${t.noun}. For a change to one that is there, list each field as its old value, then its new value. \`mm library save\` prints this sentence for you: show it, and add \`--yes\` only after the person agrees.

## Where each field comes from

| Field | Take it from | Never |
| --- | --- | --- |
${t.table}

## Names

${t.names.map(line => `- ${line}`).join('\n')}

## Checks before you say it is done

${t.checks.map(line => `- ${line}`).join('\n')}
`;

const USE_FIELD: TemplateField = { key: 'use', label: 'Use', kind: 'choice', group: 'Rights', options: ['Internal only', 'Our channels', 'Anywhere'], hint: 'Internal only is kept from a collection that is shared, unless its owner says otherwise' };

export const ANIME_ART: Template = {
  id: 'anime-art',
  version: 1,
  name: 'Anime art',
  noun: 'picture',
  about: 'Pictures a channel reuses: character art, key visuals, pins and generated art, each with who is in it, where it came from and where it may be used.',
  titleField: 'title',
  fields: [
    { key: 'title', label: 'Title', kind: 'text', group: 'Identity', hint: 'What you would call it out loud: "Luffy, straw hat close-up"' },
    { key: 'series', label: 'Series', kind: 'text', group: 'Identity', learns: 'series' },
    { key: 'characters', label: 'Characters', kind: 'tags', group: 'Identity', learns: 'character' },
    { key: 'kind', label: 'Kind', kind: 'choice', group: 'Identity', options: ['Official art', 'Screenshot', 'Fan art', 'Generated', 'Our own'] },
    { key: 'style', label: 'Style', kind: 'tags', group: 'Look', learns: 'style', hint: 'Line art, cel, painted, manga page, 3D' },
    { key: 'mood', label: 'Mood', kind: 'tags', group: 'Look', learns: 'mood' },
    { key: 'colours', label: 'Main colours', kind: 'tags', group: 'Look' },
    { key: 'description', label: 'What is in it', kind: 'longtext', group: 'Look', hint: 'Who, doing what, where, framing. What you see, not what you guess' },
    { key: 'artist', label: 'Artist', kind: 'text', group: 'Rights', learns: 'artist', neverGuess: true },
    { key: 'source', label: 'Source', kind: 'links', group: 'Rights', learns: 'platform', neverGuess: true, hint: 'The page it was taken from' },
    { key: 'prompt', label: 'Prompt', kind: 'longtext', group: 'Rights', hint: 'For generated art: the prompt and the tool, as used' },
    USE_FIELD,
  ],
  slots: [
    { key: 'picture', label: 'Picture', accepts: ['image'], many: false, hint: 'The best copy you have' },
    { key: 'cutout', label: 'Cut-out', accepts: ['image'], many: false, hint: 'The subject on a clear background, when one was made' },
    { key: 'variants', label: 'Variants', accepts: ['image'], many: true, hint: 'Crops, upscales, restyles' },
    { key: 'analysis', label: 'Analysis', accepts: ['json'], many: false, hint: 'What a tool measured: faces, boxes, palette' },
  ],
  guide: guideOf({
    name: 'Anime art',
    noun: 'picture',
    one: 'One entry is one picture, with its cut-out and variants beside it.',
    uploads: 'picture (4 MB), cut-out (2 MB). Fields: series, characters, kind, source.',
    table: [
      '| Title, series, characters | The file name, the page it came from, the person | Name a character you are not sure of |',
      '| Kind | The source: an official site, a screenshot, an artist\'s page, a generation job | Call fan art official |',
      '| Style, mood, colours, what is in it | The picture itself: say what you see | Describe what you cannot see |',
      '| Artist, source | The page it was taken from, or the person | Guess an artist, or build a link |',
      '| Prompt | The generation job\'s own record | Rewrite it |',
      '| Use | The person. Internal only when they did not say | Assume it may go anywhere |',
    ].join('\n'),
    names: ['Series, characters, styles, moods and artists are lists that learn. Use the spelling the collection already has, and add a new one only when none fits.', 'A cut-out or a variant is made from the picture: save it with what it was made from, so nobody makes it again.'],
    checks: ['The source link opens.', 'A picture marked Internal only goes in nothing public.', 'Fan art names its artist, or says the artist is unknown.'],
  }),
};

export const ANIME_SHOTS: Template = {
  id: 'anime-shots',
  version: 1,
  name: 'Anime shots',
  noun: 'shot',
  about: 'Clips cut from footage for edits: each shot with its series and episode, who is in it, what happens, how it moves and where it may be used.',
  titleField: 'title',
  fields: [
    { key: 'title', label: 'Title', kind: 'text', group: 'Identity', hint: '"Zoro draws three swords, low angle"' },
    { key: 'series', label: 'Series', kind: 'text', group: 'Identity', learns: 'series' },
    { key: 'episode', label: 'Episode or film', kind: 'text', group: 'Identity', neverGuess: true },
    { key: 'timecode', label: 'Timecode in the source', kind: 'text', group: 'Identity', neverGuess: true, hint: 'Start to end, as the analysis gave them' },
    { key: 'characters', label: 'Characters', kind: 'tags', group: 'Identity', learns: 'character' },
    { key: 'action', label: 'What happens', kind: 'longtext', group: 'Shot' },
    { key: 'shot', label: 'Shot', kind: 'tags', group: 'Shot', learns: 'shot', hint: 'Close-up, wide, pan, zoom, impact frame, twixtor take' },
    { key: 'mood', label: 'Mood', kind: 'tags', group: 'Shot', learns: 'mood' },
    { key: 'energy', label: 'Energy', kind: 'choice', group: 'Shot', options: ['Low', 'Building', 'High'] },
    { key: 'seconds', label: 'Length in seconds', kind: 'number', group: 'Shot' },
    { key: 'usedIn', label: 'Used in', kind: 'tags', group: 'Use', hint: 'The productions it was cut into, so a take is not used twice by accident' },
    { key: 'source', label: 'Source', kind: 'links', group: 'Rights', learns: 'platform', neverGuess: true },
    USE_FIELD,
  ],
  slots: [
    { key: 'clip', label: 'Clip', accepts: ['video'], many: false },
    { key: 'still', label: 'Still', accepts: ['image'], many: false, hint: 'One frame that shows the shot' },
    { key: 'contact-sheet', label: 'Contact sheet', accepts: ['image'], many: false },
    { key: 'analysis', label: 'Analysis', accepts: ['json'], many: false, hint: 'Cuts, motion and subject boxes from analyze-video' },
  ],
  guide: guideOf({
    name: 'Anime shots',
    noun: 'shot',
    one: 'One entry is one shot: a clip from one cut to the next.',
    uploads: 'clip (18 MB), still (1 MB). Fields: series, episode, characters, what happens.',
    table: [
      '| Title, what happens, shot, mood, energy | The clip and its contact sheet: say what you see | Describe a shot you did not look at |',
      '| Series, characters | The footage\'s folder, its analysis, the person | Name a character you are not sure of |',
      '| Episode, timecode | The analysis of the source file, or the person | Guess an episode number |',
      '| Length | The clip itself | |',
      '| Used in | The production that took it, when it takes it | |',
      '| Source, use | The person | Assume it may go anywhere |',
    ].join('\n'),
    names: ['Series, characters, shot kinds and moods are lists that learn. Use the spelling the collection already has.', 'The still, the contact sheet and the analysis are made from the clip: save each with what it was made from.'],
    checks: ['The clip starts and ends on a cut.', 'A take already listed under Used in is offered only when the person asks for it again.'],
  }),
};

export const BACKGROUND_MUSIC: Template = {
  id: 'background-music',
  version: 1,
  name: 'Background music',
  noun: 'track',
  about: 'Music beds and sound for videos: each track with its mood, tempo and key, where it came from and the licence it is used under.',
  titleField: 'title',
  fields: [
    { key: 'title', label: 'Track title', kind: 'text', group: 'Identity' },
    { key: 'artist', label: 'Artist', kind: 'text', group: 'Identity', learns: 'artist' },
    { key: 'kind', label: 'Kind', kind: 'choice', group: 'Identity', options: ['Music bed', 'Instrumental of our song', 'Sound effect', 'Ambience'] },
    { key: 'mood', label: 'Mood', kind: 'tags', group: 'Sound', learns: 'mood' },
    { key: 'genres', label: 'Genres', kind: 'tags', group: 'Sound', learns: 'genre' },
    { key: 'instruments', label: 'Instruments', kind: 'tags', group: 'Sound', learns: 'instrument' },
    { key: 'bpm', label: 'BPM', kind: 'number', group: 'Sound', neverGuess: true, hint: 'Measured by a tool, or from the source' },
    { key: 'key', label: 'Key', kind: 'text', group: 'Sound', neverGuess: true },
    { key: 'seconds', label: 'Length in seconds', kind: 'number', group: 'Sound' },
    { key: 'loops', label: 'Loops cleanly', kind: 'choice', group: 'Sound', options: ['Yes', 'No'] },
    { key: 'parts', label: 'Part by part', kind: 'parts', group: 'Sound', hint: 'Build, drop, quiet stretch: name, start and end in seconds, energy' },
    { key: 'licence', label: 'Licence', kind: 'text', group: 'Rights', learns: 'licence', neverGuess: true, hint: 'As its source states it: "CC BY 4.0", "Epidemic Sound subscription", "Our own"' },
    { key: 'credit', label: 'Credit line', kind: 'text', group: 'Rights', neverGuess: true, hint: 'The line a description must carry, when the licence asks for one' },
    { key: 'source', label: 'Source', kind: 'links', group: 'Rights', learns: 'platform', neverGuess: true },
    USE_FIELD,
  ],
  slots: [
    { key: 'master', label: 'Track', accepts: ['audio'], many: false },
    { key: 'stems', label: 'Stems', accepts: ['audio'], many: true },
    { key: 'licence-file', label: 'Licence document', accepts: ['document', 'text', 'image'], many: false, hint: 'The receipt or licence text, kept with the track' },
    { key: 'analysis', label: 'Analysis', accepts: ['json'], many: false, hint: 'Beat grid, energy, loudness' },
  ],
  guide: guideOf({
    name: 'Background music',
    noun: 'track',
    one: 'One entry is one track, with its stems and its licence beside it.',
    uploads: 'track (9 MB), licence document (120 KB). Fields: artist, mood, BPM, licence.',
    table: [
      '| Title, artist | The file\'s tags, the page it came from, the person | |',
      '| Mood, genres, instruments | Listen notes from the person, or an analysis | Claim what it sounds like unless a tool or the person said |',
      '| BPM, key, length, part by part | An analysis of this exact file | Estimate a tempo |',
      '| Licence, credit line, source | The source\'s own page or the licence document | Guess a licence, or call a track free |',
      '| Use | The licence and the person. Internal only when either is unclear | Assume it may go anywhere |',
    ].join('\n'),
    names: ['Artists, moods, genres, instruments and licences are lists that learn. Use the spelling the collection already has.', 'Stems and the analysis are made from the track: save each with what it was made from.'],
    checks: ['A track with no licence stays Internal only.', 'When the licence asks for a credit, the credit line is filled.', 'The source link opens.'],
  }),
};

export const TEMPLATES: Record<string, Template> = { songs: SONGS, 'anime-art': ANIME_ART, 'anime-shots': ANIME_SHOTS, 'background-music': BACKGROUND_MUSIC };

/**
 * A collection's template as it reads today. A collection keeps the template it was made from; when
 * that template has a newer version here, its fields, slots and guide are this version's (a field
 * or a slot only the collection has is kept, after them; a field the newer version retired is not).
 * Read this way, never written back, so an older collection gets a new field's label, keys and hint
 * without a migration. The entries' values are untouched: a template only guides.
 */
export function upgradeTemplate(stored: Template): Template {
  const latest = TEMPLATES[stored.id];
  if (!latest || (stored.version ?? 0) >= latest.version) return stored;
  const known = <T extends { key: string }>(list: T[]) => new Set(list.map(item => item.key));
  const fields = known(latest.fields);
  const slots = known(latest.slots);
  const retired = new Set(latest.retired ?? []);
  return {
    ...latest,
    fields: [...latest.fields, ...stored.fields.filter(field => !fields.has(field.key) && !retired.has(field.key))],
    slots: [...latest.slots, ...stored.slots.filter(slot => !slots.has(slot.key))],
  };
}

/** The templates as a "New collection" list shows them. */
export function templateList(): { id: string; name: string; noun: string; about: string; fields: number; slots: number }[] {
  return Object.values(TEMPLATES).map(t => ({ id: t.id, name: t.name, noun: t.noun, about: t.about, fields: t.fields.length, slots: t.slots.length }));
}
