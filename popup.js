document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Settings
  const textArea = document.getElementById('text');
  const providerSelect = document.getElementById('provider');
  const languageSelect = document.getElementById('language');
  const voiceSelect = document.getElementById('voice');
  const openaiModelRow = document.getElementById('openaiModelRow');
  const openaiModelSelect = document.getElementById('openaiModel');
  const googleApiKeyInput = document.getElementById('googleApiKey');
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const saveGoogleApiKeyButton = document.getElementById('saveGoogleApiKey');
  const saveOpenaiApiKeyButton = document.getElementById('saveOpenaiApiKey');
  const googleApiKeySection = document.getElementById('googleApiKeySection');
  const openaiApiKeySection = document.getElementById('openaiApiKeySection');
  const statusElement = document.getElementById('status');

  // DOM Elements - State containers
  const idleState = document.getElementById('idleState');
  const loadingState = document.getElementById('loadingState');
  const playingState = document.getElementById('playingState');
  const pausedState = document.getElementById('pausedState');
  const errorState = document.getElementById('errorState');

  // DOM Elements - Buttons
  const speakBtn = document.getElementById('speakBtn');
  const cancelBtn = document.getElementById('cancelBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const stopBtn2 = document.getElementById('stopBtn2');
  const retryBtn = document.getElementById('retryBtn');
  const dismissBtn = document.getElementById('dismissBtn');

  // DOM Elements - Dynamic content
  const progressText = document.getElementById('progressText');
  const errorMessage = document.getElementById('errorMessage');

  // DOM Elements - Waveform
  const waveformPlaying = document.getElementById('waveformPlaying');
  const waveformPaused = document.getElementById('waveformPaused');

  // Current request ID for cancellation
  let currentRequestId = null;

  // Waveform animation state
  let waveformAnimationId = null;
  let waveformPhase = 0;
  const WAVEFORM_BARS = 48;
  const WAVEFORM_WIDTH = 288;
  const WAVEFORM_HEIGHT = 60;

  // Voice options for each provider
  const voiceOptions = {
    google: {
      'en-US': ['NEUTRAL', 'MALE', 'FEMALE'],
      'en-GB': ['NEUTRAL', 'MALE', 'FEMALE'],
      'es-ES': ['NEUTRAL', 'MALE', 'FEMALE'],
      'fr-FR': ['NEUTRAL', 'MALE', 'FEMALE'],
      'de-DE': ['NEUTRAL', 'MALE', 'FEMALE'],
      'ja-JP': ['NEUTRAL', 'MALE', 'FEMALE'],
      'ko-KR': ['NEUTRAL', 'MALE', 'FEMALE'],
      'zh-CN': ['NEUTRAL', 'MALE', 'FEMALE']
    },
    openai: {
      'en-US': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'en-GB': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'es-ES': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'fr-FR': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'de-DE': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ja-JP': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'ko-KR': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
      'zh-CN': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
    }
  };

  // Waveform Animation Functions
  function generateWaveformData() {
    const data = [];
    for (let i = 0; i < WAVEFORM_BARS; i++) {
      // Create organic-looking wave using multiple sine waves
      const x = i / WAVEFORM_BARS;
      const wave1 = Math.sin(x * Math.PI * 4 + waveformPhase) * 0.4;
      const wave2 = Math.sin(x * Math.PI * 7 + waveformPhase * 1.3) * 0.25;
      const wave3 = Math.sin(x * Math.PI * 11 + waveformPhase * 0.7) * 0.15;
      const noise = (Math.random() - 0.5) * 0.2;

      // Combine waves with envelope
      const envelope = Math.sin(x * Math.PI) * 0.8 + 0.2;
      const value = (wave1 + wave2 + wave3 + noise) * envelope;

      // Clamp to -1 to 1
      data.push(Math.max(-0.95, Math.min(0.95, value)));
    }
    return data;
  }

  function drawWaveform(svgElement, data, animated = true) {
    if (!svgElement) return;

    // Clear SVG
    svgElement.innerHTML = '';

    const centerY = WAVEFORM_HEIGHT / 2;
    const barWidth = WAVEFORM_WIDTH / data.length;
    const barGap = 2;

    // Draw bars
    for (let i = 0; i < data.length; i++) {
      const amplitude = animated ? Math.abs(data[i]) : 0.15;
      const barHeight = Math.max(2, amplitude * centerY * 0.9);

      const x = i * barWidth;
      const y = centerY - barHeight;

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('class', 'waveform-bar');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', Math.max(1, barWidth - barGap));
      rect.setAttribute('height', barHeight * 2);
      rect.setAttribute('rx', '1');
      rect.setAttribute('ry', '1');

      svgElement.appendChild(rect);
    }
  }

  function startWaveformAnimation() {
    if (waveformAnimationId) return;

    function animate() {
      waveformPhase += 0.08;
      const data = generateWaveformData();
      drawWaveform(waveformPlaying, data, true);
      waveformAnimationId = requestAnimationFrame(animate);
    }
    animate();
  }

  function stopWaveformAnimation() {
    if (waveformAnimationId) {
      cancelAnimationFrame(waveformAnimationId);
      waveformAnimationId = null;
    }
  }

  function drawStaticWaveform(svgElement) {
    // Draw a static "paused" waveform
    const data = [];
    for (let i = 0; i < WAVEFORM_BARS; i++) {
      const x = i / WAVEFORM_BARS;
      const wave = Math.sin(x * Math.PI * 4 + waveformPhase) * 0.3;
      data.push(wave);
    }
    drawWaveform(svgElement, data, true);
  }

  // Initialize
  loadSettings();
  getCurrentTabSelectedText();
  loadTtsState();

  // Event listeners - Settings
  saveGoogleApiKeyButton.addEventListener('click', () => saveApiKey('google', googleApiKeyInput));
  saveOpenaiApiKeyButton.addEventListener('click', () => saveApiKey('openai', openaiApiKeyInput));
  providerSelect.addEventListener('change', handleProviderChange);
  languageSelect.addEventListener('change', () => {
    updateVoiceOptions();
    chrome.storage.local.set({ language: languageSelect.value });
  });
  voiceSelect.addEventListener('change', () => {
    chrome.storage.local.set({ voice: voiceSelect.value });
  });
  openaiModelSelect.addEventListener('change', () => {
    chrome.storage.local.set({ openaiModel: openaiModelSelect.value });
  });

  // Event listeners - Playback controls
  speakBtn.addEventListener('click', handleSpeak);
  cancelBtn.addEventListener('click', handleCancel);
  pauseBtn.addEventListener('click', handlePause);
  stopBtn.addEventListener('click', handleStop);
  resumeBtn.addEventListener('click', handleResume);
  stopBtn2.addEventListener('click', handleStop);
  retryBtn.addEventListener('click', handleRetry);
  dismissBtn.addEventListener('click', handleDismiss);

  // Listen for state changes from storage
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local') {
      if (changes.ttsState) {
        renderState(changes.ttsState.newValue);
      }
      if (changes.audioQueue && changes.audioQueue.newValue) {
        checkForAudioContent();
      }
    }
  });

  // Load TTS state from storage
  function loadTtsState() {
    chrome.storage.local.get(['ttsState'], (result) => {
      const state = result.ttsState || { status: 'idle', error: null, progress: null, requestId: null };
      currentRequestId = state.requestId;
      renderState(state);
    });
  }

  // Render UI based on current state
  function renderState(state) {
    // Hide all state containers
    idleState.classList.add('hidden');
    loadingState.classList.add('hidden');
    playingState.classList.add('hidden');
    pausedState.classList.add('hidden');
    errorState.classList.add('hidden');

    // Stop waveform animation by default
    stopWaveformAnimation();

    // Show appropriate container based on status
    switch (state.status) {
      case 'idle':
        idleState.classList.remove('hidden');
        break;

      case 'loading':
        loadingState.classList.remove('hidden');
        if (state.progress) {
          progressText.textContent = `Processing... ${state.progress.current}/${state.progress.total}`;
        } else {
          progressText.textContent = 'Processing...';
        }
        currentRequestId = state.requestId;
        break;

      case 'playing':
        playingState.classList.remove('hidden');
        startWaveformAnimation();
        break;

      case 'paused':
        pausedState.classList.remove('hidden');
        drawStaticWaveform(waveformPaused);
        break;

      case 'error':
        errorState.classList.remove('hidden');
        if (state.error) {
          errorMessage.textContent = state.error.message;
          // Show retry button only for retryable errors
          if (state.error.retryable) {
            retryBtn.classList.remove('hidden');
          } else {
            retryBtn.classList.add('hidden');
          }
          // Expand API key section for auth errors
          if (state.error.code === 'AUTH' || state.error.code === 'NO_API_KEY') {
            expandApiKeySection();
          }
        }
        break;

      default:
        idleState.classList.remove('hidden');
    }
  }

  // Expand the API key section based on current provider
  function expandApiKeySection() {
    const provider = providerSelect.value;
    if (provider === 'google') {
      googleApiKeySection.classList.remove('hidden');
      googleApiKeyInput.focus();
    } else {
      openaiApiKeySection.classList.remove('hidden');
      openaiApiKeyInput.focus();
    }
  }

  // Handle speak button click
  function handleSpeak() {
    const text = textArea.value.trim();

    if (!text) {
      updateStatus('Please select or enter text to speak', 'error');
      return;
    }

    const provider = providerSelect.value;
    const apiKeyKey = provider === 'google' ? 'googleApiKey' : 'openaiApiKey';

    chrome.storage.local.get([apiKeyKey], (result) => {
      if (!result[apiKeyKey]) {
        updateStatus(`Please enter your ${provider === 'google' ? 'Google Cloud' : 'OpenAI'} API key`, 'error');
        expandApiKeySection();
        return;
      }

      // Generate request ID
      currentRequestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Send message to background script
      const request = {
        action: "synthesizeSpeech",
        text: text,
        provider: provider,
        language: languageSelect.value,
        voice: voiceSelect.value,
        requestId: currentRequestId
      };

      if (provider === 'openai') {
        request.model = openaiModelSelect.value;
      }

      chrome.runtime.sendMessage(request, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error sending message:", chrome.runtime.lastError.message);
          updateStatus('Connection error. Please try again.', 'error');
        }
      });
    });
  }

  // Handle cancel button click
  function handleCancel() {
    if (currentRequestId) {
      chrome.runtime.sendMessage({
        action: 'abortSynthesis',
        requestId: currentRequestId
      }, (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error cancelling:", chrome.runtime.lastError.message);
        }
      });
    }
    // Reset state immediately
    chrome.storage.local.set({
      ttsState: { status: 'idle', error: null, progress: null, requestId: null }
    });
  }

  // Handle pause button click
  function handlePause() {
    sendToContentScript('pauseAudio');
  }

  // Handle resume button click
  function handleResume() {
    sendToContentScript('resumeAudio');
  }

  // Handle stop button click
  function handleStop() {
    sendToContentScript('stopAudio');
    // Also reset state
    chrome.storage.local.set({
      ttsState: { status: 'idle', error: null, progress: null, requestId: null }
    });
  }

  // Handle retry button click
  function handleRetry() {
    chrome.storage.local.get(['lastRequest'], (result) => {
      if (result.lastRequest) {
        const { text, provider, language, voice, model } = result.lastRequest;
        textArea.value = text;
        providerSelect.value = provider;
        languageSelect.value = language;
        handleProviderChange();
        voiceSelect.value = voice;
        if (model) {
          openaiModelSelect.value = model;
        }
        // Trigger speak
        handleSpeak();
      } else {
        // No last request, just dismiss error
        handleDismiss();
      }
    });
  }

  // Handle dismiss button click
  function handleDismiss() {
    chrome.storage.local.set({
      ttsState: { status: 'idle', error: null, progress: null, requestId: null }
    });
  }

  // Send message to content script
  function sendToContentScript(action) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        // Skip chrome:// and other restricted URLs
        if (tabs[0].url && (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://'))) {
          console.log(`Cannot send ${action} to restricted page`);
          return;
        }
        chrome.tabs.sendMessage(tabs[0].id, { action }, (response) => {
          if (chrome.runtime.lastError) {
            // Content script not available - this is expected on some pages
            console.log(`Content script not available for ${action}`);
          }
        });
      }
    });
  }

  // Load saved settings
  function loadSettings() {
    chrome.storage.local.get(['provider', 'language', 'voice', 'openaiModel', 'googleApiKey', 'openaiApiKey', 'selectedText'], (result) => {
      if (result.provider) {
        providerSelect.value = result.provider;
        handleProviderChange();
      }

      if (result.language) {
        languageSelect.value = result.language;
      }

      if (result.openaiModel) {
        openaiModelSelect.value = result.openaiModel;
      }

      updateVoiceOptions();

      if (result.voice) {
        voiceSelect.value = result.voice;
      }

      if (result.googleApiKey) {
        googleApiKeyInput.value = result.googleApiKey;
      }

      if (result.openaiApiKey) {
        openaiApiKeyInput.value = result.openaiApiKey;
      }

      if (result.selectedText) {
        textArea.value = result.selectedText;
      }
    });
  }

  // Handle provider change
  function handleProviderChange() {
    const provider = providerSelect.value;

    // Show/hide API key sections
    if (provider === 'google') {
      googleApiKeySection.classList.remove('hidden');
      openaiApiKeySection.classList.add('hidden');
      openaiModelRow.classList.add('hidden');
    } else {
      googleApiKeySection.classList.add('hidden');
      openaiApiKeySection.classList.remove('hidden');
      openaiModelRow.classList.remove('hidden');
    }

    // Update voice options
    updateVoiceOptions();

    // Save provider preference
    chrome.storage.local.set({ provider });
  }

  // Update voice options based on provider and language
  function updateVoiceOptions() {
    const provider = providerSelect.value;
    const language = languageSelect.value;
    const voices = voiceOptions[provider][language] || voiceOptions[provider]['en-US'];

    // Clear existing options
    voiceSelect.innerHTML = '';

    // Add new options
    voices.forEach(voice => {
      const option = document.createElement('option');
      option.value = voice;
      option.textContent = voice.charAt(0).toUpperCase() + voice.slice(1);
      voiceSelect.appendChild(option);
    });

    // Load saved voice if it exists
    chrome.storage.local.get(['voice'], (result) => {
      if (result.voice && voices.includes(result.voice)) {
        voiceSelect.value = result.voice;
      }
    });
  }

  // Get selected text from the active tab
  function getCurrentTabSelectedText() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        try {
          chrome.tabs.sendMessage(tabs[0].id, { action: "getSelectedText" }, (response) => {
            if (chrome.runtime.lastError) {
              console.log("Could not connect to content script:", chrome.runtime.lastError.message);
              return;
            }

            if (response && response.selectedText && response.selectedText.length > 0) {
              textArea.value = response.selectedText;
            }
          });
        } catch (error) {
          console.error("Error sending message to content script:", error);
        }
      }
    });
  }

  // Save API key
  function saveApiKey(provider, inputElement) {
    const apiKey = inputElement.value.trim();

    if (!apiKey) {
      updateStatus('Please enter a valid API key', 'error');
      return;
    }

    const keyName = provider === 'google' ? 'googleApiKey' : 'openaiApiKey';

    chrome.storage.local.set({ [keyName]: apiKey }, () => {
      updateStatus(`${provider === 'google' ? 'Google Cloud' : 'OpenAI'} API key saved successfully`, 'success');
    });
  }

  // Check for audio content in storage and play it
  function checkForAudioContent() {
    chrome.storage.local.get(['audioQueue', 'audioTimestamp'], (result) => {
      if (result.audioQueue && result.audioQueue.length > 0) {
        try {
          // Send the audio queue to the content script
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
              // Skip chrome:// and other restricted URLs
              if (tabs[0].url && (tabs[0].url.startsWith('chrome://') || tabs[0].url.startsWith('chrome-extension://'))) {
                updateStatus('Cannot play audio on this page. Navigate to a website first.', 'error');
                return;
              }
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "playAudioQueue",
                audioQueue: result.audioQueue
              }, (response) => {
                if (chrome.runtime.lastError) {
                  // Content script not available
                  console.log("Content script not available for audio playback");
                  updateStatus('Refresh the page to enable audio playback', 'error');
                } else if (response && response.success) {
                  // Clear the queue from storage
                  chrome.storage.local.remove(['audioQueue', 'audioTimestamp']);
                }
              });
            }
          });
        } catch (error) {
          console.error('Error playing audio queue:', error);
          updateStatus('Error playing audio', 'error');
        }
      }
    });
  }

  // Update status message
  function updateStatus(message, type = 'info') {
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;

    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status';
    }, 3000);
  }
});
