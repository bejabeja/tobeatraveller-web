import { countryFlag } from "@tobeatraveller/shared";
import { canvasToPngBlob, roundedRect, spacedText } from "./canvasDrawing";

// Same story size and look as the passport image, so both feel like one app.
const WIDTH = 1080;
const HEIGHT = 1920;
const PADDING = 90;
const CONTENT_WIDTH = WIDTH - PADDING * 2;

const TILES_TOP = 430;
const TILE_GAP = 40;
const TILE_HEIGHT = 340;
const TILES_PER_ROW = 2;
const FLAGS_PANEL_BOTTOM = 1730;
const FLAGS_PER_ROW = 6;
const FLAG_CELL_HEIGHT = 150;

const NAVY = "#1b2a41";
const GOLD = "#d9a441";
const PAPER = "#fbf6ec";
const INK_MUTED = "#8a8172";

const TEXT_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

// A figure with its label (and an optional note under it) on a paper tile.
const drawTile = (context, { x, y, width, value, label, note }) => {
  roundedRect(context, x, y, width, TILE_HEIGHT, 36);
  context.fillStyle = PAPER;
  context.fill();

  context.textAlign = "center";
  context.fillStyle = NAVY;
  context.font = `800 150px ${TEXT_FONT}`;
  context.fillText(String(value), x + width / 2, y + 175, width - 40);
  context.fillStyle = INK_MUTED;
  context.font = `600 40px ${TEXT_FONT}`;
  context.fillText(label, x + width / 2, y + 245, width - 40);
  if (note) {
    context.fillStyle = GOLD;
    context.font = `700 36px ${TEXT_FONT}`;
    context.fillText(note, x + width / 2, y + 300, width - 40);
  }
};

// Draws the story-sized recap card and returns it as a PNG blob. `tiles` are
// the figures to show, already translated; only figures, never diary text or
// place names.
export const createRecapShareImage = ({ summary, tiles, labels, displayUrl }) => {
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
  context.fillText(spacedText(labels.kicker.toUpperCase()), WIDTH / 2, 190);
  context.font = `800 96px ${TEXT_FONT}`;
  context.fillText(`@${summary.username}`, WIDTH / 2, 320, CONTENT_WIDTH);

  // Two per row; a lone last tile is centred, as the flags are.
  const tileWidth = (CONTENT_WIDTH - TILE_GAP) / TILES_PER_ROW;
  tiles.forEach((tile, index) => {
    const row = Math.floor(index / TILES_PER_ROW);
    const tilesInRow = Math.min(TILES_PER_ROW, tiles.length - row * TILES_PER_ROW);
    const rowWidth = tilesInRow * tileWidth + (tilesInRow - 1) * TILE_GAP;
    const x = (WIDTH - rowWidth) / 2 + (index % TILES_PER_ROW) * (tileWidth + TILE_GAP);
    drawTile(context, { ...tile, x, y: TILES_TOP + row * (TILE_HEIGHT + TILE_GAP), width: tileWidth });
  });

  if (summary.flagCodes.length > 0) {
    const tileRows = Math.ceil(tiles.length / TILES_PER_ROW);
    const panelTop = TILES_TOP + tileRows * (TILE_HEIGHT + TILE_GAP);
    const panelHeight = FLAGS_PANEL_BOTTOM - panelTop;
    roundedRect(context, PADDING, panelTop, CONTENT_WIDTH, panelHeight, 36);
    context.fillStyle = PAPER;
    context.fill();

    const rows = Math.ceil(summary.flagCodes.length / FLAGS_PER_ROW);
    const moreHeight = summary.hiddenCountries > 0 ? 70 : 0;
    const gridTop = panelTop + (panelHeight - rows * FLAG_CELL_HEIGHT - moreHeight) / 2;
    const cellWidth = CONTENT_WIDTH / FLAGS_PER_ROW;
    context.font = `100px ${EMOJI_FONT}`;
    context.textBaseline = "middle";
    summary.flagCodes.forEach((code, index) => {
      const row = Math.floor(index / FLAGS_PER_ROW);
      const itemsInRow = Math.min(FLAGS_PER_ROW, summary.flagCodes.length - row * FLAGS_PER_ROW);
      const offset = ((FLAGS_PER_ROW - itemsInRow) * cellWidth) / 2;
      context.fillText(countryFlag(code), PADDING + offset + cellWidth * ((index % FLAGS_PER_ROW) + 0.5), gridTop + FLAG_CELL_HEIGHT * (row + 0.5));
    });
    context.textBaseline = "alphabetic";
    if (summary.hiddenCountries > 0) {
      context.fillStyle = INK_MUTED;
      context.font = `700 40px ${TEXT_FONT}`;
      context.fillText(labels.moreCountries, WIDTH / 2, gridTop + rows * FLAG_CELL_HEIGHT + 50);
    }
  }

  context.fillStyle = GOLD;
  context.font = `600 36px ${TEXT_FONT}`;
  context.fillText(displayUrl, WIDTH / 2, HEIGHT - 110, CONTENT_WIDTH);

  return canvasToPngBlob(canvas, "Could not render the recap image");
};
