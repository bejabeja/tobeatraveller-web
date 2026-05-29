import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { InputForm } from "../../components/form/InputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { forgotPasswordSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const API_URL = import.meta.env.VITE_API_URL;

const ForgotPassword = () => {
  const { t } = useTranslation();
  const [successEmail, setSuccessEmail] = useState(null);
  const [serverError, setServerError] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async ({ email }) => {
    setServerError(null);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setServerError(data.message || t("errors.somethingWrong"));
        return;
      }
      setSuccessEmail(email);
    } catch {
      setServerError(t("errors.networkError"));
    }
  };

  return (
    <section className="auth">
      <div className="auth__panel" style={{ width: "100%" }}>
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
                {t("auth.checkInbox")} — {t("auth.resetLinkSent", { email: successEmail })}
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
            </div>
          ) : (
            <>
              <InputForm
                name="email"
                label="Email"
                type="email"
                control={control}
                error={errors.email}
              />

              <div className="auth__form-error" role="alert" aria-live="assertive">
                {serverError || " "}
              </div>

              <SubmitButton label={t("auth.sendResetLink")} loading={isSubmitting} />
            </>
          )}

          <div className="auth__form-link" style={{ paddingTop: "0.75rem" }}>
            <Link to="/login">{t("auth.backToLogin")}</Link>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ForgotPassword;
