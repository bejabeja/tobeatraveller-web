import { useEffect } from "react";
import { Link } from "react-router-dom";
import "./Legal.scss";

const LAST_UPDATED = "29 May 2025";
const CONTACT_EMAIL = "tobeatravellercompany@gmail.com";

const Terms = () => {
  useEffect(() => {
    document.title = "Terms of Service — ToBeATraveller";
    window.scrollTo(0, 0);
    return () => { document.title = "ToBeATraveller"; };
  }, []);

  return (
    <div className="legal section__container">
      <div className="legal__header">
        <h1 className="legal__title">Terms of Service</h1>
        <p className="legal__meta">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="legal__body">
        <Section title="1. Acceptance of terms">
          <p>
            By creating an account or using ToBeATraveller ("the Service"), you agree
            to these Terms of Service. If you do not agree, do not use the Service.
          </p>
          <p>
            These terms apply to both the web application and the mobile application.
          </p>
        </Section>

        <Section title="2. Description of the service">
          <p>
            ToBeATraveller is a platform for creating, sharing, and discovering travel
            itineraries. Registered users can publish trip plans, follow other travellers,
            comment on itineraries, and save trips they find inspiring.
          </p>
          <p>
            Guest users (not logged in) can browse public itineraries and community
            profiles, but cannot create content or interact socially.
          </p>
        </Section>

        <Section title="3. Accounts">
          <ul>
            <li>You must provide a valid email address and choose a unique username.</li>
            <li>You are responsible for keeping your account credentials secure.</li>
            <li>You may not create accounts for others or share your account.</li>
            <li>You must be at least 16 years old to register.</li>
            <li>
              We reserve the right to suspend or delete accounts that violate these terms,
              without prior notice.
            </li>
          </ul>
        </Section>

        <Section title="4. User-generated content">
          <p>
            You retain ownership of the content you create on ToBeATraveller (itineraries,
            comments, profile information, photos).
          </p>
          <p>
            By publishing content, you grant ToBeATraveller a non-exclusive, royalty-free,
            worldwide licence to display, store, and distribute that content as part of
            operating the Service. This licence ends when you delete the content or your
            account.
          </p>
          <p>You are solely responsible for the content you post. You warrant that:</p>
          <ul>
            <li>You own or have the rights to any photos or text you upload.</li>
            <li>Your content does not infringe any third-party intellectual property.</li>
            <li>Your content complies with applicable laws.</li>
          </ul>
        </Section>

        <Section title="5. Prohibited conduct">
          <p>You may not use the Service to:</p>
          <ul>
            <li>Post false, misleading, or fraudulent itineraries.</li>
            <li>Harass, threaten, or abuse other users.</li>
            <li>Upload content that is illegal, defamatory, or infringes third-party rights.</li>
            <li>Spam other users or post unsolicited commercial content.</li>
            <li>Attempt to access other users' accounts or compromise the platform's security.</li>
            <li>Scrape, crawl, or extract data from the Service by automated means.</li>
            <li>Impersonate another person or organisation.</li>
          </ul>
        </Section>

        <Section title="6. Privacy">
          <p>
            Your use of the Service is also governed by our{" "}
            <Link to="/privacy-policy">Privacy Policy</Link>, which is incorporated
            into these terms by reference.
          </p>
        </Section>

        <Section title="7. Itinerary visibility">
          <p>
            Itineraries marked as <strong>Public</strong> are visible to anyone, including
            users who are not logged in. Itineraries marked as <strong>Private</strong> are
            only visible to you. You can change the visibility of any itinerary at any time
            from the edit screen.
          </p>
        </Section>

        <Section title="8. Intellectual property">
          <p>
            The ToBeATraveller name, logo, and design are our intellectual property.
            You may not use them without prior written permission.
          </p>
          <p>
            The platform code and design are not licensed for reuse without our explicit
            written consent.
          </p>
        </Section>

        <Section title="9. Disclaimer of warranties">
          <p>
            The Service is provided "as is" and "as available" without warranties of any
            kind. We do not guarantee that the Service will be uninterrupted, error-free,
            or that the itinerary content shared by users is accurate, complete, or safe to follow.
          </p>
          <p>
            Travel inherently involves risk. Always verify information independently before
            planning a trip based on content found on this platform.
          </p>
        </Section>

        <Section title="10. Limitation of liability">
          <p>
            To the maximum extent permitted by law, ToBeATraveller shall not be liable for
            any indirect, incidental, special, or consequential damages arising from your use
            of the Service or any content found on it.
          </p>
          <p>
            Our total liability for any claim relating to the Service shall not exceed €100.
          </p>
        </Section>

        <Section title="11. Termination">
          <p>
            You can delete your account at any time from your profile settings. Deletion
            is permanent and removes all your content from the platform.
          </p>
          <p>
            We may suspend or terminate your account if you violate these terms, with or
            without notice depending on the severity of the violation.
          </p>
        </Section>

        <Section title="12. Changes to these terms">
          <p>
            We may update these terms from time to time. We will notify users of significant
            changes by updating the "Last updated" date. Continued use of the Service after
            changes constitutes acceptance of the updated terms.
          </p>
        </Section>

        <Section title="13. Governing law">
          <p>
            These terms are governed by the laws of Spain. Any disputes shall be subject
            to the exclusive jurisdiction of the courts of Spain, without prejudice to your
            rights as a consumer under applicable EU law.
          </p>
        </Section>

        <Section title="14. Contact">
          <p>
            For any questions about these terms, contact us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>
      </div>

      <div className="legal__footer">
        <Link to="/privacy-policy" className="legal__link">Privacy Policy</Link>
        <Link to="/" className="btn btn--secondary">Back to home</Link>
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

export default Terms;
