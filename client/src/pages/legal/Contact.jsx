import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Legal.scss";
import "./Contact.scss";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
const CONTACT_EMAIL = "tobeatravellercompany@gmail.com";

const Contact = () => {
  useEffect(() => {
    document.title = "Contact — ToBeATraveller";
    window.scrollTo(0, 0);
    return () => { document.title = "ToBeATraveller"; };
  }, []);

  const [fields, setFields] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState("idle"); // idle | sending | success | error
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!fields.name.trim())    e.name    = "Name is required";
    if (!fields.email.trim())   e.email   = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(fields.email)) e.email = "Invalid email";
    if (!fields.subject.trim()) e.subject = "Subject is required";
    if (!fields.message.trim()) e.message = "Message is required";
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
        <h1 className="legal__title">Get in touch</h1>
        <p className="legal__meta">We'd love to hear from you — feedback, questions, or just to say hello.</p>
      </div>

      <div className="contact">
        {status === "success" ? (
          <div className="contact__success">
            <span className="contact__success-icon" aria-hidden="true">✓</span>
            <h2>Message sent!</h2>
            <p>Thanks for reaching out. We'll get back to you as soon as possible.</p>
            <button
              className="btn btn--secondary"
              onClick={() => setStatus("idle")}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form className="contact__form" onSubmit={handleSubmit} noValidate>
            <div className="contact__row">
              <Field label="Your name" error={errors.name}>
                <input
                  type="text"
                  name="name"
                  value={fields.name}
                  onChange={handleChange}
                  placeholder="Jane Doe"
                  autoComplete="name"
                />
              </Field>
              <Field label="Your email" error={errors.email}>
                <input
                  type="email"
                  name="email"
                  value={fields.email}
                  onChange={handleChange}
                  placeholder="jane@example.com"
                  autoComplete="email"
                />
              </Field>
            </div>

            <Field label="Subject" error={errors.subject}>
              <input
                type="text"
                name="subject"
                value={fields.subject}
                onChange={handleChange}
                placeholder="What's on your mind?"
              />
            </Field>

            <Field label="Message" error={errors.message}>
              <textarea
                name="message"
                value={fields.message}
                onChange={handleChange}
                placeholder="Tell us more…"
                rows={6}
              />
            </Field>

            {status === "error" && (
              <p className="contact__error">
                Something went wrong. Try again or email us directly at{" "}
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
              </p>
            )}

            <div className="contact__actions">
              <button
                type="submit"
                className="btn btn--primary"
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending…" : "Send message"}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="legal__footer">
        <span />
        <Link to="/" className="btn btn--secondary">Back to home</Link>
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
