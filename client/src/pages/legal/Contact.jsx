import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { sendContact, translateValidationMessage } from "@tobeatraveller/shared";
import { usePageMeta } from "../../hooks/usePageMeta";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { setUserInfo } from "../../store/user/userInfoActions";
import { selectMe, selectMeLoading } from "../../store/user/userInfoSelectors";
import {
  contactSchema,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_SUBJECT_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_REASONS,
} from "../../utils/schemasValidation";
import "./Legal.scss";
import "./Contact.scss";
const CONTACT_EMAIL = "tobeatravellercompany@gmail.com";
const RATE_LIMITED_STATUS = 429;

const REASON_LABEL_KEYS = {
  payment: "contact.reasonPayment",
  account: "contact.reasonAccount",
  bug: "contact.reasonBug",
  idea: "contact.reasonIdea",
  feedback: "contact.reasonFeedback",
  other: "contact.reasonOther",
};

const Contact = () => {
  const { t, i18n } = useTranslation();
  const formId = useId();
  const dispatch = useDispatch();
  const meDetail = useSelector(selectMe);
  const meLoading = useSelector(selectMeLoading);
  const authUser = useSelector(selectAuthUser);
  const me = meDetail ?? authUser;

  usePageMeta({ title: t("contact.title"), description: t("contact.subtitle") });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (authUser?.id && !meDetail && !meLoading) dispatch(setUserInfo(authUser.id));
  }, [authUser?.id, meDetail, meLoading, dispatch]);

  const [fields, setFields] = useState({
    name: me?.name || me?.username || "",
    email: me?.email || "",
    reason: "",
    subject: "",
    message: "",
  });

  // Tracks whether name/email still hold an autofilled value the user hasn't touched,
  // so a fuller profile arriving later (with a real `name`, where the initial fill only
  // had `username` to fall back on) can still replace it instead of being blocked by a
  // naive "only fill if empty" check.
  const autofilledRef = useRef({ name: true, email: true });

  useEffect(() => {
    if (!me) return;
    setFields((prev) => ({
      ...prev,
      name: autofilledRef.current.name ? (me.name || me.username || prev.name) : prev.name,
      email: autofilledRef.current.email ? (me.email || prev.email) : prev.email,
    }));
  }, [me]);
  const [status, setStatus] = useState("idle"); // idle | sending | success | error | rateLimited
  const [errors, setErrors] = useState({});

  const validate = () => {
    const result = contactSchema.safeParse(fields);
    if (result.success) {
      setErrors({});
      return true;
    }
    const e = {};
    for (const issue of result.error.issues) {
      e[issue.path[0]] = translateValidationMessage(t, issue.message);
    }
    setErrors(e);
    return false;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name" || name === "email") autofilledRef.current[name] = false;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      await sendContact({ ...fields, language: i18n.resolvedLanguage });
      setStatus("success");
      setFields((prev) => ({ ...prev, reason: "", subject: "", message: "" }));
    } catch (error) {
      setStatus(error.status === RATE_LIMITED_STATUS ? "rateLimited" : "error");
    }
  };

  const fieldProps = (name) => ({
    id: `${formId}-${name}`,
    error: errors[name],
  });

  return (
    <div className="legal section__container">
      <div className="legal__header">
        <h1 className="legal__title">{t("contact.title")}</h1>
        <p className="legal__meta">{t("contact.subtitle")}</p>
      </div>

      <div className="contact">
        {status === "success" ? (
          <div className="contact__success" role="status">
            <span className="contact__success-icon" aria-hidden="true">✓</span>
            <h2>{t("contact.sent")}</h2>
            <p>{t("contact.sentDesc")}</p>
            <button
              className="btn btn--secondary"
              onClick={() => setStatus("idle")}
            >
              {t("contact.sendAnother")}
            </button>
          </div>
        ) : (
          <form className="contact__form" onSubmit={handleSubmit} noValidate>
            <fieldset className="contact__reasons" aria-describedby={errors.reason ? `${formId}-reason-error` : undefined}>
              <legend className="contact__label">{t("contact.reason")}</legend>
              <div className="contact__chips">
                {CONTACT_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={`contact__chip${fields.reason === reason ? " contact__chip--selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason}
                      checked={fields.reason === reason}
                      onChange={handleChange}
                      aria-invalid={errors.reason ? "true" : undefined}
                    />
                    {t(REASON_LABEL_KEYS[reason])}
                  </label>
                ))}
              </div>
              {errors.reason && (
                <span id={`${formId}-reason-error`} className="contact__field-error" role="alert">{errors.reason}</span>
              )}
            </fieldset>

            <div className="contact__row">
              <Field label={t("contact.yourName")} {...fieldProps("name")}>
                {(inputProps) => (
                  <input
                    {...inputProps}
                    type="text"
                    name="name"
                    value={fields.name}
                    onChange={handleChange}
                    placeholder={t("contact.namePlaceholder")}
                    autoComplete="name"
                    maxLength={CONTACT_NAME_MAX_LENGTH}
                  />
                )}
              </Field>
              <Field label={t("contact.yourEmail")} {...fieldProps("email")}>
                {(inputProps) => (
                  <input
                    {...inputProps}
                    type="email"
                    name="email"
                    value={fields.email}
                    onChange={handleChange}
                    placeholder={t("contact.emailPlaceholder")}
                    autoComplete="email"
                  />
                )}
              </Field>
            </div>

            <Field label={t("contact.subject")} {...fieldProps("subject")}>
              {(inputProps) => (
                <input
                  {...inputProps}
                  type="text"
                  name="subject"
                  value={fields.subject}
                  onChange={handleChange}
                  placeholder={t("contact.subjectPlaceholder")}
                  maxLength={CONTACT_SUBJECT_MAX_LENGTH}
                />
              )}
            </Field>

            <Field
              label={t("contact.message")}
              hint={`${fields.message.length} / ${CONTACT_MESSAGE_MAX_LENGTH}`}
              {...fieldProps("message")}
            >
              {(inputProps) => (
                <textarea
                  {...inputProps}
                  name="message"
                  value={fields.message}
                  onChange={handleChange}
                  placeholder={t("contact.messagePlaceholder")}
                  rows={6}
                  maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                />
              )}
            </Field>

            {(status === "error" || status === "rateLimited") && (
              <p className="contact__error" role="alert">
                {t(status === "rateLimited" ? "contact.rateLimited" : "contact.errorMsg")}{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            )}

            <div className="contact__actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={status === "sending"}
              >
                {status === "sending" ? t("contact.sending") : t("contact.send")}
              </button>
            </div>
          </form>
        )}

        <p className="contact__direct">
          {t("contact.orEmail")} <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </p>
      </div>

      <div className="legal__footer">
        <span />
        <Link to="/" className="btn btn--secondary">{t("contact.backToHome")}</Link>
      </div>
    </div>
  );
};

// Takes its input as a function so the label, the error and the counter are
// tied to it (for, aria-invalid, aria-describedby) in one place.
const Field = ({ id, label, error, hint, children }) => {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error && errorId, hint && hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`contact__field${error ? " contact__field--error" : ""}`}>
      <label className="contact__label" htmlFor={id}>{label}</label>
      {children({ id, "aria-invalid": error ? "true" : undefined, "aria-describedby": describedBy })}
      {hint && <span id={hintId} className="contact__hint">{hint}</span>}
      {error && <span id={errorId} className="contact__field-error" role="alert">{error}</span>}
    </div>
  );
};

export default Contact;
