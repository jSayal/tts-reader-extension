document.addEventListener('DOMContentLoaded', () => {
  const textArea = document.getElementById('text');
  const providerSelect = document.getElementById('provider');
  const languageSelect = document.getElementById('language');
  const voiceSelect = document.getElementById('voice');
  const openaiModelRow = document.getElementById('openaiModelRow');
  const openaiModelSelect = document.getElementById('openaiModel');
  const speakButton = document.getElementById('speak');
  const googleApiKeyInput = document.getElementById('googleApiKey');
  const openaiApiKeyInput = document.getElementById('openaiApiKey');
  const saveGoogleApiKeyButton = document.getElementById('saveGoogleApiKey');
  const saveOpenaiApiKeyButton = document.getElementById('saveOpenaiApiKey');
  const googleApiKeySection = document.getElementById('googleApiKeySection');
  const openaiApiKeySection = document.getElementById('openaiApiKeySection');
  const statusElement = document.getElementById('status');

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

  // Load saved settings
  loadSettings();
  
  // Get selected text from the active tab
  getCurrentTabSelectedText();
  
  // Check if there's audio content to play
  checkForAudioContent();

  // Event listeners
  speakButton.addEventListener('click', handleSpeak);
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

  // Function to load saved settings
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

  // Function to handle provider change
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

  // Function to update voice options based on provider and language
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

  // Function to get selected text from the active tab
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

  // Function to handle the speak button click
  function handleSpeak() {
    const text = textArea.value.trim();
    
    if (!text) {
      updateStatus('Please select or enter text to speak', 'error');
      return;
    }
    
    const provider = providerSelect.value;
    const apiKeyKey = provider === 'google' ? 'googleApiKey' : 'openaiApiKey';
    
    chrome.storage.local.get([apiKeyKey, 'provider'], (result) => {
      if (!result[apiKeyKey]) {
        updateStatus(`Please enter your ${provider === 'google' ? 'Google Cloud' : 'OpenAI'} API key`, 'error');
        return;
      }
      
      try {
        updateStatus('Processing speech...', 'success');
        
        // Send message to background script to synthesize speech
        const request = {
          action: "synthesizeSpeech",
          text: text,
          provider: provider,
          language: languageSelect.value,
          voice: voiceSelect.value
        };
        
        if (provider === 'openai') {
          request.model = openaiModelSelect.value;
        }
        
        chrome.runtime.sendMessage(request, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to background script:", chrome.runtime.lastError.message);
            updateStatus('Connection error. Please try again.', 'error');
            return;
          }
          
          if (response && response.success) {
            setTimeout(() => {
              checkForAudioContent();
            }, 1000);
          } else {
            updateStatus('Failed to process speech. Check console for details.', 'error');
          }
        });
      } catch (error) {
        console.error("Error in handleSpeak:", error);
        updateStatus('An error occurred. Please try again.', 'error');
      }
    });
  }

  // Function to save API key
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

  // Function to check for audio content in storage and play it
  function checkForAudioContent() {
    chrome.storage.local.get(['audioQueue', 'audioTimestamp'], (result) => {
      if (result.audioQueue && result.audioQueue.length > 0) {
        try {
          // Send the audio queue to the content script
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "playAudioQueue",
                audioQueue: result.audioQueue
              }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Error sending audio queue to content script:", chrome.runtime.lastError.message);
                  updateStatus('Error playing audio', 'error');
                } else if (response && response.success) {
                  updateStatus('Playing audio...', 'success');
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
  
  // Set up a listener for storage changes to detect new audio content
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.audioQueue && changes.audioQueue.newValue) {
      checkForAudioContent();
    }
  });
  
  // Helper function to update status message
  function updateStatus(message, type = 'info') {
    statusElement.textContent = message;
    statusElement.className = 'status ' + type;
    
    setTimeout(() => {
      statusElement.textContent = '';
      statusElement.className = 'status';
    }, 3000);
  }
});