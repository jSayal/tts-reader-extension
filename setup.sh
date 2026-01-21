#!/bin/bash

# TTS Reader Extension Setup Script

echo "Setting up TTS Reader Chrome Extension..."

# Create images directory if it doesn't exist
if [ ! -d "images" ]; then
  echo "Creating images directory..."
  mkdir -p images
else
  echo "Images directory already exists."
fi

# Check if icons exist
if [ ! -f "images/icon16.png" ] || [ ! -f "images/icon48.png" ] || [ ! -f "images/icon128.png" ]; then
  echo "Creating placeholder icons..."
  
  # Create simple blue placeholder icons using base64 data
  # These are very basic icons, but they'll work for testing
  
  # icon16.png - Blue square with white sound wave
  echo "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAABkSURBVDhPY2AYdEDh/38GBgYGhv///zMwMTGBaQyALgaSQ9bLyMjIwMXFBaZRAFwzugHImlEMQNaMzQBkzZgGIGvGZQCyZmwGwDXjMgBZM4oBcM24DEDWjGIAXDOuMKAeGHgAADhb1XTe+0xLAAAAAElFTkSuQmCC" | base64 -d > images/icon16.png
  
  # icon48.png - Blue square with white sound wave
  echo "iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAABpSURBVGhD7dexDcAwDANB7T+VDZzFMlyYKQwU9wUo6yRZsrRUVY2ZmZmZmZnZPxvH8Zy7vbKzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Pf7QWIWCrYf4USjAAAAABJRU5ErkJggg==" | base64 -d > images/icon48.png
  
  # icon128.png - Blue square with white sound wave
  echo "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABGdBTUEAALGPC/xhBQAAAAlwSFlzAAAOwgAADsIBFShKgAAAABl0RVh0U29mdHdhcmUAcGFpbnQubmV0IDQuMC4yMfEgaZUAAAB1SURBVHhe7dExAQAgDMAwwL/nkwICeHQSe3XPAYB9AJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYgGYBkAJIBSAYg2QOCDwqBrSgPHAAAAABJRU5ErkJggg==" | base64 -d > images/icon128.png
  
  echo "Placeholder icons created successfully."
  echo "Note: These are simple placeholder icons. For better icons, use one of the methods described in the README.md file."
else
  echo "Icons already exist in the images directory."
fi

echo ""
echo "Setup complete! You can now load the extension in Chrome:"
echo "1. Open Chrome and go to chrome://extensions/"
echo "2. Enable Developer mode (toggle in the top-right corner)"
echo "3. Click 'Load unpacked' and select this directory"
echo ""
echo "Don't forget to get a Google Cloud API key and configure it in the extension popup."
echo "See README.md for detailed instructions."
