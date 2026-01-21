@echo off
echo Setting up TTS Reader Chrome Extension...

:: Create images directory if it doesn't exist
if not exist images (
  echo Creating images directory...
  mkdir images
) else (
  echo Images directory already exists.
)

:: Check if icons exist
if not exist images\icon16.png (
  echo Creating placeholder icons...
  
  :: We can't easily create binary files in a batch script
  :: So we'll provide instructions instead
  echo.
  echo Please create the icon files using one of these methods:
  echo.
  echo 1. Open placeholder-icons.html in your browser and download the icons
  echo 2. Open create-icons.html in your browser and download the icons
  echo 3. Run "npm install" and then "npm run generate-icons" if you have Node.js installed
  echo.
  echo After downloading the icons, place them in the images directory.
) else (
  echo Icons already exist in the images directory.
)

echo.
echo Setup complete! You can now load the extension in Chrome:
echo 1. Open Chrome and go to chrome://extensions/
echo 2. Enable Developer mode (toggle in the top-right corner)
echo 3. Click 'Load unpacked' and select this directory
echo.
echo Don't forget to get a Google Cloud API key and configure it in the extension popup.
echo See README.md for detailed instructions.

pause
