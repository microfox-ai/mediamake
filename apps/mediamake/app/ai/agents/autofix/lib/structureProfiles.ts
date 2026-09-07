/**
 * Structure profiles for the Sentence Structure Fixer.
 *
 * A "profile" is NOT a music genre — it is a *delivery / segmentation profile*.
 * What actually decides how captions should be cut is how the words arrive in
 * time: a drill triplet flow needs 3-word flashes, a sustained ballad line can
 * hold 10 words across 6 seconds, a broadcast subtitle has a hard 42-char rule.
 *
 * Each profile carries hard numeric segmentation parameters (used by the
 * deterministic post-pass, so the output is enforced, not just "suggested" to
 * the model) plus prose `guidance` that is injected into the system prompt.
 *
 * This file is intentionally free of server-only imports so the transcriber UI
 * can import the same list and stay in sync with the agent.
 */

export type SplitDensity =
  | 'auto'
  | 'much-finer'
  | 'finer'
  | 'coarser'
  | 'much-coarser';

export interface StructureProfileParams {
  /** Ideal characters on one caption line. */
  targetChars: number;
  /** Hard cap — a line longer than this is force-split. */
  maxChars: number;
  /** Ideal word count per line. */
  targetWords: number;
  /** Hard cap on words per line. */
  maxWords: number;
  /** Lines below this are merged into a neighbour when legal. */
  minWords: number;
  /** Seconds. Lines shorter than this are merged when legal. */
  minLineDuration: number;
  /** Seconds. Lines longer than this are force-split. */
  maxLineDuration: number;
  /** Silence >= this ALWAYS ends a line (breath / bar break / beat drop). */
  hardGapSeconds: number;
  /** Silence >= this is a strongly preferred break point. */
  softGapSeconds: number;
  /** Keep repeated hooks/chants on a single line instead of chopping them. */
  keepRepeatsWhole: boolean;
  /** Let measured delivery speed nudge the char/word targets. */
  adaptToTempo: boolean;
}

export interface StructureProfile extends StructureProfileParams {
  id: string;
  label: string;
  /** Short blurb shown in the UI select. */
  description: string;
  /** Injected into the system prompt — how a human editor would cut this. */
  guidance: string;
}

const profile = (p: StructureProfile) => p;

export const STRUCTURE_PROFILES: StructureProfile[] = [
  profile({
    id: 'auto',
    label: 'Auto-detect',
    description:
      'Infers the delivery from word density and pauses, then picks its own line length.',
    targetChars: 38,
    maxChars: 62,
    targetWords: 7,
    maxWords: 11,
    minWords: 2,
    minLineDuration: 0.6,
    maxLineDuration: 5,
    hardGapSeconds: 0.9,
    softGapSeconds: 0.45,
    keepRepeatsWhole: false,
    adaptToTempo: true,
    guidance: `First read the timings and decide what this content is: dense syllables with sub-200ms gaps means rapped/fast delivery (cut short and often); words spread over long durations with big gaps means sung or narrated (cut long and rarely). State nothing — just segment accordingly.`,
  }),
  profile({
    id: 'rap-rapid-fire',
    label: 'Rap — rapid-fire / triplet flow',
    description:
      'Trap & drill triplets. Very short bursts, many divisions, cuts on the triplet.',
    targetChars: 22,
    maxChars: 34,
    targetWords: 4,
    maxWords: 6,
    minWords: 2,
    minLineDuration: 0.35,
    maxLineDuration: 2.2,
    hardGapSeconds: 0.45,
    softGapSeconds: 0.2,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Triplet flow: syllables land in groups of three and the ear resets every half-bar. Cut aggressively — a line should flash and be gone. Break on the triplet boundary, not on grammar; a line may be a fragment. Ad-libs (yeah, skrrt, gang, huh) belong on their own line, never glued to the bar they interrupt.`,
  }),
  profile({
    id: 'rap-double-time',
    label: 'Rap — double-time / chopper',
    description:
      'Chopper & double-time. The shortest lines available — 2–4 words, maximum divisions.',
    targetChars: 18,
    maxChars: 28,
    targetWords: 3,
    maxWords: 5,
    minWords: 2,
    minLineDuration: 0.3,
    maxLineDuration: 1.6,
    hardGapSeconds: 0.35,
    softGapSeconds: 0.16,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Double-time: words arrive faster than a viewer can read a full sentence. Divide as much as the timings allow — 2 to 4 words per line. Never let a line exceed ~1.5s of audio. Internal rhymes are the natural cut points; break right after the rhyming syllable.`,
  }),
  profile({
    id: 'rap-slang-punchline',
    label: 'Rap — slang / punchline',
    description:
      'Slang-heavy punchline rap. Sets up on one line, lands the punchline on the next.',
    targetChars: 30,
    maxChars: 46,
    targetWords: 6,
    maxWords: 8,
    minWords: 2,
    minLineDuration: 0.5,
    maxLineDuration: 3,
    hardGapSeconds: 0.6,
    softGapSeconds: 0.3,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Punchline rap lives on the reveal. Put the set-up on one line and the punchline on the NEXT line so it lands on its own screen — never bury a punchline mid-line. Keep slang contractions and multi-word slang units together ("on god", "no cap", "for real"); splitting them kills the read.`,
  }),
  profile({
    id: 'rap-storytelling',
    label: 'Rap — storytelling / conscious',
    description:
      'Narrative bars. Longer lines, fewer divisions, cuts on the clause.',
    targetChars: 46,
    maxChars: 70,
    targetWords: 9,
    maxWords: 13,
    minWords: 3,
    minLineDuration: 0.8,
    maxLineDuration: 4.5,
    hardGapSeconds: 0.8,
    softGapSeconds: 0.4,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Narrative rap: meaning carries across a full bar, so keep bars intact. Divide LESS — one bar per line where the timing allows. Cut on the clause boundary or the end-rhyme, never mid-clause. A reader should be able to follow the story from the lines alone.`,
  }),
  profile({
    id: 'melodic-hook',
    label: 'Melodic hook / chorus',
    description:
      'Hooks and chorus chants. Repeated phrases stay whole on one line.',
    targetChars: 26,
    maxChars: 40,
    targetWords: 5,
    maxWords: 7,
    minWords: 2,
    minLineDuration: 0.8,
    maxLineDuration: 4,
    hardGapSeconds: 0.7,
    softGapSeconds: 0.35,
    keepRepeatsWhole: true,
    adaptToTempo: false,
    guidance: `A hook is a unit of memory. Every repetition of the hook phrase must be segmented IDENTICALLY — same words, same break points, every time it comes back. Never split a repeated phrase across two lines. Held vowels stay attached to their word.`,
  }),
  profile({
    id: 'sung-ballad',
    label: 'Sung — ballad / sustained vocals',
    description:
      'Long held notes. Long lines, very few divisions, breaks only on breaths.',
    targetChars: 42,
    maxChars: 64,
    targetWords: 8,
    maxWords: 11,
    minWords: 3,
    minLineDuration: 1.2,
    maxLineDuration: 7,
    hardGapSeconds: 1.2,
    softGapSeconds: 0.6,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Sustained singing: a single word can occupy two seconds. Do NOT split because a line looks long in seconds — split only on an actual breath (a real gap). Divide as little as possible; one sung phrase per line even if it holds for 6 seconds.`,
  }),
  profile({
    id: 'pop-verse',
    label: 'Pop / R&B verse',
    description: 'Balanced sung verse. Medium lines on the melodic phrase.',
    targetChars: 34,
    maxChars: 52,
    targetWords: 7,
    maxWords: 9,
    minWords: 2,
    minLineDuration: 0.8,
    maxLineDuration: 4.5,
    hardGapSeconds: 0.8,
    softGapSeconds: 0.4,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Cut on the melodic phrase — where the melody resolves and the singer takes a breath. Keep the rhyme word at the END of a line; a line ending one word before the rhyme reads as a mistake.`,
  }),
  profile({
    id: 'edm-chant-drop',
    label: 'EDM chant / drop',
    description:
      'Chants and drops. Tiny punchy lines, repeats held together, huge gaps respected.',
    targetChars: 16,
    maxChars: 26,
    targetWords: 3,
    maxWords: 4,
    minWords: 1,
    minLineDuration: 0.5,
    maxLineDuration: 3,
    hardGapSeconds: 0.5,
    softGapSeconds: 0.25,
    keepRepeatsWhole: true,
    adaptToTempo: false,
    guidance: `Chant energy: 1–4 words a line, hitting like a stab. Long instrumental gaps between vocal stabs are real — always end a line before them. Repeated chants ("go", "jump", "one more time") stay identical across repetitions.`,
  }),
  profile({
    id: 'spoken-word-poetry',
    label: 'Spoken word / poetry',
    description: 'One line per breath, following the poetic line break.',
    targetChars: 40,
    maxChars: 58,
    targetWords: 8,
    maxWords: 11,
    minWords: 2,
    minLineDuration: 0.9,
    maxLineDuration: 5.5,
    hardGapSeconds: 0.7,
    softGapSeconds: 0.35,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `The performer's pauses ARE the line breaks — trust the gaps over grammar. An intentional dramatic pause mid-clause is a line break. Anaphora (repeated openers like "I am…", "We were…") must each start a new line.`,
  }),
  profile({
    id: 'narration-voiceover',
    label: 'Narration / documentary VO',
    description: 'Clause-based long lines. Fewest divisions, full grammar.',
    targetChars: 48,
    maxChars: 72,
    targetWords: 10,
    maxWords: 14,
    minWords: 3,
    minLineDuration: 1,
    maxLineDuration: 6,
    hardGapSeconds: 0.9,
    softGapSeconds: 0.5,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Scripted narration: segment on complete grammatical clauses. Divide LESS — long, calm lines. Never break between an article/preposition and its noun, or between a verb and its auxiliary. Prefer breaking before a conjunction, never after it.`,
  }),
  profile({
    id: 'podcast-conversational',
    label: 'Conversational / podcast',
    description:
      'Natural speech with fillers and restarts. Splits on discourse markers.',
    targetChars: 42,
    maxChars: 66,
    targetWords: 9,
    maxWords: 13,
    minWords: 2,
    minLineDuration: 0.8,
    maxLineDuration: 5.5,
    hardGapSeconds: 0.8,
    softGapSeconds: 0.45,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Unscripted speech: break at discourse markers ("so", "but", "you know", "I mean", "like") — start the new line WITH the marker. False starts and self-corrections stay on the line they interrupt rather than becoming their own line. Filler words are never a line on their own.`,
  }),
  profile({
    id: 'broadcast-subtitle',
    label: 'Broadcast subtitle (42-char standard)',
    description:
      'EBU/Netflix style. Hard 42 characters, complete phrases, generous minimum duration.',
    targetChars: 37,
    maxChars: 42,
    targetWords: 7,
    maxWords: 10,
    minWords: 2,
    minLineDuration: 1,
    maxLineDuration: 6,
    hardGapSeconds: 1,
    softGapSeconds: 0.5,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Broadcast rules are strict: 42 characters is a hard ceiling, every line must be a syntactically complete phrase, and no line may be on screen under 1 second. Break before conjunctions and prepositions, never after. Keep names and numbers unbroken.`,
  }),
  profile({
    id: 'shortform-kinetic',
    label: 'Short-form kinetic (Reels / TikTok)',
    description:
      'Word-pop captions. 2–4 words a line, maximum divisions, built for motion.',
    targetChars: 14,
    maxChars: 22,
    targetWords: 3,
    maxWords: 4,
    minWords: 1,
    minLineDuration: 0.3,
    maxLineDuration: 1.8,
    hardGapSeconds: 0.4,
    softGapSeconds: 0.18,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Kinetic captions: 2–4 words that pop and swap. Divide as much as the timings permit. Put the emphasised word — the one the speaker hits hardest, usually the longest-duration word — at the START of its line so the animation lands on it.`,
  }),
  profile({
    id: 'karaoke-line',
    label: 'Karaoke — one musical phrase',
    description:
      'One singable phrase per line so the highlight sweep reads cleanly.',
    targetChars: 32,
    maxChars: 48,
    targetWords: 7,
    maxWords: 9,
    minWords: 2,
    minLineDuration: 0.9,
    maxLineDuration: 5,
    hardGapSeconds: 0.9,
    softGapSeconds: 0.45,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Karaoke: the viewer sings from the line, so a line must be singable in one breath and must not end mid-word-group. Lines should be roughly even in duration across a section — avoid a 4-second line next to a 0.5-second one.`,
  }),
  profile({
    id: 'asmr-slow',
    label: 'Slow / whispered / ASMR',
    description:
      'Very slow delivery. Short text but long on-screen time, huge gaps.',
    targetChars: 24,
    maxChars: 36,
    targetWords: 5,
    maxWords: 7,
    minWords: 1,
    minLineDuration: 1.2,
    maxLineDuration: 8,
    hardGapSeconds: 1.5,
    softGapSeconds: 0.8,
    keepRepeatsWhole: false,
    adaptToTempo: false,
    guidance: `Very slow delivery with long silences. Short lines, but they stay up a long time — that is correct, do not split a line just because its duration is long. Only the long silences are line breaks.`,
  }),
];

export const DEFAULT_STRUCTURE_PROFILE_ID = 'auto';

export const STRUCTURE_PROFILE_IDS = STRUCTURE_PROFILES.map(p => p.id);

export const SPLIT_DENSITY_OPTIONS: {
  id: SplitDensity;
  label: string;
  description: string;
}[] = [
  {
    id: 'auto',
    label: 'Profile default',
    description: 'Use the line length the selected style defines.',
  },
  {
    id: 'much-finer',
    label: 'Many more divisions',
    description: 'Much shorter lines than the style normally uses.',
  },
  {
    id: 'finer',
    label: 'More divisions',
    description: 'Somewhat shorter lines.',
  },
  {
    id: 'coarser',
    label: 'Fewer divisions',
    description: 'Somewhat longer lines.',
  },
  {
    id: 'much-coarser',
    label: 'Far fewer divisions',
    description: 'Much longer lines than the style normally uses.',
  },
];

const DENSITY_SCALE: Record<SplitDensity, number> = {
  auto: 1,
  'much-finer': 0.6,
  finer: 0.8,
  coarser: 1.3,
  'much-coarser': 1.6,
};

export function getStructureProfile(id?: string): StructureProfile {
  return (
    STRUCTURE_PROFILES.find(p => p.id === id) ??
    STRUCTURE_PROFILES.find(p => p.id === DEFAULT_STRUCTURE_PROFILE_ID)!
  );
}

export interface ResolveProfileOptions {
  density?: SplitDensity;
  /** Measured words-per-second of the source audio, for `adaptToTempo` profiles. */
  wordsPerSecond?: number;
  /** Explicit user overrides that win over everything else. */
  maxCharsPerLine?: number;
  maxWordsPerLine?: number;
}

/**
 * Turns a profile id + density + measured tempo into the concrete numbers the
 * segmenter enforces.
 */
export function resolveStructureParams(
  profileId: string | undefined,
  opts: ResolveProfileOptions = {},
): { profile: StructureProfile; params: StructureProfileParams } {
  const base = getStructureProfile(profileId);
  const scale = DENSITY_SCALE[opts.density ?? 'auto'] ?? 1;

  // Tempo adaptation only applies to profiles that asked for it (i.e. `auto`),
  // so an explicit user choice is never silently overridden.
  let tempoScale = 1;
  if (base.adaptToTempo && typeof opts.wordsPerSecond === 'number') {
    const wps = opts.wordsPerSecond;
    if (wps >= 4.2) tempoScale = 0.6;
    else if (wps >= 3.2) tempoScale = 0.75;
    else if (wps >= 2.4) tempoScale = 0.9;
    else if (wps <= 1.2) tempoScale = 1.25;
    else if (wps <= 1.7) tempoScale = 1.1;
  }

  const k = scale * tempoScale;
  const round = (n: number, min: number) => Math.max(min, Math.round(n * k));

  const params: StructureProfileParams = {
    ...base,
    targetChars: round(base.targetChars, 8),
    maxChars: round(base.maxChars, 12),
    targetWords: round(base.targetWords, 2),
    maxWords: round(base.maxWords, 2),
    minWords: base.minWords,
    // Duration bounds follow the same direction but far more gently: audio
    // pacing is a property of the recording, not of the caption style.
    minLineDuration: base.minLineDuration * Math.min(1, k),
    maxLineDuration: base.maxLineDuration * Math.max(1, Math.sqrt(k)),
  };

  if (typeof opts.maxCharsPerLine === 'number' && opts.maxCharsPerLine > 0) {
    params.maxChars = opts.maxCharsPerLine;
    params.targetChars = Math.max(8, Math.round(opts.maxCharsPerLine * 0.75));
  }
  if (typeof opts.maxWordsPerLine === 'number' && opts.maxWordsPerLine > 0) {
    params.maxWords = opts.maxWordsPerLine;
    params.targetWords = Math.max(1, Math.round(opts.maxWordsPerLine * 0.7));
  }

  // Keep the invariants the segmenter relies on.
  params.minWords = Math.min(params.minWords, params.maxWords);
  params.targetWords = Math.min(params.targetWords, params.maxWords);
  params.targetChars = Math.min(params.targetChars, params.maxChars);

  return { profile: base, params };
}
