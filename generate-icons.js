// This script generates icon files for the TTS Reader extension
// Run this script with Node.js to create the icon files

const fs = require('fs');
const { createCanvas } = require('canvas');

// Create the images directory if it doesn't exist
if (!fs.existsSync('./images')) {
  fs.mkdirSync('./images');
}

// Function to draw the icon on a canvas
function drawIcon(canvas, size) {
  const ctx = canvas.getContext('2d');
  
  // Background
  ctx.fillStyle = '#4285f4'; // Google blue
  ctx.fillRect(0, 0, size, size);
  
  // Sound wave symbol
  ctx.fillStyle = 'white';
  
  const centerX = size / 2;
  const centerY = size / 2;
  
  // Draw a simple sound wave icon
  ctx.beginPath();
  
  // Middle line
  ctx.moveTo(size * 0.3, centerY);
  ctx.lineTo(size * 0.7, centerY);
  
  // Wave lines
  const lineWidth = Math.max(1, size * 0.06);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = 'white';
  ctx.stroke();
  
  // Small wave
  ctx.beginPath();
  ctx.moveTo(size * 0.4, centerY - size * 0.15);
  ctx.lineTo(size * 0.4, centerY + size * 0.15);
  ctx.stroke();
  
  // Medium wave
  ctx.beginPath();
  ctx.moveTo(size * 0.5, centerY - size * 0.25);
  ctx.lineTo(size * 0.5, centerY + size * 0.25);
  ctx.stroke();
  
  // Large wave
  ctx.beginPath();
  ctx.moveTo(size * 0.6, centerY - size * 0.35);
  ctx.lineTo(size * 0.6, centerY + size * 0.35);
  ctx.stroke();
  
  return canvas;
}

// Generate icons in different sizes
function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  drawIcon(canvas, size);
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(`./images/${filename}`, buffer);
  console.log(`Created ${filename} (${size}x${size})`);
}

// Generate the icons
generateIcon(16, 'icon16.png');
generateIcon(48, 'icon48.png');
generateIcon(128, 'icon128.png');

console.log('Icon generation complete!');
console.log('To use this script, you need to install the "canvas" package:');
console.log('npm install canvas');
