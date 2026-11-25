// Shared pieces for the flat (2D) drawings in steps 1 and 5: keeping a canvas sharp at its box's size,
// and drawing the person, the satellite icon, the blue dot and outlined labels.

import { pixelDensity } from '../pageHelpers.js';

// Makes the canvas match its box on screen, at up to 2× pixel density. Returns the drawing context
// set up so that 1 unit = 1 CSS pixel, plus the box's width and height.
export function prepareCanvas(canvas) {
  const density = pixelDensity();
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const pixelWidth = Math.max(1, Math.round(width * density));
  const pixelHeight = Math.max(1, Math.round(height * density));
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext('2d');
  context.setTransform(density, 0, 0, density, 0, 0);
  context.clearRect(0, 0, width, height);
  return { context, width, height };
}

// A simple stick figure standing with its feet at (x, y), holding a small blue phone in a raised hand.
export function drawPerson(context, x, y, size, colours) {
  const headRadius = size * 0.11;
  const hipY = y - size * 0.42;
  const shoulderY = y - size * 0.72;
  context.save();
  context.strokeStyle = colours.text;
  context.lineWidth = Math.max(2, size * 0.05);
  context.lineCap = 'round';
  context.beginPath();
  context.arc(x, y - size * 0.88, headRadius, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(x, shoulderY + headRadius * 0.4);
  context.lineTo(x, hipY);
  context.moveTo(x, hipY);
  context.lineTo(x - size * 0.15, y);
  context.moveTo(x, hipY);
  context.lineTo(x + size * 0.15, y);
  context.moveTo(x, shoulderY + size * 0.06);
  context.lineTo(x - size * 0.17, hipY + size * 0.05);
  context.moveTo(x, shoulderY + size * 0.06);
  context.lineTo(x + size * 0.18, shoulderY - size * 0.06);
  context.stroke();
  context.fillStyle = colours.blue;
  context.fillRect(x + size * 0.16, shoulderY - size * 0.2, size * 0.08, size * 0.14);
  context.restore();
  return { phoneX: x + size * 0.2, phoneY: shoulderY - size * 0.13 };
}

// A satellite: an upright body with a solar panel on each side, about 30 px wide.
export function drawSatelliteIcon(context, x, y, colours, alpha = 1) {
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = colours.violet;
  context.fillRect(x - 4, y - 6, 8, 12);
  context.fillRect(x - 15, y - 3.5, 9, 7);
  context.fillRect(x + 6, y - 3.5, 9, 7);
  context.fillRect(x - 6, y - 0.75, 12, 1.5);
  context.restore();
}

// The map app's blue dot: a pale halo, a white rim and a solid blue centre.
export function drawBlueDot(context, x, y, radius, colours, alpha = 1) {
  context.save();
  context.globalAlpha = alpha * 0.25;
  context.fillStyle = colours.blue;
  context.beginPath();
  context.arc(x, y, radius * 2.5, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = alpha;
  context.fillStyle = '#ffffff';
  context.beginPath();
  context.arc(x, y, radius + 2.5, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = colours.blue;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

// Text with a thick outline in the card colour behind it, so it reads over lines.
export function drawLabel(context, text, x, y, colours, { colour = colours.text, size = 13, align = 'center', weight = 700, font = 'Space Grotesk' } = {}) {
  context.save();
  context.font = `${weight} ${size}px '${font}', system-ui, sans-serif`;
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.lineWidth = 4;
  context.strokeStyle = colours.card;
  context.strokeText(text, x, y);
  context.fillStyle = colour;
  context.fillText(text, x, y);
  context.restore();
}

export function hexWithAlpha(hexColour, alpha) {
  const value = hexColour.replace('#', '');
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
