import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { usePageMeta } from "../../hooks/usePageMeta";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { forgotPassword, translateAuthError } from "@tobeatraveller/shared";
import { InputForm } from "../../components/form/InputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { setImageAuthLoaded } from "../../store/auth/authActions";
import { selectimageAuthLoaded } from "../../store/auth/authSelectors";
import { authImage } from "../../utils/constants/constants";
import { preloadImg } from "../../utils/preloadImg";
import { forgotPasswordSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const ForgotPassword = () => {
  const { t } = useTranslation();
  usePageMeta({ title: t("auth.forgotPasswordTitle"), description: t("auth.forgotPasswordSubtitle") });
  const dispatch = useDispatch();
  const imageAuthLoaded = useSelector(selectimageAuthLoaded);
  const [successEmail, setSuccessEmail] = useState(null);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (imageAuthLoaded) return;
    preloadImg(authImage, () => {
      dispatch(setImageAuthLoaded());
    });
  }, [dispatch, imageAuthLoaded]);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }) => {
    setServerError(null);
    try {
      await forgotPassword(email);
      setSuccessEmail(email);
    } catch (error) {
      setServerError(error.message || t("errors.somethingWrong"));
    }
  };

  return (
    <section className="auth">
      <div className={`auth__bg ${imageAuthLoaded ? "loaded" : ""}`} />

      <div className={`auth__visual ${imageAuthLoaded ? "auth__visual--loaded" : ""}`}>
        <Link to="/" className="auth__brand">
          <img src="/logo-white.svg" alt="ToBeATraveller" height="28" />
        </Link>
        <div className="auth__tagline">
          <h2>{t("auth.taglineForgotPassword")}</h2>
          <p>{t("auth.taglineForgotPasswordSub")}</p>
        </div>
      </div>

      <div className="auth__panel">
        <form onSubmit={handleSubmit(onSubmit)} className="auth__form">
          <Link to="/" className="auth__form-logo">
            <img src="/logo.svg" alt="ToBeATraveller" height="28" />
          </Link>

          <div className="auth__form-header">
            <h1 className="auth__form-title">{t("auth.forgotPasswordTitle")}</h1>
            <p className="auth__form-subtitle">
              {t("auth.forgotPasswordSubtitle")}
            </p>
          </div>

          {successEmail ? (
            <div style={{ padding: "1rem 0" }}>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-color)", marginBottom: "0.5rem" }}>
                {t("auth.checkInbox")}.{" "}
                <span dangerouslySetInnerHTML={{ __html: t("auth.resetLinkSent", { email: successEmail }) }} />
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary-color)" }}>
                {t("auth.didntReceive")}{" "}
                <button
                  type="button"
                  onClick={() => setSuccessEmail(null)}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "var(--primary-color)",
                    fontWeight: 600,
                    fontSize: "inherit",
                    fontFamily: "inherit",
                  }}
                >
                  {t("auth.tryAgain")}
                </button>
                .
              </p>

              <div className="auth__form-link">
                <Link to="/login">{t("auth.backToLogin")}</Link>
              </div>
            </div>
          ) : (
            <>
              <InputForm
                name="email"
                label={t("auth.emailLabel")}
                type="email"
                control={control}
                error={errors.email}
                autoComplete="email"
              />

              <div className="auth__form-error" role="alert" aria-live="assertive">
                {serverError ? translateAuthError(t, serverError) : " "}
              </div>

              <div className="auth__form-link">
                <SubmitButton label={t("auth.sendResetLink")} loading={isSubmitting} />
                <Link to="/login">{t("auth.backToLogin")}</Link>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
};

export default ForgotPassword;
