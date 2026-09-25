import { canvasToPngBlob, drawInkSeal, roundedRect, spacedText } from "./canvasDrawing";

// Same story size and look as the passport and recap images.
const WIDTH = 1080;
const HEIGHT = 1920;
const PADDING = 90;
const CONTENT_WIDTH = WIDTH - PADDING * 2;
const SEAL_CENTER_Y = 930;
const SEAL_RADIUS = 300;

const NAVY = "#1b2a41";
const GOLD = "#d9a441";

const TEXT_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

// Draws the story-sized card of a single new country or badge and returns it
// as a PNG blob: a big inked seal with its flag or emoji, what it is, and
// whose it is. Nothing else from the passport goes on it.
export const createMomentShareImage = ({ symbol, title, name, username, kicker, displayUrl }) => {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext("2d");

  context.fillStyle = NAVY;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  roundedRect(context, 36, 36, WIDTH - 72, HEIGHT - 72, 48);
  context.strokeStyle = "rgba(217, 164, 65, 0.45)";
  context.lineWidth = 3;
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = GOLD;
  context.font = `600 34px ${TEXT_FONT}`;
  context.fillText(spacedText(kicker.toUpperCase()), WIDTH / 2, 190);
  context.font = `800 76px ${TEXT_FONT}`;
  context.fillText(title, WIDTH / 2, 420, CONTENT_WIDTH);

  drawInkSeal(context, WIDTH / 2, SEAL_CENTER_Y, SEAL_RADIUS);

  context.font = `300px ${EMOJI_FONT}`;
  context.textBaseline = "middle";
  context.fillText(symbol, WIDTH / 2, SEAL_CENTER_Y + 10);
  context.textBaseline = "alphabetic";

  context.fillStyle = "#fff";
  context.font = `800 96px ${TEXT_FONT}`;
  context.fillText(name, WIDTH / 2, 1420, CONTENT_WIDTH);
  context.fillStyle = GOLD;
  context.font = `700 56px ${TEXT_FONT}`;
  context.fillText(`@${username}`, WIDTH / 2, 1520, CONTENT_WIDTH);

  context.font = `600 36px ${TEXT_FONT}`;
  context.fillText(displayUrl, WIDTH / 2, HEIGHT - 110, CONTENT_WIDTH);

  return canvasToPngBlob(canvas, "Could not render the moment image");
};
