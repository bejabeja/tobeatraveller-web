import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { IoEarth } from "react-icons/io5";
import { Link } from "react-router-dom";
import { InputForm } from "../../components/form/InputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { forgotPasswordSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const API_URL = import.meta.env.VITE_API_URL;

const ForgotPassword = () => {
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
        setServerError(data.message || "Something went wrong. Please try again.");
        return;
      }
      setSuccessEmail(email);
    } catch {
      setServerError("Network error. Please check your connection and try again.");
    }
  };

  return (
    <section className="auth">
      <div className="auth__panel" style={{ width: "100%" }}>
        <form onSubmit={handleSubmit(onSubmit)} className="auth__form">
          <Link to="/" className="auth__form-logo">
            <IoEarth />Tobeatraveller
          </Link>

          <div className="auth__form-header">
            <h1 className="auth__form-title">Forgot password?</h1>
            <p className="auth__form-subtitle">
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {successEmail ? (
            <div style={{ padding: "1rem 0" }}>
              <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-color)", marginBottom: "0.5rem" }}>
                Check your inbox — we've sent a reset link to{" "}
                <strong>{successEmail}</strong>. It expires in 1 hour.
              </p>
              <p style={{ fontSize: "0.82rem", color: "var(--text-secondary-color)" }}>
                Didn't receive it? Check your spam folder or{" "}
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
                  try again
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

              <SubmitButton label="Send reset link" loading={isSubmitting} />
            </>
          )}

          <div className="auth__form-link" style={{ paddingTop: "0.75rem" }}>
            <Link to="/login">← Back to login</Link>
          </div>
        </form>
      </div>
    </section>
  );
};

export default ForgotPassword;
