import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { passportUrl, summarizeRecapForSharing } from "@tobeatraveller/shared";
import { useReferralCode } from "./useReferralCode";
import { createRecapShareImage } from "../utils/recapShareImage";

const EMPTY_IMAGE = { blob: null, previewUrl: null };

// The recap's share image: figures only (see summarizeRecapForSharing). Its
// link leads to the owner's passport, crediting them with any sign-up.
export const useRecapShareImage = (recap, owner, enabled) => {
  const { t } = useTranslation();
  const referral = useReferralCode(enabled);
  const [image, setImage] = useState(EMPTY_IMAGE);
  const [error, setError] = useState(false);
  const url = owner ? passportUrl(window.location.origin, owner.id, referral.code) : null;

  useEffect(() => {
    setImage(EMPTY_IMAGE);
    setError(false);
    if (!enabled || !recap?.hasActivity || !owner) return undefined;
    let cancelled = false;
    let previewUrl = null;

    const summary = summarizeRecapForSharing(recap, owner.username);
    const tiles = [
      summary.countryCount > 0 && {
        value: summary.countryCount,
        label: t("recap.statCountries", { count: summary.countryCount }),
        note: summary.newCountryCount > 0 ? t("recap.statNewCountries", { count: summary.newCountryCount }) : null,
      },
      summary.daysOnRoad > 0 && { value: summary.daysOnRoad, label: t("recap.statDays", { count: summary.daysOnRoad }) },
      summary.nights > 0 && { value: summary.nights, label: t("recap.statNights", { count: summary.nights }) },
      summary.stamps > 0 && { value: summary.stamps, label: t("recap.statStamps", { count: summary.stamps }) },
    ].filter(Boolean);

    createRecapShareImage({
      summary,
      tiles,
      displayUrl: window.location.host,
      labels: {
        kicker: `${t("recap.shareKicker", { year: summary.year })} · ToBeATraveller`,
        moreCountries: t("passport.moreCountries", { count: summary.hiddenCountries }),
      },
    })
      .then((blob) => {
        if (cancelled) return;
        previewUrl = URL.createObjectURL(blob);
        setImage({ blob, previewUrl });
      })
      .catch(() => { if (!cancelled) setError(true); });

    return () => {
      cancelled = true;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [enabled, recap, owner, t]);

  return {
    ...image,
    url,
    loading: enabled && ((!image.blob && !error) || !referral.settled),
    error,
  };
};
