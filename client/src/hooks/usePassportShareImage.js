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
// While a new image is drawn the last one stays as the preview, marked as
// `updating`, but without its blob: only the image that matches the chosen
// options can go out.
export const usePassportShareImage = (userId, enabled, { includePrivate = false, includeAchievements = false } = {}) => {
  const { t, i18n } = useTranslation();
  const [passportState, setPassportState] = useState({ passport: null, loading: false, error: false });
  const referral = useReferralCode(enabled);
  const [image, setImage] = useState(EMPTY_IMAGE);
  const [imageFresh, setImageFresh] = useState(false);
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
    if (!enabled) setImage(EMPTY_IMAGE);
  }, [enabled]);

  // Revoked once a newer preview has replaced it, not before: it is still
  // on screen while the next one is drawn.
  useEffect(() => () => {
    if (image.previewUrl) URL.revokeObjectURL(image.previewUrl);
  }, [image.previewUrl]);

  useEffect(() => {
    setImageFresh(false);
    setImageError(false);
    if (!enabled || !passport) return undefined;
    let cancelled = false;

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
        setImage({ blob, previewUrl: URL.createObjectURL(blob), summary });
        setImageFresh(true);
      })
      .catch(() => { if (!cancelled) setImageError(true); });

    return () => { cancelled = true; };
  }, [enabled, passport, includeAchievements, t, i18n.language]);

  const drawing = passportState.loading || (Boolean(passport) && !imageFresh && !imageError);
  const error = passportState.error || imageError;
  // After a failure the last image no longer matches the chosen options, so
  // it is neither shown nor downloadable.
  const shownImage = error ? EMPTY_IMAGE : image;

  return {
    ...shownImage,
    blob: imageFresh ? shownImage.blob : null,
    updating: drawing && Boolean(shownImage.previewUrl),
    url,
    referralCode: referral.code,
    loading: drawing || (enabled && !referral.settled),
    error,
  };
};
