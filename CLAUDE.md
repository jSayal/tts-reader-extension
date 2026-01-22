# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TTS Reader is a Chrome Extension (Manifest V3) that reads selected text using Google Cloud TTS or OpenAI TTS APIs. Written in vanilla JavaScript with no build step required.

## Commands

```bash
npm install                  # Install dependencies
npm run generate-icons       # Generate extension icons (requires canvas package)
```

To test changes: Load the extension unpacked in Chrome via `chrome://extensions/` with Developer mode enabled.

## Architecture

Three main scripts communicate via Chrome's message passing API:

- **background.js** (Service Worker) - Central hub: handles context menu, API calls, text chunking, and routes messages between components
- **content.js** (Content Script) - Runs in webpage context: captures text selection, manages audio playback queue
- **popup.js** + **popup.html** - User interface: provider selection, API key configuration, voice/language settings

### Message Flow

```
User selects text → content.js captures → background.js calls API →
background.js sends audio chunks → content.js plays sequentially
```

### Provider Strategy

Two TTS providers with different chunking strategies:
- **Google Cloud TTS**: 5000 byte limit, MP3 encoding, gender-based voices
- **OpenAI TTS**: 4096 character limit, tts-1/tts-1-hd models, named voices (alloy, echo, etc.)

Text is split intelligently at sentence/paragraph boundaries, falling back to word/character splitting for oversized content.

### Storage

Chrome `storage.local` persists: `provider`, `googleApiKey`, `openaiApiKey`, `language`, `voice`, `openaiModel`. Temporary audio data has 5-minute TTL auto-cleanup.

## Key Implementation Details

- Audio is transported as base64, converted to Blob for playback via `URL.createObjectURL`
- Queue-based sequential playback handles multi-chunk responses
- Fallback mechanism: if content script is unreachable, audio plays via popup
- Context menu item provides quick access without opening popup
