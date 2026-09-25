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
