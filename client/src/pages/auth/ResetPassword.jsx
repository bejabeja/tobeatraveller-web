import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Link, Navigate, useSearchParams } from "react-router-dom";
import { PasswordInputForm } from "../../components/form/PasswordInputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { resetPasswordSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const API_URL = import.meta.env.VITE_API_URL;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  // No token in URL — redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const onSubmit = async ({ newPassword }) => {
    setServerError(null);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      if (!response.ok) {
        setServerError("This link is invalid or has expired.");
        return;
      }
      setSuccess(true);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
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
            <h1 className="auth__form-title">Set new password</h1>
            <p className="auth__form-subtitle">Choose a new password for your account.</p>
          </div>

          {success ? (
            <div style={{ padding: "1rem 0" }}>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-color)", marginBottom: "0.75rem" }}>
                Password updated! You can now sign in with your new password.
              </p>
              <div className="auth__form-link" style={{ paddingTop: "0.75rem" }}>
                <Link to="/login">
                  <strong>Sign in →</strong>
                </Link>
              </div>
            </div>
          ) : (
            <>
              <PasswordInputForm
                name="newPassword"
                label="New password"
                control={control}
                error={errors.newPassword}
              />
              <PasswordInputForm
                name="confirmPassword"
                label="Confirm new password"
                control={control}
                error={errors.confirmPassword}
              />

              <div className="auth__form-error" role="alert" aria-live="assertive">
                {serverError ? (
                  <>
                    {serverError}{" "}
                    <Link to="/forgot-password" style={{ color: "var(--primary-color)", fontWeight: 600 }}>
                      Request a new link
                    </Link>
                    .
                  </>
                ) : (
                  " "
                )}
              </div>

              <SubmitButton label="Update password" loading={isSubmitting} />

              <div className="auth__form-link" style={{ paddingTop: "0.75rem" }}>
                <Link to="/login">← Back to login</Link>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
};

export default ResetPassword;
