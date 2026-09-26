// Sharing a generated image from the web: through the system share sheet
// where the browser can share files (mostly phones), by download otherwise.

// Whether this browser can share a PNG at all, known before the image is
// drawn: otherwise a phone would briefly show the download-only instructions.
export const canShareImages = (fileName) => {
  if (typeof navigator.canShare !== "function") return false;
  return navigator.canShare({ files: [new File([], fileName, { type: "image/png" })] });
};

// A mouse or trackpad: a computer, where the image is better posted from
// the phone, rather than a phone without a share sheet.
export const isDesktop = () => window.matchMedia?.("(pointer: fine)").matches ?? false;

// Best effort: some browsers only allow it right after a click, others not at all.
export const copyLink = (url) => navigator.clipboard?.writeText(url).then(() => true, () => false) ?? Promise.resolve(false);

export const downloadImage = (imageUrl, fileName) => {
  const link = document.createElement("a");
  link.href = imageUrl;
  link.download = fileName;
  link.click();
};
