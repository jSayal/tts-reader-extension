# TTS Reader - Development Progress

## 2026-01-23: Popup UI Improvement with State Management

### Plan Summary

Improve the Chrome extension popup UI with:
- Professional styling using a design system
- Loading animations with progress indication
- Playback controls (pause/resume/stop)
- Cancellable API requests using AbortController
- Comprehensive error handling with retry functionality
- State persistence across popup open/close

### State Machine Architecture

Implemented a 5-state system:
```
IDLE → LOADING → PLAYING ↔ PAUSED
         ↓
       ERROR
```

State synchronized via `chrome.storage.local` so all components (popup, background, content) stay in sync.

### Lessons Learned / Mistakes

1. **Content Script Availability**
   - **Issue**: Errors logged when sending messages to content script on restricted pages (`chrome://`, `chrome-extension://`)
   - **Cause**: Content scripts cannot be injected into Chrome's internal pages
   - **Solution**: Check `tab.url` before sending messages and handle gracefully with user-friendly messages instead of error logs
   - **Code pattern**:
     ```javascript
     if (tabs[0].url && (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://'))) {
       console.log('Cannot send to restricted page');
       return;
     }
     ```

2. **Error Logging vs Expected Behavior**
   - **Issue**: Using `console.error` for expected failures (like content script not loaded on new tabs)
   - **Solution**: Use `console.log` for expected/recoverable situations, reserve `console.error` for actual bugs

3. **State Synchronization**
   - All three scripts (background, content, popup) need to update the shared `ttsState` in storage
   - Popup listens to `chrome.storage.onChanged` to react to state changes from other scripts

### Implementation Details

#### New File: `popup.css`
- CSS custom properties (variables) for design system
- Color palette: Primary (#4285f4), Success (#34a853), Error (#ea4335)
- Spinner animation using CSS `@keyframes`
- Pulse dot animation for playing status
- Button variants: primary, secondary, danger, success
- State container styles with transitions

#### Modified: `popup.html`
- External CSS link (removed inline styles)
- State containers: `#idleState`, `#loadingState`, `#playingState`, `#pausedState`, `#errorState`
- SVG icons for playback buttons
- Progress text element for chunk progress
- Error container with retry/dismiss actions

#### Modified: `background.js`
- `activeControllers` Map - tracks AbortController per request ID
- `generateRequestId()` - creates unique IDs like `req_1706012345678_abc123def`
- `updateTtsState()` - helper to merge state updates into storage
- `classifyError()` - categorizes HTTP errors with user-friendly messages:
  - 401: "Invalid API key"
  - 403: "API key lacks permissions"
  - 429: "Rate limit exceeded" (retryable)
  - 5xx: "Server error" (retryable)
- `storeAudioForPopup()` - fallback when content script unavailable
- AbortController signal passed to all fetch calls
- Stores `lastRequest` for retry functionality

#### Modified: `content.js`
- `currentAudio` / `currentAudioUrl` - references for playback control
- `updatePlaybackState()` - syncs playback status to storage
- New message handlers:
  - `pauseAudio` - pauses current audio
  - `resumeAudio` - resumes paused audio
  - `stopAudio` - stops and clears queue
  - `getPlaybackStatus` - returns current playback state

#### Modified: `popup.js`
- `renderState()` - shows/hides containers based on state
- `loadTtsState()` - initializes UI from stored state
- New handlers: `handleCancel`, `handlePause`, `handleResume`, `handleStop`, `handleRetry`, `handleDismiss`
- `sendToContentScript()` - with restricted URL checking
- `expandApiKeySection()` - auto-expands on auth errors
- Storage change listener for real-time state updates

### Files Changed

| File | Status | Description |
|------|--------|-------------|
| `popup.css` | **NEW** | Design system and component styles |
| `popup.html` | Modified | State containers, control buttons, external CSS |
| `popup.js` | Modified | State machine, playback handlers, error handling |
| `background.js` | Modified | AbortController, state management, error classification |
| `content.js` | Modified | Audio controls, state reporting |

### TODOs / Future Improvements

1. **Fallback Audio Playback**
   - Currently if content script is unavailable, audio is stored but can't play
   - Consider: Play audio in popup itself as fallback (requires keeping popup open)

2. **Keyboard Shortcuts**
   - Add keyboard shortcuts for pause/resume/stop
   - Chrome extension commands API could enable global shortcuts

3. **Progress Bar**
   - Replace text progress with visual progress bar
   - Show chunk progress during loading

4. **Voice Preview**
   - Add a "preview" button to hear voice sample before full synthesis

5. **History**
   - Store recent TTS requests for quick replay

6. **Auto-inject Content Script**
   - Use `chrome.scripting.executeScript` to inject content script on-demand when needed
   - Would fix the "refresh page" requirement for new tabs

### Testing Checklist

- [x] Loading state with progress (1/N) appears during API calls
- [x] Cancel button aborts in-flight requests
- [x] Pause/Resume/Stop work during playback
- [x] Error states show appropriate messages
- [x] Retry button re-attempts with same parameters
- [x] Auth errors expand API key section
- [x] State persists across popup close/reopen
- [x] Graceful handling on chrome:// pages
