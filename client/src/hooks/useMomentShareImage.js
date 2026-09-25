import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { describePassportMoment, passportUrl } from "@tobeatraveller/shared";
import { useReferralCode } from "./useReferralCode";
import { createMomentShareImage } from "../utils/momentShareImage";

const EMPTY_IMAGE = { blob: null, previewUrl: null };

// The card of a single new country or badge. Its link leads to the owner's
// passport, crediting them with any sign-up.
export const useMomentShareImage = (moment, owner, enabled) => {
  const { t, i18n } = useTranslation();
  const referral = useReferralCode(enabled);
  const [image, setImage] = useState(EMPTY_IMAGE);
  const [error, setError] = useState(false);
  const url = owner ? passportUrl(window.location.origin, owner.id, referral.code) : null;

  useEffect(() => {
    setImage(EMPTY_IMAGE);
    setError(false);
    if (!enabled || !moment || !owner) return undefined;
    let cancelled = false;
    let previewUrl = null;

    createMomentShareImage({
      ...describePassportMoment(moment, t, i18n.language),
      username: owner.username,
      kicker: `${t("passport.title")} · ToBeATraveller`,
      displayUrl: window.location.host,
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
  }, [enabled, moment, owner, t, i18n.language]);

  return {
    ...image,
    url,
    referralCode: referral.code,
    loading: enabled && ((!image.blob && !error) || !referral.settled),
    error,
  };
};
