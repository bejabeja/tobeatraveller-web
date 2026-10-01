import { useEffect } from "react";

const DEFAULT_TITLE = "ToBeATraveller";
const DEFAULT_PAGE_TITLE = "ToBeATraveller: your life on the road";
const DEFAULT_DESCRIPTION = "Track your expenses and supplies on the road, plan trips and share your routes with other travellers.";
const DEFAULT_IMAGE_PATH = "/images/hero.jpg";
const DESCRIPTION_MAX_LENGTH = 160;

const setMetaTag = (key, content, attr = "name") => {
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content ?? "");
};

export const usePageMeta = ({ title, description, image, type = "website" }) => {
  useEffect(() => {
    if (!title) return;

    const fullTitle = `${title} - ${DEFAULT_TITLE}`;
    const trimmedDescription = description?.slice(0, DESCRIPTION_MAX_LENGTH) ?? "";
    const defaultImage = `${window.location.origin}${DEFAULT_IMAGE_PATH}`;
    const resolvedImage = image || defaultImage;

    document.title = fullTitle;
    setMetaTag("description", trimmedDescription);
    setMetaTag("og:title", fullTitle, "property");
    setMetaTag("og:description", trimmedDescription, "property");
    setMetaTag("og:type", type, "property");
    setMetaTag("og:url", window.location.href, "property");
    setMetaTag("og:image", resolvedImage, "property");
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", fullTitle);
    setMetaTag("twitter:description", trimmedDescription);
    setMetaTag("twitter:image", resolvedImage);

    return () => {
      document.title = DEFAULT_PAGE_TITLE;
      setMetaTag("description", DEFAULT_DESCRIPTION);
      setMetaTag("og:title", DEFAULT_PAGE_TITLE, "property");
      setMetaTag("og:description", DEFAULT_DESCRIPTION, "property");
      setMetaTag("og:type", "website", "property");
      setMetaTag("og:url", window.location.origin, "property");
      setMetaTag("og:image", defaultImage, "property");
      setMetaTag("twitter:title", DEFAULT_PAGE_TITLE);
      setMetaTag("twitter:description", DEFAULT_DESCRIPTION);
      setMetaTag("twitter:image", defaultImage);
    };
  }, [title, description, image, type]);
};
