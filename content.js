// Audio queue management
let audioQueue = [];
let isPlaying = false;

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
  }
  return false;
});

// Function to play the next audio in the queue
async function playNextInQueue() {
  if (audioQueue.length === 0) {
    isPlaying = false;
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
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Create and play audio element
    const audio = new Audio(audioUrl);
    
    // When this audio ends, play the next one
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      playNextInQueue();
    };
    
    // Handle errors
    audio.onerror = (e) => {
      console.error("Audio playback error:", e);
      URL.revokeObjectURL(audioUrl);
      playNextInQueue();
    };
    
    // Play the audio
    await audio.play();
  } catch (error) {
    console.error("Error playing audio chunk:", error);
    // Try to continue with next chunk
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
