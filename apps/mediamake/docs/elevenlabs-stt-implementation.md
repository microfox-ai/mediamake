# ElevenLabs Speech-to-Text (Scribe v1) Integration

## Overview

This implementation adds ElevenLabs Speech-to-Text (STT) functionality using the Scribe v1 model to the transcriber, allowing users to transcribe audio files with state-of-the-art accuracy across 99 languages.

## What Was Implemented

### 1. **API Route** (`/api/transcribe/elevenlabs-stt/route.ts`)

A new API endpoint that:
- Accepts audio URL, optional language code, and tags
- Uses ElevenLabs Scribe v1 model for transcription
- Supports speaker diarization (up to 5 speakers)
- Detects audio events (laughter, applause, etc.)
- Converts word-level timing to custom TranscriptionWord/TranscriptionSentence format
- Saves transcription to MongoDB with proper metadata

**Key Features:**
- `maxDuration`: 300 seconds (5 minutes) for longer audio files
- Speaker diarization enabled by default
- Audio events detection enabled
- Automatic language detection if not specified
- Compatible with existing caption format

### 2. **Updated UI Components**

#### `new-transcription-ui.tsx`
- Added "elevenlabs" to transcription provider type
- Updated API endpoint selection logic to route to `/api/transcribe/elevenlabs-stt`
- Added ElevenLabs Scribe option to provider dropdown
- Updated progress messages to show "ElevenLabs Scribe"
- Updated autofix comment to include ElevenLabs

#### `new-transcription-modal.tsx`
- Added transcription provider state and selection
- Implemented same provider dropdown UI
- Updated API endpoint routing logic
- Added provider reset in modal close handler

### 3. **Format Conversion**

**ElevenLabs provides:**
- Word-level timing with start/end times
- Speaker ID for each word
- Audio event markers
- Language detection

**Converted to:**
- Word-level timing (matching TranscriptionWord schema)
- Sentence-level timing (grouped words, max 7 words or 50 chars per caption)
- Same format as AssemblyAI and Gemini transcriptions
- Compatible with all existing downstream processing

## Usage

### For Users

1. **Navigate to the Transcriber** in your application
2. **Click "New Transcription"** or open the new transcription modal
3. **Select "Audio to Text" mode**
4. **Enter your audio URL** (must be a publicly accessible HTTPS URL)
5. **Choose "ElevenLabs Scribe"** from the Transcription Provider dropdown
6. **Optional:** Enter a language code (e.g., "en", "es", "fr") or leave empty for auto-detection
7. **Optional:** Add tags to organize your content
8. **Optional:** Enable AI Autofix to automatically correct transcription errors
9. **Click "Start Transcription"**

The system will:
- Transcribe the audio using ElevenLabs Scribe v1
- Detect speakers automatically (up to 5)
- Extract timing information for each word
- Group words into caption-friendly sentences
- Save to database with full metadata
- Display in the transcriber UI

### Provider Comparison

| Feature | AssemblyAI | Google Gemini | ElevenLabs Scribe |
|---------|-----------|---------------|-------------------|
| Languages | 99+ | 100+ | 99 |
| Speaker Diarization | ✅ Yes | ✅ Yes | ✅ Yes (up to 5) |
| Audio Events | ❌ No | ❌ No | ✅ Yes |
| Word-level Timestamps | ✅ Yes | ✅ Yes | ✅ Yes |
| Max File Size | 2.5 GB | 2 GB | 3 GB |
| Max Duration | No limit | 9.5 hours | 10 hours |
| Real-time | ❌ No | ❌ No | ✅ Yes (v2 model) |

## Technical Details

### API Request Format

```typescript
POST /api/transcribe/elevenlabs-stt

{
  "audioUrl": "https://example.com/audio.mp3",
  "language": "en", // optional
  "tags": ["podcast", "interview"] // optional
}
```

### API Response Format

```typescript
{
  "success": true,
  "id": "elevenlabs-1234567890",
  "language_code": "en",
  "captions": [
    {
      "id": "caption-0",
      "text": "Hello world this is a test",
      "start": 0.0,
      "absoluteStart": 0.0,
      "end": 2.5,
      "absoluteEnd": 2.5,
      "duration": 2.5,
      "words": [
        {
          "id": "caption-0-word-0",
          "text": "Hello",
          "start": 0.0,
          "absoluteStart": 0.0,
          "end": 0.5,
          "absoluteEnd": 0.5,
          "duration": 0.5,
          "confidence": 1.0
        },
        // ... more words
      ]
    },
    // ... more captions
  ],
  "transcription": {
    "_id": "...",
    "audioUrl": "https://example.com/audio.mp3",
    "language": "en",
    "status": "completed",
    // ... full transcription object
  }
}
```

### Database Schema

Transcriptions are saved with the following structure:

```typescript
{
  clientId: string | undefined,
  assemblyId: "elevenlabs-{timestamp}",
  audioUrl: string,
  language: string,
  status: "completed",
  tags: string[],
  captions: Caption[],
  processingData: {
    step1: {
      rawText: string,
      processedCaptions: Caption[],
      transcript: ElevenLabsResponse,
      source: "elevenlabs-stt"
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

## Configuration

### Environment Variables

Make sure you have the ElevenLabs API key configured:

```bash
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

### Supported Audio Formats

ElevenLabs Scribe v1 supports:
- MP3
- WAV
- FLAC
- OGG
- M4A
- WebM
- AAC

### Supported Video Formats

- MP4
- MOV
- AVI
- MKV
- WebM
- FLV

## Pricing

ElevenLabs Scribe v1 pricing (as of documentation date):

| Tier | Price/month | Hours included | Price per additional hour |
|------|-------------|----------------|---------------------------|
| Free | $0 | 2h 30m | Unavailable |
| Starter | $5 | 12h 30m | Unavailable |
| Creator | $22 | 62h 51m | $0.48 |
| Pro | $99 | 300h | $0.40 |
| Scale | $330 | 1,100h | $0.33 |
| Business | $1,320 | 6,000h | $0.22 |

**Note:** Free tier requires attribution and does not have commercial licensing.

## Advanced Features

### Speaker Diarization

Automatically enabled. The Scribe v1 model identifies up to 5 different speakers in the audio and assigns a `speaker_id` to each word. This information is preserved in the transcript data.

### Audio Events

The transcription includes non-speech sounds like:
- Laughter
- Applause
- Background noise
- Music
- Other audio events

These are marked with `type: "audio_event"` in the raw transcript data.

### Language Support

Scribe v1 supports 99 languages with varying levels of accuracy:

**Excellent (≤5% WER):** English, Spanish, French, German, Italian, Portuguese, Russian, Japanese, Korean, Chinese, and many more.

**Full language list available in ElevenLabs documentation.**

## Error Handling

The API handles various error cases:

1. **Missing API Key:** Returns 500 with "ElevenLabs API key is required"
2. **Invalid URL:** Returns 400 with validation error
3. **Transcription Failed:** Returns 500 with specific error message
4. **Network Issues:** Caught and returned as error response

## Integration with Existing Features

### AI Autofix

Works seamlessly with ElevenLabs transcriptions. After transcription completes, if autofix is enabled, the system will automatically:
1. Send transcription to AI agent
2. Fix word boundaries and spelling
3. Improve sentence structure
4. Apply user-specified corrections

### Downstream Processing

All existing features work with ElevenLabs transcriptions:
- Caption editing
- Export to SRT/VTT
- Video generation
- Metadata extraction
- Tag management

## Future Enhancements

Potential improvements:
1. Add Scribe v2 Realtime for low-latency streaming transcription
2. Support file upload (currently requires URL)
3. Add webhook support for async processing
4. Implement multichannel transcription
5. Add custom vocabulary support

## Troubleshooting

### Transcription fails with 401 error
- Check that `ELEVENLABS_API_KEY` is set correctly
- Verify API key is valid and has sufficient quota

### Transcription takes too long
- ElevenLabs Scribe v1 processes audio in chunks for files over 8 minutes
- Consider using Scribe v2 Realtime for lower latency

### Audio events not appearing
- Audio events are in the raw transcript data but filtered out from word list
- Check `processingData.step1.transcript` in database for full data

### Language detection not working
- Make sure language parameter is either omitted or set to undefined
- ElevenLabs will auto-detect if no language_code is provided

## Support

For issues or questions:
1. Check ElevenLabs API documentation
2. Review error logs in console
3. Verify API key and quota
4. Test with a small audio file first

## Files Modified/Created

**Created:**
- `apps/mediamake/app/api/transcribe/elevenlabs-stt/route.ts`
- `apps/mediamake/docs/elevenlabs-stt-implementation.md`

**Modified:**
- `apps/mediamake/components/transcriber/new/new-transcription-ui.tsx`
- `apps/mediamake/components/transcriber/new-transcription-modal.tsx`

## Version History

- **v1.0** (Current) - Initial implementation with Scribe v1 model
  - Speaker diarization
  - Audio events detection
  - 99 language support
  - Compatible caption format

