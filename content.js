// Audio queue management
let audioQueue = [];
let isPlaying = false;
let currentAudio = null;
let currentAudioUrl = null;

// Update playback state in storage
function updatePlaybackState(status) {
  chrome.storage.local.get(['ttsState'], (result) => {
    const currentState = result.ttsState || { status: 'idle', error: null, progress: null, requestId: null };
    chrome.storage.local.set({
      ttsState: { ...currentState, status }
    });
  });
}

// Listen for messages from the popup or background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    try {
      const selectedText = window.getSelection().toString().trim();
      sendResponse({ selectedText });
    } catch (error) {
      console.error("Error getting selected text:", error);
      sendResponse({ selectedText: "", error: error.message });
    }
    return true;
  } else if (request.action === "playAudioQueue") {
    try {
      // Add new audio chunks to the queue
      audioQueue = audioQueue.concat(request.audioQueue);

      // Start playing if not already playing
      if (!isPlaying) {
        playNextInQueue();
      }

      sendResponse({ success: true, queueLength: audioQueue.length });
    } catch (error) {
      console.error("Error queueing audio:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (request.action === "pauseAudio") {
    try {
      if (currentAudio && !currentAudio.paused) {
        currentAudio.pause();
        updatePlaybackState('paused');
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No audio playing' });
      }
    } catch (error) {
      console.error("Error pausing audio:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (request.action === "resumeAudio") {
    try {
      if (currentAudio && currentAudio.paused) {
        currentAudio.play();
        updatePlaybackState('playing');
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'No paused audio to resume' });
      }
    } catch (error) {
      console.error("Error resuming audio:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (request.action === "stopAudio") {
    try {
      // Stop current audio
      if (currentAudio) {
        currentAudio.pause();
        currentAudio.src = '';
        currentAudio = null;
      }

      // Revoke current URL
      if (currentAudioUrl) {
        URL.revokeObjectURL(currentAudioUrl);
        currentAudioUrl = null;
      }

      // Clear queue
      audioQueue = [];
      isPlaying = false;

      // Update state
      updatePlaybackState('idle');

      sendResponse({ success: true });
    } catch (error) {
      console.error("Error stopping audio:", error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (request.action === "getPlaybackStatus") {
    try {
      let status = 'idle';
      if (currentAudio) {
        status = currentAudio.paused ? 'paused' : 'playing';
      }
      sendResponse({
        success: true,
        status,
        queueLength: audioQueue.length,
        isPlaying
      });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  return false;
});

// Function to play the next audio in the queue
async function playNextInQueue() {
  if (audioQueue.length === 0) {
    isPlaying = false;
    currentAudio = null;
    currentAudioUrl = null;
    updatePlaybackState('idle');
    return;
  }

  isPlaying = true;
  const audioContent = audioQueue.shift();

  try {
    // Convert base64 to blob
    const byteCharacters = atob(audioContent);
    const byteArrays = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }

    const audioBlob = new Blob(byteArrays, { type: "audio/mp3" });

    // Revoke previous URL if exists
    if (currentAudioUrl) {
      URL.revokeObjectURL(currentAudioUrl);
    }

    currentAudioUrl = URL.createObjectURL(audioBlob);

    // Create and play audio element
    currentAudio = new Audio(currentAudioUrl);

    // Update state to playing
    updatePlaybackState('playing');

    // When this audio ends, play the next one
    currentAudio.onended = () => {
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
      currentAudio = null;
      playNextInQueue();
    };

    // Handle errors
    currentAudio.onerror = (e) => {
      console.error("Audio playback error:", e);
      URL.revokeObjectURL(currentAudioUrl);
      currentAudioUrl = null;
      currentAudio = null;
      playNextInQueue();
    };

    // Play the audio
    await currentAudio.play();
  } catch (error) {
    console.error("Error playing audio chunk:", error);
    // Try to continue with next chunk
    currentAudio = null;
    currentAudioUrl = null;
    playNextInQueue();
  }
}

// Add context menu functionality
document.addEventListener('mouseup', () => {
  const selectedText = window.getSelection().toString().trim();
  if (selectedText) {
    chrome.runtime.sendMessage({
      action: "textSelected",
      text: selectedText
    });
  }
});
