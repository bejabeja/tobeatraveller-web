import { useState } from "react";
import toast from "react-hot-toast";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { resendVerificationEmail } from "@tobeatraveller/shared";
import { selectIsAuthenticated } from "../../store/auth/authSelectors";
import { selectMe } from "../../store/user/userInfoSelectors";
import "./EmailVerificationBanner.scss";

const VERIFY_EMAIL_PATH = "/verify-email";
const TOO_MANY_REQUESTS_STATUS = 429;

// Only for someone signed in whose email is known not to be confirmed: an
// unknown state (the profile has not arrived yet) shows nothing, instead of a
// notice that disappears a moment later.
const EmailVerificationBanner = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const userMe = useSelector(selectMe);
  const [status, setStatus] = useState("idle");

  if (!isAuthenticated || userMe?.emailVerified !== false || pathname === VERIFY_EMAIL_PATH) return null;

  const handleSend = async () => {
    setStatus("sending");
    try {
      await resendVerificationEmail();
      setStatus("sent");
    } catch (error) {
      setStatus("idle");
      toast.error(t(error.status === TOO_MANY_REQUESTS_STATUS ? "emailVerification.tooMany" : "emailVerification.sendFailed"));
    }
  };

  return (
    <div className="email-banner" role="status">
      <p className="email-banner__text">{t("emailVerification.bannerText", { email: userMe.email })}</p>
      {status === "sent" ? (
        <span className="email-banner__sent">{t("emailVerification.bannerSent")}</span>
      ) : (
        <button type="button" className="email-banner__send" onClick={handleSend} disabled={status === "sending"}>
          {status === "sending" ? t("emailVerification.bannerSending") : t("emailVerification.bannerSend")}
        </button>
      )}
    </div>
  );
};

export default EmailVerificationBanner;
