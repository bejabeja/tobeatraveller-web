import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { InputForm } from "../../components/form/InputForm";
import { PasswordInputForm } from "../../components/form/PasswordInputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { checkUsernameAvailable } from "../../services/users";
import { createUser, setImageAuthLoaded } from "../../store/auth/authActions";
import {
  selectAuthError,
  selectimageAuthLoaded,
} from "../../store/auth/authSelectors";
import { authImage } from "../../utils/constants/constants";
import { preloadImg } from "../../utils/preloadImg";
import { signupSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const Signup = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const imageAuthLoaded = useSelector(selectimageAuthLoaded);
  const errorInAuth = useSelector(selectAuthError);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | "checking" | "available" | "taken"

  useEffect(() => {
    if (imageAuthLoaded) return;
    preloadImg(authImage, () => {
      dispatch(setImageAuthLoaded());
    });
  }, [dispatch, imageAuthLoaded]);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [consentErrors, setConsentErrors] = useState({});

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
  });

  const usernameValue = useWatch({ control, name: "username" });

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 2 || /\s/.test(usernameValue)) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus("checking");
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(usernameValue);
      if (available === null) { setUsernameStatus(null); return; }
      setUsernameStatus(available ? "available" : "taken");
    }, 500);
    return () => clearTimeout(timer);
  }, [usernameValue]);

  const validateConsent = () => {
    const e = {};
    if (!ageConfirmed)   e.ageConfirmed   = t("errors.ageConfirmRequired");
    if (!termsAccepted)  e.termsAccepted  = t("errors.termsRequired");
    setConsentErrors(e);
    return e;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const cErrors = validateConsent();
    handleSubmit((data) => {
      if (Object.keys(cErrors).length > 0) return;
      dispatch(createUser({ ...data, termsAccepted, ageConfirmed }, () => navigate("/welcome")));
    })();
  };

  return (
    <section className="auth">
      <div className={`auth__bg ${imageAuthLoaded ? "loaded" : ""}`} />

      <div className={`auth__visual ${imageAuthLoaded ? "auth__visual--loaded" : ""}`}>
        <Link to="/" className="auth__brand">
          <img src="/logo-white.svg" alt="ToBeATraveller" height="28" />
        </Link>
        <div className="auth__tagline">
          <h2>{t("auth.taglineRegister")}</h2>
          <p>{t("auth.taglineRegisterSub")}</p>
        </div>
      </div>

      <div className="auth__panel">
        <form
          onSubmit={onSubmit}
          className="auth__form"
          aria-labelledby="signup-form-title"
        >
          <Link to="/" className="auth__form-logo">
            <img src="/logo.svg" alt="ToBeATraveller" height="28" />
          </Link>

          <div className="auth__form-header">
            <h1 id="signup-form-title" className="auth__form-title">{t("auth.createAccount")}</h1>
            <p className="auth__form-subtitle">{t("auth.createAccountSubtitle")}</p>
          </div>

          <InputForm name="email" label="Email" type="email" control={control} error={errors.email} />

          <InputForm
            name="username"
            label="Username"
            type="text"
            control={control}
            error={errors.username}
            right={
              usernameStatus && (
                <span
                  className={`auth__username-status auth__username-status--${usernameStatus}`}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {usernameStatus === "checking" && t("common.checking")}
                  {usernameStatus === "available" && t("auth.usernameAvailable")}
                  {usernameStatus === "taken" && t("auth.usernameTaken")}
                </span>
              )
            }
          />

          <PasswordInputForm name="password" label="Password" control={control} error={errors.password} />
          <PasswordInputForm name="confirmPassword" label="Confirm password" control={control} error={errors.confirmPassword} />

          <div className="auth__consent">
            <label className={`auth__consent-label${consentErrors.ageConfirmed ? " auth__consent-label--error" : ""}`}>
              <input
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => { setAgeConfirmed(e.target.checked); setConsentErrors(p => ({ ...p, ageConfirmed: undefined })); }}
              />
              <span dangerouslySetInnerHTML={{ __html: t("auth.ageConfirm") }} />
            </label>
            {consentErrors.ageConfirmed && <p className="auth__consent-error">{consentErrors.ageConfirmed}</p>}

            <label className={`auth__consent-label${consentErrors.termsAccepted ? " auth__consent-label--error" : ""}`}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => { setTermsAccepted(e.target.checked); setConsentErrors(p => ({ ...p, termsAccepted: undefined })); }}
              />
              <span>
                {t("auth.termsAccept", {
                  terms: `<a href="/terms" target="_blank" rel="noopener noreferrer">${t("auth.termsOfService")}</a>`,
                  privacy: `<a href="/privacy-policy" target="_blank" rel="noopener noreferrer">${t("auth.privacyPolicy")}</a>`,
                })}
              </span>
            </label>
            {consentErrors.termsAccepted && <p className="auth__consent-error">{consentErrors.termsAccepted}</p>}
          </div>

          <div className="auth__form-error" role="alert" aria-live="assertive">
            {errorInAuth && Object.keys(errors).length === 0 ? errorInAuth : " "}
          </div>

          <div className="auth__form-link">
            <SubmitButton label={t("auth.createAccount")} loading={isSubmitting} disabled={usernameStatus === "taken"} />
            <Link to="/login">{t("auth.alreadyHaveAccount")} <strong>{t("auth.signInLink")}</strong></Link>
            <Link to="/explore" className="auth__form-browse">
              {t("auth.exploreWithout")}
            </Link>
          </div>
        </form>
      </div>
    </section>
  );
};

export default Signup;
