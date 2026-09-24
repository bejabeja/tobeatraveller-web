import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import RichText from "../../components/RichText";
import { usePageMeta } from "../../hooks/usePageMeta";
import "./Legal.scss";

const LAST_UPDATED = "24 September 2026";

const PrivacyPolicy = () => {
  const { t } = useTranslation();

  const lp = (key, vars) => t(`legalPrivacy.${key}`, vars);

  usePageMeta({ title: lp("documentTitle"), description: lp("metaDescription") });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="legal section__container">
      <div className="legal__header">
        <h1 className="legal__title">{lp("documentTitle")}</h1>
        <p className="legal__meta">{lp("lastUpdated", { date: LAST_UPDATED })}</p>
      </div>

      <div className="legal__body">
        <Section title={lp("s1Title")}>
          <p><RichText text={lp("s1Body")} /></p>
        </Section>

        <Section title={lp("s2Title")}>
          <p>{lp("s2Intro")}</p>
          <ul>
            {lp("s2Items", { returnObjects: true }).map((item, i) => (
              <li key={i}><RichText text={item} /></li>
            ))}
          </ul>
        </Section>

        <Section title={lp("s3Title")}>
          <p>{lp("s3Intro")}</p>
          <ul>
            {lp("s3Items", { returnObjects: true }).map((item, i) => <li key={i}>{item}</li>)}
          </ul>
          <p>{lp("s3Body2")}</p>
          <p>{lp("s3Body3")}</p>
        </Section>

        <Section title={lp("s4Title")}>
          <p>{lp("s4Intro")}</p>
          <ul>
            {lp("s4Items", { returnObjects: true }).map((item, i) => (
              <li key={i}><RichText text={item} /></li>
            ))}
          </ul>
        </Section>

        <Section title={lp("s5Title")}>
          <p>{lp("s5Body")}</p>
        </Section>

        <Section title={lp("s6Title")}>
          <p>{lp("s6Intro")}</p>
          <ul>
            {lp("s6Items", { returnObjects: true }).map((item, i) => (
              <li key={i}><RichText text={item} /></li>
            ))}
          </ul>
          <p><RichText text={lp("s6Body2")} /></p>
          <p><RichText text={lp("s6Body3")} /></p>
        </Section>

        <Section title={lp("s7Title")}>
          {lp("s7Body", { returnObjects: true }).map((p, i) => <p key={i}>{p}</p>)}
        </Section>

        <Section title={lp("s8Title")}>
          <p>{lp("s8Body")}</p>
        </Section>

        <Section title={lp("s9Title")}>
          <p>{lp("s9Body")}</p>
        </Section>

        <Section title={lp("s10Title")}>
          <p>{lp("s10Body")}</p>
        </Section>

        <Section title={lp("s11Title")}>
          <p><RichText text={lp("s11Body")} /></p>
        </Section>
      </div>

      <div className="legal__footer">
        <Link to="/terms" className="legal__link">{lp("footerTermsLink")}</Link>
        <Link to="/" className="btn btn--secondary">{lp("footerBackHome")}</Link>
      </div>
    </div>
  );
};

const Section = ({ title, children }) => (
  <section className="legal__section">
    <h2 className="legal__section-title">{title}</h2>
    <div className="legal__section-body">{children}</div>
  </section>
);

export default PrivacyPolicy;
