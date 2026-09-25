import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { recapYear } from "@tobeatraveller/shared";
import "./RecapBanner.scss";

export const RECAP_SOURCES = Object.freeze({ PASSPORT: "passport", PROFILE: "profile", NOTIFICATION: "notification" });
export const recapPath = (source) => `/recap?from=${source}`;

// The way into the yearly recap, only while it's in season (December and
// January). `source` says where it was opened from, for analytics.
const RecapBanner = ({ source }) => {
  const { t } = useTranslation();
  const year = recapYear();
  if (year === null) return null;

  return (
    <Link to={recapPath(source)} className="recap-banner">
      <span className="recap-banner__title">{t("recap.bannerTitle", { year })}</span>
      <span className="recap-banner__cta">{t("recap.bannerCta")} →</span>
    </Link>
  );
};

export default RecapBanner;
