import { BADGE_EMOJI, countryFlag, passportShareFlagLayout } from "@tobeatraveller/shared";
import { canvasToPngBlob, roundedRect, spacedText } from "./canvasDrawing";

// Instagram/WhatsApp story size, so the image fills the screen as a story.
export const SHARE_IMAGE_WIDTH = 1080;
export const SHARE_IMAGE_HEIGHT = 1920;

const PADDING = 90;
const PANELS_TOP = 480;
const PANELS_BOTTOM = 1730;
const PANEL_GAP = 50;
const PANEL_TITLE_HEIGHT = 110;
const MORE_LABEL_HEIGHT = 80;
const STAMPS_PANEL_HEIGHT = 480;

const STAMPS_LAYOUT = { perRow: 4, cellHeight: 140, fontSize: 100 };

const NAVY = "#1b2a41";
const GOLD = "#d9a441";
const PAPER = "#fbf6ec";
const INK_MUTED = "#8a8172";

const TEXT_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

// A paper panel with its title, and its items in a grid centred in the rest
// of the panel (a last, incomplete row centred too, as on the mobile card).
const drawPanel = (context, { top, height, title, items, layout, more, empty }) => {
  roundedRect(context, PADDING, top, SHARE_IMAGE_WIDTH - PADDING * 2, height, 36);
  context.fillStyle = PAPER;
  context.fill();

  context.fillStyle = INK_MUTED;
  context.font = `700 34px ${TEXT_FONT}`;
  context.textAlign = "center";
  context.fillText(spacedText(title.toUpperCase()), SHARE_IMAGE_WIDTH / 2, top + 76);

  const contentTop = top + PANEL_TITLE_HEIGHT;
  const contentHeight = height - PANEL_TITLE_HEIGHT;
  if (items.length === 0) {
    context.font = `500 42px ${TEXT_FONT}`;
    context.fillText(empty, SHARE_IMAGE_WIDTH / 2, contentTop + contentHeight / 2);
    return;
  }

  const { perRow, cellHeight, fontSize } = layout;
  const rows = Math.ceil(items.length / perRow);
  const gridHeight = rows * cellHeight + (more ? MORE_LABEL_HEIGHT : 0);
  const gridTop = contentTop + (contentHeight - gridHeight) / 2;
  const cellWidth = (SHARE_IMAGE_WIDTH - PADDING * 2) / perRow;

  context.font = `${fontSize}px ${EMOJI_FONT}`;
  context.textBaseline = "middle";
  items.forEach((item, index) => {
    const column = index % perRow;
    const row = Math.floor(index / perRow);
    const itemsInRow = Math.min(perRow, items.length - row * perRow);
    const rowOffset = ((perRow - itemsInRow) * cellWidth) / 2;
    context.fillText(item, PADDING + rowOffset + cellWidth * (column + 0.5), gridTop + cellHeight * (row + 0.5));
  });
  context.textBaseline = "alphabetic";

  if (more) {
    context.font = `700 40px ${TEXT_FONT}`;
    context.fillText(more, SHARE_IMAGE_WIDTH / 2, gridTop + rows * cellHeight + 50);
  }
};

// Draws the story-sized passport card and returns it as a PNG blob. Texts
// come already translated, so this only knows about layout. Only the site's
// address goes on the image: a link in a picture can't be tapped, so the
// full one travels with the share instead.
export const createPassportShareImage = ({ summary, labels, displayUrl }) => {
  const canvas = document.createElement("canvas");
  canvas.width = SHARE_IMAGE_WIDTH;
  canvas.height = SHARE_IMAGE_HEIGHT;
  const context = canvas.getContext("2d");

  context.fillStyle = NAVY;
  context.fillRect(0, 0, SHARE_IMAGE_WIDTH, SHARE_IMAGE_HEIGHT);
  roundedRect(context, 36, 36, SHARE_IMAGE_WIDTH - 72, SHARE_IMAGE_HEIGHT - 72, 48);
  context.strokeStyle = "rgba(217, 164, 65, 0.45)";
  context.lineWidth = 3;
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = GOLD;
  context.font = `600 34px ${TEXT_FONT}`;
  context.fillText(spacedText(labels.kicker.toUpperCase()), SHARE_IMAGE_WIDTH / 2, 190);

  context.font = `800 96px ${TEXT_FONT}`;
  context.fillText(`@${summary.username}`, SHARE_IMAGE_WIDTH / 2, 320, SHARE_IMAGE_WIDTH - PADDING * 2);

  context.fillStyle = "rgba(255, 255, 255, 0.85)";
  context.font = `500 44px ${TEXT_FONT}`;
  context.fillText(labels.stats, SHARE_IMAGE_WIDTH / 2, 400);

  const stampsTop = PANELS_BOTTOM - STAMPS_PANEL_HEIGHT;
  const countriesBottom = summary.showAchievements ? stampsTop - PANEL_GAP : PANELS_BOTTOM;
  drawPanel(context, {
    top: PANELS_TOP,
    height: countriesBottom - PANELS_TOP,
    title: labels.countries,
    items: summary.flagCodes.map(countryFlag),
    layout: passportShareFlagLayout(summary.flagCodes.length, summary.showAchievements),
    more: summary.hiddenCountries > 0 ? labels.moreCountries : null,
    empty: labels.noCountries,
  });

  if (summary.showAchievements) {
    drawPanel(context, {
      top: stampsTop,
      height: STAMPS_PANEL_HEIGHT,
      title: labels.achievements,
      items: summary.stampIds.map(id => BADGE_EMOJI[id]),
      layout: STAMPS_LAYOUT,
      more: summary.hiddenStamps > 0 ? labels.moreStamps : null,
      empty: labels.noStamps,
    });
  }

  context.textAlign = "center";
  context.fillStyle = GOLD;
  context.font = `600 36px ${TEXT_FONT}`;
  context.fillText(displayUrl, SHARE_IMAGE_WIDTH / 2, SHARE_IMAGE_HEIGHT - 110, SHARE_IMAGE_WIDTH - PADDING * 2);

  return canvasToPngBlob(canvas, "Could not render the passport image");
};
