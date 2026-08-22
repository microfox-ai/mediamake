# Autofix Agents System

A modular, extensible system of specialized AI agents for transcription correction and optimization.

## Architecture

The autofix system follows a **micro-agents** pattern, where each agent specializes in one specific type of fix. This provides:

- ✅ **Modularity** - Each agent focuses on one task
- ✅ **Reusability** - Run specific fixes individually  
- ✅ **Performance** - Use optimal models for each task
- ✅ **Composability** - Chain multiple agents together
- ✅ **Extensibility** - Easy to add new autofix types

## Available Agents

### 1. **Spelling Fixer** ✏️
- **Path**: `/autofix/spelling`
- **Model**: Gemini 2.5 Pro with reference lyrics, Flash without
- **Purpose**: Fix mistranscribed words using the track's **Suno lyrics** as the authority
- **Preserves**: Every timestamp, the word count, and the caption line boundaries
- **Use case**: ElevenLabs misheard slang, coined words, names or ad-libs

The lyrics a Suno track was generated from are the ground truth for *what* was
sung; ElevenLabs is the ground truth for *when*. The fixer reads
`transcription.sunoLyrics` (falling back to `processingData.step1.sunoLyrics`)
and reconciles the two.

The model never re-emits the transcript. It returns indexed single-word edits
(`{index, from, to, reason, confidence}`) which are applied in code by
`lib/wordCorrections.ts`. Every edit must pass:

| Guard | Effect |
| --- | --- |
| `from` must match the word at `index` | Misaligned edits are rejected, not applied blindly |
| replacement may not contain whitespace | Word count — and therefore timing — cannot change |
| replacement must be in the reference vocabulary **or** within edit distance 2 | Stops the model rewriting lyrics that were never sung |
| removals are opt-in (`allowWordRemoval`) and may not empty a line | Hallucination cleanup stays deliberate |

Punctuation and capitalisation of the original token are re-applied
automatically, so `Runnin',` → `Running,`.

**Options**: `useReferenceLyrics` (default `true`), `allowWordRemoval`
(default `false`), `minConfidence` (default `0.6`).

### 2. **Word Boundary Fixer** 🔗
- **Path**: `/autofix/word-boundary`
- **Model**: Gemini 2.5 Flash
- **Purpose**: Fix merged/split words (e.g., "helloworld" or "th e")
- **Preserves**: Overall timing
- **Features**: Automatically adjusts timing when splitting/merging

### 3. **Sentence Structure Fixer** 📝
- **Path**: `/autofix/sentence-structure`
- **Model**: Gemini 2.5 Pro
- **Purpose**: Re-segment captions for a chosen **delivery style**
- **Preserves**: Every word and every timestamp, exactly

A profile is a delivery/segmentation profile, not a music genre — what decides
where a caption should break is how the words arrive in time. `rap-double-time`
wants 3-word flashes; `narration-voiceover` wants 10-word clauses. On identical
input those two produce 107 and 33 lines respectively.

| Profile | Line shape |
| --- | --- |
| `auto` | Infers from words/second and pause distribution |
| `rap-rapid-fire` | Trap/drill triplets — ~4 words, cuts on the triplet |
| `rap-double-time` | Chopper — 2–4 words, max divisions |
| `rap-slang-punchline` | Set-up on one line, punchline on the next |
| `rap-storytelling` | Whole bars, fewer divisions |
| `melodic-hook` | Repeated hooks segmented identically every recurrence |
| `sung-ballad` | Long held lines, breaks only on real breaths |
| `pop-verse` | Melodic phrase per line, rhyme word kept line-final |
| `edm-chant-drop` | 1–4 word stabs, respects instrumental gaps |
| `spoken-word-poetry` | One line per breath; pauses are line breaks |
| `narration-voiceover` | Complete clauses, longest lines |
| `podcast-conversational` | Breaks at discourse markers |
| `broadcast-subtitle` | EBU/Netflix — hard 42 chars, ≥1s per line |
| `shortform-kinetic` | Reels/TikTok word-pop, 2–4 words |
| `karaoke-line` | One singable phrase, even line durations |
| `asmr-slow` | Short text, long on-screen time |

`splitDensity` (`much-finer` → `much-coarser`) scales a profile's line budget
when a track sits between two styles. `maxCharsPerLine` / `maxWordsPerLine`
override it outright.

**How it stays safe**: the model is never asked to reproduce the transcript. It
answers one question — which word indices start a line — and the captions are
rebuilt from the original words in `lib/segmentation.ts`. A garbage response
degrades the segmentation, never the transcript. The profile's numeric limits
are then enforced in code (hard-gap splitting, over-cap splitting, orphan
merging), so the caps hold regardless of what the model returned. If a chunk
fails entirely, that window falls back to timing-only segmentation and the rest
of the model's work is kept.

### 4. **Punctuation Fixer** ⁉️
- **Path**: `/autofix/punctuation`
- **Model**: Gemini 2.5 Flash
- **Purpose**: Add/fix punctuation marks
- **Preserves**: Words, timing, structure
- **Features**: Adds periods, commas, question marks

### 5. **Timing Optimizer** ⏱️
- **Path**: `/autofix/timing`
- **Model**: Gemini 2.5 Flash
- **Purpose**: Optimize word-level timing without changing text
- **Features**:
  - Removes overlaps
  - Adds gaps between sentences
  - Ensures minimum display time

### 6. **Contextual Fixer** 🎯
- **Path**: `/autofix/contextual`
- **Model**: Gemini 2.5 Pro (best understanding)
- **Purpose**: User-guided fixes with reference text
- **Features**:
  - Uses user's written version as authoritative
  - Can add missing words
  - Context-aware corrections

### 7. **Autofix Orchestrator** 🔧
- **Path**: `/autofix`
- **Purpose**: Coordinates multiple agents
- **Features**:
  - Auto-selects agents based on user request
  - Runs multiple agents in a fixed pipeline order
  - Smart agent detection from keywords

## Pipeline order

Fixers always run in this order, whatever order they were requested in:

```
spelling → word-boundary → punctuation → sentence-structure → timing
```

Word-level work comes first. Correcting or deleting a word changes a line's
character and word count, so segmenting before that leaves lines outside their
profile budget. Sentence structure is therefore the last text pass, and timing
runs after it — the timing optimizer reasons about the gaps *between sentences*,
which only exist once the sentences are final.

Running spelling after structure is not destructive (the spelling pass preserves
whatever grouping it is given), just worse: the segmenter made its cuts against
words that then changed underneath it.

## Usage

### From UI

1. Navigate to the **AI Autofix** tab in the transcriber
2. Select an autofix agent from the dropdown
3. Selecting the **Sentence Structure Fixer** (or the orchestrator) reveals a
   *Caption structure* panel: **Delivery style** and **Division amount**
4. Selecting the **Spelling Fixer** (or the orchestrator) reveals a *Word
   corrections* panel showing whether Suno lyrics exist on this transcription,
   with toggles for using them and for removing hallucinated words
5. (Optional) Provide user request or written version
6. Click **AI Autofix** to run

### From API

```typescript
// Correct words against the Suno lyrics
const result = await callAgent('/autofix/spelling', {
  transcriptionId: 'your-transcription-id',
  useReferenceLyrics: true,
  allowWordRemoval: true,   // also drop hallucinated words
  applyToDatabase: true
});

// Re-segment for a specific delivery
const structured = await callAgent('/autofix/sentence-structure', {
  transcriptionId: 'your-transcription-id',
  structureStyle: 'rap-rapid-fire',
  splitDensity: 'finer',    // even more divisions than the style's default
  applyToDatabase: true
});

// Use orchestrator (auto-selects agents)
const result = await callAgent('/autofix', {
  transcriptionId: 'your-transcription-id',
  userRequest: 'Fix spelling and punctuation',
  applyToDatabase: true
});

// Run specific agents
const result = await callAgent('/autofix', {
  transcriptionId: 'your-transcription-id',
  agents: ['spelling', 'word-boundary', 'punctuation'],
  applyToDatabase: true
});
```

### Programmatic Usage

```typescript
import { autofixOrchestrator } from '@/app/ai/agents/autofix';

// Direct agent call
const response = await autofixOrchestrator.execute({
  params: {
    transcriptionId: 'id',
    userRequest: 'Fix all errors',
    applyToDatabase: true
  }
});
```

## How It Works

### 1. Middleware
The `loadTranscription` middleware loads transcription data before any agent runs.

It reads `transcription.captions` — the live state that every autofix run and
every manual edit writes to. `processingData.step1.processedCaptions` is only a
fallback: it is a snapshot taken once at transcription creation and never
updated, so preferring it made each fixer start from the raw ElevenLabs chunking
and save that back, discarding the previous fixer's work.

### 2. Specialized Agents
Each agent:
- Receives transcription in context state
- Formats captions for AI processing
- Runs specific AI prompt
- Parses output back to caption structure
- Detects and tracks changes
- Optionally saves to database

### 3. Orchestrator
The orchestrator:
- Analyzes user request
- Selects appropriate agents
- Runs agents in sequence (each builds on previous)
- Combines results
- Saves final output to database

## Caption Format

The punctuation, word-boundary, timing and contextual fixers still use the
round-trip format, where the model re-emits every word:

```
-hello[1.2-1.5]<$>world[1.6-2.0]<$>this[2.1-2.4]<$>is[2.5-2.8]<$>test[2.9-3.2]
-another[3.5-3.8]<$>sentence[3.9-4.2]
```

Where:
- `-` starts a sentence/caption
- `<$>` separates words
- `[start-end]` contains timing in seconds

**The spelling and sentence-structure fixers no longer use it.** Asking a model
to copy thousands of timestamps verbatim is where transcripts got silently
corrupted — `parseAIOutputToCaptions` drops any word whose regex fails to match.
Those two agents now send a compact indexed view and receive only a decision
(word edits, or line-start indices); the captions are rebuilt from the original
data in `lib/`.

## `lib/` modules

| Module | Responsibility |
| --- | --- |
| `structureProfiles.ts` | The delivery profiles and their numeric line budgets. No server imports — the transcriber UI imports the same list. |
| `segmentation.ts` | Flattening, chunking, prompt formatting, the deterministic enforcement passes, caption rebuilding, line-level diffing. |
| `sentenceStructureCore.ts` | The segmentation agent loop, shared with the transcriber worker. |
| `lyricsReference.ts` | Finding and normalising Suno lyrics; builds the vocabulary used to validate corrections. |
| `wordCorrections.ts` | Timestamp-preserving application of indexed word edits, with every safety guard. |
| `spellingCore.ts` | The spelling agent loop, shared with anything that needs it. |

## Transcriber worker

`ai/workers/transcriber/transcriber.worker.ts` runs the same two engines
in-process on a freshly transcribed track: **spelling, then sentence structure**.

The spelling pass is **skipped when the track has no `sunoLyrics`** — with no
reference to check against, an unattended model is as likely to normalise
deliberate slang as it is to fix a genuine mishearing. Word removal is off by
default there too.

Worker inputs: `structureStyle`, `splitDensity`, `applySpellingFix`
(default `true`), `allowWordRemoval` (default `false`). All optional, all
defaulted, so existing callers are unaffected.

## Adding New Agents

1. Create new agent in `fixers/` directory
2. Follow the pattern of existing agents
3. Add to orchestrator imports
4. Register with `.agent()` method
5. Tag with `'transcription-autofix'` in metadata

Example:

```typescript
// fixers/capitalizationFixer.ts
import { AiRouter } from '@microfox/ai-router';
// ... imports

const capitalizationFixerAgent = aiRouter
  .agent('/', async ctx => {
    // Agent logic
  })
  .actAsTool('/', {
    id: 'capitalizationFixer',
    name: 'Capitalization Fixer',
    description: 'Fix capitalization and proper nouns',
    metadata: {
      tags: ['transcription', 'autofix', 'transcription-autofix', 'capitalization'],
      icon: '🔠',
      hideUI: false,
    },
  });

export default capitalizationFixerAgent;
```

Then add to `index.ts`:

```typescript
import capitalizationFixerAgent from './fixers/capitalizationFixer';

export const autofixOrchestrator = aiRouter
  // ... existing agents
  .agent('/capitalization', capitalizationFixerAgent)
  // ...
```

## Best Practices

1. **Use specific agents** when you know exactly what needs fixing
2. **Use orchestrator** for comprehensive fixes
3. **Provide user request** for better context
4. **Use contextual fixer** when you have a reference text
5. **Test changes** before applying to database (set `applyToDatabase: false`)

## Performance

- **Flash agents**: ~1-2 seconds (spelling, punctuation, word boundary, timing)
- **Pro agents**: ~3-5 seconds (sentence structure, contextual)
- **Orchestrator**: Sum of selected agents

## Future Enhancements

Potential new agents:
- 🔠 Capitalization Fixer
- 🗑️ Filler Word Remover (um, uh, etc.)
- 🔢 Number Formatter (twenty one → 21)
- 🚫 Profanity Filter
- 🎭 Tone Analyzer
- 🌍 Language-specific Fixes

