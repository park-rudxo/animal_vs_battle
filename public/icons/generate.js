// Run this script once to generate placeholder icons
// node public/icons/generate.js
// For production, replace with proper PNG icons

const { createCanvas } = require('canvas'); // npm install canvas
const fs = require('fs');

function generateIcon(size, filename) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#6366f1';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, size * 0.2);
  ctx.fill();

  // Letter
  ctx.fillStyle = 'white';
  ctx.font = `bold ${size * 0.55}px -apple-system, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('L', size / 2, size / 2);

  fs.writeFileSync(filename, canvas.toBuffer('image/png'));
  console.log(`Generated ${filename}`);
}

generateIcon(192, __dirname + '/icon-192.png');
generateIcon(512, __dirname + '/icon-512.png');
generateIcon(72, __dirname + '/badge-72.png');
