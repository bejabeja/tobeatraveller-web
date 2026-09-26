import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { InputForm } from "../../components/form/InputForm";
import { PasswordInputForm } from "../../components/form/PasswordInputForm";
import SubmitButton from "../../components/form/SubmitButton";
import { checkUsernameAvailable } from "../../services/users";
import { createUser, setImageAuthLoaded } from "../../store/auth/authActions";
import {
  selectAuthError,
  selectimageAuthLoaded,
} from "../../store/auth/authSelectors";
import { SIGNUP_SOURCE_PARAM } from "@tobeatraveller/shared";
import { trackEvent } from "../../utils/analytics";
import { ANALYTICS_EVENTS } from "../../utils/analyticsEvents";
import { authImage } from "../../utils/constants/constants";
import { preloadImg } from "../../utils/preloadImg";
import { signupSchema } from "../../utils/schemasValidation";
import "./Auth.scss";

const Signup = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.redirectTo;
  const [searchParams] = useSearchParams();
  // From an invite link it comes filled in; typed by hand otherwise.
  const linkReferralCode = searchParams.get("ref") || "";
  const signupSource = searchParams.get(SIGNUP_SOURCE_PARAM);
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
  const consentRef = useRef(null);
  const ageCheckboxRef = useRef(null);
  const termsCheckboxRef = useRef(null);

  const {
    control,
    handleSubmit,
    setError,
    trigger,
    formState: { errors, isSubmitting, touchedFields },
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    defaultValues: { email: "", username: "", password: "", confirmPassword: "", referralCode: linkReferralCode },
  });

  const usernameValue = useWatch({ control, name: "username" });
  const passwordValue = useWatch({ control, name: "password" });
  const latestUsernameRef = useRef("");

  useEffect(() => {
    if (errorInAuth === "Email already in use") {
      setError("email", { type: "manual", message: t("auth.emailInUse") });
    } else if (errorInAuth === "Username is not available. Please choose another one.") {
      setError("username", { type: "manual", message: t("auth.usernameNotAvailable") });
    }
  }, [errorInAuth, setError, t]);

  useEffect(() => {
    if (touchedFields.confirmPassword) trigger("confirmPassword");
  }, [passwordValue, trigger, touchedFields.confirmPassword]);

  useEffect(() => {
    if (!usernameValue || usernameValue.length < 2 || /\s/.test(usernameValue)) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus("checking");
    const requestedUsername = usernameValue;
    latestUsernameRef.current = requestedUsername;
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(requestedUsername);
      if (latestUsernameRef.current !== requestedUsername) return;
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
      if (Object.keys(cErrors).length > 0) {
        consentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        (cErrors.ageConfirmed ? ageCheckboxRef : termsCheckboxRef).current?.focus();
        return;
      }
      const referralCode = data.referralCode?.trim() || undefined;
      return dispatch(createUser({ ...data, referralCode, termsAccepted, ageConfirmed, language: i18n.resolvedLanguage }, () => {
        trackEvent(ANALYTICS_EVENTS.USER_SIGNED_UP, { source: signupSource ?? null, referred: Boolean(referralCode) });
        navigate("/welcome", { state: redirectTo ? { redirectTo } : undefined });
      }));
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

          {linkReferralCode && (
            <p className="auth__form-referral-banner">{t("referral.signupBannerTitle")}</p>
          )}

          <InputForm name="email" label={t("auth.emailLabel")} type="email" control={control} error={errors.email} autoComplete="email" />

          <InputForm
            name="username"
            label={t("auth.usernameLabel")}
            type="text"
            control={control}
            error={errors.username}
            autoComplete="username"
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

          <PasswordInputForm
            name="password"
            label={t("auth.passwordLabel")}
            control={control}
            error={errors.password}
            autoComplete="new-password"
            hint={t("errors.passwordMin")}
          />
          <PasswordInputForm name="confirmPassword" label={t("auth.confirmPasswordLabel")} control={control} error={errors.confirmPassword} autoComplete="new-password" />

          <div className="auth__referral-field">
            <InputForm
              name="referralCode"
              label={t("referral.signupCodeLabel")}
              type="text"
              control={control}
              error={errors.referralCode}
              placeholder={t("referral.signupCodePlaceholder")}
              inputProps={{ autoCapitalize: "none", spellCheck: false }}
              autoComplete="off"
              maxLength={50}
              showCounter={false}
            />
            {!linkReferralCode && <p className="auth__field-hint">{t("referral.signupCodeHint")}</p>}
          </div>

          <div className="auth__consent" ref={consentRef}>
            <label className={`auth__consent-label${consentErrors.ageConfirmed ? " auth__consent-label--error" : ""}`}>
              <input
                ref={ageCheckboxRef}
                type="checkbox"
                checked={ageConfirmed}
                onChange={(e) => { setAgeConfirmed(e.target.checked); setConsentErrors(p => ({ ...p, ageConfirmed: undefined })); }}
              />
              <span dangerouslySetInnerHTML={{ __html: t("auth.ageConfirm") }} />
            </label>
            {consentErrors.ageConfirmed && <p className="auth__consent-error">{consentErrors.ageConfirmed}</p>}

            <label className={`auth__consent-label${consentErrors.termsAccepted ? " auth__consent-label--error" : ""}`}>
              <input
                ref={termsCheckboxRef}
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => { setTermsAccepted(e.target.checked); setConsentErrors(p => ({ ...p, termsAccepted: undefined })); }}
              />
              <span dangerouslySetInnerHTML={{
                __html: t("auth.termsAccept", {
                  terms: `<a href="/terms" target="_blank" rel="noopener noreferrer">${t("auth.termsOfService")}</a>`,
                  privacy: `<a href="/privacy-policy" target="_blank" rel="noopener noreferrer">${t("auth.privacyPolicy")}</a>`,
                }),
              }} />
            </label>
            {consentErrors.termsAccepted && <p className="auth__consent-error">{consentErrors.termsAccepted}</p>}
          </div>

          <div className="auth__form-link">
            <SubmitButton label={t("auth.createAccount")} loading={isSubmitting} disabled={usernameStatus === "taken" || usernameStatus === "checking"} />
            <Link to="/login" state={redirectTo ? { redirectTo } : undefined}>{t("auth.alreadyHaveAccount")} <strong>{t("auth.signInLink")}</strong></Link>
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
