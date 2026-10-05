import { TRIP_SHARE_METHODS } from "./analyticsEvents";

// The phone's own share sheet where there is one, the link copied otherwise.
// Resolves to the way it was shared, or to null when they closed the sheet.
export const shareTrip = async ({ title, url }) => {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return TRIP_SHARE_METHODS.NATIVE;
    } catch (error) {
      if (error?.name === "AbortError") return null;
    }
  }
  await navigator.clipboard.writeText(url);
  return TRIP_SHARE_METHODS.COPY;
};
