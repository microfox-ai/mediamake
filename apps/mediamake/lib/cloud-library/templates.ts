/**
 * The templates a collection starts from (docs/library.md). A template guides: it names the fields
 * and the file slots and tells an AI how to fill them. Nothing in it is required, and a collection
 * made from one is free to change afterwards.
 *
 * A new template is one more entry in TEMPLATES. Pure: no database.
 */
import type { Template } from './index';

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
| Use | The person. Internal only when the song was never meant for release | Assume released |
| ISRC, release date | The DistroKid pack or the person | Guess, or build one from a pattern |
| Record label | The DistroKid pack, else what the collection's earlier songs use | |
| DistroKid details | The pack, key by key (genres, language, explicit, songwriters, credits, AI disclosure) | Fill a credit you were not given |
| Store links, playlists | The person, or a page you opened and saw | Build a link from a title |
| Lyrics | The lyrics file or the person's text, whole | Rewrite or correct the wording |
| Transcript | \`mm transcribe\` on this master, saved with what it was made from | A transcript of another version |
| Part by part | Draft it from the lyrics and the transcript's times, and say it is a draft | Claim what the music sounds like unless a tool measured it |
| Statistics | A platform's own page or a worker | Estimate |

## Names

- Platforms, genres, labels and artists are lists that learn. Use the spelling the collection already has (the overview lists them), and add a new one only when none fits.
- One store link a platform. A playlist is a platform, a link, the playlist's name and the day the song was added.
- A part is a name (intro, verse 1, hook, bridge, outro), its start and end in seconds, what happens in the words and the music, and its energy (low, building, high).

## One of each

A song has one master, one lyrics and one transcript. Putting a new one in replaces the old one, which stays in the entry's history. Only do that on the owner's word. When the master changes, check that the transcript's times still fit, and say so when they may not.

## Checks before you say it is done

- A link opens.
- An ISRC is two letters, three letters or digits, then seven digits.
- The transcript's last word ends before the master does.
- A song marked internal only, or unreleased, goes in nothing public.
`;

export const SONGS: Template = {
  id: 'songs',
  version: 1,
  name: 'Songs',
  noun: 'song',
  about: 'A channel’s songs: the master, the words, the release details, the links and the numbers, kept once and reused.',
  titleField: 'title',
  fields: [
    { key: 'title', label: 'Song title', kind: 'text', group: 'Identity' },
    { key: 'titleLatin', label: 'Title in Latin letters', kind: 'text', group: 'Identity', hint: 'When the title is written in another script, so it is found either way' },
    { key: 'artist', label: 'Artist', kind: 'text', group: 'Identity', learns: 'artist' },
    { key: 'label', label: 'Record label', kind: 'text', group: 'Identity', learns: 'label' },
    { key: 'use', label: 'Use', kind: 'choice', group: 'Identity', options: ['Internal only', 'Unreleased', 'Released'], hint: 'Internal only and Unreleased songs go in nothing public' },
    { key: 'isrc', label: 'ISRC', kind: 'text', group: 'Release', neverGuess: true, hint: 'Only when released' },
    { key: 'releaseDate', label: 'Release date', kind: 'date', group: 'Release', neverGuess: true },
    { key: 'genres', label: 'Genres', kind: 'tags', group: 'Release', learns: 'genre' },
    { key: 'distrokid', label: 'DistroKid details', kind: 'group', group: 'Release', hint: 'Everything the pack holds, key by key: language, explicit, songwriters, credits, AI disclosure' },
    { key: 'storeLinks', label: 'Store links', kind: 'links', group: 'Release', learns: 'platform', neverGuess: true, hint: 'One link a platform' },
    { key: 'playlists', label: 'Playlists', kind: 'playlists', group: 'Release', learns: 'platform', neverGuess: true, hint: 'The playlists the song is on, by platform' },
    { key: 'lyrics', label: 'Lyrics', kind: 'longtext', group: 'Words', hint: 'As written. Exactly one: the owner corrects it in place' },
    { key: 'parts', label: 'Part by part', kind: 'parts', group: 'Words', hint: 'Each part: name, start and end in seconds, what happens, energy' },
  ],
  slots: [
    { key: 'master', label: 'Master', accepts: ['audio'], many: false, hint: 'The released or final one' },
    { key: 'transcript', label: 'Transcript', accepts: ['json'], many: false, hint: 'Timed words, made from this master' },
    { key: 'stems', label: 'Stems', accepts: ['audio'], many: true, hint: 'When they exist' },
    { key: 'artwork', label: 'Release artwork', accepts: ['image'], many: false },
    { key: 'distrokid-pack', label: 'DistroKid pack', accepts: ['json'], many: false },
  ],
  guide: SONGS_GUIDE,
};

export const TEMPLATES: Record<string, Template> = { songs: SONGS };

/** The templates as a "New collection" list shows them. */
export function templateList(): { id: string; name: string; noun: string; about: string; fields: number; slots: number }[] {
  return Object.values(TEMPLATES).map(t => ({ id: t.id, name: t.name, noun: t.noun, about: t.about, fields: t.fields.length, slots: t.slots.length }));
}
