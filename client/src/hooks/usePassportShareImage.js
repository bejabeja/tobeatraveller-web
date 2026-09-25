import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { passportUrl, summarizePassportForSharing } from "@tobeatraveller/shared";
import { getUserPassport } from "../services/passport";
import { getMyReferralInfo } from "../services/referral";
import { createPassportShareImage } from "../utils/passportShareImage";

const EMPTY_IMAGE = { blob: null, previewUrl: null, summary: null };

// Built from the public version of the passport unless the owner explicitly
// chooses to include their private stamps and countries: the image leaves
// the app and can't be taken back. Toggling the achievements only redraws
// the image; the passport is fetched again only when privacy changes. The
// link carries the owner's referral code, so sign-ups from it count as theirs.
export const usePassportShareImage = (userId, enabled, { includePrivate = false, includeAchievements = false } = {}) => {
  const { t } = useTranslation();
  const [passportState, setPassportState] = useState({ passport: null, loading: false, error: false });
  const [referral, setReferral] = useState({ code: null, settled: false });
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

  // Still loading until the code is known (or known to be unavailable), so
  // nothing is shared with a link that doesn't credit the owner by accident.
  // Without a code the link still works; it just doesn't credit them.
  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;
    setReferral({ code: null, settled: false });
    getMyReferralInfo()
      .then((info) => { if (!cancelled) setReferral({ code: info?.referralCode ?? null, settled: true }); })
      .catch(() => { if (!cancelled) setReferral({ code: null, settled: true }); });
    return () => { cancelled = true; };
  }, [enabled]);

  useEffect(() => {
    setImage(EMPTY_IMAGE);
    setImageError(false);
    if (!enabled || !passport) return undefined;
    let cancelled = false;
    let previewUrl = null;

    const summary = summarizePassportForSharing(passport, { includeAchievements });
    createPassportShareImage({
      summary,
      displayUrl: window.location.host,
      labels: {
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
      },
    })
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
  }, [enabled, passport, includeAchievements, t]);

  return {
    ...image,
    url,
    loading: passportState.loading || (Boolean(passport) && !image.blob && !imageError) || (enabled && !referral.settled),
    error: passportState.error || imageError,
  };
};
