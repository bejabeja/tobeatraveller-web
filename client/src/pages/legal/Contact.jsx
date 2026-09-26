import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { sendContact } from "@tobeatraveller/shared";
import { usePageMeta } from "../../hooks/usePageMeta";
import { selectAuthUser } from "../../store/auth/authSelectors";
import { setUserInfo } from "../../store/user/userInfoActions";
import { selectMe, selectMeLoading } from "../../store/user/userInfoSelectors";
import {
  contactSchema,
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_SUBJECT_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
} from "../../utils/schemasValidation";
import "./Legal.scss";
import "./Contact.scss";
const CONTACT_EMAIL = "tobeatravellercompany@gmail.com";

const Contact = () => {
  const { t, i18n } = useTranslation();
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
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errors, setErrors] = useState({});

  const validate = () => {
    const result = contactSchema.safeParse(fields);
    if (result.success) {
      setErrors({});
      return true;
    }
    const e = {};
    for (const issue of result.error.issues) {
      e[issue.path[0]] = issue.message;
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
      setFields((prev) => ({ ...prev, subject: "", message: "" }));
    } catch {
      setStatus("error");
    }
  };

  return (
    <div className="legal section__container">
      <div className="legal__header">
        <h1 className="legal__title">{t("contact.title")}</h1>
        <p className="legal__meta">{t("contact.subtitle")}</p>
      </div>

      <div className="contact">
        {status === "success" ? (
          <div className="contact__success">
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
            <div className="contact__row">
              <Field label={t("contact.yourName")} error={errors.name}>
                <input
                  type="text"
                  name="name"
                  value={fields.name}
                  onChange={handleChange}
                  placeholder={t("contact.namePlaceholder")}
                  autoComplete="name"
                  maxLength={CONTACT_NAME_MAX_LENGTH}
                />
              </Field>
              <Field label={t("contact.yourEmail")} error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={fields.email}
                  onChange={handleChange}
                  placeholder={t("contact.emailPlaceholder")}
                  autoComplete="email"
                />
              </Field>
            </div>

            <Field label={t("contact.subject")} error={errors.subject}>
              <input
                type="text"
                name="subject"
                value={fields.subject}
                onChange={handleChange}
                placeholder={t("contact.subjectPlaceholder")}
                maxLength={CONTACT_SUBJECT_MAX_LENGTH}
              />
            </Field>

            <Field label={t("contact.message")} error={errors.message}>
              <textarea
                name="message"
                value={fields.message}
                onChange={handleChange}
                placeholder={t("contact.messagePlaceholder")}
                rows={6}
                maxLength={CONTACT_MESSAGE_MAX_LENGTH}
              />
            </Field>

            {status === "error" && (
              <p className="contact__error">
                {t("contact.errorMsg")}{" "}
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
      </div>

      <div className="legal__footer">
        <span />
        <Link to="/" className="btn btn--secondary">{t("contact.backToHome")}</Link>
      </div>
    </div>
  );
};

const Field = ({ label, error, children }) => (
  <div className={`contact__field${error ? " contact__field--error" : ""}`}>
    <label className="contact__label">{label}</label>
    {children}
    {error && <span className="contact__field-error">{error}</span>}
  </div>
);

export default Contact;
