import {
  BADGE_EMOJI, countryFlag, countryName, PASSPORT_SHARE_STAMP_LAYOUT, passportShareFlagLayout, passportShareMap, passportShareMapLayout,
} from "@tobeatraveller/shared";
import { canvasToPngBlob, drawInkSeal, roundedRect, spacedText } from "./canvasDrawing";

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

const NAVY = "#1b2a41";
const GOLD = "#d9a441";
const PAPER = "#fbf6ec";
const INK_MUTED = "#8a8172";
// As on the passport page's map (client/src/components/passport/PassportMap.scss).
const MAP_LAND = "#e7ddc8";
// In map units, so they grow with the map; thicker than on the page, where
// the map is seen bigger than on a story.
const MAP_BORDER_WIDTH = 0.8;
const MAP_DOT_RADIUS = 6;
const MAP_DOT_BORDER_WIDTH = 1.5;

const NAME_PADDING = 10;

const TEXT_FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

// A badge as on the card of a single new badge: its emoji in a round ink seal.
const drawBadgeSeal = (context, emoji, x, y, layout) => {
  drawInkSeal(context, x, y, layout.sealDiameter / 2);
  context.font = `${layout.fontSize}px ${EMOJI_FONT}`;
  context.fillText(emoji, x, y);
};

// A country as on the card of a single new country: its flag in a round ink
// seal, with its name under it.
const drawCountrySeal = (language) => (context, code, x, y, layout) => {
  const { sealDiameter, fontSize, nameFontSize, nameLineHeight, perRow } = layout;
  const sealRadius = sealDiameter / 2;
  // The seal and the name under it, centred together in the cell.
  const sealCenterY = y - (sealDiameter + nameLineHeight) / 2 + sealRadius;
  drawInkSeal(context, x, sealCenterY, sealRadius);

  context.save();
  context.font = `${fontSize}px ${EMOJI_FONT}`;
  context.fillText(countryFlag(code), x, sealCenterY);
  context.fillStyle = NAVY;
  context.font = `800 ${nameFontSize}px ${TEXT_FONT}`;
  context.fillText(
    countryName(code, language).toUpperCase(),
    x,
    sealCenterY + sealRadius + nameLineHeight / 2,
    (SHARE_IMAGE_WIDTH - PADDING * 2) / perRow - NAME_PADDING * 2,
  );
  context.restore();
};

// The world with the shared countries painted in, `layout.width` wide and
// centred, its top at `top`.
const drawWorldMap = (context, map, layout, top) => {
  const scale = layout.width / map.width;
  context.save();
  context.translate((SHARE_IMAGE_WIDTH - layout.width) / 2, top);
  context.scale(scale, scale);
  context.strokeStyle = PAPER;
  context.lineWidth = MAP_BORDER_WIDTH;
  map.countries.forEach(({ d, state }) => {
    if (!d) return;
    const outline = new Path2D(d);
    context.fillStyle = state ? GOLD : MAP_LAND;
    context.fill(outline);
    context.stroke(outline);
  });
  context.strokeStyle = NAVY;
  context.lineWidth = MAP_DOT_BORDER_WIDTH;
  map.countries.filter(country => country.dot).forEach(({ dot }) => {
    context.beginPath();
    context.arc(dot[0], dot[1], MAP_DOT_RADIUS, 0, Math.PI * 2);
    context.fillStyle = GOLD;
    context.fill();
    context.stroke();
  });
  context.restore();
};

// A paper panel with its title, and its items in a grid centred in the rest
// of the panel (a last, incomplete row centred too, as on the mobile card),
// under the world map when there is one.
const drawPanel = (context, { top, height, title, items, drawItem, layout, more, empty, map }) => {
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

  const { perRow, cellHeight } = layout;
  const rows = Math.ceil(items.length / perRow);
  const mapHeight = map ? map.layout.height + map.layout.gap : 0;
  const blockHeight = mapHeight + rows * cellHeight + (more ? MORE_LABEL_HEIGHT : 0);
  const blockTop = contentTop + (contentHeight - blockHeight) / 2;
  if (map) drawWorldMap(context, map.world, map.layout, blockTop);
  const gridTop = blockTop + mapHeight;
  const cellWidth = (SHARE_IMAGE_WIDTH - PADDING * 2) / perRow;

  context.textBaseline = "middle";
  items.forEach((item, index) => {
    const column = index % perRow;
    const row = Math.floor(index / perRow);
    const itemsInRow = Math.min(perRow, items.length - row * perRow);
    const rowOffset = ((perRow - itemsInRow) * cellWidth) / 2;
    drawItem(context, item, PADDING + rowOffset + cellWidth * (column + 0.5), gridTop + cellHeight * (row + 0.5), layout);
  });
  context.textBaseline = "alphabetic";

  if (more) {
    context.fillStyle = INK_MUTED;
    context.font = `700 40px ${TEXT_FONT}`;
    context.fillText(more, SHARE_IMAGE_WIDTH / 2, gridTop + rows * cellHeight + 50);
  }
};

// Draws the story-sized passport card and returns it as a PNG blob. Texts
// come already translated, so this only knows about layout. Only the site's
// address goes on the image: a link in a picture can't be tapped, so the
// full one travels with the share instead.
export const createPassportShareImage = ({ summary, labels, language, displayUrl }) => {
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
    items: summary.flagCodes,
    drawItem: drawCountrySeal(language),
    layout: passportShareFlagLayout(summary.flagCodes.length, summary.showAchievements),
    more: summary.hiddenCountries > 0 ? labels.moreCountries : null,
    empty: labels.noCountries,
    map: { world: passportShareMap(summary.mapCodes), layout: passportShareMapLayout(summary.showAchievements) },
  });

  if (summary.showAchievements) {
    drawPanel(context, {
      top: stampsTop,
      height: STAMPS_PANEL_HEIGHT,
      title: labels.achievements,
      items: summary.stampIds.map(id => BADGE_EMOJI[id]),
      drawItem: drawBadgeSeal,
      layout: PASSPORT_SHARE_STAMP_LAYOUT,
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
