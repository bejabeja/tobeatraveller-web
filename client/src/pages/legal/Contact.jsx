import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import "./Legal.scss";
import "./Contact.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CONTACT_EMAIL = "tobeatravellercompany@gmail.com";

const Contact = () => {
  const { t } = useTranslation();

  useEffect(() => {
    document.title = `${t("contact.title")} — ToBeATraveller`;
    window.scrollTo(0, 0);
    return () => { document.title = "ToBeATraveller"; };
  }, [t]);

  const [fields, setFields] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!fields.name.trim())    e.name    = t("common.required");
    if (!fields.email.trim())   e.email   = t("common.required");
    else if (!/\S+@\S+\.\S+/.test(fields.email)) e.email = t("errors.invalidEmail");
    if (!fields.subject.trim()) e.subject = t("common.required");
    if (!fields.message.trim()) e.message = t("common.required");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setStatus("sending");
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      if (res.ok) {
        setStatus("success");
        setFields({ name: "", email: "", subject: "", message: "" });
      } else {
        setStatus("error");
      }
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
              />
            </Field>

            <Field label={t("contact.message")} error={errors.message}>
              <textarea
                name="message"
                value={fields.message}
                onChange={handleChange}
                placeholder={t("contact.messagePlaceholder")}
                rows={6}
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
