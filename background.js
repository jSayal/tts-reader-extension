// Active AbortControllers for cancellable requests
const activeControllers = new Map();

// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read selected text",
    contexts: ["selection"]
  });

  // Initialize TTS state
  updateTtsState({ status: 'idle', error: null, progress: null, requestId: null });

  // Set up periodic cleanup
  cleanupAudioData();
  setInterval(cleanupAudioData, 5 * 60 * 1000);
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    const requestId = generateRequestId();
    synthesizeSpeech(info.selectionText, 'google', 'en-US', 'NEUTRAL', 'tts-1', requestId);
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "textSelected") {
    chrome.storage.local.set({ selectedText: request.text });
    return false;
  } else if (request.action === "synthesizeSpeech") {
    const requestId = request.requestId || generateRequestId();
    sendResponse({ success: true, status: "Processing speech request", requestId });

    synthesizeSpeech(
      request.text,
      request.provider,
      request.language,
      request.voice,
      request.model,
      requestId
    ).catch(error => console.error("Error in synthesizeSpeech:", error));

    return false;
  } else if (request.action === "abortSynthesis") {
    const controller = activeControllers.get(request.requestId);
    if (controller) {
      controller.abort();
      activeControllers.delete(request.requestId);
    }
    // Reset state to idle
    updateTtsState({ status: 'idle', error: null, progress: null, requestId: null });
    sendResponse({ success: true });
    return false;
  }
  return false;
});

// Generate unique request ID
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Update TTS state in storage
function updateTtsState(stateUpdate) {
  chrome.storage.local.get(['ttsState'], (result) => {
    const currentState = result.ttsState || { status: 'idle', error: null, progress: null, requestId: null };
    const newState = { ...currentState, ...stateUpdate };
    chrome.storage.local.set({ ttsState: newState });
  });
}

// Classify errors for user-friendly messages
function classifyError(error, response) {
  if (error.name === 'AbortError') {
    return { message: 'Request cancelled.', code: 'ABORTED', retryable: false };
  }

  if (error.message && error.message.includes('fetch')) {
    return { message: 'Network error. Check your connection.', code: 'NETWORK', retryable: true };
  }

  if (response) {
    const status = response.status;

    if (status === 401) {
      return { message: 'Invalid API key. Please check your credentials.', code: 'AUTH', retryable: false };
    }
    if (status === 403) {
      return { message: 'API key lacks required permissions.', code: 'FORBIDDEN', retryable: false };
    }
    if (status === 429) {
      return { message: 'Rate limit exceeded. Please wait and try again.', code: 'RATE_LIMIT', retryable: true };
    }
    if (status >= 500) {
      return { message: 'Server error. Please try again later.', code: 'SERVER', retryable: true };
    }
    if (status === 400) {
      return { message: 'Invalid request. Please check your settings.', code: 'BAD_REQUEST', retryable: false };
    }
  }

  return { message: error.message || 'An unexpected error occurred.', code: 'UNKNOWN', retryable: true };
}

// Function to split text into chunks
function splitTextIntoChunks(text, provider) {
  const chunks = [];

  if (provider === 'google') {
    // Google Cloud TTS has a 5000 byte limit
    const maxBytes = 4500; // Leave some buffer
    let currentChunk = '';

    // Split by sentences first
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];

    for (const sentence of sentences) {
      const sentenceBytes = new TextEncoder().encode(sentence).length;

      if (sentenceBytes > maxBytes) {
        // If a single sentence is too long, split by words
        const words = sentence.split(' ');
        let tempChunk = '';

        for (const word of words) {
          const testChunk = tempChunk ? `${tempChunk} ${word}` : word;
          const testBytes = new TextEncoder().encode(testChunk).length;

          if (testBytes > maxBytes) {
            if (tempChunk) chunks.push(tempChunk);
            tempChunk = word;
          } else {
            tempChunk = testChunk;
          }
        }

        if (tempChunk) chunks.push(tempChunk);
      } else if (new TextEncoder().encode(currentChunk + sentence).length > maxBytes) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  } else if (provider === 'openai') {
    // OpenAI TTS has a 4096 character limit
    const maxChars = 3500; // Leave some buffer
    let currentChunk = '';

    // Split by paragraphs first
    const paragraphs = text.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      if (paragraph.length > maxChars) {
        // If a paragraph is too long, split by sentences
        const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
        let tempChunk = '';

        for (const sentence of sentences) {
          const testChunk = tempChunk ? `${tempChunk} ${sentence}` : sentence;

          if (testChunk.length > maxChars) {
            if (tempChunk) chunks.push(tempChunk.trim());
            tempChunk = sentence;
          } else {
            tempChunk = testChunk;
          }
        }

        if (tempChunk.trim()) chunks.push(tempChunk.trim());
      } else if (currentChunk.length + paragraph.length > maxChars) {
        chunks.push(currentChunk.trim());
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }

  return chunks;
}

// Function to call TTS API
async function synthesizeSpeech(text, provider = 'google', language = 'en-US', voice = 'NEUTRAL', model = 'tts-1', requestId = null) {
  // Create AbortController for this request
  const controller = new AbortController();
  if (requestId) {
    activeControllers.set(requestId, controller);
  }

  try {
    const apiKeyKey = provider === 'google' ? 'googleApiKey' : 'openaiApiKey';
    const { [apiKeyKey]: apiKey } = await chrome.storage.local.get(apiKeyKey);

    if (!apiKey) {
      const error = { message: `${provider === 'google' ? 'Google Cloud' : 'OpenAI'} API key not found. Please set it in the extension options.`, code: 'NO_API_KEY', retryable: false };
      updateTtsState({ status: 'error', error, progress: null, requestId });
      console.error(error.message);
      return;
    }

    // Store last request for retry functionality
    chrome.storage.local.set({
      lastRequest: { text, provider, language, voice, model }
    });

    // Split text into chunks
    const chunks = splitTextIntoChunks(text, provider);
    console.log(`Split text into ${chunks.length} chunks`);

    if (chunks.length === 0) {
      const error = { message: 'No text to synthesize.', code: 'NO_TEXT', retryable: false };
      updateTtsState({ status: 'error', error, progress: null, requestId });
      console.error("No text chunks to synthesize");
      return;
    }

    // Update state to loading
    updateTtsState({ status: 'loading', error: null, progress: { current: 0, total: chunks.length }, requestId });

    // Synthesize each chunk
    const audioQueue = [];

    for (let i = 0; i < chunks.length; i++) {
      // Check if aborted
      if (controller.signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);

      // Update progress
      updateTtsState({ status: 'loading', progress: { current: i + 1, total: chunks.length }, requestId });

      let audioContent;
      let response;

      try {
        if (provider === 'google') {
          // Google Cloud TTS API
          response = await fetch(
            `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                input: {
                  text: chunk
                },
                voice: {
                  languageCode: language,
                  ssmlGender: voice
                },
                audioConfig: {
                  audioEncoding: "MP3"
                }
              }),
              signal: controller.signal
            }
          );

          if (!response.ok) {
            throw new Error(`Google API request failed with status ${response.status}`);
          }

          const data = await response.json();
          audioContent = data.audioContent;
        } else if (provider === 'openai') {
          // OpenAI TTS API
          response = await fetch(
            'https://api.openai.com/v1/audio/speech',
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                model: model,
                input: chunk,
                voice: voice,
                response_format: 'mp3'
              }),
              signal: controller.signal
            }
          );

          if (!response.ok) {
            throw new Error(`OpenAI API request failed with status ${response.status}`);
          }

          // Convert binary response to base64
          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          for (let j = 0; j < bytes.byteLength; j++) {
            binary += String.fromCharCode(bytes[j]);
          }
          audioContent = btoa(binary);
        }
      } catch (fetchError) {
        const classifiedError = classifyError(fetchError, response);
        if (fetchError.name === 'AbortError') {
          updateTtsState({ status: 'idle', error: null, progress: null, requestId: null });
        } else {
          updateTtsState({ status: 'error', error: classifiedError, progress: null, requestId });
        }
        throw fetchError;
      }

      if (audioContent) {
        audioQueue.push(audioContent);
      }
    }

    // Send the audio queue to the active tab's content script
    if (audioQueue.length > 0) {
      // Update state to playing
      updateTtsState({ status: 'playing', error: null, progress: null, requestId });

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        const canSendMessage = tab && tab.id && tab.url &&
          !tab.url.startsWith('chrome://') &&
          !tab.url.startsWith('chrome-extension://');

        if (canSendMessage) {
          chrome.tabs.sendMessage(tab.id, {
            action: "playAudioQueue",
            audioQueue: audioQueue
          }, (response) => {
            if (chrome.runtime.lastError) {
              // Content script not available - store for later
              console.log("Content script not available, storing audio for popup");
              storeAudioForPopup(audioQueue);
            }
          });
        } else {
          // No suitable tab, store for popup
          console.log("No suitable tab for audio playback, storing for popup");
          storeAudioForPopup(audioQueue);
        }
      });
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error("Error synthesizing speech:", error);
    }
  } finally {
    // Clean up controller
    if (requestId) {
      activeControllers.delete(requestId);
    }
  }
}

// Store audio queue for popup to handle
function storeAudioForPopup(audioQueue) {
  chrome.storage.local.set({
    audioQueue: audioQueue,
    audioTimestamp: Date.now()
  });

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'images/icon48.png',
    title: 'TTS Reader',
    message: `Audio ready! ${audioQueue.length} chunk(s) to play. Click the extension icon.`,
    priority: 2
  });
}

// Function to clean up audio data from storage
function cleanupAudioData() {
  chrome.storage.local.get(['audioQueue', 'audioTimestamp'], (result) => {
    if (result.audioQueue && result.audioTimestamp) {
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      if (now - result.audioTimestamp > fiveMinutes) {
        chrome.storage.local.remove(['audioQueue', 'audioTimestamp'], () => {
          console.log('Cleaned up old audio data from storage');
        });
      }
    }
  });
}
