// Create context menu item when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read selected text",
    contexts: ["selection"]
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    synthesizeSpeech(info.selectionText);
  }
});

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "textSelected") {
    chrome.storage.local.set({ selectedText: request.text });
    return false;
  } else if (request.action === "synthesizeSpeech") {
    sendResponse({ success: true, status: "Processing speech request" });
    
    synthesizeSpeech(request.text, request.provider, request.language, request.voice, request.model)
      .catch(error => console.error("Error in synthesizeSpeech:", error));
    
    return false;
  }
  return false;
});

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
async function synthesizeSpeech(text, provider = 'google', language = 'en-US', voice = 'NEUTRAL', model = 'tts-1') {
  try {
    const apiKeyKey = provider === 'google' ? 'googleApiKey' : 'openaiApiKey';
    const { [apiKeyKey]: apiKey } = await chrome.storage.local.get(apiKeyKey);
    
    if (!apiKey) {
      console.error(`${provider} API key not found. Please set it in the extension options.`);
      return;
    }

    // Split text into chunks
    const chunks = splitTextIntoChunks(text, provider);
    console.log(`Split text into ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      console.error("No text chunks to synthesize");
      return;
    }
    
    // Synthesize each chunk
    const audioQueue = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
      
      let audioContent;
      
      if (provider === 'google') {
        // Google Cloud TTS API
        const response = await fetch(
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
            })
          }
        );

        if (!response.ok) {
          throw new Error(`Google API request failed with status ${response.status}`);
        }

        const data = await response.json();
        audioContent = data.audioContent;
      } else if (provider === 'openai') {
        // OpenAI TTS API
        const response = await fetch(
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
            })
          }
        );

        if (!response.ok) {
          throw new Error(`OpenAI API request failed with status ${response.status}`);
        }

        // Convert binary response to base64
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioContent = btoa(binary);
      }
      
      if (audioContent) {
        audioQueue.push(audioContent);
      }
    }
    
    // Send the audio queue to the active tab's content script
    if (audioQueue.length > 0) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "playAudioQueue",
            audioQueue: audioQueue
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error("Error sending audio to content script:", chrome.runtime.lastError.message);
              
              // Store in chrome.storage.local for popup to handle
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
          });
        } else {
          // No active tab, store for popup
          chrome.storage.local.set({ 
            audioQueue: audioQueue,
            audioTimestamp: Date.now()
          });
        }
      });
    }
  } catch (error) {
    console.error("Error synthesizing speech:", error);
  }
}

// Set up periodic cleanup of audio data
chrome.runtime.onInstalled.addListener(() => {
  cleanupAudioData();
  setInterval(cleanupAudioData, 5 * 60 * 1000);
});

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
