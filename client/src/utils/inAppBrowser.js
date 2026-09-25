// Browsers built into social apps, which open links inside the app. Most of
// them can't share files (no Web Share with files) and often can't download
// either, so the owner is pointed to the phone's own browser to share.
// WhatsApp isn't here: it opens links in the system browser, which can.
const IN_APP_BROWSERS = [
  { name: "Instagram", pattern: /Instagram/i },
  { name: "Facebook", pattern: /FBAN|FBAV|FB_IAB|FBIOS/i },
  { name: "TikTok", pattern: /BytedanceWebview|musical_ly|TikTok/i },
  { name: "LinkedIn", pattern: /LinkedInApp/i },
  { name: "Snapchat", pattern: /Snapchat/i },
];

// The app's name, or null for a regular browser.
export const inAppBrowserName = (userAgent = navigator.userAgent) => (
  IN_APP_BROWSERS.find(({ pattern }) => pattern.test(userAgent ?? ""))?.name ?? null
);
