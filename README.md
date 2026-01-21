# TTS Reader Chrome Extension

A Chrome extension that reads selected text using Google Cloud Text-to-Speech API or OpenAI TTS API.

## Features

- Read selected text on any webpage
- Context menu integration for quick access
- Multiple TTS providers: Google Cloud TTS and OpenAI TTS
- Text chunking for large texts (automatically splits to comply with API limits)
- Sequential audio playback for seamless listening
- Customizable voice settings (language, voice, and model)
- Secure API key storage (stored locally in Chrome)

## Installation

### 1. Set up the extension

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in the top-right corner)
4. Click "Load unpacked" and select the extension directory
5. Before using the extension, you need to set up the icon files. You have several options:

   **Option 1: Run the setup script**
   - For Linux/Mac users: Run `./setup.sh`
   - For Windows users: Double-click `setup.bat`
   - This will create the images directory and help you set up the icons
   
   **Option 2: Use placeholder-icons.html**
   - Open `placeholder-icons.html` in your browser
   - Click each download link to save the icon files
   - Save the downloaded files to the `images` directory
   
   **Option 3: Use create-icons.html**
   - Open `create-icons.html` in your browser
   - Click each download button to save the icon files
   - Move the downloaded icon files to the `images` directory
   
   **Option 4: Use Node.js script (Best quality)**
   - Install dependencies: `npm install`
   - Run the icon generation script: `npm run generate-icons`
   - This will automatically create the icons in the `images` directory

### 2. Choose your TTS Provider

You can use either Google Cloud TTS or OpenAI TTS:

#### Option A: Google Cloud TTS (Recommended for more languages)

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the "Cloud Text-to-Speech API" for your project
4. Create an API key:
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create credentials" > "API key"
   - Copy the generated API key

#### Option B: OpenAI TTS

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Navigate to "API Keys" in your profile settings
4. Create a new API key
5. Copy the generated API key

### 3. Configure the extension

1. Click on the extension icon in your Chrome toolbar
2. Select your provider (Google Cloud or OpenAI)
3. Paste your API key in the corresponding field
4. Click "Save Key"
5. Adjust language, voice, and model settings as needed

## Usage

### Method 1: Context Menu

1. Select text on any webpage
2. Right-click on the selected text
3. Choose "Read selected text" from the context menu

### Method 2: Extension Popup

1. Select text on any webpage
2. Click the extension icon in the Chrome toolbar
3. The selected text will appear in the popup
4. Adjust language and voice settings if needed
5. Click "Speak" to hear the text

## Customization

You can customize the following settings in the extension popup:

- **Provider**: Choose between Google Cloud TTS and OpenAI TTS
- **Language**: Choose from multiple languages (availability depends on provider)
- **Voice**: Select different voices (Google: neutral, male, female; OpenAI: alloy, echo, fable, onyx, nova, shimmer)
- **Model** (OpenAI only): Choose between tts-1 (faster) and tts-1-hd (higher quality)

### Provider-Specific Features

**Google Cloud TTS:**
- Supports more languages and locales
- Offers SSML support for advanced speech customization
- Gender-based voice selection

**OpenAI TTS:**
- Six distinct voice options with different characteristics
- High-quality neural voices
- Faster processing with tts-1 model
- HD quality option with tts-1-hd model

## Troubleshooting

- **No audio playing**: Make sure your API key is correctly entered and saved
- **API key not working**: Verify that the Cloud Text-to-Speech API is enabled for your project
- **Text not appearing in popup**: Try selecting text again or manually paste it into the popup
- **Connection errors in console**: If you see "Could not establish connection" errors in the console:
  - Make sure the extension is properly installed
  - Try reloading the page you're on
  - Restart Chrome
  - If the issue persists, try reinstalling the extension
- **"URL.createObjectURL is not a function" error**: This has been fixed in the latest version. The extension now uses a different approach to handle audio playback that's compatible with Chrome's Manifest V3.
- **"chrome.runtime.getViews is not a function" error**: This has been fixed by removing the dependency on this API and using a more compatible approach for Manifest V3.
- **Extension not working on certain pages**: Some websites with strict Content Security Policies may block the extension. Try using it on a different website.

## Technical Notes

- This extension uses Chrome's Manifest V3, which has some limitations compared to Manifest V2.
- Audio playback is primarily handled by the content script using URL.createObjectURL, which is more efficient and avoids storing large audio data in local storage.
- As a fallback, if the content script cannot be reached, audio data is temporarily stored in chrome.storage.local and played by the popup.
- The extension automatically cleans up any stored audio data after 5 minutes to prevent unnecessary storage usage.
- The extension uses notifications to alert you when audio is ready to play if you used the context menu.

## Privacy

This extension sends selected text to your chosen TTS provider (Google Cloud or OpenAI) for processing. Please review the respective privacy policies:
- **Google Cloud**: [Google Cloud Privacy Policy](https://cloud.google.com/terms/cloud-privacy-notice)
- **OpenAI**: [OpenAI Privacy Policy](https://openai.com/privacy)

API keys are stored locally in your browser and are never transmitted anywhere except to the respective API endpoints for speech synthesis.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
