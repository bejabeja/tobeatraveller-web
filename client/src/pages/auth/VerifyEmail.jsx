import { useEffect, useRef, useState } from "react";
import { IoCheckmarkCircleOutline, IoCloseCircleOutline, IoMailOutline } from "react-icons/io5";
import { useDispatch, useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import { resendVerificationEmail, selectAuthUser, setUserInfo, verifyEmail } from "@tobeatraveller/shared";
import { usePageMeta } from "../../hooks/usePageMeta";
import "./VerifyEmail.scss";

const TOO_MANY_REQUESTS_STATUS = 429;

const VerifyEmail = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const authUser = useSelector(selectAuthUser);
  const [status, setStatus] = useState(token ? "verifying" : "invalid");
  const [resendStatus, setResendStatus] = useState("idle");
  // The link is spent by the first try: in development React runs effects twice.
  const triedToken = useRef(null);

  usePageMeta({ title: t("emailVerification.pageTitle"), description: t("emailVerification.pageTitle") });

  useEffect(() => {
    if (!token || triedToken.current === token) return;
    triedToken.current = token;
    verifyEmail(token)
      .then(() => {
        setStatus("confirmed");
        if (authUser?.id) dispatch(setUserInfo(authUser.id));
      })
      .catch(() => setStatus("invalid"));
  }, [token, authUser?.id, dispatch]);

  const handleResend = async () => {
    setResendStatus("sending");
    try {
      const { alreadyVerified } = await resendVerificationEmail();
      if (alreadyVerified) setStatus("confirmed");
      setResendStatus("sent");
    } catch (error) {
      setResendStatus(error.status === TOO_MANY_REQUESTS_STATUS ? "tooMany" : "failed");
    }
  };

  return (
    <section className="section__container verify-email" aria-live="polite">
      {status === "verifying" && (
        <>
          <IoMailOutline className="verify-email__icon" size={48} aria-hidden="true" />
          <h1>{t("emailVerification.verifying")}</h1>
        </>
      )}

      {status === "confirmed" && (
        <>
          <IoCheckmarkCircleOutline className="verify-email__icon verify-email__icon--ok" size={48} aria-hidden="true" />
          <h1>{t("emailVerification.successTitle")}</h1>
          <p>{t("emailVerification.successDesc")}</p>
          <div className="verify-email__actions">
            {authUser ? (
              <Link to="/" className="btn btn--primary">{t("errors.backHome")}</Link>
            ) : (
              <Link to="/login" className="btn btn--primary">{t("auth.signIn")}</Link>
            )}
          </div>
        </>
      )}

      {status === "invalid" && (
        <>
          <IoCloseCircleOutline className="verify-email__icon verify-email__icon--error" size={48} aria-hidden="true" />
          <h1>{t("emailVerification.errorTitle")}</h1>
          <p>{t("emailVerification.errorDesc")}</p>
          <div className="verify-email__actions">
            {authUser ? (
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleResend}
                disabled={resendStatus === "sending" || resendStatus === "sent"}
              >
                {t("emailVerification.resend")}
              </button>
            ) : (
              <>
                <p>{t("emailVerification.errorSignedOut")}</p>
                <Link to="/login" className="btn btn--primary">{t("auth.signIn")}</Link>
              </>
            )}
          </div>
          {resendStatus === "sent" && <p role="status">{t("emailVerification.bannerSent")}</p>}
          {resendStatus === "tooMany" && <p role="alert">{t("emailVerification.tooMany")}</p>}
          {resendStatus === "failed" && <p role="alert">{t("emailVerification.sendFailed")}</p>}
        </>
      )}
    </section>
  );
};

export default VerifyEmail;
