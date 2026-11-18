// A page of a listing is never larger than this, whatever the request asks for: a public
// listing without a ceiling would hand over everything in one request.
export const MAX_PAGE_SIZE = 100;

export const pageSizeFrom = (raw, defaultSize) =>
    Math.min(Math.max(Number.parseInt(raw, 10) || defaultSize, 1), MAX_PAGE_SIZE);

export const pageNumberFrom = (raw) => Math.max(Number.parseInt(raw, 10) || 1, 1);
