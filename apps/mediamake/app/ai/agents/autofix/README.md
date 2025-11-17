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
- **Model**: Gemini 2.5 Flash (fast)
- **Purpose**: Fix spelling mistakes only
- **Preserves**: Timing, structure, word boundaries
- **Use case**: Quick spelling corrections without structural changes

### 2. **Word Boundary Fixer** 🔗
- **Path**: `/autofix/word-boundary`
- **Model**: Gemini 2.5 Flash
- **Purpose**: Fix merged/split words (e.g., "helloworld" or "th e")
- **Preserves**: Overall timing
- **Features**: Automatically adjusts timing when splitting/merging

### 3. **Sentence Structure Fixer** 📝
- **Path**: `/autofix/sentence-structure`
- **Model**: Gemini 2.5 Pro (better understanding)
- **Purpose**: Optimize sentence length for subtitle display
- **Features**: 
  - Splits long sentences
  - Merges fragments
  - Keeps sentences under 50-60 characters

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
  - Runs multiple agents in sequence
  - Smart agent detection from keywords

## Usage

### From UI

1. Navigate to the **AI Autofix** tab in the transcriber
2. Select an autofix agent from the dropdown
3. (Optional) Provide user request or written version
4. Click **AI Autofix** to run

### From API

```typescript
// Use a specific agent
const result = await callAgent('/autofix/spelling', {
  transcriptionId: 'your-transcription-id',
  userRequest: 'Fix common typos',
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

Agents use a special format for AI processing:

```
-hello[1.2-1.5]<$>world[1.6-2.0]<$>this[2.1-2.4]<$>is[2.5-2.8]<$>test[2.9-3.2]
-another[3.5-3.8]<$>sentence[3.9-4.2]
```

Where:
- `-` starts a sentence/caption
- `<$>` separates words
- `[start-end]` contains timing in seconds

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

