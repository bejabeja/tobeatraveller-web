// Small drawing helpers shared by the story-sized share images.

// Drawn by hand instead of context.roundRect, which Safari only has since 16.
export const roundedRect = (context, x, y, width, height, radius) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
};

// Canvas has no letter-spacing on every browser yet, so it is spread by hand.
export const spacedText = (text) => text.split("").join(" ");

export const canvasToPngBlob = (canvas, errorMessage) => new Promise((resolve, reject) => {
  canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error(errorMessage))), "image/png");
});

// Proportions of the ink seal, relative to its radius (a 300px seal has a
// 14px ring and a dashed inner ring 34px in).
const SEAL_RING_WIDTH = 14 / 300;
const SEAL_INNER_RING_INSET = 34 / 300;
const SEAL_INNER_RING_WIDTH = 6 / 300;
const SEAL_DASH = 22 / 300;
const SEAL_DASH_GAP = 16 / 300;
const SEAL_PAPER = "#fbf6ec";
const SEAL_GOLD = "#d9a441";
const SEAL_INNER_RING_COLOR = "rgba(217, 164, 65, 0.7)";

// An ink seal like the passport's stamps: paper disc, solid ring, dashed inner ring.
export const drawInkSeal = (context, centerX, centerY, radius) => {
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fillStyle = SEAL_PAPER;
  context.fill();
  context.lineWidth = radius * SEAL_RING_WIDTH;
  context.strokeStyle = SEAL_GOLD;
  context.stroke();
  context.beginPath();
  context.setLineDash([radius * SEAL_DASH, radius * SEAL_DASH_GAP]);
  context.arc(centerX, centerY, radius - radius * SEAL_INNER_RING_INSET, 0, Math.PI * 2);
  context.lineWidth = radius * SEAL_INNER_RING_WIDTH;
  context.strokeStyle = SEAL_INNER_RING_COLOR;
  context.stroke();
  context.restore();
};
