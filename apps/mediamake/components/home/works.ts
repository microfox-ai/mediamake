/**
 * The finished works the homepage shows under "Made with MediaMake": three to five, picked by
 * the owner (UI refactor plan, question 20). Each was made start to finish with the skill it
 * names, which is the homepage's proof of the rule (see RULE in ./landing).
 *
 * To change them, edit this list. `youtube` is the video's link or id: with it the card plays
 * the video in place, without it the card is the title on the brand's dark ground.
 */
export interface Work {
  title: string;
  /** What kind of piece it is, in two or three words. */
  kind: string;
  /** The skill that made it (its name in .agents/skills): the card links to its page. */
  skill: string;
  /** The channel or series it was made for. */
  by?: string;
  /** Its YouTube link or id. */
  youtube?: string;
  /** A 9:16 Short: the card is upright. */
  vertical?: boolean;
}

export const WORKS: Work[] = [
  { title: 'Nakama!', kind: 'Lyric video', skill: 'make-lyrics-video-like-nakama', by: 'Anime Music Zone' },
  { title: 'F1 × Hit It', kind: 'Song edit', skill: 'make-video-music-remix-like-f1xhitit' },
  { title: 'Quicksilver × Kingpin', kind: 'Song edit', skill: 'make-video-music-remix-like-quicksilverxkingpin', by: 'ATOMIC RAP' },
  { title: 'Screaming to Win', kind: 'Kinetic type Short', skill: 'make-kinetictype-like-screamingtowin', vertical: true },
  { title: 'Cook with Claude: pack-brand-kit', kind: 'Tutorial episode', skill: 'make-cwc-tutorial' },
];
