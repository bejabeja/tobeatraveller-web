import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { passportUrl, summarizePassportForSharing } from "@tobeatraveller/shared";
import { getUserPassport } from "../services/passport";
import { useReferralCode } from "./useReferralCode";

const EMPTY_IMAGE = { blob: null, previewUrl: null, summary: null };

// Built from the public version of the passport unless the owner explicitly
// chooses to include their private stamps and countries: the image leaves
// the app and can't be taken back. Toggling the achievements only redraws
// the image; the passport is fetched again only when privacy changes. The
// link carries the owner's referral code, so sign-ups from it count as theirs.
export const usePassportShareImage = (userId, enabled, { includePrivate = false, includeAchievements = false } = {}) => {
  const { t, i18n } = useTranslation();
  const [passportState, setPassportState] = useState({ passport: null, loading: false, error: false });
  const referral = useReferralCode(enabled);
  const [image, setImage] = useState(EMPTY_IMAGE);
  const [imageError, setImageError] = useState(false);
  const { passport } = passportState;
  const url = passportUrl(window.location.origin, userId, referral.code);

  useEffect(() => {
    if (!enabled || !userId) return undefined;
    let cancelled = false;
    setPassportState({ passport: null, loading: true, error: false });
    getUserPassport(userId, { publicView: !includePrivate })
      .then((fetched) => { if (!cancelled) setPassportState({ passport: fetched, loading: false, error: false }); })
      .catch(() => { if (!cancelled) setPassportState({ passport: null, loading: false, error: true }); });
    return () => { cancelled = true; };
  }, [userId, enabled, includePrivate]);

  useEffect(() => {
    setImage(EMPTY_IMAGE);
    setImageError(false);
    if (!enabled || !passport) return undefined;
    let cancelled = false;
    let previewUrl = null;

    const summary = summarizePassportForSharing(passport, { includeAchievements });
    const labels = {
      kicker: `${t("passport.title")} · ToBeATraveller`,
      stats: summary.showAchievements
        ? `${t("passport.countriesCount", { count: summary.countryCount })} · ${t("passport.stampsCount", { count: summary.earnedCount })}`
        : t("passport.countriesCount", { count: summary.countryCount }),
      countries: t("passport.countries"),
      achievements: t("passport.achievements"),
      moreCountries: t("passport.moreCountries", { count: summary.hiddenCountries }),
      moreStamps: t("passport.moreStamps", { count: summary.hiddenStamps }),
      noCountries: t("passport.noCountriesYet"),
      noStamps: t("passport.noStampsYet"),
    };
    // Loaded on first use: it carries the world map's outlines, too heavy
    // for pages that only offer the dialog, such as a profile.
    import("../utils/passportShareImage")
      .then(({ createPassportShareImage }) => createPassportShareImage({
        summary, labels, language: i18n.language, displayUrl: window.location.host,
      }))
      .then((blob) => {
        if (cancelled) return;
        previewUrl = URL.createObjectURL(blob);
        setImage({ blob, previewUrl, summary });
      })
      .catch(() => { if (!cancelled) setImageError(true); });

    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [enabled, passport, includeAchievements, t, i18n.language]);

  return {
    ...image,
    url,
    referralCode: referral.code,
    loading: passportState.loading || (Boolean(passport) && !image.blob && !imageError) || (enabled && !referral.settled),
    error: passportState.error || imageError,
  };
};
