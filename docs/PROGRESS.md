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

1. **Settings Page** *(Priority: High)*
   - Create dedicated settings/options page for the extension
   - Move API key management to settings page
   - Add advanced configuration options (speech rate, pitch, etc.)
   - Organize UI better - popup for quick actions, settings for configuration

2. **Fallback Audio Playback**
   - Currently if content script is unavailable, audio is stored but can't play
   - Consider: Play audio in popup itself as fallback (requires keeping popup open)

3. **Keyboard Shortcuts**
   - Add keyboard shortcuts for pause/resume/stop
   - Chrome extension commands API could enable global shortcuts

4. **Progress Bar**
   - Replace text progress with visual progress bar
   - Show chunk progress during loading

5. **Voice Preview**
   - Add a "preview" button to hear voice sample before full synthesis

6. **History**
   - Store recent TTS requests for quick replay

7. **Auto-inject Content Script**
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

---

## 2026-01-23: SVG Waveform Visualization

### Plan Summary

Add a visually appealing SVG-based waveform animation to the popup UI that displays during audio playback and paused states.

### Implementation Details

#### Technical Approach

Since audio plays in the content script context (separate from popup), real audio analysis via Web Audio API isn't possible. Instead, implemented a **simulated waveform** using procedural animation:

- Multiple layered sine waves at different frequencies create organic movement
- Random noise adds natural variation
- Envelope function shapes amplitude across the waveform
- **Bars visualization** - vertical bars centered on the midline, mirrored above/below

#### Modified: `popup.html`
- Added SVG containers in playing and paused states
- `#waveformPlaying` - animated waveform during playback
- `#waveformPaused` - static waveform when paused

#### Modified: `popup.css`
- `.waveform-container` - container with gradient background and border
- `.waveform` - SVG element styling (60px height)
- `.waveform-bar` - individual bar styling with primary color fill (80% opacity)
- Paused state uses warning color (yellow/orange) at 60% opacity

#### Modified: `popup.js`
New waveform animation system:
- `generateWaveformData()` - creates wave data using layered sine waves
- `drawWaveform(svgElement, data, animated)` - renders SVG rect elements as bars
- `startWaveformAnimation()` - starts `requestAnimationFrame` loop
- `stopWaveformAnimation()` - cancels animation frame
- `drawStaticWaveform()` - draws frozen waveform for paused state
- `renderState()` - now manages animation lifecycle

**Animation Parameters:**
- 48 bars across 288px width
- 60px height with bars centered vertically
- 2px gap between bars with rounded corners
- Phase increment: 0.08 per frame (~60fps)
- Bars mirror above/below center line

### Lessons Learned

1. **Cross-Context Audio Analysis**
   - **Issue**: Cannot use Web Audio API analyser in popup when audio plays in content script
   - **Solution**: Simulated waveform looks authentic without actual audio data
   - **Alternative considered**: Could send audio data via storage, but too slow for real-time

2. **SVG vs Canvas**
   - SVG chosen for better CSS styling integration (colors via CSS variables)
   - Bars visualization provides clean, modern look similar to audio equalizers
   - Easy to style with CSS (fill color, opacity, rounded corners)

3. **Animation Performance**
   - `requestAnimationFrame` ensures smooth 60fps animation
   - Animation automatically stops when state changes (prevents memory leaks)
   - Phase variable persists to maintain wave continuity

### Files Changed

| File | Status | Description |
|------|--------|-------------|
| `popup.html` | Modified | Added SVG waveform containers |
| `popup.css` | Modified | Waveform bar styling |
| `popup.js` | Modified | Waveform animation system with bars visualization |

### Testing Checklist

- [ ] Waveform animates smoothly during playing state
- [ ] Waveform freezes (static) during paused state
- [ ] Animation stops when returning to idle
- [ ] Colors match state (blue for playing, yellow for paused)
- [ ] No memory leaks from animation frames
